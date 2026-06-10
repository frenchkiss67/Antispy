import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Haptics from 'expo-haptics';

const KEYS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['', '0', '⌫'],
];

export default function PinPad({ onDigit, onDelete, disabled }) {
  const handlePress = (key) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (key === '⌫') {
      onDelete();
    } else {
      onDigit(key);
    }
  };

  return (
    <View style={styles.pad}>
      {KEYS.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.row}>
          {row.map((key, keyIndex) =>
            key === '' ? (
              <View key={keyIndex} style={styles.keyEmpty} />
            ) : (
              <TouchableOpacity
                key={keyIndex}
                style={styles.key}
                disabled={disabled}
                onPress={() => handlePress(key)}
              >
                <Text style={styles.keyText}>{key}</Text>
              </TouchableOpacity>
            )
          )}
        </View>
      ))}
    </View>
  );
}

export function PinDots({ length, filled, error }) {
  return (
    <View style={styles.dots}>
      {Array.from({ length }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            i < filled && styles.dotFilled,
            error && styles.dotError,
          ]}
        />
      ))}
    </View>
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
    width: 76,
    height: 76,
    margin: 10,
    borderRadius: 38,
    backgroundColor: '#21262d',
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyEmpty: {
    width: 76,
    height: 76,
    margin: 10,
  },
  keyText: {
    color: '#e6edf3',
    fontSize: 28,
    fontWeight: '500',
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 24,
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
