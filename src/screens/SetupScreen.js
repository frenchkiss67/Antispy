import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import PinPad, { PinDots } from '../components/PinPad';
import { savePin } from '../security';
import t from '../i18n';

const LENGTHS = [4, 6];

export default function SetupScreen({ onDone }) {
  const [length, setLength] = useState(4);
  const [step, setStep] = useState('create'); // 'create' | 'confirm'
  const [firstPin, setFirstPin] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  const handleDigit = async (digit) => {
    if (pin.length >= length) {
      return;
    }
    setError(false);
    const next = pin + digit;
    setPin(next);
    if (next.length < length) {
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

  // Le choix de la longueur n'est possible qu'avant de commencer la saisie.
  const canChooseLength = step === 'create' && pin === '';

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🛡️ {t('appName')}</Text>
      <Text style={styles.subtitle}>
        {step === 'create' ? t('choosePin') : t('confirmPin')}
      </Text>
      {canChooseLength && (
        <View style={styles.lengthChoice}>
          {LENGTHS.map((value) => (
            <TouchableOpacity
              key={value}
              style={[styles.chip, length === value && styles.chipActive]}
              onPress={() => setLength(value)}
            >
              <Text style={styles.chipText}>{t('digits', value)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
      {error && <Text style={styles.error}>{t('pinMismatch')}</Text>}
      <PinDots length={length} filled={pin.length} error={error} />
      <PinPad onDigit={handleDigit} onDelete={() => setPin(pin.slice(0, -1))} />
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
  lengthChoice: {
    flexDirection: 'row',
    marginTop: 16,
  },
  chip: {
    backgroundColor: '#21262d',
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 8,
    marginHorizontal: 6,
  },
  chipActive: {
    backgroundColor: '#1f6feb',
  },
  chipText: {
    color: '#e6edf3',
    fontSize: 14,
  },
  error: {
    color: '#f85149',
    fontSize: 14,
    marginTop: 12,
  },
});
