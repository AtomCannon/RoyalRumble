// Sponsors: companies that pay (in exposure) to have their logo on the ring and a commercial before the show.
window.P = window.P || {};
(function () {
  const U = P.util, D = P.draw, el = U.el;
  const S = P.sponsors = { list: [] };

  S.SHAPES = [['badge', 'Badge'], ['circle', 'Circle'], ['shield', 'Shield'], ['star', 'Starburst'], ['block', 'Block'], ['ribbon', 'Ribbon']];
  S.SPOTS = [['mat', 'Ring mat (centre)'], ['apron', 'Ring apron (front skirt)'], ['turnbuckle', 'Turnbuckle pads'], ['banner', 'Ringside barrier banners'], ['screen', 'Big screen over the entrance']];
  S.blank = () => ({
    id: U.uid(), name: '', tagline: '', shape: 'badge', color: '#e63946', color2: '#ffd23f', text: '',
    logo: null, commercial: ['', '', ''], voice: 'ann', music: { type: 'builtin', id: 'jingle', custom: null, name: '', len: 0 },
    spots: { mat: true, apron: true, turnbuckle: false, banner: true, screen: true },
  });
  S.load = () => { S.list = (U.load('punchma.sponsors', null) || S.defaults()).map(s => U.merge(S.blank(), s)); };
  S.save = () => { if (!U.save('punchma.sponsors', S.list)) alert('Could not save sponsors: browser storage is full. Remove a logo or a jingle.'); };
  S.get = (id) => S.list.find(s => s.id === id);
  S.defaults = () => [
    { id: 'sp_gristle', name: "Gristle's Meat Barn", tagline: 'Meat. In a barn. What else do you want?', shape: 'badge', color: '#8b2c2c', color2: '#ffd23f', text: 'GMB',
      commercial: ['Are you tired of buying meat in a normal building?', "Come to Gristle's Meat Barn, where the meat is in a barn.", "Gristle's Meat Barn. We are legally required to say it is meat."],
      voice: 'ann', music: { type: 'builtin', id: 'western' }, spots: { mat: true, apron: true, turnbuckle: false, banner: true, screen: true } },
    { id: 'sp_toilet', name: 'Big Steve Plumbing', tagline: "We're already in your walls.", shape: 'shield', color: '#2a6fb5', color2: '#ffffff', text: 'BSP',
      commercial: ['Clog? Leak? Something moving in the pipes?', 'Big Steve Plumbing is already in your walls. We got here yesterday.', 'Big Steve Plumbing. Do not ask how we got in.'],
      voice: 'gary', music: { type: 'builtin', id: 'jingle' }, spots: { mat: false, apron: true, turnbuckle: true, banner: true, screen: true } },
    { id: 'sp_soup', name: 'Lukewarm Soup Co.', tagline: 'Soup. Room temperature. On purpose.', shape: 'circle', color: '#d98324', color2: '#443627', text: 'SOUP',
      commercial: ['Hot soup burns. Cold soup is a salad.', 'Lukewarm Soup Company serves soup at exactly the temperature of a hand.', 'Lukewarm Soup. You will feel nothing.'],
      voice: 'tonya', music: { type: 'builtin', id: 'elevator' }, spots: { mat: true, apron: false, turnbuckle: true, banner: true, screen: true } },
  ].map(s => U.merge(S.blank(), s));

  // ---- logo drawing (512x512 item space, same universal spec as everything else) ----
  S.drawLogo = (ctx, sp) => {
    if (sp.logo) { if (D.png(ctx, sp.logo)) return; }
    const c1 = sp.color, c2 = sp.color2, txt = (sp.text || sp.name || '?').slice(0, 10).toUpperCase();
    const fit = (t) => t.length <= 3 ? 150 : t.length <= 5 ? 100 : t.length <= 7 ? 74 : 56;
    switch (sp.shape) {
      case 'circle': D.circle(ctx, 256, 256, 190, c1); D.circle(ctx, 256, 256, 150, null, 10); break;
      case 'shield': D.poly(ctx, [[100, 80], [412, 80], [412, 280], [256, 440], [100, 280]], c1); break;
      case 'star': D.star(ctx, 256, 256, 210, 105, 9, c1); break;
      case 'block': D.rect(ctx, 70, 130, 372, 252, c1); break;
      case 'ribbon': D.poly(ctx, [[40, 170], [472, 150], [472, 360], [40, 340]], c1); D.poly(ctx, [[40, 170], [80, 256], [40, 340]], P.util.shade(c1, -0.4), 0); break;
      default: D.rr(ctx, 60, 140, 392, 232, 40, c1); D.rr(ctx, 90, 170, 332, 172, 24, null, 8);
    }
    D.text(ctx, txt, 256, 256, fit(txt), c2);
  };
  S.logoCanvas = (sp, size = 256) => {
    const cv = document.createElement('canvas'); cv.width = cv.height = size; const ctx = cv.getContext('2d');
    ctx.save(); ctx.scale(size / 512, size / 512); S.drawLogo(ctx, sp); ctx.restore(); return cv;
  };
  S.cache = {};
  S.logoImage = (sp) => { // cached bitmap so the mat logo can be warped row by row
    if (!sp) return null;
    const key = sp.id + '|' + sp.shape + sp.color + sp.color2 + sp.text + sp.name + (sp.logo ? sp.logo.length : 0);
    if (S.cache[key]) return S.cache[key];
    if (sp.logo && !P.items.img(sp.logo)) return null; // uploaded logo still decoding
    const cv = S.logoCanvas(sp, 512); S.cache[key] = cv;
    const keys = Object.keys(S.cache); if (keys.length > 20) delete S.cache[keys[0]];
    return cv;
  };

  // Draw an image into an arbitrary trapezoid (back edge and front edge are horizontal), row by row so the
  // perspective of the ring mat is preserved. quad = { bx0,bx1,by, fx0,fx1,fy }.
  S.drawTrapezoid = (ctx, img, q, alpha = 1) => {
    if (!img) return;
    const rows = 48, h = q.fy - q.by, sh = img.height / rows;
    ctx.save(); ctx.globalAlpha = alpha;
    for (let i = 0; i < rows; i++) {
      const t0 = i / rows, t1 = (i + 1) / rows;
      const y0 = q.by + h * t0, y1 = q.by + h * t1;
      const x0 = U.lerp(q.bx0, q.fx0, t0), x1 = U.lerp(q.bx1, q.fx1, t0);
      const x0b = U.lerp(q.bx0, q.fx0, t1), x1b = U.lerp(q.bx1, q.fx1, t1);
      const left = Math.min(x0, x0b), right = Math.max(x1, x1b);
      ctx.drawImage(img, 0, i * sh, img.width, sh + 1, left, y0, right - left, (y1 - y0) + 1);
    }
    ctx.restore();
  };

  // ---- editor screen ----
  S.editing = null;
  S.openList = () => { P.app.show('sponsors'); S.renderList(); };
  S.renderList = () => {
    const grid = document.getElementById('sponsor-grid'); if (!grid) return; grid.innerHTML = '';
    if (!S.list.length) grid.appendChild(el('div', { class: 'empty', text: 'No sponsors. Somebody has to pay for this.' }));
    for (const sp of S.list) {
      const cv = S.logoCanvas(sp, 160); cv.className = 'logoprev';
      grid.appendChild(el('div', { class: 'card' }, [cv,
        el('div', { class: 'cname', text: sp.name || 'Unnamed sponsor' }),
        el('div', { class: 'ctag', text: sp.tagline || '' }),
        el('div', { class: 'cmeta', text: Object.keys(sp.spots).filter(k => sp.spots[k]).join(', ') || 'not placed anywhere' }),
        el('div', { class: 'btnrow' }, [
          el('button', { class: 'btn small', text: 'Edit', onclick: () => S.openEditor(sp) }),
          el('button', { class: 'btn small', text: 'Clone', onclick: () => { const d = U.deep(sp); d.id = U.uid(); d.name = sp.name + ' 2'; S.list.push(d); S.save(); S.renderList(); } }),
          el('button', { class: 'btn small danger', text: '✕', onclick: () => { if (confirm('Delete ' + sp.name + '?')) { S.list = S.list.filter(x => x !== sp); S.save(); S.renderList(); P.app.renderRoster(); } } }),
        ])]));
    }
  };
  S.openEditor = (sp) => { S.editing = sp ? U.deep(sp) : S.blank(); S.newOne = !sp; P.app.show('sponsor-edit'); S.renderEditor(); };
  S.drawPreview = () => {
    const sp = S.editing, prev = document.getElementById('sponsor-preview'); if (!sp || !prev) return;
    const ctx = prev.getContext('2d');
    ctx.clearRect(0, 0, prev.width, prev.height); ctx.save(); ctx.scale(prev.width / 512, prev.height / 512); S.drawLogo(ctx, sp); ctx.restore();
  };
  S.renderEditor = () => {
    const sp = S.editing, box = document.getElementById('sponsor-form'); box.innerHTML = '';
    S.drawPreview();
    const row = (l, input, hint) => el('label', { class: 'ctl' }, [el('span', { class: 'ctl-l', text: l }), input, hint ? el('small', { text: hint }) : null]);
    // Typing only updates the model and repaints the logo. Rebuilding the form here would steal focus after
    // every keystroke, which is what made these boxes feel sticky.
    const txt = (v, on, ph) => el('input', { type: 'text', value: v || '', placeholder: ph || '', oninput: (e) => { on(e.target.value); S.drawPreview(); } });
    const sel = (v, opts, on) => { const e = el('select', { onchange: (ev) => { on(ev.target.value); S.renderEditor(); } }); for (const [a, b] of opts) e.appendChild(el('option', { value: a, text: b, selected: a === v ? 'selected' : null })); return e; };
    box.appendChild(row('Company name', txt(sp.name, v => sp.name = v, "Gristle's Meat Barn")));
    box.appendChild(row('Tagline', txt(sp.tagline, v => sp.tagline = v, 'Meat. In a barn.')));
    box.appendChild(row('Logo shape', sel(sp.shape, S.SHAPES, v => sp.shape = v)));
    box.appendChild(row('Logo text', txt(sp.text, v => sp.text = v, 'GMB'), 'Short is better. Three letters looks the best.'));
    box.appendChild(row('Logo colours', el('div', { class: 'inline' }, [el('input', { type: 'color', value: sp.color, oninput: (e) => { sp.color = e.target.value; S.drawPreview(); } }), el('input', { type: 'color', value: sp.color2, oninput: (e) => { sp.color2 = e.target.value; S.drawPreview(); } })])));
    box.appendChild(row('...or upload a logo PNG (square, transparent)', el('div', { class: 'inline' }, [
      el('input', { type: 'file', accept: 'image/png,image/webp,image/jpeg', onchange: (e) => { const f = e.target.files[0]; if (!f) return; if (f.size > 1.5 * 1024 * 1024) { alert('Keep logos under 1.5MB.'); return; } const rd = new FileReader(); rd.onload = () => { sp.logo = rd.result; P.items.img(rd.result); setTimeout(S.renderEditor, 120); }; rd.readAsDataURL(f); e.target.value = ''; } }),
      sp.logo ? el('button', { class: 'btn small danger', text: '✕ use the drawn logo instead', onclick: () => { sp.logo = null; S.renderEditor(); } }) : null,
    ])));
    box.appendChild(el('h3', { text: 'Where the logo appears' }));
    box.appendChild(el('div', { class: 'inline' }, S.SPOTS.map(([k, l]) => el('label', { class: 'mini' }, [el('input', { type: 'checkbox', checked: sp.spots[k] ? 'checked' : null, onchange: (e) => sp.spots[k] = e.target.checked }), ' ' + l]))));
    box.appendChild(el('h3', { text: 'Commercial' }));
    box.appendChild(el('p', { class: 'help', text: 'Three lines, read out before the fight while the logo is on screen. Leave lines blank to make it shorter.' }));
    for (let i = 0; i < 3; i++) box.appendChild(row('Line ' + (i + 1), txt(sp.commercial[i], v => sp.commercial[i] = v, i === 0 ? 'Are you tired of buying meat in a normal building?' : '')));
    box.appendChild(row('Read by', sel(sp.voice, [['ann', 'The ring announcer'], ['gary', 'Gary Gristle'], ['tonya', 'Tonya Thunderfist']], v => sp.voice = v)));
    const songs = P.audio.songList();
    box.appendChild(row('Jingle', sel(sp.music.type === 'custom' ? 'custom' : sp.music.id, songs.map(x => [x.id, x.name]).concat([['custom', '🎵 Custom (uploaded clip)']]), v => { if (v === 'custom') sp.music.type = 'custom'; else { sp.music.type = 'builtin'; sp.music.id = v; } })));
    box.appendChild(el('div', { class: 'btnrow' }, [
      el('button', { class: 'btn small', text: '▶ Preview jingle', onclick: () => { P.audio.init(); if (sp.music.type === 'custom' && sp.music.custom) P.audio.playUrl(sp.music.custom); else P.audio.playSong(sp.music.id); } }),
      el('button', { class: 'btn small', text: '⏹ Stop', onclick: () => P.audio.stopSong() }),
      el('label', { class: 'btn small' }, ['⬆ Upload jingle', el('input', { type: 'file', accept: 'audio/*', hidden: 'hidden', onchange: (e) => { const f = e.target.files[0]; if (!f) return; f.arrayBuffer().then(async (ab) => { const buf = await P.audio.decode(ab); const len = Math.min(12, buf.duration); sp.music = { type: 'custom', id: sp.music.id, custom: await P.audio.snippetToWav(buf, 0, len), name: f.name, len }; S.renderEditor(); }).catch(() => alert('Could not decode that audio.')); e.target.value = ''; } })]),
      sp.music.type === 'custom' && sp.music.custom ? el('span', { class: 'muted', text: 'Using the first ' + (sp.music.len || 12).toFixed(0) + 's of ' + (sp.music.name || 'your clip') }) : null,
    ]));
    box.appendChild(el('div', { class: 'btnrow' }, [
      el('button', { class: 'btn primary', text: '💾 Save sponsor', onclick: () => { if (!sp.name.trim()) sp.name = 'Unnamed Sponsor'; const i = S.list.findIndex(x => x.id === sp.id); if (i >= 0) S.list[i] = sp; else S.list.push(sp); S.save(); S.cache = {}; S.openList(); P.app.renderRoster(); } }),
      el('button', { class: 'btn', text: '🎬 Preview the commercial', onclick: () => S.previewCommercial(sp) }),
      el('button', { class: 'btn', text: 'Cancel', onclick: () => { P.audio.stopSong(); P.voice.stop(); S.openList(); } }),
    ]));
  };
  S.previewCommercial = (sp) => {
    P.audio.init(); P.voice.stop();
    if (sp.music.type === 'custom' && sp.music.custom) P.audio.playUrl(sp.music.custom); else P.audio.playSong(sp.music.id);
    const lines = sp.commercial.filter(l => l && l.trim());
    const all = lines.concat(sp.tagline ? [sp.tagline] : []);
    P.voice.exchange(all.map(l => [sp.voice, l]), { priority: 3 }).then(() => P.audio.stopSong());
  };
  S.export = () => S.list;
  S.import = (arr) => { let n = 0; for (const raw of arr || []) { const sp = U.merge(S.blank(), raw); if (S.list.some(x => x.id === sp.id)) sp.id = U.uid(); S.list.push(sp); n++; } S.save(); S.cache = {}; return n; };
})();
