import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Haptics from 'expo-haptics';
import { verifyPin, verifyDuressPin, resetAttempts } from '../security';
import { recordAttempt } from '../attempt';
import { evaluate } from '../calculator';
import useLockCountdown from '../hooks/useLockCountdown';
import t from '../i18n';

const KEYS = [
  ['C', '⌫', '%', '÷'],
  ['7', '8', '9', '×'],
  ['4', '5', '6', '−'],
  ['1', '2', '3', '+'],
  ['0', '.', '=', ''],
];

export default function CalculatorScreen({ pinLength, settings, onUnlock }) {
  const cameraRef = useRef(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraReady, setCameraReady] = useState(false);
  const [entry, setEntry] = useState('');
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  // Compte à rebours silencieux : aucun indice visuel, mais le blocage
  // anti-bruteforce s'applique aussi derrière la calculatrice.
  const [lockRemaining, setLockRemaining] = useLockCountdown();

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission]);

  // Appui long sur "=" : déverrouillage biométrique discret, sans photo.
  const handleBiometric = async () => {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    if (!hasHardware || !(await LocalAuthentication.isEnrolledAsync())) {
      return;
    }
    const authenticated = await LocalAuthentication.authenticateAsync({
      promptMessage: t('biometricPrompt'),
      cancelLabel: t('biometricCancel'),
      disableDeviceFallback: true,
    });
    if (authenticated.success) {
      await resetAttempts();
      onUnlock(false);
    }
  };

  const handleEquals = async () => {
    if (busy || entry === '') {
      return;
    }
    // En camouflage, seul le code correct ou le code de contrainte agit : un
    // nombre quelconque tapé sur la calculatrice reste un simple calcul, sans
    // photo ni comptage d'échec. C'est indispensable ici — sinon un usage
    // normal (« 2024 = ») serait pris pour une intrusion et pourrait, cumulé,
    // déclencher l'effacement d'urgence. Un attaquant ignore d'ailleurs qu'il
    // s'agit d'un verrou : la force brute n'est pas la menace en camouflage.
    const isPinShaped = new RegExp(`^\\d{${pinLength}}$`).test(entry);
    if (isPinShaped) {
      setBusy(true);
      const realPin = await verifyPin(entry);
      const duress = !realPin && (await verifyDuressPin(entry));
      const accepted = realPin || duress;
      // Un blocage anti-bruteforce éventuel (hérité d'un usage non camouflé)
      // n'ouvre pas : on affiche seulement le résultat, sans rien trahir.
      if (accepted && lockRemaining === 0) {
        await resetAttempts();
        // La photo doit être prise pendant que la caméra est encore montée,
        // donc avant onUnlock (qui démonte cet écran) ; la persistance, elle,
        // continue en arrière-plan.
        await recordAttempt({
          cameraRef,
          cameraReady: cameraReady && permission?.granted,
          success: true,
          duress,
          settings,
        });
        setBusy(false);
        onUnlock(duress);
        return;
      }
      setBusy(false);
    }
    const value = evaluate(entry);
    setResult(value === null ? 'Error' : String(value));
  };

  const handleKey = (key) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (key === 'C') {
      setEntry('');
      setResult(null);
    } else if (key === '⌫') {
      setEntry(entry.slice(0, -1));
    } else if (key === '=') {
      handleEquals();
    } else {
      if (result !== null) {
        setResult(null);
        setEntry(/[0-9.]/.test(key) ? key : entry + key);
        return;
      }
      setEntry(entry + key);
    }
  };

  return (
    <View style={styles.container}>
      {permission?.granted && (
        <CameraView
          ref={cameraRef}
          facing="front"
          animateShutter={false}
          onCameraReady={() => setCameraReady(true)}
          style={styles.hiddenCamera}
        />
      )}
      <View style={styles.display}>
        <Text style={styles.entryText} numberOfLines={1}>
          {entry || '0'}
        </Text>
        {result !== null && (
          <Text style={styles.resultText} numberOfLines={1}>
            = {result}
          </Text>
        )}
      </View>
      <View style={styles.pad}>
        {KEYS.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.row}>
            {row.map((key, keyIndex) =>
              key === '' ? (
                <View key={keyIndex} style={styles.keyEmpty} />
              ) : (
                <TouchableOpacity
                  key={keyIndex}
                  style={[
                    styles.key,
                    key === '=' && styles.keyEquals,
                    ['÷', '×', '−', '+', '%'].includes(key) && styles.keyOp,
                  ]}
                  onPress={() => handleKey(key)}
                  onLongPress={key === '=' ? handleBiometric : undefined}
                >
                  <Text
                    style={[
                      styles.keyText,
                      key === '=' && styles.keyEqualsText,
                    ]}
                  >
                    {key}
                  </Text>
                </TouchableOpacity>
              )
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'flex-end',
    paddingBottom: 40,
  },
  hiddenCamera: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 1,
    height: 1,
    opacity: 0,
  },
  display: {
    paddingHorizontal: 28,
    paddingBottom: 24,
    alignItems: 'flex-end',
  },
  entryText: {
    color: '#ffffff',
    fontSize: 56,
    fontWeight: '300',
  },
  resultText: {
    color: '#8b949e',
    fontSize: 32,
    fontWeight: '300',
    marginTop: 8,
  },
  pad: {
    alignSelf: 'center',
  },
  row: {
    flexDirection: 'row',
  },
  key: {
    width: 80,
    height: 80,
    margin: 6,
    borderRadius: 40,
    backgroundColor: '#1c1c1e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyEmpty: {
    width: 80,
    height: 80,
    margin: 6,
  },
  keyOp: {
    backgroundColor: '#ff9f0a',
  },
  keyEquals: {
    backgroundColor: '#ff9f0a',
  },
  keyText: {
    color: '#ffffff',
    fontSize: 30,
    fontWeight: '400',
  },
  keyEqualsText: {
    fontWeight: '600',
  },
});
