// Item system core. EVERY item (built-in vector or user PNG) is drawn in a 512x512 "item space".
// The middle square (128,128)-(384,384) is the FIT BOX: it gets stretched onto the body part the item belongs to.
// Anything drawn outside the fit box is "overhang" (wide hair, tall hats, capes) and is allowed to spill.
window.P = window.P || {};

P.SLOTS = {
  hair:   { label: 'Hair',       part: 'head',  layers: ['back', 'front'] },
  hat:    { label: 'Hat',        part: 'head',  layers: ['front'] },
  eyes:   { label: 'Eyes',       part: 'head',  layers: ['front'] },
  brows:  { label: 'Eyebrows',   part: 'head',  layers: ['front'] },
  nose:   { label: 'Nose',       part: 'head',  layers: ['front'] },
  mouth:  { label: 'Mouth',      part: 'head',  layers: ['front'] },
  beard:  { label: 'Facial hair',part: 'head',  layers: ['front'] },
  shirt:  { label: 'Shirt',      part: 'torso', layers: ['front'] },
  pants:  { label: 'Pants',      part: 'leg',   layers: ['front'] },   // drawn once per leg, plus optional hips overlay
  shoes:  { label: 'Shoes',      part: 'foot',  layers: ['front'] },   // drawn once per foot
  extra:  { label: 'Accessory',  part: 'hand',  layers: ['back', 'hand'] }, // back = behind the body (cape), hand = held item
};

P.items = { reg: {}, imgCache: {} };
for (const s in P.SLOTS) P.items.reg[s] = [];
P.items.register = function (slot, item) { item.slot = slot; P.items.reg[slot].push(item); return item; };
P.items.get = function (slot, id) { const list = P.items.reg[slot]; return list.find(i => i.id === id) || list[0]; };
P.items.ids = function (slot) { return P.items.reg[slot].map(i => i.id); };
P.items.img = function (src) { // cache Image objects for data URLs / paths
  if (!src) return null;
  let im = P.items.imgCache[src];
  if (!im) { im = new Image(); im.src = src; P.items.imgCache[src] = im; }
  return im.complete && im.naturalWidth > 0 ? im : null;
};

// ---- drawing helpers (item space) ----
const D = P.draw = {
  LW: 11, INK: '#151515',
  fs(ctx, fill, lw) {
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (lw === undefined) lw = D.LW;
    if (lw) { ctx.lineWidth = lw; ctx.strokeStyle = D.INK; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke(); }
  },
  circle(ctx, x, y, r, fill, lw) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); D.fs(ctx, fill, lw); },
  ellipse(ctx, x, y, rx, ry, fill, lw, rot = 0) { ctx.beginPath(); ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, Math.PI * 2); D.fs(ctx, fill, lw); },
  rect(ctx, x, y, w, h, fill, lw) { ctx.beginPath(); ctx.rect(x, y, w, h); D.fs(ctx, fill, lw); },
  rr(ctx, x, y, w, h, r, fill, lw) { ctx.beginPath(); ctx.roundRect(x, y, w, h, Math.min(r, w / 2, h / 2)); D.fs(ctx, fill, lw); },
  poly(ctx, pts, fill, lw, close = true) { ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); if (close) ctx.closePath(); D.fs(ctx, fill, lw); },
  line(ctx, x1, y1, x2, y2, lw, color) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.lineWidth = lw || D.LW; ctx.strokeStyle = color || D.INK; ctx.lineCap = 'round'; ctx.stroke(); },
  curve(ctx, x1, y1, cx, cy, x2, y2, lw, color) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.quadraticCurveTo(cx, cy, x2, y2); ctx.lineWidth = lw || D.LW; ctx.strokeStyle = color || D.INK; ctx.lineCap = 'round'; ctx.stroke(); },
  text(ctx, str, x, y, size, color, font, align = 'center') {
    ctx.font = `bold ${size}px ${font || 'Impact, "Arial Black", sans-serif'}`; ctx.textAlign = align; ctx.textBaseline = 'middle';
    ctx.lineWidth = Math.max(2, size / 8); ctx.strokeStyle = D.INK; ctx.lineJoin = 'round'; ctx.strokeText(str, x, y);
    ctx.fillStyle = color || '#fff'; ctx.fillText(str, x, y);
  },
  // star polygon
  star(ctx, x, y, r1, r2, n, fill, lw) { const pts = []; for (let i = 0; i < n * 2; i++) { const r = i % 2 ? r2 : r1, a = Math.PI * i / n - Math.PI / 2; pts.push([x + Math.cos(a) * r, y + Math.sin(a) * r]); } D.poly(ctx, pts, fill, lw); },
  // Draw a user PNG item into item space (whole 512 canvas), optionally clipped by a path fn
  png(ctx, src, clipFn) { const im = P.items.img(src); if (!im) return false; ctx.save(); if (clipFn) { clipFn(ctx); ctx.clip(); } ctx.drawImage(im, 0, 0, 512, 512); ctx.restore(); return true; },
  // Run fn with ctx transformed so that item space fit box (128..384) maps onto box {cx,cy,w,h,rot}
  inBox(ctx, box, fn) {
    ctx.save();
    ctx.translate(box.cx, box.cy); if (box.rot) ctx.rotate(box.rot);
    if (box.flip) ctx.scale(-1, 1);
    ctx.scale(box.w / 256, box.h / 256); ctx.translate(-256, -256);
    fn(ctx);
    ctx.restore();
  },
};

// ---- Body & head shape paths in item space (used by the rig and by items that want to fill "the torso") ----
P.shapes = {
  torso: {
    average: (ctx) => { ctx.beginPath(); ctx.roundRect(128, 128, 256, 256, 48); },
    chunky: (ctx) => { ctx.beginPath(); ctx.moveTo(150, 128); ctx.lineTo(362, 128); ctx.bezierCurveTo(430, 200, 440, 330, 380, 384); ctx.lineTo(132, 384); ctx.bezierCurveTo(72, 330, 82, 200, 150, 128); ctx.closePath(); },
    buff: (ctx) => { ctx.beginPath(); ctx.moveTo(96, 128); ctx.lineTo(416, 128); ctx.bezierCurveTo(400, 260, 380, 330, 340, 384); ctx.lineTo(172, 384); ctx.bezierCurveTo(132, 330, 112, 260, 96, 128); ctx.closePath(); },
    pear: (ctx) => { ctx.beginPath(); ctx.moveTo(180, 128); ctx.lineTo(332, 128); ctx.bezierCurveTo(360, 240, 420, 300, 400, 384); ctx.lineTo(112, 384); ctx.bezierCurveTo(92, 300, 152, 240, 180, 128); ctx.closePath(); },
    blob: (ctx) => { ctx.beginPath(); ctx.moveTo(256, 100); ctx.bezierCurveTo(420, 100, 460, 250, 420, 384); ctx.lineTo(92, 384); ctx.bezierCurveTo(52, 250, 92, 100, 256, 100); ctx.closePath(); },
    brick: (ctx) => { ctx.beginPath(); ctx.rect(120, 128, 272, 256); },
    noodle: (ctx) => { ctx.beginPath(); ctx.roundRect(196, 128, 120, 256, 60); },
    triangle: (ctx) => { ctx.beginPath(); ctx.moveTo(256, 118); ctx.lineTo(420, 384); ctx.lineTo(92, 384); ctx.closePath(); },
    egg: (ctx) => { ctx.beginPath(); ctx.ellipse(256, 256, 130, 140, 0, 0, Math.PI * 2); },
  },
  head: {
    round: (ctx) => { ctx.beginPath(); ctx.arc(256, 256, 128, 0, Math.PI * 2); },
    egg: (ctx) => { ctx.beginPath(); ctx.moveTo(256, 128); ctx.bezierCurveTo(330, 128, 384, 200, 384, 270); ctx.bezierCurveTo(384, 350, 320, 384, 256, 384); ctx.bezierCurveTo(192, 384, 128, 350, 128, 270); ctx.bezierCurveTo(128, 200, 182, 128, 256, 128); ctx.closePath(); },
    square: (ctx) => { ctx.beginPath(); ctx.roundRect(128, 128, 256, 256, 40); },
    wide: (ctx) => { ctx.beginPath(); ctx.ellipse(256, 256, 138, 118, 0, 0, Math.PI * 2); },
    tall: (ctx) => { ctx.beginPath(); ctx.ellipse(256, 256, 110, 136, 0, 0, Math.PI * 2); },
    potato: (ctx) => { ctx.beginPath(); ctx.moveTo(200, 140); ctx.bezierCurveTo(300, 110, 390, 170, 380, 250); ctx.bezierCurveTo(400, 320, 330, 390, 250, 380); ctx.bezierCurveTo(170, 390, 120, 330, 140, 260); ctx.bezierCurveTo(120, 200, 150, 150, 200, 140); ctx.closePath(); },
    peanut: (ctx) => { ctx.beginPath(); ctx.moveTo(256, 128); ctx.bezierCurveTo(360, 128, 380, 200, 340, 250); ctx.bezierCurveTo(390, 300, 360, 384, 256, 384); ctx.bezierCurveTo(152, 384, 122, 300, 172, 250); ctx.bezierCurveTo(132, 200, 152, 128, 256, 128); ctx.closePath(); },
    block: (ctx) => { ctx.beginPath(); ctx.rect(128, 140, 256, 244); },
  },
};
P.shapes.torsoAspect = { average: 1, chunky: 1, buff: 1, pear: 1, blob: 1, brick: 1, noodle: 1, triangle: 1, egg: 1 };
P.shapes.headAspect = { round: 1, egg: 1.1, square: 1, wide: 0.85, tall: 1.35, potato: 1.05, peanut: 1.15, block: 1 };

// A "none" item for every slot (hidden). Real items are in the other files.
for (const s in P.SLOTS) P.items.register(s, { id: 'none', name: s === 'hair' ? 'Bald' : s === 'shirt' ? 'Shirtless' : s === 'pants' ? 'Nothing (censored)' : s === 'shoes' ? 'Barefoot' : 'None', draw() {} });
