import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import {
  readEncryptedText,
  writeEncryptedText,
  writeEncryptedImage,
  clearImageCache,
} from './cryptoStore';

// Le coffre existe en deux exemplaires : le vrai, et un leurre vide au
// départ, ouvert par le code de contrainte. Les deux sont chiffrés.
function paths(decoy) {
  const base = FileSystem.documentDirectory;
  return decoy
    ? {
        dir: `${base}vault-decoy/`,
        notes: `${base}vault-decoy-notes.json`,
        photos: `${base}vault-decoy-photos.json`,
      }
    : {
        dir: `${base}vault/`,
        notes: `${base}vault-notes.json`,
        photos: `${base}vault-photos.json`,
      };
}

async function ensureDir(decoy) {
  const { dir } = paths(decoy);
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }
}

let sequence = 0;
function nextId() {
  sequence = (sequence + 1) % 100000;
  return `${Date.now()}-${sequence}`;
}

async function readJson(file) {
  try {
    const content = await readEncryptedText(file);
    return content == null ? [] : JSON.parse(content);
  } catch (e) {
    return [];
  }
}

async function writeJson(file, data) {
  await writeEncryptedText(file, JSON.stringify(data));
}

export async function listNotes(decoy) {
  return readJson(paths(decoy).notes);
}

export async function saveNote(text, id, decoy) {
  const file = paths(decoy).notes;
  const notes = await readJson(file);
  let next;
  if (id) {
    next = notes.map((n) =>
      n.id === id ? { ...n, text, date: new Date().toISOString() } : n
    );
  } else {
    next = [
      { id: nextId(), text, date: new Date().toISOString() },
      ...notes,
    ];
  }
  await writeJson(file, next);
  return next;
}

export async function deleteNote(id, decoy) {
  const file = paths(decoy).notes;
  const next = (await readJson(file)).filter((n) => n.id !== id);
  await writeJson(file, next);
  return next;
}

export async function listVaultPhotos(decoy) {
  return readJson(paths(decoy).photos);
}

export async function importVaultPhoto(sourceUri, decoy) {
  await ensureDir(decoy);
  const { dir, photos: photosFile } = paths(decoy);
  const id = nextId();
  // Redimensionne avant chiffrement : limite la taille des fichiers et le
  // temps de déchiffrement à l'affichage.
  const main = await ImageManipulator.manipulateAsync(
    sourceUri,
    [{ resize: { width: 1600 } }],
    { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true }
  );
  const uri = `${dir}${id}.enc`;
  await writeEncryptedImage(uri, main.base64);
  const thumb = await ImageManipulator.manipulateAsync(
    sourceUri,
    [{ resize: { width: 240 } }],
    { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG, base64: true }
  );
  const thumbUri = `${dir}${id}-thumb.enc`;
  await writeEncryptedImage(thumbUri, thumb.base64);
  await FileSystem.deleteAsync(main.uri, { idempotent: true });
  await FileSystem.deleteAsync(thumb.uri, { idempotent: true });
  const photos = await readJson(photosFile);
  const next = [
    { id, uri, thumbUri, date: new Date().toISOString() },
    ...photos,
  ];
  await writeJson(photosFile, next);
  return next;
}

export async function deleteVaultPhoto(id, decoy) {
  const { photos: photosFile } = paths(decoy);
  const photos = await readJson(photosFile);
  const target = photos.find((p) => p.id === id);
  if (target) {
    await FileSystem.deleteAsync(target.uri, { idempotent: true });
    if (target.thumbUri) {
      await FileSystem.deleteAsync(target.thumbUri, { idempotent: true });
    }
  }
  const next = photos.filter((p) => p.id !== id);
  await writeJson(photosFile, next);
  clearImageCache();
  return next;
}

// Effacement d'urgence : supprime le vrai coffre (le leurre est conservé).
export async function wipeVault() {
  const { dir, notes, photos } = paths(false);
  await FileSystem.deleteAsync(dir, { idempotent: true });
  await FileSystem.deleteAsync(notes, { idempotent: true });
  await FileSystem.deleteAsync(photos, { idempotent: true });
  clearImageCache();
}
