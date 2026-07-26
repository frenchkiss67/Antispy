// Anti-bruteforce et vérification des PIN : stockage sécurisé et crypto
// mockés en mémoire (SHA-256 réel via Node) pour tester la progression du
// blocage et l'isolation code principal / code de contrainte.

import crypto from 'crypto';

const mockSecure = new Map();

jest.mock('expo-secure-store', () => ({
  getItemAsync: async (k) => (mockSecure.has(k) ? mockSecure.get(k) : null),
  setItemAsync: async (k, v) => {
    mockSecure.set(k, v);
  },
  deleteItemAsync: async (k) => {
    mockSecure.delete(k);
  },
}));

jest.mock('expo-crypto', () => ({
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
  getRandomBytesAsync: async (n) =>
    new Uint8Array(require('crypto').randomBytes(n)),
  digestStringAsync: async (_algo, data) =>
    require('crypto').createHash('sha256').update(data).digest('hex'),
}));

const {
  savePin,
  verifyPin,
  getPinLength,
  saveDuressPin,
  verifyDuressPin,
  isDuressDefined,
  removeDuressPin,
  registerAttempt,
  getLockRemaining,
  resetAttempts,
} = require('../src/security');

beforeEach(() => {
  mockSecure.clear();
});

describe('PIN principal', () => {
  test('sauvegarde puis vérification, longueur mémorisée', async () => {
    await savePin('123456');
    expect(await verifyPin('123456')).toBe(true);
    expect(await verifyPin('000000')).toBe(false);
    expect(await getPinLength()).toBe(6);
  });

  test('le hash stocké est étiré, versionné et sans PIN en clair', async () => {
    await savePin('4242');
    const stored = mockSecure.get('antispy_pin_hash');
    expect(stored).not.toContain('4242');
    expect(stored).toMatch(/^v2:50000:[0-9a-f]{64}$/);
  });

  test('un PIN hérité (SHA-256 simple) reste valide puis est migré en v2', async () => {
    const crypto = require('crypto');
    const salt = 'abcdef';
    mockSecure.set('antispy_pin_salt', salt);
    mockSecure.set(
      'antispy_pin_hash',
      crypto.createHash('sha256').update(`${salt}:1234`).digest('hex')
    );
    expect(await verifyPin('1234')).toBe(true);
    // Après vérification, le stockage est mis à niveau vers v2.
    expect(mockSecure.get('antispy_pin_hash')).toMatch(/^v2:/);
    expect(await verifyPin('1234')).toBe(true);
    expect(await verifyPin('0000')).toBe(false);
  });
});

describe('code de contrainte', () => {
  test('indépendant du code principal', async () => {
    await savePin('1234');
    await saveDuressPin('9999');
    expect(await isDuressDefined()).toBe(true);
    expect(await verifyPin('1234')).toBe(true);
    expect(await verifyDuressPin('9999')).toBe(true);
    expect(await verifyDuressPin('1234')).toBe(false);
    expect(await verifyPin('9999')).toBe(false);
  });

  test('suppression du code de contrainte', async () => {
    await saveDuressPin('9999');
    await removeDuressPin();
    expect(await isDuressDefined()).toBe(false);
    expect(await verifyDuressPin('9999')).toBe(false);
  });
});

describe('anti-bruteforce', () => {
  test('pas de blocage avant le 3e échec, puis paliers croissants', async () => {
    expect((await registerAttempt(false)).lockSeconds).toBe(0); // 1
    expect((await registerAttempt(false)).lockSeconds).toBe(0); // 2
    expect((await registerAttempt(false)).lockSeconds).toBe(30); // 3
    expect((await registerAttempt(false)).lockSeconds).toBe(60); // 4
    expect((await registerAttempt(false)).lockSeconds).toBe(300); // 5
    expect((await registerAttempt(false)).lockSeconds).toBe(600); // 6
    expect((await registerAttempt(false)).lockSeconds).toBe(600); // plafond
    expect(await getLockRemaining()).toBe(600);
  });

  test('un succès remet le compteur et le blocage à zéro', async () => {
    await registerAttempt(false);
    await registerAttempt(false);
    await registerAttempt(false);
    const ok = await registerAttempt(true);
    expect(ok.fails).toBe(0);
    expect(await getLockRemaining()).toBe(0);
    // Le compteur repart de zéro : pas de blocage immédiat.
    expect((await registerAttempt(false)).lockSeconds).toBe(0);
  });

  test('le compteur d’échecs progresse pour l’effacement d’urgence', async () => {
    let result;
    for (let i = 0; i < 10; i++) {
      result = await registerAttempt(false);
    }
    expect(result.fails).toBe(10);
  });

  test('resetAttempts efface compteur et blocage (déverrouillage biométrique)', async () => {
    await registerAttempt(false);
    await registerAttempt(false);
    await registerAttempt(false);
    expect(await getLockRemaining()).toBe(30);
    await resetAttempts();
    expect(await getLockRemaining()).toBe(0);
    expect((await registerAttempt(false)).fails).toBe(1);
  });
});
