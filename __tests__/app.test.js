/* Parcours complet : premier lancement, verrouillage, navigation entre
   onglets, retour au verrouillage, et écran camouflé. */
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import App from '../App';
import CalculatorScreen from '../src/screens/CalculatorScreen';
import { savePin } from '../src/security';

const SETTINGS = {
  camouflage: false,
  graceDelaySec: 0,
  locationEnabled: false,
  webhookUrl: '',
  wipeEnabled: false,
  lastSeen: null,
};

const press = async (label) => {
  await act(async () => {
    fireEvent.press(screen.getByLabelText(label));
  });
};

const type = async (digits) => {
  for (const d of digits) {
    await press(d);
  }
};

beforeEach(() => {
  global.__resetNative();
});

describe('parcours de l’application', () => {
  test('sans code enregistré, propose la création', async () => {
    global.__bio.enrolled = false;
    render(<App />);
    await waitFor(() =>
      expect(screen.getByText('Choisissez votre code PIN')).toBeTruthy()
    );
  });

  test('déverrouillage, navigation entre onglets, puis reverrouillage', async () => {
    await savePin('1234');
    global.__bio.enrolled = false;
    render(<App />);

    await waitFor(() =>
      expect(screen.getByText('Saisissez votre code PIN')).toBeTruthy()
    );

    await type('1234');
    await waitFor(() => expect(screen.getByText('Journal des saisies')).toBeTruthy());

    // La barre du bas ne contient que les trois destinations.
    expect(screen.getByLabelText('Journal')).toBeTruthy();
    expect(screen.getByLabelText('Coffre')).toBeTruthy();
    expect(screen.getByLabelText('Réglages')).toBeTruthy();

    await press('Coffre');
    await waitFor(() => expect(screen.getByText('Coffre-fort')).toBeTruthy());

    await press('Réglages');
    await waitFor(() => expect(screen.getByText('Changer le code PIN')).toBeTruthy());

    // « Verrouiller » est une action d'en-tête, pas un onglet.
    await press('Verrouiller');
    await waitFor(() =>
      expect(screen.getByText('Saisissez votre code PIN')).toBeTruthy()
    );
  });

  test('un code à 6 chiffres est bien redemandé sur 6 points', async () => {
    global.__bio.enrolled = false;
    render(<App />);
    await waitFor(() =>
      expect(screen.getByText('Choisissez votre code PIN')).toBeTruthy()
    );

    await act(async () => {
      fireEvent.press(screen.getByText('6 chiffres'));
    });
    await type('112233');
    await type('112233');

    await waitFor(() =>
      expect(screen.getByText('Saisissez votre code PIN')).toBeTruthy()
    );
    expect(screen.getAllByTestId('pin-dot')).toHaveLength(6);
  });

  test('les réglages sensibles sont masqués sous le code de contrainte', async () => {
    await savePin('1234');
    const { saveDuressPin } = require('../src/security');
    await saveDuressPin('9999');
    global.__bio.enrolled = false;
    render(<App />);

    await waitFor(() =>
      expect(screen.getByText('Saisissez votre code PIN')).toBeTruthy()
    );
    await type('9999');
    await waitFor(() => expect(screen.getByText('Journal des saisies')).toBeTruthy());

    await press('Réglages');
    await waitFor(() => expect(screen.getByText('Changer le code PIN')).toBeTruthy());
    expect(screen.queryByText(/Alerte distante/)).toBeNull();
    expect(screen.queryByText(/Mode camouflage/)).toBeNull();
    expect(screen.queryByText(/Effacer le coffre/)).toBeNull();
    expect(screen.queryByText('Code de contrainte')).toBeNull();
  });
});

describe('écran camouflé', () => {
  const mount = (props) =>
    render(
      <CalculatorScreen
        pinLength={4}
        settings={SETTINGS}
        onUnlock={jest.fn()}
        {...props}
      />
    );

  test('calcule vraiment, sans rien déverrouiller', async () => {
    await savePin('1234');
    const onUnlock = jest.fn();
    mount({ onUnlock });

    await press('2');
    await press('+');
    await press('3');
    await press('=');

    await waitFor(() => expect(screen.getByText('= 5')).toBeTruthy());
    expect(onUnlock).not.toHaveBeenCalled();
  });

  test('un nombre de la bonne longueur reste un calcul', async () => {
    await savePin('1234');
    const onUnlock = jest.fn();
    mount({ onUnlock });

    await type('2024');
    await press('=');

    await waitFor(() => expect(screen.getByText('= 2024')).toBeTruthy());
    expect(onUnlock).not.toHaveBeenCalled();
  });

  test('le code PIN suivi de = ouvre l’application', async () => {
    await savePin('1234');
    const onUnlock = jest.fn();
    mount({ onUnlock });

    await type('1234');
    await press('=');

    await waitFor(() => expect(onUnlock).toHaveBeenCalledWith(false));
  });
});
