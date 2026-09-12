# Punchma item PNG spec (universal)

Every piece of art in Punchma, built-in or yours, is drawn in the same **512 × 512 "item space"**.
That is what lets one hat fit a pea-headed gnome and a planet-headed lamp post.

```
(0,0) ┌───────────────────────────────┐
      │        overhang zone          │   anything drawn here is allowed
      │   ┌───────────────────────┐   │   and spills past the body part
      │   │ (128,128)             │   │   (big hats, wide hair, capes)
      │   │      FIT BOX          │   │
      │   │   256 × 256 square    │   │ ← this square is STRETCHED
      │   │   is mapped onto      │   │   onto the body part
      │   │   the body part       │   │
      │   │             (384,384) │   │
      │   └───────────────────────┘   │
      │                               │
      └───────────────────────────────┘ (512,512)
```

* File: **512 × 512 PNG with transparency**. WebP also works.
* Characters face **right**. Draw the front of the item toward +x. The game mirrors it when the fighter turns.
* Thick black outlines (about 10–12 px in the 512 canvas) match the built-in cardboard-cutout look. Not required.
* The fit box is stretched, not scaled uniformly. A chunky body makes your shirt wider. That is a feature.
* The **Custom PNGs** tab in the builder has a "template" button per slot that downloads a guide PNG with the fit box and the body part drawn in.

## What the fit box maps to, per slot

| Slot | Fit box = | Notes |
| --- | --- | --- |
| `hair` | the head | head is a circle centered (256,256) radius 128; top of head at y=128. Optional second PNG for the **back** layer (drawn behind the head). |
| `hat` | the head | most hats live above y≈200 and spill upward. |
| `eyes`, `brows`, `nose`, `mouth`, `beard` | the head | eyes ≈ y 230, nose ≈ y 275, mouth ≈ y 330. |
| `shirt` | the torso | optional "clip to body shape" cuts the PNG to the body-type silhouette. Sleeves are drawn by the game on the arms using the shirt's primary colour; pick none/short/long in the builder. |
| `pants` | **one leg** | hip at y=128, ankle at y=384, leg centered x=256, leg width = 256. The same PNG is drawn on both legs and rotates as they walk. A separate `hips` PNG (belt, skirt, speedo) maps onto the hip box: y=128 is the waist, y=384 is the ankle line. |
| `shoes` | **one foot** | heel at x=128, toe at x=384, sole at y=384, ankle at y=128. Drawn on both feet. |
| `extra` | the front **hand** (layer `hand`) or the **torso** (layer `back`) | for held items (256,256) is the grip point; the item is kept upright, not rotated with the arm. Back-layer items (capes, wings, jetpacks) map onto the torso box. |

## Two ways to add PNGs

1. **Per character**: builder → *Custom PNGs* tab → upload. Stored in the browser with that character (keep files under ~1.5 MB each; export the roster to keep a backup).
2. **As a pack for everyone**: drop files into this folder and list them in `manifest.json`. They show up in the pickers as regular items. Requires the game to be served over HTTP (GitHub Pages, `python3 -m http.server`, etc.), because browsers block `fetch` from `file://`.

```json
[
  { "slot": "hat",   "id": "my_sombrero", "name": "My Sombrero", "src": "assets/items/hat/sombrero.png" },
  { "slot": "hair",  "id": "wig",  "name": "Wig", "src": "assets/items/hair/wig_front.png", "back": "assets/items/hair/wig_back.png" },
  { "slot": "pants", "id": "chaps", "name": "Chaps", "src": "assets/items/pants/chaps_leg.png", "hips": "assets/items/pants/chaps_belt.png" },
  { "slot": "shirt", "id": "band_tee", "name": "Band Tee", "src": "assets/items/shirt/band.png", "clip": true, "sleeves": "short" },
  { "slot": "extra", "id": "laser", "name": "Laser Gun", "src": "assets/items/extra/laser.png", "layer": "hand" }
]
```
