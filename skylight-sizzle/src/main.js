import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { materials, makeSkylight, makeYeti, makeCable, makeCase, D } from './product.js';
import { makeWorld } from './world.js';
import { makeOverlay, W, H } from './overlay.js';
import { SHOTS, DUR, pre, post } from './shots.js';
import { wobble, cl } from './util.js';
import { player } from './player.js';
import { renderAudio } from './audio.js';

const SRC = { beach: '@@IMG:beach-camp.jpg@@', night: '@@IMG:night-petals.jpg@@' };
const CAP = location.hash.startsWith('#capture') || location.hash.startsWith('#export') || location.hash.startsWith('#plates');

// Film grade in display space: gentle S-curve, cool lifted blacks, split tone, radial CA, vignette.
const Grade = {
  uniforms: { tDiffuse: { value: null }, uVig: { value: .5 }, uCA: { value: .0015 }, uSat: { value: 1 }, uLift: { value: 1 }, uCon: { value: .25 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uVig,uCA,uSat,uLift,uCon; varying vec2 vUv;
    void main(){ vec2 d=vUv-.5; float r2=dot(d,d); vec2 o=d*uCA*(.5+r2*4.);
      vec3 c=vec3(texture2D(tDiffuse,vUv+o).r,texture2D(tDiffuse,vUv).g,texture2D(tDiffuse,vUv-o).b);
      c=mix(c,c*c*(3.-2.*c),uCon);
      float l=dot(c,vec3(.2126,.7152,.0722)); c=mix(vec3(l),c,uSat);
      c+=uLift*vec3(.010,.014,.026)*(1.-l)*(1.-l);
      c+=vec3(.012,.006,-.008)*smoothstep(.45,1.,l);
      c*=1.-uVig*smoothstep(.12,.9,r2*1.9);
      gl_FragColor=vec4(c,1.); }`,
};

// Reflection environment for a night exterior: dim sky dome, a cool rim panel and a warm low fill,
// so black plastics and the Yeti's aluminum pick up shape instead of going flat.
function nightEnvironment(renderer) {
  const s = new THREE.Scene(), geo = new THREE.SphereGeometry(10, 32, 16), pos = geo.attributes.position, col = [];
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i) / 10, k = Math.max(0, y);
    col.push(y > 0 ? .03 - .022 * k : .006, y > 0 ? .036 - .026 * k : .006, y > 0 ? .07 - .05 * k : .007);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  s.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
  const panel = (w, h, c, p) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide })); m.position.set(...p); m.lookAt(0, 0, 0); s.add(m); };
  panel(7, 3, new THREE.Color(.35, .42, .7), [-6, 6, -4]);
  panel(4, 1.6, new THREE.Color(.8, .55, .32), [5, 1.5, 6]);
  const pm = new THREE.PMREMGenerator(renderer), tex = pm.fromScene(s, .02).texture; pm.dispose();
  return tex;
}

export function defaults() {
  return {
    three: true, height: 12, legs: 1, legLen: undefined, pitch: [0, 0, 0, 0, 0, 0], power: 1, kelvin: 3250, keyK: 1, petalK: 1, led: null, beam: 1,
    rootPos: [0, 0, 0], rootRot: [0, 0, 0],
    cam: { p: [10, 4, 14], t: [0, 6, 0], fov: 35, roll: 0, shake: .5, near: .1 },
    exposure: 1, bloom: [.6, .4, 1.2], vig: .5, ca: .0007, sat: 1, lift: 1, con: .25,
    milky: 1, skyLift: 1, skyWarm: 0, stars: 1, fog: .0032,
    hemi: .45, moon: .3, pool: .22, poolR: 150, dust: 1, rain: 0, people: false, camp: true,
    yeti: true, pulse: -1, pulseI: 0, remote: 4,
    caseOn: false, caseLid: 0, casePos: [0, 0, 0], caseRot: 0, latch: 0, studio: 0, studioPos: [4, 9, 6], studioTgt: [0, 0, 0], flare: 0, lbox: 0,
    grain: .07, grass: true,
  };
}

async function boot() {
  const fams = [['Barlow Condensed', [500, 700, 800]], ['Barlow', [300, 400, 500, 600, 700]], ['IBM Plex Mono', [500, 600]]];
  await Promise.all(fams.flatMap(([f, ws]) => ws.map(w => document.fonts.load(`${w} 40px "${f}"`))));
  const IMG = {};
  await Promise.all(Object.entries(SRC).map(async ([k, s]) => { const im = new Image(); im.src = s; await im.decode(); IMG[k] = im; }));

  const cv = document.getElementById('cv');
  const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(1); renderer.setSize(W, H, false);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x05070d, .0032);
  scene.environment = nightEnvironment(renderer);
  const camera = new THREE.PerspectiveCamera(35, W / H, .03, 6000);

  const world = makeWorld(scene);
  const M = materials();
  const sky = makeSkylight(M); scene.add(sky.root);
  const yeti = makeYeti(M); yeti.root.position.set(2.9, 0, 1.75); yeti.root.rotation.y = -.55; scene.add(yeti.root);
  scene.updateMatrixWorld(true);
  const port = yeti.port.getWorldPosition(new THREE.Vector3()), nrm = new THREE.Vector3(0, 0, 1).applyQuaternion(yeti.root.quaternion);
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const cable = makeCable(M, [V(0, D.BASE0 - .03, 0), V(.05, .42, .12), V(.3, .03, .45), V(.85, .03, 1.0), V(1.45, .03, 1.62),
    port.clone().addScaledVector(nrm, .5).setY(.03), port.clone().addScaledVector(nrm, .16).setY(.2), port]);
  scene.add(cable.root);
  const box = makeCase(M); scene.add(box.root);
  const studio = new THREE.SpotLight(0xfff1e0, 0, 60, .55, .8, 1.2); studio.position.set(4, 9, 6); scene.add(studio, studio.target);

  const rt = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
  const composer = new EffectComposer(renderer, rt);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(W, H), .85, .5, .9); composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const grade = new ShaderPass(Grade); composer.addPass(grade);

  // Stable names for the Cycles export: every node and material gets one.
  const ledMerged = sky.petals.map((p, k) => {
    const m4 = new THREE.Matrix4(), geos = [];
    for (let j = 0; j < 28; j++) { p.leds.getMatrixAt(j, m4); geos.push(p.leds.geometry.clone().applyMatrix4(m4)); }
    const mesh = new THREE.Mesh(mergeGeometries(geos), p.ledMat); mesh.visible = false; p.pg.add(mesh);
    return mesh;
  });
  Object.entries(M).forEach(([k, m]) => { m.name = k; });
  sky.root.name = 'skylight'; sky.head.name = 'head';
  sky.petals.forEach((p, k) => {
    p.pg.name = `petal${k}_pivot`; p.housing.name = `petal${k}_housing`; p.lens.name = `petal${k}_lens`; p.leds.name = `petal${k}_ledsinst`;
    ledMerged[k].name = `petal${k}_leds`; p.beam.name = `petal${k}_beam`; p.lensMat.name = `lens${k}`; p.ledMat.name = `led${k}`;
  });
  cable.pulseMat.name = 'pulse'; box.latchMat.name = 'latch';
  const nameAll = (root, pre) => {
    let i = 0;
    root.traverse(o => {
      if (!o.name) o.name = `${pre}_${i++}`;
      const mats = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
      for (const m of mats) if (!m.name) m.name = `${pre}_${m.type.replace('Material', '').toLowerCase()}_${m.color ? m.color.getHexString() : 'x'}`;
    });
  };
  [[sky.root, 'sky'], [yeti.root, 'yeti'], [cable.root, 'cable'], [box.root, 'case'], [world.camp, 'camp'], [world.people, 'people']].forEach(([r, n]) => nameAll(r, n));

  const O = makeOverlay(cv, camera);
  const ctx = { sky, yeti, cable, box, world, camera, D, IMG, THREE, studio };
  const tv = new THREE.Vector3(), up = new THREE.Vector3();
  let scale = 1;
  function setScale(s) {
    if (s === scale) return; scale = s;
    renderer.setSize(Math.round(W * s), Math.round(H * s), false); composer.setSize(Math.round(W * s), Math.round(H * s));
  }

  function apply(S, t) {
    sky.root.position.fromArray(S.rootPos); sky.root.rotation.set(...S.rootRot);
    sky.set(S);
    yeti.root.visible = cable.root.visible = S.yeti;
    cable.pulseMat.uniforms.uProg.value = S.pulse; cable.pulseMat.uniforms.uI.value = S.pulseI;
    cable.leds.forEach((l, i) => { l.visible = i < S.remote; });
    studio.intensity = S.studio; studio.position.fromArray(S.studioPos); studio.target.position.fromArray(S.studioTgt); studio.target.updateMatrixWorld();
    box.latchMat.emissiveIntensity = S.latch;
    box.root.visible = S.caseOn; box.root.position.fromArray(S.casePos); box.root.rotation.y = S.caseRot; box.hinge.rotation.x = -S.caseLid * 1.95;
    const headY = sky.head.getWorldPosition(tv).y;
    world.skyMat.uniforms.uMilky.value = S.milky; world.skyMat.uniforms.uLift.value = S.skyLift; world.skyMat.uniforms.uWarm.value = S.skyWarm;
    world.starMat.uniforms.uTime.value = t; world.starMat.uniforms.uA.value = S.stars; world.starMat.uniforms.uPx.value = scale;
    const dm = world.dustMat.uniforms; dm.uTime.value = t; dm.uH.value = headY; dm.uPow.value = S.power * S.dust; dm.uColor.value.copy(sky.warm); dm.uPx.value = scale;
    const rm = world.rainMat.uniforms; rm.uTime.value = t; rm.uH.value = headY; rm.uPow.value = S.power; rm.uColor.value.copy(sky.warm); rm.uA.value = S.rain;
    world.rain.visible = S.rain > 0;
    world.grassU.value = t;
    world.people.visible = S.people; world.camp.visible = S.camp; world.grass.visible = S.grass;
    world.pool.scale.set(S.poolR * 2, S.poolR * 2, 1); world.pool.position.x = S.rootPos[0]; world.pool.position.z = S.rootPos[2];
    world.poolMat.opacity = S.pool * Math.pow(S.power, .7); world.poolMat.color.copy(sky.warm).multiplyScalar(.5);
    world.hemi.intensity = S.hemi; world.moon.intensity = S.moon;
    scene.fog.density = S.fog;
    renderer.toneMappingExposure = S.exposure;
    [bloom.strength, bloom.radius, bloom.threshold] = S.bloom;
    const gu = grade.uniforms; gu.uVig.value = S.vig; gu.uCA.value = S.ca; gu.uSat.value = S.sat; gu.uLift.value = S.lift; gu.uCon.value = S.con;
    // camera with a little handheld drift
    const c = S.cam, k = c.shake;
    camera.position.set(c.p[0] + wobble(t * .7, 1) * .05 * k, c.p[1] + wobble(t * .6, 2) * .04 * k, c.p[2] + wobble(t * .8, 3) * .05 * k);
    tv.set(c.t[0] + wobble(t * .9, 4) * .04 * k, c.t[1] + wobble(t * .75, 5) * .035 * k, c.t[2] + wobble(t * .85, 6) * .04 * k);
    camera.up.set(0, 1, 0);
    if (c.up) camera.up.fromArray(c.up);
    camera.lookAt(tv);
    if (c.roll) camera.rotateZ(c.roll);
    camera.fov = c.fov; camera.near = c.near ?? .1;
    if (c.shift) camera.setViewOffset(W, H, -c.shift[0] * W, -c.shift[1] * H, W, H); else camera.clearViewOffset();
    camera.updateProjectionMatrix(); camera.updateMatrixWorld(true);
  }

  const g = O.g;
  function frame(t) {
    t = cl(t, 0, DUR - 1e-4);
    const sh = SHOTS.find(s => t >= s.a && t < s.b) || SHOTS[SHOTS.length - 1];
    const S = defaults();
    sh.scene(t, S, ctx);
    apply(S, t);
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    if (S.three) { composer.render(); g.drawImage(renderer.domElement, 0, 0, W, H); }
    else { g.fillStyle = '#000'; g.fillRect(0, 0, W, H); }
    pre(t, O, S, ctx);
    sh.ui && sh.ui(t, O, S, ctx);
    post(t, O, S, ctx);
    O.grain(t, S.grain, CAP);
  }

  // ---- Cycles pipeline: scene export, per-frame state export, and plate compositing ----
  const stateOf = t => {
    t = cl(t, 0, DUR - 1e-4);
    const sh = SHOTS.find(s => t >= s.a && t < s.b) || SHOTS[SHOTS.length - 1], S = defaults();
    sh.scene(t, S, ctx); apply(S, t); box.root.updateMatrixWorld(true); sky.root.updateMatrixWorld(true);
    return { sh, S };
  };
  window.__exportGLB = async () => {
    stateOf(13);
    const hidden = [];
    const hide = o => { if (o.visible) { o.visible = false; hidden.push(o); } };
    sky.petals.forEach((p, k) => { hide(p.leds); hide(p.beam); ledMerged[k].visible = true; });
    cable.root.traverse(o => { if (o.material === cable.pulseMat) hide(o); });
    const shown = [box.root, world.people, world.camp, yeti.root, cable.root].filter(o => !o.visible); shown.forEach(o => (o.visible = true));
    cable.leds.forEach(l => (l.visible = true));
    const glb = await new GLTFExporter().parseAsync([sky.root, yeti.root, cable.root, box.root, world.camp, world.people], { binary: true, onlyVisible: true });
    hidden.forEach(o => (o.visible = true)); ledMerged.forEach(m => (m.visible = false)); shown.forEach(o => (o.visible = false));
    const u8 = new Uint8Array(glb); let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
    return btoa(s);
  };
  const tracked = [];
  [sky.root, box.root].forEach(r => r.traverse(o => { if ((o.isMesh && !o.isInstancedMesh && !/_beam$/.test(o.name)) || /_pivot$/.test(o.name)) tracked.push(o); }));
  const r5 = v => Math.round(v * 1e5) / 1e5;
  window.__exportFrames = (fps = 24, f0 = 0, f1 = Math.round(DUR * fps)) => {
    const frames = [];
    for (let f = f0; f < f1; f++) {
      const t = f / fps, { sh, S } = stateOf(t);
      const m = {};
      for (const o of tracked) m[o.name] = o.matrixWorld.elements.map(r5);
      const c = S.cam;
      frames.push({
        f, t: r5(t), shot: SHOTS.indexOf(sh), m,
        cam: { m: camera.matrixWorld.elements.map(r5), fov: c.fov, shift: c.shift || [0, 0], near: c.near ?? .1, target: tv.toArray().map(r5) },
        S: Object.fromEntries(Object.entries(S).filter(([k]) => k !== 'cam' && k !== 'bloom')),
        headY: r5(sky.head.getWorldPosition(new THREE.Vector3()).y),
      });
    }
    return JSON.stringify({ fps, names: tracked.map(o => o.name), frames });
  };
  // Composite the 2D layer over a path-traced plate for time t.
  const plates = {};
  window.__composite = async (t, url, flare = .35) => {
    const { sh, S } = stateOf(t);
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    if (S.three && url) {
      const im = plates[url] || (plates[url] = new Image()); if (!im.src) im.src = url; await im.decode(); delete plates[url];
      g.drawImage(im, 0, 0, W, H);
    } else { g.fillStyle = '#000'; g.fillRect(0, 0, W, H); }
    S.flare *= flare;
    pre(t, O, S, ctx);
    sh.ui && sh.ui(t, O, S, ctx);
    post(t, O, S, ctx);
    O.grain(t, S.grain * .8, false);
    return cv.toDataURL('image/jpeg', .95);
  };

  window.__DUR = DUR;
  window.__renderAudio = () => renderAudio(DUR);
  window.__frame = t => { frame(t); return cv.toDataURL('image/jpeg', .94); };
  window.__seek = t => frame(t);
  window.__shots = SHOTS.map(s => ({ a: s.a, b: s.b, n: s.n }));
  if (CAP) document.documentElement.classList.add('cap');
  else player({ frame, setScale, SHOTS, DUR });
  frame(CAP ? 0 : 11.2);
  window.__ready = true;
}
boot();
