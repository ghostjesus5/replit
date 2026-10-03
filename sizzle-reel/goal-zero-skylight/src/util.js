export const BPM = 120, BEAT = 60 / BPM, BAR = BEAT * 4, DUR = 66, FPS = 24;

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const seg = (t, a, b) => clamp((t - a) / (b - a));
export const sm = t => t * t * (3 - 2 * t);
export const eio = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const eio2 = t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
export const eo3 = t => 1 - Math.pow(1 - t, 3);
export const eo5 = t => 1 - Math.pow(1 - t, 5);
export const ei3 = t => t * t * t;
export const eoExpo = t => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
export const eiExpo = t => (t <= 0 ? 0 : Math.pow(2, 10 * t - 10));
export const eoBack = (t, s = 1.70158) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2);
export const D2R = Math.PI / 180;

// pulse that is 1 inside [a,b] with eased edges of width f
export const win = (t, a, b, fin = 0.3, fout = 0.3) => Math.min(sm(seg(t, a, a + fin)), 1 - sm(seg(t, b - fout, b)));

export function rng(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// cheap deterministic 2D value noise
function hash2(x, y) {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
export function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = sm(xf), v = sm(yf);
  const a = hash2(xi, yi), b = hash2(xi + 1, yi), c = hash2(xi, yi + 1), d = hash2(xi + 1, yi + 1);
  return lerp(lerp(a, b, u), lerp(c, d, u), v);
}
export function fbm(x, y, o = 4) {
  let s = 0, a = 0.5, f = 1, n = 0;
  for (let i = 0; i < o; i++) { s += a * vnoise(x * f, y * f); n += a; a *= 0.5; f *= 2.03; }
  return s / n;
}

// blackbody approximation (Tanner Helland), returns [r,g,b] 0..1
export function kelvin(k) {
  const t = k / 100;
  let r, g, b;
  if (t <= 66) { r = 255; g = 99.4708025861 * Math.log(t) - 161.1195681661; }
  else { r = 329.698727446 * Math.pow(t - 60, -0.1332047592); g = 288.1221695283 * Math.pow(t - 60, -0.0755148492); }
  if (t >= 66) b = 255; else if (t <= 19) b = 0; else b = 138.5177312231 * Math.log(t - 10) - 305.0447927307;
  return [clamp(r / 255), clamp(g / 255), clamp(b / 255)];
}
