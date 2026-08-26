import { useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';
import Icon from './Icon';
import {
  osmEmbedUrl,
  nativeMapsUrl,
  webMapsUrl,
  formatCoords,
} from '../maps';
import t from '../i18n';

// Affiche la position d'une tentative sur une carte OpenStreetMap (chargée à
// la demande, donc aucun trafic réseau tant que l'utilisateur n'ouvre pas la
// carte) et permet de l'ouvrir dans l'application de cartes du téléphone.
export default function LocationMap({ location, visible, onClose }) {
  const [loading, setLoading] = useState(true);

  // Sans coordonnées, rien à afficher (évite d'évaluer le rendu à vide).
  if (!location) {
    return null;
  }

  // Depuis Android 11, les restrictions de visibilité des paquets font que
  // canOpenURL('geo:…') renvoie false même quand une application de cartes est
  // installée (aucun bloc <queries> n'est déclaré par défaut). On tente donc
  // l'ouverture directe et on ne se rabat sur le web que si elle échoue.
  const openInMaps = () => {
    Linking.openURL(nativeMapsUrl(location)).catch(() => {
      Linking.openURL(webMapsUrl(location)).catch(() => {});
    });
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.coordsRow}>
            <Icon name="pin" size={16} color="#f85149" strokeWidth={2} />
            <Text style={styles.coords}>{formatCoords(location)}</Text>
          </View>
          <TouchableOpacity onPress={onClose}>
            <Icon name="close" size={22} color="#e6edf3" strokeWidth={1.8} />
          </TouchableOpacity>
        </View>
        <View style={styles.mapWrapper}>
          {visible && (
            <WebView
              source={{ uri: osmEmbedUrl(location) }}
              style={styles.map}
              onLoadEnd={() => setLoading(false)}
            />
          )}
          {loading && (
            <View style={styles.loader} pointerEvents="none">
              <ActivityIndicator color="#58a6ff" />
            </View>
          )}
        </View>
        <Text style={styles.note}>{t('mapPrivacyNote')}</Text>
        <TouchableOpacity style={styles.button} onPress={openInMaps}>
          <Icon name="map" size={18} color="#ffffff" strokeWidth={1.8} />
          <Text style={styles.buttonText}>{t('openInMaps')}</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d1117',
    paddingTop: 50,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  coordsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  coords: {
    color: '#e6edf3',
    fontSize: 16,
  },
  close: {
    color: '#e6edf3',
    fontSize: 22,
    paddingHorizontal: 8,
  },
  mapWrapper: {
    flex: 1,
    marginHorizontal: 16,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#161b22',
  },
  map: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loader: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  note: {
    color: '#8b949e',
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 24,
    marginTop: 12,
  },
  button: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    margin: 20,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#1f6feb',
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
});
