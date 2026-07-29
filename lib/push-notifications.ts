import webpush from "web-push";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";
import { deactivateFcmDevices, getFcmDevices, getPushSubscriptions, getVapidKeys, removePushSubscription } from "../db/service";

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

    const serviceAccountJson=process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    const devices=await getFcmDevices();
    if(serviceAccountJson&&devices.length) {
      try {
        if(!getApps().length)initializeApp({credential:cert(JSON.parse(serviceAccountJson))});
        const response=await getMessaging().sendEachForMulticast({
          tokens:devices.map(device=>device.token),
          notification:{title:payload.title,body:payload.body},
          data:{url:payload.url??"/admin",tag:payload.tag??"new-order"},
          android:{
            priority:"high",
            notification:{
              channelId:"orders_v3",
              sound:"alert",
              priority:"max",
              defaultVibrateTimings:false,
              vibrateTimingsMillis:[0,500,200,500,200,700],
              visibility:"public",
            },
          },
        });
        const invalid=response.responses.flatMap((result,index)=>
          !result.success&&["messaging/registration-token-not-registered","messaging/invalid-registration-token"].includes(result.error?.code??"")
            ?[devices[index].token]:[]);
        await deactivateFcmDevices(invalid);
      } catch(error) {
        console.error("Error enviando notificación FCM:",error);
      }
    }
  } catch (error) {
    console.error("Error al procesar envío de notificaciones push:", error);
  }
}
