import { NextRequest, NextResponse } from "next/server";
import { assertRestaurantIsOpen, closeCustomerOrder, createOrder, getCustomerOrder, updateCustomerOrder } from "../../../db/service";
import { sendPushNotificationToAdmins } from "../../../lib/push-notifications";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const order=await getCustomerOrder(request.nextUrl.searchParams.get("token")??"");
    return NextResponse.json({order},{headers:{"Cache-Control":"no-store"}});
  } catch {
    return NextResponse.json({error:"No fue posible consultar el pedido."},{status:500});
  }
}

export async function POST(request: NextRequest) {
  try {
    await assertRestaurantIsOpen();
    const result = await createOrder(await request.json());

    // Enviar notificación Push a los administradores en segundo plano
    sendPushNotificationToAdmins({
      title: `🔔 ¡NUEVO PEDIDO! (${result.locationName})`,
      body: `Pedido #${result.id} • Total: $${result.total.toLocaleString("es-CO")}`,
      url: "/admin",
      tag: `order-${result.id}`,
      data: { orderId: result.id },
    }).catch((err) => console.error("Error enviando push notification:", err));

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No fue posible enviar el pedido.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PATCH(request:NextRequest) {
  try {
    const body=await request.json();
    if(body.action==="close") {
      await closeCustomerOrder(String(body.token??""));
      return NextResponse.json({ok:true});
    }
    await assertRestaurantIsOpen();
    const updated = await updateCustomerOrder(String(body.token??""),body);

    // Enviar notificación Push cuando el cliente modifica el pedido o agrega adicionales
    sendPushNotificationToAdmins({
      title: `✏️ PEDIDO MODIFICADO (${updated.locationName})`,
      body: `Pedido #${updated.id} en ${updated.locationName} fue actualizado por el cliente.`,
      url: "/admin",
      tag: `order-modified-${updated.id}`,
      data: { orderId: updated.id },
    }).catch((err) => console.error("Error enviando push notification de modificación:", err));

    return NextResponse.json(updated, {status:200});
  } catch(error) {
    return NextResponse.json({error:error instanceof Error?error.message:"No fue posible actualizar el pedido."},{status:400});
  }
}
