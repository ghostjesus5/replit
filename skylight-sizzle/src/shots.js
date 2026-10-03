// The film, shot by shot. Each shot sets scene state for time t (scene) and draws its type and HUD (ui).
// Every claim on screen comes from the goalzero.com Skylight product page.
import * as THREE from 'three';
import { cl, lerp, P, E, kelvin } from './util.js';
import { C, FC, FB, FM, W, H, rgba } from './overlay.js';

export const DUR = 60;
const deg = Math.PI / 180;
const mix3 = (a, b, p) => a.map((v, i) => lerp(v, b[i], p));
const orbit = (r, az, h, c = [0, 0, 0]) => [c[0] + Math.sin(az * deg) * r, h, c[2] + Math.cos(az * deg) * r];
const hz = az => [Math.sin(az * deg), 0, Math.cos(az * deg)];
const lum = lm => Math.pow(lm / 6000, .55);
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const tmp = new THREE.Vector3();
const X0 = 150;

// shared type helpers
const eyebrow = (O, s, x, y, t, a, out = 99, o = {}) => O.eyebrow(s, x, y, P(t, a, a + .55, E.lin), P(t, out, out + .3, E.in3), o);
const head = (O, s, x, y, t, a, o, out = 99) => O.L(s, x, y, { wt: 800, f: FC, ...o }, P(t, a, a + .45, E.outExpo), P(t, out, out + .3, E.in3));

function callouts(t, O, items) {
  for (const [obj, label, sub, a, b, idx, dx, dy] of items) {
    const pt = O.proj(obj); if (!pt.ok) continue;
    O.callout(pt, label, sub, { dx, dy, idx, p: P(t, a, a + .9, E.lin), pout: P(t, b - .3, b, E.lin) });
  }
}

const MODES = [['LOW', 400, '4 W'], ['MED', 1350, '12 W'], ['HIGH', 3500, '34 W'], ['BOOST', 6000, '67 W']];
const RUNS = [['Internal battery', 8], ['Yeti 300', 63], ['Yeti 700', 144], ['Yeti 1500', 357]];

export const SHOTS = [
  // 1 · Night. The light stands dark in the field under the Milky Way.
  {
    a: 0, b: 4, n: 'Night',
    scene(t, S) {
      const u = P(t, 0, 4, E.io2);
      S.power = 0; S.beam = 0; S.dust = 0; S.pool = 0;
      S.cam = { p: mix3([-11, 2.8, 30], [-9.6, 3.0, 26.8], u), t: [0, 6.4, 0], fov: 30, shake: .3 };
      S.exposure = 1.35; S.milky = 1.8; S.skyLift = 1.5; S.skyWarm = .5; S.stars = 1.3; S.moon = .55; S.hemi = .35; S.lbox = 1; S.bloom = [.5, .4, 1.1];
    },
    ui(t, O) {
      O.L('THE SUN CLOCKS OUT.', W / 2, 800, { sz: 64, wt: 700, f: FC, al: 'center', ls: 16, col: 'rgba(255,255,255,.92)' }, P(t, 1, 1.8, E.outExpo), P(t, 3.4, 3.85, E.in3));
    },
  },
  // 2 · Macro along one petal. One click and its 28 LEDs fire from hub to tip.
  {
    a: 4, b: 8, n: 'Ignition',
    scene(t, S) {
      const u = P(t, 4, 8, E.io2), lit = cl((t - 7.45) / .4) * 28;
      S.power = t >= 7.45 ? .9 : 0; S.keyK = 0; S.led = [lit, 0, 0, 0, 0, 0]; S.beam = 0; S.dust = .5; S.pool = 0;
      S.cam = { p: [1.55 - .25 * u, 11.05 + .1 * u, .95 - .15 * u], t: [.55, 11.9, .05], fov: 40, shake: .15, near: .02 };
      S.exposure = 1.25; S.moon = 1.6; S.hemi = .3; S.milky = 1.6; S.skyLift = 1.3; S.lbox = 1; S.bloom = [lerp(.5, 1, P(t, 7.45, 7.9)), .5, 1];
    },
    ui(t, O) {
      O.L("YOU DON'T HAVE TO.", W / 2, 800, { sz: 64, wt: 700, f: FC, al: 'center', ls: 16, col: 'rgba(255,255,255,.92)' }, P(t, 5, 5.8, E.outExpo), P(t, 7.1, 7.45, E.in3));
    },
  },
  // 3 · All six petals chase on and the head floods to white.
  {
    a: 8, b: 10, n: 'Six petals',
    scene(t, S) {
      const u = P(t, 8, 10, E.io2);
      S.led = [0, 1, 2, 3, 4, 5].map(i => i === 0 ? 28 : cl((t - 8 - i * .11) / .22) * 28);
      S.power = lerp(.55, 1, P(t, 8, 9.5)); S.keyK = P(t, 8.6, 9.2); S.beam = P(t, 8.4, 9.6); S.pool = .22 * P(t, 8.6, 9.6);
      S.cam = { p: mix3([3.6, 8.4, 4.6], [3.1, 9, 3.9], u), t: [0, 11.5, 0], fov: 34, shake: .3 };
      S.exposure = 1.1 + 2.5 * P(t, 9.55, 10, E.in3); S.bloom = [.7 + 1.2 * P(t, 9.5, 10), .5, 1]; S.flare = .6; S.lbox = 1;
    },
  },
  // 4 · Title, looking straight up at the lit head.
  {
    a: 10, b: 12, n: 'Title',
    scene(t, S) {
      const az = lerp(25, 38, P(t, 10, 12, E.lin));
      S.cam = { p: orbit(2.6, az, 2.2), t: [0, 12.2, 0], up: hz(az), fov: 52, shift: [0, -.21], shake: .2 };
      S.beam = 0; S.flare = .9; S.lbox = 1; S.bloom = [.8, .5, 1];
    },
    ui(t, O) {
      O.mask(585, 40, P(t, 10.4, 10.8, E.outExpo), 0, () => O.wordmark(W / 2, 585, 40, '#fff', 'center'));
      const ls = lerp(70, 22, P(t, 10.15, 11.6, E.out3));
      O.L('SKYLIGHT', W / 2, 800, { sz: 230, wt: 800, f: FC, al: 'center', ls }, P(t, 10.15, 10.7, E.outExpo));
      O.T('TELESCOPING AREA LIGHT', W / 2, 870, { sz: 22, wt: 500, f: FM, al: 'center', ls: 8, col: C.mut, a: P(t, 10.6, 11) });
    },
  },
  // 5a · Low orbit around the base: stakes, remote, the first lock.
  {
    a: 12, b: 16, n: 'Hero base',
    scene(t, S) {
      const u = P(t, 12, 16, E.io2);
      S.cam = { p: orbit(lerp(4.6, 4.0, u), lerp(-34, 4, u), lerp(6.2, 5.4, u)), t: mix3([.7, .2, .9], [.9, .3, .8], u), fov: 46, shake: .3 };
      S.flare = 0; S.lbox = 1; S.camp = false;
    },
    ui(t, O, S, X) {
      callouts(t, O, [
        [X.sky.refs.foot, '3 INTEGRATED GROUND STAKES', 'Set it on any flat surface', 12.4, 15.7, '01', -170, 90],
        [X.cable.remote, 'WIRED REMOTE', 'Long press on, short press to cycle modes', 13.0, 15.8, '02', -160, -120],
        [X.yeti.port, 'POWERED BY YETI', 'Or up to 8 hrs on the internal battery', 14.0, 15.85, '03', 150, 110],
      ]);
    },
  },
  // 5b · Crane up the mast to the head.
  {
    a: 16, b: 20, n: 'Hero head',
    scene(t, S) {
      const u = P(t, 16, 20, E.io2);
      S.cam = { p: orbit(lerp(4.8, 4.4, u), lerp(-20, -58, u), lerp(4.5, 10.4, u)), t: [0, 11.75, 0], fov: lerp(46, 36, u), shake: .4 };
      S.flare = .4; S.lbox = 1;
    },
    ui(t, O, S, X) {
      const p = X.sky.refs;
      callouts(t, O, [
        [p.clamp2, '4 TO 12 FT', 'Three locking sections', 16.1, 17.8, '04', 150, 60],
        [p.petals[1].tip, '6 ADJUSTABLE LED PETALS', 'Each tilts up and down 180°', 17.1, 19.7, '05', 140, -120],
        [p.petals[4].lensC, '168 LEDs AT 3250K', 'Warmer than a traditional work light', 17.6, 19.75, '06', -150, 120],
        [p.hub, 'IPX4 RATED', 'Built for outdoor use', 18.2, 19.8, '07', -160, -150],
      ]);
    },
  },
  // 6 · The drop. Worm's-eye on the head as it steps through four modes to 6,000 lumens.
  {
    a: 20, b: 24, n: '6,000 lumens',
    scene(t, S) {
      const az = lerp(166, 180, P(t, 20, 24, E.lin)), m = Math.min(3, Math.floor((t - 20) / .5));
      const prev = m ? lum(MODES[m - 1][1]) : lum(MODES[0][1]) * .4, q = P(t, 20 + m * .5, 20 + m * .5 + .12);
      S.power = lerp(prev, lum(MODES[m][1]), q) + .25 * Math.exp(-(t - 20 - m * .5) * 9);
      S.cam = { p: orbit(3.2, az, .5), t: [0, 12.2, 0], up: hz(az), fov: 52, shift: [.17, 0], shake: .25 };
      S.beam = 0; S.flare = 1; S.lbox = 1 - P(t, 20, 20.4, E.io3); S.bloom = [.9, .5, 1];
    },
    ui(t, O) {
      const m = Math.min(3, Math.floor((t - 20) / .5)), q = P(t, 20 + m * .5, 20 + m * .5 + .3);
      const v = Math.round(lerp(m ? MODES[m - 1][1] : 0, MODES[m][1], q));
      eyebrow(O, '4 BRIGHTNESS MODES', X0, 300, t, 20.05);
      head(O, v.toLocaleString('en-US'), X0 - 6, 610, t, 20.05, { sz: 280 });
      head(O, 'LUMENS', X0, 690, t, 20.15, { sz: 58, wt: 700, ls: 12, col: C.mut });
      MODES.forEach(([nm, lm, w], i) => {
        const pi = P(t, 20.2 + i * .05, 20.55 + i * .05, E.outExpo); if (pi <= 0) return;
        const x = X0 + i * 170, y = 740 + 24 * (1 - pi), act = i === m, done = i < m, g = O.g;
        g.save(); g.globalAlpha = pi; g.beginPath(); g.roundRect(x, y, 156, 112, 6);
        if (act) { g.fillStyle = C.lime; g.fill(); } else { g.strokeStyle = done ? rgba(C.lime, .6) : 'rgba(255,255,255,.22)'; g.lineWidth = 2; g.stroke(); }
        O.T(nm, x + 78, y + 40, { sz: 30, wt: 700, f: FC, ls: 3, al: 'center', col: act ? C.ink : done ? '#fff' : C.mut });
        O.T(lm.toLocaleString('en-US') + ' lm', x + 78, y + 70, { sz: 21, wt: 500, al: 'center', col: act ? C.ink : C.mut });
        O.T(w, x + 78, y + 96, { sz: 15, wt: 500, f: FM, ls: 2, al: 'center', col: act ? 'rgba(18,19,23,.7)' : C.dim });
        g.restore();
      });
    },
  },
  // 7 · The mast telescopes from 4 to 12 ft, three clicks, with a ruler tracked to the shot.
  {
    a: 24, b: 28, n: '4 to 12 ft',
    scene(t, S) {
      S.height = 4 + 8 / 3 * (P(t, 24.5, 25.1, E.io3) + P(t, 25.25, 25.85, E.io3) + P(t, 26, 26.6, E.io3));
      const Hh = S.height, az = -18 + 6 * P(t, 24, 28, E.lin);
      S.cam = { p: orbit(15, az, .45 * Hh + 1.2), t: [0, .62 * Hh, 0], fov: 40, shift: [.14, 0], shake: .35 };
      S.power = .85; S.beam = .8; S.dust = .8;
    },
    ui(t, O, S) {
      const g = O.g, Hh = S.height, yAt = f => O.proj(tmp.set(0, f, 0)).y, hp = O.proj(tmp.set(0, Hh, 0)), rx = hp.x - 300;
      const a = P(t, 24.1, 24.5);
      g.save(); g.globalAlpha = a; g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(rx, yAt(0)); g.lineTo(rx, yAt(12.4)); g.stroke();
      for (let f = 0; f <= 12; f++) {
        const y = yAt(f), big = f % 4 === 0; g.beginPath(); g.moveTo(rx, y); g.lineTo(rx + (big ? 22 : 10), y); g.stroke();
        if (big && f) O.T(`${f}`, rx - 14, y + 7, { sz: 18, wt: 500, f: FM, al: 'right', col: C.mut });
      }
      g.setLineDash([6, 8]); g.strokeStyle = C.lime; g.beginPath(); g.moveTo(rx, hp.y); g.lineTo(hp.x - 70, hp.y); g.stroke(); g.setLineDash([]);
      g.fillStyle = C.lime; g.beginPath(); g.moveTo(rx, hp.y); g.lineTo(rx - 12, hp.y - 8); g.lineTo(rx - 12, hp.y + 8); g.fill();
      O.T(`${Math.min(12, Math.round(Hh * 10) / 10).toFixed(1)} FT`, rx - 22, hp.y - 14, { sz: 30, wt: 600, f: FM, al: 'right', col: C.lime, ls: 2 });
      g.restore();
      eyebrow(O, 'TELESCOPING MAST', X0, 330, t, 24.1);
      head(O, '4 TO 12 FT.', X0 - 4, 480, t, 24.2, { sz: 150 });
      O.L('Three locking sections. Set the height the job needs.', X0, 545, { sz: 30, wt: 500, col: C.mut }, P(t, 24.45, 24.9, E.outExpo));
    },
  },
  // 8 · Drone pull-back to the full 300 ft pool of light.
  {
    a: 28, b: 32, n: '300 ft',
    scene(t, S) {
      const u = P(t, 28.05, 31.4, E.io3);
      S.cam = { p: mix3([3, 15.5, 9], [0, 420, 165], u), t: mix3([0, 9, 0], [0, 0, 5], u), fov: lerp(42, 42, u), shift: [.12 * u, 0], shake: .2 * (1 - u), near: lerp(.1, 3, u) };
      S.people = true; S.pool = lerp(.25, .95, u); S.fog = .0011; S.exposure = lerp(1, 1.5, u); S.beam = lerp(.8, .15, u); S.dust = 1 - u; S.stars = .8;
    },
    ui(t, O) {
      const g = O.g, pr = P(t, 29.7, 30.7, E.io2), ring = [];
      if (pr > 0) {
        for (let i = 0; i <= 120 * pr; i++) { const a = -Math.PI / 2 + i / 120 * Math.PI * 2; ring.push(O.proj(tmp.set(Math.cos(a) * 150, 0, Math.sin(a) * 150))); }
        g.save(); g.strokeStyle = rgba(C.lime, .75); g.lineWidth = 2; g.setLineDash([10, 9]); g.beginPath();
        ring.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y))); g.stroke(); g.setLineDash([]);
        const pd = P(t, 30.4, 31, E.out3);
        if (pd > 0) {
          const L = O.proj(tmp.set(-150, 0, 0)), R = O.proj(tmp.set(150, 0, 0)), L2 = O.proj(tmp.set(-150, 0, -185)), R2 = O.proj(tmp.set(150, 0, -185));
          g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 1.5; g.globalAlpha = pd;
          for (const [a, b] of [[L, L2], [R, R2]]) { g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(lerp(a.x, b.x, pd), lerp(a.y, b.y, pd)); g.stroke(); }
          const mx = (L2.x + R2.x) / 2, my = (L2.y + R2.y) / 2;
          g.beginPath(); g.moveTo(mx, my); g.lineTo(lerp(mx, L2.x, pd), lerp(my, L2.y, pd)); g.moveTo(mx, my); g.lineTo(lerp(mx, R2.x, pd), lerp(my, R2.y, pd)); g.stroke();
          O.T('300 FT ACROSS', mx, my - 16, { sz: 20, wt: 600, f: FM, al: 'center', ls: 5, a: pd });
        }
        g.restore();
      }
      eyebrow(O, 'BROAD AREA LIGHT', 120, 200, t, 29.5);
      head(O, 'UP TO', 116, 300, t, 29.6, { sz: 96 });
      head(O, '300 FT', 116, 430, t, 29.7, { sz: 150, col: C.warm });
      head(O, 'OF LIGHT.', 116, 520, t, 29.85, { sz: 96 });
    },
  },
  // 9 · Petals aim independently through their 180 degree range.
  {
    a: 32, b: 36, n: 'Aim',
    scene(t, S) {
      const u = P(t, 32, 36, E.io2);
      S.cam = { p: orbit(4.3, lerp(15, 55, u), lerp(10.9, 10.5, u)), t: [0, 11.75, 0], fov: 36, shift: [.14, .04], shake: .3 };
      S.pitch = [0, 1, 2, 3, 4, 5].map(i => {
        const st = i * .06, a1 = i % 2 ? -.35 : .9;
        let p = a1 * P(t, 32.5 + st, 33.1 + st, E.io2);
        p = lerp(p, 1.45, P(t, 33.4 + st, 34.1 + st, E.io2));
        return lerp(p, 0, P(t, 34.4 + i * .1, 35.1 + i * .1, E.io2));
      });
      S.flare = .3;
    },
    ui(t, O, S, X) {
      const pg = X.sky.petals[5].pg, piv = pg.getWorldPosition(V3()), az = 300 * deg, r = V3(Math.cos(az), 0, Math.sin(az)), R = 1.25;
      const pa = P(t, 32.6, 33.2, E.io2), g = O.g;
      if (pa > 0) {
        const pts = [];
        for (let i = 0; i <= 48; i++) { const th = (-90 + 180 * i / 48) * deg; pts.push(O.proj(piv.clone().addScaledVector(r, Math.cos(th) * R).add(V3(0, Math.sin(th) * R, 0)))); }
        g.save(); g.globalAlpha = pa; g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 1.5; g.setLineDash([5, 7]);
        g.beginPath(); pts.slice(0, Math.round(48 * pa) + 1).forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y))); g.stroke(); g.setLineDash([]);
        const th = S.pitch[5], cur = O.proj(piv.clone().addScaledVector(r, Math.cos(th) * R).add(V3(0, Math.sin(th) * R, 0))), c0 = O.proj(piv);
        g.strokeStyle = C.lime; g.lineWidth = 2; g.beginPath(); g.moveTo(c0.x, c0.y); g.lineTo(cur.x, cur.y); g.stroke();
        g.fillStyle = C.lime; g.beginPath(); g.arc(cur.x, cur.y, 6, 0, 7); g.fill();
        const e0 = pts[0], e1 = pts[48];
        for (const e of [e0, e1]) { g.fillStyle = '#fff'; g.beginPath(); g.arc(e.x, e.y, 3.5, 0, 7); g.fill(); }
        O.T(`${Math.round(th / deg)}°`, cur.x + 16, cur.y - 12, { sz: 22, wt: 600, f: FM, col: C.lime, ls: 2 });
        O.T('180°', pts[24].x + 18, pts[24].y + 6, { sz: 18, wt: 500, f: FM, col: '#fff', ls: 3, a: .8 });
        g.restore();
      }
      eyebrow(O, '6 INDIVIDUAL PETALS', X0, 360, t, 32.1);
      head(O, 'EVERY PETAL', X0 - 4, 500, t, 32.2, { sz: 140 });
      head(O, 'AIMS 180°.', X0 - 4, 640, t, 32.35, { sz: 140, col: C.warm });
    },
  },
  // 10 · Same campsite, cold work-light white shifting to Skylight's 3250K.
  {
    a: 36, b: 40, n: '3250K',
    scene(t, S) {
      const u = P(t, 36, 40, E.io2);
      S.kelvin = lerp(7000, 3250, P(t, 37.3, 38.1, E.io2));
      S.cam = { p: mix3([14.5, 4.2, 15.5], [12.8, 4.0, 14.2], u), t: [1.2, 5.6, 1], fov: 38, shift: [.1, 0], shake: .4 };
      S.exposure = 1.05;
    },
    ui(t, O, S) {
      const g = O.g, x0 = X0, x1 = 760, y = 560, k = K => cl((K - 2700) / (7000 - 2700));
      eyebrow(O, 'COLOR TEMPERATURE', X0, 250, t, 36.1);
      head(O, 'BRIGHT ENOUGH TO WORK.', X0 - 4, 350, t, 36.25, { sz: 92 });
      head(O, 'WARM ENOUGH TO STAY.', X0 - 4, 450, t, 38.15, { sz: 92, col: C.warm });
      const a = P(t, 36.3, 36.7);
      if (a > 0) {
        g.save(); g.globalAlpha = a;
        const gr = g.createLinearGradient(x0, 0, x1, 0);
        for (let i = 0; i <= 8; i++) { const K = 2700 + 4300 * i / 8, [r, gg, b] = kelvin(K); gr.addColorStop(i / 8, `rgb(${r * 255 | 0},${gg * 255 | 0},${b * 255 | 0})`); }
        g.fillStyle = gr; g.beginPath(); g.roundRect(x0, y, x1 - x0, 8, 4); g.fill();
        O.T('WARM', x0, y + 40, { sz: 16, wt: 500, f: FM, ls: 4, col: C.mut }); O.T('COOL', x1, y + 40, { sz: 16, wt: 500, f: FM, ls: 4, col: C.mut, al: 'right' });
        const mx = lerp(x0, x1, k(S.kelvin));
        g.fillStyle = '#fff'; g.beginPath(); g.moveTo(mx, y - 6); g.lineTo(mx - 9, y - 20); g.lineTo(mx + 9, y - 20); g.fill();
        const after = S.kelvin < 3300;
        O.T(after ? 'SKYLIGHT · 3250K' : 'TRADITIONAL WORK LIGHT', mx, y - 34, { sz: 18, wt: 600, f: FM, ls: 3, al: after ? 'left' : 'right', col: after ? C.lime : '#fff' });
        g.restore();
      }
    },
  },
  // 11 · Rain through the beam. IPX4.
  {
    a: 40, b: 42, n: 'IPX4',
    scene(t, S) {
      const u = P(t, 40, 42, E.io2);
      S.cam = { p: mix3([2.7, 9.5, 3.1], [2.3, 9.8, 2.6], u), t: [0, 11.3, 0], fov: 40, shift: [.15, 0], shake: .5 };
      S.rain = 1; S.beam = 2.2; S.dust = 0; S.sat = .85; S.skyLift = .8; S.stars = .25; S.milky = 0; S.moon = .2;
    },
    ui(t, O) {
      eyebrow(O, 'BUILT FOR OUTSIDE', X0, 380, t, 40.05);
      head(O, 'IPX4', X0 - 8, 610, t, 40.1, { sz: 260 });
      O.L('Rated for outdoor use. Rainproof.', X0, 680, { sz: 32, wt: 500, col: C.mut }, P(t, 40.3, 40.7, E.outExpo));
    },
  },
  // 12 · Power runs from a Yeti up the cable; runtime on Low.
  {
    a: 42, b: 46, n: 'Yeti',
    scene(t, S) {
      const u = P(t, 42, 46, E.io2);
      S.cam = { p: mix3([5.6, 2.1, 5.9], [5.0, 2.4, 5.2], u), t: mix3([2.2, .55, 1.5], [1.7, .9, 1.1], u), fov: 38, shift: [.2, 0], shake: .35 };
      S.camp = false;
      S.studio = 70; S.studioPos = [6.5, 3.5, 7.5]; S.studioTgt = [2.9, .4, 1.75];
      S.pulse = 1 - P(t, 42.15, 42.95, E.in2); S.pulseI = 4 * (1 - P(t, 42.95, 43.4));
      S.power = .7 + .3 * P(t, 42.95, 43.1) + .3 * Math.exp(-Math.max(0, t - 42.95) * 6) * (t > 42.95 ? 1 : 0);
    },
    ui(t, O) {
      eyebrow(O, 'PLUG INTO A GOAL ZERO YETI', X0, 230, t, 42.1);
      head(O, 'LIGHT FOR DAYS.', X0 - 4, 350, t, 42.2, { sz: 120 });
      const g = O.g;
      RUNS.forEach(([nm, hrs], i) => {
        const a = 43.2 + i * .2, p = P(t, a, a + .4, E.outExpo), pb = P(t, a + .1, a + 1, E.out3); if (p <= 0) return;
        const y = 450 + i * 82, bw = Math.max(6, 520 * hrs / 357 * pb);
        g.save(); g.globalAlpha = p;
        O.T(nm, X0, y + 26, { sz: 26, wt: 600 });
        g.fillStyle = 'rgba(255,255,255,.1)'; g.fillRect(X0, y + 40, 520, 10);
        g.fillStyle = i === 3 ? C.lime : i ? C.warm : C.dim; g.fillRect(X0, y + 40, bw, 10);
        O.T(`${Math.round(hrs * pb)} HRS`, X0 + 520, y + 26, { sz: 34, wt: 700, f: FC, al: 'right', ls: 2, col: i === 3 ? C.lime : '#fff' });
        g.restore();
      });
      O.T('RUNTIME ON LOW · YETI SOLD SEPARATELY', X0, 800, { sz: 15, wt: 500, f: FM, ls: 3, col: C.mut, a: P(t, 44, 44.4) });
    },
  },
  // 13 · Real campsites, real nights: the photography.
  {
    a: 46, b: 50, n: 'Out there',
    scene(t, S) { S.three = false; S.grain = .09; },
    ui(t, O, S, X) {
      const g = O.g, beach = t < 48;
      if (beach) {
        O.photo(X.IMG.beach, lerp(1.0, 1.07, P(t, 46, 48, E.lin)), .2, .12);
        const gr = g.createLinearGradient(0, 0, 1100, 0); gr.addColorStop(0, 'rgba(5,7,12,.82)'); gr.addColorStop(1, 'rgba(5,7,12,0)'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
      } else {
        g.fillStyle = '#0b0e17'; g.fillRect(0, 0, W, H);
        O.photo(X.IMG.night, lerp(1.0, 1.06, P(t, 48, 50, E.lin)), .55, .3, [0, 0, 1080, H]);
        const gr = g.createLinearGradient(880, 0, 1080, 0); gr.addColorStop(0, 'rgba(11,14,23,0)'); gr.addColorStop(1, 'rgba(11,14,23,1)'); g.fillStyle = gr; g.fillRect(880, 0, 200, H);
      }
      const words = ['CAMPSITE.', 'TAILGATE.', 'BACKYARD.', 'JOBSITE.'], i = Math.min(3, Math.floor(t - 46)), x = beach ? X0 : 1160;
      O.T('LIGHT UP THE', x, beach ? 470 : 450, { sz: 40, wt: 700, f: FC, ls: 12, col: C.mut, a: P(t, 46, 46.3) });
      O.L(words[i], x - 6, beach ? 660 : 630, { sz: beach ? 200 : 150, wt: 800, f: FC, col: i % 2 ? C.warm : '#fff' }, P(t, 46 + i, 46 + i + .35, E.outExpo), P(t, 46.82 + i, 47 + i, E.in3));
      // light leak across each photo change
      for (const T0 of [46, 48]) {
        const q = (t - T0 + .15) / .6; if (q < 0 || q > 1) continue;
        g.save(); g.globalCompositeOperation = 'screen';
        const cx = lerp(-400, W + 400, q), lk = g.createLinearGradient(cx - 500, 0, cx + 500, 0);
        lk.addColorStop(0, 'rgba(255,170,90,0)'); lk.addColorStop(.5, `rgba(255,190,120,${.55 * Math.sin(q * Math.PI)})`); lk.addColorStop(1, 'rgba(255,170,90,0)');
        g.fillStyle = lk; g.fillRect(0, 0, W, H); g.restore();
      }
    },
  },
  // 14 · Folds down and goes in the hard case.
  {
    a: 50, b: 53, n: 'Packs down',
    scene(t, S) {
      if (t < 51.2) {
        const u = P(t, 50, 51.2, E.io2);
        S.pitch = [0, 1, 2, 3, 4, 5].map(i => -1.5 * P(t, 50 + i * .07, 50.45 + i * .07, E.io2));
        S.height = lerp(12, 4, P(t, 50.35, 51.15, E.io2));
        S.power = 1 - P(t, 50.85, 51.15); S.studio = 120 * P(t, 50.7, 51.1);
        S.cam = { p: mix3([3.2, 10.6, 4.4], [2.9, 4.6, 4.0], u), t: [0, S.height - .4, 0], fov: 38, shift: [.18, 0], shake: .3 };
      } else {
        const d = P(t, 51.2, 51.7, E.out3);
        S.pitch = [-1.5, -1.5, -1.5, -1.5, -1.5, -1.5]; S.height = 4; S.legs = 0; S.legLen = 1.7; S.power = 0;
        S.rootRot = [0, 0, -Math.PI / 2]; S.rootPos = [-2.36, lerp(1.6, .32, d), 0];
        S.caseOn = true; S.caseLid = 1 - P(t, 52, 52.45, E.in2); S.latch = 3 * Math.exp(-Math.max(0, t - 52.5) * 5) * (t > 52.5 ? 1 : 0);
        S.yeti = false; S.grass = false; S.camp = false; S.studio = 110;
        const u = P(t, 51.2, 53, E.io2);
        S.cam = { p: mix3([1.7, 2.7, 3.5], [1.25, 2.15, 2.9], u), t: [0, .25, 0], fov: 34, shift: [.2, 0], shake: .2 };
      }
      S.beam = 0; S.dust = 0; S.pool = 0; S.moon = .7;
    },
    ui(t, O) {
      eyebrow(O, 'PACKS DOWN', X0, 300, t, 50.05);
      head(O, '47.6 IN.', X0 - 4, 430, t, 50.1, { sz: 130 }, 51.0);
      head(O, 'COLLAPSED.', X0 - 4, 550, t, 50.2, { sz: 130, col: C.warm }, 51.0);
      head(O, 'HARD CASE', X0 - 4, 430, t, 51.3, { sz: 130 });
      head(O, 'INCLUDED.', X0 - 4, 550, t, 51.4, { sz: 130, col: C.warm });
      O.T('IN THE BOX: HARD CASE · 12V AUX ADAPTER · 14 LBS', X0, 610, { sz: 16, wt: 500, f: FM, ls: 3, col: C.mut, a: P(t, 51.7, 52.1) });
    },
  },
  // 15 · Hero finale from the ground: the line.
  {
    a: 53, b: 56, n: 'Raise your own sky',
    scene(t, S) {
      const u = P(t, 53, 56, E.io2);
      S.cam = { p: mix3([-3.4, .45, 7.4], [-2.6, 3.0, 6.3], u), t: mix3([0, 8.5, 0], [0, 10.6, 0], u), fov: lerp(30, 27, u), shake: .35 };
      S.beam = 1.2; S.dust = 1.4; S.flare = 1.2; S.exposure = 1.15; S.bloom = [.85, .55, 1]; S.milky = 1.4; S.lbox = P(t, 53, 53.4, E.io3);
    },
    ui(t, O) {
      const words = ['RAISE', 'YOUR', 'OWN', 'SKY.'], sz = 140, sp = 34, ws = words.map(w => O.tw(w, sz, 800, FC, 4));
      let x = W / 2 - (ws.reduce((a, b) => a + b, 0) + sp * 3) / 2;
      words.forEach((w, i) => { O.L(w, x, 845, { sz, wt: 800, f: FC, ls: 4, col: i === 3 ? C.warm : '#fff' }, P(t, 53.5 + i * .5, 53.95 + i * .5, E.outExpo)); x += ws[i] + sp; });
    },
  },
  // 16 · End lockup under the light.
  {
    a: 56, b: 60, n: 'End',
    scene(t, S) {
      const az = lerp(40, 52, P(t, 56, 60, E.lin));
      S.cam = { p: orbit(2.6, az, 2.2), t: [0, 12.2, 0], up: hz(az), fov: 50, shift: [0, -.21], shake: .15 };
      S.exposure = .85; S.beam = 0; S.flare = .7; S.dust = .8; S.lbox = 1;
    },
    ui(t, O) {
      O.mask(590, 44, P(t, 56.3, 56.8, E.outExpo), 0, () => O.wordmark(W / 2, 590, 44, '#fff', 'center'));
      O.L('SKYLIGHT', W / 2, 790, { sz: 210, wt: 800, f: FC, al: 'center', ls: 18 }, P(t, 56.1, 56.7, E.outExpo));
      O.T('TELESCOPING AREA LIGHT', W / 2, 856, { sz: 20, wt: 500, f: FM, al: 'center', ls: 8, col: C.mut, a: P(t, 56.6, 57) });
      O.T('goalzero.com', W / 2, 908, { sz: 30, wt: 500, al: 'center', col: '#fff', a: P(t, 56.9, 57.4) });
    },
  },
];

// Before the type: anamorphic flare on the lit head.
export function pre(t, O, S, X) {
  if (S.flare > 0 && S.power > 0) {
    X.sky.head.getWorldPosition(tmp); tmp.y -= .15;
    O.flare(O.proj(tmp), S.flare * Math.min(1, S.power));
  }
}

// After the type: letterbox, data bar, flashes, whip, fades.
export function post(t, O, S) {
  O.letterbox(S.lbox);
  if (t >= 12.3 && t < 19.8 && S.lbox > .9) {
    const a = P(t, 12.3, 12.8) * (1 - P(t, 19.5, 19.8));
    O.T('GOAL ZERO SKYLIGHT · SKU 32015', 60, 1018, { sz: 15, wt: 500, f: FM, ls: 4, col: C.mut, a });
    O.T('12 FT · 6,000 LM · 168 LEDs · 3250K · IPX4', W - 60, 1018, { sz: 15, wt: 500, f: FM, ls: 4, col: C.mut, al: 'right', a });
  }
  const fl = (T0, up, down, peak) => (t < T0 ? P(t, T0 - up, T0, E.in2) : 1 - P(t, T0, T0 + down, E.out2)) * peak * (Math.abs(t - T0) < Math.max(up, down) ? 1 : 0);
  O.flash(Math.max(fl(10, .25, .45, 1), fl(20, .05, .3, .35), fl(42, .05, .35, .4), fl(56, .1, .55, .5), fl(27.99, .06, .2, .25)));
  if (Math.abs(t - 51.2) < .1) {
    const k = 1 - Math.abs(t - 51.2) / .1, g = O.g;
    g.save(); g.globalAlpha = .22; for (let i = 1; i <= 5; i++) { g.drawImage(g.canvas, i * 34 * k, 0); g.drawImage(g.canvas, -i * 34 * k, 0); } g.restore();
  }
  const black = Math.max(1 - P(t, 0, 1.1, E.io2), P(t, 59.1, 60, E.io2));
  if (black > 0) { O.g.fillStyle = `rgba(0,0,0,${black})`; O.g.fillRect(0, 0, W, H); }
}
