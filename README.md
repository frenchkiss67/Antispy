# 🛡️ Antispy

Application mobile **Android / iOS** (React Native + Expo) qui photographie
discrètement, avec la caméra frontale, **la personne qui saisit le code PIN**.
Le déverrouillage se fait **uniquement par code PIN** (pas de biométrie).

## Fonctionnement

1. **Premier lancement** : vous choisissez un code PIN à 4 chiffres
   (saisi deux fois pour confirmation). Il est stocké haché (SHA-256 + sel)
   dans le stockage sécurisé du téléphone (Keychain iOS / Keystore Android).
2. **Écran de verrouillage** : dès qu'un code PIN complet est tapé — correct
   ou non — la caméra frontale prend une photo en silence (caméra invisible,
   pas d'animation d'obturateur).
3. **Journal** : après déverrouillage, vous voyez la liste des tentatives :
   photo de la personne, date/heure, et si le code était correct ou erroné.
   Les photos sont stockées uniquement dans l'espace privé de l'application
   (pas dans la galerie du téléphone).
4. L'application se reverrouille automatiquement dès qu'elle passe en
   arrière-plan.

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

## Structure du projet

```
App.js                       Navigation entre les écrans (setup / verrouillé / journal)
src/security.js              Hachage et vérification du PIN (expo-crypto + expo-secure-store)
src/captures.js              Enregistrement des photos et de l'index (expo-file-system)
src/components/PinPad.js     Pavé numérique et indicateurs de saisie
src/screens/SetupScreen.js   Création du code PIN au premier lancement
src/screens/LockScreen.js    Saisie du PIN + capture photo discrète (caméra frontale)
src/screens/JournalScreen.js Journal des tentatives (photo, date, correct/erroné)
```

## Remarques

- La permission caméra est demandée au premier affichage de l'écran de
  verrouillage ; sans elle, le PIN fonctionne mais aucune photo n'est prise.
- Sur certains appareils Android vendus dans des pays où c'est obligatoire
  (Japon, Corée), le son de l'obturateur ne peut pas être désactivé.
- Cette application protège **vos propres données sur votre propre appareil**
  en identifiant qui tente de la déverrouiller.
