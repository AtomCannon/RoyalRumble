// Character builder UI. Left: live animated preview. Right: tabs of controls. Everything writes into B.ch and re-renders.
window.P = window.P || {};
(function () {
  const U = P.util, el = U.el, C = P.char;
  const B = P.builder = { ch: null, tab: 'body', previewAnim: 'idle', raf: null, walkT: 0 };

  B.blankFighter = () => { const ch = C.blank(); ch.hair.style = U.pick(['buzz', 'ponytail']); ch.shirt.id = 'none'; ch.pants.id = 'tighty'; ch.shoes.id = 'none'; ch.hat.id = 'none'; ch.extra.id = 'none'; ch.tag = { adj: U.pick(P.data.ADJ), noun: U.pick(P.data.NOUN) }; return ch; };
  B.open = (ch) => {
    B.ch = C.normalize(ch ? U.deep(ch) : B.blankFighter()); B.origId = ch ? ch.id : null; B.tab = 'body'; B.snip = null;
    P.app.show('builder'); B.renderControls(); B.startPreview();
  };
  B.startPreview = () => {
    cancelAnimationFrame(B.raf); const cv = document.getElementById('preview'); let t0 = performance.now();
    let last = t0;
    const loop = (now) => {
      const t = (now - t0) / 1000, dt = Math.min(0.05, (now - last) / 1000); last = now;
      const w = B.walkStep(dt);
      const name = w ? w.anim : B.previewAnim, opts = w ? w.opts : { p: (Math.sin(t * 6) + 1) / 2, speed: 2 };
      const pose = P.render.pose(Object.assign({ t }, P.render.anim(name, t, opts)));
      pose.facing = (P.render.anim(name, t, opts).facing || 1);
      if (w && w.jump) pose.jump = (pose.jump || 0) + w.jump;
      if (B.tab === 'face') { pose.hideHat = true; pose.hideHair = true; }
      if (B.tab === 'hair') pose.hideHat = true;
      const btn = document.getElementById('walkon-btn'); if (btn) btn.textContent = B.walk ? '🎬 Walking out...' : '🎬 Preview walk-on';
      P.render.portrait(cv, B.ch, pose, { bg: '#0b1030' });
      B.raf = requestAnimationFrame(loop);
    };
    B.raf = requestAnimationFrame(loop);
  };
  B.stopPreview = () => cancelAnimationFrame(B.raf);

  // ---- control factories ----
  const row = (label, input, hint) => el('label', { class: 'ctl' }, [el('span', { class: 'ctl-l', text: label }), input, hint ? el('small', { text: hint }) : null]);
  const select = (val, options, onch) => { const s = el('select', { onchange: (e) => { onch(e.target.value); B.refresh(); } }); for (const o of options) { const [v, l] = Array.isArray(o) ? o : [o, o]; s.appendChild(el('option', { value: v, text: l, selected: v === val ? 'selected' : null })); } if (val !== undefined && ![...s.options].some(o => o.value === val)) { s.appendChild(el('option', { value: val, text: val, selected: 'selected' })); } return s; };
  const text = (val, onch, ph) => el('input', { type: 'text', value: val || '', placeholder: ph || '', oninput: (e) => { onch(e.target.value); B.refreshLight(); } });
  const slider = (val, min, max, onch, step = 0.01) => el('input', { type: 'range', min, max, step, value: val, oninput: (e) => { onch(+e.target.value); } });
  const color = (val, onch) => el('input', { type: 'color', value: val || '#888888', oninput: (e) => { onch(e.target.value); } });
  const swatches = (list, onch) => el('div', { class: 'swatches' }, list.map(c => el('button', { class: 'sw', style: `background:${c}`, title: c, onclick: () => { onch(c); B.refresh(); } })));
  const itemPicker = (slot, val, onch) => { const wrap = el('div', { class: 'items' }); for (const it of P.items.reg[slot]) { const b = el('button', { class: 'item' + (it.id === val ? ' sel' : ''), title: it.name, onclick: () => { onch(it.id); B.refresh(); } }); const cv = el('canvas', { width: 64, height: 64 }); b.appendChild(cv); b.appendChild(el('span', { text: it.name })); wrap.appendChild(b); B.thumbQueue.push([cv, slot, it.id]); } return wrap; };
  const btn = (label, onclick, cls) => el('button', { class: 'btn ' + (cls || ''), text: label, onclick });
  B.thumbQueue = [];
  B.drawThumbs = () => { // draw item thumbnails: a temp character wearing the item, cropped to the relevant part
    for (const [cv, slot, id] of B.thumbQueue.splice(0)) {
      const ch = U.deep(B.ch); ch.custom = {};
      if (slot === 'hair') ch.hair.style = id; else if (slot === 'hat') ch.hat.id = id; else if (['eyes', 'brows', 'nose', 'mouth', 'beard'].includes(slot)) ch.face[slot] = id; else ch[slot].id = id;
      const ctx = cv.getContext('2d'); ctx.clearRect(0, 0, 64, 64);
      const part = P.SLOTS[slot].part;
      if (part === 'head') { const it = P.items.get(slot, id); ctx.save(); ctx.translate(32, 34); ctx.scale(0.11, 0.11); ctx.translate(-256, -256); (P.shapes.head[ch.body.headShape] || P.shapes.head.round)(ctx); P.draw.fs(ctx, ch.body.skin, 14); const pose = P.render.defaultPose(); if (slot === 'hair' && it.drawBack) { } if (it.draw) it.draw(ctx, ch, pose); ctx.restore(); }
      else if (part === 'torso' || slot === 'extra') { const it = P.items.get(slot, id); ctx.save(); ctx.translate(32, 32); ctx.scale(0.1, 0.1); ctx.translate(-256, -256); if (slot === 'shirt') { (P.shapes.torso[ch.body.type] || P.shapes.torso.average)(ctx); P.draw.fs(ctx, ch.body.skin, 14); } if (it.draw) it.draw(ctx, ch, P.render.defaultPose()); ctx.restore(); }
      else if (part === 'leg') { const it = P.items.get(slot, id); ctx.save(); ctx.translate(32, 32); ctx.scale(0.1, 0.1); ctx.translate(-256, -256); ctx.save(); ctx.translate(-70, 0); P.draw.line(ctx, 256, 128, 256, 400, 90, ch.body.skin); if (it.draw) it.draw(ctx, ch, P.render.defaultPose()); ctx.restore(); ctx.save(); ctx.translate(70, 0); P.draw.line(ctx, 256, 128, 256, 400, 90, ch.body.skin); if (it.draw) it.draw(ctx, ch, P.render.defaultPose()); ctx.restore(); if (it.drawHips) { ctx.save(); ctx.translate(0, -10); ctx.scale(1.1, 0.9); it.drawHips(ctx, ch, P.render.defaultPose()); ctx.restore(); } ctx.restore(); }
      else if (part === 'foot') { const it = P.items.get(slot, id); ctx.save(); ctx.translate(32, 40); ctx.scale(0.1, 0.1); ctx.translate(-256, -256); if (it.draw) it.draw(ctx, ch, P.render.defaultPose()); ctx.restore(); }
    }
  };

  B.refresh = () => { B.renderControls(); };
  B.refreshLight = () => { const h = document.getElementById('b-title'); if (h) h.textContent = C.fullTitle(B.ch); };

  const TABS = [['body', 'Body'], ['face', 'Face'], ['hair', 'Hair'], ['hat', 'Hat'], ['clothes', 'Clothes'], ['stuff', 'Stuff'], ['identity', 'Identity'], ['song', 'Walk-On'], ['voice', 'Voice Lines'], ['png', 'Custom PNGs'], ['rig', 'Rig a PNG']];

  B.renderControls = () => {
    const ch = B.ch, root = document.getElementById('b-controls'); root.innerHTML = '';
    document.getElementById('b-title').textContent = C.fullTitle(ch);
    root.appendChild(el('div', { class: 'tabs' }, TABS.map(([id, l]) => el('button', { class: 'tab' + (B.tab === id ? ' on' : ''), text: l, onclick: () => { B.tab = id; B.refresh(); } }))));
    const pane = el('div', { class: 'pane' }); root.appendChild(pane);
    const b = ch.body;
    switch (B.tab) {
      case 'body':
        pane.appendChild(row('Body type', select(b.type, C.BODY_TYPES, v => b.type = v)));
        for (const [k, l, mn, mx, lo, hi] of C.SLIDERS) pane.appendChild(row(l, slider(b[k], mn, mx, v => b[k] = v), `${lo} ⟵ ⟶ ${hi}`));
        pane.appendChild(row('Skin', el('div', {}, [swatches(C.SKINS, v => b.skin = v), color(b.skin, v => b.skin = v)])));
        pane.appendChild(el('div', { class: 'btnrow' }, [btn('🎲 Random body', () => { const r = C.random(); ch.body = r.body; B.refresh(); }), btn('Reset proportions', () => { Object.assign(b, { height: 1, girth: 1, headSize: 1, torsoLength: 1, armLength: 1, legLength: 1, limbThickness: 1, neckLength: 1 }); B.refresh(); })]));
        break;
      case 'face':
        pane.appendChild(el('p', { class: 'help', text: 'Hat and hair are hidden in the preview while you work on the face.' }));
        pane.appendChild(row('Head shape', select(b.headShape, C.HEAD_SHAPES, v => b.headShape = v)));
        pane.appendChild(row('Eyes', itemPicker('eyes', ch.face.eyes, v => ch.face.eyes = v)));
        pane.appendChild(row('Eyebrows', itemPicker('brows', ch.face.brows, v => ch.face.brows = v)));
        pane.appendChild(row('Nose', itemPicker('nose', ch.face.nose, v => ch.face.nose = v)));
        pane.appendChild(row('Mouth', itemPicker('mouth', ch.face.mouth, v => ch.face.mouth = v)));
        pane.appendChild(row('Facial hair', itemPicker('beard', ch.face.beard, v => ch.face.beard = v)));
        pane.appendChild(row('Facial hair color', el('div', {}, [swatches(C.HAIR_COLORS, v => ch.face.facialHairColor = v), color(ch.face.facialHairColor, v => ch.face.facialHairColor = v)])));
        break;
      case 'hair':
        pane.appendChild(el('p', { class: 'help', text: 'The hat is hidden in the preview while you pick hair.' }));
        pane.appendChild(row('Hair', itemPicker('hair', ch.hair.style, v => ch.hair.style = v)));
        pane.appendChild(row('Hair color', el('div', {}, [swatches(C.HAIR_COLORS, v => ch.hair.color = v), color(ch.hair.color, v => ch.hair.color = v)])));
        break;
      case 'hat':
        pane.appendChild(row('Hat', itemPicker('hat', ch.hat.id, v => ch.hat.id = v)));
        pane.appendChild(row('Hat colors', el('div', { class: 'inline' }, [color(ch.hat.color, v => ch.hat.color = v), color(ch.hat.color2, v => ch.hat.color2 = v)])));
        break;
      case 'clothes':
        pane.appendChild(row('Shirt', itemPicker('shirt', ch.shirt.id, v => ch.shirt.id = v)));
        pane.appendChild(row('Shirt colors', el('div', { class: 'inline' }, [color(ch.shirt.color, v => ch.shirt.color = v), color(ch.shirt.color2, v => ch.shirt.color2 = v)])));
        pane.appendChild(row('Sleeves', select(ch.shirt.sleeves, [['auto', 'Auto (per shirt)'], ['none', 'None'], ['short', 'Short'], ['long', 'Long']], v => ch.shirt.sleeves = v)));
        pane.appendChild(row('Shirt text (tee / jersey / singlet)', text(ch.shirt.text, v => ch.shirt.text = v, 'e.g. MEAT')));
        pane.appendChild(row('Pants', itemPicker('pants', ch.pants.id, v => ch.pants.id = v)));
        pane.appendChild(row('Pants color', color(ch.pants.color, v => ch.pants.color = v)));
        pane.appendChild(row('Shoes', itemPicker('shoes', ch.shoes.id, v => ch.shoes.id = v)));
        pane.appendChild(row('Shoe color', color(ch.shoes.color, v => ch.shoes.color = v)));
        break;
      case 'stuff':
        pane.appendChild(row('Accessory', itemPicker('extra', ch.extra.id, v => ch.extra.id = v)));
        pane.appendChild(row('Accessory color', color(ch.extra.color, v => ch.extra.color = v)));
        pane.appendChild(row('Sign text', text(ch.extra.text, v => ch.extra.text = v, 'e.g. FREE HUGS')));
        break;
      case 'identity': {
        pane.appendChild(row('Name', text(ch.name, v => ch.name = v, 'Bill Banana')));
        const tagRow = el('div', { class: 'tagrow' }, [el('span', { class: 'the', text: 'the' }), select(ch.tag.adj, P.data.ADJ, v => ch.tag.adj = v), select(ch.tag.noun, P.data.NOUN, v => ch.tag.noun = v)]);
        pane.appendChild(row('Tagline', tagRow, 'Name + "the" + Dropdown 1 + Dropdown 2. Choose wisely. Or badly.'));
        pane.appendChild(el('div', { class: 'btnrow' }, [btn('🎲 Random tagline', () => { ch.tag = { adj: U.pick(P.data.ADJ), noun: U.pick(P.data.NOUN) }; B.refresh(); }), btn('🎲 Random name', () => { ch.name = C.randomName(); B.refresh(); })]));
        pane.appendChild(row('Custom tagline words', el('div', { class: 'inline' }, [text(ch.tag.adj, v => ch.tag.adj = v, 'adjective'), text(ch.tag.noun, v => ch.tag.noun = v, 'noun')]), 'Type your own if the 300+ options somehow aren\'t enough.'));
        pane.appendChild(row('Hometown', select(ch.hometown, P.data.HOMETOWN, v => ch.hometown = v)));
        pane.appendChild(row('Weight', select(ch.weight, P.data.WEIGHT, v => ch.weight = v)));
        pane.appendChild(row('Gender', select(ch.gender, P.data.GENDER, v => ch.gender = v)));
        pane.appendChild(row('Pronouns', select(ch.pronouns, P.data.PRONOUNS.map(p => [p.id, p.label]), v => ch.pronouns = v)));
        pane.appendChild(row('Persona (walk-on behaviour)', select(ch.persona, P.data.PERSONAS.map(p => [p.id, p.name]), v => ch.persona = v), P.data.persona(ch.persona).desc));
        pane.appendChild(row('Catchphrase (spoken on entrance)', el('div', {}, [text(ch.catchphrase, v => ch.catchphrase = v, 'Punchma balls!'), select('— pick one —', ['— pick one —'].concat(P.data.CATCHPHRASES), v => { if (v && v !== '— pick one —') ch.catchphrase = v; })])));
        pane.appendChild(row('Voice pitch', slider(ch.voice.pitch, 0.1, 2, v => ch.voice.pitch = v), 'Demon ⟵ ⟶ Chipmunk'));
        pane.appendChild(row('Voice speed', slider(ch.voice.rate, 0.5, 2, v => ch.voice.rate = v)));
        pane.appendChild(btn('🔊 Test voice', () => { P.voice.stop(); P.voice.say(ch.catchphrase || 'Punchma balls', { role: 'fighter', priority: 3, pitch: ch.voice.pitch, rate: ch.voice.rate }); }));
        break;
      }
      case 'song': {
        const songs = P.audio.songList();
        pane.appendChild(row('Walk-on song', select(ch.song.type === 'custom' ? 'custom' : ch.song.id, songs.map(s => [s.id, s.name]).concat([['custom', '🎵 Custom (uploaded / URL)']]), v => { if (v === 'custom') { ch.song.type = 'custom'; } else { ch.song.type = 'builtin'; ch.song.id = v; } })));
        pane.appendChild(el('div', { class: 'btnrow' }, [btn('▶ Preview song', () => { P.audio.init(); P.audio.playCharSong(ch); }), btn('⏹ Stop', () => P.audio.stopSong())]));
        pane.appendChild(el('hr'));
        pane.appendChild(el('p', { class: 'help', html: `<b>Your own song.</b> Upload any length of audio, then pick the best <b>${B.SNIP_MAX} seconds</b> with the waveform editor. Only the snippet is saved (in your browser, with this fighter).` }));
        pane.appendChild(row('Upload audio (mp3/ogg/wav/m4a)', el('input', { type: 'file', accept: 'audio/*', onchange: (e) => B.loadSong(e, 'song', B.SNIP_MAX) })));
        pane.appendChild(row('...or paste a direct audio URL', el('div', { class: 'inline' }, [el('input', { type: 'text', id: 'song-url', placeholder: 'https://example.com/song.mp3' }), btn('Fetch', () => { const u = document.getElementById('song-url').value.trim(); if (u) B.loadSongUrl(u); })]), 'The server must allow cross-origin audio (many do not). Uploading a file always works.'));
        pane.appendChild(B.snippetEditor(ch));
        pane.appendChild(el('hr'));
        pane.appendChild(btn('🎬 Preview the whole walk-on (song + announcer + behaviour)', () => B.playWalkOn(), 'primary'));
        break;
      }
      case 'png': {
        pane.appendChild(el('p', { class: 'help', html: 'Drop in your own art. Every PNG uses the <b>same universal spec</b>: a <b>512×512</b> transparent PNG where the <b>middle 256×256 square</b> (from 128,128 to 384,384) is stretched onto the body part. Anything outside that square is overhang (big hats, wide hair, capes) and is allowed to spill. See <code>assets/items/README.md</code> or download a template below.' }));
        for (const slot of ['hair', 'hat', 'shirt', 'pants', 'shoes', 'extra', 'eyes', 'mouth', 'nose', 'brows', 'beard']) {
          const cu = ch.custom[slot];
          const fileIn = el('input', { type: 'file', accept: 'image/png,image/webp', onchange: (e) => B.loadPng(e, slot, 'src') });
          const controls = el('div', { class: 'pngrow' }, [
            el('b', { text: P.SLOTS[slot].label }), fileIn,
            cu && cu.src ? el('img', { src: cu.src, class: 'pngprev' }) : null,
            slot === 'hair' ? el('label', { class: 'mini' }, ['back layer: ', el('input', { type: 'file', accept: 'image/png', onchange: (e) => B.loadPng(e, slot, 'back') })]) : null,
            slot === 'shirt' ? el('label', { class: 'mini' }, [el('input', { type: 'checkbox', checked: cu && cu.clip ? 'checked' : null, onchange: (e) => { ch.custom.shirt = ch.custom.shirt || {}; ch.custom.shirt.clip = e.target.checked; } }), ' clip to body shape']) : null,
            slot === 'extra' ? select(cu && cu.layer || 'hand', [['hand', 'held in hand'], ['back', 'behind body']], v => { ch.custom.extra = ch.custom.extra || {}; ch.custom.extra.layer = v; }) : null,
            cu && cu.src ? btn('✕ remove', () => { delete ch.custom[slot]; B.refresh(); }, 'small') : null,
            btn('template', () => B.downloadTemplate(slot), 'small'),
          ]);
          pane.appendChild(controls);
        }
        break;
      }
      case 'voice': B.voiceTab(ch, pane); break;
      case 'rig': { const box = el('div'); pane.appendChild(box); P.rig.editor(box, ch, () => { }); break; }
    }
    B.drawThumbs();
  };
  B.SNIP_MAX = 20; B.VO_MAX = 8;
  B.loadSong = (e, target, max) => { const f = e.target.files[0]; if (!f) return; f.arrayBuffer().then(ab => B.decodeSong(ab, target, max)).catch(() => alert('Could not decode that audio file.')); e.target.value = ''; };
  B.loadSongUrl = (u) => fetch(u).then(r => r.arrayBuffer()).then(ab => B.decodeSong(ab, 'song', B.SNIP_MAX)).catch(() => alert('Could not fetch that URL (the server probably blocks cross-origin audio). Download it and upload the file instead.'));
  B.decodeSong = async (ab, target = 'song', max = B.SNIP_MAX) => {
    const buf = await P.audio.decode(ab);
    B.snip = { buffer: buf, dur: buf.duration, start: 0, len: Math.min(max, buf.duration), max, target, saved: false }; B.refresh();
  };
  B.snippetEditor = (ch, target = 'song') => {
    const wrap = el('div', { class: 'wave' });
    const s = B.snip && B.snip.target === target ? B.snip : null;
    if (!s) { if (target === 'song' && ch.song.type === 'custom' && ch.song.custom) wrap.appendChild(el('div', { class: 'muted', html: `Current custom snippet: <b>${U.esc(ch.song.name || 'custom audio')}</b> (${ch.song.len ? ch.song.len.toFixed(1) + 's' : 'trimmed'}). Upload a file to pick a new snippet.` })); return wrap; }
    const MAX = s.max || B.SNIP_MAX;
    const cv = el('canvas', { width: 800, height: 140, class: 'wavecv' }); wrap.appendChild(cv);
    const info = el('div', { class: 'muted' }); wrap.appendChild(info);
    const ctx = cv.getContext('2d'); const W = cv.width, H = cv.height; const data = s.buffer.getChannelData(0);
    const peaks = []; const per = Math.max(1, Math.floor(data.length / W)); for (let x = 0; x < W; x++) { let mx = 0; const o = x * per; for (let i = 0; i < per; i += 4) { const v = Math.abs(data[o + i] || 0); if (v > mx) mx = v; } peaks.push(mx); }
    const px = (sec) => sec / s.dur * W, sec = (x) => x / W * s.dur;
    const draw = () => {
      ctx.fillStyle = '#222'; ctx.fillRect(0, 0, W, H);
      const x0 = px(s.start), x1 = px(s.start + s.len);
      ctx.fillStyle = '#3a7bd5'; ctx.fillRect(x0, 0, x1 - x0, H);
      for (let x = 0; x < W; x++) { const h = peaks[x] * (H - 10); ctx.fillStyle = x >= x0 && x <= x1 ? '#ffd23f' : '#777'; ctx.fillRect(x, H / 2 - h / 2, 1, Math.max(1, h)); }
      ctx.fillStyle = '#fff'; ctx.fillRect(x0 - 3, 0, 6, H); ctx.fillRect(x1 - 3, 0, 6, H);
      if (B.snipPlayhead != null) { ctx.fillStyle = '#5f5'; ctx.fillRect(px(B.snipPlayhead), 0, 2, H); }
      info.textContent = `Track: ${s.dur.toFixed(1)}s · Snippet: ${s.start.toFixed(1)}s → ${(s.start + s.len).toFixed(1)}s (${s.len.toFixed(1)}s, max ${MAX}s). Drag the window to move it, drag its edges to resize.`;
    };
    let drag = null;
    const pos = (e) => { const r = cv.getBoundingClientRect(); const t = e.touches ? e.touches[0] : e; return (t.clientX - r.left) * W / r.width; };
    const down = (e) => { const x = pos(e), x0 = px(s.start), x1 = px(s.start + s.len); if (Math.abs(x - x0) < 12) drag = { kind: 'l' }; else if (Math.abs(x - x1) < 12) drag = { kind: 'r' }; else if (x > x0 && x < x1) drag = { kind: 'm', off: sec(x) - s.start }; else { s.start = U.clamp(sec(x) - s.len / 2, 0, s.dur - s.len); drag = { kind: 'm', off: s.len / 2 }; } draw(); e.preventDefault(); };
    const move = (e) => { if (!drag) return; const t = sec(pos(e)); if (drag.kind === 'm') s.start = U.clamp(t - drag.off, 0, s.dur - s.len); else if (drag.kind === 'l') { const end = s.start + s.len; s.start = U.clamp(t, Math.max(0, end - MAX), end - 0.5); s.len = end - s.start; } else { s.len = U.clamp(t - s.start, 0.5, Math.min(MAX, s.dur - s.start)); } draw(); e.preventDefault(); };
    const up = () => { drag = null; };
    cv.addEventListener('mousedown', down); cv.addEventListener('mousemove', move); window.addEventListener('mouseup', up); cv.addEventListener('touchstart', down, { passive: false }); cv.addEventListener('touchmove', move, { passive: false }); cv.addEventListener('touchend', up);
    const play = () => { B.stopSnip(); const ac = P.audio.init(); const src = ac.createBufferSource(); src.buffer = s.buffer; const g = ac.createGain(); g.gain.value = P.audio.settings.music; src.connect(g); g.connect(ac.destination); src.start(0, s.start, s.len); const t0 = ac.currentTime; B.snipSrc = src; const tick = () => { if (B.snipSrc !== src) return; B.snipPlayhead = s.start + (ac.currentTime - t0); if (B.snipPlayhead > s.start + s.len) { B.snipPlayhead = null; B.snipSrc = null; } draw(); if (B.snipSrc) requestAnimationFrame(tick); }; tick(); src.onended = () => { if (B.snipSrc === src) { B.snipSrc = null; B.snipPlayhead = null; draw(); } }; };
    wrap.appendChild(el('div', { class: 'btnrow' }, [btn('▶ Play snippet', play), btn('⏹ Stop', B.stopSnip), btn(s.saved ? '✓ Saved' : (target === 'song' ? '💾 Use this snippet as walk-on song' : '💾 Save this voice line'), async () => {
      const url = await P.audio.snippetToWav(s.buffer, s.start, s.len);
      if (target === 'song') ch.song = { type: 'custom', id: ch.song.id, custom: url, name: 'your snippet', len: s.len };
      else { const ev = target.slice(3); ch.vo = ch.vo || {}; ch.vo[ev] = { url, name: 'your clip', len: s.len }; }
      s.saved = true; B.snip = null; B.refresh();
    }, 'primary')]));
    draw();
    return wrap;
  };
  B.stopSnip = () => { if (B.snipSrc) { try { B.snipSrc.stop(); } catch (e) { } B.snipSrc = null; B.snipPlayhead = null; } };
  // ---- recorded voice lines ----
  B.recording = null;
  B.record = async (ch, ev) => {
    if (B.recording) return B.stopRecord();
    if (!navigator.mediaDevices || !window.MediaRecorder) { alert('This browser cannot record audio. Upload a file instead.'); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream); const chunks = [];
      rec.ondataavailable = (e) => chunks.push(e.data);
      rec.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunks, { type: rec.mimeType || 'audio/webm' });
        const rd = new FileReader(); rd.onload = () => { ch.vo = ch.vo || {}; ch.vo[ev] = { url: rd.result, name: 'recording' }; B.recording = null; B.refresh(); }; rd.readAsDataURL(blob);
      };
      B.recording = { rec, ev }; rec.start(); B.refresh();
      setTimeout(() => { if (B.recording && B.recording.rec === rec && rec.state === 'recording') B.stopRecord(); }, B.VO_MAX * 1000);
    } catch (e) { alert('Could not use the microphone: ' + e.message); }
  };
  B.stopRecord = () => { if (B.recording && B.recording.rec.state === 'recording') B.recording.rec.stop(); };
  B.voiceTab = (ch, pane) => {
    pane.appendChild(el('p', { class: 'help', html: `Record or upload a clip for each moment. Clips are capped at <b>${B.VO_MAX} seconds</b> and stored with the fighter. The game spaces them out so nobody spams the same line: at most one clip every few seconds overall, and each fighter's own line has its own cooldown.` }));
    for (const [ev, label, when] of P.voice.EVENTS) {
      const cur = ch.vo && ch.vo[ev];
      const recording = B.recording && B.recording.ev === ev;
      pane.appendChild(el('div', { class: 'vorow' }, [
        el('div', { class: 'volabel' }, [el('b', { text: label }), el('small', { text: when })]),
        el('div', { class: 'btnrow' }, [
          el('button', { class: 'btn small' + (recording ? ' danger' : ''), text: recording ? '⏺ Recording... click to stop' : '🎤 Record', onclick: () => recording ? B.stopRecord() : B.record(ch, ev) }),
          el('label', { class: 'btn small' }, ['⬆ Upload', el('input', { type: 'file', accept: 'audio/*', hidden: 'hidden', onchange: (e) => B.loadSong(e, 'vo:' + ev, B.VO_MAX) })]),
          cur ? btn('▶', () => P.voice.playClip(cur.url), 'small') : null,
          cur ? btn('✕', () => { delete ch.vo[ev]; B.refresh(); }, 'small danger') : null,
          el('span', { class: 'muted', text: cur ? 'clip saved' + (cur.len ? ' (' + cur.len.toFixed(1) + 's)' : '') : 'no clip — the game falls back to text-to-speech' }),
        ]),
        B.snip && B.snip.target === 'vo:' + ev ? B.snippetEditor(ch, 'vo:' + ev) : null,
      ]));
    }
  };

  // ---- walk-on behaviour preview ----
  B.playWalkOn = () => {
    const ch = B.ch; B.stopWalkOn();
    P.audio.init(); P.audio.playCharSong(ch); P.voice.stop();
    const steps = P.rumble.entranceScript({ ch });
    B.walk = { steps, i: 0, t: 0 };
    P.voice.say(P.data.ANN.intro(ch, 1), { role: 'ann', priority: 3 })
      .then(() => { if (!B.walk) return; if (P.voice.vo(ch, 'entrance', { force: true })) return; return P.voice.say(ch.catchphrase, { role: 'fighter', priority: 3, pitch: ch.voice.pitch, rate: ch.voice.rate }); });
  };
  B.stopWalkOn = () => { B.walk = null; P.audio.stopSong(); P.voice.stop(); };
  B.walkStep = (dt) => {
    const w = B.walk; if (!w) return null;
    w.t += dt; const step = w.steps[w.i];
    if (!step) { B.walk = null; P.audio.stopSong(); return null; }
    const durOf = (st) => st.type === 'walk' ? 1.6 : st.type === 'anim' ? st.dur : st.type === 'fall' ? st.dur : 1.4;
    const dur = durOf(step);
    if (w.t >= dur) { w.i++; w.t = 0; return B.walkStep(0); }
    if (step.type === 'walk') return { anim: step.anim, opts: { speed: (step.speed || 1) * 2 } };
    if (step.type === 'anim') return { anim: step.anim, opts: {} };
    if (step.type === 'fall') return { anim: 'lying', opts: { dir: 1, expr: 'happy' } };
    const p = U.clamp(w.t / dur, 0, 1);
    const map = { jump: 'jump', dive: 'dive', climb: 'climb', trip: 'fly', shoved: 'fly', float: 'float', crawl: 'jump', teleport: 'cast' };
    return { anim: map[step.style] || 'jump', opts: { p, spin: 7 }, jump: -Math.sin(p * Math.PI) * 40 };
  };

  B.loadPng = (e, slot, key) => { const f = e.target.files[0]; if (!f) return; if (f.size > 1.5 * 1024 * 1024) { alert('Keep PNGs under 1.5MB; they live in your browser storage.'); return; } const rd = new FileReader(); rd.onload = () => { B.ch.custom[slot] = B.ch.custom[slot] || {}; B.ch.custom[slot][key] = rd.result; delete P.items.imgCache[rd.result]; B.refresh(); }; rd.readAsDataURL(f); };
  B.downloadTemplate = (slot) => {
    const cv = document.createElement('canvas'); cv.width = 512; cv.height = 512; const ctx = cv.getContext('2d'); const D = P.draw;
    ctx.fillStyle = '#ffffff00'; ctx.clearRect(0, 0, 512, 512);
    ctx.strokeStyle = '#f0f'; ctx.setLineDash([8, 8]); ctx.lineWidth = 3; ctx.strokeRect(128, 128, 256, 256); ctx.setLineDash([]);
    ctx.globalAlpha = 0.35; const part = P.SLOTS[slot].part;
    if (part === 'head') { P.shapes.head.round(ctx); D.fs(ctx, '#f2c9a0', 4); }
    else if (part === 'torso') { P.shapes.torso.average(ctx); D.fs(ctx, '#f2c9a0', 4); }
    else if (part === 'leg') { D.line(ctx, 256, 128, 256, 384, 120, '#f2c9a0'); D.text(ctx, 'HIP ▲', 256, 100, 22, '#f0f'); D.text(ctx, 'ANKLE ▼', 256, 410, 22, '#f0f'); }
    else if (part === 'foot') { D.text(ctx, 'HEEL', 150, 250, 22, '#f0f'); D.text(ctx, 'TOE ▶', 360, 250, 22, '#f0f'); D.text(ctx, 'SOLE ▼', 256, 400, 22, '#f0f'); }
    else if (part === 'hand') { D.circle(ctx, 256, 256, 30, '#f2c9a0', 4); D.text(ctx, 'grip point', 256, 300, 20, '#f0f'); }
    ctx.globalAlpha = 1; D.text(ctx, `${slot.toUpperCase()} TEMPLATE 512x512`, 256, 30, 24, '#f0f'); D.text(ctx, 'fit box = middle 256x256 (dashed)', 256, 490, 18, '#f0f');
    const a = document.createElement('a'); a.href = cv.toDataURL('image/png'); a.download = `punchma-${slot}-template.png`; a.click();
  };
  B.previewEntrance = () => {
    const ch = B.ch; P.audio.init(); P.audio.playCharSong(ch); B.previewAnim = 'walk';
    P.voice.stop(); P.voice.say(P.data.ANN.intro(ch, 1), { role: 'ann', priority: 3 }).then(() => P.voice.say(ch.catchphrase, { role: 'fighter', priority: 3, pitch: ch.voice.pitch, rate: ch.voice.rate })).then(() => { B.previewAnim = 'taunt'; setTimeout(() => { P.audio.stopSong(); B.previewAnim = 'idle'; }, 2500); });
  };
  B.save = () => {
    if (!B.ch.name.trim()) B.ch.name = C.randomName();
    P.app.upsert(B.ch); B.stopPreview(); B.stopSnip(); B.stopWalkOn(); P.audio.stopSong(); P.voice.stop(); P.app.show('roster');
  };
  B.cancel = () => { B.stopPreview(); B.stopSnip(); B.stopWalkOn(); B.stopWalkOn(); P.audio.stopSong(); P.voice.stop(); P.app.show('roster'); };
  B.randomize = () => { const keepName = B.ch.name; B.ch = C.random(); if (keepName) B.ch.name = keepName; B.refresh(); };
  B.setAnim = (a) => { B.previewAnim = a; };
})();
