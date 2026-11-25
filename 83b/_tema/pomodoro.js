/* 🍅 Pomodoro dos masters (opcional: liga no painel Personalização do vidro.js).
   - Escondido enquanto roda: um tomatinho discreto acima do botão Personalização chama o cartão.
   - Foco com tomate 3D (_tema/tomate.glb) que amadurece de verde a vermelho; pausa com o sapo cochilando.
   - Fim de fase: despertador (WebAudio), cartão aparece e notificação do Chrome.
   - Tempo pela hora real (motor em pomodoro-motor.js), salvo em localStorage "vg-pomo":
     segue certo com a aba escondida, ao trocar de master e ao recarregar.
   TH IV e aulas abertas dentro do master (iframe) ficam de fora. */
(function () {
const html = document.documentElement;
if (!html.dataset.vidro || html.dataset.vidro === 'th4') return;
try { if (window.top !== window) return; } catch (_) { return; }

const SELF = (document.currentScript && document.currentScript.src) || location.href;
const BASE = new URL('.', SELF), VER = new URL(SELF).search;
const K = 'vg-pomo';
const motor = () => window.VGPomoMotor;
let M = null;

/* ---------- estado ---------- */
function ler() {
  let st = null;
  try { st = JSON.parse(localStorage.getItem(K)); } catch (_) { }
  st = st && typeof st === 'object' ? st : {};
  return { on: !!st.on, cfg: M.limpar(st.cfg), e: st.e && st.e.fase ? st.e : M.parar(), pediu: !!st.pediu };
}
function gravar(st) { try { localStorage.setItem(K, JSON.stringify(st)); } catch (_) { } }
/* uma aba por vez lê-muda-grava (assim só uma toca o alarme) */
function comTrava(fn) {
  if (navigator.locks && navigator.locks.request) return navigator.locks.request(K, () => fn()).catch(() => fn());
  return Promise.resolve(fn());
}
function mudar(fn) {
  return comTrava(() => { const st = ler(); const r = fn(st) || {}; gravar(st); return { st, ...r }; })
    .then(r => { pintar(r.st); avisarMudanca(r.st); return r; });
}

/* ---------- som ---------- */
let ac = null;
function audio() {
  try {
    if (!ac) { const A = window.AudioContext || window.webkitAudioContext; if (!A) return null; ac = new A(); }
    if (ac.state === 'suspended') ac.resume();
  } catch (_) { return null; }
  return ac;
}
function tocar(nome, vol) {
  const a = audio(); if (!a || !(vol > 0)) return;
  try {
    const t0 = a.currentTime + .05, g = a.createGain(); g.gain.value = vol * .32; g.connect(a.destination);
    const nota = (f, t, d, tipo, pico) => {
      const o = a.createOscillator(), e = a.createGain(); o.type = tipo; o.frequency.value = f;
      e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(pico, t + .01); e.gain.exponentialRampToValueAtTime(.001, t + d);
      o.connect(e); e.connect(g); o.start(t); o.stop(t + d + .05);
    };
    if (nome === 'sino') { for (const k of [0, 1.1]) { nota(1318.5, t0 + k, 1.6, 'sine', .8); nota(1975.5, t0 + k, 1.1, 'sine', .3); nota(659.3, t0 + k, 1.8, 'sine', .3); } }
    else if (nome === 'suave') { [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => nota(f, t0 + i * .22, 1.2, 'triangle', .6)); }
    else { for (let r = 0; r < 3; r++) for (let i = 0; i < 4; i++) nota(i % 2 ? 660 : 880, t0 + r * .75 + i * .14, .11, 'square', .35); }
  } catch (_) { }
}
function destravarAudio() { if (ler().on) audio(); }
addEventListener('pointerdown', destravarAudio, { capture: true, passive: true });
addEventListener('keydown', destravarAudio, true);

/* ---------- notificação ---------- */
function notificar(titulo, corpo) {
  try {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    const n = new Notification(titulo, { body: corpo, tag: 'vg-pomo', renotify: true });
    n.onclick = () => { try { window.focus(); } catch (_) { } n.close(); abrir('fixo'); };
  } catch (_) { }
}

/* ---------- tela ---------- */
const NOME = { foco: 'Foco', curta: 'Pausa curta', longa: 'Pausa longa', parado: 'Pomodoro' };
const mmss = ms => { const s = Math.ceil(ms / 1000), m = Math.floor(s / 60); return String(m).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };
const TOMATE_SVG = `<svg viewBox="0 0 64 64" aria-hidden="true"><ellipse class="vgp-corpo" cx="32" cy="37" rx="25" ry="21"/><path fill="#3a7d2a" d="M32 18c-3-5-9-6-13-4 4 1 7 3 8 6-5-1-10 1-12 5 5-2 10-2 13 0 0 3-1 6-3 8 4-1 6-3 7-6 1 3 3 5 7 6-2-2-3-5-3-8 3-2 8-2 13 0-2-4-7-6-12-5 1-3 4-5 8-6-4-2-10-1-13 4z"/><rect x="30.5" y="10" width="3" height="9" rx="1.5" fill="#2f6a22"/></svg>`;

const chama = document.createElement('button');
chama.id = 'vg-pomo-chama'; chama.type = 'button'; chama.hidden = true; chama.setAttribute('data-liquido', '');
chama.setAttribute('aria-label', 'Pomodoro: mostrar o tempo'); chama.setAttribute('aria-haspopup', 'dialog');
chama.innerHTML = `<svg class="vgp-anel" viewBox="0 0 36 36" aria-hidden="true"><circle cx="18" cy="18" r="16"/><circle class="vgp-prog" cx="18" cy="18" r="16" pathLength="100"/></svg>${TOMATE_SVG}`;

const card = document.createElement('div');
card.id = 'vg-pomo'; card.hidden = true; card.setAttribute('role', 'dialog'); card.setAttribute('aria-label', 'Pomodoro'); card.setAttribute('data-liquido', '');
card.innerHTML = `<div class="vgp-top"><b class="vgp-fase">Pomodoro</b><span class="vgp-ciclo"></span><button type="button" class="vgp-ic" data-a="ajustes" aria-label="Ajustes do Pomodoro" title="Ajustes">⚙</button><button type="button" class="vgp-ic" data-a="fechar" aria-label="Fechar">✕</button></div>
  <div class="vgp-vista">
    <div class="vgp-palco"><canvas width="240" height="240" aria-hidden="true"></canvas><div class="vgp-plano">${TOMATE_SVG}</div><img class="vgp-sapo" alt="Sapo cochilando na pausa" hidden decoding="async"></div>
    <div class="vgp-tempo">20:00</div>
    <div class="vgp-msg" aria-live="polite"></div>
    <div class="vgp-ctl"><button type="button" data-a="play" class="vgp-pri">▶ Começar</button><button type="button" data-a="pular">⏭ Pular</button><button type="button" data-a="parar">⏹ Parar</button></div>
  </div>
  <form class="vgp-aj" hidden>
    <label>Foco <span><input type="number" name="foco" min="1" max="180" inputmode="numeric"> min</span></label>
    <label>Pausa curta <span><input type="number" name="curta" min="1" max="180" inputmode="numeric"> min</span></label>
    <label>Pausa longa <span><input type="number" name="longa" min="1" max="180" inputmode="numeric"> min</span></label>
    <label>Pausa longa a cada <span><input type="number" name="cada" min="2" max="12" inputmode="numeric"> focos</span></label>
    <label class="vgp-chk"><input type="checkbox" name="auto"> Começar a próxima fase sozinho</label>
    <label>Som <span><select name="som"><option value="despertador">Despertador</option><option value="sino">Sino</option><option value="suave">Suave</option></select><button type="button" data-a="testar" class="vgp-ic" aria-label="Testar o som" title="Testar o som">▶</button></span></label>
    <label>Volume <input type="range" name="vol" min="0" max="1" step="0.05"></label>
    <div class="vgp-ctl"><button type="button" data-a="padrao">Restaurar padrão</button><button type="button" data-a="voltar" class="vgp-pri">Pronto</button></div>
    <small>Mudanças valem a partir da próxima fase.</small>
  </form>`;

const $ = s => card.querySelector(s);
let modo = null, fechaT = 0, tomate = null, tomateP = null, planoAtivo = false;

function abrir(m) {
  clearTimeout(fechaT);
  if (m === 'hover' && modo && modo !== 'hover') return;
  modo = m; card.hidden = false; chama.setAttribute('aria-expanded', 'true');
  pintar(ler()); ligar3D();
  if (m === 'aviso') fechaT = setTimeout(() => { if (modo === 'aviso' && !card.matches(':hover')) fechar(); }, 20000);
}
function fechar() {
  clearTimeout(fechaT); modo = null; card.hidden = true; chama.setAttribute('aria-expanded', 'false');
  $('.vgp-aj').hidden = true; $('.vgp-vista').hidden = false;
  if (tomate) tomate.parar();
}
function msg(t) { $('.vgp-msg').textContent = t || ''; }

function progresso(st, agora) {
  const e = st.e; if (e.fase === 'parado') return 0;
  const tot = (st.cfg[e.fase] || 1) * M.MIN;
  return Math.min(1, Math.max(0, 1 - M.restante(e, agora) / tot));
}

/* título da aba: "🍅 12:30 · Microbiologia" */
let tituloBase = document.title;
const PREF = /^(🍅|☕|⏸)( ⏸)? \d+:\d\d · /;
const tituloEl = document.querySelector('title');
if (tituloEl) new MutationObserver(() => { if (!PREF.test(document.title)) tituloBase = document.title; }).observe(tituloEl, { childList: true, characterData: true, subtree: true });
function titulo(st, agora) {
  if (!st.on || st.e.fase === 'parado') { if (PREF.test(document.title)) document.title = tituloBase; return; }
  const ic = st.e.fase === 'foco' ? '🍅' : '☕', pausa = st.e.fim == null ? ' ⏸' : '';
  const t = `${ic}${pausa} ${mmss(M.restante(st.e, agora))} · ${tituloBase}`;
  if (document.title !== t) document.title = t;
}

function pintar(st) {
  if (!M) return;
  const agora = Date.now(), e = st.e;
  chama.hidden = !st.on;
  titulo(st, agora);
  if (!st.on) { if (!card.hidden) fechar(); return; }
  const p = progresso(st, agora), pausa = e.fase === 'curta' || e.fase === 'longa';
  chama.style.setProperty('--p', String(Math.round(p * 100)));
  chama.classList.toggle('vgp-pausa', pausa);
  chama.querySelector('.vgp-corpo').style.fill = corTomate(e.fase === 'foco' ? p : 1);
  chama.title = e.fase === 'parado' ? 'Pomodoro' : `${NOME[e.fase]}: ${mmss(M.restante(e, agora))}`;
  if (card.hidden) return;
  card.dataset.fase = e.fase;
  $('.vgp-fase').textContent = NOME[e.fase];
  // foco: número do foco atual; pausa: quantos focos já foram nesta rodada
  const n = e.fase === 'foco' ? e.ciclo % st.cfg.cada + 1 : e.fase === 'longa' ? st.cfg.cada : e.ciclo % st.cfg.cada;
  $('.vgp-ciclo').textContent = e.fase === 'parado' ? '' : `🍅 ${n}/${st.cfg.cada}`;
  $('.vgp-tempo').textContent = mmss(e.fase === 'parado' ? st.cfg.foco * M.MIN : M.restante(e, agora));
  const play = $('[data-a="play"]');
  play.textContent = e.fase === 'parado' ? '▶ Começar' : e.fim == null ? (p === 0 ? `▶ Começar ${e.fase === 'foco' ? 'foco' : 'pausa'}` : '▶ Continuar') : '⏸ Pausar';
  $('[data-a="pular"]').hidden = $('[data-a="parar"]').hidden = e.fase === 'parado';
  const sapo = $('.vgp-sapo');
  if (pausa && !sapo.src) sapo.src = new URL('sapo-pausa.webp' + VER, BASE).href;
  sapo.hidden = !pausa;
  $('canvas').hidden = pausa || planoAtivo || !tomate;
  $('.vgp-plano').hidden = pausa || (!planoAtivo && !!tomate);
  $('.vgp-plano .vgp-corpo').style.fill = corTomate(e.fase === 'foco' ? p : e.fase === 'parado' ? 0 : 1);
  if (tomate) tomate.atualizar(e.fase === 'foco' ? p : e.fase === 'parado' ? 0 : 1, e.fase);
  if (!$('.vgp-msg').textContent && e.fase === 'foco' && e.saidas) msg(`Você saiu da aba ${e.saidas} ${e.saidas === 1 ? 'vez' : 'vezes'} neste foco.`);
}

/* verde #6a994e → vermelho #d62828 */
function corTomate(p) {
  const a = [0x6a, 0x99, 0x4e], b = [0xd6, 0x28, 0x28];
  return 'rgb(' + a.map((v, i) => Math.round(v + (b[i] - v) * p)).join(',') + ')';
}

/* ---------- tomate 3D (cai para o SVG plano se não der) ---------- */
function ligar3D() {
  if (tomate) { tomate.rodar(); return; }
  if (tomateP || planoAtivo) return;
  if (html.classList.contains('vidro-calmo') || html.classList.contains('vidro-semgpu') || matchMedia('(prefers-reduced-motion: reduce)').matches) { planoAtivo = true; pintar(ler()); return; }
  tomateP = montarTomate($('canvas')).then(t => { tomate = t; if (!card.hidden) t.rodar(); pintar(ler()); })
    .catch(() => { planoAtivo = true; pintar(ler()); });
}
async function montarTomate(cv) {
  const THREE = await import('three');
  const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
  const r = new THREE.WebGLRenderer({ canvas: cv, alpha: true, antialias: true });
  r.setPixelRatio(1); r.setSize(240, 240, false); r.outputColorSpace = THREE.SRGBColorSpace;
  const cena = new THREE.Scene(), cam = new THREE.PerspectiveCamera(30, 1, .1, 20);
  cam.position.set(0, .7, 2.5); cam.lookAt(0, -.02, 0);
  cena.add(new THREE.HemisphereLight(0xffffff, 0x442222, 1.5));
  const luz = new THREE.DirectionalLight(0xffffff, 2.4); luz.position.set(1.4, 2.2, 2); cena.add(luz);
  const g = await new GLTFLoader().loadAsync(new URL('tomate.glb' + VER, BASE).href);
  const obj = g.scene, giro = new THREE.Group(); giro.add(obj); cena.add(giro);
  let corpo = null; obj.traverse(o => { if (o.isMesh && /^Corpo/.test(o.name)) corpo = o; });
  if (!corpo) throw new Error('sem Corpo');
  corpo.material = corpo.material.clone();
  const verde = new THREE.Color('#6a994e'), verm = new THREE.Color('#d62828');
  let raf = 0, t0 = performance.now(), pulo = -1, mx = 0, my = 0;
  card.addEventListener('pointermove', ev => { const b = cv.getBoundingClientRect(); mx = ((ev.clientX - b.left) / b.width - .5); my = ((ev.clientY - b.top) / b.height - .5); });
  function quadro(t) {
    raf = requestAnimationFrame(quadro);
    const s = (t - t0) / 1000;
    giro.rotation.y += ((s * .5 + mx * 1.2) - giro.rotation.y) * .08;
    giro.rotation.x += (my * .5 - giro.rotation.x) * .08;
    let y = Math.sin(s * 1.6) * .02;
    if (pulo >= 0) { const k = (t - pulo) / 700; if (k > 1) pulo = -1; else y += Math.sin(k * Math.PI) * .22; }
    giro.position.y = y;
    r.render(cena, cam);
  }
  return {
    atualizar(p) { corpo.material.color.copy(verde).lerp(verm, p); },
    pular() { pulo = performance.now(); },
    rodar() { if (!raf) raf = requestAnimationFrame(quadro); },
    parar() { cancelAnimationFrame(raf); raf = 0; },
    destruir() { cancelAnimationFrame(raf); raf = 0; r.dispose(); },
  };
}

/* ---------- relógio ---------- */
let relogio = null, ultimoFim = 0;
const ESPERA_OCULTA = 2000;
function tique() {
  comTrava(() => {
    const st = ler(); if (!st.on) return { st };
    // aba escondida espera 2 s: se houver uma aba visível do site, ela avança primeiro e toca onde a pessoa está
    if (document.hidden && st.e.fim && Date.now() < st.e.fim + ESPERA_OCULTA) return { st };
    const r = M.avancar(st.e, st.cfg, Date.now());
    if (r.alarmes) { const antes = st.e; st.e = r.estado; gravar(st); return { st, antes, fim: true }; }
    return { st };
  }).then(({ st, antes, fim }) => { pintar(st); if (fim) fimDeFase(st, antes); });
}
function fimDeFase(st, antes) {
  const e = st.e, pausada = e.fim == null;
  tocar(st.cfg.som, st.cfg.vol);
  let tit, corpo;
  if (e.fase === 'foco') { tit = 'Pausa acabou! Bora focar 🍅'; corpo = `Foco de ${st.cfg.foco} min${pausada ? '. Toque ▶ para começar.' : ' já começou.'}`; }
  else {
    tit = 'Foco concluído! 🎉'; corpo = `Hora da ${e.fase === 'longa' ? 'pausa longa' : 'pausa'}: ${st.cfg[e.fase]} min${pausada ? '. Toque ▶ para começar.' : '.'}`;
    if (antes && antes.saidas) corpo += ` Você saiu da aba ${antes.saidas} ${antes.saidas === 1 ? 'vez' : 'vezes'} nesse foco.`;
  }
  notificar(tit, corpo);
  abrir('aviso'); msg(tit + ' ' + corpo);
  if (tomate) tomate.pular();
  avisarMudanca(st);
}
function ligarRelogio() {
  if (relogio) return;
  try {
    // timers de Worker não sofrem o atraso das abas escondidas do Chrome
    const url = URL.createObjectURL(new Blob(['setInterval(function(){postMessage(0)},1000)'], { type: 'text/javascript' }));
    const w = new Worker(url); w.onmessage = tique; relogio = { parar() { w.terminate(); URL.revokeObjectURL(url); } };
  } catch (_) { const id = setInterval(tique, 1000); relogio = { parar() { clearInterval(id); } }; }
}
function desligarRelogio() { if (relogio) relogio.parar(); relogio = null; }
/* ao esconder a aba, um timer avulso exatamente no fim da fase (reserva do Worker) */
let reserva = 0;
function agendarReserva() {
  clearTimeout(reserva); const st = ler();
  if (st.on && st.e.fim) reserva = setTimeout(tique, Math.max(0, st.e.fim - Date.now()) + ESPERA_OCULTA + 50);
}

/* saídas da aba durante o foco (sem punir: só conta) */
let saindo = false;
addEventListener('pagehide', () => { saindo = true; });
addEventListener('beforeunload', () => { saindo = true; });
document.addEventListener('visibilitychange', () => {
  if (!M) return;
  if (document.hidden) {
    agendarReserva();
    if (!saindo && ler().on) mudar(st => { st.e = M.registrarSaida(st.e); });
  } else {
    saindo = false; tique();
    const st = ler();
    if (st.on && st.e.fase === 'foco' && st.e.fim != null && st.e.saidas > ultimoFim) {
      ultimoFim = st.e.saidas;
      msg(`Você saiu da aba ${st.e.saidas} ${st.e.saidas === 1 ? 'vez' : 'vezes'} neste foco. Bora voltar 🍅`);
      abrir('aviso'); clearTimeout(fechaT); fechaT = setTimeout(() => { if (modo === 'aviso' && !card.matches(':hover')) fechar(); }, 5000);
    }
  }
});

/* ---------- ações ---------- */
function avisarMudanca(st) {
  if (st.e.fase === 'foco' && st.e.saidas === 0) ultimoFim = 0;
  window.dispatchEvent(new CustomEvent('vgpomo', { detail: { ligado: st.on, fase: st.e.fase, restante: M.restante(st.e, Date.now()) } }));
}
function ligar() {
  if (!M) return;
  audio();
  mudar(st => {
    st.on = true; st.e = M.iniciar(st.cfg, Date.now());
    if (!st.pediu && 'Notification' in window && Notification.permission === 'default') { st.pediu = true; try { Notification.requestPermission(); } catch (_) { } }
  }).then(() => { ligarRelogio(); msg(''); abrir('fixo'); });
}
function desligar() {
  if (!M) return;
  mudar(st => { st.on = false; st.e = M.parar(); }).then(() => { desligarRelogio(); fechar(); });
}
function preencherAjustes(cfg) {
  const f = $('.vgp-aj');
  for (const k of ['foco', 'curta', 'longa', 'cada', 'som', 'vol']) f.elements[k].value = cfg[k];
  f.elements.auto.checked = cfg.auto;
}
card.addEventListener('click', ev => {
  const b = ev.target.closest('[data-a]'); if (!b) return;
  const a = b.dataset.a, agora = Date.now();
  if (a === 'fechar') return fechar();
  if (a === 'ajustes' || a === 'voltar') {
    const aj = $('.vgp-aj'), abrirAj = a === 'ajustes' && aj.hidden;
    if (abrirAj) preencherAjustes(ler().cfg);
    aj.hidden = !abrirAj; $('.vgp-vista').hidden = abrirAj; modo = 'fixo'; clearTimeout(fechaT); return;
  }
  if (a === 'testar') { audio(); tocar($('.vgp-aj').elements.som.value, Number($('.vgp-aj').elements.vol.value)); return; }
  if (a === 'padrao') { mudar(st => { const n = M.padrao(); st.e = M.reajustar(st.e, st.cfg, n); st.cfg = n; }).then(r => preencherAjustes(r.st.cfg)); return; }
  modo = 'fixo'; clearTimeout(fechaT); msg('');
  if (a === 'play') mudar(st => { const e = st.e; st.e = e.fase === 'parado' ? M.iniciar(st.cfg, agora) : e.fim == null ? M.retomar(e, agora) : M.pausar(e, agora); });
  else if (a === 'pular') mudar(st => { st.e = M.pular(st.e, st.cfg, agora); });
  else if (a === 'parar') mudar(st => { st.e = M.parar(); });
});
$('.vgp-aj').addEventListener('input', ev => {
  const f = ev.currentTarget, el = ev.target;
  if (el.type === 'number' && el.value === '') return; // espera a pessoa terminar de digitar
  const v = { foco: f.elements.foco.value, curta: f.elements.curta.value, longa: f.elements.longa.value, cada: f.elements.cada.value, auto: f.elements.auto.checked, som: f.elements.som.value, vol: f.elements.vol.value };
  msg('');
  gravandoAj = mudar(st => { const n = M.limpar(v); st.e = M.reajustar(st.e, st.cfg, n); st.cfg = n; });
});
let gravandoAj = null;
// ao sair do campo, mostra o valor já limitado (espera a gravação terminar)
$('.vgp-aj').addEventListener('change', () => Promise.resolve(gravandoAj).then(() => preencherAjustes(ler().cfg)));
$('.vgp-aj').addEventListener('submit', ev => ev.preventDefault());

const toque = matchMedia('(pointer:coarse)').matches;
chama.addEventListener('click', () => { if (card.hidden || modo !== 'fixo') abrir('fixo'); else fechar(); });
if (!toque) {
  chama.addEventListener('pointerenter', () => { if (card.hidden) abrir('hover'); });
  const sair = () => { if (modo === 'hover') fechaT = setTimeout(() => { if (modo === 'hover' && !card.matches(':hover') && !chama.matches(':hover')) fechar(); }, 450); };
  chama.addEventListener('pointerleave', sair); card.addEventListener('pointerleave', sair);
  card.addEventListener('pointerenter', () => clearTimeout(fechaT));
}
document.addEventListener('pointerdown', ev => { if (!card.hidden && !card.contains(ev.target) && !chama.contains(ev.target)) fechar(); }, true);
document.addEventListener('keydown', ev => { if (ev.key === 'Escape' && !card.hidden) { fechar(); chama.focus(); } });
addEventListener('storage', ev => {
  if (ev.key !== K || !M) return;
  const st = ler(); if (st.on) ligarRelogio(); else desligarRelogio(); pintar(st);
});

window.VGPomo = { ligar, desligar, ligado: () => !!(M && ler().on), abrir: () => abrir('fixo') };

function iniciarTela() {
  M = motor(); if (!M) return;
  document.body.append(chama, card);
  const st = ler();
  if (st.on) { ligarRelogio(); tique(); }
  pintar(st);
  window.dispatchEvent(new CustomEvent('vgpomo', { detail: { ligado: st.on, fase: st.e.fase } }));
}
function quandoPronto(fn) { if (document.body) fn(); else document.addEventListener('DOMContentLoaded', fn); }
quandoPronto(() => {
  if (motor()) return iniciarTela();
  const s = document.createElement('script'); s.src = new URL('pomodoro-motor.js' + VER, BASE).href; s.onload = iniciarTela; document.head.append(s);
});
})();
