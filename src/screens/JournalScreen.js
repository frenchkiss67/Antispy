import { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { deleteAllCaptures, listCaptures } from '../captures';

function formatDate(iso) {
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export default function JournalScreen({ onLock }) {
  const [captures, setCaptures] = useState([]);

  useEffect(() => {
    listCaptures().then(setCaptures);
  }, []);

  const handleDeleteAll = () => {
    Alert.alert(
      'Tout supprimer',
      'Supprimer toutes les photos de surveillance ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => setCaptures(await deleteAllCaptures()),
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Journal des saisies</Text>
        <TouchableOpacity style={styles.lockButton} onPress={onLock}>
          <Text style={styles.lockButtonText}>🔒 Verrouiller</Text>
        </TouchableOpacity>
      </View>
      {captures.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>
            Aucune photo pour l'instant.{'\n'}Chaque saisie du code PIN
            déclenche une photo de la personne devant l'écran.
          </Text>
        </View>
      ) : (
        <FlatList
          data={captures}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Image source={{ uri: item.uri }} style={styles.photo} />
              <View style={styles.cardInfo}>
                <Text style={styles.cardDate}>{formatDate(item.date)}</Text>
                <Text
                  style={[
                    styles.badge,
                    item.success ? styles.badgeOk : styles.badgeKo,
                  ]}
                >
                  {item.success ? '✓ Code correct' : '✗ Code erroné'}
                </Text>
              </View>
            </View>
          )}
        />
      )}
      {captures.length > 0 && (
        <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteAll}>
          <Text style={styles.deleteButtonText}>Tout supprimer</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d1117',
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  title: {
    color: '#e6edf3',
    fontSize: 22,
    fontWeight: '700',
  },
  lockButton: {
    backgroundColor: '#21262d',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  lockButtonText: {
    color: '#e6edf3',
    fontSize: 14,
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
    marginBottom: 6,
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
});
