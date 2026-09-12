// Custom PNG rigs: upload a full-body drawing, drag 13 joint dots onto it, and the character is sliced into parts that
// animate with the same poses as the built-in cutouts. Left/right are the viewer's left/right in the image; the
// right-side limbs become the "front" limbs when the fighter faces right.
window.P = window.P || {};
(function () {
  const U = P.util, D = P.draw;
  const Rg = P.rig = { cache: {} };
  Rg.POINTS = [['head', 'Head center', '#ff5a5a'], ['headEdge', 'Head edge (size)', '#ff9f9f'], ['neck', 'Neck', '#ffd23f'], ['shL', 'Shoulder L', '#7bd7ff'], ['shR', 'Shoulder R', '#3a7bd5'], ['elL', 'Elbow L', '#7bd7ff'], ['elR', 'Elbow R', '#3a7bd5'], ['haL', 'Hand L', '#7bd7ff'], ['haR', 'Hand R', '#3a7bd5'], ['hipL', 'Hip L', '#c9f'], ['hipR', 'Hip R', '#96f'], ['ftL', 'Foot L', '#c9f'], ['ftR', 'Foot R', '#96f']];
  Rg.BONES = [['head', 'neck'], ['neck', 'shL'], ['neck', 'shR'], ['shL', 'elL'], ['elL', 'haL'], ['shR', 'elR'], ['elR', 'haR'], ['shL', 'hipL'], ['shR', 'hipR'], ['hipL', 'hipR'], ['hipL', 'ftL'], ['hipR', 'ftR']];

  // Guess joint positions from the opaque bounding box of the image
  Rg.guess = (img) => {
    const cv = document.createElement('canvas'); cv.width = img.naturalWidth; cv.height = img.naturalHeight; const ctx = cv.getContext('2d'); ctx.drawImage(img, 0, 0);
    const d = ctx.getImageData(0, 0, cv.width, cv.height).data; let x0 = cv.width, y0 = cv.height, x1 = 0, y1 = 0;
    for (let y = 0; y < cv.height; y += 2) for (let x = 0; x < cv.width; x += 2) if (d[(y * cv.width + x) * 4 + 3] > 20) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (x1 <= x0) { x0 = 0; y0 = 0; x1 = cv.width; y1 = cv.height; }
    const w = x1 - x0, h = y1 - y0, cx = (x0 + x1) / 2, top = y0, bot = y1;
    const p = (x, y) => ({ x: Math.round(x), y: Math.round(y) });
    return { pts: { head: p(cx, top + h * 0.12), headEdge: p(cx + Math.min(w * 0.22, h * 0.1), top + h * 0.12), neck: p(cx, top + h * 0.25), shL: p(cx - w * 0.17, top + h * 0.31), shR: p(cx + w * 0.17, top + h * 0.31), elL: p(cx - w * 0.31, top + h * 0.46), elR: p(cx + w * 0.31, top + h * 0.46), haL: p(cx - w * 0.43, top + h * 0.6), haR: p(cx + w * 0.43, top + h * 0.6), hipL: p(cx - w * 0.1, top + h * 0.63), hipR: p(cx + w * 0.1, top + h * 0.63), ftL: p(cx - w * 0.15, bot - h * 0.03), ftR: p(cx + w * 0.15, bot - h * 0.03) }, limbW: Math.round(Math.max(8, w * 0.12)) };
  };

  // Slice the image into parts (offscreen canvases) using capsule / circle / polygon masks. Cached per rig JSON.
  Rg.build = (ch) => {
    const rig = ch.rig; if (!rig || !rig.src) return null;
    const key = JSON.stringify([rig.src.length, rig.src.slice(-40), rig.pts, rig.limbW]);
    if (Rg.cache[key]) return Rg.cache[key];
    const img = P.items.img(rig.src); if (!img) return null; // not loaded yet; try again next frame
    const P_ = rig.pts, lw = rig.limbW || 20;
    const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
    const headR = Math.max(6, dist(P_.head, P_.headEdge)) * 1.08;
    const part = (maskFn, bbox, anchor) => {
      const x0 = Math.floor(bbox[0]) - 2, y0 = Math.floor(bbox[1]) - 2, w = Math.ceil(bbox[2] - bbox[0]) + 4, h = Math.ceil(bbox[3] - bbox[1]) + 4;
      const cv = document.createElement('canvas'); cv.width = Math.max(1, w); cv.height = Math.max(1, h); const c = cv.getContext('2d');
      const mk = document.createElement('canvas'); mk.width = cv.width; mk.height = cv.height; const m = mk.getContext('2d'); m.translate(-x0, -y0); maskFn(m);
      c.drawImage(img, -x0, -y0); c.globalCompositeOperation = 'destination-in'; c.drawImage(mk, 0, 0); c.globalCompositeOperation = 'source-over';
      return { cv, ox: x0, oy: y0, ax: anchor.x, ay: anchor.y };
    };
    const capsule = (a, b, r1, r2) => ({ mask: (c) => { c.fillStyle = '#000'; c.beginPath(); c.arc(a.x, a.y, r1, 0, 7); c.fill(); c.beginPath(); c.arc(b.x, b.y, r2, 0, 7); c.fill(); c.lineWidth = Math.min(r1, r2) * 2; c.lineCap = 'butt'; c.strokeStyle = '#000'; c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke(); const ang = Math.atan2(b.y - a.y, b.x - a.x), nx = -Math.sin(ang), ny = Math.cos(ang); c.beginPath(); c.moveTo(a.x + nx * r1, a.y + ny * r1); c.lineTo(b.x + nx * r2, b.y + ny * r2); c.lineTo(b.x - nx * r2, b.y - ny * r2); c.lineTo(a.x - nx * r1, a.y - ny * r1); c.closePath(); c.fill(); }, bbox: [Math.min(a.x - r1, b.x - r2), Math.min(a.y - r1, b.y - r2), Math.max(a.x + r1, b.x + r2), Math.max(a.y + r1, b.y + r2)] });
    const seg = (a, b, r1, r2) => { const cp = capsule(a, b, r1, r2); const p = part(cp.mask, cp.bbox, a); p.restA = Math.atan2(b.x - a.x, b.y - a.y); p.len = dist(a, b); p.b = { x: b.x, y: b.y }; return p; };
    const parts = {};
    parts.head = part((c) => { c.fillStyle = '#000'; c.beginPath(); c.arc(P_.head.x, P_.head.y, headR, 0, 7); c.fill(); }, [P_.head.x - headR, P_.head.y - headR, P_.head.x + headR, P_.head.y + headR], P_.head);
    const pelvis = { x: (P_.hipL.x + P_.hipR.x) / 2, y: (P_.hipL.y + P_.hipR.y) / 2 };
    const tp = [P_.shL, P_.shR, P_.hipR, P_.hipL]; const cx = tp.reduce((s, p) => s + p.x, 0) / 4, cy = tp.reduce((s, p) => s + p.y, 0) / 4;
    const poly = tp.map(p => { const dx = p.x - cx, dy = p.y - cy, L = Math.hypot(dx, dy) || 1; return { x: p.x + dx / L * lw * 0.7, y: p.y + dy / L * lw * 0.7 }; });
    poly[0].y -= lw * 0.3; poly[1].y -= lw * 0.3; // reach up to the neck a bit
    const neckTop = { x: P_.neck.x, y: P_.neck.y - lw * 0.2 };
    parts.torso = part((c) => { c.fillStyle = '#000'; c.beginPath(); c.moveTo(poly[0].x, poly[0].y); c.lineTo(neckTop.x - lw * 0.5, neckTop.y); c.lineTo(neckTop.x + lw * 0.5, neckTop.y); c.lineTo(poly[1].x, poly[1].y); c.lineTo(poly[2].x, poly[2].y); c.lineTo(poly[3].x, poly[3].y); c.closePath(); c.fill(); }, [Math.min(...poly.map(p => p.x)), Math.min(neckTop.y, ...poly.map(p => p.y)), Math.max(...poly.map(p => p.x)), Math.max(...poly.map(p => p.y))], pelvis);
    parts.armUpL = seg(P_.shL, P_.elL, lw / 2, lw / 2); parts.armLoL = seg(P_.elL, P_.haL, lw / 2, lw * 0.85);
    parts.armUpR = seg(P_.shR, P_.elR, lw / 2, lw / 2); parts.armLoR = seg(P_.elR, P_.haR, lw / 2, lw * 0.85);
    parts.legL = seg(P_.hipL, P_.ftL, lw * 0.55, lw * 0.95); parts.legR = seg(P_.hipR, P_.ftR, lw * 0.55, lw * 0.95);
    const feetY = (P_.ftL.y + P_.ftR.y) / 2 + lw * 0.6, topY = P_.head.y - headR;
    const bodyH = Math.max(10, feetY - topY);
    const out = { parts, origin: { x: pelvis.x, y: feetY }, k: 200 / bodyH, headR, pelvis, totalH: 200, width: (Math.max(P_.haR.x, P_.shR.x) - Math.min(P_.haL.x, P_.shL.x)) * 200 / bodyH * 0.6 };
    Rg.cache[key] = out; if (Object.keys(Rg.cache).length > 24) delete Rg.cache[Object.keys(Rg.cache)[0]];
    return out;
  };

  // Draw a rigged character with the same pose vocabulary as render.js
  Rg.draw = (ctx, ch, pose, x, y, scale) => {
    const rig = Rg.build(ch); const b = ch.body, s = scale * b.height;
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.globalAlpha = pose.alpha == null ? 1 : pose.alpha;
    if (!rig) { D.text(ctx, 'loading...', 0, -60, 20, '#fff'); ctx.restore(); return; }
    const k = rig.k, pts = ch.rig.pts;
    const u = (p) => [(p.x - rig.origin.x) * k, (p.y - rig.origin.y) * k];
    if (pose.shadow !== false && !pose.lying) { ctx.save(); ctx.globalAlpha *= 0.25; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(0, 2, rig.width * 0.5 + 10, 6, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
    P.render.bodyTransform(ctx, pose, { totalH: 200, torsoW: 50 });
    const drawPart = (p, ax, ay, rot) => { ctx.save(); ctx.translate(ax, ay); ctx.rotate(rot); ctx.scale(k, k); ctx.drawImage(p.cv, p.ox - p.ax, p.oy - p.ay); ctx.restore(); };
    const limb = (up, lo, sh, aUp, bend) => {
      const [sx, sy] = u(sh); const rotU = aUp - up.restA; drawPart(up, sx, sy, rotU);
      const [ex, ey] = [sx + Math.sin(aUp) * up.len * k, sy + Math.cos(aUp) * up.len * k];
      const aLo = aUp + bend; drawPart(lo, ex, ey, aLo - lo.restA);
      return [ex + Math.sin(aLo) * lo.len * k, ey + Math.cos(aLo) * lo.len * k];
    };
    const leg = (p, hip, a) => { const [hx, hy] = u(hip); drawPart(p, hx, hy, a - p.restA); };
    const P_ = rig.parts;
    // back arm, back leg, front leg, torso, head, front arm (viewer's right side is the front)
    limb(P_.armUpL, P_.armLoL, pts.shL, pose.armB, pose.bendB);
    leg(P_.legL, pts.hipL, pose.legB); leg(P_.legR, pts.hipR, pose.legF);
    const [px, py] = u(rig.pelvis); drawPart(P_.torso, px, py, 0);
    const [hx, hy] = u(pts.head); drawPart(P_.head, hx, hy, (pose.lean || 0) * 0.2);
    const headBox = { cx: hx, cy: hy, w: rig.headR * 2 * k, h: rig.headR * 2 * k };
    if (pose.tint) D.inBox(ctx, headBox, (c) => { c.globalAlpha = 0.35; P.shapes.head.round(c); D.fs(c, pose.tint, 0); c.globalAlpha = 1; });
    if (ch.rig.face) for (const slot of ['eyes', 'brows', 'nose', 'mouth', 'beard']) { const it = P.items.get(slot, ch.face[slot]); if (it.draw) D.inBox(ctx, headBox, (c) => it.draw(c, ch, pose)); }
    if (!pose.hideHat && ch.hat.id !== 'none') { const it = P.items.get('hat', ch.hat.id); D.inBox(ctx, headBox, (c) => it.draw(c, ch, pose)); }
    const hand = limb(P_.armUpR, P_.armLoR, pts.shR, pose.armF, pose.bendF);
    if (ch.extra.id !== 'none') { const it = P.items.get('extra', ch.extra.id); if (it.layer === 'hand') D.inBox(ctx, { cx: hand[0], cy: hand[1], w: (ch.rig.limbW || 20) * k * 2.2, h: (ch.rig.limbW || 20) * k * 2.2 }, (c) => it.draw(c, ch, pose)); }
    if (pose.fart) { ctx.save(); ctx.globalAlpha = 0.6 * pose.fart; ctx.fillStyle = '#9c6'; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(-30 - i * 10 - pose.fart * 20, py + 4 + Math.sin(i * 2 + pose.t * 10) * 6, 8 + i * 3, 0, Math.PI * 2); ctx.fill(); } ctx.restore(); }
    ctx.restore();
  };

  // ---- editor (lives inside the builder's "Rig a PNG" tab) ----
  Rg.editor = (container, ch, onChange) => {
    container.innerHTML = '';
    const el = U.el;
    const file = el('input', { type: 'file', accept: 'image/png,image/webp', onchange: (e) => { const f = e.target.files[0]; if (!f) return; if (f.size > 2 * 1024 * 1024) { alert('Keep the rig PNG under 2MB.'); return; } const rd = new FileReader(); rd.onload = () => { const im = new Image(); im.onload = () => { const g = Rg.guess(im); ch.rig = { src: rd.result, w: im.naturalWidth, h: im.naturalHeight, pts: g.pts, limbW: g.limbW, enabled: true, face: false }; delete P.items.imgCache[rd.result]; Rg.cache = {}; onChange(); Rg.editor(container, ch, onChange); }; im.src = rd.result; }; rd.readAsDataURL(f); } });
    container.appendChild(el('p', { class: 'help', html: 'Upload a <b>full-body PNG</b> (transparent background) in an <b>idle pose facing the viewer, arms slightly out at the sides</b>. Then drag the dots onto the joints. The character is cut into head, torso, arms and legs and animates like everyone else. Right-side limbs (viewer\'s right) are the front limbs.' }));
    container.appendChild(el('div', { class: 'btnrow' }, [file]));
    if (!ch.rig || !ch.rig.src) return;
    const rig = ch.rig;
    const bar = el('div', { class: 'btnrow' }, [
      el('label', { class: 'mini' }, [el('input', { type: 'checkbox', checked: rig.enabled !== false ? 'checked' : null, onchange: (e) => { rig.enabled = e.target.checked; onChange(); } }), ' use this rig in game']),
      el('label', { class: 'mini' }, [el('input', { type: 'checkbox', checked: rig.face ? 'checked' : null, onchange: (e) => { rig.face = e.target.checked; onChange(); } }), ' draw built-in face parts on top']),
      el('button', { class: 'btn small', text: 'Auto-place dots', onclick: () => { const im = P.items.img(rig.src); if (im) { const g = Rg.guess(im); rig.pts = g.pts; rig.limbW = g.limbW; Rg.cache = {}; onChange(); draw(); } } }),
      el('button', { class: 'btn small danger', text: '✕ remove rig', onclick: () => { delete ch.rig; Rg.cache = {}; onChange(); Rg.editor(container, ch, onChange); } }),
    ]);
    container.appendChild(bar);
    container.appendChild(el('label', { class: 'ctl' }, [el('span', { class: 'ctl-l', text: 'Limb thickness (px in your image)' }), el('input', { type: 'range', min: 4, max: 200, value: rig.limbW, oninput: (e) => { rig.limbW = +e.target.value; Rg.cache = {}; onChange(); draw(); } })]));
    const cv = el('canvas', { width: 520, height: 600, class: 'rigcv' }); container.appendChild(cv);
    const legend = el('div', { class: 'legend' }, Rg.POINTS.map(([id, label, col]) => el('span', {}, [el('i', { style: `background:${col}` }), ' ' + label]))); container.appendChild(legend);
    const ctx = cv.getContext('2d'); const fit = Math.min((cv.width - 20) / rig.w, (cv.height - 20) / rig.h); const ox = (cv.width - rig.w * fit) / 2, oy = (cv.height - rig.h * fit) / 2;
    const toCv = (p) => [ox + p.x * fit, oy + p.y * fit], toImg = (x, y) => ({ x: Math.round((x - ox) / fit), y: Math.round((y - oy) / fit) });
    const draw = () => {
      ctx.clearRect(0, 0, cv.width, cv.height); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height);
      for (let y = 0; y < cv.height; y += 20) for (let x = 0; x < cv.width; x += 20) if ((x + y) / 20 % 2 === 0) { ctx.fillStyle = '#eee'; ctx.fillRect(x, y, 20, 20); }
      const im = P.items.img(rig.src); if (im) ctx.drawImage(im, ox, oy, rig.w * fit, rig.h * fit);
      ctx.lineWidth = Math.max(2, rig.limbW * fit); ctx.strokeStyle = 'rgba(58,123,213,0.25)'; ctx.lineCap = 'round';
      for (const [a, b] of Rg.BONES) { if (a === 'head') continue; const [x1, y1] = toCv(rig.pts[a]), [x2, y2] = toCv(rig.pts[b]); ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
      ctx.lineWidth = 2; ctx.strokeStyle = '#151515';
      for (const [a, b] of Rg.BONES) { const [x1, y1] = toCv(rig.pts[a]), [x2, y2] = toCv(rig.pts[b]); ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
      const [hx, hy] = toCv(rig.pts.head), r = Math.hypot(rig.pts.head.x - rig.pts.headEdge.x, rig.pts.head.y - rig.pts.headEdge.y) * fit; ctx.beginPath(); ctx.arc(hx, hy, r, 0, 7); ctx.strokeStyle = '#ff5a5a'; ctx.stroke();
      for (const [id, label, col] of Rg.POINTS) { const [x, y] = toCv(rig.pts[id]); D.circle(ctx, x, y, 7, col, 2); }
    };
    let drag = null;
    const pos = (e) => { const r = cv.getBoundingClientRect(); const t = e.touches ? e.touches[0] : e; return [(t.clientX - r.left) * cv.width / r.width, (t.clientY - r.top) * cv.height / r.height]; };
    const down = (e) => { const [x, y] = pos(e); let best = null, bd = 18; for (const [id] of Rg.POINTS) { const [px, py] = toCv(rig.pts[id]); const d = Math.hypot(px - x, py - y); if (d < bd) { bd = d; best = id; } } if (best) { drag = best; e.preventDefault(); } };
    const move = (e) => { if (!drag) return; const [x, y] = pos(e); rig.pts[drag] = toImg(x, y); draw(); e.preventDefault(); };
    const up = () => { if (drag) { drag = null; Rg.cache = {}; onChange(); } };
    cv.addEventListener('mousedown', down); cv.addEventListener('mousemove', move); window.addEventListener('mouseup', up);
    cv.addEventListener('touchstart', down, { passive: false }); cv.addEventListener('touchmove', move, { passive: false }); cv.addEventListener('touchend', up);
    const im = P.items.img(rig.src); if (!im) { const i2 = new Image(); i2.onload = draw; i2.src = rig.src; } draw();
  };
})();
