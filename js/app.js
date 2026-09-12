// App shell: screens, roster persistence, rumble setup, default roster.
window.P = window.P || {};
(function () {
  const U = P.util, el = U.el, C = P.char;
  const App = P.app = { roster: [], screen: 'roster', selected: new Set() };
  App.settings = Object.assign({ interval: 12, chaos: 1, speed: 1, hp: 100 }, U.load('punchma.settings', {}));

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

  App.startRumble = () => {
    const chars = App.roster.filter(c => App.selected.has(c.id)); if (chars.length < 2) return;
    App.settings.interval = +document.getElementById('set-interval').value; App.settings.chaos = +document.getElementById('set-chaos').value; App.settings.speed = +document.getElementById('set-speed').value; U.save('punchma.settings', App.settings);
    App.show('rumble'); document.getElementById('winner-overlay').classList.remove('on');
    P.audio.init();
    P.rumble.onEnd = (f) => { for (const c of chars) c.stats.rumbles++; const w = App.roster.find(c => c.id === f.ch.id); if (w) w.stats.wins++; for (const id in P.rumble.elims) { const c = App.roster.find(x => x.id === id); if (c) c.stats.elims += P.rumble.elims[id]; } App.saveRoster(); App.showWinner(f); };
    P.rumble.start(chars, App.settings);
    App.lastChars = chars;
  };
  App.showWinner = (f) => {
    const ov = document.getElementById('winner-overlay'); ov.classList.add('on');
    const cv = document.getElementById('winner-canvas'); P.render.portrait(cv, f.ch, P.render.pose(P.render.anim('flex', 0)), { bg: '#ffd23f' });
    document.getElementById('winner-name').textContent = f.ch.name; document.getElementById('winner-tag').textContent = 'the ' + C.tagline(f.ch);
    const em = P.rumble.elims; const topId = Object.keys(em).sort((a, b) => em[b] - em[a])[0]; const top = topId && App.lastChars.find(c => c.id === topId);
    document.getElementById('winner-stats').textContent = `${em[f.ch.id] || 0} eliminations · Most violent: ${top ? top.name + ' (' + em[topId] + ')' : 'nobody, somehow'} · ${P.rumble.total} entrants`;
  };
  App.rematch = () => { document.getElementById('winner-overlay').classList.remove('on'); P.rumble.stop(); P.rumble.onEnd = null; setTimeout(App.startRumble, 50); };
  App.leaveRumble = () => { P.rumble.stop(); document.getElementById('winner-overlay').classList.remove('on'); App.show('roster'); };

  App.exportRoster = () => { const blob = new Blob([JSON.stringify(App.roster, null, 1)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'punchma-roster.json'; a.click(); };
  App.importRoster = (e) => { const f = e.target.files[0]; if (!f) return; const rd = new FileReader(); rd.onload = () => { try { const arr = JSON.parse(rd.result); if (!Array.isArray(arr)) throw 0; for (const c of arr) { const ch = C.normalize(c); if (App.roster.some(x => x.id === ch.id)) ch.id = U.uid(); App.roster.push(ch); App.selected.add(ch.id); } App.saveRoster(); App.renderRoster(); } catch (err) { alert('That is not a Punchma roster file. Or it is, and it is broken. Either way, no.'); } }; rd.readAsText(f); e.target.value = ''; };

  App.audioUI = () => {
    const s = P.audio.settings; const m = document.getElementById('vol-music'), x = document.getElementById('vol-sfx'), v = document.getElementById('voice-on');
    m.value = s.music; x.value = s.sfx; v.checked = s.voice;
    m.oninput = () => { s.music = +m.value; P.audio.applySettings(); P.audio.saveSettings(); }; x.oninput = () => { s.sfx = +x.value; P.audio.applySettings(); P.audio.saveSettings(); }; v.onchange = () => { s.voice = v.checked; if (!v.checked) P.audio.shutUp(); P.audio.saveSettings(); };
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
    App.audioUI();
    document.getElementById('set-interval').oninput = (e) => document.getElementById('set-interval-v').textContent = e.target.value + 's';
    document.addEventListener('keydown', (e) => { if (App.screen !== 'rumble') return; if (e.key === ' ') { e.preventDefault(); P.rumble.paused = !P.rumble.paused; } if (e.key === '1') P.rumble.speed = 1; if (e.key === '2') P.rumble.speed = 2; if (e.key === '4') P.rumble.speed = 4; });
    if ('speechSynthesis' in window) speechSynthesis.getVoices();
    App.show('roster');
  };
  window.addEventListener('DOMContentLoaded', App.init);
})();
