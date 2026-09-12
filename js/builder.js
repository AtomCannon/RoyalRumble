// Character builder UI. Left: live animated preview. Right: tabs of controls. Everything writes into B.ch and re-renders.
window.P = window.P || {};
(function () {
  const U = P.util, el = U.el, C = P.char;
  const B = P.builder = { ch: null, tab: 'body', previewAnim: 'idle', raf: null, walkT: 0 };

  B.open = (ch) => {
    B.ch = C.normalize(ch ? U.deep(ch) : C.random()); B.origId = ch ? ch.id : null;
    P.app.show('builder'); B.renderControls(); B.startPreview();
  };
  B.startPreview = () => {
    cancelAnimationFrame(B.raf); const cv = document.getElementById('preview'); let t0 = performance.now();
    const loop = (now) => { const t = (now - t0) / 1000; const pose = P.render.pose(Object.assign({ t }, P.render.anim(B.previewAnim, t, { p: (Math.sin(t * 6) + 1) / 2, speed: 2 }))); if (B.previewAnim === 'walk') pose.facing = 1; P.render.portrait(cv, B.ch, pose, { bg: '#7fc8f8' }); B.raf = requestAnimationFrame(loop); };
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

  const TABS = [['body', 'Body'], ['head', 'Head & Face'], ['hair', 'Hair & Hat'], ['clothes', 'Clothes'], ['stuff', 'Stuff'], ['identity', 'Identity'], ['song', 'Walk-On'], ['png', 'Custom PNGs']];

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
      case 'head':
        pane.appendChild(row('Head shape', select(b.headShape, C.HEAD_SHAPES, v => b.headShape = v)));
        pane.appendChild(row('Eyes', itemPicker('eyes', ch.face.eyes, v => ch.face.eyes = v)));
        pane.appendChild(row('Eyebrows', itemPicker('brows', ch.face.brows, v => ch.face.brows = v)));
        pane.appendChild(row('Nose', itemPicker('nose', ch.face.nose, v => ch.face.nose = v)));
        pane.appendChild(row('Mouth', itemPicker('mouth', ch.face.mouth, v => ch.face.mouth = v)));
        pane.appendChild(row('Facial hair', itemPicker('beard', ch.face.beard, v => ch.face.beard = v)));
        pane.appendChild(row('Facial hair color', el('div', {}, [swatches(C.HAIR_COLORS, v => ch.face.facialHairColor = v), color(ch.face.facialHairColor, v => ch.face.facialHairColor = v)])));
        break;
      case 'hair':
        pane.appendChild(row('Hair', itemPicker('hair', ch.hair.style, v => ch.hair.style = v)));
        pane.appendChild(row('Hair color', el('div', {}, [swatches(C.HAIR_COLORS, v => ch.hair.color = v), color(ch.hair.color, v => ch.hair.color = v)])));
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
        pane.appendChild(btn('🔊 Test voice', () => { P.audio.say(ch.catchphrase || 'Punchma balls', { pitch: ch.voice.pitch, rate: ch.voice.rate }); }));
        break;
      }
      case 'song': {
        const songs = P.audio.songList();
        pane.appendChild(row('Walk-on song', select(ch.song.type === 'custom' ? 'custom' : ch.song.id, songs.map(s => [s.id, s.name]).concat([['custom', '🎵 Custom (uploaded / URL)']]), v => { if (v === 'custom') { ch.song.type = 'custom'; } else { ch.song.type = 'builtin'; ch.song.id = v; } })));
        pane.appendChild(el('div', { class: 'btnrow' }, [btn('▶ Preview song', () => { P.audio.init(); P.audio.playCharSong(ch); }), btn('⏹ Stop', () => P.audio.stopSong())]));
        const file = el('input', { type: 'file', accept: 'audio/*', onchange: (e) => { const f = e.target.files[0]; if (!f) return; if (f.size > 4 * 1024 * 1024) { alert('Keep songs under 4MB (they are stored in your browser). Trim it to the good 20 seconds.'); return; } const rd = new FileReader(); rd.onload = () => { ch.song = { type: 'custom', id: ch.song.id, custom: rd.result, name: f.name }; B.refresh(); }; rd.readAsDataURL(f); } });
        pane.appendChild(row('Upload your own (mp3/ogg/wav, <4MB)', file, ch.song.custom && ch.song.type === 'custom' ? `Loaded: ${ch.song.name || 'custom audio'}` : 'Stored in your browser only.'));
        pane.appendChild(row('...or paste a direct audio URL', text(ch.song.custom && ch.song.custom.startsWith('http') ? ch.song.custom : '', v => { if (v) ch.song = { type: 'custom', id: ch.song.id, custom: v, name: v.split('/').pop() }; }, 'https://example.com/song.mp3')));
        pane.appendChild(el('hr'));
        pane.appendChild(btn('🎤 Preview full walk-on (song + announcer)', () => B.previewEntrance(), 'primary'));
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
    }
    B.drawThumbs();
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
    P.audio.say(P.char.introSpeech(ch, 1), { pitch: 0.6, rate: 1.05 }).then(() => P.audio.say(ch.catchphrase, { pitch: ch.voice.pitch, rate: ch.voice.rate, interrupt: false })).then(() => { B.previewAnim = 'taunt'; setTimeout(() => { P.audio.stopSong(); B.previewAnim = 'idle'; }, 2500); });
  };
  B.save = () => {
    if (!B.ch.name.trim()) B.ch.name = C.randomName();
    P.app.upsert(B.ch); B.stopPreview(); P.audio.stopSong(); P.audio.shutUp(); P.app.show('roster');
  };
  B.cancel = () => { B.stopPreview(); P.audio.stopSong(); P.audio.shutUp(); P.app.show('roster'); };
  B.randomize = () => { const keepName = B.ch.name; B.ch = C.random(); if (keepName) B.ch.name = keepName; B.refresh(); };
  B.setAnim = (a) => { B.previewAnim = a; };
})();
