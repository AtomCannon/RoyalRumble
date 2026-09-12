# PUNCHMA 👊

*Punchma balls.* A browser royal-rumble where wacky, moldable fighters walk out to their own theme song, jump into the ring, and beat each other senseless until one is left. Nobody is better than anybody. Only luck, chaos, and bad decisions.

## Play

No build step, no dependencies. Either:

* open `index.html` in a browser (Chrome/Edge/Firefox/Safari), or
* serve the folder (`python3 -m http.server`) / enable GitHub Pages on this repo. Serving over HTTP also enables PNG item packs (see below).

Click 🎙 **Voices** in the header to pick the announcer and commentator voices (see *Voices* below).

**Admin mode.** Anyone can build fighters, but only the host can start a rumble. Click 🔒 **Admin** and enter the password (`poop`, set in `js/app.js`). Admin also unlocks the extra rumble options, sponsor selection and scripted shows. That way you can send the game to friends, they build fighters and export them, and you import the file and host the show.

## What's in the box

* **Character builder** with 8 body sliders (height, girth, head size, torso, arm and leg length, limb thickness, neck), 9 body types, 8 head shapes, and pickers for hair, hats, eyes, brows, noses, mouths, facial hair, shirts, pants, shoes and accessories (about 190 built-in items). Shirt text, sign text, colours for everything.
* **Taglines**: *Name* the *[Dropdown 1]* *[Dropdown 2]*, ~180 adjectives and ~200 nouns from "Undefeated Warrior" to "Lactose-Intolerant Nintendo Wii", plus free-text if you must. Hometown, weight, gender, pronouns, catchphrase, and a voice pitch/speed for the catchphrase.
* **Walk-on songs**: 18 synthesized built-ins (hype rock, sad trombone, bagpipes, dial-up modem, kid with a recorder...) or upload your own MP3 / paste a URL.
* **Personas** that change the walk-on: Showboat, Coward (gets shoved in by security), Maniac (dives over the rope), Dad, Drunk, Diva, Old Person, Zoomer, Ghost, Salesman, Big Baby, Robot, Wizard, Mall Cop, Angry Chef.
* **The rumble**: random entry order, adjustable entry interval, identical stats for all, 16 moves (including THE TOOT and PUNCHMA BALLS), lucky events (steel chair, banana peel, rage from seeing your ex, a distracted ref, an earthquake), two commentators, over-the-top-rope eliminations, and a winner screen. Stats (wins, eliminations, rumbles) persist per fighter.
* **Custom art**: every slot accepts your own PNG using one universal 512×512 spec. See [`assets/items/README.md`](assets/items/README.md). The builder can download a guide template per slot.

Rosters save to your browser's local storage; use Export/Import to move them around.

## Controls in the ring

Space pauses. `1`, `2`, `4` set speed. `S` skips the pre-show. "Next now" skips the wait for the next entrant (not during an entrance).

## Layout

```
index.html          the whole UI
css/style.css
js/util.js          helpers
js/data/            taglines, personas, moves + commentary lines
js/items/           item system core, built-in art (vector, drawn in the same 512 space as PNGs), manifest loader
js/character.js     character schema, random generator, default roster lives in app.js
js/render.js        rig + animation presets + drawing
js/audio.js         synthesized songs, SFX, snippet rendering
js/voice.js         speech queue, subtitles, TTS engines (browser / local server / in-browser Kokoro)
js/script.js        LLM prompt export, script import + validation, local LLM call
js/rig.js           PNG rig editor, nearest-bone slicer, rigged renderer
js/sponsors.js      sponsor model, editor, logo drawing, ring signage in perspective
js/builder.js       character builder UI
js/rumble.js        simulation: entrances, combat, luck, eliminations, winner
js/app.js           screens, roster storage, setup
assets/items/       PNG spec + manifest for item packs
```
