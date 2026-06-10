import * as FileSystem from 'expo-file-system';

const CAPTURES_DIR = `${FileSystem.documentDirectory}captures/`;
const INDEX_FILE = `${FileSystem.documentDirectory}captures.json`;

async function ensureDir() {
  const info = await FileSystem.getInfoAsync(CAPTURES_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(CAPTURES_DIR, { intermediates: true });
  }
}

export async function listCaptures() {
  try {
    const info = await FileSystem.getInfoAsync(INDEX_FILE);
    if (!info.exists) {
      return [];
    }
    const content = await FileSystem.readAsStringAsync(INDEX_FILE);
    return JSON.parse(content);
  } catch (e) {
    return [];
  }
}

export async function saveCapture(tempUri, success) {
  await ensureDir();
  const id = `${Date.now()}`;
  const destination = `${CAPTURES_DIR}${id}.jpg`;
  await FileSystem.moveAsync({ from: tempUri, to: destination });
  const captures = await listCaptures();
  captures.unshift({
    id,
    uri: destination,
    date: new Date().toISOString(),
    success,
  });
  await FileSystem.writeAsStringAsync(INDEX_FILE, JSON.stringify(captures));
  return captures;
}

export async function deleteAllCaptures() {
  const info = await FileSystem.getInfoAsync(CAPTURES_DIR);
  if (info.exists) {
    await FileSystem.deleteAsync(CAPTURES_DIR, { idempotent: true });
  }
  await FileSystem.deleteAsync(INDEX_FILE, { idempotent: true });
  return [];
}
