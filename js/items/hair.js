// Hair styles. Item space: head fit box is (128,128)-(384,384), head center (256,256), top of head y=128.
(function () {
  const D = P.draw, R = P.items.register;
  const H = (id, name, front, back) => R('hair', { id, name, draw: front || (() => {}), drawBack: back });
  const c = (ch) => ch.hair.color;
  H('buzz', 'Buzz Cut', (ctx, ch) => { ctx.beginPath(); ctx.arc(256, 256, 130, Math.PI * 1.05, Math.PI * 1.95); ctx.closePath(); D.fs(ctx, c(ch)); });
  H('bowl', 'Bowl Cut', (ctx, ch) => { ctx.beginPath(); ctx.arc(256, 250, 140, Math.PI, Math.PI * 2); ctx.lineTo(396, 250); ctx.lineTo(116, 250); ctx.closePath(); D.fs(ctx, c(ch)); });
  H('mohawk', 'Mohawk', (ctx, ch) => { D.poly(ctx, [[220, 150], [240, 40], [256, 20], [272, 40], [292, 150]], c(ch)); ctx.beginPath(); ctx.arc(256, 256, 128, Math.PI * 1.3, Math.PI * 1.7); ctx.closePath(); D.fs(ctx, c(ch)); });
  H('afro', 'Afro', null, (ctx, ch) => { D.circle(ctx, 256, 220, 200, c(ch)); });
  H('mullet', 'Mullet', (ctx, ch) => { ctx.beginPath(); ctx.arc(256, 256, 132, Math.PI * 1.05, Math.PI * 1.95); ctx.closePath(); D.fs(ctx, c(ch)); }, (ctx, ch) => { D.poly(ctx, [[150, 220], [362, 220], [400, 420], [340, 440], [300, 400], [256, 450], [212, 400], [172, 440], [112, 420]], c(ch)); });
  H('ponytail', 'Ponytail', (ctx, ch) => { ctx.beginPath(); ctx.arc(256, 256, 132, Math.PI * 1.0, Math.PI * 2); ctx.closePath(); D.fs(ctx, c(ch)); }, (ctx, ch) => { D.poly(ctx, [[110, 220], [150, 240], [100, 420], [60, 400], [40, 300]], c(ch)); });
  H('pigtails', 'Pigtails', (ctx, ch) => { ctx.beginPath(); ctx.arc(256, 256, 132, Math.PI * 1.0, Math.PI * 2); ctx.closePath(); D.fs(ctx, c(ch)); D.circle(ctx, 118, 260, 42, '#e33'); D.circle(ctx, 394, 260, 42, '#e33'); }, (ctx, ch) => { D.ellipse(ctx, 80, 340, 40, 90, c(ch)); D.ellipse(ctx, 432, 340, 40, 90, c(ch)); });
  H('long', 'Long Hair', (ctx, ch) => { ctx.beginPath(); ctx.arc(256, 256, 134, Math.PI * 1.02, Math.PI * 1.98); ctx.closePath(); D.fs(ctx, c(ch)); }, (ctx, ch) => { D.poly(ctx, [[122, 230], [390, 230], [420, 470], [92, 470]], c(ch)); });
  H('spiky', 'Spiky', (ctx, ch) => { const pts = [[128, 260]]; for (let i = 0; i <= 8; i++) { const a = Math.PI + Math.PI * i / 8; pts.push([256 + Math.cos(a) * 135, 256 + Math.sin(a) * 135]); if (i < 8) { const b = Math.PI + Math.PI * (i + .5) / 8; pts.push([256 + Math.cos(b) * 220, 256 + Math.sin(b) * 220]); } } D.poly(ctx, pts, c(ch)); });
  H('combover', 'Comb-Over', (ctx, ch) => { ctx.beginPath(); ctx.moveTo(140, 200); ctx.quadraticCurveTo(200, 120, 380, 175); ctx.lineTo(380, 200); ctx.quadraticCurveTo(260, 165, 150, 220); ctx.closePath(); D.fs(ctx, c(ch)); ctx.beginPath(); ctx.arc(256, 256, 130, Math.PI * 1.75, Math.PI * 1.95); ctx.lineTo(384, 300); ctx.lineTo(370, 260); ctx.closePath(); D.fs(ctx, c(ch)); });
  H('bun', 'Man Bun', (ctx, ch) => { ctx.beginPath(); ctx.arc(256, 256, 132, Math.PI * 1.0, Math.PI * 2); ctx.closePath(); D.fs(ctx, c(ch)); D.circle(ctx, 256, 110, 50, c(ch)); });
  H('curly', 'Curly', (ctx, ch) => { for (let i = 0; i < 9; i++) { const a = Math.PI + Math.PI * i / 8; D.circle(ctx, 256 + Math.cos(a) * 128, 250 + Math.sin(a) * 128, 48, c(ch)); } });
  H('emo', 'Emo Swoop', (ctx, ch) => { ctx.beginPath(); ctx.arc(256, 256, 134, Math.PI * 1.0, Math.PI * 2); ctx.closePath(); D.fs(ctx, c(ch)); D.poly(ctx, [[130, 200], [380, 150], [400, 300], [330, 330], [290, 250], [140, 290]], c(ch)); });
  H('bob', 'The Bob', (ctx, ch) => { D.poly(ctx, [[120, 250], [140, 150], [256, 118], [372, 150], [392, 250], [400, 360], [370, 380], [360, 250], [152, 250], [142, 380], [112, 360]], c(ch)); });
  H('flattop', 'Flat Top', (ctx, ch) => { D.rect(ctx, 122, 110, 268, 110, c(ch)); });
  H('dreads', 'Dreads', (ctx, ch) => { ctx.beginPath(); ctx.arc(256, 256, 132, Math.PI * 1.0, Math.PI * 2); ctx.closePath(); D.fs(ctx, c(ch)); }, (ctx, ch) => { for (let i = 0; i < 9; i++) { const x = 110 + i * 37; D.rr(ctx, x - 12, 220, 26, 180 + (i % 3) * 40, 12, c(ch)); } });
  H('receding', 'Receding', (ctx, ch) => { ctx.beginPath(); ctx.arc(256, 256, 130, Math.PI * 1.02, Math.PI * 1.25); ctx.lineTo(180, 260); ctx.closePath(); D.fs(ctx, c(ch)); ctx.beginPath(); ctx.arc(256, 256, 130, Math.PI * 1.75, Math.PI * 1.98); ctx.lineTo(332, 260); ctx.closePath(); D.fs(ctx, c(ch)); D.circle(ctx, 256, 145, 22, c(ch)); });
  H('beehive', 'Beehive', (ctx, ch) => { D.ellipse(ctx, 256, 90, 120, 150, c(ch)); ctx.beginPath(); ctx.arc(256, 256, 134, Math.PI * 1.0, Math.PI * 2); ctx.closePath(); D.fs(ctx, c(ch)); });
  H('sidepart', 'Side Part', (ctx, ch) => { ctx.beginPath(); ctx.arc(256, 256, 134, Math.PI * 1.0, Math.PI * 2); ctx.closePath(); D.fs(ctx, c(ch)); D.line(ctx, 200, 140, 210, 245, 8, P.util.shade(c(ch), -0.5)); });
  H('cloud', 'Cloud (Old Person)', (ctx, ch) => { D.circle(ctx, 150, 250, 40, '#eee'); D.circle(ctx, 362, 250, 40, '#eee'); D.circle(ctx, 256, 130, 32, '#eee'); });
  H('tentacles', 'Tentacles', null, (ctx, ch) => { for (let i = 0; i < 7; i++) { const x = 120 + i * 45; D.curve(ctx, x, 200, x + (i % 2 ? 80 : -80), 380, x, 470, 34, D.INK); D.curve(ctx, x, 200, x + (i % 2 ? 80 : -80), 380, x, 470, 16, c(ch)); } });
  H('helmethair', 'News Anchor', (ctx, ch) => { D.poly(ctx, [[112, 280], [118, 160], [200, 105], [312, 105], [394, 160], [400, 280], [360, 290], [350, 200], [162, 200], [152, 290]], c(ch)); });
})();
