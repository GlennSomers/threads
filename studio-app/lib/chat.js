// "Tell the editor what to change": sends the current edit and the request to Claude, gets back a reply and a list of edits.
// The browser applies the edits itself (same code paths as clicking), so nothing here touches files.
import Anthropic from '@anthropic-ai/sdk';

const MODEL = process.env.STUDIO_CHAT_MODEL || 'claude-opus-5-5';
const OPS = ['add_effect', 'update_effect', 'remove_effect', 'select_effect', 'set_grade', 'set_lut_amount', 'set_font', 'set_captions', 'caption_option',
  'set_hook', 'set_whole', 'set_sounds', 'set_voice', 'cut', 'restore_cuts', 'seek',
  'animate_words', 'clear_word_animations', 'add_element', 'update_element', 'remove_element'];
const num = { type: ['number', 'null'] }, str = { type: ['string', 'null'] };
const SCHEMA = {
  type: 'object', additionalProperties: false, required: ['reply', 'ops'],
  properties: {
    reply: { type: 'string' },
    ops: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['op', 'id', 'fx', 'start', 'end', 'value', 'key', 'opts'],
      properties: { op: { type: 'string', enum: OPS }, id: str, fx: str, start: num, end: num, value: str, key: str,
        opts: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['key', 'value'], properties: { key: { type: 'string' }, value: { type: 'string' } } } } } } },
  },
};

const RULES = `You edit short vertical talking-head videos (Instagram reels) inside a web editor. The person types or says what they want changed; you answer with a short reply and the edits that do it.

How to answer
- "reply": one or two plain sentences saying what you changed, or the one thing you need to know. No lists, no markdown.
- "ops": the edits, applied in order. Use only ids, effects and option values from the lists below. Leave a field null when the op does not use it, and opts [] when there are none.
- If the request is unclear or impossible, return no ops and ask one short question, or say what the editor cannot do.
- Do what was asked and nothing extra. Keep everything else as it is.

Ops
- add_effect: fx, start, end (seconds of the clip), opts [{key, value}] from that effect's options. Good effect windows are 1.5 to 4 seconds. Put it on the words the person names: use the transcript times. With no timing given, start at the playhead.
- update_effect: id of an existing effect, plus any of start, end, opts to change (null start/end = keep). opts given here replace those keys only.
- remove_effect: id. select_effect: id (opens it in the side panel).
- set_grade: value = a grade id. set_lut_amount: value = 0 to 100 (only when a LUT is on).
- set_font: value = a font id. set_captions: value = a caption style id, or "none". caption_option: key and value from the caption options list.
- set_hook: value = a hook id, or "none" (the title over the first beat).
- set_whole: value = whole-clip effect ids joined with commas ("" for none). set_sounds: value = sound ids joined with commas, the full new set ("" for none).
- set_voice: value = a voice preset id; start = amount 0 to 100 (null keeps it).
- cut: start, end = a part of the clip to cut out. restore_cuts: undo every cut.
- seek: start = move the playhead there.
- animate_words: value = an animation id; start, end = the start times of the first and last word to animate (from the transcript). Words show with that animation as they are spoken.
- clear_word_animations: start, end = remove word animations in that time range (both null = remove all).
- add_element: value = an uploaded element file; start, end; opts from x, y (centre, % of the frame, keep y between 15 and 75 so captions and the app's buttons stay clear), w (% of frame width), rot, look, loop, in, out (animation ids, or "none").
- update_element: id (or the selected element), start/end or null, opts as for add_element. remove_element: id.

"This effect", "it" or "that" means the selected effect or element when there is one. Times in the state are seconds. Effects are drawn in the render, after the colour grade; captions and titles go on top of them. Effects never cover the face: they sit behind the head or beside it. Zoom never goes past 2.`;

export async function chat({ message, state, catalog, history }) {
  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) return { error: 'Set ANTHROPIC_API_KEY in the Vercel project to use the edit chat.' };
  if (!String(message || '').trim()) return { error: 'Say what to change.' };
  const client = new Anthropic({ timeout: 55_000, maxRetries: 1 });
  const msgs = [];
  for (const h of (Array.isArray(history) ? history : []).slice(-12)) {
    if (!h || !h.text || !['user', 'assistant'].includes(h.role)) continue;
    if (msgs.length && msgs[msgs.length - 1].role === h.role) msgs[msgs.length - 1].content += '\n' + String(h.text);
    else if (msgs.length || h.role === 'user') msgs.push({ role: h.role, content: String(h.text).slice(0, 2000) });
  }
  if (msgs.length && msgs[msgs.length - 1].role === 'user') msgs.pop();
  msgs.push({ role: 'user', content: `<editor_state>\n${JSON.stringify(state).slice(0, 60000)}\n</editor_state>\n\n${String(message).slice(0, 2000)}` });
  const res = await client.beta.messages.create({
    model: MODEL, max_tokens: 16000,
    betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default',
    output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
    system: [{ type: 'text', text: RULES + '\n\nWhat the editor offers\n' + JSON.stringify(catalog || {}), cache_control: { type: 'ephemeral' } }],
    messages: msgs,
  });
  if (res.stop_reason === 'refusal') return { reply: "I can't help with that one.", ops: [] };
  if (res.stop_reason === 'max_tokens') return { error: 'The answer was cut off. Try a smaller request.' };
  const text = res.content.filter(b => b.type === 'text').map(b => b.text).join('');
  try { const out = JSON.parse(text); return { reply: String(out.reply || ''), ops: Array.isArray(out.ops) ? out.ops : [] }; }
  catch { return { error: 'Claude answered in a form the editor could not read. Try again.' }; }
}
