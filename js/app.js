// App shell: screens, roster persistence, rumble setup, default roster.
window.P = window.P || {};
(function () {
  const U = P.util, el = U.el, C = P.char;
  const App = P.app = { roster: [], screen: 'roster', selected: new Set() };
  App.settings = Object.assign({ interval: 20, chaos: 1, speed: 1, hp: 100 }, U.load('punchma.settings', {}));

  App.show = (name) => { App.screen = name; document.querySelectorAll('.screen').forEach(s => s.classList.toggle('on', s.id === 'screen-' + name)); document.querySelectorAll('nav button[data-screen]').forEach(b => b.classList.toggle('on', b.dataset.screen === name)); if (name === 'roster') App.renderRoster(); window.scrollTo(0, 0); };
  App.saveRoster = () => { if (!U.save('punchma.roster', App.roster)) alert('Could not save roster. Your browser storage may be full (custom PNGs and songs count). Try removing some.'); };
  App.upsert = (ch) => { const i = App.roster.findIndex(c => c.id === ch.id); if (i >= 0) App.roster[i] = ch; else App.roster.push(ch); App.selected.add(ch.id); App.saveRoster(); };
  App.remove = (id) => { App.roster = App.roster.filter(c => c.id !== id); App.selected.delete(id); App.saveRoster(); App.renderRoster(); };
  App.duplicate = (ch) => { const d = U.deep(ch); d.id = U.uid(); d.name = ch.name + ' 2'; d.stats = { wins: 0, elims: 0, rumbles: 0 }; App.roster.push(d); App.selected.add(d.id); App.saveRoster(); App.renderRoster(); };

  App.renderRoster = () => {
    const grid = document.getElementById('roster'); grid.innerHTML = '';
    if (!App.roster.length) grid.appendChild(el('div', { class: 'empty', html: 'No fighters yet. Make one, or hit <b>Random Idiot</b> a few times.' }));
    for (const ch of App.roster) {
      const cv = el('canvas', { width: 160, height: 200 });
      const card = el('div', { class: 'card' + (App.selected.has(ch.id) ? ' sel' : '') }, [
        el('label', { class: 'chk' }, [el('input', { type: 'checkbox', checked: App.selected.has(ch.id) ? 'checked' : null, onchange: (e) => { if (e.target.checked) App.selected.add(ch.id); else App.selected.delete(ch.id); card.classList.toggle('sel', e.target.checked); App.updateStartBtn(); } }), ' in rumble']),
        cv,
        el('div', { class: 'cname', text: ch.name || 'Unnamed' }),
        el('div', { class: 'ctag', text: 'the ' + C.tagline(ch) }),
        el('div', { class: 'cmeta', text: `${P.data.persona(ch.persona).name} · ${ch.hometown}` }),
        el('div', { class: 'cstats', text: `🏆 ${ch.stats.wins}  💀 ${ch.stats.elims}  🎪 ${ch.stats.rumbles}` }),
        el('div', { class: 'btnrow' }, [el('button', { class: 'btn small', text: 'Edit', onclick: () => P.builder.open(ch) }), el('button', { class: 'btn small', text: 'Clone', onclick: () => App.duplicate(ch) }), el('button', { class: 'btn small danger', text: '✕', onclick: () => { if (confirm(`Delete ${ch.name}? They will not be missed.`)) App.remove(ch.id); } })]),
      ]);
      grid.appendChild(card);
      P.render.portrait(cv, ch, P.render.pose(P.render.anim('idle', 0)), { bg: '#7fc8f8' });
    }
    App.updateStartBtn();
    const s = App.settings; document.getElementById('set-interval').value = s.interval; document.getElementById('set-chaos').value = s.chaos; document.getElementById('set-speed').value = s.speed;
    document.getElementById('set-interval-v').textContent = s.interval + 's';
  };
  App.updateStartBtn = () => { const n = [...App.selected].filter(id => App.roster.some(c => c.id === id)).length; const b = document.getElementById('start-btn'); b.textContent = n >= 2 ? `🔔 START PUNCHMA (${n} idiots)` : 'Select at least 2 fighters'; b.disabled = n < 2; };
  App.selectAll = (on) => { App.selected = new Set(on ? App.roster.map(c => c.id) : []); App.renderRoster(); };

  App.startRumble = (scripted) => {
    const chars = App.roster.filter(c => App.selected.has(c.id)); if (chars.length < 2) return;
    const script = scripted ? P.script.current : null; App.lastScripted = !!scripted;
    App.settings.interval = +document.getElementById('set-interval').value; App.settings.chaos = +document.getElementById('set-chaos').value; App.settings.speed = +document.getElementById('set-speed').value; U.save('punchma.settings', App.settings);
    App.show('rumble'); document.getElementById('winner-overlay').classList.remove('on');
    P.audio.init();
    P.rumble.onEnd = (f) => { for (const c of chars) c.stats.rumbles++; const w = App.roster.find(c => c.id === f.ch.id); if (w) w.stats.wins++; for (const id in P.rumble.elims) { const c = App.roster.find(x => x.id === id); if (c) c.stats.elims += P.rumble.elims[id]; } App.saveRoster(); App.showWinner(f); };
    P.rumble.start(chars, App.settings, script);
    App.lastChars = chars;
  };
  App.showWinner = (f) => {
    const ov = document.getElementById('winner-overlay'); ov.classList.add('on');
    const cv = document.getElementById('winner-canvas'); P.render.portrait(cv, f.ch, P.render.pose(P.render.anim('flex', 0)), { bg: '#ffd23f' });
    document.getElementById('winner-name').textContent = f.ch.name; document.getElementById('winner-tag').textContent = 'the ' + C.tagline(f.ch);
    const em = P.rumble.elims; const topId = Object.keys(em).sort((a, b) => em[b] - em[a])[0]; const top = topId && App.lastChars.find(c => c.id === topId);
    document.getElementById('winner-stats').textContent = `${em[f.ch.id] || 0} eliminations · Most violent: ${top ? top.name + ' (' + em[topId] + ')' : 'nobody, somehow'} · ${P.rumble.total} entrants`;
  };
  App.rematch = () => { document.getElementById('winner-overlay').classList.remove('on'); P.rumble.stop(); P.rumble.onEnd = null; setTimeout(() => App.startRumble(App.lastScripted), 50); };
  App.leaveRumble = () => { P.rumble.stop(); document.getElementById('winner-overlay').classList.remove('on'); App.show('roster'); };

  App.exportRoster = () => { const blob = new Blob([JSON.stringify(App.roster, null, 1)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'punchma-roster.json'; a.click(); };
  App.importRoster = (e) => { const f = e.target.files[0]; if (!f) return; const rd = new FileReader(); rd.onload = () => { try { const arr = JSON.parse(rd.result); if (!Array.isArray(arr)) throw 0; for (const c of arr) { const ch = C.normalize(c); if (App.roster.some(x => x.id === ch.id)) ch.id = U.uid(); App.roster.push(ch); App.selected.add(ch.id); } App.saveRoster(); App.renderRoster(); } catch (err) { alert('That is not a Punchma roster file. Or it is, and it is broken. Either way, no.'); } }; rd.readAsText(f); e.target.value = ''; };

  App.audioUI = () => {
    const s = P.audio.settings; const m = document.getElementById('vol-music'), x = document.getElementById('vol-sfx');
    m.value = s.music; x.value = s.sfx;
    m.oninput = () => { s.music = +m.value; P.audio.applySettings(); P.audio.saveSettings(); }; x.oninput = () => { s.sfx = +x.value; P.audio.applySettings(); P.audio.saveSettings(); };
  };

  // ---- voice settings modal ----
  App.voiceUI = () => {
    const V = P.voice, box = document.getElementById('voice-body'); box.innerHTML = '';
    const s = V.s; const rowEl = (l, input, hint) => el('label', { class: 'ctl' }, [el('span', { class: 'ctl-l', text: l }), input, hint ? el('small', { text: hint }) : null]);
    const sel = (val, opts, on) => { const e = el('select', { onchange: (ev) => { on(ev.target.value); V.save(); } }); for (const [v, l] of opts) e.appendChild(el('option', { value: v, text: l, selected: v === val ? 'selected' : null })); return e; };
    const txt = (val, on, ph) => el('input', { type: 'text', value: val, placeholder: ph || '', onchange: (ev) => { on(ev.target.value); V.save(); } });
    box.appendChild(el('label', { class: 'mini' }, [el('input', { type: 'checkbox', checked: s.enabled ? 'checked' : null, onchange: (e) => { s.enabled = e.target.checked; if (!s.enabled) V.stop(); V.save(); } }), ' Voices on']));
    box.appendChild(el('label', { class: 'mini' }, [el('input', { type: 'checkbox', checked: s.subtitles ? 'checked' : null, onchange: (e) => { s.subtitles = e.target.checked; V.save(); } }), ' Subtitles']));
    box.appendChild(rowEl('Engine', sel(s.engine, [['browser', 'Browser voices (built in, quality varies by OS)'], ['server', 'Local TTS server (OpenAI-compatible, e.g. Kokoro-FastAPI) — most natural'], ['kokoro', 'Kokoro in the browser (experimental, ~90MB download, needs http(s))']], v => { s.engine = v; App.voiceUI(); })));
    if (s.engine === 'server') {
      box.appendChild(el('p', { class: 'help', html: 'Run an open-source TTS with an OpenAI-style <code>/v1/audio/speech</code> endpoint. Easiest: <b>Kokoro-FastAPI</b> (<code>docker run -p 8880:8880 ghcr.io/remsky/kokoro-fastapi-cpu:latest</code>), then use voices like am_michael, am_adam, af_bella, am_puck, bm_george, af_heart.' }));
      box.appendChild(rowEl('Server URL', txt(s.serverUrl, v => s.serverUrl = v, 'http://localhost:8880')));
      box.appendChild(rowEl('Model name', txt(s.serverModel, v => s.serverModel = v, 'kokoro')));
    }
    if (s.engine === 'kokoro') {
      box.appendChild(el('p', { class: 'help', html: 'Loads <code>kokoro-js</code> from a CDN and runs the Kokoro-82M model in your browser (WebGPU if available, else WASM). First use downloads ~90MB. Does not work when the game is opened from a file:// path.' }));
      box.appendChild(rowEl('kokoro-js module URL', txt(s.kokoroUrl, v => s.kokoroUrl = v)));
      box.appendChild(rowEl('Precision', sel(s.kokoroDtype, [['q8', 'q8 (fast, ~90MB)'], ['fp32', 'fp32 (best, ~330MB)']], v => s.kokoroDtype = v)));
    }
    const voices = V.browserVoices();
    for (const role in V.ROLES) {
      const r = s.roles[role]; const g = el('fieldset', { class: 'rolebox' }, [el('legend', { text: V.ROLES[role] })]);
      if (s.engine === 'browser') g.appendChild(rowEl('Voice', sel(r.browser, [['', 'Auto pick']].concat(voices.map(v => [v.name, v.name + ' (' + v.lang + ')'])), v => r.browser = v)));
      else g.appendChild(rowEl('Voice id', txt(r[s.engine], v => r[s.engine] = v)));
      g.appendChild(rowEl('Pitch (browser only) ' + r.pitch, el('input', { type: 'range', min: 0.5, max: 1.6, step: 0.05, value: r.pitch, onchange: (e) => { r.pitch = +e.target.value; V.save(); App.voiceUI(); } })));
      g.appendChild(rowEl('Speed ' + r.rate, el('input', { type: 'range', min: 0.6, max: 1.6, step: 0.05, value: r.rate, onchange: (e) => { r.rate = +e.target.value; V.save(); App.voiceUI(); } })));
      g.appendChild(el('button', { class: 'btn small', text: '🔊 Test', onclick: () => V.test(role) }));
      box.appendChild(g);
    }
    box.appendChild(el('div', { class: 'btnrow' }, [el('button', { class: 'btn', text: 'Reset voices to defaults', onclick: () => { V.s = V.defaults(); V.save(); App.voiceUI(); } })]));
  };
  App.openVoices = () => { App.voiceUI(); document.getElementById('voice-modal').classList.add('on'); };

  // ---- scripted show panel ----
  App.scriptUI = () => {
    const S = P.script, box = document.getElementById('script-body'); box.innerHTML = '';
    const cur = S.current; const chars = () => App.roster.filter(c => App.selected.has(c.id));
    box.appendChild(el('p', { class: 'help', html: 'Want a curated show instead of pure chaos? <b>1.</b> Copy the prompt (it includes your selected fighters). <b>2.</b> Paste it into any LLM: a local Qwen in Ollama or LM Studio, or anything else. <b>3.</b> Paste the JSON it writes back below. The game then plays that story: entrance order, custom moves, callbacks, eliminations and the winner, with the commentators reading the script\'s lines.' }));
    const ta = el('textarea', { id: 'script-in', rows: 6, placeholder: 'Paste the JSON script here...' });
    const status = el('div', { class: 'muted', id: 'script-status' });
    const load = (text) => { try { const raw = S.parse(text); const prep = S.prepare(raw, chars()); S.current = raw; U.save('punchma.script', raw); status.textContent = `Loaded "${raw.title || 'untitled'}": ${prep.beats.length} beats. ` + (prep.warnings.length ? 'Warnings: ' + prep.warnings.join(' | ') : 'Looks good.'); App.scriptUI(); document.getElementById('script-status').textContent = status.textContent; } catch (e) { status.textContent = 'Could not read that: ' + e.message; } };
    box.appendChild(el('div', { class: 'btnrow' }, [
      el('button', { class: 'btn', text: '📋 Copy prompt for your LLM', onclick: () => { const p = S.buildPrompt(chars()); ta.value = ''; navigator.clipboard && navigator.clipboard.writeText(p).then(() => status.textContent = 'Prompt copied to clipboard. Paste it into your LLM, then paste its JSON answer below.', () => { ta.value = p; status.textContent = 'Clipboard blocked; the prompt is in the box below. Copy it from there.'; }); if (!navigator.clipboard) { ta.value = p; status.textContent = 'The prompt is in the box below. Copy it from there.'; } } }),
      el('button', { class: 'btn', text: '⬇ Download prompt (.txt)', onclick: () => { const b = new Blob([S.buildPrompt(chars())], { type: 'text/plain' }); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'punchma-prompt.txt'; a.click(); } }),
    ]));
    box.appendChild(el('details', {}, [el('summary', { text: '⚡ Or generate directly from a local LLM (Ollama / LM Studio / any OpenAI-compatible endpoint)' }), el('div', { class: 'inline' }, [
      el('input', { type: 'text', value: S.llm.url, placeholder: 'http://localhost:11434/v1', onchange: (e) => { S.llm.url = e.target.value; S.saveLLM(); } }),
      el('input', { type: 'text', value: S.llm.model, placeholder: 'model name, e.g. qwen3.5', onchange: (e) => { S.llm.model = e.target.value; S.saveLLM(); } }),
      el('input', { type: 'password', value: S.llm.key, placeholder: 'api key (optional)', onchange: (e) => { S.llm.key = e.target.value; S.saveLLM(); } }),
      el('button', { class: 'btn primary', text: 'Generate', onclick: async (e) => { e.target.disabled = true; status.textContent = 'Asking the LLM... (this can take a minute)'; try { const txt = await S.generateLocal(S.buildPrompt(chars())); ta.value = txt; load(txt); } catch (err) { status.textContent = 'Failed: ' + err.message + '. For Ollama set OLLAMA_ORIGINS=* ; in LM Studio enable CORS in the server settings.'; } e.target.disabled = false; } }),
    ]), el('small', { class: 'muted', text: 'Ollama: run `OLLAMA_ORIGINS=* ollama serve` so the browser may call it. LM Studio: enable CORS in Developer > Server settings. Uses the /chat/completions endpoint.' })]));
    box.appendChild(ta);
    box.appendChild(el('div', { class: 'btnrow' }, [
      el('button', { class: 'btn', text: '📥 Load script from box', onclick: () => load(ta.value) }),
      el('label', { class: 'btn' }, ['📂 Load script file', el('input', { type: 'file', accept: '.json,.txt,application/json', hidden: 'hidden', onchange: (e) => { const f = e.target.files[0]; if (!f) return; const rd = new FileReader(); rd.onload = () => load(rd.result); rd.readAsText(f); e.target.value = ''; } })]),
      cur ? el('button', { class: 'btn small danger', text: '✕ Clear loaded script', onclick: () => { S.current = null; localStorage.removeItem('punchma.script'); App.scriptUI(); } }) : null,
    ]));
    box.appendChild(status);
    if (cur) { const prep = S.prepare(cur, chars()); box.appendChild(el('div', { class: 'scriptcard' }, [el('b', { text: '📜 ' + (cur.title || 'Untitled show') }), el('div', { class: 'muted', text: `${prep.beats.length} beats · order: ${prep.order.map(c => c.name).join(' → ')}` }), prep.warnings.length ? el('div', { class: 'warn', text: prep.warnings.join(' | ') }) : null, el('button', { class: 'btn primary huge', text: '🎬 PLAY THE SCRIPTED SHOW', onclick: () => App.startRumble(true) })])); }
  };

  // Default roster so the game is fun in 10 seconds
  App.defaults = () => {
    const mk = (o) => C.normalize(U.merge(C.random(), o));
    return [
      mk({ name: 'Bill Banana', tag: { adj: 'Warlike', noun: 'Pig' }, persona: 'showboat', hometown: 'Parts Unknown', catchphrase: 'Punchma balls!', body: { type: 'buff', headShape: 'round', height: 1.1, girth: 1.2, headSize: 0.9, armLength: 1.2, legLength: 1, torsoLength: 1, limbThickness: 1.4, neckLength: 0.5, skin: '#ffe14d' }, hair: { style: 'mohawk', color: '#1a1a1a' }, hat: { id: 'none' }, face: { eyes: 'big', brows: 'angry', nose: 'dot', mouth: 'teeth', beard: 'none' }, shirt: { id: 'singlet', color: '#ffd23f', color2: '#111', text: 'BANANA', sleeves: 'auto' }, pants: { id: 'speedo', color: '#111' }, shoes: { id: 'boots', color: '#111' }, extra: { id: 'belt' }, song: { type: 'builtin', id: 'hype' }, pronouns: 'he', gender: 'Male', voice: { pitch: 0.5, rate: 1 } }),
      mk({ name: 'Grandma Deb', tag: { adj: 'Recently Divorced', noun: 'Wine Mom' }, persona: 'oldman', hometown: 'The Local Applebee\'s', catchphrase: 'Where is the manager?!', body: { type: 'pear', headShape: 'wide', height: 0.8, girth: 1.3, headSize: 1.1, armLength: 0.8, legLength: 0.6, torsoLength: 1, limbThickness: 1.1, neckLength: 0.3, skin: '#f7d6b8' }, hair: { style: 'cloud', color: '#eee' }, hat: { id: 'none' }, face: { eyes: 'monocle', brows: 'worried', nose: 'button', mouth: 'lips', beard: 'none' }, shirt: { id: 'sweater', color: '#c2447a', color2: '#ffe14d', sleeves: 'auto' }, pants: { id: 'skirt', color: '#5a3a8a' }, shoes: { id: 'socksandals', color: '#fff' }, extra: { id: 'beer' }, song: { type: 'builtin', id: 'elevator' }, pronouns: 'she', gender: 'Female', voice: { pitch: 1.4, rate: 0.8 } }),
      mk({ name: 'Skeeter Nutz', tag: { adj: 'Uninsured', noun: 'Crypto Bro' }, persona: 'zoomer', hometown: 'Reddit', catchphrase: 'Skill issue.', body: { type: 'noodle', headShape: 'egg', height: 1.3, girth: 0.7, headSize: 1, armLength: 1.5, legLength: 1.4, torsoLength: 1, limbThickness: 0.6, neckLength: 1.5, skin: '#f2c9a0' }, hair: { style: 'emo', color: '#3bafe0' }, hat: { id: 'backcap', color: '#e33', color2: '#fff' }, face: { eyes: 'sleepy', brows: 'raised', nose: 'pointy', mouth: 'smirk', beard: 'stubble' }, shirt: { id: 'hoodie', color: '#222', color2: '#fff', sleeves: 'auto' }, pants: { id: 'sweats', color: '#666' }, shoes: { id: 'crocs', color: '#5f5' }, extra: { id: 'phone' }, song: { type: 'builtin', id: 'nokia' }, pronouns: 'he', gender: 'Male', voice: { pitch: 1.1, rate: 1.3 } }),
      mk({ name: 'Captain Meatloaf', tag: { adj: 'Room-Temperature', noun: 'Ham' }, persona: 'maniac', hometown: 'A Dumpster Behind Arby\'s', catchphrase: 'I AM THE BUS!', body: { type: 'blob', headShape: 'potato', height: 0.9, girth: 1.8, headSize: 1.3, armLength: 0.7, legLength: 0.5, torsoLength: 1.1, limbThickness: 1.8, neckLength: 0, skin: '#c98b5c' }, hair: { style: 'none', color: '#000' }, hat: { id: 'viking' }, face: { eyes: 'crazy', brows: 'uni', nose: 'big', mouth: 'wobbly', beard: 'beard', facialHairColor: '#b32626' }, shirt: { id: 'none', sleeves: 'auto' }, pants: { id: 'tighty', color: '#fff' }, shoes: { id: 'none' }, extra: { id: 'chicken' }, song: { type: 'builtin', id: 'boss' }, pronouns: 'he', gender: 'Meat', voice: { pitch: 0.3, rate: 0.9 } }),
      mk({ name: 'Sheriff Puddles', tag: { adj: 'Court-Ordered', noun: 'Mall Cop' }, persona: 'cop', hometown: 'Costco', catchphrase: 'Sir. SIR.', body: { type: 'brick', headShape: 'square', height: 1, girth: 1.1, headSize: 1, armLength: 0.9, legLength: 0.9, torsoLength: 1.1, limbThickness: 1.2, neckLength: 0.4, skin: '#e0ac7c' }, hair: { style: 'flattop', color: '#4a2a10' }, hat: { id: 'cap', color: '#1a2a5a', color2: '#ffd23f' }, face: { eyes: 'shades', brows: 'none', nose: 'dot', mouth: 'flat', beard: 'stache' }, shirt: { id: 'tee', color: '#1a2a5a', color2: '#ffd23f', text: 'COP', sleeves: 'auto' }, pants: { id: 'cargo', color: '#3a3a3a' }, shoes: { id: 'boots', color: '#222' }, extra: { id: 'none' }, song: { type: 'builtin', id: 'western' }, pronouns: 'he', gender: 'Male', voice: { pitch: 0.8, rate: 0.95 } }),
      mk({ name: 'Princess Gravy', tag: { adj: 'Glistening', noun: 'Sea Cucumber' }, persona: 'diva', hometown: 'A Cruise Ship Buffet', catchphrase: 'Ew. Just... ew.', body: { type: 'egg', headShape: 'tall', height: 1.05, girth: 1, headSize: 1.2, armLength: 1, legLength: 1.2, torsoLength: 0.9, limbThickness: 0.8, neckLength: 2, skin: '#c98cf2' }, hair: { style: 'beehive', color: '#f26cb0' }, hat: { id: 'crown' }, face: { eyes: 'anime', brows: 'drawn', nose: 'none', mouth: 'lips', beard: 'none' }, shirt: { id: 'croptop', color: '#f26cb0', color2: '#fff', sleeves: 'auto' }, pants: { id: 'tutu', color: '#f9c' }, shoes: { id: 'heels', color: '#e33' }, extra: { id: 'wings' }, song: { type: 'builtin', id: 'fanfare' }, pronouns: 'she', gender: 'Female', voice: { pitch: 1.8, rate: 1.1 } }),
      mk({ name: 'Doug', tag: { adj: 'Probably Fine', noun: 'Dad' }, persona: 'dad', hometown: 'A Cul-de-sac', catchphrase: 'Hi, Hungry, I\'m Dad.', body: { type: 'pear', headShape: 'round', height: 1, girth: 1.25, headSize: 1, armLength: 1, legLength: 0.95, torsoLength: 1, limbThickness: 1.1, neckLength: 0.8, skin: '#f2c9a0' }, hair: { style: 'receding', color: '#8b5a2b' }, hat: { id: 'none' }, face: { eyes: 'dots', brows: 'flat', nose: 'big', mouth: 'smile', beard: 'stache', facialHairColor: '#8b5a2b' }, shirt: { id: 'hawaiian', color: '#3a7bd5', color2: '#ffe14d', sleeves: 'auto' }, pants: { id: 'cargo', color: '#c9b78a' }, shoes: { id: 'socksandals', color: '#fff' }, extra: { id: 'none' }, song: { type: 'builtin', id: 'sitcom' }, pronouns: 'he', gender: 'Male', voice: { pitch: 0.7, rate: 0.9 } }),
      mk({ name: 'The Toddler', tag: { adj: 'Un-Housebroken', noun: 'Baby' }, persona: 'baby', hometown: 'Under Your Bed', catchphrase: 'I made a stinky.', body: { type: 'chunky', headShape: 'round', height: 0.55, girth: 1.4, headSize: 1.8, armLength: 0.6, legLength: 0.4, torsoLength: 0.8, limbThickness: 1.6, neckLength: 0, skin: '#f7d6b8' }, hair: { style: 'none', color: '#e8c060' }, hat: { id: 'propeller', color: '#e33', color2: '#3bf' }, face: { eyes: 'big', brows: 'worried', nose: 'button', mouth: 'pacifier', beard: 'none' }, shirt: { id: 'none', sleeves: 'auto' }, pants: { id: 'diaper', color: '#fff' }, shoes: { id: 'bunny', color: '#f9c' }, extra: { id: 'teddy' }, song: { type: 'builtin', id: 'baby' }, pronouns: 'it', gender: 'Yes', voice: { pitch: 2, rate: 1.3 } }),
      mk({ name: 'Reverend Stankface', tag: { adj: 'Unholy', noun: 'Youth Pastor' }, persona: 'salesman', hometown: 'Hell', catchphrase: 'Just sign here.', body: { type: 'triangle', headShape: 'peanut', height: 1.2, girth: 1, headSize: 0.9, armLength: 1.3, legLength: 1.1, torsoLength: 1.2, limbThickness: 0.9, neckLength: 1.2, skin: '#8fd14f' }, hair: { style: 'sidepart', color: '#1a1a1a' }, hat: { id: 'horns' }, face: { eyes: 'beady', brows: 'angry', nose: 'hook', mouth: 'mustachio', beard: 'goatee', facialHairColor: '#1a1a1a' }, shirt: { id: 'suit', color: '#222', color2: '#e33', sleeves: 'auto' }, pants: { id: 'jeans', color: '#222' }, shoes: { id: 'dress', color: '#111' }, extra: { id: 'briefcase', color: '#5a3a1a' }, song: { type: 'builtin', id: 'spooky' }, pronouns: 'he', gender: 'It\'s Complicated', voice: { pitch: 0.4, rate: 1 } }),
      mk({ name: 'Unit 7B', tag: { adj: 'Low-Battery', noun: 'Roomba' }, persona: 'robot', hometown: 'A Lab Accident', catchphrase: 'INITIATING VIOLENCE.', body: { type: 'brick', headShape: 'block', height: 1, girth: 1.2, headSize: 1, armLength: 1, legLength: 0.8, torsoLength: 1.2, limbThickness: 1.3, neckLength: 0.5, skin: '#d9d9d9' }, hair: { style: 'none', color: '#000' }, hat: { id: 'antenna' }, face: { eyes: 'laser', brows: 'none', nose: 'none', mouth: 'zipper', beard: 'none' }, shirt: { id: 'tee', color: '#888', color2: '#5f5', text: '7B', sleeves: 'auto' }, pants: { id: 'spacesuit', color: '#eee' }, shoes: { id: 'skiboots', color: '#888' }, extra: { id: 'jetpack' }, song: { type: 'builtin', id: 'dialup' }, pronouns: 'it', gender: 'A Concept', voice: { pitch: 0.2, rate: 0.8 } }),
      mk({ name: 'Boo Radley Jr.', tag: { adj: 'Recently Deceased', noun: 'Roommate' }, persona: 'ghost', hometown: 'The Void', catchphrase: 'I died for this?', body: { type: 'average', headShape: 'egg', height: 1.1, girth: 0.9, headSize: 1.1, armLength: 1.1, legLength: 1, torsoLength: 1, limbThickness: 0.9, neckLength: 1, skin: '#d9d9d9' }, hair: { style: 'long', color: '#f2f2f2' }, hat: { id: 'halo' }, face: { eyes: 'wide', brows: 'worried', nose: 'none', mouth: 'open', beard: 'none' }, shirt: { id: 'robe', color: '#eee', color2: '#eee', sleeves: 'auto' }, pants: { id: 'none', color: '#fff' }, shoes: { id: 'none' }, extra: { id: 'none' }, song: { type: 'builtin', id: 'funeral' }, pronouns: 'they', gender: 'Unspecified', voice: { pitch: 0.5, rate: 0.7 } }),
      mk({ name: 'Chef Bort', tag: { adj: 'Undercooked', noun: 'Lunch Lady' }, persona: 'chef', hometown: 'A Gas Station Bathroom', catchphrase: 'IT\'S RAW!', body: { type: 'chunky', headShape: 'wide', height: 0.95, girth: 1.5, headSize: 1.1, armLength: 0.9, legLength: 0.8, torsoLength: 1, limbThickness: 1.5, neckLength: 0.2, skin: '#ff8fa3' }, hair: { style: 'none', color: '#000' }, hat: { id: 'chef' }, face: { eyes: 'cross', brows: 'angry', nose: 'clown', mouth: 'teeth', beard: 'handlebar', facialHairColor: '#1a1a1a' }, shirt: { id: 'apron', color: '#fff', color2: '#e33', sleeves: 'auto' }, pants: { id: 'pajama', color: '#3a3' }, shoes: { id: 'clownshoes', color: '#e33' }, extra: { id: 'baguette' }, song: { type: 'builtin', id: 'circus' }, pronouns: 'they', gender: 'Gas', voice: { pitch: 0.9, rate: 1.4 } }),
    ];
  };

  App.init = () => {
    App.roster = (U.load('punchma.roster', null) || App.defaults()).map(C.normalize);
    App.selected = new Set(App.roster.map(c => c.id));
    if (!U.load('punchma.roster', null)) App.saveRoster();
    App.audioUI(); App.scriptUI();
    if ('speechSynthesis' in window) speechSynthesis.onvoiceschanged = () => { if (document.getElementById('voice-modal').classList.contains('on')) App.voiceUI(); };
    document.getElementById('set-interval').oninput = (e) => document.getElementById('set-interval-v').textContent = e.target.value + 's';
    document.addEventListener('keydown', (e) => { if (App.screen !== 'rumble') return; if (e.key === ' ') { e.preventDefault(); P.rumble.paused = !P.rumble.paused; } if (e.key === '1') P.rumble.speed = 1; if (e.key === '2') P.rumble.speed = 2; if (e.key === '4') P.rumble.speed = 4; });
    App.show('roster');
  };
  window.addEventListener('DOMContentLoaded', App.init);
})();
