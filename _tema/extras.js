/* aulas abertas dentro do master (não carregam o vidro.js): seguem o fundo e a cor escolhidos em Personalização */
(function () {
  var h = document.documentElement; if (!h.classList.contains('vidro-aula')) return;
  function ler(k) { try { var v = JSON.parse(localStorage.getItem(k)); return typeof v === 'string' ? v : null; } catch (_) { return null; } }
  function aplicar() {
    var f = ler('vidro-fundo'); h.classList.toggle('vg-liso', f === 'liso' || f === 'creme'); h.classList.toggle('vg-creme', f === 'creme' || ler('vidro-liso-claro') === 'creme'); h.classList.toggle('vg-puro', ler('vidro-liso-escuro') === 'puro');
    var c = ler('vidro-cor');
    if (c && /^#[0-9a-f]{6}$/i.test(c)) {
      var n = parseInt(c.slice(1), 16), lum = (.299 * (n >> 16) + .587 * (n >> 8 & 255) + .114 * (n & 255)) / 255;
      h.style.setProperty('--vgc', c); h.style.setProperty('--vgc-on', lum > .6 ? '#10151b' : '#ffffff'); h.dataset.vgcor = c;
    } else { h.style.removeProperty('--vgc'); h.style.removeProperty('--vgc-on'); delete h.dataset.vgcor; }
    var fs = 100; try { fs = Number(JSON.parse(localStorage.getItem('vidro-fonte'))); } catch (_) { fs = 100; }
    if (fs >= 85 && fs <= 135 && fs !== 100) { h.style.setProperty('--vg-fs', String(fs / 100)); h.dataset.vgfonte = String(fs); }
    else { h.style.removeProperty('--vg-fs'); delete h.dataset.vgfonte; }
  }
  aplicar(); addEventListener('storage', function (e) { if (!e.key || e.key.indexOf('vidro-') === 0) aplicar(); }); addEventListener('vg-prefs', aplicar);
})();
/* Extras de todas as masterclasses (o publicar.py inclui este arquivo, também nas aulas separadas).

   1. Ampliar imagem: clicar numa figura do conteúdo (segmento, "O que mais é cobrado", questão) abre o
      visualizador em tela cheia: slider de zoom, roda do mouse, pinça, arrastar até os cantos e mini-mapa.
      Fecha com Esc, toque fora da imagem ou ✕. window.VGZoom.abrir(src, legenda) abre por código.
      Master com visualizador próprio pode desligar: <html data-zoom="proprio">.
      Imagem específica fica de fora com data-nozoom.
   2. Crédito no canto: se a página não mostra "Vinícius" e "Matheus" em lugar nenhum, aparece um
      selo discreto no canto inferior esquerdo. */
(function () {
  if (window.__vgExtras) return; window.__vgExtras = true;
  const D = document, html = D.documentElement;
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 1. Ampliar imagem (visualizador com zoom) ----------
     Abre a imagem em tela cheia com: slider de zoom (100% a 1000%), botões − / +, roda do mouse (aproxima onde o
     cursor está), arrastar para mover até os cantos, pinça no celular, duplo clique / duplo toque (aproxima ou volta),
     mini-mapa com o pedaço visível (dá para arrastar nele) e teclado (+ − 0, setas, Esc).
     Nas aulas abertas em iframe, abre no master (tela inteira), se ele tiver o extras.js. */
  const FORA = 'a,button,nav,aside,.sidebar,#sidebar,#side,.sb,[data-nozoom],.vg-zoom,' +
    '[class*="meme"],[class*="Meme"],.ms-wrap,.ms-thumb,.teaser,.lock,.mimg,.mc,dialog';
  const MAX = 10;
  const css = D.createElement('style');
  css.textContent = `
.vg-zoomable{cursor:zoom-in}
.vg-zoom{position:fixed;inset:0;z-index:2147483000;display:flex;flex-direction:column;background:rgba(4,6,10,.92);
  opacity:0;transition:opacity .2s cubic-bezier(.23,1,.32,1);font:14px/1.45 system-ui,sans-serif;color:#e8ecf1;-webkit-user-select:none;user-select:none}
.vg-zoom.on{opacity:1}
.vg-zoom .vz-palco{position:relative;flex:1;min-height:0;overflow:hidden;touch-action:none;cursor:grab}
.vg-zoom .vz-palco.arr{cursor:grabbing}
.vg-zoom .vz-palco>img{position:absolute;left:0;top:0;max-width:none;max-height:none;transform-origin:0 0;will-change:transform;
  border-radius:6px;background:#fff;-webkit-user-drag:none;pointer-events:none}
.vg-zoom.pix .vz-palco>img{image-rendering:pixelated}
.vg-zoom .vz-pe{flex:none;display:flex;flex-direction:column;align-items:center;gap:8px;padding:8px 12px max(12px,env(safe-area-inset-bottom))}
.vg-zoom .vz-cap{max-width:min(92vw,900px);text-align:center;color:#d5dbe2;max-height:4.4em;overflow:auto}
.vg-zoom .vz-bar{display:flex;align-items:center;gap:8px;padding:6px 10px;border-radius:999px;background:rgba(22,26,32,.72);
  border:1px solid rgba(255,255,255,.14);-webkit-backdrop-filter:blur(14px) saturate(1.3);backdrop-filter:blur(14px) saturate(1.3)}
.vg-zoom .vz-bar button{width:36px;height:36px;flex:none;border-radius:50%;border:0;background:rgba(255,255,255,.1);color:#fff;font:600 20px/1 system-ui;cursor:pointer;display:grid;place-items:center;transition:background .15s,transform .1s}
.vg-zoom .vz-bar button:hover{background:rgba(255,255,255,.2)}
.vg-zoom .vz-bar button:active{transform:scale(.95)}
.vg-zoom .vz-bar .vz-fit{width:auto;padding:0 12px;border-radius:999px;font-size:12.5px;font-weight:600}
.vg-zoom .vz-sl{width:min(42vw,260px);accent-color:#7fd1a8;cursor:pointer}
.vg-zoom .vz-pc{min-width:48px;text-align:right;font-variant-numeric:tabular-nums;font-size:12.5px;color:#c4ccd5}
.vg-zoom .vz-x{position:fixed;top:max(12px,env(safe-area-inset-top));right:12px;z-index:2;width:44px;height:44px;border-radius:50%;border:1px solid rgba(255,255,255,.25);
  background:rgba(20,24,30,.75);-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);color:#fff;font:22px/1 system-ui;cursor:pointer}
.vg-zoom .vz-x:active{transform:scale(.97)}
.vg-zoom .vz-mapa{position:absolute;right:12px;bottom:12px;z-index:1;border-radius:8px;overflow:hidden;border:1px solid rgba(255,255,255,.3);
  background:#000;box-shadow:0 6px 20px rgba(0,0,0,.5);opacity:0;pointer-events:none;transition:opacity .2s;touch-action:none;cursor:pointer}
.vg-zoom .vz-mapa.on{opacity:1;pointer-events:auto}
.vg-zoom .vz-mapa img{display:block;width:100%;height:100%;opacity:.75;pointer-events:none}
.vg-zoom .vz-mapa i{position:absolute;border:2px solid #7fd1a8;box-shadow:0 0 0 999px rgba(0,0,0,.35);border-radius:2px;pointer-events:none}
.vg-zoom .vz-dica{font-size:12px;color:#8f9aa6;text-align:center}
@media (max-width:560px){.vg-zoom .vz-sl{width:34vw}.vg-zoom .vz-dica{display:none}}
@media (prefers-reduced-motion:reduce){.vg-zoom{transition:none}}
.vg-credito{position:fixed;left:10px;bottom:8px;z-index:50;font:11px/1.3 system-ui,sans-serif;color:var(--muted,#8a94a3);
  opacity:.75;pointer-events:none;letter-spacing:.01em}
@media print{.vg-credito{position:static;opacity:1}}`;
  D.head.appendChild(css);

  const pode = img => html.dataset.zoom !== 'proprio' && img.tagName === 'IMG' && !img.closest(FORA) &&
    (img.naturalWidth || img.width) >= 120 && img.offsetWidth >= 60;

  // cursor de lupa nas imagens que dá para ampliar
  D.addEventListener('mouseover', e => { const t = e.target; if (t.tagName === 'IMG' && !t.classList.contains('vg-zoomable') && pode(t)) t.classList.add('vg-zoomable'); }, true);

  let aberto = null, voltar = null;
  function fechar() {
    if (!aberto) return; const z = aberto; aberto = null;
    z.classList.remove('on'); setTimeout(() => z.remove(), RM ? 0 : 200);
    D.removeEventListener('keydown', z._tecla, true); removeEventListener('resize', z._resize);
    html.style.overflow = z._ov || '';
    if (voltar && voltar.focus) try { voltar.focus({ preventScroll: true }); } catch (_) { }
  }
  function abrirSrc(src, txt) {
    if (aberto) fechar();
    voltar = D.activeElement;
    const toque = matchMedia('(pointer:coarse)').matches;
    const z = D.createElement('div'); z.className = 'vg-zoom'; z.setAttribute('role', 'dialog'); z.setAttribute('aria-modal', 'true'); z.setAttribute('aria-label', 'Imagem ampliada');
    z.innerHTML = '<div class="vz-palco"><img alt=""><div class="vz-mapa" aria-hidden="true"><img alt=""><i></i></div></div>' +
      '<div class="vz-pe"><div class="vz-cap" hidden></div><div class="vz-bar" data-liquido>' +
      '<button type="button" class="vz-menos" aria-label="Diminuir zoom">−</button>' +
      '<input class="vz-sl" type="range" min="0" max="1000" value="0" aria-label="Zoom">' +
      '<button type="button" class="vz-mais" aria-label="Aumentar zoom">+</button>' +
      '<span class="vz-pc">100%</span><button type="button" class="vz-fit" aria-label="Ajustar à tela">Ajustar</button></div>' +
      '<div class="vz-dica">' + (toque ? 'Pinça ou slider para ampliar · arraste para ver os cantos · toque duplo aproxima' :
        'Roda do mouse ou slider para ampliar · arraste para ver os cantos · duplo clique aproxima · Esc fecha') + '</div></div>' +
      '<button type="button" class="vz-x" aria-label="Fechar" data-liquido>✕</button>';
    const palco = z.querySelector('.vz-palco'), big = palco.querySelector(':scope > img'), mapa = z.querySelector('.vz-mapa'),
      mini = mapa.querySelector('img'), jan = mapa.querySelector('i'), sl = z.querySelector('.vz-sl'), pc = z.querySelector('.vz-pc');
    big.src = src; mini.src = src;
    if (txt) { const c = z.querySelector('.vz-cap'); c.textContent = txt; c.hidden = false; }

    let W = 0, H = 0, fit = 1, s = 1, x = 0, y = 0, raf = 0;
    const PW = () => palco.clientWidth, PH = () => palco.clientHeight;
    function prender() {
      const w = W * s, h = H * s, pw = PW(), ph = PH();
      x = w <= pw ? (pw - w) / 2 : Math.min(0, Math.max(pw - w, x));
      y = h <= ph ? (ph - h) / 2 : Math.min(0, Math.max(ph - h, y));
    }
    function desenhar() {
      raf = 0; if (!W) return; prender();
      big.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px) scale(' + s.toFixed(4) + ')';
      const m = s / fit;
      if (D.activeElement !== sl) sl.value = String(Math.round(Math.log(m) / Math.log(MAX) * 1000));
      pc.textContent = Math.round(m * 100) + '%';
      z.classList.toggle('pix', s > 2.5);
      const w = W * s, h = H * s, pw = PW(), ph = PH(), mostra = w > pw + 1 || h > ph + 1;
      mapa.classList.toggle('on', mostra);
      if (mostra) {
        const mw = mapa.clientWidth, mh = mapa.clientHeight;
        jan.style.left = (-x / w * mw) + 'px'; jan.style.top = (-y / h * mh) + 'px';
        jan.style.width = (Math.min(1, pw / w) * mw) + 'px'; jan.style.height = (Math.min(1, ph / h) * mh) + 'px';
      }
    }
    const pedir = () => { if (!raf) raf = requestAnimationFrame(desenhar); };
    function zoomEm(ns, cx, cy) {
      ns = Math.max(fit, Math.min(fit * MAX, ns));
      if (cx == null) { cx = PW() / 2; cy = PH() / 2; }
      x = cx - (cx - x) * ns / s; y = cy - (cy - y) * ns / s; s = ns; pedir();
    }
    function medir(manter) {
      if (!W) return;
      const rel = s / fit, pw = PW(), ph = PH();
      // imagem pequena não abre esticada até a tela (fica borrada): no máximo ~1,25× o tamanho dela,
      // mas nunca menor que ~520 px no lado maior; o zoom continua livre pelo slider
      fit = Math.min((pw - 24) / W, (ph - 24) / H, Math.max(1.25, 520 / Math.max(W, H)));
      if (!(fit > 0)) fit = 1;
      const lado = innerWidth < 560 ? 96 : 150, mw = W >= H ? lado : lado * W / H;
      mapa.style.width = mw + 'px'; mapa.style.height = (mw * H / W) + 'px';
      if (manter) { s = fit * rel; } else { s = fit; x = (pw - W * s) / 2; y = (ph - H * s) / 2; }
      desenhar();
    }
    function pronto() { W = big.naturalWidth; H = big.naturalHeight; big.style.width = W + 'px'; big.style.height = H + 'px'; medir(false); }
    if (big.complete && big.naturalWidth) requestAnimationFrame(pronto); else big.addEventListener('load', pronto, { once: true });

    // controles
    sl.addEventListener('input', () => zoomEm(fit * Math.pow(MAX, sl.value / 1000)));
    z.querySelector('.vz-mais').addEventListener('click', () => zoomEm(s * 1.5));
    z.querySelector('.vz-menos').addEventListener('click', () => zoomEm(s / 1.5));
    z.querySelector('.vz-fit').addEventListener('click', () => medir(false));
    z.querySelector('.vz-x').addEventListener('click', fechar);
    palco.addEventListener('wheel', e => {
      e.preventDefault();
      const r = palco.getBoundingClientRect(), d = e.deltaY * (e.deltaMode === 1 ? 40 : e.deltaMode === 2 ? 400 : 1);
      zoomEm(s * Math.exp(-d * 0.0018), e.clientX - r.left, e.clientY - r.top);
    }, { passive: false });

    // arrastar, pinça, duplo toque/clique, toque fora da imagem fecha
    const pts = new Map(); let ini = null, andou = 0, ultimo = { t: 0, x: 0, y: 0 };
    const local = e => { const r = palco.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
    function base() {
      const v = [...pts.values()];
      if (v.length >= 2) { const a = v[0], b = v[1]; ini = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2, s, x, y }; }
      else if (v.length === 1) ini = { px: v[0].x, py: v[0].y, x, y };
      else ini = null;
    }
    palco.addEventListener('pointerdown', e => {
      if (e.target.closest('.vz-mapa') || e.button > 0) return;
      try { palco.setPointerCapture(e.pointerId); } catch (_) { }
      pts.set(e.pointerId, local(e)); if (pts.size === 1) andou = 0; base(); palco.classList.add('arr');
    });
    palco.addEventListener('pointermove', e => {
      if (!pts.has(e.pointerId)) return;
      pts.set(e.pointerId, local(e));
      const v = [...pts.values()];
      if (v.length >= 2 && ini && ini.d) {
        const a = v[0], b = v[1], d = Math.hypot(a.x - b.x, a.y - b.y), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        const ns = Math.max(fit, Math.min(fit * MAX, ini.s * d / ini.d));
        x = mx - (ini.mx - ini.x) * ns / ini.s; y = my - (ini.my - ini.y) * ns / ini.s; s = ns; andou += 10; pedir();
      } else if (v.length === 1 && ini && ini.px != null) {
        const dx = v[0].x - ini.px, dy = v[0].y - ini.py; andou = Math.max(andou, Math.hypot(dx, dy));
        x = ini.x + dx; y = ini.y + dy; pedir();
      }
    });
    function solta(e) {
      if (!pts.has(e.pointerId)) return;
      const p = pts.get(e.pointerId); pts.delete(e.pointerId);
      prender(); base();
      if (!pts.size) palco.classList.remove('arr');
      if (pts.size || andou > 6 || e.type === 'pointercancel') return;
      const agora = Date.now();
      if (agora - ultimo.t < 320 && Math.hypot(p.x - ultimo.x, p.y - ultimo.y) < 30) {
        ultimo.t = 0; if (s > fit * 1.05) medir(false); else zoomEm(fit * 3, p.x, p.y); return;
      }
      ultimo = { t: agora, x: p.x, y: p.y };
      const dentro = p.x >= x && p.x <= x + W * s && p.y >= y && p.y <= y + H * s;
      if (!dentro) setTimeout(() => { if (ultimo.t === agora && aberto === z) fechar(); }, 330);
    }
    palco.addEventListener('pointerup', solta); palco.addEventListener('pointercancel', solta);
    palco.addEventListener('dblclick', e => e.preventDefault());

    // mini-mapa: clicar ou arrastar leva a janela até lá
    function irMapa(e) {
      const r = mapa.getBoundingClientRect(), fx = (e.clientX - r.left) / r.width, fy = (e.clientY - r.top) / r.height;
      x = PW() / 2 - fx * W * s; y = PH() / 2 - fy * H * s; pedir();
    }
    mapa.addEventListener('pointerdown', e => { e.stopPropagation(); try { mapa.setPointerCapture(e.pointerId); } catch (_) { } mapa._on = true; irMapa(e); });
    mapa.addEventListener('pointermove', e => { if (mapa._on) irMapa(e); });
    mapa.addEventListener('pointerup', () => { mapa._on = false; });

    z._tecla = e => {
      const k = e.key;
      if (k === 'Escape') { e.stopPropagation(); e.preventDefault(); fechar(); return; }
      if (k === 'Tab') { if (!z.contains(D.activeElement)) { e.preventDefault(); z.querySelector('.vz-x').focus(); } return; }
      if (D.activeElement === sl && /Arrow/.test(k)) return;
      const passo = 80;
      if (k === '+' || k === '=') zoomEm(s * 1.4);
      else if (k === '-' || k === '_') zoomEm(s / 1.4);
      else if (k === '0') medir(false);
      else if (k === 'ArrowLeft') { x += passo; pedir(); } else if (k === 'ArrowRight') { x -= passo; pedir(); }
      else if (k === 'ArrowUp') { y += passo; pedir(); } else if (k === 'ArrowDown') { y -= passo; pedir(); }
      else return;
      e.preventDefault(); e.stopPropagation();
    };
    z._resize = () => medir(true);
    z._ov = html.style.overflow; html.style.overflow = 'hidden';
    D.body.appendChild(z); aberto = z;
    D.addEventListener('keydown', z._tecla, true); addEventListener('resize', z._resize);
    requestAnimationFrame(() => { z.classList.add('on'); z.querySelector('.vz-x').focus({ preventScroll: true }); });
  }
  window.VGZoom = { abrir: abrirSrc };
  function abrir(img) {
    const fig = img.closest('figure'), cap = fig && fig.querySelector('figcaption');
    let legenda = cap ? cap.cloneNode(true) : null;
    if (legenda) legenda.querySelectorAll('button,a').forEach(b => b.remove());
    let txt = (legenda ? legenda.textContent : (img.dataset.caption || img.alt || '')).replace(/\s+/g, ' ').trim();
    if (/^imagem da questão$/i.test(txt)) txt = '';
    const src = img.currentSrc || img.src;
    // aula dentro do master (iframe): abre no master, em tela inteira
    if (window.top !== window) {
      try { const T = window.top; if (T.VGZoom && T.document.documentElement.dataset.zoom !== 'proprio') { T.VGZoom.abrir(new URL(src, location.href).href, txt); return; } } catch (_) { }
    }
    abrirSrc(src, txt);
  }
  D.addEventListener('click', e => {
    const img = e.target;
    if (!img || img.tagName !== 'IMG' || D.documentElement.classList.contains('vge-on') || aberto || !pode(img) || !(img.currentSrc || img.src)) return;
    e.preventDefault(); e.stopPropagation(); abrir(img);
  }, true);

  /* ---------- 2. Crédito no canto ---------- */
  // Confere de novo a cada troca de tela: o selo só aparece quando a página não mostra o crédito dela.
  let selo = null;
  function credito() {
    if (html.classList.contains('vidro-aula') || window.top !== window) return;
    // master de outra autoria (ex.: DIC IV, do Thiaginho) marca o crédito dele com data-credito-proprio: sem selo
    if (D.querySelector('[data-credito-proprio]')) { if (selo) selo.hidden = true; return; }
    const visivel = el => el.checkVisibility ? el.checkVisibility({ opacityProperty: true, visibilityProperty: true }) : !!el.offsetParent;
    let tem = false;
    const w = D.createTreeWalker(D.body, NodeFilter.SHOW_TEXT);
    for (let n; (n = w.nextNode());) {
      if (!/Vin[ií]cius|Matheus/i.test(n.nodeValue)) continue;
      // o crédito pode estar quebrado em vários elementos (<b>Vinícius</b> e <b>Matheus</b>): sobe até 3 níveis
      let el = n.parentElement;
      for (let i = 0; el && i < 3 && !el.closest('.vg-credito'); i++, el = el.parentElement) {
        const tx = el.textContent;
        if (tx.length > 300) break;
        if (/Vin[ií]cius/i.test(tx) && /Matheus/i.test(tx) && visivel(el)) { tem = true; break; }
      }
      if (tem) break;
    }
    if (!selo) { selo = D.createElement('div'); selo.className = 'vg-credito'; selo.textContent = 'by Vinícius Cabral e Matheus Tavares'; D.body.appendChild(selo); }
    selo.hidden = tem;
  }
  let t = 0; const depois = () => { clearTimeout(t); t = setTimeout(credito, 600); };
  if (D.readyState === 'complete') setTimeout(credito, 1500); else addEventListener('load', () => setTimeout(credito, 1500));
  addEventListener('hashchange', depois); D.addEventListener('click', depois, true);
})();
