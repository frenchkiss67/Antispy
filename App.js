import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import SetupScreen from './src/screens/SetupScreen';
import LockScreen from './src/screens/LockScreen';
import JournalScreen from './src/screens/JournalScreen';
import { getPinLength, isPinDefined } from './src/security';

export default function App() {
  const [screen, setScreen] = useState('loading'); // 'loading' | 'setup' | 'locked' | 'unlocked'
  const [pinLength, setPinLength] = useState(4);

  useEffect(() => {
    (async () => {
      if (await isPinDefined()) {
        setPinLength(await getPinLength());
        setScreen('locked');
      } else {
        setScreen('setup');
      }
    })();
  }, []);

  // Reverrouille dès que l'application passe en arrière-plan.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') {
        setScreen((current) =>
          current === 'unlocked' ? 'locked' : current
        );
      }
    });
    return () => subscription.remove();
  }, []);

  const handleSetupDone = async () => {
    setPinLength(await getPinLength());
    setScreen('locked');
  };

  return (
    <>
      <StatusBar style="light" />
      {screen === 'setup' && <SetupScreen onDone={handleSetupDone} />}
      {screen === 'locked' && (
        <LockScreen pinLength={pinLength} onUnlock={() => setScreen('unlocked')} />
      )}
      {screen === 'unlocked' && (
        <JournalScreen onLock={() => setScreen('locked')} />
      )}
    </>
  );
}
