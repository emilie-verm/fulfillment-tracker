import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const SESSION_COOKIE = "session";
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// Checked lazily (on first actual use) rather than at module import time.
// Next.js loads this module while building its server-actions manifest, and
// that build step doesn't have runtime env vars available — a top-level
// throw here would fail `next build` even when SESSION_SECRET is correctly
// set for the deployed app itself.
let encodedKey: Uint8Array | undefined;
function getEncodedKey() {
  if (!encodedKey) {
    const secretKey = process.env.SESSION_SECRET;
    if (!secretKey) {
      throw new Error("SESSION_SECRET environment variable is not set");
    }
    encodedKey = new TextEncoder().encode(secretKey);
  }
  return encodedKey;
}

// Deliberately minimal: role/name are looked up fresh from the database on
// every request (see lib/dal.ts) rather than trusted from the token, so an
// admin revoking/changing someone's role takes effect immediately.
export type SessionPayload = {
  userId: string;
};

export async function encrypt(payload: SessionPayload) {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getEncodedKey());
}

export async function decrypt(session: string | undefined = "") {
  const key = getEncodedKey(); // let a missing SESSION_SECRET throw loudly
  try {
    const { payload } = await jwtVerify(session, key, {
      algorithms: ["HS256"],
    });
    return payload as SessionPayload & { iat: number; exp: number };
  } catch {
    return null; // only malformed/expired/invalid tokens are swallowed here
  }
}

export async function createSession(payload: SessionPayload) {
  const session = await encrypt(payload);
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE, session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    sameSite: "lax",
    path: "/",
  });
}

export async function getSessionCookie() {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE)?.value;
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}
