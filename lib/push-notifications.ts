import webpush from "web-push";
import { getPushSubscriptions, getVapidKeys, removePushSubscription } from "../db/service";

export async function sendPushNotificationToAdmins(payload: {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  data?: Record<string, any>;
}) {
  try {
    const vapidKeys = await getVapidKeys();
    if (!vapidKeys || !vapidKeys.publicKey || !vapidKeys.privateKey) {
      console.warn("No VAPID keys configured for push notifications.");
      return;
    }

    webpush.setVapidDetails(
      "mailto:admin@antojos.app",
      vapidKeys.publicKey,
      vapidKeys.privateKey
    );

    const subscriptions = await getPushSubscriptions();
    if (!subscriptions || subscriptions.length === 0) {
      return;
    }

    const pushPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      url: payload.url ?? "/admin",
      tag: payload.tag ?? "new-order",
      data: payload.data ?? {},
    });

    const sendPromises = subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          },
          pushPayload
        );
      } catch (error: any) {
        // 404 Not Found o 410 Gone indican suscripciones expiradas o removidas por el navegador
        if (error?.statusCode === 404 || error?.statusCode === 410) {
          console.log(`Removiendo suscripción expirada: ${sub.endpoint}`);
          await removePushSubscription(sub.endpoint);
        } else {
          console.warn("Error enviando push notification a suscriptor:", error);
        }
      }
    });

    await Promise.allSettled(sendPromises);
  } catch (error) {
    console.error("Error al procesar envío de notificaciones push:", error);
  }
}
