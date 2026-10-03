// Procedural Skylight model plus the set dressing for each location. Units are feet.
import * as THREE from 'three';
import { rng, D2R } from './util.js';

export const HC = 44.7 / 12, HMAX = 12;           // collapsed and max height (top of hub)
const HUB_H = 0.34, OUTER_TOP = 3.0, SEC_R = [0.09, 0.077, 0.065];
export const STEP = (HMAX - HC) / 3;
export const PETAL_L = 1.02;

const std = (o) => new THREE.MeshStandardMaterial(o);
const M = {
  alu: std({ color: 0x33373d, metalness: 0.6, roughness: 0.45 }),
  aluInner: std({ color: 0x3c4047, metalness: 0.5, roughness: 0.6 }),
  shell: std({ color: 0x141518, metalness: 0.15, roughness: 0.5 }),
  shellTop: std({ color: 0x1d1f23, metalness: 0.3, roughness: 0.42 }),
  rubber: std({ color: 0x0a0a0b, roughness: 0.92 }),
  steel: std({ color: 0x8a8d92, metalness: 1, roughness: 0.3 }),
};
// the head's own lights sit inches from the mast; keep them from blowing it out (spot indices 0-3 are key + petal lights)
for (const m of [M.alu, M.aluInner]) {
  m.onBeforeCompile = sh => {
    sh.fragmentShader = sh.fragmentShader.replace('#include <lights_fragment_begin>', THREE.ShaderChunk.lights_fragment_begin.replace(
      'getSpotLightInfo( spotLight, geometryPosition, directLight );',
      'getSpotLightInfo( spotLight, geometryPosition, directLight ); if ( UNROLLED_LOOP_INDEX < 4 ) directLight.color *= 0.5;'));
  };
}
// image-based reflections only on the product (scene-wide IBL is too slow in software GL)
export function setProductEnv(tex, k) {
  for (const m of Object.values(M)) { if (m.envMap !== tex) { m.envMap = tex; m.needsUpdate = true; } m.envMapIntensity = k; }
}

function cyl(r1, r2, h, mat, seg = 24) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, seg), mat);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}
function box(w, h, d, mat) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}
// a rod between two points
function rod(a, b, r, mat, seg = 10) {
  const dir = new THREE.Vector3().subVectors(b, a), len = dir.length();
  const m = cyl(r, r, len, mat, seg);
  m.position.copy(a).addScaledVector(dir, 0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  return m;
}

function ledTexture() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#0d0c0b'; g.fillRect(0, 0, 256, 128);
  // diffuser glow
  const lg = g.createLinearGradient(0, 0, 0, 128);
  lg.addColorStop(0, '#120f0c'); lg.addColorStop(0.5, '#2a2117'); lg.addColorStop(1, '#120f0c');
  g.fillStyle = lg; g.fillRect(6, 6, 244, 116);
  for (let i = 0; i < 7; i++) for (let j = 0; j < 4; j++) {
    const x = 22 + i * 35.3, y = 20 + j * 29.3;
    const rg = g.createRadialGradient(x, y, 0, x, y, 13);
    rg.addColorStop(0, '#ffffff'); rg.addColorStop(0.35, '#fff3dd'); rg.addColorStop(0.7, '#5a4630'); rg.addColorStop(1, 'rgba(40,30,20,0)');
    g.fillStyle = rg; g.beginPath(); g.arc(x, y, 13, 0, Math.PI * 2); g.fill();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

function petalGeometry() {
  // top view outline in x (radial) / y (tangent); root narrower than tip, rounded tip
  const s = new THREE.Shape(), rw = 0.15, tw = 0.25, L = PETAL_L;
  s.moveTo(0.02, -rw);
  s.lineTo(L - 0.12, -tw);
  s.quadraticCurveTo(L, -tw, L, -tw + 0.12);
  s.lineTo(L, tw - 0.12);
  s.quadraticCurveTo(L, tw, L - 0.12, tw);
  s.lineTo(0.02, rw);
  s.lineTo(0.02, -rw);
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.05, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 2, curveSegments: 6 });
  g.rotateX(-Math.PI / 2); // extrusion now along +y
  g.translate(0, -0.025, 0);
  return g;
}

export function buildSkylight() {
  const root = new THREE.Group(); root.name = 'skylight';
  const ledTex = ledTexture();

  // tripod
  const collarY = 0.7;
  for (let i = 0; i < 3; i++) {
    const a = i * (Math.PI * 2 / 3) + Math.PI / 2;
    const ca = Math.cos(a), sa = Math.sin(a);
    const top = new THREE.Vector3(ca * 0.16, collarY, sa * 0.16);
    const foot = new THREE.Vector3(ca * 1.75, 0.07, sa * 1.75);
    root.add(rod(top, foot, 0.04, M.alu));
    const mid = top.clone().lerp(foot, 0.5);
    root.add(rod(mid, new THREE.Vector3(ca * 0.09, 0.38, sa * 0.09), 0.022, M.alu));
    const pad = cyl(0.075, 0.09, 0.07, M.rubber); pad.position.set(ca * 1.78, 0.035, sa * 1.78); root.add(pad);
    const stake = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.4, 8), M.steel);
    stake.rotation.x = Math.PI; stake.position.set(ca * 1.9, 0.12, sa * 1.9); stake.castShadow = true; root.add(stake);
    const hinge = box(0.1, 0.12, 0.1, M.shell); hinge.position.copy(top); hinge.rotation.y = -a; root.add(hinge);
  }
  const lowerHub = cyl(0.1, 0.12, 0.16, M.shell); lowerHub.position.y = 0.38; root.add(lowerHub);
  root.add(rod(new THREE.Vector3(0, 0.38, 0), new THREE.Vector3(0, collarY, 0), 0.05, M.alu));

  // battery body
  const body = cyl(0.22, 0.235, 1.3, M.shell, 32); body.position.y = 0.62 + 0.65; root.add(body);
  const bodyCapB = cyl(0.24, 0.24, 0.07, M.shellTop, 32); bodyCapB.position.y = 0.64; root.add(bodyCapB);
  const bodyCapT = cyl(0.2, 0.235, 0.09, M.shellTop, 32); bodyCapT.position.y = 1.94; root.add(bodyCapT);
  for (const y of [0.95, 1.6]) { const r = cyl(0.238, 0.238, 0.018, M.rubber, 32); r.position.y = y; root.add(r); }
  const plate = box(0.2, 0.36, 0.03, M.shellTop); plate.position.set(0, 1.36, 0.225); root.add(plate);
  const btnMat = std({ color: 0x111111, emissive: 0xffd9a8, emissiveIntensity: 0 });
  const btnRing = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.009, 8, 32), btnMat);
  btnRing.position.set(0, 1.44, 0.242); root.add(btnRing);
  const btn = cyl(0.036, 0.036, 0.02, M.rubber, 24); btn.rotation.x = Math.PI / 2; btn.position.set(0, 1.44, 0.243); root.add(btn);
  const batt = [];
  for (let i = 0; i < 4; i++) {
    const m = std({ color: 0x111111, emissive: 0xfff1dc, emissiveIntensity: 0 });
    const d = box(0.026, 0.012, 0.01, m); d.position.set(-0.054 + i * 0.036, 1.3, 0.242); root.add(d); batt.push(m);
  }
  const port = box(0.07, 0.035, 0.012, std({ color: 0x050505, roughness: 0.6 })); port.position.set(0, 1.22, 0.242); root.add(port);

  // mast
  const outer = cyl(0.105, 0.105, OUTER_TOP - 1.95, M.alu); outer.position.y = (OUTER_TOP + 1.95) / 2; root.add(outer);
  const secs = SEC_R.map(r => { const m = cyl(r, r, 1, M.aluInner, 20); root.add(m); return m; });
  const collars = [0, 1, 2].map(i => {
    const r = (i === 0 ? 0.105 : SEC_R[i - 1]) + 0.026;
    const g = new THREE.Group();
    const c = cyl(r, r, 0.15, M.shell, 24); g.add(c);
    const lever = box(0.05, 0.16, 0.05, M.shellTop); lever.position.set(r + 0.02, -0.01, 0); g.add(lever);
    g.rotation.y = i * 2.1;
    root.add(g); return g;
  });

  // head
  const head = new THREE.Group(); root.add(head);
  const hub = cyl(0.17, 0.2, HUB_H, M.shell, 6); hub.position.y = HUB_H / 2; head.add(hub);
  const cap = cyl(0.13, 0.17, 0.05, M.alu, 6); cap.position.y = HUB_H + 0.025; head.add(cap);
  const petals = [], petalLed = [];
  const pg = petalGeometry();
  const finG = new THREE.BoxGeometry(PETAL_L * 0.72, 0.035, 0.016);
  const ledG = new THREE.PlaneGeometry(PETAL_L * 0.8, 0.36);
  for (let i = 0; i < 6; i++) {
    const pivot = new THREE.Group(); pivot.rotation.y = -i * Math.PI / 3; pivot.position.y = HUB_H * 0.55; head.add(pivot);
    const hinge = new THREE.Group(); hinge.position.x = 0.19; pivot.add(hinge);
    const knuckle = cyl(0.03, 0.03, 0.2, M.alu, 12); knuckle.rotation.x = Math.PI / 2; pivot.add(knuckle); knuckle.position.x = 0.19;
    const shell = new THREE.Mesh(pg, M.shell); shell.castShadow = false; shell.receiveShadow = true; hinge.add(shell);
    for (let f = -2; f <= 2; f++) {
      const fin = new THREE.Mesh(finG, M.shellTop); fin.position.set(PETAL_L * 0.52, 0.045, f * 0.075); hinge.add(fin);
    }
    const mat = std({ color: 0x0b0a09, roughness: 0.35, metalness: 0, emissive: 0xffc491, emissiveMap: ledTex, emissiveIntensity: 0 });
    const led = new THREE.Mesh(ledG, mat);
    led.rotation.x = Math.PI / 2;
    led.position.set(PETAL_L * 0.55, -0.039, 0);
    hinge.add(led);
    petals.push(hinge); petalLed.push(mat);
  }

  head.traverse(o => { o.castShadow = false; });
  // the key light sits on the mast axis just under the head, so the mast must not occlude it
  [outer, ...secs, ...collars].forEach(m => m.traverse(o => { o.castShadow = false; }));
  // per-frame pose
  const tmp = new THREE.Vector3();
  function pose({ H, petal, lum, color, btn: b, batt: bt }) {
    const ext = Math.max(0, H - HC);
    const e = [Math.min(ext, STEP), Math.min(Math.max(ext - STEP, 0), STEP), Math.max(ext - 2 * STEP, 0)];
    let prevTop = OUTER_TOP;
    const tops = [];
    for (let k = 0; k < 3; k++) {
      const top = OUTER_TOP + 0.13 * (k + 1) + e.slice(0, k + 1).reduce((s, v) => s + v, 0);
      // section k spans from inside the previous tube to its own top
      const bot = prevTop - 0.32;
      secs[k].scale.y = top - bot; secs[k].position.y = (top + bot) / 2;
      tops.push(top); prevTop = top;
    }
    collars[0].position.y = OUTER_TOP - 0.05;
    collars[1].position.y = tops[0] - 0.05;
    collars[2].position.y = tops[1] - 0.05;
    head.position.y = tops[2];
    for (let i = 0; i < 6; i++) petals[i].rotation.z = petal[i];
    const li = lum <= 0 ? 0 : 0.35 + 9.5 * Math.pow(lum, 0.85);
    for (const m of petalLed) { m.emissiveIntensity = li; m.emissive.copy(color); }
    btnMat.emissiveIntensity = b * 4;
    for (let i = 0; i < 4; i++) batt[i].emissiveIntensity = Math.min(1, Math.max(0, bt * 4 - i)) * 3;
  }
  // world-space LED centers and normals for light placement
  function petalFrames(out) {
    root.updateMatrixWorld(true);
    for (let i = 0; i < 6; i++) {
      const h = petals[i];
      const p = new THREE.Vector3(PETAL_L * 0.55, -0.06, 0).applyMatrix4(h.matrixWorld);
      const n = tmp.set(0, -1, 0).transformDirection(h.matrixWorld).clone();
      out[i] = { p, n };
    }
    return out;
  }
  return { root, pose, petalFrames, head, petals, port };
}

// ---------- props ----------
const fabric = (c) => std({ color: c, roughness: 0.85 });
const paint = (c) => std({ color: c, roughness: 0.55, metalness: 0.2 });

function person(h = 5.83, color = 0x262b33) {
  const g = new THREE.Group(), m = fabric(color), sk = fabric(0x3a2f29), s = h / 5.83;
  const cap = (r, l) => { const x = new THREE.Mesh(new THREE.CapsuleGeometry(r, l, 4, 10), m); x.castShadow = x.receiveShadow = true; return x; };
  for (const sx of [-0.28, 0.28]) { const l = cap(0.19, 2.35); l.position.set(sx, 1.38, 0); g.add(l); }
  const torso = cap(0.42, 1.25); torso.position.y = 3.65; torso.scale.z = 0.62; g.add(torso);
  for (const sx of [-1, 1]) { const a = cap(0.13, 1.9); a.position.set(sx * 0.64, 3.55, 0); a.rotation.z = sx * 0.09; g.add(a); }
  const neck = cap(0.12, 0.2); neck.position.y = 4.75; g.add(neck);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.36, 16, 12), sk); head.position.y = 5.32; head.scale.set(0.9, 1.08, 0.95); head.castShadow = true; g.add(head);
  const hat = new THREE.Mesh(new THREE.SphereGeometry(0.38, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), fabric(0x1a1d22)); hat.position.y = 5.42; hat.castShadow = true; g.add(hat);
  g.scale.setScalar(s);
  return g;
}

function tent() {
  const g = new THREE.Group();
  const geo = new THREE.SphereGeometry(1, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2);
  const t = new THREE.Mesh(geo, std({ color: 0xa36a2c, roughness: 0.8, flatShading: true }));
  t.scale.set(4.2, 3.9, 3.6); t.castShadow = t.receiveShadow = true; g.add(t);
  const fly = new THREE.Mesh(geo, std({ color: 0x5b3a1c, roughness: 0.85, flatShading: true }));
  fly.scale.set(4.3, 1.1, 3.7); fly.position.y = 0.02; fly.receiveShadow = true; g.add(fly);
  const door = new THREE.Mesh(new THREE.CircleGeometry(1.25, 3), fabric(0x1a120b));
  door.position.set(0, 1.3, 3.45); door.rotation.z = Math.PI / 2; door.rotation.x = -0.32; door.scale.y = 1.2; g.add(door);
  const pole = std({ color: 0x9aa0a6, metalness: 0.8, roughness: 0.35 });
  for (const a of [Math.PI / 4, -Math.PI / 4]) {
    const pts = [];
    for (let i = 0; i <= 24; i++) { const u = i / 24 * Math.PI; pts.push(new THREE.Vector3(4.25 * Math.cos(u) * Math.cos(a), 3.95 * Math.sin(u), 3.65 * Math.cos(u) * Math.sin(a))); }
    g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.03, 6), pole));
  }
  return g;
}

function chair(color) {
  const g = new THREE.Group(), f = fabric(color), fr = paint(0x1c1d20);
  const seat = box(1.7, 0.08, 1.5, f); seat.position.y = 1.5; g.add(seat);
  const back = box(1.7, 1.7, 0.08, f); back.position.set(0, 2.4, -0.78); back.rotation.x = -0.18; g.add(back);
  for (const sx of [-0.8, 0.8]) {
    g.add(rod(new THREE.Vector3(sx, 0, 0.75), new THREE.Vector3(sx, 1.5, -0.7), 0.03, fr));
    g.add(rod(new THREE.Vector3(sx, 0, -0.75), new THREE.Vector3(sx, 1.5, 0.7), 0.03, fr));
    const arm = box(0.12, 0.06, 1.4, f); arm.position.set(sx * 1.06, 2.1, 0); g.add(arm);
  }
  return g;
}

function picnicTable() {
  const g = new THREE.Group(), w = std({ color: 0x5f4632, roughness: 0.82 });
  for (let i = 0; i < 5; i++) { const p = box(6.5, 0.14, 0.48, w); p.position.set(0, 2.5, -1 + i * 0.5); g.add(p); }
  for (const z of [-1.9, 1.9]) { const b = box(6.5, 0.14, 0.85, w); b.position.set(0, 1.5, z); g.add(b); }
  for (const x of [-2.5, 2.5]) for (const s of [-1, 1]) {
    g.add(rod(new THREE.Vector3(x, 0, s * 2.4), new THREE.Vector3(x, 2.45, s * 0.3), 0.1, w));
  }
  const lantern = cyl(0.25, 0.3, 0.8, std({ color: 0x222222, metalness: 0.5, roughness: 0.4 })); lantern.position.set(1.4, 2.97, 0); g.add(lantern);
  const mug = cyl(0.13, 0.12, 0.3, paint(0x8a3c22)); mug.position.set(-1.2, 2.72, 0.3); g.add(mug);
  return g;
}

function cooler() {
  const g = new THREE.Group();
  const b = box(2.4, 1.3, 1.4, paint(0x8f8a7c)); b.position.y = 0.65; g.add(b);
  const l = box(2.5, 0.22, 1.5, paint(0x2f5f72)); l.position.y = 1.4; g.add(l);
  return g;
}

function fireRing() {
  const g = new THREE.Group(), r = rng(31), m = std({ color: 0x4a4744, roughness: 0.95, flatShading: true });
  for (let i = 0; i < 11; i++) {
    const a = i / 11 * Math.PI * 2, s = 0.3 + r() * 0.15;
    const st = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), m);
    st.position.set(Math.cos(a) * 1.4, s * 0.6, Math.sin(a) * 1.4); st.rotation.set(r() * 3, r() * 3, r() * 3);
    st.castShadow = st.receiveShadow = true; g.add(st);
  }
  const log = std({ color: 0x3a2a1e, roughness: 0.9 });
  for (let i = 0; i < 3; i++) { const l = cyl(0.14, 0.14, 2.2, log, 8); l.rotation.z = Math.PI / 2 - 0.3; l.rotation.y = i * 2.1; l.position.y = 0.35; g.add(l); }
  return g;
}

export function truck() {
  const g = new THREE.Group(), p = paint(0x434c56), dark = std({ color: 0x0c0d0f, roughness: 0.3, metalness: 0.6 });
  const glass = std({ color: 0x07090c, roughness: 0.08, metalness: 0.9 });
  const tire = std({ color: 0x111112, roughness: 0.9 });
  // z+ is the rear of the truck
  const chassis = box(5.8, 0.6, 18, dark); chassis.position.y = 1.5; g.add(chassis);
  const front = box(6.4, 2.3, 5.6, p); front.position.set(0, 2.95, -6.2); g.add(front);
  const cabLow = box(6.4, 2.3, 6.4, p); cabLow.position.set(0, 2.95, -0.2); g.add(cabLow);
  const cabUp = box(6.0, 2.2, 5.6, p); cabUp.position.set(0, 5.2, -0.4); g.add(cabUp);
  const roof = box(6.0, 0.15, 5.2, p); roof.position.set(0, 6.35, -0.3); g.add(roof);
  const ws = box(5.6, 1.9, 0.08, glass); ws.position.set(0, 5.15, -3.22); ws.rotation.x = 0.35; g.add(ws);
  for (const s of [-1, 1]) { const w = box(0.06, 1.5, 4.6, glass); w.position.set(s * 3.02, 5.25, -0.4); g.add(w); }
  const bedF = box(6.4, 0.2, 6.6, p); bedF.position.set(0, 2.2, 6.2); g.add(bedF);
  for (const s of [-1, 1]) { const w = box(0.22, 1.9, 6.6, p); w.position.set(s * 3.09, 3.05, 6.2); g.add(w); }
  const bedFront = box(6.4, 1.9, 0.22, p); bedFront.position.set(0, 3.05, 3.0); g.add(bedFront);
  const gate = box(6.0, 0.18, 1.85, p); gate.position.set(0, 2.15, 10.4); g.add(gate);
  for (const [x, z] of [[-3.0, -5.8], [3.0, -5.8], [-3.0, 6.0], [3.0, 6.0]]) {
    const w = cyl(1.45, 1.45, 0.95, tire, 24); w.rotation.z = Math.PI / 2; w.position.set(x, 1.45, z); g.add(w);
    const hub = cyl(0.6, 0.6, 0.97, std({ color: 0x55595f, metalness: 0.9, roughness: 0.3 }), 16); hub.rotation.z = Math.PI / 2; hub.position.set(x, 1.45, z); g.add(hub);
  }
  const tl = std({ color: 0x3a0806, roughness: 0.4 });
  for (const s of [-1, 1]) { const l = box(0.25, 0.9, 0.1, tl); l.position.set(s * 3.1, 3.3, 9.52); g.add(l); }
  const hl = std({ color: 0x2a2a2a, roughness: 0.3 });
  for (const s of [-1, 1]) { const l = box(1.0, 0.4, 0.1, hl); l.position.set(s * 2.4, 3.4, -9.02); g.add(l); }
  const grille = box(3.2, 1.0, 0.08, dark); grille.position.set(0, 3.1, -9.02); g.add(grille);
  // gear in the bed
  const crate = box(2.2, 1.4, 1.6, paint(0x26292d)); crate.position.set(-1.5, 3.0, 5.0); g.add(crate);
  const bag = new THREE.Mesh(new THREE.CapsuleGeometry(0.6, 1.6, 4, 10), fabric(0x6b4a2a)); bag.rotation.z = Math.PI / 2; bag.position.set(1.4, 2.9, 7.0); bag.castShadow = true; g.add(bag);
  const cool = cooler(); cool.scale.setScalar(0.8); cool.position.set(1.2, 2.3, 10.4); cool.traverse(o => o.material && (o.material = paint(0x5d6a70))); g.add(cool);
  return g;
}

function yeti() {
  const g = new THREE.Group();
  const b = box(1.27, 0.86, 0.85, paint(0x24262a)); b.position.y = 0.43; g.add(b);
  for (const s of [-1, 1]) { const side = box(0.04, 0.8, 0.8, paint(0x5b6068)); side.position.set(s * 0.645, 0.43, 0); g.add(side); }
  for (const s of [-1, 1]) {
    const h = rod(new THREE.Vector3(s * 0.45, 0.86, -0.3), new THREE.Vector3(s * 0.45, 0.86, 0.3), 0.04, paint(0x3a3d42)); h.position.y = 1.0; g.add(h);
    for (const z of [-0.3, 0.3]) { const post = cyl(0.035, 0.035, 0.15, paint(0x3a3d42), 8); post.position.set(s * 0.45, 0.93, z); g.add(post); }
  }
  const dispMat = std({ color: 0x050607, emissive: 0xcfe6ff, emissiveIntensity: 0 });
  const disp = box(0.34, 0.2, 0.01, dispMat); disp.position.set(-0.25, 0.6, 0.43); g.add(disp);
  const portsM = std({ color: 0x050505 });
  for (let i = 0; i < 4; i++) { const p = box(0.07, 0.05, 0.01, portsM); p.position.set(0.12 + i * 0.11, 0.35, 0.43); g.add(p); }
  g.userData.disp = dispMat;
  return g;
}

function hardCase() {
  const g = new THREE.Group(), m = paint(0x17181b);
  const b = box(4.0, 0.62, 0.78, m); b.position.y = 0.31; g.add(b);
  const lid = box(4.04, 0.08, 0.82, paint(0x202227)); lid.position.y = 0.66; g.add(lid);
  for (const x of [-1.4, 0, 1.4]) { const l = box(0.22, 0.2, 0.06, paint(0x5b5f66)); l.position.set(x, 0.5, 0.41); g.add(l); }
  const h = box(0.9, 0.08, 0.1, paint(0x2b2d31)); h.position.set(0, 0.5, 0.46); g.add(h);
  return g;
}

function sawhorse() {
  const g = new THREE.Group(), w = std({ color: 0x9a7a52, roughness: 0.8 });
  const top = box(3.2, 0.3, 0.3, w); top.position.y = 2.6; g.add(top);
  for (const x of [-1.3, 1.3]) for (const z of [-1, 1]) g.add(rod(new THREE.Vector3(x, 2.5, 0), new THREE.Vector3(x * 1.15, 0, z * 0.9), 0.09, w));
  return g;
}

function cone() {
  const g = new THREE.Group();
  const c = new THREE.Mesh(new THREE.ConeGeometry(0.42, 2.3, 20), std({ color: 0xd2541a, roughness: 0.6 })); c.position.y = 1.2; c.castShadow = true; g.add(c);
  const band = cyl(0.24, 0.3, 0.32, std({ color: 0xe8e8e2, roughness: 0.4 }), 20); band.position.y = 1.45; g.add(band);
  const base = box(1.1, 0.12, 1.1, std({ color: 0x222222, roughness: 0.8 })); base.position.y = 0.06; g.add(base);
  return g;
}

function wallFrame(len = 12) {
  const g = new THREE.Group(), w = std({ color: 0xb08e60, roughness: 0.8 });
  const n = Math.round(len / 1.333);
  for (let i = 0; i <= n; i++) { const s = box(0.125, 8, 0.29, w); s.position.set(-len / 2 + i * (len / n), 4.1, 0); g.add(s); }
  for (const y of [0.06, 8.16, 8.29]) { const p = box(len + 0.2, 0.125, 0.29, w); p.position.y = y; g.add(p); }
  const hdr = box(3.5, 0.9, 0.29, w); hdr.position.set(1.33, 6.6, 0); g.add(hdr);
  return g;
}

function ladder() {
  const g = new THREE.Group(), m = std({ color: 0xa9adb3, metalness: 0.8, roughness: 0.35 });
  for (const x of [-0.75, 0.75]) { const r = box(0.12, 11, 0.25, m); r.position.set(x, 5.5, 0); g.add(r); }
  for (let i = 0; i < 11; i++) { const r = cyl(0.05, 0.05, 1.5, m, 8); r.rotation.z = Math.PI / 2; r.position.y = 0.6 + i; g.add(r); }
  return g;
}

function lumber() {
  const g = new THREE.Group(), w = std({ color: 0xb79566, roughness: 0.85 });
  for (let r = 0; r < 4; r++) for (let i = 0; i < 6 - r; i++) {
    const b = box(10, 0.3, 0.6, w); b.position.set(0, 0.35 + r * 0.32, -1.6 + i * 0.64 + r * 0.32); g.add(b);
  }
  for (const x of [-4, 0, 4]) { const s = box(0.4, 0.2, 4.2, std({ color: 0x5a4a38 })); s.position.set(x, 0.1, 0); g.add(s); }
  return g;
}

function house() {
  const g = new THREE.Group(), siding = std({ color: 0x4d5257, roughness: 0.75 });
  const wall = box(34, 11, 0.6, siding); wall.position.y = 5.5; g.add(wall);
  for (let i = 0; i < 16; i++) { const l = box(34.02, 0.06, 0.62, std({ color: 0x3f4448 })); l.position.y = 0.7 * i + 0.4; g.add(l); }
  const eave = box(35, 0.5, 2.4, std({ color: 0x2a2d31, roughness: 0.7 })); eave.position.set(0, 11.2, 0.9); g.add(eave);
  const winM = std({ color: 0x120c06, emissive: 0xffb36b, emissiveIntensity: 0.9 });
  for (const x of [-9, 9]) {
    const fr = box(4.4, 4.4, 0.3, std({ color: 0xd6d3cb })); fr.position.set(x, 6, 0.35); g.add(fr);
    const w = box(3.9, 3.9, 0.32, winM); w.position.set(x, 6, 0.37); g.add(w);
    const mull = box(0.12, 3.9, 0.36, std({ color: 0xd6d3cb })); mull.position.set(x, 6, 0.38); g.add(mull);
  }
  const door = box(3.4, 7.2, 0.4, std({ color: 0x2b3640, roughness: 0.6 })); door.position.set(0, 3.6, 0.35); g.add(door);
  const deck = box(26, 0.6, 9, std({ color: 0x6a4e37, roughness: 0.8 })); deck.position.set(0, 0.3, 4.8); g.add(deck);
  for (let i = 0; i < 20; i++) { const s = box(26, 0.02, 0.04, std({ color: 0x4a3626 })); s.position.set(0, 0.61, 0.6 + i * 0.44); g.add(s); }
  return g;
}

function fence(len) {
  const g = new THREE.Group(), w = std({ color: 0x6b5641, roughness: 0.85 });
  const n = Math.floor(len / 0.5);
  for (let i = 0; i < n; i++) { const p = box(0.45, 6, 0.08, w); p.position.set(-len / 2 + i * 0.5 + 0.25, 3, 0); g.add(p); }
  for (const y of [1, 5]) { const r = box(len, 0.3, 0.12, w); r.position.set(0, y, -0.1); g.add(r); }
  return g;
}

function grill() {
  const g = new THREE.Group(), m = std({ color: 0x141414, metalness: 0.4, roughness: 0.35 });
  const bowl = new THREE.Mesh(new THREE.SphereGeometry(1.1, 24, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), m); bowl.position.y = 2.6; bowl.castShadow = true; g.add(bowl);
  const lid = new THREE.Mesh(new THREE.SphereGeometry(1.1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), m); lid.position.y = 2.62; lid.castShadow = true; g.add(lid);
  for (let i = 0; i < 3; i++) { const a = i * 2.094; g.add(rod(new THREE.Vector3(Math.cos(a) * 0.6, 2.0, Math.sin(a) * 0.6), new THREE.Vector3(Math.cos(a) * 0.9, 0, Math.sin(a) * 0.9), 0.05, m)); }
  return g;
}

function patioSet() {
  const g = new THREE.Group(), m = std({ color: 0x2b2e33, metalness: 0.5, roughness: 0.4 });
  const top = cyl(2.2, 2.2, 0.1, std({ color: 0x8a8c88, roughness: 0.3, metalness: 0.2 }), 32); top.position.y = 2.4; g.add(top);
  const leg = cyl(0.12, 0.25, 2.4, m); leg.position.y = 1.2; g.add(leg);
  for (let i = 0; i < 4; i++) {
    const c = chair([0x2e4a5c, 0x2e4a5c, 0x7a2f22, 0x2e4a5c][i]); const a = i * Math.PI / 2 + 0.4;
    c.position.set(Math.cos(a) * 3.3, 0, Math.sin(a) * 3.3); c.rotation.y = -a - Math.PI / 2; c.scale.setScalar(0.9); g.add(c);
  }
  return g;
}

export function buildSets() {
  const camp = new THREE.Group(), job = new THREE.Group(), yard = new THREE.Group();
  const T = tent(); T.position.set(-9, 0, -5); T.rotation.y = 0.85; camp.add(T);
  const c1 = chair(0x7a2f22); c1.position.set(4.6, 0, 4.4); c1.rotation.y = Math.PI + 0.75; camp.add(c1);
  const c2 = chair(0x2e4a5c); c2.position.set(6.4, 0, 1.4); c2.rotation.y = Math.PI + 1.25; camp.add(c2);
  const tbl = picnicTable(); tbl.position.set(-5, 0, 5.5); tbl.rotation.y = -0.5; camp.add(tbl);
  const cool = cooler(); cool.position.set(6.6, 0, 4.4); cool.rotation.y = 0.6; camp.add(cool);
  const fr = fireRing(); fr.position.set(1.5, 0, -6.5); camp.add(fr);

  const truckG = truck(); truckG.position.set(13.3, 0, -12.1); truckG.rotation.y = -0.84;

  const sh1 = sawhorse(); sh1.position.set(-4.5, 0, 3); sh1.rotation.y = 0.5; job.add(sh1);
  const sh2 = sawhorse(); sh2.position.set(-1.8, 0, 6.6); sh2.rotation.y = 0.5; job.add(sh2);
  const plank = box(1.2, 0.18, 8, std({ color: 0xc4a274, roughness: 0.8 })); plank.position.set(-3.15, 2.84, 4.8); plank.rotation.y = 0.64; job.add(plank);
  const saw = box(0.9, 0.5, 1.3, paint(0x2a5b9a)); saw.position.set(-3.2, 3.18, 4.7); saw.rotation.y = 0.5; job.add(saw);
  const wf = wallFrame(14); wf.position.set(-7.5, 0, -7); wf.rotation.y = 0.7; job.add(wf);
  const wf2 = wallFrame(10); wf2.position.set(5.5, 0, -10); wf2.rotation.y = -0.35; job.add(wf2);
  const lad = ladder(); lad.position.set(-3.6, 0, -9.6); lad.rotation.set(-0.28, 0.7, 0); job.add(lad);
  const lb = lumber(); lb.position.set(7, 0, 5); lb.rotation.y = -0.8; job.add(lb);
  [[3.5, 7.5], [-8, 1.5], [9, -2], [0.5, 9.5]].forEach(([x, z]) => { const c = cone(); c.position.set(x, 0, z); job.add(c); });
  const tb = box(2, 1, 1, paint(0xb5261e)); tb.position.set(2.8, 0.5, 3.4); tb.rotation.y = 0.3; job.add(tb);

  const hs = house(); hs.position.set(0, 0, -16); yard.add(hs);
  const f1 = fence(32); f1.position.set(-16, 0, 0); f1.rotation.y = Math.PI / 2; yard.add(f1);
  const f2 = fence(32); f2.position.set(16, 0, 0); f2.rotation.y = -Math.PI / 2; yard.add(f2);
  const ps = patioSet(); ps.position.set(-6.5, 0, -3.5); yard.add(ps);
  const gr = grill(); gr.position.set(7, 0, -8); yard.add(gr);
  const c3 = chair(0x7a2f22); c3.position.set(5, 0, 4); c3.rotation.y = Math.PI + 0.9; yard.add(c3);

  const yt = yeti(); yt.position.set(1.75, 0, -0.25); yt.rotation.y = -0.35;
  const hc = hardCase(); hc.position.set(3.0, 0, 1.6); hc.rotation.y = -0.4;
  const p1 = person(5.83); const p2 = person(5.6, 0x2e2a26);
  return { camp, job, yard, truck: truckG, yeti: yt, hardCase: hc, p1, p2 };
}
