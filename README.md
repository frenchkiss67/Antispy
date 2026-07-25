# 🛡️ Antispy

Application mobile **Android / iOS** (React Native + Expo) qui photographie
discrètement, avec la caméra frontale, **la personne qui saisit le code PIN**.
Le déverrouillage par **empreinte digitale ou visage** (Touch ID / Face ID /
biométrie Android) est aussi possible et **ne déclenche aucune photo** :
seule la saisie du code PIN prend une photo.

## Fonctionnalités

- **Code PIN à 4 chiffres** choisi au premier lancement, stocké haché
  (SHA-256 + sel) dans le stockage sécurisé du téléphone
  (Keychain iOS / Keystore Android), modifiable dans les réglages.
- **Photo discrète à chaque saisie du PIN** : 1 photo si le code est
  correct, **rafale de 3 photos** s'il est erroné (plus de chances d'avoir
  un visage net). Caméra invisible, pas d'animation d'obturateur.
- **Déverrouillage biométrique sans photo** : proposé automatiquement à
  l'ouverture, jamais de capture dans ce cas.
- **Alerte « pendant votre absence »** : au déverrouillage, un bandeau
  indique combien de saisies ont eu lieu depuis votre dernier passage,
  et les tentatives nouvelles sont marquées « NOUVEAU ».
- **Anti-bruteforce** : après 3 codes erronés, le pavé est bloqué 30 s,
  puis 1 min, 5 min, 10 min. En mode camouflage, le blocage est invisible :
  même le bon code n'ouvre pas pendant le délai.
- **Journal détaillé** : photo en plein écran (balayage entre les clichés
  de la rafale), date/heure, position GPS, partage et suppression
  individuelle ou totale.
- **Mode camouflage** : l'écran de verrouillage devient une vraie
  calculatrice. Tapez votre PIN puis `=` pour déverrouiller
  (appui long sur `=` pour la biométrie). Toute saisie de 4 chiffres
  suivie de `=` est traitée comme une tentative et photographiée.
- **Coffre-fort** : notes privées et photos importées de la galerie,
  stockées uniquement dans l'espace privé de l'application.
- **Alerte distante (webhook)** : à chaque code erroné, l'application
  envoie en POST JSON la photo (base64), la date et la position vers
  l'URL de votre choix — compatible [ntfy.sh](https://ntfy.sh), Zapier,
  Make ou votre propre serveur.
- **Position GPS des tentatives** (optionnel), utile en cas de vol.
- **Délai avant reverrouillage** configurable (immédiat, 30 s, 1 min,
  5 min) quand l'application passe en arrière-plan.
- **Interface en français et en anglais** (langue du téléphone),
  retour haptique sur les pavés.

## Sécurité

- **Chiffrement au repos** : photos de surveillance, coffre-fort, journal
  et réglages sont chiffrés en AES-256-CTR avec une clé aléatoire de
  32 octets conservée dans le Keychain iOS / Keystore Android. Les images
  sont déchiffrées en mémoire uniquement, jamais écrites en clair sur le
  disque (sauf fichier temporaire le temps d'un partage explicite), et le
  cache mémoire est vidé à chaque verrouillage.
- **Code PIN étiré (KDF)** : le PIN n'est pas simplement haché mais passé
  dans 50 000 itérations de SHA-256 avec sel, ce qui rend un cassage hors
  ligne (sur appareil compromis) nettement plus coûteux. Les anciens
  hachages sont migrés automatiquement à la première saisie réussie.
- **Code de contrainte (duress)** : un second PIN, configurable dans les
  réglages, ouvre un **faux coffre** vide au départ. Le journal y est
  vide, la section code de contrainte invisible, et « changer le PIN »
  n'y modifie que le code de contrainte — jamais le vrai. La saisie du
  code de contrainte est photographiée et marquée dans le vrai journal.
- **Effacement d'urgence** (optionnel) : au 10e code erroné consécutif,
  le vrai coffre est définitivement supprimé (le journal est conservé).
- **Anti-bruteforce insensible à l'horloge** : le blocage est un compte à
  rebours décompté par l'application et persisté — changer l'heure du
  téléphone ne le contourne pas ; fermer l'application le met en pause.
- **Captures d'écran bloquées** (FLAG_SECURE sur Android) et **voile de
  confidentialité** dans le sélecteur d'applications.
- **Webhook HTTPS uniquement** : l'alerte distante refuse les URL en
  `http://`.
- **Sauvegardes Android désactivées** (`allowBackup=false`) : les données
  chiffrées ne partent pas dans les sauvegardes cloud.
- **Mode leurre cloisonné** : ouvert avec le code de contrainte, l'écran
  Réglages masque tout ce qui trahirait une application anti-espion
  (effacement, camouflage, surveillance webhook, localisation) ; seul le
  changement de code reste visible et ne modifie que le code de contrainte.
- **En camouflage, seul un code valide agit** : un calcul quelconque reste
  un simple calcul (aucune photo, aucun comptage d'échec), pour éviter les
  fausses intrusions et tout effacement accidentel.
- Limite à connaître : un code PIN à 4 chiffres reste un secret faible ;
  la protection réelle des données repose sur l'étirement du PIN, la clé
  AES du Keystore/Keychain et sur le verrouillage du téléphone lui-même.

## Tests

Logique de sécurité couverte par des tests unitaires (Jest) :

```bash
npm test
```

Couvre l'encodage base64/UTF-8, l'implémentation SHA-256 (vecteurs
officiels + comparaison avec Node), le chiffrement au repos (le contenu
écrit est bien chiffré et relu à l'identique, IV distincts), l'étirement
et la migration des codes PIN, l'anti-bruteforce, et l'évaluateur de la
calculatrice camouflée. Exécuté en CI via GitHub Actions
(`.github/workflows/ci.yml`).

## Lancer l'application

```bash
npm install
npx expo start
```

Puis scannez le QR code avec l'application **Expo Go**
([Android](https://play.google.com/store/apps/details?id=host.exp.exponent) /
[iOS](https://apps.apple.com/app/expo-go/id982107779)), ou lancez directement :

```bash
npm run android   # émulateur / appareil Android
npm run ios       # simulateur iOS (macOS requis)
```

> ⚠️ La caméra ne fonctionne pas sur les simulateurs/émulateurs :
> testez sur un appareil réel.

## Compiler une application installable (APK / IPA)

Avec [EAS Build](https://docs.expo.dev/build/setup/) :

```bash
npm install -g eas-cli
eas login
eas build --platform android   # ou --platform ios
```

## Exemple de webhook avec ntfy.sh

Aucun serveur à installer : choisissez un nom de sujet secret, puis dans
les réglages d'Antispy renseignez `https://ntfy.sh/votre-sujet-secret`.
Installez l'application ntfy sur un autre appareil et abonnez-vous au même
sujet : vous recevrez une notification à chaque code erroné.

## Structure du projet

```
App.js                          Navigation, onglets, reverrouillage, voile de confidentialité
src/i18n.js                     Traductions français / anglais
src/security.js                 PIN étirés (KDF), code de contrainte, anti-bruteforce
src/sha256.js                   SHA-256 pur JavaScript (étirement de clé)
src/cryptoStore.js              Chiffrement au repos (AES-256-CTR, clé en Keystore/Keychain)
src/calculator.js               Évaluateur d'expressions de l'écran camouflé
src/base64.js                   Encodage base64 / UTF-8 pur JavaScript
src/settings.js                 Réglages persistants chiffrés
src/captures.js                 Stockage chiffré des photos de surveillance
src/vault.js                    Coffre-fort chiffré (vrai + leurre), effacement d'urgence
src/attempt.js                  Traitement d'une tentative : rafale, GPS, webhook
src/webhook.js                  Envoi de l'alerte distante (HTTPS uniquement)
src/hooks/useLockCountdown.js   Compte à rebours anti-bruteforce persistant
src/components/PinPad.js        Pavé numérique avec retour haptique
src/components/DecryptedImage.js Affichage d'images chiffrées (déchiffrement en mémoire)
src/screens/SetupScreen.js      Création du code PIN
src/screens/LockScreen.js       Verrouillage classique + photo discrète
src/screens/CalculatorScreen.js Verrouillage camouflé en calculatrice
src/screens/JournalScreen.js    Journal des tentatives, plein écran, partage
src/screens/VaultScreen.js      Coffre-fort (notes + photos)
src/screens/SettingsScreen.js   Réglages
src/screens/ChangePinScreen.js  Changement du code PIN
scripts/generate-assets.js      Génération de l'icône et du splash screen
```

## Remarques

- La permission caméra est demandée au premier affichage de l'écran de
  verrouillage ; sans elle, le PIN fonctionne mais aucune photo n'est prise.
- Sur certains appareils Android vendus dans des pays où c'est obligatoire
  (Japon, Corée), le son de l'obturateur ne peut pas être désactivé.
- Cette application protège **vos propres données sur votre propre appareil**
  en identifiant qui tente de la déverrouiller.
