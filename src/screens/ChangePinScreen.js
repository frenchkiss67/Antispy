import { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import PinPad, { PinDots } from '../components/PinPad';
import { savePin, verifyPin } from '../security';
import t from '../i18n';

const PIN_LENGTH = 4;

export default function ChangePinScreen({ pinLength, onDone, onCancel }) {
  const [step, setStep] = useState('current'); // 'current' | 'new' | 'confirm'
  const [pin, setPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [error, setError] = useState(false);

  const stepLength = step === 'current' ? pinLength : PIN_LENGTH;
  const titles = {
    current: t('currentPin'),
    new: t('newPin'),
    confirm: t('confirmNewPin'),
  };

  const handleDigit = async (digit) => {
    if (pin.length >= stepLength) {
      return;
    }
    setError(false);
    const next = pin + digit;
    setPin(next);
    if (next.length < stepLength) {
      return;
    }
    if (step === 'current') {
      if (await verifyPin(next)) {
        setPin('');
        setStep('new');
      } else {
        setError(true);
        setPin('');
      }
    } else if (step === 'new') {
      setNewPin(next);
      setPin('');
      setStep('confirm');
    } else if (next === newPin) {
      await savePin(next);
      Alert.alert(t('appName'), t('pinChanged'));
      onDone();
    } else {
      setError(true);
      setPin('');
      setNewPin('');
      setStep('new');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔑 {t('changePin')}</Text>
      <Text style={styles.subtitle}>{titles[step]}</Text>
      {error && (
        <Text style={styles.error}>
          {step === 'current' ? t('wrongPin') : t('pinMismatch')}
        </Text>
      )}
      <PinDots length={stepLength} filled={pin.length} error={error} />
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
