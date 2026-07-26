import { isAdminRequest } from "../../lib/admin-auth";
import AdminPanel from "./panel";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  if (!(await isAdminRequest())) redirect("/admin/login");
  return <AdminPanel displayName="equipo" />;
}
