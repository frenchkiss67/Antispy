import { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import PinPad, { PinDots } from '../components/PinPad';
import {
  savePin,
  saveDuressPin,
  verifyPin,
  verifyDuressPin,
} from '../security';
import t from '../i18n';

const PIN_LENGTH = 4;

// mode 'pin'    : changer le code principal (vérifie l'ancien d'abord).
// mode 'duress' : définir/changer le code de contrainte (depuis les
//                 réglages, donc déjà authentifié : pas d'étape "ancien").
// decoy         : session ouverte au code de contrainte ; "changer le PIN"
//                 modifie alors le code de contrainte, jamais le vrai.
export default function ChangePinScreen({
  pinLength,
  mode = 'pin',
  decoy = false,
  onDone,
  onCancel,
}) {
  const [step, setStep] = useState(mode === 'duress' ? 'new' : 'current');
  const [pin, setPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [error, setError] = useState('');

  const duressTarget = mode === 'duress' || decoy;
  const stepLength = step === 'current' ? pinLength : PIN_LENGTH;
  const titles = {
    current: t('currentPin'),
    new: mode === 'duress' ? t('newDuressPin') : t('newPin'),
    confirm: mode === 'duress' ? t('confirmDuressPin') : t('confirmNewPin'),
  };

  const handleDigit = async (digit) => {
    if (pin.length >= stepLength) {
      return;
    }
    setError('');
    const next = pin + digit;
    setPin(next);
    if (next.length < stepLength) {
      return;
    }
    if (step === 'current') {
      const valid = decoy ? await verifyDuressPin(next) : await verifyPin(next);
      if (valid) {
        setPin('');
        setStep('new');
      } else {
        setError(t('wrongPin'));
        setPin('');
      }
      return;
    }
    if (step === 'new') {
      // Le code principal et le code de contrainte doivent rester distincts.
      const collision = duressTarget
        ? await verifyPin(next)
        : await verifyDuressPin(next);
      if (collision) {
        setError(t('duressSameAsPin'));
        setPin('');
        return;
      }
      setNewPin(next);
      setPin('');
      setStep('confirm');
      return;
    }
    if (next === newPin) {
      if (duressTarget) {
        await saveDuressPin(next);
      } else {
        await savePin(next);
      }
      Alert.alert(t('appName'), t('pinChanged'));
      onDone();
    } else {
      setError(t('pinMismatch'));
      setPin('');
      setNewPin('');
      setStep('new');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        🔑 {mode === 'duress' ? t('duressSection') : t('changePin')}
      </Text>
      <Text style={styles.subtitle}>{titles[step]}</Text>
      {error !== '' && <Text style={styles.error}>{error}</Text>}
      <PinDots length={stepLength} filled={pin.length} error={error !== ''} />
      <PinPad onDigit={handleDigit} onDelete={() => setPin(pin.slice(0, -1))} />
      <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
        <Text style={styles.cancelButtonText}>{t('cancel')}</Text>
      </TouchableOpacity>
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
  title: {
    color: '#e6edf3',
    fontSize: 24,
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
  cancelButton: {
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
  cancelButtonText: {
    color: '#8b949e',
    fontSize: 14,
  },
});
