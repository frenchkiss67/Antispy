/* Doublures des modules natifs : permettent de monter les vrais écrans dans
   Jest et de les piloter comme le ferait un utilisateur. Les magasins sont
   exposés en global pour être inspectés et réinitialisés par les tests. */
const React = require('react');
const { View } = require('react-native');

global.__secure = new Map();
global.__files = new Map();
global.__bio = { hasHardware: true, enrolled: true, success: true };
global.__resetNative = () => {
  global.__secure.clear();
  global.__files.clear();
  global.__bio = { hasHardware: true, enrolled: true, success: true };
};

jest.mock('expo-secure-store', () => ({
  getItemAsync: async (k) => (global.__secure.has(k) ? global.__secure.get(k) : null),
  setItemAsync: async (k, v) => {
    global.__secure.set(k, v);
  },
  deleteItemAsync: async (k) => {
    global.__secure.delete(k);
  },
}));

jest.mock('expo-crypto', () => ({
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
  getRandomBytesAsync: async (n) =>
    new Uint8Array(require('crypto').randomBytes(n)),
  digestStringAsync: async (_a, data) =>
    require('crypto').createHash('sha256').update(data).digest('hex'),
}));

jest.mock('expo-file-system', () => ({
  documentDirectory: 'file:///doc/',
  cacheDirectory: 'file:///cache/',
  EncodingType: { Base64: 'base64' },
  getInfoAsync: async (p) => ({ exists: global.__files.has(p) }),
  readAsStringAsync: async (p) => {
    if (!global.__files.has(p)) {
      throw new Error('ENOENT ' + p);
    }
    return global.__files.get(p);
  },
  writeAsStringAsync: async (p, v) => {
    global.__files.set(p, v);
  },
  deleteAsync: async (p) => {
    global.__files.delete(p);
  },
  makeDirectoryAsync: async () => {},
  moveAsync: async () => {},
  copyAsync: async () => {},
}));

jest.mock('expo-camera', () => {
  const RN = require('react-native');
  const R = require('react');
  return {
    CameraView: R.forwardRef((props, ref) => {
      R.useImperativeHandle(ref, () => ({
        takePictureAsync: async () => ({ uri: 'file:///tmp/shot.jpg', base64: 'AAAA' }),
      }));
      return R.createElement(RN.View, props);
    }),
    useCameraPermissions: () => [{ granted: true, canAskAgain: true }, jest.fn()],
  };
});

jest.mock('expo-local-authentication', () => ({
  hasHardwareAsync: async () => global.__bio.hasHardware,
  isEnrolledAsync: async () => global.__bio.enrolled,
  authenticateAsync: async () => ({ success: global.__bio.success }),
}));

jest.mock('expo-haptics', () => ({
  ImpactFeedbackStyle: { Light: 'light' },
  NotificationFeedbackType: { Error: 'error' },
  impactAsync: async () => {},
  notificationAsync: async () => {},
}));

jest.mock('expo-screen-capture', () => ({ usePreventScreenCapture: () => {} }));
jest.mock('expo-localization', () => ({ getLocales: () => [{ languageCode: 'fr' }] }));
jest.mock('expo-sharing', () => ({
  isAvailableAsync: async () => true,
  shareAsync: async () => {},
}));
jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: async () => ({ canceled: true }),
}));
jest.mock('expo-image-manipulator', () => ({
  SaveFormat: { JPEG: 'jpeg' },
  manipulateAsync: async () => ({ uri: 'file:///tmp/thumb.jpg', base64: 'BBBB' }),
}));
jest.mock('expo-location', () => ({
  Accuracy: { Balanced: 3 },
  getForegroundPermissionsAsync: async () => ({ status: 'denied' }),
  requestForegroundPermissionsAsync: async () => ({ status: 'granted' }),
  getLastKnownPositionAsync: async () => null,
  getCurrentPositionAsync: async () => null,
}));

jest.mock('react-native-webview', () => {
  const RN = require('react-native');
  return { WebView: (props) => require('react').createElement(RN.View, props) };
});

jest.mock('react-native-svg', () => {
  const RN = require('react-native');
  const R = require('react');
  const stub = (name) => {
    const C = (props) => R.createElement(RN.View, props, props.children);
    C.displayName = name;
    return C;
  };
  const Svg = stub('Svg');
  return {
    __esModule: true,
    default: Svg,
    Svg,
    Path: stub('Path'),
    Circle: stub('Circle'),
    Rect: stub('Rect'),
    G: stub('G'),
  };
});
