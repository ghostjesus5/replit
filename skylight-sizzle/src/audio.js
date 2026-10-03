// Original score, synthesized: 120 BPM, A minor (Am F C G), cut to picture with foley on every hardware beat.
import { rng } from './util.js';

const mid = n => 440 * Math.pow(2, (n - 69) / 12);
const PROG = [{ r: 45, c: [57, 60, 64, 69] }, { r: 41, c: [57, 60, 65, 69] }, { r: 48, c: [55, 60, 64, 67] }, { r: 43, c: [55, 59, 62, 67] }];
export const FADE = [59.1, 60];

function noiseBuf(c) {
  if (c._nz) return c._nz;
  const n = c.sampleRate * 8, b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0), r = rng(99);
  for (let i = 0; i < n; i++) d[i] = r() * 2 - 1;
  return (c._nz = b);
}
function irBuf(c, sec) {
  const n = Math.floor(c.sampleRate * sec), b = c.createBuffer(2, n, c.sampleRate), r = rng(5);
  for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); for (let i = 0; i < n; i++) d[i] = (r() * 2 - 1) * Math.pow(1 - i / n, 3.2); }
  return b;
}
// Master: glue compressor into a limiter. Music runs through a sidechain "pump" gain keyed to the kick.
export function makeBus(c, dest) {
  const lim = c.createDynamicsCompressor(); lim.threshold.value = -3; lim.knee.value = 0; lim.ratio.value = 20; lim.attack.value = .001; lim.release.value = .08;
  const master = c.createGain(); master.gain.value = .9; master.connect(lim); lim.connect(dest);
  const comp = c.createDynamicsCompressor(); comp.threshold.value = -18; comp.knee.value = 8; comp.ratio.value = 3; comp.attack.value = .005; comp.release.value = .2;
  comp.connect(master);
  const dry = c.createGain(); dry.connect(comp);
  const pump = c.createGain(); pump.connect(comp);
  const verb = c.createConvolver(); verb.buffer = irBuf(c, 3.2); const wet = c.createGain(); wet.gain.value = .32; verb.connect(wet); wet.connect(comp);
  return { c, dry, pump, verb, master };
}
function out(b, node, send = 0, music = false) {
  node.connect(music ? b.pump : b.dry);
  if (send) { const g = b.c.createGain(); g.gain.value = send; node.connect(g); g.connect(b.verb); }
}
function env(g, w, a, peak, d) { g.gain.setValueAtTime(.0001, w); g.gain.exponentialRampToValueAtTime(peak, w + a); g.gain.exponentialRampToValueAtTime(.0001, w + a + d); }
function nz(b, w, dur) { const s = b.c.createBufferSource(); s.buffer = noiseBuf(b.c); s.start(w, (w * 7.31) % 1.5); s.stop(w + dur); return s; }
function filt(c, type, f, q = .7) { const x = c.createBiquadFilter(); x.type = type; x.frequency.value = f; x.Q.value = q; return x; }
function osc(b, w, type, f, dur) { const o = b.c.createOscillator(); o.type = type; o.frequency.value = f; o.start(w); o.stop(w + dur); return o; }
function shaper(c, k) { const s = c.createWaveShaper(), n = 1024, cv = new Float32Array(n); for (let i = 0; i < n; i++) { const x = i / (n - 1) * 2 - 1; cv[i] = Math.tanh(k * x) / Math.tanh(k); } s.curve = cv; return s; }

export const VO = {
  kick(b, w, v = 1) {
    const c = b.c, o = c.createOscillator(), g = c.createGain(); o.frequency.setValueAtTime(150, w); o.frequency.exponentialRampToValueAtTime(42, w + .12);
    env(g, w, .002, 1 * v, .4); o.connect(g); out(b, g); o.start(w); o.stop(w + .5);
    const n = nz(b, w, .03), f = filt(c, 'highpass', 2800), h = c.createGain(); env(h, w, .001, .18 * v, .012); n.connect(f); f.connect(h); out(b, h);
    // duck the music bus
    b.pump.gain.cancelScheduledValues(w); b.pump.gain.setValueAtTime(.35, w); b.pump.gain.linearRampToValueAtTime(1, w + .28);
  },
  clap(b, w, v = 1) { const c = b.c; for (const [dt, a, d] of [[0, .4, .012], [.011, .36, .012], [.022, .62, .16]]) { const n = nz(b, w + dt, d + .05), f = filt(c, 'bandpass', 1250, 1.1), g = c.createGain(); env(g, w + dt, .001, a * v, d); n.connect(f); f.connect(g); out(b, g, .3); } },
  hat(b, w, v = .07, open = false) { const c = b.c, n = nz(b, w, open ? .3 : .06), f = filt(c, 'highpass', 8200), g = c.createGain(); env(g, w, .001, v, open ? .2 : .03); n.connect(f); f.connect(g); out(b, g, .1); },
  tom(b, w, v = .8, f0 = 140) { const c = b.c, o = c.createOscillator(), g = c.createGain(); o.frequency.setValueAtTime(f0, w); o.frequency.exponentialRampToValueAtTime(f0 * .5, w + .3); env(g, w, .003, .7 * v, .38); o.connect(g); out(b, g, .35); o.start(w); o.stop(w + .45);
    const n = nz(b, w, .1), fl = filt(c, 'lowpass', 1800), h = c.createGain(); env(h, w, .001, .2 * v, .06); n.connect(fl); fl.connect(h); out(b, h, .3); },
  bass(b, w, n, dur, v = .24, cut = 900) {
    const c = b.c, f = filt(c, 'lowpass', cut, 2.5), g = c.createGain(); f.frequency.setValueAtTime(cut, w); f.frequency.exponentialRampToValueAtTime(180, w + dur);
    g.gain.setValueAtTime(.0001, w); g.gain.exponentialRampToValueAtTime(v, w + .008); g.gain.exponentialRampToValueAtTime(v * .5, w + dur * .7); g.gain.exponentialRampToValueAtTime(.0001, w + dur); f.connect(g); out(b, g, 0, true);
    for (const [type, m, dt] of [['sawtooth', 1, -6], ['sawtooth', 1, 6], ['sine', .5, 0]]) { const o = osc(b, w, type, mid(n) * m, dur + .02); o.detune.value = dt; o.connect(type === 'sine' ? g : f); }
  },
  pad(b, w, notes, dur, v = .028, open = 1) {
    const c = b.c, f = filt(c, 'lowpass', 700 * open, .5), g = c.createGain();
    f.frequency.setValueAtTime(600 * open, w); f.frequency.linearRampToValueAtTime(2200 * open, w + dur * .5); f.frequency.linearRampToValueAtTime(900 * open, w + dur);
    g.gain.setValueAtTime(0, w); g.gain.linearRampToValueAtTime(v, w + Math.min(.35, dur * .3)); g.gain.setValueAtTime(v, w + dur); g.gain.linearRampToValueAtTime(0, w + dur + 1.2); f.connect(g); out(b, g, .55, true);
    for (const n of notes) for (const dt of [-11, 0, 11]) { const o = osc(b, w, 'sawtooth', mid(n), dur + 1.3); o.detune.value = dt; o.connect(f); }
  },
  pluck(b, w, n, v = .05) { const c = b.c, f = filt(c, 'lowpass', 3400, 2), g = c.createGain(); f.frequency.setValueAtTime(4200, w); f.frequency.exponentialRampToValueAtTime(600, w + .28); env(g, w, .003, v, .32); f.connect(g); out(b, g, .45, true);
    for (const [ty, dt] of [['triangle', -4], ['sawtooth', 4]]) { const o = osc(b, w, ty, mid(n), .4); o.detune.value = dt; o.connect(f); } },
  lead(b, w, n, dur, v = .05) {
    const c = b.c, f = filt(c, 'lowpass', 2600, 1.2), g = c.createGain(); g.gain.setValueAtTime(.0001, w); g.gain.exponentialRampToValueAtTime(v, w + .02); g.gain.setValueAtTime(v, w + dur * .8); g.gain.exponentialRampToValueAtTime(.0001, w + dur + .25);
    f.connect(g); out(b, g, .5, true);
    const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = 5.2; lg.gain.value = 9; lfo.connect(lg); lfo.start(w + .15); lfo.stop(w + dur + .3);
    for (const dt of [-7, 7]) { const o = osc(b, w, 'sawtooth', mid(n), dur + .3); o.detune.value = dt; lg.connect(o.detune); o.connect(f); }
  },
  bell(b, w, n, v = .05) { const c = b.c, g = c.createGain(); env(g, w, .002, v, 2); out(b, g, .7); for (const [m, a] of [[1, 1], [2, .35], [3.01, .14], [4.2, .06]]) { const o = osc(b, w, 'sine', mid(n) * m, 2.2), og = c.createGain(); og.gain.value = a; o.connect(og); og.connect(g); } },
  stab(b, w, notes, v = .05) { const c = b.c, f = filt(c, 'lowpass', 3000, 1), g = c.createGain(); env(g, w, .004, v, .45); f.connect(g); out(b, g, .5, true); for (const n of notes) for (const dt of [-9, 9]) { const o = osc(b, w, 'sawtooth', mid(n), .55); o.detune.value = dt; o.connect(f); } },
  braam(b, w, v = 1) {
    const c = b.c, f = filt(c, 'lowpass', 180, 1.5), sh = shaper(c, 2.5), g = c.createGain();
    f.frequency.setValueAtTime(180, w); f.frequency.exponentialRampToValueAtTime(1400, w + .25); f.frequency.exponentialRampToValueAtTime(260, w + 2.6);
    g.gain.setValueAtTime(.0001, w); g.gain.exponentialRampToValueAtTime(.42 * v, w + .06); g.gain.exponentialRampToValueAtTime(.0001, w + 3.2);
    f.connect(sh); sh.connect(g); out(b, g, .5);
    for (const [n, ty, dt] of [[33, 'sawtooth', -8], [33, 'sawtooth', 8], [45, 'sawtooth', 0], [52, 'square', 4], [21, 'sine', 0]]) { const o = osc(b, w, ty, mid(n), 3.3); o.detune.value = dt; o.connect(f); }
  },
  sub(b, w, v = .8) { const c = b.c, o = c.createOscillator(), g = c.createGain(); o.frequency.setValueAtTime(110, w); o.frequency.exponentialRampToValueAtTime(28, w + 1.4); env(g, w, .01, v, 1.6); o.connect(g); out(b, g); o.start(w); o.stop(w + 1.7); },
  impact(b, w, v = 1) { const c = b.c, o = c.createOscillator(), g = c.createGain(); o.frequency.setValueAtTime(70, w); o.frequency.exponentialRampToValueAtTime(30, w + 1.1); env(g, w, .004, .85 * v, 1.3); o.connect(g); out(b, g, .3); o.start(w); o.stop(w + 1.4);
    const n = nz(b, w, 1.2), f = filt(c, 'lowpass', 1400), h = c.createGain(); f.frequency.setValueAtTime(3200, w); f.frequency.exponentialRampToValueAtTime(200, w + .9); env(h, w, .002, .5 * v, .9); n.connect(f); f.connect(h); out(b, h, .7); },
  riser(b, w, dur, v = .18) { const c = b.c, n = nz(b, w, dur + .05), f = filt(c, 'bandpass', 300, 2.5), g = c.createGain(); f.frequency.setValueAtTime(300, w); f.frequency.exponentialRampToValueAtTime(8000, w + dur);
    g.gain.setValueAtTime(.0001, w); g.gain.exponentialRampToValueAtTime(v, w + dur * .95); g.gain.linearRampToValueAtTime(0, w + dur + .02); n.connect(f); f.connect(g); out(b, g, .35);
    const o = osc(b, w, 'sawtooth', 110, dur), of = filt(c, 'lowpass', 1200), og = c.createGain(); o.frequency.exponentialRampToValueAtTime(880, w + dur); og.gain.setValueAtTime(.0001, w); og.gain.exponentialRampToValueAtTime(v * .25, w + dur * .95); og.gain.linearRampToValueAtTime(0, w + dur + .02); o.connect(of); of.connect(og); out(b, og, .4); },
  swell(b, w, dur, v = .12) { const c = b.c, n = nz(b, w, dur + .05), f = filt(c, 'highpass', 3000), g = c.createGain(); g.gain.setValueAtTime(.0001, w); g.gain.exponentialRampToValueAtTime(v, w + dur); g.gain.linearRampToValueAtTime(0, w + dur + .03); n.connect(f); f.connect(g); out(b, g, .6); },
  whoosh(b, w, v = .16, dur = .66) { const c = b.c, n = nz(b, w, dur + .05), f = filt(c, 'bandpass', 400, 1.3), g = c.createGain(); f.frequency.setValueAtTime(350, w); f.frequency.exponentialRampToValueAtTime(3800, w + dur * .48); f.frequency.exponentialRampToValueAtTime(450, w + dur);
    g.gain.setValueAtTime(.0001, w); g.gain.exponentialRampToValueAtTime(v, w + dur * .45); g.gain.exponentialRampToValueAtTime(.0001, w + dur); n.connect(f); f.connect(g); out(b, g, .35); },
  blip(b, w, fq, v = .05) { const g = b.c.createGain(); env(g, w, .002, v, .08); out(b, g, .25); osc(b, w, 'sine', fq, .12).connect(g); },
  ui(b, w) { VO.blip(b, w, 1900, .035); VO.blip(b, w + .05, 2550, .03); },
  cricket(b, w, fq = 4650, v = .016) { for (let i = 0; i < 3; i++) { const s = w + i * .034, g = b.c.createGain(); env(g, s, .004, v, .018); out(b, g, .4); osc(b, s, 'sine', fq, .03).connect(g); } },
  wind(b, w, dur, v = .05) { const c = b.c, n = nz(b, w, Math.min(dur, 3.9)), f = filt(c, 'bandpass', 380, .6), g = c.createGain(), r = rng(Math.floor(w * 10) + 3);
    g.gain.setValueAtTime(.0001, w); g.gain.exponentialRampToValueAtTime(v, w + .8);
    for (let k = 1; k < dur / .5; k++) { g.gain.linearRampToValueAtTime(v * (.5 + r()), w + k * .5); f.frequency.linearRampToValueAtTime(260 + r() * 300, w + k * .5); }
    g.gain.linearRampToValueAtTime(0, w + Math.min(dur, 3.9)); n.connect(f); f.connect(g); out(b, g, .3); },
  rain(b, w, dur, v = .08) { const c = b.c, n = nz(b, w, Math.min(dur, 3.9)), f = filt(c, 'highpass', 1400), f2 = filt(c, 'lowpass', 9000), g = c.createGain();
    g.gain.setValueAtTime(.0001, w); g.gain.exponentialRampToValueAtTime(v, w + .25); g.gain.setValueAtTime(v, w + dur - .3); g.gain.linearRampToValueAtTime(0, w + dur); n.connect(f); f.connect(f2); f2.connect(g); out(b, g, .3);
    const r = rng(17); for (let k = 0; k < dur * 30; k++) { const t = w + r() * dur, d = b.c.createGain(); env(d, t, .001, .03 + r() * .04, .01); out(b, d, .2); const nn = nz(b, t, .02), bf = filt(c, 'bandpass', 2000 + r() * 4000, 3); nn.connect(bf); bf.connect(d); } },
  click(b, w, v = 1) { const c = b.c, n = nz(b, w, .02), f = filt(c, 'highpass', 3000), g = c.createGain(); env(g, w, .0005, .45 * v, .008); n.connect(f); f.connect(g); out(b, g, .1);
    const o = c.createOscillator(), og = c.createGain(); o.type = 'square'; o.frequency.setValueAtTime(1900, w); o.frequency.exponentialRampToValueAtTime(900, w + .015); env(og, w, .0005, .06 * v, .02); o.connect(og); out(b, og); o.start(w); o.stop(w + .03); },
  ratchet(b, w) { for (let i = 0; i < 6; i++) VO.click(b, w + i * .028, .35 + i * .06); VO.whoosh(b, w - .1, .07, .4); const g = b.c.createGain(); env(g, w + .18, .002, .3, .08); out(b, g); osc(b, w + .18, 'sine', 160, .12).connect(g); },
  servo(b, w, dur = .5, up = true) { const c = b.c, o = c.createOscillator(), f = filt(c, 'bandpass', 900, 4), g = c.createGain(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(up ? 180 : 320, w); o.frequency.linearRampToValueAtTime(up ? 320 : 180, w + dur); g.gain.setValueAtTime(.0001, w); g.gain.exponentialRampToValueAtTime(.05, w + .04); g.gain.setValueAtTime(.05, w + dur - .05); g.gain.exponentialRampToValueAtTime(.0001, w + dur);
    o.connect(f); f.connect(g); out(b, g, .15); o.start(w); o.stop(w + dur + .02); },
  zap(b, w, dur = .8) { const c = b.c, o = c.createOscillator(), g = c.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(180, w); o.frequency.exponentialRampToValueAtTime(1600, w + dur);
    g.gain.setValueAtTime(.0001, w); g.gain.exponentialRampToValueAtTime(.08, w + dur * .9); g.gain.linearRampToValueAtTime(0, w + dur + .02); o.connect(g); out(b, g, .3); o.start(w); o.stop(w + dur + .05);
    const n = nz(b, w, dur), f = filt(c, 'bandpass', 3000, 2), h = c.createGain(); f.frequency.setValueAtTime(1200, w); f.frequency.exponentialRampToValueAtTime(7000, w + dur); h.gain.setValueAtTime(.0001, w); h.gain.exponentialRampToValueAtTime(.05, w + dur * .9); h.gain.linearRampToValueAtTime(0, w + dur + .02); n.connect(f); f.connect(h); out(b, h, .3); },
  thud(b, w, v = 1) { const c = b.c, o = c.createOscillator(), g = c.createGain(); o.frequency.setValueAtTime(95, w); o.frequency.exponentialRampToValueAtTime(48, w + .14); env(g, w, .002, .6 * v, .2); o.connect(g); out(b, g, .2); o.start(w); o.stop(w + .3);
    const n = nz(b, w, .12), f = filt(c, 'lowpass', 900), h = c.createGain(); env(h, w, .001, .25 * v, .08); n.connect(f); f.connect(h); out(b, h, .2); },
};

export function buildScore() {
  const ev = [], add = (t, fn, ...a) => ev.push({ t, fn, a }), inR = (t, a, b) => t >= a && t < b;
  // ---- 0-10: night, the click, ignition ----
  add(0, 'wind', 3.9, .05); add(3.9, 'wind', 3.9, .045); add(7.8, 'wind', 2.2, .03);
  for (let k = 0; k < 16; k++) { add(.3 + k * .43, 'cricket', 4650, .014); if (k < 13) add(.55 + k * .51, 'cricket', 4300, .009); }
  add(0, 'pad', [45, 52, 57], 4, .02, .45); add(4, 'pad', [45, 52, 57, 60], 3.6, .022, .55); add(7.6, 'pad', [45, 52, 57, 64], 2.4, .026, .8);
  add(1.0, 'bell', 76, .035); add(1.5, 'bell', 69, .025); add(5.0, 'bell', 72, .035); add(5.5, 'bell', 76, .025);
  [4.0, 5.0, 6.0, 6.5, 7.0].forEach((t, i) => add(t, 'kick', .25 + i * .06));
  add(6.4, 'swell', 1.05, .06);
  add(7.45, 'click', 1.3);
  for (let k = 0; k < 28; k++) add(7.45 + k * .4 / 28, 'blip', 900 + k * 55, .022);
  add(7.5, 'bell', 81, .04);
  [8.11, 8.22, 8.33, 8.44, 8.55].forEach((t, i) => { add(t, 'bell', [76, 79, 81, 84, 88][i], .035); add(t, 'tom', .35, 90 + i * 12); });
  add(8.6, 'riser', 1.4, .2); add(8.8, 'swell', 1.2, .1);
  // ---- 10: title hit ----
  add(10, 'braam', 1); add(10, 'sub', .8); add(10, 'impact', .9); add(10, 'pad', [45, 57, 60, 64, 71], 2, .03, .9); add(10, 'bell', 81, .05);
  // ---- 12-20: engineering build ----
  for (let k = 0; k < 64; k++) {
    const t = 12 + k * .125, bar = Math.floor(k / 16), cut = 500 + bar * 350;
    if (k % 2 === 0) add(t, 'bass', k % 16 === 14 ? 57 : 45, .2, .2, cut);
    add(t, 'hat', k % 4 === 2 ? .06 : .03);
    if (k % 8 === 0) add(t, 'tom', .5, 120); if (k % 16 === 6 || k % 16 === 11) add(t, 'tom', .35, 95);
  }
  for (let bar = 0; bar < 4; bar++) add(12 + bar * 2, 'pad', [57, 60, 64, 69], 2, .022, .6 + bar * .1);
  [12.4, 13.0, 14.0, 16.1, 17.1, 17.6, 18.2].forEach(t => add(t, 'ui'));
  for (let k = 0; k < 16; k++) add(18 + k * .1, 'clap', .15 + k * .045);
  add(18, 'riser', 1.8, .22);
  // ---- 20-42 and 42-50: main groove, Am F C G ----
  for (let bar = 0; bar < 15; bar++) {
    const T = 20 + bar * 2, ch = PROG[bar % 4];
    const rainB = inR(T, 40, 42);
    if (rainB) { add(T, 'pad', ch.c, 2, .03, .5); add(T, 'bass', ch.r, 1.9, .16, 300); continue; }
    add(T, 'pad', ch.c, 2, inR(T, 46, 50) ? .034 : .026, 1);
    for (let k = 0; k < 8; k++) add(T + k * .25, 'bass', ch.r + (k === 7 ? 12 : 0), .22, .24, 1000);
    for (let k = 0; k < 4; k++) {
      const w = T + k * .5;
      add(w, 'kick', 1);
      if (k === 1 || k === 3) add(w, 'clap', .8);
      add(w + .25, 'hat', .09, true); add(w, 'hat', .035); add(w + .125, 'hat', .025); add(w + .375, 'hat', .025);
    }
    const arp = [ch.c[0] + 12, ch.c[1] + 12, ch.c[2] + 12, ch.c[3] + 12, ch.c[2] + 12, ch.c[1] + 12, ch.c[3], ch.c[2] + 12];
    for (let k = 0; k < 8; k++) add(T + k * .25, 'pluck', arp[k], k % 2 ? .03 : .045);
    if (inR(T, 28, 36) || inR(T, 46, 50)) {
      const top = ch.c[3] + 12, m = [[0, top + 7, .7], [.75, top + 5, .25], [1, top + 3, .45], [1.5, top, .45]];
      for (const [dt, n, d] of m) add(T + dt, 'lead', n - 12, d, .045);
    }
  }
  // ---- feature foley and hits ----
  add(20, 'impact', .8); add(20, 'sub', .6);
  [20, 20.5, 21, 21.5].forEach((t, i) => { add(t, 'click', 1); add(t, 'stab', [57 + i * 2, 64 + i * 2, 69 + i * 2], .04 + i * .01); }); add(21.5, 'impact', .5);
  [24.5, 25.25, 26].forEach(t => add(t, 'ratchet'));
  add(28, 'whoosh', .2, 3.2); add(27.9, 'impact', .4);
  [32.5, 33.4, 34.4].forEach((t, i) => add(t, 'servo', .7, i < 2));
  add(37.3, 'swell', .8, .08); add(38.1, 'bell', 76, .04);
  add(39.8, 'rain', 2.4, .09); add(41.4, 'riser', .6, .16);
  add(42, 'impact', 1); add(42, 'sub', .7); add(42.15, 'zap', .8); add(42.95, 'impact', .5); add(42.95, 'bell', 81, .04);
  [43.2, 43.4, 43.6, 43.8].forEach((t, i) => add(t, 'blip', 700 + i * 180, .03));
  [46, 47, 48, 49].forEach(t => { add(t, 'impact', .45); add(t, 'tom', .5, 110); }); add(47.6, 'riser', .4, .1);
  // ---- 50-53: pack down ----
  add(50, 'pad', [45, 57, 60, 64], 3, .03, .5); add(50, 'bass', 33, 2.6, .18, 260);
  for (let i = 0; i < 6; i++) add(50 + i * .07, 'servo', .35, false);
  add(50.35, 'whoosh', .12, .8); add(51.1, 'whoosh', .2, .3); add(51.25, 'thud', .5);
  add(52.45, 'thud', 1.1); [52.5, 52.58, 52.66].forEach(t => add(t, 'click', .9));
  // ---- 53-56: finale ----
  for (let bar = 0; bar < 2; bar++) {
    const T = 53 + bar * 1.5, ch = PROG[bar ? 2 : 1];
    add(T, 'pad', ch.c.concat(ch.c[0] + 12), 1.5, .036, 1.1); add(T, 'bass', ch.r, 1.4, .2, 600);
  }
  [53.5, 54, 54.5, 55].forEach((t, i) => { add(t, 'kick', .9); add(t, 'tom', .6, 100 + i * 15); add(t, 'stab', [64 + i * 2, 69 + i * 2, 72 + i * 2], .045); });
  add(54.2, 'riser', 1.8, .24); for (let k = 0; k < 12; k++) add(55 + k * .083, 'clap', .2 + k * .06);
  // ---- 56: logo hit, ring out ----
  add(56, 'braam', 1.1); add(56, 'sub', .9); add(56, 'impact', 1); add(56, 'pad', [45, 57, 60, 64, 69, 72, 76], 3.2, .045, 1.1);
  [81, 84, 88, 93].forEach((n, i) => add(56.3 + i * .32, 'bell', n, .04));
  add(56, 'wind', 3.9, .03);
  return ev.sort((a, b) => a.t - b.t);
}

export async function renderAudio(DUR) {
  const sr = 48000, c = new OfflineAudioContext(2, sr * DUR, sr), b = makeBus(c, c.destination);
  b.master.gain.setValueAtTime(.9, FADE[0]); b.master.gain.linearRampToValueAtTime(0, FADE[1]);
  for (const e of buildScore()) VO[e.fn](b, e.t, ...e.a);
  const buf = await c.startRendering(), L = buf.getChannelData(0), R = buf.getChannelData(1), n = L.length;
  const ab = new ArrayBuffer(44 + n * 4), dv = new DataView(ab);
  const ws = (o, s) => { for (let i = 0; i < s.length; i++) dv.setUint8(o + i, s.charCodeAt(i)); };
  ws(0, 'RIFF'); dv.setUint32(4, 36 + n * 4, true); ws(8, 'WAVE'); ws(12, 'fmt '); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 2, true);
  dv.setUint32(24, sr, true); dv.setUint32(28, sr * 4, true); dv.setUint16(32, 4, true); dv.setUint16(34, 16, true); ws(36, 'data'); dv.setUint32(40, n * 4, true);
  let peak = 0; for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
  const k = peak > .97 ? .97 / peak : 1;
  for (let i = 0; i < n; i++) { dv.setInt16(44 + i * 4, Math.max(-1, Math.min(1, L[i] * k)) * 32767, true); dv.setInt16(46 + i * 4, Math.max(-1, Math.min(1, R[i] * k)) * 32767, true); }
  const u8 = new Uint8Array(ab); let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
  return { b64: btoa(s), peak };
}
