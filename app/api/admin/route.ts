import { NextRequest, NextResponse } from "next/server";
import { acknowledgeOrderChanges, adminData, createOrder, deleteBanner, deleteCategory, deleteLocation, saveBanner, saveBranding, saveCategory, saveLocation, saveProduct, saveSchedule, saveSettings, updateOrderPaid, updateOrderStatus } from "../../../db/service";
import { isAdminRequest } from "../../../lib/admin-auth";

export const dynamic = "force-dynamic";

function unauthorized() {
  return NextResponse.json({ error: "Acceso no autorizado." }, { status: 401 });
}

export async function GET() {
  if (!(await isAdminRequest())) return unauthorized();
  try {
    return NextResponse.json(await adminData(), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "No fue posible cargar el panel." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!(await isAdminRequest())) return unauthorized();
  try {
    const body = await request.json() as { action: string; data: Record<string, unknown> };
    if (body.action === "saveProduct") await saveProduct(body.data as never);
    else if (body.action === "saveLocation") await saveLocation(body.data as never);
    else if (body.action === "deleteLocation") await deleteLocation(Number(body.data.id));
    else if (body.action === "orderStatus") await updateOrderStatus(Number(body.data.id), String(body.data.status) as never);
    else if (body.action === "orderPaid") await updateOrderPaid(Number(body.data.id), Boolean(body.data.paid));
    else if (body.action === "acknowledgeOrder") await acknowledgeOrderChanges(Number(body.data.id));
    else if (body.action === "createOrder") await createOrder(body.data as never);
    else if (body.action === "saveSettings") await saveSettings(body.data as never);
    else if (body.action === "saveBranding") await saveBranding(body.data as never);
    else if (body.action === "saveBanner") await saveBanner(body.data as never);
    else if (body.action === "deleteBanner") await deleteBanner(Number(body.data.id));
    else if (body.action === "saveSchedule") await saveSchedule(body.data as never);
    else if (body.action === "saveCategory") await saveCategory(String(body.data.name ?? ""));
    else if (body.action === "deleteCategory") await deleteCategory(Number(body.data.id));
    else return NextResponse.json({ error: "Acción desconocida." }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No fue posible guardar.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
