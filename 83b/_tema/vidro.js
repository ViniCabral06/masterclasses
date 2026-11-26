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

/* lembra onde a pessoa parou (o hash do master); o <head> restaura na próxima visita */
if (!html.classList.contains('vidro-aula')) {
  const h0 = location.hash; // na primeira visita só guarda depois que a pessoa sair do ponto inicial
  const savePos = () => { const h = location.hash; if (window.VIDRO_NOVO && h === h0) return; window.VIDRO_NOVO = false; if (h && h.length > 1) try { localStorage.setItem('vidro-pos:' + location.pathname, h); } catch (_) { } };
  addEventListener('hashchange', savePos); addEventListener('pagehide', savePos);
  document.addEventListener('visibilitychange', () => document.hidden && savePos());
  setInterval(savePos, 5000);
}

/* ---------- estrutura ---------- */
const bg = document.createElement('div'); bg.id = 'vidro-bg'; bg.setAttribute('aria-hidden', 'true');
bg.innerHTML = '<div class="au a"></div><div class="au b"></div><div class="au c"></div><canvas></canvas>';
document.body.prepend(bg);

const fx = document.createElement('button'); fx.id = 'vidro-fx'; fx.type = 'button';
fx.setAttribute('aria-haspopup', 'dialog'); fx.setAttribute('aria-expanded', 'false');
fx.innerHTML = '<i></i>Personalização'; fx.title = 'Personalização: tema, fundo, cor e efeitos';
const setFxLabel = () => { const sw = document.getElementById('vp-fx'); if (sw) sw.setAttribute('aria-checked', String(!html.classList.contains('vidro-calmo'))); };
/* preferências de aparência (valem para todos os masters): fundo liso ou degradê e cor de destaque */
const lerTexto = (k) => { const v = store.get(k, null); return typeof v === 'string' ? v : null; };
function aplicarPrefs() {
  const f = lerTexto('vidro-fundo'); html.classList.toggle('vg-liso', f === 'liso' || f === 'creme'); html.classList.toggle('vg-creme', f === 'creme' || lerTexto('vidro-liso-claro') === 'creme'); html.classList.toggle('vg-puro', lerTexto('vidro-liso-escuro') === 'puro');
  const c = lerTexto('vidro-cor'), ok = c && /^#[0-9a-f]{6}$/i.test(c);
  if (ok) {
    const n = parseInt(c.slice(1), 16), lum = (.299 * (n >> 16) + .587 * (n >> 8 & 255) + .114 * (n & 255)) / 255;
    html.style.setProperty('--vgc', c); html.style.setProperty('--vgc-on', lum > .6 ? '#10151b' : '#ffffff'); html.dataset.vgcor = c;
  } else { html.style.removeProperty('--vgc'); html.style.removeProperty('--vgc-on'); delete html.dataset.vgcor; }
  const fs = Number(store.get('vidro-fonte', 100));
  if (fs >= 85 && fs <= 135 && fs !== 100) { html.style.setProperty('--vg-fs', String(fs / 100)); html.dataset.vgfonte = String(fs); }
  else { html.style.removeProperty('--vg-fs'); delete html.dataset.vgfonte; }
  document.querySelectorAll('iframe').forEach(fr => { try { fr.contentWindow && fr.contentWindow.dispatchEvent(new Event('vg-prefs')); } catch (_) {} });
}
aplicarPrefs();
// aparelho modesto (celular, poucos núcleos ou pouca memória): começa sem o fundo 3D, a menos que a pessoa tenha ligado
const fraco = matchMedia('(pointer:coarse)').matches || (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4;
if (store.get('vidro-calmo', fraco)) html.classList.add('vidro-calmo');
if (fraco) html.classList.add('vidro-leve');
// PC que já se mostrou lento (medido em medirPC, abaixo) abre direto no modo leve,
// a menos que a pessoa tenha ligado os efeitos de propósito
const lento = store.get('vidro-lento', false);
if (lento) { html.classList.add('vidro-leve', 'vidro-semgpu'); if (store.get('vidro-calmo', null) === null) html.classList.add('vidro-calmo'); }
setFxLabel(); document.body.append(fx);

const home = document.createElement('a'); home.id = 'vidro-home'; home.href = HUB; home.innerHTML = '← Todas as masterclasses';
document.body.append(home);

/* botão "início" ao lado do botão de recolher a barra lateral (e do menu no celular).
   Os masters redesenham a barra às vezes, então ele é recolocado quando some. */
const HOME_ICO = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h5v-6h4v6h5V9.5"/></svg>';
// só ids e classes (buscas rápidas, mesmo em masters com dezenas de milhares de elementos)
const homeAlvos = () => {
  const l = ['sbCollapse', 'mBurger', 'bcol', 'btnCol', 'collapse'].map(i => document.getElementById(i));
  // padrão do LPII: #collapse na barra e #menu no topo do celular (só quando os dois existem, pois #menu aparece em outros masters)
  if (document.getElementById('collapse') && document.getElementById('menu')) l.push(document.getElementById('menu'));
  l.push(...document.getElementsByClassName('menu-btn'));
  const top = document.getElementById('top'); if (top) l.push(top.querySelector('[data-act="menu"]'));
  return l.filter(e => e && !e.classList.contains('vidro-inicio'));
};
function homeBtns() {
  let achou = false;
  homeAlvos().forEach(alvo => {
    // a pílula flutuante só some se algum botão da barra estiver de fato na tela (ex.: TH IV tem tela de entrada)
    if (alvo.getClientRects().length) achou = true;
    const prev = alvo.previousElementSibling;
    if (prev && prev.classList.contains('vidro-inicio')) return;
    const a = document.createElement('a');
    a.href = HUB; a.className = alvo.className + ' vidro-inicio';
    a.title = 'Todas as masterclasses'; a.setAttribute('aria-label', 'Voltar para todas as masterclasses');
    a.innerHTML = HOME_ICO;
    alvo.before(a);
    // vizinho sem classe (ex.: menu do celular): copia o visual dele
    if (!alvo.className) {
      const cs = getComputedStyle(alvo);
      ['width', 'height', 'background', 'border', 'borderRadius', 'color', 'boxShadow', 'margin'].forEach(p => { a.style[p] = cs[p]; });
      a.style.display = cs.display === 'none' ? 'none' : 'inline-grid';
    }
  });
  html.classList.toggle('vidro-home-na-barra', achou);
}
if (!html.classList.contains('vidro-aula')) {
  homeBtns();
  let homeT = 0;
  const homeLater = () => { if (!homeT) homeT = setTimeout(() => { homeT = 0; homeBtns(); }, 120); };
  new MutationObserver(homeLater).observe(document.body, { childList: true, subtree: true });
  addEventListener('resize', homeLater, { passive: true });
}

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
let stage = null, bgP = null;
// uma montagem por vez: a tela de carregamento e o início da página chamam juntas
function startBg() { if (stage) return Promise.resolve(); if (!bgP) bgP = montarBg().finally(() => { bgP = null; }); return bgP; }
async function montarBg() {
  if (stage || html.classList.contains('vidro-calmo') || reduce) return;
  try {
    const [{ createStage }, M] = await lib();
    const canvas = bg.querySelector('canvas');
    stage = await createStage(canvas, { cheap: true, bloom: false, fps: 30, dust: small ? 0 : 200, dpr: 1, fog: .03, alpha: true, exposure: 1, start: false });
    // se mesmo no mínimo o aparelho não acompanhar, o fundo 3D desliga sozinho (sem gravar a escolha)
    stage.onSlow = () => { html.classList.add('vidro-calmo'); stage.running = false; setFxLabel(); };
    const model = K === 'farmaco' ? M.makePills({ cheap: true }) : K === 'micro' ? M.makeBugs({ cheap: true }) : K === 'pato' ? M.makeMicroscope({ cheap: true }) : K === 'prev' ? M.makeVaccine({ cheap: true }) : K === 'port' ? M.makeBook({ cheap: true }) : K === 'huma' ? M.makeDialogo({ cheap: true }) : K === 'img' ? M.makeRaiox({ cheap: true }) : K === 'lab' ? M.makeTubo({ cheap: true }) : K === 'semio' ? M.makeHeart({ cheap: true }) : K === 'dic' ? M.makeLeito({ cheap: true }) : M.makeCells({ cheap: true, n: 15, span: 5.5, size: .62 });
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
    // compila e sobe tudo para a placa de vídeo antes de mostrar (senão a página trava quando o modelo aparece)
    await stage.aquecer();
    stage.running = !html.classList.contains('vidro-calmo');
    requestAnimationFrame(() => bg.classList.add('on'));
    // enquanto rola a página, o fundo quase some para não disputar a leitura
    let tm = 0; addEventListener('scroll', () => { if (Math.abs(stage.I.sv || 0) < 4) return; bg.classList.add('lendo'); clearTimeout(tm); tm = setTimeout(() => bg.classList.remove('lendo'), 700); }, { passive: true, capture: true });
  } catch (e) { console.warn('[vidro] fundo 3D indisponível', e); }
}
/* ---------- painel de personalização ---------- */
const CORES = [['', 'Cor da matéria'], ['#4f8cff', 'Azul'], ['#2fd4e6', 'Ciano'], ['#3ddc84', 'Verde'], ['#a5e04a', 'Lima'], ['#ffc93c', 'Amarelo'],
  ['#ff8a3d', 'Laranja'], ['#ff5a5f', 'Vermelho'], ['#ff6fb5', 'Rosa'], ['#9a5bff', 'Roxo'], ['#9aa7b4', 'Cinza']];
const painel = document.createElement('div'); painel.id = 'vidro-pers'; painel.hidden = true; painel.setAttribute('data-liquido', '');
painel.setAttribute('role', 'dialog'); painel.setAttribute('aria-label', 'Personalização');
painel.innerHTML = `<div class="vp-top"><b>Personalização</b><button type="button" class="vp-x" aria-label="Fechar">✕</button></div>
  <div class="vp-sec" data-sec="tema"><span class="vp-l">Tema</span><div class="vp-seg" role="group" aria-label="Tema"><button type="button" data-tema="light">☀ Claro</button><button type="button" data-tema="dark">☾ Escuro</button></div></div>
  <div class="vp-sec"><span class="vp-l">Fundo</span><div class="vp-fundos"><button type="button" data-fundo="grad"><i class="vp-pv grad"></i>Degradê</button><button type="button" data-fundo="liso"><i class="vp-pv liso"></i>Liso</button><div class="vp-tons" hidden role="group" aria-label="Cor do fundo liso"></div></div></div>
  <div class="vp-sec"><span class="vp-l">Cor de destaque</span><div class="vp-cores">${CORES.map(([c, n]) => `<button type="button" data-cor="${c}" title="${n}" aria-label="${n}"${c ? ` style="--c:${c}"` : ''}></button>`).join('')}</div></div>
  <div class="vp-sec"><span class="vp-l">Tamanho do texto</span><div class="vp-fonte" role="group" aria-label="Tamanho do texto"><button type="button" data-fs="-5" aria-label="Diminuir texto">A−</button><button type="button" class="vp-fv" data-fs="0" title="Voltar ao tamanho padrão">100%</button><button type="button" data-fs="5" aria-label="Aumentar texto">A+</button></div></div>
  <div class="vp-sec vp-linha"><span><span class="vp-l">Efeitos 3D</span><small>Fundo animado. Desligado economiza bateria.</small></span><button type="button" id="vp-fx" class="vp-sw" role="switch" aria-label="Efeitos 3D"></button></div>`;
// 🥷 Modo foco: abas embaixo, sem barra lateral nem enfeites (_tema/abas.js); vale para todos os masters que têm o adaptador
if (/^(huma|prev|img|lab|farmaco|micro|port|pato|semio|dic)$/.test(html.dataset.vidro || '') && !html.classList.contains('vidro-aula')) {
  const on = store.get('vidro-modo-foco', false) === true;
  painel.insertAdjacentHTML('beforeend', `<div class="vp-sec vp-linha"><span><span class="vp-l">🥷 Modo foco</span><small>Direto ao ponto: aulas, busca e simulados numa barra, sem distrações. Recarrega a página.</small></span><button type="button" id="vp-ninja" class="vp-sw" role="switch" aria-label="Modo foco" aria-checked="${on}"></button></div>`);
  painel.querySelector('#vp-ninja').addEventListener('click', e => { e.stopPropagation(); store.set('vidro-modo-foco', !on); location.reload(); });
}
// 🍅 Pomodoro (_tema/pomodoro.js): a linha só aparece onde o script existe (TH IV e aulas ficam de fora)
if (html.dataset.vidro !== 'th4' && !html.classList.contains('vidro-aula')) {
  painel.insertAdjacentHTML('beforeend', `<div class="vp-sec vp-linha" data-sec="pomo" hidden><span><span class="vp-l">🍅 Pomodoro</span><small>Foco e pausa com alarme. Fica escondido: chame pelo tomatinho no canto.</small></span><button type="button" id="vp-pomo" class="vp-sw" role="switch" aria-label="Pomodoro" aria-checked="false"></button></div>`);
  addEventListener('vgpomo', () => { if (!painel.hidden) pintarPainel(); });
}
document.body.append(painel);
const temaBtnQualquer = () => themeBtn() || document.querySelector(THEME_SEL);
function pintarPainel() {
  const luz = html.dataset.theme === 'light', cor = html.dataset.vgcor || '';
  const fundo = html.classList.contains('vg-liso') ? 'liso' : 'grad';
  const tons = luz ? [['branco', 'Branco', '#f7f8f7'], ['creme', 'Creme', '#fffaef']] : [['suave', 'Preto suave', '#121413'], ['puro', 'Preto puro', '#000000']];
  const tom = luz ? (html.classList.contains('vg-creme') ? 'creme' : 'branco') : (html.classList.contains('vg-puro') ? 'puro' : 'suave');
  painel.querySelector('.vp-tons').innerHTML = tons.map(([v, n, c]) => `<button type="button" data-tom="${v}" aria-pressed="${v === tom && fundo === 'liso'}"><i style="background:${c}"></i>${n}</button>`).join('');
  painel.querySelector('[data-sec="tema"]').hidden = !temaBtnQualquer();
  painel.querySelectorAll('[data-tema]').forEach(b => b.setAttribute('aria-pressed', String((b.dataset.tema === 'light') === luz)));
  painel.querySelectorAll('[data-fundo]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.fundo === fundo)));
  painel.querySelectorAll('[data-cor]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.cor.toLowerCase() === cor.toLowerCase())));
  const fs = Number(store.get('vidro-fonte', 100)) || 100;
  const fv = painel.querySelector('.vp-fv'); if (fv) fv.textContent = fs + '%';
  const fm = painel.querySelector('[data-fs="-5"]'), fp = painel.querySelector('[data-fs="5"]');
  if (fm) fm.disabled = fs <= 85; if (fp) fp.disabled = fs >= 135;
  const pomo = painel.querySelector('[data-sec="pomo"]');
  if (pomo) { pomo.hidden = !window.VGPomo; if (window.VGPomo) pomo.querySelector('#vp-pomo').setAttribute('aria-checked', String(window.VGPomo.ligado())); }
  setFxLabel();
}
function abrirPainel(abre) {
  painel.hidden = !abre; painel.querySelector('.vp-tons').hidden = true; fx.setAttribute('aria-expanded', String(abre));
  if (abre) { pintarPainel(); window.dispatchEvent(new Event('resize')); }
}
fx.addEventListener('click', () => abrirPainel(painel.hidden));
document.addEventListener('pointerdown', e => { if (!painel.hidden && !painel.contains(e.target) && !fx.contains(e.target) && !(e.target.closest && e.target.closest('#vidro-lamp'))) abrirPainel(false); }, true);
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !painel.hidden) { abrirPainel(false); fx.focus(); } });
new MutationObserver(() => { if (!painel.hidden) pintarPainel(); }).observe(html, { attributes: true, attributeFilter: ['data-theme'] });
// outra aba ou a aula aberta dentro do master: acompanha a mudança
addEventListener('storage', e => { if (!e.key || !e.key.startsWith('vidro-')) return; aplicarPrefs(); if (e.key === 'vidro-calmo') setCalmo(store.get('vidro-calmo', false), true); if (!painel.hidden) pintarPainel(); });
painel.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.classList.contains('vp-x')) { abrirPainel(false); fx.focus(); return; }
  if (b.dataset.tema) { if ((b.dataset.tema === 'light') !== (html.dataset.theme === 'light')) { const t = temaBtnQualquer(); if (t) t.click(); } return; }
  const caixaTons = painel.querySelector('.vp-tons');
  if (b.dataset.tom) { store.set('vidro-fundo', 'liso'); store.set(html.dataset.theme === 'light' ? 'vidro-liso-claro' : 'vidro-liso-escuro', b.dataset.tom); aplicarPrefs(); pintarPainel(); caixaTons.hidden = true; return; }
  if (b.dataset.fundo) {
    // Liso: aplica e abre a janelinha com as duas cores do tema atual
    if (b.dataset.fundo === 'liso') { if (!html.classList.contains('vg-liso')) store.set('vidro-fundo', 'liso'); caixaTons.hidden = !caixaTons.hidden; }
    else { store.set('vidro-fundo', 'grad'); caixaTons.hidden = true; }
    aplicarPrefs(); pintarPainel(); return;
  }
  caixaTons.hidden = true;
  if (b.dataset.cor != null && b.hasAttribute('data-cor')) { store.set('vidro-cor', b.dataset.cor || null); aplicarPrefs(); pintarPainel(); return; }
  if (b.dataset.fs != null) {
    const d = Number(b.dataset.fs), cur = Number(store.get('vidro-fonte', 100)) || 100;
    const prox = d === 0 ? 100 : Math.max(85, Math.min(135, cur + d));
    store.set('vidro-fonte', prox); aplicarPrefs(); pintarPainel(); return;
  }
  if (b.id === 'vp-fx') setCalmo(!html.classList.contains('vidro-calmo'));
  if (b.id === 'vp-pomo' && window.VGPomo) { const on = !window.VGPomo.ligado(); b.setAttribute('aria-checked', String(on)); if (on) { abrirPainel(false); window.VGPomo.ligar(); } else window.VGPomo.desligar(); }
});
function setCalmo(calm, semSalvar) {
  if (calm === html.classList.contains('vidro-calmo')) return;
  html.classList.toggle('vidro-calmo', calm); if (!semSalvar) store.set('vidro-calmo', calm); setFxLabel();
  // ligou os efeitos na mão: volta o visual completo e o PC é medido de novo
  if (!calm) { store.set('vidro-lento', false); html.classList.remove('vidro-semgpu'); if (!fraco) html.classList.remove('vidro-leve'); setTimeout(medirPC, 3000); }
  if (stage) stage.running = !calm; else if (!calm) startBg();
}

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
    S = await createStage(cv, { cheap: false, bloom: true, fps: 45, dust: 160, dpr: 1.5, fog: 0, alpha: false, background: 0x070b10, exposure: 1, listen: false });
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
    S = await createStage(cv, { cheap: false, bloom: false, fps: 60, dust: 0, dpr: fraco ? 1 : 1.5, fog: 0, alpha: true, exposure: 1.05, listen: false, start: false });
    S.semPausa = true;
    S.camera.position.set(0, 0, 10.2); S.camera.fov = 49.56; S.camera.updateProjectionMatrix();
    S.l1.color.set(0xffffff); S.l1.intensity = 26; S.l1.position.set(3, 1, 5);
    lamp = M.makeLamp({ accent: M.COL[K] }); lamp.position.y = 2.425; S.world.add(lamp);
    lamp.userData.setLit(isLight() ? 1 : 0, true);
    await S.aquecer(); // o vidro da lâmpada é o shader mais pesado: compila agora, não quando ela desce
  } catch (e) { console.warn('[vidro] lâmpada indisponível', e); wrap.remove(); flash.remove(); return; }
  const ud = lamp.userData, P = { world: S.I.world, has: false, vx: 0 };
  S.running = false;

  // posição: a corrente cai logo abaixo do botão
  let quietUntil = 0, hoverT = 0, btn = null, shown = false, hideT = 0, dragging = false, busy = false, px = 0, py = 0, lastPx = 0;
  const place = () => { btn = themeBtn(); if (!btn) return; const r = btn.getBoundingClientRect(); const cx = r.left + r.width / 2 - 42; wrap.style.left = Math.max(-40, Math.min(innerWidth - 260, cx - 150)) + 'px'; };
  const show = () => { clearTimeout(hideT); if (shown) return; place(); shown = true; S.running = true; wrap.classList.add('on'); ud.kick((Math.random() < .5 ? -1 : 1) * 1.1); };
  const hideSoon = (ms = 450) => { clearTimeout(hideT); hideT = setTimeout(() => { if (dragging || busy) return hideSoon(300); shown = false; wrap.classList.remove('on'); html.classList.remove('vl-grab'); setTimeout(() => { if (!shown) S.running = false; }, 600); }, ms); };
  const v3 = new THREE.Vector3();
  const toScreen = w => { const r = cv.getBoundingClientRect(); w.project(S.camera); return [r.left + (w.x + 1) / 2 * r.width, r.top + (1 - w.y) / 2 * r.height]; };
  const setNdc = (x, y) => { const r = cv.getBoundingClientRect(); S.I.ndc.set((x - r.left) / r.width * 2 - 1, -((y - r.top) / r.height) * 2 + 1); S.poke(); };
  const beadDist = (x, y) => { const [bx, by] = toScreen(ud.beadWorld(v3)); return Math.hypot(x - bx, y - by); };

  addEventListener('pointermove', e => {
    px = e.clientX; py = e.clientY;
    const b = btn && btn.isConnected ? btn : themeBtn(); if (!b) return;
    const r = b.getBoundingClientRect(), d = Math.hypot(px - (r.left + r.width / 2), py - (r.top + r.height / 2));
    const lr = wrap.getBoundingClientRect(), overLamp = shown && px > lr.left && px < lr.right && py > lr.top + 160 && py < lr.top + 500;
    // só aparece com o mouse em cima do botão (um instante parado), não ao passar perto
    if (overLamp || dragging) show();
    else if (d < 30) { if (performance.now() < quietUntil) { } else if (!shown && !hoverT) hoverT = setTimeout(() => { hoverT = 0; show(); }, 160); else if (shown) clearTimeout(hideT); }
    else { clearTimeout(hoverT); hoverT = 0; if (shown) hideSoon(); }
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
  const endDrag = () => { if (!dragging) return; dragging = false; ud.st.drag = null; html.classList.remove('vl-drag'); hideSoon(700); };
  addEventListener('pointerup', endDrag, true); addEventListener('pointercancel', endDrag, true);
  // clique no botão (ou toque/teclado): a lâmpada desce e a cordinha é puxada sozinha
  document.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest(THEME_SEL); if (!b || lampMine || html.classList.contains('vga-on')) return; // modo foco (abas.js): sem lâmpada, troca na hora
    e.preventDefault(); e.stopImmediatePropagation(); btn = b;
    if (reduce) { flip(); return; }
    const was = shown; show(); setTimeout(() => ud.autoPull(), was ? 0 : 520); hideSoon(1500);
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
    html.classList.add('vl-pausa');
    S.frame.forEach(f => f(0, 0)); S.renderer.render(S.scene, S.camera);
    const [x, y] = toScreen(ud.bulbWorld(v3));
    const R = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y)) + 40;
    html.style.setProperty('--vt-x', x + 'px'); html.style.setProperty('--vt-y', y + 'px'); html.style.setProperty('--vt-r', R + 'px');
    const real = !reduce && document.startViewTransition ? document.startViewTransition.bind(document) : null;
    // terminou a troca: a lâmpada sobe logo, e o mouse parado no botão não a chama de volta na hora
    const done = () => { html.classList.remove('vl-acende', 'vl-apaga', 'vl-pausa'); busy = false; quietUntil = performance.now() + 1500; if (!dragging) hideSoon(60); };
    if (!real) { switchTheme(); ud.setLit(toLight ? 1 : 0); done(); return; }
    const run = () => {
      html.classList.add(toLight ? 'vl-acende' : 'vl-apaga');
      const vt = real(switchTheme);
      vt.ready.then(() => {
        const dur = toLight ? 1150 : 950, ease = toLight ? 'cubic-bezier(.22,.7,.12,1)' : 'cubic-bezier(.75,0,.35,1)';
        // o círculo segue a lâmpada quadro a quadro: ela balança depois do puxão, e ao apagar a luz
        // tem de voltar para dentro da lâmpada, não para onde ela estava no começo
        const curva = toLight ? t => 1 - Math.pow(1 - t, 3.2) : t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
        const circ = (r, cx, cy) => `circle(${r}px at ${cx}px ${cy}px)`;
        const ini = toLight ? circ(0, x, y) : circ(R, x, y);
        const clip = html.animate({ clipPath: [ini, ini] }, { duration: dur + 400, fill: 'both', pseudoElement: toLight ? '::view-transition-new(root)' : '::view-transition-old(root)' });
        // anel de luz acompanha a borda do círculo
        // camada pequena ampliada (textura leve para a GPU)
        const k = (R / .975) / 320, S1 = `scale(${k})`;
        Object.assign(flash.style, { width: '640px', height: '640px', left: x - 320 + 'px', top: y - 320 + 'px' });
        flash.animate(toLight
          ? [{ transform: 'scale(0)', opacity: 1 }, { opacity: 1, offset: .65 }, { transform: S1, opacity: 0 }]
          : [{ transform: S1, opacity: 0 }, { opacity: .9, offset: .25 }, { opacity: 1, offset: .85 }, { transform: 'scale(0)', opacity: 0 }],
          { duration: dur, easing: ease, fill: 'none' });
        const t0 = performance.now();
        const passo = () => {
          const t = Math.min(1, (performance.now() - t0) / dur), e = curva(t);
          const [bx, by] = toScreen(ud.bulbWorld(v3));
          const rr = Math.hypot(Math.max(bx, innerWidth - bx), Math.max(by, innerHeight - by)) + 40;
          try { clip.effect.setKeyframes([{ clipPath: circ((toLight ? e : 1 - e) * rr, bx, by) }, { clipPath: circ((toLight ? e : 1 - e) * rr, bx, by) }]); } catch (_) { }
          flash.style.left = bx - 320 + 'px'; flash.style.top = by - 320 + 'px';
          if (t < 1) requestAnimationFrame(passo);
        };
        requestAnimationFrame(passo);
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
/* ---------- modo leve automático ----------
   Mede os quadros por segundo com tudo ligado. Se o PC não passa de ~30 fps (ex.: navegador sem
   placa de vídeo), desliga 3D, auroras e desfoque e lembra disso nas próximas visitas.
   PC que aguenta não muda nada. */
function medirPC() {
  if (html.classList.contains('vidro-calmo') || document.hidden) return;
  const f = []; let last = performance.now(), n = 0;
  (function s(t) {
    if (document.hidden) return;                       // aba em segundo plano não conta
    f.push(t - last); last = t;
    if (++n < 150) return requestAnimationFrame(s);
    f.sort((a, b) => a - b);
    const med = f[f.length >> 1];
    if (med > 34) modoLeve();
  })(last);
}
function modoLeve() {
  store.set('vidro-lento', true);
  html.classList.add('vidro-leve', 'vidro-semgpu', 'vidro-calmo');
  if (stage) stage.running = false;
  setFxLabel();
}
/* O 3D (fundo e lâmpada) é preparado já durante a tela de carregamento, um depois do outro, para não
   disputarem a página. A tela de carregamento espera window.VIDRO_3D (com limite de tempo), então a
   pessoa só vê a página quando o pesado já passou. */
window.VIDRO_3D = (async () => { try { await startBg(); } catch (_) { } try { await lampInit(); } catch (_) { } })();
const go = () => { startBg(); if (!lento) setTimeout(medirPC, 4000); if (K === 'th4') heartMonitor(); };
if (html.classList.contains('vidro-ready')) go(); else {
  const mo = new MutationObserver(() => { if (html.classList.contains('vidro-ready')) { mo.disconnect(); go(); } });
  mo.observe(html, { attributes: true, attributeFilter: ['class'] });
}
})();
