// 2D layer composited over the 3D frame: typography, tracked callouts, HUD, letterbox, flares, grain.
import * as THREE from 'three';
import { cl, lerp, rng } from './util.js';

export const W = 1920, H = 1080;
export const FC = '"Barlow Condensed","Arial Narrow",Arial,sans-serif', FB = '"Barlow",Arial,sans-serif', FM = '"IBM Plex Mono",ui-monospace,monospace';
export const C = { lime: '#c3d63a', warm: '#ffc28a', hot: '#fff1df', cream: '#f4ede1', ink: '#121317', mut: '#a3aab9', dim: '#5d6578', night: '#07090f' };
const hex = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
export const rgba = (c, a) => { const [r, g, b] = hex(c); return `rgba(${r},${g},${b},${cl(a).toFixed(3)})`; };

export function makeOverlay(canvas, camera) {
  const g = canvas.getContext('2d');
  const v3 = new THREE.Vector3();
  const O = { g, W, H };

  O.T = (s, x, y, { sz = 40, wt = 500, f = FB, col = '#fff', a = 1, al = 'left', ls = 0, base = 'alphabetic' } = {}) => {
    if (a <= .001) return;
    g.save(); g.globalAlpha *= cl(a); g.font = `${wt} ${sz}px ${f}`; g.fillStyle = col; g.textAlign = al; g.textBaseline = base;
    g.letterSpacing = ls + 'px'; g.fillText(s, x + (al === 'center' ? ls / 2 : al === 'right' ? ls : 0), y); g.restore();
  };
  O.tw = (s, sz, wt, f, ls = 0) => { g.save(); g.font = `${wt} ${sz}px ${f}`; g.letterSpacing = ls + 'px'; const w = g.measureText(s).width; g.restore(); return w; };
  // Type rises into place from behind a mask, lifts and fades on exit.
  O.mask = (y, sz, pin, pout, fn) => {
    if (pin <= 0 || pout >= 1) return;
    g.save(); g.beginPath(); g.rect(0, y - sz * 1.02, W, sz * 1.34); g.clip();
    g.translate(0, (1 - pin) * sz * 1.1 - pout * sz * .35); g.globalAlpha *= 1 - pout; fn(); g.restore();
  };
  O.L = (s, x, y, o, pin, pout = 0) => O.mask(y, o.sz, pin, pout, () => O.T(s, x, y, o));
  // Mono eyebrow with a lime square, typed on.
  O.eyebrow = (s, x, y, p, pout = 0, { al = 'left', col = C.lime, sz = 22 } = {}) => {
    if (p <= 0 || pout >= 1) return;
    const n = Math.round(s.length * cl(p * 1.25)), shown = s.slice(0, n), ls = sz * .22;
    const w = O.tw(s, sz, 500, FM, ls) + 24, x0 = al === 'center' ? x - w / 2 : x;
    g.save(); g.globalAlpha = 1 - pout;
    g.fillStyle = col; g.fillRect(x0, y - sz * .62, sz * .45, sz * .45);
    O.T(shown, x0 + 24, y, { sz, wt: 500, f: FM, col, ls });
    if (n < s.length) { g.fillStyle = col; g.fillRect(x0 + 24 + O.tw(shown, sz, 500, FM, ls), y - sz * .75, sz * .5, sz * .9); }
    g.restore();
  };
  O.wordmark = (x, y, sz, col, al = 'left', a = 1) => {
    const ls = sz * .12, w1 = O.tw('GOAL', sz, 500, FC, ls), w = w1 + O.tw('ZERO', sz, 800, FC, ls), x0 = al === 'center' ? x - w / 2 : x;
    O.T('GOAL', x0, y, { sz, wt: 500, f: FC, col, ls, a }); O.T('ZERO', x0 + w1, y, { sz, wt: 800, f: FC, col, ls, a });
  };
  O.proj = (obj) => {
    if (obj.isVector3) v3.copy(obj); else obj.getWorldPosition(v3);
    const front = v3.clone().applyMatrix4(camera.matrixWorldInverse).z < 0;
    v3.project(camera);
    return { x: (v3.x + 1) / 2 * W, y: (1 - v3.y) / 2 * H, ok: front && Math.abs(v3.x) < 1.2 && Math.abs(v3.y) < 1.2 };
  };
  // Engineering callout: ring on the part, elbow leader, mono label typed on, a muted sub line.
  O.callout = (anchor, label, sub, { dx = 120, dy = -80, idx = '', p = 1, pout = 0, side } = {}) => {
    if (p <= 0 || pout >= 1 || !anchor.ok) return;
    const a = 1 - pout, s = side ?? (dx >= 0 ? 1 : -1);
    const ex = anchor.x + dx, ey = anchor.y + dy, run = 230;
    const p1 = cl(p * 2.2), p2 = cl(p * 2.2 - 1), p3 = cl(p * 1.6 - .5);
    g.save(); g.globalAlpha = a;
    g.strokeStyle = C.lime; g.lineWidth = 2; g.beginPath(); g.arc(anchor.x, anchor.y, 9 * Math.min(1, p1 * 2), 0, 7); g.stroke();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(anchor.x, anchor.y, 3, 0, 7); g.fill();
    g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 1.5; g.beginPath();
    const sx = anchor.x + Math.sign(dx || 1) * 9 * .7, sy = anchor.y + Math.sign(dy || 1) * 9 * .7;
    g.moveTo(sx, sy); g.lineTo(lerp(sx, ex, p1), lerp(sy, ey, p1));
    if (p2 > 0) g.lineTo(ex + s * run * p2, ey);
    g.stroke();
    if (p3 > 0) {
      const tx = s > 0 ? ex + 4 : ex - run + 4, n = Math.round(label.length * p3);
      if (idx) O.T(idx, tx, ey - 14, { sz: 17, wt: 600, f: FM, col: C.lime, ls: 2 });
      O.T(label.slice(0, n), tx + (idx ? 38 : 0), ey - 14, { sz: 19, wt: 600, f: FM, col: '#fff', ls: 2.5 });
      if (sub) O.T(sub, tx, ey + 30, { sz: 19, wt: 500, f: FB, col: C.mut, a: cl(p3 * 2 - 1) });
    }
    g.restore();
  };
  O.letterbox = k => { if (k <= 0) return; const h = 138 * k; g.fillStyle = '#000'; g.fillRect(0, 0, W, h); g.fillRect(0, H - h, W, h); };
  O.flash = (a, col = '#fff6ea') => { if (a <= 0) return; g.fillStyle = rgba(col, a); g.fillRect(0, 0, W, H); };
  // Anamorphic streak and soft ghosts at a bright source.
  O.flare = (pt, k, col = C.warm) => {
    if (!pt.ok || k <= .01) return;
    g.save(); g.globalCompositeOperation = 'lighter';
    const L = 900 * k, gr = g.createLinearGradient(pt.x - L, 0, pt.x + L, 0);
    gr.addColorStop(0, rgba('#6f8cff', 0)); gr.addColorStop(.35, rgba('#8aa2ff', .12 * k)); gr.addColorStop(.5, rgba(col, .55 * k)); gr.addColorStop(.65, rgba('#8aa2ff', .12 * k)); gr.addColorStop(1, rgba('#6f8cff', 0));
    g.fillStyle = gr; g.fillRect(pt.x - L, pt.y - 3, 2 * L, 6);
    g.fillStyle = rgba(col, .12 * k); g.fillRect(pt.x - L * .6, pt.y - 1, L * 1.2, 2);
    const rr = 220 * k, rg = g.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, rr); rg.addColorStop(0, rgba(col, .35 * Math.min(1, k))); rg.addColorStop(1, rgba(col, 0));
    g.fillStyle = rg; g.fillRect(pt.x - rr, pt.y - rr, 2 * rr, 2 * rr);
    const cx = W / 2, cy = H / 2;
    for (const [f, r, a] of [[-.45, 40, .05], [-.8, 90, .035], [.35, 26, .05]]) {
      const gx = cx + (cx - pt.x) * f, gy = cy + (cy - pt.y) * f, gg = g.createRadialGradient(gx, gy, 0, gx, gy, r);
      gg.addColorStop(0, rgba('#9fb3ff', a * k)); gg.addColorStop(1, rgba('#9fb3ff', 0)); g.fillStyle = gg; g.fillRect(gx - r, gy - r, 2 * r, 2 * r);
    }
    g.restore();
  };
  // Cover-fit a photo with a slow push around an anchor.
  O.photo = (im, push = 1, ax = .5, ay = .5, box = [0, 0, W, H]) => {
    const [bx, by, bw, bh] = box, s = Math.max(bw / im.width, bh / im.height) * push, w = im.width * s, h = im.height * s;
    g.save(); g.beginPath(); g.rect(bx, by, bw, bh); g.clip();
    g.drawImage(im, bx + (bw - w) * ax, by + (bh - h) * ay, w, h); g.restore();
  };
  const R = rng(9), tiles = [];
  for (let k = 0; k < 4; k++) {
    const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d'), im = x.createImageData(256, 256);
    for (let i = 0; i < im.data.length; i += 4) { const v = R() * 255 | 0; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; }
    x.putImageData(im, 0, 0); tiles.push(g.createPattern(c, 'repeat'));
  }
  O.grain = (t, a = .07, still = false) => {
    g.save(); g.globalCompositeOperation = 'overlay'; g.globalAlpha = a; g.fillStyle = tiles[still ? 0 : Math.floor(t * 24) % 4];
    g.translate(still ? 0 : (Math.floor(t * 24) * 37) % 256, still ? 0 : (Math.floor(t * 24) * 71) % 256);
    g.fillRect(-256, -256, W + 512, H + 512); g.restore();
  };
  O.vignette = a => {
    if (a <= 0) return;
    const r = Math.hypot(W, H) / 2, gr = g.createRadialGradient(W / 2, H / 2, r * .5, W / 2, H / 2, r);
    gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, `rgba(0,0,0,${a})`); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  };
  return O;
}
