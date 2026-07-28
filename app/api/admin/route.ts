import { NextRequest, NextResponse } from "next/server";
import { acknowledgeOrderChanges, adminData, attendServiceRequest, confirmDelivery, createOrder, deleteAdminUser, deleteBanner, deleteCategory, deleteCustomer, deleteLocation, deleteOrder, quoteDelivery, saveAdminUser, saveBanner, saveBranding, saveCategory, saveCustomerNotes, saveLocation, saveProduct, saveSchedule, saveSettings, updateOrderPaid, updateOrderStatus, updatePaymentStatus } from "../../../db/service";
import { getAdminSession } from "../../../lib/admin-auth";

export const dynamic = "force-dynamic";

function unauthorized() {
  return NextResponse.json({ error: "Acceso no autorizado." }, { status: 401 });
}

export async function GET(request: NextRequest) {
  if (!(await getAdminSession())) return unauthorized();
  try {
    const periodDays=Number(request.nextUrl.searchParams.get("period")??1);
    return NextResponse.json(await adminData(periodDays), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "No fue posible cargar el panel." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session=await getAdminSession();
  if (!session) return unauthorized();
  try {
    const body = await request.json() as { action: string; data: Record<string, unknown> };
    const operational=["orderStatus","orderPaid","paymentStatus","quoteDelivery","confirmDelivery","acknowledgeOrder","createOrder","attendServiceRequest"];
    if(session.role==="Cocina"&&!["orderStatus","acknowledgeOrder"].includes(body.action))return unauthorized();
    if(session.role==="Caja"&&!operational.includes(body.action))return unauthorized();
    if(["saveAdminUser","deleteAdminUser"].includes(body.action)&&!["Superadministrador","Propietario"].includes(session.role))return unauthorized();
    if(["saveCustomerNotes","deleteCustomer"].includes(body.action)&&!["Superadministrador","Propietario","Administrador"].includes(session.role))return unauthorized();
    if(body.action==="saveAdminUser"&&body.data.role==="Superadministrador"&&session.role!=="Superadministrador")return unauthorized();
    if(body.action==="deleteOrder"&&session.role!=="Superadministrador")return unauthorized();
    if (body.action === "saveProduct") await saveProduct(body.data as never);
    else if (body.action === "saveLocation") await saveLocation(body.data as never);
    else if (body.action === "deleteLocation") await deleteLocation(Number(body.data.id));
    else if (body.action === "orderStatus") await updateOrderStatus(Number(body.data.id), String(body.data.status) as never);
    else if (body.action === "orderPaid") await updateOrderPaid(Number(body.data.id), Boolean(body.data.paid));
    else if (body.action === "paymentStatus") await updatePaymentStatus(Number(body.data.id),String(body.data.status));
    else if (body.action === "quoteDelivery") await quoteDelivery(Number(body.data.id),Number(body.data.fee),Number(body.data.estimatedMinutes));
    else if (body.action === "confirmDelivery") await confirmDelivery(Number(body.data.id));
    else if (body.action === "acknowledgeOrder") await acknowledgeOrderChanges(Number(body.data.id));
    else if (body.action === "createOrder") await createOrder(body.data as never);
    else if (body.action === "saveSettings") await saveSettings(body.data as never);
    else if (body.action === "saveBranding") await saveBranding(body.data as never);
    else if (body.action === "saveBanner") await saveBanner(body.data as never);
    else if (body.action === "deleteBanner") await deleteBanner(Number(body.data.id));
    else if (body.action === "saveSchedule") await saveSchedule(body.data as never);
    else if (body.action === "saveCategory") await saveCategory(String(body.data.name ?? ""));
    else if (body.action === "deleteCategory") await deleteCategory(Number(body.data.id));
    else if (body.action === "saveAdminUser") await saveAdminUser(body.data as never);
    else if (body.action === "deleteAdminUser") await deleteAdminUser(Number(body.data.id));
    else if (body.action === "deleteOrder") await deleteOrder(Number(body.data.id));
    else if (body.action === "saveCustomerNotes") await saveCustomerNotes(Number(body.data.id),String(body.data.notes??""));
    else if (body.action === "deleteCustomer") await deleteCustomer(Number(body.data.id));
    else if (body.action === "attendServiceRequest") await attendServiceRequest(Number(body.data.id));
    else return NextResponse.json({ error: "Acción desconocida." }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No fue posible guardar.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
