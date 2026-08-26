/* Coffre-fort : notes, séparation vrai coffre / leurre, états vides. */
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import VaultScreen from '../src/screens/VaultScreen';
import { saveNote, listNotes, importVaultPhoto, listVaultPhotos } from '../src/vault';

beforeEach(() => {
  global.__resetNative();
});

describe('VaultScreen', () => {
  test('coffre vide : message d’accueil', async () => {
    render(<VaultScreen decoy={false} onLock={jest.fn()} />);
    await waitFor(() => expect(screen.getByText(/notes et photos privées/)).toBeTruthy());
  });

  test('affiche les notes du vrai coffre', async () => {
    await saveNote('Code du cadenas : 4417', null, false);
    render(<VaultScreen decoy={false} onLock={jest.fn()} />);
    await waitFor(() => expect(screen.getByText('Code du cadenas : 4417')).toBeTruthy());
    expect(screen.getByText('Notes (1)')).toBeTruthy();
  });

  test('le leurre ne montre pas les notes du vrai coffre', async () => {
    await saveNote('Secret réel', null, false);
    await saveNote('Note anodine', null, true);

    render(<VaultScreen decoy onLock={jest.fn()} />);
    await waitFor(() => expect(screen.getByText('Note anodine')).toBeTruthy());
    expect(screen.queryByText('Secret réel')).toBeNull();
  });

  test('écrire une note l’enregistre dans le bon coffre', async () => {
    render(<VaultScreen decoy={false} onLock={jest.fn()} />);
    await waitFor(() => expect(screen.getByText('+ Note')).toBeTruthy());

    await act(async () => {
      fireEvent.press(screen.getByText('+ Note'));
    });
    await act(async () => {
      fireEvent.changeText(screen.getByPlaceholderText(/note privée/), 'Nouvelle note');
    });
    await act(async () => {
      fireEvent.press(screen.getByText('Enregistrer'));
    });

    await waitFor(() => expect(screen.getByText('Nouvelle note')).toBeTruthy());
    expect((await listNotes(false)).map((n) => n.text)).toEqual(['Nouvelle note']);
    expect(await listNotes(true)).toEqual([]);
  });

  test('onglet Notes vide alors que des photos existent', async () => {
    await importVaultPhoto('file:///tmp/photo.jpg', false);
    expect(await listVaultPhotos(false)).toHaveLength(1);

    render(<VaultScreen decoy={false} onLock={jest.fn()} />);
    await waitFor(() => expect(screen.getByText('Photos (1)')).toBeTruthy());

    // L'onglet Notes est actif par défaut et ne contient rien : un message
    // doit expliquer, sinon l'écran paraît cassé.
    expect(screen.getByText('Notes (0)')).toBeTruthy();
    expect(screen.getByText(/notes et photos privées/)).toBeTruthy();
  });
});
