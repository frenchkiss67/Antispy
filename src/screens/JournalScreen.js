import { useEffect, useState } from 'react';
import {
  Alert,
  Dimensions,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { deleteAllCaptures, deleteCapture, listCaptures } from '../captures';
import { loadSettings, saveSettings } from '../settings';
import { loadImageUri } from '../cryptoStore';
import DecryptedImage from '../components/DecryptedImage';
import LocationMap from '../components/LocationMap';
import t from '../i18n';

function formatDate(iso) {
  return new Date(iso).toLocaleString(undefined, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export default function JournalScreen({ decoy }) {
  const [captures, setCaptures] = useState([]);
  const [lastSeen, setLastSeen] = useState(null);
  const [selected, setSelected] = useState(null);
  const [mapLocation, setMapLocation] = useState(null);

  useEffect(() => {
    // En mode contrainte (faux coffre), le journal reste vide : il ne doit
    // rien révéler de la surveillance.
    if (decoy) {
      return;
    }
    (async () => {
      const settings = await loadSettings();
      setLastSeen(settings.lastSeen);
      setCaptures(await listCaptures());
      await saveSettings({ lastSeen: new Date().toISOString() });
    })();
  }, [decoy]);

  const isNew = (capture) => lastSeen && capture.date > lastSeen;
  const newCaptures = captures.filter(isNew);
  const newFailed = newCaptures.filter((c) => !c.success).length;

  const handleDeleteAll = () => {
    Alert.alert(t('deleteAllTitle'), t('deleteAllMessage'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('delete'),
        style: 'destructive',
        onPress: async () => setCaptures(await deleteAllCaptures()),
      },
    ]);
  };

  const handleDeleteOne = (capture) => {
    Alert.alert(t('delete'), t('deleteOneMessage'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('delete'),
        style: 'destructive',
        onPress: async () => {
          setCaptures(await deleteCapture(capture.id));
          setSelected(null);
        },
      },
    ]);
  };

  // Les fichiers stockés sont chiffrés : pour partager, on déchiffre vers
  // un fichier temporaire du cache, supprimé juste après l'envoi.
  const handleShare = async (file) => {
    if (!(await Sharing.isAvailableAsync())) {
      return;
    }
    const uri = await loadImageUri(file);
    if (!uri) {
      return;
    }
    if (!uri.startsWith('data:')) {
      await Sharing.shareAsync(uri);
      return;
    }
    const temp = `${FileSystem.cacheDirectory}share-${Date.now()}.jpg`;
    await FileSystem.writeAsStringAsync(temp, uri.split(',')[1], {
      encoding: FileSystem.EncodingType.Base64,
    });
    try {
      await Sharing.shareAsync(temp);
    } finally {
      await FileSystem.deleteAsync(temp, { idempotent: true });
    }
  };

  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('journalTitle')}</Text>
      {newCaptures.length > 0 && (
        <View style={[styles.banner, newFailed > 0 && styles.bannerAlert]}>
          <Text style={styles.bannerText}>
            {t('absenceAlert', newCaptures.length, newFailed)}
          </Text>
        </View>
      )}
      {captures.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>{t('journalEmpty')}</Text>
        </View>
      ) : (
        <FlatList
          data={captures}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.card, isNew(item) && styles.cardNew]}
              onPress={() => setSelected(item)}
            >
              <DecryptedImage
                file={item.thumbUri ?? item.uris[0]}
                style={styles.photo}
              />
              <View style={styles.cardInfo}>
                <Text style={styles.cardDate}>{formatDate(item.date)}</Text>
                <Text
                  style={[
                    styles.badge,
                    item.duress
                      ? styles.badgeDuress
                      : item.success
                        ? styles.badgeOk
                        : styles.badgeKo,
                  ]}
                >
                  {item.duress
                    ? t('codeDuress')
                    : item.success
                      ? t('codeOk')
                      : t('codeKo')}
                </Text>
                <Text style={styles.cardMeta}>
                  {t('photoCount', item.uris.length)}
                  {item.location
                    ? `  ·  📍 ${item.location.latitude.toFixed(4)}, ${item.location.longitude.toFixed(4)}`
                    : ''}
                </Text>
              </View>
              {isNew(item) && (
                <View style={styles.newBadge}>
                  <Text style={styles.newBadgeText}>{t('newBadge')}</Text>
                </View>
              )}
            </TouchableOpacity>
          )}
        />
      )}
      {captures.length > 0 && (
        <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteAll}>
          <Text style={styles.deleteButtonText}>{t('deleteAll')}</Text>
        </TouchableOpacity>
      )}

      <Modal visible={selected !== null} animationType="fade" transparent>
        {selected && (
          <View style={styles.modal}>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
            >
              {selected.uris.map((uri) => (
                <DecryptedImage
                  key={uri}
                  file={uri}
                  style={{ width: screenWidth, height: screenHeight }}
                  resizeMode="contain"
                />
              ))}
            </ScrollView>
            <View style={styles.modalHeader}>
              <Text style={styles.modalDate}>{formatDate(selected.date)}</Text>
              <Text
                style={[
                  styles.badge,
                  selected.duress
                    ? styles.badgeDuress
                    : selected.success
                      ? styles.badgeOk
                      : styles.badgeKo,
                ]}
              >
                {selected.duress
                  ? t('codeDuress')
                  : selected.success
                    ? t('codeOk')
                    : t('codeKo')}
              </Text>
            </View>
            <View style={styles.modalActions}>
              {selected.location && (
                <TouchableOpacity
                  style={styles.modalButton}
                  onPress={() => setMapLocation(selected.location)}
                >
                  <Text style={styles.modalButtonText}>{t('viewOnMap')}</Text>
                </TouchableOpacity>
              )}
              {selected.uris.length > 0 && (
                <TouchableOpacity
                  style={styles.modalButton}
                  onPress={() => handleShare(selected.uris[0])}
                >
                  <Text style={styles.modalButtonText}>↗ {t('share')}</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonDanger]}
                onPress={() => handleDeleteOne(selected)}
              >
                <Text style={styles.modalButtonText}>🗑 {t('delete')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setSelected(null)}
              >
                <Text style={styles.modalButtonText}>✕ {t('close')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </Modal>

      <LocationMap
        location={mapLocation}
        visible={mapLocation !== null}
        onClose={() => setMapLocation(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d1117',
    paddingTop: 60,
  },
  title: {
    color: '#e6edf3',
    fontSize: 22,
    fontWeight: '700',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  banner: {
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#1f3a5f',
  },
  bannerAlert: {
    backgroundColor: '#5a1e1b',
  },
  bannerText: {
    color: '#e6edf3',
    fontSize: 14,
    lineHeight: 20,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    color: '#8b949e',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#161b22',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  cardNew: {
    borderWidth: 1,
    borderColor: '#58a6ff',
  },
  photo: {
    width: 90,
    height: 90,
    backgroundColor: '#21262d',
  },
  cardInfo: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
  },
  cardDate: {
    color: '#e6edf3',
    fontSize: 15,
    marginBottom: 4,
  },
  badge: {
    fontSize: 13,
    fontWeight: '600',
  },
  badgeOk: {
    color: '#3fb950',
  },
  badgeKo: {
    color: '#f85149',
  },
  badgeDuress: {
    color: '#d29922',
  },
  cardMeta: {
    color: '#8b949e',
    fontSize: 12,
    marginTop: 4,
  },
  newBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#58a6ff',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  newBadgeText: {
    color: '#0d1117',
    fontSize: 10,
    fontWeight: '700',
  },
  deleteButton: {
    margin: 20,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#da3633',
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  modal: {
    flex: 1,
    backgroundColor: '#000000ee',
  },
  modalHeader: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalDate: {
    color: '#e6edf3',
    fontSize: 15,
  },
  modalActions: {
    position: 'absolute',
    bottom: 50,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  modalButton: {
    backgroundColor: '#21262d',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  modalButtonDanger: {
    backgroundColor: '#da3633',
  },
  modalButtonText: {
    color: '#ffffff',
    fontSize: 14,
  },
});
