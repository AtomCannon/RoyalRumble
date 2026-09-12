// Optional PNG item packs. Put PNGs in assets/items/<slot>/ and list them in assets/items/manifest.json:
// [{ "slot": "hat", "id": "sombrero_png", "name": "My Sombrero", "src": "assets/items/hat/sombrero.png" },
//  { "slot": "hair", "id": "wig", "name": "Wig", "src": "assets/items/hair/wig_front.png", "back": "assets/items/hair/wig_back.png" },
//  { "slot": "extra", "id": "laser", "name": "Laser", "src": "assets/items/extra/laser.png", "layer": "hand" }]
// Loaded over HTTP only (a browser opening index.html straight from disk blocks fetch; the game still works, just without the pack).
(function () {
  if (location.protocol === 'file:') return;
  fetch('assets/items/manifest.json').then(r => r.ok ? r.json() : []).then(list => {
    if (!Array.isArray(list)) return;
    for (const it of list) {
      if (!P.SLOTS[it.slot] || !it.src || !it.id) continue;
      P.items.register(it.slot, {
        id: it.id, name: it.name || it.id, layer: it.layer || 'hand', sleeves: it.sleeves || 'short', png: true,
        draw: (ctx, ch) => P.draw.png(ctx, it.src, it.clip && it.slot === 'shirt' ? (P.shapes.torso[ch.body.type] || P.shapes.torso.average) : null),
        drawBack: it.back ? (ctx) => P.draw.png(ctx, it.back) : undefined,
        drawHips: it.hips ? (ctx) => P.draw.png(ctx, it.hips) : undefined,
      });
      P.items.img(it.src); if (it.back) P.items.img(it.back); if (it.hips) P.items.img(it.hips);
    }
    if (P.app && P.app.screen === 'roster') P.app.renderRoster();
  }).catch(() => { });
})();
