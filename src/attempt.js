import * as Location from 'expo-location';
import { saveCapture } from './captures';
import { sendIntrusionAlert } from './webhook';

// Rafale de photos : la personne bouge, plusieurs clichés espacés
// augmentent la chance d'avoir un visage net. Le base64 est nécessaire
// pour le chiffrement au repos (et l'alerte webhook).
async function captureBurst(cameraRef, count) {
  const photos = [];
  for (let i = 0; i < count; i++) {
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.6,
        skipProcessing: true,
        shutterSound: false,
        base64: true,
      });
      if (photo?.uri && photo?.base64) {
        photos.push({ uri: photo.uri, base64: photo.base64 });
      }
    } catch (e) {
      // Capture impossible : on continue, la tentative reste enregistrée.
    }
    if (i < count - 1) {
      await new Promise((resolve) => setTimeout(resolve, 700));
    }
  }
  return photos;
}

export async function getAttemptLocation(enabled) {
  if (!enabled) {
    return null;
  }
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status !== 'granted') {
      return null;
    }
    const last = await Location.getLastKnownPositionAsync();
    const position =
      last ??
      (await Promise.race([
        Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        }),
        new Promise((resolve) => setTimeout(() => resolve(null), 4000)),
      ]));
    if (!position) {
      return null;
    }
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    };
  } catch (e) {
    return null;
  }
}

// Enregistre une saisie de code PIN : 1 photo si le code est accepté
// (correct ou contrainte), rafale de 3 s'il est erroné, plus position GPS
// et alerte webhook sur échec. Une entrée de journal est créée même si
// aucune photo n'a pu être prise (caméra non prête, permission refusée).
//
// La capture est attendue (la caméra doit être encore montée), mais la
// persistance — localisation GPS (jusqu'à plusieurs secondes), écriture
// chiffrée, webhook — s'exécute en arrière-plan pour ne pas retarder le
// déverrouillage d'un code correct. Renvoie la promesse de persistance
// pour les tests ou un éventuel await volontaire.
export async function recordAttempt({
  cameraRef,
  cameraReady,
  success,
  duress,
  settings,
}) {
  let photos = [];
  if (cameraRef.current && cameraReady) {
    photos = await captureBurst(cameraRef, success ? 1 : 3);
  }
  return (async () => {
    const location = await getAttemptLocation(settings.locationEnabled);
    try {
      await saveCapture({ photos, success, duress, location });
    } catch (e) {
      // L'enregistrement ne doit jamais bloquer ni faire échouer la saisie.
    }
    if (!success && settings.webhookUrl) {
      sendIntrusionAlert(settings.webhookUrl, {
        date: new Date().toISOString(),
        success,
        location,
        photoBase64: photos[0]?.base64 ?? null,
      });
    }
  })();
}
