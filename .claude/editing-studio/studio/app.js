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
    this.v = el.querySelector('video'); this.ov = el.querySelector('.ov'); this.v.src = S.clip.proxy; this.vis = true; this.last = ''; this.lastT = 0;
    if (!main) { new IntersectionObserver(e => { this.vis = e[0].isIntersecting; this.vis ? this.v.play().catch(() => {}) : this.v.pause(); }).observe(el); this.v.loop = false; this.v.play().catch(() => {}); }
    stages.add(this); }
  destroy() { stages.delete(this); this.v.removeAttribute('src'); this.v.load(); }
  tick() {
    if (!this.vis) return; const v = this.v; let t = v.currentTime; const [a, b] = this.win || [0, S.dur || v.duration || 1];
    if (!this.main || this.win) { if (t >= b - .02 || t < a - .3) { v.currentTime = a; t = a; if (v.paused && !this.main) v.play().catch(() => {}); } }
    if (this.main && !this.win && v.ended) { v.currentTime = 0; }
    const cfg = this.cfg(), raw = this.main && S.mode === 'raw', f = compose(t, cfg, raw);
    v.style.filter = f.filter; v.style.transform = `scale(${f.scale})`; this.el.style.setProperty('--hf', f.font);
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
function baseCfg() { return { grade: S.grade, font: S.font, caption: S.caption, hook: S.hook, fx: S.fx, whole: S.whole }; }
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
function show(w) { $('#empty').hidden = w !== 'empty'; $('#studio').hidden = w !== 'studio'; }
function setMsg(m, err) { const e = $('#msg'); e.textContent = m; e.className = 'msg' + (err ? ' err' : ''); }

function load(c) {
  if (S.clip?.name === c.name && S.clip.proxy === c.proxy && main) { show('studio'); return; }
  S.clip = c; S.words = c.words;
  const probe = document.createElement('video'); probe.preload = 'metadata'; probe.src = c.proxy;
  probe.onloadedmetadata = () => { S.dur = probe.duration; S.beats = makeBeats(S.words, S.dur); S.fx = {}; S.beats.forEach((_, i) => S.fx[i] = []);
    S.caption = null; S.hook = null; S.whole = new Set(); S.snd = new Set(); S.done = new Set(); S.step = 0; S.beat = 0; show('studio'); build(); renderStep(); };
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
  if (id === 'colours') { grid(); GRADES.forEach((g, i) => card(i, g[1], () => { S.grade = g[0]; S.done.add(0); toast('Grade: ' + g[1]); renderStep(); }, () => ({ ...baseCfg(), grade: g[0] }), w0, S.grade === g[0])); }
  if (id === 'fonts') { grid(); FONTS.forEach((f, i) => card(i, f[1], () => { S.font = f[0]; S.done.add(1); toast('Font: ' + f[1]); renderStep(); }, () => ({ ...baseCfg(), font: f[0], caption: S.caption || 'groups' }), w0, S.font === f[0])); }
  if (id === 'captions') { grid(); CAPS.forEach((c, i) => card(i, c[1], () => { S.caption = c[0]; S.done.add(2); toast(`Synced captions to ${S.words.length} words`); renderStep(); }, () => ({ ...baseCfg(), caption: c[0] }), w0, S.caption === c[0])); }
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
      if (d.error) { $('#shotmsg').textContent = d.error; return; } b.shot = d.file; b.shotUrl = u; toast('Screenshot saved'); renderStep(); }; }
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
function styleObj(name) { return { name, clip: S.clip.name, grade: S.grade, font: S.font, caption: S.caption, hook: S.hook, dur: +S.dur.toFixed(2),
  beats: S.beats.map((b, i) => ({ start: +b.t0.toFixed(2), end: +b.t1.toFixed(2), text: b.text, effects: S.fx[i], shot: b.shot || null, shotUrl: b.shotUrl || null })), whole: [...S.whole], sounds: [...S.snd] }; }
function renderWatch(body) {
  const row = (k, v) => `<div><b>${k}</b><span>${esc(v || 'not picked')}</span></div>`;
  body.innerHTML = `<div class="sum">${row('Colour', G(S.grade)[1])}${row('Font', F(S.font)[1])}${row('Captions', (CAPS.find(c => c[0] === S.caption) || [])[1])}${row('Hook', (HOOKS.find(h => h[0] === S.hook) || [])[1])}` +
    S.beats.slice(1).map((b, i) => row('Beat ' + (i + 2), S.fx[i + 1].map(x => FX.find(f => f[0] === x)[1]).join(', ') || 'Just you')).join('') +
    `${row('Whole clip', [...S.whole].join(', '))}${row('Sound', [...S.snd].join(', '))}</div>
    <h3>Save as my style</h3><div class="row"><input type="text" id="sname" placeholder="Style name, e.g. split-card-reels"><button class="primary" id="ssave">Save style</button></div>
    <p class="help">Saved to <code>editing-studio/styles/</code>. The final render happens when you ask Claude to edit this clip in this style (guide chapter 6).</p>`;
  $('#ssave').onclick = async () => { const n = $('#sname').value.trim(); if (!n) return toast('Name your style first');
    const r = await (await fetch('/save', { method: 'POST', body: JSON.stringify(styleObj(n)) })).json(); toast('Saved ' + r.saved); S.done.add(5); mark(); };
}

/* ---------- wiring ---------- */
async function upload(file) {
  setMsg(`Uploading ${file.name}...`); show('empty');
  const r = await fetch('/api/upload?name=' + encodeURIComponent(file.name), { method: 'POST', body: file });
  const d = await r.json(); if (d.error) return setMsg(d.error, true); S.clip = null; refresh(d.name);
}
$('#pick').onclick = () => $('#file').click(); $('#addbtn').onclick = () => { show('empty'); setMsg(''); };
$('#file').onchange = e => e.target.files[0] && upload(e.target.files[0]);
const drop = $('#drop');
['dragover', 'dragenter'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('over'); }));
['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('over'); }));
drop.addEventListener('drop', e => e.dataTransfer.files[0] && upload(e.dataTransfer.files[0]));
$('#linkform').onsubmit = async e => { e.preventDefault(); setMsg('Fetching from the link...');
  const d = await (await fetch('/api/import', { method: 'POST', body: JSON.stringify({ url: $('#linkurl').value.trim() }) })).json();
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
refresh();

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
