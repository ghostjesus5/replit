// The night set: sky with stars and the Milky Way, terrain and grass, treeline and ridgeline,
// a campsite for scale, and the particles that make the light feel volumetric (dust, rain).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { rng } from './util.js';

const NOISE = `
float h3(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float n3(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);
  return mix(mix(mix(h3(i),h3(i+vec3(1,0,0)),f.x),mix(h3(i+vec3(0,1,0)),h3(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(h3(i+vec3(0,0,1)),h3(i+vec3(1,0,1)),f.x),mix(h3(i+vec3(0,1,1)),h3(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fbm(vec3 p){float a=.5,s=0.;for(int i=0;i<5;i++){s+=a*n3(p);p*=2.03;a*=.5;}return s;}`;

function noiseCanvas(size, seed, fn) {
  const c = document.createElement('canvas'); c.width = c.height = size; const x = c.getContext('2d');
  const im = x.createImageData(size, size), r = rng(seed);
  // value noise, 3 octaves, tileable by wrapping the lattice
  const oct = [[8, .5], [32, .3], [128, .2]].map(([n, a]) => { const g = Array.from({ length: n * n }, () => r()); return { n, a, g }; });
  for (let y = 0; y < size; y++) for (let xx = 0; xx < size; xx++) {
    let v = 0;
    for (const { n, a, g } of oct) {
      const fx = xx / size * n, fy = y / size * n, ix = Math.floor(fx), iy = Math.floor(fy), tx = fx - ix, ty = fy - iy;
      const q = (i, j) => g[((j % n + n) % n) * n + ((i % n + n) % n)];
      const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
      v += a * ((q(ix, iy) * (1 - sx) + q(ix + 1, iy) * sx) * (1 - sy) + (q(ix, iy + 1) * (1 - sx) + q(ix + 1, iy + 1) * sx) * sy);
    }
    const [R, G, B] = fn(v, r()), k = (y * size + xx) * 4;
    im.data[k] = R; im.data[k + 1] = G; im.data[k + 2] = B; im.data[k + 3] = 255;
  }
  x.putImageData(im, 0, 0);
  return c;
}

export function makeWorld(scene) {
  const W = {};
  const R = rng(42);

  // ---------- sky dome ----------
  const skyMat = new THREE.ShaderMaterial({
    uniforms: { uMilky: { value: 1 }, uLift: { value: 1 }, uWarm: { value: 0 } },
    vertexShader: `varying vec3 vD; void main(){ vD=position; vec4 p=projectionMatrix*modelViewMatrix*vec4(position,1.); gl_Position=p.xyww; }`,
    fragmentShader: `uniform float uMilky,uLift,uWarm; varying vec3 vD; ${NOISE}
      void main(){ vec3 d=normalize(vD); float h=d.y;
        vec3 zen=vec3(.0015,.0028,.008), hor=vec3(.016,.022,.045);
        vec3 col=mix(hor,zen,pow(clamp(h,0.,1.),.42))*uLift;
        col+=vec3(.05,.022,.006)*uWarm*pow(1.-clamp(abs(h),0.,1.),8.)*smoothstep(-.2,.6,-d.z);
        vec3 n=normalize(vec3(.94,.35,.33)); float band=pow(1.-abs(dot(d,n)),5.);
        float m=fbm(d*5.)*.8+fbm(d*13.+7.)*.6; float dust=smoothstep(.5,.75,fbm(d*9.+2.));
        col+=vec3(.022,.024,.034)*band*m*m*uMilky*(1.-.6*dust)*smoothstep(-.02,.25,h);
        if(h<0.) col=hor*.4*uLift;
        gl_FragColor=vec4(col,1.); }`,
    side: THREE.BackSide, depthWrite: false, fog: false,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(1600, 48, 24), skyMat); sky.renderOrder = -10; scene.add(sky);
  W.skyMat = skyMat;

  // stars: brighter ones concentrated near the Milky Way band
  const NS = 3200, sp = new Float32Array(NS * 3), sb = new Float32Array(NS), ss = new Float32Array(NS);
  const band = new THREE.Vector3(.94, .35, .33).normalize();
  for (let i = 0; i < NS; i++) {
    let v;
    do { v = new THREE.Vector3(R() * 2 - 1, R() * 1.1 - .05, R() * 2 - 1); } while (v.lengthSq() > 1 || v.lengthSq() < .05);
    v.normalize();
    const inBand = 1 - Math.abs(v.dot(band));
    if (R() > .35 + .65 * Math.pow(inBand, 3)) { i--; continue; }
    v.multiplyScalar(1500); sp.set([v.x, v.y, v.z], i * 3);
    sb[i] = Math.pow(R(), 5) * 3 + .15; ss[i] = R() * 6.28;
  }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  sg.setAttribute('b', new THREE.BufferAttribute(sb, 1)); sg.setAttribute('ph', new THREE.BufferAttribute(ss, 1));
  const starMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uA: { value: 1 }, uPx: { value: 1 } },
    vertexShader: `attribute float b; attribute float ph; uniform float uTime,uPx; varying float vB;
      void main(){ vB=b*(.75+.25*sin(uTime*(1.3+ph)+ph*7.)); vec4 p=projectionMatrix*modelViewMatrix*vec4(position,1.); gl_Position=p.xyww;
        gl_PointSize=(1.4+min(b,2.)*1.1)*uPx; }`,
    fragmentShader: `uniform float uA; varying float vB; void main(){ vec2 c=gl_PointCoord-.5; float a=smoothstep(.5,0.,length(c)); gl_FragColor=vec4(vec3(.85,.9,1.)*vB*a*uA,1.); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
  });
  const stars = new THREE.Points(sg, starMat); stars.renderOrder = -9; scene.add(stars); W.starMat = starMat;

  // ---------- ridgeline and treeline silhouettes ----------
  const ridge = [];
  for (let i = 0; i <= 360; i++) {
    const a = i / 360 * Math.PI * 2, h = 70 + 120 * Math.pow(Math.abs(Math.sin(a * 1.7 + 1) * Math.sin(a * 3.3 + .4)), 1.3) + 25 * Math.sin(a * 11 + 2) + 12 * Math.sin(a * 23);
    ridge.push([Math.cos(a) * 1300, Math.sin(a) * 1300, h]);
  }
  const rg = new THREE.BufferGeometry(), rv = [];
  for (let i = 0; i < 360; i++) {
    const [x0, z0, h0] = ridge[i], [x1, z1, h1] = ridge[i + 1];
    rv.push(x0, -10, z0, x1, -10, z1, x1, h1, z1, x0, -10, z0, x1, h1, z1, x0, h0, z0);
  }
  rg.setAttribute('position', new THREE.Float32BufferAttribute(rv, 3));
  const ridgeMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(.0045, .006, .012), fog: false, side: THREE.DoubleSide });
  scene.add(new THREE.Mesh(rg, ridgeMat));

  const NT = 1400, treeGeo = new THREE.ConeGeometry(1, 1, 7); treeGeo.translate(0, .5, 0);
  const trees = new THREE.InstancedMesh(treeGeo, new THREE.MeshBasicMaterial({ color: 0x030405 }), NT);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), po = new THREE.Vector3();
  for (let i = 0; i < NT; i++) {
    const a = R() * Math.PI * 2, d = 260 + Math.pow(R(), .7) * 520, h = 22 + R() * 30;
    // leave a gap in the treeline toward the open field behind the light
    if (Math.abs(Math.atan2(Math.sin(a - 4.4), Math.cos(a - 4.4))) < .35 && d < 420) { i--; continue; }
    po.set(Math.cos(a) * d, 0, Math.sin(a) * d); sc.set(h * .23, h, h * .23); m4.compose(po, q, sc); trees.setMatrixAt(i, m4);
  }
  scene.add(trees);

  // ---------- ground ----------
  const albedo = noiseCanvas(512, 7, (v, r) => { const k = .5 + .9 * v + (r - .5) * .25; return [30 * k, 31 * k, 21 * k]; });
  const height = noiseCanvas(512, 7, (v, r) => { const k = Math.min(255, (v * .8 + r * .2) * 255); return [k, k, k]; });
  // normal map from the height canvas
  const hx = height.getContext('2d').getImageData(0, 0, 512, 512).data, nc = document.createElement('canvas'); nc.width = nc.height = 512;
  const nx = nc.getContext('2d'), ni = nx.createImageData(512, 512), hv = (x, y) => hx[(((y + 512) % 512) * 512 + ((x + 512) % 512)) * 4] / 255;
  for (let y = 0; y < 512; y++) for (let x = 0; x < 512; x++) {
    const dx = (hv(x + 1, y) - hv(x - 1, y)) * 2.2, dy = (hv(x, y + 1) - hv(x, y - 1)) * 2.2, l = Math.hypot(dx, dy, 1), k = (y * 512 + x) * 4;
    ni.data[k] = (-dx / l * .5 + .5) * 255; ni.data[k + 1] = (dy / l * .5 + .5) * 255; ni.data[k + 2] = (1 / l * .5 + .5) * 255; ni.data[k + 3] = 255;
  }
  nx.putImageData(ni, 0, 0);
  const tex = c => { const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(260, 260); t.anisotropy = 8; return t; };
  const gmap = tex(albedo); gmap.colorSpace = THREE.SRGBColorSpace;
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000), new THREE.MeshStandardMaterial({ map: gmap, normalMap: tex(nc), normalScale: new THREE.Vector2(.9, .9), roughness: .96, color: 0x9a9a9a, envMapIntensity: .25 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);

  // light pool decal: reads at drone height, where inverse-square falloff alone would lose the 300 ft circle
  const pc = document.createElement('canvas'); pc.width = pc.height = 512; const px = pc.getContext('2d');
  const pg = px.createRadialGradient(256, 256, 0, 256, 256, 256);
  pg.addColorStop(0, 'rgba(255,255,255,1)'); pg.addColorStop(.25, 'rgba(255,255,255,.55)'); pg.addColorStop(.6, 'rgba(255,255,255,.2)'); pg.addColorStop(.9, 'rgba(255,255,255,.06)'); pg.addColorStop(1, 'rgba(255,255,255,0)');
  px.fillStyle = pg; px.fillRect(0, 0, 512, 512);
  const poolMat = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(pc), color: 0xffffff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -8 });
  const pool = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), poolMat); pool.rotation.x = -Math.PI / 2; pool.position.y = .08; pool.renderOrder = 2; scene.add(pool);
  W.pool = pool; W.poolMat = poolMat;

  // ---------- grass ----------
  const NG = 20000, blade = new THREE.BufferGeometry();
  blade.setAttribute('position', new THREE.Float32BufferAttribute([-.016, 0, 0, .016, 0, 0, .003, 1, 0], 3));
  blade.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, .5, 1], 2));
  blade.setAttribute('normal', new THREE.Float32BufferAttribute([0, .86, .5, 0, .86, .5, 0, .95, .3], 3));
  const grassMat = new THREE.MeshStandardMaterial({ color: 0x55603a, roughness: .85, side: THREE.DoubleSide, envMapIntensity: .3 });
  const gU = { value: 0 };
  grassMat.onBeforeCompile = sh => {
    sh.uniforms.uTime = gU;
    sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>',
      `#include <begin_vertex>
       vec3 ip=vec3(instanceMatrix[3][0],0.,instanceMatrix[3][2]);
       float sway=sin(uTime*1.6+ip.x*.45+ip.z*.31)*.5+sin(uTime*2.7+ip.x*1.3)*.25;
       transformed.x+=sway*.09*uv.y*uv.y; transformed.z+=sway*.05*uv.y*uv.y;`);
  };
  const grass = new THREE.InstancedMesh(blade, grassMat, NG);
  const gcol = new THREE.Color();
  for (let i = 0; i < NG; i++) {
    const a = R() * Math.PI * 2, d = .9 + Math.pow(R(), 1.5) * 60, h = .22 + R() * .5;
    po.set(Math.cos(a) * d, 0, Math.sin(a) * d);
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), R() * Math.PI);
    const tilt = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), (R() - .5) * .5); q.multiply(tilt);
    sc.set(1, h, 1); m4.compose(po, q, sc); grass.setMatrixAt(i, m4);
    gcol.setHSL(.19 + R() * .08, .28 + R() * .2, .2 + R() * .17); grass.setColorAt(i, gcol);
  }
  grass.receiveShadow = true; scene.add(grass); W.grassU = gU; W.grass = grass;

  // ---------- campsite ----------
  const camp = new THREE.Group(); scene.add(camp); W.camp = camp;
  const fabric = c => new THREE.MeshStandardMaterial({ color: c, roughness: .8, side: THREE.DoubleSide });
  const dark = new THREE.MeshStandardMaterial({ color: 0x15161a, roughness: .7 });
  function tent(x, z, ry, color, s = 1) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; g.scale.setScalar(s);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(3.6, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2), fabric(color)); dome.scale.set(1, .78, 1.25); g.add(dome);
    for (const a of [.6, -.6]) { const p = new THREE.Mesh(new THREE.TorusGeometry(3.7, .03, 6, 40, Math.PI), dark); p.rotation.y = a + Math.PI / 2; p.scale.set(1.12, .8, 1); g.add(p); }
    camp.add(g); return g;
  }
  tent(-15, -11, .5, 0x4d5638); tent(10.5, -17, -.4, 0x7a4429, .9);
  // pickup truck
  const truck = new THREE.Group(); truck.position.set(27, 0, 4); truck.rotation.y = -1.25; camp.add(truck);
  const paint = new THREE.MeshPhysicalMaterial({ color: 0x2b333d, metalness: .55, roughness: .38, clearcoat: .8, clearcoatRoughness: .15 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x050608, metalness: .9, roughness: .05 });
  const tb = (w, h, d, x, y, z, m) => { const b = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, .25), m); b.position.set(x, y, z); truck.add(b); return b; };
  tb(18, 2.4, 6.4, 0, 2.5, 0, paint); tb(6, 2.5, 6.1, -1.2, 4.9, 0, paint); tb(5.2, 1.7, 6.2, -1.2, 5.0, 0, glass);
  for (const [wx, wz] of [[-5.8, 3.1], [-5.8, -3.1], [5.6, 3.1], [5.6, -3.1]]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(1.45, 1.45, .9, 24), dark); w.rotation.x = Math.PI / 2; w.position.set(wx, 1.45, wz); truck.add(w); }
  // camp table, chairs, cooler
  const table = new THREE.Group(); table.position.set(5.5, 0, 4.2); table.rotation.y = -.35; camp.add(table);
  const top = new THREE.Mesh(new RoundedBoxGeometry(6, .12, 2.5, 2, .04), new THREE.MeshStandardMaterial({ color: 0x8e8a83, roughness: .6 })); top.position.y = 2.4; table.add(top);
  for (const [lx, lz] of [[-2.7, -1], [2.7, -1], [-2.7, 1], [2.7, 1]]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(.04, .04, 2.4, 8), dark); l.position.set(lx, 1.2, lz); table.add(l); }
  const mug = new THREE.Mesh(new THREE.CylinderGeometry(.16, .14, .32, 16), new THREE.MeshStandardMaterial({ color: 0xb9cd2b, roughness: .5 })); mug.position.set(1.4, 2.62, .3); table.add(mug);
  function chair(x, z, ry, c) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; camp.add(g);
    const seat = new THREE.Mesh(new THREE.BoxGeometry(1.8, .08, 1.6), fabric(c)); seat.position.y = 1.4; seat.rotation.x = -.12; g.add(seat);
    const back = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.7, .08), fabric(c)); back.position.set(0, 2.3, -.8); back.rotation.x = -.18; g.add(back);
    for (const sx of [-1, 1]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(.035, .035, 2.1, 6), dark); l.position.set(sx * .85, 1.0, 0); l.rotation.x = .5; g.add(l); const l2 = l.clone(); l2.rotation.x = -.5; g.add(l2); }
  }
  chair(-4.6, 6.4, 2.6, 0x2f4a5e); chair(-1.2, 8.6, 3.0, 0x6b3b2a); chair(9.2, 1.0, -1.9, 0x3e4a33);
  const cooler = new THREE.Mesh(new RoundedBoxGeometry(2.4, 1.4, 1.5, 2, .12), new THREE.MeshStandardMaterial({ color: 0xa9a69f, roughness: .6 })); cooler.position.set(3.2, .7, -3.6); cooler.rotation.y = .4; camp.add(cooler);
  camp.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });

  // people, only for the wide shots where they give scale
  const people = new THREE.Group(); scene.add(people); W.people = people;
  const cloth = [0x23272e, 0x3a2f28, 0x2c3a2e, 0x2a2a35];
  [[-3.5, 9.5, 0], [6.8, 6.8, 1], [8.0, 7.6, 2], [-8.5, -2.5, 3]].forEach(([x, z, i]) => {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = R() * 6;
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(.55, 2.9, 4, 12), new THREE.MeshStandardMaterial({ color: cloth[i], roughness: .9 })); body.position.y = 2.05; body.scale.z = .7; g.add(body);
    const headM = new THREE.Mesh(new THREE.SphereGeometry(.42, 16, 12), new THREE.MeshStandardMaterial({ color: 0x3a2c24, roughness: .8 })); headM.position.y = 4.4; g.add(headM);
    g.traverse(m => { if (m.isMesh) m.castShadow = true; }); people.add(g);
  });

  // ---------- dust motes drifting through the beam ----------
  const ND = 1400, dp = new Float32Array(ND * 3), dph = new Float32Array(ND);
  for (let i = 0; i < ND; i++) { const a = R() * Math.PI * 2, d = Math.sqrt(R()) * 11; dp.set([Math.cos(a) * d, .3 + R() * 12.5, Math.sin(a) * d], i * 3); dph[i] = R() * 100; }
  const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.BufferAttribute(dp, 3)); dg.setAttribute('ph', new THREE.BufferAttribute(dph, 1));
  const dustMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uH: { value: 12 }, uPow: { value: 1 }, uColor: { value: new THREE.Color() }, uPx: { value: 1 }, uA: { value: 1 } },
    vertexShader: `attribute float ph; uniform float uTime,uH,uPx; varying float vB;
      void main(){ vec3 p=position+vec3(sin(uTime*.23+ph)*.7,sin(uTime*.17+ph*1.7)*.5,cos(uTime*.19+ph*.7)*.7);
        float r=length(p.xz), cone=max(uH-p.y,0.)*1.05+.3; vB=smoothstep(cone,cone*.35,r)*step(p.y,uH-.15)*(.6+.4*sin(uTime*2.+ph));
        vec4 mv=modelViewMatrix*vec4(p,1.); gl_Position=projectionMatrix*mv; gl_PointSize=clamp(5.*uPx/-mv.z*6.,1.,9.*uPx); }`,
    fragmentShader: `uniform float uPow,uA; uniform vec3 uColor; varying float vB; void main(){ float a=smoothstep(.5,.1,length(gl_PointCoord-.5)); gl_FragColor=vec4(uColor*vB*a*uPow*uA*1.4,1.); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const dust = new THREE.Points(dg, dustMat); dust.frustumCulled = false; scene.add(dust); W.dustMat = dustMat;

  // ---------- rain, lit where it crosses the beam ----------
  const NR = 9000, rp = new Float32Array(NR * 2 * 3), re = new Float32Array(NR * 2);
  for (let i = 0; i < NR; i++) {
    const x = (R() - .5) * 40, z = (R() - .5) * 40, y = R() * 20;
    rp.set([x, y, z, x, y, z], i * 6); re[i * 2] = 0; re[i * 2 + 1] = 1;
  }
  const rgeo = new THREE.BufferGeometry(); rgeo.setAttribute('position', new THREE.BufferAttribute(rp, 3)); rgeo.setAttribute('e', new THREE.BufferAttribute(re, 1));
  const rainMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uH: { value: 12 }, uPow: { value: 1 }, uColor: { value: new THREE.Color() }, uA: { value: 0 } },
    vertexShader: `attribute float e; uniform float uTime,uH; varying float vB;
      void main(){ vec3 p=position; p.y=mod(p.y-uTime*26.,20.); p.y+=e*.55; p.x+=p.y*.06;
        float r=length(p.xz), cone=max(uH-p.y,0.)*1.05+.4; vB=(.12+smoothstep(cone,cone*.3,r)*step(p.y,uH-.1)*1.6)*(e*.8+.2);
        gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.); }`,
    fragmentShader: `uniform float uPow,uA; uniform vec3 uColor; varying float vB; void main(){ gl_FragColor=vec4(mix(vec3(.5,.6,.8),uColor,.85)*vB*uA*(.25+uPow),1.); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const rain = new THREE.LineSegments(rgeo, rainMat); rain.frustumCulled = false; scene.add(rain); W.rainMat = rainMat; W.rain = rain;

  // ---------- ambient night light ----------
  const hemi = new THREE.HemisphereLight(0x3a4a78, 0x0b0b0c, .5); scene.add(hemi); W.hemi = hemi;
  const moon = new THREE.DirectionalLight(0x9fb4ff, .35); moon.position.set(-60, 90, -80); scene.add(moon); W.moon = moon;

  return W;
}
