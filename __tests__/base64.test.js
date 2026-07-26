import {
  bytesToBase64,
  base64ToBytes,
  utf8ToBytes,
  bytesToUtf8,
} from '../src/base64';

// Réimplémentation de référence via Buffer (Node) pour comparer.
const refB64 = (bytes) => Buffer.from(bytes).toString('base64');

describe('base64', () => {
  test('encode identique à Buffer sur tailles variées', () => {
    for (let len = 0; len < 300; len++) {
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = (i * 37 + 11) % 256;
      }
      expect(bytesToBase64(bytes)).toBe(refB64(bytes));
    }
  });

  test('roundtrip encode/decode', () => {
    for (let len = 0; len < 300; len++) {
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = (i * 53 + 7) % 256;
      }
      const back = base64ToBytes(bytesToBase64(bytes));
      expect(Array.from(back)).toEqual(Array.from(bytes));
    }
  });
});

describe('utf8', () => {
  const samples = [
    '',
    'plain ascii 123',
    'données secrètes du coffre',
    'été à Strasbourg — œuvre çà et là',
    'emoji 🔒🛡️ mixte 中文 испытание',
    '🇫🇷',
  ];

  test('encode identique à Buffer utf8', () => {
    for (const s of samples) {
      expect(Array.from(utf8ToBytes(s))).toEqual(
        Array.from(Buffer.from(s, 'utf8'))
      );
    }
  });

  test('roundtrip conserve accents et emojis', () => {
    for (const s of samples) {
      expect(bytesToUtf8(utf8ToBytes(s))).toBe(s);
    }
  });
});
