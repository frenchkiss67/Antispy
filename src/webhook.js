// Alerte distante : envoie la tentative (photo en base64, position, date)
// en POST JSON vers l'URL configurée par l'utilisateur (ntfy.sh, Zapier,
// Make, serveur personnel…). L'échec est silencieux : l'alerte ne doit
// jamais bloquer ni révéler la surveillance.

export async function sendIntrusionAlert(webhookUrl, payload) {
  // HTTPS obligatoire : la photo et la position ne partent jamais en clair.
  if (!webhookUrl || !/^https:\/\//i.test(webhookUrl)) {
    return false;
  }
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        app: 'Antispy',
        type: 'pin_attempt',
        ...payload,
      }),
    });
    return response.ok;
  } catch (e) {
    return false;
  }
}
