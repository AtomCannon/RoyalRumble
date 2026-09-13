# Hosting Punchma on your own computer

Opening `index.html` straight from disk works, but everything you make is kept inside the browser.
Running the host instead keeps fighters, sponsors and all their art and audio in a plain folder on your
computer, with no size limit, and lets everyone on your home network open the same page.

## Start it

You need [Node.js](https://nodejs.org) (version 18 or newer). Nothing else — no npm install, no dependencies.

* **macOS / Linux**: double-click `start-host.command`, or in a terminal run `node server.js`
* **Windows**: double-click `start-host.bat`, or in a command prompt run `node server.js`

It prints something like:

```
  PUNCHMA host is up.
  On this computer:   http://localhost:8777
  On your network:    http://192.168.1.24:8777
  Saving to:          data/
  Stop with Ctrl+C.
```

Open the first address on the host machine. Give the second one to anyone on your Wi-Fi and they can
build fighters straight into your roster. Click **💾 Storage** in the game to confirm it says
*This computer (the Punchma host)*.

## Where things are saved

```
data/roster.json      every fighter, with their drawings, song snippets and voice lines
data/sponsors.json    every sponsor, with logos and jingles
```

Those are ordinary JSON files. Copy the `data/` folder to back it up, or to move the whole show to another
machine. They are excluded from git on purpose.

## Options

| Command | What it does |
| --- | --- |
| `node server.js` | Port 8777, reachable from your network |
| `node server.js --port 9000` | Different port |
| `node server.js --host 127.0.0.1` | This computer only, nobody else can connect |
| `node server.js --data shows/friday` | Keep a separate set of saves |

## Running a show with friends

1. Start the host and tell everyone the network address.
2. They each build fighters. Everything lands in your `data/roster.json` as they go.
3. Unlock **🔒 Admin** on your machine (the password is in `js/app.js`). Only you can start a rumble.
4. Pick who is in, set the sponsors and the options, and hit START. Share your screen.

Anyone who is not on your network can still build fighters wherever they are, **Export my fighters**, send
you the file, and you **Import fighters** on the host.

## If you would rather not run the host

The game also works from a plain static host (GitHub Pages, a shared drive, a USB stick) or straight from
disk. In that case it saves into the browser's own database, which holds hundreds of megabytes rather than
the roughly 5 megabytes that the simplest browser storage allows. That is usually plenty, but it lives in
one browser on one machine, so export a backup now and then.
