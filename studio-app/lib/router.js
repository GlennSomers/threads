// One handler for every endpoint, so the hosted app and the local dev server behave the same.
import { FS, putText, putBuffer, getJSON, getText, list, urlOf } from './store.js';
import { dispatch, jobStatus } from './jobs.js';
import { authOn, checkPassword, cookieFor, isAuthed } from './auth.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import { DATA } from './store.js';

const F = '[-+]?(?:\\d+\\.?\\d*|\\.\\d+)(?:[eE][-+]?\\d+)?', CUBE_ROW = new RegExp(`^\\s*${F}\\s+${F}\\s+${F}`);   // rows may use e-notation
const VIDEO = new Set(['.mp4', '.mov', '.m4v', '.webm', '.mkv']);
const slug = s => String(s).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '') || 'item';
const safe = n => (path.basename(String(n)).replace(/[^A-Za-z0-9._-]+/g, '_').replace(/^[._]+|[._]+$/g, '') || 'file');
const stemOf = n => n.replace(/\.[^.]+$/, '');

async function raw(req) { const c = []; for await (const x of req) c.push(Buffer.isBuffer(x) ? x : Buffer.from(x)); return Buffer.concat(c); }
async function body(req) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body;
  const t = typeof req.body === 'string' ? req.body : Buffer.isBuffer(req.body) ? req.body.toString() : (await raw(req)).toString();
  try { return t ? JSON.parse(t) : {}; } catch { return {}; }
}
function send(res, code, obj, headers = {}) {
  const b = JSON.stringify(obj); res.statusCode = code;
  res.setHeader('Content-Type', 'application/json'); res.setHeader('Cache-Control', 'no-store');
  for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
  res.end(b);
}

async function clips() {
  const files = await list('clips/'), proxies = await list('proxy/');
  const out = [];
  for (const f of files.filter(f => VIDEO.has(path.extname(f.pathname).toLowerCase())).sort((a, b) => a.pathname.localeCompare(b.pathname))) {
    const name = path.basename(f.pathname), stem = stemOf(name);
    const px = proxies.find(p => p.pathname === `proxy/${stem}.mp4`), words = await getJSON(`clips/${stem}.words.json`);
    const job = await jobStatus(`prep-${stem}`);
    let status = px && words ? 'ready' : 'new';
    if (status !== 'ready' && job) status = job.status === 'error' ? `error: ${job.message}` : job.status === 'done' ? 'new' : 'processing';
    out.push({ name, status, proxy: px ? px.url : null, words: words || [], cuts: (await getJSON(`clips/${stem}.cuts.json`)) || [] });
  }
  return out;
}

async function ingests() {
  const files = await list('references/'), jobs = await list('jobs/ing-');
  const ids = [...new Set([...files.map(f => f.pathname.split('/')[1]), ...jobs.map(j => j.pathname.replace(/^jobs\/ing-/, '').replace(/\.json$/, ''))])], out = [];
  for (const id of ids) {
    const m = await getJSON(`references/${id}/measurements.json`), c = await getJSON(`references/${id}/caption.json`), job = await jobStatus(`ing-${id}`);
    let status = m ? 'ready' : 'new'; if (!m && job) status = job.status === 'error' ? `error: ${job.message}` : 'processing';
    if (status === 'new') continue;
    out.push({ id, name: (m || {}).source || id, status, measurements: m, caption: c, grade_ok: !!m });
  }
  return out;
}

export async function handle(req, res) {
  const u = new URL(req.url, 'http://x');
  const route = u.searchParams.get('route') || u.pathname, q = u.searchParams, M = req.method;
  try {
    if (route === '/api/config') return send(res, 200, { blob: !FS, auth: authOn(), authed: isAuthed(req) });
    if (route === '/api/login' && M === 'POST') {
      const { password } = await body(req);
      return checkPassword(password) ? send(res, 200, { ok: true }, { 'Set-Cookie': cookieFor() }) : send(res, 401, { error: 'Wrong password' });
    }
    if (!isAuthed(req)) return send(res, 401, { error: 'Login required' });

    if (route === '/api/blob-token' && M === 'POST' && !FS) {
      const { handleUpload } = await import('@vercel/blob/client');
      const json = await handleUpload({ body: await body(req), request: req, onBeforeGenerateToken: async pathname => {
        if (!/^(clips|references-src|luts|shots)\/[A-Za-z0-9._-]+$/.test(pathname)) throw new Error('Bad upload path');
        return { allowedContentTypes: pathname.startsWith('luts/') ? ['text/plain', 'application/octet-stream'] : pathname.startsWith('shots/') ? ['image/*'] : ['video/*', 'application/octet-stream'], addRandomSuffix: false, allowOverwrite: true, maximumSizeInBytes: 3e9 }; },
        onUploadCompleted: async () => {} });
      return send(res, 200, json);
    }
    if (route === '/api/register' && M === 'POST') {
      const { kind, pathname } = await body(req), name = path.basename(String(pathname || ''));
      if (kind === 'clip' && String(pathname).startsWith('clips/')) { await dispatch('prepare', { clip: name }, `prep-${stemOf(name)}`); return send(res, 200, { name }); }
      if (kind === 'reference' && String(pathname).startsWith('references-src/')) { const id = slug(stemOf(name)); await dispatch('ingest', { id, source: name }, `ing-${id}`); return send(res, 200, { name }); }
      return send(res, 400, { error: 'Bad register request' });
    }
    // local dev: the browser posts the raw file here (the hosted app uploads straight to Blob instead)
    if ((route === '/api/upload' || route === '/api/ingest-upload') && M === 'POST') {
      if (!FS) return send(res, 400, { error: 'Use the direct upload' });
      const name = safe(q.get('name') || 'clip.mp4'), data = await raw(req), clip = route === '/api/upload', dir = clip ? 'clips' : 'references-src';
      const f = path.join(DATA, dir, name); await fs.mkdir(path.dirname(f), { recursive: true }); await fs.writeFile(f, data);
      if (clip) await dispatch('prepare', { clip: name }, `prep-${stemOf(name)}`); else { const id = slug(stemOf(name)); await dispatch('ingest', { id, source: name }, `ing-${id}`); }
      return send(res, 200, { name });
    }
    if (route === '/api/clips') return send(res, 200, await clips());
    if ((route === '/api/asset-upload' || route === '/api/asset-fetch') && M === 'POST') {
      let name, buf;
      if (route === '/api/asset-upload') { name = safe(q.get('name') || 'image.jpg'); buf = await raw(req); }
      else { const { url } = await body(req); if (!/^https:\/\//.test(String(url || ''))) return send(res, 400, { error: 'https links only' });
        const r2 = await fetch(url, { headers: { 'User-Agent': 'editing-studio/1.0' } }); if (!r2.ok) return send(res, 400, { error: 'Could not fetch the image (' + r2.status + ')' });
        buf = Buffer.from(await r2.arrayBuffer()); name = safe(decodeURIComponent(new URL(url).pathname.split('/').pop() || 'image.jpg')).slice(-80); }
      if (buf.length > 25e6) return send(res, 400, { error: 'Image too large (25 MB max)' });
      await putBuffer(`shots/${name}`, buf, 'image/' + (/\.png$/i.test(name) ? 'png' : 'jpeg')); return send(res, 200, { file: name });
    }
    if (route === '/api/cuts' && M === 'POST') {
      const name = safe(q.get('name') || ''), cuts = await body(req);
      if (!Array.isArray(cuts) || !cuts.every(c => c && +c.b > +c.a && +c.a >= 0)) return send(res, 400, { error: 'Expected a list of {a, b}' });
      await putText(`clips/${stemOf(name)}.cuts.json`, JSON.stringify(cuts, null, 1)); return send(res, 200, { saved: cuts.length });
    }
    if (route === '/api/words' && M === 'POST') {
      const name = safe(q.get('name') || ''), words = await body(req);
      if (!Array.isArray(words) || !words.every(w => w && typeof w.word === 'string' && Number.isFinite(+w.start) && Number.isFinite(+w.end))) return send(res, 400, { error: 'Expected a list of {word, start, end}' });
      const clean = words.filter(w => w.word.trim()).map(w => ({ word: w.word.trim(), start: +(+w.start).toFixed(3), end: +(+w.end).toFixed(3) }));
      await putText(`clips/${stemOf(name)}.words.json`, JSON.stringify(clean, null, 1)); return send(res, 200, { saved: clean.length });
    }
    if (route === '/api/process' && M === 'POST') { const name = safe(q.get('name')); await dispatch('prepare', { clip: name }, `prep-${stemOf(name)}`); return send(res, 200, { name }); }
    if ((route === '/api/import' || route === '/api/ingest-import') && M === 'POST') {
      const { url } = await body(req); if (!/^https:\/\//.test(String(url || ''))) return send(res, 400, { error: 'https links only' });
      const id = await dispatch('import', { url, kind: route === '/api/import' ? 'clip' : 'reference' });
      return send(res, 200, { name: null, pending: true, job: id });
    }
    if (route === '/api/shot' && M === 'POST') {
      let { url } = await body(req); url = String(url || '').trim(); if (!/^https?:\/\//.test(url)) url = 'https://' + url;
      const file = url.toLowerCase().replace(/^https?:\/\//, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) + '.png';
      await dispatch('shot', { url, file }, `shot-${file}`); return send(res, 200, { file, pending: true });
    }
    if (route === '/api/ingests') return send(res, 200, await ingests());
    if (route === '/api/preset' && M === 'POST') {
      const d = await body(req), n = slug(d.name || 'preset'); d.name = n; await putText(`styles/captions/${n}.json`, JSON.stringify(d, null, 1)); return send(res, 200, { saved: `styles/captions/${n}.json` });
    }
    if (route === '/api/presets') { const out = []; for (const f of (await list('styles/captions/')).filter(f => f.pathname.endsWith('.json'))) { const j = await getJSON(f.pathname); if (j) out.push(j); } return send(res, 200, out); }
    if (route === '/api/lut-save' && M === 'POST') {
      const d = await body(req), text = String(d.text || ''), size = /^\s*LUT_3D_SIZE\s+(\d+)/m.exec(text);
      const rows = text.split(/\r?\n/).filter(l => CUBE_ROW.test(l)).length;
      if (!size || rows !== (+size[1]) ** 3) return send(res, 400, { error: 'Not a valid 3D .cube file.' });
      if (text.length > 60e6) return send(res, 400, { error: 'LUT too large' });
      const id = slug(d.name || 'lut');
      await putText(`luts/${id}.cube`, text, 'text/plain'); await putText(`luts/${id}.json`, JSON.stringify({ id, name: String(d.name || id), size: +size[1], warnings: d.warnings || [] }, null, 1));
      return send(res, 200, { id });
    }
    if (route === '/api/lut-register' && M === 'POST') {   // the browser uploaded luts/<id>.cube straight to Blob (too big for a function body)
      const d = await body(req), id = slug(d.name || 'lut'), text = await getText(`luts/${id}.cube`) || '';
      const size = /^\s*LUT_3D_SIZE\s+(\d+)/m.exec(text), rows = text.split(/\r?\n/).filter(l => CUBE_ROW.test(l)).length;
      if (!size || rows !== (+size[1]) ** 3) return send(res, 400, { error: 'Not a valid 3D .cube file.' });
      await putText(`luts/${id}.json`, JSON.stringify({ id, name: String(d.name || id), size: +size[1], warnings: d.warnings || [] }, null, 1)); return send(res, 200, { id });
    }
    if (route === '/api/luts') { const out = []; for (const f of (await list('luts/')).filter(f => f.pathname.endsWith('.json'))) { const j = await getJSON(f.pathname); if (j) out.push(j); } return send(res, 200, out); }
    if (route === '/save' && M === 'POST') {
      const d = await body(req), n = slug(d.name || 'my-style'); d.name = n; await putText(`styles/${n}.json`, JSON.stringify(d, null, 1)); return send(res, 200, { saved: `styles/${n}.json` });
    }
    if (route === '/api/styles') { const out = []; for (const f of (await list('styles/')).filter(f => /^styles\/[^/]+\.json$/.test(f.pathname))) { const j = await getJSON(f.pathname); if (j) out.push(j); } return send(res, 200, out); }
    if (route === '/api/render' && M === 'POST') {
      const d = await body(req); let style = d.style;
      if (!style) { style = await getJSON(`styles/${slug(d.name || '')}.json`); if (!style) return send(res, 404, { error: 'No saved style with that name.' }); }
      const n = slug(style.name || stemOf(String(style.clip || 'render'))); style.name = n;
      const id = await dispatch('render', { style }, `render-${n}`); return send(res, 200, { job: id, name: n });
    }
    if (route === '/api/renders') {
      const n = slug(q.get('name') || ''), files = (await list(`renders/${n}/`)).filter(f => f.pathname.endsWith('.mp4')), job = await jobStatus(`render-${n}`);
      return send(res, 200, { files: files.map(f => ({ file: path.basename(f.pathname), url: f.url, size: f.size })), job });
    }
    const m = /^\/(shots|luts|refs)\/(.+)$/.exec(route);
    if (m) {
      const parts = m[2].split('/').map(decodeURIComponent).map(safe), key = m[1] === 'refs' ? `references/${parts[0]}/${parts[1]}` : `${m[1]}/${parts[0]}`;
      const url = await urlOf(key); if (!url) { res.statusCode = 404; return res.end('Not found'); }
      res.statusCode = 302; res.setHeader('Location', url); res.setHeader('Cache-Control', 'no-store'); return res.end();
    }
    return send(res, 404, { error: 'Not found: ' + route });
  } catch (e) {
    console.error(e); return send(res, 500, { error: String(e.message || e) });
  }
}
