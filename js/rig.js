// Custom PNG rigs: upload a full-body drawing, drag joint dots onto it, and the drawing is cut into parts that animate
// with the same poses as the built-in cutouts. Every opaque pixel is assigned to its NEAREST bone, so a limb never
// carries a chunk of the torso (or of the other limb). Joints are duplicated into both parts so bends have no gaps.
window.P = window.P || {};
(function () {
  const U = P.util, D = P.draw;
  const Rg = P.rig = { cache: {} };
  Rg.POINTS = [['head', 'Head center', '#ff5a5a'], ['headEdge', 'Head size', '#ff9f9f'], ['neck', 'Neck', '#ffd23f'],
    ['shL', 'Shoulder (back arm)', '#7bd7ff'], ['elL', 'Elbow (back)', '#7bd7ff'], ['haL', 'Hand (back)', '#7bd7ff'],
    ['shR', 'Shoulder (front arm)', '#1f5fbf'], ['elR', 'Elbow (front)', '#1f5fbf'], ['haR', 'Hand (front)', '#1f5fbf'],
    ['hipL', 'Hip (back leg)', '#d9a6ff'], ['ftL', 'Foot (back)', '#d9a6ff'],
    ['hipR', 'Hip (front leg)', '#8a2be2'], ['ftR', 'Foot (front)', '#8a2be2']];
  Rg.BONES = [['head', 'neck'], ['neck', 'shL'], ['neck', 'shR'], ['shL', 'elL'], ['elL', 'haL'], ['shR', 'elR'], ['elR', 'haR'], ['shL', 'hipL'], ['shR', 'hipR'], ['hipL', 'hipR'], ['hipL', 'ftL'], ['hipR', 'ftR']];
  Rg.blank = (src, w, h) => ({ src, w, h, pts: null, limbW: Math.round(w * 0.1), scale: 1, enabled: true, face: false });

  const alphaBox = (img) => {
    const cv = document.createElement('canvas'); cv.width = img.naturalWidth; cv.height = img.naturalHeight;
    const ctx = cv.getContext('2d', { willReadFrequently: true }); ctx.drawImage(img, 0, 0);
    const d = ctx.getImageData(0, 0, cv.width, cv.height).data;
    const rows = new Int32Array(cv.height * 2).fill(-1); // [minX,maxX] per row
    let x0 = cv.width, y0 = cv.height, x1 = -1, y1 = -1;
    for (let y = 0; y < cv.height; y++) { let a = -1, b = -1; for (let x = 0; x < cv.width; x++) { if (d[(y * cv.width + x) * 4 + 3] > 24) { if (a < 0) a = x; b = x; } } rows[y * 2] = a; rows[y * 2 + 1] = b; if (a >= 0) { if (a < x0) x0 = a; if (b > x1) x1 = b; if (y0 > y) y0 = y; y1 = y; } }
    if (x1 < 0) { x0 = 0; y0 = 0; x1 = cv.width - 1; y1 = cv.height - 1; }
    return { data: d, w: cv.width, h: cv.height, rows, x0, y0, x1, y1 };
  };

  // Read the silhouette to place joints: head from the top blob, arms from the widest row, legs from the split at the bottom.
  Rg.guess = (img) => {
    const A = alphaBox(img), W = A.w, H = A.h;
    const top = A.y0, bot = A.y1, height = Math.max(1, bot - top), cx = Math.round((A.x0 + A.x1) / 2);
    const rowW = (y) => A.rows[y * 2] < 0 ? 0 : A.rows[y * 2 + 1] - A.rows[y * 2] + 1;
    const rowC = (y) => A.rows[y * 2] < 0 ? cx : (A.rows[y * 2] + A.rows[y * 2 + 1]) / 2;
    // head: widest row in the top third, then the chin where the silhouette narrows again
    let headY = top, headW = 0;
    for (let y = top; y < top + height * 0.5; y++) { const w = rowW(y); if (w >= headW) { headW = w; headY = y; } else if (w < headW * 0.92 && y > top + height * 0.03) break; }
    const headR = Math.max(6, headW / 2);
    let chinY = Math.round(headY + headR);
    for (let y = headY; y < top + height * 0.5; y++) { if (rowW(y) < headW * 0.62) { chinY = y; break; } }
    // shoulders: first row below the chin that is back up to body width
    let maxBody = 0; for (let y = chinY; y < top + height * 0.7; y++) maxBody = Math.max(maxBody, rowW(y));
    let bodyTop = chinY; for (let y = chinY; y < top + height * 0.6; y++) { if (rowW(y) > maxBody * 0.45) { bodyTop = y; break; } }
    const bodyW = Math.max(8, rowW(Math.min(H - 1, Math.round(bodyTop + height * 0.02))));
    // widest row below the shoulders = the hands
    let wideY = bodyTop, wideW = 0; for (let y = bodyTop; y < top + height * 0.8; y++) { const w = rowW(y); if (w >= wideW) { wideW = w; wideY = y; } }
    // hips: first row in the lower half with a gap down the middle (the legs separating)
    let legY = Math.round(top + height * 0.6);
    const bandL = Math.round(cx - bodyW * 0.35), bandR = Math.round(cx + bodyW * 0.35);
    for (let y = Math.round(top + height * 0.45); y < bot; y++) {
      if (A.rows[y * 2] < 0) continue; let gap = 0;
      for (let x = Math.max(0, bandL); x <= Math.min(W - 1, bandR); x++) if (A.data[(y * W + x) * 4 + 3] <= 24) gap++;
      if (gap > Math.max(3, (bandR - bandL) * 0.05)) { legY = y - height * 0.02; break; }
    }
    legY = Math.round(U.clamp(legY, top + height * 0.45, top + height * 0.75));
    const p = (x, y) => ({ x: Math.round(U.clamp(x, 0, W - 1)), y: Math.round(U.clamp(y, 0, H - 1)) });
    const shY = bodyTop + height * 0.045, shX = bodyW * 0.34;
    const handX = Math.max(shX + bodyW * 0.2, wideW / 2 * 0.88), botC = rowC(Math.max(0, bot - 2));
    const el = (sx, hx) => (sx + hx) / 2 * 1.06;
    const pts = {
      head: p(rowC(headY), headY), headEdge: p(rowC(headY) + headR, headY), neck: p(rowC(headY), (chinY + bodyTop) / 2),
      shL: p(cx - shX, shY), shR: p(cx + shX, shY),
      elL: p(cx - el(shX, handX), (shY + wideY) / 2), elR: p(cx + el(shX, handX), (shY + wideY) / 2),
      haL: p(cx - handX, wideY), haR: p(cx + handX, wideY),
      hipL: p(cx - bodyW * 0.19, legY), hipR: p(cx + bodyW * 0.19, legY),
      ftL: p(botC - bodyW * 0.22, bot - height * 0.02), ftR: p(botC + bodyW * 0.22, bot - height * 0.02),
    };
    return { pts, limbW: Math.max(6, Math.round(Math.min(bodyW * 0.4, height * 0.09))) };
  };

  const inPoly = (px, py, poly) => { let hit = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if ((a.y > py) !== (b.y > py) && px < (b.x - a.x) * (py - a.y) / (b.y - a.y) + a.x) hit = !hit; } return hit; };
  const dist2seg = (px, py, ax, ay, bx, by) => {
    const dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy;
    let t = L > 0 ? ((px - ax) * dx + (py - ay) * dy) / L : 0; t = t < 0 ? 0 : t > 1 ? 1 : t;
    const qx = ax + dx * t - px, qy = ay + dy * t - py; return Math.sqrt(qx * qx + qy * qy);
  };

  // Slice the drawing into parts. Cached per rig definition.
  Rg.build = (ch) => {
    const rig = ch.rig; if (!rig || !rig.src || !rig.pts) return null;
    const key = rig.src.length + '|' + rig.src.slice(-32) + '|' + JSON.stringify(rig.pts) + '|' + rig.limbW + '|' + (rig.scale || 1);
    if (Rg.cache[key]) return Rg.cache[key];
    const img = P.items.img(rig.src); if (!img) return null; // still decoding; try again next frame
    const pt = rig.pts, lw = Math.max(4, rig.limbW || 20);
    const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
    const A = alphaBox(img), W = A.w, H = A.h, data = A.data;
    const headR = Math.max(6, dist(pt.head, pt.headEdge));
    const pelvis = { x: (pt.hipL.x + pt.hipR.x) / 2, y: (pt.hipL.y + pt.hipR.y) / 2 };
    const chest = { x: (pt.shL.x + pt.shR.x) / 2, y: (pt.shL.y + pt.shR.y) / 2 };
    // bones: id, a, b, pull (lower = claims more territory)
    const torsoPoly = [pt.neck, pt.shR, pt.hipR, pt.hipL, pt.shL];
    const BONES = [
      { id: 'torso', a: chest, b: pelvis, pull: 0.85 },
      { id: 'armUpL', a: pt.shL, b: pt.elL, pull: 1 }, { id: 'armLoL', a: pt.elL, b: pt.haL, pull: 1 },
      { id: 'armUpR', a: pt.shR, b: pt.elR, pull: 1 }, { id: 'armLoR', a: pt.elR, b: pt.haR, pull: 1 },
      { id: 'legL', a: pt.hipL, b: pt.ftL, pull: 0.9 }, { id: 'legR', a: pt.hipR, b: pt.ftR, pull: 0.9 },
    ];
    const IDS = ['head', 'torso', 'armUpL', 'armLoL', 'armUpR', 'armLoR', 'legL', 'legR'];
    const label = new Uint8Array(W * H).fill(255);
    const bx = { }; for (const id of IDS) bx[id] = [W, H, -1, -1]; // x0,y0,x1,y1
    const grow = (id, x, y) => { const b = bx[id]; if (x < b[0]) b[0] = x; if (y < b[1]) b[1] = y; if (x > b[2]) b[2] = x; if (y > b[3]) b[3] = y; };
    for (let y = A.y0; y <= A.y1; y++) {
      const l = A.rows[y * 2]; if (l < 0) continue; const r = A.rows[y * 2 + 1];
      for (let x = l; x <= r; x++) {
        if (data[(y * W + x) * 4 + 3] <= 24) continue;
        let id, best;
        if (Math.hypot(x - pt.head.x, y - pt.head.y) <= headR) { id = 'head'; }
        else if (inPoly(x, y, torsoPoly)) { id = 'torso'; }
        else { best = Infinity; for (const bn of BONES) { const d = dist2seg(x, y, bn.a.x, bn.a.y, bn.b.x, bn.b.y) * bn.pull; if (d < best) { best = d; id = bn.id; } } }
        label[y * W + x] = IDS.indexOf(id); grow(id, x, y);
      }
    }
    // Build a canvas per part from the label map, plus a disc of original pixels around its parent joint so bends stay filled.
    // A joint disc copies a little of the neighbouring part in, so a bent joint has no hole. Only pull from the
    // parts that actually meet there: a forearm may borrow from its upper arm, never from the torso.
    const joints = {
      armLoL: [pt.elL, lw * 0.55, ['armLoL', 'armUpL']], armLoR: [pt.elR, lw * 0.55, ['armLoR', 'armUpR']],
      head: [pt.neck, lw * 0.45, ['head', 'torso']],
    };
    const mkPart = (id, anchor) => {
      let [x0, y0, x1, y1] = bx[id];
      const j = joints[id]; if (j) { x0 = Math.min(x0, j[0].x - j[1]); y0 = Math.min(y0, j[0].y - j[1]); x1 = Math.max(x1, j[0].x + j[1]); y1 = Math.max(y1, j[0].y + j[1]); }
      const allow = j ? j[2].map(n => IDS.indexOf(n)) : null;
      if (x1 < x0) { x0 = y0 = 0; x1 = y1 = 1; }
      x0 = Math.max(0, Math.floor(x0) - 1); y0 = Math.max(0, Math.floor(y0) - 1); x1 = Math.min(W - 1, Math.ceil(x1) + 1); y1 = Math.min(H - 1, Math.ceil(y1) + 1);
      const pw = x1 - x0 + 1, ph = y1 - y0 + 1;
      const cv = document.createElement('canvas'); cv.width = pw; cv.height = ph; const c = cv.getContext('2d');
      const out = c.createImageData(pw, ph); const od = out.data; const mine = IDS.indexOf(id);
      const jr2 = j ? j[1] * j[1] : 0;
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const si = (y * W + x) * 4; if (data[si + 3] <= 24) continue;
        let take = label[y * W + x] === mine;
        if (!take && j && allow.includes(label[y * W + x])) { const dx = x - j[0].x, dy = y - j[0].y; if (dx * dx + dy * dy <= jr2) take = true; }
        if (!take) continue;
        const di = ((y - y0) * pw + (x - x0)) * 4;
        od[di] = data[si]; od[di + 1] = data[si + 1]; od[di + 2] = data[si + 2]; od[di + 3] = data[si + 3];
      }
      c.putImageData(out, 0, 0);
      return { cv, ox: x0, oy: y0, ax: anchor.x, ay: anchor.y };
    };
    const seg = (id, a, b) => { const p = mkPart(id, a); p.restA = Math.atan2(b.x - a.x, b.y - a.y); p.len = dist(a, b); return p; };
    const parts = {
      head: mkPart('head', pt.head), torso: mkPart('torso', pelvis),
      armUpL: seg('armUpL', pt.shL, pt.elL), armLoL: seg('armLoL', pt.elL, pt.haL),
      armUpR: seg('armUpR', pt.shR, pt.elR), armLoR: seg('armLoR', pt.elR, pt.haR),
      legL: seg('legL', pt.hipL, pt.ftL), legR: seg('legR', pt.hipR, pt.ftR),
    };
    const feetY = A.y1 + 1, topY = A.y0, bodyH = Math.max(10, feetY - topY);
    const scale = rig.scale || 1, unitH = 210 * scale;
    const out = { parts, origin: { x: pelvis.x, y: feetY }, k: unitH / bodyH, headR, pelvis, shoulderL: pt.shL, shoulderR: pt.shR, totalH: unitH, width: (A.x1 - A.x0) * (unitH / bodyH) * 0.7, handR: lw * 0.5 };
    Rg.cache[key] = out; const keys = Object.keys(Rg.cache); if (keys.length > 16) delete Rg.cache[keys[0]];
    return out;
  };

  // Draw a rigged character using the shared pose vocabulary.
  Rg.draw = (ctx, ch, pose, x, y, scale) => {
    const rig = Rg.build(ch); const s = scale * ch.body.height;
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.globalAlpha = pose.alpha == null ? 1 : pose.alpha;
    if (!rig) { ctx.restore(); return; }
    const k = rig.k, pt = ch.rig.pts, P_ = rig.parts;
    const u = (p) => [(p.x - rig.origin.x) * k, (p.y - rig.origin.y) * k];
    if (pose.shadow !== false && !pose.lying) { ctx.save(); ctx.globalAlpha *= 0.25; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(0, 2, rig.width * 0.5 + 8, 6, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
    P.render.bodyTransform(ctx, pose, { totalH: rig.totalH, torsoW: rig.width });
    const drawPart = (p, ax, ay, rot) => { ctx.save(); ctx.translate(ax, ay); ctx.rotate(rot); ctx.scale(k, k); ctx.drawImage(p.cv, p.ox - p.ax, p.oy - p.ay); ctx.restore(); };
    // A bone drawn at image angle r must end up at pose angle a. Canvas rotate() turns the other way
    // from our angle convention (0 = straight down, increasing = toward the facing side), so the
    // rotation to apply is (r - a), not (a - r).
    const limb = (up, lo, sh, aUp, bend) => {
      const [sx, sy] = u(sh); drawPart(up, sx, sy, up.restA - aUp);
      const ex = sx + Math.sin(aUp) * up.len * k, ey = sy + Math.cos(aUp) * up.len * k;
      const aLo = aUp + bend; drawPart(lo, ex, ey, lo.restA - aLo);
      return [ex + Math.sin(aLo) * lo.len * k, ey + Math.cos(aLo) * lo.len * k];
    };
    const leg = (p, hip, a) => { const [hx, hy] = u(hip); drawPart(p, hx, hy, p.restA - a); };
    if (ch.extra.id !== 'none') { const it = P.items.get('extra', ch.extra.id); if (it.layer === 'back') D.inBox(ctx, { cx: 0, cy: -rig.totalH * 0.55, w: rig.width * 1.6, h: rig.totalH * 0.5 }, (c) => it.draw(c, ch, pose)); }
    limb(P_.armUpL, P_.armLoL, pt.shL, pose.armB, pose.bendB);
    leg(P_.legL, pt.hipL, pose.legB); leg(P_.legR, pt.hipR, pose.legF);
    const [px, py] = u(rig.pelvis); drawPart(P_.torso, px, py, 0);
    const [hx, hy] = u(pt.head); drawPart(P_.head, hx, hy, (pose.lean || 0) * 0.25);
    const headBox = { cx: hx, cy: hy, w: rig.headR * 2 * k, h: rig.headR * 2 * k };
    if (pose.tint) D.inBox(ctx, headBox, (c) => { c.globalAlpha = 0.35; P.shapes.head.round(c); D.fs(c, pose.tint, 0); c.globalAlpha = 1; });
    if (ch.rig.face) for (const slot of ['eyes', 'brows', 'nose', 'mouth', 'beard']) { const it = P.items.get(slot, ch.face[slot]); if (it.draw) D.inBox(ctx, headBox, (c) => it.draw(c, ch, pose)); }
    if (!pose.hideHat && ch.hat.id !== 'none') { const it = P.items.get('hat', ch.hat.id); D.inBox(ctx, headBox, (c) => it.draw(c, ch, pose)); }
    const hand = limb(P_.armUpR, P_.armLoR, pt.shR, pose.armF, pose.bendF);
    if (ch.extra.id !== 'none') { const it = P.items.get('extra', ch.extra.id); if (it.layer !== 'back') D.inBox(ctx, { cx: hand[0], cy: hand[1], w: rig.handR * k * 3, h: rig.handR * k * 3 }, (c) => it.draw(c, ch, pose)); }
    if (pose.fart) { ctx.save(); ctx.globalAlpha = 0.6 * pose.fart; ctx.fillStyle = '#9c6'; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(-rig.width * 0.4 - i * 10 - pose.fart * 20, py + 4 + Math.sin(i * 2 + pose.t * 10) * 6, 8 + i * 3, 0, Math.PI * 2); ctx.fill(); } ctx.restore(); }
    ctx.restore();
  };

  // ---- editor ----
  Rg.editor = (container, ch, onChange) => {
    container.innerHTML = ''; const el = U.el;
    const setRig = (src, w, h) => { const im = new Image(); im.onload = () => { P.items.imgCache[src] = im; const g = Rg.guess(im); ch.rig = { src, w, h, pts: g.pts, limbW: g.limbW, scale: 1, enabled: true, face: false }; Rg.cache = {}; onChange(); Rg.editor(container, ch, onChange); }; im.src = src; };
    const file = el('input', { type: 'file', accept: 'image/png,image/webp', onchange: (e) => { const f = e.target.files[0]; if (!f) return; if (f.size > 3 * 1024 * 1024) { alert('Keep the rig PNG under 3MB.'); return; } const rd = new FileReader(); rd.onload = () => { const im = new Image(); im.onload = () => setRig(rd.result, im.naturalWidth, im.naturalHeight); im.src = rd.result; }; rd.readAsDataURL(f); e.target.value = ''; } });
    container.appendChild(el('p', { class: 'help', html: 'Upload a <b>full-body PNG</b> with a transparent background: standing, facing the viewer, arms a little out from the sides so they can be cut away from the body. Then drag each dot onto the matching joint. Every pixel is given to whichever bone it sits closest to, so accurate dots mean clean limbs.' }));
    container.appendChild(el('div', { class: 'btnrow' }, [file]));
    if (!ch.rig || !ch.rig.src || !ch.rig.pts) return;
    const rig = ch.rig;
    container.appendChild(el('div', { class: 'btnrow' }, [
      el('label', { class: 'mini' }, [el('input', { type: 'checkbox', checked: rig.enabled !== false ? 'checked' : null, onchange: (e) => { rig.enabled = e.target.checked; onChange(); } }), ' use this drawing in game']),
      el('label', { class: 'mini' }, [el('input', { type: 'checkbox', checked: rig.face ? 'checked' : null, onchange: (e) => { rig.face = e.target.checked; onChange(); } }), ' draw built-in face on top']),
      el('button', { class: 'btn small', text: '✨ Auto-place dots', onclick: () => { const im = P.items.img(rig.src); if (im) { const g = Rg.guess(im); rig.pts = g.pts; rig.limbW = g.limbW; Rg.cache = {}; onChange(); draw(); } } }),
      el('button', { class: 'btn small danger', text: '✕ remove drawing', onclick: () => { delete ch.rig; Rg.cache = {}; onChange(); Rg.editor(container, ch, onChange); } }),
    ]));
    const slider = (label, val, min, max, step, on) => { const v = el('b', { text: String(val) }); return el('label', { class: 'ctl' }, [el('span', { class: 'ctl-l' }, [label + ': ', v]), el('input', { type: 'range', min, max, step, value: val, oninput: (e) => { v.textContent = e.target.value; on(+e.target.value); Rg.cache = {}; onChange(); draw(); } })]); };
    container.appendChild(slider('Height in the ring', rig.scale || 1, 0.4, 2.5, 0.05, (v) => rig.scale = v));
    container.appendChild(slider('Joint padding (how much of the drawing travels with each joint)', rig.limbW, 4, Math.round(rig.w * 0.6), 1, (v) => rig.limbW = v));
    const cv = el('canvas', { width: 560, height: 640, class: 'rigcv' }); container.appendChild(cv);
    container.appendChild(el('div', { class: 'legend' }, Rg.POINTS.map(([id, label, col]) => el('span', {}, [el('i', { style: `background:${col}` }), ' ' + label]))));
    const ctx = cv.getContext('2d');
    const fit = Math.min((cv.width - 24) / rig.w, (cv.height - 24) / rig.h), ox = (cv.width - rig.w * fit) / 2, oy = (cv.height - rig.h * fit) / 2;
    const toCv = (p) => [ox + p.x * fit, oy + p.y * fit], toImg = (x, y) => ({ x: Math.round((x - ox) / fit), y: Math.round((y - oy) / fit) });
    let showParts = false;
    const draw = () => {
      ctx.clearRect(0, 0, cv.width, cv.height);
      for (let y = 0; y < cv.height; y += 16) for (let x = 0; x < cv.width; x += 16) { ctx.fillStyle = ((x + y) / 16) % 2 ? '#e8e8e8' : '#fafafa'; ctx.fillRect(x, y, 16, 16); }
      const im = P.items.img(rig.src);
      if (showParts) { const built = Rg.build(ch); if (built) { const cols = { head: '#ff5a5a', torso: '#ffd23f', armUpL: '#7bd7ff', armLoL: '#9ee3ff', armUpR: '#1f5fbf', armLoR: '#4a8fe0', legL: '#d9a6ff', legR: '#8a2be2' }; for (const id in built.parts) { const p = built.parts[id]; ctx.save(); ctx.globalAlpha = 0.85; ctx.drawImage(p.cv, ox + p.ox * fit, oy + p.oy * fit, p.cv.width * fit, p.cv.height * fit); ctx.globalCompositeOperation = 'source-atop'; ctx.fillStyle = cols[id] + '80'; ctx.fillRect(ox + p.ox * fit, oy + p.oy * fit, p.cv.width * fit, p.cv.height * fit); ctx.restore(); } } }
      else if (im) ctx.drawImage(im, ox, oy, rig.w * fit, rig.h * fit);
      ctx.lineCap = 'round'; ctx.lineWidth = Math.max(2, rig.limbW * fit * 0.8); ctx.strokeStyle = 'rgba(31,95,191,0.2)';
      for (const [a, b] of Rg.BONES) { if (a === 'head') continue; const [x1, y1] = toCv(rig.pts[a]), [x2, y2] = toCv(rig.pts[b]); ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
      ctx.lineWidth = 2; ctx.strokeStyle = '#151515';
      for (const [a, b] of Rg.BONES) { const [x1, y1] = toCv(rig.pts[a]), [x2, y2] = toCv(rig.pts[b]); ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
      const [hx, hy] = toCv(rig.pts.head), hr = Math.hypot(rig.pts.head.x - rig.pts.headEdge.x, rig.pts.head.y - rig.pts.headEdge.y) * fit;
      ctx.strokeStyle = '#ff5a5a'; ctx.beginPath(); ctx.arc(hx, hy, hr, 0, 7); ctx.stroke();
      for (const [id, label, col] of Rg.POINTS) { const [x, y] = toCv(rig.pts[id]); D.circle(ctx, x, y, 8, col, 2); }
    };
    container.appendChild(el('div', { class: 'btnrow' }, [el('button', { class: 'btn small', text: '🧩 Show/hide the cut-up parts', onclick: () => { showParts = !showParts; draw(); } })]));
    let drag = null;
    const pos = (e) => { const r = cv.getBoundingClientRect(); const t = e.touches ? e.touches[0] : e; return [(t.clientX - r.left) * cv.width / r.width, (t.clientY - r.top) * cv.height / r.height]; };
    const down = (e) => { const [x, y] = pos(e); let best = null, bd = 20; for (const [id] of Rg.POINTS) { const [px, py] = toCv(rig.pts[id]); const d = Math.hypot(px - x, py - y); if (d < bd) { bd = d; best = id; } } if (best) { drag = best; e.preventDefault(); } };
    const move = (e) => { if (!drag) return; const [x, y] = pos(e); rig.pts[drag] = toImg(x, y); draw(); e.preventDefault(); };
    const up = () => { if (drag) { drag = null; Rg.cache = {}; onChange(); draw(); } };
    cv.addEventListener('mousedown', down); cv.addEventListener('mousemove', move); window.addEventListener('mouseup', up);
    cv.addEventListener('touchstart', down, { passive: false }); cv.addEventListener('touchmove', move, { passive: false }); cv.addEventListener('touchend', up);
    const im = P.items.img(rig.src); if (!im) { const i2 = new Image(); i2.onload = () => { P.items.imgCache[rig.src] = i2; draw(); }; i2.src = rig.src; } draw();
  };
})();
