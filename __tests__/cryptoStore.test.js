// Chiffrement au repos : on mocke les modules natifs par un stockage
// mémoire et un vrai générateur aléatoire Node, et on vérifie que ce qui
// est écrit sur "disque" est bien chiffré puis relu à l'identique.

import crypto from 'crypto';

const mockFiles = new Map();
const mockSecure = new Map();

jest.mock('expo-crypto', () => ({
  getRandomBytesAsync: async (n) =>
    new Uint8Array(require('crypto').randomBytes(n)),
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: async (k) => (mockSecure.has(k) ? mockSecure.get(k) : null),
  setItemAsync: async (k, v) => {
    mockSecure.set(k, v);
  },
  deleteItemAsync: async (k) => {
    mockSecure.delete(k);
  },
}));

jest.mock('expo-file-system', () => ({
  documentDirectory: 'file:///doc/',
  getInfoAsync: async (p) => ({ exists: mockFiles.has(p) }),
  readAsStringAsync: async (p) => {
    if (!mockFiles.has(p)) {
      throw new Error('ENOENT');
    }
    return mockFiles.get(p);
  },
  writeAsStringAsync: async (p, v) => {
    mockFiles.set(p, v);
  },
  deleteAsync: async (p) => {
    mockFiles.delete(p);
  },
}));

const {
  writeEncryptedText,
  readEncryptedText,
  writeEncryptedImage,
  loadImageUri,
} = require('../src/cryptoStore');

beforeEach(() => {
  mockFiles.clear();
  mockSecure.clear();
});

describe('cryptoStore', () => {
  test('le texte écrit est chiffré sur disque puis relu identique', async () => {
    const secret = 'note très secrète 🔒 été';
    await writeEncryptedText('file:///doc/notes.json', secret);
    const onDisk = mockFiles.get('file:///doc/notes.json');
    expect(onDisk.startsWith('ENC1:')).toBe(true);
    expect(onDisk).not.toContain('secrète');
    expect(await readEncryptedText('file:///doc/notes.json')).toBe(secret);
  });

  test('deux écritures identiques produisent des IV différents', async () => {
    await writeEncryptedText('file:///doc/a', 'même contenu');
    await writeEncryptedText('file:///doc/b', 'même contenu');
    expect(mockFiles.get('file:///doc/a')).not.toBe(mockFiles.get('file:///doc/b'));
  });

  test('readEncryptedText renvoie null si le fichier manque', async () => {
    expect(await readEncryptedText('file:///doc/absent')).toBeNull();
  });

  test('les données héritées non chiffrées sont lues telles quelles', async () => {
    mockFiles.set('file:///doc/legacy', '[{"id":"1"}]');
    expect(await readEncryptedText('file:///doc/legacy')).toBe('[{"id":"1"}]');
  });

  test('une image chiffrée est renvoyée en data URI', async () => {
    const b64 = Buffer.from([1, 2, 3, 4, 5]).toString('base64');
    await writeEncryptedImage('file:///doc/p.enc', b64);
    expect(mockFiles.get('file:///doc/p.enc').startsWith('ENC1:')).toBe(true);
    const uri = await loadImageUri('file:///doc/p.enc');
    expect(uri).toBe(`data:image/jpeg;base64,${b64}`);
  });
});
