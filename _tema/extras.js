/* Extras de todas as masterclasses (o publicar.py inclui este arquivo, também nas aulas separadas).

   1. Ampliar imagem: clicar numa figura do conteúdo (segmento, "O que mais é cobrado", questão) abre a
      imagem grande, sem sair da página. Fecha com Esc, clique fora ou ✕. Clicar na imagem aberta
      alterna entre "caber na tela" e "tamanho real" (com rolagem).
      Master com visualizador próprio pode desligar: <html data-zoom="proprio">.
      Imagem específica fica de fora com data-nozoom.
   2. Crédito no canto: se a página não mostra "Vinícius" e "Matheus" em lugar nenhum, aparece um
      selo discreto no canto inferior esquerdo. */
(function () {
  if (window.__vgExtras) return; window.__vgExtras = true;
  const D = document, html = D.documentElement;
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 1. Ampliar imagem ---------- */
  const FORA = 'a,button,nav,aside,.sidebar,#sidebar,#side,.sb,[data-nozoom],.vg-zoom,' +
    '[class*="meme"],[class*="Meme"],.ms-wrap,.ms-thumb,.teaser,.lock,.mimg,.mc,dialog';
  const css = D.createElement('style');
  css.textContent = `
.vg-zoomable{cursor:zoom-in}
.vg-zoom{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;
  background:rgba(4,6,10,.88);padding:max(16px,env(safe-area-inset-top)) 16px 16px;opacity:0;transition:opacity .2s cubic-bezier(.23,1,.32,1)}
.vg-zoom.on{opacity:1}
.vg-zoom .vz-box{max-width:100%;max-height:100%;overflow:auto;display:flex;flex-direction:column;align-items:center;gap:10px;
  transform:scale(.96);transition:transform .25s cubic-bezier(.23,1,.32,1)}
.vg-zoom.on .vz-box{transform:scale(1)}
.vg-zoom img{display:block;max-width:min(96vw,1600px);max-height:84vh;object-fit:contain;border-radius:10px;background:#fff;cursor:zoom-in}
.vg-zoom.real img{max-width:none;max-height:none;cursor:zoom-out}
.vg-zoom.real .vz-box{align-items:flex-start;width:100%;height:100%}
.vg-zoom .vz-cap{max-width:min(92vw,900px);color:#e8ecf1;font:14px/1.5 system-ui,sans-serif;text-align:center}
.vg-zoom .vz-x{position:fixed;top:max(12px,env(safe-area-inset-top));right:12px;width:44px;height:44px;border-radius:50%;border:1px solid rgba(255,255,255,.25);
  background:rgba(20,24,30,.8);color:#fff;font:22px/1 system-ui;cursor:pointer}
.vg-zoom .vz-x:active{transform:scale(.97)}
.vg-zoom .vz-dica{position:fixed;bottom:12px;left:50%;transform:translateX(-50%);color:#aab4c0;font:12px system-ui;pointer-events:none}
@media (prefers-reduced-motion:reduce){.vg-zoom,.vg-zoom .vz-box{transition:none;transform:none}}
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
    D.removeEventListener('keydown', tecla, true);
    if (voltar && voltar.focus) try { voltar.focus({ preventScroll: true }); } catch (_) { }
  }
  function tecla(e) { if (e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); fechar(); } else if (e.key === 'Tab') { e.preventDefault(); aberto.querySelector('.vz-x').focus(); } }
  function abrir(img) {
    voltar = D.activeElement;
    const fig = img.closest('figure'), cap = fig && fig.querySelector('figcaption');
    let legenda = cap ? cap.cloneNode(true) : null;
    if (legenda) legenda.querySelectorAll('button,a').forEach(b => b.remove());
    const z = D.createElement('div'); z.className = 'vg-zoom'; z.setAttribute('role', 'dialog'); z.setAttribute('aria-modal', 'true'); z.setAttribute('aria-label', 'Imagem ampliada');
    z.innerHTML = '<div class="vz-box"><img alt=""></div><button type="button" class="vz-x" aria-label="Fechar">✕</button><span class="vz-dica">Toque na imagem para ver no tamanho real · Esc fecha</span>';
    const big = z.querySelector('img'); big.src = img.currentSrc || img.src; big.alt = img.alt || '';
    const txt = legenda ? legenda.textContent.trim() : (img.alt || '').trim();
    if (txt && !/^imagem da questão$/i.test(txt)) { const p = D.createElement('div'); p.className = 'vz-cap'; p.textContent = txt; z.querySelector('.vz-box').appendChild(p); }
    z.addEventListener('click', e => {
      if (e.target === big) { z.classList.toggle('real'); return; }
      fechar();
    });
    D.body.appendChild(z); aberto = z;
    D.addEventListener('keydown', tecla, true);
    requestAnimationFrame(() => { z.classList.add('on'); z.querySelector('.vz-x').focus({ preventScroll: true }); });
  }
  D.addEventListener('click', e => {
    const img = e.target;
    if (!img || img.tagName !== 'IMG' || aberto || !pode(img) || !(img.currentSrc || img.src)) return;
    e.preventDefault(); e.stopPropagation(); abrir(img);
  }, true);

  /* ---------- 2. Crédito no canto ---------- */
  // Confere de novo a cada troca de tela: o selo só aparece quando a página não mostra o crédito dela.
  let selo = null;
  function credito() {
    if (html.classList.contains('vidro-aula') || window.top !== window) return;
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
