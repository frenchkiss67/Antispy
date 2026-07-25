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

// Borne le journal : au-delà, les plus anciennes entrées (et leurs fichiers
// chiffrés) sont supprimées pour éviter que des tentatives répétées ne
// saturent le stockage.
const MAX_CAPTURES = 200;

let sequence = 0;
function nextId() {
  sequence = (sequence + 1) % 100000;
  return `${Date.now()}-${sequence}`;
}

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
  const id = nextId();
  const uris = [];
  for (let i = 0; i < photos.length; i++) {
    const destination = `${CAPTURES_DIR}${id}-${i}.enc`;
    await writeEncryptedImage(destination, photos[i].base64);
    uris.push(destination);
  }
  // Vignette chiffrée pour un affichage rapide du journal (si photo prise).
  let thumbUri = null;
  if (photos.length > 0) {
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
      thumbUri = uris[0] ?? null;
    }
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
  const trimmed = await enforceLimit(captures);
  await writeIndex(trimmed);
  return trimmed;
}

// Supprime les entrées au-delà de la limite et leurs fichiers chiffrés.
async function enforceLimit(captures) {
  if (captures.length <= MAX_CAPTURES) {
    return captures;
  }
  const removed = captures.slice(MAX_CAPTURES);
  for (const capture of removed) {
    const files = [...(capture.uris ?? []), capture.thumbUri].filter(Boolean);
    for (const uri of new Set(files)) {
      await FileSystem.deleteAsync(uri, { idempotent: true });
    }
  }
  return captures.slice(0, MAX_CAPTURES);
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
