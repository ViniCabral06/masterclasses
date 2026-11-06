/* Camada viva das masterclasses: fundo 3D interativo, botão de efeitos, volta ao hub
   e (em TH IV) o monitor com coração anatômico sincronizado aos sons. */
(function () {
const html = document.documentElement, K = html.dataset.vidro;
const SELF = (document.currentScript && document.currentScript.src) || location.href;
const BASE = new URL('.', SELF);                       // pasta _tema
let LIB = null;
function lib() {
  if (!LIB) LIB = import('three').then(THREE => { const M = window.VidroModelos(THREE); const { createStage } = window.VidroPalco(THREE, M.COL); return [{ createStage }, M]; });
  return LIB;
}
const HUB = new URL('../index.html#p4', BASE).href;
const store = { get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (_) { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) { } } };

/* ---------- estrutura ---------- */
const bg = document.createElement('div'); bg.id = 'vidro-bg'; bg.setAttribute('aria-hidden', 'true');
bg.innerHTML = '<div class="au a"></div><div class="au b"></div><div class="au c"></div><canvas></canvas>';
document.body.prepend(bg);

const fx = document.createElement('button'); fx.id = 'vidro-fx'; fx.type = 'button';
const setFxLabel = () => { const calm = html.classList.contains('vidro-calmo'); fx.innerHTML = `<i></i>${calm ? 'Efeitos desligados' : 'Efeitos 3D'}`; fx.title = calm ? 'Ligar o fundo 3D' : 'Desligar o fundo 3D (economiza bateria)'; };
if (store.get('vidro-calmo', false)) html.classList.add('vidro-calmo');
setFxLabel(); document.body.append(fx);

const home = document.createElement('a'); home.id = 'vidro-home'; home.href = HUB; home.innerHTML = '← Todas as masterclasses';
document.body.append(home);

/* ---------- scroll (qualquer elemento que role) ---------- */
let scrollAcc = 0, sTotal = 0; const lastTop = new WeakMap();
addEventListener('scroll', e => {
  const el = e.target === document ? document.scrollingElement : e.target; if (!el || el.scrollTop == null) return;
  const y = el.scrollTop, p = lastTop.get(el); lastTop.set(el, y);
  if (p != null) { const d = y - p; if (Math.abs(d) < 3000) { scrollAcc += d; sTotal += d; } }
}, { passive: true, capture: true });

/* ---------- 3D ---------- */
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const small = innerWidth < 860;
let stage = null;
async function startBg() {
  if (stage || html.classList.contains('vidro-calmo') || reduce) return;
  try {
    const [{ createStage }, M] = await lib();
    const canvas = bg.querySelector('canvas');
    stage = await createStage(canvas, { cheap: true, bloom: false, fps: 30, dust: small ? 0 : 260, dpr: 1, fog: .03, alpha: true, exposure: 1 });
    const model = K === 'farmaco' ? M.makePills({ cheap: true }) : K === 'micro' ? M.makeBugs({ cheap: true }) : M.makeCells({ cheap: true, n: 15, span: 5.5, size: .62 });
    stage.world.add(model);
    // com a luz acesa (tema claro) o vidro dos modelos brilha
    const mats = new Set(); model.traverse(o => { if (o.material) [].concat(o.material).forEach(m => m.emissive && mats.add(m)); });
    let glow = isLight() ? 1 : 0;
    const applyGlow = () => mats.forEach(m => { m.emissive.copy(m.color); m.emissiveIntensity = glow * .55; });
    applyGlow();
    stage.l1.color.set(M.COL[K] || M.COL.hub);
    stage.onResize = w => { const wide = w > 1100; stage.world.position.set(wide ? 4.6 : 0, wide ? -.6 : 0, wide ? -1.5 : -6); stage.world.scale.setScalar(wide ? .8 : .7); };
    stage.resize();
    stage.frame.push((t, dt) => {
      const gT = isLight() ? 1 : 0; if (Math.abs(gT - glow) > .003) { glow += (gT - glow) * Math.min(1, dt * 3); applyGlow(); }
      // scroll: velocidade empurra as peças, posição gira o conjunto
      const tv = Math.max(-14, Math.min(14, scrollAcc / Math.max(dt, .016) / 140)); scrollAcc = 0;
      stage.I.sv = (stage.I.sv || 0) + (tv - (stage.I.sv || 0)) * .25;
      model.userData.tick(t, dt, stage.I);
      stage.world.rotation.y += (stage.I.mx * .3 + sTotal * .0009 - stage.world.rotation.y) * .05;
      stage.world.rotation.z += (-stage.I.sv * .012 - stage.world.rotation.z) * .08;
      stage.world.rotation.x += (stage.I.my * .2 - stage.world.rotation.x) * .04;
    });
    requestAnimationFrame(() => bg.classList.add('on'));
    // enquanto rola a página, o fundo quase some para não disputar a leitura
    let tm = 0; addEventListener('scroll', () => { if (Math.abs(stage.I.sv || 0) < 4) return; bg.classList.add('lendo'); clearTimeout(tm); tm = setTimeout(() => bg.classList.remove('lendo'), 700); }, { passive: true, capture: true });
  } catch (e) { console.warn('[vidro] fundo 3D indisponível', e); }
}
fx.addEventListener('click', () => {
  const calm = !html.classList.contains('vidro-calmo');
  html.classList.toggle('vidro-calmo', calm); store.set('vidro-calmo', calm); setFxLabel();
  if (stage) stage.running = !calm; else if (!calm) startBg();
});

/* ---------- monitor cardíaco (TH IV) ---------- */
async function heartMonitor() {
  const box = document.createElement('div'); box.id = 'vidro-heart';
  box.innerHTML = `<span class="vh-sync">♥ sincronizado</span><button class="vh-min" type="button" aria-label="Minimizar">–</button><canvas aria-label="Coração 3D: arraste para girar, clique para um batimento"></canvas>
    <div class="vh-bar"><div class="vh-bpm"><span>68</span><small>bpm</small></div><div class="vh-txt">Arraste para girar. Toque um som cardíaco e ele bate junto.</div></div>`;
  document.body.append(box);
  const cv = box.querySelector('canvas'), bpmEl = box.querySelector('.vh-bpm span'), txt = box.querySelector('.vh-txt');
  if (store.get('vidro-heart-min', false)) box.classList.add('min');
  box.querySelector('.vh-min').addEventListener('click', e => { e.stopPropagation(); box.classList.add('min'); store.set('vidro-heart-min', true); });
  box.addEventListener('click', () => {
    if (box.classList.contains('min')) { box.classList.remove('min'); store.set('vidro-heart-min', false); setTimeout(() => S && S.resize(), 520); }
    if (innerWidth < 860) box.classList.toggle('open');
  });

  // som atual: intercepta play() para saber qual áudio está tocando
  let cur = null;
  const op = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function () { cur = this; return op.apply(this, arguments); };
  const HEART = /aortica|mitral|bulhas|pericardico|tricusp|b3|b4|sopro|cardi/i;
  const NAMES = { 'bulhas-normais': 'Bulhas normais', 'estenose-aortica': 'Estenose aórtica', 'estenose-mitral': 'Estenose mitral', 'insuficiencia-aortica': 'Insuficiência aórtica', 'insuficiencia-mitral': 'Insuficiência mitral', 'atrito-pericardico': 'Atrito pericárdico' };
  const keyOf = a => { try { return decodeURIComponent(new URL(a.currentSrc || a.src, location.href).pathname.split('/').pop().replace(/\.mp3$/i, '')); } catch (_) { return ''; } };
  let env = 0;
  function drive() {
    if (!cur || cur.paused || cur.ended) return null;
    const k = keyOf(cur); if (!HEART.test(k)) return null;
    const W = (window.WAVES || {})[k]; if (!W || !W.e) return null;
    const D = W.d || cur.duration || 1, q = ((cur.currentTime % D) + D) % D * 100, i = Math.floor(q), f = q - i, e = W.e;
    const v = ((e[Math.min(i, e.length - 1)] || 0) * (1 - f) + (e[Math.min(i + 1, e.length - 1)] || 0) * f) / 100;
    env = Math.max(v, env * .82);
    return Math.min(1, env * 1.6);
  }

  let S = null;
  try {
    const [{ createStage }, M] = await lib();
    S = await createStage(cv, { cheap: false, bloom: true, fps: 60, dust: 160, dpr: 2, fog: 0, alpha: false, background: 0x070b10, exposure: 1, listen: false });
    S.camera.position.set(0, .3, 7.4); S.camera.fov = 34; S.camera.updateProjectionMatrix();
    if (S.bloom) { S.bloom.strength = .7; S.bloom.threshold = .3; }
    const heart = M.makeHeart({ cheap: false, scale: .95 }); S.world.add(heart); heart.position.y = -.25;
    heart.userData.setDrive(drive);
    S.l1.color.set(0xff4d6d); S.l1.position.set(3, 2, 4);
    // ponteiro local ao canvas (o palco usa a janela inteira; aqui o coração só reage quando o mouse está no monitor)
    let over = false, drag = null;
    cv.addEventListener('pointerenter', () => over = true); cv.addEventListener('pointerleave', () => { over = false; });
    cv.addEventListener('pointermove', e => {
      const r = cv.getBoundingClientRect(); S.I.ndc.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); S.poke();
      if (drag) { const st = heart.userData.state; st.userYaw += (e.clientX - drag.x) * .012; st.userPitch = Math.max(-.8, Math.min(.8, st.userPitch + (e.clientY - drag.y) * .008)); drag = { x: e.clientX, y: e.clientY }; drag.moved = true; }
    });
    cv.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY }; cv.setPointerCapture(e.pointerId); });
    cv.addEventListener('pointerup', () => { drag = null; });
    const P = { world: S.I.world, has: false, vx: 0, vy: 0, speed: 0, clicks: 0 };
    cv.addEventListener('click', () => { if (!box.classList.contains('min')) P.clicks++; });
    let lastBpm = 0, lastSync = null;
    S.frame.push((t, dt) => {
      P.has = over && !box.classList.contains('min'); P.world = S.I.world;
      heart.userData.tick(t, dt, P);
      const st = heart.userData.state;
      const shown = st.synced ? '♥' : Math.round(st.bpm);
      if (shown !== lastBpm) { bpmEl.textContent = shown; lastBpm = shown; }
      if (st.synced !== lastSync) {
        lastSync = st.synced; box.classList.toggle('sync', !!st.synced);
        const k = cur ? keyOf(cur) : '';
        txt.innerHTML = st.synced ? `Batendo com <b>${NAMES[k] || k.replace(/-/g, ' ')}</b>` : 'Arraste para girar. Toque um som cardíaco e ele bate junto.';
      }
    });
    new ResizeObserver(() => S.resize()).observe(cv);
  } catch (e) { console.warn('[vidro] coração 3D indisponível', e); box.remove(); }
}


/* ---------- lâmpada de cordinha: aparece perto do botão de tema, puxar acende/apaga ---------- */
const THEME_SEL = '[data-act="theme"],#btnTheme,.themebtn';
const isLight = () => html.dataset.theme === 'light';
function themeBtn() {
  const all = [...document.querySelectorAll(THEME_SEL)].filter(b => { const r = b.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight; });
  return all[0] || null;
}
let lampMine = false;
async function lampInit() {
  const wrap = document.createElement('div'); wrap.id = 'vidro-lamp'; wrap.setAttribute('aria-hidden', 'true'); wrap.innerHTML = '<canvas></canvas>';
  const flash = document.createElement('div'); flash.id = 'vidro-flash'; flash.setAttribute('aria-hidden', 'true');
  document.body.append(wrap, flash);
  const cv = wrap.querySelector('canvas');
  let S, lamp, THREE;
  try {
    const [{ createStage }, M] = await lib(); THREE = await import('three');
    S = await createStage(cv, { cheap: false, bloom: false, fps: 60, dust: 0, dpr: 2, fog: 0, alpha: true, exposure: 1.05, listen: false });
    S.camera.position.set(0, 0, 10.2); S.camera.fov = 38; S.camera.updateProjectionMatrix();
    S.l1.color.set(0xffffff); S.l1.intensity = 26; S.l1.position.set(3, 1, 5);
    lamp = M.makeLamp({ accent: M.COL[K] }); lamp.position.y = 3.62; S.world.add(lamp);
    lamp.userData.setLit(isLight() ? 1 : 0, true);
  } catch (e) { console.warn('[vidro] lâmpada indisponível', e); wrap.remove(); flash.remove(); return; }
  const ud = lamp.userData, P = { world: S.I.world, has: false, vx: 0 };
  S.running = false;

  // posição: a corrente cai logo abaixo do botão
  let btn = null, shown = false, hideT = 0, dragging = false, busy = false, px = 0, py = 0, lastPx = 0;
  const place = () => { btn = themeBtn(); if (!btn) return; const r = btn.getBoundingClientRect(); const cx = r.left + r.width / 2 - 42; wrap.style.left = Math.max(-40, Math.min(innerWidth - 260, cx - 150)) + 'px'; };
  const show = () => { clearTimeout(hideT); if (shown) return; place(); shown = true; S.running = true; wrap.classList.add('on'); ud.kick((Math.random() < .5 ? -1 : 1) * 1.1); };
  const hideSoon = (ms = 1400) => { clearTimeout(hideT); hideT = setTimeout(() => { if (dragging || busy) return hideSoon(600); shown = false; wrap.classList.remove('on'); html.classList.remove('vl-grab'); setTimeout(() => { if (!shown) S.running = false; }, 1000); }, ms); };
  const v3 = new THREE.Vector3();
  const toScreen = w => { const r = cv.getBoundingClientRect(); w.project(S.camera); return [r.left + (w.x + 1) / 2 * r.width, r.top + (1 - w.y) / 2 * r.height]; };
  const setNdc = (x, y) => { const r = cv.getBoundingClientRect(); S.I.ndc.set((x - r.left) / r.width * 2 - 1, -((y - r.top) / r.height) * 2 + 1); S.poke(); };
  const beadDist = (x, y) => { const [bx, by] = toScreen(ud.beadWorld(v3)); return Math.hypot(x - bx, y - by); };

  addEventListener('pointermove', e => {
    px = e.clientX; py = e.clientY;
    const b = btn && btn.isConnected ? btn : themeBtn(); if (!b) return;
    const r = b.getBoundingClientRect(), d = Math.hypot(px - (r.left + r.width / 2), py - (r.top + r.height / 2));
    const lr = wrap.getBoundingClientRect(), overLamp = shown && px > lr.left && px < lr.right && py < lr.top + 340;
    if (d < 160 || overLamp || dragging) show(); else if (shown) hideSoon();
    if (shown) {
      setNdc(px, py); P.has = true; P.vx = (px - lastPx) * .6;
      html.classList.toggle('vl-grab', !dragging && beadDist(px, py) < 30);
    }
    lastPx = px;
  }, { passive: true });
  addEventListener('pointerdown', e => {
    if (!shown || busy) return;
    if (beadDist(e.clientX, e.clientY) < 30) { e.preventDefault(); e.stopPropagation(); dragging = true; html.classList.add('vl-drag'); setNdc(e.clientX, e.clientY); ud.st.drag = S.I.world; }
  }, { capture: true });
  const endDrag = () => { if (!dragging) return; dragging = false; ud.st.drag = null; html.classList.remove('vl-drag'); hideSoon(2200); };
  addEventListener('pointerup', endDrag, true); addEventListener('pointercancel', endDrag, true);
  // clique no botão (ou toque/teclado): a lâmpada desce e a cordinha é puxada sozinha
  document.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest(THEME_SEL); if (!b || lampMine) return;
    e.preventDefault(); e.stopImmediatePropagation(); btn = b;
    if (reduce) { flip(); return; }
    const was = shown; show(); setTimeout(() => ud.autoPull(), was ? 0 : 520); hideSoon(3200);
  }, true);
  ud.onPull = () => { clickSound(); flip(); };

  // a troca em si: o próprio botão da masterclass aplica o tema; a revelação sai da lâmpada
  function switchTheme() {
    const sv = document.startViewTransition, had = 'startViewTransition' in document;
    document.startViewTransition = f => { f && f(); const p = Promise.resolve(); return { ready: new Promise(() => { }), finished: p, updateCallbackDone: p, skipTransition() { } }; };
    lampMine = true;
    try { (btn && btn.isConnected ? btn : themeBtn()).click(); } finally { lampMine = false; if (had) document.startViewTransition = sv; else delete document.startViewTransition; }
  }
  function flip() {
    if (busy) return; busy = true;
    const toLight = !isLight();
    S.frame.forEach(f => f(0, 0)); S.renderer.render(S.scene, S.camera);
    const [x, y] = toScreen(ud.bulbWorld(v3));
    const R = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y)) + 40;
    html.style.setProperty('--vt-x', x + 'px'); html.style.setProperty('--vt-y', y + 'px'); html.style.setProperty('--vt-r', R + 'px');
    const real = !reduce && document.startViewTransition ? document.startViewTransition.bind(document) : null;
    const done = () => { html.classList.remove('vl-acende', 'vl-apaga'); busy = false; };
    if (!real) { switchTheme(); ud.setLit(toLight ? 1 : 0); done(); return; }
    const run = () => {
      html.classList.add(toLight ? 'vl-acende' : 'vl-apaga');
      const vt = real(switchTheme);
      vt.ready.then(() => {
        const dur = toLight ? 1150 : 950, ease = toLight ? 'cubic-bezier(.22,.7,.12,1)' : 'cubic-bezier(.75,0,.35,1)';
        const big = `circle(${R}px at ${x}px ${y}px)`, small = `circle(0px at ${x}px ${y}px)`;
        html.animate({ clipPath: toLight ? [small, big] : [big, small] }, { duration: dur, easing: ease, fill: 'both', pseudoElement: toLight ? '::view-transition-new(root)' : '::view-transition-old(root)' });
        // anel de luz acompanha a borda do círculo
        const half = R / .975;
        Object.assign(flash.style, { width: half * 2 + 'px', height: half * 2 + 'px', left: x - half + 'px', top: y - half + 'px' });
        flash.animate(toLight
          ? [{ transform: 'scale(0)', opacity: 1 }, { opacity: 1, offset: .65 }, { transform: 'scale(1)', opacity: 0 }]
          : [{ transform: 'scale(1)', opacity: 0 }, { opacity: .9, offset: .25 }, { opacity: 1, offset: .85 }, { transform: 'scale(0)', opacity: 0 }],
          { duration: dur, easing: ease, fill: 'none' });
        if (!toLight) setTimeout(() => ud.setLit(0), dur * .82);
      }).catch(() => { });
      vt.finished.finally(done);
    };
    if (toLight) { ud.flickerOn(); setTimeout(run, 300); } else run();
  }
  // tema mudou por outro caminho (outra aba, atalho): só acompanha
  new MutationObserver(() => { if (!busy) ud.setLit(isLight() ? 1 : 0); }).observe(html, { attributes: true, attributeFilter: ['data-theme'] });

  S.frame.push((t, dt) => { if (!dt) return; P.world = S.I.world; ud.tick(t, dt, P); P.vx *= .8; });
  addEventListener('resize', () => shown && place());
}
let AC = null;
function clickSound() {
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    const t = AC.currentTime, n = AC.sampleRate * .05, buf = AC.createBuffer(1, n, AC.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 6);
    const src = AC.createBufferSource(); src.buffer = buf;
    const bp = AC.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2400; bp.Q.value = 1.4;
    const g = AC.createGain(); g.gain.setValueAtTime(.5, t); g.gain.exponentialRampToValueAtTime(.001, t + .06);
    src.connect(bp).connect(g).connect(AC.destination); src.start(t);
    const o = AC.createOscillator(), og = AC.createGain(); o.frequency.setValueAtTime(1800, t); o.frequency.exponentialRampToValueAtTime(600, t + .04);
    og.gain.setValueAtTime(.08, t); og.gain.exponentialRampToValueAtTime(.001, t + .05); o.connect(og).connect(AC.destination); o.start(t); o.stop(t + .06);
  } catch (_) { }
}

/* ---------- início ---------- */
const go = () => { startBg(); if (K === 'th4') heartMonitor(); (window.requestIdleCallback || (f => setTimeout(f, 1)))(() => setTimeout(lampInit, 900), { timeout: 2500 }); };
if (html.classList.contains('vidro-ready')) go(); else {
  const mo = new MutationObserver(() => { if (html.classList.contains('vidro-ready')) { mo.disconnect(); go(); } });
  mo.observe(html, { attributes: true, attributeFilter: ['class'] });
}
})();
