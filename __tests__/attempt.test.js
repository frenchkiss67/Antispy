// Régression : recordAttempt doit rendre la main dès la photo prise, sans
// attendre la localisation GPS ni l'écriture chiffrée. Une fonction async
// qui retourne une promesse nue l'adopte — le déverrouillage attendait
// alors plusieurs secondes.

const mockSaved = [];
const mockAlerts = [];

jest.mock('expo-location', () => ({
  Accuracy: { Balanced: 3 },
  getForegroundPermissionsAsync: async () => ({ status: 'granted' }),
  getLastKnownPositionAsync: async () => {
    await new Promise((r) => setTimeout(r, 300));
    return { coords: { latitude: 48.5839, longitude: 7.7455 } };
  },
  getCurrentPositionAsync: async () => null,
}));

jest.mock('../src/captures', () => ({
  saveCapture: async (payload) => {
    mockSaved.push(payload);
  },
}));

jest.mock('../src/webhook', () => ({
  sendIntrusionAlert: (url, payload) => {
    mockAlerts.push({ url, payload });
  },
}));

const { recordAttempt } = require('../src/attempt');

beforeEach(() => {
  mockSaved.length = 0;
  mockAlerts.length = 0;
});

const call = (overrides) =>
  recordAttempt({
    cameraRef: { current: null },
    cameraReady: false,
    success: true,
    duress: false,
    settings: { locationEnabled: true, webhookUrl: '' },
    ...overrides,
  });

describe('recordAttempt', () => {
  test('rend la main sans attendre la localisation', async () => {
    const start = Date.now();
    const { persistence } = await call();
    expect(Date.now() - start).toBeLessThan(150);
    // La persistance n'a pas encore eu lieu au moment du déverrouillage.
    expect(mockSaved).toHaveLength(0);

    await persistence;
    expect(mockSaved).toHaveLength(1);
    expect(mockSaved[0].location).toEqual({
      latitude: 48.5839,
      longitude: 7.7455,
    });
  });

  test('journalise la tentative même sans photo', async () => {
    const { persistence } = await call({ success: false });
    await persistence;
    expect(mockSaved).toHaveLength(1);
    expect(mockSaved[0].photos).toEqual([]);
    expect(mockSaved[0].success).toBe(false);
  });

  test("n'envoie l'alerte distante que sur un code erroné", async () => {
    let r = await call({ success: true, settings: { locationEnabled: false, webhookUrl: 'https://exemple.test/hook' } });
    await r.persistence;
    expect(mockAlerts).toHaveLength(0);

    r = await call({ success: false, settings: { locationEnabled: false, webhookUrl: 'https://exemple.test/hook' } });
    await r.persistence;
    expect(mockAlerts).toHaveLength(1);
    expect(mockAlerts[0].url).toBe('https://exemple.test/hook');
  });
});
