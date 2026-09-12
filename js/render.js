// Renderer: builds a rig from body sliders, then draws every slot in item space via D.inBox. Feet at (0,0), y grows downward.
window.P = window.P || {};
(function () {
  const D = P.draw, U = P.util;
  const R = P.render = {};

  R.defaultPose = () => ({ t: 0, facing: 1, armF: 0.15, armB: -0.15, bendF: 0, bendB: 0, legF: 0, legB: 0, bob: 0, lean: 0, jump: 0, squash: 1, spin: 0, expr: 'normal', look: 0, alpha: 1, lying: 0, tint: null, fart: 0, shadow: true });

  R.geo = (ch) => {
    const b = ch.body;
    const headAspect = P.shapes.headAspect[b.headShape] || 1;
    const g = {
      legLen: 62 * b.legLength, torsoH: 72 * b.torsoLength, torsoW: 58 * b.girth, neck: 10 * b.neckLength, headR: 30 * b.headSize,
      armUp: 30 * b.armLength, armLo: 28 * b.armLength, limbW: 14 * b.limbThickness,
    };
    g.headH = g.headR * 2 * headAspect; g.handR = g.limbW * 0.75; g.footL = Math.max(18, g.limbW * 2.2); g.footH = Math.max(10, g.limbW * 1.0);
    g.hipY = -g.legLen; g.torsoTop = g.hipY - g.torsoH; g.headCY = g.torsoTop - g.neck - g.headH / 2;
    g.totalH = g.legLen + g.torsoH + g.neck + g.headH; g.shoulderY = g.hipY - g.torsoH * 0.82; g.shoulderX = g.torsoW * 0.32;
    g.width = Math.max(g.torsoW, g.headR * 2) + g.armUp * 0.8;
    if (R.isRigged(ch)) { const rg = P.rig.build(ch); if (rg) { g.totalH = rg.totalH; g.width = rg.width; } }
    return g;
  };

  // Animation presets -> partial pose. t in seconds.
  R.anim = (name, t, o = {}) => {
    const s = Math.sin, k = t * Math.PI * 2;
    switch (name) {
      case 'walk': { const sp = o.speed || 2; return { legF: s(k * sp) * 0.5, legB: -s(k * sp) * 0.5, armF: -s(k * sp) * 0.6, armB: s(k * sp) * 0.6, bendF: 0.3, bendB: 0.3, bob: Math.abs(s(k * sp)) * -3 }; }
      case 'run': return { legF: s(k * 4) * 0.9, legB: -s(k * 4) * 0.9, armF: -s(k * 4) * 1.0, armB: s(k * 4) * 1.0, bendF: 1.2, bendB: 1.2, bob: Math.abs(s(k * 4)) * -6, lean: 0.25 };
      case 'idle': return { bob: s(k * 0.8) * 1.5, armF: 0.15 + s(k * 0.8) * 0.05, armB: -0.15, squash: 1 + s(k * 0.8) * 0.01 };
      case 'ready': return { bob: s(k * 3) * 2, armF: 1.3, bendF: 1.9, armB: 0.9, bendB: 2.0, legF: 0.25, legB: -0.25, lean: 0.1 };
      case 'punch': { const p = o.p ?? 0.5; return { armF: 1.57 * p + 0.3, bendF: (1 - p) * 1.8, armB: 0.6, bendB: 1.8, lean: 0.25 * p, legF: 0.4, legB: -0.3, bob: 0 }; }
      case 'kick': { const p = o.p ?? 0.5; return { legF: 1.5 * p, lean: -0.35 * p, armF: -0.4, armB: 1.0, bendB: 1.0, jump: -4 * p }; }
      case 'headbutt': { const p = o.p ?? 0.5; return { lean: 0.55 * p, armF: -0.3, armB: -0.3, legF: 0.4, legB: -0.3 }; }
      case 'toot': { const p = o.p ?? 0.5; return { facing: -1, lean: -0.4 * p, armF: -0.4, armB: -0.4, squash: 1 - 0.08 * p, fart: p }; }
      case 'suplex': { const p = o.p ?? 0.5; return { lean: -1.2 * p, armF: 2.6, armB: 2.6, bendF: 0.4, bendB: 0.4, jump: -10 * s(p * Math.PI) }; }
      case 'taunt': return { armF: 2.8 + s(k * 4) * 0.3, armB: 2.8 - s(k * 4) * 0.3, bendF: 0.4, bendB: 0.4, bob: Math.abs(s(k * 4)) * -6, expr: 'happy' };
      case 'flex': return { armF: 1.4, bendF: 2.4, armB: 1.4, bendB: 2.4, lean: 0.05, expr: 'happy', bob: s(k * 2) * 2 };
      case 'hurt': return { lean: -0.3, armF: 1.5, armB: 1.5, bendF: 0.5, bendB: 0.5, expr: 'hurt', legF: 0.3, legB: -0.5 };
      case 'stunned': return { lean: s(k * 3) * 0.2, armF: 0.5, armB: -0.5, expr: 'ko', look: s(k * 5) * 10, bob: 0 };
      case 'lying': return { lying: o.dir || 1, expr: o.expr || 'ko', armF: 0.6, armB: -0.6, legF: 0.2, legB: -0.2 };
      case 'fly': return { spin: t * (o.spin || 9), armF: 2.5, armB: 2.5, legF: 0.6, legB: -0.6, expr: 'scared', shadow: false };
      case 'jump': return { legF: 0.4, legB: -0.5, armF: 2.6, armB: 2.6, bendF: 0.3, bendB: 0.3, shadow: false };
      case 'dive': return { lean: 1.2, armF: 2.9, armB: 2.9, legF: -0.3, legB: 0.2, expr: 'angry', shadow: false };
      case 'dance': return { armF: 1.5 + s(k * 6) * 1.2, armB: 1.5 - s(k * 6) * 1.2, bendF: 1.5, bendB: 1.5, legF: s(k * 6) * 0.4, legB: -s(k * 6) * 0.4, bob: Math.abs(s(k * 6)) * -5, lean: s(k * 3) * 0.15, expr: 'happy' };
      case 'crawl': return { lean: 1.35, armF: 2.0 + s(k * 3) * 0.4, armB: 2.0 - s(k * 3) * 0.4, legF: -0.8 + s(k * 3) * 0.3, legB: -0.8 - s(k * 3) * 0.3, bob: -8 };
      case 'float': return { jump: -18 + s(k * 1.5) * 8, armF: 1.2, armB: 1.2, bendF: 1.2, bendB: 1.2, legF: 0.2, legB: -0.2, shadow: false };
      case 'robot': { const st = Math.floor(t * 4) % 2; return { legF: st ? 0.4 : -0.4, legB: st ? -0.4 : 0.4, armF: st ? -0.6 : 0.6, armB: st ? 0.6 : -0.6, bendF: 1.57, bendB: 1.57 }; }
      case 'wobble': return { lean: s(k * 1.7) * 0.35, legF: s(k * 2) * 0.5, legB: -s(k * 2) * 0.5, armF: 0.8 + s(k * 3) * 0.6, armB: 0.8 - s(k * 3) * 0.6, bob: s(k * 2) * 2, expr: 'happy' };
      case 'shuffle': return { legF: s(k * 1.2) * 0.15, legB: -s(k * 1.2) * 0.15, armF: 0.3, armB: 0.3, bendF: 1.2, bendB: 1.2, lean: 0.2, bob: s(k * 1.2) };
      case 'wave': return { armF: 2.9 + s(k * 5) * 0.3, bendF: 0.3, armB: -0.1, expr: 'happy' };
      case 'climb': { const p = o.p ?? 0.5; return { lean: 0.4, legF: 1.2 * s(p * Math.PI), legB: -0.2, armF: 1.6, bendF: 1.0, armB: 1.6, bendB: 1.0, jump: -12 * s(p * Math.PI) }; }
      case 'cower': return { squash: 0.85, lean: -0.15, armF: 2.6, armB: 2.6, bendF: 2.6, bendB: 2.6, expr: 'scared', bob: s(k * 12) * 1.5 };
      case 'handshake': return { armF: 1.4, bendF: 0.2, armB: -0.2, expr: 'happy', bob: s(k * 8) * 1.5 };
      case 'film': return { armF: 1.9, bendF: 0.6, armB: 0.2, expr: 'happy', bob: s(k * 2) };
      case 'cast': return { armF: 2.3 + s(k * 3) * 0.3, bendF: 0.8, armB: 1.0, bendB: 1.8, expr: 'angry', bob: s(k * 3) * 2 };
      case 'segway': return { legF: 0.05, legB: -0.05, armF: 1.3, bendF: 0.4, armB: 1.3, bendB: 0.4, lean: -0.05, bob: s(k * 10) * 0.8 };
      case 'yell': return { armF: 2.4 + s(k * 10) * 0.2, armB: 2.4 - s(k * 10) * 0.2, bendF: 1.5, bendB: 1.5, expr: 'angry', bob: s(k * 10) * 2, lean: 0.15 };
      case 'celebrate': return { armF: 2.8, armB: 2.8, bendF: 0.2, bendB: 0.2, jump: -Math.abs(s(k * 3)) * 22, legF: 0.4, legB: -0.4, expr: 'happy' };
    }
    return {};
  };
  R.pose = (over) => Object.assign(R.defaultPose(), over || {});

  // Shared whole-body transform (lying, spin, jump, facing, lean, squash). Expects ctx already at the feet, scaled to units.
  R.bodyTransform = (ctx, pose, g) => {
    if (pose.lying) { ctx.translate(0, -g.torsoW * 0.35); ctx.rotate(pose.lying * Math.PI / 2 * pose.facing); }
    if (pose.spin) { ctx.translate(0, -g.totalH / 2); ctx.rotate(pose.spin); ctx.translate(0, g.totalH / 2); }
    ctx.translate(0, (pose.jump || 0) + (pose.bob || 0));
    ctx.scale(pose.facing || 1, 1);
    if (pose.lean) ctx.rotate(pose.lean);
    if (pose.squash && pose.squash !== 1) ctx.scale(1 / pose.squash, pose.squash);
  };
  R.isRigged = (ch) => !!(ch.rig && ch.rig.src && ch.rig.enabled !== false && P.rig);

  // Draw a character with feet at (x,y), scale px per unit (before body.height multiplier)
  R.draw = (ctx, ch, pose, x, y, scale) => {
    pose = pose || R.defaultPose();
    if (R.isRigged(ch)) return P.rig.draw(ctx, ch, pose, x, y, scale);
    const g = R.geo(ch), b = ch.body, skin = b.skin, s = scale * b.height;
    const inBox = D.inBox, cust = ch.custom || {};
    ctx.save();
    ctx.translate(x, y); ctx.scale(s, s);
    ctx.globalAlpha = pose.alpha == null ? 1 : pose.alpha;
    if (pose.shadow !== false && !pose.lying) { ctx.save(); ctx.globalAlpha *= 0.25; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(0, 2, g.width * 0.5, 6, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
    R.bodyTransform(ctx, pose, g);

    const draw = (slot, id, box, layer, extraArg) => {
      const cu = cust[slot];
      if (cu && cu.src) { // user PNG overrides the built-in for this slot
        if (layer === 'back') { if (cu.back) inBox(ctx, box, (c) => D.png(c, cu.back)); return; }
        inBox(ctx, box, (c) => D.png(c, cu.src, cu.clip && slot === 'shirt' ? (P.shapes.torso[b.type] || P.shapes.torso.average) : null));
        return;
      }
      const it = P.items.get(slot, id);
      if (layer === 'back') { if (it.drawBack) inBox(ctx, box, (c) => it.drawBack(c, ch, pose, extraArg)); return; }
      if (layer === 'hips') { if (it.drawHips) inBox(ctx, box, (c) => it.drawHips(c, ch, pose, extraArg)); return; }
      if (it.draw) inBox(ctx, box, (c) => it.draw(c, ch, pose, extraArg));
    };
    const limb = (x1, y1, x2, y2, w, color) => { D.line(ctx, x1, y1, x2, y2, w + 3.2, D.INK); D.line(ctx, x1, y1, x2, y2, w, color); };
    const headBox = { cx: 0, cy: g.headCY, w: g.headR * 2, h: g.headH };
    const torsoBox = { cx: 0, cy: g.hipY - g.torsoH / 2, w: g.torsoW, h: g.torsoH };
    const hipBox = { cx: 0, cy: g.hipY + g.legLen / 2, w: g.torsoW * 0.95, h: g.legLen };
    const sleeves = P.char.sleeves(ch);
    const shirtCol = ch.shirt.color;
    const extraIt = P.items.get('extra', ch.extra.id), extraCustom = cust.extra && cust.extra.src;
    const extraLayer = extraCustom ? (cust.extra.layer || 'hand') : extraIt.layer;

    // 1 back accessory
    if (ch.extra.id !== 'none' || extraCustom) { if (extraLayer === 'back') { if (extraCustom) inBox(ctx, torsoBox, (c) => D.png(c, cust.extra.src)); else inBox(ctx, torsoBox, (c) => extraIt.draw(c, ch, pose)); } }
    // 2 back hair
    if (!pose.hideHair) draw('hair', ch.hair.style, headBox, 'back');
    // 3 arms
    const arm = (sx, a, bend, front) => {
      const ex = sx + Math.sin(a) * g.armUp, ey = g.shoulderY + Math.cos(a) * g.armUp;
      const hx = ex + Math.sin(a + bend) * g.armLo, hy = ey + Math.cos(a + bend) * g.armLo;
      limb(sx, g.shoulderY, ex, ey, g.limbW, sleeves !== 'none' ? shirtCol : skin);
      limb(ex, ey, hx, hy, g.limbW * 0.9, sleeves === 'long' ? shirtCol : skin);
      D.circle(ctx, hx, hy, g.handR, skin, 3);
      return { x: hx, y: hy };
    };
    arm(-g.shoulderX, pose.armB, pose.bendB, false);
    // 4/5 legs
    const leg = (hx, a, front) => {
      ctx.save(); ctx.translate(hx, g.hipY); ctx.rotate(a);
      limb(0, 0, 0, g.legLen, g.limbW, skin);
      draw('pants', ch.pants.id, { cx: 0, cy: g.legLen / 2, w: g.limbW, h: g.legLen }, 'front');
      draw('shoes', ch.shoes.id, { cx: g.footL * 0.28, cy: g.legLen - g.footH / 2, w: g.footL, h: g.footH }, 'front');
      ctx.restore();
    };
    leg(-g.torsoW * 0.2, pose.legB, false);
    leg(g.torsoW * 0.2, pose.legF, true);
    // 6 hips overlay (belt/speedo/skirt)
    draw('pants', ch.pants.id, hipBox, 'hips');
    if (ch.pants.id === 'none' && !(cust.pants && cust.pants.src)) inBox(ctx, hipBox, (c) => { D.rect(c, 120, 118, 272, 110, '#111', 0); D.text(c, 'CENSORED', 256, 173, 40, '#fff'); });
    // 7 neck, torso, shirt
    limb(0, g.torsoTop - g.neck - 2, 0, g.torsoTop + 6, g.torsoW * 0.28, skin);
    inBox(ctx, torsoBox, (c) => { (P.shapes.torso[b.type] || P.shapes.torso.average)(c); D.fs(c, skin); });
    draw('shirt', ch.shirt.id, torsoBox, 'front');
    // 8 head
    inBox(ctx, headBox, (c) => { (P.shapes.head[b.headShape] || P.shapes.head.round)(c); D.fs(c, skin); });
    if (pose.tint) inBox(ctx, headBox, (c) => { c.globalAlpha = 0.35; (P.shapes.head[b.headShape] || P.shapes.head.round)(c); D.fs(c, pose.tint, 0); c.globalAlpha = 1; });
    draw('eyes', ch.face.eyes, headBox, 'front'); draw('brows', ch.face.brows, headBox, 'front'); draw('nose', ch.face.nose, headBox, 'front'); draw('mouth', ch.face.mouth, headBox, 'front'); draw('beard', ch.face.beard, headBox, 'front');
    if (!pose.hideHair) draw('hair', ch.hair.style, headBox, 'front');
    if (!pose.hideHat) draw('hat', ch.hat.id, headBox, 'front');
    // 9 front arm + held item
    const hand = arm(g.shoulderX, pose.armF, pose.bendF, true);
    if ((ch.extra.id !== 'none' || extraCustom) && extraLayer === 'hand') {
      const hb = { cx: hand.x, cy: hand.y, w: g.handR * 3, h: g.handR * 3 };
      if (extraCustom) inBox(ctx, hb, (c) => D.png(c, cust.extra.src)); else inBox(ctx, hb, (c) => extraIt.draw(c, ch, pose));
    }
    // fart cloud
    if (pose.fart) { ctx.save(); ctx.globalAlpha = 0.6 * pose.fart; ctx.fillStyle = '#9c6'; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(-g.torsoW * 0.5 - i * 10 - pose.fart * 20, g.hipY + 4 + Math.sin(i * 2 + pose.t * 10) * 6, 8 + i * 3, 0, Math.PI * 2); ctx.fill(); } ctx.restore(); }
    ctx.restore();
  };

  // Fit a full-body render into a canvas (portrait cards, builder preview)
  R.portrait = (canvas, ch, pose, opts = {}) => {
    const ctx = canvas.getContext('2d'); const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    if (opts.bg) { ctx.fillStyle = opts.bg; ctx.fillRect(0, 0, w, h); }
    const g = R.geo(ch), b = ch.body;
    const fitH = opts.fixed ? 230 : g.totalH * b.height + 20, fitW = opts.fixed ? 200 : g.width * b.height * 1.6;
    const scale = Math.min((h * 0.86) / fitH, (w * 0.9) / fitW);
    R.draw(ctx, ch, pose, w / 2, h - h * 0.07, scale);
  };
})();
