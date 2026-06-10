import * as FileSystem from 'expo-file-system';

const VAULT_DIR = `${FileSystem.documentDirectory}vault/`;
const NOTES_FILE = `${FileSystem.documentDirectory}vault-notes.json`;
const PHOTOS_FILE = `${FileSystem.documentDirectory}vault-photos.json`;

async function ensureDir() {
  const info = await FileSystem.getInfoAsync(VAULT_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(VAULT_DIR, { intermediates: true });
  }
}

async function readJson(file) {
  try {
    const info = await FileSystem.getInfoAsync(file);
    if (!info.exists) {
      return [];
    }
    return JSON.parse(await FileSystem.readAsStringAsync(file));
  } catch (e) {
    return [];
  }
}

export async function listNotes() {
  return readJson(NOTES_FILE);
}

export async function saveNote(text, id = null) {
  const notes = await readJson(NOTES_FILE);
  let next;
  if (id) {
    next = notes.map((n) =>
      n.id === id ? { ...n, text, date: new Date().toISOString() } : n
    );
  } else {
    next = [
      { id: `${Date.now()}`, text, date: new Date().toISOString() },
      ...notes,
    ];
  }
  await FileSystem.writeAsStringAsync(NOTES_FILE, JSON.stringify(next));
  return next;
}

export async function deleteNote(id) {
  const notes = await readJson(NOTES_FILE);
  const next = notes.filter((n) => n.id !== id);
  await FileSystem.writeAsStringAsync(NOTES_FILE, JSON.stringify(next));
  return next;
}

export async function listVaultPhotos() {
  return readJson(PHOTOS_FILE);
}

export async function importVaultPhoto(sourceUri) {
  await ensureDir();
  const id = `${Date.now()}`;
  const destination = `${VAULT_DIR}${id}.jpg`;
  await FileSystem.copyAsync({ from: sourceUri, to: destination });
  const photos = await readJson(PHOTOS_FILE);
  const next = [
    { id, uri: destination, date: new Date().toISOString() },
    ...photos,
  ];
  await FileSystem.writeAsStringAsync(PHOTOS_FILE, JSON.stringify(next));
  return next;
}

export async function deleteVaultPhoto(id) {
  const photos = await readJson(PHOTOS_FILE);
  const target = photos.find((p) => p.id === id);
  if (target) {
    await FileSystem.deleteAsync(target.uri, { idempotent: true });
  }
  const next = photos.filter((p) => p.id !== id);
  await FileSystem.writeAsStringAsync(PHOTOS_FILE, JSON.stringify(next));
  return next;
}
