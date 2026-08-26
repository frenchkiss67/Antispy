/* Journal : liste des tentatives, verdicts, et menu d'en-tête (la
   suppression globale ne doit plus être un bouton permanent sous le pouce). */
import { Alert } from 'react-native';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import JournalScreen from '../src/screens/JournalScreen';
import { saveCapture, listCaptures } from '../src/captures';

const shot = (over) => ({
  photos: [{ uri: 'file:///tmp/a.jpg', base64: 'AAAA' }],
  success: false,
  duress: false,
  location: null,
  ...over,
});

beforeEach(() => {
  global.__resetNative();
  jest.restoreAllMocks();
});

describe('JournalScreen', () => {
  test('journal vide : message d’accueil et aucun menu', async () => {
    render(<JournalScreen decoy={false} onLock={jest.fn()} />);
    await waitFor(() => expect(screen.getByText(/Aucune photo/)).toBeTruthy());
    expect(screen.queryByLabelText('Autres actions')).toBeNull();
    // « Verrouiller » reste accessible depuis l'en-tête.
    expect(screen.getByLabelText('Verrouiller')).toBeTruthy();
  });

  test('affiche les verdicts et la position', async () => {
    await saveCapture(shot({ success: true }));
    await saveCapture(shot({ success: false, location: { latitude: 48.5839, longitude: 7.7455 } }));
    await saveCapture(shot({ success: true, duress: true }));

    render(<JournalScreen decoy={false} onLock={jest.fn()} />);
    await waitFor(() => expect(screen.getByText('Code de contrainte')).toBeTruthy());
    expect(screen.getByText('Code correct')).toBeTruthy();
    expect(screen.getByText('Code erroné')).toBeTruthy();
    expect(screen.getByText(/48\.584/)).toBeTruthy();
  });

  test('la suppression globale vit dans le menu, pas dans la liste', async () => {
    await saveCapture(shot({}));
    const spy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    render(<JournalScreen decoy={false} onLock={jest.fn()} />);

    await waitFor(() => expect(screen.getByLabelText('Autres actions')).toBeTruthy());
    // Rien n'est visible tant que le menu n'est pas ouvert.
    expect(screen.queryByText('Tout supprimer')).toBeNull();

    await act(async () => {
      fireEvent.press(screen.getByLabelText('Autres actions'));
    });
    expect(screen.getByText('Tout supprimer')).toBeTruthy();

    await act(async () => {
      fireEvent.press(screen.getByText('Tout supprimer'));
      // Le menu se ferme avant l'alerte de confirmation (250 ms).
      await new Promise((r) => setTimeout(r, 300));
    });
    await waitFor(() => expect(spy).toHaveBeenCalled());
    expect(spy.mock.calls[0][0]).toBe('Tout supprimer');
  });

  test('le mode leurre n’expose aucune tentative', async () => {
    await saveCapture(shot({}));
    expect(await listCaptures()).toHaveLength(1);

    render(<JournalScreen decoy onLock={jest.fn()} />);
    await waitFor(() => expect(screen.getByText(/Aucune photo/)).toBeTruthy());
    expect(screen.queryByText('Code erroné')).toBeNull();
    expect(screen.queryByLabelText('Autres actions')).toBeNull();
  });
});
