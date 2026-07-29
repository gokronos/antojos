import { LocalNotifications } from "@capacitor/local-notifications";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { PushNotifications } from "@capacitor/push-notifications";
import { Capacitor } from "@capacitor/core";

type OrderNotificationState = {
  orderId: number;
  notificationIds: number[];
  reminderIntervalId?: ReturnType<typeof setInterval>;
};

const activeNotifications = new Map<number, OrderNotificationState>();
let nativePushInitialized=false;

let cachedAudioCtx: AudioContext | null = null;

function getAudioCtx() {
  if (typeof window === "undefined") return null;
  if (!cachedAudioCtx) {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioCtx) cachedAudioCtx = new AudioCtx();
  }
  if (cachedAudioCtx && cachedAudioCtx.state === "suspended") {
    cachedAudioCtx.resume().catch(() => {});
  }
  return cachedAudioCtx;
}

if (typeof window !== "undefined") {
  const unlockAudio = () => {
    const ctx = getAudioCtx();
    if (ctx && ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
  };
  window.addEventListener("click", unlockAudio);
  window.addEventListener("touchstart", unlockAudio);
}

/**
 * Reproduce un sonido de alerta usando HTML5 Audio (arpegio fuerte)
 */
export function playAlertSound() {
  try {
    const ctx = getAudioCtx();
    if (!ctx) return;

    const now = ctx.currentTime;

    const playTone = (freq: number, start: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.8, start);
      gain.gain.exponentialRampToValueAtTime(0.01, start + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + duration);
    };

    // Secuencia cuádruple de tonos fuerte (Alerta destacada)
    playTone(880, now, 0.2);
    playTone(1100, now + 0.2, 0.2);
    playTone(1320, now + 0.4, 0.2);
    playTone(1760, now + 0.6, 0.5);
  } catch (error) {
    console.warn("No fue posible reproducir sonido:", error);
  }
}

/**
 * Hace que el dispositivo vibre con patrón fuerte
 */
export async function vibrate() {
  try {
    await Haptics.impact({ style: ImpactStyle.Heavy });
    await new Promise((resolve) => setTimeout(resolve, 100));
    await Haptics.impact({ style: ImpactStyle.Heavy });
    await new Promise((resolve) => setTimeout(resolve, 100));
    await Haptics.impact({ style: ImpactStyle.Heavy });
  } catch (error) {
    console.warn("Haptics no disponible:", error);
  }

  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate([500, 200, 500, 200, 500, 200, 500]);
    } catch {}
  }
}

/**
 * Cancela las notificaciones locales y recordatorios nativos al aceptar/tomar el pedido
 */
export async function cancelOrderNotification(orderId: number) {
  const state = activeNotifications.get(orderId);
  if (state) {
    try {
      await LocalNotifications.cancel({
        notifications: state.notificationIds.map((id) => ({ id })),
      });
    } catch (error) {
      console.warn("Error cancelando notificaciones nativas:", error);
    }

    if (state.reminderIntervalId) {
      clearInterval(state.reminderIntervalId);
    }

    activeNotifications.delete(orderId);
  }
}

/**
 * Alerta completa para un nuevo pedido con programación nativa en Android AlarmManager:
 * - Vibra + Suena inmediatamente
 * - Muestra notificación local
 * - Programa recordatorios nativos a los 3, 6, 9 y 12 min que suenan aún con la app cerrada
 */
export async function alertNewOrder(
  orderId: number,
  orderInfo: { customerName: string; locationName: string; total: number }
) {
  await cancelOrderNotification(orderId);

  await vibrate();
  playAlertSound();

  const baseId = Math.abs((orderId * 100) % 2100000000);
  const notificationIds = [baseId, baseId + 1, baseId + 2, baseId + 3, baseId + 4];

  const title = `🔔 ¡NUEVO PEDIDO! (${orderInfo.customerName})`;
  const body = `${orderInfo.locationName} • Total: $${orderInfo.total.toLocaleString("es-CO")}`;

  const now = Date.now();
  const scheduleList = [
    { id: baseId, at: new Date(now + 500), body },
    { id: baseId + 1, at: new Date(now + 3 * 60 * 1000), body: `⏰ RECORDATORIO (3 min): ¡Pedido de ${orderInfo.customerName} sin atender en ${orderInfo.locationName}!` },
    { id: baseId + 2, at: new Date(now + 6 * 60 * 1000), body: `⏰ RECORDATORIO (6 min): ¡Pedido sin atender en ${orderInfo.locationName}!` },
    { id: baseId + 3, at: new Date(now + 9 * 60 * 1000), body: `⏰ RECORDATORIO URGENTE (9 min): ¡Por favor atiende el pedido de ${orderInfo.customerName}!` },
    { id: baseId + 4, at: new Date(now + 12 * 60 * 1000), body: `⏰ URGENTE (12 min): El pedido en ${orderInfo.locationName} lleva 12 min sin aceptar!` },
  ];

  try {
    await LocalNotifications.schedule({
      notifications: scheduleList.map((item) => ({
        id: item.id,
        title,
        body: item.body,
        channelId: "orders_v3",
        sound:"alert.wav",
        smallIcon: "ic_launcher",
        iconColor: "#FF6B6B",
        autoCancel: false,
        actionTypeId: "order_notification",
        schedule: { at: item.at },
      })),
    });
  } catch (error) {
    console.warn("No fue posible programar notificaciones nativas:", error);
  }

  const reminderIntervalId = setInterval(async () => {
    if (activeNotifications.has(orderId)) {
      await vibrate();
      playAlertSound();
    } else {
      clearInterval(reminderIntervalId);
    }
  }, 3 * 60 * 1000);

  activeNotifications.set(orderId, {
    orderId,
    notificationIds,
    reminderIntervalId,
  });
}

/**
 * Alerta para una nueva solicitud de atención en mesa (Llamar al mesero, Pedir la cuenta, etc.)
 */
export async function alertServiceRequest(
  requestId: number,
  info: { locationName: string; requestType: string; customerName?: string }
) {
  await vibrate();
  playAlertSound();

  const notificationId = Math.abs((requestId * 1000 + 777) % 2100000000);
  const title = `🙋 ATENCIÓN SOLICITADA (${info.locationName})`;
  const body = `${info.requestType}${info.customerName ? ` • ${info.customerName}` : ""}`;

  try {
    await LocalNotifications.schedule({
      notifications: [
        {
          id: notificationId,
          title,
          body,
          channelId: "orders_v3",
          sound:"alert.wav",
          smallIcon: "ic_launcher",
          iconColor: "#FF6B6B",
          schedule: { at: new Date(Date.now() + 200) },
        },
      ],
    });
  } catch (error) {
    console.warn("No fue posible mostrar notificación de solicitud:", error);
  }
}

/**
 * Alerta cuando un cliente modifica un pedido (agrega productos o cambia mesa)
 */
export async function alertModifiedOrder(
  orderId: number,
  info: { locationName: string; customerName: string; updateNote?: string }
) {
  await vibrate();
  playAlertSound();

  const notificationId = Math.abs((orderId * 1000 + 888) % 2100000000);
  const title = `✏️ PEDIDO MODIFICADO (${info.locationName})`;
  const body = info.updateNote || `El cliente ${info.customerName} agregó productos o cambió su ubicación.`;

  try {
    await LocalNotifications.schedule({
      notifications: [
        {
          id: notificationId,
          title,
          body,
          channelId: "orders_v3",
          sound:"alert.wav",
          smallIcon: "ic_launcher",
          iconColor: "#FF6B6B",
          schedule: { at: new Date(Date.now() + 200) },
        },
      ],
    });
  } catch (error) {
    console.warn("No fue posible mostrar notificación de pedido modificado:", error);
  }
}

/**
 * Convierte clave VAPID pública Base64 a Uint8Array
 */
function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Registra el Service Worker y suscribe el dispositivo a Notificaciones Web Push
 */
export async function registerWebPush() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
    console.log("Web Push no es soportado por este navegador.");
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;

    const res = await fetch("/api/push/subscribe");
    if (!res.ok) return false;
    const { publicKey } = await res.json();
    if (!publicKey) return false;

    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      const convertedKey = urlBase64ToUint8Array(publicKey);
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedKey,
      });
    }

    await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscription }),
    });

    console.log("Web Push registrado y listo.");
    return true;
  } catch (error) {
    console.warn("Error al registrar Web Push:", error);
    return false;
  }
}

/**
 * Función de prueba para activar notificación, sonido y vibración inmediatamente
 */
export async function testNotificationAlert() {
  await initNotifications();
  await vibrate();
  playAlertSound();
  const testId = Math.floor(Math.random() * 100000);
  try {
    await LocalNotifications.schedule({
      notifications: [
        {
          id: testId,
          title: "🧪 PRUEBA DE NOTIFICACIÓN",
          body: "Si escuchas el sonido y ves esta notificación, las alertas de Antojos están activas.",
          channelId: "orders_v3",
          sound:"alert.wav",
          smallIcon: "ic_launcher",
          iconColor: "#FF6B6B",
        },
      ],
    });
  } catch (e) {
    console.warn("Error al enviar notificación de prueba:", e);
  }
}

/**
 * Inicializa permisos, canal de notificaciones y Service Worker para Web Push
 */
export async function initNotifications() {
  try {
    try {
      await LocalNotifications.createChannel({
        id: "orders_v3",
        name: "Alertas de Pedidos y Mesas",
        description: "Notificaciones y alertas prioritarias para el restaurante",
        importance: 5,
        visibility: 1,
        vibration: true,
        sound:"alert.wav",
      });
    } catch (e) {
      console.warn("No se pudo crear canal de notificaciones:", e);
    }

    const result = await LocalNotifications.requestPermissions();
    console.log("Permisos de notificaciones:", result.display);

    if(Capacitor.isNativePlatform()) {
      if(!nativePushInitialized) {
        nativePushInitialized=true;
        await PushNotifications.addListener("registration",async token=>{
          await fetch("/api/push/subscribe",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({fcmToken:token.value})});
        });
        await PushNotifications.addListener("registrationError",error=>console.warn("No fue posible registrar Firebase:",error));
        await PushNotifications.addListener("pushNotificationReceived",async notification=>{
          await vibrate();playAlertSound();
          await LocalNotifications.schedule({notifications:[{
            id:Math.floor(Math.random()*2000000000),title:notification.title??"🔔 Alerta de Antojos",
            body:notification.body??"Hay una nueva actualización.",channelId:"orders_v3",sound:"alert.wav",
          }]});
        });
        await PushNotifications.addListener("pushNotificationActionPerformed",()=>{window.location.href="/admin";});
      }
      const pushPermission=await PushNotifications.requestPermissions();
      if(pushPermission.receive==="granted")await PushNotifications.register();
    } else {
      await registerWebPush();
    }

    return true;
  } catch (error) {
    console.warn("Error inicializando notificaciones:", error);
    return false;
  }
}
