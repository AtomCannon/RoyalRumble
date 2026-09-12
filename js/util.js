// Punchma - shared utilities. Everything lives on window.P to avoid module/CORS issues on file://
window.P = window.P || {};
P.util = {
  rand(a = 1, b) { return b === undefined ? Math.random() * a : a + Math.random() * (b - a); },
  randi(a, b) { return Math.floor(P.util.rand(a, b + 1)); },
  pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; },
  pickN(arr, n) { return P.util.shuffle(arr.slice()).slice(0, n); },
  chance(p) { return Math.random() < p; },
  clamp(v, a, b) { return v < a ? a : v > b ? b : v; },
  lerp(a, b, t) { return a + (b - a) * t; },
  shuffle(arr) { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; },
  uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); },
  fmt(t, v) { return String(t).replace(/\{(\w+)\}/g, (m, k) => (v && v[k] !== undefined) ? v[k] : m); },
  cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; },
  hexToRgb(hex) {
    hex = (hex || '#888').replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    const n = parseInt(hex, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  },
  rgbToHex(r, g, b) { return '#' + [r, g, b].map(x => P.util.clamp(Math.round(x), 0, 255).toString(16).padStart(2, '0')).join(''); },
  shade(hex, amt) { // amt -1..1 ; negative darkens
    const [r, g, b] = P.util.hexToRgb(hex);
    const f = (c) => amt < 0 ? c * (1 + amt) : c + (255 - c) * amt;
    return P.util.rgbToHex(f(r), f(g), f(b));
  },
  randColor() { return P.util.rgbToHex(P.util.randi(0, 255), P.util.randi(0, 255), P.util.randi(0, 255)); },
  save(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); return true; } catch (e) { console.warn('save failed', e); return false; } },
  load(key, def) { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : def; } catch (e) { return def; } },
  el(tag, attrs = {}, children = []) {
    const e = document.createElement(tag);
    for (const k in attrs) {
      if (attrs[k] == null) continue;
      if (k === 'class') e.className = attrs[k];
      else if (k === 'style') e.style.cssText = attrs[k];
      else if (k === 'html') e.innerHTML = attrs[k];
      else if (k === 'text') e.textContent = attrs[k];
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), attrs[k]);
      else e.setAttribute(k, attrs[k]);
    }
    for (const c of [].concat(children)) if (c != null) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    return e;
  },
  esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); },
  deep(o) { return JSON.parse(JSON.stringify(o)); },
  merge(base, over) { // deep merge, over wins, only for plain objects
    const out = Array.isArray(base) ? base.slice() : Object.assign({}, base);
    for (const k in over || {}) {
      const bv = out[k], ov = over[k];
      out[k] = (bv && ov && typeof bv === 'object' && typeof ov === 'object' && !Array.isArray(bv) && !Array.isArray(ov)) ? P.util.merge(bv, ov) : ov;
    }
    return out;
  },
};
