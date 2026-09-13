// Where the roster and the sponsors live. localStorage is capped around 5MB per site, and one uploaded drawing or
// a 20 second song snippet eats a big slice of that, so the heavy data goes somewhere with room:
//   server  - the little Node host in server.js, saving JSON files in data/. No practical limit, shared with friends.
//   idb     - IndexedDB in the browser. Hundreds of megabytes, works from file:// and from any static host.
//   local   - localStorage. Last resort only.
window.P = window.P || {};
(function () {
  const U = P.util;
  const St = P.store = { backend: 'local', ready: false, note: '', server: false };
  const DB = 'punchma', SHELF = 'docs';
  const KEYS = ['roster', 'sponsors'];
  const lsKey = (k) => 'punchma.' + k;

  // ---- IndexedDB ----
  let dbp = null;
  const db = () => dbp || (dbp = new Promise((res, rej) => {
    if (!window.indexedDB) return rej(new Error('no IndexedDB'));
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains(SHELF)) r.result.createObjectStore(SHELF); };
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error || new Error('IndexedDB blocked'));
    r.onblocked = () => rej(new Error('IndexedDB blocked'));
  }));
  const idbGet = async (k) => { const d = await db(); return new Promise((res, rej) => { const q = d.transaction(SHELF, 'readonly').objectStore(SHELF).get(k); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); }); };
  const idbSet = async (k, v) => { const d = await db(); return new Promise((res, rej) => { const tx = d.transaction(SHELF, 'readwrite'); tx.objectStore(SHELF).put(v, k); tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); tx.onabort = () => rej(tx.error || new Error('write aborted')); }); };

  // ---- server ----
  const api = (path, opts) => fetch('api/' + path, Object.assign({ cache: 'no-store' }, opts));
  St.probe = async () => {
    if (location.protocol === 'file:') return false;   // asking would just log a CORS error
    try { const r = await api('ping'); if (!r.ok) return false; const j = await r.json(); return !!(j && j.punchma); } catch (e) { return false; }
  };

  St.init = async () => {
    if (await St.probe()) { St.backend = 'server'; St.server = true; St.note = 'Saving to this computer (the Punchma host). No browser limit.'; }
    else {
      try { await db(); await idbSet('__probe', 1); St.backend = 'idb'; St.note = 'Saving in this browser\'s database. Plenty of room, but only on this browser.'; }
      catch (e) { St.backend = 'local'; St.note = 'Falling back to basic browser storage, which is small (about 5MB). Run the host (see the README) to lift the limit.'; }
    }
    await St.migrate();
    St.ready = true;
    return St.backend;
  };

  // Anything still sitting in localStorage from before gets moved up, once.
  St.migrate = async () => {
    if (St.backend === 'local') return;
    for (const k of KEYS) {
      const raw = localStorage.getItem(lsKey(k)); if (raw == null) continue;
      try {
        const here = await St.get(k, null);
        if (here == null) await St.set(k, JSON.parse(raw));
        localStorage.removeItem(lsKey(k));
      } catch (e) { /* leave it where it is; it will be read as a fallback below */ }
    }
  };

  St.get = async (key, def) => {
    try {
      if (St.backend === 'server') { const r = await api('doc/' + key); if (r.status === 404) return def; if (!r.ok) throw new Error('HTTP ' + r.status); const j = await r.json(); return j == null ? def : j; }
      if (St.backend === 'idb') { const v = await idbGet(key); if (v !== undefined) return v; }
    } catch (e) { console.warn('store.get failed, falling back to localStorage', e); }
    const raw = localStorage.getItem(lsKey(key));
    if (raw == null) return def;
    try { return JSON.parse(raw); } catch (e) { return def; }
  };

  St.set = async (key, value) => {
    try {
      if (St.backend === 'server') {
        const r = await api('doc/' + key, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(value) });
        if (!r.ok) throw new Error('the host said ' + r.status);
        return { ok: true };
      }
      if (St.backend === 'idb') { await idbSet(key, value); return { ok: true }; }
    } catch (e) {
      console.warn('store.set failed', e);
      if (St.backend !== 'local') return { ok: false, error: e.message || String(e) };
    }
    try { localStorage.setItem(lsKey(key), JSON.stringify(value)); return { ok: true }; }
    catch (e) { return { ok: false, error: 'browser storage is full (about 5MB). Run the Punchma host to lift the limit, or remove some uploaded art, songs and voice lines.' }; }
  };

  // Roughly how much room the saved data takes, and how much is left.
  St.usage = async () => {
    const out = { backend: St.backend, note: St.note, bytes: 0, quota: 0 };
    try {
      for (const k of KEYS) { const v = await St.get(k, null); if (v) out.bytes += JSON.stringify(v).length; }
    } catch (e) { }
    if (St.backend === 'local') out.quota = 5 * 1024 * 1024;
    else if (St.backend === 'idb' && navigator.storage && navigator.storage.estimate) { try { const e = await navigator.storage.estimate(); out.quota = e.quota || 0; if (e.usage) out.bytes = Math.max(out.bytes, e.usage); } catch (e) { } }
    return out;
  };

  St.fmt = (n) => n > 1024 * 1024 ? (n / 1024 / 1024).toFixed(1) + ' MB' : n > 1024 ? (n / 1024).toFixed(0) + ' KB' : n + ' B';
})();
