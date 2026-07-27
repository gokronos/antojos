import { getAdminSession } from "../../lib/admin-auth";
import AdminPanel from "./panel";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session=await getAdminSession();
  if (!session) redirect("/admin/login");
  return <AdminPanel session={session} />;
}
