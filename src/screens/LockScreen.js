import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as LocalAuthentication from 'expo-local-authentication';
import PinPad, { PinDots } from '../components/PinPad';
import { verifyPin, getLockUntil, registerAttempt } from '../security';
import { recordAttempt } from '../attempt';
import t from '../i18n';

export default function LockScreen({ pinLength, settings, onUnlock }) {
  const cameraRef = useRef(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraReady, setCameraReady] = useState(false);
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [lockUntil, setLockUntil] = useState(0);
  const [now, setNow] = useState(Date.now());

  const lockRemaining = Math.max(0, Math.ceil((lockUntil - now) / 1000));

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission]);

  useEffect(() => {
    getLockUntil().then(setLockUntil);
  }, []);

  // Compte à rebours pendant le blocage anti-bruteforce.
  useEffect(() => {
    if (lockUntil <= Date.now()) {
      return undefined;
    }
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [lockUntil]);

  // Déverrouillage par empreinte ou visage : aucune photo n'est prise.
  const handleBiometric = async () => {
    if (busy) {
      return;
    }
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: t('biometricPrompt'),
      cancelLabel: t('biometricCancel'),
      disableDeviceFallback: true,
    });
    if (result.success) {
      onUnlock();
    }
  };

  useEffect(() => {
    (async () => {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const enrolled =
        hasHardware && (await LocalAuthentication.isEnrolledAsync());
      setBiometricAvailable(enrolled);
      if (enrolled) {
        handleBiometric();
      }
    })();
  }, []);

  const handleDigit = async (digit) => {
    if (busy || lockRemaining > 0 || pin.length >= pinLength) {
      return;
    }
    setError(false);
    const next = pin + digit;
    setPin(next);
    if (next.length < pinLength) {
      return;
    }
    setBusy(true);
    const success = await verifyPin(next);
    const until = await registerAttempt(success);
    if (until) {
      setLockUntil(until);
      setNow(Date.now());
    }
    await recordAttempt({
      cameraRef,
      cameraReady: cameraReady && permission?.granted,
      success,
      settings,
    });
    if (success) {
      onUnlock();
    } else {
      setError(true);
      setPin('');
    }
    setBusy(false);
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
      <Text style={styles.title}>🛡️ {t('appName')}</Text>
      <Text style={styles.subtitle}>{t('enterPin')}</Text>
      {lockRemaining > 0 ? (
        <Text style={styles.error}>{t('lockedFor', lockRemaining)}</Text>
      ) : (
        error && <Text style={styles.error}>{t('wrongPin')}</Text>
      )}
      <PinDots length={pinLength} filled={pin.length} error={error} />
      <PinPad
        onDigit={handleDigit}
        onDelete={() => setPin(pin.slice(0, -1))}
        disabled={busy || lockRemaining > 0}
      />
      {biometricAvailable && (
        <TouchableOpacity
          style={styles.biometricButton}
          onPress={handleBiometric}
        >
          <Text style={styles.biometricButtonText}>{t('biometricButton')}</Text>
        </TouchableOpacity>
      )}
      {permission && !permission.granted && (
        <Text style={styles.warning}>{t('cameraWarning')}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d1117',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hiddenCamera: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 1,
    height: 1,
    opacity: 0,
  },
  title: {
    color: '#e6edf3',
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 12,
  },
  subtitle: {
    color: '#8b949e',
    fontSize: 17,
  },
  error: {
    color: '#f85149',
    fontSize: 14,
    marginTop: 12,
  },
  biometricButton: {
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
    backgroundColor: '#21262d',
  },
  biometricButtonText: {
    color: '#58a6ff',
    fontSize: 14,
  },
  warning: {
    color: '#d29922',
    fontSize: 13,
    marginTop: 24,
    marginHorizontal: 32,
    textAlign: 'center',
  },
});
