import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Haptics from 'expo-haptics';
import { verifyPin, getLockUntil, registerAttempt } from '../security';
import { recordAttempt } from '../attempt';
import t from '../i18n';

const KEYS = [
  ['C', '⌫', '%', '÷'],
  ['7', '8', '9', '×'],
  ['4', '5', '6', '−'],
  ['1', '2', '3', '+'],
  ['0', '.', '=', ''],
];

// Évalue une expression arithmétique simple sans eval() :
// uniquement chiffres, point et opérateurs de base.
function evaluate(expression) {
  const sanitized = expression
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/−/g, '-')
    .replace(/%/g, '/100');
  if (!/^[0-9+\-*/. ()]+$/.test(sanitized)) {
    return null;
  }
  try {
    const tokens = sanitized.match(/(\d+\.?\d*|[+\-*/()])/g);
    if (!tokens) {
      return null;
    }
    let position = 0;
    const peek = () => tokens[position];
    const next = () => tokens[position++];
    const parsePrimary = () => {
      if (peek() === '(') {
        next();
        const value = parseAddition();
        if (peek() === ')') {
          next();
        }
        return value;
      }
      if (peek() === '-') {
        next();
        return -parsePrimary();
      }
      return parseFloat(next());
    };
    const parseMultiplication = () => {
      let value = parsePrimary();
      while (peek() === '*' || peek() === '/') {
        const op = next();
        const right = parsePrimary();
        value = op === '*' ? value * right : value / right;
      }
      return value;
    };
    const parseAddition = () => {
      let value = parseMultiplication();
      while (peek() === '+' || peek() === '-') {
        const op = next();
        const right = parseMultiplication();
        value = op === '+' ? value + right : value - right;
      }
      return value;
    };
    const result = parseAddition();
    return Number.isFinite(result) ? result : null;
  } catch (e) {
    return null;
  }
}

export default function CalculatorScreen({ pinLength, settings, onUnlock }) {
  const cameraRef = useRef(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraReady, setCameraReady] = useState(false);
  const [entry, setEntry] = useState('');
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const lockUntilRef = useRef(0);

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission]);

  useEffect(() => {
    getLockUntil().then((until) => {
      lockUntilRef.current = until;
    });
  }, []);

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
      onUnlock();
    }
  };

  const handleEquals = async () => {
    if (busy || entry === '') {
      return;
    }
    const isPinShaped = new RegExp(`^\\d{${pinLength}}$`).test(entry);
    if (isPinShaped) {
      setBusy(true);
      const success = await verifyPin(entry);
      const locked = lockUntilRef.current > Date.now();
      const until = await registerAttempt(success);
      if (until) {
        lockUntilRef.current = until;
      }
      await recordAttempt({
        cameraRef,
        cameraReady: cameraReady && permission?.granted,
        success,
        settings,
      });
      setBusy(false);
      // Pendant le blocage anti-bruteforce, même le bon code n'ouvre pas :
      // la calculatrice affiche simplement le nombre, sans rien trahir.
      if (success && !locked) {
        onUnlock();
        return;
      }
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
