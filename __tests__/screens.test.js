/* Tests d'application : les écrans réels sont montés et pilotés comme par
   un utilisateur (appuis sur le pavé, onglets, en-tête). */
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import SetupScreen from '../src/screens/SetupScreen';
import LockScreen from '../src/screens/LockScreen';
import { savePin, saveDuressPin, verifyPin, getLockRemaining } from '../src/security';

const SETTINGS = {
  camouflage: false,
  graceDelaySec: 0,
  locationEnabled: false,
  webhookUrl: '',
  wipeEnabled: false,
  lastSeen: null,
};

const type = async (digits) => {
  for (const d of digits) {
    await act(async () => {
      fireEvent.press(screen.getByLabelText(d));
    });
  }
};

beforeEach(() => {
  global.__resetNative();
});

describe('SetupScreen', () => {
  beforeEach(() => {
    global.__bio.enrolled = false;
  });

  test('affiche 4 points, ou 6 après avoir choisi la longueur', async () => {
    render(<SetupScreen onDone={jest.fn()} />);
    expect(screen.getAllByTestId('pin-dot')).toHaveLength(4);

    await act(async () => {
      fireEvent.press(screen.getByText('6 chiffres'));
    });
    expect(screen.getAllByTestId('pin-dot')).toHaveLength(6);
  });

  test('deux saisies identiques enregistrent le code et terminent', async () => {
    const onDone = jest.fn();
    render(<SetupScreen onDone={onDone} />);

    await type('1234');
    expect(screen.getByText('Confirmez votre code PIN')).toBeTruthy();

    await type('1234');
    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(await verifyPin('1234')).toBe(true);
  });

  test('deux saisies différentes affichent une erreur et recommencent', async () => {
    const onDone = jest.fn();
    render(<SetupScreen onDone={onDone} />);

    await type('1234');
    await type('9999');

    await waitFor(() =>
      expect(screen.getByText(/ne correspondent pas/)).toBeTruthy()
    );
    expect(onDone).not.toHaveBeenCalled();
    expect(screen.getByText('Choisissez votre code PIN')).toBeTruthy();
  });
});

describe('LockScreen', () => {
  const mount = (props) =>
    render(
      <LockScreen pinLength={4} settings={SETTINGS} onUnlock={jest.fn()} {...props} />
    );

  test('le bon code déverrouille sans signaler de contrainte', async () => {
    await savePin('1234');
    global.__bio.enrolled = false;
    const onUnlock = jest.fn();
    mount({ onUnlock });

    await type('1234');
    await waitFor(() => expect(onUnlock).toHaveBeenCalledWith(false));
  });

  test('le code de contrainte déverrouille en mode leurre', async () => {
    await savePin('1234');
    await saveDuressPin('9999');
    global.__bio.enrolled = false;
    const onUnlock = jest.fn();
    mount({ onUnlock });

    await type('9999');
    await waitFor(() => expect(onUnlock).toHaveBeenCalledWith(true));
  });

  test('un code erroné affiche le message et vide les points', async () => {
    await savePin('1234');
    global.__bio.enrolled = false;
    const onUnlock = jest.fn();
    mount({ onUnlock });

    await type('5678');
    await waitFor(() => expect(screen.getByText('Code PIN incorrect')).toBeTruthy());
    expect(onUnlock).not.toHaveBeenCalled();
    expect(screen.getAllByTestId('pin-dot')).toHaveLength(4);
  });

  test('trois échecs déclenchent un blocage de 30 s', async () => {
    await savePin('1234');
    global.__bio.enrolled = false;
    mount();

    await type('0000');
    await type('0000');
    await type('0000');

    await waitFor(() => expect(screen.getByText(/Trop de tentatives/)).toBeTruthy());
    expect(await getLockRemaining()).toBe(30);
  });

  test('la biométrie reste utilisable pendant un blocage', async () => {
    await savePin('1234');
    // Biométrie disponible, mais l'utilisateur écarte la demande automatique
    // affichée au montage : la touche du pavé reste présente.
    global.__bio.enrolled = true;
    global.__bio.success = false;
    const onUnlock = jest.fn();
    mount({ onUnlock });
    await waitFor(() =>
      expect(screen.getByLabelText('Déverrouiller par empreinte ou visage')).toBeTruthy()
    );

    await type('0000');
    await type('0000');
    await type('0000');
    await waitFor(() => expect(screen.getByText(/Trop de tentatives/)).toBeTruthy());

    // Le pavé est bloqué...
    await type('1234');
    expect(onUnlock).not.toHaveBeenCalled();

    // ...mais l'empreinte du propriétaire ouvre quand même.
    global.__bio.success = true;
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Déverrouiller par empreinte ou visage'));
    });
    await waitFor(() => expect(onUnlock).toHaveBeenCalledWith(false));
    expect(await getLockRemaining()).toBe(0);
  });

  test('la biométrie proposée au montage déverrouille sans photo', async () => {
    await savePin('1234');
    global.__bio.enrolled = true;
    global.__bio.success = true;
    const onUnlock = jest.fn();
    mount({ onUnlock });

    await waitFor(() => expect(onUnlock).toHaveBeenCalledWith(false));
  });
});
