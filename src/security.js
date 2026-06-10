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
