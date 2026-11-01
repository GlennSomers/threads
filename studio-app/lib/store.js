// Storage: Vercel Blob in production, a plain folder with STORAGE=fs (local dev and tests).
import fs from 'node:fs/promises';
import path from 'node:path';

export const FS = process.env.STORAGE === 'fs';
export const DATA = path.resolve(process.env.STORAGE_DIR || new URL('../.data', import.meta.url).pathname);
let blob;
const B = async () => (blob ||= await import('@vercel/blob'));

export async function putText(p, text, contentType = 'application/json') {
  if (FS) { const f = path.join(DATA, p); await fs.mkdir(path.dirname(f), { recursive: true }); await fs.writeFile(f, text); return; }
  const { put } = await B();
  await put(p, text, { access: 'public', addRandomSuffix: false, allowOverwrite: true, contentType, cacheControlMaxAge: 60 });
}

export async function putBuffer(p, buf, contentType) {
  if (FS) { const f = path.join(DATA, p); await fs.mkdir(path.dirname(f), { recursive: true }); await fs.writeFile(f, buf); return; }
  const { put } = await B();
  await put(p, buf, { access: 'public', addRandomSuffix: false, allowOverwrite: true, contentType });
}

export async function list(prefix) {
  if (FS) {
    const out = [];
    const walk = async dir => {
      let ents = []; try { ents = await fs.readdir(dir, { withFileTypes: true }); } catch { return; }
      for (const e of ents) {
        const f = path.join(dir, e.name);
        if (e.isDirectory()) await walk(f);
        else { const pathname = path.relative(DATA, f).split(path.sep).join('/'); if (pathname.startsWith(prefix)) out.push({ pathname, url: (process.env.FS_PUBLIC_BASE || '/data/') + pathname.split('/').map(encodeURIComponent).join('/'), size: (await fs.stat(f)).size }); }
      }
    };
    await walk(DATA); return out;
  }
  const { list: bl } = await B(); const out = []; let cursor;
  do { const r = await bl({ prefix, cursor, limit: 1000 }); out.push(...r.blobs.map(b => ({ pathname: b.pathname, url: b.url, size: b.size }))); cursor = r.cursor; } while (cursor);
  return out;
}

export async function getText(p) {
  if (FS) { try { return await fs.readFile(path.join(DATA, p), 'utf8'); } catch { return null; } }
  const hit = (await list(p)).find(x => x.pathname === p); if (!hit) return null;
  const r = await fetch(hit.url + '?t=' + Date.now()); return r.ok ? r.text() : null;
}
export async function getJSON(p) { const t = await getText(p); try { return t ? JSON.parse(t) : null; } catch { return null; } }
export async function urlOf(p) { const hit = (await list(p)).find(x => x.pathname === p); return hit ? hit.url : null; }
