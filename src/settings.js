import * as FileSystem from 'expo-file-system';
import { readEncryptedText, writeEncryptedText } from './cryptoStore';

const SETTINGS_FILE = `${FileSystem.documentDirectory}settings.json`;

export const DEFAULT_SETTINGS = {
  camouflage: false,
  graceDelaySec: 0,
  locationEnabled: false,
  webhookUrl: '',
  wipeEnabled: false,
  lastSeen: null,
};

export async function loadSettings() {
  try {
    const content = await readEncryptedText(SETTINGS_FILE);
    if (content == null) {
      return { ...DEFAULT_SETTINGS };
    }
    return { ...DEFAULT_SETTINGS, ...JSON.parse(content) };
  } catch (e) {
    return { ...DEFAULT_SETTINGS };
  }
}

export async function saveSettings(partial) {
  const current = await loadSettings();
  const next = { ...current, ...partial };
  await writeEncryptedText(SETTINGS_FILE, JSON.stringify(next));
  return next;
}
