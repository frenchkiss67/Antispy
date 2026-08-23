import Svg, { Circle, Path, Rect } from 'react-native-svg';

// Jeu d'icônes au trait, grille 24 px, épaisseur 1,7 par défaut.
// Remplace les emojis : rendu identique sur tous les appareils et
// recoloration possible selon l'état (onglet actif / inactif).
const PATHS = {
  shield: (p) => [
    <Path key="s" d="M12 3l7 3v6c0 4.4-3 7.6-7 9-4-1.4-7-4.6-7-9V6l7-3z" {...p} />,
    <Circle key="c" cx="12" cy="11" r="1.7" {...p} />,
    <Path key="k" d="M12 12.7V15" {...p} />,
  ],
  fingerprint: (p) => [
    <Path key="a" d="M12 10a2 2 0 012 2c0 3-.4 5.2-1.2 7" {...p} />,
    <Path key="b" d="M8.6 19.4A14 14 0 0010 12a2 2 0 011-1.7" {...p} />,
    <Path key="c" d="M5.6 16.5A11 11 0 006 12a6 6 0 019.3-5" {...p} />,
    <Path key="d" d="M17.6 8.6A6 6 0 0118 12c0 2.4-.2 4.3-.7 6.2" {...p} />,
    <Path key="e" d="M3.5 8.4A9.6 9.6 0 0112 4a9.4 9.4 0 014.6 1.2" {...p} />,
  ],
  backspace: (p) => [
    <Path key="a" d="M20 6H9.5L4 12l5.5 6H20a1 1 0 001-1V7a1 1 0 00-1-1z" {...p} />,
    <Path key="b" d="M16 10l-4 4M12 10l4 4" {...p} />,
  ],
  journal: (p) => [
    <Rect key="a" x="4" y="3" width="16" height="18" rx="2" {...p} />,
    <Path key="b" d="M8 8h8M8 12h8M8 16h5" {...p} />,
  ],
  vault: (p) => [
    <Rect key="a" x="3" y="4" width="18" height="16" rx="2" {...p} />,
    <Circle key="b" cx="12" cy="12" r="3.4" {...p} />,
    <Path key="c" d="M12 8.6V5.4M12 18.6v-3.2" {...p} />,
  ],
  settings: (p) => [
    <Circle key="a" cx="12" cy="12" r="3.2" {...p} />,
    <Path
      key="b"
      d="M19.4 15a1.7 1.7 0 00.3 1.9 2 2 0 11-2.8 2.8 1.7 1.7 0 00-2.9 1.2 2 2 0 11-4 0A1.7 1.7 0 006.9 19 2 2 0 114 16.3a1.7 1.7 0 00-1.2-2.9 2 2 0 110-4A1.7 1.7 0 005 6.9 2 2 0 117.7 4a1.7 1.7 0 002.9-1.2 2 2 0 114 0A1.7 1.7 0 0120 6.7a1.7 1.7 0 00-.3 1.9 1.7 1.7 0 001.5 1 2 2 0 110 4 1.7 1.7 0 00-1.5 1z"
      {...p}
    />,
  ],
  lock: (p) => [
    <Rect key="a" x="4" y="11" width="16" height="9" rx="2" {...p} />,
    <Path key="b" d="M8 11V7.5a4 4 0 018 0V11" {...p} />,
  ],
  pin: (p) => [
    <Path key="a" d="M12 21s7-6.1 7-11a7 7 0 10-14 0c0 4.9 7 11 7 11z" {...p} />,
    <Circle key="b" cx="12" cy="10" r="2.4" {...p} />,
  ],
  alert: (p) => [
    <Path key="a" d="M10.3 4.3L2.9 17a2 2 0 001.7 3h14.8a2 2 0 001.7-3L13.7 4.3a2 2 0 00-3.4 0z" {...p} />,
    <Path key="b" d="M12 9v4" {...p} />,
    <Circle key="c" cx="12" cy="16.4" r="0.7" fill={p.stroke} stroke="none" />,
  ],
  more: (p) => [
    <Circle key="a" cx="12" cy="5" r="1.8" fill={p.stroke} stroke="none" />,
    <Circle key="b" cx="12" cy="12" r="1.8" fill={p.stroke} stroke="none" />,
    <Circle key="c" cx="12" cy="19" r="1.8" fill={p.stroke} stroke="none" />,
  ],
  key: (p) => [
    <Circle key="a" cx="8" cy="12" r="3.5" {...p} />,
    <Path key="b" d="M11.5 12H21l-2 2.4M17 12v2.6" {...p} />,
  ],
  share: (p) => [
    <Path key="a" d="M12 15V4M8.5 7.5L12 4l3.5 3.5" {...p} />,
    <Path key="b" d="M5 13v5a2 2 0 002 2h10a2 2 0 002-2v-5" {...p} />,
  ],
  trash: (p) => [
    <Path key="a" d="M4 7h16" {...p} />,
    <Path key="b" d="M9.5 7V5a1 1 0 011-1h3a1 1 0 011 1v2" {...p} />,
    <Path key="c" d="M6.6 7l.8 12a2 2 0 002 1.9h5.2a2 2 0 002-1.9l.8-12" {...p} />,
  ],
  close: (p) => [<Path key="a" d="M6 6l12 12M18 6L6 18" {...p} />],
  map: (p) => [
    <Path key="a" d="M9 4L3 6.5v14L9 18l6 2.5 6-2.5v-14L15 6.5 9 4z" {...p} />,
    <Path key="b" d="M9 4v14M15 6.5v14" {...p} />,
  ],
  person: (p) => [
    <Circle key="a" cx="12" cy="8.4" r="3.6" {...p} />,
    <Path key="b" d="M4.8 22c0-4 3.2-6.6 7.2-6.6s7.2 2.6 7.2 6.6" {...p} />,
  ],
  plus: (p) => [<Path key="a" d="M12 5v14M5 12h14" {...p} />],
};

export default function Icon({ name, size = 24, color = '#e6edf3', strokeWidth = 1.7 }) {
  const draw = PATHS[name];
  if (!draw) {
    return null;
  }
  const props = {
    fill: 'none',
    stroke: color,
    strokeWidth,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {draw(props)}
    </Svg>
  );
}
