// 2D layer: supers, HUD readouts, callouts, letterbox, flare. Everything is a pure function of t.
import { clamp, lerp, seg, sm, eo3, eo5, ei3, eio, eoBack } from './util.js';

const el = (tag, cls, parent, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; parent?.appendChild(e); return e; };
const px = v => v.toFixed(2) + 'px';
const fmt = n => Math.round(n).toLocaleString('en-US');

class Card {
  constructor(root, { a, b, pos, eyebrow, head, sub, fine, size = 112, align = 'left' }) {
    Object.assign(this, { a, b });
    this.e = el('div', 'card ' + align, root);
    Object.assign(this.e.style, pos);
    if (eyebrow) { this.eb = el('div', 'eb', this.e); this.rule = el('span', 'rule', this.eb); el('span', 'ebt', this.eb, eyebrow); }
    this.hd = el('div', 'hd', this.e); this.hd.style.fontSize = size + 'px';
    this.lines = head.map(h => { const ln = el('span', 'ln', this.hd); return el('span', 'in', ln, h); });
    if (sub) this.sb = el('div', 'sb', this.e, sub);
    if (fine) this.fn = el('div', 'fn', this.e, fine);
  }
  update(t) {
    const { a, b } = this, on = t >= a - 0.02 && t < b;
    this.e.style.display = on ? '' : 'none'; if (!on) return;
    const out = seg(t, b - 0.34, b);
    if (this.eb) {
      this.eb.style.opacity = (eo3(seg(t, a, a + 0.35)) * (1 - out)).toFixed(3);
      this.eb.style.transform = `translateX(${px((1 - eo3(seg(t, a, a + 0.55))) * -18)})`;
      this.rule.style.transform = `scaleX(${eo3(seg(t, a + 0.05, a + 0.7)).toFixed(3)})`;
    }
    this.lines.forEach((l, j) => {
      const pin = eo5(seg(t, a + 0.08 + j * 0.08, a + 0.72 + j * 0.08));
      const po = ei3(seg(t, b - 0.34 + j * 0.03, b - 0.02));
      l.style.transform = `translateY(${((1 - pin) * 112 - po * 112).toFixed(2)}%)`;
    });
    for (const [x, d] of [[this.sb, 0.38], [this.fn, 0.55]]) {
      if (!x) continue;
      const p = eo3(seg(t, a + d, a + d + 0.55));
      x.style.opacity = (p * (1 - out)).toFixed(3);
      x.style.transform = `translateY(${px((1 - p) * 12)})`;
      x.style.filter = `blur(${px((1 - p) * 5)})`;
    }
  }
}

class Soft {
  constructor(root, { a, b, text, pos, size = 64 }) {
    Object.assign(this, { a, b });
    this.e = el('div', 'soft', root); Object.assign(this.e.style, pos); this.e.style.fontSize = size + 'px';
    this.ch = [...text].map(c => el('span', null, this.e, c === ' ' ? '&nbsp;' : c));
  }
  update(t) {
    const { a, b } = this, on = t >= a && t < b + 0.01;
    this.e.style.display = on ? '' : 'none'; if (!on) return;
    const out = sm(seg(t, b - 0.7, b));
    this.ch.forEach((c, i) => {
      const p = sm(seg(t, a + i * 0.032, a + i * 0.032 + 0.9));
      c.style.opacity = (p * (1 - out)).toFixed(3);
      c.style.filter = `blur(${px((1 - p) * 14 + out * 10)})`;
      c.style.transform = `translateY(${px((1 - p) * 10)})`;
    });
    this.e.style.letterSpacing = (0.06 + 0.05 * seg(t, a, b)).toFixed(4) + 'em';
  }
}

export class Overlay {
  constructor(root) {
    this.root = root;
    this.flare = el('div', 'flare', root, '<div class="streak"></div><div class="streak s2"></div><div class="core"></div><div class="ghost g1"></div><div class="ghost g2"></div>');
    this.svg = el('div', 'svgwrap', root, '<svg width="1920" height="1080" viewBox="0 0 1920 1080"></svg>').firstChild;
    this.lbT = el('div', 'lb top', root); this.lbB = el('div', 'lb bot', root);
    this.bug = el('div', 'bug', root, '<b>GOAL ZERO</b><span>SKYLIGHT</span>');

    const L = { left: '120px', bottom: '150px' }, TL = { left: '120px', top: '150px' }, TR = { right: '120px', top: '150px' }, BR = { right: '120px', bottom: '150px' };
    this.items = [
      new Soft(root, { a: 1.1, b: 4.0, text: 'The sun clocks out.', pos: { left: '0', right: '0', top: '470px' }, size: 68 }),
      new Soft(root, { a: 4.35, b: 7.6, text: "You don't have to.", pos: { left: '0', right: '0', top: '470px' }, size: 68 }),
      new Card(root, { a: 20.25, b: 23.92, pos: L, eyebrow: '02 / HEAD', head: ['SIX PETALS.', '168 LEDs.'], sub: 'Each petal carries its own 28-LED array.' }),
      new Card(root, { a: 24.25, b: 27.92, pos: L, eyebrow: '03 / AIM', head: ['AIM IT', 'ANYWHERE.'], sub: 'Every petal pivots on its own through 180°.' }),
      new Card(root, { a: 28.25, b: 31.92, pos: TR, align: 'right', eyebrow: '04 / REACH', head: ['4 FT TO', '12 FT.'], sub: 'Telescoping aluminum mast.' }),
      new Card(root, { a: 32.12, b: 35.92, pos: TL, eyebrow: '05 / MODES', head: ['FOUR', 'MODES.'] }),
      new Card(root, { a: 36.2, b: 39.92, pos: TL, eyebrow: '06 / COLOR', head: ['3250K.'], sub: 'Warmer than a typical work light.<br>Easier on the eyes at camp.', size: 150 }),
      new Card(root, { a: 40.2, b: 41.98, pos: TL, eyebrow: '07 / POWER', head: ['33Wh', 'BUILT IN.'], sub: 'Up to 8 hours on Low.' }),
      new Card(root, { a: 42.08, b: 43.94, pos: TL, eyebrow: '07 / POWER', head: ['PLUG INTO', 'A YETI.'], sub: 'Up to 375 hours on Low.', fine: 'Runtime on Low with Yeti 1500X.' }),
      new Card(root, { a: 52.3, b: 55.92, pos: TL, eyebrow: '08 / WEATHER', head: ['IPX4.'], sub: "Rain doesn't end the night.", fine: 'Integrated aluminum tripod. Three ground stakes.', size: 150 }),
      new Card(root, { a: 56.45, b: 59.5, pos: TL, eyebrow: '09 / PACK', head: ['PACKS TO', '44.7 IN.'], sub: 'Hard case included.' }),
    ];

    // 01 lumens slam
    this.lum = el('div', 'lumen', root, `<div class="eb"><span class="rule"></span><span class="ebt">01 / OUTPUT</span></div>
      <div class="big"><span class="num">6,000</span><span class="unit">LUMENS</span></div><div class="sb">Lights up to 300 feet.</div>`);
    this.lumNum = this.lum.querySelector('.num');

    // rise ruler
    this.rise = el('div', 'rise', root, `<div class="lbl">MAST HEIGHT</div><div class="val"><span class="n">03.7</span><span class="u">FT</span></div><div class="stage">STAGE 0 / 3</div>`);
    this.riseN = this.rise.querySelector('.n'); this.riseStage = this.rise.querySelector('.stage');

    // modes HUD
    this.modes = el('div', 'modes', root, `<div class="read"><span class="n">400</span><span class="u">LM</span></div>
      <div class="segs">${['LOW', 'MED', 'HIGH', 'BOOST'].map(m => `<div class="sg"><i></i><b>${m}</b></div>`).join('')}</div>`);
    this.modeN = this.modes.querySelector('.n'); this.modeSeg = [...this.modes.querySelectorAll('.sg')];

    // kelvin HUD
    this.kel = el('div', 'kel', root, `<div class="track"><div class="knob"><span>6500K</span></div></div><div class="ends"><span>2700K WARM</span><span>6500K COOL</span></div>`);
    this.kKnob = this.kel.querySelector('.knob'); this.kTxt = this.kel.querySelector('.knob span');

    // power HUD
    this.pow = el('div', 'pow', root, `<div class="row a"><b>SKYLIGHT</b><div class="bar"><i></i></div><span>8 HRS</span></div>
      <div class="row b"><b>+ YETI 1500X</b><div class="bar"><i></i></div><span>375 HRS</span></div>`);
    this.powA = this.pow.querySelector('.a i'); this.powB = this.pow.querySelector('.b i'); this.powRowB = this.pow.querySelector('.b');

    // montage words
    const words = [['CAMP.', 'MOAB, UT', '38.57°N 109.55°W'], ['TAILGATE.', 'PROVO, UT', '40.26°N 111.65°W'], ['JOB SITE.', 'SALT LAKE CITY, UT', '40.76°N 111.89°W'], ['BACKYARD.', 'BLUFFDALE, UT', '40.49°N 111.94°W']];
    this.words = words.map(([w, c, g], i) => {
      const e = el('div', 'word', root, `<div class="w"><span>${w}</span></div><div class="loc"><b>${c}</b><span>${g}</span></div>`);
      return { e, w: e.querySelector('.w span'), loc: e.querySelector('.loc'), a: 44 + i * 2, b: 46 + i * 2 };
    });
    this.tick = el('div', 'ticks', root, [0, 1, 2, 3].map(i => `<i></i>`).join(''));
    this.ticks = [...this.tick.children];

    // end lockup
    this.end = el('div', 'end', root, `<div class="brand">GOAL ZERO</div><div class="name"><span>SKYLIGHT</span></div>
      <div class="kind">PORTABLE AREA LIGHT</div><div class="erule"></div><div class="tag">Make your own daylight.</div><div class="url">goalzero.com</div>`);
    this.endParts = ['brand', 'name', 'kind', 'erule', 'tag', 'url'].map(c => this.end.querySelector('.' + c));
    this.endName = this.end.querySelector('.name span');

    // callout labels
    this.co = [el('div', 'co', root, '<b>28 LEDs</b><span>PER PETAL</span>'), el('div', 'co', root, '<b>180°</b><span>INDEPENDENT PIVOT</span>')];
    this.htag = el('div', 'htag', root, '<b>5 FT 10 IN</b><span>FOR SCALE</span>');
    this.hread = el('div', 'hread', root, '<span class="n">12.0</span><span class="u">FT</span>');
    this.fade = el('div', 'fade', root); this.flash = el('div', 'flashw', root);
  }

  render(t, S, P) {
    let svg = '';
    // letterbox
    const lb = S.letterbox * 138;
    this.lbT.style.height = px(lb); this.lbB.style.height = px(lb);
    // flare
    const I = S.lum <= 0 ? 0 : Math.pow(S.lum, 0.6);
    const fv = S.flare * I * P.flareVis * (P.head.z < 1 ? 1 : 0);
    this.flare.style.opacity = clamp(fv).toFixed(3);
    this.flare.style.transform = `translate(${px(P.head.x)}, ${px(P.head.y)})`;
    const gx = (960 - P.head.x), gy = (540 - P.head.y);
    this.flare.querySelector('.g1').style.transform = `translate(${px(gx * 1.4)}, ${px(gy * 1.4)})`;
    this.flare.querySelector('.g2').style.transform = `translate(${px(gx * 2.1)}, ${px(gy * 2.1)})`;
    // bug
    this.bug.style.opacity = (0.75 * win2(t, 16.6, 59.4, 0.6, 0.4) * (t >= 44 && t < 52 ? 0 : 1)).toFixed(3);

    for (const it of this.items) it.update(t);

    // 01 lumens
    {
      const a = 16.25, b = 19.92, on = t >= a && t < b;
      this.lum.style.display = on ? '' : 'none';
      if (on) {
        const p = eo5(seg(t, a, a + 0.5)), out = seg(t, b - 0.35, b);
        this.lumNum.textContent = fmt(6000 * eo3(seg(t, a, a + 0.7)));
        const big = this.lum.querySelector('.big');
        big.style.transform = `scale(${lerp(1.18, 1, p).toFixed(4)})`;
        big.style.opacity = (Math.min(1, seg(t, a, a + 0.12) * 1) * (1 - out)).toFixed(3);
        big.style.letterSpacing = lerp(0.06, -0.015, p).toFixed(4) + 'em';
        big.style.filter = `blur(${px((1 - p) * 8 + out * 8)})`;
        const eb = this.lum.querySelector('.eb'); eb.style.opacity = (eo3(seg(t, a + 0.2, a + 0.6)) * (1 - out)).toFixed(3);
        this.lum.querySelector('.eb .rule').style.transform = `scaleX(${eo3(seg(t, a + 0.25, a + 0.9)).toFixed(3)})`;
        const sb = this.lum.querySelector('.sb'), ps = eo3(seg(t, a + 0.6, a + 1.1));
        sb.style.opacity = (ps * (1 - out)).toFixed(3); sb.style.transform = `translateY(${px((1 - ps) * 12)})`;
      }
    }

    // rise readout
    {
      const on = t >= 8.05 && t < 13.5;
      this.rise.style.display = on ? '' : 'none';
      if (on) {
        const o = eo3(seg(t, 8.05, 8.45)) * (1 - seg(t, 13.1, 13.45));
        this.rise.style.opacity = o.toFixed(3);
        this.riseN.textContent = S.H.toFixed(1).padStart(4, '0');
        const st = [9.0, 10.5, 12.0].filter(x => t >= x).length;
        this.riseStage.textContent = `STAGE ${st} / 3 LOCKED`;
        // vertical scale with ticks
        const x0 = 1630, yb = 900, yt = 250, yv = h => lerp(yb, yt, h / 12);
        for (let f = 0; f <= 12; f++) {
          const y = yv(f), major = f % 4 === 0, w = major ? 34 : 16;
          const lit = S.H >= f - 0.01;
          svg += `<line x1="${x0}" y1="${y}" x2="${x0 + w}" y2="${y}" stroke="${lit ? '#FFC891' : 'rgba(255,255,255,.28)'}" stroke-width="${major ? 2 : 1}" opacity="${o}"/>`;
          if (major) svg += `<text x="${x0 + 46}" y="${y + 6}" class="svt" opacity="${o}">${f} FT</text>`;
        }
        svg += `<line x1="${x0}" y1="${yb}" x2="${x0}" y2="${yt}" stroke="rgba(255,255,255,.25)" stroke-width="1" opacity="${o}"/>`;
        svg += `<line x1="${x0}" y1="${yb}" x2="${x0}" y2="${yv(S.H)}" stroke="#FFC891" stroke-width="3" opacity="${o}"/>`;
        const ym = yv(S.H);
        svg += `<path d="M${x0 - 10} ${ym} l-14 -8 v16 z" fill="#FFC891" opacity="${o}"/>`;
        // lock flashes
        for (const L of [9.0, 10.5, 12.0]) {
          const k = seg(t, L, L + 0.45);
          if (k > 0 && k < 1) svg += `<circle cx="${x0}" cy="${ym}" r="${8 + k * 40}" fill="none" stroke="#FFC891" stroke-width="${2 * (1 - k)}" opacity="${(1 - k) * o}"/>`;
        }
      }
    }

    // head callouts
    {
      const a = 20.6, b = 23.8, on = t >= a && t < b;
      this.co.forEach(c => (c.style.display = on ? '' : 'none'));
      if (on) {
        const pts = [P.frames[0], P.hinge];
        const lab = [[1500, 830], [1500, 650]];
        pts.forEach((p, i) => {
          const k = eo3(seg(t, a + i * 0.25, a + 0.6 + i * 0.25)) * (1 - seg(t, b - 0.3, b));
          const [lx, ly] = lab[i];
          const mx = lerp(p.x, lx - 40, 0.6);
          const d = `M${p.x.toFixed(1)} ${p.y.toFixed(1)} L${mx.toFixed(1)} ${ly} L${lx - 14} ${ly}`;
          svg += `<path d="${d}" fill="none" stroke="#FFC891" stroke-width="1.5" pathLength="1" stroke-dasharray="1" stroke-dashoffset="${(1 - k).toFixed(3)}"/>`;
          svg += `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${(6 * k).toFixed(2)}" fill="none" stroke="#FFC891" stroke-width="2"/><circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${(2.5 * k).toFixed(2)}" fill="#FFC891"/>`;
          const c = this.co[i]; c.style.left = px(lx); c.style.top = px(ly - 30);
          c.style.opacity = eo3(seg(t, a + 0.35 + i * 0.25, a + 0.8 + i * 0.25)) * (1 - seg(t, b - 0.3, b));
        });
      }
    }

    // height ruler (projected)
    {
      const a = 28.4, b = 31.9, on = t >= a && t < b;
      this.htag.style.display = on && P.personHead ? '' : 'none';
      this.hread.style.display = on ? '' : 'none';
      if (on) {
        const o = eo3(seg(t, a, a + 0.4)) * (1 - seg(t, b - 0.3, b));
        const g = P.ground, top12 = P.top(12), xr = g.x - 36;
        svg += `<line x1="${xr}" y1="${g.y}" x2="${xr}" y2="${top12.y}" stroke="rgba(255,255,255,.3)" stroke-width="1" opacity="${o}"/>`;
        for (let f = 0; f <= 12; f++) {
          const y = P.top(f).y, major = f === 4 || f === 12 || f === 0, w = major ? 26 : 12;
          svg += `<line x1="${xr - w}" y1="${y}" x2="${xr}" y2="${y}" stroke="${S.H >= f - 0.01 ? '#FFC891' : 'rgba(255,255,255,.35)'}" stroke-width="${major ? 2 : 1}" opacity="${o}"/>`;
          if (f === 4 || f === 12) svg += `<text x="${xr - 36}" y="${y + 6}" text-anchor="end" class="svt" opacity="${o}">${f} FT</text>`;
        }
        const yh = P.top(S.H).y;
        svg += `<line x1="${xr}" y1="${g.y}" x2="${xr}" y2="${yh}" stroke="#FFC891" stroke-width="3" opacity="${o}"/>`;
        svg += `<line x1="${xr}" y1="${yh}" x2="${g.x + 120}" y2="${yh}" stroke="#FFC891" stroke-width="1" stroke-dasharray="4 6" opacity="${o * 0.8}"/>`;
        this.hread.style.left = px(xr - 210); this.hread.style.top = px(yh - 30); this.hread.style.opacity = o;
        this.hread.querySelector('.n').textContent = S.H.toFixed(1);
        if (P.personHead) {
          const ph = P.personHead;
          this.htag.style.left = px(ph.x + 40); this.htag.style.top = px(ph.y - 18); this.htag.style.opacity = o * eo3(seg(t, a + 0.4, a + 0.9));
          svg += `<line x1="${ph.x + 8}" y1="${ph.y}" x2="${ph.x + 32}" y2="${ph.y}" stroke="rgba(255,255,255,.7)" stroke-width="1.5" opacity="${o}"/>`;
        }
      }
    }

    // modes
    {
      const a = 32.0, b = 35.95, on = t >= a && t < b;
      this.modes.style.display = on ? '' : 'none';
      if (on) {
        const o = eo3(seg(t, a, a + 0.3)) * (1 - seg(t, b - 0.3, b));
        this.modes.style.opacity = o.toFixed(3);
        const T = [32, 33, 34, 35], Lm = [400, 1350, 3500, 6000];
        const i = T.filter(x => t >= x).length - 1, prev = i > 0 ? Lm[i - 1] : 0;
        this.modeN.textContent = fmt(lerp(prev, Lm[i], eo3(seg(t, T[i], T[i] + 0.35))));
        this.modeSeg.forEach((s, j) => {
          const k = j <= i ? eo3(seg(t, T[j], T[j] + 0.25)) : 0;
          s.querySelector('i').style.transform = `scaleX(${k.toFixed(3)})`;
          s.classList.toggle('on', j === i);
        });
      }
    }

    // kelvin
    {
      const a = 36.15, b = 39.95, on = t >= a && t < b;
      this.kel.style.display = on ? '' : 'none';
      if (on) {
        const o = eo3(seg(t, a + 0.3, a + 0.7)) * (1 - seg(t, b - 0.3, b));
        this.kel.style.opacity = o.toFixed(3);
        const f = (S.kelvin - 2700) / (6500 - 2700);
        this.kKnob.style.left = (f * 100).toFixed(2) + '%';
        this.kTxt.textContent = Math.round(S.kelvin / 10) * 10 + 'K';
      }
    }

    // power
    {
      const a = 40.4, b = 43.95, on = t >= a && t < b;
      this.pow.style.display = on ? '' : 'none';
      if (on) {
        const o = eo3(seg(t, a, a + 0.4)) * (1 - seg(t, b - 0.3, b));
        this.pow.style.opacity = o.toFixed(3);
        this.powA.style.transform = `scaleX(${(8 / 375 * eo3(seg(t, a + 0.2, a + 0.9))).toFixed(4)})`;
        const kb = eo3(seg(t, 42.1, 43.2));
        this.powB.style.transform = `scaleX(${kb.toFixed(4)})`;
        this.powRowB.style.opacity = eo3(seg(t, 42.0, 42.3)).toFixed(3);
      }
    }

    // montage words
    for (const w of this.words) {
      const on = t >= w.a && t < w.b;
      w.e.style.display = on ? '' : 'none';
      if (!on) continue;
      const p = eo5(seg(t, w.a, w.a + 0.45)), out = ei3(seg(t, w.b - 0.22, w.b));
      w.w.style.transform = `translateY(${((1 - p) * 105 - out * 105).toFixed(2)}%)`;
      w.loc.style.opacity = (eo3(seg(t, w.a + 0.25, w.a + 0.6)) * (1 - out)).toFixed(3);
    }
    {
      const on = t >= 44 && t < 52;
      this.tick.style.display = on ? '' : 'none';
      if (on) this.ticks.forEach((k, i) => k.classList.toggle('on', t >= 44 + i * 2));
    }

    // end lockup
    {
      const a = 60.15, on = t >= a;
      this.end.style.display = on ? '' : 'none';
      if (on) {
        const d = [0.0, 0.25, 0.75, 0.95, 1.6, 2.4];
        this.endParts.forEach((e, i) => {
          const p = eo3(seg(t, a + d[i], a + d[i] + 0.7));
          if (e.classList.contains('erule')) { e.style.transform = `scaleX(${p.toFixed(3)})`; return; }
          if (e.classList.contains('name')) return;
          e.style.opacity = p.toFixed(3); e.style.transform = `translateY(${px((1 - p) * 14)})`; e.style.filter = `blur(${px((1 - p) * 6)})`;
        });
        const pn = eo5(seg(t, a + 0.25, a + 1.15));
        this.endName.style.transform = `translateY(${((1 - pn) * 108).toFixed(2)}%)`;
        this.endName.style.letterSpacing = lerp(0.0, 0.05, eio(seg(t, a + 0.25, 65.5))).toFixed(4) + 'em';
      }
    }

    this.svg.innerHTML = svg;
    this.fade.style.opacity = clamp(S.fade).toFixed(3);
    this.flash.style.opacity = clamp(S.flash).toFixed(3);
  }
}

function p0x(p) { return p.x; }
function win2(t, a, b, fi, fo) { return Math.min(sm(seg(t, a, a + fi)), 1 - sm(seg(t, b - fo, b))); }
