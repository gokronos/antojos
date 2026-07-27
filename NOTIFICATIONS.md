# Sistema de Notificaciones para Pedidos

Este documento explica cómo funciona el sistema de alertas para nuevos pedidos en la APK de Antojos.

## ¿Qué hace?

Cuando llega un nuevo pedido al panel del administrador / APK:

1. **Alerta inmediata**: La APK vibra (patrón de triple impacto en Android / PWA) y reproduce una secuencia triple de tonos de alerta sonora.
2. **Notificación visual**: Se muestra una notificación local en la pantalla del dispositivo (`🔔 ¡NUEVO PEDIDO!`).
3. **Recordatorios recurrentes**: Si después de 3 minutos el pedido NO ha sido tomado/aceptado (permanece en estado "Nuevo"), la APK **volverá a vibrar, sonar y notificar cada 3 minutos** de manera continua.
4. **Cancelación automática**: En el momento en que el usuario presiona "Aceptar" o cambia el estado del pedido, se cancelan inmediatamente las notificaciones y los recordatorios recurrentes.

## Instalación

### 1. Instalar dependencias

```bash
npm install
```

Las nuevas dependencias ya están en `package.json`:
- `@capacitor/local-notifications` - Para notificaciones locales
- `@capacitor/haptics` - Para vibración

### 2. Sincronizar con Android

```bash
npm run android:sync
```

Esto copia los cambios al proyecto Android y instala los plugins necesarios.

### 3. Compilar la APK

```bash
npm run android:apk
```

## Permisos requeridos

El sistema necesita estos permisos en Android (configurados automáticamente):

- `android.permission.POST_NOTIFICATIONS` - Para mostrar notificaciones
- `android.permission.VIBRATE` - Para vibración
- `android.permission.ACCESS_NOTIFICATION_POLICY` - Para control de notificaciones

## Archivos principales

- **`lib/notifications.ts`** - Lógica completa del sistema:
  - `alertNewOrder()` - Alerta cuando llega un pedido nuevo
  - `cancelOrderNotification()` - Cancela alertas cuando se acepta
  - `initNotifications()` - Inicializa permisos

- **`app/admin/panel.tsx`** - Integración en el panel:
  - Detecta pedidos nuevos
  - Llama a las funciones de alerta
  - Limpia notificaciones cuando se aceptan

## Personalización

### Cambiar la duración del recordatorio

En `lib/notifications.ts`, busca esta línea:

```typescript
}, 3 * 60 * 1000); // 3 minutos
```

Cambia `3` por el número de minutos que desees.

### Cambiar el sonido

En `lib/notifications.ts`, modifica la función `playAlertSound()`:

```typescript
oscillator.frequency.value = 1000; // Frecuencia en Hz
gainNode.gain.setValueAtTime(0.3, audioContext.currentTime); // Volumen
```

### Cambiar tipo de vibración

En `lib/notifications.ts`, busca `Haptics.impact()` y cambia el estilo:

```typescript
import { ImpactStyle } from "@capacitor/haptics";

// Opciones: Light, Medium, Heavy
await Haptics.impact({ style: ImpactStyle.Heavy });
```

## Pruebas

Para probar el sistema sin crear pedidos reales:

1. Abre el panel en Android
2. En la consola del navegador (DevTools), ejecuta:

```javascript
import { alertNewOrder } from './lib/notifications.ts';

alertNewOrder(999, {
  customerName: "Prueba",
  locationName: "Mesa 01",
  total: 50000
});
```

## Solución de problemas

### No funciona la vibración
- Asegúrate de tener `@capacitor/haptics` instalado
- Algunos dispositivos pueden tener vibración deshabilitada
- Verifica en Ajustes > Sonido > Vibración

### No se oyen las notificaciones
- Comprueba que el volumen del dispositivo está activado
- Ve a Ajustes > Sonido > Volumen de notificaciones
- El sonido se genera por software (AudioContext) en tiempo real

### No aparecen las notificaciones
- Verifica que otorgaste permisos de notificaciones
- Algunos dispositivos pueden bloquear notificaciones de apps web
- Instala la app como PWA para mejor soporte

## Detalles técnicos

### Generación de sonido
El sistema usa HTML5 AudioContext para generar un tono de 1000 Hz (LA5) durante 500ms. No requiere archivos de sonido externos.

### Vibración
Usa Capacitor Haptics con impactos de tipo "Heavy" y "Medium" para crear una vibración distintiva.

### Notificaciones locales
Se almacenan en el dispositivo usando la API de notificaciones locales de Capacitor, compatible con Android 5.0+.

### Gestión de estado
El panel rastrea qué pedidos ya han generado alertas para evitar duplicados. Cuando un pedido cambia de estado, cancela automáticamente sus notificaciones.
