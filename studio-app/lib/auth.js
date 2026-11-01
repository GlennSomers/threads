import crypto from 'node:crypto';

const secret = () => process.env.STUDIO_SECRET || process.env.STUDIO_PASSWORD || '';
const sign = v => crypto.createHmac('sha256', secret()).update(v).digest('hex');
export const authOn = () => !!process.env.STUDIO_PASSWORD;

export function checkPassword(pw) {
  const a = Buffer.from(String(pw || '')), b = Buffer.from(process.env.STUDIO_PASSWORD || '');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
export function cookieFor() { const v = 'ok.' + Date.now(); return `studio=${v}.${sign(v)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${60 * 60 * 24 * 30}`; }
export function isAuthed(req) {
  if (!authOn()) return true;
  const m = /(?:^|;\s*)studio=([^;]+)/.exec(req.headers.cookie || ''); if (!m) return false;
  const i = m[1].lastIndexOf('.'), v = m[1].slice(0, i), s = m[1].slice(i + 1);
  const want = sign(v); return s.length === want.length && crypto.timingSafeEqual(Buffer.from(s), Buffer.from(want));
}
