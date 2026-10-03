// Night environment: sky, stars, terrain, grass, trees, ridges, light beams, dust, rain, studio floor.
import * as THREE from 'three';
import { rng, fbm, vnoise, clamp, sm } from './util.js';

const NOISE_GLSL = `
float h31(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
float vn3(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
 return mix(mix(mix(h31(i),h31(i+vec3(1,0,0)),f.x),mix(h31(i+vec3(0,1,0)),h31(i+vec3(1,1,0)),f.x),f.y),
            mix(mix(h31(i+vec3(0,0,1)),h31(i+vec3(1,0,1)),f.x),mix(h31(i+vec3(0,1,1)),h31(i+vec3(1,1,1)),f.x),f.y),f.z);}
`;

export function buildSky() {
  const uniforms = {
    uDusk: { value: 1 }, uStudio: { value: 0 }, uTime: { value: 0 }, uMilky: { value: 1 },
    uZenith: { value: new THREE.Color(0x03060d) }, uHorizon: { value: new THREE.Color(0x15203a) },
    uGlow: { value: new THREE.Color(0xff7a3a) }, uSunDir: { value: new THREE.Vector3(0.25, 0, -1).normalize() },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms, side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: `varying vec3 vDir; void main(){ vDir = position; vec4 p = projectionMatrix*modelViewMatrix*vec4(position,1.); gl_Position = p.xyww; }`,
    fragmentShader: NOISE_GLSL + `
      varying vec3 vDir; uniform float uDusk,uStudio,uTime,uMilky; uniform vec3 uZenith,uHorizon,uGlow,uSunDir;
      void main(){
        vec3 d = normalize(vDir); float h = d.y;
        vec3 hor = mix(uHorizon, vec3(0.24,0.16,0.16), uDusk*0.55);
        vec3 col = mix(hor, uZenith, pow(clamp(h,0.,1.), 0.42));
        col = mix(col, hor*0.5, smoothstep(0.0, -0.1, h));
        vec2 dh = normalize(d.xz+1e-5); float sd = max(dot(dh, normalize(uSunDir.xz)), 0.);
        float band = exp(-max(h,0.)*7.0)*(0.25+0.75*pow(sd,4.)) * smoothstep(-0.05,0.0,h);
        col += uGlow*band*uDusk*1.1 + vec3(1.,0.85,0.6)*exp(-max(h,0.)*30.)*pow(sd,16.)*uDusk*0.9;
        vec3 N = normalize(vec3(0.55,0.62,-0.56));
        float m = exp(-pow(dot(d,N),2.)*22.) * (vn3(d*7.)*0.65+vn3(d*19.)*0.35);
        col += vec3(0.33,0.36,0.46)*m*m*0.16*uMilky*(1.-uDusk)*smoothstep(0.02,0.3,h);
        vec3 studio = vec3(0.0035,0.0035,0.0042) + vec3(0.016,0.012,0.009)*smoothstep(-0.05,0.25,h)*(1.-smoothstep(0.25,0.9,h));
        col = mix(col, studio, uStudio);
        gl_FragColor = vec4(col,1.);
      }`,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(900, 48, 24), mat);
  sky.frustumCulled = false; sky.renderOrder = -10;

  // stars
  const r = rng(7), N = 2600, pos = new Float32Array(N * 3), sz = new Float32Array(N), ph = new Float32Array(N), tint = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const u = r(), v = r() * 0.92 + 0.04;
    const th = u * Math.PI * 2, y = v, rr = Math.sqrt(1 - y * y);
    pos.set([Math.cos(th) * rr * 850, y * 850, Math.sin(th) * rr * 850], i * 3);
    sz[i] = Math.pow(r(), 6) * 3.2 + 0.9; ph[i] = r() * 50; tint[i] = r();
  }
  const sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  sg.setAttribute('aSize', new THREE.BufferAttribute(sz, 1));
  sg.setAttribute('aPh', new THREE.BufferAttribute(ph, 1));
  sg.setAttribute('aTint', new THREE.BufferAttribute(tint, 1));
  const starU = { uTime: { value: 0 }, uA: { value: 1 } };
  const stars = new THREE.Points(sg, new THREE.ShaderMaterial({
    uniforms: starU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
    vertexShader: `attribute float aSize,aPh,aTint; varying float vA; varying vec3 vC; uniform float uTime,uA;
      void main(){ vec4 mv = modelViewMatrix*vec4(position,1.); gl_Position = projectionMatrix*mv; gl_Position.z = gl_Position.w*0.9999;
        float tw = 0.7+0.3*sin(uTime*2.3+aPh)*sin(uTime*1.3+aPh*1.7);
        float hz = smoothstep(0.03, 0.25, normalize(position).y);
        vA = tw*uA*hz*min(1.,aSize*0.55); vC = mix(vec3(0.75,0.85,1.),vec3(1.,0.9,0.75),aTint);
        gl_PointSize = aSize*1.6; }`,
    fragmentShader: `varying float vA; varying vec3 vC; void main(){ vec2 c=gl_PointCoord-.5; float d=length(c); float a=smoothstep(.5,.0,d); gl_FragColor=vec4(vC*a*vA*1.6,1.); }`,
  }));
  stars.frustumCulled = false; stars.renderOrder = -9;
  return { sky, stars, uniforms, starU };
}

function groundTexture() {
  const S = 512, c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d'), img = g.createImageData(S, S), r = rng(3);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    // tileable by sampling noise on a torus-ish wrap
    const n = fbm(x / 32, y / 32, 4) * 0.6 + vnoise(x / 4, y / 4) * 0.25 + r() * 0.15;
    const v = 120 + n * 110, i = (y * S + x) * 4;
    img.data[i] = v; img.data[i + 1] = v * 0.97; img.data[i + 2] = v * 0.9; img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.MirroredRepeatWrapping; t.repeat.set(90, 90); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 2;
  return t;
}

export function groundHeight(x, z) {
  const r = Math.hypot(x, z);
  const far = sm(clamp((r - 45) / 90));
  return (fbm(x / 70 + 10, z / 70 + 3, 4) - 0.42) * 26 * far + (vnoise(x / 5, z / 5) - 0.5) * 0.12;
}

export function buildGround() {
  const geo = new THREE.PlaneGeometry(800, 800, 220, 220); geo.rotateX(-Math.PI / 2);
  const p = geo.attributes.position, col = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i);
    p.setY(i, groundHeight(x, z));
    const n = fbm(x / 18, z / 18, 3), m = fbm(x / 4 + 50, z / 4, 2);
    const a = new THREE.Color(0x2c3022), b = new THREE.Color(0x3d3a2c), c = new THREE.Color(0x232a1f);
    const cc = a.clone().lerp(b, n).lerp(c, m * 0.5);
    col.set([cc.r, cc.g, cc.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.computeVertexNormals();
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true, map: groundTexture() });
  const ground = new THREE.Mesh(geo, mat); ground.receiveShadow = true;
  return ground;
}

export function buildGrass(exclude) {
  const blade = new THREE.BufferGeometry();
  const v = [], idx = [];
  const levels = [[0, 0.02], [0.35, 0.017], [0.7, 0.01], [1, 0]];
  levels.forEach(([h, w], i) => { const bend = h * h * 0.18; v.push(-w, h, bend, w, h, bend); });
  for (let i = 0; i < 3; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  blade.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); blade.setIndex(idx); blade.computeVertexNormals();
  const uT = { value: 0 };
  const mat = new THREE.MeshLambertMaterial({ color: 0xffffff, side: THREE.DoubleSide });
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = uT;
    sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>',
      `#include <begin_vertex>
       float sw = sin(uTime*1.6 + instanceMatrix[3].x*0.35 + instanceMatrix[3].z*0.22)*0.5 + sin(uTime*2.7 + instanceMatrix[3].z*0.6)*0.25;
       transformed.x += sw*0.12*position.y*position.y; transformed.z += sw*0.05*position.y;`);
    sh.vertexShader = sh.vertexShader.replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\n objectNormal = vec3(0.,1.,0.);');
  };
  const r = rng(11), clumps = 1500, per = 8, N = clumps * per;
  const mesh = new THREE.InstancedMesh(blade, mat, N);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), pp = new THREE.Vector3(), e = new THREE.Euler(), c = new THREE.Color();
  let k = 0;
  for (let i = 0; i < clumps; i++) {
    let x, z, tries = 0;
    do { const rad = 1.0 + Math.pow(r(), 0.75) * 60, a = r() * Math.PI * 2; x = Math.cos(a) * rad; z = Math.sin(a) * rad; tries++; }
    while (exclude(x, z) && tries < 20);
    for (let j = 0; j < per; j++) {
      const bx = x + (r() - 0.5) * 0.5, bz = z + (r() - 0.5) * 0.5;
      pp.set(bx, groundHeight(bx, bz) - 0.02, bz);
      e.set((r() - 0.5) * 0.5, r() * Math.PI * 2, (r() - 0.5) * 0.5); q.setFromEuler(e);
      const h = 0.14 + Math.pow(r(), 1.6) * 0.42; s.set(1 + r() * 0.8, h, 1);
      m4.compose(pp, q, s); mesh.setMatrixAt(k, m4);
      c.setHSL(0.17 + r() * 0.06, 0.22 + r() * 0.18, 0.07 + r() * 0.07); mesh.setColorAt(k, c);
      k++;
    }
  }
  mesh.castShadow = false; mesh.receiveShadow = true;
  return { mesh, uT };
}

export function buildTrees() {
  const r = rng(21), trees = [];
  const corridor = (x, z) => {
    // keep the opening dolly path clear: segment from (24,80) to (0,0) in xz
    const ax = 24, az = 80, t = clamp((x * ax + z * az) / (ax * ax + az * az));
    return Math.hypot(x - ax * t, z - az * t) < 12 && z > 0;
  };
  while (trees.length < 120) {
    const rad = 30 + Math.pow(r(), 0.8) * 110, a = r() * Math.PI * 2, x = Math.cos(a) * rad, z = Math.sin(a) * rad;
    if (corridor(x, z)) continue;
    const az = Math.atan2(x, -z); // 0 = toward the dusk horizon (-z)
    if (Math.abs(az) < 0.62 && rad < 120) continue;
    trees.push({ x, z, h: 16 + r() * 30, w: 0.28 + r() * 0.1, rot: r() * 6 });
  }
  const tiers = 4;
  const fol = new THREE.InstancedMesh(new THREE.ConeGeometry(1, 1, 7), new THREE.MeshLambertMaterial({ color: 0x1a261e, flatShading: true }), trees.length * tiers);
  const trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.25, 0.4, 1, 6), new THREE.MeshLambertMaterial({ color: 0x241b14 }), trees.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
  trees.forEach((t, i) => {
    const gy = groundHeight(t.x, t.z);
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), t.rot);
    m4.compose(p.set(t.x, gy + t.h * 0.1, t.z), q, s.set(1.2, t.h * 0.2, 1.2)); trunk.setMatrixAt(i, m4);
    for (let k = 0; k < tiers; k++) {
      const f = k / tiers, ch = t.h * (0.42 - f * 0.05), cw = t.h * t.w * (1 - f * 0.55);
      m4.compose(p.set(t.x, gy + t.h * 0.18 + f * t.h * 0.62 + ch / 2, t.z), q, s.set(cw, ch, cw)); fol.setMatrixAt(i * tiers + k, m4);
    }
  });
  fol.castShadow = trunk.castShadow = false; fol.receiveShadow = true;
  const g = new THREE.Group(); g.add(fol, trunk);
  return g;
}

export function buildRidges() {
  const g = new THREE.Group();
  const layers = [[330, 0x0b1019, 40, 1], [450, 0x0d1320, 70, 2], [600, 0x111a2a, 95, 3]];
  for (const [R, color, amp, seed] of layers) {
    const n = 220, pos = [], idx = [];
    for (let i = 0; i <= n; i++) {
      const a = i / n * Math.PI * 2, x = Math.cos(a) * R, z = Math.sin(a) * R;
      const az = Math.abs(Math.atan2(x, -z) - 0.245), valley = 0.25 + 0.75 * sm(clamp((az - 0.15) / 0.6));
      const h = (8 + amp * Math.pow(fbm(Math.cos(a) * 2.2 + seed * 9, Math.sin(a) * 2.2 + seed * 4, 5), 1.6) * 1.7) * valley;
      pos.push(x, -20, z, x, h, z);
      if (i < n) { const b = i * 2; idx.push(b, b + 1, b + 2, b + 1, b + 3, b + 2); }
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx);
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, fog: false, side: THREE.DoubleSide }));
    m.userData.base = new THREE.Color(color); g.add(m);
  }
  return g;
}

// soft volumetric cone per petal
export function buildBeams(n = 6, len = 15, half = 0.95) {
  const geo = new THREE.ConeGeometry(Math.tan(half) * len, len, 48, 12, true); geo.translate(0, -len / 2, 0);
  const beams = [];
  for (let i = 0; i < n; i++) {
    const u = { uI: { value: 0 }, uColor: { value: new THREE.Color(1, 0.8, 0.6) }, uTime: { value: 0 }, uSeed: { value: i * 1.7 }, uLen: { value: len } };
    const m = new THREE.Mesh(geo, new THREE.ShaderMaterial({
      uniforms: u, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
      vertexShader: `varying float vH; varying vec3 vN,vV,vL; varying float vWY; uniform float uLen;
        void main(){ vH = -position.y/uLen; vL = position; vec4 wp = modelMatrix*vec4(position,1.); vWY = wp.y;
          vN = normalize(mat3(modelMatrix)*normal); vV = normalize(cameraPosition-wp.xyz); gl_Position = projectionMatrix*viewMatrix*wp; }`,
      fragmentShader: `varying float vH; varying vec3 vN,vV,vL; varying float vWY; uniform float uI,uTime,uSeed; uniform vec3 uColor;
        void main(){ float f = pow(abs(dot(normalize(vN),normalize(vV))),2.2);
          float fall = pow(1.-vH,2.4)*smoothstep(0.03,0.3,vH);
          float ang = atan(vL.z,vL.x);
          float rays = 0.62+0.38*sin(ang*9.+uSeed)*sin(ang*5.+uTime*0.12+uSeed*2.);
          float g = smoothstep(0.,2.0,vWY);
          float a = uI*f*fall*rays*g;
          gl_FragColor = vec4(uColor*a,1.); }`,
    }));
    m.frustumCulled = false; m.renderOrder = 5;
    beams.push({ mesh: m, u });
  }
  return beams;
}

export function buildDust(N = 1100) {
  const r = rng(5), pos = new Float32Array(N * 3), ph = new Float32Array(N), sz = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const rad = Math.sqrt(r()) * 11, a = r() * Math.PI * 2;
    pos.set([Math.cos(a) * rad, 0.3 + r() * 12, Math.sin(a) * rad], i * 3); ph[i] = r() * 100; sz[i] = 0.4 + r() * r() * 1.6;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aPh', new THREE.BufferAttribute(ph, 1));
  g.setAttribute('aSz', new THREE.BufferAttribute(sz, 1));
  const u = { uTime: { value: 0 }, uI: { value: 0 }, uHead: { value: new THREE.Vector3(0, 12, 0) }, uColor: { value: new THREE.Color(1, 0.8, 0.6) }, uH: { value: 1080 } };
  const pts = new THREE.Points(g, new THREE.ShaderMaterial({
    uniforms: u, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
    vertexShader: `attribute float aPh,aSz; uniform float uTime,uI,uH; uniform vec3 uHead; varying float vA;
      void main(){ vec3 p = position + vec3(sin(uTime*0.23+aPh)*0.9, sin(uTime*0.17+aPh*1.3)*0.5 - mod(uTime*0.05+aPh,1.)*0.2, cos(uTime*0.19+aPh*0.7)*0.9);
        vec3 d = p-uHead; float c = dot(normalize(d), vec3(0.,-1.,0.));
        float inside = smoothstep(0.25,0.75,c) * smoothstep(0.3,2.5,length(d));
        vec4 mv = modelViewMatrix*vec4(p,1.); gl_Position = projectionMatrix*mv;
        float dist = -mv.z; gl_PointSize = clamp(aSz*uH*0.0045/dist*6.0, 1.0, 9.0);
        vA = uI*inside*(0.55+0.45*sin(uTime*3.+aPh)) / max(1.,dist*0.06) * min(1., length(d)/3.); }`,
    fragmentShader: `uniform vec3 uColor; varying float vA; void main(){ float d=length(gl_PointCoord-.5); float a=smoothstep(.5,0.,d); gl_FragColor=vec4(uColor*a*vA,1.); }`,
  }));
  pts.frustumCulled = false; pts.renderOrder = 6;
  return { pts, u };
}

export function buildRain(N = 1900) {
  const r = rng(17), pos = new Float32Array(N * 2 * 3), seed = new Float32Array(N * 2 * 2);
  for (let i = 0; i < N; i++) {
    const x = (r() - 0.5) * 34, z = (r() - 0.5) * 34, ph = r() * 20;
    for (let e = 0; e < 2; e++) { pos.set([x, e, z], (i * 2 + e) * 3); seed.set([ph, r() * 0.4 + 0.8], (i * 2 + e) * 2); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 2));
  const u = { uTime: { value: 0 }, uI: { value: 0 }, uHead: { value: new THREE.Vector3(0, 12, 0) }, uColor: { value: new THREE.Color(1, 0.8, 0.6) } };
  const lines = new THREE.LineSegments(g, new THREE.ShaderMaterial({
    uniforms: u, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
    vertexShader: `attribute vec2 aSeed; uniform float uTime; uniform vec3 uHead; varying float vA;
      void main(){ float H = 20.; float sp = 26.*aSeed.y;
        float y = mod(aSeed.x*H - uTime*sp, H);
        vec3 p = vec3(position.x + y*0.06, y + position.y*0.32, position.z);
        vec3 d = p-uHead; float c = dot(normalize(d), vec3(0.,-1.,0.));
        vA = smoothstep(0.5,0.9,c) / (1.+dot(d,d)*0.012) * (0.5+0.5*position.y);
        gl_Position = projectionMatrix*modelViewMatrix*vec4(p,1.); }`,
    fragmentShader: `uniform float uI; uniform vec3 uColor; varying float vA; void main(){ gl_FragColor = vec4(uColor*vA*uI,1.); }`,
  }));
  lines.frustumCulled = false; lines.renderOrder = 7;
  return { lines, u };
}

export function buildStudio() {
  const g = new THREE.Group();
  const floor = new THREE.Mesh(new THREE.CircleGeometry(220, 96), new THREE.MeshStandardMaterial({ color: 0x0b0b0c, roughness: 0.18, metalness: 0.0, transparent: true, opacity: 0.72 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = 0.002; floor.receiveShadow = true; g.add(floor);
  return { group: g, floor };
}
