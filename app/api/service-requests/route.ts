import { NextRequest, NextResponse } from "next/server";
import { createServiceRequest } from "../../../db/service";
import { sendPushNotificationToAdmins } from "../../../lib/push-notifications";

export const dynamic = "force-dynamic";

export async function POST(request:NextRequest) {
  try {
    const result=await createServiceRequest(await request.json());

    // Enviar notificación Push a los administradores
    sendPushNotificationToAdmins({
      title: `🙋 ATENCIÓN SOLICITADA (${result.locationName})`,
      body: `${result.requestType}${result.customerName ? ` • ${result.customerName}` : ""}`,
      url: "/admin",
      tag: `service-request-${result.id}`,
      data: { requestId: result.id },
    }).catch((err) => console.error("Error enviando push notification de solicitud:", err));

    return NextResponse.json(result,{status:201});
  } catch(error) {
    return NextResponse.json({error:error instanceof Error?error.message:"No fue posible solicitar atención."},{status:400});
  }
}
