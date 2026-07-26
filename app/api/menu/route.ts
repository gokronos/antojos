import { NextResponse } from "next/server";
import { publicData } from "../../../db/service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await publicData(), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "No fue posible cargar el menú." }, { status: 500 });
  }
}
