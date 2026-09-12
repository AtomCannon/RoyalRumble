// The Rumble: entrances, fighting, eliminations, lucky events, winner. Everyone has identical stats. Only luck decides.
window.P = window.P || {};
(function () {
  const U = P.util, R = P.render, D = P.draw, A = P.audio, N = P.announcer;
  const W = 1280, H = 720;
  const RING = { bl: [330, 470], br: [950, 470], fl: [250, 640], fr: [1030, 640], post: 175, ropes: [50, 100, 150] };
  const ENTRY_X = 190, INSIDE_X = 420, SPAWN_X = -90;
  const Rm = P.rumble = { running: false, fighters: [], queue: [], t: 0, speed: 1, paused: false, popups: [], particles: [], settings: {}, crowd: [], onEnd: null };

  const ringX = (z) => ({ left: U.lerp(RING.bl[0], RING.fl[0], z) + 40, right: U.lerp(RING.br[0], RING.fr[0], z) - 40 });
  const footY = (z) => U.lerp(RING.bl[1], RING.fl[1], z);
  const zScale = (z) => U.lerp(0.5, 0.66, U.clamp(z, 0, 1.3));

  Rm.start = (chars, settings) => {
    Rm.settings = Object.assign({ interval: 12, chaos: 1, speed: 1, hp: 100 }, settings || {});
    Rm.fighters = []; Rm.popups = []; Rm.particles = []; Rm.t = 0; Rm.speed = Rm.settings.speed; Rm.paused = false; Rm.winner = null; Rm.ended = false;
    Rm.queue = U.shuffle(chars.slice()).map((ch, i) => ({ ch, n: i + 1 }));
    Rm.total = Rm.queue.length; Rm.entered = 0;
    Rm.elims = {}; Rm.nextEntry = 1.0; Rm.luckyT = 6 + U.rand(4, 10) / Rm.settings.chaos; Rm.idleChatter = 8; Rm.globals = {};
    Rm.crowd = []; for (let r = 0; r < 5; r++) for (let i = 0; i < 26; i++) Rm.crowd.push({ x: i * 52 + (r % 2) * 26 - 10, y: 150 + r * 42, c: U.randColor(), hc: U.pick(P.char.HAIR_COLORS), ph: U.rand(6.28), s: U.rand(0.8, 1.2) });
    Rm.canvas = document.getElementById('ring'); Rm.ctx = Rm.canvas.getContext('2d');
    N.attach(document.getElementById('feed'));
    N.say(`WELCOME TO PUNCHMA! ${Rm.total} entrants. One ring. Zero skill. Let's go.`, { big: true });
    N.say(U.pick(['I\'m Gary Gristle and I\'ve already been drinking.', 'Tonya, I have a bad feeling about tonight.', 'Reminder: none of these people are athletes.']));
    A.init(); A.crowd(0.5); A.sfx('bell');
    A.say(`Welcome to Punchma! ${Rm.total} entrants will enter. Only one will leave with their dignity. Probably none.`, { pitch: 0.6, rate: 1.05 });
    Rm.running = true; Rm.last = performance.now();
    requestAnimationFrame(Rm.frame);
    Rm.updateHud();
  };
  Rm.stop = () => { Rm.running = false; A.stopSong(); A.stopCrowd(); A.shutUp(); };

  // ---------------- entrance scripts ----------------
  const walk = (to, anim, speed, extra) => Object.assign({ type: 'walk', to, anim: anim || 'walk', speed: speed || 1 }, extra || {});
  const anim = (a, dur, say, sfx) => ({ type: 'anim', anim: a, dur, say, sfx });
  const enter = (style, say) => ({ type: 'enter', style, say });
  const fall = (dur, say) => ({ type: 'fall', dur, say });
  Rm.script = (f) => {
    const p = P.data.persona(f.ch.persona), n = f.ch.name;
    switch (p.id) {
      case 'showboat': return [walk(50), anim('flex', 1.3, `${n} stops to flex. Nobody asked.`), walk(ENTRY_X), anim('taunt', 1.0), enter('jump')];
      case 'coward': return [walk(110, 'walk', 0.8), anim('cower', 1.0, `${n} is having second thoughts. And third thoughts.`), walk(30, 'walk', 0.9, { back: true }), anim('cower', 0.8), walk(ENTRY_X, 'walk', 0.9), anim('cower', 0.7, `Security is walking toward ${n}.`), enter('shoved', `SECURITY SHOVES ${n.toUpperCase()} INTO THE RING!`)];
      case 'maniac': return [anim('yell', 0.6, `${n} IS SCREAMING.`), walk(ENTRY_X, 'run', 2.6), enter('dive', `${n} DIVES HEADFIRST OVER THE TOP ROPE!`)];
      case 'dad': return [walk(90, 'walk', 0.6), anim('wave', 1.3, `${n} waves at the crowd. Individually.`), walk(ENTRY_X, 'walk', 0.6), anim('idle', 0.9, `${n} checks the time. Fair enough.`), enter('climb', `${n} carefully steps through the ropes like a responsible adult.`)];
      case 'drunk': return [walk(70, 'wobble', 0.8, { zig: true }), fall(1.1, `${n} fell over. Nobody touched ${P.char.pron(f.ch).obj}.`), walk(ENTRY_X, 'wobble', 0.9, { zig: true }), enter('trip', `${n} trips on the rope and rolls INTO the ring! It counts!`)];
      case 'diva': return [walk(100, 'walk', 0.7), anim('wave', 1.2, `${n} is demanding a spotlight. And a smoothie.`, 'ding'), walk(ENTRY_X, 'walk', 0.7), anim('idle', 0.6, `${n} refuses to touch the ropes without gloves.`), enter('climb')];
      case 'oldman': return [walk(ENTRY_X, 'shuffle', 0.32), anim('yell', 1.1, `${n}: "In MY day we didn't HAVE ropes!"`), enter('climb', `${n} is climbing in. This might take a minute. Or four.`)];
      case 'zoomer': return [walk(70), anim('dance', 1.8, `${n} is doing a dance. It's... it's something.`), anim('film', 1.0, `${n} is filming a vertical video of the entrance instead of entering.`), walk(ENTRY_X, 'walk', 1.2), enter('jump')];
      case 'ghost': return [walk(ENTRY_X, 'float', 0.8, { alpha: 0.75 }), anim('float', 0.6, `A cold wind blows. ${n} is here. Is this allowed?`), enter('float', `${n} passes THROUGH the ropes. The ref is confused.`)];
      case 'salesman': return [walk(50), anim('handshake', 1.0, `${n} is shaking hands with the front row.`), walk(120), anim('handshake', 1.0, `${n} just sold someone a timeshare. Mid-entrance.`), walk(ENTRY_X), enter('climb')];
      case 'baby': return [walk(ENTRY_X, 'crawl', 0.5), anim('cower', 1.2, `${n} is crying. WAAAAH.`, 'boo'), enter('crawl', `${n} is lifted over the rope like luggage.`)];
      case 'robot': return [walk(100, 'robot', 0.9), anim('stunned', 1.1, `${n} is buffering. Please wait.`, 'glitch'), walk(ENTRY_X, 'robot', 0.9), enter('jump', `${n} enters. Stiffly.`)];
      case 'wizard': return [walk(110), anim('cast', 1.3, `${n} is casting a spell. Nothing is happening. ${P.char.pron(f.ch).subj} seems pleased.`, 'magic'), walk(ENTRY_X), enter('teleport', `${n} teleports! Only 230 feet off target this time!`)];
      case 'cop': return [walk(ENTRY_X, 'segway', 1.5), anim('yell', 0.9, `${n}: "Tickets please! TICKETS!"`), enter('climb')];
      case 'chef': return [walk(ENTRY_X, 'walk', 1.6), anim('yell', 1.0, `${n}: "IT'S RAAAAW!"`), enter('jump')];
    }
    return [walk(ENTRY_X), enter('jump')];
  };

  // ---------------- spawning ----------------
  Rm.spawn = () => {
    const q = Rm.queue.shift(); if (!q) return;
    const f = { ch: q.ch, n: q.n, x: SPAWN_X, z: 0.5, y: 0, hp: Rm.settings.hp, maxHp: Rm.settings.hp, state: 'entering', st: 0, facing: 1, target: null, cool: U.rand(0.3, 1), buffs: {}, elims: 0, hitBy: null, vx: 0, alpha: 1, animName: 'walk', animT: 0, animOpts: {}, popupT: 0, stars: 0, lying: 0 };
    f.script = Rm.script(f); f.si = 0; f.stepT = 0;
    Rm.fighters.push(f); Rm.entered++;
    A.sfx('buzzer'); A.playCharSong(f.ch);
    N.say(N.fmt(P.data.ENTER_LINES, null, null, { name: f.ch.name, tag: P.char.tagline(f.ch), n: f.n, home: f.ch.hometown }), { big: true });
    N.say(U.fmt(U.pick(P.data.persona(f.ch.persona).intro), { name: f.ch.name }));
    A.say(P.char.introSpeech(f.ch, f.n), { pitch: 0.6, rate: 1.05 }).then(() => { if (Rm.running && f.ch.catchphrase) return A.say(`${f.ch.catchphrase}`, { pitch: f.ch.voice.pitch, rate: f.ch.voice.rate, interrupt: false }); });
    Rm.nextEntry = Rm.settings.interval;
    Rm.updateHud();
  };

  const setAnim = (f, name, opts) => { if (f.animName !== name) { f.animName = name; f.animT = 0; } f.animOpts = opts || {}; };
  const active = () => Rm.fighters.filter(f => ['idle', 'move', 'windup', 'strike', 'recover', 'hit', 'stun', 'down', 'taunt'].includes(f.state));
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
  const resolveHit = (f, t) => {
    const mv = pickMove(f);
    let hitChance = 0.82; if (f.buffs.blind > 0) hitChance = 0.2; if (t.state === 'down' || t.state === 'stun') hitChance = 1;
    if (!U.chance(hitChance)) { popup(f.x + f.facing * 40, footY(f.z) - 140, 'MISS', '#aaa', 26); if (U.chance(0.35)) N.say(N.fmt(P.data.MISS_LINES, f.ch, t.ch)); A.sfx('whoosh'); return; }
    let dmg = U.randi(mv.dmg[0], mv.dmg[1]);
    if (f.buffs.rage > 0) dmg *= 2; if (f.buffs.ghost > 0) dmg = Math.round(dmg * 1.5); if (t.buffs.shield > 0) dmg = Math.round(dmg / 2);
    t.hp -= dmg; t.hitBy = f; t.vx = f.facing * (mv.knock ? 260 : 120); t.facing = -f.facing;
    popup(t.x, footY(t.z) - 150 * zScale(t.z) * 2, U.pick(mv.fx), mv.big ? '#ff3b3b' : '#ffd23f', mv.big ? 46 : 32);
    popup(t.x + 30, footY(t.z) - 60, '-' + dmg, '#fff', 22);
    burst(t.x, footY(t.z) - 80, mv.low ? '#f0f' : null, mv.big ? 18 : 8);
    A.sfx(mv.sfx); if (mv.big) A.sfx('ooh');
    if (U.chance(mv.talk ?? (mv.big ? 1 : 0.4))) N.say(N.fmt(mv.lines, f.ch, t.ch), { big: mv.big });
    if (mv.knock) { t.state = 'down'; t.st = 0; t.timer = mv.knock; t.lying = -f.facing; }
    else if (mv.stun) { t.state = 'stun'; t.st = 0; t.timer = mv.stun; }
    else { t.state = 'hit'; t.st = 0; t.timer = 0.35; }
    if (t.hp <= 0) eliminate(t, f);
    else if (t.hp < 25 && U.chance(0.25)) N.say(N.fmt(P.data.HURT_LINES, f.ch, t.ch));
  };
  const eliminate = (t, by) => {
    t.state = 'flying'; t.st = 0; t.hp = 0; t.fromX = t.x; t.fromZ = t.z;
    t.outX = t.x < W / 2 ? U.rand(60, 170) : U.rand(1110, 1220); t.outZ = 1.2;
    A.sfx('big'); A.sfx('cheer'); burst(t.x, footY(t.z) - 100, '#fff', 20);
    if (by) { by.elims++; Rm.elims[by.ch.id] = (Rm.elims[by.ch.id] || 0) + 1; N.say(N.fmt(P.data.ELIM_LINES, by.ch, t.ch), { big: true, cls: 'elim' }); }
    else N.say(N.fmt(P.data.SELF_ELIM_LINES, null, t.ch), { big: true, cls: 'elim' });
    A.say(`${t.ch.name} has been eliminated!`, { pitch: 0.6, rate: 1.1, interrupt: false });
    Rm.updateHud();
  };

  // ---------------- lucky events ----------------
  const lucky = () => {
    const pool = active(); if (!pool.length) return;
    const ev = U.pick(P.data.LUCKY); const f = U.pick(pool);
    const apply = (x) => { if (ev.dur) x.buffs[ev.id] = ev.dur; if (ev.heal) { x.hp = Math.min(x.maxHp, x.hp + ev.heal); popup(x.x, footY(x.z) - 120, '+' + ev.heal, '#5f5', 30); } if (ev.stun) { if (!['flying', 'out'].includes(x.state)) { x.state = 'stun'; x.st = 0; x.timer = ev.stun; } } };
    if (ev.global) { Rm.globals[ev.id] = ev.dur || 0; pool.forEach(apply); } else apply(f);
    N.say('🍀 ' + N.fmt(ev.text, f.ch, f.ch), { big: true, cls: 'lucky' });
    popup(ev.global ? W / 2 : f.x, ev.global ? 120 : footY(f.z) - 200, ev.global ? 'CHAOS!' : 'LUCKY!', '#5f5', 40);
    A.sfx(ev.id === 'quake' ? 'crash' : ev.id === 'chair' ? 'chair' : 'ding');
  };

  // ---------------- update ----------------
  Rm.update = (dt) => {
    Rm.t += dt;
    if (Rm.queue.length) { Rm.nextEntry -= dt; if (Rm.nextEntry <= 0) Rm.spawn(); }
    for (const k in Rm.globals) Rm.globals[k] = Math.max(0, Rm.globals[k] - dt);
    Rm.luckyT -= dt; if (Rm.luckyT <= 0 && active().length >= 2) { lucky(); Rm.luckyT = (8 + U.rand(0, 10)) / Rm.settings.chaos; }
    Rm.idleChatter -= dt; if (Rm.idleChatter <= 0) { N.say(U.pick(P.data.IDLE_LINES)); Rm.idleChatter = U.rand(14, 30); }
    const slide = Rm.globals.slurpee > 0;

    for (const f of Rm.fighters) {
      f.st += dt; f.animT += dt;
      for (const k in f.buffs) f.buffs[k] = Math.max(0, f.buffs[k] - dt);
      const speedMul = (f.buffs.beer > 0 ? 1.8 : 1) * (slide ? 1.6 : 1);
      switch (f.state) {
        case 'entering': {
          const step = f.script[f.si]; if (!step) { f.state = 'idle'; f.st = 0; break; }
          f.stepT += dt;
          if (step.type === 'walk') {
            setAnim(f, step.anim); f.facing = step.back ? -1 : 1; if (step.alpha) f.alpha = step.alpha;
            const dir = Math.sign(step.to - f.x); f.x += dir * 110 * step.speed * dt; if (step.zig) f.z = 0.5 + Math.sin(f.stepT * 3) * 0.2;
            if ((dir > 0 && f.x >= step.to) || (dir < 0 && f.x <= step.to) || dir === 0) { f.x = step.to; f.si++; f.stepT = 0; }
          } else if (step.type === 'anim') {
            if (f.stepT === dt) { if (step.say) N.say(step.say); if (step.sfx) A.sfx(step.sfx); }
            setAnim(f, step.anim); f.facing = 1;
            if (f.stepT >= step.dur) { f.si++; f.stepT = 0; }
          } else if (step.type === 'fall') {
            if (f.stepT === dt) { if (step.say) N.say(step.say); A.sfx('thud'); }
            setAnim(f, 'lying', { dir: 1, expr: 'happy' });
            if (f.stepT >= step.dur) { f.si++; f.stepT = 0; }
          } else if (step.type === 'enter') {
            const durs = { jump: 0.9, dive: 0.8, climb: 1.6, trip: 1.1, shoved: 0.9, float: 1.4, crawl: 1.3, teleport: 1.2 }; const dur = durs[step.style] || 1;
            const p = U.clamp(f.stepT / dur, 0, 1);
            if (f.stepT === dt) { if (step.say) N.say(step.say); A.sfx(step.style === 'teleport' ? 'magic' : step.style === 'float' ? 'ooh' : 'whoosh'); A.stopSong(); }
            f.x = U.lerp(ENTRY_X, INSIDE_X, p); f.z = U.lerp(0.5, 0.55, p); f.facing = 1;
            const arc = { jump: 150, dive: 140, climb: 60, trip: 120, shoved: 160, float: 30, crawl: 130, teleport: 0 }[step.style];
            f.jump = -Math.sin(p * Math.PI) * arc;
            if (step.style === 'jump') setAnim(f, 'jump'); else if (step.style === 'dive') setAnim(f, 'dive'); else if (step.style === 'climb') { setAnim(f, 'climb', { p }); } else if (step.style === 'trip' || step.style === 'shoved') { setAnim(f, 'fly', { spin: 7 }); } else if (step.style === 'float') setAnim(f, 'float'); else if (step.style === 'crawl') setAnim(f, 'jump'); else if (step.style === 'teleport') { setAnim(f, 'cast'); f.alpha = p < 0.5 ? 1 - p * 2 : (p - 0.5) * 2; f.x = p < 0.5 ? ENTRY_X : INSIDE_X; }
            if (p >= 1) {
              f.jump = 0; f.alpha = 1; f.si++; f.stepT = 0; f.state = 'idle'; f.st = 0; f.cool = 0.6; A.sfx('thud'); burst(f.x, footY(f.z), '#ccc', 10);
              if (['dive', 'trip', 'shoved'].includes(step.style)) { f.state = 'down'; f.timer = 0.8; f.lying = 1; }
              if (f.ch.persona === 'ghost') f.alpha = 0.85;
            }
          }
          break;
        }
        case 'idle': case 'move': {
          f.hp = Math.min(f.maxHp, f.hp + 0.8 * dt); f.cool -= dt;
          const os = others(f);
          if (!os.length) { setAnim(f, f.st > 1.5 ? 'taunt' : 'ready'); if (f.st > 5) { f.st = 0; if (U.chance(0.5)) N.say(N.fmt(P.data.TAUNT_LINES, f.ch, null, { t: U.pick(P.data.persona(f.ch.persona).taunts) })); } break; }
          if (!f.target || !os.includes(f.target) || U.chance(0.004)) f.target = U.pick(os);
          const t = f.target, dx = t.x - f.x, dz = t.z - f.z, reach = 70 * zScale(f.z) * 2;
          f.facing = dx >= 0 ? 1 : -1;
          if (Math.abs(dx) > reach || Math.abs(dz) > 0.12) {
            f.state = 'move'; setAnim(f, f.buffs.beer > 0 ? 'run' : 'walk', { speed: 2.4 });
            const sp = 110 * speedMul * dt; f.x += Math.sign(dx) * Math.min(sp, Math.max(0, Math.abs(dx) - reach * 0.8)); f.z += Math.sign(dz) * Math.min(sp / 400, Math.abs(dz));
          } else {
            f.state = 'idle'; setAnim(f, 'ready');
            if (f.cool <= 0) { f.state = 'windup'; f.st = 0; f.move = null; f.animName = ''; }
          }
          break;
        }
        case 'windup': {
          setAnim(f, 'punch', { p: 0 }); if (f.st > 0.22) { f.state = 'strike'; f.st = 0; if (f.target && others(f).includes(f.target)) resolveHit(f, f.target); }
          break;
        }
        case 'strike': {
          const mv = f.lastMove; setAnim(f, 'punch', { p: Math.min(1, f.st / 0.15) });
          if (f.st > 0.25) { f.state = 'recover'; f.st = 0; f.cool = U.rand(0.55, 1.15) / (f.buffs.beer > 0 ? 1.6 : 1); }
          break;
        }
        case 'recover': { setAnim(f, 'ready'); if (f.st > 0.25) { f.state = 'idle'; f.st = 0; } break; }
        case 'hit': { setAnim(f, 'hurt'); if (f.st > f.timer) { f.state = 'idle'; f.st = 0; } break; }
        case 'stun': { setAnim(f, 'stunned'); if (f.st > f.timer) { f.state = 'idle'; f.st = 0; } break; }
        case 'down': { setAnim(f, 'lying', { dir: f.lying || 1 }); if (f.st > f.timer) { f.state = 'idle'; f.st = 0; f.cool = 0.4; } break; }
        case 'flying': {
          const p = U.clamp(f.st / 1.1, 0, 1); f.x = U.lerp(f.fromX, f.outX, p); f.z = U.lerp(f.fromZ, f.outZ, p); f.jump = -Math.sin(p * Math.PI) * 260; f.facing = f.outX < f.fromX ? -1 : 1;
          setAnim(f, 'fly', { spin: 10 });
          if (p >= 1) { f.state = 'out'; f.st = 0; f.jump = 0; A.sfx('thud'); burst(f.x, footY(f.z), '#bbb', 14); }
          break;
        }
        case 'out': { setAnim(f, 'lying', { dir: 1 }); if (f.st > 2.5) f.alpha = Math.max(0, 1 - (f.st - 2.5) / 1.5); if (f.st > 4.2) f.state = 'gone'; break; }
        case 'winner': { setAnim(f, 'celebrate'); f.facing = 1; if (U.chance(0.15)) burst(U.rand(200, 1080), U.rand(60, 300), null, 2); break; }
      }
      // knockback + friction + ring bounds
      if (f.vx) { f.x += f.vx * dt; f.vx *= slide ? 0.985 : 0.88; if (Math.abs(f.vx) < 5) f.vx = 0; }
      if (slide && ['idle', 'move', 'recover'].includes(f.state) && !f.vx) f.vx = U.rand(-60, 60);
      if (!['entering', 'flying', 'out', 'gone'].includes(f.state)) { const b = ringX(f.z); f.x = U.clamp(f.x, b.left, b.right); f.z = U.clamp(f.z, 0.05, 0.98); }
    }
    // separation so they don't stand inside each other
    const act = active();
    for (let i = 0; i < act.length; i++) for (let j = i + 1; j < act.length; j++) { const a = act[i], b = act[j]; const dx = b.x - a.x; if (Math.abs(dx) < 46 && Math.abs(b.z - a.z) < 0.08) { const push = (46 - Math.abs(dx)) * 0.5 * (dx >= 0 ? 1 : -1) || 1; a.x -= push; b.x += push; } }
    Rm.fighters = Rm.fighters.filter(f => f.state !== 'gone');
    // popups/particles
    for (const p of Rm.popups) { p.t += dt; p.y += p.vy * dt; p.x += p.vx * dt; }
    Rm.popups = Rm.popups.filter(p => p.t < 1.2);
    for (const p of Rm.particles) { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 600 * dt; }
    Rm.particles = Rm.particles.filter(p => p.t < p.life);
    // win check
    if (!Rm.ended && !Rm.queue.length) {
      const flying = Rm.fighters.some(f => f.state === 'flying' || f.state === 'entering');
      if (act.length === 1 && !flying) Rm.win(act[0]);
      else if (act.length === 0 && !flying && Rm.entered > 0) { const last = Rm.fighters.slice().reverse().find(f => f.state === 'out'); Rm.win(last || Rm.fighters[0], true); }
    }
    if (Rm.frameCount % 20 === 0) Rm.updateHud();
  };

  Rm.win = (f, byDefault) => {
    if (!f) return; Rm.ended = true; Rm.winner = f; f.state = 'winner'; f.st = 0; f.alpha = 1; f.x = 640; f.z = 0.6; f.hp = Math.max(f.hp, 1);
    A.sfx('bell'); A.sfx('yay'); A.crowd(1); A.playCharSong(f.ch);
    const tag = P.char.tagline(f.ch);
    N.say(N.fmt(P.data.WINNER_LINES, f.ch, null, { name: f.ch.name, tag, obj: P.char.pron(f.ch).obj }), { big: true, cls: 'win' });
    if (byDefault) N.say('Technically everyone got eliminated, so the last one out wins. Those are the rules. I just made them up.');
    A.say(`And the winner of Punchma is... ${f.ch.name}! The ${tag}!`, { pitch: 0.6, rate: 1.0 });
    for (let i = 0; i < 120; i++) Rm.particles.push({ x: U.rand(0, W), y: U.rand(-300, 0), vx: U.rand(-40, 40), vy: U.rand(60, 160), t: 0, life: U.rand(3, 6), c: U.pick(['#ffd23f', '#ff5a5a', '#7bd7ff', '#5f5', '#f6f']), r: U.rand(4, 9) });
    if (Rm.onEnd) setTimeout(() => Rm.onEnd(f), 1500);
  };

  // ---------------- HUD ----------------
  Rm.updateHud = () => {
    const el = document.getElementById('hud-list'); if (!el) return;
    const rows = Rm.fighters.filter(f => !['gone'].includes(f.state)).map(f => {
      const out = ['flying', 'out'].includes(f.state); const pct = U.clamp(f.hp / f.maxHp * 100, 0, 100);
      const buffs = Object.keys(f.buffs).filter(k => f.buffs[k] > 0).map(k => ({ chair: '🪑', rage: '😡', blind: '🕶️', beer: '🍺', ghost: '👻', shield: '🛡️' }[k] || '✨')).join('');
      return `<div class="hrow${out ? ' out' : ''}${f.state === 'winner' ? ' win' : ''}"><span class="hn">#${f.n}</span><span class="hname">${U.esc(f.ch.name)}</span><span class="hb">${buffs}</span><span class="hbar"><i style="width:${pct}%;background:${pct > 50 ? '#5f5' : pct > 25 ? '#ffd23f' : '#f55'}"></i></span></div>`;
    }).join('');
    el.innerHTML = rows || '<div class="muted">Waiting for the first idiot...</div>';
    const nx = document.getElementById('hud-next'); if (nx) nx.textContent = Rm.queue.length ? `Next entrant in ${Math.max(0, Math.ceil(Rm.nextEntry))}s (${Rm.entered}/${Rm.total})` : Rm.ended ? 'IT\'S OVER' : `All ${Rm.total} in the ring. Last one standing wins.`;
  };

  // ---------------- drawing ----------------
  Rm.frameCount = 0;
  Rm.frame = (now) => {
    if (!Rm.running) return;
    let dt = Math.min(0.05, (now - Rm.last) / 1000); Rm.last = now; Rm.frameCount++;
    if (!Rm.paused) { const steps = Rm.speed; for (let i = 0; i < steps; i++) Rm.update(dt); }
    Rm.render();
    requestAnimationFrame(Rm.frame);
  };
  Rm.render = () => {
    const ctx = Rm.ctx; ctx.clearRect(0, 0, W, H);
    // arena
    const grd = ctx.createLinearGradient(0, 0, 0, H); grd.addColorStop(0, '#1a1030'); grd.addColorStop(1, '#3a2a55'); ctx.fillStyle = grd; ctx.fillRect(0, 0, W, H);
    // spotlights
    ctx.save(); ctx.globalAlpha = 0.08; ctx.fillStyle = '#fff'; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(300 + i * 340, 0); ctx.lineTo(120 + i * 340 + Math.sin(Rm.t + i) * 40, 700); ctx.lineTo(480 + i * 340 + Math.sin(Rm.t + i) * 40, 700); ctx.closePath(); ctx.fill(); } ctx.restore();
    // crowd
    const excite = Math.min(1, active().length / 4);
    for (const c of Rm.crowd) { const bob = Math.sin(Rm.t * (4 + excite * 6) + c.ph) * (2 + excite * 6); D.circle(ctx, c.x, c.y + bob, 16 * c.s, c.c, 3); ctx.beginPath(); ctx.arc(c.x, c.y + bob - 4, 16 * c.s, Math.PI, 0); ctx.closePath(); ctx.fillStyle = c.hc; ctx.fill(); if (excite > 0.5 && (c.ph * 10 | 0) % 3 === 0) { D.line(ctx, c.x - 20, c.y + bob, c.x - 34, c.y + bob - 28 + Math.sin(Rm.t * 10 + c.ph) * 8, 5, c.c); } }
    D.rect(ctx, 0, 350, W, 400, '#2b2140', 0);
    // sign
    D.text(ctx, 'PUNCHMA', 640, 60, 92, '#ff3b3b'); D.text(ctx, 'ROYAL RUMBLE OF IDIOTS', 640, 118, 28, '#ffd23f');
    // entrance tunnel
    D.rr(ctx, -20, 380, 250, 200, 20, '#111'); D.text(ctx, 'ENTRANCE', 105, 366, 22, '#ffd23f'); D.rect(ctx, 0, 560, 250, 20, '#555', 3);
    // floor
    D.rect(ctx, 0, 690, W, 40, '#3a3a3a', 0);
    // ring mat & apron
    D.poly(ctx, [RING.bl, RING.br, RING.fr, RING.fl], '#e8e0d0', 6);
    D.poly(ctx, [RING.fl, RING.fr, [RING.fr[0], 700], [RING.fl[0], 700]], '#b3262e', 6);
    D.text(ctx, 'PUNCHMA', 640, 672, 40, '#ffd23f');
    ctx.save(); ctx.globalAlpha = 0.5; D.text(ctx, 'P', 640, 555, 120, '#b3262e'); ctx.restore();
    const post = (x, y) => { D.rect(ctx, x - 7, y - RING.post, 14, RING.post, '#333', 3); D.circle(ctx, x, y - RING.post, 10, '#ffd23f', 3); };
    const rope = (a, b, col, lw) => { for (const h of RING.ropes) { ctx.beginPath(); ctx.moveTo(a[0], a[1] - h); ctx.quadraticCurveTo((a[0] + b[0]) / 2, (a[1] + b[1]) / 2 - h + 6, b[0], b[1] - h); ctx.lineWidth = lw + 3; ctx.strokeStyle = D.INK; ctx.stroke(); ctx.lineWidth = lw; ctx.strokeStyle = col; ctx.stroke(); } };
    // back posts+ropes
    post(RING.bl[0], RING.bl[1]); post(RING.br[0], RING.br[1]); rope(RING.bl, RING.br, '#e33', 5);
    // fighters: outside-left first, then side ropes, then inside by z, then front ropes, then out (front floor)
    const fs = Rm.fighters.slice();
    const drawF = (f) => {
      const t = f.animT; let base = R.anim(f.animName, t, f.animOpts) || {};
      const pose = R.pose(Object.assign({ t }, base));
      pose.facing = (base.facing || 1) * f.facing; pose.alpha = f.alpha; if (f.jump) pose.jump = (pose.jump || 0) + f.jump / zScale(f.z);
      if (f.buffs.rage > 0) pose.tint = '#f00'; if (f.buffs.ghost > 0) pose.tint = '#8f8'; if (f.buffs.blind > 0) pose.expr = 'ko';
      const y = footY(f.z), sc = zScale(f.z);
      R.draw(ctx, f.ch, pose, f.x, y, sc);
      const g = R.geo(f.ch), top = y - g.totalH * f.ch.body.height * sc + (f.jump || 0);
      if (!['entering', 'flying', 'out', 'winner'].includes(f.state)) { const pct = U.clamp(f.hp / f.maxHp, 0, 1); D.rr(ctx, f.x - 30, top - 24, 60, 9, 4, '#222', 2); D.rect(ctx, f.x - 29, top - 23, 58 * pct, 7, pct > .5 ? '#5f5' : pct > .25 ? '#ffd23f' : '#f55', 0); }
      if (f.state === 'stun' || f.buffs.blind > 0) { for (let i = 0; i < 3; i++) { const a = t * 5 + i * 2.1; D.star(ctx, f.x + Math.cos(a) * 34, top - 8 + Math.sin(a) * 10, 9, 4, 5, '#ffd23f', 2); } }
      if (f.buffs.chair > 0) { ctx.save(); ctx.translate(f.x + f.facing * 36, y - 80); ctx.rotate(-0.6 * f.facing); D.rect(ctx, -8, -50, 16, 60, '#888', 3); D.rect(ctx, -22, -70, 44, 26, '#888', 3); ctx.restore(); }
      if (f.buffs.shield > 0) { D.circle(ctx, f.x + f.facing * 30, y - 70, 24, '#8a9', 4); }
      if (f.state === 'winner') { D.text(ctx, 'WINNER!', f.x, top - 50 + Math.sin(t * 6) * 6, 40, '#ffd23f'); }
      if (f.state === 'entering' && f.x > 60 && f.x < 700) { D.text(ctx, f.ch.name.toUpperCase(), f.x, top - 34, 22, '#fff'); }
    };
    fs.filter(f => f.state === 'entering' && f.x < ENTRY_X + 40).forEach(drawF);
    rope(RING.bl, RING.fl, '#e33', 5);
    fs.filter(f => !(f.state === 'entering' && f.x < ENTRY_X + 40) && !['out'].includes(f.state) && !(f.state === 'flying' && f.st > 0.6)).sort((a, b) => a.z - b.z).forEach(drawF);
    rope(RING.br, RING.fr, '#e33', 5); post(RING.fl[0], RING.fl[1]); post(RING.fr[0], RING.fr[1]); rope(RING.fl, RING.fr, '#e33', 6);
    fs.filter(f => f.state === 'out' || (f.state === 'flying' && f.st > 0.6)).forEach(drawF);
    // particles & popups
    for (const p of Rm.particles) { ctx.globalAlpha = 1 - p.t / p.life; D.circle(ctx, p.x, p.y, p.r, p.c, 0); } ctx.globalAlpha = 1;
    for (const p of Rm.popups) { ctx.globalAlpha = 1 - p.t / 1.2; D.text(ctx, p.text, p.x, p.y, p.size * (1 + p.t * 0.3), p.color); } ctx.globalAlpha = 1;
    if (Rm.globals.quake > 0) { ctx.save(); ctx.translate(U.rand(-8, 8), U.rand(-8, 8)); ctx.restore(); }
    if (Rm.globals.ref > 0) D.text(ctx, 'REF DISTRACTED: ALL LOW BLOWS', 640, 160, 30, '#f6f');
    if (Rm.globals.slurpee > 0) D.text(ctx, 'SLURPEE FLOOR', 640, 160, 30, '#7bd7ff');
    if (Rm.paused) { ctx.fillStyle = '#0008'; ctx.fillRect(0, 0, W, H); D.text(ctx, 'PAUSED', 640, 360, 90, '#fff'); }
  };
})();
