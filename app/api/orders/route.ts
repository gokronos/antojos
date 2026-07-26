import { NextRequest, NextResponse } from "next/server";
import { createOrder } from "../../../db/service";

export async function POST(request: NextRequest) {
  try {
    const result = await createOrder(await request.json());
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No fue posible enviar el pedido.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
