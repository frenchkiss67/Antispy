import { Platform } from 'react-native';

// Construit l'URL d'une carte OpenStreetMap centrée sur un point, avec un
// marqueur. Chargée dans une WebView à la demande uniquement (aucun appel
// réseau tant que l'utilisateur n'ouvre pas la carte).
export function osmEmbedUrl({ latitude, longitude }, delta = 0.01) {
  const left = longitude - delta;
  const right = longitude + delta;
  const bottom = latitude - delta;
  const top = latitude + delta;
  const bbox = `${left}%2C${bottom}%2C${right}%2C${top}`;
  return (
    `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}` +
    `&layer=mapnik&marker=${latitude}%2C${longitude}`
  );
}

// Lien vers l'application de cartes native : Plans sur iOS, Google Maps
// (ou l'app de cartes par défaut) sur Android, via un URI geo.
export function nativeMapsUrl({ latitude, longitude }) {
  const coords = `${latitude},${longitude}`;
  if (Platform.OS === 'ios') {
    return `http://maps.apple.com/?ll=${coords}&q=${coords}`;
  }
  return `geo:${coords}?q=${coords}`;
}

// Lien web universel (repli si aucune app de cartes n'est disponible).
export function webMapsUrl({ latitude, longitude }) {
  return `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=16/${latitude}/${longitude}`;
}

export function formatCoords({ latitude, longitude }) {
  return `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
}
