import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { sha256Bytes, bytesToHex } from './sha256';
import { utf8ToBytes } from './base64';

const KEY_HASH = 'antispy_pin_hash';
const KEY_SALT = 'antispy_pin_salt';
const KEY_LENGTH = 'antispy_pin_length';
const KEY_DURESS_HASH = 'antispy_duress_hash';
const KEY_DURESS_SALT = 'antispy_duress_salt';

// Étirement de clé : un PIN court est un secret faible. On enchaîne un
// grand nombre de SHA-256 pour rendre chaque essai coûteux hors ligne (si
// le SecureStore est extrait d'un appareil compromis). Les hachages sont
// versionnés « v2:itérations:hex » ; les anciens (un seul SHA-256, sans
// préfixe) restent vérifiables et sont migrés de façon transparente.
const KDF_ITERATIONS = 50000;

function hexBytes(bytes) {
  return bytesToHex(bytes);
}

function stretch(pin, salt, iterations) {
  let data = utf8ToBytes(`${salt}:${pin}`);
  for (let i = 0; i < iterations; i++) {
    data = sha256Bytes(data);
  }
  return hexBytes(data);
}

function formatV2(iterations, hex) {
  return `v2:${iterations}:${hex}`;
}

async function legacyHash(pin, salt) {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${salt}:${pin}`
  );
}

async function randomSaltHex() {
  const bytes = await Crypto.getRandomBytesAsync(16);
  return hexBytes(bytes);
}

async function saveHashed(pin, hashKey, saltKey) {
  const salt = await randomSaltHex();
  const hash = formatV2(KDF_ITERATIONS, stretch(pin, salt, KDF_ITERATIONS));
  await SecureStore.setItemAsync(saltKey, salt);
  await SecureStore.setItemAsync(hashKey, hash);
}

async function verifyHashed(pin, hashKey, saltKey) {
  const salt = await SecureStore.getItemAsync(saltKey);
  const stored = await SecureStore.getItemAsync(hashKey);
  if (!salt || !stored) {
    return false;
  }
  if (stored.startsWith('v2:')) {
    const [, iterStr, expected] = stored.split(':');
    const iterations = parseInt(iterStr, 10) || KDF_ITERATIONS;
    return stretch(pin, salt, iterations) === expected;
  }
  // Format hérité (un seul SHA-256). Vérifie, puis migre vers v2.
  const legacy = await legacyHash(pin, salt);
  if (legacy !== stored) {
    return false;
  }
  const upgraded = formatV2(KDF_ITERATIONS, stretch(pin, salt, KDF_ITERATIONS));
  await SecureStore.setItemAsync(hashKey, upgraded);
  return true;
}

export async function isPinDefined() {
  return (await SecureStore.getItemAsync(KEY_HASH)) != null;
}

export async function getPinLength() {
  const length = await SecureStore.getItemAsync(KEY_LENGTH);
  return length ? parseInt(length, 10) : 4;
}

export async function savePin(pin) {
  await saveHashed(pin, KEY_HASH, KEY_SALT);
  await SecureStore.setItemAsync(KEY_LENGTH, String(pin.length));
}

export async function verifyPin(pin) {
  return verifyHashed(pin, KEY_HASH, KEY_SALT);
}

// --- Code de contrainte (duress) : second PIN qui ouvre un faux coffre ---

export async function isDuressDefined() {
  return (await SecureStore.getItemAsync(KEY_DURESS_HASH)) != null;
}

export async function saveDuressPin(pin) {
  await saveHashed(pin, KEY_DURESS_HASH, KEY_DURESS_SALT);
}

export async function verifyDuressPin(pin) {
  if ((await SecureStore.getItemAsync(KEY_DURESS_HASH)) == null) {
    return false;
  }
  return verifyHashed(pin, KEY_DURESS_HASH, KEY_DURESS_SALT);
}

export async function removeDuressPin() {
  await SecureStore.deleteItemAsync(KEY_DURESS_HASH);
  await SecureStore.deleteItemAsync(KEY_DURESS_SALT);
}

// --- Anti-bruteforce ---
// Le blocage est un nombre de secondes restantes, décompté par
// l'application elle-même et persisté régulièrement : changer l'heure du
// téléphone ne le contourne pas, et fermer l'application met simplement
// le décompte en pause.

const KEY_FAILS = 'antispy_fail_count';
const KEY_LOCK_REMAINING = 'antispy_lock_remaining';

// 3e échec → 30 s, 4e → 1 min, 5e → 5 min, ensuite 10 min.
const LOCK_STEPS_SEC = [30, 60, 300, 600];

export async function getLockRemaining() {
  const value = await SecureStore.getItemAsync(KEY_LOCK_REMAINING);
  return value ? parseInt(value, 10) : 0;
}

export async function setLockRemaining(seconds) {
  if (seconds > 0) {
    await SecureStore.setItemAsync(KEY_LOCK_REMAINING, String(seconds));
  } else {
    await SecureStore.deleteItemAsync(KEY_LOCK_REMAINING);
  }
}

// Remet à zéro le compteur d'échecs et tout blocage en cours. Appelé sur
// un déverrouillage réussi, quel qu'en soit le moyen (PIN ou biométrie).
export async function resetAttempts() {
  await SecureStore.deleteItemAsync(KEY_FAILS);
  await SecureStore.deleteItemAsync(KEY_LOCK_REMAINING);
}

export async function registerAttempt(success) {
  if (success) {
    await resetAttempts();
    return { fails: 0, lockSeconds: 0 };
  }
  const stored = await SecureStore.getItemAsync(KEY_FAILS);
  const fails = (stored ? parseInt(stored, 10) : 0) + 1;
  await SecureStore.setItemAsync(KEY_FAILS, String(fails));
  if (fails < 3) {
    return { fails, lockSeconds: 0 };
  }
  const step = Math.min(fails - 3, LOCK_STEPS_SEC.length - 1);
  const lockSeconds = LOCK_STEPS_SEC[step];
  await setLockRemaining(lockSeconds);
  return { fails, lockSeconds };
}
