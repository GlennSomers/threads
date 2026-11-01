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
      return box(`left:6%;right:6%;top:13%;background:#111c;border:1px solid #fff3;border-radius:2cqw;padding:3cqw;color:#fff;font-size:4.2cqw;font-family:'JetBrains Mono',monospace;opacity:${a};transform:translateY(${(1 - a) * -6}cqw)`, `<div style="color:${acc};font-size:3.4cqw;margin-bottom:1.5cqw">● ● ●  claude</div>&gt; ${esc(p.slice(0, n))}<span style="opacity:${Math.floor(lt * 3) % 2}">▍</span>`); }
    case 'page': return box(`left:6%;right:6%;top:12.5%;height:32%;background:#fff;border-radius:2cqw;overflow:hidden;transform:translateY(${(1 - a) * -120}%);box-shadow:0 2cqw 6cqw #0008`,
      `<div style="background:#e8e8ec;height:7cqw;display:flex;align-items:center;gap:1cqw;padding:0 2cqw"><i style="width:2cqw;height:2cqw;border-radius:50%;background:#f66"></i><i style="width:2cqw;height:2cqw;border-radius:50%;background:#fc4"></i><i style="width:2cqw;height:2cqw;border-radius:50%;background:#6c6"></i></div>` + (beat.shot ? `<img src="${shotBase()}${esc(beat.shot)}" style="width:100%;height:calc(100% - 7cqw);object-fit:cover;object-position:top;display:block"><div style="position:absolute;left:6%;right:6%;top:30%;height:14%;border:.7cqw solid ${acc};border-radius:1.5cqw;opacity:${lt > .6 ? .5 + .5 * Math.abs(Math.sin(lt * 4)) : 0}"></div>` : `<div style="padding:3cqw;color:#111;font-weight:800;font-size:5cqw">${esc(kw)}</div><div style="margin:0 3cqw;height:2cqw;background:#ddd;border-radius:1cqw"></div><div style="margin:2cqw 3cqw;height:2cqw;width:70%;background:#ddd;border-radius:1cqw"></div><div style="margin:2cqw 3cqw;height:8cqw;border:.7cqw solid ${acc};border-radius:1.5cqw;opacity:${.5 + .5 * Math.abs(Math.sin(lt * 4))}"></div>`));
    case 'kw': return box(`left:0;right:0;top:20%;text-align:center;font-weight:900;font-size:13cqw;color:#ffe600;text-shadow:.6cqw .6cqw 0 #e11,0 1cqw 3cqw #000;transform:scale(${3 - 2 * ease(lt / .22)});opacity:${ease(lt / .1)}`, esc(kw));
    case 'num': { const n = numberIn(beat.text), v = Math.round(n * ease(lt / 1.2));
      return box(`left:0;right:0;top:16%;text-align:center;font-weight:900;font-size:22cqw;color:#fff;text-shadow:0 1cqw 3cqw #000;opacity:${ease(lt / .2)}`, `<span style="color:${acc}">${v.toLocaleString()}</span>`); }
    case 'emoji': return ['🔥','🚀','✨'].map((e, k) => box(`left:${22 + k * 24}%;top:${46 - ease((lt - k * .1) / .5) * 14}%;font-size:12cqw;opacity:${ease((lt - k * .1) / .15) * (1 - clamp((lt - 1.4) / .4, 0, 1))};transform:scale(${.4 + .6 * ease((lt - k * .1) / .3)})`, e)).join('');
    case 'punch': return '';
  }
  return '';
}


/* ---------- compose one frame (shared by the Studio and the renderer) ---------- */
const shotBase = () => (typeof window !== 'undefined' && window.SHOT_BASE != null) ? window.SHOT_BASE : '/shots/';
function compose(t, cfg, raw) {
  const acc = G(cfg.grade)[3]; let html = '', scale = 1;
  const filter = raw ? 'none' : G(cfg.grade)[2];
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
    if (cfg.whole.has('bar')) html += `<div style="position:absolute;left:0;top:11.5%;height:.8cqw;width:${100 * t / (S.dur || 1)}%;background:${acc}"></div>`;
  }
  return { html, scale, filter, font: F(cfg.font)[2] + ',sans-serif' };
}
/* sound events: [{t, snd}] each tied to the move it belongs to */
function soundEvents(cfg, sel) {
  const ev = [];
  S.beats.forEach((b, i) => { const ids = cfg.fx[i] || [];
    if (i > 0 && sel.has('whoosh')) ev.push({ t: b.t0, snd: 'whoosh' });
    if (ids.includes('chat') && sel.has('typing')) ev.push({ t: b.t0 + .2, snd: 'typing' });
    if (ids.some(x => x === 'kw' || x === 'emoji' || x === 'page') && sel.has('pop')) ev.push({ t: b.t0 + .15, snd: 'pop' });
    if (ids.includes('num') && sel.has('ping')) ev.push({ t: b.t0 + 1.2, snd: 'ping' });
    if (cfg.whole.has('flash') && sel.has('click')) ev.push({ t: b.t0, snd: 'click' }); });
  return ev.sort((a, b) => a.t - b.t);
}
