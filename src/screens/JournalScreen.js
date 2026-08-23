import { useEffect, useState } from 'react';
import {
  Alert,
  Dimensions,
  FlatList,
  Modal,
  Pressable,
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
import ScreenHeader, { HeaderAction } from '../components/ScreenHeader';
import Icon from '../components/Icon';
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

export default function JournalScreen({ decoy, onLock }) {
  const [captures, setCaptures] = useState([]);
  const [lastSeen, setLastSeen] = useState(null);
  const [selected, setSelected] = useState(null);
  const [mapLocation, setMapLocation] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

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

  // La suppression globale vit dans le menu d'en-tête : c'est l'action la
  // plus irréversible de l'application, elle n'a rien à faire en permanence
  // sous le pouce, au bas de la liste.
  const handleDeleteAll = () => {
    setMenuOpen(false);
    setTimeout(() => {
      Alert.alert(t('deleteAllTitle'), t('deleteAllMessage'), [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('delete'),
          style: 'destructive',
          onPress: async () => setCaptures(await deleteAllCaptures()),
        },
      ]);
    }, 250);
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

  const verdict = (item) => {
    if (item.duress) {
      return { label: t('codeDuress'), style: styles.badgeDuress };
    }
    return item.success
      ? { label: t('codeOk'), style: styles.badgeOk }
      : { label: t('codeKo'), style: styles.badgeKo };
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title={t('journalTitle')} onLock={onLock}>
        {captures.length > 0 && (
          <HeaderAction
            icon="more"
            onPress={() => setMenuOpen(true)}
            label={t('menu')}
          />
        )}
      </ScreenHeader>

      {newCaptures.length > 0 && (
        <View style={[styles.banner, newFailed > 0 && styles.bannerAlert]}>
          <Icon
            name="alert"
            size={18}
            color={newFailed > 0 ? '#f85149' : '#58a6ff'}
            strokeWidth={1.8}
          />
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
          renderItem={({ item }) => {
            const v = verdict(item);
            return (
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
                  <Text style={[styles.badge, v.style]}>{v.label}</Text>
                  <View style={styles.metaRow}>
                    <Text style={styles.cardMeta}>
                      {t('photoCount', item.uris.length)}
                    </Text>
                    {item.location && (
                      <>
                        <Icon name="pin" size={12} color="#8b949e" strokeWidth={2} />
                        <Text style={styles.cardMeta}>
                          {item.location.latitude.toFixed(3)},{' '}
                          {item.location.longitude.toFixed(3)}
                        </Text>
                      </>
                    )}
                  </View>
                </View>
                {isNew(item) && (
                  <View style={styles.newBadge}>
                    <Text style={styles.newBadgeText}>{t('newBadge')}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
        />
      )}

      <Modal
        visible={menuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuOpen(false)}
      >
        <Pressable
          style={styles.menuBackdrop}
          onPress={() => setMenuOpen(false)}
        >
          <View style={styles.menuPanel}>
            <TouchableOpacity style={styles.menuItem} onPress={handleDeleteAll}>
              <Icon name="trash" size={18} color="#f85149" strokeWidth={1.8} />
              <Text style={styles.menuItemText}>{t('deleteAll')}</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

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
              <Text style={[styles.badge, verdict(selected).style]}>
                {verdict(selected).label}
              </Text>
            </View>
            <View style={styles.modalActions}>
              {selected.location && (
                <TouchableOpacity
                  style={styles.modalButton}
                  onPress={() => setMapLocation(selected.location)}
                >
                  <Icon name="pin" size={16} color="#fff" strokeWidth={1.9} />
                  <Text style={styles.modalButtonText}>{t('viewOnMap')}</Text>
                </TouchableOpacity>
              )}
              {selected.uris.length > 0 && (
                <TouchableOpacity
                  style={styles.modalButton}
                  onPress={() => handleShare(selected.uris[0])}
                >
                  <Icon name="share" size={16} color="#fff" strokeWidth={1.9} />
                  <Text style={styles.modalButtonText}>{t('share')}</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonDanger]}
                onPress={() => handleDeleteOne(selected)}
              >
                <Icon name="trash" size={16} color="#fff" strokeWidth={1.9} />
                <Text style={styles.modalButtonText}>{t('delete')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setSelected(null)}
              >
                <Icon name="close" size={16} color="#fff" strokeWidth={1.9} />
                <Text style={styles.modalButtonText}>{t('close')}</Text>
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
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
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
    flexShrink: 1,
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
    width: 104,
    height: 104,
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
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 5,
  },
  cardMeta: {
    color: '#8b949e',
    fontSize: 12,
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
  menuBackdrop: {
    flex: 1,
    backgroundColor: '#00000055',
  },
  menuPanel: {
    position: 'absolute',
    top: 96,
    right: 20,
    backgroundColor: '#21262d',
    borderRadius: 10,
    paddingVertical: 4,
    minWidth: 190,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  menuItemText: {
    color: '#f85149',
    fontSize: 15,
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
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  modalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#21262d',
    paddingVertical: 10,
    paddingHorizontal: 14,
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
