// Audio: WebAudio-synthesized walk-on songs, sound effects, crowd noise, plus custom uploaded/URL songs.
window.P = window.P || {};
(function () {
  const U = P.util;
  const A = P.audio = { ctx: null, master: null, musicGain: null, sfxGain: null, settings: { music: 0.6, sfx: 0.7 }, current: null, crowdNode: null };
  A.settings = Object.assign(A.settings, U.load('punchma.audio', {}));
  A.saveSettings = () => U.save('punchma.audio', A.settings);

  A.init = () => {
    if (A.ctx) { if (A.ctx.state === 'suspended') A.ctx.resume(); return A.ctx; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
    A.ctx = new AC(); A.master = A.ctx.createGain(); A.master.connect(A.ctx.destination);
    A.musicGain = A.ctx.createGain(); A.musicGain.gain.value = A.settings.music; A.musicGain.connect(A.master);
    A.sfxGain = A.ctx.createGain(); A.sfxGain.gain.value = A.settings.sfx; A.sfxGain.connect(A.master);
    return A.ctx;
  };

  // ---- note helpers ----
  const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const freq = (n) => { const m = /^([A-G])([#b]?)(\d)$/.exec(n); if (!m) return 0; let semi = NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0); const midi = 12 * (+m[3] + 1) + semi; return 440 * Math.pow(2, (midi - 69) / 12); };
  // track string: "C4:1 E4:1 -:0.5 G4:2"  (note:beats, '-' = rest)
  const parse = (str) => str.trim().split(/\s+/).map(tok => { const [n, b] = tok.split(':'); return { f: n === '-' ? 0 : freq(n), beats: +(b || 1) }; });

  A.SONGS = {
    hype:     { name: 'Generic Hype Rock', bpm: 150, tracks: [{ wave: 'square', gain: 0.18, notes: 'E2:1 E2:0.5 E2:0.5 G2:1 A2:1 E2:1 E2:0.5 E2:0.5 D3:1 C3:1 E2:1 E2:0.5 E2:0.5 G2:1 A2:1 B2:0.5 A2:0.5 G2:1 E2:2' }, { wave: 'sawtooth', gain: 0.08, notes: 'E4:2 G4:1 A4:1 E4:2 D5:1 C5:1 E4:2 G4:1 A4:1 B4:2 G4:1 E4:1' }], drums: true },
    fanfare:  { name: 'Royal Fanfare', bpm: 120, tracks: [{ wave: 'triangle', gain: 0.25, notes: 'C4:0.5 C4:0.5 C4:0.5 E4:1.5 G4:0.5 G4:0.5 G4:0.5 C5:1.5 E5:0.5 D5:0.5 C5:0.5 G4:1.5 C5:2 -:1' }, { wave: 'triangle', gain: 0.12, notes: 'C3:2 C3:2 G3:2 C3:2 C3:2 -:1' }] },
    sadtrombone: { name: 'Sad Trombone', bpm: 80, tracks: [{ wave: 'sawtooth', gain: 0.2, slide: true, vibrato: 6, notes: 'Bb3:1 A3:1 Ab3:1 G3:3 -:2' }] },
    elevator: { name: 'Elevator Jazz', bpm: 100, tracks: [{ wave: 'sine', gain: 0.2, notes: 'E4:1 G4:1 B4:1 D5:1 C5:2 A4:2 F4:1 A4:1 C5:1 E5:1 D5:2 B4:2' }, { wave: 'sine', gain: 0.15, notes: 'C3:2 E3:2 A2:2 C3:2 F2:2 A2:2 G2:2 B2:2' }] },
    dialup:   { name: 'Dial-Up Modem', bpm: 200, tracks: [{ wave: 'square', gain: 0.12, notes: 'A5:1 -:0.5 A5:1 -:0.5 F6:0.5 G6:0.5 F6:0.5 G6:0.5 C5:2 E7:0.25 C7:0.25 E7:0.25 C7:0.25 E7:0.25 C7:0.25 E7:0.25 C7:0.25 B4:3' }], noise: true },
    kazoo:    { name: 'Kazoo Anthem', bpm: 140, tracks: [{ wave: 'sawtooth', gain: 0.18, vibrato: 12, notes: 'C4:1 E4:1 G4:1 C5:1 G4:1 E4:1 C4:2 D4:1 F4:1 A4:1 D5:1 A4:1 F4:1 D4:2' }] },
    funeral:  { name: 'Funeral March', bpm: 60, tracks: [{ wave: 'triangle', gain: 0.25, notes: 'C3:2 C3:1.5 C3:0.5 C3:2 Eb3:1.5 D3:0.5 D3:1.5 C3:0.5 C3:1.5 B2:0.5 C3:2' }] },
    circus:   { name: 'Circus Nightmare', bpm: 190, tracks: [{ wave: 'square', gain: 0.16, notes: 'C5:0.5 B4:0.5 Bb4:0.5 A4:0.5 Ab4:0.5 G4:0.5 F#4:0.5 G4:0.5 C5:0.5 B4:0.5 Bb4:0.5 A4:0.5 Ab4:0.5 G4:0.5 F#4:0.5 G4:0.5 E5:0.5 D5:0.5 C5:0.5 B4:0.5 A4:0.5 G4:0.5 F4:0.5 E4:0.5 D4:1 G4:1 C4:2' }, { wave: 'triangle', gain: 0.12, notes: 'C3:1 G2:1 C3:1 G2:1 C3:1 G2:1 C3:1 G2:1 F2:1 C3:1 G2:1 D3:1 C3:1 G2:1 C3:2' }], drums: true },
    bagpipe:  { name: 'Bagpipes (Sorry)', bpm: 110, tracks: [{ wave: 'sawtooth', gain: 0.14, notes: 'A4:1 A4:0.5 B4:0.5 C#5:1 E5:1 D5:0.5 C#5:0.5 B4:1 A4:1 C#5:1 E5:1 F#5:1 E5:0.5 D5:0.5 C#5:1 A4:1' }, { wave: 'sawtooth', gain: 0.1, notes: 'A2:16' }, { wave: 'sawtooth', gain: 0.06, notes: 'E3:16' }] },
    recorder: { name: 'Kid With A Recorder', bpm: 120, tracks: [{ wave: 'square', gain: 0.14, detune: 25, notes: 'B4:1 A4:1 G4:2 B4:1 A4:1 G4:2 G4:0.5 G4:0.5 G4:0.5 G4:0.5 A4:0.5 A4:0.5 A4:0.5 A4:0.5 B4:1 A4:1 G4:2' }] },
    boss:     { name: 'Final Boss', bpm: 160, tracks: [{ wave: 'square', gain: 0.15, notes: 'E4:0.5 E4:0.5 E5:0.5 E4:0.5 D5:0.5 E4:0.5 C5:0.5 E4:0.5 B4:0.5 E4:0.5 Bb4:0.5 E4:0.5 A4:0.5 E4:0.5 G4:0.5 E4:0.5' }, { wave: 'sawtooth', gain: 0.12, notes: 'E2:0.5 E2:0.5 E3:0.5 E2:0.5 E2:0.5 E2:0.5 E3:0.5 E2:0.5 C2:0.5 C2:0.5 C3:0.5 C2:0.5 D2:0.5 D2:0.5 D3:0.5 D2:0.5' }], drums: true },
    jingle:   { name: 'Mattress Store Jingle', bpm: 130, tracks: [{ wave: 'sine', gain: 0.22, notes: 'C5:0.5 E5:0.5 G5:1 -:0.5 G5:0.5 E5:0.5 C5:1 -:1 F5:0.5 A5:0.5 C6:2 -:2' }] },
    disco:    { name: 'Disco Inferno-ish', bpm: 125, tracks: [{ wave: 'sawtooth', gain: 0.12, notes: 'A2:0.5 A3:0.5 A2:0.5 A3:0.5 A2:0.5 A3:0.5 A2:0.5 A3:0.5 G2:0.5 G3:0.5 G2:0.5 G3:0.5 F2:0.5 F3:0.5 E2:0.5 E3:0.5' }, { wave: 'square', gain: 0.08, notes: '-:2 C5:0.5 E5:0.5 A5:1 -:2 B4:0.5 D5:0.5 G5:1' }], drums: true },
    sitcom:   { name: '90s Sitcom Theme', bpm: 115, tracks: [{ wave: 'triangle', gain: 0.2, notes: 'G4:0.5 B4:0.5 D5:1 D5:0.5 B4:0.5 G4:1 A4:0.5 C5:0.5 E5:1 D5:1 -:1 E5:0.5 D5:0.5 B4:1 A4:0.5 G4:0.5 G4:2' }, { wave: 'sine', gain: 0.15, notes: 'G2:1 D3:1 G2:1 D3:1 A2:1 E3:1 A2:1 D3:1 G2:1 D3:1 G2:1 D3:1 C3:1 D3:1 G2:2' }] },
    spooky:   { name: 'Spooky Organ', bpm: 90, tracks: [{ wave: 'sawtooth', gain: 0.12, notes: 'D4:1 A4:1 D5:1 C#5:2 A4:1 D5:1 C#5:2 -:1' }, { wave: 'sawtooth', gain: 0.1, notes: 'D3:4 D3:4 Bb2:4' }, { wave: 'sawtooth', gain: 0.08, notes: 'D2:12' }] },
    western:  { name: 'Western Standoff', bpm: 100, tracks: [{ wave: 'square', gain: 0.1, vibrato: 8, notes: 'A4:0.5 D5:0.5 A4:0.5 D5:0.5 A4:3 -:1 A4:0.5 D5:0.5 A4:0.5 D5:0.5 F5:3 -:1' }, { wave: 'triangle', gain: 0.1, notes: 'D3:2 -:2 D3:2 -:2 D3:2 -:2 D3:2 -:2' }] },
    silence:  { name: 'Awkward Silence (crickets)', bpm: 120, tracks: [{ wave: 'sine', gain: 0.06, notes: 'F#7:0.25 -:0.25 F#7:0.25 -:2.25 F#7:0.25 -:0.25 F#7:0.25 -:3.25' }] },
    nokia:    { name: 'Old Phone Ringtone', bpm: 180, tracks: [{ wave: 'square', gain: 0.12, notes: 'E5:0.5 D5:0.5 F#4:1 G#4:1 C#5:0.5 B4:0.5 D4:1 E4:1 B4:0.5 A4:0.5 C#4:1 E4:1 A4:3 -:1' }] },
    baby:     { name: 'Music Box', bpm: 100, tracks: [{ wave: 'sine', gain: 0.2, notes: 'C5:1 C5:1 G5:1 G5:1 A5:1 A5:1 G5:2 F5:1 F5:1 E5:1 E5:1 D5:1 D5:1 C5:2' }] },
  };
  A.songList = () => Object.keys(A.SONGS).map(id => ({ id, name: A.SONGS[id].name }));

  const noiseBuffer = () => { const ctx = A.ctx; const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate); const d = buf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return buf; };

  // Play a built-in song; loops until stopped. Returns a handle.
  A.playSong = (id) => {
    A.stopSong(); const ctx = A.init(); if (!ctx) return null;
    const song = A.SONGS[id] || A.SONGS.hype; const spb = 60 / song.bpm;
    const handle = { id, stopped: false, nodes: [], timer: null };
    const loopLen = Math.max(...song.tracks.map(t => parse(t.notes).reduce((a, n) => a + n.beats, 0))) * spb;
    const schedule = (t0) => {
      for (const tr of song.tracks) {
        let t = t0;
        for (const n of parse(tr.notes)) {
          const dur = n.beats * spb;
          if (n.f) {
            const o = ctx.createOscillator(), g = ctx.createGain(); o.type = tr.wave; o.frequency.setValueAtTime(n.f, t);
            if (tr.detune) o.detune.value = (Math.random() - 0.5) * tr.detune * 2;
            if (tr.slide) o.frequency.linearRampToValueAtTime(n.f * 0.94, t + dur);
            if (tr.vibrato) { const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = tr.vibrato; lg.gain.value = n.f * 0.02; lfo.connect(lg); lg.connect(o.frequency); lfo.start(t); lfo.stop(t + dur); handle.nodes.push(lfo); }
            g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(tr.gain, t + 0.02); g.gain.setValueAtTime(tr.gain, t + dur * 0.8); g.gain.linearRampToValueAtTime(0, t + dur * 0.98);
            o.connect(g); g.connect(A.musicGain); o.start(t); o.stop(t + dur); handle.nodes.push(o);
          }
          t += dur;
        }
      }
      if (song.drums) { for (let t = t0; t < t0 + loopLen - 0.01; t += spb) { A.drum(t, 'kick'); A.drum(t + spb / 2, 'hat'); if (Math.round((t - t0) / spb) % 2 === 1) A.drum(t, 'snare'); } }
      if (song.noise) { const s = ctx.createBufferSource(); s.buffer = noiseBuffer(); const g = ctx.createGain(); g.gain.value = 0.03; const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 3000; s.connect(f); f.connect(g); g.connect(A.musicGain); s.start(t0 + loopLen * 0.6); s.stop(t0 + loopLen); handle.nodes.push(s); }
    };
    let next = ctx.currentTime + 0.05;
    const tick = () => { if (handle.stopped) return; while (next < ctx.currentTime + 1.0) { schedule(next); next += loopLen; } handle.timer = setTimeout(tick, 300); };
    tick(); A.current = handle; return handle;
  };
  A.drum = (t, kind) => {
    const ctx = A.ctx; if (!ctx) return;
    if (kind === 'kick') { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.15); g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.01, t + 0.2); o.connect(g); g.connect(A.musicGain); o.start(t); o.stop(t + 0.2); }
    else { const s = ctx.createBufferSource(); s.buffer = A._noise || (A._noise = noiseBuffer()); const g = ctx.createGain(), f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = kind === 'hat' ? 7000 : 1500; g.gain.setValueAtTime(kind === 'hat' ? 0.08 : 0.25, t); g.gain.exponentialRampToValueAtTime(0.01, t + (kind === 'hat' ? 0.04 : 0.12)); s.connect(f); f.connect(g); g.connect(A.musicGain); s.start(t); s.stop(t + 0.15); }
  };
  A.stopSong = () => {
    if (A.current) { A.current.stopped = true; clearTimeout(A.current.timer); for (const n of A.current.nodes) { try { n.stop(); } catch (e) { } } A.current = null; }
    if (A.audioEl) { try { A.audioEl.pause(); } catch (e) { } A.audioEl = null; }
  };
  A.playUrl = (url, loop = true) => { A.stopSong(); try { const el = new Audio(url); el.volume = A.settings.music; el.loop = loop; el.play().catch(() => { }); A.audioEl = el; } catch (e) { } };
  // Play a character's song (built-in or custom data URL / URL)
  A.playCharSong = (ch) => {
    A.stopSong();
    if (ch.song && ch.song.type === 'custom' && ch.song.custom) {
      try { const el = new Audio(ch.song.custom); el.volume = A.settings.music; el.loop = true; el.play().catch(() => { }); A.audioEl = el; } catch (e) { A.playSong('hype'); }
    } else A.playSong((ch.song && ch.song.id) || 'hype');
  };

  // ---- SFX ----
  A.sfx = (kind) => {
    const ctx = A.init(); if (!ctx || A.settings.sfx <= 0) return; const t = ctx.currentTime;
    const noise = (dur, filterType, f0, gain, f1) => { const s = ctx.createBufferSource(); s.buffer = A._noise || (A._noise = noiseBuffer()); const g = ctx.createGain(), fl = ctx.createBiquadFilter(); fl.type = filterType; fl.frequency.setValueAtTime(f0, t); if (f1) fl.frequency.exponentialRampToValueAtTime(f1, t + dur); g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur); s.connect(fl); fl.connect(g); g.connect(A.sfxGain); s.start(t); s.stop(t + dur + 0.05); };
    const tone = (wave, f0, f1, dur, gain, delay = 0) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = wave; o.frequency.setValueAtTime(f0, t + delay); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + delay + dur); g.gain.setValueAtTime(gain, t + delay); g.gain.exponentialRampToValueAtTime(0.001, t + delay + dur); o.connect(g); g.connect(A.sfxGain); o.start(t + delay); o.stop(t + delay + dur + 0.05); };
    switch (kind) {
      case 'punch': noise(0.12, 'lowpass', 800, 0.6, 100); tone('sine', 120, 40, 0.15, 0.5); break;
      case 'slap': noise(0.08, 'highpass', 2000, 0.5); tone('triangle', 900, 300, 0.06, 0.3); break;
      case 'big': noise(0.35, 'lowpass', 1200, 0.8, 80); tone('sine', 90, 30, 0.35, 0.7); tone('square', 400, 60, 0.2, 0.2); break;
      case 'squish': noise(0.2, 'bandpass', 600, 0.4, 200); tone('sine', 300, 120, 0.2, 0.2); break;
      case 'fart': { const o = ctx.createOscillator(), g = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain(); o.type = 'sawtooth'; o.frequency.setValueAtTime(90, t); o.frequency.exponentialRampToValueAtTime(55, t + 0.5); lfo.frequency.value = 28; lg.gain.value = 30; lfo.connect(lg); lg.connect(o.frequency); g.gain.setValueAtTime(0.35, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.55); o.connect(g); g.connect(A.sfxGain); o.start(t); lfo.start(t); o.stop(t + 0.6); lfo.stop(t + 0.6); break; }
      case 'boo': noise(0.5, 'bandpass', 400, 0.25, 250); tone('sawtooth', 200, 150, 0.5, 0.05); break;
      case 'chair': tone('square', 1200, 900, 0.4, 0.3); tone('sine', 2400, 2000, 0.6, 0.15); noise(0.15, 'lowpass', 1500, 0.6, 200); break;
      case 'punchma': tone('sine', 100, 30, 0.3, 0.6); tone('square', 1800, 2600, 0.5, 0.15, 0.15); noise(0.2, 'lowpass', 600, 0.6, 80); break;
      case 'bell': for (let i = 0; i < 3; i++) { tone('triangle', 2200, null, 0.5, 0.35, i * 0.35); tone('sine', 3300, null, 0.4, 0.12, i * 0.35); } break;
      case 'cheer': noise(1.6, 'bandpass', 900, 0.5, 700); break;
      case 'ooh': noise(0.9, 'bandpass', 500, 0.4, 300); tone('sine', 220, 200, 0.9, 0.05); break;
      case 'whoosh': noise(0.25, 'bandpass', 600, 0.35, 2000); break;
      case 'thud': noise(0.2, 'lowpass', 400, 0.7, 60); tone('sine', 80, 30, 0.25, 0.6); break;
      case 'buzzer': tone('sawtooth', 160, 150, 0.7, 0.3); tone('square', 163, 150, 0.7, 0.15); break;
      case 'pop': tone('sine', 600, 1200, 0.08, 0.3); break;
      case 'boing': tone('sine', 200, 900, 0.3, 0.3); break;
      case 'ding': tone('sine', 1500, null, 0.3, 0.3); break;
      case 'crash': noise(0.6, 'highpass', 3000, 0.5); tone('sawtooth', 300, 40, 0.5, 0.3); break;
      case 'glitch': for (let i = 0; i < 5; i++) tone('square', 200 + Math.random() * 2000, null, 0.05, 0.15, i * 0.07); break;
      case 'magic': for (let i = 0; i < 6; i++) tone('sine', 800 + i * 200, 1200 + i * 300, 0.15, 0.12, i * 0.06); break;
      case 'confetti': for (let i = 0; i < 8; i++) tone('triangle', 500 + Math.random() * 1500, null, 0.1, 0.1, i * 0.05); break;
      case 'yay': noise(1.2, 'bandpass', 1200, 0.4, 800); for (let i = 0; i < 4; i++) tone('triangle', 400 + i * 150, null, 0.15, 0.1, i * 0.1); break;
    }
  };
  // ---- speech lives in voice.js; keep thin aliases ----
  A.say = (text, o) => P.voice ? P.voice.say(text, o) : Promise.resolve();
  A.shutUp = () => { if (P.voice) P.voice.stop(); };
  // duck music while someone talks
  A.duck = (on) => { if (!A.ctx) return; const g = A.settings.music * (on ? 0.3 : 1); A.musicGain.gain.linearRampToValueAtTime(g, A.ctx.currentTime + 0.25); if (A.audioEl) A.audioEl.volume = g; };
  A.applySettings = () => { if (!A.ctx) return; A.musicGain.gain.value = A.settings.music; A.sfxGain.gain.value = A.settings.sfx; if (A.audioEl) A.audioEl.volume = A.settings.music; };

  // ---- helpers for the snippet editor ----
  A.decode = async (arrayBuffer) => { const ctx = A.init(); return await ctx.decodeAudioData(arrayBuffer.slice(0)); };
  // Render [start, start+len] of an AudioBuffer to a mono 22050 Hz WAV data URL
  A.snippetToWav = async (buffer, start, len) => {
    const rate = 22050, frames = Math.max(1, Math.floor(len * rate));
    const off = new OfflineAudioContext(1, frames, rate); const src = off.createBufferSource(); src.buffer = buffer;
    const g = off.createGain(); g.gain.setValueAtTime(0, 0); g.gain.linearRampToValueAtTime(1, 0.05); g.gain.setValueAtTime(1, Math.max(0.05, len - 0.3)); g.gain.linearRampToValueAtTime(0, len);
    src.connect(g); g.connect(off.destination); src.start(0, start, len);
    const out = await off.startRendering();
    const blob = A.wavBlob(out.getChannelData(0), rate);
    return new Promise((res) => { const rd = new FileReader(); rd.onload = () => res(rd.result); rd.readAsDataURL(blob); });
  };
  A.wavBlob = (samples, rate) => {
    const n = samples.length, buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf);
    const str = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    str(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); str(8, 'WAVE'); str(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); str(36, 'data'); v.setUint32(40, n * 2, true);
    for (let i = 0; i < n; i++) { const x = Math.max(-1, Math.min(1, samples[i])); v.setInt16(44 + i * 2, x < 0 ? x * 32768 : x * 32767, true); }
    return new Blob([buf], { type: 'audio/wav' });
  };
})();
