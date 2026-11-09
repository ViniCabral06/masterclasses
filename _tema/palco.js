/* Palco 3D compartilhado: renderer, luzes, poeira, ponteiro projetado no plano do modelo. */
(function () {
window.VidroPalco = function (THREE, COL) {

async function createStage(canvas, { cheap = false, bloom = true, fps = 60, dust = 1800, exposure = .9, dpr = 1.75, fog = .045, background = 0x04070b, alpha = false, listen = true, start = true } = {}) {
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

  const W = { poke: () => { moved = true; idle = 0; }, scene, camera, renderer, world, I, composer, bloom: bloomPass, l1, dust: points, frame: [], running: start };
  function resize() {
    const w = canvas.clientWidth || innerWidth, h = canvas.clientHeight || innerHeight;
    renderer.setSize(w, h, false); composer && composer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix();
    W.onResize && W.onResize(w, h);
  }
  /* aquecer: compila todos os shaders (em paralelo, sem travar a página, onde o navegador deixa) e
     desenha um quadro com tudo visível, para as geometrias subirem para a placa de vídeo.
     Sem isso, cada modelo trava a página na primeira vez que aparece. Chame com o palco parado
     (start:false) e ligue running depois. */
  W.aquecer = async () => {
    const escondidos = []; scene.traverse(o => { if (!o.visible) { escondidos.push(o); o.visible = true; } });
    try {
      if (renderer.compileAsync) {
        // A mesma cena usa versões diferentes dos shaders conforme o destino:
        // - na tela (com tone mapping), quando não há bloom;
        // - numa textura (sem tone mapping, cor linear), quando há bloom (a cena é desenhada antes
        //   numa textura) ou vidro com transmissão (que redesenha a cena numa textura à parte).
        // O compile só cobre o destino atual, então compila para cada destino que vai ser usado.
        let vidro = false; scene.traverse(o => { if (o.material) [].concat(o.material).forEach(m => { if (m.transmission > 0) vidro = true; }); });
        const rt = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType }), antes = renderer.getRenderTarget();
        const emTextura = async alvo => { renderer.setRenderTarget(rt); try { await renderer.compileAsync(alvo, camera); } finally { renderer.setRenderTarget(antes); } };
        try {
          if (!W.composer) await renderer.compileAsync(scene, camera);
          if (W.composer || vidro) await emTextura(scene);
          // o vidro de dois lados é desenhado também pelo avesso (BackSide) no passo de transmissão
          if (vidro) {
            const avesso = []; scene.traverse(o => { if (o.material) [].concat(o.material).forEach(m => { if (m.transmission > 0 && m.side === THREE.DoubleSide) avesso.push(m); }); });
            if (avesso.length) { avesso.forEach(m => { m.side = THREE.BackSide; m.needsUpdate = true; }); try { await emTextura(scene); } finally { avesso.forEach(m => { m.side = THREE.DoubleSide; m.needsUpdate = true; }); } }
          }
          // shaders do bloom (quadros de tela cheia que não estão na cena)
          if (W.composer && bloomPass) {
            const pos = new THREE.Scene(), geo = new THREE.PlaneGeometry(2, 2), tela = new THREE.Scene();
            [bloomPass.materialHighPassFilter, ...(bloomPass.separableBlurMaterials || []), bloomPass.compositeMaterial, bloomPass.blendMaterial, bloomPass.basic]
              .filter(Boolean).forEach(m => pos.add(new THREE.Mesh(geo, m)));
            await emTextura(pos);
            // a última passada (saída) vai para a tela; ela só põe os defines no primeiro render, então põe aqui
            const ult = W.composer.passes[W.composer.passes.length - 1];
            if (ult && ult.material) {
              if ('_toneMapping' in ult && ult._toneMapping !== renderer.toneMapping) {
                ult._outputColorSpace = renderer.outputColorSpace; ult._toneMapping = renderer.toneMapping;
                const d = ult.material.defines = {};
                if (THREE.ColorManagement.getTransfer(renderer.outputColorSpace) === THREE.SRGBTransfer) d.SRGB_TRANSFER = '';
                if (renderer.toneMapping === THREE.ACESFilmicToneMapping) d.ACES_FILMIC_TONE_MAPPING = '';
                ult.material.needsUpdate = true;
              }
              tela.add(new THREE.Mesh(geo, ult.material));
            }
            if (tela.children.length) await renderer.compileAsync(tela, camera);
            geo.dispose();
          }
        } finally { rt.dispose(); }
      } else renderer.compile(scene, camera);
    } catch (_) { try { renderer.compile(scene, camera); } catch (_) { } }
    W.composer ? W.composer.render() : renderer.render(scene, camera);
    escondidos.forEach(o => { o.visible = false; });
  };
  W.resize = resize; addEventListener('resize', resize); resize();

  const clock = new THREE.Clock(); let t = 0, acc = 0, minDt = 1 / fps;
  // qualidade adaptativa: se o aparelho não acompanha, baixa resolução, tira o bloom e cai para 30 fps
  let ema = minDt, slowFor = 0, level = 0;
  const degrade = () => {
    level++;
    if (level === 1 && renderer.getPixelRatio() > 1) { renderer.setPixelRatio(1); resize(); }
    else if (level <= 2 && composer) { composer = null; W.composer = null; level = 2; }
    else if (minDt < 1 / 31) { minDt = 1 / 30; level = 3; }
    else { level = 4; W.onSlow && W.onSlow(); }
    W.onDegrade && W.onDegrade(level);
  };
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function loop() {
    requestAnimationFrame(loop);
    if (!W.running || document.hidden || (!W.semPausa && document.documentElement.classList.contains('vl-pausa'))) { clock.getDelta(); return; }
    acc += clock.getDelta(); if (acc < minDt * .98) return;
    const raw = acc, dt = Math.min(acc, .05); acc = 0; t += reduce ? dt * .15 : dt;
    if (t > 2.5 && level < 4 && raw < .5) {
      ema += (raw - ema) * .08;
      if (ema > minDt * 1.55 + .004) { if ((slowFor += raw) > 1.6) { slowFor = 0; ema = minDt; degrade(); } } else slowFor = Math.max(0, slowFor - raw * .5);
    }
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
