// Copies the Studio screens (shared with the local app) into public/ at build time.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const src = path.resolve(here, '../../.claude/editing-studio/studio');
const dst = path.resolve(here, '../public');
fs.mkdirSync(dst, { recursive: true });
for (const f of ['index.html', 'app.js', 'engine.js', 'style.css']) {
  if (!fs.existsSync(path.join(src, f))) { console.error(`Missing ${path.join(src, f)}. In Vercel, turn on "Include files outside the Root Directory in the Build Step".`); process.exit(1); }
  fs.copyFileSync(path.join(src, f), path.join(dst, f));
}
console.log('Copied the Studio screens into public/');
