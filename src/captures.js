import * as FileSystem from 'expo-file-system';

const CAPTURES_DIR = `${FileSystem.documentDirectory}captures/`;
const INDEX_FILE = `${FileSystem.documentDirectory}captures.json`;

async function ensureDir() {
  const info = await FileSystem.getInfoAsync(CAPTURES_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(CAPTURES_DIR, { intermediates: true });
  }
}

async function writeIndex(captures) {
  await FileSystem.writeAsStringAsync(INDEX_FILE, JSON.stringify(captures));
}

export async function listCaptures() {
  try {
    const info = await FileSystem.getInfoAsync(INDEX_FILE);
    if (!info.exists) {
      return [];
    }
    const content = await FileSystem.readAsStringAsync(INDEX_FILE);
    const captures = JSON.parse(content);
    // Migration de l'ancien format à photo unique ({uri}) vers {uris: []}.
    return captures.map((c) => (c.uris ? c : { ...c, uris: [c.uri] }));
  } catch (e) {
    return [];
  }
}

export async function saveCapture({ tempUris, success, location }) {
  await ensureDir();
  const id = `${Date.now()}`;
  const uris = [];
  for (let i = 0; i < tempUris.length; i++) {
    const destination = `${CAPTURES_DIR}${id}-${i}.jpg`;
    await FileSystem.moveAsync({ from: tempUris[i], to: destination });
    uris.push(destination);
  }
  const captures = await listCaptures();
  captures.unshift({
    id,
    uris,
    date: new Date().toISOString(),
    success,
    location: location ?? null,
  });
  await writeIndex(captures);
  return captures;
}

export async function deleteCapture(id) {
  const captures = await listCaptures();
  const target = captures.find((c) => c.id === id);
  if (target) {
    for (const uri of target.uris) {
      await FileSystem.deleteAsync(uri, { idempotent: true });
    }
  }
  const remaining = captures.filter((c) => c.id !== id);
  await writeIndex(remaining);
  return remaining;
}

export async function deleteAllCaptures() {
  const info = await FileSystem.getInfoAsync(CAPTURES_DIR);
  if (info.exists) {
    await FileSystem.deleteAsync(CAPTURES_DIR, { idempotent: true });
  }
  await FileSystem.deleteAsync(INDEX_FILE, { idempotent: true });
  return [];
}
