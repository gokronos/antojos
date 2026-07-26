import { NextRequest, NextResponse } from "next/server";
import { closeCustomerOrder, createOrder, getCustomerOrder, updateCustomerOrder } from "../../../db/service";

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
    const result = await createOrder(await request.json());
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
    return NextResponse.json(await updateCustomerOrder(String(body.token??""),body),{status:200});
  } catch(error) {
    return NextResponse.json({error:error instanceof Error?error.message:"No fue posible actualizar el pedido."},{status:400});
  }
}
