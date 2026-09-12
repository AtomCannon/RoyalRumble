// The Rumble: a wide arena with a camera, ceremonial entrances (fight pauses), roaming fighters that pick fights and
// wander off, lucky events, over-the-top-rope eliminations, and an optional pre-written script (see script.js).
window.P = window.P || {};
(function () {
  const U = P.util, R = P.render, D = P.draw, A = P.audio, V = P.voice;
  const W = 1280, H = 720; // viewport
  const RING = { bl: [420, 400], br: [1420, 400], fl: [300, 660], fr: [1540, 660], post: 185, ropes: [52, 104, 156] };
  const SPAWN_X = -520, ENTRY_X = 230, INSIDE_X = 470, ENTRY_Z = 0.5;
  const Rm = P.rumble = { running: false, fighters: [], queue: [], t: 0, speed: 1, paused: false, popups: [], particles: [], settings: {}, crowd: [], onEnd: null, cam: { x: 920, y: 430, zoom: 0.8 } };

  const ringX = (z) => ({ left: U.lerp(RING.bl[0], RING.fl[0], z) + 50, right: U.lerp(RING.br[0], RING.fr[0], z) - 50 });
  const footY = (z) => U.lerp(RING.bl[1], RING.fl[1], z);
  const zScale = (z) => U.lerp(0.6, 0.8, U.clamp(z, 0, 1.3));
  const ex = (key, a, d, extra, o) => { // speak a random exchange for an event
    const pool = P.data.EX[key]; if (!pool || !pool.length) return Promise.resolve();
    const vars = Object.assign({}, a ? P.char.vars(a.ch || a, 'a') : {}, d ? P.char.vars(d.ch || d, 'd') : {}, extra || {});
    if (d) vars.dbe = P.char.pron(d.ch || d).be;
    return V.exchange(U.pick(pool).map(([who, t]) => [who, U.fmt(t, vars)]), o);
  };

  // ---------------- sponsor signage ----------------
  const matSlot = (i, n) => { // i-th of n logos laid on the mat, in ring parameter space
    const pad = 0.06, wEach = (1 - pad * (n + 1)) / n, u0 = pad + i * (wEach + pad), u1 = u0 + wEach;
    const t0 = 0.3, t1 = 0.82;
    const edge = (t) => [U.lerp(RING.bl[0], RING.fl[0], t), U.lerp(RING.br[0], RING.fr[0], t)];
    const [l0, r0] = edge(t0), [l1, r1] = edge(t1);
    return { bx0: U.lerp(l0, r0, u0), bx1: U.lerp(l0, r0, u1), by: U.lerp(RING.bl[1], RING.fl[1], t0), fx0: U.lerp(l1, r1, u0), fx1: U.lerp(l1, r1, u1), fy: U.lerp(RING.bl[1], RING.fl[1], t1) };
  };
  Rm.drawSignage = (ctx) => {
    const sp = Rm.sponsors || []; if (!sp.length) return;
    const mat = sp.filter(s => s.spots.mat), apron = sp.filter(s => s.spots.apron), tb = sp.filter(s => s.spots.turnbuckle), ban = sp.filter(s => s.spots.banner), scr = sp.filter(s => s.spots.screen);
    mat.slice(0, 3).forEach((s, i) => { const img = P.sponsors.logoImage(s); if (img) P.sponsors.drawTrapezoid(ctx, img, matSlot(i, Math.min(3, mat.length)), 0.55); });
    apron.slice(0, 3).forEach((s, i) => {
      const img = P.sponsors.logoImage(s); if (!img) return;
      const n = Math.min(3, apron.length), w = (RING.fr[0] - RING.fl[0]) / n, x = RING.fl[0] + i * w;
      ctx.save(); ctx.globalAlpha = 0.95; ctx.drawImage(img, x + w * 0.06, 676, w * 0.88, 46); ctx.restore();
      D.text(ctx, (s.name || '').toUpperCase().slice(0, 22), x + w / 2, 664, 15, '#ffd23f');
    });
    if (tb.length) { const img = P.sponsors.logoImage(tb[0]); if (img) for (const [px, py] of [RING.bl, RING.br, RING.fl, RING.fr]) { D.rr(ctx, px - 17, py - RING.post - 6, 34, 44, 6, '#fff', 3); ctx.drawImage(img, px - 15, py - RING.post - 4, 30, 40); } }
    ban.forEach((s, i) => {
      const img = P.sponsors.logoImage(s); if (!img) return;
      const n = ban.length, span = 2400 / n, x = -560 + i * span;
      D.rect(ctx, x, 306, span - 16, 66, '#101828', 3);
      ctx.drawImage(img, x + 10, 310, 58, 58);
      D.text(ctx, (s.name || '').toUpperCase().slice(0, 26), x + span / 2 + 16, 342, 26, s.color2 || '#ffd23f');
    });
    if (scr.length) { const s = scr[Math.abs(Math.floor((Rm.t || 0) / 7)) % scr.length], img = P.sponsors.logoImage(s); D.rect(ctx, -620, 112, 360, 132, '#05070f', 5); if (img) ctx.drawImage(img, -600, 118, 118, 118); if (s) { D.text(ctx, (s.name || '').toUpperCase().slice(0, 16), -350, 160, 22, '#ffd23f'); D.text(ctx, (s.tagline || '').slice(0, 26), -350, 196, 14, '#fff', 'Georgia, serif'); } }
  };

  // ---------------- pre-show ----------------
  Rm.buildPreshow = () => {
    const st = [];
    st.push({ kind: 'title', dur: 7 });
    if (Rm.settings.commercials !== false) for (const sp of Rm.sponsors) { const lines = (sp.commercial || []).filter(l => l && l.trim()); if (lines.length || sp.tagline) st.push({ kind: 'ad', sp, dur: 5 + lines.length * 3.5 }); }
    if (Rm.sponsors.length) st.push({ kind: 'board', dur: 5 });
    st.push({ kind: 'spell', dur: 9 });
    return st;
  };
  Rm.preStep = (step) => {
    const V = P.voice;
    if (step.kind === 'title') {
      A.sfx('crash'); burst(920, 260, '#ffd23f', 40);
      V.say('Ladies and gentlemen... boys and girls... people watching this at work...', { role: 'ann', priority: 3 });
      V.say('Welcome... to Punchma!', { role: 'ann', priority: 3 });
      ex('welcome', null, null, { n: Rm.total }, { priority: 2, maxAge: 25 });
    } else if (step.kind === 'ad') {
      const sp = step.sp;
      if (sp.music && sp.music.type === 'custom' && sp.music.custom) A.playUrl(sp.music.custom); else A.playSong((sp.music && sp.music.id) || 'jingle');
      V.say('Tonight\'s Punchma is brought to you by ' + sp.name + '.', { role: 'ann', priority: 3 });
      const lines = (sp.commercial || []).filter(l => l && l.trim()).concat(sp.tagline ? [sp.tagline] : []);
      V.exchange(lines.map(l => [sp.voice || 'ann', l]), { priority: 3 });
    } else if (step.kind === 'board') {
      A.stopSong();
      V.say('Tonight\'s show is sponsored by ' + Rm.sponsors.map(s => s.name).join(', ') + '.', { role: 'ann', priority: 3 });
      V.exchange([['gary', 'They paid for this, Tonya.'], ['tonya', 'Nobody paid for this, Gary.']], { priority: 2, maxAge: 12 });
    } else if (step.kind === 'spell') {
      A.stopSong(); A.sfx('bell');
      V.say('It is time. You know what time it is. It is time for...', { role: 'ann', priority: 3 });
      V.say(V.SPELL, { role: 'ann', priority: 3, rate: 0.78 });
      V.say('Punchma!', { role: 'ann', priority: 3 });
      V.exchange([['gary', 'He spells it every single time.'], ['tonya', 'It is in his contract, Gary.']], { priority: 2, maxAge: 14 });
    }
  };
  Rm.skipPreshow = () => { if (!Rm.pre) return; Rm.pre = null; P.voice.stop(); A.stopSong(); A.sfx('bell'); Rm.nextEntry = 1.5; };

  Rm.start = (chars, settings, script) => {
    Rm.settings = Object.assign({ interval: 20, chaos: 1, speed: 1, hp: 100, commercials: true, preshow: true, sponsors: [] }, settings || {});
    Rm.sponsors = (Rm.settings.sponsors || []).map(id => P.sponsors.get(id)).filter(Boolean);
    Rm.fighters = []; Rm.popups = []; Rm.particles = []; Rm.t = 0; Rm.speed = Rm.settings.speed; Rm.paused = false; Rm.winner = null; Rm.ended = false;
    Rm.script = script ? P.script.prepare(script, chars) : null;
    const order = Rm.script && Rm.script.order.length ? Rm.script.order : U.shuffle(chars.slice());
    Rm.queue = order.map((ch, i) => ({ ch, n: i + 1 }));
    Rm.total = Rm.queue.length; Rm.entered = 0; Rm.elims = {};
    Rm.nextEntry = 3.5; Rm.luckyT = (10 + U.rand(4, 10)) / Rm.settings.chaos; Rm.chatterT = 12; Rm.globals = {}; Rm.hold = false; Rm.dim = 0; Rm.view = 'ring'; Rm.card = null;
    Rm.cam = { x: 920, y: 430, zoom: 0.8 };
    Rm.crowd = []; for (let r = 0; r < 5; r++) for (let i = 0; i < 62; i++) Rm.crowd.push({ x: i * 54 + (r % 2) * 27 - 700, y: 120 + r * 44, c: U.randColor(), hc: U.pick(P.char.HAIR_COLORS), ph: U.rand(6.28), s: U.rand(0.8, 1.2) });
    Rm.canvas = document.getElementById('ring'); Rm.ctx = Rm.canvas.getContext('2d');
    A.init(); V.stop(); V.voReset(); P.sponsors.cache = {};
    Rm.pre = Rm.settings.preshow === false ? null : { steps: Rm.buildPreshow(), i: -1, t: 0, letters: 0 };
    if (!Rm.pre) { A.sfx('bell'); V.say(P.data.ANN.welcome(Rm.total), { role: 'ann', priority: 3 }); ex('welcome', null, null, { n: Rm.total }, { priority: 2, maxAge: 30 }); }
    if (Rm.script && Rm.script.title) V.say(`Tonight: ${Rm.script.title}.`, { role: 'ann', priority: 3 });
    Rm.running = true; Rm.last = performance.now(); Rm.frameCount = 0;
    requestAnimationFrame(Rm.frame);
    Rm.updateHud();
  };
  Rm.stop = () => { Rm.running = false; A.stopSong(); V.stop(); };

  // ---------------- entrance scripts (persona antics on the ramp) ----------------
  const walk = (to, anim, speed, extra) => Object.assign({ type: 'walk', to, anim: anim || 'walk', speed: speed || 1 }, extra || {});
  const anim = (a, dur, sfx) => ({ type: 'anim', anim: a, dur, sfx });
  const enter = (style) => ({ type: 'enter', style });
  const fall = (dur) => ({ type: 'fall', dur });
  Rm.entranceScript = Rm.entranceScript || null;
  Rm.entranceScript = (f) => {
    const stand = anim('idle', 1.8); // soak in the moment at the top of the ramp
    switch (f.ch.persona) {
      case 'showboat': return [stand, walk(-300), anim('flex', 1.6), walk(-40), anim('taunt', 1.4), walk(ENTRY_X), anim('flex', 1.0), enter('jump')];
      case 'coward': return [anim('cower', 1.5), walk(-250, 'walk', 0.8), anim('cower', 1.2), walk(-380, 'walk', 0.9, { back: true }), anim('cower', 1.0), walk(ENTRY_X, 'walk', 0.9), anim('cower', 1.2), enter('shoved')];
      case 'maniac': return [anim('yell', 1.2), walk(ENTRY_X, 'run', 2.4), enter('dive')];
      case 'dad': return [stand, walk(-320, 'walk', 0.6), anim('wave', 1.6), walk(-60, 'walk', 0.6), anim('wave', 1.2), walk(ENTRY_X, 'walk', 0.6), anim('idle', 1.2), enter('climb')];
      case 'drunk': return [anim('wobble', 1.2), walk(-260, 'wobble', 0.8, { zig: true }), fall(1.4), walk(ENTRY_X, 'wobble', 0.9, { zig: true }), enter('trip')];
      case 'diva': return [stand, walk(-300, 'walk', 0.7), anim('wave', 1.6, 'ding'), walk(-40, 'walk', 0.7), anim('taunt', 1.0), walk(ENTRY_X, 'walk', 0.7), anim('idle', 1.0), enter('climb')];
      case 'oldman': return [anim('shuffle', 1.0), walk(ENTRY_X, 'shuffle', 0.4), anim('yell', 1.4), enter('climb')];
      case 'zoomer': return [anim('film', 1.5), walk(-300), anim('dance', 2.4), walk(-40, 'walk', 1.1), anim('film', 1.2), walk(ENTRY_X, 'walk', 1.2), enter('jump')];
      case 'ghost': return [anim('float', 1.5), walk(ENTRY_X, 'float', 0.7, { alpha: 0.75 }), anim('float', 1.0), enter('float')];
      case 'salesman': return [stand, walk(-320), anim('handshake', 1.4), walk(-80), anim('handshake', 1.4), walk(ENTRY_X), enter('climb')];
      case 'baby': return [anim('cower', 1.2, 'boo'), walk(ENTRY_X, 'crawl', 0.55), anim('cower', 1.4, 'boo'), enter('crawl')];
      case 'robot': return [anim('robot', 1.0), walk(-200, 'robot', 0.9), anim('stunned', 1.4, 'glitch'), walk(ENTRY_X, 'robot', 0.9), enter('jump')];
      case 'wizard': return [anim('cast', 1.4, 'magic'), walk(-200), anim('cast', 1.6, 'magic'), walk(ENTRY_X), enter('teleport')];
      case 'cop': return [anim('segway', 1.0), walk(ENTRY_X, 'segway', 1.5), anim('yell', 1.2), enter('climb')];
      case 'chef': return [anim('yell', 1.4), walk(ENTRY_X, 'walk', 1.5), anim('yell', 1.2), enter('jump')];
    }
    return [stand, walk(ENTRY_X), enter('jump')];
  };

  // ---------------- spawning & ceremony ----------------
  Rm.spawn = (forceCh) => {
    if (Rm.hold || Rm.ended) return;
    let idx = 0; if (forceCh) { idx = Rm.queue.findIndex(q => q.ch === forceCh); if (idx < 0) return; }
    const q = Rm.queue.splice(idx, 1)[0]; if (!q) return;
    const f = { ch: q.ch, n: Rm.entered + 1, x: SPAWN_X, z: ENTRY_Z, hp: Rm.settings.hp, maxHp: Rm.settings.hp, state: 'entering', st: 0, facing: 1, target: null, cool: U.rand(1, 2), buffs: {}, elims: 0, vx: 0, alpha: 1, animName: 'walk', animT: 0, animOpts: {}, mode: 'roam', modeT: U.rand(2, 5), wander: null, pause: 0, lying: 0, jump: 0 };
    f.script = Rm.entranceScript(f); f.si = 0; f.stepT = 0;
    Rm.fighters.push(f); Rm.entered++;
    // ceremony: lights down, camera to the entrance, everyone in the ring stops and watches
    Rm.hold = true; Rm.view = 'entrance'; Rm.entrant = f; Rm.card = { f, t: 0 }; Rm.ceremonyT = 0;
    f.introDone = false; f.walkDone = false;
    A.sfx('buzzer'); setTimeout(() => { if (Rm.running && Rm.entrant === f) A.playCharSong(f.ch); }, 700);
    V.say(Rm.script && Rm.script.intros[f.ch.id] ? Rm.script.intros[f.ch.id] : P.data.ANN.intro(f.ch, f.n), { role: 'ann', priority: 3 })
      .then(() => { if (!Rm.running) return; const clip = V.vo(f.ch, 'entrance', { force: true }); if (clip) return clip; if (f.ch.catchphrase) return V.say(f.ch.catchphrase, { role: 'fighter', priority: 3, pitch: f.ch.voice.pitch, rate: f.ch.voice.rate }); })
      .then(() => { f.introDone = true; if (!Rm.running) return; const lines = P.data.EX.entrance[f.ch.persona] || P.data.EX.entrance.generic; V.exchange(U.pick(lines).map(([who, t]) => [who, U.fmt(t, { name: f.ch.name, tag: P.char.tagline(f.ch) })]), { priority: 2, maxAge: 20 }); });
    Rm.updateHud();
  };
  // The walk-out is over only when the fighter is in the ring AND the ring announcer has finished with them.
  Rm.ceremonyDone = (f) => f.walkDone && (f.introDone || Rm.ceremonyT > 45);
  Rm.tryEndCeremony = (dt) => {
    const f = Rm.entrant; if (!f || !Rm.hold) return;
    Rm.ceremonyT += dt;
    if (Rm.ceremonyDone(f)) Rm.endCeremony(f);
  };
  Rm.endCeremony = (f) => {
    if (!Rm.hold) return;
    Rm.hold = false; Rm.view = 'ring'; Rm.entrant = null; Rm.card = null; Rm.nextEntry = Rm.settings.interval;
    A.stopSong(); A.sfx('ding');
    for (const o of Rm.fighters) if (o !== f && isActive(o)) { o.mode = 'roam'; o.modeT = U.rand(1, 4); }
    if (!Rm.queue.length) ex('allIn', null, null, { n: Rm.total }, { priority: 2, maxAge: 15 }); else if (U.chance(0.5)) ex('resume', null, null, null, { priority: 1, maxAge: 6 });
  };

  const setAnim = (f, name, opts) => { if (f.animName !== name) { f.animName = name; f.animT = 0; } f.animOpts = opts || {}; };
  const ACTIVE = ['idle', 'roam', 'move', 'windup', 'strike', 'recover', 'hit', 'stun', 'down'];
  const isActive = (f) => ACTIVE.includes(f.state);
  const active = () => Rm.fighters.filter(isActive);
  const others = (f) => active().filter(o => o !== f);
  const popup = (x, y, text, color, size) => Rm.popups.push({ x, y, text, color: color || '#fff', size: size || 34, t: 0, vy: -50 - Math.random() * 40, vx: (Math.random() - 0.5) * 60 });
  const burst = (x, y, color, n = 12) => { for (let i = 0; i < n; i++) Rm.particles.push({ x, y, vx: U.rand(-220, 220), vy: U.rand(-320, -60), t: 0, life: U.rand(0.5, 1.1), c: color || U.pick(['#ffd23f', '#ff5a5a', '#7bd7ff', '#fff']), r: U.rand(3, 8) }); };

  // ---------------- combat ----------------
  const pickMove = (f) => {
    if (Rm.globals.ref > 0) return P.data.MOVES.find(m => m.id === 'lowblow');
    if (f.buffs.chair > 0 && U.chance(0.7)) return P.data.MOVES.find(m => m.id === 'chair');
    const pool = P.data.MOVES.filter(m => !m.requires); const tot = pool.reduce((a, m) => a + m.w, 0); let r = Math.random() * tot;
    for (const m of pool) { r -= m.w; if (r <= 0) return m; } return pool[0];
  };
  const applyHit = (f, t, mv, dmg, fx, o = {}) => {
    t.hp -= dmg; t.hitBy = f; t.vx = f.facing * (o.knock ? 300 : 130); t.facing = -f.facing; t.lastHitT = Rm.t;
    popup(t.x, footY(t.z) - 190, fx, o.big ? '#ff3b3b' : '#ffd23f', o.big ? 48 : 32);
    popup(t.x + 30, footY(t.z) - 70, '-' + dmg, '#fff', 22);
    burst(t.x, footY(t.z) - 90, o.low ? '#f0f' : null, o.big ? 18 : 8);
    A.sfx(o.sfx || 'punch'); if (o.big) A.sfx('ooh');
    if (o.knock) { t.state = 'down'; t.st = 0; t.timer = o.knock; t.lying = -f.facing; }
    else if (o.stun) { t.state = 'stun'; t.st = 0; t.timer = o.stun; }
    else { t.state = 'hit'; t.st = 0; t.timer = 0.4; }
    // retaliation: being hit while roaming makes you want to fight back
    if (t.mode === 'roam' && U.chance(0.6)) { t.mode = 'engage'; t.target = f; t.modeT = U.rand(4, 8); }
  };
  const resolveHit = (f, t) => {
    if (f.scripted) return resolveScripted(f, t);
    const mv = pickMove(f);
    let hitChance = 0.8; if (f.buffs.blind > 0) hitChance = 0.2; if (t.state === 'down' || t.state === 'stun') hitChance = 1;
    if (!U.chance(hitChance)) { popup(f.x + f.facing * 40, footY(f.z) - 150, 'MISS', '#aaa', 26); if (U.chance(0.3)) ex('miss', f, t, null, { priority: 1, maxAge: 4 }); A.sfx('whoosh'); return; }
    let dmg = U.randi(mv.dmg[0], mv.dmg[1]);
    if (f.buffs.rage > 0) dmg *= 2; if (f.buffs.ghost > 0) dmg = Math.round(dmg * 1.5); if (t.buffs.shield > 0) dmg = Math.round(dmg / 2);
    if (Rm.script && Rm.script.active) dmg = Math.min(dmg, Math.max(0, t.hp - 1)); // scripted rumbles: freeform hits never eliminate
    applyHit(f, t, mv, dmg, U.pick(mv.fx), { big: mv.big, knock: mv.knock, stun: mv.stun, low: mv.low, sfx: mv.sfx });
    V.vo(t.ch, mv.big ? 'big' : 'hit');
    if (U.chance(0.3)) V.vo(f.ch, 'attack');
    if (mv.low) ex('lowblow', f, t, null, { priority: 2, maxAge: 6 });
    else if (mv.id === 'toot') ex('toot', f, t, null, { priority: 2, maxAge: 6 });
    else if (mv.big) ex('bigMove', f, t, null, { priority: 2, maxAge: 6 });
    else if (U.chance(0.15)) ex('move', f, t, null, { priority: 1, maxAge: 3 });
    if (t.hp <= 0) eliminate(t, f);
    else if (t.hp < 25 && U.chance(0.3)) ex('hurt', f, t, null, { priority: 1, maxAge: 5 });
  };
  const eliminate = (t, by, say) => {
    t.state = 'flying'; t.st = 0; t.hp = 0; t.fromX = t.x; t.fromZ = t.z; t.mode = 'out';
    t.outX = t.x < 920 ? U.rand(60, 230) : U.rand(1620, 1780); t.outZ = 1.2;
    A.sfx('big'); A.sfx('cheer'); burst(t.x, footY(t.z) - 100, '#fff', 20);
    if (by) { by.elims++; Rm.elims[by.ch.id] = (Rm.elims[by.ch.id] || 0) + 1; }
    V.vo(t.ch, 'eliminated', { force: true });
    V.say(P.data.ANN.elim(t.ch), { role: 'ann', priority: 3 });
    if (say) V.exchange(say, { priority: 3 }); else ex('elim', by || t, t, null, { priority: 2, maxAge: 12 });
    Rm.updateHud();
  };

  // ---------------- lucky events ----------------
  const luckyApply = (ev, f) => {
    const apply = (x) => { if (ev.dur) x.buffs[ev.id] = ev.dur; if (ev.heal) { x.hp = Math.min(x.maxHp, x.hp + ev.heal); popup(x.x, footY(x.z) - 140, '+' + ev.heal, '#5f5', 30); } if (ev.stun && isActive(x)) { x.state = 'stun'; x.st = 0; x.timer = ev.stun; } };
    if (ev.global) { Rm.globals[ev.id] = ev.dur || 0; active().forEach(apply); } else apply(f);
    popup(ev.global ? 920 : f.x, ev.global ? 200 : footY(f.z) - 220, ev.global ? 'CHAOS!' : 'LUCKY!', '#5f5', 42);
    A.sfx(ev.id === 'quake' ? 'crash' : ev.id === 'chair' ? 'chair' : 'ding');
  };
  const lucky = () => {
    const pool = active(); if (pool.length < 2) return;
    const ev = U.pick(P.data.LUCKY), f = U.pick(pool); luckyApply(ev, f);
    ex('lucky', f, f, { ev: U.fmt(ev.text, P.char.vars(f.ch, 'a')) }, { priority: 2, maxAge: 8 });
  };

  // ---------------- scripted beats ----------------
  const resolveScripted = (f, t) => {
    const b = f.scripted; f.scripted = null;
    const eff = (b.effect || 'none').toLowerCase();
    let dmg = b.type === 'eliminate' ? t.hp + 1 : U.clamp(+b.damage || 18, 1, 60);
    if (eff.includes('heal')) { f.hp = Math.min(f.maxHp, f.hp + 25); popup(f.x, footY(f.z) - 140, '+25', '#5f5', 30); }
    if (eff.includes('rage')) f.buffs.rage = 10; if (eff.includes('chair')) f.buffs.chair = 10;
    if (b.type !== 'eliminate' && Rm.script.active) dmg = Math.min(dmg, Math.max(1, t.hp - 1));
    applyHit(f, t, null, dmg, (b.popup || b.move || 'WHAM!').toUpperCase().slice(0, 24), { big: true, knock: eff.includes('knock') ? 1.6 : 0, stun: eff.includes('stun') ? 2.5 : 0, low: eff.includes('low'), sfx: eff.includes('low') ? 'punchma' : 'big' });
    if (b.type === 'eliminate' || t.hp <= 0) eliminate(t, f, b.lines);
    else if (b.lines) V.exchange(b.lines, { priority: 3 });
    Rm.script.wait = U.rand(4, 7);
  };
  const scriptStep = (dt) => {
    const S = Rm.script; if (!S || !S.active || Rm.hold) return;
    if (S.pending) { // waiting for a scripted attack to land; give up if it takes forever
      S.pendingT += dt; const a = S.pending.a; if (!a.scripted || !isActive(a) || !isActive(S.pending.d) || S.pendingT > 14) { a.scripted = null; S.pending = null; S.wait = 2; } return;
    }
    S.wait -= dt; if (S.wait > 0) return;
    const b = S.beats[S.i++];
    if (!b) { S.active = false; ex('chatter', null, null, null, { priority: 1 }); return; } // script over: finish freeform, lethal
    const F = (ch) => ch && Rm.fighters.find(f => f.ch === ch);
    const need = [b.attacker, b.defender, b.who].filter(Boolean);
    for (const ch of need) { if (!F(ch) && Rm.queue.some(q => q.ch === ch)) { Rm.spawn(ch); S.i--; S.wait = 1; return; } } // bring them in first, retry the beat after
    const a = F(b.attacker), d = F(b.defender), w = F(b.who);
    switch (b.type) {
      case 'commentary': if (b.lines) V.exchange(b.lines, { priority: 3 }); S.wait = 3 + (b.lines ? b.lines.length * 2.5 : 0); break;
      case 'entrance': S.wait = 1; break; // spawning happened above
      case 'attack': case 'eliminate':
        if (!a || !d || !isActive(a) || !isActive(d) || a === d) { S.wait = 1; break; }
        if (b.setup) V.exchange(b.setup, { priority: 3 });
        a.scripted = b; a.mode = 'engage'; a.target = d; a.modeT = 20; a.cool = 0; S.pending = { a, d }; S.pendingT = 0; break;
      case 'event': {
        const eff = (b.effect || 'none').toLowerCase(); const ev = P.data.LUCKY.find(e => e.id === eff) || { id: eff, dur: 8, heal: eff === 'heal' ? 30 : 0, stun: eff === 'stun' ? 2.5 : 0, global: eff === 'quake' || eff === 'ref' || eff === 'slurpee' };
        const who = w || U.pick(active()); if (who && eff !== 'none') luckyApply(ev, who);
        if (b.text) V.say(b.text, { role: 'ann', priority: 3 }); if (b.lines) V.exchange(b.lines, { priority: 3 }); S.wait = 5; break;
      }
      case 'winner': {
        if (!w) { S.wait = 1; break; }
        const rest = active().filter(x => x !== w);
        if (rest.length) { const victim = rest[0]; if (b.lines && rest.length === 1) { w.scripted = { type: 'eliminate', move: b.move || 'FINISHER', popup: b.popup, lines: b.lines }; } else w.scripted = { type: 'eliminate', move: 'CLEAN UP', popup: 'OUT!' }; w.mode = 'engage'; w.target = victim; w.modeT = 20; w.cool = 0; S.pending = { a: w, d: victim }; S.pendingT = 0; S.i--; }
        else { S.active = false; if (b.lines) V.exchange(b.lines, { priority: 3 }); }
        break;
      }
      default: S.wait = 1;
    }
  };

  // ---------------- update ----------------
  Rm.update = (dt) => {
    Rm.t += dt;
    if (Rm.pre) {
      const pre = Rm.pre; pre.t += dt;
      const cur = pre.steps[pre.i];
      if (pre.i < 0 || (pre.t > (cur ? cur.dur : 0) && P.voice.idle())) {
        pre.i++; pre.t = 0; pre.letters = 0;
        if (pre.i >= pre.steps.length) { Rm.pre = null; A.stopSong(); A.sfx('bell'); Rm.nextEntry = 1.5; }
        else Rm.preStep(pre.steps[pre.i]);
      }
      if (Rm.pre && pre.steps[pre.i] && pre.steps[pre.i].kind === 'spell') pre.letters = U.clamp(Math.floor((pre.t - 2.2) / 0.52), 0, 7);
      return;
    }
    if (Rm.queue.length && !Rm.hold && !Rm.ended) { Rm.nextEntry -= dt; if (Rm.nextEntry <= 0) Rm.spawn(); }
    for (const k in Rm.globals) Rm.globals[k] = Math.max(0, Rm.globals[k] - dt);
    if (!Rm.hold && !(Rm.script && Rm.script.active)) { Rm.luckyT -= dt; if (Rm.luckyT <= 0 && active().length >= 2) { lucky(); Rm.luckyT = (10 + U.rand(0, 12)) / Rm.settings.chaos; } }
    Rm.chatterT -= dt; if (Rm.chatterT <= 0 && !Rm.hold && V.idle()) { const a = active()[0]; ex('chatter', a, a, null, { priority: 1, maxAge: 5 }); Rm.chatterT = U.rand(18, 35); }
    Rm.tryEndCeremony(dt);
    scriptStep(dt);
    Rm.dim += ((Rm.hold ? 0.55 : 0) - Rm.dim) * Math.min(1, dt * 2.5);
    if (Rm.card) Rm.card.t += dt;
    const slide = Rm.globals.slurpee > 0;

    for (const f of Rm.fighters) {
      f.st += dt; f.animT += dt;
      for (const k in f.buffs) f.buffs[k] = Math.max(0, f.buffs[k] - dt);
      const speedMul = (f.buffs.beer > 0 ? 1.7 : 1) * (slide ? 1.5 : 1);
      switch (f.state) {
        case 'entering': {
          const step = f.script[f.si]; if (!step) { f.state = 'idle'; f.st = 0; f.walkDone = true; break; }
          f.stepT += dt;
          if (step.type === 'walk') {
            setAnim(f, step.anim); f.facing = step.back ? -1 : 1; if (step.alpha) f.alpha = step.alpha;
            const dir = Math.sign(step.to - f.x); f.x += dir * 95 * step.speed * dt; if (step.zig) f.z = ENTRY_Z + Math.sin(f.stepT * 3) * 0.18;
            if ((dir > 0 && f.x >= step.to) || (dir < 0 && f.x <= step.to) || dir === 0) { f.x = step.to; f.si++; f.stepT = 0; }
          } else if (step.type === 'anim') {
            if (f.stepT === dt && step.sfx) A.sfx(step.sfx);
            setAnim(f, step.anim); f.facing = 1;
            if (f.stepT >= step.dur) { f.si++; f.stepT = 0; }
          } else if (step.type === 'fall') {
            if (f.stepT === dt) A.sfx('thud');
            setAnim(f, 'lying', { dir: 1, expr: 'happy' });
            if (f.stepT >= step.dur) { f.si++; f.stepT = 0; }
          } else if (step.type === 'enter') {
            const durs = { jump: 1.0, dive: 0.9, climb: 1.9, trip: 1.2, shoved: 1.0, float: 1.6, crawl: 1.4, teleport: 1.4 }; const dur = durs[step.style] || 1;
            const p = U.clamp(f.stepT / dur, 0, 1);
            if (f.stepT === dt) A.sfx(step.style === 'teleport' ? 'magic' : step.style === 'float' ? 'ooh' : 'whoosh');
            f.x = U.lerp(ENTRY_X, INSIDE_X, p); f.z = U.lerp(ENTRY_Z, 0.55, p); f.facing = 1;
            const arc = { jump: 170, dive: 160, climb: 70, trip: 140, shoved: 180, float: 40, crawl: 150, teleport: 0 }[step.style];
            f.jump = -Math.sin(p * Math.PI) * arc;
            if (step.style === 'jump' || step.style === 'crawl') setAnim(f, 'jump'); else if (step.style === 'dive') setAnim(f, 'dive'); else if (step.style === 'climb') setAnim(f, 'climb', { p }); else if (step.style === 'trip' || step.style === 'shoved') setAnim(f, 'fly', { spin: 7 }); else if (step.style === 'float') setAnim(f, 'float'); else if (step.style === 'teleport') { setAnim(f, 'cast'); f.alpha = p < 0.5 ? 1 - p * 2 : (p - 0.5) * 2; f.x = p < 0.5 ? ENTRY_X : INSIDE_X; }
            if (p >= 1) {
              f.jump = 0; f.alpha = f.ch.persona === 'ghost' ? 0.85 : 1; f.si++; f.stepT = 0; f.state = 'idle'; f.st = 0; f.cool = 1.5; f.mode = 'roam'; f.modeT = U.rand(2, 5); A.sfx('thud'); burst(f.x, footY(f.z), '#ccc', 10);
              if (['dive', 'trip', 'shoved'].includes(step.style)) { f.state = 'down'; f.timer = 1.0; f.lying = 1; }
              f.walkDone = true;
            }
          }
          break;
        }
        case 'idle': case 'roam': case 'move': {
          f.hp = Math.min(f.maxHp, f.hp + (f.mode === 'roam' ? 1.2 : 0.5) * dt); f.cool -= dt; f.modeT -= dt;
          const os = others(f);
          if (Rm.hold && f.mode !== 'roam') { f.mode = 'roam'; f.modeT = 5; }
          if (f.mode === 'engage' && (!f.target || !os.includes(f.target) || f.modeT <= 0)) { f.mode = 'roam'; f.modeT = U.rand(3, 9); f.target = null; f.scripted = null; }
          if (f.mode === 'roam' && f.modeT <= 0 && os.length && !Rm.hold) {
            const chance = Rm.script && Rm.script.active ? 0.5 : 0.85;
            if (U.chance(chance)) { f.mode = 'engage'; f.target = U.chance(0.6) ? os.sort((p, q) => Math.abs(p.x - f.x) - Math.abs(q.x - f.x))[0] : U.pick(os); f.modeT = U.rand(5, 11); }
            else f.modeT = U.rand(2, 5);
          }
          if (f.mode === 'engage') {
            const t = f.target, dx = t.x - f.x, dz = t.z - f.z, reach = 90 * zScale(f.z);
            f.facing = dx >= 0 ? 1 : -1;
            if (Math.abs(dx) > reach || Math.abs(dz) > 0.12) {
              f.state = 'move'; setAnim(f, f.buffs.beer > 0 ? 'run' : 'walk', { speed: 2.4 });
              const sp = 120 * speedMul * dt; f.x += Math.sign(dx) * Math.min(sp, Math.max(0, Math.abs(dx) - reach * 0.8)); f.z += Math.sign(dz) * Math.min(sp / 500, Math.abs(dz));
            } else {
              f.state = 'idle'; setAnim(f, 'ready');
              if (f.cool <= 0) { f.state = 'windup'; f.st = 0; }
            }
          } else if (Rm.hold && f !== Rm.entrant) { // somebody is walking out: stop, turn, watch
            f.state = 'roam'; f.facing = -1; setAnim(f, 'ready'); f.wander = null; f.pause = 0;
          } else if (Rm.hold) { // the entrant, in the ring, still being announced
            f.state = 'roam'; f.facing = 1; f.wander = null;
            setAnim(f, ['showboat', 'diva', 'zoomer'].includes(f.ch.persona) ? 'taunt' : f.ch.persona === 'coward' ? 'cower' : f.ch.persona === 'maniac' ? 'yell' : 'ready');
          } else { // roaming: wander to a spot, stand around, look at people, taunt
            f.state = 'roam';
            if (f.pause > 0) {
              f.pause -= dt;
              setAnim(f, f.pauseAnim); if (f.pauseAnim === 'ready' && os.length) { const n = os[0]; f.facing = n.x >= f.x ? 1 : -1; }
              if (f.pause <= 0) f.wander = null;
            } else {
              if (!f.wander) { const b = ringX(0.5); f.wander = { x: U.rand(b.left + 40, b.right - 40), z: U.rand(0.1, 0.9) }; }
              const dx = f.wander.x - f.x, dz = f.wander.z - f.z;
              if (Math.abs(dx) < 8 && Math.abs(dz) < 0.05) { f.pause = U.rand(1.2, 3.5); f.pauseAnim = U.pick(['idle', 'idle', 'ready', 'taunt', 'flex', 'idle']); if (f.pauseAnim === 'taunt' && U.chance(0.3) && !Rm.hold) V.vo(f.ch, 'taunt', { fallback: U.pick(P.data.persona(f.ch.persona).taunts) }); }
              else { f.facing = dx >= 0 ? 1 : -1; setAnim(f, 'walk', { speed: 1.6 }); const sp = 55 * speedMul * dt; f.x += Math.sign(dx) * Math.min(sp, Math.abs(dx)); f.z += Math.sign(dz) * Math.min(sp / 500, Math.abs(dz)); }
            }
          }
          break;
        }
        case 'windup': { setAnim(f, 'punch', { p: 0 }); if (f.st > 0.4) { f.state = 'strike'; f.st = 0; if (f.target && others(f).includes(f.target)) resolveHit(f, f.target); } break; }
        case 'strike': { setAnim(f, 'punch', { p: Math.min(1, f.st / 0.15) }); if (f.st > 0.3) { f.state = 'recover'; f.st = 0; f.cool = U.rand(1.0, 1.9) / (f.buffs.beer > 0 ? 1.6 : 1); if (f.mode === 'engage' && !f.scripted && U.chance(0.3)) { f.mode = 'roam'; f.modeT = U.rand(3, 8); f.target = null; } } break; }
        case 'recover': { setAnim(f, 'ready'); if (f.st > 0.4) { f.state = 'idle'; f.st = 0; } break; }
        case 'hit': { setAnim(f, 'hurt'); if (f.st > f.timer) { f.state = 'idle'; f.st = 0; } break; }
        case 'stun': { setAnim(f, 'stunned'); if (f.st > f.timer) { f.state = 'idle'; f.st = 0; } break; }
        case 'down': { setAnim(f, 'lying', { dir: f.lying || 1 }); if (f.st > f.timer) { f.state = 'idle'; f.st = 0; f.cool = 0.6; } break; }
        case 'flying': {
          const p = U.clamp(f.st / 1.3, 0, 1); f.x = U.lerp(f.fromX, f.outX, p); f.z = U.lerp(f.fromZ, f.outZ, p); f.jump = -Math.sin(p * Math.PI) * 300; f.facing = f.outX < f.fromX ? -1 : 1;
          setAnim(f, 'fly', { spin: 10 });
          if (p >= 1) { f.state = 'out'; f.st = 0; f.jump = 0; A.sfx('thud'); burst(f.x, footY(f.z), '#bbb', 14); }
          break;
        }
        case 'out': { setAnim(f, 'lying', { dir: 1 }); if (f.st > 3) f.alpha = Math.max(0, 1 - (f.st - 3) / 1.5); if (f.st > 4.6) f.state = 'gone'; break; }
        case 'winner': { setAnim(f, 'celebrate'); f.facing = 1; if (U.chance(0.15)) burst(U.rand(300, 1540), U.rand(60, 300), null, 2); break; }
      }
      if (f.vx) { f.x += f.vx * dt; f.vx *= slide ? 0.985 : 0.88; if (Math.abs(f.vx) < 5) f.vx = 0; }
      if (slide && ['idle', 'roam', 'move', 'recover'].includes(f.state) && !f.vx) f.vx = U.rand(-60, 60);
      if (!['entering', 'flying', 'out', 'gone'].includes(f.state)) { const b = ringX(f.z); f.x = U.clamp(f.x, b.left, b.right); f.z = U.clamp(f.z, 0.05, 0.98); }
    }
    const act = active();
    for (let i = 0; i < act.length; i++) for (let j = i + 1; j < act.length; j++) { const a = act[i], b = act[j]; const dx = b.x - a.x; if (Math.abs(dx) < 50 && Math.abs(b.z - a.z) < 0.08) { const push = (50 - Math.abs(dx)) * 0.5 * (dx >= 0 ? 1 : -1) || 1; a.x -= push; b.x += push; } }
    Rm.fighters = Rm.fighters.filter(f => f.state !== 'gone');
    for (const p of Rm.popups) { p.t += dt; p.y += p.vy * dt; p.x += p.vx * dt; }
    Rm.popups = Rm.popups.filter(p => p.t < 1.2);
    for (const p of Rm.particles) { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 600 * dt; }
    Rm.particles = Rm.particles.filter(p => p.t < p.life);
    if (!Rm.ended && !Rm.queue.length) {
      const busy = Rm.fighters.some(f => f.state === 'flying' || f.state === 'entering');
      if (act.length === 1 && !busy) Rm.win(act[0]);
      else if (act.length === 0 && !busy && Rm.entered > 0) { const last = Rm.fighters.slice().reverse().find(f => f.state === 'out'); Rm.win(last || Rm.fighters[0], true); }
    }
    // camera
    const cam = Rm.cam; let tx = 920, ty = 430, tz = 0.8;
    if (Rm.hold && Rm.entrant) { const e = Rm.entrant; tx = U.clamp(e.x + 90, -300, 1120); ty = footY(e.z) - 130 + (e.jump || 0) * 0.45; tz = e.x < ENTRY_X ? 1.15 : 1.0; }
    if (Rm.ended && Rm.winner) { tx = Rm.winner.x; ty = 450; tz = 1.35; }
    const k = Math.min(1, dt * 2.2); cam.x += (tx - cam.x) * k; cam.y += (ty - cam.y) * k; cam.zoom += (tz - cam.zoom) * k;
    if (Rm.frameCount % 20 === 0) Rm.updateHud();
  };

  Rm.win = (f, byDefault) => {
    if (!f) return; Rm.ended = true; Rm.winner = f; f.state = 'winner'; f.st = 0; f.alpha = 1; f.x = 920; f.z = 0.6; f.hp = Math.max(f.hp, 1); Rm.hold = false; Rm.card = null;
    A.sfx('bell'); A.sfx('yay'); A.playCharSong(f.ch);
    const tag = P.char.tagline(f.ch); V.stop(); V.vo(f.ch, 'victory', { force: true });
    V.say(P.data.ANN.winner(f.ch), { role: 'ann', priority: 3 });
    ex('winner', f, f, { name: f.ch.name, tag, obj: P.char.pron(f.ch).obj }, { priority: 3 });
    if (byDefault) V.say('Technically everyone got eliminated, so the last one out wins. Those are the rules. I just made them up.', { role: 'gary', priority: 3 });
    for (let i = 0; i < 140; i++) Rm.particles.push({ x: U.rand(200, 1640), y: U.rand(-300, 0), vx: U.rand(-40, 40), vy: U.rand(60, 160), t: 0, life: U.rand(3, 6), c: U.pick(['#ffd23f', '#ff5a5a', '#7bd7ff', '#5f5', '#f6f']), r: U.rand(4, 9) });
    if (Rm.onEnd) setTimeout(() => Rm.onEnd(f), 4500);
  };

  // ---------------- HUD (DOM) ----------------
  Rm.updateHud = () => {
    const el = document.getElementById('hud-list'); if (!el) return;
    el.innerHTML = Rm.fighters.filter(f => f.state !== 'gone').map(f => {
      const out = ['flying', 'out'].includes(f.state); const pct = U.clamp(f.hp / f.maxHp * 100, 0, 100);
      const buffs = Object.keys(f.buffs).filter(k => f.buffs[k] > 0).map(k => ({ chair: '🪑', rage: '😡', blind: '🕶️', beer: '🍺', ghost: '👻', shield: '🛡️' }[k] || '✨')).join('');
      return `<div class="chip${out ? ' out' : ''}${f.state === 'winner' ? ' win' : ''}"><span class="hname">${U.esc(f.ch.name)}</span>${buffs}<span class="hbar"><i style="width:${pct}%;background:${pct > 50 ? '#5f5' : pct > 25 ? '#ffd23f' : '#f55'}"></i></span></div>`;
    }).join('') || '<span class="muted">Waiting for the first fighter...</span>';
    const nx = document.getElementById('hud-next'); if (nx) nx.textContent = Rm.hold ? `Entrant ${Rm.entered} of ${Rm.total}: ${Rm.entrant ? Rm.entrant.ch.name : ''} is walking out` : Rm.queue.length ? `Next entrant in ${Math.max(0, Math.ceil(Rm.nextEntry))}s (${Rm.entered}/${Rm.total})` : Rm.ended ? 'IT\'S OVER' : `All ${Rm.total} in the ring. Last one standing wins.`;
    if (nx && Rm.pre) nx.textContent = 'Pre-show';
  };

  // ---------------- drawing ----------------
  Rm.frame = (now) => {
    if (!Rm.running) return;
    let dt = Math.min(0.05, (now - Rm.last) / 1000); Rm.last = now; Rm.frameCount++;
    if (!Rm.paused) for (let i = 0; i < Rm.speed; i++) Rm.update(dt);
    Rm.render();
    requestAnimationFrame(Rm.frame);
  };
  Rm.toScreen = (x, y) => { const c = Rm.cam; return [(x - c.x) * c.zoom + W / 2, (y - c.y) * c.zoom + H / 2]; };
  Rm.render = () => {
    const ctx = Rm.ctx, cam = Rm.cam; ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, W, H);
    const grd = ctx.createLinearGradient(0, 0, 0, H); grd.addColorStop(0, '#1a1030'); grd.addColorStop(1, '#3a2a55'); ctx.fillStyle = grd; ctx.fillRect(0, 0, W, H);
    if (Rm.globals.quake > 0) ctx.translate(U.rand(-6, 6), U.rand(-6, 6));
    ctx.translate(W / 2, H / 2); ctx.scale(cam.zoom, cam.zoom); ctx.translate(-cam.x, -cam.y);
    // arena back wall, spotlights, crowd
    ctx.save(); ctx.globalAlpha = 0.08; ctx.fillStyle = '#fff'; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(100 + i * 420, -100); ctx.lineTo(-100 + i * 420 + Math.sin(Rm.t + i) * 40, 700); ctx.lineTo(300 + i * 420 + Math.sin(Rm.t + i) * 40, 700); ctx.closePath(); ctx.fill(); } ctx.restore();
    const excite = Math.min(1, active().length / 4);
    for (const c of Rm.crowd) { const bob = Math.sin(Rm.t * (3 + excite * 6) + c.ph) * (2 + excite * 6); D.circle(ctx, c.x, c.y + bob, 17 * c.s, c.c, 3); ctx.beginPath(); ctx.arc(c.x, c.y + bob - 4, 17 * c.s, Math.PI, 0); ctx.closePath(); ctx.fillStyle = c.hc; ctx.fill(); if (excite > 0.5 && (c.ph * 10 | 0) % 3 === 0) D.line(ctx, c.x - 20, c.y + bob, c.x - 34, c.y + bob - 28 + Math.sin(Rm.t * 10 + c.ph) * 8, 5, c.c); }
    D.rect(ctx, -900, 330, 3600, 700, '#2b2140', 0);
    D.text(ctx, 'PUNCHMA', 920, 60, 110, '#ff3b3b'); D.text(ctx, 'ROYAL RUMBLE', 920, 128, 30, '#ffd23f');
    // entrance stage: tunnel + ramp + screen
    D.rr(ctx, -640, 250, 400, 320, 24, '#111'); D.rect(ctx, -600, 150, 320, 90, '#222', 5); D.text(ctx, 'ENTRANCE', -440, 195, 36, '#ffd23f');
    for (let i = 0; i < 12; i++) D.circle(ctx, -620 + i * 36, 262, 6, (Math.floor(Rm.t * 6) + i) % 3 === 0 ? '#ff3b3b' : '#ffd23f', 0);
    D.poly(ctx, [[-640, 570], [280, 570], [280, 600], [-640, 600]], '#444', 4); D.rect(ctx, -900, 690, 3600, 200, '#333', 0);
    // ring
    D.poly(ctx, [RING.bl, RING.br, RING.fr, RING.fl], '#e8e0d0', 6);
    D.poly(ctx, [RING.fl, RING.fr, [RING.fr[0], 730], [RING.fl[0], 730]], '#b3262e', 6);
    D.text(ctx, 'PUNCHMA', 920, 698, 44, '#ffd23f');
    ctx.save(); ctx.globalAlpha = 0.45; D.text(ctx, 'P', 920, 530, 160, '#b3262e'); ctx.restore();
    Rm.drawSignage(ctx);
    const post = (x, y) => { D.rect(ctx, x - 8, y - RING.post, 16, RING.post, '#333', 3); D.circle(ctx, x, y - RING.post, 11, '#ffd23f', 3); };
    const rope = (a, b, col, lw) => { for (const h of RING.ropes) { ctx.beginPath(); ctx.moveTo(a[0], a[1] - h); ctx.quadraticCurveTo((a[0] + b[0]) / 2, (a[1] + b[1]) / 2 - h + 7, b[0], b[1] - h); ctx.lineWidth = lw + 3; ctx.strokeStyle = D.INK; ctx.stroke(); ctx.lineWidth = lw; ctx.strokeStyle = col; ctx.stroke(); } };
    post(RING.bl[0], RING.bl[1]); post(RING.br[0], RING.br[1]); rope(RING.bl, RING.br, '#e33', 5);
    const fs = Rm.fighters.slice();
    const drawF = (f) => {
      const t = f.animT; const base = R.anim(f.animName, t, f.animOpts) || {};
      const pose = R.pose(Object.assign({ t }, base));
      pose.facing = (base.facing || 1) * f.facing; pose.alpha = f.alpha; if (f.jump) pose.jump = (pose.jump || 0) + f.jump / zScale(f.z);
      if (f.buffs.rage > 0) pose.tint = '#f00'; if (f.buffs.ghost > 0) pose.tint = '#8f8'; if (f.buffs.blind > 0) pose.expr = 'ko';
      const y = footY(f.z), sc = zScale(f.z);
      R.draw(ctx, f.ch, pose, f.x, y, sc);
      const g = R.geo(f.ch), top = y - g.totalH * f.ch.body.height * sc + (f.jump || 0);
      if (isActive(f)) { const pct = U.clamp(f.hp / f.maxHp, 0, 1); D.rr(ctx, f.x - 30, top - 26, 60, 9, 4, '#222', 2); D.rect(ctx, f.x - 29, top - 25, 58 * pct, 7, pct > .5 ? '#5f5' : pct > .25 ? '#ffd23f' : '#f55', 0); }
      if (f.state === 'stun' || f.buffs.blind > 0) for (let i = 0; i < 3; i++) { const a = t * 5 + i * 2.1; D.star(ctx, f.x + Math.cos(a) * 34, top - 8 + Math.sin(a) * 10, 9, 4, 5, '#ffd23f', 2); }
      if (f.buffs.chair > 0) { ctx.save(); ctx.translate(f.x + f.facing * 36, y - 90); ctx.rotate(-0.6 * f.facing); D.rect(ctx, -8, -50, 16, 60, '#888', 3); D.rect(ctx, -22, -70, 44, 26, '#888', 3); ctx.restore(); }
      if (f.buffs.shield > 0) D.circle(ctx, f.x + f.facing * 30, y - 80, 24, '#8a9', 4);
      if (f.state === 'winner') D.text(ctx, 'WINNER!', f.x, top - 50 + Math.sin(t * 6) * 6, 40, '#ffd23f');
    };
    fs.filter(f => f.state === 'entering' && f.x < ENTRY_X + 40).forEach(drawF);
    rope(RING.bl, RING.fl, '#e33', 5);
    fs.filter(f => !(f.state === 'entering' && f.x < ENTRY_X + 40) && f.state !== 'out' && !(f.state === 'flying' && f.st > 0.7)).sort((a, b) => a.z - b.z).forEach(drawF);
    rope(RING.br, RING.fr, '#e33', 5); post(RING.fl[0], RING.fl[1]); post(RING.fr[0], RING.fr[1]); rope(RING.fl, RING.fr, '#e33', 6);
    fs.filter(f => f.state === 'out' || (f.state === 'flying' && f.st > 0.7)).forEach(drawF);
    for (const p of Rm.particles) { ctx.globalAlpha = 1 - p.t / p.life; D.circle(ctx, p.x, p.y, p.r, p.c, 0); } ctx.globalAlpha = 1;
    for (const p of Rm.popups) { ctx.globalAlpha = 1 - p.t / 1.2; D.text(ctx, p.text, p.x, p.y, p.size * (1 + p.t * 0.3), p.color); } ctx.globalAlpha = 1;
    // ---- screen space: lights-down spotlight, name card, status text ----
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (Rm.dim > 0.01) {
      const f = Rm.entrant; const [sx, sy] = f ? Rm.toScreen(f.x, footY(f.z) - 60 * cam.zoom) : [W / 2, H / 2];
      const g = ctx.createRadialGradient(sx, sy, 60 * cam.zoom, sx, sy, 420 * cam.zoom); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${Rm.dim})`); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }
    if (Rm.card) { const f = Rm.card.f, ch = f.ch, k = Math.min(1, Rm.card.t * 2.5); const x = -420 + 440 * (1 - Math.pow(1 - k, 3)); ctx.save(); ctx.translate(x, 0); D.poly(ctx, [[0, 520], [560, 520], [530, 660], [0, 660]], '#ff3b3b', 5); D.rect(ctx, 0, 520, 560, 14, '#ffd23f', 0); D.text(ctx, `#${f.n}`, 40, 580, 40, '#ffd23f', null, 'left'); D.text(ctx, ch.name.toUpperCase().slice(0, 22), 100, 572, ch.name.length > 12 ? 34 : 44, '#fff', null, 'left'); D.text(ctx, 'the ' + P.char.tagline(ch), 100, 612, 24, '#ffd23f', 'Georgia, serif', 'left'); D.text(ctx, 'from ' + ch.hometown, 100, 640, 18, '#fff', 'Georgia, serif', 'left'); ctx.restore(); }
    if (Rm.globals.ref > 0) D.text(ctx, 'REF DISTRACTED: ANYTHING GOES', W / 2, 40, 30, '#f6f');
    if (Rm.globals.slurpee > 0) D.text(ctx, 'SLURPEE FLOOR', W / 2, 40, 30, '#7bd7ff');
    if (Rm.pre) Rm.renderPreshow(ctx);
    if (Rm.paused) { ctx.fillStyle = '#0008'; ctx.fillRect(0, 0, W, H); D.text(ctx, 'PAUSED', W / 2, H / 2, 90, '#fff'); }
  };
  Rm.renderPreshow = (ctx) => {
    const pre = Rm.pre, step = pre.steps[pre.i] || { kind: 'title' }, t = pre.t;
    ctx.fillStyle = 'rgba(4,6,20,0.975)'; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 90; i++) { const a = (i * 2.39996), r = 40 + (i % 13) * 52; const x = W / 2 + Math.cos(a + Rm.t * 0.05) * r * 2.2, y = H / 2 + Math.sin(a * 1.7 + Rm.t * 0.04) * r; ctx.globalAlpha = 0.25 + 0.55 * Math.abs(Math.sin(i + Rm.t * 1.3)); D.circle(ctx, x, y, (i % 3) * 0.7 + 0.8, '#dfe8ff', 0); }
    ctx.globalAlpha = 1;
    if (step.kind === 'title') {
      const k = Math.min(1, t / 0.7), sc = 0.6 + 0.4 * (1 - Math.pow(1 - k, 3));
      ctx.save(); ctx.translate(W / 2, H / 2 - 40); ctx.rotate(Math.sin(t * 2) * 0.012); ctx.scale(sc, sc);
      D.text(ctx, 'PUNCHMA', 0, 0, 150, '#ff3b3b'); ctx.restore();
      D.text(ctx, 'ROYAL RUMBLE', W / 2, H / 2 + 60, 44, '#ffd23f');
      D.text(ctx, `${Rm.total} fighters. One ring. One winner.`, W / 2, H / 2 + 120, 26, '#fff', 'Georgia, serif');
    } else if (step.kind === 'ad') {
      const sp = step.sp, img = P.sponsors.logoImage(sp), k = Math.min(1, t / 0.5);
      D.text(ctx, 'A WORD FROM OUR SPONSOR', W / 2, 70, 26, '#8fa0c0');
      if (img) { const size = 240 * (0.7 + 0.3 * k); ctx.save(); ctx.globalAlpha = k; ctx.translate(W / 2, 250); ctx.rotate(Math.sin(t * 1.6) * 0.03); ctx.drawImage(img, -size / 2, -size / 2, size, size); ctx.restore(); }
      D.text(ctx, (sp.name || '').slice(0, 30), W / 2, 430, 52, '#fff');
      D.text(ctx, (sp.tagline || '').slice(0, 60), W / 2, 490, 26, sp.color2 || '#ffd23f', 'Georgia, serif');
      const lines = (sp.commercial || []).filter(l => l && l.trim());
      const idx = U.clamp(Math.floor((t - 1.5) / 3.5), 0, lines.length - 1);
      if (lines[idx] && t > 1.5) { ctx.globalAlpha = 0.9; D.text(ctx, lines[idx].slice(0, 70), W / 2, 580, 22, '#cfe0ff', 'Georgia, serif'); ctx.globalAlpha = 1; }
    } else if (step.kind === 'board') {
      D.text(ctx, "TONIGHT'S SPONSORS", W / 2, 110, 46, '#ffd23f');
      const n = Rm.sponsors.length, cw = Math.min(260, (W - 120) / Math.max(1, n));
      Rm.sponsors.forEach((sp, i) => { const img = P.sponsors.logoImage(sp), x = W / 2 + (i - (n - 1) / 2) * cw; if (img) ctx.drawImage(img, x - cw * 0.36, 220, cw * 0.72, cw * 0.72); D.text(ctx, (sp.name || '').slice(0, 18), x, 240 + cw * 0.72, 20, '#fff'); });
    } else if (step.kind === 'spell') {
      const word = 'PUNCHMA';
      D.text(ctx, 'IT IS TIME FOR...', W / 2, 190, 34, '#8fa0c0');
      for (let i = 0; i < word.length; i++) {
        const on = i < pre.letters, x = W / 2 + (i - 3) * 146;
        ctx.save(); ctx.globalAlpha = on ? 1 : 0.5;
        const pop = on ? 1 + Math.max(0, 0.5 - (t - 2.2 - i * 0.52)) : 1;
        ctx.translate(x, 400); ctx.scale(pop, pop);
        D.text(ctx, word[i], 0, 0, 118, on ? '#ff3b3b' : '#2b3358');
        ctx.restore();
      }
      if (pre.letters >= 7) D.text(ctx, 'PUNCHMA!', W / 2, 560, 60, '#ffd23f');
    }
    D.text(ctx, 'press S to skip', W - 90, H - 22, 16, '#8fa0c0');
  };
})();
