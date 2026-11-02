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
  grade: 'raw', font: 'inter', caption: null, hook: null, fx: {}, whole: new Set(), snd: new Set(), done: new Set(), sound: false, capEdit: {}, lutAmount: 100, cuts: [], wordsLive: null, voice: { preset: 'off', amount: 100, nr: null } };
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
const CAP_BASE = { group: 3, hl: 'none', size: 8, weight: 800, y: 64, upper: false, lower: false, stroke: 0, box: false, boxColor: '#000000', boxAlpha: .73,
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
 ["DM Serif Display","ital@0;1","Serif"],["Playfair Display","ital,wght@0,700;1,700","Serif"],["Lora","ital,wght@0,600;0,700;1,600","Serif"],
 ["Space Mono","wght@400;700","Mono"],["JetBrains Mono","wght@400;500;700;800","Mono"],["IBM Plex Mono","wght@400;700","Mono"]]/*END*/;
const gfontsUrl = () => 'https://fonts.googleapis.com/css2?' + GFONTS.map(([f, ax]) => 'family=' + f.replace(/ /g, '+') + (ax ? ':' + ax : '')).join('&') + '&display=swap';
if (typeof document !== 'undefined' && document.head && !document.getElementById('gfonts')) document.head.insertAdjacentHTML('beforeend', `<link id="gfonts" rel="stylesheet" href="${gfontsUrl()}">`);
const CAP_FONTS = GFONTS.map(f => f[0]);
// every family as a single-font choice too (the pairs above stay as the Font pair cards)
GFONTS.forEach(([f, , cat]) => FONTS.push(['g:' + f.toLowerCase().replace(/[^a-z0-9]+/g, '-'), f, `"${f}"`, `"${f}"`, cat]));
function capOpts(id, over) {
  const o = { ...CAP_BASE, ...(CAP_DEF[id] || {}) };
  Object.entries(over || {}).forEach(([k, v]) => { if (v !== null && v !== undefined && v !== '') o[k] = v; });
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
  const wpop = (x, k, html) => { if (o.anim !== 'wordpop') return html; const d = tt - x.start; html = html.replace(/ (<\/(span|i)>)$/, '$1');   // the space goes outside the scaled word
    if (g + k > i || d < 0) return `<span style="opacity:0">${html}</span> `;
    const p = clamp(d / .15, 0, 1), sc = p < .7 ? .7 + .38 * ease(p / .7) : 1.08 - .08 * ease((p - .7) / .3);
    return `<span style="display:inline-block;transform:scale(${sc.toFixed(3)});opacity:${clamp(d / .06, 0, 1).toFixed(2)}">${html}</span> `; };
  let inner;
  if (o.anim === 'type') {
    const w = W[i], frac = clamp((tt - w.start) / Math.max(.2, w.end - w.start), 0, 1);
    inner = esc(fmt(ws.filter((x, k) => g + k < i).map(x => x.word).join(' ') + (i > g ? ' ' : '') + w.word.slice(0, Math.ceil(w.word.length * frac)))) + `<span style="opacity:${Math.floor(t * 4) % 2}">▍</span>`;
  } else inner = ws.map((x, k) => wpop(x, k, (() => {
    const cur = g + k === i, txt = esc(fmt(x.word));
    if (wordAnimFor(x)) return wordAnimWrap(x, tt, `<span style="color:${o.hl === 'current' && cur || o.hl === 'spoken' && g + k <= i ? hi : o.color}">${txt}</span>`) + ' ';
    if (o.hl === 'current') return `<span style="color:${cur ? hi : o.color}">${txt} </span>`;
    if (o.hl === 'spoken') return `<span style="color:${g + k <= i ? hi : o.color};opacity:${g + k <= i ? 1 : .6}">${txt} </span>`;
    if (o.hl === 'key') return k === key ? `<i style="font-family:'DM Serif Display',serif;color:${hi};font-size:1.2em">${txt} </i>` : `<span style="color:${o.color}">${txt} </span>`;
    if (o.hl === 'box') return `<span style="display:inline-block;margin:.5cqw;padding:.6cqw 2cqw;border-radius:1cqw;background:${cur ? hi : o.boxColor + 'cc'};color:${cur ? '#000' : o.color}">${txt}</span>`;
    if (o.hl === 'boxactive') return `<span style="display:inline-block;padding:.2cqw 1cqw;border-radius:1cqw;background:${cur ? hi : 'transparent'};color:${cur ? '#000' : o.color}">${txt}</span> `;
    if (o.hl === 'keycolor') return `<span style="color:${k === key ? hi : o.color}">${txt} </span>`;
    if (o.hl === 'dim') return `<span style="color:${o.color};opacity:${cur ? 1 : .4}">${txt} </span>`;
    if (o.hl === 'weight') return `<span style="color:${o.color};font-weight:${cur ? 700 : o.weight}">${txt} </span>`;
    return `<span style="color:${o.color}">${txt} </span>`; })())).join('');
  const ta = tt - (n === 1 ? W[i].start : W[g].start);
  let tr = '', op = 1;
  if (o.anim === 'pop') tr = `scale(${.8 + .2 * ease(ta / .12)})`;
  if (o.anim === 'slide') { tr = `translateY(${(1 - ease(ta / .18)) * 3}cqw)`; op = ease(ta / .18); }
  if (o.anim === 'fade') op = ease(ta / .3);
  if (o.anim === 'flash') { const p = clamp(ta / .35, 0, 1); tr = `scale(${(p < .6 ? .8 + .25 * ease(p / .6) : 1.05 - .05 * ease((p - .6) / .4)).toFixed(3)})`; op = clamp(ta / .05, 0, 1); }
  if (o.anim === 'bounce') { const [, y, sc, o2] = animAt(animById('bounce-in'), ta / .45); tr = `translateY(${y.toFixed(2)}%) scale(${sc.toFixed(3)})`; op = o2; }
  const y = clamp(o.y, 12, 76), side = o.align === 'left' ? 'left:8%;right:8%' : 'left:6%;right:6%';
  const css = `position:absolute;${side};top:${y}%;text-align:${o.align};font-family:${o.font ? `'${o.font}'` : 'var(--hf)'},sans-serif;font-weight:${o.weight};font-size:${o.size}cqw;line-height:1.15;` +
    `text-shadow:${o.stroke ? `0 .5cqw 0 #000` : `0 .3cqw 1.2cqw #000a`};` + (o.stroke ? `-webkit-text-stroke:${o.stroke}cqw #000;paint-order:stroke fill;` : '') +
    (o.box && o.hl !== 'box' ? `background:${plate};padding:1.5cqw;border-radius:1cqw;width:fit-content;${o.align === 'left' ? '' : 'margin:0 auto;left:0;right:0;'}` : '') +
    `transform:${tr || 'none'};opacity:${op}`;
  return `<div class="cap" style="${css}">${inner}</div>`;
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
  const small = list => list.map(w => wordAnimFor(w) ? wordAnimWrap(w, t, fmt(w)) : `<span style="opacity:${seen(w)};transition:none">${fmt(w)}</span>`).join(' ');
  const before = ws.slice(0, k), after = ws.slice(k + 1), kw = ws[k], kIn = ease((t - kw.start + .05) / .22);
  const big = serif ? `font-family:'Playfair Display',serif;font-style:italic;font-weight:700;color:${opt.serifInk || accent}`
                    : `font-family:Inter,sans-serif;font-weight:800;color:${ink};letter-spacing:-.02em`;
  return `<div style="position:absolute;left:6%;right:6%;top:${y}%;transform:translateY(-50%);text-align:center;color:${ink};font-family:Inter,sans-serif;text-shadow:${opt.shadow ?? '0 .3cqw 1.4cqw #0008'};opacity:${ease(ta / .15)}">
    ${before.length ? `<div style="font-size:4.2cqw;font-weight:500;opacity:.92;margin-bottom:.6cqw">${small(before)}</div>` : ''}
    <div style="font-size:${opt.size || 13}cqw;line-height:.95;${big};${wordAnimFor(kw) ? '' : `opacity:${kIn};transform:scale(${1.08 - .08 * kIn})`}">${wordAnimFor(kw) ? wordAnimWrap(kw, t, fmt(kw)) : fmt(kw)}</div>
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
    html += elementsHtml(t, cfg.els);
    const bs = S.beats, bi = bs.findIndex(x => t >= x.t0 && t < x.t1), bt = bs[bi];
    const sc = bt ? ((cfg.scenes && cfg.scenes[bi]) || bt) : null, scene = sc && sc.scene && sc.scene !== 'aroll' ? sc : null;
    if (scene) html += sceneHtml(scene, t - bt.t0, bt, t, acc);
    else if (cfg.caption === 'cinematic') html += cineBlock(t, { accent: acc === '#ffffff' ? '#4d7dff' : acc, y: capOpts('cinematic', cfg.capOpts).y });
    else if (cfg.caption) html += caption(cfg.caption, t, acc, cfg.capOpts);
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
const animLib = () => (S.anims && S.anims.length ? S.anims : ANIM_BUILTIN);
const animById = id => animLib().find(a => a.id === id) || ANIM_BUILTIN.find(a => a.id === id);
function animAt(a, p) {   // state of animation a at progress p (0..1), linear between its keys
  const K = a.keys; if (!K || !K.length) return [0, 0, 1, 1, 0];
  if (p <= K[0][0]) return K[0].slice(1); if (p >= K[K.length - 1][0]) return K[K.length - 1].slice(1);
  let i = 1; while (K[i][0] < p) i++;
  const [p0, ...A] = K[i - 1], [p1, ...B] = K[i], f = (p - p0) / Math.max(1e-6, p1 - p0);
  return A.map((v, j) => v + (B[j] - v) * f);
}
const animCss = ([x, y, s, o, r]) => `transform:translate(${x.toFixed(2)}%,${y.toFixed(2)}%) scale(${s.toFixed(3)}) rotate(${r.toFixed(2)}deg);opacity:${clamp(o, 0, 1).toFixed(3)}`;
// state of an in/out pair for something on screen from a to b, at time t
function inOut(t, a, b, inId, outId, inDur, outDur) {
  let st = [0, 0, 1, 1, 0];
  const ai = inId && animById(inId), ao = outId && animById(outId);
  if (ai) { const d = inDur || ai.dur; if (t < a + d) st = animAt(ai, (t - a) / d); }
  if (ao) { const d = outDur || ao.dur; if (t > b - d) st = animAt(ao, (b - t) / d); }
  return st;
}
// caption words with an animation: S.wordAnims = [{a, b, anim}] (seconds); a word animates when it starts inside a range
const wordAnimFor = w => (S.wordAnims || []).find(r => w.start >= r.a - .01 && w.start <= r.b + .01);
function wordAnimWrap(w, t, inner) {
  const r = wordAnimFor(w), a = r && animById(r.anim); if (!a) return inner;
  return `<span style="display:inline-block;${animCss(animAt(a, (t - w.start) / a.dur))}">${inner}</span>`;
}
/* ---------- elements: uploaded images placed on the video ----------
   el: {id, file, start, end, x, y (centre, % of frame), w (% of frame width), rot, look, loop, in, out} */
const LOOKS_EL = [['plain', 'Plain'], ['round', 'Rounded'], ['shadow', 'Shadow'], ['card', 'White card'], ['glass', 'Glass frame'], ['sticker', 'Sticker outline'], ['circle', 'Circle']];
const LOOPS_EL = [['none', 'Still'], ['float', 'Float'], ['pulse', 'Pulse'], ['wobble', 'Wobble'], ['spin', 'Slow spin']];
function elementHtml(e, t) {
  if (t < e.start || t > e.end) return '';
  const [x, y, s, o, r] = inOut(t, e.start, e.end, e.in, e.out), lt = t - e.start;
  let lx = 0, ly = 0, ls = 1, lr = 0;
  if (e.loop === 'float') ly = Math.sin(lt * 2.2) * 3; if (e.loop === 'pulse') ls = 1 + .04 * Math.sin(lt * 5);
  if (e.loop === 'wobble') lr = Math.sin(lt * 3) * 4; if (e.loop === 'spin') lr = lt * 40;
  const look = { plain: '', round: 'border-radius:3cqw;', shadow: 'filter:drop-shadow(0 1.2cqw 2.4cqw #000a);', card: 'background:#fff;padding:1.4cqw;border-radius:2.4cqw;box-shadow:0 1.4cqw 3cqw #0008;',
    glass: 'background:#ffffff26;padding:1.6cqw;border-radius:3cqw;border:.3cqw solid #ffffff66;box-shadow:0 1.4cqw 3cqw #0006;backdrop-filter:blur(2cqw);-webkit-backdrop-filter:blur(2cqw);',
    sticker: 'filter:drop-shadow(.7cqw 0 0 #fff) drop-shadow(-.7cqw 0 0 #fff) drop-shadow(0 .7cqw 0 #fff) drop-shadow(0 -.7cqw 0 #fff) drop-shadow(0 1cqw 1.6cqw #0008);',
    circle: 'border-radius:50%;aspect-ratio:1;object-fit:cover;' }[e.look || 'plain'] || '';
  const inner = look.startsWith('background') ? `<div style="${look}"><img src="${shotBase()}${encodeURIComponent(e.file)}" style="display:block;width:100%;border-radius:1.6cqw"></div>`
    : `<img src="${shotBase()}${encodeURIComponent(e.file)}" style="display:block;width:100%;${look}">`;
  return `<div style="position:absolute;left:${e.x}%;top:${e.y}%;width:${e.w}%;transform:translate(-50%,-50%) rotate(${(e.rot || 0) + lr}deg) translateY(${ly}cqw) scale(${ls})">` +
    `<div style="${animCss([x, y, s, o, r])};transform-origin:50% 50%">${inner}</div></div>`;
}
const elementsHtml = (t, els) => (els || []).map(e => elementHtml(e, t)).join('');
