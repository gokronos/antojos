import { NextRequest, NextResponse } from "next/server";
import { getVapidKeys, removePushSubscription, saveFcmDevice, savePushSubscription } from "../../../../db/service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const keys = await getVapidKeys();
    return NextResponse.json({ publicKey: keys.publicKey });
  } catch (error) {
    return NextResponse.json({ error: "No fue posible obtener la clave pública VAPID." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if(typeof body.fcmToken==="string") {
      await saveFcmDevice(body.fcmToken);
      return NextResponse.json({ok:true,message:"Dispositivo Android registrado."});
    }
    const subscription = body.subscription || body;

    if (!subscription || !subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
      return NextResponse.json({ error: "Suscripción inválida." }, { status: 400 });
    }

    await savePushSubscription({
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    });

    return NextResponse.json({ ok: true, message: "Suscripción guardada correctamente." });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error guardando suscripción push.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    if (body.endpoint) {
      await removePushSubscription(body.endpoint);
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: "Error eliminando suscripción." }, { status: 500 });
  }
}
