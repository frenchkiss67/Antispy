import * as FileSystem from 'expo-file-system';

const SETTINGS_FILE = `${FileSystem.documentDirectory}settings.json`;

export const DEFAULT_SETTINGS = {
  camouflage: false,
  graceDelaySec: 0,
  locationEnabled: false,
  webhookUrl: '',
  lastSeen: null,
};

export async function loadSettings() {
  try {
    const info = await FileSystem.getInfoAsync(SETTINGS_FILE);
    if (!info.exists) {
      return { ...DEFAULT_SETTINGS };
    }
    const content = await FileSystem.readAsStringAsync(SETTINGS_FILE);
    return { ...DEFAULT_SETTINGS, ...JSON.parse(content) };
  } catch (e) {
    return { ...DEFAULT_SETTINGS };
  }
}

export async function saveSettings(partial) {
  const current = await loadSettings();
  const next = { ...current, ...partial };
  await FileSystem.writeAsStringAsync(SETTINGS_FILE, JSON.stringify(next));
  return next;
}
