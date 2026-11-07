/* Modelos 3D compartilhados (hub + masterclasses).
   Cada modelo é um THREE.Group com userData.tick(t, dt, I), onde I é o ponteiro:
   I.world (Vector3 no plano do modelo), I.has, I.vx, I.vy (velocidade), I.speed, I.clicks. */
(function () {
window.VidroModelos = function (THREE) {

const COL = { hub: 0x4ff3ff, farmaco: 0xff4d6d, micro: 0x9a5bff, th4: 0x38f5a3 };
const V = () => new THREE.Vector3();
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(1, 1, 1), _up = new THREE.Vector3(0, 1, 0);
const _a = V(), _b = V(), _c = V(), _d = V();

function glassMat(color, cheap, extra = {}) {
  const base = { color, metalness: 0, roughness: .07, clearcoat: 1, clearcoatRoughness: .05, iridescence: 1, iridescenceIOR: 1.3, iridescenceThicknessRange: [120, 520], envMapIntensity: 1.4 };
  if (cheap) Object.assign(base, { transparent: true, opacity: .62, roughness: .12 });
  else Object.assign(base, { transmission: 1, thickness: 1.2, ior: 1.45 });
  const o = { ...base, ...extra };
  if (cheap) { delete o.transmission; delete o.thickness; delete o.attenuationColor; delete o.attenuationDistance; }
  return new THREE.MeshPhysicalMaterial(o);
}

/* mola amortecida: x persegue alvo */
function spring(st, target, k, c, dt) { st.v += (target - st.x) * k * dt; st.v *= Math.exp(-c * dt); st.x += st.v * dt; return st.x; }
const S = (x = 0) => ({ x, v: 0 });
function localPointer(obj, I) { return I && I.has ? obj.worldToLocal(_d.copy(I.world)).clone() : null; }
function clicked(state, I) { if (!I) return false; if (state.c == null) { state.c = I.clicks; return false; } if (I.clicks !== state.c) { state.c = I.clicks; return true; } return false; }

function numTex(n) {
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
  x.fillStyle = '#fff'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = '800 96px system-ui,-apple-system,"Segoe UI",sans-serif';
  x.shadowColor = 'rgba(255,255,255,.55)'; x.shadowBlur = 10; x.fillText(String(n), 64, 70); x.shadowBlur = 0; x.fillText(String(n), 64, 70);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
/* ======================= DNA com peças soltas ======================= */
function makeHelix(o = {}) {
  const cheap = !!o.cheap;
  const g = new THREE.Group(), inner = new THREE.Group(); g.add(inner); inner.rotation.z = .35;
  const N = 40, R = 1.1, step = .17, twist = .42, M = N * 2, L = 36;
  const pal = [COL.hub, COL.farmaco, COL.micro, COL.th4].map(c => new THREE.Color(c));
  const beadGeo = new THREE.SphereGeometry(.2, 28, 20), coreGeo = new THREE.SphereGeometry(.075, 10, 8);
  const rungGeo = new THREE.CylinderGeometry(.035, .035, 1, 8); rungGeo.translate(0, .5, 0);
  const beadMat = glassMat(0xffffff, cheap), coreMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const rungMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: .25, roughness: .3 });
  const beads = new THREE.InstancedMesh(beadGeo, beadMat, M), cores = new THREE.InstancedMesh(coreGeo, coreMat, M), rungs = new THREE.InstancedMesh(rungGeo, rungMat, M);
  const lBeads = new THREE.InstancedMesh(beadGeo, beadMat, L), lCores = new THREE.InstancedMesh(coreGeo, coreMat, L), lStub = new THREE.InstancedMesh(rungGeo, rungMat, L);
  [beads, cores, rungs, lBeads, lCores, lStub].forEach(x => x.instanceMatrix.setUsage(THREE.DynamicDrawUsage));
  const home = [], off = [], vel = [], white = new THREE.Color(0xffffff);
  for (let i = 0; i < N; i++) {
    const a = i * twist, y = (i - N / 2) * step;
    home.push(new THREE.Vector3(Math.cos(a) * R, y, Math.sin(a) * R), new THREE.Vector3(Math.cos(a + Math.PI) * R, y, Math.sin(a + Math.PI) * R));
    off.push(V(), V()); vel.push(V(), V());
    for (let k = 0; k < 2; k++) {
      const c = pal[(i + k * 2) % 4];
      cores.setColorAt(i * 2 + k, c); beads.setColorAt(i * 2 + k, c.clone().lerp(white, .35)); rungs.setColorAt(i * 2 + k, pal[(i * 3 + k) % 4]);
    }
  }
  const lp = [], lv = [], lq = [], ls = [];
  for (let j = 0; j < L; j++) {
    const a = Math.random() * Math.PI * 2, r = 2 + Math.random() * 1.6;
    lp.push(new THREE.Vector3(Math.cos(a) * r, (Math.random() - .5) * 6.5, Math.sin(a) * r));
    lv.push(V()); lq.push(new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.random() * 6, Math.random() * 6, Math.random() * 6)));
    ls.push(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(Math.random() - .5, Math.random() - .5, Math.random() - .5).normalize(), .02 + Math.random() * .03));
    const c = pal[j % 4]; lCores.setColorAt(j, c); lBeads.setColorAt(j, c.clone().lerp(white, .35)); lStub.setColorAt(j, pal[(j + 1) % 4]);
  }
  inner.add(beads, cores, rungs, lBeads, lCores, lStub);
  const swZ = S(), swX = S(), ck = {};
  const pos = i => _a.copy(home[i]).add(off[i]);
  g.userData.tick = (t, dt, I) => {
    inner.rotation.y = t * .25;
    const P = localPointer(inner, I), burst = clicked(ck, I);
    // balanço do corpo inteiro guiado pela velocidade do mouse
    g.rotation.z = spring(swZ, I && I.has ? THREE.MathUtils.clamp(-I.vx * .05, -.5, .5) : 0, 30, 3.2, dt);
    g.rotation.x = spring(swX, I && I.has ? THREE.MathUtils.clamp(I.vy * .04, -.35, .35) : 0, 30, 3.2, dt);
    for (let i = 0; i < M; i++) {
      const p = _b.copy(home[i]).add(off[i]), v = vel[i];
      if (P) {
        _c.subVectors(p, P); const d = _c.length();
        if (d < 1.5) v.addScaledVector(_c.normalize(), Math.pow(1 - d / 1.5, 2) * (burst ? 260 : 42) * dt * (burst ? 8 : 1));
      }
      v.addScaledVector(off[i], -38 * dt); v.multiplyScalar(Math.exp(-5.5 * dt)); off[i].addScaledVector(v, dt);
      _m.compose(_b.copy(home[i]).add(off[i]), _q.identity(), _s); beads.setMatrixAt(i, _m); cores.setMatrixAt(i, _m);
    }
    for (let i = 0; i < N; i++) {
      const A = _b.copy(home[i * 2]).add(off[i * 2]), B = _c.copy(home[i * 2 + 1]).add(off[i * 2 + 1]), mid = _a.addVectors(A, B).multiplyScalar(.5);
      [[A, 0], [B, 1]].forEach(([from, k]) => {
        _d.subVectors(mid, from); const len = _d.length(); _q.setFromUnitVectors(_up, _d.normalize());
        _m.compose(from, _q, new THREE.Vector3(1, len, 1)); rungs.setMatrixAt(i * 2 + k, _m);
      });
    }
    // nucleotídeos soltos: orbitam, são atraídos pelo cursor e arremessados quando ele passa rápido
    for (let j = 0; j < L; j++) {
      const p = lp[j], v = lv[j], r = Math.hypot(p.x, p.z) || 1;
      v.x += ((2.7 - r) * p.x / r * .7 - p.z / r * .5) * dt;
      v.z += ((2.7 - r) * p.z / r * .7 + p.x / r * .5) * dt;
      if (Math.abs(p.y) > 3.4) v.y -= Math.sign(p.y) * 1.5 * dt;
      if (P) {
        _c.subVectors(P, p); const d = _c.length();
        if (d < 3.2) {
          const n = _c.normalize();
          if (d > .7) v.addScaledVector(n, (1 - d / 3.2) * 7 * dt); else v.addScaledVector(n, -9 * dt);
          v.x += -n.z * 3 * dt; v.z += n.x * 3 * dt;
          if (I.speed > 9 && d < 1.6) v.addScaledVector(n, -I.speed * .08);
          if (burst && d < 3) v.addScaledVector(n, -6);
        }
      }
      v.multiplyScalar(Math.exp(-1.1 * dt)); if (v.length() > 5) v.setLength(5);
      p.addScaledVector(v, dt); lq[j].multiply(ls[j]);
      _m.compose(p, lq[j], _s); lBeads.setMatrixAt(j, _m); lCores.setMatrixAt(j, _m);
      _m.compose(p, lq[j], new THREE.Vector3(1, .5, 1)); lStub.setMatrixAt(j, _m);
    }
    [beads, cores, rungs, lBeads, lCores, lStub].forEach(x => x.instanceMatrix.needsUpdate = true);
  };
  return g;
}

/* ======================= anel de 8 células (períodos) ======================= */
function makeRing(o = {}) {
  const cheap = !!o.cheap, g = new THREE.Group(), cells = [];
  for (let i = 0; i < 8; i++) {
    const live = i === 3, a = i / 8 * Math.PI * 2;
    const cell = new THREE.Mesh(new THREE.IcosahedronGeometry(live ? .62 : .42, 4), glassMat(live ? 0xbfffff : 0xffffff, cheap, { thickness: live ? 2 : 1 }));
    // número do período dentro da bolha (desenhado depois do vidro para não sumir na refração)
    const nuc = new THREE.Sprite(new THREE.SpriteMaterial({ map: numTex(i + 1), color: live ? COL.th4 : 0xdde6ec, transparent: true, depthTest: false, depthWrite: false, opacity: .92 })); nuc.renderOrder = 5;
    const ns = live ? .9 : .62; nuc.scale.setScalar(ns);
    cell.add(nuc); cell.userData = { a, live, nuc, ns, home: new THREE.Vector3(Math.cos(a) * 2.4, Math.sin(a) * 2.4, 0), off: V(), vel: V(), sc: S(1) };
    cell.position.copy(cell.userData.home); g.add(cell); cells.push(cell);
  }
  g.add(new THREE.Mesh(new THREE.TorusGeometry(2.4, .012, 8, 160), new THREE.MeshBasicMaterial({ color: COL.hub, transparent: true, opacity: .5 })));
  g.rotation.x = -.9; g.userData.offset = new THREE.Vector3(.6, 0, 0);
  const spin = S(), ck = {};
  g.userData.tick = (t, dt, I) => {
    const P = localPointer(g, I), burst = clicked(ck, I);
    g.rotation.z += (0.18 + spring(spin, I && I.has ? THREE.MathUtils.clamp(I.vx * .08, -1.5, 1.5) : 0, 8, 3, dt)) * dt;
    cells.forEach(c => {
      const u = c.userData; let near = 0;
      if (P) {
        _c.subVectors(_b.copy(u.home).add(u.off), P); const d = _c.length();
        near = Math.max(0, 1 - d / 1.4);
        if (d < 1.6) u.vel.addScaledVector(_c.normalize(), (1 - d / 1.6) * (burst ? 60 : 14) * dt);
      }
      u.vel.addScaledVector(u.off, -30 * dt); u.vel.multiplyScalar(Math.exp(-4 * dt)); u.off.addScaledVector(u.vel, dt);
      c.position.copy(u.home).add(u.off);
      c.scale.setScalar(spring(u.sc, 1 + near * .45, 60, 7, dt));
      u.nuc.scale.setScalar(u.ns * (u.live ? 1 + Math.sin(t * 4) * .06 + near * .2 : 1 + near * .3));
      u.nuc.material.color.set(u.live ? COL.th4 : (near > .3 ? COL.hub : 0xdde6ec));
      c.rotation.y = t + near * 3;
    });
  };
  return g;
}

/* ======================= cápsulas (farmacologia) ======================= */
function capsuleHalf(r, h, seg = 40) {
  const pts = [new THREE.Vector2(r, 0)];
  for (let i = 0; i <= 12; i++) { const a = i / 12 * Math.PI / 2; pts.push(new THREE.Vector2(Math.max(.001, Math.cos(a) * r), h + Math.sin(a) * r)); }
  return new THREE.LatheGeometry(pts, seg);
}
function makePills(o = {}) {
  const cheap = !!o.cheap, g = new THREE.Group(), items = [];
  const geo = new THREE.CapsuleGeometry(.28, .7, 12, 32), pos = geo.attributes.position, cols = [];
  for (let i = 0; i < pos.count; i++) { const c = new THREE.Color(pos.getY(i) > 0 ? COL.farmaco : 0xffffff); cols.push(c.r, c.g, c.b); }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  const mat = glassMat(0xffffff, cheap, { vertexColors: true, thickness: .8 });
  const tab = new THREE.CylinderGeometry(.42, .42, .16, 40), tabMat = new THREE.MeshPhysicalMaterial({ color: 0xf5f7fa, roughness: .35, clearcoat: 1, sheen: 1 });
  for (let i = 0; i < 16; i++) {
    const isTab = i % 4 === 3, m = new THREE.Mesh(isTab ? tab : geo, isTab ? tabMat : mat);
    const r = 1.6 + Math.random() * 1.6, a = Math.random() * Math.PI * 2, y = (Math.random() - .5) * 4;
    m.userData = { home: new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r * .8), off: V(), vel: V(), w: new THREE.Vector3(Math.random() - .5, Math.random() - .5, Math.random() - .5).multiplyScalar(1.2), ph: Math.random() * 6 };
    m.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6); g.add(m); items.push(m);
  }
  // cápsula principal que abre quando o cursor chega perto e solta os grânulos
  const hero = new THREE.Group(), hr = .62, hh = .78;
  const top = new THREE.Mesh(capsuleHalf(hr, hh), glassMat(COL.farmaco, cheap, { side: THREE.DoubleSide, thickness: .6 }));
  const bot = new THREE.Mesh(capsuleHalf(hr * .97, hh), glassMat(0xffffff, cheap, { side: THREE.DoubleSide, thickness: .6 })); bot.rotation.x = Math.PI;
  hero.add(top, bot);
  const GN = 46, gr = new THREE.InstancedMesh(new THREE.SphereGeometry(.075, 10, 8), new THREE.MeshStandardMaterial({ roughness: .4, emissive: 0x220008 }), GN);
  const gHome = [], gOff = [], gCols = [0xffffff, 0xffd166, COL.farmaco, 0xffb3c1].map(c => new THREE.Color(c));
  for (let i = 0; i < GN; i++) {
    gHome.push(new THREE.Vector3((Math.random() - .5) * .8, (Math.random() - .5) * 1.4, (Math.random() - .5) * .8));
    gOff.push(new THREE.Vector3((Math.random() - .5) * 3, (Math.random() - .5) * 3, (Math.random() - .5) * 2.4)); gr.setColorAt(i, gCols[i % 4]);
  }
  hero.add(gr); hero.rotation.z = .8; g.add(hero);
  const sep = S(), tiltZ = S(.8), tiltX = S(), ck = {};
  g.userData.tick = (t, dt, I) => {
    g.rotation.y = t * .1;
    const P = localPointer(g, I), burst = clicked(ck, I);
    items.forEach(m => {
      const u = m.userData, p = _b.copy(u.home).add(u.off);
      p.y += Math.sin(t + u.ph) * .18;
      if (P) {
        _c.subVectors(p, P); const d = _c.length();
        if (d < 1.6) { const n = _c.normalize(); u.vel.addScaledVector(n, (1 - d / 1.6) * 34 * dt); u.w.addScaledVector(new THREE.Vector3(n.y, -n.x, n.z), (1 - d / 1.6) * 14 * dt); }
        if (burst && d < 3.5) { u.vel.addScaledVector(_c.normalize(), 9 * (1 - d / 3.5)); u.w.multiplyScalar(4); }
      }
      if (I && I.sv) { u.vel.y += I.sv * (.7 + Math.abs(u.w.z) * .3) * dt * 3.2; u.vel.x += I.sv * Math.sin(u.w.y * 9) * dt; u.w.x += I.sv * dt * 1.6; }
      u.vel.addScaledVector(u.off, -9 * dt); u.vel.multiplyScalar(Math.exp(-2.6 * dt)); u.off.addScaledVector(u.vel, dt);
      u.w.multiplyScalar(Math.exp(-.6 * dt)); if (u.w.length() < .5) u.w.setLength(.5);
      m.position.copy(p); m.rotation.x += u.w.x * dt; m.rotation.y += u.w.y * dt; m.rotation.z += u.w.z * dt;
    });
    let near = 0;
    if (P) { const d = P.distanceTo(hero.position); near = THREE.MathUtils.clamp(1 - (d - .6) / 1.6, 0, 1); }
    const s = spring(sep, near * .95, 40, 6, dt);
    top.position.y = s * .9; bot.position.y = -s * .9;
    hero.rotation.z = spring(tiltZ, P ? .8 + THREE.MathUtils.clamp(-P.x * .2, -.6, .6) : .8, 20, 4, dt);
    hero.rotation.x = spring(tiltX, P ? THREE.MathUtils.clamp(P.y * .15, -.5, .5) : 0, 20, 4, dt);
    hero.rotation.y = t * .5; hero.position.y = Math.sin(t * 1.2) * .15;
    for (let i = 0; i < GN; i++) {
      _b.copy(gHome[i]).lerp(gOff[i], s).multiplyScalar(1).add(_c.set(Math.sin(t * 2 + i) * .05 * s, Math.cos(t * 1.7 + i) * .05 * s, 0));
      _m.compose(_b, _q.identity(), _s.setScalar(s < .05 ? .0001 : Math.min(1, s * 1.5))); gr.setMatrixAt(i, _m);
    }
    _s.set(1, 1, 1); gr.instanceMatrix.needsUpdate = true;
  };
  return g;
}

/* ======================= bactérias (microbiologia) ======================= */
function makeBugs(o = {}) {
  const cheap = !!o.cheap, g = new THREE.Group();
  const rod = new THREE.CapsuleGeometry(.22, .9, 10, 24), coc = new THREE.SphereGeometry(.24, 28, 20);
  const pink = glassMat(0xff8fc0, cheap, { thickness: 1 }), violet = glassMat(0xb88cff, cheap, { thickness: 1 });
  const coreP = new THREE.MeshBasicMaterial({ color: 0xff4d9a }), coreV = new THREE.MeshBasicMaterial({ color: COL.micro });
  const flagMat = new THREE.MeshBasicMaterial({ color: 0xffc0de, transparent: true, opacity: .75 });
  const rods = [];
  for (let i = 0; i < 9; i++) {
    const b = new THREE.Group(); b.add(new THREE.Mesh(rod, pink), new THREE.Mesh(new THREE.CapsuleGeometry(.09, .7, 6, 12), coreP));
    const pts = []; for (let k = 0; k < 30; k++) pts.push(new THREE.Vector3(Math.sin(k * .6) * .12, -.68 - k * .05, Math.cos(k * .6) * .12));
    const fl = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, .014, 6), flagMat); b.add(fl);
    const a = i / 9 * Math.PI * 2; b.position.set(Math.cos(a) * 2.2, (Math.random() - .5) * 3, Math.sin(a) * 1.2);
    b.userData = { fl, dir: new THREE.Vector3(Math.random() - .5, Math.random() - .5, (Math.random() - .5) * .4).normalize(), next: Math.random() * 2, sp: .5 };
    g.add(b); rods.push(b);
  }
  // estafilococos em cacho
  const cluster = new THREE.Group(), cocci = [];
  for (let i = 0; i < 14; i++) {
    const c = new THREE.Mesh(coc, violet); c.add(new THREE.Mesh(new THREE.SphereGeometry(.09, 10, 8), coreV));
    c.userData = { home: new THREE.Vector3((Math.random() - .5) * .9, (Math.random() - .5) * .9, (Math.random() - .5) * .9), off: V(), vel: V() };
    c.position.copy(c.userData.home); cluster.add(c); cocci.push(c);
  }
  cluster.position.set(-.4, .6, 0); g.add(cluster);
  // estreptococos em cadeia (segue o líder)
  const chain = [];
  for (let i = 0; i < 10; i++) { const c = new THREE.Mesh(coc, violet); c.add(new THREE.Mesh(new THREE.SphereGeometry(.09, 10, 8), coreV)); c.position.set(i * .44 - 2, -1.9, .4); g.add(c); chain.push(c); }
  const ck = {}; let flee = 0;
  const tmpQ = new THREE.Quaternion();
  g.userData.tick = (t, dt, I) => {
    g.rotation.y = Math.sin(t * .2) * .25;
    const P = localPointer(g, I);
    if (clicked(ck, I)) flee = 1.6;
    flee = Math.max(0, flee - dt);
    rods.forEach(b => {
      const u = b.userData; u.next -= dt;
      if (u.next < 0) { u.dir.set(Math.random() - .5, Math.random() - .5, (Math.random() - .5) * .4).normalize(); u.next = 1 + Math.random() * 2; } // "tumble"
      let sp = .5;
      if (P) {
        _c.subVectors(P, b.position); const d = _c.length(); _c.normalize();
        if (flee > 0 && d < 5) { u.dir.lerp(_c.negate(), Math.min(1, 8 * dt)).normalize(); sp = 3.2; }
        else if (d > .55) { u.dir.lerp(_c, Math.min(1, 1.6 * dt)).normalize(); sp = 1.3; } // quimiotaxia
        else { u.dir.lerp(_c.negate(), Math.min(1, 3 * dt)).normalize(); sp = .4; }
      }
      if (b.position.length() > 3.6) u.dir.lerp(_c.copy(b.position).negate().normalize(), Math.min(1, 2 * dt)).normalize();
      u.sp += (sp - u.sp) * Math.min(1, 3 * dt);
      b.position.addScaledVector(u.dir, u.sp * dt);
      tmpQ.setFromUnitVectors(_up, u.dir); b.quaternion.slerp(tmpQ, Math.min(1, 5 * dt));
      u.fl.rotation.y += (8 + u.sp * 14) * dt;
    });
    const Pc = P ? P.clone().sub(cluster.position) : null;
    cluster.rotation.y = t * .3;
    const Pcl = P ? cluster.worldToLocal(_d.copy(I.world)).clone() : null;
    cocci.forEach(c => {
      const u = c.userData;
      if (Pcl) { _c.subVectors(_b.copy(u.home).add(u.off), Pcl); const d = _c.length(); if (d < 1.4) u.vel.addScaledVector(_c.normalize(), (1 - d / 1.4) * (flee > 1.5 ? 90 : 18) * dt); }
      if (I && I.sv) u.vel.y += I.sv * dt * 6;
      u.vel.addScaledVector(u.off, -26 * dt); u.vel.multiplyScalar(Math.exp(-4 * dt)); u.off.addScaledVector(u.vel, dt);
      c.position.copy(u.home).add(u.off).multiplyScalar(1 + Math.sin(t * 2) * .04);
    });
    const head = chain[0], target = P ? P : _b.set(Math.sin(t * .5) * 2.6, -1.6 + Math.sin(t * 1.1) * .8, Math.cos(t * .4) * .6);
    _c.subVectors(target, head.position); if (_c.length() > .3) head.position.addScaledVector(_c.normalize(), (P ? 1.4 : .8) * dt);
    for (let i = 1; i < chain.length; i++) {
      const a = chain[i - 1].position, b = chain[i].position; _c.subVectors(b, a); const d = _c.length();
      if (d > .44) b.copy(a).addScaledVector(_c.normalize(), .44);
    }
  };
  return g;
}

/* ======================= hemácias (fundo de TH) ======================= */
function makeCells(o = {}) {
  const cheap = !!o.cheap, g = new THREE.Group();
  const prof = []; for (let i = 0; i <= 24; i++) { const r = i / 24 * .62; const h = .14 + .32 * Math.pow(r / .62, 2) - .3 * Math.pow(r / .62, 4); prof.push(new THREE.Vector2(r, h)); }
  prof.push(new THREE.Vector2(.62, 0));
  const half = new THREE.LatheGeometry(prof, 36);
  const mat = glassMat(0xff5a6e, cheap, { thickness: .8, attenuationColor: new THREE.Color(0xff2040), attenuationDistance: 1, side: THREE.DoubleSide });
  const cells = [];
  const N = o.n || 22, SPAN = o.span || 12, SZ = o.size || 1;
  for (let i = 0; i < N; i++) {
    const c = new THREE.Group(); const a = new THREE.Mesh(half, mat), b = new THREE.Mesh(half, mat); b.rotation.x = Math.PI; c.add(a, b);
    c.userData = { u: Math.random(), lane: (Math.random() - .5) * 3.4, z: (Math.random() - .5) * 2, sp: .05 + Math.random() * .05, off: V(), vel: V(), w: new THREE.Vector3(Math.random(), Math.random(), Math.random()) };
    c.scale.setScalar((.7 + Math.random() * .5) * SZ); g.add(c); cells.push(c);
  }
  const ck = {};
  g.userData.tick = (t, dt, I) => {
    const P = localPointer(g, I), burst = clicked(ck, I);
    cells.forEach(c => {
      const u = c.userData; u.u = (u.u + u.sp * dt) % 1;
      const x = (u.u - .5) * SPAN, base = _b.set(x, u.lane + Math.sin(x * .6 + t * .8) * .6, u.z);
      if (P) { _c.subVectors(_a.copy(base).add(u.off), P); const d = _c.length(); if (d < 1.8) u.vel.addScaledVector(_c.normalize(), (1 - d / 1.8) * (burst ? 160 : 24) * dt); }
      if (I && I.sv) { u.vel.y += I.sv * dt * 3; u.u = (u.u + Math.abs(I.sv) * .012 * dt) % 1; c.rotation.z += I.sv * dt * .8; }
      u.vel.addScaledVector(u.off, -10 * dt); u.vel.multiplyScalar(Math.exp(-3 * dt)); u.off.addScaledVector(u.vel, dt);
      c.position.copy(base).add(u.off);
      c.rotation.x += u.w.x * dt; c.rotation.y += u.w.y * dt * .6;
    });
  };
  return g;
}

/* ======================= coração anatômico ======================= */
function bump(x, a, b) { if (x < a || x > b) return 0; return Math.sin((x - a) / (b - a) * Math.PI); }
function ventricleShape(v) {
  const phi = Math.atan2(v.x, v.z); let { x, y, z } = v;
  const tap = y < 0 ? 1 - .58 * Math.pow(-y, 1.55) : 1 - .14 * y * y;
  let r = 1;
  if (z > -.2 && y < .62) r -= .055 * Math.exp(-Math.pow((phi - .42) / .13, 2)); // sulco interventricular anterior
  r -= .045 * Math.exp(-Math.pow((y - .55) / .07, 2));                             // sulco coronário
  x *= tap * r; z *= tap * r * .84; y = y * 1.32 * r;
  if (y < 0) x += -y * .08;
  return new THREE.Vector3(x, y, z);
}
function deform(geo, fn) {
  const p = geo.attributes.position, v = V();
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i).normalize(); const o = fn(v); p.setXYZ(i, o.x, o.y, o.z); }
  geo.computeVertexNormals(); return geo;
}
function surf(phi, y, lift = 1.018) {
  const ry = Math.max(-.999, Math.min(.999, y)), rr = Math.sqrt(1 - ry * ry);
  return ventricleShape(new THREE.Vector3(Math.sin(phi) * rr, ry, Math.cos(phi) * rr)).multiplyScalar(lift);
}
function tube(points, r, mat, seg = 64, closed = false) { return new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), seg, r, 16, closed), mat); }
const P3 = (x, y, z) => new THREE.Vector3(x, y, z);

function makeHeart(o = {}) {
  const cheap = !!o.cheap, g = new THREE.Group(), root = new THREE.Group(); g.add(root);
  const flesh = (c, e) => new THREE.MeshPhysicalMaterial({
    color: c, roughness: .34, clearcoat: 1, clearcoatRoughness: .12, sheen: 1, sheenColor: new THREE.Color(0xff9aa8), sheenRoughness: .35,
    emissive: e || 0x3a000c, emissiveIntensity: .4, envMapIntensity: 1.2,
    ...(cheap ? {} : { transmission: .22, thickness: 2.2, ior: 1.4, attenuationColor: new THREE.Color(0xff1f3d), attenuationDistance: 1.4 })
  });
  const myo = flesh(0xb5132f), atrMat = flesh(0xc92a44);
  const vent = new THREE.Group(); root.add(vent);
  const vGeo = deform(new THREE.SphereGeometry(1, 96, 72), ventricleShape);
  const ventMesh = new THREE.Mesh(vGeo, myo); vent.add(ventMesh);
  // casca de vidro líquido em volta
  const shell = new THREE.Mesh(vGeo.clone().scale(1.07, 1.05, 1.07), glassMat(0xffffff, cheap, { transparent: true, opacity: cheap ? .18 : 1, roughness: .02, thickness: .3, iridescence: 1 }));
  if (cheap) shell.material.depthWrite = false;
  vent.add(shell);
  // coronárias (brilham a cada sístole)
  const corMat = new THREE.MeshStandardMaterial({ color: 0xff5a3c, emissive: 0xff3a1c, emissiveIntensity: .8, roughness: .3 });
  const veinMat = new THREE.MeshStandardMaterial({ color: 0x6d78ff, emissive: 0x2a2fff, emissiveIntensity: .4, roughness: .35 });
  const path = (f, n = 18) => Array.from({ length: n }, (_, i) => f(i / (n - 1)));
  vent.add(tube(path(s => surf(.42 + s * .05, .6 - s * 1.55)), .032, corMat));                    // descendente anterior
  vent.add(tube(path(s => surf(.5 - s * 2.4, .56)), .03, corMat));                                // circunflexa
  vent.add(tube(path(s => surf(.25 + s * 2.6, .56)), .03, corMat));                               // coronária direita (anel)
  vent.add(tube(path(s => surf(2.85 + s * .1, .5 - s * 1.35)), .026, corMat));                    // descendente posterior
  [[.1, .3], [-.15, .05], [-.35, -.25]].forEach(([y0, y1]) => vent.add(tube(path(s => surf(.44 - s * .75, y0 - s * (y0 - y1))), .018, corMat, 24))); // diagonais
  vent.add(tube(path(s => surf(.3 - s * .1, .5 - s * 1.3), 14), .018, veinMat, 24));             // veia cardíaca magna
  // átrios e aurículas
  const atria = new THREE.Group(); root.add(atria);
  const blob = (sx, sy, sz, x, y, z, mat, rz = 0) => { const m = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), mat); m.scale.set(sx, sy, sz); m.position.set(x, y, z); m.rotation.z = rz; atria.add(m); return m; };
  blob(.56, .5, .52, -.66, 1.0, .02, atrMat);           // átrio direito
  blob(.52, .42, .46, .36, 1.06, -.48, atrMat);         // átrio esquerdo
  blob(.3, .17, .2, -.5, 1.22, .48, atrMat, .5);        // aurícula direita
  blob(.24, .14, .15, .66, 1.08, .36, atrMat, -.6);     // aurícula esquerda
  // grandes vasos
  const aoMat = flesh(0xdf3448, 0x40000a), paMat = flesh(0x5a5cff, 0x10106a), cvMat = flesh(0x3f5bd6, 0x0b1a5a);
  [aoMat, paMat, cvMat].forEach(m => { m.sheenColor = new THREE.Color(0xffffff); });
  const vessels = new THREE.Group(); root.add(vessels);
  vessels.add(tube([P3(0, 1.0, .12), P3(0, 1.8, .15), P3(.15, 2.38, -.08), P3(.55, 2.45, -.45), P3(.82, 2.0, -.72), P3(.84, 1.1, -.78), P3(.84, -.1, -.78)], .27, aoMat, 96));
  [[.05, 2.38, .0], [.3, 2.47, -.18], [.52, 2.45, -.4]].forEach(([x, y, z], i) => vessels.add(tube([P3(x, y - .1, z), P3(x - .05 + i * .06, y + .35, z), P3(x - .1 + i * .1, y + .75, z + .05)], .085 - i * .008, aoMat, 24)));
  vessels.add(tube([P3(.36, .9, .58), P3(.44, 1.5, .42), P3(.5, 1.82, .1)], .24, paMat, 48));          // tronco pulmonar
  vessels.add(tube([P3(.5, 1.82, .1), P3(.85, 1.9, -.05), P3(1.25, 1.78, -.2)], .14, paMat, 32));       // pulmonar esquerda
  vessels.add(tube([P3(.5, 1.82, .1), P3(.05, 1.78, -.35), P3(-.75, 1.72, -.3)], .13, paMat, 32));      // pulmonar direita
  vessels.add(tube([P3(-.62, 2.45, .02), P3(-.64, 1.8, .02), P3(-.66, 1.25, .04)], .19, cvMat, 32));   // cava superior
  vessels.add(tube([P3(-.58, .62, -.22), P3(-.56, 0, -.25), P3(-.55, -.6, -.28)], .2, cvMat, 24));     // cava inferior
  [[-.3, 1.0, -.95], [-.1, 1.12, -.95]].forEach(([x, y, z]) => vessels.add(tube([P3(x + .55, y, -.55), P3(x, y, z), P3(x - .5, y + .05, z - .1)], .07, aoMat, 16))); // veias pulmonares
  root.rotation.z = -.42; root.rotation.y = -.25; root.position.y = -.35;
  g.scale.setScalar(o.scale || 1);
  // anéis de ECG (no hub)
  let rings = [];
  if (o.rings) {
    const pts = []; for (let i = 0; i <= 400; i++) { const a = i / 400 * Math.PI * 2, ph = (i % 50) / 50; let r = 2.9; if (ph > .42 && ph < .46) r += .5; else if (ph >= .46 && ph < .5) r -= .35; else if (ph > .6 && ph < .7) r += .12 * Math.sin((ph - .6) / .1 * Math.PI); pts.push(new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, 0)); }
    const r1 = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: COL.th4 }));
    r1.rotation.x = 1.2; const r2 = r1.clone(); r2.rotation.set(1.2, 0, 1.1); r2.material = new THREE.LineBasicMaterial({ color: COL.th4, transparent: true, opacity: .35 });
    g.add(r1, r2); rings = [r1, r2];
  }
  // ritmo
  const st = { phase: 0, bpm: 68, drive: null, c: 0, a: 0, yaw: S(), pitch: S(), userYaw: 0, userPitch: 0, ck: {}, extra: 0 };
  g.userData.state = st;
  g.userData.setDrive = fn => { st.drive = fn; };
  g.userData.tick = (t, dt, I) => {
    const P = localPointer(g, I);
    let target = 64;
    if (P) { const d = P.length(); target = 64 + Math.max(0, 1 - d / 4) * 76; }
    if (clicked(st.ck, I) && P && P.length() < 3.2) { st.phase = .13; st.extra = 1; }
    st.extra = Math.max(0, st.extra - dt * .6); target += st.extra * 40;
    st.bpm += (target - st.bpm) * Math.min(1, dt * 1.5);
    let c, a;
    const dv = st.drive && st.drive();
    if (dv != null) { c = dv; a = Math.max(0, dv - .6) * .5; st.synced = true; }
    else {
      st.synced = false; st.phase = (st.phase + dt * st.bpm / 60) % 1;
      a = bump(st.phase, 0, .14); c = Math.pow(bump(st.phase, .14, .48), .8);
    }
    st.c += (c - st.c) * Math.min(1, dt * 22); st.a += (a - st.a) * Math.min(1, dt * 22);
    vent.scale.set(1 - .075 * st.c, 1 - .045 * st.c, 1 - .075 * st.c);
    atria.scale.setScalar(1 - .09 * st.a);
    vessels.scale.setScalar(1 + .025 * st.c);
    corMat.emissiveIntensity = .6 + st.c * 2.2;
    myo.emissiveIntensity = .3 + st.c * .9;
    g.rotation.y = spring(st.yaw, (P ? THREE.MathUtils.clamp(P.x * .25, -.9, .9) : Math.sin(t * .4) * .5) + st.userYaw, 14, 4, dt);
    g.rotation.x = spring(st.pitch, (P ? THREE.MathUtils.clamp(-P.y * .12, -.4, .4) : 0) + st.userPitch, 14, 4, dt);
    rings.forEach((r, i) => { r.rotation.z += (i ? .3 : -.5) * dt * (st.bpm / 68); });
  };
  return g;
}


/* ======================= lâmpada de cordinha (troca de tema) ======================= */
function glowTexture(stops) {
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64); stops.forEach(([o, col]) => g.addColorStop(o, col));
  x.fillStyle = g; x.fillRect(0, 0, 128, 128); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function makeLamp(o = {}) {
  const root = new THREE.Group(), pend = new THREE.Group(); root.add(pend);
  const L = o.wire || 1.7, acc = new THREE.Color(o.accent || 0xff4d6d);
  const rubber = new THREE.MeshStandardMaterial({ color: 0x15171a, roughness: .55 });
  const brass = new THREE.MeshPhysicalMaterial({ color: 0xd8b27a, metalness: 1, roughness: .26, clearcoat: .6, envMapIntensity: 1.3 });
  const chrome = new THREE.MeshPhysicalMaterial({ color: 0xe9edf2, metalness: 1, roughness: .16, envMapIntensity: 1.5 });
  // fio
  const wire = new THREE.Mesh(new THREE.CylinderGeometry(.022, .022, L + 7, 10), rubber); wire.position.y = -(L + 7) / 2 + 7; pend.add(wire);
  // soquete
  const sock = new THREE.Group(); sock.position.y = -L; pend.add(sock);
  const sp = [[.05, .02], [.1, 0], [.14, -.06], [.2, -.14], [.24, -.2], [.25, -.5], [.235, -.56], [.2, -.6]].map(([x, y]) => new THREE.Vector2(x, y));
  sock.add(new THREE.Mesh(new THREE.LatheGeometry(sp, 40), brass));
  for (let i = 0; i < 4; i++) { const r = new THREE.Mesh(new THREE.TorusGeometry(.252, .014, 8, 40), brass); r.rotation.x = Math.PI / 2; r.position.y = -.26 - i * .075; sock.add(r); }
  const nip = new THREE.Mesh(new THREE.CylinderGeometry(.022, .022, .44, 12), chrome); nip.position.set(.46, -.46, 0); nip.rotation.z = Math.PI / 2; sock.add(nip);
  // bulbo de vidro (perfil de lâmpada A19)
  const bp = [new THREE.Vector2(.19, 0)];
  for (let i = 1; i <= 8; i++) { const t = i / 8; bp.push(new THREE.Vector2(.19 + (.36 - .19) * t * t, -.39 * t)); }
  const R = .56, cy = -.82;
  for (let i = 1; i <= 28; i++) { const th = (40 + 140 * i / 28) * Math.PI / 180; bp.push(new THREE.Vector2(Math.max(.0001, R * Math.sin(th)), cy + R * Math.cos(th))); }
  const glass = new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0, roughness: .03, transmission: 1, thickness: .45, ior: 1.5, clearcoat: 1, clearcoatRoughness: .02, envMapIntensity: 1.6, attenuationColor: new THREE.Color(0xfff1dc), attenuationDistance: 2.5 });
  const bulb = new THREE.Group(); bulb.position.y = -L - .58; pend.add(bulb);
  bulb.add(new THREE.Mesh(new THREE.LatheGeometry(bp, 56), glass));
  // haste, suportes e filamento em espiral
  const stemMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, transmission: 1, thickness: .2, roughness: .05, ior: 1.5 });
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(.04, .08, .42, 16), stemMat); stem.position.y = -.3; bulb.add(stem);
  const wireMat = new THREE.MeshStandardMaterial({ color: 0x8a8f96, metalness: .9, roughness: .3 });
  [-1, 1].forEach(sx => { const w = new THREE.Mesh(new THREE.CylinderGeometry(.007, .007, .42, 6), wireMat); w.position.set(sx * .1, -.66, 0); w.rotation.z = sx * -.32; bulb.add(w); });
  const fp = [];
  for (let i = 0; i <= 240; i++) { const s = i / 240, a = s * Math.PI * 2 * 16; const bx = -.17 + .34 * s, by = -.86 - .07 * Math.sin(Math.PI * s); fp.push(new THREE.Vector3(bx + Math.cos(a) * .004, by + Math.sin(a) * .022, Math.cos(a) * .022)); }
  const filMat = new THREE.MeshStandardMaterial({ color: 0x2a1a10, emissive: 0xffc070, emissiveIntensity: 0, roughness: .5 });
  bulb.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(fp), 480, .0075, 6), filMat));
  const core = new THREE.Mesh(new THREE.SphereGeometry(.4, 32, 20), new THREE.MeshBasicMaterial({ color: 0xffd9a0, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  core.position.y = cy; bulb.add(core);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture([[0, 'rgba(255,240,205,1)'], [.22, 'rgba(255,214,150,.6)'], [.55, 'rgba(255,180,100,.16)'], [1, 'rgba(255,170,90,0)']]), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  halo.position.y = cy; bulb.add(halo);
  const bulbLight = new THREE.PointLight(0xffd2a0, 0, 8, 1.6); bulbLight.position.y = cy; bulb.add(bulbLight);

  // corrente de bolinhas com puxador de vidro (verlet no espaço do root)
  const N = 21, SEG = .085, chainLen = SEG * (N - 1);
  const pts = [], prv = [], _p = V(), _t = V(), _dir = V(), DOWN = new THREE.Vector3(0, -1, 0);
  const anchorLocal = () => { _p.set(.68, -.46, 0); sock.localToWorld(_p); return root.worldToLocal(_p); };
  root.updateMatrixWorld(true); anchorLocal();
  for (let i = 0; i < N; i++) { pts.push(V().set(_p.x, _p.y - i * SEG, 0)); prv.push(pts[i].clone()); }
  const balls = new THREE.InstancedMesh(new THREE.SphereGeometry(.026, 10, 8), chrome, N); root.add(balls);
  const bead = new THREE.Group(); root.add(bead);
  const beadMat = new THREE.MeshPhysicalMaterial({ color: acc, metalness: 0, roughness: .04, transmission: 1, thickness: 1.6, ior: 1.52, clearcoat: 1, attenuationColor: acc, attenuationDistance: .35, envMapIntensity: 1.6 });
  const beadMesh = new THREE.Mesh(new THREE.CapsuleGeometry(.085, .16, 8, 24), beadMat); beadMesh.position.y = -.17; bead.add(beadMesh);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(.03, .05, .06, 16), chrome); cap.position.y = -.02; bead.add(cap);

  const st = { th: 0, w: 0, lit: 0, target: 0, flick: -1, slide: 0, slideV: 0, pulled: false, drag: null, auto: -1 };
  const FL_ON = [[0, 0], [.04, .9], [.08, .05], [.15, .7], [.2, .1], [.3, 1]];
  const lerpKeys = (K, t) => { for (let i = 1; i < K.length; i++) if (t <= K[i][0]) { const a = K[i - 1], b = K[i]; return a[1] + (b[1] - a[1]) * (t - a[0]) / (b[0] - a[0]); } return K[K.length - 1][1]; };
  const cLow = new THREE.Color(0xff4a12), cHigh = new THREE.Color(0xffe2b0);
  const ud = root.userData = {
    st, chainLen,
    beadWorld: out => bead.localToWorld(out.set(0, -.17, 0)),
    bulbWorld: out => core.getWorldPosition(out),
    setLit(v, instant) { st.target = v; if (instant) st.lit = v; },
    flickerOn() { st.flick = 0; st.target = 1; },
    kick(a) { st.w += a; },
    autoPull() { st.auto = 0; },
    onPull: null,
    tick(t, dt, P) {
      root.updateMatrixWorld(true);
      let torque = 0;
      // o ponteiro passando empurra a lâmpada
      if (P && P.has && !st.drag) {
        _t.copy(P.world); root.worldToLocal(_t); const bw = root.worldToLocal(core.getWorldPosition(V()));
        const d = Math.hypot(bw.x - _t.x, bw.y - _t.y); if (d < 1.4) torque += -(P.vx || 0) * 1.1 * (1 - d / 1.4);
      }
      const A = anchorLocal().clone();
      // alvo do puxador: arraste do usuário ou puxão automático
      let target = null;
      if (st.auto >= 0) {
        st.auto += dt; const a = st.auto;
        if (a > .5) st.auto = -1;
        else { const k = a < .26 ? Math.sin(a / .26 * Math.PI / 2) : a < .36 ? 1 : 1 - (a - .36) / .14; target = V().set(A.x + .04, A.y - chainLen - .46 * k, 0); if (a >= .36) target = null; }
      }
      if (st.drag) { target = root.worldToLocal(_t.copy(st.drag)).clone(); }
      let want = 0;
      if (target) { want = THREE.MathUtils.clamp(target.distanceTo(A) - chainLen, 0, .34); torque += THREE.MathUtils.clamp(target.x - A.x, -1.5, 1.5) * 2.2; }
      if (target) { st.slideV = 0; st.slide += (want - st.slide) * Math.min(1, dt * 30); }
      else { st.slideV += -st.slide * 900 * dt; st.slideV *= Math.exp(-14 * dt); st.slide += st.slideV * dt; }
      if (st.slide > .27 && !st.pulled) { st.pulled = true; st.w += .35; ud.onPull && ud.onPull(); }
      if (st.slide < .08) st.pulled = false;
      st.w += (-9 * Math.sin(st.th) + torque) * dt; st.w *= Math.exp(-1.1 * dt); st.th = THREE.MathUtils.clamp(st.th + st.w * dt, -.55, .55);
      pend.rotation.z = st.th; pend.rotation.x = Math.sin(t * .7) * .03;
      // corrente
      const a0 = A.clone(); a0.y -= st.slide;
      const g = -16 * dt * dt;
      for (let i = 1; i < N; i++) { const p = pts[i], q = prv[i]; const vx = (p.x - q.x) * .985, vy = (p.y - q.y) * .985, vz = (p.z - q.z) * .9; q.copy(p); p.x += vx; p.y += vy + g; p.z += vz; }
      let pin = null;
      if (target) { const dd = target.clone().sub(a0); const m = dd.length(); if (m > chainLen) dd.multiplyScalar(chainLen / m); pin = a0.clone().add(dd); }
      for (let it = 0; it < 16; it++) {
        pts[0].copy(a0); if (pin) pts[N - 1].copy(pin);
        for (let i = 0; i < N - 1; i++) {
          const p = pts[i], q = pts[i + 1]; _t.subVectors(q, p); const d = _t.length() || 1e-5, diff = (d - SEG) / d;
          const wa = i === 0 ? 0 : .5, wb = i === 0 ? 1 : (pin && i + 1 === N - 1 ? 0 : .5), sw = (wa + wb) || 1;
          p.addScaledVector(_t, diff * wa / sw); q.addScaledVector(_t, -diff * wb / sw);
        }
      }
      pts[0].copy(a0); if (pin) pts[N - 1].copy(pin);
      for (let i = 0; i < N; i++) { _m.compose(pts[i], _q.identity(), _s.set(1, 1, 1)); balls.setMatrixAt(i, _m); }
      balls.instanceMatrix.needsUpdate = true;
      bead.position.copy(pts[N - 1]); _dir.subVectors(pts[N - 1], pts[N - 2]).normalize(); bead.quaternion.setFromUnitVectors(DOWN, _dir);
      bead.rotateY(Math.PI / 2);
      // luz: tremida ao acender, brasa laranja ao apagar
      if (st.flick >= 0) { st.flick += dt; st.lit = lerpKeys(FL_ON, st.flick); if (st.flick > .3) st.flick = -1; }
      else st.lit += (st.target - st.lit) * Math.min(1, dt * (st.target > st.lit ? 10 : 2.4));
      const l = st.lit, hum = 1 + Math.sin(t * 50) * .012 * l;
      filMat.emissive.copy(cLow).lerp(cHigh, Math.min(1, l * 1.3)); filMat.emissiveIntensity = (l < .015 ? 0 : .8 + l * 7) * hum;
      core.material.opacity = l * .5 * hum; halo.material.opacity = Math.min(1, l * 1.1) * hum; halo.scale.setScalar(2.6 + l * 1.6);
      bulbLight.intensity = l * 9;
    }
  };
  return root;
}

return { COL, glassMat, makeHelix, makeRing, makePills, makeBugs, makeCells, makeHeart, makeLamp };
};
})();
