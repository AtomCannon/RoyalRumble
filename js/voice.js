// Voice system: one speech queue with priorities, three speakers (ring announcer, Gary, Tonya) plus fighter catchphrases,
// recorded character clips, and pluggable TTS engines: browser speechSynthesis (default), an OpenAI-compatible local server
// (e.g. Kokoro-FastAPI at http://localhost:8880), or Kokoro running in the browser (kokoro-js, ~90MB download, needs http(s)).
window.P = window.P || {};
(function () {
  const U = P.util;
  const V = P.voice = { queue: [], busy: false, lastSpoke: 0, cache: new Map(), kokoro: null, el: null };
  V.ROLES = { ann: 'Ring Announcer', gary: 'Gary Gristle', tonya: 'Tonya Thunderfist', fighter: 'Fighters' };
  V.SPELL = 'P. U. N. C. H. M. A.';
  // Speech engines shout "P-U-N-C-H-M-A" at an all-caps PUNCHMA, so always speak it sentence case.
  V.clean = (t) => String(t == null ? '' : t).replace(/PUNCHMA/g, 'Punchma').replace(/\bPUNCHMA\b/gi, 'Punchma');
  V.defaults = () => ({
    enabled: true, engine: 'browser', clips: true,
    serverUrl: 'http://localhost:8880', serverModel: 'kokoro',
    kokoroUrl: 'https://cdn.jsdelivr.net/npm/kokoro-js@1.2.1/dist/kokoro.web.js', kokoroModel: 'onnx-community/Kokoro-82M-v1.0-ONNX', kokoroDtype: 'q8',
    roles: {
      ann:   { browser: '', server: 'am_michael', kokoro: 'am_michael', pitch: 0.85, rate: 0.92 },
      gary:  { browser: '', server: 'am_adam',    kokoro: 'am_adam',    pitch: 1.0,  rate: 1.05 },
      tonya: { browser: '', server: 'af_bella',   kokoro: 'af_bella',   pitch: 1.05, rate: 1.05 },
      fighter: { browser: '', server: 'am_puck',  kokoro: 'am_puck',    pitch: 1.0,  rate: 1.0 },
    },
  });
  V.s = U.merge(V.defaults(), U.load('punchma.voice', {}));
  V.save = () => U.save('punchma.voice', V.s);

  // ---- browser voices ----
  V.browserVoices = () => ('speechSynthesis' in window) ? speechSynthesis.getVoices().filter(v => /^en/i.test(v.lang)) : [];
  const PREF = { ann: [/Google UK English Male/, /Daniel/, /Microsoft (Guy|Ryan|Christopher)/, /Alex/, /Male/i], gary: [/Google US English/, /Microsoft (Davis|Eric|Steffan|Mark)/, /Fred/, /Male/i], tonya: [/Google UK English Female/, /Samantha/, /Microsoft (Aria|Jenny|Zira|Sonia)/, /Karen/, /Female/i], fighter: [/Google US English/, /Alex/] };
  V.pickBrowserVoice = (role) => {
    const vs = V.browserVoices(); if (!vs.length) return null;
    const want = V.s.roles[role].browser; if (want) { const v = vs.find(v => v.name === want); if (v) return v; }
    for (const re of PREF[role] || []) { const v = vs.find(v => re.test(v.name)); if (v) return v; }
    return vs.find(v => /natural|neural|premium|enhanced/i.test(v.name)) || vs[0];
  };

  // ---- public API ----
  // say(text, { role, priority: 1 chatter | 2 important | 3 must, maxAge, pitch, rate, group })
  V.say = (text, o = {}) => new Promise((resolve) => {
    if (!text || !V.s.enabled) return resolve();
    V.queue.push({ text: V.clean(text), role: o.role || 'ann', priority: o.priority ?? 2, t: performance.now(), maxAge: (o.maxAge ?? 9) * 1000, pitch: o.pitch, rate: o.rate, resolve, group: o.group });
    V.pump();
  });
  // exchange([[who, text], ...]) speaks lines in order as one group; the whole group is dropped if it expires before starting
  V.exchange = (lines, o = {}) => { const g = U.uid(); const ps = lines.map(([who, text]) => V.say(text, Object.assign({ role: who, group: g }, o))); return Promise.all(ps); };
  V.stop = () => { V.queue.forEach(q => q.resolve()); V.queue = []; V.busy = false; V.stopCurrent(); V.clipStop(); };
  V.stopCurrent = () => { try { speechSynthesis.cancel(); } catch (e) { } if (V.audioEl) { try { V.audioEl.pause(); } catch (e) { } V.audioEl = null; } };
  V.idle = () => !V.busy && !V.queue.length;

  V.pump = () => {
    if (V.busy || !V.queue.length) return;
    const now = performance.now();
    // drop stale low-priority lines (whole group if the group's first line expired)
    const dead = new Set();
    for (const q of V.queue) if (q.priority < 3 && now - q.t > q.maxAge) dead.add(q.group || q);
    V.queue = V.queue.filter(q => { const k = q.group || q; if (dead.has(k)) { q.resolve(); return false; } return true; });
    if (!V.queue.length) return;
    // chatter only when nothing more important waits and we've been quiet a moment
    V.queue.sort((a, b) => b.priority - a.priority || a.t - b.t);
    // keep groups contiguous: if the head belongs to a group, pull its siblings up next
    const head = V.queue[0];
    if (head.priority === 1 && V.queue.some(q => q.priority > 1)) { V.queue = V.queue.filter(q => q !== head); head.resolve(); return V.pump(); }
    if (head.priority === 1 && now - V.lastSpoke < 2500) { setTimeout(V.pump, 800); return; }
    V.queue.shift();
    V.busy = true; V.current = head;
    if (P.audio && P.audio.duck) P.audio.duck(true);
    V.speak(head).catch(() => { }).then(() => {
      V.busy = false; V.lastSpoke = performance.now(); head.resolve();
      const next = V.queue[0]; const sameGroup = next && head.group && next.group === head.group;
      if (!sameGroup) { if (P.audio && P.audio.duck) P.audio.duck(false); }
      setTimeout(V.pump, sameGroup ? 120 : 450);
    });
  };

  V.speak = async (q) => {
    const eng = V.s.engine;
    if (eng === 'server') { try { return await V.speakServer(q); } catch (e) { console.warn('TTS server failed, falling back to browser voice', e); } }
    if (eng === 'kokoro') { try { return await V.speakKokoro(q); } catch (e) { console.warn('Kokoro failed, falling back to browser voice', e); } }
    return V.speakBrowser(q);
  };

  V.speakBrowser = (q) => new Promise((resolve) => {
    if (!('speechSynthesis' in window)) return resolve();
    const r = V.s.roles[q.role] || V.s.roles.ann;
    const u = new SpeechSynthesisUtterance(q.text);
    u.pitch = U.clamp(q.pitch ?? r.pitch, 0, 2); u.rate = U.clamp(q.rate ?? r.rate, 0.1, 3);
    const v = V.pickBrowserVoice(q.role); if (v) u.voice = v;
    let done = false; const fin = () => { if (!done) { done = true; resolve(); } };
    u.onend = fin; u.onerror = fin; setTimeout(fin, Math.min(20000, 1500 + q.text.length * 90 / u.rate));
    speechSynthesis.cancel(); speechSynthesis.speak(u);
  });

  const playBlob = (blob) => new Promise((resolve) => { const url = URL.createObjectURL(blob); const el = new Audio(url); V.audioEl = el; el.onended = () => { URL.revokeObjectURL(url); resolve(); }; el.onerror = () => resolve(); el.play().catch(() => resolve()); });
  const roleVoice = (q, key) => { const r = V.s.roles[q.role] || V.s.roles.ann; return r[key]; };
  const cacheKey = (q, engine) => engine + '|' + q.role + '|' + (q.rate || '') + '|' + q.text;
  const remember = (k, blob) => { V.cache.set(k, blob); if (V.cache.size > 120) V.cache.delete(V.cache.keys().next().value); };

  V.speakServer = async (q) => {
    const k = cacheKey(q, 'server'); let blob = V.cache.get(k);
    if (!blob) {
      const res = await fetch(V.s.serverUrl.replace(/\/$/, '') + '/v1/audio/speech', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model: V.s.serverModel, input: q.text, voice: roleVoice(q, 'server'), response_format: 'mp3', speed: q.rate || (V.s.roles[q.role] || {}).rate || 1 }) });
      if (!res.ok) throw new Error('TTS server ' + res.status);
      blob = await res.blob(); remember(k, blob);
    }
    await playBlob(blob);
  };

  V.speakKokoro = async (q) => {
    const k = cacheKey(q, 'kokoro'); let blob = V.cache.get(k);
    if (!blob) {
      if (!V.kokoro) {
        if (P.rumble) P.rumble.note = 'Loading natural voice model (about 90 MB, one time)...';
        const mod = await import(/* webpackIgnore: true */ V.s.kokoroUrl);
        const KokoroTTS = mod.KokoroTTS || (mod.default && mod.default.KokoroTTS);
        V.kokoro = await KokoroTTS.from_pretrained(V.s.kokoroModel, { dtype: V.s.kokoroDtype, device: navigator.gpu ? 'webgpu' : 'wasm' });
      }
      const audio = await V.kokoro.generate(q.text, { voice: roleVoice(q, 'kokoro'), speed: q.rate || 1 });
      blob = typeof audio.toBlob === 'function' ? audio.toBlob() : P.audio.wavBlob(audio.audio, audio.sampling_rate);
      remember(k, blob);
    }
    await playBlob(blob);
  };

  // ---- recorded clips (custom voice lines) ----
  V.clipStop = () => { if (V.clipEl) { try { V.clipEl.pause(); } catch (e) { } V.clipEl = null; } };
  V.playClip = (url) => new Promise((resolve) => {
    if (!url || !V.s.enabled || !V.s.clips) return resolve();
    V.clipStop();
    try {
      const el = new Audio(url); V.clipEl = el; el.volume = 1;
      if (P.audio && P.audio.duck) P.audio.duck(true);
      const fin = () => { if (V.clipEl === el) { V.clipEl = null; if (P.audio && P.audio.duck) P.audio.duck(false); } resolve(); };
      el.onended = fin; el.onerror = fin; el.play().catch(fin);
      setTimeout(fin, 22000);
    } catch (e) { resolve(); }
  });
  V.test = (role) => { const t = { ann: 'Ladies and gentlemen... welcome... to Punchma!', gary: 'Tonya, I have never seen anything like this. And I was at the buffet incident.', tonya: 'Gary, we agreed never to talk about the buffet incident.', fighter: 'Punchma balls!' }[role]; V.stop(); V.say(t, { role, priority: 3 }); };

  // ---- character voice lines: play a recorded clip for an event, with anti-spam cooldowns ----
  V.EVENTS = [['entrance', 'Entrance', 'Right after the ring announcer finishes'], ['taunt', 'Taunt', 'While roaming the ring'], ['hit', 'Taking a hit', 'When they get hurt'], ['big', 'Big hit', 'When something huge lands on them'], ['attack', 'Attacking', 'When they land a hit'], ['eliminated', 'Eliminated', 'On the way over the top rope'], ['victory', 'Victory', 'When they win the whole thing']];
  V.COOLDOWN = { entrance: 0, taunt: 45, hit: 25, big: 20, attack: 30, eliminated: 0, victory: 0 };
  V.voCool = {}; V.voLast = 0;
  V.vo = (ch, event, opts = {}) => {
    const clip = ch && ch.vo && ch.vo[event] && ch.vo[event].url;
    const now = performance.now() / 1000, force = opts.force;
    if (!force) {
      if (now - V.voLast < 4) return false;                       // never two clips on top of each other
      const k = ch.id + ':' + event;
      if (V.voCool[k] && now < V.voCool[k]) return false;         // per fighter, per event
      V.voCool[k] = now + (V.COOLDOWN[event] || 20);
    }
    V.voLast = now;
    if (clip) return V.playClip(clip);   // a promise, so callers can wait for the clip to finish
    if (opts.fallback) return V.say(opts.fallback, { role: 'fighter', priority: opts.priority || 1, maxAge: opts.maxAge || 3, pitch: ch.voice.pitch, rate: ch.voice.rate });
    return false;
  };
  V.voReset = () => { V.voCool = {}; V.voLast = 0; };
})();
