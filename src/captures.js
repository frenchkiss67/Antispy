import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import {
  readEncryptedText,
  writeEncryptedText,
  writeEncryptedImage,
  clearImageCache,
} from './cryptoStore';

const CAPTURES_DIR = `${FileSystem.documentDirectory}captures/`;
const INDEX_FILE = `${FileSystem.documentDirectory}captures.json`;

async function ensureDir() {
  const info = await FileSystem.getInfoAsync(CAPTURES_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(CAPTURES_DIR, { intermediates: true });
  }
}

async function writeIndex(captures) {
  await writeEncryptedText(INDEX_FILE, JSON.stringify(captures));
}

export async function listCaptures() {
  try {
    const content = await readEncryptedText(INDEX_FILE);
    if (content == null) {
      return [];
    }
    const captures = JSON.parse(content);
    // Migration des anciens formats : {uri} → {uris}, vignette absente.
    return captures.map((c) => {
      const uris = c.uris ?? [c.uri];
      return { ...c, uris, thumbUri: c.thumbUri ?? uris[0] };
    });
  } catch (e) {
    return [];
  }
}

// photos : [{ uri, base64 }] venant de la caméra (fichiers temporaires).
// Tout est rechiffré dans le stockage de l'application, avec une vignette
// chiffrée pour l'affichage rapide du journal.
export async function saveCapture({ photos, success, duress, location }) {
  await ensureDir();
  const id = `${Date.now()}`;
  const uris = [];
  for (let i = 0; i < photos.length; i++) {
    const destination = `${CAPTURES_DIR}${id}-${i}.enc`;
    await writeEncryptedImage(destination, photos[i].base64);
    uris.push(destination);
  }
  let thumbUri = null;
  try {
    const thumb = await ImageManipulator.manipulateAsync(
      photos[0].uri,
      [{ resize: { width: 240 } }],
      { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG, base64: true }
    );
    thumbUri = `${CAPTURES_DIR}${id}-thumb.enc`;
    await writeEncryptedImage(thumbUri, thumb.base64);
    await FileSystem.deleteAsync(thumb.uri, { idempotent: true });
  } catch (e) {
    thumbUri = uris[0];
  }
  for (const photo of photos) {
    await FileSystem.deleteAsync(photo.uri, { idempotent: true });
  }
  const captures = await listCaptures();
  captures.unshift({
    id,
    uris,
    thumbUri,
    date: new Date().toISOString(),
    success,
    duress: duress ?? false,
    location: location ?? null,
  });
  await writeIndex(captures);
  return captures;
}

export async function deleteCapture(id) {
  const captures = await listCaptures();
  const target = captures.find((c) => c.id === id);
  if (target) {
    const files = [...target.uris, target.thumbUri].filter(Boolean);
    for (const uri of new Set(files)) {
      await FileSystem.deleteAsync(uri, { idempotent: true });
    }
  }
  const remaining = captures.filter((c) => c.id !== id);
  await writeIndex(remaining);
  clearImageCache();
  return remaining;
}

export async function deleteAllCaptures() {
  const info = await FileSystem.getInfoAsync(CAPTURES_DIR);
  if (info.exists) {
    await FileSystem.deleteAsync(CAPTURES_DIR, { idempotent: true });
  }
  await FileSystem.deleteAsync(INDEX_FILE, { idempotent: true });
  clearImageCache();
  return [];
}
