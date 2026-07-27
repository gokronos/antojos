import { NextRequest, NextResponse } from "next/server";
import { createAdminSession, validAdminPassword } from "../../../../lib/admin-auth";
import { authenticateAdminUser } from "../../../../db/service";

export async function POST(request: NextRequest) {
  const { username="",password } = await request.json() as { username?:string;password?: string };
  const databaseUser=password?await authenticateAdminUser(username,password):null;
  const ownerFallback=Boolean(password&&(!username.trim()||username.trim().toLowerCase()==="propietario"||username.trim().toLowerCase()==="admin")&&validAdminPassword(password));
  if (!databaseUser&&!ownerFallback) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return NextResponse.json({ error: "Clave incorrecta." }, { status: 401 });
  }
  const user=databaseUser??{id:0,name:"Superadministrador",username:"superadmin",role:"Superadministrador" as const};
  await createAdminSession(user);
  return NextResponse.json({ ok: true,user });
}
