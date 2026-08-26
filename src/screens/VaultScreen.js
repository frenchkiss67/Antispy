import { useEffect, useState } from 'react';
import {
  Alert,
  Dimensions,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {
  deleteNote,
  deleteVaultPhoto,
  importVaultPhoto,
  listNotes,
  listVaultPhotos,
  saveNote,
} from '../vault';
import DecryptedImage from '../components/DecryptedImage';
import ScreenHeader from '../components/ScreenHeader';
import Icon from '../components/Icon';
import t from '../i18n';

// decoy : ouvert avec le code de contrainte, l'écran travaille sur le faux
// coffre, distinct du vrai et identique en apparence.
export default function VaultScreen({ decoy, onLock }) {
  const [tab, setTab] = useState('notes'); // 'notes' | 'photos'
  const [notes, setNotes] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [editing, setEditing] = useState(null); // {id?, text}
  const [viewing, setViewing] = useState(null); // photo plein écran

  useEffect(() => {
    listNotes(decoy).then(setNotes);
    listVaultPhotos(decoy).then(setPhotos);
  }, [decoy]);

  const handleSaveNote = async () => {
    if (!editing || editing.text.trim() === '') {
      setEditing(null);
      return;
    }
    setNotes(await saveNote(editing.text.trim(), editing.id ?? null, decoy));
    setEditing(null);
  };

  const handleDeleteNote = (id) => {
    Alert.alert(t('delete'), t('deleteNoteMessage'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('delete'),
        style: 'destructive',
        onPress: async () => {
          setNotes(await deleteNote(id, decoy));
          setEditing(null);
        },
      },
    ]);
  };

  const handleAddPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      setPhotos(await importVaultPhoto(result.assets[0].uri, decoy));
    }
  };

  const handleDeletePhoto = (id) => {
    Alert.alert(t('delete'), t('deletePhotoMessage'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('delete'),
        style: 'destructive',
        onPress: async () => {
          setPhotos(await deleteVaultPhoto(id, decoy));
          setViewing(null);
        },
      },
    ]);
  };

  const photoSize = (Dimensions.get('window').width - 56) / 3;
  // Vacuité calculée par onglet : avec un coffre contenant des photos mais
  // aucune note, l'onglet Notes affichait une zone vide sans le moindre
  // message — l'écran paraissait cassé.
  const isEmpty = tab === 'notes' ? notes.length === 0 : photos.length === 0;

  return (
    <View style={styles.container}>
      <ScreenHeader title={t('vaultTitle')} onLock={onLock} />
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tab === 'notes' && styles.tabActive]}
          onPress={() => setTab('notes')}
        >
          <Text style={styles.tabText}>
            {t('notes')} ({notes.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'photos' && styles.tabActive]}
          onPress={() => setTab('photos')}
        >
          <Text style={styles.tabText}>
            {t('photos')} ({photos.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() =>
            tab === 'notes' ? setEditing({ text: '' }) : handleAddPhoto()
          }
        >
          <Text style={styles.addButtonText}>
            {tab === 'notes' ? t('addNote') : t('addPhoto')}
          </Text>
        </TouchableOpacity>
      </View>

      {isEmpty && (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>{t('vaultEmpty')}</Text>
        </View>
      )}

      {!isEmpty && tab === 'notes' && (
        <FlatList
          data={notes}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.noteCard}
              onPress={() => setEditing({ id: item.id, text: item.text })}
              onLongPress={() => handleDeleteNote(item.id)}
            >
              <Text style={styles.noteText} numberOfLines={3}>
                {item.text}
              </Text>
            </TouchableOpacity>
          )}
        />
      )}

      {!isEmpty && tab === 'photos' && (
        <FlatList
          data={photos}
          keyExtractor={(item) => item.id}
          numColumns={3}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => setViewing(item)}>
              <DecryptedImage
                file={item.thumbUri ?? item.uri}
                style={[
                  styles.gridPhoto,
                  { width: photoSize, height: photoSize },
                ]}
              />
            </TouchableOpacity>
          )}
        />
      )}

      <Modal visible={editing !== null} animationType="slide" transparent>
        <View style={styles.editModal}>
          <View style={styles.editCard}>
            <TextInput
              style={styles.input}
              multiline
              autoFocus
              placeholder={t('notePlaceholder')}
              placeholderTextColor="#8b949e"
              value={editing?.text ?? ''}
              onChangeText={(text) => setEditing({ ...editing, text })}
            />
            <View style={styles.editActions}>
              {editing?.id && (
                <TouchableOpacity
                  style={[styles.editButton, styles.editButtonDanger]}
                  onPress={() => handleDeleteNote(editing.id)}
                >
                  <Text style={styles.editButtonText}>{t('delete')}</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => setEditing(null)}
              >
                <Text style={styles.editButtonText}>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.editButton, styles.editButtonPrimary]}
                onPress={handleSaveNote}
              >
                <Text style={styles.editButtonText}>{t('save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={viewing !== null} animationType="fade" transparent>
        {viewing && (
          <View style={styles.viewModal}>
            <DecryptedImage
              file={viewing.uri}
              style={styles.fullPhoto}
              resizeMode="contain"
            />
            <View style={styles.viewActions}>
              <TouchableOpacity
                style={[styles.editButton, styles.editButtonDanger]}
                onPress={() => handleDeletePhoto(viewing.id)}
              >
                <Icon name="trash" size={16} color="#fff" strokeWidth={1.9} />
                <Text style={styles.editButtonText}>{t('delete')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => setViewing(null)}
              >
                <Icon name="close" size={16} color="#fff" strokeWidth={1.9} />
                <Text style={styles.editButtonText}>{t('close')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d1117',
    paddingTop: 0,
  },
  title: {
    color: '#e6edf3',
    fontSize: 22,
    fontWeight: '700',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 12,
    alignItems: 'center',
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    marginRight: 8,
  },
  tabActive: {
    backgroundColor: '#21262d',
  },
  tabText: {
    color: '#e6edf3',
    fontSize: 14,
  },
  addButton: {
    marginLeft: 'auto',
    backgroundColor: '#238636',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
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
  noteCard: {
    backgroundColor: '#161b22',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  noteText: {
    color: '#e6edf3',
    fontSize: 15,
    lineHeight: 21,
  },
  gridPhoto: {
    margin: 4,
    borderRadius: 8,
    backgroundColor: '#21262d',
  },
  editModal: {
    flex: 1,
    backgroundColor: '#000000aa',
    justifyContent: 'center',
    padding: 20,
  },
  editCard: {
    backgroundColor: '#161b22',
    borderRadius: 14,
    padding: 16,
  },
  input: {
    color: '#e6edf3',
    fontSize: 16,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#21262d',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginLeft: 8,
  },
  editButtonPrimary: {
    backgroundColor: '#238636',
  },
  editButtonDanger: {
    backgroundColor: '#da3633',
  },
  editButtonText: {
    color: '#ffffff',
    fontSize: 14,
  },
  viewModal: {
    flex: 1,
    backgroundColor: '#000000ee',
  },
  fullPhoto: {
    flex: 1,
  },
  viewActions: {
    position: 'absolute',
    bottom: 50,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
});
