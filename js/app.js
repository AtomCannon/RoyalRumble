// App shell: screens, admin gate, roster (default + custom), sponsors, rumble setup, scripted shows.
window.P = window.P || {};
(function () {
  const U = P.util, el = U.el, C = P.char;
  const App = P.app = { roster: [], screen: 'roster', selected: new Set() };

  // ---- admin ----
  const Admin = P.admin = { on: false, PASS: 'poop' };
  Admin.unlock = (pw) => { if (String(pw || '').trim().toLowerCase() === Admin.PASS) { Admin.on = true; sessionStorage.setItem('punchma.admin', '1'); App.applyAdmin(); return true; } return false; };
  Admin.lock = () => { Admin.on = false; sessionStorage.removeItem('punchma.admin'); App.applyAdmin(); };
  App.applyAdmin = () => {
    document.body.classList.toggle('admin', Admin.on);
    const b = document.getElementById('admin-btn'); if (b) { b.textContent = Admin.on ? '🔓 Admin on' : '🔒 Admin'; b.classList.toggle('primary', Admin.on); }
    App.updateStartBtn(); if (App.screen === 'roster') App.scriptUI();
  };
  App.promptAdmin = () => {
    if (Admin.on) { if (confirm('Turn admin mode off?')) Admin.lock(); return; }
    const pw = prompt('Admin password:'); if (pw === null) return;
    if (!Admin.unlock(pw)) alert('Nope.');
  };

  App.settings = Object.assign({ interval: 20, chaos: 1, speed: 1, hp: 100, preshow: true, commercials: true, sponsors: [], regen: 1 }, U.load('punchma.settings', {}));

  App.show = (name) => {
    App.screen = name;
    document.querySelectorAll('.screen').forEach(s => s.classList.toggle('on', s.id === 'screen-' + name));
    document.querySelectorAll('nav button[data-screen]').forEach(b => b.classList.toggle('on', b.dataset.screen === name));
    if (name === 'roster') { App.renderRoster(); App.scriptUI(); }
    if (name === 'sponsors') P.sponsors.renderList();
    window.scrollTo(0, 0);
  };

  // ---- roster storage ----
  App.saveRoster = () => { if (!U.save('punchma.roster', App.roster)) alert('Could not save: browser storage is full. Custom drawings, jingles and voice lines take space. Export your fighters, then remove a few.'); };
  App.custom = () => App.roster.filter(c => !c.builtin);
  App.upsert = (ch) => { const i = App.roster.findIndex(c => c.id === ch.id); if (i >= 0) App.roster[i] = ch; else App.roster.push(ch); App.selected.add(ch.id); App.saveRoster(); };
  App.remove = (id) => { App.roster = App.roster.filter(c => c.id !== id); App.selected.delete(id); App.saveRoster(); App.renderRoster(); };
  App.duplicate = (ch) => { const d = U.deep(ch); d.id = U.uid(); d.name = ch.name + ' 2'; d.builtin = false; d.stats = { wins: 0, elims: 0, rumbles: 0 }; App.roster.push(d); App.selected.add(d.id); App.saveRoster(); App.renderRoster(); };
  App.deleteSelected = () => {
    const ids = [...App.selected].filter(id => App.roster.some(c => c.id === id)); if (!ids.length) return;
    if (!confirm(`Delete ${ids.length} selected fighter${ids.length > 1 ? 's' : ''}? This cannot be undone.`)) return;
    App.roster = App.roster.filter(c => !App.selected.has(c.id)); App.selected.clear(); App.saveRoster(); App.renderRoster();
  };
  App.restoreDefaults = () => {
    const have = new Set(App.roster.filter(c => c.builtin).map(c => c.id));
    let n = 0; for (const d of App.defaults()) if (!have.has(d.id)) { App.roster.push(d); App.selected.add(d.id); n++; }
    App.saveRoster(); App.renderRoster();
    if (!n) alert('All default fighters are already here.');
  };

  App.card = (ch) => {
    const cv = el('canvas', { width: 160, height: 200 });
    const card = el('div', { class: 'card' + (App.selected.has(ch.id) ? ' sel' : '') }, [
      el('label', { class: 'chk' }, [el('input', { type: 'checkbox', checked: App.selected.has(ch.id) ? 'checked' : null, onchange: (e) => { if (e.target.checked) App.selected.add(ch.id); else App.selected.delete(ch.id); card.classList.toggle('sel', e.target.checked); App.updateStartBtn(); } }), ' in rumble']),
      cv,
      el('div', { class: 'cname', text: ch.name || 'Unnamed' }),
      el('div', { class: 'ctag', text: 'the ' + C.tagline(ch) }),
      el('div', { class: 'cmeta', text: `${P.data.persona(ch.persona).name} · ${ch.hometown}` }),
      el('div', { class: 'cstats', text: `🏆 ${ch.stats.wins}  💀 ${ch.stats.elims}  🎪 ${ch.stats.rumbles}` }),
      el('div', { class: 'btnrow' }, [
        el('button', { class: 'btn small', text: 'Edit', onclick: () => P.builder.open(ch) }),
        el('button', { class: 'btn small', text: 'Clone', onclick: () => App.duplicate(ch) }),
        el('button', { class: 'btn small danger', text: '✕', onclick: () => { if (confirm(`Delete ${ch.name}?`)) App.remove(ch.id); } }),
      ]),
    ]);
    setTimeout(() => P.render.portrait(cv, ch, P.render.pose(P.render.anim('idle', 0)), { bg: '#0b1030' }), 0);
    return card;
  };
  App.renderRoster = () => {
    const mine = document.getElementById('roster'), def = document.getElementById('roster-default');
    mine.innerHTML = ''; def.innerHTML = '';
    const customs = App.custom(), builtins = App.roster.filter(c => c.builtin);
    if (!customs.length) mine.appendChild(el('div', { class: 'empty', html: 'No fighters of your own yet. Hit <b>+ New Fighter</b>, or <b>Random Fighter</b> a few times. Only these get exported.' }));
    for (const ch of customs) mine.appendChild(App.card(ch));
    if (!builtins.length) def.appendChild(el('div', { class: 'empty', html: 'The default fighters are gone. <b>Restore default fighters</b> brings them back.' }));
    for (const ch of builtins) def.appendChild(App.card(ch));
    document.getElementById('count-custom').textContent = customs.length;
    document.getElementById('count-default').textContent = builtins.length;
    App.updateStartBtn();
    const s = App.settings;
    const set = (id, v) => { const e = document.getElementById(id); if (e) e.value = v; };
    set('set-interval', s.interval); set('set-chaos', s.chaos); set('set-speed', s.speed); set('set-hp', s.hp);
    const iv = document.getElementById('set-interval-v'); if (iv) iv.textContent = s.interval + 's';
    const hv = document.getElementById('set-hp-v'); if (hv) hv.textContent = s.hp;
    document.getElementById('set-preshow').checked = s.preshow !== false;
    document.getElementById('set-commercials').checked = s.commercials !== false;
    App.renderSponsorPicker();
  };
  App.renderSponsorPicker = () => {
    const box = document.getElementById('sponsor-pick'); if (!box) return; box.innerHTML = '';
    if (!P.sponsors.list.length) { box.appendChild(el('span', { class: 'muted', text: 'No sponsors yet. Create one on the Sponsors screen.' })); return; }
    for (const sp of P.sponsors.list) {
      const on = App.settings.sponsors.includes(sp.id);
      box.appendChild(el('label', { class: 'mini' }, [el('input', { type: 'checkbox', checked: on ? 'checked' : null, onchange: (e) => { const list = new Set(App.settings.sponsors); if (e.target.checked) list.add(sp.id); else list.delete(sp.id); App.settings.sponsors = [...list]; U.save('punchma.settings', App.settings); } }), ' ' + (sp.name || 'Unnamed')]));
    }
  };
  App.updateStartBtn = () => {
    const n = [...App.selected].filter(id => App.roster.some(c => c.id === id)).length;
    const b = document.getElementById('start-btn'); if (!b) return;
    b.disabled = n < 2 || !P.admin.on;
    b.textContent = n < 2 ? 'Select at least 2 fighters' : !P.admin.on ? '🔒 Admin mode required to start' : `🔔 START PUNCHMA (${n} fighters)`;
    const hint = document.getElementById('admin-hint'); if (hint) hint.style.display = P.admin.on ? 'none' : '';
  };
  App.selectAll = (on) => { App.selected = new Set(on ? App.roster.map(c => c.id) : []); App.renderRoster(); };

  // ---- rumble ----
  App.readSetup = () => {
    const g = (id, def) => { const e = document.getElementById(id); return e ? +e.value : def; };
    App.settings.interval = g('set-interval', 20); App.settings.chaos = g('set-chaos', 1); App.settings.speed = g('set-speed', 1); App.settings.hp = g('set-hp', 100);
    App.settings.preshow = document.getElementById('set-preshow').checked;
    App.settings.commercials = document.getElementById('set-commercials').checked;
    U.save('punchma.settings', App.settings);
  };
  App.startRumble = (scripted) => {
    if (!P.admin.on) { App.promptAdmin(); if (!P.admin.on) return; }
    const chars = App.roster.filter(c => App.selected.has(c.id)); if (chars.length < 2) return;
    const script = scripted ? P.script.current : null; App.lastScripted = !!scripted;
    App.readSetup();
    App.show('rumble'); document.getElementById('winner-overlay').classList.remove('on');
    P.audio.init();
    P.rumble.onEnd = (f) => {
      for (const c of chars) c.stats.rumbles++;
      const w = App.roster.find(c => c.id === f.ch.id); if (w) w.stats.wins++;
      for (const id in P.rumble.elims) { const c = App.roster.find(x => x.id === id); if (c) c.stats.elims += P.rumble.elims[id]; }
      App.saveRoster(); App.showWinner(f);
    };
    P.rumble.start(chars, App.settings, script);
    App.lastChars = chars;
  };
  App.showWinner = (f) => {
    const ov = document.getElementById('winner-overlay'); ov.classList.add('on');
    P.render.portrait(document.getElementById('winner-canvas'), f.ch, P.render.pose(P.render.anim('flex', 0)), { bg: '#ffd23f' });
    document.getElementById('winner-name').textContent = f.ch.name;
    document.getElementById('winner-tag').textContent = 'the ' + C.tagline(f.ch);
    const em = P.rumble.elims, topId = Object.keys(em).sort((a, b) => em[b] - em[a])[0], top = topId && App.lastChars.find(c => c.id === topId);
    document.getElementById('winner-stats').textContent = `${em[f.ch.id] || 0} eliminations · Most violent: ${top ? top.name + ' (' + em[topId] + ')' : 'nobody, somehow'} · ${P.rumble.total} entrants`;
  };
  App.rematch = () => { document.getElementById('winner-overlay').classList.remove('on'); P.rumble.stop(); P.rumble.onEnd = null; setTimeout(() => App.startRumble(App.lastScripted), 50); };
  App.leaveRumble = () => { P.rumble.stop(); document.getElementById('winner-overlay').classList.remove('on'); App.show('roster'); };

  // ---- import / export ----
  App.exportRoster = () => {
    const data = { punchma: 2, exported: new Date().toISOString(), fighters: U.deep(App.custom()).map(c => { delete c.builtin; return c; }), sponsors: U.deep(P.sponsors.list) };
    if (!data.fighters.length && !data.sponsors.length) { alert('Nothing of your own to export yet.'); return; }
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'punchma-fighters.json'; a.click();
  };
  App.importRoster = (e) => {
    const f = e.target.files[0]; if (!f) return;
    const rd = new FileReader();
    rd.onload = () => {
      try {
        const raw = JSON.parse(rd.result);
        const fighters = Array.isArray(raw) ? raw : (raw.fighters || []);
        if (!Array.isArray(fighters)) throw 0;
        let n = 0;
        for (const c of fighters) { const ch = C.normalize(c); ch.builtin = false; if (App.roster.some(x => x.id === ch.id)) ch.id = U.uid(); App.roster.push(ch); App.selected.add(ch.id); n++; }
        let sn = 0; if (!Array.isArray(raw) && raw.sponsors && confirm(`This file also has ${raw.sponsors.length} sponsor(s). Import them too?`)) sn = P.sponsors.import(raw.sponsors);
        App.saveRoster(); App.renderRoster();
        alert(`Imported ${n} fighter${n === 1 ? '' : 's'}${sn ? ' and ' + sn + ' sponsor(s)' : ''}.`);
      } catch (err) { alert('That is not a Punchma fighter file.'); }
    };
    rd.readAsText(f); e.target.value = '';
  };

  // ---- audio + voice settings ----
  App.audioUI = () => {
    const s = P.audio.settings, m = document.getElementById('vol-music'), x = document.getElementById('vol-sfx');
    m.value = s.music; x.value = s.sfx;
    m.oninput = () => { s.music = +m.value; P.audio.applySettings(); P.audio.saveSettings(); };
    x.oninput = () => { s.sfx = +x.value; P.audio.applySettings(); P.audio.saveSettings(); };
  };
  App.voiceUI = () => {
    const V = P.voice, box = document.getElementById('voice-body'); box.innerHTML = '';
    const s = V.s;
    const rowEl = (l, input, hint) => el('label', { class: 'ctl' }, [el('span', { class: 'ctl-l', text: l }), input, hint ? el('small', { text: hint }) : null]);
    const sel = (val, opts, on) => { const e = el('select', { onchange: (ev) => { on(ev.target.value); V.save(); } }); for (const [v, l] of opts) e.appendChild(el('option', { value: v, text: l, selected: v === val ? 'selected' : null })); return e; };
    const txt = (val, on, ph) => el('input', { type: 'text', value: val, placeholder: ph || '', onchange: (ev) => { on(ev.target.value); V.save(); } });
    box.appendChild(el('label', { class: 'mini' }, [el('input', { type: 'checkbox', checked: s.enabled ? 'checked' : null, onchange: (e) => { s.enabled = e.target.checked; if (!s.enabled) V.stop(); V.save(); } }), ' Voices on']));
    box.appendChild(el('label', { class: 'mini' }, [el('input', { type: 'checkbox', checked: s.clips ? 'checked' : null, onchange: (e) => { s.clips = e.target.checked; V.save(); } }), " Play fighters' recorded voice lines"]));
    box.appendChild(rowEl('Engine', sel(s.engine, [['browser', 'Browser voices (built in, quality varies by OS)'], ['server', 'Local TTS server (OpenAI-compatible, e.g. Kokoro-FastAPI) — most natural'], ['kokoro', 'Kokoro in the browser (experimental, ~90MB download, needs http(s))']], v => { s.engine = v; App.voiceUI(); })));
    if (s.engine === 'server') {
      box.appendChild(el('p', { class: 'help', html: 'Run an open-source TTS with an OpenAI-style <code>/v1/audio/speech</code> endpoint. Easiest: <b>Kokoro-FastAPI</b> (<code>docker run -p 8880:8880 ghcr.io/remsky/kokoro-fastapi-cpu:latest</code>), then use voices like am_michael, am_adam, af_bella, am_puck, bm_george.' }));
      box.appendChild(rowEl('Server URL', txt(s.serverUrl, v => s.serverUrl = v, 'http://localhost:8880')));
      box.appendChild(rowEl('Model name', txt(s.serverModel, v => s.serverModel = v, 'kokoro')));
    }
    if (s.engine === 'kokoro') {
      box.appendChild(el('p', { class: 'help', html: 'Loads <code>kokoro-js</code> from a CDN and runs Kokoro-82M in your browser (WebGPU if available). First use downloads ~90MB. Will not work from a file:// path.' }));
      box.appendChild(rowEl('kokoro-js module URL', txt(s.kokoroUrl, v => s.kokoroUrl = v)));
      box.appendChild(rowEl('Precision', sel(s.kokoroDtype, [['q8', 'q8 (fast, ~90MB)'], ['fp32', 'fp32 (best, ~330MB)']], v => s.kokoroDtype = v)));
    }
    const voices = V.browserVoices();
    for (const role in V.ROLES) {
      const r = s.roles[role], g = el('fieldset', { class: 'rolebox' }, [el('legend', { text: V.ROLES[role] })]);
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

  // ---- scripted shows (admin only) ----
  App.scriptUI = () => {
    const S = P.script, box = document.getElementById('script-body'); if (!box) return; box.innerHTML = '';
    if (!P.admin.on) { box.appendChild(el('p', { class: 'help', text: 'Scripted shows are part of admin mode. Unlock admin to write or load a script.' })); return; }
    const cur = S.current, chars = () => App.roster.filter(c => App.selected.has(c.id));
    box.appendChild(el('p', { class: 'help', html: 'Want a curated show instead of pure chaos? <b>1.</b> Copy the prompt (it includes your selected fighters). <b>2.</b> Paste it into any LLM: a local Qwen in Ollama or LM Studio, or anything else. <b>3.</b> Paste the JSON it writes back below. The game then plays that story: entrance order, custom moves, callbacks, eliminations and the winner, with the commentators reading the script\'s lines.' }));
    const ta = el('textarea', { id: 'script-in', rows: 6, placeholder: 'Paste the JSON script here...' });
    const status = el('div', { class: 'muted', id: 'script-status' });
    const load = (text) => { try { const raw = S.parse(text); const prep = S.prepare(raw, chars()); S.current = raw; U.save('punchma.script', raw); const msg = `Loaded "${raw.title || 'untitled'}": ${prep.beats.length} beats. ` + (prep.warnings.length ? 'Warnings: ' + prep.warnings.join(' | ') : 'Looks good.'); App.scriptUI(); const st = document.getElementById('script-status'); if (st) st.textContent = msg; } catch (e) { status.textContent = 'Could not read that: ' + e.message; } };
    box.appendChild(el('div', { class: 'btnrow' }, [
      el('button', { class: 'btn', text: '📋 Copy prompt for your LLM', onclick: () => { const p = S.buildPrompt(chars()); if (navigator.clipboard) navigator.clipboard.writeText(p).then(() => status.textContent = 'Prompt copied. Paste it into your LLM, then paste its JSON answer below.', () => { ta.value = p; status.textContent = 'Clipboard blocked; the prompt is in the box below.'; }); else { ta.value = p; status.textContent = 'The prompt is in the box below.'; } } }),
      el('button', { class: 'btn', text: '⬇ Download prompt (.txt)', onclick: () => { const b = new Blob([S.buildPrompt(chars())], { type: 'text/plain' }); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'punchma-prompt.txt'; a.click(); } }),
    ]));
    box.appendChild(el('details', {}, [el('summary', { text: '⚡ Or generate directly from a local LLM (Ollama / LM Studio / any OpenAI-compatible endpoint)' }), el('div', { class: 'inline' }, [
      el('input', { type: 'text', value: S.llm.url, placeholder: 'http://localhost:11434/v1', onchange: (e) => { S.llm.url = e.target.value; S.saveLLM(); } }),
      el('input', { type: 'text', value: S.llm.model, placeholder: 'model name, e.g. qwen3.5', onchange: (e) => { S.llm.model = e.target.value; S.saveLLM(); } }),
      el('input', { type: 'password', value: S.llm.key, placeholder: 'api key (optional)', onchange: (e) => { S.llm.key = e.target.value; S.saveLLM(); } }),
      el('button', { class: 'btn primary', text: 'Generate', onclick: async (e) => { e.target.disabled = true; status.textContent = 'Asking the LLM... (this can take a minute)'; try { const txt = await S.generateLocal(S.buildPrompt(chars())); ta.value = txt; load(txt); } catch (err) { status.textContent = 'Failed: ' + err.message + '. For Ollama set OLLAMA_ORIGINS=* ; in LM Studio enable CORS in the server settings.'; } e.target.disabled = false; } }),
    ]), el('small', { class: 'muted', text: 'Ollama: run `OLLAMA_ORIGINS=* ollama serve` so the browser may call it. LM Studio: enable CORS in Developer > Server settings.' })]));
    box.appendChild(ta);
    box.appendChild(el('div', { class: 'btnrow' }, [
      el('button', { class: 'btn', text: '📥 Load script from box', onclick: () => load(ta.value) }),
      el('label', { class: 'btn' }, ['📂 Load script file', el('input', { type: 'file', accept: '.json,.txt,application/json', hidden: 'hidden', onchange: (e) => { const f = e.target.files[0]; if (!f) return; const rd = new FileReader(); rd.onload = () => load(rd.result); rd.readAsText(f); e.target.value = ''; } })]),
      cur ? el('button', { class: 'btn small danger', text: '✕ Clear loaded script', onclick: () => { S.current = null; localStorage.removeItem('punchma.script'); App.scriptUI(); } }) : null,
    ]));
    box.appendChild(status);
    if (cur) { const prep = S.prepare(cur, chars()); box.appendChild(el('div', { class: 'scriptcard' }, [el('b', { text: '📜 ' + (cur.title || 'Untitled show') }), el('div', { class: 'muted', text: `${prep.beats.length} beats · order: ${prep.order.map(c => c.name).join(' → ')}` }), prep.warnings.length ? el('div', { class: 'warn', text: prep.warnings.join(' | ') }) : null, el('button', { class: 'btn primary huge', text: '🎬 PLAY THE SCRIPTED SHOW', onclick: () => App.startRumble(true) })])); }
  };

  // ---- default roster ----
  App.defaults = () => {
    const mk = (o) => { const ch = C.normalize(U.merge(C.random(), o)); ch.builtin = true; return ch; };
    return [
      mk({ id: 'def_banana', name: 'Bill Banana', tag: { adj: 'Warlike', noun: 'Pig' }, persona: 'showboat', hometown: 'Parts Unknown', catchphrase: 'Punchma balls!', body: { type: 'buff', headShape: 'round', height: 1.1, girth: 1.2, headSize: 0.9, armLength: 1.2, legLength: 1, torsoLength: 1, limbThickness: 1.4, neckLength: 0.5, skin: '#ffe14d' }, hair: { style: 'mohawk', color: '#1a1a1a' }, hat: { id: 'none' }, face: { eyes: 'big', brows: 'angry', nose: 'dot', mouth: 'teeth', beard: 'none' }, shirt: { id: 'singlet', color: '#ffd23f', color2: '#111', text: 'BANANA', sleeves: 'auto' }, pants: { id: 'speedo', color: '#111' }, shoes: { id: 'boots', color: '#111' }, extra: { id: 'belt' }, song: { type: 'builtin', id: 'hype' }, pronouns: 'he', gender: 'Male', voice: { pitch: 0.5, rate: 1 } }),
      mk({ id: 'def_deb', name: 'Grandma Deb', tag: { adj: 'Recently Divorced', noun: 'Wine Mom' }, persona: 'oldman', hometown: "The Local Applebee's", catchphrase: 'Where is the manager?!', body: { type: 'pear', headShape: 'wide', height: 0.8, girth: 1.3, headSize: 1.1, armLength: 0.8, legLength: 0.6, torsoLength: 1, limbThickness: 1.1, neckLength: 0.3, skin: '#f7d6b8' }, hair: { style: 'cloud', color: '#eee' }, hat: { id: 'none' }, face: { eyes: 'monocle', brows: 'worried', nose: 'button', mouth: 'lips', beard: 'none' }, shirt: { id: 'sweater', color: '#c2447a', color2: '#ffe14d', sleeves: 'auto' }, pants: { id: 'skirt', color: '#5a3a8a' }, shoes: { id: 'socksandals', color: '#fff' }, extra: { id: 'beer' }, song: { type: 'builtin', id: 'elevator' }, pronouns: 'she', gender: 'Female', voice: { pitch: 1.4, rate: 0.8 } }),
      mk({ id: 'def_skeeter', name: 'Skeeter Nutz', tag: { adj: 'Uninsured', noun: 'Crypto Bro' }, persona: 'zoomer', hometown: 'Reddit', catchphrase: 'Skill issue.', body: { type: 'noodle', headShape: 'egg', height: 1.3, girth: 0.7, headSize: 1, armLength: 1.5, legLength: 1.4, torsoLength: 1, limbThickness: 0.6, neckLength: 1.5, skin: '#f2c9a0' }, hair: { style: 'emo', color: '#3bafe0' }, hat: { id: 'backcap', color: '#e33', color2: '#fff' }, face: { eyes: 'sleepy', brows: 'raised', nose: 'pointy', mouth: 'smirk', beard: 'stubble' }, shirt: { id: 'hoodie', color: '#222', color2: '#fff', sleeves: 'auto' }, pants: { id: 'sweats', color: '#666' }, shoes: { id: 'crocs', color: '#5f5' }, extra: { id: 'phone' }, song: { type: 'builtin', id: 'nokia' }, pronouns: 'he', gender: 'Male', voice: { pitch: 1.1, rate: 1.3 } }),
      mk({ id: 'def_meatloaf', name: 'Captain Meatloaf', tag: { adj: 'Room-Temperature', noun: 'Ham' }, persona: 'maniac', hometown: "A Dumpster Behind Arby's", catchphrase: 'I AM THE BUS!', body: { type: 'blob', headShape: 'potato', height: 0.9, girth: 1.8, headSize: 1.3, armLength: 0.7, legLength: 0.5, torsoLength: 1.1, limbThickness: 1.8, neckLength: 0, skin: '#c98b5c' }, hair: { style: 'none', color: '#000' }, hat: { id: 'viking' }, face: { eyes: 'crazy', brows: 'uni', nose: 'big', mouth: 'wobbly', beard: 'beard', facialHairColor: '#b32626' }, shirt: { id: 'none', sleeves: 'auto' }, pants: { id: 'tighty', color: '#fff' }, shoes: { id: 'none' }, extra: { id: 'chicken' }, song: { type: 'builtin', id: 'boss' }, pronouns: 'he', gender: 'Meat', voice: { pitch: 0.3, rate: 0.9 } }),
      mk({ id: 'def_puddles', name: 'Sheriff Puddles', tag: { adj: 'Court-Ordered', noun: 'Mall Cop' }, persona: 'cop', hometown: 'Costco', catchphrase: 'Sir. SIR.', body: { type: 'brick', headShape: 'square', height: 1, girth: 1.1, headSize: 1, armLength: 0.9, legLength: 0.9, torsoLength: 1.1, limbThickness: 1.2, neckLength: 0.4, skin: '#e0ac7c' }, hair: { style: 'flattop', color: '#4a2a10' }, hat: { id: 'cap', color: '#1a2a5a', color2: '#ffd23f' }, face: { eyes: 'shades', brows: 'none', nose: 'dot', mouth: 'flat', beard: 'stache' }, shirt: { id: 'tee', color: '#1a2a5a', color2: '#ffd23f', text: 'COP', sleeves: 'auto' }, pants: { id: 'cargo', color: '#3a3a3a' }, shoes: { id: 'boots', color: '#222' }, extra: { id: 'none' }, song: { type: 'builtin', id: 'western' }, pronouns: 'he', gender: 'Male', voice: { pitch: 0.8, rate: 0.95 } }),
      mk({ id: 'def_gravy', name: 'Princess Gravy', tag: { adj: 'Glistening', noun: 'Sea Cucumber' }, persona: 'diva', hometown: 'A Cruise Ship Buffet', catchphrase: 'Ew. Just... ew.', body: { type: 'egg', headShape: 'tall', height: 1.05, girth: 1, headSize: 1.2, armLength: 1, legLength: 1.2, torsoLength: 0.9, limbThickness: 0.8, neckLength: 2, skin: '#c98cf2' }, hair: { style: 'beehive', color: '#f26cb0' }, hat: { id: 'crown' }, face: { eyes: 'anime', brows: 'drawn', nose: 'none', mouth: 'lips', beard: 'none' }, shirt: { id: 'croptop', color: '#f26cb0', color2: '#fff', sleeves: 'auto' }, pants: { id: 'tutu', color: '#f9c' }, shoes: { id: 'heels', color: '#e33' }, extra: { id: 'wings' }, song: { type: 'builtin', id: 'fanfare' }, pronouns: 'she', gender: 'Female', voice: { pitch: 1.8, rate: 1.1 } }),
      mk({ id: 'def_doug', name: 'Doug', tag: { adj: 'Probably Fine', noun: 'Dad' }, persona: 'dad', hometown: 'A Cul-de-sac', catchphrase: "Hi, Hungry, I'm Dad.", body: { type: 'pear', headShape: 'round', height: 1, girth: 1.25, headSize: 1, armLength: 1, legLength: 0.95, torsoLength: 1, limbThickness: 1.1, neckLength: 0.8, skin: '#f2c9a0' }, hair: { style: 'receding', color: '#8b5a2b' }, hat: { id: 'none' }, face: { eyes: 'dots', brows: 'flat', nose: 'big', mouth: 'smile', beard: 'stache', facialHairColor: '#8b5a2b' }, shirt: { id: 'hawaiian', color: '#3a7bd5', color2: '#ffe14d', sleeves: 'auto' }, pants: { id: 'cargo', color: '#c9b78a' }, shoes: { id: 'socksandals', color: '#fff' }, extra: { id: 'none' }, song: { type: 'builtin', id: 'sitcom' }, pronouns: 'he', gender: 'Male', voice: { pitch: 0.7, rate: 0.9 } }),
      mk({ id: 'def_toddler', name: 'The Toddler', tag: { adj: 'Un-Housebroken', noun: 'Baby' }, persona: 'baby', hometown: 'Under Your Bed', catchphrase: 'I made a stinky.', body: { type: 'chunky', headShape: 'round', height: 0.55, girth: 1.4, headSize: 1.8, armLength: 0.6, legLength: 0.4, torsoLength: 0.8, limbThickness: 1.6, neckLength: 0, skin: '#f7d6b8' }, hair: { style: 'none', color: '#e8c060' }, hat: { id: 'propeller', color: '#e33', color2: '#3bf' }, face: { eyes: 'big', brows: 'worried', nose: 'button', mouth: 'pacifier', beard: 'none' }, shirt: { id: 'none', sleeves: 'auto' }, pants: { id: 'diaper', color: '#fff' }, shoes: { id: 'bunny', color: '#f9c' }, extra: { id: 'teddy' }, song: { type: 'builtin', id: 'baby' }, pronouns: 'it', gender: 'Yes', voice: { pitch: 2, rate: 1.3 } }),
      mk({ id: 'def_stankface', name: 'Reverend Stankface', tag: { adj: 'Unholy', noun: 'Youth Pastor' }, persona: 'salesman', hometown: 'Hell', catchphrase: 'Just sign here.', body: { type: 'triangle', headShape: 'peanut', height: 1.2, girth: 1, headSize: 0.9, armLength: 1.3, legLength: 1.1, torsoLength: 1.2, limbThickness: 0.9, neckLength: 1.2, skin: '#8fd14f' }, hair: { style: 'sidepart', color: '#1a1a1a' }, hat: { id: 'horns' }, face: { eyes: 'beady', brows: 'angry', nose: 'hook', mouth: 'mustachio', beard: 'goatee', facialHairColor: '#1a1a1a' }, shirt: { id: 'suit', color: '#222', color2: '#e33', sleeves: 'auto' }, pants: { id: 'jeans', color: '#222' }, shoes: { id: 'dress', color: '#111' }, extra: { id: 'briefcase', color: '#5a3a1a' }, song: { type: 'builtin', id: 'spooky' }, pronouns: 'he', gender: "It's Complicated", voice: { pitch: 0.4, rate: 1 } }),
      mk({ id: 'def_unit7b', name: 'Unit 7B', tag: { adj: 'Low-Battery', noun: 'Roomba' }, persona: 'robot', hometown: 'A Lab Accident', catchphrase: 'INITIATING VIOLENCE.', body: { type: 'brick', headShape: 'block', height: 1, girth: 1.2, headSize: 1, armLength: 1, legLength: 0.8, torsoLength: 1.2, limbThickness: 1.3, neckLength: 0.5, skin: '#d9d9d9' }, hair: { style: 'none', color: '#000' }, hat: { id: 'antenna' }, face: { eyes: 'laser', brows: 'none', nose: 'none', mouth: 'zipper', beard: 'none' }, shirt: { id: 'tee', color: '#888', color2: '#5f5', text: '7B', sleeves: 'auto' }, pants: { id: 'spacesuit', color: '#eee' }, shoes: { id: 'skiboots', color: '#888' }, extra: { id: 'jetpack' }, song: { type: 'builtin', id: 'dialup' }, pronouns: 'it', gender: 'A Concept', voice: { pitch: 0.2, rate: 0.8 } }),
      mk({ id: 'def_boo', name: 'Boo Radley Jr.', tag: { adj: 'Recently Deceased', noun: 'Roommate' }, persona: 'ghost', hometown: 'The Void', catchphrase: 'I died for this?', body: { type: 'average', headShape: 'egg', height: 1.1, girth: 0.9, headSize: 1.1, armLength: 1.1, legLength: 1, torsoLength: 1, limbThickness: 0.9, neckLength: 1, skin: '#d9d9d9' }, hair: { style: 'long', color: '#f2f2f2' }, hat: { id: 'halo' }, face: { eyes: 'wide', brows: 'worried', nose: 'none', mouth: 'open', beard: 'none' }, shirt: { id: 'robe', color: '#eee', color2: '#eee', sleeves: 'auto' }, pants: { id: 'none', color: '#fff' }, shoes: { id: 'none' }, extra: { id: 'none' }, song: { type: 'builtin', id: 'funeral' }, pronouns: 'they', gender: 'Unspecified', voice: { pitch: 0.5, rate: 0.7 } }),
      mk({ id: 'def_bort', name: 'Chef Bort', tag: { adj: 'Undercooked', noun: 'Lunch Lady' }, persona: 'chef', hometown: 'A Gas Station Bathroom', catchphrase: "IT'S RAW!", body: { type: 'chunky', headShape: 'wide', height: 0.95, girth: 1.5, headSize: 1.1, armLength: 0.9, legLength: 0.8, torsoLength: 1, limbThickness: 1.5, neckLength: 0.2, skin: '#ff8fa3' }, hair: { style: 'none', color: '#000' }, hat: { id: 'chef' }, face: { eyes: 'cross', brows: 'angry', nose: 'clown', mouth: 'teeth', beard: 'handlebar', facialHairColor: '#1a1a1a' }, shirt: { id: 'apron', color: '#fff', color2: '#e33', sleeves: 'auto' }, pants: { id: 'pajama', color: '#3a3' }, shoes: { id: 'clownshoes', color: '#e33' }, extra: { id: 'baguette' }, song: { type: 'builtin', id: 'circus' }, pronouns: 'they', gender: 'Gas', voice: { pitch: 0.9, rate: 1.4 } }),
    ];
  };

  // Rosters saved before default/custom were split have no builtin flag, so the shipped cast showed up under
  // "My fighters". Match them back by id or by name and hand them their default identity again.
  App.migrate = (saved) => {
    const defs = App.defaults();
    const byId = new Map(defs.map(d => [d.id, d])), byName = new Map(defs.map(d => [d.name.toLowerCase(), d]));
    const out = [], claimed = new Set();
    for (const raw of saved) {
      const ch = C.normalize(raw);
      if (raw.builtin === true) { ch.builtin = true; claimed.add(ch.id); out.push(ch); continue; }
      if (raw.builtin === false) { ch.builtin = false; out.push(ch); continue; }
      const d = byId.get(ch.id) || byName.get(String(ch.name || '').toLowerCase());
      if (d && !claimed.has(d.id)) { ch.builtin = true; ch.id = d.id; claimed.add(d.id); } else ch.builtin = false;
      out.push(ch);
    }
    for (const d of defs) if (!claimed.has(d.id)) out.push(d); // anything the save was missing
    return out;
  };

  App.init = () => {
    P.sponsors.load();
    const saved = U.load('punchma.roster', null);
    App.roster = saved ? App.migrate(saved) : App.defaults();
    if (saved) App.saveRoster();
    App.selected = new Set(App.roster.map(c => c.id));
    if (!saved) App.saveRoster();
    if (sessionStorage.getItem('punchma.admin') === '1') P.admin.on = true;
    App.audioUI();
    const iv = document.getElementById('set-interval'); if (iv) iv.oninput = (e) => document.getElementById('set-interval-v').textContent = e.target.value + 's';
    const hp = document.getElementById('set-hp'); if (hp) hp.oninput = (e) => document.getElementById('set-hp-v').textContent = e.target.value;
    document.addEventListener('keydown', (e) => {
      if (App.screen !== 'rumble') return;
      if (e.key === ' ') { e.preventDefault(); P.rumble.paused = !P.rumble.paused; }
      if (e.key === '1') P.rumble.speed = 1; if (e.key === '2') P.rumble.speed = 2; if (e.key === '4') P.rumble.speed = 4;
      if (e.key === 's' || e.key === 'S') P.rumble.skipPreshow();
    });
    if ('speechSynthesis' in window) speechSynthesis.onvoiceschanged = () => { if (document.getElementById('voice-modal').classList.contains('on')) App.voiceUI(); };
    App.applyAdmin();
    App.show('roster');
  };
  window.addEventListener('DOMContentLoaded', App.init);
})();
