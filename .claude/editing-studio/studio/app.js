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
  else if (kind === 'highlight') noise(.35, 2500, 7000, .25);
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
    this.v = el.querySelector('video'); this.v.crossOrigin = 'anonymous'; this.ov = el.querySelector('.ov');
    if (main) { this.gl = el.insertBefore(Object.assign(document.createElement('canvas'), { className: 'glv' }), this.ov); this.gl.hidden = true; } this.v.src = S.clip.proxy; this.vis = true; this.last = ''; this.lastT = 0;
    if (!main) { new IntersectionObserver(e => { this.vis = e[0].isIntersecting; this.vis ? this.v.play().catch(() => {}) : this.v.pause(); }).observe(el); this.v.loop = false; this.v.play().catch(() => {}); }
    stages.add(this); }
  drawLut(raw, f) {
    const on = !!S.lutCube && !raw && !this.glBroken && this.v.readyState >= 2;
    this.gl.hidden = !on; this.v.style.visibility = on ? 'hidden' : 'visible'; if (!on) return;
    const g = this.glx = this.glx || initGL(this.gl); if (!g) { this.gl.hidden = true; this.v.style.visibility = 'visible'; return; }
    if (g.cube !== S.lutCube) { uploadLut(g, S.lutCube); g.cube = S.lutCube; }
    const w = this.v.videoWidth, h = this.v.videoHeight; if (this.gl.width !== w || this.gl.height !== h) { this.gl.width = w; this.gl.height = h; g.gl.viewport(0, 0, w, h); }
    g.gl.uniform1f(g.amt, S.lutAmount / 100);
    g.gl.activeTexture(g.gl.TEXTURE0); g.gl.bindTexture(g.gl.TEXTURE_2D, g.vtex);
    try { g.gl.texImage2D(g.gl.TEXTURE_2D, 0, g.gl.RGBA, g.gl.RGBA, g.gl.UNSIGNED_BYTE, this.v); }
    catch (e) { this.glBroken = true; this.gl.hidden = true; this.v.style.visibility = 'visible'; toast('LUT preview could not read the video: ' + e.message); return; }
    g.gl.drawArrays(g.gl.TRIANGLE_STRIP, 0, 4);
    this.gl.style.filter = f.filter; this.gl.style.transform = this.v.style.transform; }
  destroy() { stages.delete(this); this.v.removeAttribute('src'); this.v.load(); }
  tick() {
    if (!this.vis) return; const v = this.v; let t = v.currentTime; const [a, b] = this.win || [0, S.dur || v.duration || 1];
    if (!this.main || this.win) { if (t >= b - .02 || t < a - .3) { v.currentTime = a; t = a; if (v.paused && !this.main) v.play().catch(() => {}); } }
    if (this.main && !this.win && v.ended) { v.currentTime = 0; }
    if (this.main && S.mode !== 'raw' && !v.paused) { const c = (S.cuts || []).find(c => t >= c.a && t < c.b - .02); if (c) { v.currentTime = Math.min(c.b + .001, S.dur); t = c.b; } }
    const cfg = this.cfg(), raw = this.main && S.mode === 'raw', f = compose(t, cfg, raw);
    v.style.filter = f.filter; v.style.transform = `scale(${f.scale})`; this.el.style.setProperty('--hf', f.font); this.el.style.setProperty('--tf', f.tfont);
    if (this.main) this.drawLut(raw, f);
    if (f.html !== this.last) { this.ov.innerHTML = f.html; this.last = f.html; }
    if (this.main) fxMark(t, raw);
    if (this.main && S.sound && !v.paused) this.sounds(t);
    this.lastT = t; if (this.main) updateScrub(t);
  }
  sounds(t) { const lo = this.lastT; if (t < lo) return;
    soundEvents(this.cfg(), S.snd).forEach(e => { if (lo < e.t && e.t <= t) snd(e.snd); }); }
}
(function loop() {
  stages.forEach(s => { try { s.tick(); } catch (e) { if (!s.failed) { s.failed = true; console.error('Preview error:', e); } } });
  requestAnimationFrame(loop); })();

/* ---------- ui ---------- */
{ let step = S.step; Object.defineProperty(S, 'step', { get: () => step, set: v => { step = v; S.panel = null; }, enumerable: true, configurable: true }); }
let main, cards = [];
function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.add('show'); clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.remove('show'), 1800); }
function baseCfg() { return { grade: S.grade, font: S.font, caption: S.caption, capOpts: S.capEdit, hook: S.hook, hookEdit: S.hookEdit, fx: S.fx, whole: S.whole, els: S.els, safe: S.safe, safeLock: S.safeLock }; }
function updateScrub(t) { if (!updateScrub.drag) $('#scrub').value = 1000 * t / (S.dur || 1); tlPlayhead(t); txNow(t); }

async function refresh(keep) {
  S.clips = await (await fetch('/api/clips')).json();
  const sel = $('#clipsel'); sel.innerHTML = S.clips.map(c => `<option>${esc(c.name)}</option>`).join(''); sel.hidden = S.clips.length < 2;
  renderTakes();
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
  S.clip = c; S.words = c.words.map(w => ({ ...w })); S.cuts = (c.cuts || []).map(x => ({ ...x })); S.sugg = []; refreshLive(); S.wordsSaved = JSON.stringify(c.words); TL.peaks = null; TL.fitFor = null;
  const probe = document.createElement('video'); probe.preload = 'metadata'; probe.src = c.proxy;
  probe.onloadedmetadata = () => { S.dur = probe.duration; S.beats = makeBeats(S.words, S.dur); S.fx = {}; S.beats.forEach((_, i) => S.fx[i] = []);
    S.caption = null; S.capEdit = {}; S.lut = null; S.lutCube = null; S.lutAmount = 100; S.voice = { preset: 'off', amount: 100, nr: null }; baseImg = null; S.hook = null; S.whole = new Set(); S.snd = new Set(); S.done = new Set(); S.step = 0; S.beat = 0; vfxLoad(c); show('studio'); build(); renderStep(); };
}
function build() {
  if (main) main.destroy(); $('#main').innerHTML = '';
  main = new Stage($('#main'), { main: true, cfg: baseCfg }); main.win = null;
  $('#tabs').innerHTML = RAIL.map(r => `<button data-k="${r[0]}"><i>${r[2]}</i>${r[1]}</button>`).join('');
  $('#main').insertAdjacentHTML('beforeend', '<div class="fxzone" id="fxzone" hidden></div><div class="fxchip" id="fxchip" hidden></div><div class="fxcount" id="fxcount" hidden></div>');
}
function mark() { document.querySelectorAll('#tabs button').forEach(b => { const k = b.dataset.k, i = STEPS.findIndex(x => x[0] === k); b.classList.toggle('on', S.panel ? k === S.panel : i === S.step); b.classList.toggle('done', i >= 0 && S.done.has(i)); }); }

function card(i, label, onc, cfgFn, win, selected, into) {
  const d = document.createElement('div'); d.className = 'card' + (selected ? ' on' : '');
  d.innerHTML = `<span class="num">${i + 1}</span><span class="pk">Picked</span><span class="lbl">${esc(label)}</span>`;
  d.onclick = onc; (into || $('#body .grid')).appendChild(d); cards.push(new Stage(d, { cfg: cfgFn, win })); return d;
}
function renderStep() {
  cards.forEach(c => c.destroy()); cards = []; mark(); renderLooks(); renderInsp();
  if (S.panel) { renderPanel(); tlRender(); return; }
  $('.panel .nav').hidden = false; $('#ptitle').textContent = STEPS[S.step][1]; $('#pcount').textContent = `Step ${S.step + 1} of ${STEPS.length}`;
  const [id, , help] = STEPS[S.step]; $('#help').textContent = help; const body = $('#body'); body.innerHTML = '';
  $('#back').disabled = S.step === 0; $('#next').textContent = S.step === STEPS.length - 1 ? 'Render video' : 'Next';
  const w0 = [0, Math.min(3, S.dur)]; main.win = null;
  const grid = () => body.insertAdjacentHTML('beforeend', '<div class="grid"></div>');
  if (id === 'colours') { grid(); GRADES.forEach((g, i) => card(i, g[1], () => { S.grade = g[0]; S.done.add(0); toast('Grade: ' + g[1]); renderStep(); }, () => ({ ...baseCfg(), grade: g[0] }), w0, S.grade === g[0])); lutSection(body); }
  if (id === 'fonts') { fontUploads(body); grid(); FONTS.filter(f => !f[4]).forEach((f, i) => card(i, f[1], () => { S.font = f[0]; S.done.add(1); S.capEdit.font = '@pair'; toast('Font: ' + f[1]); renderStep(); }, () => ({ ...baseCfg(), font: f[0], caption: S.caption || 'groups', capOpts: { ...S.capEdit, font: '@pair' } }), w0, S.font === f[0])); }
  if (id === 'captions') { txEditor(body); grid(); CAPS.forEach((c, i) => card(i, c[1], () => { S.caption = c[0]; S.capEdit = {}; S.done.add(2); toast(`Synced captions to ${S.words.length} words`); renderStep(); }, () => ({ ...baseCfg(), caption: c[0], capOpts: {} }), w0, S.caption === c[0])); capEditor(body); }
  if (id === 'beats') renderBeats(body);
  if (id === 'sound') { voiceSection(body); body.insertAdjacentHTML('beforeend', '<h3>Sound effects and music</h3><div class="sounds"></div>'); SOUNDS.forEach(s => { const b = document.createElement('button'); b.textContent = s[1]; b.className = S.snd.has(s[0]) ? 'on' : '';
    b.onclick = () => { S.snd.has(s[0]) ? S.snd.delete(s[0]) : S.snd.add(s[0]); S.done.add(4); S.sound = true; $('#snd').textContent = '🔊'; snd(s[0]); renderStep(); }; $('.sounds').appendChild(b); }); }
  if (id === 'watch') renderWatch(body);
  tlRender();
}
function renderBeats(body) {
  const total = S.dur || 1;
  body.insertAdjacentHTML('beforeend', `<div class="timeline">${S.beats.map((b, i) => `<div class="seg-b${i === S.beat ? ' on' : ''}" data-i="${i}" style="flex:${(b.t1 - b.t0) / total}"><b>${i === 0 ? 'Hook' : 'Beat ' + (i + 1)}</b><small>${esc(b.text || '(no transcript)')}</small><small>${b.scene && b.scene !== 'aroll' ? SCENES.find(s => s[0] === b.scene)[1] : i === 0 ? (S.hook ? HOOKS.find(h => h[0] === S.hook)[1] : '') : (S.fx[i].length ? S.fx[i].map(x => FX.find(f => f[0] === x)[1]).join(', ') : '')}</small></div>`).join('')}</div>
    <div class="row"><button id="copyplan">Copy plan</button><span class="help">Exports every beat's script, chosen scene, effects and notes, ready to paste into Claude.</span></div>`);
  $('#copyplan').onclick = copyPlan;
  body.querySelectorAll('.seg-b').forEach(e => e.onclick = () => { S.beat = +e.dataset.i; renderStep(); });
  const b = S.beats[S.beat], win = [b.t0, Math.min(b.t1, b.t0 + 4)]; main.win = [b.t0, b.t1]; main.v.currentTime = b.t0; main.v.play().catch(() => {}); $('#play').textContent = '❚❚';
  sceneSection(body, b, win);
  if (S.beat > 0 && S.fx[S.beat].includes('page')) {
    body.insertAdjacentHTML('beforeend', `<h3>Page for this beat</h3><div class="row"><input type="text" id="shoturl" placeholder="https://the-page-you-mention.com" value="${esc(b.shotUrl || '')}"><button id="shotbtn">${b.shot ? 'Recapture' : 'Capture'}</button></div><div class="help" id="shotmsg">${b.shot ? 'Using a real screenshot: ' + esc(b.shot) : 'Until you capture one, the card shows a stand-in page.'}</div>`);
    $('#shotbtn').onclick = async () => { const u = $('#shoturl').value.trim(); if (!u) return; $('#shotmsg').textContent = 'Taking a screenshot...';
      const d = await (await fetch('/api/shot', { method: 'POST', body: JSON.stringify({ url: u }) })).json();
      if (d.error) { $('#shotmsg').textContent = d.error; return; }
      if (d.pending) { for (let i = 0; i < 60; i++) { if ((await fetch('/shots/' + encodeURIComponent(d.file), { method: 'HEAD' })).ok) break; $('#shotmsg').textContent = 'Taking the screenshot in the background... ' + (i * 4) + 's'; await new Promise(r => setTimeout(r, 4000)); } }
      b.shot = d.file; b.shotUrl = u; toast('Screenshot saved'); renderStep(); }; }
  body.insertAdjacentHTML('beforeend', `<h3>${S.beat === 0 ? 'Hook title' : 'Beat ' + (S.beat + 1) + ' effects'}</h3><div class="grid"></div>`);
  if (S.beat === 0 && S.hook) setTimeout(() => hookEditor(body));
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
function styleObj(name) { return { name, clip: S.clip.name, grade: S.grade, font: S.font, caption: S.caption, hook: S.hook, lut: S.lut ? S.lut.id : null, lutAmount: S.lut ? S.lutAmount : null, voice: { ...S.voice }, capOpts: S.capEdit, cuts: S.cuts.map(c => [+c.a.toFixed(3), +c.b.toFixed(3)]), dur: +S.dur.toFixed(2),
  beats: S.beats.map((b, i) => ({ start: +b.t0.toFixed(2), end: +b.t1.toFixed(2), text: b.text, effects: S.fx[i], shot: b.shot || null, shotUrl: b.shotUrl || null, scene: b.scene || 'aroll', sceneOpts: b.sceneOpts || {}, image: b.image || null, note: b.note || '' })), whole: [...S.whole], sounds: [...S.snd], vfx: vfxOut(), fonts: usedFonts(), fontPair: S.font === 'custom' ? S.fontPair : null, hookEdit: S.hookEdit, safe: S.safe, safeLock: S.safeLock, els: (S.els || []).map(({ id, ...e }) => e), wordAnims: S.wordAnims || [], anims: usedAnims() }; }
const renderName = () => S.clip.name.replace(/\.[^.]+$/, '').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '') || 'render';
const dlUrl = u => CFG.blob ? u + (u.includes('?') ? '&' : '?') + 'download=1' : u;   // Blob serves ?download=1 as a file download
async function showRenders(name) {
  const d = await (await fetch('/api/renders?name=' + encodeURIComponent(name))).json(), el = $('#rlist');
  const files = (d.files || []).slice().sort((x, y) => x.file.localeCompare(y.file, undefined, { numeric: true }));
  if (el) el.innerHTML = files.reverse().map((f, k) => `<div class="rfile${k === 0 ? ' newest' : ''}"><span>${esc(f.file)} <small>${(f.size / 1e6).toFixed(1)} MB</small></span>
    <a class="btnlink primary" href="${dlUrl(f.url)}" download="${esc(f.file)}">Download</a><a class="btnlink" href="${f.url}" target="_blank" rel="noopener">Open</a></div>`).join('');
  return { job: d.job, files };
}
// Render the current picks. No saved style needed. Loud on purpose: button, banner and toasts all say what is happening.
let RENDERING = false;
function banner(html, kind) { const b = $('#rbanner'); if (!b) return; b.hidden = !html; b.className = kind || ''; b.innerHTML = html || ''; }
async function startRender() {
  if (RENDERING) return toast('A render is already running');
  if (S.step !== STEPS.length - 1) { S.step = STEPS.length - 1; renderStep(); }
  const name = renderName(), t0 = Math.floor(Date.now() / 1000);
  RENDERING = true; const setBtns = txt => { [$('#rbtn'), $('#next')].forEach(b => { if (b) { b.disabled = !!txt; if (txt) b.textContent = txt; else b.textContent = b.id === 'next' ? 'Render video' : 'Render video'; } }); };
  setBtns('Rendering...'); banner('<span class="spin"></span> Starting the render...', 'busy'); toast('Render started');
  let before = 0;
  try { before = (await showRenders(name)).files.length;
    const r = await (await fetch('/api/render', { method: 'POST', body: JSON.stringify({ style: styleObj(name) }) })).json();
    if (r.error) throw new Error(r.error);
  } catch (e) { RENDERING = false; setBtns(''); banner(`Render could not start: ${esc(e.message || e)}`, 'err'); toast('Render could not start'); return; }
  S.done.add(5); mark();
  for (let i = 0; i < 720; i++) {
    await new Promise(res => setTimeout(res, 4000));
    const secs = Math.floor(Date.now() / 1000) - t0;
    try {
      const { job, files } = await showRenders(name), fresh = job && job.at >= t0 - 5;
      if (files.length > before) {   // a new file is the surest sign it worked
        const f = files[files.length - 1];
        banner(`Render ready: <b>${esc(f.file)}</b> <a class="btnlink primary" href="${dlUrl(f.url)}" download="${esc(f.file)}">Download</a> <a class="btnlink" href="${f.url}" target="_blank" rel="noopener">Open</a> <button class="x" onclick="banner('')">×</button>`, 'ok');
        toast('Render ready'); break; }
      if (fresh && job.status === 'error') { banner(`Render failed: ${esc(job.message)}`, 'err'); break; }
      banner(`<span class="spin"></span> Rendering${fresh && job.status === 'queued' ? ' (waiting for a free worker)' : ''}... ${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')} · usually 1 to 3 minutes. You can keep editing.`, 'busy');
    } catch (e) { banner(`<span class="spin"></span> Rendering... (lost contact for a moment, still checking)`, 'busy'); }
  }
  RENDERING = false; setBtns('');
}
function renderWatch(body) {
  const row = (k, v) => `<div><b>${k}</b><span>${esc(v || 'not picked')}</span></div>`;
  body.innerHTML = `<div class="sum">${row('Colour', G(S.grade)[1])}${row('LUT', S.lut ? S.lut.name + ' (' + S.lutAmount + '%)' : 'none')}${row('Font', F(S.font)[1])}${row('Captions', (CAPS.find(c => c[0] === S.caption) || [])[1])}${row('Hook', (HOOKS.find(h => h[0] === S.hook) || [])[1])}` +
    S.beats.slice(1).map((b, i) => row('Beat ' + (i + 2), S.fx[i + 1].map(x => FX.find(f => f[0] === x)[1]).join(', ') || 'Just you')).join('') +
    `${row('Effects', S.vfx.map(e => e.fx).join(', '))}${row('Whole clip', [...S.whole].join(', '))}${row('Sound', [...S.snd].join(', '))}</div>
    ${row('Elements', (S.els || []).map(e => e.file.replace(/^el-/, '')).join(', '))}${row('Word animations', (S.wordAnims || []).map(r => r.anim).join(', '))}
    <h3>Render</h3><div class="row"><button class="primary" id="rbtn">Render video</button></div>
    <div id="rstat" class="help">Renders exactly what you see, 1080x1920 at 30 fps. You don't need to save a style first. Progress shows in the bar at the top.</div><div id="rlist"></div>
    <h3>Save these picks as a style (optional)</h3><div class="row"><input type="text" id="sname" placeholder="Style name, e.g. split-card-reels"><button id="ssave">Save style</button></div>
    <p class="help">Saved styles appear in the Style menu at the top, ready to apply to any clip.</p>`;
  showRenders(renderName()).catch(() => {});
  $('#rbtn').onclick = startRender; if (RENDERING) { $('#rbtn').disabled = true; $('#rbtn').textContent = 'Rendering...'; }
  $('#ssave').onclick = async () => { const n = $('#sname').value.trim(); if (!n) return toast('Name your style first');
    const r = await (await fetch('/save', { method: 'POST', body: JSON.stringify(styleObj(n)) })).json(); toast('Saved ' + r.saved); loadStyles(); };
}

/* ---------- saved styles: pick one from the top bar to apply it to this clip ---------- */
let STYLES_CACHE = [];
async function loadStyles() {
  try { STYLES_CACHE = await (await fetch('/api/styles')).json(); } catch { STYLES_CACHE = []; }
  const sel = $('#stylesel'); if (!sel) return;
  sel.innerHTML = `<option value="">${STYLES_CACHE.length ? 'Apply a saved style...' : 'No saved styles yet'}</option>` + STYLES_CACHE.map((s, i) => `<option value="${i}">${esc(s.name)}</option>`).join('');
}
async function applyStyle(st) {
  S.grade = st.grade || 'raw'; S.font = st.font || 'inter'; S.caption = st.caption || null; S.capEdit = { ...(st.capOpts || {}) }; S.hook = st.hook || null;
  S.whole = new Set(st.whole || []); S.snd = new Set(st.sounds || []);
  S.beats.forEach((b, i) => { const sb = (st.beats || [])[i] || {}; S.fx[i] = (sb.effects || []).filter(id => FX.some(f => f[0] === id)); if (sb.scene && !NEEDS_IMAGE.has(sb.scene)) { b.scene = sb.scene; b.sceneOpts = { ...(sb.sceneOpts || {}) }; } });
  S.voice = { preset: 'off', amount: 100, nr: null, ...(st.voice || {}) }; applyVoice();
  S.lut = null; S.lutCube = null; S.lutAmount = 100;
  if (st.lut) { try { S.lutCube = await loadLut(st.lut); S.lut = { id: st.lut, name: st.lut }; S.lutAmount = st.lutAmount ?? 100;
      const l = (await (await fetch('/api/luts')).json()).find(x => x.id === st.lut); if (l) S.lut.name = l.name; } catch { toast(`LUT "${st.lut}" from this style is missing`); } }
  S.hookEdit = { ...(st.hookEdit || {}) }; if (st.fontPair) setFontPair(st.fontPair.cap, st.fontPair.title, true); if (st.safe) { S.safe = st.safe; S.safeLock = !!st.safeLock; renderSafe(); }
  if (Array.isArray(st.els)) S.els = st.els.map(e => ({ ...e, id: vfxId() })); if (Array.isArray(st.wordAnims)) S.wordAnims = st.wordAnims.map(r => ({ ...r }));
  (st.anims || []).forEach(a => { if (!animById(a.id)) S.anims.push(a); });
  if (Array.isArray(st.vfx)) { S.vfx = st.vfx.filter(e => VFXN(e.fx)).map(e => ({ id: vfxId(), fx: e.fx, start: +e.start, end: +e.end, opts: { ...(e.opts || {}) } })); S.sel = null; vfxSave(); }
  [0, 1, 2, 3, 4].forEach(i => S.done.add(i)); renderStep(); toast('Applied style: ' + st.name);
}

/* ---------- wiring ---------- */
async function upload(file) {
  setMsg(`Uploading ${file.name}...`); show('empty');
  let d; try { d = await sendFile('clip', file, '/api/upload?name='); } catch (e) { return setMsg('Upload failed: ' + (e.message || e), true); }
  if (d.error) return setMsg(d.error, true); S.clip = null; refresh(d.name);
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
$('#tabs').onclick = e => { const b = e.target.closest('button'); if (!b) return; const i = STEPS.findIndex(x => x[0] === b.dataset.k);
  if (i >= 0) S.step = i; else S.panel = b.dataset.k; renderStep(); if (innerWidth < 900) $('.panel').scrollIntoView({ behavior: 'smooth' }); };
$('#next').onclick = () => { if (S.step < STEPS.length - 1) { S.step++; renderStep(); } else startRender(); };
$('#back').onclick = () => { if (S.step > 0) { S.step--; renderStep(); } };
$('#play').onclick = () => { const v = main.v; v.paused ? v.play() : v.pause(); $('#play').textContent = v.paused ? '▶' : '❚❚'; };
$('#scrub').oninput = e => { updateScrub.drag = true; main.v.currentTime = e.target.value / 1000 * S.dur; };
$('#scrub').onchange = () => updateScrub.drag = false;
$('#snd').onclick = () => { S.sound = !S.sound; if (S.sound) applyVoice(); $('#snd').textContent = S.sound ? '🔊' : '🔇'; main.v.muted = !S.sound; };
document.querySelectorAll('.seg button').forEach(b => b.onclick = () => { S.mode = b.dataset.m; applyVoice(); document.querySelectorAll('.seg button').forEach(x => x.classList.toggle('on', x === b)); });
$('#exportbtn').onclick = () => { S.step = 5; renderStep(); };
document.addEventListener('keydown', e => { if (e.key === 'r' && !/INPUT/.test(e.target.tagName)) location.reload(); });
fetch('/api/config').then(r => r.json()).then(c => { CFG = c; }).catch(() => {}).finally(() => { refresh(); loadStyles(); });
$('#stylesel').onchange = e => { const st = STYLES_CACHE[+e.target.value]; e.target.value = ''; if (st && S.clip) applyStyle(st); else if (st) toast('Add a clip first'); };

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
  const tab = i => document.querySelector(`#tabs button[data-k="${STEPS[i][0]}"]`), next = () => $('#next');
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
const HLS = [['none', 'None'], ['current', 'Current word'], ['spoken', 'Spoken words'], ['key', 'Key word (serif)'], ['keycolor', 'Key word (colour)'], ['box', 'Boxed words'], ['boxactive', 'Box on current word'], ['dim', 'Dim to bright'], ['weight', 'Light to bold']];
const ANIMS = [['none', 'None'], ['pop', 'Pop'], ['wordpop', 'Word pop (each word)'], ['bounce', 'Bounce'], ['flash', 'Flash scale-up'], ['slide', 'Slide up'], ['fade', 'Fade'], ['type', 'Typewriter']];
function capEditor(body) {
  if (!S.caption) { body.insertAdjacentHTML('beforeend', '<p class="help">Pick a caption style above, then edit it here.</p>'); return; }
  const o = capOpts(S.caption, S.capEdit), acc = G(S.grade)[3]; o.case = o.upper ? 'upper' : o.lower ? 'lower' : 'as'; o.width = o.width || (o.align === 'left' ? 84 : 88);
  const set = (k, v) => { S.capEdit[k] = v; S.done.add(2); mark(); tlRender(); };
  const sel = (k, opts, label) => `<label>${label}<select data-k="${k}">${opts.map(x => `<option value="${x[0]}"${String(o[k]) === String(x[0]) ? ' selected' : ''}>${x[1]}</option>`).join('')}</select></label>`;
  const rng = (k, min, max, step, label, unit = '') => `<label>${label} <b id="v-${k}">${o[k]}${unit}</b><input type="range" data-k="${k}" min="${min}" max="${max}" step="${step}" value="${o[k]}"></label>`;
  body.insertAdjacentHTML('beforeend', `<h3>Edit captions</h3><div class="capedit">
    ${sel('font', [['@pair', 'Font from the Fonts step'], ...CAP_FONTS.map(f => [f, f])], 'Font')}
    ${sel('weight', [300, 400, 500, 600, 700, 800, 900].map(w => [w, w]), 'Weight')}
    ${rng('size', 3, 18, .1, 'Size')}
    ${S.safeLock ? rng('y', 0, 100, 1, 'Height in the safe zone', '%') : rng('y', 12, 76, 1, 'Position from top', '%')}
    ${rng('x', -40, 40, 1, 'Left / right', '%')}
    ${rng('width', 30, 100, 1, 'Text width', '%')}
    ${sel('align', [['center', 'Centre'], ['left', 'Left']], 'Alignment')}
    ${rng('group', 1, 8, 1, 'Words at a time')}
    ${sel('hl', HLS, 'Highlight')}
    ${sel('anim', ANIMS, 'Animation')}
    ${rng('offset', -.4, .4, .02, 'Timing shift (s)')}
    ${rng('linger', 0, 1.5, .05, 'Hold after word (s)')}
    ${rng('stroke', 0, 1.2, .05, 'Outline width')}
    <label>Outline colour<input type="color" data-k="strokeColor" value="${o.strokeColor}"></label>
    ${sel('shadow', [['auto', 'Auto'], ['soft', 'Soft'], ['hard', 'Hard drop'], ['glow', 'Glow (highlight colour)'], ['none', 'None']], 'Shadow')}
    ${rng('ls', -.05, .3, .01, 'Letter spacing', 'em')}
    ${rng('lh', .8, 1.6, .05, 'Line height')}
    ${rng('speed', .3, 3, .1, 'Animation speed', '×')}
    ${sel('case', [['as', 'As spoken'], ['upper', 'UPPERCASE'], ['lower', 'lowercase']], 'Case')}
    <label>Text colour<input type="color" data-k="color" value="${o.color}"></label>
    <label>Highlight colour<input type="color" data-k="accent" value="${o.accent || acc}"></label>
    <label class="chk"><input type="checkbox" data-k="box" ${o.box ? 'checked' : ''}> Background box</label>
    <label>Box colour<input type="color" data-k="boxColor" value="${o.boxColor}"></label>
    ${rng('boxAlpha', .1, 1, .01, 'Box opacity')}
    ${rng('radius', 0, 5, .1, 'Box corners')}
  </div>
  <p class="help">Drag the captions on the video to move them. ${S.safeLock ? 'They stay inside the safe zone.' : "Height is kept in Instagram's band (12% to 76% from the top); turn on Keep inside under the video to fit everything to a safe zone."} Changes show live.</p>
  <div class="row"><button id="capreset">Reset to style defaults</button></div>
  <h3>Caption presets</h3><div id="presets" class="presets"></div>
  <div class="row"><input type="text" id="pname" placeholder="Preset name"><button class="primary" id="psave">Save current as preset</button></div>`);
  body.querySelectorAll('.capedit [data-k]').forEach(el => el.oninput = () => {
    const k = el.dataset.k, v = el.type === 'checkbox' ? el.checked : el.type === 'range' ? +el.value : el.value;
    if (k === 'case') { set('upper', v === 'upper'); set('lower', v === 'lower'); }
    else set(k, ['weight'].includes(k) ? +v : v);
    const lab = $('#v-' + k); if (lab) lab.textContent = v + ({ y: '%', x: '%', width: '%', ls: 'em', speed: '×' }[k] || ''); });
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
      <div class="row">${r.src ? '<button class="primary" data-a="grab">Grab an animation</button>' : ''}${r.grade_ok ? '<button data-a="grade">Use this grade</button>' : ''}${c ? '<button class="primary" data-a="use">Use this caption look</button><button data-a="save">Save as caption preset</button>' : ''}</div>`;
    d.querySelector('[data-a=grab]')?.addEventListener('click', () => openGrab(r, d));
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
    else if (/^[-+\d.]/.test(l)) { const p = l.split(/\s+/); if (p.length >= 3) vals.push(+p[0], +p[1], +p[2]); } }
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
  gl.attachShader(p, sh(gl.FRAGMENT_SHADER, `precision highp float;varying vec2 v;uniform sampler2D vid,lut;uniform float N,amt;uniform vec3 dmin,dmax;
    vec3 at(float r,float g,float b){return texture2D(lut,vec2((b*N+r+.5)/(N*N),(g+.5)/N)).rgb;}
    void main(){vec3 c=clamp((texture2D(vid,v).rgb-dmin)/(dmax-dmin),0.,1.)*(N-1.);vec3 f=floor(c),t=c-f,u=min(f+1.,N-1.);
      vec3 x0=mix(mix(at(f.r,f.g,f.b),at(u.r,f.g,f.b),t.r),mix(at(f.r,u.g,f.b),at(u.r,u.g,f.b),t.r),t.g);
      vec3 x1=mix(mix(at(f.r,f.g,u.b),at(u.r,f.g,u.b),t.r),mix(at(f.r,u.g,u.b),at(u.r,u.g,u.b),t.r),t.g);
      vec3 src=texture2D(vid,v).rgb;gl_FragColor=vec4(mix(src,mix(x0,x1,t.b),amt),1.);}`));
  gl.linkProgram(p); gl.useProgram(p);
  const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(p, 'a'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const tex = () => { const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER].forEach(k => gl.texParameteri(gl.TEXTURE_2D, k, gl.LINEAR));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); return t; };
  const g = { gl, p, vtex: tex(), ltex: tex(), amt: gl.getUniformLocation(p, 'amt') };
  gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, g.ltex); [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER].forEach(k => gl.texParameteri(gl.TEXTURE_2D, k, gl.NEAREST));
  gl.uniform1i(gl.getUniformLocation(p, 'vid'), 0); gl.uniform1i(gl.getUniformLocation(p, 'lut'), 1); return g;
}
function resampleCube(c, M) {   // preview only: shrink a big LUT (e.g. 65 points) so its texture fits the GPU
  const N = c.size, out = new Float32Array(M ** 3 * 3), at = (r, g, b) => (r + g * N + b * N * N) * 3;
  for (let b = 0; b < M; b++) for (let g = 0; g < M; g++) for (let r = 0; r < M; r++) {
    const x = r / (M - 1) * (N - 1), y = g / (M - 1) * (N - 1), z = b / (M - 1) * (N - 1), x0 = Math.floor(x), y0 = Math.floor(y), z0 = Math.floor(z);
    const x1 = Math.min(x0 + 1, N - 1), y1 = Math.min(y0 + 1, N - 1), z1 = Math.min(z0 + 1, N - 1), fx = x - x0, fy = y - y0, fz = z - z0, o = (r + g * M + b * M * M) * 3;
    for (let k = 0; k < 3; k++) {
      const v = (X, Y, Z) => c.data[at(X, Y, Z) + k];
      const c00 = v(x0, y0, z0) * (1 - fx) + v(x1, y0, z0) * fx, c10 = v(x0, y1, z0) * (1 - fx) + v(x1, y1, z0) * fx, c01 = v(x0, y0, z1) * (1 - fx) + v(x1, y0, z1) * fx, c11 = v(x0, y1, z1) * (1 - fx) + v(x1, y1, z1) * fx;
      out[o + k] = (c00 * (1 - fy) + c10 * fy) * (1 - fz) + (c01 * (1 - fy) + c11 * fy) * fz; } }
  return { ...c, size: M, data: out };
}
function uploadLut(g, c) {
  if (c.size * c.size > g.gl.getParameter(g.gl.MAX_TEXTURE_SIZE)) c = resampleCube(c, 33);
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
function baseFrame() { return baseImg || (baseImg = new Promise(res => { const v = document.createElement('video'); v.crossOrigin = 'anonymous'; v.muted = true; v.preload = 'auto'; v.src = S.clip.proxy;
  v.onloadeddata = () => { v.currentTime = Math.min(1.5, (v.duration || 3) / 3); }; v.onseeked = () => {
    const c = document.createElement('canvas'); c.width = 144; c.height = 256; const x = c.getContext('2d'), s = Math.max(144 / v.videoWidth, 256 / v.videoHeight), w = v.videoWidth * s, h = v.videoHeight * s;
    x.drawImage(v, (144 - w) / 2, (256 - h) / 2, w, h); res(x.getImageData(0, 0, 144, 256)); }; })); }
function lutCard(label, num, selected, onclick, paint) {
  const d = document.createElement('div'); d.className = 'card' + (selected ? ' on' : ''); d.innerHTML = `<canvas class="lutc" width="144" height="256"></canvas><span class="num">${num}</span><span class="pk">Picked</span><span class="lbl">${esc(label)}</span>`;
  d.onclick = onclick; $('#lutgrid').appendChild(d); baseFrame().then(img => paint(d.querySelector('canvas').getContext('2d'), img)); return d;
}
async function lutSection(body) {
  body.insertAdjacentHTML('beforeend', `<h3>LUTs (Rec.709 .cube)</h3><div class="grid" id="lutgrid"></div>
    ${S.lut ? `<label class="amt">LUT amount <b id="lutamt">${S.lutAmount}%</b><input type="range" id="lutamount" min="0" max="100" step="1" value="${S.lutAmount}"></label>` : ''}
    <div class="row"><input type="file" id="lutfile" accept=".cube" hidden><button id="lutpick">Add a LUT (.cube)</button></div><div id="lutnew"></div>
    <p class="help">A LUT grades the footage only. Captions, titles and effects are drawn on top and are never graded. It is used in the final render too.</p>`);
  lutCard('No LUT', 1, !S.lut, () => { S.lut = null; S.lutCube = null; S.done.add(0); toast('LUT: none'); renderStep(); }, (x, img) => x.putImageData(img, 0, 0));
  const luts = await (await fetch('/api/luts')).json();
  luts.forEach((l, i) => lutCard(l.name, i + 2, S.lut?.id === l.id, async () => { S.lutCube = await loadLut(l.id); S.lut = { id: l.id, name: l.name }; S.done.add(0); toast('LUT: ' + l.name); renderStep(); },
    async (x, img) => x.putImageData(lutCPU(img, await loadLut(l.id)), 0, 0)));
  const amt = $('#lutamount'); if (amt) { amt.oninput = () => { S.lutAmount = +amt.value; $('#lutamt').textContent = amt.value + '%'; }; amt.ondblclick = () => { amt.value = 100; amt.oninput(); }; }
  $('#lutpick').onclick = () => $('#lutfile').click();
  $('#lutfile').onchange = async e => { const f = e.target.files[0]; if (!f) return; const box = $('#lutnew'); box.innerHTML = '';
    let text, cube; try { text = await f.text(); cube = parseCube(text); } catch (err) { box.innerHTML = `<p class="err">${esc(err.message)}</p>`; return; }
    const warns = cubeWarnings(cube, f.name), base = f.name.replace(/\.cube$/i, '');
    box.innerHTML = `<div class="sum"><div><b>${esc(f.name)}</b><span>3D, size ${cube.size}${cube.title ? ', "' + esc(cube.title) + '"' : ''}</span></div>${warns.map(w => `<p class="err">${esc(w)}</p>`).join('')}
      <canvas id="lutprev" class="lutc" width="144" height="256" style="height:180px"></canvas>
      <div class="row"><input type="text" id="lutname" value="${esc(base)}"><button class="primary" id="lutsave">Save as preset</button></div>
      <p class="help">Not saved until you press Save. You can still try it first: the preview above uses your clip.</p></div>`;
    baseFrame().then(img => $('#lutprev').getContext('2d').putImageData(lutCPU(img, cube), 0, 0));
    $('#lutsave').onclick = async () => { try { const n = $('#lutname').value.trim() || base;
      let r;
      if (CFG.blob) {   // .cube files can be several MB: straight to Blob, then register
        const id = n.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '') || 'lut', { upload } = await import('https://esm.sh/@vercel/blob@0.27.3/client');
        await upload(`luts/${id}.cube`, new Blob([text], { type: 'text/plain' }), { access: 'public', handleUploadUrl: '/api/blob-token', contentType: 'text/plain' });
        r = await (await fetch('/api/lut-register', { method: 'POST', body: JSON.stringify({ name: n, warnings: warns }) })).json();
      } else r = await (await fetch('/api/lut-save', { method: 'POST', body: JSON.stringify({ name: n, text, warnings: warns }) })).json();
      if (r.error) return toast('LUT not saved: ' + r.error); toast('Saved LUT preset ' + r.id); renderStep();
    } catch (e) { toast('LUT not saved: ' + (e.message || e)); console.error(e); } }; };
}


/* ---------- transcript editor (top of the Captions step) ---------- */
let txSel = -1, txStop;
function wordsChanged() {
  S.words.sort((x, y) => x.start - y.start); refreshLive();
  S.beats.forEach(b => { b.text = S.words.filter(w => w.start >= b.t0 && w.start < b.t1).map(w => w.word).join(' '); });
  const st = $('#txstate'); if (st) st.textContent = JSON.stringify(S.words) === S.wordsSaved ? 'Saved' : 'Unsaved changes';
  tlRender();
}
function txEditor(body) {
  body.insertAdjacentHTML('beforeend', `<h3>Transcript</h3>
    <p class="help">Click a word to hear it. Type to fix spelling, names or punctuation. Captions update live. Save to keep it (the render uses the saved words).</p>
    <div class="tx" id="tx"></div>
    <div class="row txsel" id="txsel" hidden><span id="txinfo"></span>
      <label>Start <input type="number" id="txs" step="0.01" min="0"></label><label>End <input type="number" id="txe" step="0.01" min="0"></label>
      <button id="txdel">Delete word from captions</button><button id="txcut">Cut word from video</button></div>
    <div class="row"><input type="text" id="txfind" placeholder="Find (e.g. clawd)"><input type="text" id="txrep" placeholder="Replace with (e.g. Claude)"><button id="txrepbtn">Replace all</button></div>
    <div class="row"><button class="primary" id="txsave">Save transcript</button><button id="txundo">Undo unsaved changes</button><span class="help" id="txstate"></span></div>`);
  txDraw(); wordsChanged();
  $('#txrepbtn').onclick = () => { const f = $('#txfind').value.trim(), r = $('#txrep').value; if (!f) return;
    const re = new RegExp('^(\\W*)' + f.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(\\W*)$', 'i'); let n = 0;
    S.words.forEach(w => { if (re.test(w.word)) { w.word = w.word.replace(re, `$1${r}$2`); n++; } }); toast(`Replaced ${n} word${n === 1 ? '' : 's'}`); txDraw(); wordsChanged(); };
  $('#txcut').onclick = () => { if (txSel < 0) return; const w = S.words[txSel]; addCut({ a: Math.max(0, w.start - .03), b: Math.min(S.dur, w.end + .03), kind: 'word', label: 'Cut: ' + w.word }); txDraw(); };
  $('#txdel').onclick = () => { if (txSel < 0) return; S.words.splice(txSel, 1); txSel = -1; $('#txsel').hidden = true; txDraw(); wordsChanged(); };
  const setT = (k, el) => el.onchange = () => { if (txSel < 0) return; const w = S.words[txSel]; w[k] = Math.max(0, +el.value);
    if (w.end <= w.start) w.end = +(w.start + .05).toFixed(2); const keep = w; wordsChanged(); txSel = S.words.indexOf(keep); txDraw(); };
  setT('start', $('#txs')); setT('end', $('#txe'));
  $('#txundo').onclick = () => { S.words = JSON.parse(S.wordsSaved); txSel = -1; $('#txsel').hidden = true; txDraw(); wordsChanged(); };
  $('#txsave').onclick = async () => { const bad = S.words.find(w => !w.word.trim()); if (bad) S.words = S.words.filter(w => w.word.trim());
    const r = await (await fetch('/api/words?name=' + encodeURIComponent(S.clip.name), { method: 'POST', body: JSON.stringify(S.words) })).json();
    if (r.error) return toast('Transcript not saved: ' + r.error); S.wordsSaved = JSON.stringify(S.words); S.clip.words = JSON.parse(S.wordsSaved); toast('Transcript saved'); wordsChanged(); };
}
function txDraw() {
  const box = $('#tx'); if (!box) return;
  const isCut = w => { const m = (w.start + w.end) / 2; return S.cuts.some(c => m > c.a && m < c.b); };
  box.innerHTML = S.words.length ? S.words.map((w, i) => `<span class="w${i === txSel ? ' sel' : ''}${isCut(w) ? ' cutw' : ''}" data-i="${i}" contenteditable="true" spellcheck="false" title="${w.start.toFixed(2)}s to ${w.end.toFixed(2)}s">${esc(w.word)}</span>`).join(' ')
    : '<span class="help">No words yet. Transcription may still be running, or the clip has no speech.</span>';
  box.querySelectorAll('.w').forEach(el => {
    const i = +el.dataset.i;
    el.onfocus = () => { txSel = i; box.querySelectorAll('.w.sel').forEach(x => x.classList.remove('sel')); el.classList.add('sel');
      const w = S.words[i]; $('#txsel').hidden = false; $('#txinfo').textContent = `"${w.word}"`; $('#txs').value = w.start.toFixed(2); $('#txe').value = w.end.toFixed(2);
      main.win = null; main.v.currentTime = w.start; main.v.play().catch(() => {}); clearTimeout(txStop); txStop = setTimeout(() => main.v.pause(), Math.max(250, (w.end - w.start) * 1000 + 150)); };
    el.oninput = () => { S.words[i].word = el.textContent.trim(); $('#txinfo').textContent = `"${S.words[i].word}"`; wordsChanged(); };
    el.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); el.blur(); } };
  });
}
function txNow(t) { const box = $('#tx'); if (!box || main.v.paused) return; const i = curIdx(t, .05);
  if (i === txNow.last) return; txNow.last = i; box.querySelectorAll('.w.now').forEach(x => x.classList.remove('now')); if (i >= 0) box.querySelector(`.w[data-i="${S.words.indexOf(liveWords()[i])}"]`)?.classList.add('now'); }

/* ---------- timeline: every edit on its own track, like an NLE ---------- */
const TL = { pps: 90, peaks: null, loading: false, range: false, sel: null };
const FXN = id => (FX.find(f => f[0] === id) || [, id])[1], WHN = id => (WHOLE.find(f => f[0] === id) || [, id])[1];
function tlRender() {
  const el = $('#tl'); if (!el || !S.dur) return;
  if (TL.fitFor !== S.clip.name) { TL.fitFor = S.clip.name; TL.pps = clamp(Math.floor((el.clientWidth - 130) / S.dur), 20, 400); }   // start zoomed to fit
  const W = Math.max(600, S.dur * TL.pps), x = t => (t / S.dur * 100).toFixed(3) + '%', w = (a, b) => (Math.max(0, b - a) / S.dur * 100).toFixed(3) + '%';
  const blk = (cls, a, b, label, data = '', st = '') => `<div class="tlb ${cls}" style="left:${x(a)};width:${w(a, b)};${st}" title="${esc(label)} (${a.toFixed(2)} to ${b.toFixed(2)}s)" ${data}><span>${esc(label)}</span></div>`;
  const cfg = baseCfg(), tracks = [];
  const look = [G(S.grade)[1], S.lut ? `${S.lut.name} ${S.lutAmount}%` : ''].filter(Boolean).join(' + ');
  tracks.push(['Video', S.beats.map((b, i) => blk(b.scene && b.scene !== 'aroll' ? 't-scene' : 't-vid', b.t0, b.t1, `${i === 0 ? 'Hook' : 'Beat ' + (i + 1)} · ${b.scene && b.scene !== 'aroll' ? SCENES.find(s => s[0] === b.scene)[1] : look}`, `data-beat="${i}"`)).join('')]);
  { const lanes = vfxLanes(), n = Math.max(1, ...lanes.map(l => l + 1));
    tracks.push(['Elements', (S.els || []).map(e => blk('t-el' + (e.id === S.selEl ? ' sel' : ''), e.start, e.end, e.file.replace(/^el-/, ''), `data-el="${e.id}"`).replace('</span></div>', '</span><i class="hnd l"></i><i class="hnd r"></i></div>')).join('') || '<div class="tlnone">No elements. Upload one in Elements.</div>']);
    tracks.push(['Word anims', (S.wordAnims || []).map((r, k) => blk('t-wa', r.a, Math.max(r.b, r.a + .25), (animById(r.anim) || { name: r.anim }).name, `data-wa="${k}"`)).join('') || '<div class="tlnone">No animated words. Use Animate.</div>']);
    tracks.push(['Effects', S.vfx.map((e, k) => blk('t-vfx' + (e.id === S.sel ? ' sel' : ''), e.start, e.end, '/' + e.fx, `data-vfx="${e.id}"`, `top:${4 + lanes[k] * 32}px`).replace('</span></div>', '</span><i class="hnd l"></i><i class="hnd r"></i></div>')).join('') || '<div class="tlnone">No effects yet. Pick one from Effects, or ask in the chat.</div>', '', 8 + n * 32]); }
  // V2 titles and effects
  let v2 = ''; const b0 = S.beats[0];
  if (b0 && S.hook) v2 += blk('t-title', b0.t0, Math.min(b0.t1, b0.t0 + 3), 'Hook: ' + HOOKS.find(h => h[0] === S.hook)[1], 'data-beat="0"');
  S.beats.forEach((b, i) => (S.fx[i] || []).forEach((id, k) => { v2 += blk('t-fx', b.t0, b.t1, FXN(id), `data-beat="${i}"`, `top:${2 + k * 18}px`); }));
  const nfx = S.beats.reduce((m, b, i) => Math.max(m, (S.fx[i] || []).length), 1);
  tracks.push(['Titles', v2, '', 8 + nfx * 18]);
  // whole-clip effects
  tracks.push(['Whole clip', [...S.whole].map((id, k) => blk('t-whole', 0, S.dur, WHN(id), '', `top:${3 + k * 14}px`)).join('') || '<div class="tlnone">None</div>', '', Math.max(30, 6 + S.whole.size * 14)]);
  // C1 captions, grouped exactly as they show
  let c1 = '';
  if (S.caption && S.words.length) { const o = capOpts(S.caption, S.capEdit), n = Math.max(1, Math.round(o.group));
    for (let g = 0; g < S.words.length; g += n) { const ws = S.words.slice(g, g + n), nx = S.words[g + n];
      const a = ws[0].start + o.offset, b = Math.min(ws[ws.length - 1].end + o.linger, nx ? nx.start + o.offset : S.dur) ;
      c1 += blk('t-cap', a, Math.max(a + .05, b), ws.map(z => z.word).join(' '), `data-word="${g}"`); } }
  else c1 = `<div class="tlnone">${S.caption ? 'No words in the transcript' : 'No caption style picked'}</div>`;
  tracks.push(['Captions', c1]);
  // V1 video, split at the beats (the cuts)
  // A1 voice waveform, A2 sound effects, A3 music
  const vp = voiceParams(S.voice);
  tracks.push([S.voice.preset === 'off' ? 'Voice' : `Voice · ${VOICE[S.voice.preset].name} ${S.voice.amount}%`, `<canvas class="tlwave" id="tlwave"></canvas>`, 'wave']);
  const ev = soundEvents(cfg, S.snd);
  let lastT = -9, lane = 0;
  tracks.push(['SFX', ev.map(e => { lane = e.t - lastT < .6 ? (lane + 1) % 3 : 0; lastT = e.t;
      return `<div class="tlm" style="left:${x(e.t)}" title="${e.snd} at ${e.t.toFixed(2)}s"><span style="top:${2 + lane * 13}px">${e.snd}</span></div>`; }).join('')
    || `<div class="tlnone">${[...S.snd].some(s => s !== 'music') ? 'Sounds picked, but nothing on screen moves for them to sit on yet (add beats, effects or cuts)' : 'No sound effects picked'}</div>`]);
  tracks.push(['Music', S.snd.has('music') ? blk('t-music', 0, S.dur, 'Soft music bed') : '<div class="tlnone">No music</div>']);
  // cuts: suggestions (dashed, not applied) and applied cuts (solid). Click to toggle.
  tracks.unshift(['Cuts', S.sugg.map((c, i) => blk('t-sug', c.a, c.b, c.label, `data-sug="${i}"`)).join('') + S.cuts.map((c, i) => blk('t-cut', c.a, c.b, c.label || 'Cut', `data-cut="${i}"`)).join('')
    || '<div class="tlnone">No cuts. Use "Find dead air" or the range tool.</div>']);
  let ticks = ''; const step = TL.pps >= 150 ? .5 : TL.pps >= 60 ? 1 : TL.pps >= 30 ? 2 : 5;
  for (let t = 0; t <= S.dur + 1e-6; t += step) ticks += `<div class="tlt" style="left:${x(t)}">${Number.isInteger(t) ? t + 's' : ''}</div>`;
  const cuts = S.beats.slice(1).map(b => `<div class="tlcut" style="left:${x(b.t0)}"></div>`).join('')
    + S.cuts.map(c => `<div class="tlcutshade" style="left:${x(c.a)};width:${w(c.a, c.b)}"></div>`).join('')
    + (TL.sel ? `<div class="tlsel" style="left:${x(Math.min(...TL.sel))};width:${w(Math.min(...TL.sel), Math.max(...TL.sel))}"></div>` : '');
  const cutLen = S.cuts.reduce((s, c) => s + (c.b - c.a), 0);
  const sc = el.querySelector('.tlscroll'), keep = sc ? sc.scrollLeft : 0;
  el.innerHTML = `<div class="tlbar"><b>Timeline</b><span class="help" id="tltime"></span><span class="help">Edited length ${(S.dur - cutLen).toFixed(2)}s${cutLen ? ` (${cutLen.toFixed(2)}s cut)` : ''}</span><label class="help">Zoom <input type="range" id="tlzoom" min="20" max="400" value="${TL.pps}"></label></div>
    <div class="tlcuts"><label>Dead air longer than <b id="gapv">${S.cutGap.toFixed(2)}s</b><input type="range" id="gap" min="0.2" max="1.5" step="0.05" value="${S.cutGap}"></label>
      <label>Padding <b id="padv">${Math.round(S.cutPad * 1000)} ms</b><input type="range" id="pad" min="0.01" max="0.2" step="0.01" value="${S.cutPad}"></label>
      <button id="finddead">Find dead air and retakes</button>
      ${S.sugg.length ? `<span class="help">${S.sugg.length} suggestion${S.sugg.length > 1 ? 's' : ''}: click one to cut it, or</span><button id="applyall">Cut all suggestions</button><button id="clearsug">Dismiss</button>` : ''}
      <button id="rangetool" class="${TL.range ? 'on' : ''}">Range tool</button>${TL.sel ? '<button id="cutsel">Cut selection</button>' : ''}
      ${S.cuts.length ? '<button id="uncutall">Restore all cuts</button>' : ''}</div>
    <div class="tlwrap"><div class="tlheads"><div class="tlh ruler"></div>${tracks.map(t => `<div class="tlh ${t[2] || ''}"${t[3] ? ` style="height:${t[3]}px"` : ''}>${t[0]}</div>`).join('')}</div>
    <div class="tlscroll"><div class="tlinner" style="width:${W}px"><div class="tlruler">${ticks}</div>
      ${tracks.map(t => `<div class="tlrow ${t[2] || ''}"${t[3] ? ` style="height:${t[3]}px"` : ''}>${t[1]}</div>`).join('')}${cuts}<div class="tlph" id="tlph"></div></div></div></div>`;
  el.querySelector('.tlscroll').scrollLeft = keep;
  $('#tlzoom').oninput = e => { TL.pps = +e.target.value; tlRender(); };
  const inner = el.querySelector('.tlinner'), tAt = e => { const r = inner.getBoundingClientRect(); return clamp((e.clientX - r.left) / r.width, 0, 1) * S.dur; },
    seek = e => { main.win = null; main.v.currentTime = tAt(e); };
  let drag = false;
  inner.onpointerdown = e => { if (!TL.range && e.target.closest('.tlb,.tlm')) return; drag = true; inner.setPointerCapture(e.pointerId);
    if (TL.range) TL.sel = [tAt(e), tAt(e)]; else seek(e); };
  inner.onpointermove = e => { if (!drag) return; if (TL.range) { TL.sel[1] = tAt(e); const s = el.querySelector('.tlsel'); if (s) { s.style.left = (Math.min(...TL.sel) / S.dur * 100) + '%'; s.style.width = (Math.abs(TL.sel[1] - TL.sel[0]) / S.dur * 100) + '%'; } } else seek(e); };
  inner.onpointerup = () => { if (drag && TL.range) { if (Math.abs(TL.sel[1] - TL.sel[0]) < .05) TL.sel = null; tlRender(); } drag = false; };
  $('#gap').oninput = e => { S.cutGap = +e.target.value; $('#gapv').textContent = S.cutGap.toFixed(2) + 's'; };
  $('#pad').oninput = e => { S.cutPad = +e.target.value; $('#padv').textContent = Math.round(S.cutPad * 1000) + ' ms'; };
  $('#finddead').onclick = () => { findSuggestions(); toast(S.sugg.length ? `${S.sugg.length} suggested cut${S.sugg.length > 1 ? 's' : ''}. Nothing is cut until you pick them.` : 'No dead air or retakes found at this setting'); tlRender(); };
  $('#applyall') && ($('#applyall').onclick = () => { S.sugg.slice().forEach(c => addCut(c, true)); S.sugg = []; saveCuts(); tlRender(); });
  $('#clearsug') && ($('#clearsug').onclick = () => { S.sugg = []; tlRender(); });
  $('#rangetool').onclick = () => { TL.range = !TL.range; TL.sel = null; tlRender(); toast(TL.range ? 'Range tool: drag across the timeline, then "Cut selection"' : 'Range tool off'); };
  $('#cutsel') && ($('#cutsel').onclick = () => { const [p, q] = [Math.min(...TL.sel), Math.max(...TL.sel)]; TL.sel = null; addCut({ a: p, b: q, kind: 'manual', label: 'Cut' }); });
  $('#uncutall') && ($('#uncutall').onclick = () => { S.cuts = []; afterCuts(); });
  inner.querySelectorAll('[data-sug]').forEach(b => b.onclick = e => { e.stopPropagation(); const c = S.sugg.splice(+b.dataset.sug, 1)[0]; addCut(c); });
  inner.querySelectorAll('[data-cut]').forEach(b => b.onclick = e => { e.stopPropagation(); S.cuts.splice(+b.dataset.cut, 1); afterCuts(); toast('Cut restored'); });
  vfxDrag(inner);
  inner.querySelectorAll('.tlb:not([data-sug]):not([data-cut]):not([data-vfx])').forEach(b => b.onclick = e => { if (TL.range) return; seek(e);
    if (b.dataset.beat !== undefined && b.classList.contains('t-vid') === false) { S.beat = +b.dataset.beat; S.step = 3; renderStep(); }
    if (b.dataset.word !== undefined) { if (S.step !== 2 || S.panel) { S.step = 2; renderStep(); } $(`#tx .w[data-i="${b.dataset.word}"]`)?.focus(); } });
  tlWave(); tlPlayhead(main ? main.v.currentTime : 0);
}
function tlPlayhead(t) { const ph = $('#tlph'); if (!ph || !S.dur) return; ph.style.left = (t / S.dur * 100) + '%';
  const tt = $('#tltime'); if (tt) tt.textContent = `${t.toFixed(2)}s / ${S.dur.toFixed(2)}s`;
  if (main && !main.v.paused) { const sc = $('#tl .tlscroll'), px = t / S.dur * sc.scrollWidth; if (px < sc.scrollLeft || px > sc.scrollLeft + sc.clientWidth - 40) sc.scrollLeft = px - 60; } }
async function tlWave() {
  const c = $('#tlwave'); if (!c) return;
  if (!TL.peaks && !TL.loading) { TL.loading = true; try {
      const buf = await (await fetch(S.clip.proxy)).arrayBuffer(), ac = new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(1, 44100, 44100);
      const au = await ac.decodeAudioData(buf), d = au.getChannelData(0), N = 4000, step = Math.max(1, Math.floor(d.length / N)), pk = new Float32Array(N);
      for (let i = 0; i < N; i++) { let m = 0; for (let j = i * step; j < Math.min(d.length, (i + 1) * step); j++) m = Math.max(m, Math.abs(d[j])); pk[i] = m; }
      const mx = Math.max(...pk) || 1; TL.peaks = pk.map(v => v / mx); } catch (e) { TL.peaks = new Float32Array(0); console.warn('waveform:', e); } TL.loading = false; }
  if (!TL.peaks) return setTimeout(tlWave, 300);
  const cv = $('#tlwave'); if (!cv) return; const w = cv.clientWidth, h = cv.clientHeight; cv.width = w; cv.height = h; const x = cv.getContext('2d');
  x.fillStyle = '#3ddc97'; for (let i = 0; i < w; i++) { const v = TL.peaks[Math.floor(i / w * TL.peaks.length)] || 0, bh = Math.max(1, v * (h - 4)); x.fillRect(i, (h - bh) / 2, 1, bh); }
}


/* ---------- cuts: suggestions never apply themselves; you pick them ---------- */
S.cutGap = .4; S.sugg = [];
S.cutPad = .03;   // air kept either side of speech (30 ms, as in the minimal-style workflow)
function quietBetween(a, b) {   // is the audio in [a,b] actually quiet? (uses the waveform once it's loaded)
  const pk = TL.peaks; if (!pk || !pk.length || !S.dur) return true;
  const i0 = Math.floor(a / S.dur * pk.length), i1 = Math.ceil(b / S.dur * pk.length); let s = 0, n = 0;
  for (let i = i0; i < i1; i++) { s += pk[i] || 0; n++; } return n ? s / n < .18 : true;
}
function overlapsCut(a, b) { return S.cuts.some(c => a < c.b && b > c.a); }
function findSuggestions() {
  const W = S.words, out = [], g = S.cutGap;
  if (!W.length) { S.sugg = []; return; }
  const gaps = [[0, W[0].start, 'Silence at the start'], ...W.slice(1).map((w, i) => [W[i].end, w.start, 'Dead air']), [W[W.length - 1].end, S.dur, 'Silence at the end']];
  gaps.forEach(([p, q, label], k) => { const edgeStart = k === 0, edgeEnd = k === gaps.length - 1;
    if (q - p < g) return; const a = edgeStart ? 0 : p + S.cutPad, b = edgeEnd ? S.dur : q - S.cutPad;
    if (b - a > .05 && quietBetween(a, b) && !overlapsCut(a, b)) out.push({ a, b, kind: 'silence', label: `${label} ${(b - a).toFixed(2)}s` }); });
  // retakes: the same 3 words said again soon after; suggest keeping the later take
  const norm = s => s.toLowerCase().replace(/[^a-z0-9']/g, '');
  for (let i = 0; i + 2 < W.length; i++) for (let j = i + 3; j + 2 < W.length && j - i <= 30; j++) {
    if ([0, 1, 2].every(k => norm(W[i + k].word) && norm(W[i + k].word) === norm(W[j + k].word))) {
      const a = Math.max(0, W[i].start - .04), b = Math.max(a + .05, W[j].start - .04);
      if (!overlapsCut(a, b) && !out.some(o => a < o.b && b > o.a && o.kind === 'retake')) out.push({ a, b, kind: 'retake', label: `Retake: "${W.slice(i, i + 3).map(w => w.word).join(' ')}..."` });
      break; } }
  S.sugg = out.sort((x, y) => x.a - y.a);
}
function addCut(c, quiet) {
  S.cuts.push({ a: +c.a.toFixed(3), b: +c.b.toFixed(3), kind: c.kind || 'manual', label: c.label || 'Cut' });
  S.cuts.sort((x, y) => x.a - y.a);
  const merged = []; S.cuts.forEach(c2 => { const m = merged[merged.length - 1]; if (m && c2.a <= m.b + .01) { m.b = Math.max(m.b, c2.b); m.label = 'Cut'; } else merged.push({ ...c2 }); });
  S.cuts = merged; S.sugg = S.sugg.filter(s => !overlapsCut(s.a, s.b));
  if (!quiet) afterCuts();
}
function afterCuts() { refreshLive(); saveCuts(); tlRender(); txDraw(); }
async function saveCuts() { try { await fetch('/api/cuts?name=' + encodeURIComponent(S.clip.name), { method: 'POST', body: JSON.stringify(S.cuts) }); S.clip.cuts = S.cuts.map(c => ({ ...c })); } catch {} }


/* ---------- voice processing ---------- */
let VA = null;   // the Web Audio chain on the main video (created on first use, needs a click to start)
function voiceGraph() {
  if (VA || !main) return VA;
  AC = AC || new (window.AudioContext || window.webkitAudioContext)();
  try {
    const src = AC.createMediaElementSource(main.v), hp = AC.createBiquadFilter(), warm = AC.createBiquadFilter(), pres = AC.createBiquadFilter(),
      ess = AC.createBiquadFilter(), comp = AC.createDynamicsCompressor(), gain = AC.createGain();
    hp.type = 'highpass'; warm.type = 'lowshelf'; warm.frequency.value = 160; pres.type = 'peaking'; pres.frequency.value = 3500; pres.Q.value = 1;
    ess.type = 'peaking'; ess.frequency.value = 7000; ess.Q.value = 2; comp.threshold.value = -20; comp.attack.value = .01; comp.release.value = .15;
    src.connect(hp).connect(warm).connect(pres).connect(ess).connect(comp).connect(gain).connect(AC.destination);
    VA = { hp, warm, pres, ess, comp, gain };
  } catch (e) { console.warn('voice preview unavailable:', e); VA = false; }
  return VA;
}
function applyVoice() {
  if (!main || (!VA && S.voice.preset === 'off')) return;
  const g = voiceGraph(); if (!g) return; if (AC.state === 'suspended') AC.resume();
  const p = S.mode === 'raw' ? voiceParams({ preset: 'off' }) : voiceParams(S.voice), t = AC.currentTime;
  g.hp.frequency.setTargetAtTime(p.hp || 10, t, .02); g.warm.gain.setTargetAtTime(p.warmth, t, .02); g.pres.gain.setTargetAtTime(p.presence, t, .02);
  g.ess.gain.setTargetAtTime(-p.deess * 10, t, .02); g.comp.ratio.setTargetAtTime(p.ratio, t, .02); g.comp.threshold.setTargetAtTime(p.ratio > 1 ? -20 : 0, t, .02);
  g.gain.gain.setTargetAtTime(Math.pow(10, p.makeup / 20), t, .02);
}
function voiceSection(body) {
  const v = S.voice, p = voiceParams(v);
  body.insertAdjacentHTML('beforeend', `<h3>Voice</h3>
    <div class="vpre">${Object.entries(VOICE).map(([id, P]) => `<button data-vp="${id}" class="${v.preset === id ? 'on' : ''}">${P.name}</button>`).join('')}</div>
    ${v.preset !== 'off' ? `<label class="amt">Amount <b id="vamt">${v.amount}%</b><input type="range" id="vamount" min="0" max="100" value="${v.amount}"></label>
      <label class="amt">Noise reduction <b id="vnr">${p.nr} dB</b><input type="range" id="vnrr" min="0" max="30" step="1" value="${p.nr}"></label>
      <p class="help">Rumble cut ${p.hp} Hz · de-ess ${p.deess} · compression ${p.ratio}:1 · presence +${p.presence} dB${p.warmth ? ` · warmth +${p.warmth} dB` : ''}.
      The preview plays this live (turn sound on, flip Raw/Edited to compare). Noise reduction is only heard in the render.</p>` : '<p class="help">Cleans up the voice: cuts rumble, reduces background noise, softens harsh "s" sounds, evens out the level and adds clarity.</p>'}`);
  body.querySelectorAll('[data-vp]').forEach(b => b.onclick = () => { S.voice = { preset: b.dataset.vp, amount: S.voice.amount || 100, nr: null }; S.done.add(4);
    if (!S.sound && b.dataset.vp !== 'off') { S.sound = true; $('#snd').textContent = '🔊'; main.v.muted = false; }
    applyVoice(); renderStep(); toast('Voice: ' + VOICE[b.dataset.vp].name); });
  const am = $('#vamount'); if (am) am.oninput = () => { S.voice.amount = +am.value; S.voice.nr = null; $('#vamt').textContent = am.value + '%'; const q = voiceParams(S.voice); $('#vnr').textContent = q.nr + ' dB'; $('#vnrr').value = q.nr; applyVoice(); };
  const nr = $('#vnrr'); if (nr) { nr.oninput = () => { S.voice.nr = +nr.value; $('#vnr').textContent = nr.value + ' dB'; }; nr.onchange = () => tlRender(); }
  if (am) am.onchange = () => renderStep();
}


/* ---------- minimal style: scenes per beat, three recommendations, plan notes ---------- */
function recommend(b, i) {   // the planning rules from the minimal-style workflow
  const s = (b.text || '').toLowerCase(), last = i === S.beats.length - 1, out = [];
  const add = (id, why) => { if (!out.some(o => o[0] === id)) out.push([id, why]); };
  if (i === 0) add('aroll', 'Open on the speaker so the viewer connects first');
  if (/\b(there are|there's|there is|first|second|third|next|the (first|second|third))\b/.test(s)) add('aroll', 'Announcing a new idea: stay on the face');
  if (/\d|percent|\bup\b|grow|more|less|years|times|steady|slow|declin|rise/.test(s)) add('graph', 'Numbers or progression: show it as a graph');
  if (/\b(my (dad|mum|mom|wife|friend|boss)|he|she|people|person|guy|girl|man|woman|someone)\b/.test(s)) add('center', 'A person being described: character illustration');
  if (/\b(fell|love|story|went|remember|when i|once|girl|journey|paint|dream)\b/.test(s)) add('painting', 'A story: a painting shows it');
  if (/\b(feel|felt|fight|run|work|hard|brutal|again|start|walk|build)\b/.test(s)) add('broll', 'A feeling or action: B-roll with text');
  if (last) add('quote', 'End on a quote scene');
  if (/\b(calling|courage|meaning|purpose|life|truth|freedom|agility|why)\b/.test(s)) add('line', 'The big point: a line through the key words');
  ['aroll', 'quote', 'line', 'graph'].forEach(id => add(id, SCENE_INFO[id]));
  return out.slice(0, 3);
}
function sceneSection(body, b, win) {
  const rec = recommend(b, S.beat), cur = b.scene || 'aroll', o = b.sceneOpts || (b.sceneOpts = {});
  body.insertAdjacentHTML('beforeend', `<h3>Scene for this beat</h3>
    <div class="planbox"><div class="planscript"><b>Script</b><span>${esc(b.text || '(no transcript)')}</span></div>
      <textarea id="bnote" placeholder="Write your plan for this beat, or pick a design below and edit it.">${esc(b.note || '')}</textarea></div>
    <div class="recs">${rec.map((r, k) => `<button class="rec${cur === r[0] ? ' on' : ''}" data-sc="${r[0]}"><b>${'ABC'[k]} · ${SCENES.find(s => s[0] === r[0])[1]}</b><small>${esc(SCENE_INFO[r[0]])}</small><span>${esc(r[1])}</span></button>`).join('')}</div>
    <div class="grid" id="gsc"></div><div id="scopts"></div>`);
  $('#bnote').oninput = e => { b.note = e.target.value; };
  body.querySelectorAll('.rec').forEach(x => x.onclick = () => pickScene(b, x.dataset.sc));
  const g = $('#gsc');
  SCENES.forEach((s2, k) => card(k, s2[1] + (rec.some(r => r[0] === s2[0]) ? ' ★' : ''), () => pickScene(b, s2[0]),
    () => ({ ...baseCfg(), scenes: { [S.beat]: { ...b, scene: s2[0] } } }), win, cur === s2[0], g));
  const box = $('#scopts');
  if (cur === 'quote' || cur === 'line') box.innerHTML = `<div class="row"><label class="help">Background <select id="scbg">${(cur === 'quote' ? [['white', 'White paper'], ['blue', 'Blue paper']] : [['black', 'Black paper'], ['white', 'White paper']]).map(x => `<option value="${x[0]}"${(o.bg || (cur === 'quote' ? 'white' : 'black')) === x[0] ? ' selected' : ''}>${x[1]}</option>`).join('')}</select></label></div>`;
  if (cur === 'graph') box.innerHTML = `<div class="row"><label class="help">Line <select id="scgraph">${[['', 'Auto from the words (' + graphKind(b.text) + ')'], ['steps', 'Steps up (one per "up")'], ['flat', 'Long flat line (slow and steady)'], ['rise', 'Rising curve'], ['down', 'Decline']].map(x => `<option value="${x[0]}"${(o.graph || '') === x[0] ? ' selected' : ''}>${x[1]}</option>`).join('')}</select></label></div>`;
  if (NEEDS_IMAGE.has(cur)) box.innerHTML = `<div class="imgpick"><div class="row"><input type="file" id="scfile" accept="image/*" hidden><button id="scup">${b.image ? 'Replace image' : 'Upload image'}</button>
      <input type="text" id="scq" placeholder="${cur === 'painting' ? 'Search paintings, e.g. lovers kissing' : 'Search Wikimedia Commons'}"><button id="scsearch">Search</button></div>
      <div class="help">${b.image ? 'Using ' + esc(b.image) + '.' : 'No image yet.'} ${cur === 'center' || cur === 'side' ? 'A clean cut-out or simple illustration works best; it is turned into the rough blue texture.' : ''} Wikimedia images carry their own licences; old paintings are usually public domain.</div>
      <div class="wmgrid" id="wm"></div></div>`;
  $('#scbg') && ($('#scbg').onchange = e => { o.bg = e.target.value; renderStep(); });
  $('#scgraph') && ($('#scgraph').onchange = e => { o.graph = e.target.value || undefined; renderStep(); });
  if ($('#scup')) {
    $('#scup').onclick = () => $('#scfile').click();
    $('#scfile').onchange = async e => { const f = e.target.files[0]; if (!f) return; toast('Uploading image...');
      const r = await sendAsset(f); if (r.error) return toast(r.error); b.image = r.file; renderStep(); };
    const search = async () => { const q = $('#scq').value.trim(); if (!q) return; $('#wm').innerHTML = '<span class="help">Searching...</span>';
      try { const u = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrlimit=12&gsrsearch=${encodeURIComponent((cur === 'painting' ? 'painting ' : '') + q + ' filetype:bitmap')}&prop=imageinfo&iiprop=url&iiurlwidth=1080&format=json&origin=*`;
        const d = await (await fetch(u)).json(), pages = Object.values((d.query || {}).pages || {}).filter(x => x.imageinfo);
        $('#wm').innerHTML = pages.length ? pages.map((x, k) => `<img src="${x.imageinfo[0].thumburl}" data-k="${k}" title="${esc(x.title)}">`).join('') : '<span class="help">Nothing found. Try other words.</span>';
        $('#wm').querySelectorAll('img').forEach(im => im.onclick = async () => { toast('Saving image...');
          const r = await (await fetch('/api/asset-fetch', { method: 'POST', body: JSON.stringify({ url: im.src }) })).json();
          if (r.error) return toast(r.error); b.image = r.file; renderStep(); });
      } catch (err) { $('#wm').innerHTML = '<span class="help">Search failed: ' + esc(err.message) + '</span>'; } };
    $('#scsearch').onclick = search; $('#scq').onkeydown = e => { if (e.key === 'Enter') search(); };
  }
}
function pickScene(b, id) { b.scene = id; S.done.add(3); if (id !== 'aroll' && !S.snd.size) { ['whoosh', 'click', 'highlight'].forEach(x => S.snd.add(x)); }
  toast('Scene: ' + SCENES.find(s => s[0] === id)[1]); renderStep(); }
async function sendAsset(file) {
  const name = cleanName(file.name);
  if (CFG.blob) { const { upload } = await import('https://esm.sh/@vercel/blob@0.27.3/client');
    await upload('shots/' + name, file, { access: 'public', handleUploadUrl: '/api/blob-token', contentType: file.type || 'image/jpeg' }); return { file: name }; }
  return (await fetch('/api/asset-upload?name=' + encodeURIComponent(name), { method: 'POST', body: file })).json();
}
function planText() {
  const fmtT = s => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`;
  return [`# Edit plan: ${S.clip.name}`, `Captions: ${(CAPS.find(c => c[0] === S.caption) || [, 'none'])[1]} · Colour: ${G(S.grade)[1]}${S.lut ? ' + LUT ' + S.lut.name : ''} · Cuts: ${S.cuts.length}`, '',
    ...S.beats.map((b, i) => [`## Beat ${i + 1} (${fmtT(b.t0)}–${fmtT(b.t1)})`, `Script: "${b.text || ''}"`,
      `Scene: ${SCENES.find(s => s[0] === (b.scene || 'aroll'))[1]}${b.image ? ` (image: ${b.image})` : ''}${b.sceneOpts && (b.sceneOpts.bg || b.sceneOpts.graph) ? ` [${[b.sceneOpts.bg, b.sceneOpts.graph].filter(Boolean).join(', ')}]` : ''}`,
      (S.fx[i] || []).length ? `Effects: ${S.fx[i].map(FXN).join(', ')}` : '', b.note ? `Plan: ${b.note}` : '', ''].filter(x => x !== null).join('\n'))].join('\n');
}
async function copyPlan() { const txt = planText(); try { await navigator.clipboard.writeText(txt); toast('Plan copied'); } catch { prompt('Copy the plan:', txt); } }

/* ---------- layout v2: rail panels, takes, looks, inspector ---------- */
const ICON = d => `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const RAIL = [['videos', 'Videos', ICON('<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M10 9.5v5l4.5-2.5z"/>')],
  ['effects', 'Effects', ICON('<path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/>')],
  ['anims', 'Animate', ICON('<path d="M4 18c4 0 5-12 9-12 2.5 0 3.5 4 7 4"/><circle cx="4" cy="18" r="1.6" fill="currentColor"/>')],
  ['elements', 'Elements', ICON('<rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><circle cx="9" cy="10" r="1.8"/><path d="m4 18 5.5-5 4 3.5 2.5-2 4 3.5"/>')],
  ['captions', 'Captions', ICON('<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M7 11h4M13 11h4M7 15h7"/>')],
  ['fonts', 'Fonts', ICON('<path d="M4 19 9 5l5 14M6 14h6M15 19v-6.5a2.5 2.5 0 0 1 5 0V19M15 15.5h5"/>')],
  ['colours', 'Colours', ICON('<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5v17a8.5 8.5 0 0 0 0-17z" fill="currentColor"/>')],
  ['beats', 'Beats', ICON('<path d="M4 12h2l2-6 3 12 3-9 2 3h4"/>')],
  ['sound', 'Sounds', ICON('<path d="M4 10v4M8 7v10M12 4v16M16 8v8M20 11v2"/>')],
  ['styles', 'Templates', ICON('<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>')],
  ['watch', 'Export', ICON('<path d="M12 15V4M7.5 8.5 12 4l4.5 4.5M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4"/>')]];
const PANELS = { videos: ['Videos', 'Your clips. Pick one to edit it.'], effects: ['Effects library', 'Tap one to add it at the playhead. Drag it on the timeline to move it. The render draws them; "Check frames" shows a preview.'],
  anims: ['Animate', 'Pick caption words (tap the first, then the last), then tap an animation. With an element selected, tapping one sets how it comes in. Grab new animations from a reference reel in Ingest style.'],
  elements: ['Elements', 'Upload images (PNG with a transparent background works best), tap one to put it on the video at the playhead, then drag it on the video to place it.'],
  styles: ['Templates', 'Saved styles. Apply one to this clip, or save the current edit as a style.'] };
const fmt = t => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
const LOOKS = ['raw', 'bright', 'warm', 'teal', 'punchy', 'bw'];
const LOOKN = { raw: 'natural', bright: 'bright', warm: 'warm', teal: 'moody', punchy: 'punchy', bw: 'b&w' };
function renderLooks() {
  const el = $('#looks'); if (!el) return;
  el.innerHTML = '<h4>LOOK</h4>' + LOOKS.map((id, i) => `<button data-g="${id}" class="${S.grade === id ? 'on' : ''}"><i style="background:${G(id)[3]}"></i>${'ABCDEF'[i]} · ${LOOKN[id]}</button>`).join('');
  el.querySelectorAll('button').forEach(b => b.onclick = () => { S.grade = b.dataset.g; S.done.add(0); toast('Look: ' + LOOKN[S.grade]); renderStep(); });
}
function takeHTML(c, i) { return `<button class="take${S.clip && c.name === S.clip.name ? ' on' : ''}" data-clip="${esc(c.name)}">${c.proxy ? `<video muted playsinline preload="metadata" src="${esc(c.proxy)}#t=0.5"></video>` : ''}<b>Take ${i + 1}<small data-d></small></b></button>`; }
function wireTakes(el) {
  el.querySelectorAll('.take[data-clip]').forEach(b => { const v = b.querySelector('video'); if (v) v.onloadedmetadata = () => { const d = b.querySelector('[data-d]'); if (d) d.textContent = fmt(v.duration); };
    b.onclick = () => { if (S.clip && b.dataset.clip === S.clip.name) return; S.clip = null; refresh(b.dataset.clip); }; });
}
function renderTakes() {
  const el = $('#takes'); if (!el) return;
  el.innerHTML = (S.clips || []).filter(c => c.proxy).map(takeHTML).join('') + '<button class="take add" id="takeadd">+ Add clip</button>';
  wireTakes(el); $('#takeadd').onclick = () => { show('empty'); setMsg(''); };
}
function renderPanel() {
  const body = $('#body'), [title, help] = PANELS[S.panel] || ['', '']; $('.panel .nav').hidden = true; main.win = null;
  $('#ptitle').textContent = title; $('#help').textContent = help; $('#pcount').textContent = ''; body.innerHTML = '';
  if (S.panel === 'effects') {
    $('#pcount').textContent = VFX.filter(f => f[0] !== 'glitter-spotlight').length + ' effects';
    body.innerHTML = `<div class="fxlib"><input type="text" class="fxsearch" id="fxq" placeholder="Search effects..." value="${esc(S.fxq || '')}"><div class="grid" id="fxgrid"></div></div>`;
    const draw = () => { const q = (S.fxq || '').toLowerCase().trim();
      $('#fxgrid').innerHTML = VFX.filter(f => !q || f[0].includes(q) || f[1].toLowerCase().includes(q)).map(f => { const n = S.vfx.filter(e => e.fx === f[0]).length;
        return `<button class="fxt${n ? ' on' : ''}" data-fx="${f[0]}" title="${esc(f[1])}" style="background-image:url(${vfxThumb(f[0])})">${n ? `<span class="n">${n}</span>` : ''}<b>/${f[0]}</b></button>`; }).join('') || '<p class="help">No effect matches.</p>';
      $('#fxgrid').querySelectorAll('.fxt').forEach(b => b.onclick = () => addVfx(b.dataset.fx)); };
    $('#fxq').oninput = e => { S.fxq = e.target.value; draw(); }; draw();
  }
  if (S.panel === 'anims') animPanel(body);
  if (S.panel === 'elements') elPanel(body);
  if (S.panel === 'videos') {
    body.innerHTML = `<div class="vlist">${(S.clips || []).map((c, i) => `<button class="take${S.clip && c.name === S.clip.name ? ' on' : ''}" data-clip="${esc(c.name)}">${c.proxy ? `<video muted playsinline preload="metadata" src="${esc(c.proxy)}#t=0.5"></video>` : ''}<span><b>Take ${i + 1}</b>${esc(c.name)}<small>${c.status === 'ready' ? '' : esc(c.status)} <i data-d></i></small></span></button>`).join('')}</div>
      <div class="row"><button class="primary" id="vadd">+ Add clip</button><button id="vingest">Ingest a style from a reel</button></div>`;
    wireTakes(body); $('#vadd').onclick = () => { show('empty'); setMsg(''); }; $('#vingest').onclick = () => $('#ingestbtn').click();
  }
  if (S.panel === 'styles') {
    body.innerHTML = `<div class="sum">${STYLES_CACHE.length ? STYLES_CACHE.map((st, i) => `<div><b>${esc(st.name)}</b><button data-st="${i}">Apply</button></div>`).join('') : '<p class="help">No saved styles yet.</p>'}</div>
      <h3>Save this edit as a style</h3><div class="row"><input type="text" id="sname2" placeholder="Style name"><button id="ssave2">Save</button></div>`;
    body.querySelectorAll('[data-st]').forEach(b => b.onclick = () => applyStyle(STYLES_CACHE[+b.dataset.st]));
    $('#ssave2').onclick = async () => { const n = $('#sname2').value.trim(); if (!n) return toast('Name your style first');
      const r = await (await fetch('/save', { method: 'POST', body: JSON.stringify(styleObj(n)) })).json(); toast('Saved ' + r.saved); await loadStyles(); renderStep(); };
  }
}

/* ---------- effects from the effects skill (drawn by fx.py in the render) ---------- */
let VFX_N = 0; const vfxId = () => 'e' + (++VFX_N);
const vfxOut = () => (S.vfx || []).map(e => ({ fx: e.fx, start: +(+e.start).toFixed(2), end: +(+e.end).toFixed(2), opts: Object.fromEntries(Object.entries(e.opts || {}).filter(([, v]) => String(v).trim() !== '')) }));
function vfxSave() { try { localStorage.setItem('studio-vfx:' + S.clip.name, JSON.stringify(vfxOut())); localStorage.setItem('studio-els:' + S.clip.name, JSON.stringify({ els: S.els, wordAnims: S.wordAnims })); } catch {} }
function vfxLoad(c) {
  S.vfx = []; S.sel = null; S.selEl = null; S.els = []; S.wordAnims = []; S.wsel = null; S.panel = 'effects';
  try { const d = JSON.parse(localStorage.getItem('studio-els:' + c.name) || '{}') || {}; S.els = (d.els || []).map(e => ({ ...e, id: vfxId() })); S.wordAnims = d.wordAnims || []; } catch {}
  try { S.vfx = (JSON.parse(localStorage.getItem('studio-vfx:' + c.name) || '[]') || []).filter(e => VFXN(e.fx)).map(e => ({ ...e, id: vfxId(), opts: { ...(e.opts || {}) } })); } catch {}
  try { S.chat = JSON.parse(localStorage.getItem('studio-chat:' + c.name) || '[]') || []; } catch { S.chat = []; }
  renderChat(); renderTakes();
}
function vfxLanes() {   // overlapping effects stack on separate lanes
  const ends = []; return S.vfx.map(e => { let l = ends.findIndex(x => x <= e.start + 1e-3); if (l < 0) l = ends.length; ends[l] = e.end; return l; });
}
function addVfx(fx, start, end, opts, quiet) {
  const f = VFXN(fx); if (!f || !S.dur) return null;
  const len = fx === 'over-the-shoulder-zoom' ? 6 : 3;
  let a = start ?? (main ? main.v.currentTime : 0); a = clamp(a, 0, Math.max(0, S.dur - .5));
  let b = end ?? a + len; b = clamp(b, a + .3, S.dur);
  const e = { id: vfxId(), fx, start: +a.toFixed(2), end: +b.toFixed(2), opts: { ...(f[3] || {}), ...(opts || {}) } };
  S.vfx.push(e); S.vfx.sort((x, y) => x.start - y.start); S.sel = e.id; S.selEl = null; vfxSave();
  if (!quiet) { toast(`Added /${fx} at ${a.toFixed(1)}s`); renderStep(); }
  return e;
}
function removeVfx(id) { S.vfx = S.vfx.filter(e => e.id !== id); if (S.sel === id) S.sel = null; vfxSave(); }
let fxMarkLast = '';
function fxMark(t, raw) {
  const act = raw ? [] : (S.vfx || []).filter(e => t >= e.start && t < e.end), key = act.map(e => e.id).join() + '|' + (S.vfx || []).length;
  if (key === fxMarkLast) return; fxMarkLast = key;
  const chip = $('#fxchip'), cnt = $('#fxcount'), zone = $('#fxzone'); if (!chip) return;
  chip.hidden = !act.length; chip.textContent = act.map(e => '/' + e.fx).join('  ');
  zone.hidden = !act.length; cnt.hidden = raw || !(S.vfx || []).length; cnt.textContent = (S.vfx || []).length + ' fx';
}
function vfxDrag(inner) {
  inner.querySelectorAll('[data-wa]').forEach(el => el.onclick = ev => { ev.stopPropagation(); S.panel = 'anims'; renderStep(); });
  inner.querySelectorAll('[data-vfx],[data-el]').forEach(el => {
    el.onpointerdown = ev => {
      if (TL.range) return; ev.stopPropagation(); ev.preventDefault();
      const isEl = !!el.dataset.el, e = isEl ? S.els.find(x => x.id === el.dataset.el) : S.vfx.find(x => x.id === el.dataset.vfx); if (!e) return;
      const mode = ev.target.classList.contains('l') ? 'l' : ev.target.classList.contains('r') ? 'r' : 'm';
      const W = inner.getBoundingClientRect().width, x0 = ev.clientX, a0 = e.start, b0 = e.end; let moved = false;
      el.setPointerCapture(ev.pointerId);
      el.onpointermove = m => { const dt = (m.clientX - x0) / W * S.dur; if (Math.abs(m.clientX - x0) > 3) moved = true; if (!moved) return;
        if (mode === 'm') { const len = b0 - a0; e.start = clamp(a0 + dt, 0, S.dur - len); e.end = e.start + len; }
        if (mode === 'l') e.start = clamp(a0 + dt, 0, e.end - .3); if (mode === 'r') e.end = clamp(b0 + dt, e.start + .3, S.dur);
        el.style.left = (e.start / S.dur * 100) + '%'; el.style.width = ((e.end - e.start) / S.dur * 100) + '%'; };
      el.onpointerup = () => { el.onpointermove = el.onpointerup = null; e.start = +e.start.toFixed(2); e.end = +e.end.toFixed(2);
        if (isEl) { S.selEl = e.id; S.sel = null; } else { S.sel = e.id; S.selEl = null; } main.win = null; main.v.currentTime = e.start; if (moved) vfxSave(); tlRender(); renderInsp(); };
    };
  });
}

function renderInsp() {
  const el = $('#inspbody'); if (!el || !S.clip) return;
  const pill = $('#pill'); if (pill) { pill.hidden = !S.dur; pill.textContent = `${fmt(S.dur || 0)} · ${(S.vfx || []).length} fx`; }
  if (S.selEl && (S.els || []).some(x => x.id === S.selEl)) return elInsp(el);
  const e = (S.vfx || []).find(x => x.id === S.sel);
  if (!e) {
    const row = (k, v) => `<div><span>${k}</span><b>${esc(v)}</b></div>`;
    el.innerHTML = `<h2>Your edit</h2><div class="props">${row('Clip', S.clip.name)}${row('Length', fmt(S.dur || 0) + (S.cuts.length ? ` (${S.cuts.length} cut${S.cuts.length > 1 ? 's' : ''})` : ''))}${row('Look', G(S.grade)[1] + (S.lut ? ' + ' + S.lut.name : ''))}${row('Font', F(S.font)[1])}${row('Captions', (CAPS.find(c => c[0] === S.caption) || [, 'none'])[1])}${row('Effects', S.vfx.length ? S.vfx.map(x => '/' + x.fx).join(', ') : 'none')}${row('Sound', [...S.snd].join(', ') || 'none')}</div>`;
    return;
  }
  const f = VFXN(e.fx);
  el.innerHTML = `<h2>/${esc(e.fx)}</h2><p class="help">${esc(f[1])}</p><div class="props">
    <div><span>Start</span><input type="number" step="0.1" min="0" data-k="start" value="${e.start}"></div>
    <div><span>End</span><input type="number" step="0.1" min="0" data-k="end" value="${e.end}"></div>
    ${f[2].map(([k, hint]) => `<div><span>${esc(k)}</span><input type="text" data-o="${esc(k)}" placeholder="${esc(hint)}" value="${esc(e.opts[k] ?? '')}"></div>`).join('')}</div>
    <div class="inspbtns"><button id="vplay">▶ Play it</button><button id="vcheck">Check frames</button><button id="vdel">Delete</button><button id="vdone">Done</button></div>
    <div class="fxcheck" id="vchk">${e.check ? `<img src="/shots/${encodeURIComponent(e.check)}" alt="Check frames">` : ''}</div>`;
  el.querySelectorAll('input[data-k]').forEach(i => i.onchange = () => { const v = +i.value; if (!Number.isFinite(v)) return;
    if (i.dataset.k === 'start') e.start = clamp(v, 0, e.end - .3); else e.end = clamp(v, e.start + .3, S.dur); vfxSave(); tlRender(); renderInsp(); });
  el.querySelectorAll('input[data-o]').forEach(i => i.onchange = () => { e.opts[i.dataset.o] = i.value; e.check = null; vfxSave(); });
  $('#vplay').onclick = () => { main.win = [e.start, e.end]; main.v.currentTime = e.start; main.v.play().catch(() => {}); $('#play').textContent = '❚❚'; setTimeout(() => { if (main.win && main.win[0] === e.start) main.win = null; }, (e.end - e.start) * 1000 * 2 + 400); };
  $('#vdel').onclick = () => { removeVfx(e.id); toast('Effect removed'); renderStep(); };
  $('#vdone').onclick = () => { S.sel = null; tlRender(); renderInsp(); };
  $('#vcheck').onclick = () => fxCheck(e);
}
async function fxCheck(e) {
  const box = $('#vchk'), say = m => { if (S.sel === e.id && $('#vchk')) $('#vchk').innerHTML = `<p class="help">${m}</p>`; };
  say('<span class="spin"></span> Drawing three frames of this effect... about a minute.');
  try {
    const r = await (await fetch('/api/fxcheck', { method: 'POST', body: JSON.stringify({ clip: S.clip.name, effect: vfxOut().find((x, k) => S.vfx[k].id === e.id) }) })).json();
    if (r.error) throw new Error(r.error);
    for (let i = 0; i < 90; i++) {
      await new Promise(res => setTimeout(res, 4000));
      const j = r.job ? await (await fetch('/api/job?id=' + encodeURIComponent(r.job))).json() : {};
      if (j.status === 'error') throw new Error(j.message);
      if (j.status === 'done' || (await fetch('/shots/' + encodeURIComponent(r.file), { method: 'HEAD' })).ok) { e.check = r.file; if (S.sel === e.id) renderInsp(); toast('Check frames ready'); return; }
      say(`<span class="spin"></span> Drawing three frames of this effect... ${(i + 1) * 4}s`);
    }
    throw new Error('Took too long. Check the Actions tab.');
  } catch (err) { say('Check failed: ' + esc(err.message || err)); }
}

/* ---------- chat: say what to change ---------- */
S.chat = [];
function renderChat() {
  const log = $('#chatlog'); if (!log) return;
  log.innerHTML = S.chat.length ? S.chat.map(m => `<div class="m ${m.role === 'user' ? 'me' : m.err ? 'err' : 'ai'}">${m.role === 'user' ? '<b>You:</b> ' : ''}${esc(m.text)}</div>`).join('')
    : '<div class="hint">Say what to change: "add a backdrop word CLAUDE when I say Claude", "bigger captions", "cut the first 2 seconds".</div>';
  log.scrollTop = log.scrollHeight;
  try { localStorage.setItem('studio-chat:' + S.clip.name, JSON.stringify(S.chat.slice(-30))); } catch {}
}
function chatCatalog() {
  return { effects: VFX.map(f => ({ id: f[0], does: f[1], options: f[2].map(o => `${o[0]}: ${o[1]}`) })),
    grades: GRADES.map(g => [g[0], g[1]]), fonts: FONTS.filter(f => f[0] !== 'custom').map(f => [f[0], f[1]]), font_families: allFamilies(), safe_zones: Object.keys(SAFE_ZONES), captions: CAPS.map(c => [c[0], c[1]]),
    caption_options: { x: 'left/right shift -40..40', width: 'text width 30..100 (%)', ls: 'letter spacing em', lh: 'line height', shadow: 'auto|soft|hard|glow|none', strokeColor: 'hex', boxAlpha: '0..1', radius: 'box corners 0..5', speed: 'animation speed 0.3..3', font: 'any font family', group: 'words at a time', size: 'text size (about 4 to 15)', weight: '400 to 900', y: 'height, % from top (keep 12 to 78)', upper: 'true/false', lower: 'true/false', stroke: 'outline width 0 to 1', box: 'true/false', boxColor: 'hex', anim: ANIMS.map(a => a[0]).join('|'), hl: HLS.map(h => h[0]).join('|'), align: 'left|center|right', color: 'hex', accent: 'hex highlight', offset: 'seconds shift', linger: 'seconds to hold' },
    animations: animLib().map(a => ({ id: a.id, name: a.name, seconds: a.dur, easing: a.ease || '' })), element_files: (ELFILES || []).map(f => f.file),
    element_looks: LOOKS_EL.map(l => l[0]), element_loops: LOOPS_EL.map(l => l[0]),
    hooks: HOOKS.map(h => [h[0], h[1]]), whole: WHOLE.map(w => [w[0], w[1]]), sounds: SOUNDS.map(s => [s[0], s[1]]), voice: Object.keys(VOICE) };
}
function chatState() {
  return { clip: S.clip.name, duration: +S.dur.toFixed(2), playhead: +(main ? main.v.currentTime : 0).toFixed(2), selected_effect: S.sel,
    effects: S.vfx.map(e => ({ id: e.id, fx: e.fx, start: e.start, end: e.end, opts: e.opts })),
    elements: (S.els || []).map(e => ({ id: e.id, file: e.file, start: e.start, end: e.end, x: e.x, y: e.y, w: e.w, rot: e.rot || 0, look: e.look, loop: e.loop, in: e.in, out: e.out })), selected_element: S.selEl,
    word_animations: S.wordAnims, font_pair: S.font === 'custom' ? S.fontPair : null, hook_edit: S.hookEdit, safe_zone: { zone: S.safe, keep_inside: S.safeLock }, grade: S.grade, lut: S.lut ? { name: S.lut.name, amount: S.lutAmount } : null, font: S.font, captions: S.caption, caption_options: S.capEdit, hook: S.hook,
    whole: [...S.whole], sounds: [...S.snd], voice: S.voice, cuts: S.cuts.map(c => [c.a, c.b]),
    beats: S.beats.map(b => ({ start: +b.t0.toFixed(2), end: +b.t1.toFixed(2), text: b.text })),
    transcript: S.words.map(w => `${w.word}@${w.start.toFixed(2)}`).join(' ') };
}
function applyOps(ops) {
  let n = 0; const opt = a => Object.fromEntries((a || []).filter(o => o && o.key).map(o => [o.key, o.value]));
  const val = v => v === 'true' ? true : v === 'false' ? false : v !== '' && v !== null && !isNaN(+v) && !/^#/.test(v) ? +v : v;
  for (const o of ops || []) {
    try {
      const e = S.vfx.find(x => x.id === (o.id || S.sel));
      switch (o.op) {
        case 'add_effect': if (addVfx(o.fx, o.start ?? undefined, o.end ?? undefined, opt(o.opts), true)) n++; break;
        case 'update_effect': if (e) { if (o.start != null) e.start = clamp(+o.start, 0, S.dur - .3); if (o.end != null) e.end = clamp(+o.end, e.start + .3, S.dur);
          if (e.end <= e.start) e.end = Math.min(S.dur, e.start + 2); Object.assign(e.opts, opt(o.opts)); e.check = null; S.sel = e.id; n++; } break;
        case 'remove_effect': if (e) { removeVfx(e.id); n++; } break;
        case 'select_effect': if (e) { S.sel = e.id; n++; } break;
        case 'set_grade': if (G(o.value)) { S.grade = o.value; n++; } break;
        case 'set_lut_amount': if (S.lut) { S.lutAmount = clamp(+o.value || 0, 0, 100); n++; } break;
        case 'set_font': if (FONTS.some(f => f[0] === o.value)) { S.font = o.value; S.capEdit.font = '@pair'; n++; } break;
        case 'set_captions': if (o.value === 'none') { S.caption = null; n++; } else if (CAPS.some(c => c[0] === o.value)) { S.caption = o.value; S.done.add(2); n++; } break;
        case 'caption_option': if (o.key) { S.capEdit[o.key] = val(o.value); if (!S.caption) S.caption = 'groups'; n++; } break;
        case 'set_hook': if (o.value === 'none') { S.hook = null; n++; } else if (HOOKS.some(h => h[0] === o.value)) { S.hook = o.value; n++; } break;
        case 'set_whole': S.whole = new Set(String(o.value || '').split(',').map(x => x.trim()).filter(x => WHOLE.some(w => w[0] === x))); n++; break;
        case 'set_sounds': S.snd = new Set(String(o.value || '').split(',').map(x => x.trim()).filter(x => SOUNDS.some(w => w[0] === x))); n++; break;
        case 'set_voice': if (VOICE[o.value]) { S.voice.preset = o.value; if (o.start != null) S.voice.amount = clamp(+o.start, 0, 100); applyVoice(); n++; } break;
        case 'cut': if (o.end > o.start) { addCut({ a: clamp(+o.start, 0, S.dur), b: clamp(+o.end, 0, S.dur), kind: 'manual', label: 'Cut' }, true); refreshLive(); saveCuts(); n++; } break;
        case 'restore_cuts': S.cuts = []; refreshLive(); saveCuts(); n++; break;
        case 'animate_words': if (animById(o.value) && o.end >= o.start) { setWordAnim(+o.start, +o.end, o.value); n++; } break;
        case 'clear_word_animations': S.wordAnims = (S.wordAnims || []).filter(r => o.start == null ? false : (r.b < +o.start || r.a > +o.end)); n++; break;
        case 'add_element': if ((ELFILES || []).some(f => f.file === o.value)) { const e = addEl(o.value, o.start ?? undefined, o.end ?? undefined, true); if (e) { Object.assign(e, elOpts(opt(o.opts))); n++; } } break;
        case 'update_element': { const x = S.els.find(q => q.id === (o.id || S.selEl)); if (x) { if (o.start != null) x.start = clamp(+o.start, 0, S.dur - .2); if (o.end != null) x.end = clamp(+o.end, x.start + .2, S.dur); Object.assign(x, elOpts(opt(o.opts))); S.selEl = x.id; S.sel = null; n++; } } break;
        case 'remove_element': { const x = S.els.find(q => q.id === (o.id || S.selEl)); if (x) { S.els = S.els.filter(q => q !== x); if (S.selEl === x.id) S.selEl = null; n++; } } break;
        case 'set_font_pair': if (allFamilies().includes(o.key) && allFamilies().includes(o.value)) { setFontPair(o.key, o.value, true); S.capEdit.font = '@pair'; n++; } break;
        case 'hook_option': if (['size', 'x', 'y', 'color', 'font'].includes(o.key)) { S.hookEdit[o.key] = ['color', 'font'].includes(o.key) ? o.value : +o.value; n++; } break;
        case 'set_safe_zone': if (SAFE_ZONES[o.value]) { const lock = o.key === 'lock' ? true : o.key === 'free' ? false : S.safeLock;
          if (lock !== S.safeLock) { if (o.value !== S.safe) S.safe = o.value; convertSafe(lock); S.safeLock = lock; } S.safe = o.value; S.safeShow = true; renderSafe(); n++; } break;
        case 'seek': if (o.start != null) { main.win = null; main.v.currentTime = clamp(+o.start, 0, S.dur); n++; } break;
      }
    } catch (err) { console.error('Edit failed', o, err); }
  }
  vfxSave(); renderStep(); txDraw(); return n;
}
let CHAT_BUSY = false;
async function sendChat(text) {
  text = String(text || '').trim(); if (!text || CHAT_BUSY || !S.clip) return;
  CHAT_BUSY = true; $('#chatsend').disabled = true; $('#chatsend').textContent = 'Thinking...';
  const history = S.chat.filter(m => !m.err).map(m => ({ role: m.role, text: m.text }));
  S.chat.push({ role: 'user', text }); renderChat(); $('#chatin').value = '';
  try {
    const r = await fetch('/api/chat', { method: 'POST', body: JSON.stringify({ message: text, state: chatState(), catalog: chatCatalog(), history }) });
    let d = await r.json(); if (d.error) throw new Error(d.error);
    if (d.pending) {   // no API key: Claude Code answers in GitHub Actions with the Claude login, so wait for it
      const t0 = Date.now();
      for (let i = 0; i < 100; i++) {
        await new Promise(res => setTimeout(res, 2500)); $('#chatsend').textContent = `Thinking ${Math.round((Date.now() - t0) / 1000)}s`;
        d = await (await fetch('/api/chat-result?id=' + encodeURIComponent(d.pending))).json();
        if (d.error) throw new Error(d.error); if (!d.pending) break; }
      if (d.pending) throw new Error('No answer after 4 minutes. Check the Actions tab on GitHub.');
    }
    const n = applyOps(d.ops);
    S.chat.push({ role: 'assistant', text: d.reply || (n ? `Done (${n} change${n > 1 ? 's' : ''}).` : 'No changes.') });
  } catch (e) { S.chat.push({ role: 'assistant', err: true, text: String(e.message || e) }); }
  CHAT_BUSY = false; $('#chatsend').disabled = false; $('#chatsend').textContent = 'Send'; renderChat();
}
$('#chatform').onsubmit = e => { e.preventDefault(); sendChat($('#chatin').value); };
$('#chatin').onkeydown = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat($('#chatin').value); } };
{ const SR = window.SpeechRecognition || window.webkitSpeechRecognition; let rec = null;
  if (!SR) $('#micbtn').hidden = true;
  else $('#micbtn').onclick = () => {
    if (rec) { rec.stop(); return; }
    rec = new SR(); rec.lang = navigator.language || 'en-US'; rec.interimResults = true; rec.continuous = false;
    const base = $('#chatin').value ? $('#chatin').value + ' ' : ''; let finalText = '';
    rec.onresult = ev => { let t = ''; for (const r of ev.results) { t += r[0].transcript; if (r.isFinal) finalText = base + t; } $('#chatin').value = base + t; };
    rec.onend = () => { $('#micbtn').classList.remove('on'); rec = null; if (finalText.trim()) sendChat(finalText); };
    rec.onerror = ev => { toast('Mic: ' + ev.error); };
    $('#micbtn').classList.add('on'); rec.start(); };
}
$('#previewbtn').onclick = () => { if (!main) return; main.win = null; S.mode = 'edit'; main.v.currentTime = 0; S.sound = true; main.v.muted = false; applyVoice(); $('#snd').textContent = '🔊'; main.v.play().catch(() => {}); $('#play').textContent = '❚❚'; };

/* ---------- animations: built-in + grabbed from reference reels, applied to caption words or elements ---------- */
S.anims = ANIM_BUILTIN.slice(); S.wordAnims = []; S.els = [];
async function loadAnims() {
  const extra = [];
  for (const u of ['animations.json', '/api/animations']) { try { const r = await fetch(u); if (r.ok) (await r.json()).forEach(a => a && Array.isArray(a.keys) && extra.push(a)); } catch {} }
  S.anims = ANIM_BUILTIN.concat(extra.filter((a, i) => !ANIM_BUILTIN.some(b => b.id === a.id) && extra.findIndex(b => b.id === a.id) === i));
}
const usedAnims = () => { const ids = new Set([...(S.wordAnims || []).map(r => r.anim), ...(S.els || []).flatMap(e => [e.in, e.out])]); return S.anims.filter(a => ids.has(a.id) && !ANIM_BUILTIN.some(b => b.id === a.id)); };
function setWordAnim(a, b, anim) {   // replace any animation on those words
  S.wordAnims = (S.wordAnims || []).filter(r => r.b < a - .01 || r.a > b + .01);
  if (anim) S.wordAnims.push({ a: +a.toFixed(2), b: +b.toFixed(2), anim }); S.wordAnims.sort((x, y) => x.a - y.a); vfxSave();
}
let ANIM_DEMO = [];
(function demoLoop(ts) {   // little looping demos on the animation cards
  ANIM_DEMO = ANIM_DEMO.filter(d => d.el.isConnected);
  ANIM_DEMO.forEach(d => { const a = animById(d.id); if (!a) return; const cyc = a.dur + .9, p = ((ts / 1000) % cyc) / a.dur; d.el.style.cssText = 'display:inline-block;' + animCss(animAt(a, Math.min(1, p))); });
  requestAnimationFrame(demoLoop); })(0);
function animCards(onPick, current) {
  return `<div class="animgrid">${animLib().map(a => `<button class="animc${a.id === current ? ' on' : ''}" data-anim="${esc(a.id)}"><div class="animstage"><span class="animdemo" data-demo="${esc(a.id)}">Aa</span></div><b>${esc(a.name)}</b><small>${a.dur.toFixed(2)} s${a.from ? ' · grabbed' : ''}</small></button>`).join('')}</div>`;
}
function wireAnimCards(box, onPick) {
  box.querySelectorAll('[data-demo]').forEach(el => ANIM_DEMO.push({ el, id: el.dataset.demo }));
  box.querySelectorAll('[data-anim]').forEach(b => b.onclick = () => onPick(b.dataset.anim));
}
function animPanel(body) {
  const W = S.words || [], sel = S.wsel, inSel = i => sel && i >= Math.min(...sel) && i <= Math.max(...sel);
  const animOf = w => wordAnimFor(w);
  body.innerHTML = `<h3>Caption words</h3><div class="wchips">${W.map((w, i) => `<button class="wchip${inSel(i) ? ' sel' : ''}${animOf(w) ? ' anim' : ''}" data-w="${i}" title="${w.start.toFixed(2)}s${animOf(w) ? ' · ' + esc(animOf(w).anim) : ''}">${esc(w.word)}</button>`).join('') || '<p class="help">No transcript yet.</p>'}</div>
    <div class="row">${sel ? `<span class="help">${Math.abs(sel[1] - sel[0]) + 1} word(s) picked. Tap an animation below.</span><button id="wclear">Remove their animation</button><button id="wnone">Unpick</button>` : '<span class="help">Tap a word, then another to pick a run of words.</span>'}</div>
    ${!S.caption ? '<p class="help">Captions are off: pick a caption style on Captions so the words show.</p>' : ''}
    <h3>Animations</h3>${animCards()}<div class="row"><button id="grabmore">Grab one from a reference reel</button></div>
    ${(S.wordAnims || []).length ? `<h3>Animated words</h3><div class="sum">${S.wordAnims.map((r, k) => `<div><span>${esc(W.filter(w => w.start >= r.a - .01 && w.start <= r.b + .01).map(w => w.word).join(' ') || r.a + 's')}</span><b>${esc((animById(r.anim) || { name: r.anim }).name)} <button data-rm="${k}">×</button></b></div>`).join('')}</div>` : ''}`;
  body.querySelectorAll('[data-w]').forEach(b => b.onclick = () => { const i = +b.dataset.w; S.wsel = !S.wsel || S.wsel[0] !== S.wsel[1] ? [i, i] : [S.wsel[0], i];
    main.win = null; main.v.currentTime = W[i].start; renderStep(); });
  wireAnimCards(body, id => {
    const el = S.selEl && S.els.find(x => x.id === S.selEl);
    if (S.wsel) { const [i0, i1] = [Math.min(...S.wsel), Math.max(...S.wsel)]; setWordAnim(W[i0].start, W[i1].start, id); main.win = null; main.v.currentTime = Math.max(0, W[i0].start - .3); main.v.play().catch(() => {}); $('#play').textContent = '❚❚'; toast('Animated ' + (i1 - i0 + 1) + ' word(s)'); }
    else if (el) { el.in = id; vfxSave(); toast('Comes in with ' + animById(id).name); }
    else return toast('Pick caption words first, or select an element');
    renderStep(); });
  $('#wclear') && ($('#wclear').onclick = () => { const [i0, i1] = [Math.min(...S.wsel), Math.max(...S.wsel)]; setWordAnim(W[i0].start, W[i1].start, null); renderStep(); });
  $('#wnone') && ($('#wnone').onclick = () => { S.wsel = null; renderStep(); });
  body.querySelectorAll('[data-rm]').forEach(b => b.onclick = () => { S.wordAnims.splice(+b.dataset.rm, 1); vfxSave(); renderStep(); });
  $('#grabmore').onclick = () => $('#ingestbtn').click();
}

/* ---------- elements: uploaded images on the video ---------- */
let ELFILES = [];
async function loadEls() { try { ELFILES = await (await fetch('/api/elements')).json(); } catch { ELFILES = []; } }
function elOpts(o) {
  const out = {}, n = (k, a, b) => { if (o[k] != null && o[k] !== '' && !isNaN(+o[k])) out[k] = clamp(+o[k], a, b); };
  n('x', 0, 100); n('y', 0, 100); n('w', 3, 120); n('rot', -180, 180);
  if (LOOKS_EL.some(l => l[0] === o.look)) out.look = o.look; if (LOOPS_EL.some(l => l[0] === o.loop)) out.loop = o.loop;
  ['in', 'out'].forEach(k => { if (o[k] === 'none') out[k] = null; else if (o[k] && animById(o[k])) out[k] = o[k]; });
  return out;
}
function addEl(file, start, end, quiet) {
  if (!S.dur) return null; let a = start ?? (main ? main.v.currentTime : 0); a = clamp(a, 0, Math.max(0, S.dur - .5));
  const e = { id: vfxId(), file, start: +a.toFixed(2), end: +clamp(end ?? a + 3, a + .3, S.dur).toFixed(2), x: 50, y: 38, w: 44, rot: 0, look: 'shadow', loop: 'none', in: 'pop', out: 'fade' };
  S.els.push(e); S.selEl = e.id; S.sel = null; vfxSave(); if (!quiet) { toast('Element added. Drag it on the video to place it.'); renderStep(); } return e;
}
function elPanel(body) {
  body.innerHTML = `<div class="row"><input type="file" id="elfile" accept="image/*" multiple hidden><button class="primary" id="elup">Upload images</button></div>
    <div id="elmsg" class="help"></div><div class="elgrid">${ELFILES.map(f => `<button class="elt" data-file="${esc(f.file)}" style="background-image:url('/shots/${encodeURIComponent(f.file)}')"><b>${esc(f.file.replace(/^el-/, ''))}</b></button>`).join('') || '<p class="help">Nothing uploaded yet.</p>'}</div>
    ${(S.els || []).length ? `<h3>On this video</h3><div class="sum">${S.els.map(e => `<div><span>${esc(e.file.replace(/^el-/, ''))}</span><b>${e.start.toFixed(1)}–${e.end.toFixed(1)}s <button data-pick="${e.id}">Edit</button></b></div>`).join('')}</div>` : ''}`;
  $('#elup').onclick = () => $('#elfile').click();
  $('#elfile').onchange = async ev => { const files = [...ev.target.files]; for (const f of files) { $('#elmsg').textContent = 'Uploading ' + f.name + '...';
      try { const named = new File([f], 'el-' + f.name, { type: f.type }); const r = await sendAsset(named); if (r.error) throw new Error(r.error); } catch (e) { $('#elmsg').textContent = 'Upload failed: ' + (e.message || e); return; } }
    await loadEls(); toast(files.length + ' uploaded'); renderStep(); };
  body.querySelectorAll('[data-file]').forEach(b => b.onclick = () => addEl(b.dataset.file));
  body.querySelectorAll('[data-pick]').forEach(b => b.onclick = () => { S.selEl = b.dataset.pick; S.sel = null; renderStep(); });
}
function elInsp(box) {
  const e = S.els.find(x => x.id === S.selEl), opt = (list, v) => list.map(([k, n]) => `<option value="${k}"${k === v ? ' selected' : ''}>${esc(n)}</option>`).join('');
  const anims = v => `<option value="none">None</option>` + animLib().map(a => `<option value="${esc(a.id)}"${a.id === v ? ' selected' : ''}>${esc(a.name)}</option>`).join('');
  box.innerHTML = `<h2>${esc(e.file.replace(/^el-/, ''))}</h2><p class="help">Drag on the video to move it.</p><div class="props">
    <div><span>Start</span><input type="number" step="0.1" data-n="start" value="${e.start}"></div><div><span>End</span><input type="number" step="0.1" data-n="end" value="${e.end}"></div>
    <div><span>Size</span><input type="range" min="5" max="110" data-n="w" value="${e.w}"></div><div><span>Rotate</span><input type="range" min="-45" max="45" data-n="rot" value="${e.rot || 0}"></div>
    <div><span>Look</span><select data-s="look">${opt(LOOKS_EL, e.look)}</select></div><div><span>Motion</span><select data-s="loop">${opt(LOOPS_EL, e.loop)}</select></div>
    <div><span>Comes in</span><select data-s="in">${anims(e.in)}</select></div><div><span>Goes out</span><select data-s="out">${anims(e.out)}</select></div></div>
    <div class="inspbtns"><button id="eplay">▶ Play it</button><button id="edel">Delete</button><button id="edone">Done</button></div>`;
  box.querySelectorAll('[data-n]').forEach(i => i.oninput = () => { const k = i.dataset.n, v = +i.value; if (!Number.isFinite(v)) return;
    if (k === 'start') e.start = clamp(v, 0, e.end - .2); else if (k === 'end') e.end = clamp(v, e.start + .2, S.dur); else e[k] = v; vfxSave(); if (k === 'start' || k === 'end') tlRender(); });
  box.querySelectorAll('[data-s]').forEach(i => i.onchange = () => { e[i.dataset.s] = i.value === 'none' ? null : i.value; vfxSave(); });
  $('#eplay').onclick = () => { main.win = null; main.v.currentTime = e.start; main.v.play().catch(() => {}); $('#play').textContent = '❚❚'; };
  $('#edel').onclick = () => { S.els = S.els.filter(x => x !== e); S.selEl = null; vfxSave(); renderStep(); };
  $('#edone').onclick = () => { S.selEl = null; tlRender(); renderInsp(); };
}
// drag the selected element on the preview
$('#main').addEventListener('pointerdown', ev => {
  const e = S.selEl && (S.els || []).find(x => x.id === S.selEl); if (!e) return;
  const r = $('#main').getBoundingClientRect(), mv = m => { e.x = +clamp((m.clientX - r.left) / r.width * 100, 0, 100).toFixed(1); e.y = +clamp((m.clientY - r.top) / r.height * 100, 0, 100).toFixed(1); };
  const t = main.v.currentTime; if (t < e.start || t > e.end) { main.v.currentTime = Math.min(e.end - .05, e.start + 1); }
  mv(ev); $('#main').setPointerCapture(ev.pointerId); ev.preventDefault();
  $('#main').onpointermove = mv; $('#main').onpointerup = () => { $('#main').onpointermove = $('#main').onpointerup = null; vfxSave(); };
});

/* ---------- grab an animation from a reference reel (ingest screen) ---------- */
function openGrab(r, card) {
  card.querySelector('.grab')?.remove();
  const g = document.createElement('div'); g.className = 'grab'; card.appendChild(g);
  g.innerHTML = `<h4>Grab an animation</h4><p class="help">Play to the move, set start just before it and end after it settles, then drag a box around the thing that moves (leave some background around it).</p>
    <div class="gwrap"><video playsinline muted preload="auto" crossorigin="anonymous" src="${esc(r.src)}"></video><div class="gbox" hidden></div></div>
    <div class="row"><button data-g="play">▶</button><input type="range" data-g="scrub" min="0" max="1000" value="0"><span class="help" data-g="t">0.00s</span></div>
    <div class="row"><button data-g="a">Start here</button><button data-g="b">End here</button><span class="help" data-g="ab">Start –, end –</span></div>
    <div class="row"><input type="text" data-g="name" placeholder="Name, e.g. red word pop"><select data-g="kind"><option value="auto">Guess</option><option value="in">It appears</option><option value="out">It leaves</option></select><button class="primary" data-g="go">Grab</button></div>
    <div class="help" data-g="msg"></div>`;
  const v = g.querySelector('video'), wrap = g.querySelector('.gwrap'), bx = g.querySelector('.gbox'), q = k => g.querySelector(`[data-g="${k}"]`);
  let A = null, B = null, box = null;
  v.onloadedmetadata = () => { wrap.style.aspectRatio = v.videoWidth + '/' + v.videoHeight; };
  v.ontimeupdate = () => { q('t').textContent = v.currentTime.toFixed(2) + 's'; q('scrub').value = 1000 * v.currentTime / (v.duration || 1); };
  q('play').onclick = () => { v.paused ? v.play() : v.pause(); q('play').textContent = v.paused ? '▶' : '❚❚'; };
  q('scrub').oninput = e => { v.currentTime = e.target.value / 1000 * (v.duration || 0); };
  const ab = () => q('ab').textContent = `Start ${A == null ? '–' : A.toFixed(2) + 's'}, end ${B == null ? '–' : B.toFixed(2) + 's'}${A != null && B != null ? ` (${(B - A).toFixed(2)} s)` : ''}`;
  q('a').onclick = () => { A = v.currentTime; ab(); }; q('b').onclick = () => { B = v.currentTime; ab(); };
  wrap.onpointerdown = ev => { ev.preventDefault(); const rc = wrap.getBoundingClientRect(), p0 = [(ev.clientX - rc.left) / rc.width, (ev.clientY - rc.top) / rc.height];
    wrap.setPointerCapture(ev.pointerId);
    wrap.onpointermove = m => { const p1 = [clamp((m.clientX - rc.left) / rc.width, 0, 1), clamp((m.clientY - rc.top) / rc.height, 0, 1)];
      box = [Math.min(p0[0], p1[0]), Math.min(p0[1], p1[1]), Math.abs(p1[0] - p0[0]), Math.abs(p1[1] - p0[1])];
      Object.assign(bx.style, { left: box[0] * 100 + '%', top: box[1] * 100 + '%', width: box[2] * 100 + '%', height: box[3] * 100 + '%' }); bx.hidden = false; };
    wrap.onpointerup = () => { wrap.onpointermove = wrap.onpointerup = null; }; };
  q('go').onclick = async () => {
    if (A == null || B == null || B <= A) return q('msg').textContent = 'Set the start and the end first.';
    if (!box || box[2] < .02 || box[3] < .02) return q('msg').textContent = 'Drag a box around the thing that moves.';
    q('go').disabled = true; q('msg').innerHTML = '<span class="spin"></span> Grabbing... about a minute.';
    try {
      const d = await (await fetch('/api/anim-grab', { method: 'POST', body: JSON.stringify({ source: r.name, ref: r.id, name: q('name').value.trim() || 'grabbed', start: A, end: B, box, kind: q('kind').value }) })).json();
      if (d.error) throw new Error(d.error);
      for (let i = 0; i < 90; i++) { await new Promise(res => setTimeout(res, 3000));
        const j = await (await fetch('/api/job?id=' + encodeURIComponent(d.job))).json();
        if (j.status === 'error') throw new Error(j.message);
        if (j.status === 'done') { await loadAnims(); const a = animById(d.id);
          q('msg').innerHTML = `Saved <b>${esc(a ? a.name : d.id)}</b>${a ? ` · ${a.dur.toFixed(2)} s · ${esc(a.ease || '')}` : ''}. It's in Animate now.<br><img class="sheet" src="/shots/anim-${encodeURIComponent(d.id)}.jpg">`; break; }
        q('msg').innerHTML = `<span class="spin"></span> Grabbing... ${(i + 1) * 3}s`; }
    } catch (e) { q('msg').textContent = 'Grab failed: ' + (e.message || e); }
    q('go').disabled = false; };
}
loadAnims(); loadEls();

/* ---------- your fonts: uploaded .ttf/.otf/.woff/.woff2, usable as the font pair and in the caption editor ---------- */
let MYFONTS = [];
const fontFamilyFromFile = n => n.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/["'\\<>;{}]/g, '').trim().slice(0, 60) || 'My font';
function addFontFace(f) {   // one face covering every weight, so bold captions use the real font instead of a faked bold
  if (document.fonts && ![...document.fonts].some(x => x.family.replace(/"/g, '') === f.family)) {
    const ff = new FontFace(f.family, `url(/fontfiles/${encodeURIComponent(f.file)})`, { weight: '100 900' });
    document.fonts.add(ff); ff.load().catch(() => toast(`Font "${f.family}" did not load`)); }
  const id = 'up:' + f.id;
  if (!FONTS.some(x => x[0] === id)) FONTS.push([id, f.family + ' (yours)', `"${f.family}"`, `"${f.family}"`]);
  if (!CAP_FONTS.includes(f.family)) CAP_FONTS.push(f.family);
}
async function loadFonts() { try { MYFONTS = await (await fetch('/api/fonts')).json(); } catch { MYFONTS = []; } MYFONTS.forEach(addFontFace); }
const usedFonts = () => MYFONTS.filter(f => S.font === 'up:' + f.id || (S.capEdit && S.capEdit.font === f.family) || (S.font === 'custom' && S.fontPair && [S.fontPair.cap, S.fontPair.title].includes(f.family)) || (S.hookEdit && S.hookEdit.font === f.family));
async function sendFont(file) {
  const name = cleanName(file.name);
  if (CFG.blob) { const { upload } = await import('https://esm.sh/@vercel/blob@0.27.3/client');
    await upload('fonts/' + name, file, { access: 'public', handleUploadUrl: '/api/blob-token', contentType: file.type || 'font/' + name.split('.').pop().toLowerCase() }); return { file: name }; }
  return (await fetch('/api/font-upload?name=' + encodeURIComponent(name), { method: 'POST', body: file })).json();
}
function fontUploads(body) {
  body.insertAdjacentHTML('beforeend', `<h3>Your fonts</h3><div class="myfonts">${MYFONTS.map(f => `<div class="myfont"><span style="font-family:'${esc(f.family)}'">${esc(f.family)}</span><button data-use="${esc(f.id)}">Use</button><button data-del="${esc(f.id)}">×</button></div>`).join('') || '<p class="help">None yet. Upload .ttf, .otf, .woff or .woff2 files you have the rights to use.</p>'}</div>
    <div class="row"><input type="file" id="fontfile" accept=".ttf,.otf,.woff,.woff2" multiple hidden><button id="fontup">Upload fonts</button><span class="help" id="fontmsg"></span></div>
    <h3>All fonts</h3>${[...new Set(GFONTS.map(f => f[2]))].map(cat => `<div class="fcat"><small>${esc(cat)}</small><div class="fpick">${FONTS.filter(f => f[4] === cat).map(f => `<button class="${S.font === f[0] ? 'on' : ''}" data-gf="${f[0]}" style="font-family:${esc(f[2])}">${esc(f[1])}</button>`).join('')}</div></div>`).join('')}
    <h3>Make your own pair</h3><div class="capedit pairpick"><label>Captions font<select id="pcap">${pairOpts(S.fontPair?.cap || 'Montserrat')}</select></label><label>Titles font<select id="ptitle2">${pairOpts(S.fontPair?.title || 'Bebas Neue')}</select></label></div>
    <div class="row"><button class="${S.font === 'custom' ? 'primary' : ''}" id="puse">${S.font === 'custom' ? 'Using this pair' : 'Use this pair'}</button><span class="help">Captions use the first; hook titles and effect text use the second.</span></div>
    <h3>Font pairs</h3>`);
  $('#puse').onclick = () => { setFontPair($('#pcap').value, $('#ptitle2').value); S.done.add(1); S.capEdit.font = '@pair'; renderStep(); };
  ['#pcap', '#ptitle2'].forEach(k => $(k).onchange = () => { if (S.font === 'custom') { setFontPair($('#pcap').value, $('#ptitle2').value); renderStep(); } });
  body.querySelectorAll('[data-gf]').forEach(b => b.onclick = () => { S.font = b.dataset.gf; S.done.add(1); S.capEdit.font = '@pair'; toast('Font: ' + F(S.font)[1]); renderStep(); });
  $('#fontup').onclick = () => $('#fontfile').click();
  $('#fontfile').onchange = async ev => {
    for (const file of [...ev.target.files]) {
      const msg = m => $('#fontmsg') && ($('#fontmsg').textContent = m), family = fontFamilyFromFile(file.name);
      if (!/\.(ttf|otf|woff2?)$/i.test(file.name)) { msg(file.name + ' is not a font file'); continue; }
      try { await new FontFace('check-' + Date.now(), await file.arrayBuffer()).load(); } catch { msg(file.name + ' could not be read as a font'); continue; }
      msg('Uploading ' + file.name + '...');
      try { const r = await sendFont(file); if (r.error) throw new Error(r.error);
        const reg = await (await fetch('/api/font-register', { method: 'POST', body: JSON.stringify({ file: r.file || cleanName(file.name), family }) })).json(); if (reg.error) throw new Error(reg.error);
        msg('Added ' + family);
      } catch (e) { msg('Upload failed: ' + (e.message || e)); return; }
    }
    await loadFonts(); renderStep(); };
  body.querySelectorAll('[data-use]').forEach(b => b.onclick = () => { S.font = 'up:' + b.dataset.use; S.done.add(1); S.capEdit.font = '@pair'; toast('Font: ' + F(S.font)[1]); renderStep(); });
  body.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => { if (!confirm('Remove this font from the list?')) return;
    await fetch('/api/font-delete', { method: 'POST', body: JSON.stringify({ id: b.dataset.del }) }); const id = 'up:' + b.dataset.del;
    const i = FONTS.findIndex(x => x[0] === id); if (i >= 0) FONTS.splice(i, 1); if (S.font === id) S.font = 'inter'; await loadFonts(); renderStep(); });
}
loadFonts();

/* ---------- custom font pair: one font for captions, one for titles ---------- */
S.fontPair = null; S.hookEdit = {};
const allFamilies = () => [...new Set([...CAP_FONTS, ...MYFONTS.map(f => f.family)])];
const pairOpts = v => allFamilies().map(f => `<option${f === v ? ' selected' : ''} style="font-family:'${esc(f)}'">${esc(f)}</option>`).join('');
function setFontPair(cap, title, quiet) {
  S.fontPair = { cap, title }; const i = FONTS.findIndex(x => x[0] === 'custom');
  const e = ['custom', `${cap} + ${title}`, `"${cap}"`, `"${cap}"`, undefined, `"${title}"`];
  if (i >= 0) FONTS[i] = e; else FONTS.push(e); S.font = 'custom'; if (!quiet) toast('Font pair: ' + e[1]);
}

/* ---------- hook title: size, place, colour and font on top of the chosen title style ---------- */
function hookEditor(body) {
  if (!$('#body') || S.beat !== 0 || !S.hook || $('#hookedit')) return;
  const he = S.hookEdit, rng = (k, min, max, step, label, def) => `<label>${label} <b id="hv-${k}">${he[k] ?? def}</b><input type="range" data-h="${k}" min="${min}" max="${max}" step="${step}" value="${he[k] ?? def}"></label>`;
  const grid = [...body.querySelectorAll('h3')].find(h => /Hook title/.test(h.textContent));
  (grid || body).insertAdjacentHTML(grid ? 'beforebegin' : 'beforeend', `<div id="hookedit"><h3>Edit the hook title</h3><div class="capedit">
    ${rng('size', .4, 2, .05, 'Size', 1)}${rng('x', -40, 40, 1, 'Left / right', 0)}${rng('y', -30, 50, 1, 'Up / down', 0)}
    <label>Colour<input type="color" data-h="color" value="${he.color || '#ffffff'}"></label>
    <label>Font<select data-h="font"><option value="">Titles font</option>${pairOpts(he.font)}</select></label></div>
    <div class="row"><button id="hreset">Reset</button><span class="help">Or drag the title on the video.</span></div></div>`);
  body.querySelectorAll('[data-h]').forEach(el => el.oninput = () => { const k = el.dataset.h; he[k] = el.type === 'range' ? +el.value : el.value || null; const b = $('#hv-' + k); if (b) b.textContent = el.value; });
  $('#hreset').onclick = () => { S.hookEdit = {}; renderStep(); };
}

/* ---------- safe zones: guides on the preview, and "keep everything inside" ---------- */
S.safe = 'all'; S.safeShow = false; S.safeLock = false;
try { const v = JSON.parse(localStorage.getItem('studio-safe') || 'null'); if (v) { S.safe = SAFE_ZONES[v.safe] ? v.safe : 'all'; S.safeShow = !!v.show; } } catch {}
function renderSafe() {
  const sel = $('#safesel'); if (!sel) return;
  sel.innerHTML = Object.entries(SAFE_ZONES).map(([k, z]) => `<option value="${k}"${k === S.safe ? ' selected' : ''}>${z.name}</option>`).join('');
  $('#safeshow').checked = S.safeShow; $('#safelock').checked = S.safeLock;
  const m = $('#main'); if (!m) return; let ov = $('#safeov'); if (!ov) { ov = document.createElement('div'); ov.id = 'safeov'; m.appendChild(ov); }
  const z = SAFE_ZONES[S.safe]; ov.hidden = !S.safeShow;
  ov.innerHTML = `<div class="sz-shade" style="left:0;right:0;top:0;height:${z.t}%"></div><div class="sz-shade" style="left:0;right:0;bottom:0;height:${z.b}%"></div>
    <div class="sz-shade" style="left:0;width:${z.l}%;top:${z.t}%;bottom:${z.b}%"></div><div class="sz-shade" style="right:0;width:${z.r}%;top:${z.t}%;bottom:${z.b}%"></div>
    <div class="sz-box" style="left:${z.l}%;right:${z.r}%;top:${z.t}%;bottom:${z.b}%"><span>${esc(z.name)} safe zone</span></div>`;
  try { localStorage.setItem('studio-safe', JSON.stringify({ safe: S.safe, show: S.safeShow })); } catch {}
}
// switching "keep inside" on or off converts positions, so nothing jumps
function convertSafe(toLock) {
  const z = SAFE_ZONES[S.safe], hz = 100 - z.t - z.b, wz = 100 - z.l - z.r;
  const toRel = (v, a, span) => clamp((v - a) / span * 100, 0, 100);
  if (S.caption && S.caption !== 'cinematic') { const y = capOpts(S.caption, S.capEdit).y; S.capEdit.y = Math.round(toLock ? toRel(y, z.t, hz) : clamp(z.t + y * hz / 100, 12, 76)); }
  (S.els || []).forEach(e => { if (toLock) { e.x = +toRel(e.x, z.l, wz).toFixed(1); e.y = +toRel(e.y, z.t, hz).toFixed(1); e.w = Math.min(e.w, 100); }
    else { e.x = +(z.l + e.x * wz / 100).toFixed(1); e.y = +(z.t + e.y * hz / 100).toFixed(1); } });
}
$('#safesel').onchange = e => { S.safe = e.target.value; S.safeShow = true; renderSafe(); renderStep(); };
$('#safeshow').onchange = e => { S.safeShow = e.target.checked; renderSafe(); };
$('#safelock').onchange = e => { convertSafe(e.target.checked); S.safeLock = e.target.checked; if (S.safeLock) S.safeShow = true; vfxSave(); renderSafe(); renderStep();
  toast(S.safeLock ? 'Captions, titles and elements now stay inside the ' + SAFE_ZONES[S.safe].name + ' safe zone' : 'Free positioning'); };
const _build = build; build = function () { _build(); renderSafe(); };

/* ---------- drag captions (Captions step) or the hook title (hook beat) on the preview ---------- */
$('#main').addEventListener('pointerdown', ev => {
  if (S.selEl && (S.els || []).some(x => x.id === S.selEl)) return;   // elements have their own drag
  const step = !S.panel && STEPS[S.step][0], r = $('#main').getBoundingClientRect();
  const px = e => clamp((e.clientX - r.left) / r.width * 100, 0, 100), py = e => clamp((e.clientY - r.top) / r.height * 100, 0, 100);
  let mv;
  if (step === 'captions' && S.caption && S.caption !== 'cinematic') {
    const z = SAFE_ZONES[S.safe];
    mv = e => { const y = py(e), x = px(e); S.capEdit.y = Math.round(S.safeLock ? clamp((y - z.t) / (100 - z.t - z.b) * 100, 0, 100) : clamp(y - 3, 12, 76)); S.capEdit.x = Math.round(clamp(x - 50, -40, 40)); };
  } else if (step === 'beats' && S.beat === 0 && S.hook) {
    const x0 = px(ev), y0 = py(ev), hx = +S.hookEdit.x || 0, hy = +S.hookEdit.y || 0;
    mv = e => { S.hookEdit.x = Math.round(clamp(hx + px(e) - x0, -40, 40)); S.hookEdit.y = Math.round(clamp(hy + py(e) - y0, -30, 50)); };
    main.v.currentTime = Math.min(S.beats[0].t0 + 1, S.beats[0].t1 - .05);
  } else return;
  ev.preventDefault(); mv(ev); $('#main').setPointerCapture(ev.pointerId);
  $('#main').onpointermove = mv; $('#main').onpointerup = () => { $('#main').onpointermove = $('#main').onpointerup = null; renderStep(); };
});
