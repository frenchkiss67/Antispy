import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

const KEY_HASH = 'antispy_pin_hash';
const KEY_SALT = 'antispy_pin_salt';
const KEY_LENGTH = 'antispy_pin_length';
const KEY_DURESS_HASH = 'antispy_duress_hash';
const KEY_DURESS_SALT = 'antispy_duress_salt';

function bytesToHex(bytes) {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function hashPin(pin, salt) {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${salt}:${pin}`
  );
}

async function saveHashed(pin, hashKey, saltKey) {
  const salt = bytesToHex(await Crypto.getRandomBytesAsync(16));
  const hash = await hashPin(pin, salt);
  await SecureStore.setItemAsync(saltKey, salt);
  await SecureStore.setItemAsync(hashKey, hash);
}

async function verifyHashed(pin, hashKey, saltKey) {
  const salt = await SecureStore.getItemAsync(saltKey);
  const expected = await SecureStore.getItemAsync(hashKey);
  if (!salt || !expected) {
    return false;
  }
  return (await hashPin(pin, salt)) === expected;
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

export async function registerAttempt(success) {
  if (success) {
    await SecureStore.deleteItemAsync(KEY_FAILS);
    await SecureStore.deleteItemAsync(KEY_LOCK_REMAINING);
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
