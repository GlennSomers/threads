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
const CAPS = [['cinematic','Cinematic (minimal)'],['photography_educator','Photography educator'],['hormozi','Hormozi (word pop)'],['mrbeast','MrBeast (flash)'],['karaoke_gold','Karaoke gold'],['ali_abdaal','Ali Abdaal (dim to bright)'],['iman_gadzhi','Iman Gadzhi (weight)'],['minimal_cinematic','Minimal cinematic'],['podcast_clip','Podcast clip'],['groups','1 to 3 words'],['karaoke','Karaoke'],['big','One big word'],['boxed','Boxed words'],
  ['outline','Bold outline'],['twotone','Two-tone key words'],['mini','Minimal lowercase'],['type','Typewriter']];
const HOOKS = [['center','Big centre title'],['lower','Lower third'],['boxed','Boxed title'],['outline','Outline slam'],
  ['left','Slide in left'],['type','Typewriter'],['stack','Stacked words'],['stamp','Question stamp']];
const FX = [['chat','Chat window typing'],['page','Web page slides in'],['kw','Keyword slam'],
  ['num','Number counts up'],['emoji','Emoji pops'],['punch','Punch-in']];
const WHOLE = [['bar','Progress bar'],['zoomcut','Zoom on every cut'],['flash','Flash on every cut'],['push','Slow push']];
const SOUNDS = [['whoosh','Whoosh'],['pop','Pop'],['ping','Ping'],['typing','Typing'],['click','Click'],['highlight','Highlighter'],['music','Soft music bed']];
const STEPS = [
  ['colours','Colours','Pick the grade. Every card plays your clip with that look.'],
  ['fonts','Fonts','Pick the font pair for captions and titles.'],
  ['captions','Captions','Timed to your real word timings.'],
  ['beats','Beats','Your clip is split where the meaning changes. Pick the hook, then what happens on each beat. Tick several if you like.'],
  ['sound','Sound','Click a card to hear it. In the preview each sound lands on the move it belongs to.'],
  ['watch','Watch','Check your picks, then save them as your style.']];

/* ---------- state ---------- */
const S = { clips: [], clip: null, words: [], dur: 0, step: 0, beat: 0, mode: 'edit',
  grade: 'raw', font: 'inter', caption: null, hook: null, fx: {}, whole: new Set(), snd: new Set(), done: new Set(), sound: false, capEdit: {}, lutAmount: 100, cuts: [], trans: [], wordsLive: null, voice: { preset: 'off', amount: 100, nr: null } };
const G = id => GRADES.find(g => g[0] === id), F = id => FONTS.find(f => f[0] === id) || FONTS[0];   // an uploaded font that isn't loaded falls back to the first pair

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

/* ---------- captions: every option is editable (S.capEdit overrides the chosen style's defaults) ---------- */
const CAP_BASE = { group: 3, hl: 'none', size: 8, weight: 800, y: 64, x: 0, width: null, ls: 0, lh: 1.15, shadow: 'auto', strokeColor: '#000000', radius: 1, speed: 1, upper: false, lower: false, stroke: 0, box: false, boxColor: '#000000', boxAlpha: .73,
  anim: 'none', align: 'center', color: '#ffffff', accent: null, font: null, offset: 0, linger: .5 };
const CAP_DEF = {
  groups: { group: 3, hl: 'current' }, karaoke: { group: 6, hl: 'spoken', size: 6.4 }, big: { group: 1, size: 15, weight: 900, y: 60, upper: true, anim: 'pop' },
  boxed: { group: 3, hl: 'box', size: 6.8 }, outline: { group: 3, size: 9, weight: 900, upper: true, stroke: .5 },
  twotone: { group: 3, hl: 'key', size: 7.2, weight: 700 }, mini: { group: 5, size: 4.6, weight: 600, lower: true },
  type: { group: 4, size: 6, font: 'JetBrains Mono', box: true, anim: 'type', align: 'left' },
  // creator-style presets from reel-fonts-and-caption-animations.md (§6); sizes are px on a 1080-wide frame / 10.8
  hormozi: { font: 'Anton', weight: 400, upper: true, size: 15.7, color: '#ffffff', accent: '#FF6B00', stroke: .46, group: 2, anim: 'wordpop', hl: 'keycolor', y: 62 },
  mrbeast: { font: 'Bangers', weight: 400, upper: true, size: 14.8, color: '#ffffff', accent: '#FFE600', stroke: .56, group: 3, anim: 'flash', hl: 'keycolor', y: 50 },
  karaoke_gold: { font: 'Montserrat', weight: 800, size: 13, color: '#ffffff', accent: '#FFD400', stroke: .19, box: true, boxColor: '#000000', boxAlpha: .32, group: 6, hl: 'current', y: 64 },
  ali_abdaal: { font: 'Inter', weight: 700, size: 7.2, color: '#ffffff', group: 8, hl: 'dim', y: 70 },
  iman_gadzhi: { font: 'Montserrat', weight: 300, lower: true, size: 11.1, color: '#ffffff', group: 5, hl: 'weight', y: 66 },
  minimal_cinematic: { font: 'DM Sans', weight: 600, size: 10.2, color: '#F5F5F5', group: 5, anim: 'fade', y: 72 },
  podcast_clip: { font: 'Inter', weight: 700, size: 12, color: '#ffffff', accent: '#7CFF6B', stroke: .28, box: true, boxColor: '#000000', boxAlpha: .4, group: 7, hl: 'boxactive', y: 60 },
  photography_educator: { font: 'Montserrat', weight: 700, size: 12.5, color: '#ffffff', accent: '#FFC857', stroke: .28, group: 4, anim: 'bounce', hl: 'keycolor', y: 63 } };
// Google Fonts loaded by the Studio and the render: [family, axes, category]. From reel-fonts-and-caption-animations.md (§2, free/OFL only).
const GFONTS = /*GFONTS*/[
 ["Montserrat","wght@300;600;700;800;900","Bold caption"],["Anton","","Bold caption"],["Bebas Neue","","Bold caption"],["Bangers","","Bold caption"],
 ["Oswald","wght@600;700","Bold caption"],["League Spartan","wght@700;800","Bold caption"],["Fira Sans Condensed","wght@700;800","Bold caption"],
 ["Gabarito","wght@700;800;900","Bold caption"],["Barlow Condensed","wght@700;800","Bold caption"],
 ["Poppins","wght@600;700;800","Clean sans"],["Inter","wght@300;400;600;700;800","Clean sans"],["Rubik","wght@700;800","Clean sans"],["Outfit","wght@700;800","Clean sans"],
 ["DM Sans","wght@500;600;700","Clean sans"],["Manrope","wght@600;700;800","Clean sans"],["Nunito Sans","wght@700;800","Clean sans"],["Archivo","wght@700;800","Clean sans"],
 ["Roboto","wght@700;900","Clean sans"],["Open Sans","wght@700;800","Clean sans"],["TikTok Sans","wght@400;700","Clean sans"],["Space Grotesk","wght@500;700","Clean sans"],
 ["Shrikhand","","Display"],["Jomhuria","","Display"],
 ["Caveat","wght@400;700","Handwritten"],["Permanent Marker","","Handwritten"],["Pacifico","","Handwritten"],
 ["DM Serif Display","ital@0;1","Serif"],["Cormorant Garamond","wght@500;600;700","Serif"],["Playfair Display","ital,wght@0,700;1,700","Serif"],["Lora","ital,wght@0,600;0,700;1,600","Serif"],
 ["Space Mono","wght@400;700","Mono"],["JetBrains Mono","wght@400;500;700;800","Mono"],["IBM Plex Mono","wght@400;700","Mono"]]/*END*/;
const gfontsUrl = () => 'https://fonts.googleapis.com/css2?' + GFONTS.map(([f, ax]) => 'family=' + f.replace(/ /g, '+') + (ax ? ':' + ax : '')).join('&') + '&display=swap';
if (typeof document !== 'undefined' && document.head && !document.getElementById('gfonts')) document.head.insertAdjacentHTML('beforeend', `<link id="gfonts" rel="stylesheet" href="${gfontsUrl()}">`);
const CAP_FONTS = GFONTS.map(f => f[0]);
// every family as a single-font choice too (the pairs above stay as the Font pair cards)
GFONTS.forEach(([f, , cat]) => FONTS.push(['g:' + f.toLowerCase().replace(/[^a-z0-9]+/g, '-'), f, `"${f}"`, `"${f}"`, cat]));
function capOpts(id, over) {
  const o = { ...CAP_BASE, ...(CAP_DEF[id] || {}) };
  Object.entries(over || {}).forEach(([k, v]) => { if (v !== null && v !== undefined && v !== '') o[k] = v; });
  if (o.font === '@pair') o.font = null;   // the font picked on the Fonts step wins over the style's own
  return o;
}
// words still in the edit (a word whose middle falls inside a cut is gone)
function refreshLive() { const cs = S.cuts || []; S.wordsLive = S.words.filter(w => { const m = (w.start + w.end) / 2; return !cs.some(c => m > c.a && m < c.b); }); return S.wordsLive; }
const liveWords = () => S.wordsLive || S.words;
function curIdx(t, linger) { const W = liveWords(); let i = -1; for (let k = 0; k < W.length; k++) { if (W[k].start <= t) i = k; else break; }
  return i >= 0 && t - W[i].end < (linger ?? .5) ? i : -1; }
function caption(id, t, acc, over) {
  const o = capOpts(id, over), tt = t - o.offset, i = curIdx(tt, o.linger); if (i < 0) return '';
  const W = liveWords(), n = Math.max(1, Math.round(o.group)), g = Math.floor(i / n) * n, ws = W.slice(g, g + n), hi = o.accent || acc;
  const fmt = x => o.upper ? x.toUpperCase() : o.lower ? x.toLowerCase() : x;
  const key = o.hl === 'keycolor' ? keyIndex(ws) : ws.reduce((b, x, j) => x.word.length > ws[b].word.length ? j : b, 0);
  const plate = o.boxColor + Math.round(clamp(o.boxAlpha ?? .73, 0, 1) * 255).toString(16).padStart(2, '0');
  // word pop (Hormozi): words show as they are spoken, each scaling 0.7 -> 1.08 -> 1 over 150 ms
  const sp = Math.max(.2, +o.speed || 1);
  const wpop = (x, k, html) => { if (o.anim !== 'wordpop') return html; const d = (tt - x.start) * sp; html = html.replace(/ (<\/(span|i)>)$/, '$1');   // the space goes outside the scaled word
    if (g + k > i || d < 0) return `<span style="opacity:0">${html}</span> `;
    const p = clamp(d / .15, 0, 1), sc = p < .7 ? .7 + .38 * ease(p / .7) : 1.08 - .08 * ease((p - .7) / .3);
    return `<span style="display:inline-block;transform:scale(${sc.toFixed(3)});opacity:${clamp(d / .06, 0, 1).toFixed(2)}">${html}</span> `; };
  const libA = /^lib:/.test(o.anim || '') ? animById(o.anim.slice(4)) : null;
  // colour and highlight of word k of the group, for words drawn by an animation and the newer highlight modes
  const hlSty = (x, k) => { const cur = g + k === i, past = g + k <= i, dw = tt - x.start;
    switch (o.hl) {
      case 'current': return `color:${cur ? hi : o.color}`;
      case 'spoken': return `color:${past ? hi : o.color};opacity:${past ? 1 : .6}`;
      case 'keycolor': return `color:${k === key ? hi : o.color}`;
      case 'key': return k === key ? `font-family:'DM Serif Display',serif;font-style:italic;color:${hi};font-size:1.2em` : `color:${o.color}`;
      case 'dim': return `color:${o.color};opacity:${cur ? 1 : .4}`;
      case 'weight': return `color:${o.color};font-weight:${cur ? 700 : o.weight}`;
      case 'box': case 'boxactive': return `display:inline-block;padding:.2cqw 1cqw;border-radius:1cqw;background:${cur ? hi : 'transparent'};color:${cur ? '#000' : o.color}`;
      case 'glow': { if (!cur) return `color:${o.color};opacity:.45`;   // active word: fill + outer glow + micro-scale, the rest dim
        const q = clamp(dw / .22, 0, 1), gl = q < .6 ? .7 * ease(q / .6) : .7 - .35 * ease((q - .6) / .4), sc = q < .6 ? 1 + .06 * ease(q / .6) : 1.06 - .04 * ease((q - .6) / .4);
        return `display:inline-block;color:${o.color};transform:scale(${sc.toFixed(3)});text-shadow:0 0 ${(gl * 3).toFixed(2)}cqw ${hi},0 0 ${(gl * 1.2).toFixed(2)}cqw ${hi}`; }
      case 'wipe': { const q = g + k < i ? 1 : cur ? clamp(dw / Math.max(.18, x.end - x.start), 0, 1) : 0, pc = (q * 100).toFixed(1);   // accent fill wipes across as it's said
        return `background:linear-gradient(90deg,${hi} ${pc}%,${o.color} ${pc}%);-webkit-background-clip:text;background-clip:text;color:transparent;text-shadow:none`; }
      case 'dimlift': { const q = cur ? ease(clamp(dw / .18, 0, 1)) : 0;
        return `display:inline-block;color:${o.color};opacity:${(.38 + .62 * q).toFixed(2)};transform:translateY(${(-.28 * q).toFixed(3)}cqw)`; }
      default: return `color:${o.color}`;
    } };
  let inner;
  if (o.anim === 'type') {
    const w = W[i], frac = clamp((tt - w.start) / Math.max(.2, w.end - w.start), 0, 1);
    inner = esc(fmt(ws.filter((x, k) => g + k < i).map(x => x.word).join(' ') + (i > g ? ' ' : '') + w.word.slice(0, Math.ceil(w.word.length * frac)))) + `<span style="opacity:${Math.floor(t * 4) % 2}">▍</span>`;
  } else inner = ws.map((x, k) => wpop(x, k, (() => {
    const cur = g + k === i, txt = esc(fmt(x.word)), wa = wordAnimFor(x), la = wa ? animById(wa.anim) : libA;
    if (la) { const d = wa ? tt - x.start : (tt - x.start) * sp;   // a library animation on every word (lib:<id>) or on these words
      if (!wa && d < 0 && !la.proc) return `<span style="opacity:0">${txt}</span> `;
      return animWord(la, d, fmt(x.word), hlSty(x, k), hi) + ' '; }
    if (['glow', 'wipe', 'dimlift'].includes(o.hl)) return `<span style="${hlSty(x, k)}">${txt}</span> `;
    if (o.hl === 'current') return `<span style="color:${cur ? hi : o.color}">${txt} </span>`;
    if (o.hl === 'spoken') return `<span style="color:${g + k <= i ? hi : o.color};opacity:${g + k <= i ? 1 : .6}">${txt} </span>`;
    if (o.hl === 'key') return k === key ? `<i style="font-family:'DM Serif Display',serif;color:${hi};font-size:1.2em">${txt} </i>` : `<span style="color:${o.color}">${txt} </span>`;
    if (o.hl === 'box') return `<span style="display:inline-block;margin:.5cqw;padding:.6cqw 2cqw;border-radius:1cqw;background:${cur ? hi : o.boxColor + 'cc'};color:${cur ? '#000' : o.color}">${txt}</span>`;
    if (o.hl === 'boxactive') return `<span style="display:inline-block;padding:.2cqw 1cqw;border-radius:1cqw;background:${cur ? hi : 'transparent'};color:${cur ? '#000' : o.color}">${txt}</span> `;
    if (o.hl === 'keycolor') return `<span style="color:${k === key ? hi : o.color}">${txt} </span>`;
    if (o.hl === 'dim') return `<span style="color:${o.color};opacity:${cur ? 1 : .4}">${txt} </span>`;
    if (o.hl === 'weight') return `<span style="color:${o.color};font-weight:${cur ? 700 : o.weight}">${txt} </span>`;
    return `<span style="color:${o.color}">${txt} </span>`; })())).join('');
  const ta = (tt - (n === 1 ? W[i].start : W[g].start)) * sp;
  let tr = '', op = 1;
  if (o.anim === 'pop') tr = `scale(${.8 + .2 * ease(ta / .12)})`;
  if (o.anim === 'slide') { tr = `translateY(${(1 - ease(ta / .18)) * 3}cqw)`; op = ease(ta / .18); }
  if (o.anim === 'fade') op = ease(ta / .3);
  if (o.anim === 'flash') { const p = clamp(ta / .35, 0, 1); tr = `scale(${(p < .6 ? .8 + .25 * ease(p / .6) : 1.05 - .05 * ease((p - .6) / .4)).toFixed(3)})`; op = clamp(ta / .05, 0, 1); }
  if (o.anim === 'bounce') { const b = animAt(animById('bounce-in'), ta / .45); tr = `translateY(${b.y.toFixed(2)}%) scale(${b.s.toFixed(3)})`; op = b.o; }
  // position: y is the top edge (% from the top, kept in Instagram's band); inside a safe zone it is 0..100 of the zone and the block never leaves it
  const width = clamp(+o.width || (o.align === 'left' ? 84 : 88), 30, 100), x = clamp(+o.x || 0, -40, 40);
  const L = clamp((100 - width) / 2 + x, 0, 100 - width), R = 100 - width - L;
  const y = SAFE_ON ? clamp(+o.y, 0, 100) : clamp(+o.y, 12, 76);
  const shadow = o.shadow === 'none' ? 'none' : o.shadow === 'hard' || (o.shadow === 'auto' && o.stroke) ? `0 .5cqw 0 ${o.strokeColor}` : o.shadow === 'glow' ? `0 0 2cqw ${hi}` : '0 .3cqw 1.2cqw #000a';
  const outer = `position:absolute;left:${L}%;right:${R}%;top:${y}%;${SAFE_ON ? `transform:translateY(-${y}%);` : ''}text-align:${o.align}`;
  const css = `display:${o.box && o.hl !== 'box' ? 'inline-block' : 'block'};font-family:${o.font ? `'${o.font}'` : 'var(--hf)'},sans-serif;font-weight:${o.weight};font-size:${o.size}cqw;line-height:${+o.lh || 1.15};letter-spacing:${+o.ls || 0}em;` +
    `text-shadow:${shadow};` + (o.stroke ? `-webkit-text-stroke:${o.stroke}cqw ${o.strokeColor};paint-order:stroke fill;` : '') +
    (o.box && o.hl !== 'box' ? `background:${plate};padding:1.5cqw;border-radius:${+o.radius}cqw;` : '') +
    `transform:${tr || 'none'};opacity:${op}`;
  return `<div style="${outer}"><div class="cap" style="${css}">${inner}</div></div>`;
}

/* ---------- minimal style: cinematic text (two fonts, key word big in the middle, the rest small around it) ---------- */
const STOP = new Set('the a an and or but of to in on at for with is are was were be been it its this that these those i you he she we they my your his her our their me him them as so if then than just like really very kind there here what when who which how do does did have has had not no yes up all can will would could should into out about from by even also only actually gonna going really still some any every each more most just'.split(' '));
function keyIndex(ws) {   // the word that carries the line: numbers first, then the longest non-filler word
  let best = 0, score = -1;
  ws.forEach((w, i) => { const c = w.word.replace(/[^\w']/g, ''), lc = c.toLowerCase(); let s = c.length + (/\d/.test(c) ? 20 : 0) - (STOP.has(lc) ? 10 : 0); if (s > score) { score = s; best = i; } });
  return best;
}
function cineGroups(W) {   // lines of 5 words or fewer, breaking on punctuation and pauses
  const out = []; let cur = [];
  W.forEach((w, i) => { cur.push(i); const nx = W[i + 1]; if (cur.length >= 5 || /[.?!,;:]$/.test(w.word) || !nx || nx.start - w.end > .45) { out.push(cur); cur = []; } });
  return out;
}
function cineBlock(t, opt = {}) {
  const W = liveWords(); if (!W.length) return '';
  const groups = S._cineG && S._cineW === W ? S._cineG : (S._cineW = W, S._cineG = cineGroups(W));
  const gi = groups.findIndex(g => t >= W[g[0]].start - .05 && t < (groups[groups.indexOf(g) + 1] ? W[groups[groups.indexOf(g) + 1][0]].start - .05 : W[g[g.length - 1]].end + .6));
  if (gi < 0) return '';
  const g = groups[gi], ws = g.map(i => W[i]), k = keyIndex(ws), serif = gi % 2 === 1 || /[!?]$/.test(ws[k].word);
  const ink = opt.ink || '#ffffff', accent = opt.accent || '#2f6bff', y = opt.y ?? 62, ta = t - ws[0].start;
  const fmt = w => esc(w.word.replace(/[,;:]$/, ''));
  const seen = w => t >= w.start - .03 ? 1 : .0;
  const small = list => list.map(w => wordAnimFor(w) ? wordAnimWrap(w, t, fmt(w), w.word.replace(/[,;:]$/, '')) : `<span style="opacity:${seen(w)};transition:none">${fmt(w)}</span>`).join(' ');
  const before = ws.slice(0, k), after = ws.slice(k + 1), kw = ws[k], kIn = ease((t - kw.start + .05) / .22);
  const big = serif ? `font-family:'Playfair Display',serif;font-style:italic;font-weight:700;color:${opt.serifInk || accent}`
                    : `font-family:Inter,sans-serif;font-weight:800;color:${ink};letter-spacing:-.02em`;
  return `<div style="position:absolute;left:6%;right:6%;top:${y}%;transform:translateY(-50%);text-align:center;color:${ink};font-family:Inter,sans-serif;text-shadow:${opt.shadow ?? '0 .3cqw 1.4cqw #0008'};opacity:${ease(ta / .15)}">
    ${before.length ? `<div style="font-size:4.2cqw;font-weight:500;opacity:.92;margin-bottom:.6cqw">${small(before)}</div>` : ''}
    <div style="font-size:${opt.size || 13}cqw;line-height:.95;${big};${wordAnimFor(kw) ? '' : `opacity:${kIn};transform:scale(${1.08 - .08 * kIn})`}">${wordAnimFor(kw) ? wordAnimWrap(kw, t, fmt(kw), kw.word.replace(/[,;:]$/, '')) : fmt(kw)}</div>
    ${after.length ? `<div style="font-size:4.2cqw;font-weight:500;opacity:.92;margin-top:.8cqw">${small(after)}</div>` : ''}</div>`;
}

/* ---------- minimal style: full-screen cut-away scenes per beat ---------- */
const SCENES = [['aroll', 'Stay on A-roll'], ['quote', 'Quote scene'], ['line', 'Line + text'], ['graph', 'Graph'],
  ['broll', 'B-roll / photo + text'], ['painting', 'Painting + text'], ['center', 'Centre illustration'], ['side', 'Side illustration + text']];
const SCENE_INFO = { aroll: 'On-screen text (captions) · A-roll', quote: 'Text-centric · Cut-away scene', line: 'Line + text · Cut-away scene',
  graph: 'Graphs + visual representations · Cut-away scene', broll: 'B-roll + text · Cut-away scene', painting: 'Paintings + text · Cut-away scene',
  center: 'Centre illustration · Cut-away scene', side: 'Side illustration + text · Cut-away scene' };
const NEEDS_IMAGE = new Set(['broll', 'painting', 'center', 'side']);
const PAPER = (o = .35) => `<div style="position:absolute;inset:0;opacity:${o};mix-blend-mode:multiply;pointer-events:none;background-image:url(&quot;data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 .35  0 0 0 0 .35  0 0 0 0 .35  0 0 0 2.4 -1.05'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>&quot;);background-size:240px"></div>`;
const GRAIN = (o = .18) => PAPER(o).replace('multiply', 'overlay');
function graphKind(text) { const s = (text || '').toLowerCase();
  if (/\bup\b|grow|climb|more and more|increase|rise/.test(s)) return 'steps';
  if (/slow|steady|same|flat|stable|secure/.test(s)) return 'flat';
  if (/down|declin|less|lose|drop|fall/.test(s)) return 'down';
  return 'rise'; }
function sceneHtml(sc, lt, bt, t, acc) {
  const id = sc.scene, o = sc.sceneOpts || {}, d = Math.max(.5, bt.t1 - bt.t0), p = clamp(lt / d, 0, 1), blue = '#1d4fff';
  const img = sc.image ? `${shotBase()}${esc(sc.image)}` : null, fadeIn = ease(lt / .25);
  const wrap = (bg, inner) => `<div style="position:absolute;inset:0;overflow:hidden;background:${bg};opacity:${fadeIn}">${inner}</div>`;
  const noImg = '<div style="position:absolute;left:8%;right:8%;top:45%;text-align:center;color:#888;font:600 3.6cqw Inter,sans-serif">Add an image for this scene</div>';
  if (id === 'quote') { const bgc = o.bg === 'blue' ? blue : '#f2f1ec', ink = o.bg === 'blue' ? '#fff' : '#111';
    const q = (c, s) => `<div style="position:absolute;${s};font:700 16cqw/1 'Playfair Display',serif;color:${o.bg === 'blue' ? '#ffffff' : blue};opacity:${ease((lt - .1) / .3)}">${c}</div>`;
    return wrap(bgc, PAPER(o.bg === 'blue' ? .9 : .5) + q('\u201c', 'left:7%;top:38%') + q('\u201d', 'right:7%;top:38%') + cineBlock(t, { ink, accent: o.bg === 'blue' ? '#ffffff' : blue, y: 50, size: 11, shadow: 'none' })); }
  if (id === 'line') { const dark = o.bg !== 'white', bgc = dark ? '#0b0b0d' : '#f4f3ef', ink = dark ? '#fff' : '#111', len = 1400;
    const cam = -18 * p;   // the camera tracks the line upwards
    return wrap(bgc, PAPER(dark ? .25 : .4) + `<svg viewBox="0 0 100 178" preserveAspectRatio="none" style="position:absolute;left:0;top:0;width:100%;height:120%;transform:translateY(${cam}%)"><path d="M -5 170 C 30 150, 10 110, 50 100 S 95 60, 70 30 S 20 0, 105 -10" fill="none" stroke="${blue}" stroke-width="2.4" stroke-linecap="round" pathLength="${len}" stroke-dasharray="${len}" stroke-dashoffset="${len * (1 - ease(p * 1.15))}"/></svg>`
      + cineBlock(t, { ink, accent: blue, y: 52, shadow: dark ? '0 .3cqw 1.4cqw #000a' : 'none' })); }
  if (id === 'graph') { const kind = o.graph || graphKind(bt.text), q = ease(p * 1.1);
    let pts; const n = Math.max(3, Math.min(8, ((bt.text || '').match(/\bup\b/gi) || []).length || 5));
    if (kind === 'steps') { pts = [[10, 150]]; for (let i = 0; i < n; i++) { const x = 10 + (i + 1) * 80 / n, y = 150 - (i + 1) * 110 / n; pts.push([x - 80 / n, y], [x, y]); } }
    else if (kind === 'flat') pts = [[8, 112], [92, 108]]; else if (kind === 'down') pts = [[10, 40], [35, 70], [55, 95], [90, 150]]; else pts = [[10, 150], [40, 120], [65, 70], [90, 30]];
    const seg = pts.slice(1).map((pt, i) => Math.hypot(pt[0] - pts[i][0], pt[1] - pts[i][1])), tot = seg.reduce((a, b) => a + b, 0);
    let rem = tot * q, ball = pts[0]; const drawn = [pts[0]];
    for (let i = 0; i < seg.length; i++) { if (rem >= seg[i]) { rem -= seg[i]; drawn.push(pts[i + 1]); ball = pts[i + 1]; } else { const f = rem / seg[i]; ball = [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * f, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * f]; drawn.push(ball); break; } }
    let grid = ''; for (let x = 10; x <= 90; x += 20) grid += `<line x1="${x}" y1="20" x2="${x}" y2="160" stroke="#ffffff22" stroke-width=".25"/>`; for (let y = 20; y <= 160; y += 20) grid += `<line x1="5" y1="${y}" x2="95" y2="${y}" stroke="#ffffff22" stroke-width=".25"/>`;
    const camX = (50 - ball[0]) * .25, camY = (95 - ball[1]) * .2;
    return wrap('#0c0d10', GRAIN(.35) + `<svg viewBox="0 0 100 178" style="position:absolute;inset:0;width:100%;height:100%;transform:translate(${camX}%,${camY * .56}%) scale(1.1)"><defs><filter id="gl"><feGaussianBlur stdDeviation=".8"/></filter></defs>${grid}
      <polyline points="${drawn.map(pt => pt.join(',')).join(' ')}" fill="none" stroke="#ffffff" stroke-width="1" stroke-linejoin="round"/><polyline points="${drawn.map(pt => pt.join(',')).join(' ')}" fill="none" stroke="#ffffff" stroke-width="1.6" opacity=".35" filter="url(#gl)"/>
      <circle cx="${ball[0]}" cy="${ball[1]}" r="2.4" fill="${blue}" filter="url(#gl)"/><circle cx="${ball[0]}" cy="${ball[1]}" r="1.6" fill="#4d7dff"/></svg>`
      + cineBlock(t, { ink: '#fff', accent: '#4d7dff', y: 22, size: 11 })); }
  if (id === 'broll' || id === 'painting') { const paint = id === 'painting', a = ease(lt / 1.1);
    const cam = paint ? `translateX(${(1 - a) * 8}%) scale(${1.14 - .08 * a})` : `scale(${1.04 + .05 * p})`;
    return wrap('#000', (img ? `<img src="${img}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transform:${cam};filter:${paint ? 'sepia(.25) contrast(1.05) saturate(.9)' : 'contrast(1.05) brightness(.92)'}">` : noImg)
      + `<div style="position:absolute;inset:0;backdrop-filter:blur(5px);-webkit-mask-image:radial-gradient(ellipse 70% 60% at 50% 45%,transparent 55%,#000 100%);mask-image:radial-gradient(ellipse 70% 60% at 50% 45%,transparent 55%,#000 100%)"></div>`
      + `<div style="position:absolute;inset:0;background:radial-gradient(ellipse 75% 65% at 50% 45%,transparent 45%,#000c 100%)"></div>` + PAPER(paint ? .55 : .3)
      + cineBlock(t, { ink: '#fff', accent: '#ffffff', serifInk: '#ffffff', y: paint ? 30 : 60 })); }
  if (id === 'center' || id === 'side') { const side = id === 'side', a = ease(lt / .9);
    const pos = side ? 'left:-6%;width:62%;top:22%;height:72%' : 'left:8%;width:84%;top:38%;height:60%';
    const art = img ? `<div style="position:absolute;${pos};opacity:${a};transform:translateY(${(1 - a) * 4}%);-webkit-mask-image:radial-gradient(ellipse 58% 52% at 50% 55%,#000 45%,transparent 100%);mask-image:radial-gradient(ellipse 58% 52% at 50% 55%,#000 45%,transparent 100%)">
        <img src="${img}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:contain;filter:grayscale(1) contrast(1.6) brightness(1.05)">
        <div style="position:absolute;inset:0;background:${blue};mix-blend-mode:screen"></div>${PAPER(.6)}</div>` : noImg;
    return wrap('#f3f2ee', PAPER(.45) + art + cineBlock(t, { ink: '#111', accent: blue, y: side ? 45 : 22, shadow: 'none', size: side ? 10 : 12 }).replace('left:6%;right:6%', side ? 'left:52%;right:4%' : 'left:6%;right:6%')); }
  return '';
}

/* ---------- title + beat effects (pure: local time lt since beat start) ---------- */
function hookTitle(id, lt, text, acc) {
  const words = text.split(' ').slice(0, 6).join(' '); if (!words) return '';
  const a = ease(lt / .35), box = (css, inner) => `<div style="position:absolute;font-family:var(--tf, var(--hf));${css}">${inner}</div>`;
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
  const a = ease(lt / .3), kw = keyword(beat.text), box = (css, inner) => `<div style="position:absolute;font-family:var(--tf, var(--hf));${css}">${inner}</div>`;
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
  const acc = G(cfg.grade)[3]; let html = '', scale = 1, safe = '', after = '';
  const filter = raw ? 'none' : G(cfg.grade)[2];
  const zone = cfg.safeLock && SAFE_ZONES[cfg.safe]; SAFE_ON = !!zone;
  if (!raw) {
    safe += elementsHtml(t, cfg.els);
    const bs = S.beats, bi = bs.findIndex(x => t >= x.t0 && t < x.t1), bt = bs[bi];
    const sc = bt ? ((cfg.scenes && cfg.scenes[bi]) || bt) : null, scene = sc && sc.scene && sc.scene !== 'aroll' ? sc : null;
    if (scene) html += sceneHtml(scene, t - bt.t0, bt, t, acc);
    else if (cfg.caption === 'cinematic') safe += cineBlock(t, { accent: acc === '#ffffff' ? '#4d7dff' : acc, y: capOpts('cinematic', cfg.capOpts).y });
    else if (cfg.caption) safe += caption(cfg.caption, t, acc, cfg.capOpts);
    if (bt) { const lt = t - bt.t0;
      if (bi === 0 && cfg.hook && lt < 3) { const he = cfg.hookEdit || {}; let h = hookTitle(cfg.hook, lt, S.words.map(w => w.word).join(' ') || 'Your hook here', acc);
        if (he.color) h = h.replace(/color:#fff\b/g, 'color:' + he.color);
        safe += `<div style="position:absolute;inset:0;transform:translate(${+he.x || 0}%,${+he.y || 0}%) scale(${+he.size || 1});transform-origin:50% 35%;${he.font ? `--tf:'${he.font}';` : ''}">${h}</div>`; }
      (cfg.fx[bi] || []).forEach(id => { html += beatFx(id, lt, bt, acc); if (id === 'punch') scale *= 1 + .12 * ease(lt / .15); });
      if (cfg.whole.has('zoomcut')) scale *= 1.1 - .1 * ease(lt / .4);
      if (cfg.whole.has('flash')) html += `<div style="position:absolute;inset:0;background:#fff;opacity:${.7 * (1 - ease(lt / .15))}"></div>`;
    }
    if (cfg.whole.has('push')) scale *= 1 + .06 * (t / (S.dur || 1));
    if (cfg.whole.has('bar')) html += `<div style="position:absolute;left:0;top:11.5%;height:.8cqw;width:${100 * t / (S.dur || 1)}%;background:${acc}"></div>`;
  }
  let vt = '', vblur = 0;
  if (!raw) (cfg.trans || []).forEach(it => { const r = frameFx(it, t, cfg); if (!r) return; html += r.html; scale *= r.scale; vt += ' ' + r.vt; vblur += r.blur; });
  const fe = F(cfg.font);
  html += zone ? `<div style="position:absolute;left:${zone.l}%;right:${zone.r}%;top:${zone.t}%;bottom:${zone.b}%">${safe}</div>` : safe;
  SAFE_ON = false;
  return { html, scale, vt: vt.trim(), filter: vblur > .01 ? (filter === 'none' ? '' : filter + ' ') + `blur(${vblur.toFixed(2)}cqw)` : filter, font: fe[2] + ',sans-serif', tfont: (fe[5] || fe[2]) + ',sans-serif' };
}
/* sound events: [{t, snd}] each tied to the move it belongs to */
function soundEvents(cfg, sel) {
  const ev = [];
  S.beats.forEach((b, i) => { const ids = cfg.fx[i] || [];
    if (i > 0 && sel.has('whoosh')) ev.push({ t: b.t0, snd: 'whoosh' });
    if (ids.includes('chat') && sel.has('typing')) ev.push({ t: b.t0 + .2, snd: 'typing' });
    if (ids.some(x => x === 'kw' || x === 'emoji' || x === 'page') && sel.has('pop')) ev.push({ t: b.t0 + .15, snd: 'pop' });
    if (ids.includes('num') && sel.has('ping')) ev.push({ t: b.t0 + 1.2, snd: 'ping' });
    if (cfg.whole.has('flash') && sel.has('click')) ev.push({ t: b.t0, snd: 'click' });
    const sc = (cfg.scenes && cfg.scenes[i]) || b;
    if (sc.scene && sc.scene !== 'aroll') {
      if (i === 0 && sel.has('whoosh')) ev.push({ t: b.t0, snd: 'whoosh' });
      if (sc.scene === 'graph' && sel.has('highlight')) ev.push({ t: b.t0 + .25, snd: 'highlight' });
      if (sel.has('click')) cineGroups(liveWords()).forEach(g => { const w = liveWords()[g[0]]; if (w.start >= b.t0 && w.start < b.t1) ev.push({ t: w.start, snd: 'click' }); });
    } });
  return ev.sort((a, b) => a.t - b.t);
}

/* ---------- voice processing presets (the render uses the same numbers through ffmpeg) ---------- */
const VOICE = {
  off:     { name: 'Off',     hp: 0,  nr: 0,  deess: 0,   ratio: 1, makeup: 0, presence: 0, warmth: 0 },
  light:   { name: 'Light',   hp: 70, nr: 6,  deess: 0.1, ratio: 2, makeup: 1, presence: 1.5, warmth: 0 },
  clean:   { name: 'Clean',   hp: 80, nr: 12, deess: 0.3, ratio: 3, makeup: 2, presence: 3, warmth: 0 },
  podcast: { name: 'Podcast', hp: 90, nr: 18, deess: 0.5, ratio: 4, makeup: 3, presence: 4, warmth: 2 } };
function voiceParams(v) {
  v = v || {}; const P = VOICE[v.preset] || VOICE.off, k = Math.max(0, Math.min(1, (v.amount ?? 100) / 100));
  return { preset: v.preset || 'off', hp: P.hp ? Math.round(30 + (P.hp - 30) * k) : 0, nr: v.nr != null && v.preset !== 'off' ? +v.nr : +(P.nr * k).toFixed(1),
    deess: +(P.deess * k).toFixed(2), ratio: +(1 + (P.ratio - 1) * k).toFixed(2), makeup: +(P.makeup * k).toFixed(1), presence: +(P.presence * k).toFixed(1), warmth: +(P.warmth * k).toFixed(1) };
}

/* ---------- animations: presets that move one thing (a caption word or an element) ----------
   keys: [p, x, y, s, o, r] with p 0..1 through the animation, x/y in % of the thing's own size, s scale, o opacity, r degrees.
   Every preset is written as an entrance; used as an exit it plays backwards. */
const curve = (fn, n = 24) => Array.from({ length: n + 1 }, (_, i) => fn(i / n)).map((k, i) => [+(i / n).toFixed(3), ...k.map(v => +v.toFixed(3))]);
const easeOutBack = x => 1 + 2.70158 * Math.pow(x - 1, 3) + 1.70158 * Math.pow(x - 1, 2), easeOutCubicA = x => 1 - Math.pow(1 - x, 3);
const bounceOut = x => { const n = 7.5625, d = 2.75; if (x < 1 / d) return n * x * x; if (x < 2 / d) return n * (x -= 1.5 / d) * x + .75; if (x < 2.5 / d) return n * (x -= 2.25 / d) * x + .9375; return n * (x -= 2.625 / d) * x + .984375; };
const ANIM_BUILTIN = [
  { id: 'pop', name: 'Pop', dur: .35, ease: 'easeOutBack', keys: curve(p => [0, 0, .4 + .6 * easeOutBack(p), Math.min(1, p * 4), 0]) },
  { id: 'slide-up', name: 'Slide up', dur: .35, ease: 'easeOutCubic', keys: curve(p => [0, 70 * (1 - easeOutCubicA(p)), 1, easeOutCubicA(p), 0]) },
  { id: 'drop-bounce', name: 'Drop and bounce', dur: .6, ease: 'bounce', keys: curve(p => [0, -140 * (1 - bounceOut(p)), 1, Math.min(1, p * 5), 0]) },
  { id: 'fade', name: 'Fade', dur: .25, ease: 'ease-out', keys: curve(p => [0, 0, 1, easeOutCubicA(p), 0], 8) },
  { id: 'zoom-punch', name: 'Zoom punch', dur: .25, ease: 'easeOutCubic', keys: curve(p => [0, 0, 1.8 - .8 * easeOutCubicA(p), Math.min(1, p * 3), 0]) },
  { id: 'swing', name: 'Swing in', dur: .45, ease: 'easeOutBack', keys: curve(p => [0, 0, .7 + .3 * easeOutBack(p), Math.min(1, p * 3), -18 * (1 - easeOutBack(p))]) },
  { id: 'slide-left', name: 'Slide from right', dur: .4, ease: 'easeOutCubic', keys: curve(p => [120 * (1 - easeOutCubicA(p)), 0, 1, Math.min(1, p * 2.5), 0]) },
  // from reel-fonts-and-caption-animations.md: CapCut bounce keyframes (§4.3), Hormozi word pop (§4.1), shake (§4.7)
  { id: 'bounce-in', name: 'Bounce in (CapCut)', dur: .7, ease: 'keyframes', keys: [[0, 0, 27, .9, 0, 0], [.43, 0, -8, 1.05, 1, 0], [.71, 0, 2.7, .98, 1, 0], [1, 0, 0, 1, 1, 0]] },
  { id: 'word-pop', name: 'Word pop (Hormozi)', dur: .15, ease: 'cubic-bezier(0.34,1.56,0.64,1)', keys: [[0, 0, 0, .7, 0, 0], [.4, 0, 0, .95, 1, 0], [.7, 0, 0, 1.08, 1, 0], [1, 0, 0, 1, 1, 0]] },
  { id: 'shake', name: 'Shake', dur: .2, ease: 'decaying jitter', keys: curve(p => [Math.sin(p * Math.PI * 8) * 6 * (1 - p), 0, 1, 1, 0], 24) },
  { id: 'stamp', name: 'Stamp', dur: .3, ease: 'easeOutBack', keys: curve(p => [0, 0, 2.4 - 1.4 * easeOutBack(p), Math.min(1, p * 5), -8 * (1 - p)]) },
];
const MLIB = () => (typeof MOTION_LIB !== 'undefined' ? MOTION_LIB : []);   // the reel motion library (motion.js)
const animLib = () => (S.anims && S.anims.length ? S.anims : ANIM_BUILTIN);
const animById = id => animLib().find(a => a.id === id) || ANIM_BUILTIN.find(a => a.id === id) || MLIB().find(a => a.id === id);
// easing: CSS names, cubic-bezier(...) and spring(stiffness,damping,mass), applied to each step between keyframes as CSS does
function bez(x1, y1, x2, y2) {
  return x => { if (x <= 0) return 0; if (x >= 1) return 1; let t = x;
    for (let i = 0; i < 10; i++) { const cx = 3 * x1 * t * (1 - t) ** 2 + 3 * x2 * t * t * (1 - t) + t ** 3 - x, dx = 3 * x1 * (1 - t) ** 2 + 6 * (x2 - x1) * t * (1 - t) + 3 * (1 - x2) * t * t;
      if (Math.abs(cx) < 1e-5 || Math.abs(dx) < 1e-6) break; t = clamp(t - cx / dx, 0, 1); }
    return 3 * y1 * t * (1 - t) ** 2 + 3 * y2 * t * t * (1 - t) + t ** 3; };
}
const EASE_C = {};
function easeFn(e) {
  e = e || 'linear'; if (EASE_C[e]) return EASE_C[e]; let f = x => x; const m = /^cubic-bezier\(([^)]+)\)$/.exec(e), sp = /^spring\(([^)]+)\)$/.exec(e);
  if (m) { const [a, b, c, d] = m[1].split(',').map(Number); f = bez(a, b, c, d); }
  else if (sp) { const [k, d, ms] = sp[1].split(',').map(Number), w0 = Math.sqrt(k / ms), z = Math.min(.99, d / (2 * Math.sqrt(k * ms))), wd = w0 * Math.sqrt(1 - z * z), T = Math.log(1000) / (z * w0);
    f = x => x >= 1 ? 1 : 1 - Math.exp(-z * w0 * x * T) * (Math.cos(wd * x * T) + z * w0 / wd * Math.sin(wd * x * T)); }
  else f = { ease: bez(.25, .1, .25, 1), 'ease-in': bez(.42, 0, 1, 1), 'ease-out': bez(0, 0, .58, 1), 'ease-in-out': bez(.42, 0, .58, 1) }[e] || f;
  return (EASE_C[e] = f);
}
function trackAt(K, p, f) {
  const n = K.length; if (p <= K[0][0]) return K[0][1]; if (p >= K[n - 1][0]) return K[n - 1][1];
  let i = 1; while (K[i][0] < p) i++; const [p0, a] = K[i - 1], [p1, b] = K[i]; return a + (b - a) * f((p - p0) / Math.max(1e-6, p1 - p0));
}
/* the state of something being animated. x/y: % of its own size; X/Y: cqw; s/sx/sy scale; o opacity; r/ry degrees; blur cqw; glow 0..1;
   clip: share hidden from the right; circ: circle mask 0..1.2; sweep: share drawn round the centre; rgb: colour split cqw; ls: letter spacing em;
   sho/shy/shb: drop shadow; g1x/g1o, g2x/g2o: ghost copies */
const ANIM_ID = { x: 0, y: 0, X: 0, Y: 0, s: 1, sx: 1, sy: 1, o: 1, r: 0, ry: 0, blur: 0, glow: 0, clip: 0, circ: null, sweep: null, rgb: 0, ls: null, sho: 0, shy: 0, shb: 0, g1x: null, g1o: 0, g2x: null, g2o: 0 };
function animAt(a, p) {
  const st = { ...ANIM_ID }; if (!a) return st;
  if (a.keys && a.keys.length) {   // [p, x, y, s, o, r], linear between keys
    const K = a.keys; let v;
    if (p <= K[0][0]) v = K[0].slice(1); else if (p >= K[K.length - 1][0]) v = K[K.length - 1].slice(1);
    else { let i = 1; while (K[i][0] < p) i++; const [p0, ...A] = K[i - 1], [p1, ...B] = K[i], f = (p - p0) / Math.max(1e-6, p1 - p0); v = A.map((x, j) => x + (B[j] - x) * f); }
    [st.x, st.y, st.s, st.o, st.r] = v; return st;
  }
  if (a.T) { const f = easeFn(a.ease); for (const k in a.T) st[k] = trackAt(a.T[k], p, f);
    if (a.shake) { const q = (p * a.dur - a.dur * .55) / (a.shake.ms / 1000); if (q > 0 && q < 1) st.X += Math.sin(q * Math.PI * 6) * a.shake.amp * (1 - q); } }
  return st;
}
function animCss(st) {
  if (Array.isArray(st)) { const [x, y, s, o, r] = st; st = { ...ANIM_ID, x, y, s, o, r }; }
  const n = v => +(+v).toFixed(3);
  let tf = `translate(${n(st.x)}%,${n(st.y)}%)`;
  if (st.X || st.Y) tf += ` translate(${n(st.X)}cqw,${n(st.Y)}cqw)`;
  if (st.ry) tf += ` perspective(60cqw) rotateY(${n(st.ry)}deg)`;
  tf += ` scale(${n(st.s)})`; if (st.sx !== 1 || st.sy !== 1) tf += ` scale(${n(st.sx)},${n(st.sy)})`; if (st.r) tf += ` rotate(${n(st.r)}deg)`;
  const fl = [];
  if (st.blur > .01) fl.push(`blur(${n(st.blur)}cqw)`);
  if (st.glow > .01) fl.push(`drop-shadow(0 0 ${n(st.glow * 2.4)}cqw currentColor)`);
  if (st.sho > .01) fl.push(`drop-shadow(0 ${n(st.shy)}cqw ${n(st.shb)}cqw rgba(0,0,0,${n(st.sho)}))`);
  if (st.rgb > .01) fl.push(`drop-shadow(${n(st.rgb)}cqw 0 0 rgba(255,0,80,.75)) drop-shadow(${n(-st.rgb)}cqw 0 0 rgba(0,225,255,.75))`);
  ['g1', 'g2'].forEach(g => { if (st[g + 'x'] != null && st[g + 'o'] > .01) fl.push(`drop-shadow(${n(st[g + 'x'] - st.X)}cqw 0 0 rgba(255,255,255,${n(st[g + 'o'])}))`); });
  let css = `transform:${tf};opacity:${n(clamp(st.o, 0, 1))}`;
  if (fl.length) css += `;filter:${fl.join(' ')}`;
  if (st.clip > .001) css += `;clip-path:inset(-30% ${n(clamp(st.clip, 0, 1) * 100)}% -30% -30%)`;
  else if (st.circ != null && st.circ < 1.15) css += `;clip-path:circle(${n(Math.max(0, st.circ) * 75)}% at 50% 50%)`;
  if (st.sweep != null && st.sweep < .999) { const m = `conic-gradient(from 0deg,#000 ${n(Math.max(0, st.sweep) * 360)}deg,transparent 0)`; css += `;-webkit-mask-image:${m};mask-image:${m}`; }
  if (st.ls != null) css += `;letter-spacing:${n(st.ls)}em`;
  return css;
}
// state of an in/out pair for something on screen from a to b, at time t
function inOut(t, a, b, inId, outId, inDur, outDur) {
  let st = animAt(null, 0);
  const ai = inId && animById(inId), ao = outId && animById(outId);
  if (ai) { const d = inDur || ai.dur; if (t < a + d) st = animAt(ai, (t - a) / d); }
  if (ao) { const d = outDur || ao.dur; if (t > b - d) st = animAt(ao, (b - t) / d); }
  return st;
}
/* one caption word animated: d is seconds since the word started, raw its text, sty its colour/highlight style, hi the accent.
   Handles the code-drawn ones (typewriter, scramble, glitch, number roll, marker, underline, shake, glint) and per-letter stagger. */
const SCRAMBLE = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#%&@$';
function animWord(a, d, raw, sty, hi) {
  const box = (css, inner) => `<span style="display:inline-block;${css}">${inner}</span>`, col = inner => `<span style="${sty || ''}">${inner}</span>`;
  if (!a) return col(esc(raw));
  const p = clamp(d / (a.dur || .4), 0, 1), f = Math.floor(d * 30), acc = /^#[0-9a-f]{6}$/i.test(hi || '') ? hi : '#FFD400';
  if (a.stagger && a.stagger.unit === 'letter') {
    const ms = (a.stagger.ms || 40) / 1000;
    return col(`<span style="white-space:nowrap">${[...raw].map((ch, i) => ch === ' ' ? ' ' : box(animCss(animAt(a, (d - i * ms) / a.dur)), esc(ch))).join('')}</span>`);
  }
  switch (a.proc) {
    case 'type': { if (d < 0) return box('opacity:0', col(esc(raw))); const k = clamp(Math.floor(d / (a.cps || .035)) + 1, 0, raw.length);
      return col(esc(raw.slice(0, k))) + (k < raw.length || d < raw.length * (a.cps || .035) + .4 ? `<span style="opacity:${Math.floor(d * 3.8) % 2 ? 0 : 1}">▍</span>` : ''); }
    case 'scramble': { if (d < 0) return box('opacity:0', col(esc(raw))); const k = Math.floor(raw.length * p);
      return col(esc([...raw].map((ch, i) => i < k || ch === ' ' ? ch : SCRAMBLE[(i * 7919 + Math.floor(d / .032) * 104729) % SCRAMBLE.length]).join(''))); }
    case 'glitch': { if (d < 0) return box('opacity:0', col(esc(raw))); if (d > a.dur) return col(esc(raw));
      const st = { ...ANIM_ID, X: (((f * 13) % 5) - 2) * .25, rgb: .55 * (1 - p) * (f % 2 ? 1 : .5) }; return box(animCss(st), col(esc(raw))); }
    case 'count': { const m = /\d[\d,]*(\.\d+)?/.exec(raw); if (d < 0) return box('opacity:0', col(esc(raw)));
      if (!m) return box(`opacity:${p.toFixed(2)}`, col(esc(raw)));
      const v = parseFloat(m[0].replace(/,/g, '')), dec = (m[1] || '').length - (m[1] ? 1 : 0), cur = v * easeOutCubicA(p);
      let s2 = cur.toFixed(Math.max(0, dec)); if (/,/.test(m[0])) s2 = s2.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      return col(esc(raw.replace(m[0], s2))); }
    case 'marker': return col(`<span style="background:linear-gradient(${acc}8c,${acc}8c) no-repeat 0 70%/${(ease(p) * 100).toFixed(1)}% 55%;padding:0 .06em">${esc(raw)}</span>`);
    case 'underline': return col(`<span style="background:linear-gradient(currentColor,currentColor) no-repeat 0 100%/${(ease(p) * 100).toFixed(1)}% .09em;padding-bottom:.05em">${esc(raw)}</span>`);
    case 'shake': return box(animCss({ ...ANIM_ID, X: d > 0 && d < a.dur ? Math.sin(d * Math.PI * 50) * (a.amp || .55) * (1 - p) : 0 }), col(esc(raw)));
    case 'glint': { const x = -30 + 160 * ease(p), op = d < 0 || d > a.dur ? 0 : Math.sin(Math.PI * p);
      return `<span style="position:relative;display:inline-block">${col(esc(raw))}<span style="position:absolute;left:0;top:0;white-space:nowrap;background:linear-gradient(110deg,transparent ${x - 14}%,#fff ${x}%,transparent ${x + 14}%);-webkit-background-clip:text;background-clip:text;color:transparent;-webkit-text-stroke:0;text-shadow:none;opacity:${op.toFixed(2)}">${esc(raw)}</span></span>`; }
  }
  return box(animCss(animAt(a, d / a.dur)), col(esc(raw)));
}
// caption words with an animation: S.wordAnims = [{a, b, anim}] (seconds); a word animates when it starts inside a range
const wordAnimFor = w => (S.wordAnims || []).find(r => w.start >= r.a - .01 && w.start <= r.b + .01);
function wordAnimWrap(w, t, inner, raw, sty) {
  const r = wordAnimFor(w), a = r && animById(r.anim); if (!a) return inner;
  if (raw != null && (a.proc || a.stagger)) return animWord(a, t - w.start, raw, sty);
  return `<span style="display:inline-block;${animCss(animAt(a, (t - w.start) / a.dur))}">${inner}</span>`;
}
/* ---------- elements: uploaded images placed on the video ----------
   el: {id, file, start, end, x, y (centre, % of frame), w (% of frame width), rot, look, loop, in, out} */
const LOOKS_EL = [['plain', 'Plain'], ['round', 'Rounded'], ['shadow', 'Shadow'], ['card', 'White card'], ['glass', 'Glass frame'], ['sticker', 'Sticker outline'], ['circle', 'Circle']];
const LOOPS_EL = [['none', 'Still'], ['float', 'Float'], ['pulse', 'Pulse'], ['wobble', 'Wobble'], ['spin', 'Slow spin'], ['kenburns', 'Ken Burns (slow push)'], ['breathe', 'Breathe'], ['glow', 'Glow breathe']];
function elementHtml(e, t) {
  if (t < e.start || t > e.end) return '';
  const st = inOut(t, e.start, e.end, e.in, e.out), lt = t - e.start;
  let lx = 0, ly = 0, ls = 1, lr = 0;
  if (e.loop === 'float') ly = Math.sin(lt * 2.2) * 3; if (e.loop === 'pulse') ls = 1 + .04 * Math.sin(lt * 5);
  if (e.loop === 'wobble') lr = Math.sin(lt * 3) * 4; if (e.loop === 'spin') lr = lt * 40;
  if (e.loop === 'kenburns') ls = 1 + .18 * bez(.45, 0, .55, 1)(clamp(lt / Math.max(1, e.end - e.start), 0, 1));
  if (e.loop === 'breathe') ls = 1 + .0125 * (1 - Math.cos(lt * Math.PI * 2 / 2.4));
  const lg = e.loop === 'glow' ? `filter:drop-shadow(0 0 ${(1 + 1.6 * (.5 - .5 * Math.cos(lt * Math.PI * 2 / 1.8))).toFixed(2)}cqw #fffc);` : '';
  const look = { plain: '', round: 'border-radius:3cqw;', shadow: 'filter:drop-shadow(0 1.2cqw 2.4cqw #000a);', card: 'background:#fff;padding:1.4cqw;border-radius:2.4cqw;box-shadow:0 1.4cqw 3cqw #0008;',
    glass: 'background:#ffffff26;padding:1.6cqw;border-radius:3cqw;border:.3cqw solid #ffffff66;box-shadow:0 1.4cqw 3cqw #0006;backdrop-filter:blur(2cqw);-webkit-backdrop-filter:blur(2cqw);',
    sticker: 'filter:drop-shadow(.7cqw 0 0 #fff) drop-shadow(-.7cqw 0 0 #fff) drop-shadow(0 .7cqw 0 #fff) drop-shadow(0 -.7cqw 0 #fff) drop-shadow(0 1cqw 1.6cqw #0008);',
    circle: 'border-radius:50%;aspect-ratio:1;object-fit:cover;' }[e.look || 'plain'] || '';
  const inner = look.startsWith('background') ? `<div style="${look}"><img src="${shotBase()}${encodeURIComponent(e.file)}" style="display:block;width:100%;border-radius:1.6cqw"></div>`
    : `<img src="${shotBase()}${encodeURIComponent(e.file)}" style="display:block;width:100%;${look}">`;
  return `<div style="position:absolute;left:${e.x}%;top:${e.y}%;width:${e.w}%;transform:translate(-${SAFE_ON ? e.x : 50}%,-${SAFE_ON ? e.y : 50}%) rotate(${(e.rot || 0) + lr}deg) translateY(${ly}cqw) scale(${ls});${lg}">` +
    `<div style="${animCss(st)};transform-origin:50% 50%">${inner}</div></div>`;
}
const elementsHtml = (t, els) => (els || []).map(e => elementHtml(e, t)).join('');

/* ---------- transitions and overlays on the whole frame (MOTION_FRAME in motion.js): cfg.trans = [{id, a, b}]
   a transition plays from a for its own length; an overlay (span) shows from a to b */
const frameDef = id => (typeof MOTION_FRAME !== 'undefined' ? MOTION_FRAME : []).find(d => d.id === id);
function frameFx(it, t, cfg) {
  const d = frameDef(it.id); if (!d) return null;
  const len = d.span ? null : d.dur + (d.kind === 'flash' ? .14 : 0), b = d.span ? (it.b ?? S.dur ?? 1e9) : it.a + len;
  if (t < it.a || t > b) return null;
  const lt = t - it.a, p = d.span ? 0 : clamp(lt / d.dur, 0, 1), f = Math.floor(lt * 30), out = { html: '', scale: 1, vt: '', blur: 0 };
  const box = css => `<div style="position:absolute;pointer-events:none;${css}"></div>`;
  const z = SAFE_ZONES[cfg.safe] || SAFE_ZONES.all;
  switch (d.kind) {
    case 'flash': out.html = box(`inset:0;background:${d.color};opacity:${(d.o * (lt < d.dur ? 1 : 1 - ease((lt - d.dur) / .14))).toFixed(3)}`); break;
    case 'leak': { const q = Math.sin(Math.PI * p), x = -20 + 50 * ease(p);
      out.html = box(`inset:-10%;mix-blend-mode:screen;opacity:${(q * (d.o || .7)).toFixed(3)};background:radial-gradient(ellipse 55% 42% at ${30 + x}% 38%,rgba(255,150,60,.95),rgba(255,80,40,.45) 45%,transparent 72%),radial-gradient(ellipse 38% 60% at ${72 + x * .6}% 72%,rgba(255,210,120,.75),transparent 70%)`); break; }
    case 'glitch': { const k = d.i || .4;
      for (let j = 0; j < 5; j++) out.html += box(`left:0;right:0;top:${(f * 31 + j * 17) % 92}%;height:${3 + (f * 7 + j * 5) % 9}%;background:${j % 2 ? 'rgba(0,225,255,.28)' : 'rgba(255,0,80,.28)'};mix-blend-mode:screen;backdrop-filter:hue-rotate(${(f * 47 + j * 60) % 360}deg) saturate(2);transform:translateX(${(((f * 13 + j * 29) % 21) - 10) * k}%)`);
      out.vt = `translate(${((((f * 17) % 9) - 4) * k * .8).toFixed(2)}%,0)`; break; }
    case 'whip': { const q = Math.sin(Math.PI * p); out.scale = 1 + .3 * q; out.blur = (d.blur || 30) / 10.8 * q; out.vt = `translateX(${((.5 - p) * 50 * q).toFixed(2)}%)`; break; }
    case 'iris': { const r = 1.2 * bez(.22, 1, .36, 1)(p) * 70; out.html = box(`inset:0;background:radial-gradient(circle at 50% 50%,transparent ${r.toFixed(2)}%,#000 ${(r + .6).toFixed(2)}%)`); break; }
    case 'tear': { const x = 100 * bez(.22, 1, .36, 1)(p), pts = o => Array.from({ length: 13 }, (_, k) => `${(x + o + (k % 2 ? 2.4 : -2.4) + ((k * 37) % 5) * .4).toFixed(2)}% ${(k * 100 / 12).toFixed(2)}%`).join(',');
      out.html = box(`inset:0;background:#f4efe6;clip-path:polygon(${pts(-1.4)},100% 100%,100% 0)`) + box(`inset:0;background:#000;clip-path:polygon(${pts(0)},100% 100%,100% 0)`); break; }
    case 'shake': { const a = (d.amp || 10) / 10.8 * (1 - p); out.scale = 1.03; out.vt = `translate(${(Math.sin(lt * 90) * a).toFixed(3)}cqw,${(Math.cos(lt * 70) * a * .6).toFixed(3)}cqw)`; break; }
    case 'grain': out.html = GRAIN(d.o || .18).replace('background-size:240px', `background-size:240px;background-position:${(f * 37) % 240}px ${(f * 53) % 240}px`) +
      box('inset:0;background:radial-gradient(ellipse at 50% 50%,transparent 55%,rgba(0,0,0,.45))'); break;
    case 'hud': { const tc = n => String(n).padStart(2, '0'), s0 = Math.floor(t), rec = Math.floor(t / .5) % 2 === 0;
      const txt = `font-family:'Space Mono',monospace;font-size:3.2cqw;color:#fff;opacity:.88;text-shadow:0 .2cqw .6cqw #000a;position:absolute`;
      out.html = `<div style="position:absolute;left:${z.l}%;right:${z.r}%;top:${z.t}%;bottom:${z.b}%;pointer-events:none">
        <div style="${txt};left:0;top:0"><span style="color:#ff3b30;opacity:${rec ? 1 : 0}">●</span> REC</div>
        <div style="${txt};right:0;top:0">${tc(Math.floor(s0 / 3600))}:${tc(Math.floor(s0 / 60) % 60)}:${tc(s0 % 60)}:${tc(Math.floor((t % 1) * 24))}</div>
        <div style="${txt};left:0;bottom:0">ISO 400 · 1/50 · f/2.8</div><div style="${txt};right:0;bottom:0">4K 24 ▮▮▮▯</div>
        ${d.af ? ['left:38%;top:42%;border-width:.35cqw 0 0 .35cqw', 'right:38%;top:42%;border-width:.35cqw .35cqw 0 0', 'left:38%;bottom:42%;border-width:0 0 .35cqw .35cqw', 'right:38%;bottom:42%;border-width:0 .35cqw .35cqw 0'].map(c => `<div style="position:absolute;${c};width:4cqw;height:4cqw;border-style:solid;border-color:#fff;opacity:.8"></div>`).join('') : ''}</div>`; break; }
    case 'bar': { const dur = S.dur || 1, acc = G(cfg.grade)[3];
      out.html = box(`left:${z.l}%;right:${z.r}%;top:${z.t}%;height:.75cqw;border-radius:.4cqw;background:#ffffff40`) + box(`left:${z.l}%;top:${z.t}%;height:.75cqw;border-radius:.4cqw;width:${((100 - z.l - z.r) * clamp(t / dur, 0, 1)).toFixed(2)}%;background:${acc}`) +
        (d.ticks ? (S.beats || []).slice(1).map(bt => box(`left:${(z.l + (100 - z.l - z.r) * bt.t0 / dur).toFixed(2)}%;top:${z.t}%;width:.4cqw;height:.75cqw;background:#000a`)).join('') : ''); break; }
  }
  return out;
}

/* ---------- safe zones for normal (organic) posts, px on 1080x1920 as % of the frame ----------
   From vidova.ai/blog/instagram-reels-tiktok-youtube-shorts-safe-zones (Nov 2026). The apps don't publish these for normal posts;
   check a real post on a phone. "Ads" is Meta's Reels ad guidance (14% top, 35% bottom, 6% sides), much larger because ads add buttons. */
const SAFE_ZONES = {
  all: { name: 'All socials', t: 180 / 19.2, b: 380 / 19.2, l: 60 / 10.8, r: 150 / 10.8 },
  instagram: { name: 'Instagram Reels', t: 108 / 19.2, b: 320 / 19.2, l: 60 / 10.8, r: 120 / 10.8 },
  tiktok: { name: 'TikTok', t: 130 / 19.2, b: 320 / 19.2, l: 44 / 10.8, r: 140 / 10.8 },
  youtube: { name: 'YouTube Shorts', t: 180 / 19.2, b: 380 / 19.2, l: 60 / 10.8, r: 150 / 10.8 },
  ads: { name: 'Ads (Meta Reels)', t: 269 / 19.2, b: 672 / 19.2, l: 65 / 10.8, r: 65 / 10.8 } };
let SAFE_ON = false;   // set by compose while it draws the parts that live inside the zone
