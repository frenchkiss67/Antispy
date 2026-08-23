import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from './Icon';
import t from '../i18n';

// En-tête commun aux onglets. « Verrouiller » vit ici, et non dans la barre
// d'onglets : c'est une action, pas une destination, et l'y mêler faisait
// fermer la session d'un appui distrait destiné à changer d'onglet.
export default function ScreenHeader({ title, onLock, children }) {
  return (
    <View style={styles.header}>
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      <View style={styles.actions}>
        {children}
        <TouchableOpacity
          style={styles.lockButton}
          onPress={onLock}
          accessibilityRole="button"
          accessibilityLabel={t('lock')}
        >
          <Icon name="lock" size={16} color="#e6edf3" strokeWidth={1.8} />
          <Text style={styles.lockText}>{t('lock')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Bouton d'action rond pour la zone d'en-tête (menu, etc.).
export function HeaderAction({ icon, onPress, label }) {
  return (
    <TouchableOpacity
      style={styles.action}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Icon name={icon} size={20} color="#8b949e" strokeWidth={1.8} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 14,
    gap: 10,
  },
  title: {
    color: '#e6edf3',
    fontSize: 22,
    fontWeight: '700',
    flexShrink: 1,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  action: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
  },
  lockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#21262d',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  lockText: {
    color: '#e6edf3',
    fontSize: 14,
  },
});
