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
    stage.l1.color.set(M.COL[K] || M.COL.hub);
    stage.onResize = w => { const wide = w > 1100; stage.world.position.set(wide ? 4.6 : 0, wide ? -.6 : 0, wide ? -1.5 : -6); stage.world.scale.setScalar(wide ? .8 : .7); };
    stage.resize();
    stage.frame.push((t, dt) => {
      model.userData.tick(t, dt, stage.I);
      stage.world.rotation.y += (stage.I.mx * .3 - stage.world.rotation.y) * .04;
      stage.world.rotation.x += (stage.I.my * .2 - stage.world.rotation.x) * .04;
    });
    requestAnimationFrame(() => bg.classList.add('on'));
    // enquanto rola a página, o fundo quase some para não disputar a leitura
    let tm = 0; addEventListener('scroll', () => { bg.classList.add('lendo'); clearTimeout(tm); tm = setTimeout(() => bg.classList.remove('lendo'), 900); }, { passive: true, capture: true });
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

/* ---------- início ---------- */
const go = () => { startBg(); if (K === 'th4') heartMonitor(); };
if (html.classList.contains('vidro-ready')) go(); else {
  const mo = new MutationObserver(() => { if (html.classList.contains('vidro-ready')) { mo.disconnect(); go(); } });
  mo.observe(html, { attributes: true, attributeFilter: ['class'] });
}
})();
