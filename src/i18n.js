import { getLocales } from 'expo-localization';

const fr = {
  appName: 'Antispy',
  choosePin: 'Choisissez votre code PIN',
  confirmPin: 'Confirmez votre code PIN',
  digits: (n) => `${n} chiffres`,
  duressRemovedByLength:
    'La longueur du code a changé : le code de contrainte a été supprimé, redéfinissez-le si besoin.',
  pinMismatch: 'Les codes ne correspondent pas, recommencez.',
  enterPin: 'Saisissez votre code PIN',
  wrongPin: 'Code PIN incorrect',
  lockedFor: (s) => `Trop de tentatives. Réessayez dans ${s} s`,
  cameraWarning: 'Autorisez la caméra pour activer la photo de surveillance.',
  biometricPrompt: 'Déverrouiller Antispy',
  biometricCancel: 'Utiliser le code PIN',
  journal: 'Journal',
  vault: 'Coffre',
  settings: 'Réglages',
  lock: 'Verrouiller',
  journalTitle: 'Journal des saisies',
  journalEmpty:
    "Aucune photo pour l'instant.\nChaque saisie du code PIN déclenche une photo de la personne devant l'écran.",
  absenceAlert: (total, failed) =>
    failed > 0
      ? `${total} saisie${total > 1 ? 's' : ''} de code pendant votre absence, dont ${failed} erronée${failed > 1 ? 's' : ''}`
      : `${total} saisie${total > 1 ? 's' : ''} de code pendant votre absence`,
  codeOk: 'Code correct',
  codeKo: 'Code erroné',
  newBadge: 'NOUVEAU',
  deleteAll: 'Tout supprimer',
  deleteAllTitle: 'Tout supprimer',
  deleteAllMessage: 'Supprimer toutes les photos de surveillance ?',
  cancel: 'Annuler',
  delete: 'Supprimer',
  share: 'Partager',
  close: 'Fermer',
  deleteOneMessage: 'Supprimer cette tentative et ses photos ?',
  photoCount: (n) => `${n} photo${n > 1 ? 's' : ''}`,
  viewOnMap: 'Voir sur la carte',
  openInMaps: 'Ouvrir dans Maps',
  mapPrivacyNote:
    'La carte est chargée depuis OpenStreetMap uniquement quand vous l’ouvrez.',
  vaultTitle: 'Coffre-fort',
  menu: 'Autres actions',
  vaultEmpty:
    'Vos notes et photos privées, protégées par le code PIN.\nElles ne quittent jamais le stockage privé de l’application.',
  notes: 'Notes',
  photos: 'Photos',
  addNote: '+ Note',
  addPhoto: '+ Photo',
  notePlaceholder: 'Écrivez votre note privée…',
  save: 'Enregistrer',
  deleteNoteMessage: 'Supprimer cette note ?',
  deletePhotoMessage: 'Supprimer cette photo du coffre ?',
  settingsTitle: 'Réglages',
  changePin: 'Changer le code PIN',
  currentPin: 'Code PIN actuel',
  newPin: 'Nouveau code PIN',
  confirmNewPin: 'Confirmez le nouveau code PIN',
  pinChanged: 'Code PIN modifié.',
  camouflage: 'Mode camouflage (calculatrice)',
  camouflageHelp:
    "L'écran de verrouillage devient une calculatrice. Tapez votre code PIN puis = pour déverrouiller.",
  graceDelay: 'Délai avant reverrouillage',
  graceImmediate: 'Immédiat',
  graceSeconds: (s) => `${s} s`,
  graceMinutes: (m) => `${m} min`,
  locationSetting: 'Enregistrer la position des tentatives',
  locationHelp:
    'La position GPS est enregistrée avec chaque photo (utile en cas de vol).',
  webhook: "Alerte distante (webhook)",
  webhookHelp:
    "À chaque code erroné, l'application envoie la photo (en base64) et la position à cette URL en POST JSON. Compatible avec ntfy.sh, Zapier, Make ou votre propre serveur.",
  webhookPlaceholder: 'https://…',
  webhookTest: "Tester l'envoi",
  webhookTestOk: 'Envoi réussi.',
  webhookTestKo: "Échec de l'envoi.",
  webhookHttpsOnly: "Seules les URL https:// sont acceptées : la photo et la position ne doivent jamais circuler en clair.",
  duressSection: 'Code de contrainte',
  duressHelp:
    "Un second code PIN qui ouvre un faux coffre, vide au départ. Si quelqu'un vous force à ouvrir l'application, donnez ce code : vos vraies données restent invisibles et la photo est quand même prise.",
  duressSet: 'Définir un code de contrainte',
  duressEdit: 'Modifier',
  duressRemove: 'Supprimer',
  duressRemoveMessage: 'Supprimer le code de contrainte ?',
  duressDefined: 'Code de contrainte actif',
  newDuressPin: 'Nouveau code de contrainte',
  confirmDuressPin: 'Confirmez le code de contrainte',
  duressSameAsPin: 'Ce code est déjà utilisé, choisissez-en un autre.',
  codeDuress: 'Code de contrainte',
  wipeSetting: 'Effacer le coffre après 10 codes erronés',
  wipeHelp:
    "Au 10e code PIN erroné consécutif, les notes et photos du vrai coffre sont définitivement supprimées. Le journal des photos de surveillance est conservé.",
  about: 'Photo uniquement à la saisie du code PIN. Le déverrouillage par empreinte ou visage ne prend jamais de photo.',
};

const en = {
  appName: 'Antispy',
  choosePin: 'Choose your PIN code',
  confirmPin: 'Confirm your PIN code',
  digits: (n) => `${n} digits`,
  duressRemovedByLength:
    'The code length changed: the duress code was removed, set it again if needed.',
  pinMismatch: 'The codes do not match, try again.',
  enterPin: 'Enter your PIN code',
  wrongPin: 'Wrong PIN code',
  lockedFor: (s) => `Too many attempts. Try again in ${s} s`,
  cameraWarning: 'Allow camera access to enable the surveillance photo.',
  biometricPrompt: 'Unlock Antispy',
  biometricCancel: 'Use PIN code',
  journal: 'Journal',
  vault: 'Vault',
  settings: 'Settings',
  lock: 'Lock',
  journalTitle: 'Entry journal',
  journalEmpty:
    'No photos yet.\nEvery PIN entry triggers a photo of the person in front of the screen.',
  absenceAlert: (total, failed) =>
    failed > 0
      ? `${total} PIN ${total > 1 ? 'entries' : 'entry'} while you were away, including ${failed} failed`
      : `${total} PIN ${total > 1 ? 'entries' : 'entry'} while you were away`,
  codeOk: 'Correct code',
  codeKo: 'Wrong code',
  newBadge: 'NEW',
  deleteAll: 'Delete all',
  deleteAllTitle: 'Delete all',
  deleteAllMessage: 'Delete all surveillance photos?',
  cancel: 'Cancel',
  delete: 'Delete',
  share: 'Share',
  close: 'Close',
  deleteOneMessage: 'Delete this attempt and its photos?',
  photoCount: (n) => `${n} photo${n > 1 ? 's' : ''}`,
  viewOnMap: 'View on map',
  openInMaps: 'Open in Maps',
  mapPrivacyNote:
    'The map is loaded from OpenStreetMap only when you open it.',
  vaultTitle: 'Vault',
  menu: 'More actions',
  vaultEmpty:
    'Your private notes and photos, protected by the PIN code.\nThey never leave the app private storage.',
  notes: 'Notes',
  photos: 'Photos',
  addNote: '+ Note',
  addPhoto: '+ Photo',
  notePlaceholder: 'Write your private note…',
  save: 'Save',
  deleteNoteMessage: 'Delete this note?',
  deletePhotoMessage: 'Delete this photo from the vault?',
  settingsTitle: 'Settings',
  changePin: 'Change PIN code',
  currentPin: 'Current PIN code',
  newPin: 'New PIN code',
  confirmNewPin: 'Confirm the new PIN code',
  pinChanged: 'PIN code changed.',
  camouflage: 'Camouflage mode (calculator)',
  camouflageHelp:
    'The lock screen becomes a calculator. Type your PIN then = to unlock.',
  graceDelay: 'Delay before relocking',
  graceImmediate: 'Immediate',
  graceSeconds: (s) => `${s} s`,
  graceMinutes: (m) => `${m} min`,
  locationSetting: 'Record the location of attempts',
  locationHelp:
    'The GPS position is stored with each photo (useful if the phone is stolen).',
  webhook: 'Remote alert (webhook)',
  webhookHelp:
    'On every wrong code, the app sends the photo (base64) and location to this URL as a JSON POST. Works with ntfy.sh, Zapier, Make or your own server.',
  webhookPlaceholder: 'https://…',
  webhookTest: 'Test delivery',
  webhookTestOk: 'Delivery succeeded.',
  webhookTestKo: 'Delivery failed.',
  webhookHttpsOnly:
    'Only https:// URLs are accepted: the photo and location must never travel unencrypted.',
  duressSection: 'Duress code',
  duressHelp:
    'A second PIN that opens a decoy vault, empty at first. If someone forces you to open the app, give this code: your real data stays hidden and the photo is still taken.',
  duressSet: 'Set a duress code',
  duressEdit: 'Change',
  duressRemove: 'Remove',
  duressRemoveMessage: 'Remove the duress code?',
  duressDefined: 'Duress code active',
  newDuressPin: 'New duress code',
  confirmDuressPin: 'Confirm the duress code',
  duressSameAsPin: 'This code is already in use, choose another one.',
  codeDuress: 'Duress code',
  wipeSetting: 'Wipe the vault after 10 wrong codes',
  wipeHelp:
    'On the 10th consecutive wrong PIN, the notes and photos in the real vault are permanently deleted. The surveillance photo journal is kept.',
  about:
    'Photos are taken only when the PIN is typed. Fingerprint or face unlock never takes a photo.',
};

const language = getLocales()[0]?.languageCode === 'fr' ? fr : en;

export default function t(key, ...args) {
  const entry = language[key];
  if (typeof entry === 'function') {
    return entry(...args);
  }
  return entry ?? key;
}
