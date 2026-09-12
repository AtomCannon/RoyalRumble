// Face parts. Head fit box (128,128)-(384,384). Eyes ~y=230, nose ~y=270, mouth ~y=320. Character faces right => "front" is +x.
(function () {
  const D = P.draw, R = P.items.register;
  const E = (id, name, draw) => R('eyes', { id, name, draw });
  const B = (id, name, draw) => R('brows', { id, name, draw });
  const N = (id, name, draw) => R('nose', { id, name, draw });
  const M = (id, name, draw) => R('mouth', { id, name, draw });
  const F = (id, name, draw) => R('beard', { id, name, draw });
  const fc = (ch) => ch.face.facialHairColor || ch.hair.color;
  // expression aware eyes: pose.expr in ['normal','hurt','angry','happy','ko','scared']
  const eyeBall = (ctx, x, y, r, pose, pupil = 0.45) => {
    const ex = pose.expr;
    if (ex === 'ko') { D.line(ctx, x - r, y - r, x + r, y + r, 8); D.line(ctx, x + r, y - r, x - r, y + r, 8); return; }
    D.circle(ctx, x, y, r, '#fff', 7);
    const look = pose.look || 0;
    if (ex === 'hurt') { D.ellipse(ctx, x, y, r * .9, r * .5, '#fff', 0); D.circle(ctx, x + look, y + 4, r * pupil * .8, D.INK, 0); D.line(ctx, x - r, y - r * .6, x + r, y - r * .6, 7); }
    else if (ex === 'happy') { D.circle(ctx, x + look, y, r * pupil * 1.1, D.INK, 0); }
    else if (ex === 'scared') { D.circle(ctx, x + look, y, r * pupil * .5, D.INK, 0); }
    else D.circle(ctx, x + look, y, r * pupil, D.INK, 0);
  };
  E('dots', 'Dots', (ctx, ch, pose) => { if (pose.expr === 'ko') { D.line(ctx, 210, 215, 240, 245, 8); D.line(ctx, 240, 215, 210, 245, 8); D.line(ctx, 280, 215, 310, 245, 8); D.line(ctx, 310, 215, 280, 245, 8); return; } D.circle(ctx, 225, 232, 11, D.INK, 0); D.circle(ctx, 300, 232, 11, D.INK, 0); if (pose.expr === 'hurt') { D.line(ctx, 205, 215, 245, 215, 7); D.line(ctx, 280, 215, 320, 215, 7); } });
  E('big', 'Big Eyes', (ctx, ch, pose) => { eyeBall(ctx, 218, 232, 36, pose); eyeBall(ctx, 300, 232, 36, pose); });
  E('beady', 'Beady', (ctx, ch, pose) => { eyeBall(ctx, 230, 235, 16, pose, .6); eyeBall(ctx, 290, 235, 16, pose, .6); });
  E('crazy', 'Crazy (Uneven)', (ctx, ch, pose) => { eyeBall(ctx, 210, 225, 44, pose, .35); eyeBall(ctx, 300, 240, 22, pose, .7); });
  E('cross', 'Cross-Eyed', (ctx, ch, pose) => { eyeBall(ctx, 218, 232, 34, Object.assign({}, pose, { look: 14 })); eyeBall(ctx, 300, 232, 34, Object.assign({}, pose, { look: -14 })); });
  E('sleepy', 'Sleepy', (ctx, ch, pose) => { eyeBall(ctx, 218, 232, 30, pose); eyeBall(ctx, 300, 232, 30, pose); D.rect(ctx, 186, 200, 66, 30, ch.body.skin, 0); D.rect(ctx, 268, 200, 66, 30, ch.body.skin, 0); D.line(ctx, 190, 230, 250, 230, 8); D.line(ctx, 270, 230, 332, 230, 8); });
  E('shades', 'Sunglasses', (ctx, ch, pose) => { D.rr(ctx, 176, 208, 76, 50, 14, '#111'); D.rr(ctx, 262, 208, 76, 50, 14, '#111'); D.line(ctx, 252, 225, 262, 225, 8); D.line(ctx, 176, 225, 130, 215, 8); D.line(ctx, 200, 218, 220, 216, 6, '#fff'); });
  E('cyclops', 'Cyclops', (ctx, ch, pose) => { eyeBall(ctx, 262, 232, 52, pose, .4); });
  E('googly', 'Googly', (ctx, ch, pose) => { const t = Date.now() / 200; D.circle(ctx, 218, 232, 40, '#fff', 7); D.circle(ctx, 300, 232, 40, '#fff', 7); D.circle(ctx, 218 + Math.cos(t) * 16, 232 + Math.sin(t * 1.3) * 16, 16, D.INK, 0); D.circle(ctx, 300 + Math.cos(t * .8 + 2) * 16, 232 + Math.sin(t) * 16, 16, D.INK, 0); });
  E('wide', 'Wide Awake', (ctx, ch, pose) => { eyeBall(ctx, 214, 232, 40, pose, .25); eyeBall(ctx, 302, 232, 40, pose, .25); });
  E('anime', 'Anime', (ctx, ch, pose) => { D.ellipse(ctx, 218, 236, 34, 46, '#fff', 8); D.ellipse(ctx, 300, 236, 34, 46, '#fff', 8); D.ellipse(ctx, 222, 244, 22, 32, '#3af', 0); D.ellipse(ctx, 304, 244, 22, 32, '#3af', 0); D.circle(ctx, 212, 226, 9, '#fff', 0); D.circle(ctx, 294, 226, 9, '#fff', 0); });
  E('lazy', 'One Lazy Eye', (ctx, ch, pose) => { eyeBall(ctx, 218, 232, 34, pose); eyeBall(ctx, 300, 232, 34, Object.assign({}, pose, { look: -20 })); });
  E('eyepatch', 'Eyepatch', (ctx, ch, pose) => { eyeBall(ctx, 300, 232, 32, pose); D.circle(ctx, 218, 232, 36, '#111', 0); D.line(ctx, 130, 190, 330, 200, 8); });
  E('monocle', 'Monocle', (ctx, ch, pose) => { eyeBall(ctx, 218, 232, 28, pose); eyeBall(ctx, 300, 232, 28, pose); D.circle(ctx, 300, 232, 44, null, 9); D.line(ctx, 330, 265, 350, 340, 6); });
  E('laser', 'Laser Eyes', (ctx, ch, pose) => { D.circle(ctx, 218, 232, 26, '#f22', 7); D.circle(ctx, 300, 232, 26, '#f22', 7); D.circle(ctx, 218, 232, 12, '#fff', 0); D.circle(ctx, 300, 232, 12, '#fff', 0); });
  E('buttons', 'Button Eyes', (ctx, ch, pose) => { D.circle(ctx, 218, 232, 28, '#333', 8); D.circle(ctx, 300, 232, 28, '#333', 8); [[-8, -8], [8, -8], [-8, 8], [8, 8]].forEach(p => { D.circle(ctx, 218 + p[0], 232 + p[1], 4, '#999', 0); D.circle(ctx, 300 + p[0], 232 + p[1], 4, '#999', 0); }); });

  B('flat', 'Flat', (ctx, ch, pose) => { const y = pose.expr === 'angry' ? 8 : 0; D.line(ctx, 188, 190 + y, 248, 190 - y, 12); D.line(ctx, 272, 190 - y, 332, 190 + y, 12); });
  B('angry', 'Angry', (ctx) => { D.line(ctx, 188, 178, 250, 200, 14); D.line(ctx, 332, 178, 270, 200, 14); });
  B('worried', 'Worried', (ctx) => { D.line(ctx, 188, 200, 250, 180, 12); D.line(ctx, 332, 200, 270, 180, 12); });
  B('uni', 'Unibrow', (ctx, ch) => { D.rr(ctx, 176, 176, 160, 30, 14, fc(ch), 8); });
  B('thick', 'Caterpillars', (ctx, ch) => { D.rr(ctx, 180, 170, 70, 36, 14, fc(ch), 8); D.rr(ctx, 268, 170, 70, 36, 14, fc(ch), 8); });
  B('raised', 'One Raised', (ctx) => { D.line(ctx, 188, 192, 248, 190, 12); D.line(ctx, 272, 165, 332, 178, 12); });
  B('drawn', 'Drawn-On', (ctx) => { D.curve(ctx, 180, 200, 218, 150, 256, 200, 8, '#7a2d8c'); D.curve(ctx, 262, 200, 300, 150, 338, 200, 8, '#7a2d8c'); });

  N('dot', 'Dot', (ctx, ch) => { D.circle(ctx, 268, 275, 12, P.util.shade(ch.body.skin, -0.25), 6); });
  N('big', 'Big Honker', (ctx, ch) => { D.circle(ctx, 280, 278, 34, P.util.shade(ch.body.skin, -0.15)); });
  N('pig', 'Pig Snout', (ctx, ch) => { D.ellipse(ctx, 272, 282, 44, 30, '#f7a8c0'); D.circle(ctx, 258, 282, 8, D.INK, 0); D.circle(ctx, 288, 282, 8, D.INK, 0); });
  N('pointy', 'Pointy', (ctx, ch) => { D.poly(ctx, [[262, 245], [340, 285], [262, 300]], P.util.shade(ch.body.skin, -0.1)); });
  N('clown', 'Clown', (ctx) => { D.circle(ctx, 272, 278, 32, '#e22'); D.circle(ctx, 262, 268, 9, '#fff', 0); });
  N('hook', 'Hook', (ctx, ch) => { ctx.beginPath(); ctx.moveTo(262, 245); ctx.quadraticCurveTo(340, 250, 320, 305); ctx.quadraticCurveTo(300, 320, 262, 300); ctx.closePath(); D.fs(ctx, P.util.shade(ch.body.skin, -0.1)); });
  N('button', 'Button', (ctx, ch) => { D.ellipse(ctx, 268, 278, 20, 14, P.util.shade(ch.body.skin, -0.2)); });
  N('ring', 'Nose Ring', (ctx, ch) => { D.circle(ctx, 268, 275, 12, P.util.shade(ch.body.skin, -0.25), 6); D.circle(ctx, 278, 292, 12, null, 7); });
  N('bandaid', 'Band-Aid', (ctx, ch) => { D.circle(ctx, 268, 275, 12, P.util.shade(ch.body.skin, -0.25), 6); D.rr(ctx, 236, 262, 80, 28, 10, '#f0c9a0', 5); });

  const mouthBase = (ctx, pose, fn) => { if (pose.expr === 'hurt' || pose.expr === 'ko') { D.ellipse(ctx, 262, 330, 24, 32, '#5a0a1a'); D.rect(ctx, 240, 300, 44, 14, '#fff', 0); } else if (pose.expr === 'angry') { D.rr(ctx, 210, 310, 108, 38, 8, '#5a0a1a'); for (let i = 0; i < 4; i++) D.rect(ctx, 214 + i * 26, 312, 22, 14, '#fff', 3); } else if (pose.expr === 'happy') { ctx.beginPath(); ctx.arc(262, 310, 50, 0.1, Math.PI - 0.1); ctx.closePath(); D.fs(ctx, '#5a0a1a'); } else if (pose.expr === 'scared') { D.ellipse(ctx, 262, 330, 30, 22, '#5a0a1a'); } else fn(); };
  M('smile', 'Smile', (ctx, ch, pose) => mouthBase(ctx, pose, () => D.curve(ctx, 212, 320, 262, 360, 312, 320, 11)));
  M('frown', 'Frown', (ctx, ch, pose) => mouthBase(ctx, pose, () => D.curve(ctx, 212, 340, 262, 300, 312, 340, 11)));
  M('flat', 'Flat', (ctx, ch, pose) => mouthBase(ctx, pose, () => D.line(ctx, 218, 330, 310, 330, 11)));
  M('open', 'Mouth Breather', (ctx, ch, pose) => mouthBase(ctx, pose, () => D.ellipse(ctx, 262, 335, 30, 26, '#5a0a1a')));
  M('teeth', 'Big Teeth', (ctx, ch, pose) => mouthBase(ctx, pose, () => { D.rr(ctx, 206, 312, 112, 40, 8, '#5a0a1a'); for (let i = 0; i < 4; i++) D.rect(ctx, 212 + i * 26, 314, 24, 20, '#fff', 3); }));
  M('tongue', 'Tongue Out', (ctx, ch, pose) => mouthBase(ctx, pose, () => { D.curve(ctx, 212, 320, 262, 360, 312, 320, 11); D.ellipse(ctx, 275, 352, 22, 26, '#f36', 7); }));
  M('smirk', 'Smirk', (ctx, ch, pose) => mouthBase(ctx, pose, () => D.curve(ctx, 220, 335, 280, 345, 320, 310, 11)));
  M('wobbly', 'Wobbly', (ctx, ch, pose) => mouthBase(ctx, pose, () => { ctx.beginPath(); ctx.moveTo(212, 330); for (let i = 1; i <= 6; i++) ctx.lineTo(212 + i * 17, 330 + (i % 2 ? -12 : 12)); ctx.lineWidth = 11; ctx.strokeStyle = D.INK; ctx.stroke(); }));
  M('buck', 'Buck Teeth', (ctx, ch, pose) => mouthBase(ctx, pose, () => { D.line(ctx, 218, 322, 310, 322, 11); D.rect(ctx, 240, 322, 22, 34, '#fff', 6); D.rect(ctx, 264, 322, 22, 34, '#fff', 6); }));
  M('gold', 'Gold Tooth', (ctx, ch, pose) => mouthBase(ctx, pose, () => { D.rr(ctx, 206, 312, 112, 40, 8, '#5a0a1a'); for (let i = 0; i < 4; i++) D.rect(ctx, 212 + i * 26, 314, 24, 20, i === 2 ? '#ffd23f' : '#fff', 3); }));
  M('lips', 'Big Lips', (ctx, ch, pose) => mouthBase(ctx, pose, () => { D.ellipse(ctx, 262, 330, 50, 26, '#e0306a'); D.line(ctx, 218, 330, 306, 330, 7); }));
  M('pacifier', 'Pacifier', (ctx, ch, pose) => mouthBase(ctx, pose, () => { D.ellipse(ctx, 268, 330, 40, 28, '#7bd'); D.circle(ctx, 268, 330, 14, '#fff', 6); }));
  M('cigar', 'Cigar', (ctx, ch, pose) => mouthBase(ctx, pose, () => { D.line(ctx, 218, 330, 290, 330, 11); D.rr(ctx, 280, 318, 120, 26, 8, '#6b3a1a'); D.circle(ctx, 402, 331, 13, '#f60', 0); }));
  M('drool', 'Drooling', (ctx, ch, pose) => mouthBase(ctx, pose, () => { D.ellipse(ctx, 262, 335, 28, 20, '#5a0a1a'); D.ellipse(ctx, 250, 372, 10, 26, '#aef', 5); }));
  M('mustachio', 'Grin', (ctx, ch, pose) => mouthBase(ctx, pose, () => { ctx.beginPath(); ctx.arc(262, 312, 52, 0.15, Math.PI - 0.15); ctx.closePath(); D.fs(ctx, '#5a0a1a'); D.rect(ctx, 218, 318, 88, 14, '#fff', 3); }));
  M('zipper', 'Zipper', (ctx) => { D.rr(ctx, 206, 318, 112, 26, 6, '#999', 6); for (let i = 0; i < 6; i++) D.line(ctx, 216 + i * 18, 322, 216 + i * 18, 340, 4); });
  M('beak', 'Beak', (ctx) => { D.poly(ctx, [[240, 300], [360, 322], [240, 350]], '#ff9f1c'); });

  F('stache', 'Mustache', (ctx, ch) => { ctx.beginPath(); ctx.moveTo(262, 300); ctx.quadraticCurveTo(300, 280, 340, 310); ctx.quadraticCurveTo(310, 306, 262, 314); ctx.quadraticCurveTo(214, 306, 184, 310); ctx.quadraticCurveTo(224, 280, 262, 300); ctx.closePath(); D.fs(ctx, fc(ch), 7); });
  F('handlebar', 'Handlebar', (ctx, ch) => { D.rr(ctx, 200, 292, 124, 22, 10, fc(ch), 7); D.circle(ctx, 190, 290, 16, fc(ch), 7); D.circle(ctx, 334, 290, 16, fc(ch), 7); });
  F('goatee', 'Goatee', (ctx, ch) => { D.poly(ctx, [[230, 350], [294, 350], [262, 410]], fc(ch), 8); });
  F('beard', 'Full Beard', (ctx, ch) => { ctx.beginPath(); ctx.moveTo(140, 280); ctx.quadraticCurveTo(150, 420, 262, 430); ctx.quadraticCurveTo(374, 420, 384, 280); ctx.quadraticCurveTo(340, 320, 262, 296); ctx.quadraticCurveTo(184, 320, 140, 280); ctx.closePath(); D.fs(ctx, fc(ch)); });
  F('neckbeard', 'Neckbeard', (ctx, ch) => { ctx.beginPath(); ctx.moveTo(150, 330); ctx.quadraticCurveTo(200, 430, 262, 440); ctx.quadraticCurveTo(324, 430, 374, 330); ctx.quadraticCurveTo(262, 400, 150, 330); ctx.closePath(); D.fs(ctx, fc(ch)); });
  F('soul', 'Soul Patch', (ctx, ch) => { D.rr(ctx, 250, 352, 26, 20, 6, fc(ch), 6); });
  F('wizard', 'Wizard Beard', (ctx, ch) => { D.poly(ctx, [[150, 290], [374, 290], [330, 420], [262, 560], [194, 420]], fc(ch)); });
  F('chinstrap', 'Chin Strap', (ctx, ch) => { ctx.beginPath(); ctx.arc(256, 256, 130, Math.PI * 0.12, Math.PI * 0.88); ctx.arc(256, 256, 108, Math.PI * 0.88, Math.PI * 0.12, true); ctx.closePath(); D.fs(ctx, fc(ch), 5); });
  F('stubble', '5 O\'Clock Shadow', (ctx, ch) => { ctx.globalAlpha = 0.35; ctx.beginPath(); ctx.arc(256, 256, 124, Math.PI * 0.1, Math.PI * 0.9); ctx.closePath(); D.fs(ctx, fc(ch), 0); ctx.globalAlpha = 1; });
  F('muttonchops', 'Mutton Chops', (ctx, ch) => { D.poly(ctx, [[134, 230], [180, 230], [200, 360], [150, 350]], fc(ch), 7); D.poly(ctx, [[378, 230], [332, 230], [312, 360], [362, 350]], fc(ch), 7); });
  F('braided', 'Braided Beard', (ctx, ch) => { D.poly(ctx, [[220, 350], [304, 350], [290, 420], [234, 420]], fc(ch), 7); for (let i = 0; i < 4; i++) D.ellipse(ctx, 262, 440 + i * 34, 22, 20, fc(ch), 7); });
})();
