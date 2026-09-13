# PUNCHMA 👊

*Punchma balls.* A browser royal-rumble where wacky, moldable fighters walk out to their own theme song, jump into the ring, and beat each other senseless until one is left. Nobody is better than anybody. Only luck, chaos, and bad decisions.

## Play

No build step, no dependencies.

* **Quickest:** open `index.html` in a browser (Chrome/Edge/Firefox/Safari).
* **Best, and what you want for a party:** run the host — `node server.js`, or double-click `start-host.command` (macOS/Linux) or `start-host.bat` (Windows) — and open the address it prints. Fighters then save to a `data/` folder on your computer with no size limit, and anyone on your network can open the same page and build fighters straight into your roster. See [HOSTING.md](HOSTING.md).

## Where your fighters are saved

Uploaded drawings, trimmed songs and recorded voice lines are big, and the simplest browser storage only
holds about 5MB, which fills up after a handful of fighters. So the game picks the roomiest place available
and tells you which one it used under **💾 Storage**:

| Where | Room | When it is used |
| --- | --- | --- |
| Your computer, via `node server.js` | No practical limit | Whenever the host is running |
| The browser's own database (IndexedDB) | Hundreds of MB | Opened from disk or any static host |
| Basic browser storage | ~5MB | Only if the other two are blocked |

Anything saved under the old 5MB limit is moved up automatically the first time you open the game. Use
**Export my fighters** for a backup you can keep or hand to someone else.

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
js/store.js         picks where data lives: host server, IndexedDB, or localStorage
server.js           the optional local host (no dependencies)
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
