// Single-password protection for a personal app.
import crypto from "node:crypto";

export const SESSION_COOKIE = "reel_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 90; // 90 days

function sessionToken() {
  const password = process.env.APP_PASSWORD;
  if (!password) return null;
  return crypto
    .createHmac("sha256", password)
    .update("reel-scripts-session-v1")
    .digest("hex");
}

function safeEqual(a, b) {
  const x = crypto.createHash("sha256").update(String(a)).digest();
  const y = crypto.createHash("sha256").update(String(b)).digest();
  return crypto.timingSafeEqual(x, y);
}

export function passwordIsSet() {
  return Boolean(process.env.APP_PASSWORD);
}

export function checkPassword(attempt) {
  const real = process.env.APP_PASSWORD;
  if (!real) return false;
  return safeEqual(attempt ?? "", real);
}

export function newSessionValue() {
  return sessionToken();
}

export function isAuthed(request) {
  const expected = sessionToken();
  if (!expected) return false;
  const got = request.cookies.get(SESSION_COOKIE)?.value || "";
  return safeEqual(got, expected);
}

export function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  };
}
