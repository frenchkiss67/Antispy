import { osmEmbedUrl, webMapsUrl, formatCoords } from '../src/maps';

const point = { latitude: 48.5839, longitude: 7.7455 };

describe('maps', () => {
  test('formatCoords arrondit à 5 décimales', () => {
    expect(formatCoords(point)).toBe('48.58390, 7.74550');
  });

  test("l'URL OpenStreetMap contient le marqueur et une bbox", () => {
    const url = osmEmbedUrl(point);
    expect(url).toContain('openstreetmap.org/export/embed.html');
    expect(url).toContain('marker=48.5839%2C7.7455');
    expect(url).toContain('bbox=');
  });

  test("l'URL web pointe sur les coordonnées", () => {
    const url = webMapsUrl(point);
    expect(url).toContain('mlat=48.5839');
    expect(url).toContain('mlon=7.7455');
  });
});
