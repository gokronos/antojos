// Service Worker para Antojos - Notificaciones Push en Segundo Plano

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let data = { title: "🔔 ¡NUEVO PEDIDO!", body: "Tienes una nueva actualización.", url: "/admin" };
  try {
    data = event.data.json();
  } catch (e) {
    data.body = event.data.text();
  }

  const title = data.title || "🔔 ¡NUEVO PEDIDO EN ANTOJOS!";
  const options = {
    body: data.body,
    icon: "/ic_launcher.png",
    badge: "/ic_launcher.png",
    vibrate: [500, 200, 500, 200, 500],
    tag: data.tag || "order-alert-" + Date.now(),
    renotify: true,
    requireInteraction: true,
    data: {
      url: data.url || "/admin",
      ...data.data,
    },
    actions: [
      { action: "open", title: "👀 Ver pedido" }
    ],
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/admin";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes("/admin") && "focus" in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
