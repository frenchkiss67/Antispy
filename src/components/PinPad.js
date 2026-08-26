import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import Icon from './Icon';

const KEYS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['bio', '0', 'del'],
];

// Deux gabarits : sur un petit écran (iPhone SE, petits Android), le pavé
// pleine taille ne tient pas sous l'en-tête et la dernière rangée serait
// coupée. Le gabarit compact garde le pavé entier et atteignable.
const SIZES = {
  normal: { key: 76, margin: 10, font: 28, bio: 30, del: 28, dotGap: 24 },
  compact: { key: 64, margin: 7, font: 24, bio: 26, del: 24, dotGap: 14 },
};

export function padMetrics(compact) {
  return compact ? SIZES.compact : SIZES.normal;
}

const LABELS = {
  bio: 'Déverrouiller par empreinte ou visage',
  del: 'Effacer le dernier chiffre',
};

export default function PinPad({
  onDigit,
  onDelete,
  onBiometric,
  disabled,
  compact,
}) {
  const s = padMetrics(compact);

  const handlePress = (key) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (key === 'del') {
      onDelete();
    } else if (key === 'bio') {
      onBiometric();
    } else {
      onDigit(key);
    }
  };

  const cell = { width: s.key, height: s.key, margin: s.margin };

  return (
    <View style={styles.pad}>
      {KEYS.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.row}>
          {row.map((key) => {
            // La biométrie occupe la case libre en bas à gauche : elle
            // devient atteignable au pouce, au lieu d'un bouton texte isolé.
            if (key === 'bio' && !onBiometric) {
              return <View key={key} style={cell} />;
            }
            const plain = key === 'bio' || key === 'del';
            return (
              <TouchableOpacity
                key={key}
                style={[
                  styles.key,
                  cell,
                  { borderRadius: s.key / 2 },
                  plain && styles.keyPlain,
                ]}
                // La biométrie reste active même pendant un blocage
                // anti-bruteforce : elle prouve l'identité du propriétaire,
                // le blocage ne vise que les essais de code.
                disabled={key === 'bio' ? false : disabled}
                onPress={() => handlePress(key)}
                accessibilityRole="button"
                accessibilityLabel={LABELS[key] ?? key}
              >
                {key === 'bio' ? (
                  <Icon name="fingerprint" size={s.bio} color="#58a6ff" strokeWidth={1.5} />
                ) : key === 'del' ? (
                  <Icon name="backspace" size={s.del} color="#8b949e" strokeWidth={1.6} />
                ) : (
                  <Text style={[styles.keyText, { fontSize: s.font }]}>{key}</Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
}

// filled    : nombre de chiffres saisis
// error     : la saisie vient d'échouer (points rouges)
// shakeKey  : incrémenté à chaque échec pour rejouer la secousse
// verifying : vérification en cours (le dernier point pulse)
export function PinDots({
  length,
  filled,
  error,
  shakeKey = 0,
  verifying,
  compact,
}) {
  const shift = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!shakeKey) {
      return;
    }
    const step = (to, duration) =>
      Animated.timing(shift, { toValue: to, duration, useNativeDriver: true });
    shift.setValue(0);
    Animated.sequence([
      step(-9, 60),
      step(9, 80),
      step(-5, 70),
      step(5, 70),
      step(0, 60),
    ]).start();
  }, [shakeKey]);

  useEffect(() => {
    if (!verifying) {
      pulse.stopAnimation(() => pulse.setValue(1));
      return undefined;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.45, duration: 420, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 420, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [verifying]);

  return (
    <Animated.View
      style={[
        styles.dots,
        { marginVertical: padMetrics(compact).dotGap },
        { transform: [{ translateX: shift }] },
      ]}
    >
      {Array.from({ length }).map((_, i) => {
        const on = i < filled;
        const isLast = verifying && i === filled - 1;
        return (
          <Animated.View
            key={i}
            style={[
              styles.dot,
              on && styles.dotFilled,
              error && styles.dotError,
              isLast && { transform: [{ scale: pulse }] },
            ]}
          />
        );
      })}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  pad: {
    alignSelf: 'center',
  },
  row: {
    flexDirection: 'row',
  },
  key: {
    backgroundColor: '#21262d',
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyPlain: {
    backgroundColor: 'transparent',
  },
  keyText: {
    color: '#e6edf3',
    fontWeight: '500',
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginHorizontal: 8,
    borderWidth: 2,
    borderColor: '#8b949e',
  },
  dotFilled: {
    backgroundColor: '#58a6ff',
    borderColor: '#58a6ff',
  },
  dotError: {
    backgroundColor: '#f85149',
    borderColor: '#f85149',
  },
});
