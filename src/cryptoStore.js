// Chiffrement au repos : AES-256-CTR (aes-js, pur JavaScript, compatible
// Expo Go), clé aléatoire de 32 octets stockée dans le Keychain iOS /
// Keystore Android. Chaque fichier commence par "ENC1:" suivi du base64
// de (IV 16 octets || données chiffrées). Les fichiers sans ce préfixe
// sont des données héritées non chiffrées, lues telles quelles puis
// rechiffrées à la prochaine écriture.

import aesjs from 'aes-js';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import * as FileSystem from 'expo-file-system';
import {
  bytesToBase64,
  base64ToBytes,
  utf8ToBytes,
  bytesToUtf8,
} from './base64';

const KEY_DATA_KEY = 'antispy_data_key';
const PREFIX = 'ENC1:';

let cachedKey = null;

async function getKey() {
  if (cachedKey) {
    return cachedKey;
  }
  let hex = await SecureStore.getItemAsync(KEY_DATA_KEY);
  if (!hex) {
    const bytes = await Crypto.getRandomBytesAsync(32);
    hex = aesjs.utils.hex.fromBytes(Array.from(bytes));
    await SecureStore.setItemAsync(KEY_DATA_KEY, hex);
  }
  cachedKey = aesjs.utils.hex.toBytes(hex);
  return cachedKey;
}

async function encryptBytes(bytes) {
  const key = await getKey();
  const iv = Array.from(await Crypto.getRandomBytesAsync(16));
  const cipher = new aesjs.ModeOfOperation.ctr(key, new aesjs.Counter(iv));
  const encrypted = cipher.encrypt(bytes);
  const out = new Uint8Array(16 + encrypted.length);
  out.set(iv, 0);
  out.set(encrypted, 16);
  return out;
}

async function decryptBytes(data) {
  const key = await getKey();
  const iv = Array.from(data.subarray(0, 16));
  const cipher = new aesjs.ModeOfOperation.ctr(key, new aesjs.Counter(iv));
  return cipher.decrypt(data.subarray(16));
}

export async function writeEncryptedText(path, text) {
  const encrypted = await encryptBytes(utf8ToBytes(text));
  await FileSystem.writeAsStringAsync(path, PREFIX + bytesToBase64(encrypted));
}

// Renvoie null si le fichier n'existe pas ; le contenu hérité non chiffré
// est renvoyé tel quel.
export async function readEncryptedText(path) {
  const info = await FileSystem.getInfoAsync(path);
  if (!info.exists) {
    return null;
  }
  const raw = await FileSystem.readAsStringAsync(path);
  if (!raw.startsWith(PREFIX)) {
    return raw;
  }
  const decrypted = await decryptBytes(base64ToBytes(raw.slice(PREFIX.length)));
  return bytesToUtf8(decrypted);
}

export async function writeEncryptedImage(path, base64Data) {
  const encrypted = await encryptBytes(base64ToBytes(base64Data));
  await FileSystem.writeAsStringAsync(path, PREFIX + bytesToBase64(encrypted));
}

// Cache mémoire des petites images déchiffrées (vignettes).
const imageCache = new Map();
const CACHE_MAX_ENTRIES = 60;
const CACHE_MAX_FILE_CHARS = 200000;

export function clearImageCache() {
  imageCache.clear();
}

// Renvoie une URI affichable par <Image> : data URI pour un fichier
// chiffré, l'URI du fichier pour une image héritée non chiffrée.
export async function loadImageUri(path) {
  if (!path) {
    return null;
  }
  if (imageCache.has(path)) {
    return imageCache.get(path);
  }
  try {
    const raw = await FileSystem.readAsStringAsync(path);
    if (!raw.startsWith(PREFIX)) {
      return path;
    }
    const decrypted = await decryptBytes(
      base64ToBytes(raw.slice(PREFIX.length))
    );
    const uri = `data:image/jpeg;base64,${bytesToBase64(decrypted)}`;
    if (raw.length < CACHE_MAX_FILE_CHARS) {
      imageCache.set(path, uri);
      if (imageCache.size > CACHE_MAX_ENTRIES) {
        imageCache.delete(imageCache.keys().next().value);
      }
    }
    return uri;
  } catch (e) {
    // Fichier binaire hérité illisible en UTF-8 : on suppose une image en clair.
    return path;
  }
}
