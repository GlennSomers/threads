// Tiny Vercel Blob CLI used by the job runner (tools/studio_job.py).
//   node blob.mjs put <pathname> <file> [contentType]
//   node blob.mjs get <pathname> <outfile>
//   node blob.mjs list <prefix>        -> JSON [{pathname,url,size}]
import fs from 'node:fs';
import { put, list } from '@vercel/blob';

const [cmd, a, b, c] = process.argv.slice(2);
async function all(prefix) { const out = []; let cursor; do { const r = await list({ prefix, cursor, limit: 1000 }); out.push(...r.blobs); cursor = r.cursor; } while (cursor); return out; }

if (cmd === 'put') {
  await put(a, fs.readFileSync(b), { access: 'public', addRandomSuffix: false, allowOverwrite: true, contentType: c || undefined, cacheControlMaxAge: 60 });
} else if (cmd === 'get') {
  const hit = (await all(a)).find(x => x.pathname === a);
  if (!hit) { console.error('not found: ' + a); process.exit(2); }
  const r = await fetch(hit.url + '?t=' + Date.now()); if (!r.ok) { console.error('download failed ' + r.status); process.exit(3); }
  fs.writeFileSync(b, Buffer.from(await r.arrayBuffer()));
} else if (cmd === 'list') {
  console.log(JSON.stringify((await all(a)).map(x => ({ pathname: x.pathname, url: x.url, size: x.size }))));
} else { console.error('usage: put|get|list'); process.exit(1); }
