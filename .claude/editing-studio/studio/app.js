'use strict';
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const ease = x => 1 - Math.pow(1 - clamp(x, 0, 1), 3);

/* ---------- options ---------- */
const GRADES = [
  ['raw','Raw','none','#ffffff'],['bright','Bright natural','brightness(1.08) saturate(1.1)','#ffd36b'],
  ['cool','Clean and cool','contrast(1.05) saturate(.9) hue-rotate(8deg) brightness(1.04)','#6bc8ff'],
  ['warm','Warm film','sepia(.28) saturate(1.2) contrast(1.05)','#ff9a52'],
  ['teal','Moody teal','contrast(1.15) saturate(.85) hue-rotate(-12deg) brightness(.92)','#2ec4b6'],
  ['punchy','Punchy','contrast(1.25) saturate(1.45)','#ff4d6d'],
  ['matte','Soft matte','contrast(.88) saturate(.85) brightness(1.08)','#c8b6ff'],
  ['bw','Black and white','grayscale(1) contrast(1.15)','#ffffff']];
const FONTS = [
  ['inter','Inter','Inter','Inter'],['anton','Anton + Inter','Anton','Inter'],['bebas','Bebas + Lora','"Bebas Neue"','Lora'],
  ['serif','DM Serif + Inter','"DM Serif Display"','Inter'],['play','Playfair + Montserrat','"Playfair Display"','Montserrat'],
  ['grot','Space Grotesk','"Space Grotesk"','"Space Grotesk"'],['pop','Poppins','Poppins','Poppins'],['mono','JetBrains Mono','"JetBrains Mono"','"JetBrains Mono"']];
const CAPS = [['groups','1 to 3 words'],['karaoke','Karaoke'],['big','One big word'],['boxed','Boxed words'],
  ['outline','Bold outline'],['twotone','Two-tone key words'],['mini','Minimal lowercase'],['type','Typewriter']];
const HOOKS = [['center','Big centre title'],['lower','Lower third'],['boxed','Boxed title'],['outline','Outline slam'],
  ['left','Slide in left'],['type','Typewriter'],['stack','Stacked words'],['stamp','Question stamp']];
const FX = [['chat','Chat window typing'],['page','Web page slides in'],['kw','Keyword slam'],
  ['num','Number counts up'],['emoji','Emoji pops'],['punch','Punch-in']];
const WHOLE = [['bar','Progress bar'],['zoomcut','Zoom on every cut'],['flash','Flash on every cut'],['push','Slow push']];
const SOUNDS = [['whoosh','Whoosh'],['pop','Pop'],['ping','Ping'],['typing','Typing'],['click','Click'],['music','Soft music bed']];
const STEPS = [
  ['colours','Colours','Pick the grade. Every card plays your clip with that look.'],
  ['fonts','Fonts','Pick the font pair for captions and titles.'],
  ['captions','Captions','Timed to your real word timings.'],
  ['beats','Beats','Your clip is split where the meaning changes. Pick the hook, then what happens on each beat. Tick several if you like.'],
  ['sound','Sound','Click a card to hear it. In the preview each sound lands on the move it belongs to.'],
  ['watch','Watch','Check your picks, then save them as your style.']];

/* ---------- state ---------- */
const S = { clips: [], clip: null, words: [], dur: 0, step: 0, beat: 0, mode: 'edit',
  grade: 'raw', font: 'inter', caption: null, hook: null, fx: {}, whole: new Set(), snd: new Set(), done: new Set(), sound: false };
const G = id => GRADES.find(g => g[0] === id), F = id => FONTS.find(f => f[0] === id);

/* ---------- beats from the transcript ---------- */
function makeBeats(words, dur) {
  if (!dur) return [];
  const n = clamp(Math.round(dur / 10), 3, 5);
  const target = dur / n, beats = [];
  if (!words.length) { for (let i = 0; i < n; i++) beats.push({ t0: i * target, t1: (i + 1) * target, text: '' }); return beats; }
  const sents = []; let cur = [];
  words.forEach((w, i) => { cur.push(w); const nx = words[i + 1];
    if (/[.?!]$/.test(w.word) || (nx && nx.start - w.end > .6) || !nx) { sents.push(cur); cur = []; } });
  let acc = [];
  sents.forEach((s, i) => { acc.push(...s);
    const t0 = beats.length ? beats[beats.length - 1].t1 : 0, last = i === sents.length - 1;
    if (last || (acc[acc.length - 1].end - t0 >= target && beats.length < n - 1)) {
      beats.push({ t0, t1: last ? dur : acc[acc.length - 1].end, text: acc.map(w => w.word).join(' ') }); acc = []; } });
  return beats;
}
const keyword = txt => (txt.match(/[A-Za-z']{4,}/g) || ['this']).sort((a, b) => b.length - a.length)[0].toUpperCase();
const numberIn = txt => { const m = txt.match(/\d[\d,]*/); return m ? +m[0].replace(/,/g, '') : 100; };

/* ---------- caption renderers (pure: time -> html) ---------- */
function curIdx(t) { let i = -1; for (let k = 0; k < S.words.length; k++) { if (S.words[k].start <= t) i = k; else break; }
  return i >= 0 && t - S.words[i].end < .5 ? i : -1; }
function group(i, n) { const g = Math.floor(i / n) * n; return [g, S.words.slice(g, g + n)]; }
function caption(id, t, acc) {
  const i = curIdx(t); if (i < 0) return '';
  const W = S.words, w = W[i];
  const wrap = (inner, css = '') => `<div class="cap" style="position:absolute;left:6%;right:6%;top:64%;text-align:center;font-family:var(--hf);${css}">${inner}</div>`;
  const sp = (x, c) => `<span style="color:${c}">${esc(x)} </span>`;
  switch (id) {
    case 'groups': { const [g, ws] = group(i, 3);
      return wrap(ws.map((x, k) => sp(x.word, g + k === i ? acc : '#fff')).join(''), 'font-weight:800;font-size:8cqw;text-shadow:0 .4cqw 1.4cqw #000a'); }
    case 'karaoke': { const [g, ws] = group(i, 6);
      return wrap(ws.map((x, k) => sp(x.word, g + k <= i ? acc : '#fff9')).join(''), 'font-weight:800;font-size:6.4cqw;text-shadow:0 .3cqw 1cqw #000'); }
    case 'big': return wrap(`<span style="animation:none;display:inline-block;transform:scale(${.8 + .2 * ease((t - w.start) / .12)})">${esc(w.word.toUpperCase())}</span>`, 'font-weight:900;font-size:15cqw;color:#fff;text-shadow:0 .6cqw 2cqw #000');
    case 'boxed': { const [g, ws] = group(i, 3);
      return wrap(ws.map((x, k) => `<span style="display:inline-block;margin:.5cqw;padding:.6cqw 2cqw;border-radius:1cqw;background:${g + k === i ? acc : '#000c'};color:${g + k === i ? '#000' : '#fff'}">${esc(x.word)}</span>`).join(''), 'font-weight:800;font-size:6.8cqw'); }
    case 'outline': { const [, ws] = group(i, 3);
      return wrap(esc(ws.map(x => x.word).join(' ').toUpperCase()), 'font-weight:900;font-size:9cqw;color:#fff;-webkit-text-stroke:.5cqw #000;paint-order:stroke fill;text-shadow:0 .5cqw 0 #000'); }
    case 'twotone': { const [, ws] = group(i, 3); const k = ws.reduce((b, x, j) => x.word.length > ws[b].word.length ? j : b, 0);
      return wrap(ws.map((x, j) => j === k ? `<i style="font-family:'DM Serif Display',serif;color:${acc};font-size:1.2em">${esc(x.word)} </i>` : esc(x.word) + ' ').join(''), 'font-weight:700;font-size:7.2cqw;color:#fff;text-shadow:0 .3cqw 1cqw #000'); }
    case 'mini': { const [, ws] = group(i, 5);
      return wrap(esc(ws.map(x => x.word).join(' ').toLowerCase()), 'font-weight:600;font-size:4.6cqw;color:#fff;text-shadow:0 .2cqw .8cqw #000'); }
    case 'type': { const [g, ws] = group(i, 4); const txt = ws.map(x => x.word).join(' ');
      const done = ws.filter((x, k) => g + k < i).map(x => x.word).join(' '); const frac = clamp((t - w.start) / Math.max(.2, w.end - w.start), 0, 1);
      const shown = (done ? done + ' ' : '') + w.word.slice(0, Math.ceil(w.word.length * frac));
      return wrap(esc(shown) + `<span style="opacity:${Math.floor(t * 4) % 2}">▍</span>`, 'font-family:"JetBrains Mono",monospace;font-weight:800;font-size:6cqw;color:#fff;background:#000b;padding:1.5cqw;border-radius:1cqw;left:8%;right:8%;text-align:left'); }
  }
  return '';
}

/* ---------- title + beat effects (pure: local time lt since beat start) ---------- */
function hookTitle(id, lt, text, acc) {
  const words = text.split(' ').slice(0, 6).join(' '); if (!words) return '';
  const a = ease(lt / .35), box = (css, inner) => `<div style="position:absolute;font-family:var(--hf);${css}">${inner}</div>`;
  switch (id) {
    case 'center': return box(`left:6%;right:6%;top:30%;text-align:center;font-weight:900;font-size:11cqw;color:#fff;line-height:1.05;text-shadow:0 .6cqw 2cqw #000;transform:scale(${.7 + .3 * a});opacity:${a}`, esc(words.toUpperCase()));
    case 'lower': return box(`left:0;top:72%;padding:2cqw 5cqw;background:${acc};color:#000;font-weight:800;font-size:6cqw;transform:translateX(${(1 - a) * -100}%)`, esc(words));
    case 'boxed': return box(`left:8%;right:8%;top:30%;text-align:center;font-weight:800;font-size:8cqw;background:#fff;color:#000;padding:3cqw;border-radius:2cqw;opacity:${a};transform:translateY(${(1 - a) * 8}cqw)`, esc(words));
    case 'outline': return box(`left:5%;right:5%;top:28%;text-align:center;font-weight:900;font-size:13cqw;color:#fff;-webkit-text-stroke:.6cqw #000;paint-order:stroke fill;transform:scale(${2 - a});opacity:${a}`, esc(words.toUpperCase()));
    case 'left': return box(`left:6%;top:30%;max-width:70%;font-weight:900;font-size:10cqw;color:#fff;text-shadow:0 .5cqw 1.5cqw #000;transform:translateX(${(1 - a) * -110}%)`, esc(words.toUpperCase()));
    case 'type': { const n = Math.floor(clamp(lt / 1.4, 0, 1) * words.length);
      return box(`left:8%;right:8%;top:30%;font-family:'JetBrains Mono',monospace;font-weight:800;font-size:7cqw;color:#fff;background:#000b;padding:3cqw;border-radius:1.5cqw`, esc(words.slice(0, n)) + '▍'); }
    case 'stack': return words.split(' ').map((x, k) => box(`left:0;right:0;top:${24 + k * 9}%;text-align:center;font-weight:900;font-size:9cqw;color:${k % 2 ? acc : '#fff'};text-shadow:0 .4cqw 1.2cqw #000;opacity:${ease((lt - k * .12) / .25)};transform:translateY(${(1 - ease((lt - k * .12) / .25)) * 6}cqw)`, esc(x.toUpperCase()))).join('');
    case 'stamp': return box(`left:50%;top:32%;transform:translate(-50%,0) rotate(-6deg) scale(${2.2 - 1.2 * a});opacity:${a};font-weight:900;font-size:12cqw;color:${acc};border:1cqw solid ${acc};padding:2cqw 4cqw;border-radius:2cqw;white-space:nowrap`, esc((words.split(' ')[0] || '').toUpperCase() + '?'));
  }
  return '';
}
function beatFx(id, lt, beat, acc) {
  const a = ease(lt / .3), kw = keyword(beat.text), box = (css, inner) => `<div style="position:absolute;font-family:var(--hf);${css}">${inner}</div>`;
  switch (id) {
    case 'chat': { const p = (beat.text || 'type your prompt here').slice(0, 60); const n = Math.floor(clamp(lt / 1.6, 0, 1) * p.length);
      return box(`left:6%;right:6%;top:10%;background:#111c;border:1px solid #fff3;border-radius:2cqw;padding:3cqw;color:#fff;font-size:4.2cqw;font-family:'JetBrains Mono',monospace;opacity:${a};transform:translateY(${(1 - a) * -6}cqw)`, `<div style="color:${acc};font-size:3.4cqw;margin-bottom:1.5cqw">● ● ●  claude</div>&gt; ${esc(p.slice(0, n))}<span style="opacity:${Math.floor(lt * 3) % 2}">▍</span>`); }
    case 'page': return box(`left:6%;right:6%;top:8%;height:34%;background:#fff;border-radius:2cqw;overflow:hidden;transform:translateY(${(1 - a) * -120}%);box-shadow:0 2cqw 6cqw #0008`,
      `<div style="background:#e8e8ec;height:7cqw;display:flex;align-items:center;gap:1cqw;padding:0 2cqw"><i style="width:2cqw;height:2cqw;border-radius:50%;background:#f66"></i><i style="width:2cqw;height:2cqw;border-radius:50%;background:#fc4"></i><i style="width:2cqw;height:2cqw;border-radius:50%;background:#6c6"></i></div><div style="padding:3cqw;color:#111;font-weight:800;font-size:5cqw">${esc(kw)}</div><div style="margin:0 3cqw;height:2cqw;background:#ddd;border-radius:1cqw"></div><div style="margin:2cqw 3cqw;height:2cqw;width:70%;background:#ddd;border-radius:1cqw"></div><div style="margin:2cqw 3cqw;height:8cqw;border:.7cqw solid ${acc};border-radius:1.5cqw;opacity:${.5 + .5 * Math.abs(Math.sin(lt * 4))}"></div>`);
    case 'kw': return box(`left:0;right:0;top:20%;text-align:center;font-weight:900;font-size:13cqw;color:#ffe600;text-shadow:.6cqw .6cqw 0 #e11,0 1cqw 3cqw #000;transform:scale(${3 - 2 * ease(lt / .22)});opacity:${ease(lt / .1)}`, esc(kw));
    case 'num': { const n = numberIn(beat.text), v = Math.round(n * ease(lt / 1.2));
      return box(`left:0;right:0;top:16%;text-align:center;font-weight:900;font-size:22cqw;color:#fff;text-shadow:0 1cqw 3cqw #000;opacity:${ease(lt / .2)}`, `<span style="color:${acc}">${v.toLocaleString()}</span>`); }
    case 'emoji': return ['🔥','🚀','✨'].map((e, k) => box(`left:${22 + k * 24}%;top:${46 - ease((lt - k * .1) / .5) * 14}%;font-size:12cqw;opacity:${ease((lt - k * .1) / .15) * (1 - clamp((lt - 1.4) / .4, 0, 1))};transform:scale(${.4 + .6 * ease((lt - k * .1) / .3)})`, e)).join('');
    case 'punch': return '';
  }
  return '';
}

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
    const cfg = this.cfg(), raw = this.main && S.mode === 'raw', acc = G(cfg.grade)[3];
    v.style.filter = raw ? 'none' : G(cfg.grade)[2];
    let html = '', scale = 1;
    if (!raw) {
      const bs = S.beats, bi = bs.findIndex(x => t >= x.t0 && t < x.t1), bt = bs[bi];
      if (cfg.caption) html += caption(cfg.caption, t, acc);
      if (bt) { const lt = t - bt.t0;
        if (bi === 0 && cfg.hook && lt < 3) html += hookTitle(cfg.hook, lt, S.words.map(w => w.word).join(' ') || 'Your hook here', acc);
        (cfg.fx[bi] || []).forEach(id => { html += beatFx(id, lt, bt, acc); if (id === 'punch') scale *= 1 + .12 * ease(lt / .15); });
        if (cfg.whole.has('zoomcut')) scale *= 1.1 - .1 * ease(lt / .4);
        if (cfg.whole.has('flash')) html += `<div style="position:absolute;inset:0;background:#fff;opacity:${.7 * (1 - ease(lt / .15))}"></div>`;
      }
      if (cfg.whole.has('push')) scale *= 1 + .06 * (t / (S.dur || 1));
      if (cfg.whole.has('bar')) html += `<div style="position:absolute;left:0;top:0;height:1.2cqw;width:${100 * t / (S.dur || 1)}%;background:${acc}"></div>`;
    }
    v.style.transform = `scale(${scale})`;
    const ff = F(cfg.font); this.el.style.setProperty('--hf', ff[2] + ',sans-serif');
    if (html !== this.last) { this.ov.innerHTML = html; this.last = html; }
    if (this.main && S.sound && !v.paused) this.sounds(t);
    this.lastT = t; if (this.main) updateScrub(t);
  }
  sounds(t) { const lo = this.lastT; if (t < lo) return; const cfg = this.cfg();
    const hit = x => lo < x && x <= t;
    S.beats.forEach((b, i) => { const ids = cfg.fx[i] || [];
      if (i > 0 && hit(b.t0) && S.snd.has('whoosh')) snd('whoosh');
      if (ids.includes('chat') && hit(b.t0 + .2) && S.snd.has('typing')) snd('typing');
      if (ids.some(x => x === 'kw' || x === 'emoji' || x === 'page') && hit(b.t0 + .15) && S.snd.has('pop')) snd('pop');
      if (ids.includes('num') && hit(b.t0 + 1.2) && S.snd.has('ping')) snd('ping');
      if (cfg.whole.has('flash') && hit(b.t0) && S.snd.has('click')) snd('click'); }); }
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
function styleObj(name) { return { name, clip: S.clip.name, grade: S.grade, font: S.font, caption: S.caption, hook: S.hook,
  beats: S.beats.map((b, i) => ({ start: +b.t0.toFixed(2), end: +b.t1.toFixed(2), text: b.text, effects: S.fx[i] })), whole: [...S.whole], sounds: [...S.snd] }; }
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
