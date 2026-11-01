/* ---------- hosted mode: login, config, direct uploads (does nothing different when run locally) ---------- */
let CFG = {};
const _fetch = window.fetch.bind(window);
let loginP;
function askLogin() {
  return loginP || (loginP = new Promise(res => {
    const o = document.createElement('div'); o.id = 'login';
    o.innerHTML = '<form><h2>Editing Studio</h2><input type="password" id="pw" placeholder="Password" autofocus><button class="primary">Log in</button><p id="lerr"></p></form>';
    document.body.appendChild(o);
    o.querySelector('form').onsubmit = async e => { e.preventDefault();
      const r = await _fetch('/api/login', { method: 'POST', body: JSON.stringify({ password: o.querySelector('#pw').value }) });
      if (r.ok) { o.remove(); loginP = null; res(); } else o.querySelector('#lerr').textContent = 'Wrong password'; }; }));
}
window.fetch = async (...args) => { const r = await _fetch(...args);
  if (r.status === 401 && !String(args[0]).includes('/api/login')) { await askLogin(); return _fetch(...args); } return r; };
const cleanName = n => n.replace(/[^A-Za-z0-9._-]+/g, '_');
// kind: 'clip' | 'reference'. Hosted: straight to Blob, then register. Local: raw POST to the Python server.
async function sendFile(kind, file, localUrl) {
  if (CFG.blob) {
    const { upload } = await import('https://esm.sh/@vercel/blob@0.27.3/client');
    const pathname = (kind === 'clip' ? 'clips/' : 'references-src/') + cleanName(file.name);
    await upload(pathname, file, { access: 'public', handleUploadUrl: '/api/blob-token', multipart: true });
    return (await fetch('/api/register', { method: 'POST', body: JSON.stringify({ kind, pathname }) })).json();
  }
  return (await fetch(localUrl + encodeURIComponent(file.name), { method: 'POST', body: file })).json();
}
// keep checking the clip list while a hosted job (import, prepare) finishes
function pollClips(ms = 5000, tries = 90) { let n = 0; const t = setInterval(async () => { if (++n > tries) return clearInterval(t);
  const list = await (await fetch('/api/clips')).json(); if (list.some(c => c.status === 'ready') && $('#studio').hidden) { clearInterval(t); refresh(); } if (list.length && list.every(c => c.status === 'ready')) clearInterval(t); }, ms); }

/* ---------- sound ---------- */
let AC, musicNode;
function snd(kind) {
  AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === 'suspended') AC.resume();
  const t = AC.currentTime, g = AC.createGain(); g.connect(AC.destination);
  const osc = (type, f0, f1, dur, vol) => { const o = AC.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + dur); o.connect(g); o.start(t); o.stop(t + dur); };
  const noise = (dur, f0, f1, vol) => { const b = AC.createBuffer(1, AC.sampleRate * dur, AC.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const s = AC.createBufferSource(); s.buffer = b; const f = AC.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 2; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(.001, t); g.gain.linearRampToValueAtTime(vol, t + dur * .4); g.gain.linearRampToValueAtTime(.001, t + dur); s.connect(f); f.connect(g); s.start(t); };
  if (kind === 'whoosh') noise(.45, 300, 4000, .5);
  else if (kind === 'pop') osc('sine', 700, 180, .12, .5);
  else if (kind === 'ping') osc('sine', 1320, 1320, .5, .3);
  else if (kind === 'click') osc('square', 1800, 900, .03, .15);
  else if (kind === 'typing') for (let k = 0; k < 6; k++) setTimeout(() => snd('click'), k * 70);
  else if (kind === 'music') {
    if (musicNode) { musicNode.forEach(o => o.stop()); musicNode = null; return; }
    const mg = AC.createGain(); mg.gain.value = .04; mg.connect(AC.destination);
    musicNode = [220, 277, 330].map(f => { const o = AC.createOscillator(); o.type = 'sine'; o.frequency.value = f; o.connect(mg); o.start(); return o; });
  }
}

/* ---------- stage: a video + live overlay ---------- */
const stages = new Set();
class Stage {
  constructor(el, { cfg, win, main }) { this.el = el; this.cfg = cfg; this.win = win; this.main = main;
    el.insertAdjacentHTML('afterbegin', '<video muted playsinline preload="auto"></video><div class="ov"></div>');
    this.v = el.querySelector('video'); this.ov = el.querySelector('.ov');
    if (main) { this.gl = el.insertBefore(Object.assign(document.createElement('canvas'), { className: 'glv' }), this.ov); this.gl.hidden = true; } this.v.src = S.clip.proxy; this.vis = true; this.last = ''; this.lastT = 0;
    if (!main) { new IntersectionObserver(e => { this.vis = e[0].isIntersecting; this.vis ? this.v.play().catch(() => {}) : this.v.pause(); }).observe(el); this.v.loop = false; this.v.play().catch(() => {}); }
    stages.add(this); }
  drawLut(raw, f) {
    const on = !!S.lutCube && !raw && this.v.readyState >= 2;
    this.gl.hidden = !on; this.v.style.visibility = on ? 'hidden' : 'visible'; if (!on) return;
    const g = this.glx = this.glx || initGL(this.gl); if (!g) { this.gl.hidden = true; this.v.style.visibility = 'visible'; return; }
    if (g.cube !== S.lutCube) { uploadLut(g, S.lutCube); g.cube = S.lutCube; }
    const w = this.v.videoWidth, h = this.v.videoHeight; if (this.gl.width !== w || this.gl.height !== h) { this.gl.width = w; this.gl.height = h; g.gl.viewport(0, 0, w, h); }
    g.gl.activeTexture(g.gl.TEXTURE0); g.gl.bindTexture(g.gl.TEXTURE_2D, g.vtex);
    g.gl.texImage2D(g.gl.TEXTURE_2D, 0, g.gl.RGBA, g.gl.RGBA, g.gl.UNSIGNED_BYTE, this.v); g.gl.drawArrays(g.gl.TRIANGLE_STRIP, 0, 4);
    this.gl.style.filter = f.filter; this.gl.style.transform = this.v.style.transform; }
  destroy() { stages.delete(this); this.v.removeAttribute('src'); this.v.load(); }
  tick() {
    if (!this.vis) return; const v = this.v; let t = v.currentTime; const [a, b] = this.win || [0, S.dur || v.duration || 1];
    if (!this.main || this.win) { if (t >= b - .02 || t < a - .3) { v.currentTime = a; t = a; if (v.paused && !this.main) v.play().catch(() => {}); } }
    if (this.main && !this.win && v.ended) { v.currentTime = 0; }
    const cfg = this.cfg(), raw = this.main && S.mode === 'raw', f = compose(t, cfg, raw);
    v.style.filter = f.filter; v.style.transform = `scale(${f.scale})`; this.el.style.setProperty('--hf', f.font);
    if (this.main) this.drawLut(raw, f);
    if (f.html !== this.last) { this.ov.innerHTML = f.html; this.last = f.html; }
    if (this.main && S.sound && !v.paused) this.sounds(t);
    this.lastT = t; if (this.main) updateScrub(t);
  }
  sounds(t) { const lo = this.lastT; if (t < lo) return;
    soundEvents(this.cfg(), S.snd).forEach(e => { if (lo < e.t && e.t <= t) snd(e.snd); }); }
}
(function loop() { stages.forEach(s => s.tick()); requestAnimationFrame(loop); })();

/* ---------- ui ---------- */
let main, cards = [];
function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.add('show'); clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.remove('show'), 1800); }
function baseCfg() { return { grade: S.grade, font: S.font, caption: S.caption, capOpts: S.capEdit, hook: S.hook, fx: S.fx, whole: S.whole }; }
function updateScrub(t) { if (!updateScrub.drag) $('#scrub').value = 1000 * t / (S.dur || 1); }

async function refresh(keep) {
  S.clips = await (await fetch('/api/clips')).json();
  const sel = $('#clipsel'); sel.innerHTML = S.clips.map(c => `<option>${esc(c.name)}</option>`).join(''); sel.hidden = S.clips.length < 2;
  if (!S.clips.length) { show('empty'); $('#clipname').textContent = 'No clip yet'; return; }
  const c = S.clips.find(c => c.name === (keep || S.clip?.name)) || S.clips[S.clips.length - 1]; sel.value = c.name;
  $('#clipname').textContent = c.name + (c.status === 'processing' ? ' (processing...)' : c.status.startsWith('error') ? ' (' + c.status + ')' : '');
  if (c.status === 'processing' || c.status === 'new') { show('empty'); setMsg(`Processing ${c.name}: making a preview and transcribing...`); setTimeout(() => refresh(c.name), 2000); return; }
  if (c.status.startsWith('error')) { show('empty'); setMsg(c.status, true); return; }
  load(c);
}
function show(w) { $('#empty').hidden = w !== 'empty'; $('#studio').hidden = w !== 'studio'; $('#ingest').hidden = w !== 'ingest'; }
function setMsg(m, err) { const e = $('#msg'); e.textContent = m; e.className = 'msg' + (err ? ' err' : ''); }

function load(c) {
  if (S.clip?.name === c.name && S.clip.proxy === c.proxy && main) { show('studio'); return; }
  S.clip = c; S.words = c.words;
  const probe = document.createElement('video'); probe.preload = 'metadata'; probe.src = c.proxy;
  probe.onloadedmetadata = () => { S.dur = probe.duration; S.beats = makeBeats(S.words, S.dur); S.fx = {}; S.beats.forEach((_, i) => S.fx[i] = []);
    S.caption = null; S.capEdit = {}; S.lut = null; S.lutCube = null; baseImg = null; S.hook = null; S.whole = new Set(); S.snd = new Set(); S.done = new Set(); S.step = 0; S.beat = 0; show('studio'); build(); renderStep(); };
}
function build() {
  if (main) main.destroy(); $('#main').innerHTML = '';
  main = new Stage($('#main'), { main: true, cfg: baseCfg }); main.win = null;
  $('#tabs').innerHTML = STEPS.map((s, i) => `<button data-i="${i}">${s[1]}</button>`).join('');
}
function mark() { document.querySelectorAll('#tabs button').forEach((b, i) => { b.classList.toggle('on', i === S.step); b.classList.toggle('done', S.done.has(i)); }); }

function card(i, label, onc, cfgFn, win, selected) {
  const d = document.createElement('div'); d.className = 'card' + (selected ? ' on' : '');
  d.innerHTML = `<span class="num">${i + 1}</span><span class="pk">Picked</span><span class="lbl">${esc(label)}</span>`;
  d.onclick = onc; $('#body .grid').appendChild(d); cards.push(new Stage(d, { cfg: cfgFn, win })); return d;
}
function renderStep() {
  cards.forEach(c => c.destroy()); cards = []; mark();
  const [id, , help] = STEPS[S.step]; $('#help').textContent = help; const body = $('#body'); body.innerHTML = '';
  $('#back').disabled = S.step === 0; $('#next').textContent = S.step === STEPS.length - 1 ? 'Done' : 'Next';
  const w0 = [0, Math.min(3, S.dur)]; main.win = null;
  const grid = () => body.insertAdjacentHTML('beforeend', '<div class="grid"></div>');
  if (id === 'colours') { grid(); GRADES.forEach((g, i) => card(i, g[1], () => { S.grade = g[0]; S.done.add(0); toast('Grade: ' + g[1]); renderStep(); }, () => ({ ...baseCfg(), grade: g[0] }), w0, S.grade === g[0])); lutSection(body); }
  if (id === 'fonts') { grid(); FONTS.forEach((f, i) => card(i, f[1], () => { S.font = f[0]; S.done.add(1); toast('Font: ' + f[1]); renderStep(); }, () => ({ ...baseCfg(), font: f[0], caption: S.caption || 'groups' }), w0, S.font === f[0])); }
  if (id === 'captions') { grid(); CAPS.forEach((c, i) => card(i, c[1], () => { S.caption = c[0]; S.capEdit = {}; S.done.add(2); toast(`Synced captions to ${S.words.length} words`); renderStep(); }, () => ({ ...baseCfg(), caption: c[0], capOpts: {} }), w0, S.caption === c[0])); capEditor(body); }
  if (id === 'beats') renderBeats(body);
  if (id === 'sound') { body.insertAdjacentHTML('beforeend', '<div class="sounds"></div>'); SOUNDS.forEach(s => { const b = document.createElement('button'); b.textContent = s[1]; b.className = S.snd.has(s[0]) ? 'on' : '';
    b.onclick = () => { S.snd.has(s[0]) ? S.snd.delete(s[0]) : S.snd.add(s[0]); S.done.add(4); S.sound = true; $('#snd').textContent = '🔊'; snd(s[0]); renderStep(); }; $('.sounds').appendChild(b); }); }
  if (id === 'watch') renderWatch(body);
}
function renderBeats(body) {
  const total = S.dur || 1;
  body.insertAdjacentHTML('beforeend', `<div class="timeline">${S.beats.map((b, i) => `<div class="seg-b${i === S.beat ? ' on' : ''}" data-i="${i}" style="flex:${(b.t1 - b.t0) / total}"><b>${i === 0 ? 'Hook' : 'Beat ' + (i + 1)}</b><small>${esc(b.text || '(no transcript)')}</small><small>${i === 0 ? (S.hook ? HOOKS.find(h => h[0] === S.hook)[1] : '') : (S.fx[i].length ? S.fx[i].map(x => FX.find(f => f[0] === x)[1]).join(', ') : '')}</small></div>`).join('')}</div>`);
  body.querySelectorAll('.seg-b').forEach(e => e.onclick = () => { S.beat = +e.dataset.i; renderStep(); });
  const b = S.beats[S.beat], win = [b.t0, Math.min(b.t1, b.t0 + 4)]; main.win = [b.t0, b.t1]; main.v.currentTime = b.t0; main.v.play().catch(() => {}); $('#play').textContent = '❚❚';
  if (S.beat > 0 && S.fx[S.beat].includes('page')) {
    body.insertAdjacentHTML('beforeend', `<h3>Page for this beat</h3><div class="row"><input type="text" id="shoturl" placeholder="https://the-page-you-mention.com" value="${esc(b.shotUrl || '')}"><button id="shotbtn">${b.shot ? 'Recapture' : 'Capture'}</button></div><div class="help" id="shotmsg">${b.shot ? 'Using a real screenshot: ' + esc(b.shot) : 'Until you capture one, the card shows a stand-in page.'}</div>`);
    $('#shotbtn').onclick = async () => { const u = $('#shoturl').value.trim(); if (!u) return; $('#shotmsg').textContent = 'Taking a screenshot...';
      const d = await (await fetch('/api/shot', { method: 'POST', body: JSON.stringify({ url: u }) })).json();
      if (d.error) { $('#shotmsg').textContent = d.error; return; }
      if (d.pending) { for (let i = 0; i < 60; i++) { if ((await fetch('/shots/' + encodeURIComponent(d.file), { method: 'HEAD' })).ok) break; $('#shotmsg').textContent = 'Taking the screenshot in the background... ' + (i * 4) + 's'; await new Promise(r => setTimeout(r, 4000)); } }
      b.shot = d.file; b.shotUrl = u; toast('Screenshot saved'); renderStep(); }; }
  body.insertAdjacentHTML('beforeend', `<h3>${S.beat === 0 ? 'Hook title' : 'Beat ' + (S.beat + 1) + ' effects'}</h3><div class="grid"></div>`);
  if (S.beat === 0) HOOKS.forEach((h, i) => card(i, h[1], () => { S.hook = S.hook === h[0] ? null : h[0]; S.done.add(3); toast('Hook: ' + h[1]); renderStep(); }, () => ({ ...baseCfg(), hook: h[0] }), win, S.hook === h[0]));
  else {
    const sel = id => S.fx[S.beat].includes(id);
    card(0, 'Just you', () => { S.fx[S.beat] = []; S.done.add(3); renderStep(); }, () => ({ ...baseCfg(), fx: {} }), win, !S.fx[S.beat].length);
    FX.forEach((f, i) => card(i + 1, f[1], () => { const a = S.fx[S.beat]; a.includes(f[0]) ? a.splice(a.indexOf(f[0]), 1) : a.push(f[0]); S.done.add(3); toast(f[1]); renderStep(); }, () => ({ ...baseCfg(), fx: { [S.beat]: [f[0]] } }), win, sel(f[0])));
  }
  body.insertAdjacentHTML('beforeend', '<h3>Whole clip</h3><div class="grid" id="g2"></div>');
  const g2 = $('#g2'); WHOLE.forEach((w, i) => { const d = document.createElement('div'); d.className = 'card' + (S.whole.has(w[0]) ? ' on' : '');
    d.innerHTML = `<span class="num">${i + 1}</span><span class="pk">Picked</span><span class="lbl">${esc(w[1])}</span>`;
    d.onclick = () => { S.whole.has(w[0]) ? S.whole.delete(w[0]) : S.whole.add(w[0]); S.done.add(3); toast(w[1]); renderStep(); }; g2.appendChild(d);
    cards.push(new Stage(d, { cfg: () => ({ ...baseCfg(), whole: new Set([w[0]]) }), win: [b.t0, Math.min(b.t1, b.t0 + 4)] })); });
}
function styleObj(name) { return { name, clip: S.clip.name, grade: S.grade, font: S.font, caption: S.caption, hook: S.hook, lut: S.lut ? S.lut.id : null, capOpts: S.capEdit, dur: +S.dur.toFixed(2),
  beats: S.beats.map((b, i) => ({ start: +b.t0.toFixed(2), end: +b.t1.toFixed(2), text: b.text, effects: S.fx[i], shot: b.shot || null, shotUrl: b.shotUrl || null })), whole: [...S.whole], sounds: [...S.snd] }; }
function renderWatch(body) {
  const row = (k, v) => `<div><b>${k}</b><span>${esc(v || 'not picked')}</span></div>`;
  body.innerHTML = `<div class="sum">${row('Colour', G(S.grade)[1])}${row('LUT', S.lut ? S.lut.name : 'none')}${row('Font', F(S.font)[1])}${row('Captions', (CAPS.find(c => c[0] === S.caption) || [])[1])}${row('Hook', (HOOKS.find(h => h[0] === S.hook) || [])[1])}` +
    S.beats.slice(1).map((b, i) => row('Beat ' + (i + 2), S.fx[i + 1].map(x => FX.find(f => f[0] === x)[1]).join(', ') || 'Just you')).join('') +
    `${row('Whole clip', [...S.whole].join(', '))}${row('Sound', [...S.snd].join(', '))}</div>
    <h3>Save as my style</h3><div class="row"><input type="text" id="sname" placeholder="Style name, e.g. split-card-reels"><button class="primary" id="ssave">Save style</button></div>
    <h3>Render</h3><div class="row"><button class="primary" id="rbtn">Render this style</button></div><div id="rstat" class="help">Save the style first, then render. The video is 1080x1920 at 30 fps.</div><div id="rlist"></div>`;
  const showRenders = async name => { const d = await (await fetch('/api/renders?name=' + encodeURIComponent(name))).json(), el = $('#rlist'); if (!el) return;
    el.innerHTML = (d.files || []).map(f => `<div class="row"><a href="${f.url}" target="_blank">${esc(f.file)}</a><span class="help">${(f.size / 1e6).toFixed(1)} MB</span></div>`).join('');
    const j = d.job; $('#rstat').textContent = !j ? $('#rstat').textContent : j.status === 'running' || j.status === 'queued' ? 'Rendering... this takes a few minutes.' : j.status === 'error' ? 'Render failed: ' + j.message : 'Render finished.'; return j; };
  $('#rbtn').onclick = async () => { const n = $('#sname').value.trim(); if (!n) return toast('Name and save your style first');
    await fetch('/save', { method: 'POST', body: JSON.stringify(styleObj(n)) }); S.done.add(5); mark();
    const r = await (await fetch('/api/render', { method: 'POST', body: JSON.stringify({ name: n }) })).json(); if (r.error) return toast(r.error);
    $('#rstat').textContent = 'Rendering... this takes a few minutes.'; const slugn = n.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
    for (let i = 0; i < 360; i++) { await new Promise(r => setTimeout(r, 5000)); const j = await showRenders(slugn); if (j && (j.status === 'done' || j.status === 'error')) break; } };
  $('#ssave').onclick = async () => { const n = $('#sname').value.trim(); if (!n) return toast('Name your style first');
    const r = await (await fetch('/save', { method: 'POST', body: JSON.stringify(styleObj(n)) })).json(); toast('Saved ' + r.saved); S.done.add(5); mark(); };
}

/* ---------- wiring ---------- */
async function upload(file) {
  setMsg(`Uploading ${file.name}...`); show('empty');
  const d = await sendFile('clip', file, '/api/upload?name='); if (d.error) return setMsg(d.error, true); S.clip = null; refresh(d.name);
}
$('#pick').onclick = () => $('#file').click(); $('#addbtn').onclick = () => { show('empty'); setMsg(''); };
$('#file').onchange = e => e.target.files[0] && upload(e.target.files[0]);
const drop = $('#drop');
['dragover', 'dragenter'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('over'); }));
['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('over'); }));
drop.addEventListener('drop', e => e.dataTransfer.files[0] && upload(e.dataTransfer.files[0]));
$('#linkform').onsubmit = async e => { e.preventDefault(); setMsg('Fetching from the link...');
  const d = await (await fetch('/api/import', { method: 'POST', body: JSON.stringify({ url: $('#linkurl').value.trim() }) })).json();
  if (d.pending) { setMsg('Importing in the background. This can take a few minutes; the Studio opens when it is ready.'); pollClips(); return; }
  d.error ? setMsg(d.error, true) : (S.clip = null, refresh(d.name)); };
$('#clipsel').onchange = e => { S.clip = null; refresh(e.target.value); };
$('#tabs').onclick = e => { const b = e.target.closest('button'); if (b) { S.step = +b.dataset.i; renderStep(); } };
$('#next').onclick = () => { if (S.step < STEPS.length - 1) { S.step++; renderStep(); } };
$('#back').onclick = () => { if (S.step > 0) { S.step--; renderStep(); } };
$('#play').onclick = () => { const v = main.v; v.paused ? v.play() : v.pause(); $('#play').textContent = v.paused ? '▶' : '❚❚'; };
$('#scrub').oninput = e => { updateScrub.drag = true; main.v.currentTime = e.target.value / 1000 * S.dur; };
$('#scrub').onchange = () => updateScrub.drag = false;
$('#snd').onclick = () => { S.sound = !S.sound; $('#snd').textContent = S.sound ? '🔊' : '🔇'; main.v.muted = !S.sound; };
document.querySelectorAll('.seg button').forEach(b => b.onclick = () => { S.mode = b.dataset.m; document.querySelectorAll('.seg button').forEach(x => x.classList.toggle('on', x === b)); });
$('#exportbtn').onclick = () => { S.step = 5; renderStep(); toast('Save your style, then ask Claude to render it'); };
document.addEventListener('keydown', e => { if (e.key === 'r' && !/INPUT/.test(e.target.tagName)) location.reload(); });
fetch('/api/config').then(r => r.json()).then(c => { CFG = c; }).catch(() => {}).finally(refresh);

/* ---------- hands-free demo (press D). R reloads. ---------- */
let demoOn = false;
async function demo() {
  if (demoOn || !S.clip) return; demoOn = true; document.body.classList.add('demo');
  const cur = document.createElement('div'); cur.id = 'fakecur'; cur.innerHTML = '<svg width="26" height="26" viewBox="0 0 24 24"><path d="M5 3l14 8-6 2 3 7-3 1-3-7-5 4z" fill="#fff" stroke="#000" stroke-width="1.3"/></svg>'; document.body.appendChild(cur);
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const go = async (el, wait = 900) => { if (!el) return; el.scrollIntoView({ block: 'center', behavior: 'smooth' }); await sleep(350);
    const r = el.getBoundingClientRect(); cur.style.transform = `translate(${r.left + r.width / 2}px,${r.top + r.height / 2}px)`; await sleep(750);
    cur.classList.add('click'); await sleep(140); cur.classList.remove('click'); el.click(); await sleep(wait); };
  const card = n => document.querySelector(`#body .grid .card:nth-child(${n})`);
  const tab = i => document.querySelector(`#tabs button[data-i="${i}"]`), next = () => $('#next');
  cur.style.transform = 'translate(60vw,60vh)'; await sleep(400);
  await go(tab(0), 500); await go(card(5)); await go(next(), 500);
  await go(card(2)); await go(next(), 500);
  await go(card(6)); await go(next(), 500);
  await go(card(3), 1600);
  for (const [bi, pick] of [[1, 3], [2, 4], [3, 6]]) { if (!S.beats[bi]) continue;
    await go(document.querySelector(`.seg-b[data-i="${bi}"]`), 600); await go(card(pick + 1), 1800); }
  const wc = document.querySelector('#g2 .card:nth-child(1)'); await go(wc, 700);
  await go(next(), 500);
  await go(document.querySelector('.sounds button:nth-child(1)'), 500); await go(document.querySelector('.sounds button:nth-child(2)'), 500); await go(next(), 800);
  await sleep(1500); cur.remove(); document.body.classList.remove('demo'); demoOn = false;
}
document.addEventListener('keydown', e => { if ((e.key === 'd' || e.key === 'D') && !/INPUT|TEXTAREA/.test(e.target.tagName)) demo(); });


/* ---------- caption editor + presets (nothing is saved unless you press Save) ---------- */
const HLS = [['none', 'None'], ['current', 'Current word'], ['spoken', 'Spoken words'], ['key', 'Key word (serif)'], ['box', 'Boxed words']];
const ANIMS = [['none', 'None'], ['pop', 'Pop'], ['slide', 'Slide up'], ['fade', 'Fade'], ['type', 'Typewriter']];
function capEditor(body) {
  if (!S.caption) { body.insertAdjacentHTML('beforeend', '<p class="help">Pick a caption style above, then edit it here.</p>'); return; }
  const o = capOpts(S.caption, S.capEdit), acc = G(S.grade)[3]; o.case = o.upper ? 'upper' : o.lower ? 'lower' : 'as';
  const set = (k, v) => { S.capEdit[k] = v; S.done.add(2); mark(); };
  const sel = (k, opts, label) => `<label>${label}<select data-k="${k}">${opts.map(x => `<option value="${x[0]}"${String(o[k]) === String(x[0]) ? ' selected' : ''}>${x[1]}</option>`).join('')}</select></label>`;
  const rng = (k, min, max, step, label, unit = '') => `<label>${label} <b id="v-${k}">${o[k]}${unit}</b><input type="range" data-k="${k}" min="${min}" max="${max}" step="${step}" value="${o[k]}"></label>`;
  body.insertAdjacentHTML('beforeend', `<h3>Edit captions</h3><div class="capedit">
    ${sel('font', [['', 'Pair default'], ...CAP_FONTS.map(f => [f, f])], 'Font')}
    ${sel('weight', [400, 600, 700, 800, 900].map(w => [w, w]), 'Weight')}
    ${rng('size', 3, 18, .1, 'Size')}
    ${rng('y', 12, 76, 1, 'Position from top', '%')}
    ${sel('align', [['center', 'Centre'], ['left', 'Left']], 'Alignment')}
    ${rng('group', 1, 6, 1, 'Words at a time')}
    ${sel('hl', HLS, 'Highlight')}
    ${sel('anim', ANIMS, 'Animation')}
    ${rng('offset', -.4, .4, .02, 'Timing shift (s)')}
    ${rng('linger', 0, 1.5, .05, 'Hold after word (s)')}
    ${rng('stroke', 0, 1.2, .05, 'Outline width')}
    ${sel('case', [['as', 'As spoken'], ['upper', 'UPPERCASE'], ['lower', 'lowercase']], 'Case')}
    <label>Text colour<input type="color" data-k="color" value="${o.color}"></label>
    <label>Highlight colour<input type="color" data-k="accent" value="${o.accent || acc}"></label>
    <label class="chk"><input type="checkbox" data-k="box" ${o.box ? 'checked' : ''}> Background box</label>
    <label>Box colour<input type="color" data-k="boxColor" value="${o.boxColor}"></label>
  </div>
  <p class="help">Position is kept inside Instagram's safe area (12% to 76% from the top). Changes show live in the big preview.</p>
  <div class="row"><button id="capreset">Reset to style defaults</button></div>
  <h3>Caption presets</h3><div id="presets" class="presets"></div>
  <div class="row"><input type="text" id="pname" placeholder="Preset name"><button class="primary" id="psave">Save current as preset</button></div>`);
  body.querySelectorAll('.capedit [data-k]').forEach(el => el.oninput = () => {
    const k = el.dataset.k, v = el.type === 'checkbox' ? el.checked : el.type === 'range' ? +el.value : el.value;
    if (k === 'case') { set('upper', v === 'upper'); set('lower', v === 'lower'); }
    else set(k, ['weight'].includes(k) ? +v : v);
    const lab = $('#v-' + k); if (lab) lab.textContent = v + (k === 'y' ? '%' : ''); });
  $('#capreset').onclick = () => { S.capEdit = {}; renderStep(); };
  $('#psave').onclick = async () => { const n = $('#pname').value.trim(); if (!n) return toast('Name the preset first');
    const r = await (await fetch('/api/preset', { method: 'POST', body: JSON.stringify({ name: n, base: S.caption, opts: S.capEdit }) })).json();
    toast('Saved preset ' + r.saved); capEditor.presets(); };
  capEditor.presets = async () => { const ps = await (await fetch('/api/presets')).json(); const box = $('#presets'); if (!box) return;
    box.innerHTML = ps.length ? '' : '<span class="help">No presets saved yet.</span>';
    ps.forEach(p => { const b = document.createElement('button'); b.textContent = p.name; b.onclick = () => usePreset(p); box.appendChild(b); }); };
  capEditor.presets();
}
function usePreset(p) { S.caption = p.base || 'groups'; S.capEdit = { ...(p.opts || {}) }; S.done.add(2); S.step = 2; show('studio'); renderStep(); toast('Using caption preset: ' + p.name); }


/* ---------- ingest: copy the editing style of a reference video ---------- */
let ingestTimer;
async function ingestList() {
  const list = await (await fetch('/api/ingests')).json(); const box = $('#ilist'); box.innerHTML = '';
  if (!list.length) box.innerHTML = '<p class="help">No references yet. Add one above.</p>';
  list.forEach(r => { const d = document.createElement('div'); d.className = 'sum ref';
    if (r.status === 'processing') { d.innerHTML = `<b>${esc(r.name)}</b> <span>Analysing... (cuts, pace, colour, captions)</span>`; box.appendChild(d); return; }
    if (r.status && r.status.startsWith('error')) { d.innerHTML = `<b>${esc(r.name)}</b> <span class="err">${esc(r.status)}</span>`; box.appendChild(d); return; }
    const m = r.measurements || {}, sh = m.shots || {}, sp = m.speech || {}, g = m.grade || {}, c = r.caption;
    const row = (k, v) => `<div><b>${k}</b><span>${esc(v ?? 'n/a')}</span></div>`;
    d.innerHTML = `<h4>${esc(r.id)}</h4>
      ${row('Cuts', `${(m.cuts || []).length} (${sh.cuts_per_10s} per 10 s), average shot ${sh.average_s} s`)}
      ${row('First 3 seconds', (m.first_3_seconds?.cuts || []).length ? 'cuts at ' + m.first_3_seconds.cuts.join(', ') + ' s' : 'one held shot')}
      ${row('Speech', sp.words_per_minute ? sp.words_per_minute + ' words per minute, ' + sp['pauses_over_0.25s'] + ' pauses' : 'not transcribed')}
      ${row('Loudness', m.audio?.loudness_lufs != null ? m.audio.loudness_lufs + ' LUFS' : 'no audio')}
      ${row('Closest grade', (GRADES.find(x => x[0] === g.grade_guess) || [])[1])}
      ${row('Captions', c ? `about ${c.opts.y}% from top, size ${c.opts.size}, ${c.opts.color}${c.opts.accent ? ', highlight ' + c.opts.accent : ''}${c.opts.group ? ', ' + c.opts.group + ' word(s) at a time' : ''}` : (m.caption_note || 'none found'))}
      <div class="row">${(m.sheets || []).map(f => `<a href="/refs/${encodeURIComponent(r.id)}/${f}" target="_blank"><img class="sheet" src="/refs/${encodeURIComponent(r.id)}/${f}"></a>`).join('')}</div>
      <p class="help">Layouts, font family, case, animation, motion graphics and sound design need eyes: ask Claude to read these sheets and finish <code>references/${esc(r.id)}/report.md</code>.</p>
      <div class="row">${r.grade_ok ? '<button data-a="grade">Use this grade</button>' : ''}${c ? '<button class="primary" data-a="use">Use this caption look</button><button data-a="save">Save as caption preset</button>' : ''}</div>`;
    d.querySelector('[data-a=grade]')?.addEventListener('click', () => { S.grade = g.grade_guess; toast('Grade: ' + G(S.grade)[1]); });
    d.querySelector('[data-a=use]')?.addEventListener('click', () => { if (!S.clip) return toast('Add a clip first, then use the look'); usePreset({ name: c.name, base: c.base, opts: c.opts }); });
    d.querySelector('[data-a=save]')?.addEventListener('click', async () => { const n = prompt('Preset name', c.name); if (!n) return;
      const r2 = await (await fetch('/api/preset', { method: 'POST', body: JSON.stringify({ name: n, base: c.base, opts: c.opts, source: r.name }) })).json(); toast('Saved preset ' + r2.saved); });
    box.appendChild(d); });
  if (list.some(r => r.status === 'processing')) { clearTimeout(ingestTimer); ingestTimer = setTimeout(ingestList, 2000); }
}
async function ingestUpload(file) { $('#imsg').textContent = 'Uploading ' + file.name + '...';
  const d = await sendFile('reference', file, '/api/ingest-upload?name=');
  $('#imsg').textContent = d.error || 'Analysing ' + d.name; ingestList(); }
$('#ingestbtn').onclick = () => { show('ingest'); ingestList(); };
$('#iback').onclick = () => S.clip && main ? show('studio') : refresh();
$('#ipick').onclick = () => $('#ifile').click();
$('#ifile').onchange = e => e.target.files[0] && ingestUpload(e.target.files[0]);
$('#ilink').onsubmit = async e => { e.preventDefault(); $('#imsg').textContent = 'Fetching...';
  const d = await (await fetch('/api/ingest-import', { method: 'POST', body: JSON.stringify({ url: $('#iurl').value.trim() }) })).json();
  $('#imsg').textContent = d.error || (d.pending ? 'Importing in the background. The result shows up below when it is ready.' : 'Analysing ' + d.name);
  const t = setInterval(ingestList, 8000); setTimeout(() => clearInterval(t), 600000); ingestList(); };


/* ---------- LUTs: Rec.709 .cube files, applied to the footage only ---------- */
function parseCube(text) {
  let size = 0, title = '', dmin = [0, 0, 0], dmax = [1, 1, 1], oneD = false; const vals = [];
  for (const raw of text.split(/\r?\n/)) { const l = raw.trim(); if (!l || l[0] === '#') continue;
    if (/^TITLE/i.test(l)) title = l.replace(/^TITLE\s*/i, '').replace(/^"|"$/g, '');
    else if (/^LUT_3D_SIZE/i.test(l)) size = +l.split(/\s+/)[1];
    else if (/^LUT_1D_SIZE/i.test(l)) oneD = true;
    else if (/^DOMAIN_MIN/i.test(l)) dmin = l.split(/\s+/).slice(1).map(Number);
    else if (/^DOMAIN_MAX/i.test(l)) dmax = l.split(/\s+/).slice(1).map(Number);
    else if (/^[-\d.]/.test(l)) { const p = l.split(/\s+/); if (p.length >= 3) vals.push(+p[0], +p[1], +p[2]); } }
  if (oneD && !size) throw new Error('This is a 1D LUT. Only 3D .cube LUTs are supported.');
  if (!size || size < 2 || size > 129) throw new Error('No valid LUT_3D_SIZE found. Is this a 3D .cube file?');
  if (vals.length !== size ** 3 * 3) throw new Error(`Expected ${size ** 3} colour rows for size ${size}, found ${vals.length / 3}.`);
  if (vals.some(Number.isNaN)) throw new Error('The file has rows that are not numbers.');
  return { title, size, dmin, dmax, data: Float32Array.from(vals) };
}
function cubeWarnings(c, fname) {
  const w = [], s = (c.title + ' ' + fname).toLowerCase();
  if (/(s-?log|v-?log|c-?log|log-?c|logc|slog|vlog|clog|f-?log|n-?log|arri|braw|red ?log|aces|hlg|rec\.?2020|rec2020|bt\.?2020|\bpq\b|\blog\b)/.test(s))
    w.push('The name suggests a log or wide-gamut conversion LUT. This Studio treats footage as Rec.709, so on normal phone or camera video this will look wrong.');
  if (c.dmin.some(x => x !== 0) || c.dmax.some(x => x !== 1)) w.push('The input range is not 0 to 1, which is unusual for a Rec.709 LUT.');
  return w;
}
function lutCPU(img, c) {
  const N = c.size, d = c.data, out = new Uint8ClampedArray(img.data.length), px = img.data;
  const at = (r, g, b) => (r + g * N + b * N * N) * 3;
  for (let i = 0; i < px.length; i += 4) {
    const f = k => clamp(((px[i + k] / 255) - c.dmin[k]) / (c.dmax[k] - c.dmin[k]), 0, 1) * (N - 1);
    const r = f(0), g = f(1), b = f(2), r0 = Math.floor(r), g0 = Math.floor(g), b0 = Math.floor(b);
    const r1 = Math.min(r0 + 1, N - 1), g1 = Math.min(g0 + 1, N - 1), b1 = Math.min(b0 + 1, N - 1), fr = r - r0, fg = g - g0, fb = b - b0;
    for (let k = 0; k < 3; k++) {
      const v = (R, G, B) => d[at(R, G, B) + k];
      const c00 = v(r0, g0, b0) * (1 - fr) + v(r1, g0, b0) * fr, c10 = v(r0, g1, b0) * (1 - fr) + v(r1, g1, b0) * fr;
      const c01 = v(r0, g0, b1) * (1 - fr) + v(r1, g0, b1) * fr, c11 = v(r0, g1, b1) * (1 - fr) + v(r1, g1, b1) * fr;
      out[i + k] = 255 * ((c00 * (1 - fg) + c10 * fg) * (1 - fb) + (c01 * (1 - fg) + c11 * fg) * fb); }
    out[i + 3] = 255; }
  return new ImageData(out, img.width, img.height);
}
function initGL(canvas) {
  const gl = canvas.getContext('webgl', { premultipliedAlpha: false }); if (!gl) return null;
  const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); return o; };
  const p = gl.createProgram();
  gl.attachShader(p, sh(gl.VERTEX_SHADER, 'attribute vec2 a;varying vec2 v;void main(){v=vec2(a.x*.5+.5,.5-a.y*.5);gl_Position=vec4(a,0,1);}'));
  gl.attachShader(p, sh(gl.FRAGMENT_SHADER, `precision highp float;varying vec2 v;uniform sampler2D vid,lut;uniform float N;uniform vec3 dmin,dmax;
    vec3 at(float r,float g,float b){return texture2D(lut,vec2((b*N+r+.5)/(N*N),(g+.5)/N)).rgb;}
    void main(){vec3 c=clamp((texture2D(vid,v).rgb-dmin)/(dmax-dmin),0.,1.)*(N-1.);vec3 f=floor(c),t=c-f,u=min(f+1.,N-1.);
      vec3 x0=mix(mix(at(f.r,f.g,f.b),at(u.r,f.g,f.b),t.r),mix(at(f.r,u.g,f.b),at(u.r,u.g,f.b),t.r),t.g);
      vec3 x1=mix(mix(at(f.r,f.g,u.b),at(u.r,f.g,u.b),t.r),mix(at(f.r,u.g,u.b),at(u.r,u.g,u.b),t.r),t.g);
      gl_FragColor=vec4(mix(x0,x1,t.b),1.);}`));
  gl.linkProgram(p); gl.useProgram(p);
  const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(p, 'a'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const tex = () => { const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER].forEach(k => gl.texParameteri(gl.TEXTURE_2D, k, gl.LINEAR));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); return t; };
  const g = { gl, p, vtex: tex(), ltex: tex() };
  gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, g.ltex); [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER].forEach(k => gl.texParameteri(gl.TEXTURE_2D, k, gl.NEAREST));
  gl.uniform1i(gl.getUniformLocation(p, 'vid'), 0); gl.uniform1i(gl.getUniformLocation(p, 'lut'), 1); return g;
}
function uploadLut(g, c) {
  const { gl } = g, N = c.size, px = new Uint8Array(N * N * N * 4);
  for (let b = 0; b < N; b++) for (let gg = 0; gg < N; gg++) for (let r = 0; r < N; r++) {
    const s = (r + gg * N + b * N * N) * 3, o = (gg * N * N + b * N + r) * 4;
    px[o] = c.data[s] * 255; px[o + 1] = c.data[s + 1] * 255; px[o + 2] = c.data[s + 2] * 255; px[o + 3] = 255; }
  gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, g.ltex); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false); gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, N * N, N, 0, gl.RGBA, gl.UNSIGNED_BYTE, px);
  gl.uniform1f(gl.getUniformLocation(g.p, 'N'), N); gl.uniform3fv(gl.getUniformLocation(g.p, 'dmin'), c.dmin); gl.uniform3fv(gl.getUniformLocation(g.p, 'dmax'), c.dmax);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, g.vtex); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER].forEach(k => gl.texParameteri(gl.TEXTURE_2D, k, gl.LINEAR));
}
const lutCache = {};
async function loadLut(id) { return lutCache[id] || (lutCache[id] = parseCube(await (await fetch('/luts/' + encodeURIComponent(id) + '.cube')).text())); }
let baseImg;
function baseFrame() { return baseImg || (baseImg = new Promise(res => { const v = document.createElement('video'); v.muted = true; v.preload = 'auto'; v.src = S.clip.proxy;
  v.onloadeddata = () => { v.currentTime = Math.min(1.5, (v.duration || 3) / 3); }; v.onseeked = () => {
    const c = document.createElement('canvas'); c.width = 144; c.height = 256; const x = c.getContext('2d'), s = Math.max(144 / v.videoWidth, 256 / v.videoHeight), w = v.videoWidth * s, h = v.videoHeight * s;
    x.drawImage(v, (144 - w) / 2, (256 - h) / 2, w, h); res(x.getImageData(0, 0, 144, 256)); }; })); }
function lutCard(label, num, selected, onclick, paint) {
  const d = document.createElement('div'); d.className = 'card' + (selected ? ' on' : ''); d.innerHTML = `<canvas class="lutc" width="144" height="256"></canvas><span class="num">${num}</span><span class="pk">Picked</span><span class="lbl">${esc(label)}</span>`;
  d.onclick = onclick; $('#lutgrid').appendChild(d); baseFrame().then(img => paint(d.querySelector('canvas').getContext('2d'), img)); return d;
}
async function lutSection(body) {
  body.insertAdjacentHTML('beforeend', `<h3>LUTs (Rec.709 .cube)</h3><div class="grid" id="lutgrid"></div>
    <div class="row"><input type="file" id="lutfile" accept=".cube" hidden><button id="lutpick">Add a LUT (.cube)</button></div><div id="lutnew"></div>
    <p class="help">A LUT grades the footage only. Captions, titles and effects are drawn on top and are never graded. It is used in the final render too.</p>`);
  lutCard('No LUT', 1, !S.lut, () => { S.lut = null; S.lutCube = null; S.done.add(0); toast('LUT: none'); renderStep(); }, (x, img) => x.putImageData(img, 0, 0));
  const luts = await (await fetch('/api/luts')).json();
  luts.forEach((l, i) => lutCard(l.name, i + 2, S.lut?.id === l.id, async () => { S.lutCube = await loadLut(l.id); S.lut = { id: l.id, name: l.name }; S.done.add(0); toast('LUT: ' + l.name); renderStep(); },
    async (x, img) => x.putImageData(lutCPU(img, await loadLut(l.id)), 0, 0)));
  $('#lutpick').onclick = () => $('#lutfile').click();
  $('#lutfile').onchange = async e => { const f = e.target.files[0]; if (!f) return; const box = $('#lutnew'); box.innerHTML = '';
    let text, cube; try { text = await f.text(); cube = parseCube(text); } catch (err) { box.innerHTML = `<p class="err">${esc(err.message)}</p>`; return; }
    const warns = cubeWarnings(cube, f.name), base = f.name.replace(/\.cube$/i, '');
    box.innerHTML = `<div class="sum"><div><b>${esc(f.name)}</b><span>3D, size ${cube.size}${cube.title ? ', "' + esc(cube.title) + '"' : ''}</span></div>${warns.map(w => `<p class="err">${esc(w)}</p>`).join('')}
      <canvas id="lutprev" class="lutc" width="144" height="256" style="height:180px"></canvas>
      <div class="row"><input type="text" id="lutname" value="${esc(base)}"><button class="primary" id="lutsave">Save as preset</button></div>
      <p class="help">Not saved until you press Save. You can still try it first: the preview above uses your clip.</p></div>`;
    baseFrame().then(img => $('#lutprev').getContext('2d').putImageData(lutCPU(img, cube), 0, 0));
    $('#lutsave').onclick = async () => { const n = $('#lutname').value.trim() || base;
      const r = await (await fetch('/api/lut-save', { method: 'POST', body: JSON.stringify({ name: n, text, warnings: warns }) })).json();
      if (r.error) return toast(r.error); toast('Saved LUT preset ' + r.id); renderStep(); }; };
}
