import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import PinPad, { PinDots } from '../components/PinPad';
import { savePin } from '../security';
import t from '../i18n';

const PIN_LENGTH = 4;

export default function SetupScreen({ onDone }) {
  const [step, setStep] = useState('create'); // 'create' | 'confirm'
  const [firstPin, setFirstPin] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  const handleDigit = async (digit) => {
    if (pin.length >= PIN_LENGTH) {
      return;
    }
    setError(false);
    const next = pin + digit;
    setPin(next);
    if (next.length < PIN_LENGTH) {
      return;
    }
    if (step === 'create') {
      setFirstPin(next);
      setPin('');
      setStep('confirm');
    } else if (next === firstPin) {
      await savePin(next);
      onDone();
    } else {
      setError(true);
      setPin('');
      setFirstPin('');
      setStep('create');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🛡️ {t('appName')}</Text>
      <Text style={styles.subtitle}>
        {step === 'create' ? t('choosePin') : t('confirmPin')}
      </Text>
      {error && <Text style={styles.error}>{t('pinMismatch')}</Text>}
      <PinDots length={PIN_LENGTH} filled={pin.length} error={error} />
      <PinPad
        onDigit={handleDigit}
        onDelete={() => setPin(pin.slice(0, -1))}
      />
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
});
