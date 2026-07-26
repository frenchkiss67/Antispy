import crypto from 'crypto';
import { sha256Bytes, bytesToHex } from '../src/sha256';
import { utf8ToBytes } from '../src/base64';

const nodeHex = (bytes) =>
  crypto.createHash('sha256').update(Buffer.from(bytes)).digest('hex');

describe('sha256 pur JS', () => {
  test('vecteurs connus', () => {
    expect(bytesToHex(sha256Bytes(utf8ToBytes('')))).toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
    );
    expect(bytesToHex(sha256Bytes(utf8ToBytes('abc')))).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'
    );
  });

  test('identique à Node sur de nombreuses tailles (dont limites de bloc)', () => {
    for (const len of [1, 55, 56, 57, 63, 64, 65, 119, 120, 128, 200, 1000]) {
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = (i * 97 + 13) % 256;
      }
      expect(bytesToHex(sha256Bytes(bytes))).toBe(nodeHex(bytes));
    }
  });

  test('accents et emojis', () => {
    for (const s of ['été 🔒', 'côté çà', '中文испытание']) {
      const bytes = utf8ToBytes(s);
      expect(bytesToHex(sha256Bytes(bytes))).toBe(nodeHex(bytes));
    }
  });
});
