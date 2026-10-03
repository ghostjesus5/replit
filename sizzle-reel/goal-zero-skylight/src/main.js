import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';
import { DUR, FPS, clamp, lerp, seg, sm, eio, eio2, eo3, eo5, eoBack, D2R, win, kelvin } from './util.js';
import { buildSkylight, buildSets, setProductEnv, HC, HMAX, STEP } from './model.js';
import { buildSky, buildGround, buildGrass, buildTrees, buildRidges, buildBeams, buildDust, buildRain, buildStudio } from './world.js';
import { Overlay } from './overlay.js';
import { buildScore } from './audio.js';

const W = 1920, H_ = 1080, RS = 1600 / 1920, RW = Math.round(W * RS), RH = Math.round(H_ * RS);
const V = (x, y, z) => new THREE.Vector3(x, y, z);

// ---------- renderer ----------
const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(1); renderer.setSize(RW, RH, false);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const FOG_NIGHT = new THREE.Color(0x0c1220), FOG_STUDIO = new THREE.Color(0x030304);
scene.fog = new THREE.Fog(FOG_NIGHT.clone(), 45, 300);
const camera = new THREE.PerspectiveCamera(35, W / H_, 0.1, 2000);

// ---------- world ----------
const skyW = buildSky(); scene.add(skyW.sky, skyW.stars);
const world = new THREE.Group(); scene.add(world);
const ground = buildGround(); world.add(ground);
const sets = buildSets();
const excl = (x, z) => Math.hypot(x + 9, z + 5) < 4.6 || Math.hypot(x - 1.5, z + 6.5) < 2 || (Math.abs(z + 16) < 1.5 && Math.abs(x) < 18) || Math.hypot(x, z) < 0.6;
const grass = buildGrass(excl); world.add(grass.mesh);
const trees = buildTrees(); world.add(trees);
const ridges = buildRidges(); world.add(ridges);
world.add(sets.camp, sets.job, sets.yard, sets.truck, sets.yeti, sets.hardCase, sets.p1, sets.p2);

const sky = buildSkylight(); scene.add(sky.root);
const mirror = buildSkylight(); mirror.root.scale.y = -1; scene.add(mirror.root);
mirror.root.traverse(o => { o.castShadow = false; o.receiveShadow = false; });
const studio = buildStudio(); scene.add(studio.group);

const beams = buildBeams(); beams.forEach(b => scene.add(b.mesh));
const dust = buildDust(); scene.add(dust.pts);
const rain = buildRain(); scene.add(rain.lines);

// cable from the Yeti to the Skylight port
const cablePts = [V(1.4, 0.35, 0.2), V(1.25, 0.06, 0.5), V(0.75, 0.04, 0.78), V(0.22, 0.06, 0.64), V(0.04, 0.5, 0.4), V(0.01, 1.0, 0.34), V(0, 1.22, 0.265)];
const cableGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(cablePts), 80, 0.022, 8);
const cable = new THREE.Mesh(cableGeo, new THREE.MeshStandardMaterial({ color: 0x0d0d0e, roughness: 0.6 }));
cable.castShadow = true; scene.add(cable);
const cableCount = cableGeo.index.count;

// ---------- environment reflections ----------
function buildEnv(warm) {
  const es = new THREE.Scene();
  es.add(new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide,
    vertexShader: 'varying vec3 vP; void main(){ vP=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: `varying vec3 vP; void main(){ float h=normalize(vP).y;
      vec3 c=mix(vec3(0.02,0.022,0.026),vec3(0.07,0.09,0.14),smoothstep(-0.2,0.6,h));
      gl_FragColor=vec4(c,1.); }`,
  })));
  const panel = (w, h, pos, col, k) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(col).multiplyScalar(k), side: THREE.DoubleSide }));
    m.position.copy(pos); m.lookAt(0, 0, 0); es.add(m);
  };
  panel(40, 6, V(0, 30, -30), 0x9fb4e0, 1.2);
  panel(8, 40, V(-35, 5, 10), warm ? 0xffd2a0 : 0x9fb4e0, warm ? 2.2 : 0.8);
  panel(8, 40, V(35, 5, 10), 0xffffff, warm ? 1.6 : 0.5);
  const pm = new THREE.PMREMGenerator(renderer);
  const tex = pm.fromScene(es, 0.03).texture; pm.dispose();
  return tex;
}
const ENV_NIGHT = buildEnv(false), ENV_STUDIO = buildEnv(true);

// ---------- lights ----------
const hemi = new THREE.HemisphereLight(0x2a3a5e, 0x060708, 0.55); scene.add(hemi);
const moon = new THREE.DirectionalLight(0x8aa2d6, 0.5); moon.position.set(-60, 70, -90); scene.add(moon);
const sun = new THREE.DirectionalLight(0xff9a5a, 0); sun.position.set(40, 8, -200); scene.add(sun);
const key = new THREE.SpotLight(0xffc491, 0, 0, 1.25, 0.75, 2);
key.castShadow = true; key.shadow.mapSize.set(1536, 1536); key.shadow.bias = -0.0004; key.shadow.normalBias = 0.03;
key.shadow.camera.near = 0.3; key.shadow.camera.far = 80; key.shadow.radius = 4;
scene.add(key, key.target);
const pspots = Array.from({ length: 3 }, () => { const s = new THREE.SpotLight(0xffc491, 0, 0, 1.05, 0.95, 2); scene.add(s, s.target); return s; });
const rimL = new THREE.SpotLight(0xa9bce6, 0, 0, 0.35, 0.8, 2); rimL.position.set(-14, 16, -18); scene.add(rimL, rimL.target);
const rimR = new THREE.SpotLight(0xffd2a8, 0, 0, 0.35, 0.8, 2); rimR.position.set(16, 12, -14); scene.add(rimR, rimR.target);
rimL.target.position.set(0, 6, 0); rimR.target.position.set(0, 6, 0);

// ---------- post ----------
const rt = new THREE.WebGLRenderTarget(RW, RH, { type: THREE.HalfFloatType });
const composer = new EffectComposer(renderer, rt);
composer.setPixelRatio(1); composer.setSize(RW, RH);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(RW / 2, RH / 2), 0.85, 0.55, 1.6);
composer.addPass(bloom);
const grade = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, uExposure: { value: 1 }, uVig: { value: 1 }, uCA: { value: 1 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uExposure,uVig,uCA; varying vec2 vUv;
    vec3 RRTAndODTFit(vec3 v){ vec3 a=v*(v+0.0245786)-0.000090537; vec3 b=v*(0.983729*v+0.4329510)+0.238081; return a/b; }
    vec3 aces(vec3 c){ const mat3 I=mat3(vec3(0.59719,0.07600,0.02840),vec3(0.35458,0.90834,0.13383),vec3(0.04823,0.01566,0.83777));
      const mat3 O=mat3(vec3(1.60475,-0.10208,-0.00327),vec3(-0.53108,1.10813,-0.07276),vec3(-0.07367,-0.00605,1.07602));
      c*=uExposure/0.6; c=I*c; c=RRTAndODTFit(c); c=O*c; return clamp(c,0.,1.); }
    vec3 srgb(vec3 c){ return mix(c*12.92, 1.055*pow(c,vec3(1./2.4))-0.055, step(0.0031308,c)); }
    void main(){ vec2 c=vUv-.5; float r2=dot(c,c);
      vec3 col=texture2D(tDiffuse,vUv).rgb;
      col=srgb(aces(col));
      float l=dot(col,vec3(.2126,.7152,.0722));
      vec3 sh=col*vec3(0.9,0.97,1.12)+vec3(0.003,0.006,0.014);
      col=mix(col,sh,(1.-smoothstep(0.,.4,l))*.7);
      col*=mix(1.,smoothstep(1.05,0.18,r2*2.3),0.75*uVig);
      gl_FragColor=vec4(col,dot(col,vec3(0.299,0.587,0.114))); }`,
});
composer.addPass(grade);
const fx = { ...FXAAShader, uniforms: { ...THREE.UniformsUtils.clone(FXAAShader.uniforms), uTime: { value: 0 }, uGrain: { value: 0.045 }, uRes: { value: new THREE.Vector2(RW, RH) } } };
fx.fragmentShader = FXAAShader.fragmentShader
  .replace('uniform vec2 resolution;', `uniform vec2 resolution; uniform float uTime,uGrain; uniform vec2 uRes;
    float hash(vec2 p){ vec3 p3=fract(vec3(p.xyx)*.1031); p3+=dot(p3,p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }`)
  .replace(/gl_FragColor = (.*?);\s*}\s*$/s, (m, e) => `vec4 fo = ${e}; float g=(hash(vUv*uRes+fract(uTime*7.31)*917.)+hash(vUv*uRes*1.7+fract(uTime*3.17)*331.))*.5-.5;
    float l=dot(fo.rgb,vec3(.2126,.7152,.0722)); gl_FragColor = vec4(fo.rgb + g*uGrain*(1.-l*.7), 1.); }`);
const fxaa = new ShaderPass(fx); fxaa.material.uniforms.resolution.value.set(1 / RW, 1 / RH); composer.addPass(fxaa);

// ---------- overlay ----------
const ui = new Overlay(document.getElementById('ui'));

// ---------- timeline ----------
const P12 = 12 * D2R, PDOWN = -90 * D2R;
const all = v => [v, v, v, v, v, v];
const LOCKS_UP = [9.0, 10.5, 12.0], LOCKS_DN = [57.9, 58.4, 58.9];
const MODE_T = [32, 33, 34, 35], MODE_L = [400 / 6000, 1350 / 6000, 3500 / 6000, 1];
export const EVENTS = { LOCKS_UP, LOCKS_DN, MODE_T, BLOOM: 13.55, DROP: 16.0, CUTS: [44, 46, 48, 50], PLUG: 42.0, FINAL: 60.0 };

function mastUp(t) {
  let e = 0;
  for (const L of LOCKS_UP) e += eoBack(seg(t, L - 0.52, L), 1.1);
  return HC + STEP * e;
}
function mastDown(t) {
  let e = 3;
  for (const L of LOCKS_DN) e -= eoBack(seg(t, L - 0.42, L), 1.0);
  return HC + STEP * e;
}
function orbitPos(c, r, azDeg, y) { const a = azDeg * D2R; return V(c.x + Math.cos(a) * r, y, c.z + Math.sin(a) * r); }

function baseState() {
  return {
    H: HMAX, petal: all(P12), lum: 1, kelvin: 3250, dusk: 0, btn: 1, batt: 1, exposure: 1, letterbox: 0,
    camp: 1, job: 0, yard: 0, truck: 1, yeti: 0, hardCase: 0, rain: 0, studio: 0, flash: 0, fade: 0, cable: 0, yetiDisp: 0,
    p1: null, p2: null, beam: 1, dust: 1, moon: 1, env: 1, flare: 1, bloom: 0.85,
    pos: V(0, 5, 30), tgt: V(0, 5, 0), fov: 35, up: V(0, 1, 0), shot: '',
  };
}

const SHOTS = [
  { a: 0, b: 8, name: 'dusk', f(t, S) {
    S.H = HC; S.petal = all(PDOWN); S.lum = 0; S.batt = 0;
    S.btn = t < 7.0 ? 0 : (t < 7.12 ? 1 : t < 7.2 ? 0.2 : 1);
    S.dusk = lerp(1, 0.25, sm(seg(t, 0, 8)));
    S.letterbox = 1; S.fade = 1 - sm(seg(t, 0.2, 1.8));
    const k = eo3(eio2(seg(t, 0, 8.0)));
    S.pos = V(5.5, 1.8, 36).lerp(V(1.2, 1.55, 6.4), k);
    S.tgt = V(0, 3.2, -12).lerp(V(0, 2.5, 0), k);
    S.fov = 30; S.moon = 1.6; S.env = 1.4;
    S.p2 = { x: -5.4, z: -2.2, ry: 0.9 };
  } },
  { a: 8, b: 13.5, name: 'rise', f(t, S) {
    S.H = mastUp(t); S.petal = all(PDOWN); S.lum = 0; S.batt = 0;
    S.dusk = lerp(0.25, 0, seg(t, 8, 13.5)); S.letterbox = 1;
    const k = eio(seg(t, 8, 13.5));
    const az = lerp(70, 40, k), r = lerp(3.4, 5.2, k);
    S.pos = orbitPos(V(0, 0, 0), r, az, 0.45 * S.H + 0.2);
    S.tgt = V(0, 0.82 * S.H, 0); S.fov = 40; S.moon = 2.2; S.env = 1.8;
    S.p2 = { x: -5.4, z: -2.2, ry: 0.9 };
  } },
  { a: 13.5, b: 16.2, name: 'bloom', f(t, S) {
    S.H = HMAX; S.batt = 0;
    S.petal = [0, 1, 2, 3, 4, 5].map(i => { const p = seg(t, 13.55 + i * 0.13, 14.5 + i * 0.13); return lerp(PDOWN, P12, eoBack(p, 1.25)); });
    const pre = 0.012 * sm(seg(t, 13.6, 14.7)) + 0.02 * sm(seg(t, 15.0, 15.95));
    S.lum = t < 16 ? pre : 1;
    S.letterbox = 1 - eo3(seg(t, 16.0, 16.6));
    S.exposure = t < 16 ? 1 : 1 + 2.5 * eo3(seg(t, 16.0, 16.12)); S.moon = 1.5; S.env = 1.5;
    S.flash = t < 16 ? 0 : 0.7 * eo3(seg(t, 16.0, 16.2));
    const r = (t - 13.5) * 0.22;
    S.pos = V(0.9, 7.2, 1.5); S.tgt = V(0, 11.9, 0); S.fov = 44; S.up = V(Math.cos(r + 0.4), 0, Math.sin(r + 0.4));
    S.dusk = 0; S.flare = 0.8;
  } },
  { a: 16.2, b: 20, name: 'reveal', f(t, S) {
    const k = eio2(seg(t, 16.2, 20));
    S.pos = orbitPos(V(0, 0, 0), lerp(34, 29, k), lerp(78, 66, k), lerp(9, 13, k));
    S.tgt = V(0, lerp(3.5, 4.2, k), -2); S.fov = 36;
    S.letterbox = 1 - eo3(seg(t, 16.0, 16.6));
    S.exposure = 1 + 1.6 * (1 - eo3(seg(t, 16.2, 17.4)));
    S.flash = 0.85 * (1 - eo3(seg(t, 16.2, 16.6)));
    S.p1 = { x: -3.6, z: 3.2, ry: 2.4 }; S.p2 = { x: -5.4, z: -2.2, ry: 0.9 };
  } },
  { a: 20, b: 24, name: 'head', f(t, S) {
    const w = win(t, 20.3, 23.8, 0.5, 0.6);
    S.petal = [0, 1, 2, 3, 4, 5].map(i => P12 + w * 40 * D2R * Math.sin(2 * Math.PI * (t - 20.3) / 1.9 - i * 1.047));
    S.lum = 0.07; S.exposure = 1.0; S.bloom = 0.55; S.moon = 1.6; S.env = 2;
    const k = eio2(seg(t, 20, 24));
    const az = lerp(20, 70, k) * D2R, r = lerp(5.6, 4.9, k);
    S.pos = V(Math.cos(az) * r, 10.4, Math.sin(az) * r);
    const side = V(-Math.sin(az), 0, Math.cos(az));
    S.tgt = V(0, 11.75, 0).addScaledVector(side, 1.25); S.fov = 36; S.flare = 0.25;
  } },
  { a: 24, b: 28, name: 'aim', f(t, S) {
    const thT = Math.atan2(-12.1, 13.3);
    const focus = [0, 1, 2, 3, 4, 5].map(i => { const d = Math.cos(i * Math.PI / 3 - thT); return P12 + (d > 0 ? 38 * d : 74 * d) * D2R; });
    const kA = eio(seg(t, 24.35, 25.25)), kB = eio(seg(t, 26.35, 27.3));
    S.petal = focus.map((f, i) => lerp(lerp(P12, f, kA), 34 * D2R, kB));
    const k = eio2(seg(t, 24, 28));
    S.pos = orbitPos(V(0, 0, 0), 10, lerp(96, 124, k), lerp(37, 34, k));
    S.tgt = V(0.5, 0, -1.5); S.fov = 44; S.flare = 0;
    S.p1 = { x: 6.8, z: -4.2, ry: -0.8 };
  } },
  { a: 28, b: 32, name: 'height', f(t, S) {
    const down = eio(seg(t, 28.35, 29.3)), up = eio(seg(t, 29.9, 30.95));
    S.H = lerp(lerp(HMAX, 4, down), HMAX, up);
    S.lum = 0.85;
    const k = eio2(seg(t, 28, 32));
    S.pos = V(lerp(0.9, 0.6, k), 6.1, lerp(46, 42, k)); S.tgt = V(1.1, 6.0, 0); S.fov = 20;
    S.p1 = { x: 3.3, z: 0.8, ry: -0.25 };
    S.camp = 1; S.flare = 0.5;
  } },
  { a: 32, b: 36, name: 'modes', f(t, S) {
    let L = MODE_L[0];
    for (let i = 0; i < 4; i++) if (t >= MODE_T[i]) L = MODE_L[i];
    const since = t - MODE_T.filter(m => m <= t).slice(-1)[0];
    S.lum = L * (1 + 0.35 * Math.exp(-since * 14));
    const k = eio2(seg(t, 32, 36));
    S.pos = V(-10.5, 3.2, 12.5).lerp(V(-9.5, 3.4, 11.2), k); S.tgt = V(1.2, 5.8, 0).lerp(V(1.2, 6.0, 0), k); S.fov = 46;
    S.flare = 0.7;
  } },
  { a: 36, b: 40, name: 'color', f(t, S) {
    S.kelvin = lerp(6500, 3250, eio(seg(t, 37.0, 37.9)));
    const k = eio2(seg(t, 36, 40));
    S.pos = V(-17.5, 3.2, 14.5).lerp(V(-15.8, 3.4, 13.0), k); S.tgt = V(-3.5, 3.4, -1.0); S.fov = 32;
    S.p2 = { x: -6.0, z: -0.8, ry: 1.2 };
  } },
  { a: 40, b: 44, name: 'power', f(t, S) {
    S.yeti = 1; S.lum = 0.55; S.batt = eio2(seg(t, 40.15, 41.1)); S.camp = 0; S.truck = 0; S.env = 1.6;
    S.cable = eio(seg(t, 41.25, 41.95)); S.yetiDisp = t >= 42.0 ? 1 : 0;
    const k = eio2(seg(t, 40, 44));
    S.pos = V(-1.1, 1.35, 4.9).lerp(V(-0.7, 1.2, 4.1), k); S.tgt = V(-0.1, 0.95, 0.1); S.fov = 38; S.flare = 0;
  } },
  { a: 44, b: 46, name: 'camp', f(t, S) {
    const k = eio2(seg(t, 44, 46));
    S.pos = V(-16.5, 1.4, 4.2).lerp(V(-15.2, 1.7, 1.6), k); S.tgt = V(-8.6, 2.3, -4.6); S.fov = 34;
    S.p2 = { x: -5.4, z: -2.2, ry: 0.9 };
  } },
  { a: 46, b: 48, name: 'tailgate', f(t, S) {
    const k = eio2(seg(t, 46, 48));
    S.pos = V(-3.4, 3.4, 7.4).lerp(V(-2.2, 3.7, 6.2), k); S.tgt = V(7.2, 3.0, -6.4); S.fov = 32;
    S.p1 = { x: 7.6, z: -3.0, ry: -1.9 };
  } },
  { a: 48, b: 50, name: 'jobsite', f(t, S) {
    S.camp = 0; S.job = 1;
    const k = eio2(seg(t, 48, 50));
    S.pos = orbitPos(V(0, 0, 0), lerp(15.5, 14.5, k), lerp(52, 64, k), 4.6); S.tgt = V(-1.5, 3.6, -2); S.fov = 38;
    S.p1 = { x: -2.6, z: 4.6, ry: 2.2 };
  } },
  { a: 50, b: 52, name: 'backyard', f(t, S) {
    S.camp = 0; S.yard = 1; S.truck = 0;
    const k = eio2(seg(t, 50, 52));
    S.pos = V(7.2, 3.6, 15.2).lerp(V(5.2, 3.8, 15.8), k); S.tgt = V(-1.5, 4.2, -8); S.fov = 38;
    S.p1 = { x: 6.2, z: -5.9, ry: 2.9 }; S.p2 = { x: -4.0, z: -1.6, ry: 2.0 };
  } },
  { a: 52, b: 56, name: 'rain', f(t, S) {
    S.rain = 0.6; S.moon = 0.55; S.exposure = 0.8; S.beam = 1.3; S.lum = 0.75;
    const k = eio2(seg(t, 52, 56));
    S.pos = V(3.7, 1.9, 5.9).lerp(V(3.1, 2.25, 5.0), k); S.tgt = V(-0.3, 9.4, -0.5); S.fov = 44; S.flare = 0.9;
  } },
  { a: 56, b: 60, name: 'pack', f(t, S) {
    S.hardCase = 1;
    const close = [0, 1, 2, 3, 4, 5].map(i => eio(seg(t, 56.55 + i * 0.07, 57.35 + i * 0.07)));
    S.petal = close.map(c => lerp(P12, PDOWN, c));
    S.H = mastDown(t);
    S.lum = t < 56.3 ? 1 : t < 59.1 ? 0.1 : 0; S.bloom = 0.55;
    S.btn = t < 59.1 ? 1 : 0.15;
    S.batt = 1; S.moon = 1.6; S.env = 1.8;
    const k = eio2(seg(t, 56, 60));
    const ty = Math.max(S.H - 2.4, 1.5);
    S.pos = V(-4.5, ty + 1.1, 9.0).lerp(V(-3.9, ty + 0.8, 8.0), k); S.tgt = V(-1.6, ty, 0.6); S.fov = 38; S.camp = 0;
    S.fade = 0.88 * sm(seg(t, 59.0, 59.92));
    S.flare = 0.5;
  } },
  { a: 60, b: DUR + 1, name: 'end', f(t, S) {
    S.studio = 1; S.camp = 0; S.truck = 0;
    const k = eio2(seg(t, 60, 66));
    S.pos = V(4.4, 5.6, 26).lerp(V(4.0, 6.0, 22.0), k); S.tgt = V(4.4, 6.0, 0).lerp(V(4.0, 6.2, 0), k); S.fov = 30;
    S.lum = 0.5; S.exposure = 0.95 + 2.2 * (1 - eo3(seg(t, 60.0, 61.0))); S.bloom = 0.7;
    S.flash = 0.9 * (1 - eo3(seg(t, 60.0, 60.4)));
    S.fade = sm(seg(t, 64.7, 65.9)); S.flare = 0.9; S.moon = 0;
  } },
];

export function stateAt(t) {
  const S = baseState();
  const sh = SHOTS.find(s => t >= s.a && t < s.b) || SHOTS[SHOTS.length - 1];
  S.shot = sh.name; sh.f(t, S); S.t = t;
  return S;
}

// ---------- apply ----------
const tmpC = new THREE.Color();
const frames = [];
function apply(S, t) {
  // camera
  camera.position.copy(S.pos); camera.up.copy(S.up); camera.lookAt(S.tgt);
  camera.fov = S.fov; camera.updateProjectionMatrix();
  renderer.toneMappingExposure = S.exposure;

  // environment
  const st = S.studio;
  world.visible = !st; skyW.stars.visible = !st;
  studio.group.visible = !!st; mirror.root.visible = !!st;
  skyW.uniforms.uStudio.value = st; skyW.uniforms.uDusk.value = S.dusk; skyW.uniforms.uTime.value = t;
  skyW.starU.uTime.value = t; skyW.starU.uA.value = 1 - S.dusk * 0.85;
  scene.fog.color.copy(st ? FOG_STUDIO : FOG_NIGHT);
  sets.camp.visible = !!S.camp; sets.job.visible = !!S.job; sets.yard.visible = !!S.yard;
  sets.truck.visible = !!S.truck; sets.yeti.visible = !!S.yeti; sets.hardCase.visible = !!S.hardCase;
  for (const [k, o] of [['p1', sets.p1], ['p2', sets.p2]]) {
    const p = S[k]; o.visible = !!p && !st;
    if (p) { o.position.set(p.x, 0, p.z); o.rotation.y = p.ry; }
  }
  cable.visible = S.cable > 0.001;
  cableGeo.setDrawRange(0, Math.floor(cableCount * S.cable / 6) * 6);
  sets.yeti.userData.disp.emissiveIntensity = S.yetiDisp * 0.9;
  grass.uT.value = t;

  // product
  const col = tmpC.setRGB(...kelvin(S.kelvin));
  const pose = { H: S.H, petal: S.petal, lum: S.lum, color: col, btn: S.btn, batt: S.batt };
  sky.pose(pose); if (st) mirror.pose(pose);
  sky.petalFrames(frames);

  // light rig
  const I = S.lum <= 0 ? 0 : Math.pow(S.lum, 0.7);
  let down = 0;
  const head = V(0, S.H - 0.2, 0);
  pspots.forEach((s, j) => {
    const a = frames[2 * j], b = frames[2 * j + 1];
    const nAvg = V(0, 0, 0).copy(a.n).add(b.n).normalize();
    s.position.copy(a.p).add(b.p).multiplyScalar(0.5).addScaledVector(nAvg, 0.6);
    s.target.position.copy(nAvg).multiplyScalar(10).add(s.position);
    const open = sm(clamp((-(a.n.y + b.n.y) / 2) / 0.35));
    s.intensity = I * 1000 * open; s.color.copy(col);
  });
  frames.forEach((f, i) => {
    down += Math.max(0, -f.n.y) / 6;
    const b = beams[i];
    b.mesh.position.copy(f.p); b.mesh.quaternion.setFromUnitVectors(V(0, -1, 0), f.n);
    b.u.uI.value = I * 0.05 * S.beam * (st ? 1.6 : 1); b.u.uColor.value.copy(col); b.u.uTime.value = t;
  });
  key.position.set(0, S.H - 1.3, 0); key.target.position.set(0, 0, 0);
  key.intensity = I * 2400 * sm(clamp(down / 0.35)) * (0.4 + 0.6 * down); key.color.copy(col);
  dust.u.uI.value = I * 1.4 * S.dust; dust.u.uHead.value.copy(head); dust.u.uColor.value.copy(col); dust.u.uTime.value = t;
  rain.lines.visible = S.rain > 0; rain.u.uI.value = I * 2.4 * S.rain; rain.u.uHead.value.copy(head); rain.u.uColor.value.copy(col); rain.u.uTime.value = t;

  moon.intensity = 0.85 * S.moon * (st ? 0 : 1);
  hemi.intensity = st ? 0.02 : 0.5 * (0.6 + 0.4 * S.moon);
  setProductEnv(st ? ENV_STUDIO : ENV_NIGHT, st ? 1.0 : 0.6 * S.env);
  sun.intensity = 3.2 * S.dusk;
  rimL.intensity = st ? 900 : 0; rimR.intensity = st ? 650 : 0;

  bloom.strength = S.bloom; fxaa.material.uniforms.uTime.value = t; grade.uniforms.uExposure.value = S.exposure;
}

// projected screen positions for overlay callouts
const pv = new THREE.Vector3();
function project(v) { pv.copy(v).project(camera); return { x: (pv.x + 1) / 2 * W, y: (1 - pv.y) / 2 * H_, z: pv.z }; }

function renderAt(t) {
  t = clamp(t, 0, DUR - 1 / FPS);
  const S = stateAt(t);
  apply(S, t);
  composer.render();
  const headW = V(0, S.H - 0.25, 0);
  const camUp = clamp((headW.y - camera.position.y) / camera.position.distanceTo(headW) * 2.2);
  ui.render(t, S, {
    project, head: project(headW), frames: frames.map(f => project(f.p)),
    hinge: project(sky.petals[3].getWorldPosition(new THREE.Vector3())),
    ground: project(V(-1.7, 0, 0.2)), top: (y) => project(V(-1.7, y, 0.2)),
    flareVis: camUp, personHead: S.p1 ? project(V(S.p1.x, 5.95, S.p1.z)) : null,
  });
}

// ---------- player ----------
const stage = document.getElementById('stage');
const capture = location.hash.includes('capture');
function fit() {
  if (capture) return;
  const s = Math.min(innerWidth / W, innerHeight / H_);
  stage.style.transform = `translate(${(innerWidth - W * s) / 2}px, ${(innerHeight - H_ * s) / 2}px) scale(${s})`;
}
addEventListener('resize', fit); fit();

let playing = false, actx = null, t0 = 0, from = 0, cur = 0, raf = 0;
const btn = document.getElementById('play'), bar = document.getElementById('bar'), fillBar = document.getElementById('fill');
function now() { return playing ? from + (actx.currentTime - t0) : cur; }
function loop() {
  const t = now();
  if (t >= DUR) { stop(); cur = 0; renderAt(DUR - 0.04); return; }
  renderAt(t); fillBar.style.width = (t / DUR * 100) + '%';
  raf = requestAnimationFrame(loop);
}
let liveNodes = null;
async function play() {
  if (!actx) actx = new AudioContext({ sampleRate: 48000 });
  await actx.resume();
  from = cur; t0 = actx.currentTime + 0.05;
  liveNodes = buildScore(actx, actx.destination, t0 - from, from);
  playing = true; document.body.classList.add('playing'); loop();
}
function stop() {
  cur = now(); playing = false; cancelAnimationFrame(raf); document.body.classList.remove('playing');
  if (liveNodes) { liveNodes.stop(); liveNodes = null; }
}
btn?.addEventListener('click', () => (playing ? stop() : play()));
addEventListener('keydown', e => { if (e.code === 'Space') { e.preventDefault(); playing ? stop() : play(); } });
bar?.addEventListener('click', e => {
  const r = bar.getBoundingClientRect(), was = playing;
  if (was) stop();
  cur = clamp((e.clientX - r.left) / r.width) * DUR; renderAt(cur); fillBar.style.width = (cur / DUR * 100) + '%';
  if (was) play();
});

// ---------- capture API ----------
window.__DUR = DUR; window.__FPS = FPS;
window.__dbg = { THREE, renderer, composer, scene, bloom, grade, fxaa, key, pspots, grass, trees, rt, sky, beams, dust, rain, stateAt, apply, camera };
window.__seek = t => { renderAt(t); return true; };
window.__renderAudio = async () => {
  const sr = 48000, c = new OfflineAudioContext(2, Math.ceil(sr * DUR), sr);
  buildScore(c, c.destination, 0, 0);
  const buf = await c.startRendering();
  const L = buf.getChannelData(0), R = buf.getChannelData(1);
  let peak = 0; for (let i = 0; i < L.length; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
  const g = peak > 0 ? 0.93 / peak : 1;
  const n = L.length, out = new DataView(new ArrayBuffer(44 + n * 4));
  const ws = (o, s) => { for (let i = 0; i < s.length; i++) out.setUint8(o + i, s.charCodeAt(i)); };
  ws(0, 'RIFF'); out.setUint32(4, 36 + n * 4, true); ws(8, 'WAVE'); ws(12, 'fmt '); out.setUint32(16, 16, true);
  out.setUint16(20, 1, true); out.setUint16(22, 2, true); out.setUint32(24, sr, true); out.setUint32(28, sr * 4, true);
  out.setUint16(32, 4, true); out.setUint16(34, 16, true); ws(36, 'data'); out.setUint32(40, n * 4, true);
  for (let i = 0; i < n; i++) {
    out.setInt16(44 + i * 4, clamp(L[i] * g, -1, 1) * 32767, true);
    out.setInt16(46 + i * 4, clamp(R[i] * g, -1, 1) * 32767, true);
  }
  const bytes = new Uint8Array(out.buffer); let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return { b64: btoa(bin), peak };
};

document.fonts.ready.then(() => { renderAt(capture ? 0 : 61.6); window.__ready = true; });
