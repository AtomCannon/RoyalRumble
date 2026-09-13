#!/usr/bin/env node
// The Punchma host. Serves the game and keeps the roster, the sponsors and anything friends send
// in plain JSON files under data/, so nothing is stuck inside a browser's small storage box.
//
//   node server.js                 play at http://localhost:8777 and let the local network in
//   node server.js --port 9000     different port
//   node server.js --host 127.0.0.1   this computer only
//
// No dependencies. Node 18 or newer.
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const arg = (name, def) => { const i = process.argv.indexOf('--' + name); return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : def; };
const PORT = +arg('port', 8777);
const HOST = arg('host', '0.0.0.0');
const ROOT = __dirname;
const DATA = path.join(ROOT, arg('data', 'data'));
const MAX_BODY = 256 * 1024 * 1024;               // one roster with a lot of art and audio

fs.mkdirSync(DATA, { recursive: true });

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.m4a': 'audio/mp4', '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8', '.md': 'text/markdown; charset=utf-8' };
const safeName = (s) => /^[A-Za-z0-9._-]{1,64}$/.test(s) && !s.includes('..') ? s : null;
const send = (res, code, body, type) => { res.writeHead(code, { 'Content-Type': type || 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(body); };
const sendJson = (res, code, obj) => send(res, code, JSON.stringify(obj));

const readBody = (req) => new Promise((resolve, reject) => {
  let n = 0; const parts = [];
  req.on('data', (c) => { n += c.length; if (n > MAX_BODY) { reject(new Error('too big')); req.destroy(); return; } parts.push(c); });
  req.on('end', () => resolve(Buffer.concat(parts).toString('utf8')));
  req.on('error', reject);
});
const writeAtomic = (file, text) => { const tmp = file + '.tmp'; fs.writeFileSync(tmp, text); fs.renameSync(tmp, file); };

const server = http.createServer(async (req, res) => {
  let url;
  try { url = new URL(req.url, 'http://' + (req.headers.host || 'localhost')); } catch (e) { return sendJson(res, 400, { error: 'bad url' }); }
  const p = decodeURIComponent(url.pathname);

  // ---------- API ----------
  if (p === '/api/ping') return sendJson(res, 200, { punchma: true, version: 1, data: path.relative(ROOT, DATA) });

  if (p.startsWith('/api/doc/')) {
    const name = safeName(p.slice('/api/doc/'.length));
    if (!name) return sendJson(res, 400, { error: 'bad name' });
    const file = path.join(DATA, name + '.json');
    if (req.method === 'GET') {
      if (!fs.existsSync(file)) return sendJson(res, 404, { error: 'not saved yet' });
      return send(res, 200, fs.readFileSync(file, 'utf8'));
    }
    if (req.method === 'PUT') {
      try {
        const body = await readBody(req);
        JSON.parse(body);                                    // refuse to save anything that is not JSON
        writeAtomic(file, body);
        return sendJson(res, 200, { ok: true, bytes: Buffer.byteLength(body) });
      } catch (e) { return sendJson(res, e.message === 'too big' ? 413 : 400, { error: e.message }); }
    }
    return sendJson(res, 405, { error: 'use GET or PUT' });
  }

  // ---------- static files ----------
  if (req.method !== 'GET' && req.method !== 'HEAD') return sendJson(res, 405, { error: 'nope' });
  let rel = p === '/' ? 'index.html' : p.replace(/^\/+/, '');
  const file = path.resolve(ROOT, rel);
  if (!file.startsWith(ROOT + path.sep) && file !== path.join(ROOT, 'index.html')) return send(res, 403, 'no', 'text/plain');
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) return send(res, 404, 'Not found', 'text/plain');
  const type = TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-cache' });
  if (req.method === 'HEAD') return res.end();
  fs.createReadStream(file).pipe(res);
});

server.listen(PORT, HOST, () => {
  const nets = os.networkInterfaces();
  const lan = [];
  for (const name in nets) for (const n of nets[name] || []) if (n.family === 'IPv4' && !n.internal) lan.push(n.address);
  console.log('');
  console.log('  PUNCHMA host is up.');
  console.log('  On this computer:   http://localhost:' + PORT);
  if (HOST !== '127.0.0.1' && HOST !== 'localhost') {
    for (const a of lan) console.log('  On your network:    http://' + a + ':' + PORT);
    console.log('  (Anyone on your network can open those. Use --host 127.0.0.1 to keep it to this computer.)');
  }
  console.log('  Saving to:          ' + path.relative(process.cwd(), DATA) + '/');
  console.log('  Stop with Ctrl+C.');
  console.log('');
});
server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') console.error(`\n  Port ${PORT} is already busy. Try: node server.js --port ${PORT + 1}\n`);
  else console.error(e);
  process.exit(1);
});
