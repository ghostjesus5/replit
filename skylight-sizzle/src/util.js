export const cl = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, p) => a + (b - a) * p;
export const E = {
  lin: x => x,
  in2: x => x * x,
  out2: x => 1 - (1 - x) * (1 - x),
  io2: x => (x < .5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2),
  in3: x => x * x * x,
  out3: x => 1 - Math.pow(1 - x, 3),
  io3: x => (x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
  outExpo: x => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x)),
  inExpo: x => (x <= 0 ? 0 : Math.pow(2, 10 * x - 10)),
  ioSine: x => -(Math.cos(Math.PI * x) - 1) / 2,
  outBack: x => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); },
};
// Eased progress of t through [a,b].
export const P = (t, a, b, e = E.out3) => e(cl((t - a) / (b - a)));
// Up then down: 0 outside [a,d], 1 inside [b,c].
export const env = (t, a, b, c, d) => P(t, a, b, E.io2) * (1 - P(t, c, d, E.io2));

export function rng(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// Smooth pseudo-noise in roughly [-1,1], deterministic in t. Used for handheld camera drift.
export const wobble = (t, s = 0) =>
  Math.sin(t * 1.13 + s * 12.9) * .5 + Math.sin(t * 2.31 + s * 4.7) * .3 + Math.sin(t * 4.07 + s * 7.3) * .2;

// Black-body color temperature to sRGB 0..1 (Tanner Helland's fit).
export function kelvin(K) {
  const t = K / 100;
  let r, g, b;
  if (t <= 66) {
    r = 255;
    g = 99.4708025861 * Math.log(t) - 161.1195681661;
    b = t <= 19 ? 0 : 138.5177312231 * Math.log(t - 10) - 305.0447927307;
  } else {
    r = 329.698727446 * Math.pow(t - 60, -0.1332047592);
    g = 288.1221695283 * Math.pow(t - 60, -0.0755148492);
    b = 255;
  }
  return [r, g, b].map(v => cl(v, 0, 255) / 255);
}
