// Copies the Studio screens (shared with the local app) into public/ at build time.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const src = path.resolve(here, '../../.claude/editing-studio/studio');
const dst = path.resolve(here, '../public');
fs.mkdirSync(dst, { recursive: true });
for (const f of ['index.html', 'app.js', 'engine.js', 'motion.js', 'effects.js', 'style.css']) {
  if (!fs.existsSync(path.join(src, f))) { console.error(`Missing ${path.join(src, f)}. In Vercel, turn on "Include files outside the Root Directory in the Build Step".`); process.exit(1); }
  fs.copyFileSync(path.join(src, f), path.join(dst, f));
}
// effect thumbnails
fs.mkdirSync(path.join(dst, 'fx'), { recursive: true });
for (const f of fs.readdirSync(path.join(src, 'fx'))) fs.copyFileSync(path.join(src, 'fx', f), path.join(dst, 'fx', f));
// animation presets saved in the repo, as one list
const ad = path.resolve(here, '../../.claude/editing-studio/animations'), anims = [];
if (fs.existsSync(ad)) for (const f of fs.readdirSync(ad).filter(f => f.endsWith('.json'))) { try { anims.push(JSON.parse(fs.readFileSync(path.join(ad, f), 'utf8'))); } catch {} }
fs.writeFileSync(path.join(dst, 'animations.json'), JSON.stringify(anims));
console.log('Copied the Studio screens into public/');
