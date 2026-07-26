import { headers } from "next/headers";

export async function isAdminRequest() {
  const requestHeaders = await headers();
  const email = requestHeaders.get("oai-authenticated-user-email")?.toLowerCase();
  if (!email) return false;
  const allowed = (process.env.ADMIN_EMAILS ?? "")
    .split(",").map((value) => value.trim().toLowerCase()).filter(Boolean);
  return allowed.length === 0 || allowed.includes(email);
}
