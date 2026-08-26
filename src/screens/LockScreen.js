import { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Haptics from 'expo-haptics';
import PinPad, { PinDots } from '../components/PinPad';
import Icon from '../components/Icon';
import {
  verifyPin,
  verifyDuressPin,
  registerAttempt,
  resetAttempts,
} from '../security';
import { wipeVault } from '../vault';
import { recordAttempt } from '../attempt';
import useLockCountdown from '../hooks/useLockCountdown';
import t from '../i18n';

const WIPE_THRESHOLD = 10;

export default function LockScreen({ pinLength, settings, onUnlock }) {
  const cameraRef = useRef(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraReady, setCameraReady] = useState(false);
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [lockRemaining, setLockRemaining] = useLockCountdown();
  // Sur un petit écran, le gabarit pleine taille coupait la dernière
  // rangée du pavé (biométrie / 0 / effacer).
  const { height } = useWindowDimensions();
  const compact = height < 800;

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission]);

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
      // Un déverrouillage biométrique réussi vaut succès : on efface le
      // compteur d'échecs, sinon ils s'accumuleraient jusqu'à un éventuel
      // effacement d'urgence sans qu'aucune attaque n'ait eu lieu.
      await resetAttempts();
      setLockRemaining(0);
      onUnlock(false);
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
    const realPin = await verifyPin(next);
    const duress = !realPin && (await verifyDuressPin(next));
    const accepted = realPin || duress;
    const { fails, lockSeconds } = await registerAttempt(accepted);
    if (lockSeconds > 0) {
      setLockRemaining(lockSeconds);
    }
    if (!accepted && settings.wipeEnabled && fails >= WIPE_THRESHOLD) {
      await wipeVault();
    }
    await recordAttempt({
      cameraRef,
      cameraReady: cameraReady && permission?.granted,
      success: accepted,
      duress,
      settings,
    });
    if (accepted) {
      onUnlock(duress);
    } else {
      // Points rouges, secousse et vibration : un code faux doit se voir
      // du coin de l'œil, sinon il passe pour un appui manqué.
      setError(true);
      setShakeKey((k) => k + 1);
      setPin('');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(
        () => {}
      );
    }
    setBusy(false);
  };

  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      {permission?.granted && (
        <CameraView
          ref={cameraRef}
          facing="front"
          animateShutter={false}
          onCameraReady={() => setCameraReady(true)}
          style={styles.hiddenCamera}
        />
      )}

      <View style={[styles.header, compact && styles.headerCompact]}>
        <Icon
          name="shield"
          size={compact ? 40 : 52}
          color="#58a6ff"
          strokeWidth={1.6}
        />
        <Text style={[styles.title, compact && styles.titleCompact]}>
          {t('appName')}
        </Text>
        <Text style={[styles.subtitle, compact && styles.subtitleCompact]}>
          {t('enterPin')}
        </Text>
      </View>

      {/* Hauteur fixe : le message ne doit pas décaler les points. */}
      <View style={[styles.messageSlot, compact && styles.messageSlotCompact]}>
        {lockRemaining > 0 ? (
          <Text style={styles.error}>{t('lockedFor', lockRemaining)}</Text>
        ) : error ? (
          <Text style={styles.error}>{t('wrongPin')}</Text>
        ) : null}
      </View>

      <PinDots
        length={pinLength}
        filled={pin.length}
        error={error}
        shakeKey={shakeKey}
        verifying={busy}
        compact={compact}
      />

      {/* Pousse le pavé en bas : la zone que le pouce atteint d'une main. */}
      <View style={styles.spacer} />

      <PinPad
        onDigit={handleDigit}
        onDelete={() => setPin(pin.slice(0, -1))}
        onBiometric={biometricAvailable ? handleBiometric : undefined}
        disabled={busy || lockRemaining > 0}
        compact={compact}
      />

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
    paddingTop: 64,
    paddingBottom: 44,
  },
  containerCompact: {
    paddingTop: 28,
    paddingBottom: 24,
  },
  hiddenCamera: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 1,
    height: 1,
    opacity: 0,
  },
  header: {
    alignItems: 'center',
    gap: 10,
  },
  headerCompact: {
    gap: 8,
  },
  title: {
    color: '#e6edf3',
    fontSize: 32,
    fontWeight: '700',
  },
  titleCompact: {
    fontSize: 26,
  },
  subtitle: {
    color: '#8b949e',
    fontSize: 17,
  },
  subtitleCompact: {
    fontSize: 15,
  },
  messageSlot: {
    height: 26,
    justifyContent: 'center',
    marginTop: 10,
  },
  messageSlotCompact: {
    height: 22,
    marginTop: 6,
  },
  error: {
    color: '#f85149',
    fontSize: 14,
  },
  spacer: {
    flexGrow: 1,
  },
  warning: {
    color: '#d29922',
    fontSize: 13,
    marginTop: 20,
    marginHorizontal: 32,
    textAlign: 'center',
  },
});
