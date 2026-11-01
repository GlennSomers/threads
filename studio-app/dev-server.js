// Local dev: the same router as Vercel, with the static screens and a folder for storage.
//   npm run dev   (needs the Studio screens: npm run sync)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { handle } from './lib/router.js';
import { DATA } from './lib/store.js';

const here = path.dirname(fileURLToPath(import.meta.url)), PUB = path.join(here, 'public');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.mp4': 'video/mp4', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.cube': 'text/plain' };

function serve(req, res, file) {
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) { res.statusCode = 404; return res.end('Not found'); }
  const size = fs.statSync(file).size, type = TYPES[path.extname(file)] || 'application/octet-stream', r = /bytes=(\d*)-(\d*)/.exec(req.headers.range || '');
  res.setHeader('Content-Type', type); res.setHeader('Accept-Ranges', 'bytes'); res.setHeader('Cache-Control', 'no-store');
  if (r) { const s = +r[1] || 0, e = Math.min(r[2] ? +r[2] : size - 1, size - 1); res.statusCode = 206; res.setHeader('Content-Range', `bytes ${s}-${e}/${size}`); res.setHeader('Content-Length', e - s + 1); fs.createReadStream(file, { start: s, end: e }).pipe(res); }
  else { res.setHeader('Content-Length', size); fs.createReadStream(file).pipe(res); }
}

http.createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.startsWith('/api/') || p === '/save' || /^\/(shots|luts|refs)\//.test(p)) return handle(req, res);
  if (p.startsWith('/data/')) { const f = path.join(DATA, p.slice(6)); return f.startsWith(DATA) ? serve(req, res, f) : (res.statusCode = 403, res.end()); }
  const f = path.join(PUB, p === '/' ? 'index.html' : p); return f.startsWith(PUB) ? serve(req, res, f) : (res.statusCode = 403, res.end());
}).listen(process.env.PORT || 8766, () => console.log('Studio (local dev) on http://localhost:' + (process.env.PORT || 8766)));

// Optional: also serve the data folder from a second port, to mimic Blob's separate origin (FS_PUBLIC_BASE=http://localhost:<DATA_PORT>/)
if (process.env.DATA_PORT) http.createServer((req, res) => { res.setHeader('Access-Control-Allow-Origin', '*');
  const f = path.join(DATA, decodeURIComponent(new URL(req.url, 'http://x').pathname)); return f.startsWith(DATA) ? serve(req, res, f) : (res.statusCode = 403, res.end()); })
  .listen(+process.env.DATA_PORT, () => console.log('Data (separate origin) on http://localhost:' + process.env.DATA_PORT));
