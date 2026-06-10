import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

const KEY_HASH = 'antispy_pin_hash';
const KEY_SALT = 'antispy_pin_salt';
const KEY_LENGTH = 'antispy_pin_length';

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

export async function isPinDefined() {
  const hash = await SecureStore.getItemAsync(KEY_HASH);
  return hash != null;
}

export async function getPinLength() {
  const length = await SecureStore.getItemAsync(KEY_LENGTH);
  return length ? parseInt(length, 10) : 4;
}

export async function savePin(pin) {
  const salt = bytesToHex(await Crypto.getRandomBytesAsync(16));
  const hash = await hashPin(pin, salt);
  await SecureStore.setItemAsync(KEY_SALT, salt);
  await SecureStore.setItemAsync(KEY_HASH, hash);
  await SecureStore.setItemAsync(KEY_LENGTH, String(pin.length));
}

export async function verifyPin(pin) {
  const salt = await SecureStore.getItemAsync(KEY_SALT);
  const expected = await SecureStore.getItemAsync(KEY_HASH);
  if (!salt || !expected) {
    return false;
  }
  const hash = await hashPin(pin, salt);
  return hash === expected;
}

// --- Anti-bruteforce : délai croissant après 3 échecs consécutifs ---

const KEY_FAILS = 'antispy_fail_count';
const KEY_LOCK_UNTIL = 'antispy_lock_until';

// 3e échec → 30 s, 4e → 1 min, 5e → 5 min, ensuite 10 min.
const LOCK_STEPS_SEC = [30, 60, 300, 600];

export async function getLockUntil() {
  const value = await SecureStore.getItemAsync(KEY_LOCK_UNTIL);
  const until = value ? parseInt(value, 10) : 0;
  return until > Date.now() ? until : 0;
}

export async function registerAttempt(success) {
  if (success) {
    await SecureStore.deleteItemAsync(KEY_FAILS);
    await SecureStore.deleteItemAsync(KEY_LOCK_UNTIL);
    return 0;
  }
  const stored = await SecureStore.getItemAsync(KEY_FAILS);
  const fails = (stored ? parseInt(stored, 10) : 0) + 1;
  await SecureStore.setItemAsync(KEY_FAILS, String(fails));
  if (fails < 3) {
    return 0;
  }
  const step = Math.min(fails - 3, LOCK_STEPS_SEC.length - 1);
  const until = Date.now() + LOCK_STEPS_SEC[step] * 1000;
  await SecureStore.setItemAsync(KEY_LOCK_UNTIL, String(until));
  return until;
}
