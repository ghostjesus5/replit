// Procedural sound and music. No audio files.
// GameScene emits game.events 'sfx' (name, data). Music arrives as 'sfx' 'music' or a 'music' event ({ theme, boss }).
// The house style is "choir over metal guitars": churchy pads and organ on top, palm-muted chugs underneath.
// Everything here is a no-op when Web Audio is missing, and nothing in here is allowed to throw.

const STORE_KEY = 'bible2.muted';
const LOOKAHEAD = 0.12; // seconds of notes scheduled ahead of the audio clock
const TICK_MS = 25;

const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
const rand = (a, b) => a + Math.random() * (b - a);

const TRIADS = { M: [0, 4, 7], m: [0, 3, 7], d: [0, 3, 6], s: [0, 5, 7], a: [0, 4, 8], 7: [0, 4, 7, 10], m7: [0, 3, 7, 10] };

// Chords are "semitone offset from key root" + quality. Each chord lasts one bar.
// gtr/kick/snare/hat are 16 step patterns. x = hit, O = accent or open chord, . = rest.
const TRACKS = {
  menu: {
    bpm: 66, root: 50, style: 'menu',
    prog: [[0, 'M'], [5, 'M'], [9, 'm'], [7, 's'], [0, 'M'], [5, 'M'], [7, 'M'], [0, 'M']],
  },
  eden: {
    bpm: 144, root: 50, style: 'metal', // D major, bright and earnest
    prog: [[0, 'M'], [7, 'M'], [9, 'm'], [5, 'M']],
    gtr: 'O.x.x.xxO.x.xxx.', kick: 'x.....x.x.....x.', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.',
    bell: true,
  },
  egypt: {
    bpm: 150, root: 52, style: 'metal', // E phrygian, snake charmer goes to church
    prog: [[0, 'm'], [1, 'M'], [0, 'm'], [10, 'm'], [0, 'm'], [1, 'M'], [3, 'M'], [1, 'M']],
    gtr: 'Oxx.xx.xOxx.x.x.', kick: 'x..x..x.x..x..x.', snare: '....x.......x...', hat: 'x.xxx.xxx.xxx.xx',
    lead: [0, 1, 4, 5, 7, 8, 11, 12],
  },
  redsea: {
    bpm: 146, root: 50, style: 'metal', // D minor, big waves
    prog: [[0, 'm'], [8, 'M'], [3, 'M'], [10, 'M']],
    gtr: 'O..xO..xO.xxO...', kick: 'x..x..x...x.x...', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.',
  },
  jericho: {
    bpm: 152, root: 55, style: 'metal', // G mixolydian, trumpets and walls
    prog: [[0, 'M'], [10, 'M'], [5, 'M'], [0, 'M']],
    gtr: 'O.xxO.xxO.xxOxxx', kick: 'x.x...x.x.x...x.', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.',
    brass: true,
  },
  babel: {
    bpm: 148, root: 53, style: 'metal', // F lydian, slightly confused
    prog: [[0, 'M'], [2, 'M'], [0, 'M'], [2, 'M'], [4, 'm'], [2, 'M'], [11, 'd'], [7, 'M']],
    gtr: 'O.x.xO.x.xO.x.x.', kick: 'x...x..x..x.x...', snare: '....x.......x..x', hat: 'xx.xx.xx.xx.xx.x',
    bell: true,
  },
  revelation: {
    bpm: 168, root: 48, style: 'metal', // C minor, the end times, double kick
    prog: [[0, 'm'], [8, 'M'], [5, 'm'], [7, 'M'], [0, 'm'], [8, 'M'], [10, 'M'], [7, '7']],
    gtr: 'Oxxxxxxxoxxxxxxx', kick: 'xxxxxxxxxxxxxxxx', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.',
  },
  hymn: {
    bpm: 140, root: 55, style: 'metal', // G major hymn with a banjo. For everything we did not plan for
    prog: [[0, 'M'], [5, 'M'], [0, 'M'], [7, 'M'], [9, 'm'], [5, 'M'], [0, 'M'], [7, 'M']],
    gtr: 'O...x.x.O...x.x.', kick: 'x.......x.x.....', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.',
    banjo: true,
  },
};

const BOSS = { gtr: 'Oxxxxxxxxxxxxxxx', kick: 'xxxxxxxxxxxxxxxx', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.' };

export function initAudio(game) {
  let muted = false;
  try { muted = window.localStorage.getItem(STORE_KEY) === '1'; } catch (e) { /* storage blocked */ }

  const A = { ctx: null, muted, track: null, desired: { theme: 'menu', boss: false }, gameMusic: null, duck: 1 };

  const api = {
    toggleMute() {
      A.muted = !A.muted;
      try { window.localStorage.setItem(STORE_KEY, A.muted ? '1' : '0'); } catch (e) { /* storage blocked */ }
      applyMute();
      return A.muted;
    },
    isMuted: () => A.muted,
    // for playtests: what is the audio engine doing right now
    debug: () => ({ ctx: A.ctx ? A.ctx.state : 'none', track: A.track ? A.track.key : null, muted: A.muted }),
  };
  game.audio = api;

  const AC = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
  if (!AC) return;

  // ---------------------------------------------------------------- context and buses

  function build() {
    if (A.ctx) return A.ctx;
    const ctx = new AC();
    A.ctx = ctx;

    A.master = ctx.createGain();
    A.master.gain.value = A.muted ? 0 : 0.9;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 4;
    comp.attack.value = 0.004;
    comp.release.value = 0.2;
    A.master.connect(comp).connect(ctx.destination);

    A.sfx = ctx.createGain();
    A.sfx.gain.value = 0.8;
    A.sfx.connect(A.master);

    A.musicDuck = ctx.createGain();
    A.musicDuck.connect(A.master);
    A.music = ctx.createGain();
    A.music.gain.value = 0.5;
    A.music.connect(A.musicDuck);

    // one shared hall. Churches are mostly reverb
    A.verb = ctx.createConvolver();
    A.verb.buffer = impulse(ctx, 2.2, 2.6);
    A.verbReturn = ctx.createGain();
    A.verbReturn.gain.value = 0.55;
    A.verb.connect(A.verbReturn).connect(A.master);

    A.noise = noiseBuffer(ctx);
    A.organWave = ctx.createPeriodicWave(new Float32Array([0, 1, 0.8, 0.5, 0.55, 0, 0.3, 0, 0.25]), new Float32Array(9));
    A.brassWave = ctx.createPeriodicWave(new Float32Array([0, 1, 0.7, 0.55, 0.4, 0.3, 0.22, 0.15, 0.1]), new Float32Array(9));

    // shared choir formant banks ("ahh"), one for the music and one for sfx
    A.choirMusic = choirBank(ctx, A.music, 0.35);
    A.choirSfx = choirBank(ctx, A.sfx, 0.5);

    // shared vibrato LFO, in cents
    A.vib = ctx.createOscillator();
    A.vib.frequency.value = 5.2;
    A.vibDepth = ctx.createGain();
    A.vibDepth.gain.value = 14;
    A.vib.connect(A.vibDepth);
    A.vib.start();

    // guitar rig: notes go in clean, get fuzzed and filtered once
    A.gtrIn = ctx.createGain();
    A.gtrIn.gain.value = 1;
    const shaper = ctx.createWaveShaper();
    shaper.curve = distCurve(60);
    shaper.oversample = '2x';
    const cab = ctx.createBiquadFilter();
    cab.type = 'lowpass';
    cab.frequency.value = 2600;
    cab.Q.value = 0.9;
    const thump = ctx.createBiquadFilter();
    thump.type = 'peaking';
    thump.frequency.value = 110;
    thump.gain.value = 5;
    A.gtrOut = ctx.createGain();
    A.gtrOut.gain.value = 0.16;
    A.gtrIn.connect(shaper).connect(cab).connect(thump).connect(A.gtrOut).connect(A.music);

    // sfx crunch: a little fuzz for kills and walls
    A.crunch = ctx.createGain();
    const cshaper = ctx.createWaveShaper();
    cshaper.curve = distCurve(25);
    const cgain = ctx.createGain();
    cgain.gain.value = 0.5;
    A.crunch.connect(cshaper).connect(cgain).connect(A.sfx);

    A.timer = setInterval(() => safe(tick), TICK_MS);
    document.addEventListener('visibilitychange', () => safe(() => {
      if (document.hidden) ctx.suspend();
      else if (unlocked) ctx.resume();
    }));
    return ctx;
  }

  function impulse(ctx, seconds, decay) {
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }

  function noiseBuffer(ctx) {
    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  function distCurve(k) {
    const n = 1024;
    const c = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1;
      c[i] = ((1 + k) * x) / (1 + k * Math.abs(x));
    }
    return c;
  }

  function choirBank(ctx, dest, verbAmt) {
    const input = ctx.createGain();
    const out = ctx.createGain();
    out.gain.value = 1.6;
    [[800, 7, 1], [1150, 9, 0.55], [2900, 11, 0.22], [450, 4, 0.35]].forEach(([f, q, g]) => {
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = f;
      bp.Q.value = q;
      const gn = ctx.createGain();
      gn.gain.value = g;
      input.connect(bp).connect(gn).connect(out);
    });
    out.connect(dest);
    const send = ctx.createGain();
    send.gain.value = verbAmt;
    out.connect(send).connect(A.verb);
    return input;
  }

  function safe(fn) {
    try { return fn(); } catch (e) { return undefined; }
  }

  function applyMute() {
    if (!A.ctx) return;
    const t = A.ctx.currentTime;
    A.master.gain.cancelScheduledValues(t);
    A.master.gain.setTargetAtTime(A.muted ? 0 : 0.9, t, 0.03);
  }

  // ---------------------------------------------------------------- unlock (mobile autoplay rules)

  let unlocked = false;
  function unlock() {
    safe(() => {
      const ctx = build();
      unlocked = true;
      if (ctx.state !== 'running') ctx.resume();
      if (!A.track) syncMusic(true);
    });
  }
  ['pointerdown', 'touchend', 'keydown', 'mousedown'].forEach((ev) => window.addEventListener(ev, unlock, { capture: true, passive: true }));

  window.addEventListener('keydown', (e) => safe(() => {
    if (e.repeat || (e.key !== 'm' && e.key !== 'M')) return;
    api.toggleMute();
    game.events.emit('mute', A.muted);
  }));

  // ---------------------------------------------------------------- note helpers

  const live = () => A.ctx && A.ctx.state === 'running';

  function cleanup(src, ...nodes) {
    src.onended = () => safe(() => { src.disconnect(); nodes.forEach((n) => n.disconnect()); });
  }

  // one oscillator with an envelope. Returns the oscillator so callers can bend it.
  function tone(dest, { type = 'sine', wave, freq = 440, to, t, dur = 0.2, gain = 0.2, attack = 0.005, release, detune = 0, vib = false, curve = 'exp' }) {
    const ctx = A.ctx;
    const o = ctx.createOscillator();
    if (wave) o.setPeriodicWave(wave);
    else o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (to) o.frequency.exponentialRampToValueAtTime(Math.max(1, to), t + dur);
    o.detune.value = detune;
    if (vib) A.vibDepth.connect(o.detune);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(gain, t + attack);
    const rel = release ?? dur;
    if (curve === 'exp') g.gain.exponentialRampToValueAtTime(0.0001, t + attack + rel);
    else {
      g.gain.setValueAtTime(gain, t + Math.max(attack, dur - rel));
      g.gain.linearRampToValueAtTime(0.0001, t + dur);
    }
    o.connect(g).connect(dest);
    o.start(t);
    o.stop(t + attack + Math.max(rel, dur) + 0.05);
    cleanup(o, g);
    if (vib) o.addEventListener('ended', () => safe(() => A.vibDepth.disconnect(o.detune)));
    return o;
  }

  function noise(dest, { t, dur = 0.2, gain = 0.2, type = 'bandpass', freq = 1000, to, q = 1, attack = 0.002 }) {
    const ctx = A.ctx;
    const s = ctx.createBufferSource();
    s.buffer = A.noise;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(freq, t);
    if (to) f.frequency.exponentialRampToValueAtTime(to, t + dur);
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(dest);
    s.start(t, Math.random() * 1.5);
    s.stop(t + dur + 0.05);
    cleanup(s, f, g);
  }

  // a choir voice: two detuned saws into the formant bank, with vibrato and a soft swell
  function choir(bank, midi, t, dur, gain = 0.06, attack = 0.25) {
    [-9, 8].forEach((det) => tone(bank, { type: 'sawtooth', freq: mtof(midi), t, dur, gain, attack, release: Math.min(0.5, dur * 0.4), detune: det, vib: true, curve: 'lin' }));
  }

  function organ(dest, midi, t, dur, gain = 0.07, verb = 0.6) {
    const g = A.ctx.createGain();
    g.gain.value = 1;
    g.connect(dest);
    const send = A.ctx.createGain();
    send.gain.value = verb;
    g.connect(send).connect(A.verb);
    const o = tone(g, { wave: A.organWave, freq: mtof(midi), t, dur, gain, attack: 0.02, release: Math.min(0.3, dur * 0.3), curve: 'lin' });
    o.addEventListener('ended', () => safe(() => { g.disconnect(); send.disconnect(); }));
  }

  // ---------------------------------------------------------------- sound effects

  let lastShoot = 0;
  let lastTick = 0;
  let haloStep = 0;
  let lastHalo = -10;
  const PENTA = [0, 2, 4, 7, 9];

  const SFX = {
    jump(t) {
      tone(A.sfx, { type: 'triangle', freq: 330, to: 700, t, dur: 0.13, gain: 0.16 });
      noise(A.sfx, { t, dur: 0.08, gain: 0.04, type: 'highpass', freq: 3000 });
    },
    doubleJump(t) {
      [0, 4, 7, 12, 16].forEach((n, i) => tone(A.sfx, { type: 'triangle', freq: mtof(79 + n), t: t + i * 0.035, dur: 0.18, gain: 0.08 }));
      tone(A.sfx, { type: 'sine', freq: 2400, to: 4800, t, dur: 0.25, gain: 0.03 });
    },
    shoot(t) {
      if (t - lastShoot < 0.05) return;
      lastShoot = t;
      noise(A.sfx, { t, dur: 0.045, gain: 0.07, type: 'bandpass', freq: rand(1400, 2200), q: 1.2 });
      tone(A.sfx, { type: 'square', freq: rand(170, 200), to: 70, t, dur: 0.04, gain: 0.035 });
    },
    enemyHit(t) {
      if (t - lastTick < 0.035) return;
      lastTick = t;
      tone(A.sfx, { type: 'sine', freq: rand(1700, 2100), t, dur: 0.025, gain: 0.05 });
    },
    kill(t) {
      const f = rand(260, 520);
      tone(A.crunch, { type: 'square', freq: f, to: f * 0.3, t, dur: 0.14, gain: 0.25 });
      noise(A.crunch, { t, dur: 0.16, gain: 0.35, type: 'lowpass', freq: 4000, to: 300 });
      tone(A.sfx, { type: 'sine', freq: 110, to: 45, t, dur: 0.12, gain: 0.18 });
    },
    hurt(t) {
      tone(A.sfx, { type: 'square', freq: 420, to: 140, t, dur: 0.22, gain: 0.12 });
      tone(A.sfx, { type: 'square', freq: 440, to: 150, t, dur: 0.22, gain: 0.08, detune: 30 });
      noise(A.sfx, { t, dur: 0.12, gain: 0.12, type: 'lowpass', freq: 1500 });
    },
    die(t) {
      // a sad organ walks downstairs
      [67, 65, 63, 62].forEach((m, i) => organ(A.sfx, m, t + i * 0.28, 0.32, 0.09, 0.8));
      [48, 55, 60, 63].forEach((m) => organ(A.sfx, m, t + 1.12, 1.9, 0.06, 1));
      tone(A.sfx, { type: 'sine', freq: 90, to: 35, t, dur: 0.5, gain: 0.25 });
      musicDuck(0.25, 0.4);
    },
    clear(t) {
      const chord = [48, 55, 60, 64, 67, 72];
      [60, 64, 67].forEach((m, i) => organ(A.sfx, m + 12, t + i * 0.09, 0.14, 0.07, 0.6));
      chord.forEach((m) => organ(A.sfx, m, t + 0.3, 2.4, 0.055, 1));
      [64, 67, 72, 76].forEach((m) => choir(A.choirSfx, m, t + 0.3, 2.6, 0.05, 0.3));
      timpani(t + 0.3, 48);
      musicDuck(0.2, 3.2);
    },
    laser(t) {
      const o = tone(A.sfx, { type: 'sawtooth', freq: 180, to: 2200, t, dur: 0.55, gain: 0.12, attack: 0.02, curve: 'lin', release: 0.25 });
      safe(() => o.detune.setValueAtTime(0, t));
      tone(A.sfx, { type: 'square', freq: 90, to: 1100, t, dur: 0.55, gain: 0.06, attack: 0.02, curve: 'lin', release: 0.25 });
      noise(A.sfx, { t, dur: 0.6, gain: 0.08, type: 'bandpass', freq: 600, to: 6000, q: 4 });
      [69, 73, 76, 81].forEach((m) => choir(A.choirSfx, m, t + 0.05, 1.4, 0.05, 0.12));
    },
    halo(t) {
      haloStep = t - lastHalo < 0.7 ? Math.min(haloStep + 1, 14) : 0;
      lastHalo = t;
      const m = 84 + PENTA[haloStep % 5] + 12 * Math.floor(haloStep / 5);
      tone(A.sfx, { type: 'sine', freq: mtof(m), t, dur: 0.35, gain: 0.09 });
      tone(A.sfx, { type: 'sine', freq: mtof(m) * 2.76, t, dur: 0.15, gain: 0.025 });
    },
    power(t, kind) {
      if (kind === 'ghost') {
        [62, 66, 69, 74, 78].forEach((m, i) => choir(A.choirSfx, m, t + i * 0.06, 1.8, 0.05, 0.6));
        tone(A.sfx, { type: 'sine', freq: 600, to: 1800, t, dur: 1.2, gain: 0.04, attack: 0.4, curve: 'lin', vib: true });
        return;
      }
      if (kind === 'wine') {
        for (let i = 0; i < 5; i++) tone(A.sfx, { type: 'sine', freq: rand(300, 500), to: rand(700, 1100), t: t + i * 0.06, dur: 0.07, gain: 0.08 });
      } else if (kind === 'loaves') {
        noise(A.crunch, { t, dur: 0.1, gain: 0.25, type: 'bandpass', freq: 2500, q: 2 });
        noise(A.crunch, { t: t + 0.11, dur: 0.1, gain: 0.2, type: 'bandpass', freq: 2000, q: 2 });
      } else if (kind === 'staff') {
        tone(A.sfx, { type: 'sawtooth', freq: 55, to: 40, t, dur: 0.8, gain: 0.12 });
        noise(A.sfx, { t, dur: 0.9, gain: 0.18, type: 'lowpass', freq: 200, to: 2000 });
      } else if (kind === 'walk') {
        for (let i = 0; i < 8; i++) tone(A.sfx, { type: 'sine', freq: mtof(84 + PENTA[i % 5] + (i >= 5 ? 12 : 0)), t: t + i * 0.04, dur: 0.3, gain: 0.04 });
        noise(A.sfx, { t, dur: 0.5, gain: 0.05, type: 'bandpass', freq: 800, to: 3000, q: 3 });
      } else if (kind === 'trumpet') {
        [[67, 0, 0.1], [67, 0.12, 0.1], [72, 0.24, 0.5]].forEach(([m, dt, d]) => brass(A.sfx, m, t + dt, d, 0.09));
        return;
      }
      // generic glory arpeggio for anything else, including pickups we have never heard of
      [72, 76, 79, 84].forEach((m, i) => tone(A.sfx, { type: 'triangle', freq: mtof(m), t: t + 0.05 + i * 0.06, dur: 0.3, gain: 0.07 }));
      choir(A.choirSfx, 79, t + 0.05, 0.6, 0.04, 0.1);
    },
    ghost(t) {
      noise(A.sfx, { t, dur: 0.9, gain: 0.08, type: 'bandpass', freq: 400, to: 3000, q: 6 });
      tone(A.sfx, { type: 'sine', freq: 880, to: 440, t, dur: 0.9, gain: 0.03, vib: true });
    },
    bossIntro(t) {
      [36, 42, 48, 51, 54, 60].forEach((m) => organ(A.sfx, m, t, 1.6, 0.06, 1));
      gong(t + 0.05);
      tone(A.sfx, { type: 'sine', freq: 70, to: 30, t, dur: 1.2, gain: 0.3 });
    },
    bossDown(t) {
      boom(t, 1.8, 0.5);
      // Hal-le-lu-jah. Hal-le-lu-jah
      const H = [[0, 0.32], [0, 0.16], [5, 0.34], [0, 0.6]];
      let dt = 0.6;
      for (let rep = 0; rep < 2; rep++) {
        H.forEach(([deg, d]) => {
          [62, 66, 69, 74].forEach((m) => choir(A.choirSfx, m + deg, t + dt, d + 0.08, 0.05, 0.03));
          organ(A.sfx, 50 + deg, t + dt, d + 0.05, 0.08, 0.7);
          dt += d;
        });
        dt += 0.12;
      }
      timpani(t + 0.6, 38);
      musicDuck(0.15, 3.5);
    },
    wallBreak(t) {
      noise(A.crunch, { t, dur: 0.7, gain: 0.4, type: 'lowpass', freq: 900, to: 120 });
      boom(t, 0.6, 0.3);
      for (let i = 0; i < 4; i++) noise(A.sfx, { t: t + 0.08 + i * 0.07, dur: 0.06, gain: 0.08, type: 'bandpass', freq: rand(800, 2400), q: 3 });
    },
  };

  function brass(dest, midi, t, dur, gain) {
    const f = A.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(600, t);
    f.frequency.linearRampToValueAtTime(3200, t + 0.06);
    f.Q.value = 2;
    f.connect(dest);
    const o = tone(f, { wave: A.brassWave, freq: mtof(midi), t, dur, gain, attack: 0.03, curve: 'lin', release: 0.06, vib: dur > 0.3 });
    o.addEventListener('ended', () => safe(() => f.disconnect()));
  }

  function timpani(t, midi) {
    for (let i = 0; i < 6; i++) tone(A.sfx, { type: 'sine', freq: mtof(midi) * (1 + i * 0.002), to: mtof(midi) * 0.96, t: t + i * 0.05, dur: 0.6, gain: 0.08 + i * 0.02 });
  }

  function gong(t) {
    [1, 1.48, 2.14, 2.67, 3.1, 4.2].forEach((r, i) => tone(A.sfx, { type: 'sine', freq: 82 * r, t, dur: 3 - i * 0.3, gain: 0.08 / (1 + i * 0.4), attack: 0.01 }));
    noise(A.sfx, { t, dur: 0.4, gain: 0.12, type: 'lowpass', freq: 1500 });
  }

  function boom(t, dur, gain) {
    noise(A.sfx, { t, dur, gain, type: 'lowpass', freq: 1600, to: 60 });
    tone(A.sfx, { type: 'sine', freq: 80, to: 25, t, dur: dur * 0.8, gain: gain * 0.9 });
  }

  function onSfx(name, data) {
    if (name === 'music') { onMusic(data); return; }
    if (!live() || A.muted) return;
    const fn = SFX[name];
    if (fn) fn(A.ctx.currentTime + 0.005, data);
  }

  game.events.on('sfx', (name, data) => safe(() => onSfx(name, data)));
  game.events.on('music', (d) => safe(() => onMusic(d)));

  // ---------------------------------------------------------------- music

  let duckUntil = 0;
  let duckLevel = 1;
  function musicDuck(level, seconds) {
    duckLevel = level;
    duckUntil = A.ctx.currentTime + seconds;
    setDuck();
  }

  let pausedNow = false;
  let lastDuck = -1;
  function setDuck() {
    if (!A.ctx) return;
    const t = A.ctx.currentTime;
    let v = 1;
    if (t < duckUntil) v = Math.min(v, duckLevel);
    if (pausedNow) v = Math.min(v, 0.3);
    if (v === lastDuck) return;
    lastDuck = v;
    A.musicDuck.gain.cancelScheduledValues(t);
    A.musicDuck.gain.setTargetAtTime(v, t, v < 1 ? 0.06 : 0.4);
  }

  function onMusic(d) {
    const theme = (d && d.theme) || 'eden';
    A.gameMusic = { theme, boss: !!(d && d.boss) };
    duckUntil = 0;
    syncMusic(true);
  }

  function syncMusic(force) {
    let inGame = false;
    safe(() => { inGame = game.scene.isActive('Game') || game.scene.isPaused('Game'); });
    const want = inGame && A.gameMusic ? A.gameMusic : { theme: 'menu', boss: false };
    A.desired = want;
    if (!A.ctx) return;
    const key = `${want.theme}|${want.boss}`;
    if (A.track && A.track.key === key) return;
    if (!force && A.track && performance.now() - A.track.born < 300) return;
    startTrack(want, key);
  }

  function startTrack(want, key) {
    const ctx = A.ctx;
    const now = ctx.currentTime;
    if (A.track) fadeTrack(A.track);
    const def = TRACKS[want.theme] || TRACKS.hymn;
    // each track gets its own subgroups so a crossfade covers dry, choir, guitar and reverb sends together
    const sub = { dry: ctx.createGain(), choir: ctx.createGain(), gtr: ctx.createGain(), verb: ctx.createGain() };
    sub.dry.connect(A.music);
    sub.choir.connect(A.choirMusic);
    sub.gtr.connect(A.gtrIn);
    sub.verb.connect(A.verb);
    Object.entries(sub).forEach(([k, g]) => {
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(k === 'verb' ? 0.35 : 1, now + 0.5);
    });
    const boss = want.boss && def.style !== 'menu';
    A.track = { key, def, boss, sub, born: performance.now(), bpm: def.bpm * (boss ? 1.12 : 1), step: 0, next: now + 0.08 };
  }

  function fadeTrack(track) {
    const now = A.ctx.currentTime;
    Object.values(track.sub).forEach((g) => {
      g.gain.cancelScheduledValues(now);
      g.gain.setValueAtTime(g.gain.value, now);
      g.gain.linearRampToValueAtTime(0, now + 0.7);
    });
    setTimeout(() => safe(() => Object.values(track.sub).forEach((g) => g.disconnect())), 2600);
  }

  function tick() {
    if (!A.ctx) return;
    // scene polling lives here too, cheap and independent of frame rate
    safe(() => { pausedNow = game.scene.isPaused('Game'); });
    syncMusic(false);
    setDuck();
    const tr = A.track;
    if (!tr || A.ctx.state !== 'running') return;
    const now = A.ctx.currentTime;
    if (tr.next < now - 0.2) tr.next = now + 0.05; // we fell asleep (background tab). skip ahead
    const sixteenth = 60 / tr.bpm / 4;
    let guard = 0;
    while (tr.next < now + LOOKAHEAD && guard++ < 16) {
      safe(() => playStep(tr, tr.step, tr.next, sixteenth));
      tr.step++;
      tr.next += sixteenth;
    }
  }

  function chordNotes(root, q, lo, hi) {
    return TRIADS[q].map((iv) => {
      let m = root + iv;
      while (m < lo) m += 12;
      while (m > hi) m -= 12;
      return m;
    }).sort((a, b) => a - b);
  }

  function playStep(tr, step, t, s16) {
    const def = tr.def;
    const s = step % 16;
    const bar = Math.floor(step / 16);
    const prog = def.prog;
    const [deg, q] = prog[bar % prog.length];
    const root = def.root + deg;
    const sub = tr.sub;

    if (def.style === 'menu') {
      if (s === 0) {
        const bar16 = s16 * 16;
        chordNotes(root, q, 55, 67).forEach((m) => organ(sub.dry, m, t, bar16 * 1.02, 0.045, 0.9));
        organ(sub.dry, root - 12 - (root - 12 > 45 ? 12 : 0), t, bar16 * 1.02, 0.05, 0.9);
        chordNotes(root, q, 62, 74).forEach((m) => choir(sub.choir, m, t, bar16 * 1.05, 0.035, 1.2));
      }
      // a slow little melody on the top, every other bar
      if (bar % 2 === 1 && (s === 0 || s === 8)) {
        const top = chordNotes(root, q, 69, 81);
        organ(sub.dry, top[s === 0 ? 2 : 1], t, s16 * 7, 0.03, 1);
      }
      return;
    }

    const P = tr.boss ? BOSS : def;
    const loop = bar % (prog.length * 2);
    const secondHalf = loop >= prog.length;

    // choir pad, one chord per bar
    if (s === 0) {
      const bar16 = s16 * 16;
      const pad = chordNotes(root, q, 57, 69);
      pad.forEach((m) => choir(sub.choir, m, t, bar16 * 1.02, 0.045, 0.12));
      if (secondHalf || tr.boss) choir(sub.choir, pad[pad.length - 1] + 12, t, bar16 * 1.02, 0.03, 0.12);
      // organ underneath for that cathedral weight
      organ(sub.dry, root - 12 + (root - 12 < 36 ? 12 : 0), t, bar16, 0.03, 0.4);
      if (loop === 0) crash(sub.dry, t);
    }

    // guitar
    const g = P.gtr[s];
    if (g !== '.') {
      let gr = root;
      while (gr > 47) gr -= 12;
      while (gr < 36) gr += 12;
      const open = g === 'O';
      const dur = open ? s16 * 3.5 : s16 * 0.7;
      const f = mtof(gr);
      [-6, 7].forEach((det) => tone(sub.gtr, { type: 'sawtooth', freq: f, t, dur, gain: open ? 0.5 : 0.42, attack: 0.003, detune: det, curve: open ? 'lin' : 'exp', release: open ? 0.05 : dur }));
      if (open) {
        tone(sub.gtr, { type: 'sawtooth', freq: f * 1.4983, t, dur, gain: 0.32, attack: 0.003, curve: 'lin', release: 0.05 });
        tone(sub.gtr, { type: 'sawtooth', freq: f * 2, t, dur, gain: 0.22, attack: 0.003, curve: 'lin', release: 0.05 });
      }
      // bass doubles the chugs an octave down, clean
      tone(sub.dry, { type: 'triangle', freq: f / 2, t, dur: open ? dur : s16 * 0.9, gain: 0.16, attack: 0.004 });
    }

    // drums
    if (P.kick[s] === 'x') kick(sub.dry, t, s % 2 ? 0.55 : 0.85);
    if (P.snare[s] === 'x') snare(sub, t);
    if (P.hat[s] === 'x') noise(sub.dry, { t, dur: 0.035, gain: s % 4 === 0 ? 0.06 : 0.035, type: 'highpass', freq: 7500 });
    if (secondHalf && s === 15 && loop === prog.length * 2 - 1) [0, 0.5].forEach((o) => snare(sub, t + s16 * o, 0.7));

    // flavors
    if (def.bell && s === 0 && bar % 2 === 0) [0, 2.76, 5.4].forEach((r, i) => tone(sub.dry, { type: 'sine', freq: mtof(root + 24) * (r || 1), t, dur: 1.4 - i * 0.3, gain: 0.03 / (i + 1) }));
    if (def.brass && secondHalf && (s === 0 || s === 6 || s === 10)) {
      const top = chordNotes(root, q, 60, 72);
      top.forEach((m) => brass(sub.dry, m, t, s === 0 ? s16 * 5 : s16 * 2, 0.025));
    }
    if (def.lead && secondHalf && s % 2 === 0) {
      const scale = def.lead;
      const i = (bar * 3 + Math.floor(s / 2) * (s % 4 === 0 ? 1 : 2)) % scale.length;
      const m = def.root + 24 + scale[i];
      tone(sub.dry, { type: 'square', freq: mtof(m), t, dur: s16 * 1.8, gain: 0.025, vib: true });
    }
    if (def.banjo && !tr.boss) {
      // forward roll over the chord, twangy and brief
      const notes = chordNotes(root, q, 67, 79);
      const roll = [0, 1, 2, 0, 1, 2, 0, 2];
      const m = notes[roll[(s >> 1) % 8]] + (s % 2 ? 12 : 0);
      banjo(sub.dry, m, t, s % 4 === 0 ? 0.07 : 0.045);
    }
  }

  function banjo(dest, midi, t, gain) {
    const f = A.ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 1800;
    f.Q.value = 1.4;
    f.connect(dest);
    tone(f, { type: 'square', freq: mtof(midi), to: mtof(midi) * 0.995, t, dur: 0.22, gain, attack: 0.002 });
    const o = tone(f, { type: 'sawtooth', freq: mtof(midi) * 2, t, dur: 0.12, gain: gain * 0.6, attack: 0.001 });
    o.addEventListener('ended', () => safe(() => f.disconnect()));
  }

  function kick(dest, t, v = 0.85) {
    tone(dest, { type: 'sine', freq: 140, to: 42, t, dur: 0.16, gain: v * 0.55, attack: 0.002 });
    noise(dest, { t, dur: 0.02, gain: v * 0.12, type: 'lowpass', freq: 3000 });
  }

  function snare(sub, t, v = 1) {
    noise(sub.dry, { t, dur: 0.16, gain: 0.22 * v, type: 'highpass', freq: 1400 });
    tone(sub.dry, { type: 'triangle', freq: 200, to: 160, t, dur: 0.08, gain: 0.12 * v });
    // a little church in the snare
    noise(sub.verb, { t, dur: 0.12, gain: 0.08 * v, type: 'bandpass', freq: 2500 });
  }

  function crash(dest, t) {
    noise(dest, { t, dur: 1.4, gain: 0.07, type: 'highpass', freq: 5000 });
  }
}
