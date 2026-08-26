import { useState } from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import PinPad, { PinDots } from '../components/PinPad';
import Icon from '../components/Icon';
import {
  savePin,
  saveDuressPin,
  verifyPin,
  verifyDuressPin,
  isDuressDefined,
  removeDuressPin,
} from '../security';
import t from '../i18n';

const LENGTHS = [4, 6];

// mode 'pin'    : changer le code principal (vérifie l'ancien d'abord).
// mode 'duress' : définir/changer le code de contrainte (déjà authentifié).
// decoy         : session ouverte au code de contrainte ; « changer le PIN »
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
  const [shakeKey, setShakeKey] = useState(0);
  // Même gabarit compact que l'écran de verrouillage : sans lui, le pavé
  // dépasse le bas de l'écran sur les petits téléphones.
  const { height } = useWindowDimensions();
  const compact = height < 800;

  // Un refus doit se voir : points rouges, secousse et vibration.
  const fail = (message) => {
    setError(message);
    setShakeKey((k) => k + 1);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(
      () => {}
    );
  };
  const [chosenLength, setChosenLength] = useState(pinLength);

  const duressTarget = mode === 'duress' || decoy;
  // Le code de contrainte doit avoir la même longueur que le code principal
  // (l'écran de verrouillage valide à cette longueur). Seul le changement du
  // code principal permet donc de choisir une nouvelle longueur.
  const newLength = duressTarget ? pinLength : chosenLength;
  const stepLength = step === 'current' ? pinLength : newLength;
  const canChooseLength = step === 'new' && !duressTarget && pin === '';

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
        fail(t('wrongPin'));
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
        fail(t('duressSameAsPin'));
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
        Alert.alert(t('appName'), t('pinChanged'));
      } else {
        await savePin(next);
        // Un code de contrainte défini à l'ancienne longueur ne serait plus
        // saisissable : on le supprime et on invite à le redéfinir.
        if (next.length !== pinLength && (await isDuressDefined())) {
          await removeDuressPin();
          Alert.alert(t('appName'), t('duressRemovedByLength'));
        } else {
          Alert.alert(t('appName'), t('pinChanged'));
        }
      }
      onDone();
    } else {
      fail(t('pinMismatch'));
      setPin('');
      setNewPin('');
      setStep('new');
    }
  };

  return (
    <View style={styles.container}>
      <Icon
        name="key"
        size={compact ? 32 : 40}
        color="#58a6ff"
        strokeWidth={1.6}
      />
      <Text style={styles.title}>
        {mode === 'duress' ? t('duressSection') : t('changePin')}
      </Text>
      <Text style={styles.subtitle}>{titles[step]}</Text>
      {canChooseLength && (
        <View style={styles.lengthChoice}>
          {LENGTHS.map((value) => (
            <TouchableOpacity
              key={value}
              style={[styles.chip, chosenLength === value && styles.chipActive]}
              onPress={() => setChosenLength(value)}
            >
              <Text style={styles.chipText}>{t('digits', value)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
      {error !== '' && <Text style={styles.error}>{error}</Text>}
      <PinDots
        length={stepLength}
        filled={pin.length}
        error={error !== ''}
        shakeKey={shakeKey}
        compact={compact}
      />
      <PinPad
        onDigit={handleDigit}
        onDelete={() => setPin(pin.slice(0, -1))}
        compact={compact}
      />
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
