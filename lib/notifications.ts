import { LocalNotifications } from "@capacitor/local-notifications";
import { Haptics, ImpactStyle } from "@capacitor/haptics";

type OrderNotificationState = {
  orderId: number;
  notificationId: number;
  reminderIntervalId: ReturnType<typeof setInterval>;
};

const activeNotifications = new Map<number, OrderNotificationState>();

/**
 * Reproduce un sonido de alerta usando HTML5 Audio (arpegio triple fuerte)
 */
export function playAlertSound() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const audioContext = new AudioCtx();
    
    if (audioContext.state === "suspended") {
      audioContext.resume();
    }

    const now = audioContext.currentTime;

    const playTone = (freq: number, start: number, duration: number) => {
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.6, start);
      gain.gain.exponentialRampToValueAtTime(0.01, start + duration);
      osc.connect(gain);
      gain.connect(audioContext.destination);
      osc.start(start);
      osc.stop(start + duration);
    };

    // Secuencia triple de tonos (Alerta destacada)
    playTone(880, now, 0.25);
    playTone(1100, now + 0.25, 0.25);
    playTone(1320, now + 0.5, 0.4);
  } catch (error) {
    console.warn("No fue posible reproducir sonido:", error);
  }
}

/**
 * Hace que el dispositivo vibre con patrón fuerte (Capacitor Haptics + Web Vibration fallback)
 */
export async function vibrate() {
  try {
    await Haptics.impact({ style: ImpactStyle.Heavy });
    await new Promise((resolve) => setTimeout(resolve, 150));
    await Haptics.impact({ style: ImpactStyle.Heavy });
    await new Promise((resolve) => setTimeout(resolve, 150));
    await Haptics.impact({ style: ImpactStyle.Heavy });
  } catch (error) {
    console.warn("Haptics no disponible:", error);
  }

  // Fallback de vibración nativa del navegador (útil en Chrome/PWA Android)
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate([500, 200, 500, 200, 500]);
    } catch {}
  }
}

/**
 * Muestra una notificación local
 */
async function showLocalNotification(
  orderId: number,
  title: string,
  body: string,
  notificationId: number
) {
  try {
    await LocalNotifications.schedule({
      notifications: [
        {
          id: notificationId,
          title,
          body,
          channelId: "orders",
          smallIcon: "ic_launcher",
          iconColor: "#FF6B6B",
          autoCancel: false,
          actionTypeId: "order_notification",
        },
      ],
    });
  } catch (error) {
    console.warn("No fue posible mostrar notificación:", error);
  }
}

/**
 * Cancela una notificación y su intervalo de recordatorios al aceptar/tomar el pedido
 */
export async function cancelOrderNotification(orderId: number) {
  const state = activeNotifications.get(orderId);
  if (state) {
    // Cancelar la notificación local
    try {
      await LocalNotifications.cancel({ notifications: [{ id: state.notificationId }] });
    } catch (error) {
      console.warn("Error cancelando notificación:", error);
    }

    // Cancelar el recordatorio recurrente de 3 minutos
    clearInterval(state.reminderIntervalId);

    // Remover del registro de notificaciones activas
    activeNotifications.delete(orderId);
  }
}

/**
 * Alerta completa para un nuevo pedido:
 * - Vibra + Suena inmediatamente
 * - Muestra notificación local
 * - Se repite cada 3 minutos si el pedido NO ha sido aceptado ("Nuevo")
 */
export async function alertNewOrder(
  orderId: number,
  orderInfo: { customerName: string; locationName: string; total: number }
) {
  // Si ya existía notificación previa del mismo pedido, cancelarla antes de reprogramar
  await cancelOrderNotification(orderId);

  // Generar ID único para la notificación (número entero positivo de 32 bits)
  const notificationId = Math.abs((orderId * 1000 + Math.floor(Math.random() * 900)) % 2147483647);

  // 1. ALERTA INMEDIATA: Vibra y suena
  await vibrate();
  playAlertSound();

  // 2. Mostrar notificación local
  const title = `🔔 ¡NUEVO PEDIDO! (${orderInfo.customerName})`;
  const body = `${orderInfo.locationName} • Total: $${orderInfo.total.toLocaleString("es-CO")}`;

  await showLocalNotification(orderId, title, body, notificationId);

  // 3. RECORDATORIO RECURRENTE CADA 3 MINUTOS SI NO SE TOMA/ACEPTA EL PEDIDO
  const reminderIntervalId = setInterval(async () => {
    // Verificar si el pedido sigue en estado activo sin aceptar
    if (activeNotifications.has(orderId)) {
      await vibrate();
      playAlertSound();

      const reminderId = Math.abs((orderId * 1000 + Math.floor(Math.random() * 900) + 1) % 2147483647);
      await showLocalNotification(
        orderId,
        `⏰ RECORDATORIO (3 min): ${orderInfo.customerName}`,
        `¡Pedido sin atender en ${orderInfo.locationName}! Por favor tómalo o acéptalo en el panel.`,
        reminderId
      );
    } else {
      clearInterval(reminderIntervalId);
    }
  }, 3 * 60 * 1000); // Se repite cada 3 minutos (180.000 ms)

  // Registrar el estado de la notificación activa
  activeNotifications.set(orderId, {
    orderId,
    notificationId,
    reminderIntervalId,
  });
}

/**
 * Función de prueba para activar notificación, sonido y vibración inmediatamente
 */
export async function testNotificationAlert() {
  await initNotifications();
  await vibrate();
  playAlertSound();
  const testId = Math.floor(Math.random() * 100000);
  await showLocalNotification(
    9999,
    "🧪 PRUEBA DE NOTIFICACIÓN",
    "Si escuchas el sonido y ves esta notificación, el sistema está funcionando correctamente.",
    testId
  );
}

/**
 * Inicializa los permisos y canal de notificaciones en Android
 */
export async function initNotifications() {
  try {
    // 1. Crear canal de notificaciones con MÁXIMA importancia en Android (API 26+)
    try {
      await LocalNotifications.createChannel({
        id: "orders",
        name: "Pedidos de Antojos",
        description: "Notificaciones y alertas para nuevos pedidos del restaurante",
        importance: 5, // MAX importance (pantalla encendida, sonido y vibración)
        visibility: 1, // Público
        vibration: true,
        sound: "notification.wav"
      });
    } catch (e) {
      console.warn("No se pudo crear canal de notificaciones (posiblemente web/browser):", e);
    }

    // 2. Solicitar permisos explicitamente
    const result = await LocalNotifications.requestPermissions();
    console.log("Permisos de notificaciones:", result.display);

    await LocalNotifications.removeAllListeners();

    LocalNotifications.addListener("localNotificationActionPerformed", (notification) => {
      console.log("Notificación tocada:", notification);
    });

    return true;
  } catch (error) {
    console.warn("Error inicializando notificaciones:", error);
    return false;
  }
}


