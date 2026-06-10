import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as LocalAuthentication from 'expo-local-authentication';
import PinPad, { PinDots } from '../components/PinPad';
import { verifyPin } from '../security';
import { saveCapture } from '../captures';

export default function LockScreen({ pinLength, onUnlock }) {
  const cameraRef = useRef(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraReady, setCameraReady] = useState(false);
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);

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
      promptMessage: 'Déverrouiller Antispy',
      cancelLabel: 'Utiliser le code PIN',
      disableDeviceFallback: true,
    });
    if (result.success) {
      onUnlock();
    }
  };

  useEffect(() => {
    (async () => {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const enrolled = hasHardware && (await LocalAuthentication.isEnrolledAsync());
      setBiometricAvailable(enrolled);
      if (enrolled) {
        handleBiometric();
      }
    })();
  }, []);

  // Photographie silencieusement la personne en train de saisir le code.
  const capturePhoto = async () => {
    if (!cameraRef.current || !cameraReady || !permission?.granted) {
      return null;
    }
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.6,
        skipProcessing: true,
        shutterSound: false,
      });
      return photo?.uri ?? null;
    } catch (e) {
      return null;
    }
  };

  const handleDigit = async (digit) => {
    if (busy || pin.length >= pinLength) {
      return;
    }
    setError(false);
    const next = pin + digit;
    setPin(next);
    if (next.length < pinLength) {
      return;
    }
    setBusy(true);
    const photoUri = await capturePhoto();
    const success = await verifyPin(next);
    if (photoUri) {
      try {
        await saveCapture(photoUri, success);
      } catch (e) {
        // La photo n'a pas pu être enregistrée : on ne bloque pas la saisie.
      }
    }
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
      <Text style={styles.title}>🛡️ Antispy</Text>
      <Text style={styles.subtitle}>Saisissez votre code PIN</Text>
      {error && <Text style={styles.error}>Code PIN incorrect</Text>}
      <PinDots length={pinLength} filled={pin.length} error={error} />
      <PinPad
        onDigit={handleDigit}
        onDelete={() => setPin(pin.slice(0, -1))}
        disabled={busy}
      />
      {biometricAvailable && (
        <TouchableOpacity style={styles.biometricButton} onPress={handleBiometric}>
          <Text style={styles.biometricButtonText}>
            👤 Déverrouiller par empreinte ou visage
          </Text>
        </TouchableOpacity>
      )}
      {permission && !permission.granted && (
        <Text style={styles.warning}>
          Autorisez la caméra pour activer la photo de surveillance.
        </Text>
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
