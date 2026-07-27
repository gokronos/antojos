import { cookies } from "next/headers";

const COOKIE_NAME = "antojitos_admin";
const SESSION_SECONDS = 60 * 60 * 24 * 30;
export type AdminSession = { id:number; name:string; username:string; role:"Superadministrador"|"Propietario"|"Administrador"|"Caja"|"Cocina"; expires:number };

function bytesToHex(buffer: ArrayBuffer) {
  return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function signature(value: string) {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) throw new Error("Falta configurar ADMIN_SESSION_SECRET.");
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return bytesToHex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value)));
}

function safeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let result = 0;
  for (let index = 0; index < left.length; index++) result |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return result === 0;
}

export async function createAdminSession(user:Omit<AdminSession,"expires">) {
  const expires = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  const payload=Buffer.from(JSON.stringify({...user,expires})).toString("base64url");
  const value = `${payload}.${await signature(payload)}`;
  const store = await cookies();
  store.set(COOKIE_NAME, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_SECONDS,
  });
}

export async function clearAdminSession() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function getAdminSession():Promise<AdminSession|null> {
  const value = (await cookies()).get(COOKIE_NAME)?.value;
  if (!value) return null;
  const [payload, received] = value.split(".");
  if(!payload||!received||!safeEqual(received,await signature(payload)))return null;
  try {
    const session=JSON.parse(Buffer.from(payload,"base64url").toString()) as AdminSession;
    if(!session.expires||session.expires<Math.floor(Date.now()/1000)||!session.role)return null;
    return session;
  } catch { return null; }
}

export async function isAdminRequest() {
  return Boolean(await getAdminSession());
}

export function validAdminPassword(password: string) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || password.length > 200) return false;
  return safeEqual(password, expected);
}
