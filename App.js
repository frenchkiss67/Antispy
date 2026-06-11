import { useEffect, useRef, useState } from 'react';
import {
  AppState,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { usePreventScreenCapture } from 'expo-screen-capture';
import SetupScreen from './src/screens/SetupScreen';
import LockScreen from './src/screens/LockScreen';
import CalculatorScreen from './src/screens/CalculatorScreen';
import JournalScreen from './src/screens/JournalScreen';
import VaultScreen from './src/screens/VaultScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import ChangePinScreen from './src/screens/ChangePinScreen';
import { getPinLength, isPinDefined } from './src/security';
import { DEFAULT_SETTINGS, loadSettings } from './src/settings';
import t from './src/i18n';

export default function App() {
  // Bloque les captures d'écran (FLAG_SECURE Android, protection iOS).
  usePreventScreenCapture();

  const [screen, setScreen] = useState('loading'); // 'loading' | 'setup' | 'locked' | 'home' | 'changePin'
  const [tab, setTab] = useState('journal'); // 'journal' | 'vault' | 'settings'
  const [pinLength, setPinLength] = useState(4);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  // decoy : session ouverte avec le code de contrainte (faux coffre).
  const [decoy, setDecoy] = useState(false);
  const [changePinMode, setChangePinMode] = useState('pin'); // 'pin' | 'duress'
  const [appActive, setAppActive] = useState(true);
  const settingsRef = useRef(settings);
  const screenRef = useRef(screen);
  const backgroundAtRef = useRef(null);
  settingsRef.current = settings;
  screenRef.current = screen;

  useEffect(() => {
    (async () => {
      setSettings(await loadSettings());
      if (await isPinDefined()) {
        setPinLength(await getPinLength());
        setScreen('locked');
      } else {
        setScreen('setup');
      }
    })();
  }, []);

  // Reverrouillage en arrière-plan, avec délai de grâce configurable.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      setAppActive(state === 'active');
      const unlocked =
        screenRef.current === 'home' || screenRef.current === 'changePin';
      if (state !== 'active') {
        backgroundAtRef.current = Date.now();
        if (unlocked && settingsRef.current.graceDelaySec === 0) {
          lock();
        }
      } else {
        const elapsed = backgroundAtRef.current
          ? Date.now() - backgroundAtRef.current
          : 0;
        backgroundAtRef.current = null;
        if (unlocked && elapsed > settingsRef.current.graceDelaySec * 1000) {
          lock();
        }
      }
    });
    return () => subscription.remove();
  }, []);

  const lock = async () => {
    // Recharge les réglages : lastSeen et options ont pu changer.
    setSettings(await loadSettings());
    setDecoy(false);
    setTab('journal');
    setScreen('locked');
  };

  const handleUnlock = async (duress) => {
    setSettings(await loadSettings());
    setDecoy(!!duress);
    setScreen('home');
  };

  const handleSetupDone = async () => {
    setPinLength(await getPinLength());
    setScreen('locked');
  };

  const openChangePin = (mode) => {
    setChangePinMode(mode);
    setScreen('changePin');
  };

  const handlePinChanged = async () => {
    setPinLength(await getPinLength());
    setScreen('home');
    setTab('settings');
  };

  const Lock = settings.camouflage ? CalculatorScreen : LockScreen;
  const unlocked = screen === 'home' || screen === 'changePin';

  return (
    <>
      <StatusBar style="light" />
      {screen === 'setup' && <SetupScreen onDone={handleSetupDone} />}
      {screen === 'locked' && (
        <Lock pinLength={pinLength} settings={settings} onUnlock={handleUnlock} />
      )}
      {screen === 'changePin' && (
        <ChangePinScreen
          pinLength={pinLength}
          mode={changePinMode}
          decoy={decoy}
          onDone={handlePinChanged}
          onCancel={() => setScreen('home')}
        />
      )}
      {screen === 'home' && (
        <View style={styles.home}>
          <View style={styles.screen}>
            {tab === 'journal' && <JournalScreen decoy={decoy} />}
            {tab === 'vault' && <VaultScreen decoy={decoy} />}
            {tab === 'settings' && (
              <SettingsScreen
                settings={settings}
                onSettingsChange={setSettings}
                onChangePin={() => openChangePin('pin')}
                onSetDuress={() => openChangePin('duress')}
                decoy={decoy}
              />
            )}
          </View>
          <View style={styles.tabBar}>
            {[
              ['journal', `📋 ${t('journal')}`],
              ['vault', `🗄 ${t('vault')}`],
              ['settings', `⚙️ ${t('settings')}`],
            ].map(([key, label]) => (
              <TouchableOpacity
                key={key}
                style={[styles.tabItem, tab === key && styles.tabItemActive]}
                onPress={() => setTab(key)}
              >
                <Text style={styles.tabItemText}>{label}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.tabItem} onPress={lock}>
              <Text style={styles.tabItemText}>{t('lock')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      {/* Voile de confidentialité : masque le contenu dans le sélecteur
          d'applications quand l'app est déverrouillée en arrière-plan. */}
      {unlocked && !appActive && (
        <View style={styles.privacyCover}>
          <Text style={styles.privacyCoverText}>🛡️</Text>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  home: {
    flex: 1,
    backgroundColor: '#0d1117',
  },
  screen: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#161b22',
    paddingBottom: 28,
    paddingTop: 8,
    paddingHorizontal: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 10,
  },
  tabItemActive: {
    backgroundColor: '#21262d',
  },
  tabItemText: {
    color: '#e6edf3',
    fontSize: 13,
  },
  privacyCover: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0d1117',
    alignItems: 'center',
    justifyContent: 'center',
  },
  privacyCoverText: {
    fontSize: 64,
  },
});
