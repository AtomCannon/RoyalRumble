// Scripted rumbles: export a prompt for any LLM (local Qwen via Ollama/LM Studio, or paste anywhere), import the JSON it
// writes back, validate it against the roster, and hand it to the rumble as a list of beats.
window.P = window.P || {};
(function () {
  const U = P.util, C = P.char;
  const S = P.script = { current: U.load('punchma.script', null), llm: Object.assign({ url: 'http://localhost:11434/v1', model: 'qwen3.5', key: '' }, U.load('punchma.llm', {})) };
  S.saveLLM = () => U.save('punchma.llm', S.llm);

  S.describe = (ch) => {
    const b = ch.body, it = (slot, id) => { const i = P.items.get(slot, id); return i && i.id !== 'none' ? i.name : null; };
    const size = b.height < 0.75 ? 'tiny' : b.height > 1.25 ? 'towering' : 'average height';
    const bits = [C.BODY_TYPES.find(t => t[0] === b.type)?.[1] + ' body', size, b.headSize > 1.3 ? 'huge head' : null, b.armLength > 1.4 ? 'very long arms' : null, b.legLength < 0.6 ? 'stubby legs' : null,
      it('hair', ch.hair.style) ? it('hair', ch.hair.style) + ' hair' : 'bald', it('hat', ch.hat.id), it('shirt', ch.shirt.id) || 'shirtless', it('pants', ch.pants.id) || 'no pants (censored)', it('shoes', ch.shoes.id), it('extra', ch.extra.id) ? 'carrying a ' + it('extra', ch.extra.id) : null, ch.rig && ch.rig.src ? 'custom drawn character' : null].filter(Boolean);
    return bits.join(', ');
  };
  S.rosterForPrompt = (chars) => chars.map(ch => ({ name: ch.name, tagline: 'the ' + C.tagline(ch), persona: P.data.persona(ch.persona).name, hometown: ch.hometown, weight: ch.weight, gender: ch.gender, pronouns: C.pron(ch).label, catchphrase: ch.catchphrase, look: S.describe(ch) }));

  S.buildPrompt = (chars) => `You are writing the script for PUNCHMA, a crude, absurd, South-Park-style comedy wrestling royal rumble played out by a browser game. The fighters below walk out one at a time into a ring and fight until one is left. Two commentators, Gary Gristle (loud, dumb, enthusiastic, has been drinking) and Tonya Thunderfist (deadpan, exhausted, secretly loves it), call the action and talk to each other. A ring announcer reads the intros.

Write an EPIC, funny, curated story arc for tonight using ONLY these fighters:
${JSON.stringify(S.rosterForPrompt(chars), null, 1)}

Rules for the story:
- Pick an entrance ORDER with a dramatic arc (a weak opener, a mid-show surprise, a late big entrance, a final-entrant twist).
- Use each fighter's persona, tagline, look, hometown and catchphrase for jokes and for how they fight. Invent custom moves that fit them (e.g. a grandma stuns a baby by baking cookies; a robot buffers mid-suplex).
- Fights should have momentum swings, betrayals, alliances that fall apart, running gags, callbacks, and at least one completely ridiculous event.
- Every fighter except the winner must eventually be ELIMINATED (thrown over the top rope). Exactly one winner at the end.
- Spoken lines are read aloud by text-to-speech: keep each line under 25 words, no emoji, no stage directions, no asterisks.
- Crude and stupid is good. No slurs.

Output ONLY a JSON object (no markdown, no commentary) in exactly this shape:
{
 "title": "short title for tonight's show",
 "order": ["Fighter Name", "..."],                     // entrance order, every fighter exactly once
 "intros": { "Fighter Name": "optional custom ring-announcer intro, one or two sentences" },
 "beats": [
  { "type": "commentary", "lines": [ { "who": "Gary", "text": "..." }, { "who": "Tonya", "text": "..." } ] },
  { "type": "entrance", "who": "Fighter Name" },        // optional: forces this fighter to come out now; otherwise they come out on a timer in 'order'
  { "type": "attack", "attacker": "Name", "defender": "Name", "move": "COOKIE AMBUSH", "popup": "COOKIES!", "damage": 25, "effect": "stun", "setup": [ { "who": "Tonya", "text": "said before the move" } ], "lines": [ { "who": "Gary", "text": "said after it lands" } ] },
  { "type": "event", "who": "Name", "text": "announcer describes what happens", "effect": "chair", "lines": [ ... ] },
  { "type": "eliminate", "attacker": "Name", "defender": "Name", "move": "GRANDMA SLAM", "lines": [ { "who": "Gary", "text": "..." }, { "who": "Tonya", "text": "..." } ] },
  { "type": "winner", "who": "Name", "lines": [ ... ] }
 ]
}
Allowed "effect" values for attacks: none, stun, knockdown, lowblow, heal (attacker heals), rage (attacker double damage), chair (attacker gets a chair).
Allowed "effect" values for events: heal, stun, rage, chair, beer, shield, blind, ghost, banana, nap, quake, ref, slurpee, none.
Allowed "who" values for lines: Gary, Tonya, Announcer.
Aim for 18 to 30 beats. "damage" is 5 to 40 (fighters have 100 health; use several attacks before an eliminate). Only use fighter names exactly as given.`;

  S.parse = (text) => {
    let t = String(text || '').trim();
    t = t.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
    const a = t.indexOf('{'), b = t.lastIndexOf('}'); if (a < 0 || b < 0) throw new Error('No JSON object found');
    t = t.slice(a, b + 1).replace(/\/\/[^\n"]*$/gm, ''); // tolerate trailing // comments outside strings (mostly)
    try { return JSON.parse(t); } catch (e) { return JSON.parse(t.replace(/,\s*([}\]])/g, '$1')); }
  };
  const ROLE = (who) => { const w = String(who || '').toLowerCase(); return w.startsWith('g') ? 'gary' : w.startsWith('t') ? 'tonya' : 'ann'; };
  const LINES = (arr) => Array.isArray(arr) ? arr.map(l => Array.isArray(l) ? [ROLE(l[0]), String(l[1] || '')] : [ROLE(l.who || l.speaker), String(l.text || l.line || '')]).filter(l => l[1]) : null;
  S.resolve = (name, chars) => {
    if (!name) return null; const n = String(name).trim().toLowerCase();
    return chars.find(c => c.id === name) || chars.find(c => c.name.toLowerCase() === n) || chars.find(c => c.name.toLowerCase().includes(n) || n.includes(c.name.toLowerCase())) || null;
  };
  // Validate + normalize into what rumble.js executes. Returns { order, intros, beats, title, warnings }
  S.prepare = (raw, chars) => {
    const warn = []; const R = (n) => S.resolve(n, chars);
    const order = []; for (const n of raw.order || []) { const c = R(n); if (c && !order.includes(c)) order.push(c); else if (!c) warn.push(`Unknown fighter in order: "${n}"`); }
    for (const c of chars) if (!order.includes(c)) { order.push(c); warn.push(`${c.name} missing from order; appended`); }
    const intros = {}; for (const k in raw.intros || {}) { const c = R(k); if (c) intros[c.id] = String(raw.intros[k]); }
    const beats = [];
    for (const b of raw.beats || []) {
      const t = String(b.type || '').toLowerCase(); const out = { type: t, lines: LINES(b.lines), setup: LINES(b.setup), text: b.text, move: b.move, popup: b.popup, damage: b.damage, effect: b.effect };
      if (t === 'attack' || t === 'eliminate') { out.attacker = R(b.attacker); out.defender = R(b.defender); if (!out.attacker || !out.defender) { warn.push(`Skipped ${t}: unknown fighter (${b.attacker} / ${b.defender})`); continue; } }
      else if (t === 'entrance' || t === 'winner') { out.who = R(b.who); if (!out.who) { warn.push(`Skipped ${t}: unknown fighter (${b.who})`); continue; } }
      else if (t === 'event') { out.who = R(b.who); }
      else if (t !== 'commentary') { warn.push(`Skipped unknown beat type "${b.type}"`); continue; }
      beats.push(out);
    }
    if (!beats.some(b => b.type === 'winner')) warn.push('No winner beat: the fight will finish freeform after the script ends.');
    return { title: raw.title || '', order, intros, beats, i: 0, wait: 6, active: true, pending: null, warnings: warn };
  };
  S.generateLocal = async (prompt) => {
    const res = await fetch(S.llm.url.replace(/\/$/, '') + '/chat/completions', { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, S.llm.key ? { Authorization: 'Bearer ' + S.llm.key } : {}), body: JSON.stringify({ model: S.llm.model, messages: [{ role: 'user', content: prompt }], temperature: 0.9, stream: false }) });
    if (!res.ok) throw new Error(`LLM endpoint returned ${res.status}`);
    const j = await res.json(); const txt = j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content;
    if (!txt) throw new Error('No text in response');
    return txt.replace(/<think>[\s\S]*?<\/think>/g, '');
  };
})();
