// Original temp score, synthesized with Web Audio. 120 BPM, 33 bars.
// Works with an OfflineAudioContext (export) or a live AudioContext (preview from `from` seconds).
import { rng } from './util.js';

const N = { B1: 61.74, G1: 49.0, D2: 73.42, A1: 55.0, A2: 110, D3: 146.83, F3s: 185.0, A3: 220, B2: 123.47, B3: 246.94, C4s: 277.18, D4: 293.66, E4: 329.63, F4s: 369.99, G3: 196, A4: 440, B4: 493.88, D5: 587.33, E5: 659.25, F5s: 739.99, A5: 880, B5: 987.77, D6: 1174.66 };
const CHORDS = [
  { bass: N.B1, pad: [N.B3, N.D4, N.F4s], arp: [N.B4, N.D5, N.F5s, N.D5] },
  { bass: N.G1, pad: [N.G3, N.B3, N.D4], arp: [N.B4, N.D5, N.G3 * 4, N.D5] },
  { bass: N.D2, pad: [N.A3, N.D4, N.F4s], arp: [N.A4, N.D5, N.F5s, N.D5] },
  { bass: N.A1, pad: [N.A3, N.C4s, N.E4], arp: [N.A4, N.C4s * 2, N.E5, N.C4s * 2] },
];

export function buildScore(c, dest, offset = 0, from = 0) {
  const live = !(c instanceof OfflineAudioContext);
  const T = x => x + offset;
  const ok = x => x >= from - 0.02;
  const R = rng(1234);

  // ---------- buses ----------
  const master = c.createGain(); master.gain.value = 0.9;
  const glue = c.createDynamicsCompressor();
  Object.assign(glue, {}); glue.threshold.value = -16; glue.knee.value = 10; glue.ratio.value = 3; glue.attack.value = 0.006; glue.release.value = 0.2;
  const lim = c.createDynamicsCompressor(); lim.threshold.value = -4; lim.knee.value = 0; lim.ratio.value = 20; lim.attack.value = 0.001; lim.release.value = 0.08;
  const lowS = c.createBiquadFilter(); lowS.type = 'lowshelf'; lowS.frequency.value = 90; lowS.gain.value = -3;
  const hiS = c.createBiquadFilter(); hiS.type = 'highshelf'; hiS.frequency.value = 4500; hiS.gain.value = 4;
  const pres = c.createBiquadFilter(); pres.type = 'peaking'; pres.frequency.value = 3000; pres.Q.value = 0.8; pres.gain.value = 3;
  master.connect(lowS); lowS.connect(hiS); hiS.connect(pres); pres.connect(glue); glue.connect(lim); lim.connect(dest);
  // end fade
  master.gain.setValueAtTime(0.9, T(Math.max(from, 0))); if (ok(64.6)) { master.gain.setValueAtTime(0.9, T(64.6)); master.gain.linearRampToValueAtTime(0.0001, T(65.98)); }

  const noise = (() => { const n = c.sampleRate * 3, b = c.createBuffer(2, n, c.sampleRate); for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); for (let i = 0; i < n; i++) d[i] = R() * 2 - 1; } return b; })();
  const ir = (() => {
    const sec = 3.2, n = Math.floor(c.sampleRate * sec), b = c.createBuffer(2, n, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); let lp = 0; for (let i = 0; i < n; i++) { lp = lp * 0.6 + (R() * 2 - 1) * 0.4; d[i] = lp * Math.pow(1 - i / n, 3.2) * (i < 200 ? i / 200 : 1); } }
    return b;
  })();
  const verb = c.createConvolver(); verb.buffer = ir; const verbG = c.createGain(); verbG.gain.value = 0.55; verb.connect(verbG); verbG.connect(master);
  const dly = c.createDelay(2); dly.delayTime.value = 0.375; const fb = c.createGain(); fb.gain.value = 0.38; const dlp = c.createBiquadFilter(); dlp.type = 'lowpass'; dlp.frequency.value = 2600;
  const dOut = c.createGain(); dOut.gain.value = 0.5; dly.connect(dlp); dlp.connect(fb); fb.connect(dly); dlp.connect(dOut); dOut.connect(master); dOut.connect(verb);
  // music bus ducked by the kick
  const music = c.createGain(); music.connect(master);
  const sfx = c.createGain(); sfx.gain.value = 1; sfx.connect(master);
  const drums = c.createGain(); drums.gain.value = 1; drums.connect(master);

  const send = (node, wet = 0, d = 0, bus = music) => {
    node.connect(bus);
    if (wet) { const g = c.createGain(); g.gain.value = wet; node.connect(g); g.connect(verb); }
    if (d) { const g = c.createGain(); g.gain.value = d; node.connect(g); g.connect(dly); }
  };
  const gain = v => { const g = c.createGain(); g.gain.value = v; return g; };
  const filt = (type, f, q = 0.7) => { const x = c.createBiquadFilter(); x.type = type; x.frequency.value = f; x.Q.value = q; return x; };
  const osc = (type, f) => { const o = c.createOscillator(); o.type = type; o.frequency.value = f; return o; };
  const pan = p => { const s = c.createStereoPanner(); s.pan.value = p; return s; };
  const nz = (t, dur) => { const s = c.createBufferSource(); s.buffer = noise; s.loop = true; s.start(T(t), (t * 0.731) % 2.5); s.stop(T(t + dur)); return s; };
  const env = (g, t, a, peak, d) => { g.gain.setValueAtTime(0.0001, T(t)); g.gain.linearRampToValueAtTime(peak, T(t + a)); g.gain.exponentialRampToValueAtTime(0.0001, T(t + a + d)); };

  // ---------- instruments ----------
  function kick(t, v = 1) {
    if (!ok(t)) return;
    const o = osc('sine', 150), g = gain(0);
    o.frequency.setValueAtTime(155, T(t)); o.frequency.exponentialRampToValueAtTime(46, T(t + 0.13));
    env(g, t, 0.002, 0.78 * v, 0.38); o.connect(g); g.connect(drums); o.start(T(t)); o.stop(T(t + 0.5));
    const n = nz(t, 0.02), f = filt('highpass', 1800), g2 = gain(0); env(g2, t, 0.001, 0.4 * v, 0.015); n.connect(f); f.connect(g2); g2.connect(drums);
    // duck the music bus
    music.gain.setValueAtTime(1, T(t)); music.gain.linearRampToValueAtTime(0.42, T(t + 0.012)); music.gain.linearRampToValueAtTime(1, T(t + 0.24));
  }
  function snare(t, v = 1, wet = 0.35) {
    if (!ok(t)) return;
    const n = nz(t, 0.3), f = filt('bandpass', 2200, 0.6), g = gain(0); env(g, t, 0.002, 0.85 * v, 0.2); n.connect(f); f.connect(g);
    send(g, wet, 0, drums);
    const o = osc('triangle', 190), g2 = gain(0); o.frequency.setValueAtTime(220, T(t)); o.frequency.exponentialRampToValueAtTime(160, T(t + 0.08));
    env(g2, t, 0.001, 0.45 * v, 0.1); o.connect(g2); g2.connect(drums); o.start(T(t)); o.stop(T(t + 0.2));
  }
  function clap(t, v = 1) {
    if (!ok(t)) return;
    for (let i = 0; i < 3; i++) {
      const tt = t + i * 0.011, n = nz(tt, 0.2), f = filt('bandpass', 1300, 1.2), g = gain(0);
      env(g, tt, 0.001, 0.55 * v, i === 2 ? 0.18 : 0.02); n.connect(f); f.connect(g); send(g, 0.3, 0, drums);
    }
  }
  function hat(t, v = 1, open = false, p = 0.2) {
    if (!ok(t)) return;
    const n = nz(t, open ? 0.35 : 0.08), f = filt('highpass', open ? 7000 : 8500), g = gain(0), pn = pan(p);
    env(g, t, 0.001, 0.42 * v, open ? 0.26 : 0.04); n.connect(f); f.connect(g); g.connect(pn); pn.connect(drums);
  }
  function bass(t, f, dur, v = 1, cut = 420) {
    if (!ok(t)) return;
    const o1 = osc('sawtooth', f), o2 = osc('square', f / 2), lp = filt('lowpass', cut, 5), g = gain(0);
    o1.detune.value = 4;
    lp.frequency.setValueAtTime(cut * 2.6, T(t)); lp.frequency.exponentialRampToValueAtTime(cut, T(t + 0.12));
    const m2 = gain(0.5); o1.connect(lp); o2.connect(m2); m2.connect(lp); lp.connect(g);
    g.gain.setValueAtTime(0.0001, T(t)); g.gain.linearRampToValueAtTime(0.24 * v, T(t + 0.006)); g.gain.setTargetAtTime(0.0001, T(t + dur * 0.6), 0.05);
    send(g); for (const o of [o1, o2]) { o.start(T(t)); o.stop(T(t + dur + 0.3)); }
  }
  function sub(t, f, dur, v = 1) {
    if (!ok(t)) return;
    const o = osc('sine', f), g = gain(0);
    g.gain.setValueAtTime(0.0001, T(t)); g.gain.linearRampToValueAtTime(0.22 * v, T(t + 0.3)); g.gain.setValueAtTime(0.22 * v, T(t + dur - 0.4)); g.gain.linearRampToValueAtTime(0.0001, T(t + dur));
    o.connect(g); send(g); o.start(T(t)); o.stop(T(t + dur + 0.1));
  }
  function pad(t, freqs, dur, v = 1, cut = 1500, att = 0.6, rel = 1.2, wet = 0.6) {
    if (!ok(t)) return;
    const lp = filt('lowpass', cut, 0.6), g = gain(0);
    g.gain.setValueAtTime(0.0001, T(t)); g.gain.linearRampToValueAtTime(0.06 * v, T(t + att));
    g.gain.setValueAtTime(0.06 * v, T(t + dur)); g.gain.linearRampToValueAtTime(0.0001, T(t + dur + rel));
    lp.connect(g); send(g, wet);
    freqs.forEach((f, i) => {
      for (const d of [-8, 7]) { const o = osc('sawtooth', f); o.detune.value = d; const p = pan(d < 0 ? -0.35 : 0.35); o.connect(p); p.connect(lp); o.start(T(t)); o.stop(T(t + dur + rel + 0.1)); }
    });
    return lp;
  }
  function pluck(t, f, v = 1, p = 0) {
    if (!ok(t)) return;
    const o = osc('sawtooth', f), o2 = osc('triangle', f * 2), lp = filt('lowpass', 3200, 2), g = gain(0), pn = pan(p);
    lp.frequency.setValueAtTime(4200, T(t)); lp.frequency.exponentialRampToValueAtTime(700, T(t + 0.18));
    env(g, t, 0.003, 0.11 * v, 0.22); o.connect(lp); const m = gain(0.4); o2.connect(m); m.connect(lp); lp.connect(g); g.connect(pn);
    send(pn, 0.25, 0.55); for (const x of [o, o2]) { x.start(T(t)); x.stop(T(t + 0.35)); }
  }
  function bell(t, f, v = 1, p = 0) {
    if (!ok(t)) return;
    const pn = pan(p);
    [[1, 1, 2.6], [2.76, 0.35, 1.2], [5.4, 0.12, 0.6], [2, 0.25, 1.6]].forEach(([m, a, d]) => {
      const o = osc('sine', f * m), g = gain(0); env(g, t, 0.004, 0.18 * v * a, d); o.connect(g); g.connect(pn); o.start(T(t)); o.stop(T(t + d + 0.1));
    });
    send(pn, 0.7, 0.3, sfx);
  }
  function impact(t, v = 1) {
    if (!ok(t)) return;
    const o = osc('sine', 70), g = gain(0); o.frequency.setValueAtTime(78, T(t)); o.frequency.exponentialRampToValueAtTime(28, T(t + 1.8));
    env(g, t, 0.005, 0.7 * v, 2.2); o.connect(g); g.connect(sfx); o.start(T(t)); o.stop(T(t + 2.6));
    const n = nz(t, 1.2), lp = filt('lowpass', 1100), g2 = gain(0); lp.frequency.setValueAtTime(2400, T(t)); lp.frequency.exponentialRampToValueAtTime(180, T(t + 0.9));
    env(g2, t, 0.002, 0.7 * v, 0.9); n.connect(lp); lp.connect(g2); send(g2, 0.9, 0, sfx);
    const n2 = nz(t, 3.2), hp = filt('highpass', 4200), g3 = gain(0); env(g3, t, 0.003, 0.3 * v, 2.8); n2.connect(hp); hp.connect(g3); send(g3, 0.5, 0, sfx);
  }
  function hit(t, v = 1) { // smaller cut hit
    if (!ok(t)) return;
    const o = osc('sine', 90), g = gain(0); o.frequency.setValueAtTime(110, T(t)); o.frequency.exponentialRampToValueAtTime(40, T(t + 0.5));
    env(g, t, 0.003, 0.55 * v, 0.7); o.connect(g); g.connect(sfx); o.start(T(t)); o.stop(T(t + 0.8));
    const n = nz(t, 1.4), hp = filt('highpass', 5000), g2 = gain(0); env(g2, t, 0.002, 0.18 * v, 1.2); n.connect(hp); hp.connect(g2); send(g2, 0.4, 0, sfx);
  }
  function riser(t0, t1, v = 1) {
    if (!ok(t0)) return;
    const n = nz(t0, t1 - t0 + 0.05), bp = filt('bandpass', 300, 1.4), g = gain(0);
    bp.frequency.setValueAtTime(260, T(t0)); bp.frequency.exponentialRampToValueAtTime(7500, T(t1));
    g.gain.setValueAtTime(0.0001, T(t0)); g.gain.exponentialRampToValueAtTime(0.32 * v, T(t1 - 0.02)); g.gain.linearRampToValueAtTime(0.0001, T(t1));
    n.connect(bp); bp.connect(g); send(g, 0.5, 0, sfx);
    const o = osc('sawtooth', 110), lp = filt('lowpass', 900), g2 = gain(0);
    o.frequency.setValueAtTime(110, T(t0)); o.frequency.exponentialRampToValueAtTime(440, T(t1));
    g2.gain.setValueAtTime(0.0001, T(t0)); g2.gain.exponentialRampToValueAtTime(0.05 * v, T(t1 - 0.02)); g2.gain.linearRampToValueAtTime(0.0001, T(t1));
    o.connect(lp); lp.connect(g2); send(g2, 0.4, 0, sfx); o.start(T(t0)); o.stop(T(t1 + 0.05));
  }
  function swell(t0, t1, v = 1) { // reverse cymbal
    if (!ok(t0)) return;
    const n = nz(t0, t1 - t0 + 0.02), hp = filt('highpass', 3200), g = gain(0);
    g.gain.setValueAtTime(0.0001, T(t0)); g.gain.exponentialRampToValueAtTime(0.22 * v, T(t1 - 0.01)); g.gain.linearRampToValueAtTime(0.0001, T(t1));
    n.connect(hp); hp.connect(g); send(g, 0.3, 0, sfx);
  }
  function whoosh(t, dur = 0.5, v = 1, dir = 1) {
    if (!ok(t)) return;
    const n = nz(t, dur + 0.05), bp = filt('bandpass', 400, 1.1), g = gain(0), p = pan(-dir);
    bp.frequency.setValueAtTime(350, T(t)); bp.frequency.exponentialRampToValueAtTime(3200, T(t + dur * 0.7)); bp.frequency.exponentialRampToValueAtTime(700, T(t + dur));
    g.gain.setValueAtTime(0.0001, T(t)); g.gain.exponentialRampToValueAtTime(0.28 * v, T(t + dur * 0.75)); g.gain.exponentialRampToValueAtTime(0.0001, T(t + dur));
    p.pan.setValueAtTime(-0.8 * dir, T(t)); p.pan.linearRampToValueAtTime(0.8 * dir, T(t + dur));
    n.connect(bp); bp.connect(g); g.connect(p); send(p, 0.3, 0, sfx);
  }
  function clunk(t, v = 1) {
    if (!ok(t)) return;
    const o = osc('sine', 120), g = gain(0); o.frequency.setValueAtTime(130, T(t)); o.frequency.exponentialRampToValueAtTime(55, T(t + 0.09));
    env(g, t, 0.001, 0.7 * v, 0.16); o.connect(g); g.connect(sfx); o.start(T(t)); o.stop(T(t + 0.25));
    const n = nz(t, 0.06), bp = filt('bandpass', 1500, 2), g2 = gain(0); env(g2, t, 0.001, 0.5 * v, 0.04); n.connect(bp); bp.connect(g2); send(g2, 0.3, 0, sfx);
    [1830, 2650, 3970, 5210].forEach((f, i) => { const r = osc('sine', f), gg = gain(0); env(gg, t, 0.001, 0.035 * v / (i + 1), 0.4 - i * 0.06); r.connect(gg); send(gg, 0.5, 0, sfx); r.start(T(t)); r.stop(T(t + 0.5)); });
  }
  function slide(t0, t1, v = 1) { // telescoping section sliding out
    if (!ok(t0)) return;
    const n = nz(t0, t1 - t0 + 0.05), bp = filt('bandpass', 700, 3), g = gain(0);
    bp.frequency.setValueAtTime(600, T(t0)); bp.frequency.exponentialRampToValueAtTime(2200, T(t1));
    g.gain.setValueAtTime(0.0001, T(t0)); g.gain.linearRampToValueAtTime(0.12 * v, T(t0 + (t1 - t0) * 0.4)); g.gain.exponentialRampToValueAtTime(0.0001, T(t1));
    n.connect(bp); bp.connect(g); send(g, 0.15, 0, sfx);
  }
  function tick(t, v = 1, f = 2400) {
    if (!ok(t)) return;
    const n = nz(t, 0.02), hp = filt('highpass', 3500), g = gain(0); env(g, t, 0.0005, 0.4 * v, 0.008); n.connect(hp); hp.connect(g); send(g, 0.15, 0, sfx);
    const o = osc('sine', f), g2 = gain(0); env(g2, t, 0.001, 0.12 * v, 0.03); o.connect(g2); g2.connect(sfx); o.start(T(t)); o.stop(T(t + 0.06));
  }
  function blip(t, f, v = 1) {
    if (!ok(t)) return;
    for (const [m, a] of [[1, 1], [2, 0.3]]) { const o = osc('sine', f * m), g = gain(0); env(g, t, 0.002, 0.12 * v * a, 0.16); o.connect(g); send(g, 0.35, 0.3, sfx); o.start(T(t)); o.stop(T(t + 0.25)); }
  }
  function zap(t, v = 1) {
    if (!ok(t)) return;
    const o = osc('square', 1400), lp = filt('lowpass', 3000), g = gain(0);
    o.frequency.setValueAtTime(1500, T(t)); o.frequency.exponentialRampToValueAtTime(160, T(t + 0.09));
    env(g, t, 0.001, 0.08 * v, 0.1); o.connect(lp); lp.connect(g); send(g, 0.3, 0, sfx); o.start(T(t)); o.stop(T(t + 0.15));
    clunk(t, 0.8 * v); hit(t, 0.5 * v);
  }
  function wind(t0, t1, v = 1) {
    if (!ok(t0)) return;
    const n = nz(t0, t1 - t0), bp = filt('bandpass', 420, 0.5), g = gain(0);
    g.gain.setValueAtTime(0.0001, T(t0));
    for (let x = t0; x <= t1; x += 0.25) {
      const k = Math.min(1, (x - t0) / 2) * Math.min(1, (t1 - x) / 1.5);
      g.gain.linearRampToValueAtTime(v * 0.11 * k * (0.65 + 0.35 * Math.sin(x * 0.9) * Math.sin(x * 0.37 + 1)), T(x));
      bp.frequency.linearRampToValueAtTime(380 + 160 * Math.sin(x * 0.5), T(x));
    }
    n.connect(bp); bp.connect(g); send(g, 0.2, 0, sfx);
  }
  function crickets(t0, t1, v = 1) {
    const r = rng(77);
    for (let x = t0 + 0.3; x < t1 - 0.3; x += 0.7 + r() * 0.5) {
      if (!ok(x)) continue;
      const f = 4300 + r() * 600, p = r() * 1.4 - 0.7, fade = Math.min(1, (x - t0) / 1.5, (t1 - x) / 1.5);
      const o = osc('sine', f), g = gain(0), pn = pan(p);
      g.gain.setValueAtTime(0, T(x));
      for (let k = 0; k < 3; k++) { const s = x + k * 0.034; g.gain.setValueAtTime(0, T(s)); g.gain.linearRampToValueAtTime(0.018 * v * fade, T(s + 0.006)); g.gain.linearRampToValueAtTime(0, T(s + 0.022)); }
      o.connect(g); g.connect(pn); send(pn, 0.25, 0, sfx); o.start(T(x)); o.stop(T(x + 0.15));
    }
  }
  function rain(t0, t1, v = 1) {
    if (!ok(t0)) return;
    const n = nz(t0, t1 - t0), hp = filt('highpass', 500), lp = filt('lowpass', 7000), g = gain(0);
    g.gain.setValueAtTime(0.0001, T(t0)); g.gain.linearRampToValueAtTime(0.09 * v, T(t0 + 0.25)); g.gain.setValueAtTime(0.09 * v, T(t1 - 0.3)); g.gain.linearRampToValueAtTime(0.0001, T(t1));
    n.connect(hp); hp.connect(lp); lp.connect(g); send(g, 0.3, 0, sfx);
    const r = rng(9);
    for (let x = t0 + 0.1; x < t1 - 0.1; x += 0.05 + r() * 0.12) { if (!ok(x)) continue; const o = osc('sine', 1800 + r() * 2400), gg = gain(0), pn = pan(r() * 2 - 1); env(gg, x, 0.001, 0.012 * v, 0.03); o.connect(gg); gg.connect(pn); pn.connect(sfx); o.start(T(x)); o.stop(T(x + 0.05)); }
  }
  function drone(t0, t1, v = 1) {
    if (!ok(t0)) return;
    const lp = filt('lowpass', 240, 0.8), g = gain(0);
    lp.frequency.setValueAtTime(220, T(t0)); lp.frequency.linearRampToValueAtTime(520, T(t1));
    g.gain.setValueAtTime(0.0001, T(t0)); g.gain.linearRampToValueAtTime(0.11 * v, T(t0 + 3)); g.gain.setValueAtTime(0.11 * v, T(t1 - 0.3)); g.gain.linearRampToValueAtTime(0.0001, T(t1 + 0.4));
    lp.connect(g); send(g, 0.5);
    for (const [f, d] of [[N.D2, -6], [N.D2, 6], [N.A2, 0], [N.D3, 3]]) { const o = osc('sawtooth', f); o.detune.value = d; o.connect(lp); o.start(T(t0)); o.stop(T(t1 + 0.5)); }
  }

  // ---------- arrangement ----------
  // I. Dusk 0-8
  drone(0, 16.0, 1);
  wind(0, 16.0, 1); crickets(0.5, 15.5, 1);
  bell(1.1, N.D5, 0.9, -0.3); bell(4.35, N.A4, 0.9, 0.3); bell(5.9, N.F4s * 2, 0.5, 0);
  tick(7.0, 0.9, 2600); blip(7.03, N.E5 * 2, 0.6); blip(7.15, N.A5 * 2, 0.4);

  // II. Rise 8-16
  for (let b = 8; b < 16; b += 0.25) { // pulse bass opening up
    const k = (b - 8) / 8;
    bass(b, N.D2, 0.22, 0.45 + 0.4 * k, 180 + 900 * k * k);
  }
  for (let b = 8; b < 12; b += 1) kick(b, 0.55);
  for (let b = 12; b < 15.5; b += 0.5) kick(b, 0.7 + (b - 12) * 0.06);
  for (let b = 12; b < 15.75; b += 0.125) hat(b, 0.2 + (b - 12) * 0.12, false, ((b * 8) % 2) ? 0.25 : -0.25);
  pad(8, [N.D3, N.A3, N.D4], 7.6, 0.8, 900, 2, 0.5);
  for (const L of [9.0, 10.5, 12.0]) { slide(L - 0.52, L, 1); clunk(L, 1); }
  riser(12.0, 15.9, 1);
  for (let i = 0; i < 6; i++) { tick(13.55 + i * 0.13, 0.5, 1800 + i * 150); tick(14.5 + i * 0.13, 0.7, 2600 + i * 200); }
  { // snare roll
    let x = 14.5; while (x < 15.84) { const step = x < 15.0 ? 0.25 : x < 15.5 ? 0.125 : 0.0625; snare(x, 0.25 + (x - 14.5) * 0.45, 0.25); x += step; }
  }
  swell(14.4, 16.0, 1.2);

  // III. Drop + groove 16-52
  impact(16.0, 1.2);
  pad(16, [N.B2, N.D3, N.F3s, N.B3], 2.0, 1.1, 2200, 0.01, 1.6, 0.8);
  const grooveEnd = 52;
  for (let bar = 0; 16 + bar * 2 < grooveEnd; bar++) {
    const t0 = 16 + bar * 2, ch = CHORDS[bar % 4], late = t0 >= 24, peak = t0 >= 44;
    pad(t0, ch.pad, 1.95, late ? 1.1 : 0.95, peak ? 3200 : 2400, 0.08, 0.3, 0.55);
    for (let i = 0; i < 8; i++) { const oct = i === 3 || i === 7 ? 2 : 1; bass(t0 + i * 0.25, ch.bass * 2 * oct, 0.22, 0.9, peak ? 700 : 520); }
    sub(t0, ch.bass, 1.98, 0.6);
    for (let b = 0; b < 4; b++) kick(t0 + b * 0.5, 1);
    for (const b of [0.5, 1.5]) { clap(t0 + b, 0.9); snare(t0 + b, 0.5, 0.25); }
    for (let s = 0; s < 16; s++) {
      const x = t0 + s * 0.125, off = s % 4 === 2;
      hat(x, off ? 0.85 : 0.45, late && off, s % 2 ? 0.3 : -0.3);
    }
    if (late) ch.arp.forEach((_, j) => { for (let r = 0; r < 4; r++) { const s = r * 4 + j; pluck(t0 + s * 0.125, ch.arp[(j + r) % 4] * (peak ? 2 : 1), peak ? 1 : 0.8, (s % 2 ? 0.4 : -0.4)); } });
    if (peak) bell(t0, ch.arp[2] * 2, 0.45, 0);
  }
  // section transitions
  for (const x of [20, 24, 28, 32, 36, 40]) { whoosh(x - 0.42, 0.42, 0.7, x % 8 ? 1 : -1); hit(x, 0.35); }
  // modes clicks
  [N.D5, N.F5s, N.A5, N.D6].forEach((f, i) => { tick(32 + i, 1, 3000); blip(32 + i + 0.01, f, 1.1); });
  // kelvin slider sweep
  if (ok(37)) { const o = osc('sine', 330), g = gain(0), lp = filt('lowpass', 1200); o.frequency.setValueAtTime(880, T(37)); o.frequency.exponentialRampToValueAtTime(330, T(37.9)); g.gain.setValueAtTime(0.0001, T(37)); g.gain.linearRampToValueAtTime(0.06, T(37.3)); g.gain.exponentialRampToValueAtTime(0.0001, T(38.1)); o.connect(lp); lp.connect(g); send(g, 0.5, 0.3, sfx); o.start(T(37)); o.stop(T(38.2)); }
  // battery fill + plug
  [N.D5, N.E5, N.F5s, N.A5].forEach((f, i) => blip(40.2 + i * 0.25, f, 0.8));
  slide(41.3, 41.95, 0.6); zap(42.0, 1);
  // montage cuts
  for (const x of [44, 46, 48, 50]) { whoosh(x - 0.45, 0.45, 1, x % 4 ? 1 : -1); hit(x, 0.9); }

  // IV. Weather breakdown 52-56
  impact(52.0, 0.55);
  pad(52, CHORDS[0].pad, 1.9, 0.9, 900, 0.3, 0.4, 0.8); pad(54, CHORDS[1].pad, 1.9, 0.9, 700, 0.3, 0.8, 0.8);
  sub(52, N.B1, 2, 0.5); sub(54, N.G1, 2, 0.5);
  rain(51.95, 56.05, 1);
  bell(52.5, N.F5s, 0.5, -0.4); bell(53.5, N.D5, 0.45, 0.4); bell(54.5, N.B4, 0.45, -0.2); bell(55.5, N.D5, 0.4, 0.2);
  kick(54.0, 0.5); kick(55.0, 0.55);

  // V. Pack 56-60
  pad(56, CHORDS[2].pad, 1.9, 0.8, 1200, 0.2, 0.3, 0.6); pad(58, CHORDS[3].pad, 1.95, 0.9, 1500, 0.2, 0.2, 0.6);
  for (let b = 56; b < 59.5; b += 0.25) bass(b, N.D2 * 2, 0.2, 0.55, 300 + (b - 56) * 220);
  tick(56.3, 1, 2600); blip(56.32, N.A5, 0.5);
  for (let i = 0; i < 6; i++) tick(56.55 + i * 0.07, 0.45, 2200 - i * 120);
  for (const L of [57.9, 58.4, 58.9]) { slide(L - 0.42, L, 0.9); clunk(L, 0.9); }
  riser(58.0, 59.88, 1); swell(58.6, 60.0, 1.2);
  { let x = 59.0; while (x < 59.86) { const step = x < 59.5 ? 0.125 : 0.0625; snare(x, 0.3 + (x - 59) * 0.6, 0.25); x += step; } }

  // VI. Hero 60-66
  impact(60.0, 1.3);
  pad(60, [N.D3, N.A3, N.D4, N.F4s, N.A4], 4.2, 1.15, 2000, 0.02, 1.8, 0.85);
  sub(60, N.D2 / 2 * 2, 5.5, 0.8);
  bell(60.4, N.A5, 0.9, -0.2); bell(60.9, N.F5s, 0.8, 0.2); bell(62.2, N.D6, 0.75, 0); bell(63.1, N.A5, 0.5, 0);

  return { stop() { try { master.disconnect(); } catch (e) {} } };
}
