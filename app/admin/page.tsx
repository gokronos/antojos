import { requireChatGPTUser } from "../chatgpt-auth";
import { isAdminRequest } from "../../lib/admin-auth";
import AdminPanel from "./panel";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await requireChatGPTUser("/admin");
  const allowed = await isAdminRequest();
  if (!allowed) {
    return <main className="denied"><h1>Acceso no autorizado</h1><p>La cuenta {user.email} no está habilitada para administrar este local.</p><a href="/">Volver al menú</a></main>;
  }
  return <AdminPanel displayName={user.fullName?.split(" ")[0] ?? "equipo"} />;
}
