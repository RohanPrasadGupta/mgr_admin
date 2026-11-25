import "server-only";
import { cookies } from "next/headers";

// Admin cookies are distinct from the customer app's (mm_*): the two apps may share a domain in development.
export const ACCESS_COOKIE = "mma_at";
export const REFRESH_COOKIE = "mma_rt";
/** Holds the short-lived token between the password step and the 2FA step, so it never reaches browser JS. */
export const MFA_COOKIE = "mma_mfa";
export const API_URL = process.env.API_URL ?? "http://localhost:8000";
/** Matches the API's ADMIN_SESSION_HOURS: the refresh token stops working then, whatever the cookie says. */
const SESSION_HOURS = Number(process.env.ADMIN_SESSION_HOURS ?? 12);

export interface Tokens { accessToken: string; refreshToken: string; expiresIn: number }

// strict: admin cookies are never sent on cross-site navigation.
const base = { httpOnly: true, sameSite: "strict" as const, secure: process.env.NODE_ENV === "production", path: "/" };

export async function setSession(t: Tokens) {
  const jar = await cookies();
  jar.set(ACCESS_COOKIE, t.accessToken, { ...base, maxAge: Math.max(60, t.expiresIn - 30) });
  jar.set(REFRESH_COOKIE, t.refreshToken, { ...base, maxAge: SESSION_HOURS * 3600 });
}
export async function clearSession() {
  const jar = await cookies();
  jar.delete(ACCESS_COOKIE);
  jar.delete(REFRESH_COOKIE);
  jar.delete(MFA_COOKIE);
}
export async function readSession() {
  const jar = await cookies();
  return { accessToken: jar.get(ACCESS_COOKIE)?.value, refreshToken: jar.get(REFRESH_COOKIE)?.value };
}
export async function setMfaToken(token: string) {
  (await cookies()).set(MFA_COOKIE, token, { ...base, maxAge: 5 * 60 });
}
export async function takeMfaToken() {
  const jar = await cookies();
  return jar.get(MFA_COOKIE)?.value;
}
export async function clearMfaToken() {
  (await cookies()).delete(MFA_COOKIE);
}
