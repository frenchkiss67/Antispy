import * as Location from 'expo-location';
import { saveCapture } from './captures';
import { sendIntrusionAlert } from './webhook';

// Rafale de photos : la personne bouge, plusieurs clichés espacés
// augmentent la chance d'avoir un visage net.
async function captureBurst(cameraRef, { count, withBase64 }) {
  const uris = [];
  let base64 = null;
  for (let i = 0; i < count; i++) {
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.6,
        skipProcessing: true,
        shutterSound: false,
        base64: withBase64 && i === 0,
      });
      if (photo?.uri) {
        uris.push(photo.uri);
      }
      if (withBase64 && i === 0 && photo?.base64) {
        base64 = photo.base64;
      }
    } catch (e) {
      // Capture impossible : on continue, la tentative reste enregistrée.
    }
    if (i < count - 1) {
      await new Promise((resolve) => setTimeout(resolve, 700));
    }
  }
  return { uris, base64 };
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

// Enregistre une saisie de code PIN : 1 photo si le code est correct,
// rafale de 3 si le code est erroné, plus position GPS et alerte webhook.
export async function recordAttempt({ cameraRef, cameraReady, success, settings }) {
  const wantWebhook = !success && !!settings.webhookUrl;
  let uris = [];
  let base64 = null;
  if (cameraRef.current && cameraReady) {
    const burst = await captureBurst(cameraRef, {
      count: success ? 1 : 3,
      withBase64: wantWebhook,
    });
    uris = burst.uris;
    base64 = burst.base64;
  }
  const location = await getAttemptLocation(settings.locationEnabled);
  if (uris.length > 0) {
    try {
      await saveCapture({ tempUris: uris, success, location });
    } catch (e) {
      // L'enregistrement ne doit jamais bloquer la saisie.
    }
  }
  if (wantWebhook) {
    // Volontairement non attendu : l'envoi réseau ne doit pas ralentir l'écran.
    sendIntrusionAlert(settings.webhookUrl, {
      date: new Date().toISOString(),
      success,
      location,
      photoBase64: base64,
    });
  }
}
