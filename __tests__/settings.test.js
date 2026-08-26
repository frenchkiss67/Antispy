/* Réglages et changement de code : validation du webhook, cloisonnement du
   mode leurre, cohérence des longueurs entre code principal et contrainte. */
import { Alert } from 'react-native';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import SettingsScreen from '../src/screens/SettingsScreen';
import ChangePinScreen from '../src/screens/ChangePinScreen';
import {
  savePin,
  saveDuressPin,
  isDuressDefined,
  verifyPin,
  getPinLength,
} from '../src/security';
import { loadSettings } from '../src/settings';

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
  jest.restoreAllMocks();
});

describe('SettingsScreen', () => {
  const mount = (props) =>
    render(
      <SettingsScreen
        settings={SETTINGS}
        onSettingsChange={jest.fn()}
        onChangePin={jest.fn()}
        onSetDuress={jest.fn()}
        onLock={jest.fn()}
        decoy={false}
        {...props}
      />
    );

  test('refuse une URL de webhook en http', async () => {
    const spy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    mount();
    const input = screen.getByPlaceholderText('https://…');

    await act(async () => {
      fireEvent.changeText(input, 'http://exemple.test/hook');
    });
    await act(async () => {
      fireEvent(input, 'endEditing', {
        nativeEvent: { text: 'http://exemple.test/hook' },
      });
    });

    await waitFor(() => expect(spy).toHaveBeenCalled());
    expect(spy.mock.calls[0][1]).toMatch(/https:\/\/ sont acceptées/);
    expect((await loadSettings()).webhookUrl).toBe('');
  });

  test('accepte une URL en https', async () => {
    const onSettingsChange = jest.fn();
    mount({ onSettingsChange });
    const input = screen.getByPlaceholderText('https://…');

    await act(async () => {
      fireEvent.changeText(input, 'https://ntfy.sh/secret');
    });
    await act(async () => {
      fireEvent(input, 'endEditing', {
        nativeEvent: { text: 'https://ntfy.sh/secret' },
      });
    });

    await waitFor(async () =>
      expect((await loadSettings()).webhookUrl).toBe('https://ntfy.sh/secret')
    );
  });

  test('le mode leurre masque tout ce qui trahit la surveillance', async () => {
    mount({ decoy: true });
    await waitFor(() => expect(screen.getByText('Changer le code PIN')).toBeTruthy());
    expect(screen.queryByPlaceholderText('https://…')).toBeNull();
    expect(screen.queryByText(/Effacer le coffre/)).toBeNull();
    expect(screen.queryByText(/Mode camouflage/)).toBeNull();
    expect(screen.queryByText(/position des tentatives/)).toBeNull();
    expect(screen.queryByText('Code de contrainte')).toBeNull();
  });
});

describe('ChangePinScreen', () => {
  test('passer de 4 à 6 chiffres supprime le code de contrainte devenu inutilisable', async () => {
    await savePin('1234');
    await saveDuressPin('9999');
    const spy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const onDone = jest.fn();

    render(
      <ChangePinScreen pinLength={4} onDone={onDone} onCancel={jest.fn()} />
    );

    await type('1234'); // ancien code
    await waitFor(() => expect(screen.getByText('Nouveau code PIN')).toBeTruthy());

    await act(async () => {
      fireEvent.press(screen.getByText('6 chiffres'));
    });
    await type('112233');
    await type('112233');

    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(await verifyPin('112233')).toBe(true);
    expect(await getPinLength()).toBe(6);
    expect(await isDuressDefined()).toBe(false);
    expect(spy.mock.calls.at(-1)[1]).toMatch(/code de contrainte a été supprimé/);
  });

  test('refuse un nouveau code identique au code de contrainte', async () => {
    await savePin('1234');
    await saveDuressPin('9999');
    render(<ChangePinScreen pinLength={4} onDone={jest.fn()} onCancel={jest.fn()} />);

    await type('1234');
    await waitFor(() => expect(screen.getByText('Nouveau code PIN')).toBeTruthy());
    await type('9999');

    await waitFor(() =>
      expect(screen.getByText(/déjà utilisé/)).toBeTruthy()
    );
  });

  test('en mode leurre, ne modifie que le code de contrainte', async () => {
    await savePin('1234');
    await saveDuressPin('9999');
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const onDone = jest.fn();

    render(
      <ChangePinScreen pinLength={4} decoy onDone={onDone} onCancel={jest.fn()} />
    );

    await type('9999'); // le leurre vérifie le code de contrainte
    await waitFor(() => expect(screen.getByText('Nouveau code PIN')).toBeTruthy());
    await type('7777');
    await type('7777');

    await waitFor(() => expect(onDone).toHaveBeenCalled());
    // Le vrai code est intact.
    expect(await verifyPin('1234')).toBe(true);
    expect(await verifyPin('7777')).toBe(false);
  });
});
