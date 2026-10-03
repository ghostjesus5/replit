// Procedural Skylight, Yeti and hard case. Units are feet, built to the spec sheet:
// mast 4 to 12 ft, 6 petals x 28 LEDs (168), 47.6 in collapsed, tripod with lime feet and brace collars.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { cl, lerp, kelvin } from './util.js';

export const D = { R: [.056, .048, .041, .035], BASE0: .72, J0: 3.75, COLLAR: 2.55, LEG: 3.55, PL: 1.0, PW: .19, PT: .06, PIV: .2, BRACE: 1.25, JOINT: 1.55 };
const UP = new THREE.Vector3(0, 1, 0);
const tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3();

export function materials() {
  return {
    plastic: new THREE.MeshPhysicalMaterial({ color: 0x101113, roughness: .46, clearcoat: .4, clearcoatRoughness: .35, envMapIntensity: 1.2 }),
    alu: new THREE.MeshStandardMaterial({ color: 0x18191c, roughness: .28, metalness: .85, envMapIntensity: 1.6 }),
    lime: new THREE.MeshStandardMaterial({ color: 0xb9cd2b, roughness: .42, envMapIntensity: .6 }),
    rubber: new THREE.MeshStandardMaterial({ color: 0x0a0a0b, roughness: .8 }),
    silver: new THREE.MeshStandardMaterial({ color: 0xaeb2b8, roughness: .42, metalness: .55, envMapIntensity: 1.6 }),
  };
}

const cyl = (r, seg = 20) => new THREE.CylinderGeometry(r, r, 1, seg);
const rbox = (w, h, d, r) => new RoundedBoxGeometry(w, h, d, 3, r);
// Stretch a unit-height Y cylinder between two points.
function span(m, a, b) {
  const d = tmpA.subVectors(b, a), len = d.length();
  m.position.copy(a).addScaledVector(d, .5);
  m.quaternion.setFromUnitVectors(UP, d.divideScalar(len || 1));
  m.scale.set(1, len, 1);
}
function shadows(o, cast = true, recv = true) { o.traverse(m => { if (m.isMesh) { m.castShadow = cast; m.receiveShadow = recv; } }); }

// Printed branding on the base tube, as on the real mast: the mark, GOALZERO reading downward, then SKYLIGHT.
function brandTexture() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 2048;
  const x = c.getContext('2d');
  x.fillStyle = '#16171a'; x.fillRect(0, 0, 256, 2048);
  const len = D.J0 - D.BASE0, py = ft => (D.J0 - ft) / len * 2048;
  x.save(); x.translate(128, py(3.66)); x.rotate(Math.PI / 2); x.fillStyle = '#e8e9ea'; x.textBaseline = 'middle';
  // mark: rounded square with a slash
  x.lineWidth = 4; x.strokeStyle = '#e8e9ea'; x.beginPath(); x.roundRect(0, -19, 38, 38, 10); x.stroke();
  x.beginPath(); x.moveTo(8, 17); x.lineTo(30, -17); x.stroke();
  x.fillRect(50, -20, 3, 40);
  x.font = '300 42px "Barlow"'; x.fillText('GOAL', 64, 2);
  const w = x.measureText('GOAL').width;
  x.font = '700 42px "Barlow"'; x.fillText('ZERO', 64 + w, 2);
  x.restore();
  x.save(); x.translate(128, py(3.08)); x.rotate(Math.PI / 2); x.fillStyle = '#e8e9ea'; x.textBaseline = 'middle';
  x.font = '600 30px "Barlow"'; x.letterSpacing = '4px'; x.fillText('SKYLIGHT', 0, 2); x.restore();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

export function beamMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color() }, uOpacity: { value: 0 }, uLen: { value: 14 }, uApex: { value: new THREE.Vector3() } },
    vertexShader: `varying vec3 vN; varying vec3 vW;
      void main(){ vN=normalize(normalMatrix*normal); vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `uniform vec3 uColor; uniform float uOpacity,uLen; uniform vec3 uApex; varying vec3 vN; varying vec3 vW;
      void main(){ float d=clamp(distance(vW,uApex)/uLen,0.,1.); float a=pow(1.-d,2.2)*smoothstep(0.,.06,d);
        a*=pow(abs(vN.z),2.5); gl_FragColor=vec4(uColor*a*uOpacity,1.); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  });
}

function clamp(r, M, leverMat) {
  const g = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(r + .017, r + .017, .11, 28), M.plastic); g.add(ring);
  const lever = new THREE.Mesh(rbox(.042, .16, .058, .014), leverMat); lever.position.set(r + .036, -.01, 0); lever.rotation.z = .08; g.add(lever);
  const screw = new THREE.Mesh(new THREE.CylinderGeometry(.012, .012, .02, 10), M.alu); screw.rotation.z = Math.PI / 2; screw.position.set(-(r + .02), 0, 0); g.add(screw);
  return g;
}

function handlePlate(M) {
  const s = new THREE.Shape(); const w = .2, h = 1.1, r = .04;
  s.moveTo(-w / 2 + r, 0); s.lineTo(w / 2 - r, 0); s.quadraticCurveTo(w / 2, 0, w / 2, r); s.lineTo(w / 2, h - r); s.quadraticCurveTo(w / 2, h, w / 2 - r, h);
  s.lineTo(-w / 2 + r, h); s.quadraticCurveTo(-w / 2, h, -w / 2, h - r); s.lineTo(-w / 2, r); s.quadraticCurveTo(-w / 2, 0, -w / 2 + r, 0);
  const hole = new THREE.Path(); const hw = .07, hh = .78, hy = .16;
  hole.moveTo(-hw / 2, hy + hw / 2); hole.lineTo(-hw / 2, hy + hh - hw / 2); hole.absarc(0, hy + hh - hw / 2, hw / 2, Math.PI, 0, true);
  hole.lineTo(hw / 2, hy + hw / 2); hole.absarc(0, hy + hw / 2, hw / 2, 0, Math.PI, true);
  s.holes.push(hole);
  const geo = new THREE.ExtrudeGeometry(s, { depth: .035, bevelEnabled: true, bevelSize: .008, bevelThickness: .008, bevelSegments: 2 });
  geo.translate(0, 0, -.0175);
  return new THREE.Mesh(geo, M.plastic);
}

export function makeSkylight(M) {
  const root = new THREE.Group();
  const refs = {};
  const warm = new THREE.Color();

  // ---------- tripod ----------
  const tripod = new THREE.Group(); root.add(tripod);
  const collar = new THREE.Mesh(rbox(.26, .22, .26, .04), M.plastic); collar.position.y = D.COLLAR; tripod.add(collar);
  const plate = handlePlate(M); plate.position.set(.0, 1.33, -.12); tripod.add(plate); refs.plate = plate;
  const braceHub = new THREE.Mesh(new THREE.CylinderGeometry(.085, .085, .1, 20), M.plastic); tripod.add(braceHub);
  const legs = [];
  for (let i = 0; i < 3; i++) {
    const az = i * Math.PI * 2 / 3 + Math.PI / 2;
    const g = new THREE.Group(); g.position.y = D.COLLAR; g.rotation.y = -az; tripod.add(g);
    const pivot = new THREE.Group(); g.add(pivot);
    const upper = new THREE.Mesh(cyl(.046), M.alu); pivot.add(upper);
    const lower = new THREE.Mesh(cyl(.036), M.alu); pivot.add(lower);
    const lclamp = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, .09, 18), M.plastic); pivot.add(lclamp);
    const llever = new THREE.Mesh(rbox(.035, .11, .05, .012), M.plastic); lclamp.add(llever); llever.position.set(.065, 0, 0);
    const joint = new THREE.Mesh(new THREE.CylinderGeometry(.063, .063, .1, 18), M.lime); pivot.add(joint);
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(.034, .055, .2, 16), M.lime); pivot.add(foot);
    const stake = new THREE.Mesh(new THREE.ConeGeometry(.02, .16, 10), M.alu); stake.rotation.x = Math.PI; pivot.add(stake);
    const brace = new THREE.Mesh(cyl(.02, 10), M.alu); tripod.add(brace);
    legs.push({ g, pivot, upper, lower, lclamp, joint, foot, stake, brace });
  }
  refs.foot = legs[0].foot;

  // ---------- mast ----------
  const mast = new THREE.Group(); root.add(mast);
  const baseMat = new THREE.MeshStandardMaterial({ map: brandTexture(), roughness: .32, metalness: .7 });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(D.R[0], D.R[0], D.J0 - D.BASE0, 32), baseMat);
  base.position.y = (D.J0 + D.BASE0) / 2; base.rotation.y = Math.PI; mast.add(base);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(D.R[0] + .006, D.R[0] + .006, .06, 24), M.plastic); cap.position.y = D.BASE0; mast.add(cap);
  const secs = [1, 2, 3].map(k => { const m = new THREE.Mesh(cyl(D.R[k], 28), M.alu); mast.add(m); return m; });
  const clamps = [0, 1, 2].map(k => { const c = clamp(D.R[k], M, k === 2 ? M.lime : M.plastic); c.rotation.y = .5 + k * .9; mast.add(c); return c; });
  refs.clamp = clamps[1]; refs.clamp0 = clamps[0]; refs.clamp2 = clamps[2];

  // ---------- head ----------
  const head = new THREE.Group(); root.add(head);
  const mount = new THREE.Mesh(new THREE.CylinderGeometry(.06, .072, .26, 24), M.plastic); mount.position.y = -.25; head.add(mount);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(.205, .2, .11, 48), M.plastic); hub.position.y = -.075; head.add(hub);
  const top = new THREE.Mesh(new THREE.CylinderGeometry(.165, .2, .03, 48), M.plastic); top.position.y = -.005; head.add(top);
  for (let i = 0; i < 3; i++) {
    const lobe = new THREE.Mesh(rbox(.2, .07, .14, .03), M.plastic); const a = i * Math.PI * 2 / 3 + Math.PI / 6;
    lobe.position.set(Math.cos(a) * .1, .022, Math.sin(a) * .1); lobe.rotation.y = -a; head.add(lobe);
  }
  refs.hub = top;
  const petals = [];
  const ledGeo = new THREE.CylinderGeometry(.0105, .0105, .007, 10);
  for (let i = 0; i < 6; i++) {
    const az = i * Math.PI / 3;
    const hinge = new THREE.Mesh(rbox(.09, .085, .13, .02), M.plastic); hinge.position.set(Math.cos(az) * .2, -.07, Math.sin(az) * .2); hinge.rotation.y = -az; head.add(hinge);
    const pg = new THREE.Group(); pg.position.set(Math.cos(az) * D.PIV, -.07, Math.sin(az) * D.PIV); pg.rotation.order = 'YZX'; pg.rotation.y = -az; head.add(pg);
    const housing = new THREE.Mesh(rbox(D.PL, D.PT, D.PW, .024), M.plastic); housing.position.x = D.PL / 2 + .03; pg.add(housing);
    const logo = new THREE.Mesh(new THREE.TorusGeometry(.032, .0055, 6, 4), M.plastic); logo.rotation.x = Math.PI / 2; logo.rotation.z = Math.PI / 4;
    logo.position.set(D.PL * .5, D.PT / 2 + .002, 0); pg.add(logo);
    const lensMat = new THREE.MeshStandardMaterial({ color: 0x15161a, roughness: .12, metalness: 0, emissive: 0xffffff, emissiveIntensity: 0 });
    const lens = new THREE.Mesh(new THREE.BoxGeometry(D.PL - .07, .014, D.PW - .045), lensMat); lens.position.set(D.PL / 2 + .03, -D.PT / 2 - .002, 0); pg.add(lens);
    const ledMat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: true });
    const leds = new THREE.InstancedMesh(ledGeo, ledMat, 28);
    const m4 = new THREE.Matrix4();
    for (let j = 0; j < 28; j++) {
      const col = j % 14, row = j < 14 ? -1 : 1;
      m4.makeTranslation(.08 + col * (D.PL - .14) / 13 + .03, -D.PT / 2 - .011, row * .034);
      leds.setMatrixAt(j, m4); leds.setColorAt(j, new THREE.Color(1, 1, 1));
    }
    pg.add(leds);
    const spot = new THREE.SpotLight(0xffffff, 0, 220, 1.05, 1, 1.4); spot.position.set(D.PL * .55, -.06, 0); spot.target.position.set(D.PL * .55, -1, 0);
    pg.add(spot, spot.target);
    const bm = beamMaterial();
    const beam = new THREE.Mesh(new THREE.ConeGeometry(Math.tan(.78) * 14, 14, 40, 1, true), bm);
    beam.position.set(D.PL * .55, -7.02, 0); beam.renderOrder = 10; pg.add(beam);
    const tip = new THREE.Object3D(); tip.position.set(D.PL + .02, 0, 0); pg.add(tip);
    const lensC = new THREE.Object3D(); lensC.position.set(D.PL * .5, -D.PT / 2 - .01, 0); pg.add(lensC);
    petals.push({ pg, housing, lens, lensMat, leds, ledMat, spot, beam, bm, tip, lensC });
  }
  shadows(root);
  // The key light sits on the mast axis, so the mast and head must not occlude it. Six real emitters ring the
  // mast and it throws no single shadow, so this matches what you would see. The tripod still casts.
  mast.traverse(m => { if (m.isMesh) m.castShadow = false; });
  head.traverse(m => { if (m.isMesh) m.castShadow = false; });
  petals.forEach(p => { p.beam.receiveShadow = false; });
  refs.petals = petals;

  // Shadow-casting key light under the hub; the six petal lights shape the spread.
  const key = new THREE.SpotLight(0xffffff, 0, 260, 1.2, .9, 1.4);
  key.position.set(0, -.16, 0); key.target.position.set(0, -10, 0); head.add(key, key.target);
  key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.camera.near = .3; key.shadow.camera.far = 90;
  key.shadow.bias = -.0004; key.shadow.normalBias = .03; key.shadow.radius = 3;

  const col = new THREE.Color();
  function set(s) {
    // telescoping: the three sections extend in order, each up to 8/3 ft
    const X = cl(s.height - 4, 0, 8), j = [D.J0];
    for (let k = 0; k < 3; k++) j.push(j[k] + cl(X - k * 8 / 3, 0, 8 / 3));
    secs.forEach((m, k) => { const a = j[k] - .32, b = j[k + 1]; m.scale.y = b - a; m.position.y = (a + b) / 2; });
    clamps.forEach((c, k) => { c.position.y = j[k] - .03; });
    head.position.y = j[3] + .25;

    // tripod spread and leg length (legs fold flat for the case)
    const phi = lerp(.035, Math.acos(D.COLLAR / D.LEG), s.legs), L = s.legLen ?? D.LEG;
    let jointY = 0;
    legs.forEach(l => {
      l.pivot.rotation.z = phi;
      const u = L * .6;
      l.upper.scale.y = u; l.upper.position.y = -u / 2;
      l.lower.scale.y = L - u + .1; l.lower.position.y = -u - (L - u) / 2 + .05;
      l.lclamp.position.y = -u + .02;
      l.joint.position.y = -Math.min(D.JOINT, L * .45);
      l.foot.position.y = -L + .07; l.stake.position.y = -L - .07;
    });
    root.updateMatrixWorld(true);
    legs.forEach(l => {
      l.joint.getWorldPosition(tmpB); root.worldToLocal(tmpB);
      const r = Math.hypot(tmpB.x, tmpB.z); jointY = tmpB.y;
      const hy = tmpB.y - Math.sqrt(Math.max(.01, D.BRACE * D.BRACE - r * r));
      braceHub.position.y = hy;
      tmpA.set(0, hy, 0); span(l.brace, tmpA, tmpB);
    });

    // petals
    petals.forEach((p, i) => { p.pg.rotation.z = s.pitch[i]; });

    // light: power is lumens / 6000, kelvin sets the white point
    const [r, g, b] = kelvin(s.kelvin); warm.setRGB(r, g, b, THREE.SRGBColorSpace);
    const pw = s.power, flat = petals.reduce((a, p, i) => a + Math.max(0, Math.cos(s.pitch[i])), 0) / 6;
    key.color.copy(warm); key.intensity = 190 * pw * flat * s.keyK;
    petals.forEach((p, i) => {
      const lit = s.led ? s.led[i] : 28, on = cl(lit / 28);
      p.spot.color.copy(warm); p.spot.intensity = 38 * pw * on * s.petalK;
      p.lensMat.emissive.copy(warm); p.lensMat.emissiveIntensity = (pw > 0 ? .25 + 1.1 * Math.pow(pw, .6) : 0) * on;
      p.ledMat.color.copy(warm).multiplyScalar(pw > 0 ? 2.2 + 7 * Math.pow(pw, .7) : 0);
      for (let k = 0; k < 28; k++) {
        // LEDs ignite in a sweep from the hub out to the tip
        const c = k % 14, order = c * 2 + (k < 14 ? 0 : 1), v = cl(lit - order);
        p.leds.setColorAt(k, col.setScalar(v));
      }
      p.leds.instanceColor.needsUpdate = true;
      p.bm.uniforms.uColor.value.copy(warm); p.bm.uniforms.uOpacity.value = .012 * Math.pow(pw, .8) * on * s.beam;
      p.beam.visible = p.bm.uniforms.uOpacity.value > .0005;
    });
    root.updateMatrixWorld(true);
    petals.forEach(p => p.pg.localToWorld(p.bm.uniforms.uApex.value.set(D.PL * .55, -.06, 0)));
    return { jointY };
  }

  return { root, set, refs, head, key, petals, legs, warm };
}

// ---------- Yeti power station ----------
function yetiPanel() {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 400; const x = c.getContext('2d');
  const e = document.createElement('canvas'); e.width = 1024; e.height = 400; const y = e.getContext('2d');
  x.fillStyle = '#121316'; x.fillRect(0, 0, 1024, 400); y.fillStyle = '#000'; y.fillRect(0, 0, 1024, 400);
  // port clusters
  const port = (px, py, r, ring) => { x.fillStyle = '#050506'; x.beginPath(); x.arc(px, py, r, 0, 7); x.fill(); x.strokeStyle = ring; x.lineWidth = 3; x.stroke(); };
  port(110, 150, 26, '#2a2c31'); port(110, 250, 22, '#2a2c31'); port(200, 200, 34, '#2a2c31');
  x.strokeStyle = '#b9cd2b'; x.lineWidth = 4; x.strokeRect(60, 95, 210, 220);
  // display
  x.fillStyle = '#071018'; x.fillRect(330, 110, 300, 180); y.fillStyle = '#071018'; y.fillRect(330, 110, 300, 180);
  for (const ctx of [x, y]) {
    ctx.fillStyle = '#cfe6ff'; ctx.font = '700 72px "Barlow"'; ctx.textAlign = 'right'; ctx.fillText('67', 560, 230);
    ctx.font = '600 30px "Barlow"'; ctx.textAlign = 'left'; ctx.fillText('W', 566, 230);
    ctx.font = '600 22px "Barlow"'; ctx.fillText('OUTPUT', 350, 145);
    ctx.strokeStyle = '#cfe6ff'; ctx.lineWidth = 3; ctx.strokeRect(350, 245, 110, 30);
    for (let i = 0; i < 4; i++) ctx.fillRect(356 + i * 26, 251, 20, 18);
  }
  // AC outlets
  for (const ox of [720, 850]) { x.fillStyle = '#1c1d21'; x.beginPath(); x.roundRect(ox, 130, 100, 120, 14); x.fill(); x.fillStyle = '#050506'; x.fillRect(ox + 28, 160, 10, 34); x.fillRect(ox + 62, 160, 10, 34); x.beginPath(); x.arc(ox + 50, 220, 9, 0, 7); x.fill(); }
  x.strokeStyle = '#b9cd2b'; x.strokeRect(700, 110, 270, 160);
  x.fillStyle = '#b9cd2b'; x.font = '800 italic 40px "Barlow Condensed"'; x.fillText('YETI', 760, 360);
  const t = new THREE.CanvasTexture(c), te = new THREE.CanvasTexture(e);
  t.colorSpace = te.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return { t, te };
}

export function makeYeti(M) {
  const g = new THREE.Group();
  const W = 1.27, H = .78, Dp = .85;
  const body = new THREE.Mesh(rbox(W, H - .12, Dp, .05), M.silver); body.position.y = (H - .12) / 2 + .02; g.add(body);
  const bandMat = new THREE.MeshStandardMaterial({ color: 0x1a1b1e, roughness: .6 });
  for (const sy of [.05, H - .16]) { const b = new THREE.Mesh(rbox(W + .01, .07, Dp + .01, .03), bandMat); b.position.y = sy; g.add(b); }
  const lidMat = new THREE.MeshStandardMaterial({ color: 0x141518, roughness: .62 });
  const lid = new THREE.Mesh(rbox(W + .02, .14, Dp + .02, .05), lidMat); lid.position.y = H - .05; g.add(lid);
  const { t, te } = yetiPanel();
  const face = new THREE.Mesh(new THREE.PlaneGeometry(W - .14, .4), new THREE.MeshStandardMaterial({ map: t, emissiveMap: te, emissive: 0xffffff, emissiveIntensity: .9, roughness: .5 }));
  face.position.set(0, .36, Dp / 2 + .006); g.add(face);
  for (const sx of [-1, 1]) {
    const h = new THREE.Mesh(new THREE.TorusGeometry(.17, .034, 10, 20, Math.PI), M.lime);
    h.rotation.y = Math.PI / 2; h.position.set(sx * (W / 2 - .1), H + .02, 0); g.add(h);
  }
  shadows(g);
  const port = new THREE.Object3D(); port.position.set(-W / 2 + .2, .3, Dp / 2 + .02); g.add(port);
  return { root: g, port };
}

// ---------- cable with inline remote, and the power pulse that runs along it ----------
export function makeCable(M, pts) {
  const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', .2);
  const g = new THREE.Group();
  const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 240, .016, 8), M.rubber); tube.castShadow = true; g.add(tube);
  const pulseMat = new THREE.ShaderMaterial({
    uniforms: { uProg: { value: -1 }, uColor: { value: new THREE.Color(0xd8ff7a) }, uI: { value: 0 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `uniform float uProg,uI; uniform vec3 uColor; varying vec2 vUv;
      void main(){ float d=vUv.x-uProg; float a=exp(-d*d*900.)+.35*exp(-max(-d,0.)*12.)*step(d,0.)*step(0.,uProg+.001);
        gl_FragColor=vec4(uColor*a*uI,1.); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const pulse = new THREE.Mesh(new THREE.TubeGeometry(curve, 240, .03, 8), pulseMat); g.add(pulse);
  // remote, two thirds of the way along, with four blue mode LEDs
  const u = .55, p = curve.getPointAt(u), tg = curve.getTangentAt(u);
  const remote = new THREE.Group(); remote.position.copy(p).add(new THREE.Vector3(0, .03, 0));
  remote.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), new THREE.Vector3(tg.x, 0, tg.z).normalize());
  const rb = new THREE.Mesh(rbox(.3, .075, .13, .03), M.plastic); remote.add(rb);
  const btn = new THREE.Mesh(new THREE.CylinderGeometry(.035, .035, .012, 20), M.rubber); btn.position.set(.04, .04, 0); remote.add(btn);
  const blue = new THREE.MeshBasicMaterial({ color: new THREE.Color(.25, .5, 3) });
  const leds = [];
  for (let i = 0; i < 4; i++) { const l = new THREE.Mesh(new THREE.SphereGeometry(.007, 8, 6), blue.clone()); l.position.set(-.09 + i * .024, .04, 0); remote.add(l); leds.push(l); }
  shadows(remote); g.add(remote);
  return { root: g, curve, pulseMat, remote, leds };
}

// ---------- hard carry case ----------
export function makeCase(M) {
  const g = new THREE.Group();
  const L = 4.1, Wd = .56, Hb = .3, t = .03;
  const tray = new THREE.Group(); g.add(tray);
  const parts = [[L, t, Wd, 0, t / 2, 0], [L, Hb, t, 0, Hb / 2, Wd / 2 - t / 2], [L, Hb, t, 0, Hb / 2, -Wd / 2 + t / 2], [t, Hb, Wd, L / 2 - t / 2, Hb / 2, 0], [t, Hb, Wd, -L / 2 + t / 2, Hb / 2, 0]];
  for (const [w, h, d, x, y, z] of parts) { const m = new THREE.Mesh(rbox(w, h, d, .012), M.plastic); m.position.set(x, y, z); tray.add(m); }
  const foam = new THREE.Mesh(new THREE.BoxGeometry(L - .08, .04, Wd - .08), new THREE.MeshStandardMaterial({ color: 0x0b0b0c, roughness: 1 })); foam.position.y = .05; tray.add(foam);
  const hinge = new THREE.Group(); hinge.position.set(0, Hb, -Wd / 2); g.add(hinge);
  const lid = new THREE.Mesh(rbox(L, .26, Wd, .05), M.plastic); lid.position.set(0, .13, Wd / 2); hinge.add(lid);
  const latchMat = M.lime.clone(); latchMat.emissive.set(0xc8e04a); latchMat.emissiveIntensity = 0;
  for (const lx of [-1.3, 0, 1.3]) {
    const latch = new THREE.Mesh(rbox(.16, .12, .03, .01), latchMat); latch.position.set(lx, Hb, Wd / 2 + .012); g.add(latch);
  }
  const handle = new THREE.Mesh(new THREE.TorusGeometry(.18, .028, 10, 20, Math.PI), M.plastic); handle.position.set(0, Hb * .55, Wd / 2 + .03); g.add(handle);
  shadows(g);
  return { root: g, hinge, latchMat };
}
