import { NextRequest, NextResponse } from "next/server";
import { createAdminSession, validAdminPassword } from "../../../../lib/admin-auth";

export async function POST(request: NextRequest) {
  const { password } = await request.json() as { password?: string };
  if (!password || !validAdminPassword(password)) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return NextResponse.json({ error: "Clave incorrecta." }, { status: 401 });
  }
  await createAdminSession();
  return NextResponse.json({ ok: true });
}
