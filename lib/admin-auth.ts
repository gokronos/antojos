import { cookies } from "next/headers";

const COOKIE_NAME = "antojitos_admin";
const SESSION_SECONDS = 60 * 60 * 24 * 30;

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

export async function createAdminSession() {
  const expires = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  const value = `${expires}.${await signature(String(expires))}`;
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

export async function isAdminRequest() {
  const value = (await cookies()).get(COOKIE_NAME)?.value;
  if (!value) return false;
  const [expiresText, received] = value.split(".");
  const expires = Number(expiresText);
  if (!expires || expires < Math.floor(Date.now() / 1000) || !received) return false;
  return safeEqual(received, await signature(expiresText));
}

export function validAdminPassword(password: string) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || password.length > 200) return false;
  return safeEqual(password, expected);
}
