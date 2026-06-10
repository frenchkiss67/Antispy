// Génère les visuels de l'application (icône, icône adaptative Android,
// splash screen) sans dépendance externe : dessin d'un bouclier avec trou
// de serrure, rendu supersamplé 2x puis encodé en PNG via zlib.
//
// Usage : node scripts/generate-assets.js

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// --- Encodeur PNG minimal (RGBA 8 bits) ---

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c;
  }
  return table;
})();

function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) {
    c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function encodePng(rgba, width, height) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // profondeur
  ihdr[9] = 6; // RGBA
  const raw = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    raw[y * (1 + width * 4)] = 0; // filtre "None"
    rgba.copy(raw, y * (1 + width * 4) + 1, y * width * 4, (y + 1) * width * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// --- Dessin ---

function hexToRgba(hex) {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
    255,
  ];
}

const BG = hexToRgba('#0d1117');
const SHIELD = hexToRgba('#58a6ff');
const SHIELD_DARK = hexToRgba('#1f6feb');
const HOLE = hexToRgba('#0d1117');
const TRANSPARENT = [0, 0, 0, 0];

// Bouclier centré sur (0.5, 0.5) en coordonnées normalisées :
// corps droit en haut, pointe arrondie en bas.
function inShield(nx, ny, scale) {
  const x = (nx - 0.5) / scale;
  const y = (ny - 0.5) / scale;
  const halfWidth = 0.34;
  const top = -0.42;
  const straightBottom = 0.05;
  const tip = 0.45;
  if (y < top || y > tip) {
    return false;
  }
  if (y <= straightBottom) {
    // Haut légèrement incurvé vers l'intérieur.
    const curve = 1 - 0.08 * Math.pow((y - top) / (straightBottom - top) - 1, 2);
    return Math.abs(x) <= halfWidth * Math.min(curve + 0.08, 1);
  }
  const progress = (y - straightBottom) / (tip - straightBottom);
  return Math.abs(x) <= halfWidth * Math.pow(1 - progress, 0.7);
}

function inKeyhole(nx, ny, scale) {
  const x = (nx - 0.5) / scale;
  const y = (ny - 0.5) / scale;
  const circle = x * x + (y + 0.08) * (y + 0.08) <= 0.085 * 0.085;
  const stem =
    Math.abs(x) <= 0.045 - 0.01 * ((y + 0.02) / 0.2) && y >= -0.08 && y <= 0.16;
  return circle || stem;
}

function render({ size, scale, transparentBg }) {
  const ss = 2; // supersampling 2x pour l'anticrénelage
  const big = size * ss;
  const pixel = (nx, ny) => {
    if (inShield(nx, ny, scale)) {
      if (inKeyhole(nx, ny, scale)) {
        return transparentBg ? hexToRgba('#0d1117') : HOLE;
      }
      // Léger dégradé vertical pour le relief.
      const mix = Math.min(Math.max((ny - 0.2) / 0.6, 0), 1);
      return [
        Math.round(SHIELD[0] * (1 - mix) + SHIELD_DARK[0] * mix),
        Math.round(SHIELD[1] * (1 - mix) + SHIELD_DARK[1] * mix),
        Math.round(SHIELD[2] * (1 - mix) + SHIELD_DARK[2] * mix),
        255,
      ];
    }
    return transparentBg ? TRANSPARENT : BG;
  };
  const bigBuffer = Buffer.alloc(big * big * 4);
  for (let y = 0; y < big; y++) {
    for (let x = 0; x < big; x++) {
      const [r, g, b, a] = pixel((x + 0.5) / big, (y + 0.5) / big);
      const offset = (y * big + x) * 4;
      bigBuffer[offset] = r;
      bigBuffer[offset + 1] = g;
      bigBuffer[offset + 2] = b;
      bigBuffer[offset + 3] = a;
    }
  }
  // Réduction 2x par moyenne des 4 pixels.
  const out = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      for (let channel = 0; channel < 4; channel++) {
        let sum = 0;
        for (let dy = 0; dy < ss; dy++) {
          for (let dx = 0; dx < ss; dx++) {
            sum += bigBuffer[((y * ss + dy) * big + (x * ss + dx)) * 4 + channel];
          }
        }
        out[(y * size + x) * 4 + channel] = Math.round(sum / (ss * ss));
      }
    }
  }
  return encodePng(out, size, size);
}

const assetsDir = path.join(__dirname, '..', 'assets');
fs.mkdirSync(assetsDir, { recursive: true });

fs.writeFileSync(
  path.join(assetsDir, 'icon.png'),
  render({ size: 1024, scale: 0.9, transparentBg: false })
);
// Icône adaptative Android : logo plus petit (zone sûre des 2/3 centraux).
fs.writeFileSync(
  path.join(assetsDir, 'adaptive-icon.png'),
  render({ size: 1024, scale: 0.55, transparentBg: true })
);
fs.writeFileSync(
  path.join(assetsDir, 'splash.png'),
  render({ size: 1024, scale: 0.45, transparentBg: false })
);

console.log('Visuels générés dans assets/');
