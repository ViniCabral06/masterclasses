/* Segmentos: três padrões que valem para toda aula de toda masterclass.
   1) Barra lateral: o título do segmento aparece reduzido (no máximo 2 linhas, com reticências); ao abrir o segmento,
      o título completo aparece no "subtítulo" (migalha: Aula › N. título) logo acima do título da página.
   2) Logo abaixo do título principal do segmento: "Segmento X / Y".
   3) O segmento "O que mais cai" ganha uma ⭐ (no menu e no título) e continua podendo ser marcado como concluído.
   O script lê o próprio DOM de cada master (cada um tem uma estrutura), então não precisa de nada no HTML do master. */
(function () {
  const D = document, html = D.documentElement, K = html.dataset.vidro || '';
  if (window.__vgSeg) return; window.__vgSeg = true;
  const STAR = '⭐';
  const reMais = /o que mais (cai|foi cobrado|é cobrado)/i;
  const txt = e => (e ? e.textContent : '').replace(/\s+/g, ' ').trim();
  // texto do título sem os botões "Concluir" e os balões de referência que moram dentro dele
  const tit = e => { if (!e) return ''; const c = e.cloneNode(true); c.querySelectorAll('.done-t,.ref-pop').forEach(x => x.remove()); return txt(c); };

  /* ---------- estilo ---------- */
  const st = D.createElement('style'); st.id = 'vg-seg-css';
  st.textContent = `
.vg-segxy{display:block;margin:6px 0 16px;font:500 13.5px/1.2 var(--vg-text,system-ui,sans-serif);letter-spacing:.02em;color:var(--muted,#8a94a3)}
.vg-segxy b{font-weight:600;color:var(--ink-2,var(--ink,inherit))}
.vg-crumb{display:block;margin:0 0 8px;font:400 13px/1.4 var(--vg-text,system-ui,sans-serif);color:var(--muted,#8a94a3)}
.vg-crumb b{font-weight:500;color:var(--ink-2,var(--ink,inherit))}
.vg-crumb span{opacity:.6;margin:0 4px}
/* barra lateral (padrão da Farmacologia): cada segmento numa linha só, com o nome curto (antes de ":" ou "(");
   o segmento aberto mostra o título inteiro, com o nome curto em negrito */
.vg-sb{display:block!important;flex:1 1 auto;min-width:0;white-space:nowrap!important;overflow:hidden;text-overflow:ellipsis}
.vg-sb .vg-f{display:none}
:is(.it.active,.it.on,.sb.on)>.vg-sb{white-space:normal!important;overflow:visible}
:is(.it.active,.it.on,.sb.on)>.vg-sb .vg-s{font-weight:600}
:is(.it.active,.it.on,.sb.on)>.vg-sb .vg-f{display:inline;font-weight:400;color:var(--ink-2,inherit)}
:is(.it.active,.it.on,.sb.on):has(>.vg-sb){align-items:flex-start}
`;
  D.head.appendChild(st);

  /* ---------- peças ---------- */
  function setXY(after, x, y, id) {
    if (!after || !x || !y) return;
    let el = after.nextElementSibling;
    if (!(el && el.classList.contains('vg-segxy'))) { el = D.createElement('div'); el.className = 'vg-segxy'; after.insertAdjacentElement('afterend', el); }
    const h = `Segmento <b>${x}</b> / ${y}`; if (el.dataset.k !== h) { el.innerHTML = h; el.dataset.k = h; }
  }
  function setCrumb(before, aula, titulo, x) {
    if (!before || !titulo) return;
    let el = before.previousElementSibling;
    if (!(el && el.classList.contains('vg-crumb'))) { el = D.createElement('div'); el.className = 'vg-crumb'; before.insertAdjacentElement('beforebegin', el); }
    const h = (aula ? aula + '<span>›</span>' : '') + '<b>' + (x ? x + '. ' : '') + titulo.replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c])) + '</b>';
    if (el.dataset.k !== h) { el.innerHTML = h; el.dataset.k = h; }
  }
  function starTitle(el) { if (el && reMais.test(tit(el)) && !tit(el).startsWith(STAR)) el.insertBefore(D.createTextNode(STAR + ' '), el.firstChild); }

  /* ---------- Patologia: dentro de cada aula (iframe) ---------- */
  function patoAula() {
    const navs = [...D.querySelectorAll('.nav-item[data-target]')];
    const segs = navs.filter(n => /^seg\d+$/.test(n.dataset.target));
    const y = segs.length;
    navs.forEach(n => { const l = [...n.querySelectorAll('span')].pop(); if (l && reMais.test(txt(l))) starTitle(l); });
    const capa = D.querySelector('#capa');
    const kick = txt(capa && capa.querySelector('.kicker,.eyebrow,.pane-kicker,[class*="kick"]'));
    const nome = txt(capa && capa.querySelector('h1'));
    const aula = [kick, nome].filter(Boolean).join(' · ') || (D.title || '').replace(/^Masterclass\s*[—-]\s*/, '');
    D.querySelectorAll('section.pane').forEach(p => {
      const m = /^seg(\d+)$/.exec(p.id); if (!m) return;
      const h1 = p.querySelector('h1.pane-title,h1'); if (!h1) return;
      starTitle(h1);
      setCrumb(h1, aula, tit(h1).replace(new RegExp('^' + STAR + '\\s*'), ''), +m[1]);
      setXY(h1, +m[1], y);
    });
  }

  /* ---------- Farmacologia ---------- */
  function farmaco() {
    D.querySelectorAll('.ptop .k').forEach(k => {
      const m = /^(.*?)\s*·\s*Segmento\s+(\d+)\s+de\s+(\d+)\s*$/.exec(txt(k)); const h1 = k.parentElement.querySelector('h1');
      if (m && h1) { k.textContent = m[1]; setXY(h1, +m[2], +m[3]); }
      else if (k.dataset.vgx && h1) setXY(h1, +k.dataset.vgx, +k.dataset.vgy);
      if (m && h1) { k.dataset.vgx = m[2]; k.dataset.vgy = m[3]; }
    });
  }

  /* ---------- Microbiologia ---------- */
  function micro() {
    const page = D.querySelector('#view .page'); if (!page) return;
    const c = page.querySelector('.crumb'), h1 = page.querySelector('h1.pt'); if (!c || !h1) return;
    const m = /^(.*?)\s*·\s*Segmento\s+(\d+)\s+de\s+(\d+)\s*$/.exec(txt(c));
    if (m) { c.dataset.vgx = m[2]; c.dataset.vgy = m[3]; c.dataset.vgAula = m[1]; }
    if (c.dataset.vgx) {
      const t = tit(h1).replace(new RegExp('^' + STAR + '\\s*'), ''), h = '<span class="vg-aula">' + c.dataset.vgAula.replace(/[<>&]/g, '') + '</span><span>›</span><b>' + c.dataset.vgx + '. ' + t.replace(/[<>&]/g, '') + '</b>';
      if (c.dataset.vgK !== h) { c.innerHTML = h; c.dataset.vgK = h; }
      setXY(h1, +c.dataset.vgx, +c.dataset.vgy);
    }
    starTitle(h1);
  }

  /* ---------- Humanização e Medicina Preventiva ---------- */
  function humaPrev() {
    D.querySelectorAll('main section.section').forEach(sec => {
      const eb = sec.querySelector('.eyebrow'), h2 = sec.querySelector('h2'); if (!eb || !h2) return;
      const m = /^Segmento\s+(\d+)$/.exec(txt(eb)); if (m) eb.dataset.vgx = m[1];
      const lh = D.querySelector('[data-lesson-h="' + sec.id.split('-')[0] + '"]');
      const cnt = lh && /\/(\d+)/.exec(txt(lh.querySelector('.cnt'))); if (cnt) sec.dataset.vgy = cnt[1];
      const aula = lh ? txt(lh.querySelector('.lbl')).replace(/\s+/g, ' ') : '';
      if (eb.dataset.vgx) {
        eb.classList.add('vg-crumb'); const t = tit(h2).replace(new RegExp('^' + STAR + '\\s*'), '');
        if (!eb.dataset.vgDone || eb.dataset.vgDone !== t) { eb.innerHTML = (aula ? aula.replace(/[<>&]/g, '') + '<span>›</span>' : '') + '<b>' + eb.dataset.vgx + '. ' + t.replace(/[<>&]/g, '') + '</b>'; eb.dataset.vgDone = t; }
        if (sec.dataset.vgy) setXY(h2, +eb.dataset.vgx, +sec.dataset.vgy);
      }
      if (/^⭐?\s*O que mais foi cobrado/.test(tit(h2))) starTitle(h2);
    });
  }

  /* ---------- barra lateral: nome curto + título inteiro no item aberto ---------- */
  const SB = { pato: '.it>.x', huma: '#nav .it>.x', prev: '#nav .it>.x', port: '.sb>.x', micro: '.it>.lb' }[K];
  function sidebar() {
    if (!SB || html.classList.contains('vidro-aula')) return;
    D.querySelectorAll(SB).forEach(x => {
      const full = txt(x);
      if (x.dataset.vgs === full) return;
      let cut = -1;
      [': ', ' (', ' — ', ' – '].forEach(sep => { const i = full.indexOf(sep); if (i > 0 && (cut < 0 || i < cut)) cut = i; });
      const e = s => s.replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
      x.innerHTML = cut > 0 ? '<span class="vg-s">' + e(full.slice(0, cut)) + '</span><span class="vg-f">' + e(full.slice(cut)) + '</span>' : '<span class="vg-s">' + e(full) + '</span>';
      x.classList.add('vg-sb'); x.dataset.vgs = full;
      const it = x.parentElement; if (it && !it.title) it.title = full;
    });
  }

  /* ---------- varredura ---------- */
  function run() {
    try { sidebar(); } catch (e) { /* nunca quebra o master */ }
    try {
      if (html.classList.contains('vidro-aula') && K === 'pato') patoAula();
      else if (K === 'farmaco') farmaco();
      else if (K === 'micro') micro();
      else if (K === 'huma' || K === 'prev') humaPrev();
    } catch (e) { /* nunca quebra o master */ }
  }
  let t = 0;
  const later = () => { if (!t) t = setTimeout(() => { t = 0; run(); }, 80); };
  function start() {
    run();
    // a barra lateral é ajustada na hora (antes de a tela desenhar), senão o título cru pisca e a lista "pula"
    new MutationObserver(() => { try { sidebar(); } catch (e) {} later(); }).observe(D.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden', 'class'] });
    addEventListener('hashchange', later);
  }
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', start); else start();
})();
