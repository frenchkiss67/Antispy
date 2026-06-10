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
App.js                          Navigation, onglets, reverrouillage en arrière-plan
src/i18n.js                     Traductions français / anglais
src/security.js                 Hachage du PIN, anti-bruteforce
src/settings.js                 Réglages persistants
src/captures.js                 Stockage des photos de surveillance
src/vault.js                    Stockage du coffre-fort (notes, photos)
src/attempt.js                  Traitement d'une tentative : rafale, GPS, webhook
src/webhook.js                  Envoi de l'alerte distante
src/components/PinPad.js        Pavé numérique avec retour haptique
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
