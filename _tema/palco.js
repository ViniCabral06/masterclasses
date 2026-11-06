/* Palco 3D compartilhado: renderer, luzes, poeira, ponteiro projetado no plano do modelo. */
(function () {
window.VidroPalco = function (THREE, COL) {

async function createStage(canvas, { cheap = false, bloom = true, fps = 60, dust = 1800, exposure = .9, dpr = 1.75, fog = .045, background = 0x04070b, alpha = false, listen = true } = {}) {
  const { RoomEnvironment } = await import('three/addons/environments/RoomEnvironment.js');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !cheap, alpha, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, dpr));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = exposure;
  const scene = new THREE.Scene();
  if (!alpha) scene.background = new THREE.Color(background);
  if (fog) scene.fog = new THREE.FogExp2(background, fog);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), .04).texture;
  const camera = new THREE.PerspectiveCamera(38, 1, .1, 100); camera.position.set(0, 0, 12);
  scene.add(new THREE.AmbientLight(0xffffff, .25));
  const l1 = new THREE.PointLight(COL.hub, 40, 30); l1.position.set(4, 3, 4); scene.add(l1);
  const l2 = new THREE.PointLight(COL.farmaco, 30, 30); l2.position.set(-4, -3, 2); scene.add(l2);
  const l3 = new THREE.PointLight(COL.micro, 30, 30); l3.position.set(0, 4, -4); scene.add(l3);
  const world = new THREE.Group(); scene.add(world);

  let points = null;
  if (dust) {
    const pg = new THREE.BufferGeometry(), pp = new Float32Array(dust * 3), pc = new Float32Array(dust * 3);
    const pcols = [COL.hub, COL.farmaco, COL.micro, COL.th4, 0xffffff].map(c => new THREE.Color(c));
    for (let i = 0; i < dust; i++) { pp[i * 3] = (Math.random() - .5) * 30; pp[i * 3 + 1] = (Math.random() - .5) * 20; pp[i * 3 + 2] = (Math.random() - .5) * 20 - 4; const c = pcols[i % 5]; pc.set([c.r, c.g, c.b], i * 3); }
    pg.setAttribute('position', new THREE.BufferAttribute(pp, 3)); pg.setAttribute('color', new THREE.BufferAttribute(pc, 3));
    points = new THREE.Points(pg, new THREE.PointsMaterial({ size: .05, vertexColors: true, transparent: true, opacity: .8, blending: THREE.AdditiveBlending, depthWrite: false }));
    scene.add(points);
  }

  let composer = null, bloomPass = null;
  if (bloom) {
    const [{ EffectComposer }, { RenderPass }, { UnrealBloomPass }, { OutputPass }] = await Promise.all([
      import('three/addons/postprocessing/EffectComposer.js'), import('three/addons/postprocessing/RenderPass.js'),
      import('three/addons/postprocessing/UnrealBloomPass.js'), import('three/addons/postprocessing/OutputPass.js')]);
    composer = new EffectComposer(renderer); composer.addPass(new RenderPass(scene, camera));
    bloomPass = new UnrealBloomPass(new THREE.Vector2(1, 1), .55, .5, .42); composer.addPass(bloomPass); composer.addPass(new OutputPass());
  }

  /* ponteiro */
  const I = { world: new THREE.Vector3(), has: false, vx: 0, vy: 0, speed: 0, clicks: 0, ndc: new THREE.Vector2(), mx: 0, my: 0 };
  const ray = new THREE.Raycaster(), plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), prev = new THREE.Vector3(); let moved = false, idle = 0;
  if (listen) addEventListener('pointermove', e => { I.ndc.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); I.mx = e.clientX / innerWidth - .5; I.my = e.clientY / innerHeight - .5; moved = true; idle = 0; }, { passive: true });
  if (listen) addEventListener('pointerdown', () => { I.clicks++; }, { passive: true });
  document.addEventListener('pointerleave', () => { I.has = false; });
  addEventListener('blur', () => { I.has = false; });

  const W = { poke: () => { moved = true; idle = 0; }, scene, camera, renderer, world, I, composer, bloom: bloomPass, l1, dust: points, frame: [], running: true };
  function resize() {
    const w = canvas.clientWidth || innerWidth, h = canvas.clientHeight || innerHeight;
    renderer.setSize(w, h, false); composer && composer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix();
    W.onResize && W.onResize(w, h);
  }
  W.resize = resize; addEventListener('resize', resize); resize();

  const clock = new THREE.Clock(); let t = 0, acc = 0; const minDt = 1 / fps;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function loop() {
    requestAnimationFrame(loop);
    if (!W.running || document.hidden) { clock.getDelta(); return; }
    acc += clock.getDelta(); if (acc < minDt * .98) return;
    const dt = Math.min(acc, .05); acc = 0; t += reduce ? dt * .15 : dt;
    // ponteiro no plano que passa pelo centro do mundo
    if (moved || I.has) {
      plane.constant = -world.position.z; ray.setFromCamera(I.ndc, camera);
      prev.copy(I.world);
      if (ray.ray.intersectPlane(plane, I.world)) {
        if (!I.has) { prev.copy(I.world); I.has = true; }
        const vx = (I.world.x - prev.x) / dt, vy = (I.world.y - prev.y) / dt;
        I.vx += (vx - I.vx) * .35; I.vy += (vy - I.vy) * .35; I.speed = Math.hypot(I.vx, I.vy);
      }
      moved = false; idle += dt; if (idle > .12) { I.vx *= .85; I.vy *= .85; I.speed = Math.hypot(I.vx, I.vy); }
    }
    if (points) { points.rotation.y = t * .02; points.position.y = Math.sin(t * .2) * .3; }
    W.frame.forEach(f => f(t, dt));
    composer ? composer.render() : renderer.render(scene, camera);
  }
  loop();
  return W;
}

return { createStage };
};
})();
