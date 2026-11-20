/* 🔗 Ligações entre matérias.
   Depois da frase que cita um tema explicado em outra matéria, aparece um 🔗. Passando o mouse (ou tocando, no celular),
   abre a caixinha escura com o que a outra matéria ensina e o botão "Ir para o conteúdo", que abre o outro master
   numa guia nova, já no segmento, rolando até o trecho e piscando nele.
   - Os dados ficam em _tema/elos.json: conceitos (rótulo e sinônimos), descrições (uma por conceito × matéria de destino,
     com o segmento-casa) e, por master, quais ligações cada segmento recebe. Nada fica no HTML dos masters.
   - O 🔗 é desenhado pelo CSS (::after), sem texto no DOM: não mexe na busca nem na âncora dos grifos e anotações.
   - Nunca entra nas questões (de prova ou autorais), nos títulos nem nos botões.
   - Patologia: as aulas abrem em iframe (aulas/); o script roda no master e trabalha dentro do iframe.
   Cada master tem um adaptador em AD (segmento aberto, onde fica o texto, como abrir um segmento). */
(function () {
  const D = document, html = D.documentElement, K = html.dataset.vidro || '';
  if (window.__vgElos || window.__vgIndex || html.classList.contains('vidro-aula')) return; window.__vgElos = true;
  const eu = D.currentScript || [...D.scripts].find(s => /\/elos\.js/.test(s.src));
  const BASE = eu ? eu.src.replace(/[^/]*$/, '') : '_tema/';            // .../_tema/
  const RAIZ_SITE = new URL('../', BASE).href;                            // raiz do site
  const VER = (eu && (eu.dataset.v || (eu.src.match(/[?&]v=([\w]+)/) || [])[1])) || '';

  const $ = (s, r) => (r || D).querySelector(s), $$ = (s, r) => [...(r || D).querySelectorAll(s)];
  const visivel = e => !!(e && (e.offsetParent !== null || e.getClientRects().length));
  // fora do 🔗: questões, blocos de prova, títulos, botões, navegação e peças do tema
  const FORA = '.qsec,.qset,.q,.qzone,.qcard,.qsection,.vblock,.pv-box,.pv-aut,.quiz,.quiz-item,.qblock,.aut-box,.navfoot,.vga-seg,'
    + '.vg-crumb,.vg-segxy,.legend,.done-bar,.crumb,.actions,.ref-pop,.vg-meme,.mode-note,.sec-disc,.toc,.ptop,.sec-title,.pane-title,'
    + 'h1,h2,h3,h4,h5,h6,summary,button,a,label,input,select,textarea,figcaption,code,pre,script,style,svg,.vg-elo,.vg-n-ui,mark.vg-elo-alvo';
  const BLOCO = 'p,li,td,th,dd,dt,blockquote,div,section,article,aside,details,figure';

  /* ---------- adaptadores: seg() id aberto · raiz() onde está o texto · ir(id) · vigia(fn) ---------- */
  const hashId = () => decodeURIComponent((location.hash || '').slice(1));
  const porHash = sel => ({
    seg: hashId,
    raiz: () => $$(sel).find(visivel) || null,
    ir: id => { if (hashId() !== id) location.hash = '#' + id; },
    vigia: fn => { addEventListener('hashchange', fn); const v = $('#view') || $('#main') || $('main') || D.body; new MutationObserver(fn).observe(v, { childList: true, subtree: true }); },
  });
  const AD = {
    micro: porHash('#prose'),
    semio: porHash('#prose'),
    prev: porHash('#main .section[id]'),
    img: porHash('#main .section[id]'),
    lab: porHash('#main .section[id]'),
    dic: porHash('section.content.section'),
    farmaco: {
      seg: () => { const a = $('.sb-nav .it.active'); return a ? a.dataset.id : hashId(); },
      raiz: () => { const p = $('.pane.active'); return p ? ($('.body', p) || p) : null; },
      ir: id => { if (window.MC && MC.go) MC.go(id); else location.hash = '#' + id; },
      vigia: fn => { D.addEventListener('pane', fn); addEventListener('hashchange', fn); },
    },
    pato: {
      fr: () => $$('iframe').find(visivel),
      seg: () => { const it = $('#tabbtns .it.on[data-seg], #tabbtns .it.active[data-seg]'); return it ? it.dataset.key + '/' + it.dataset.seg : ''; },
      raiz: () => {
        const f = AD.pato.fr(), d = f && f.contentDocument, [k, s] = AD.pato.seg().split('/'); if (!d || !s) return null;
        if (!decodeURIComponent(d.location.pathname).endsWith('/' + k + '.html')) return null; // o iframe ainda é da aula anterior
        const el = d.getElementById(s); return el && visivel(el) ? el : (d.getElementById('content') || null);
      },
      ir: id => { const [k, s] = id.split('/'), el = $('#tabbtns .it[data-key="' + k + '"][data-seg="' + s + '"]'); if (el) el.click(); },
      vigia: fn => {
        const t = $('#tabbtns'); if (t) new MutationObserver(fn).observe(t, { attributes: true, subtree: true, attributeFilter: ['class'] });
        D.addEventListener('load', e => {
          if (e.target.tagName !== 'IFRAME') return; fn();
          try { const w = e.target.contentWindow; w.addEventListener('hashchange', fn); new MutationObserver(fn).observe(w.document.body, { childList: true, subtree: true }); } catch (x) {}
        }, true);
      },
    },
  };
  const A = AD[K]; if (!A) return;

  /* ---------- texto normalizado (sem acento), com a mesma posição de cada letra ---------- */
  const semAcento = t => { let o = ''; for (const c of t) { const n = c.normalize('NFD').replace(/[̀-ͯ]/g, ''); o += n.length === 1 ? n : c; } return o; };
  let DADOS = null, RX = {};
  const rx = k => RX[k] || (RX[k] = ((DADOS.c[k] || {}).p || []).map(p => p[0] === '=' ? { cs: true, r: new RegExp(p.slice(1)) } : { cs: false, r: new RegExp(p) }));

  // blocos de texto da raiz: [{el, nos:[{n, ini}], tx, txl}] na ordem do documento
  function blocos(raiz) {
    const w = raiz.ownerDocument.createTreeWalker(raiz, NodeFilter.SHOW_TEXT, {
      acceptNode: n => (!n.nodeValue.trim() || (n.parentElement && n.parentElement.closest(FORA))) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT,
    });
    const mapa = new Map(), ordem = [];
    for (let n = w.nextNode(); n; n = w.nextNode()) {
      const el = n.parentElement.closest(BLOCO) || raiz;
      let b = mapa.get(el); if (!b) { b = { el, nos: [], tx: '' }; mapa.set(el, b); ordem.push(b); }
      b.nos.push({ n, ini: b.tx.length }); b.tx += n.nodeValue;
    }
    ordem.forEach(b => { b.sa = semAcento(b.tx); b.sl = b.sa.toLowerCase(); });
    return ordem;
  }
  function acha(b, k) {
    let melhor = null;
    for (const { cs, r } of rx(k)) { const m = r.exec(cs ? b.sa : b.sl); if (m && (!melhor || m.index < melhor.i)) melhor = { i: m.index, f: m.index + m[0].length }; }
    return melhor;
  }
  // fim da frase depois da posição p: ponto (não de abreviação como "S. aureus"), ! ? ; ou o fim do bloco
  function fimDaFrase(tx, p) {
    const re = /[.!?;:](?=\s+[A-ZÀ-Ú0-9(“"•–-]|\s*$)|\)(?=\s*$)/g; re.lastIndex = p;
    for (let m = re.exec(tx); m; m = re.exec(tx)) { if (!/\b[A-Za-z]\.$/.test(tx.slice(Math.max(0, m.index - 2), m.index + 1)) || m.index + 1 >= tx.trimEnd().length) return m.index + 1; }
    return tx.trimEnd().length;
  }
  function noDe(b, pos) { // nó de texto e posição dentro dele
    for (let i = b.nos.length - 1; i >= 0; i--) if (b.nos[i].ini <= pos) { const x = b.nos[i]; return { n: x.n, o: Math.min(pos - x.ini, x.n.nodeValue.length) }; }
    return { n: b.nos[0].n, o: 0 };
  }

  /* ---------- 🔗 no segmento aberto ---------- */
  let ocupado = false, ultimo = '', tentativas = 0, segTent = '';
  function aplicar() {
    if (!DADOS || ocupado) return;
    const sg = A.seg(), raiz = A.raiz();
    if (sg !== segTent) { segTent = sg; tentativas = 0; }
    // a página do segmento ainda está chegando (iframe trocando de aula, conteúdo montado por JS): tenta de novo
    if (!sg || !raiz || raiz.textContent.trim().length < 40) { if (sg && tentativas++ < 12) setTimeout(depois, 350); return; }
    const lista = ((DADOS.l[K] || {})[sg]) || [];
    const marca = sg + '|' + lista.length;
    if (raiz.querySelector('.vg-elo') && raiz.dataset.vgElos === marca) return;
    if (!lista.length) return;
    ocupado = true;
    try {
      raiz.querySelectorAll('.vg-elo').forEach(e => e.remove());
      const bs = blocos(raiz), pontos = new Map(); // bloco -> Map(pos -> [ligações])
      for (const [k, md] of lista) {
        if (!DADOS.d[k + '|' + md]) continue;
        for (const b of bs) {
          const m = acha(b, k); if (!m) continue;
          const pos = fimDaFrase(b.tx, m.f);
          const pb = pontos.get(b) || new Map(); pontos.set(b, pb);
          (pb.get(pos) || pb.set(pos, []).get(pos)).push([k, md]);
          break;
        }
      }
      pontos.forEach((pb, b) => [...pb.keys()].sort((x, y) => y - x).forEach(pos => {
        const { n, o } = noDe(b, pos), doc = n.ownerDocument;
        const sp = doc.createElement('span'); sp.className = 'vg-elo'; sp.tabIndex = 0; sp.setAttribute('role', 'button');
        const ls = pb.get(pos); sp.dataset.l = ls.map(x => x.join('>')).join(',');
        sp.setAttribute('aria-label', 'Ligação com ' + ls.map(([, md]) => (DADOS.m[md] || [md])[0]).join(', '));
        const resto = o < n.nodeValue.length ? n.splitText(o) : null;
        n.parentNode.insertBefore(sp, resto || n.nextSibling);
      }));
      raiz.dataset.vgElos = marca; montarDoc(raiz.ownerDocument);
    } finally { setTimeout(() => { ocupado = false; }, 0); }
    ultimo = sg;
  }
  let tAplicar = 0;
  const depois = () => { clearTimeout(tAplicar); tAplicar = setTimeout(() => { aplicar(); pousar(); }, 220); };

  /* ---------- caixinha (mesmo visual das anotações: .vg-n-ui .vg-n-tip) ---------- */
  const docs = new WeakMap();
  const escapar = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function urlDe(k, md) {
    const d = DADOS.d[k + '|' + md], m = DADOS.m[md]; if (!d || !m) return '';
    const u = new URL(encodeURI(m[1]), RAIZ_SITE); u.searchParams.set('elo', k); u.searchParams.set('seg', d.s);
    if (md !== 'pato') u.hash = '#' + d.s; // Patologia abre a aula pelo clique na barra (o script cuida na chegada)
    return u.href;
  }
  function montarDoc(doc) {
    if (docs.has(doc)) return docs.get(doc);
    const tip = doc.createElement('div'); tip.className = 'vg-n-ui vg-n-tip vg-elo-tip'; tip.setAttribute('role', 'dialog');
    doc.body.appendChild(tip);
    let tHide = 0, preso = null;
    const win = doc.defaultView;
    const esconder = () => { tip.classList.remove('on'); if (preso) preso.classList.remove('on'); preso = null; };
    function mostrar(sp, fixo) {
      clearTimeout(tHide);
      const ls = sp.dataset.l.split(',').map(x => x.split('>'));
      tip.innerHTML = '<div class="vg-elo-h">🔗 Liga com ' + (ls.length > 1 ? 'outras matérias' : 'outra matéria') + '</div>' + ls.map(([k, md]) => {
        const d = DADOS.d[k + '|' + md] || {}, m = DADOS.m[md] || [md, '', '🔗'];
        return '<div class="vg-elo-i"><div class="vg-elo-m">' + m[2] + ' <b>' + escapar(m[0]) + '</b>' + (d.a ? ' · ' + escapar(d.a) : '') + '</div>'
          + '<div class="vg-elo-tx">' + escapar(d.t || '') + '</div>'
          + '<div class="vg-elo-ch"><a class="ir" data-u="' + escapar(urlDe(k, md)) + '">Ir para o conteúdo ↗</a></div></div>';
      }).join('');
      if (preso && preso !== sp) preso.classList.remove('on');
      preso = sp; sp.classList.add('on');
      tip.style.left = '0px'; tip.style.top = '0px'; tip.classList.add('on');
      const r = sp.getBoundingClientRect(), w = tip.offsetWidth, h = tip.offsetHeight, W = win.innerWidth, H = win.innerHeight;
      const x = Math.min(W - w - 10, Math.max(10, r.left - 16));
      let y = r.top - h - 8; if (y < 10) y = r.bottom + 8; if (y + h > H - 10) y = Math.max(10, H - h - 10);
      tip.style.left = x + 'px'; tip.style.top = y + 'px'; tip.dataset.fixo = fixo ? '1' : '';
    }
    const toque = win.matchMedia && win.matchMedia('(hover: none)').matches;
    doc.addEventListener('mouseover', e => { if (toque) return; const sp = e.target.closest && e.target.closest('.vg-elo'); if (sp) mostrar(sp, false); });
    doc.addEventListener('mouseout', e => { if (toque) return; const sp = e.target.closest && e.target.closest('.vg-elo'); if (sp && !tip.dataset.fixo) tHide = setTimeout(esconder, 650); });
    tip.addEventListener('mouseenter', () => clearTimeout(tHide));
    tip.addEventListener('mouseleave', () => { if (!tip.dataset.fixo) tHide = setTimeout(esconder, 400); });
    doc.addEventListener('click', e => {
      const sp = e.target.closest && e.target.closest('.vg-elo');
      if (sp) { e.preventDefault(); e.stopPropagation(); if (preso === sp && tip.classList.contains('on') && tip.dataset.fixo) esconder(); else mostrar(sp, true); return; }
      const ir = e.target.closest && e.target.closest('.vg-elo-tip a.ir');
      if (ir) { e.preventDefault(); e.stopPropagation(); const u = ir.dataset.u; if (u) window.open(u, '_blank', 'noopener'); esconder(); return; }
      if (!(e.target.closest && e.target.closest('.vg-elo-tip'))) esconder();
    }, true);
    doc.addEventListener('keydown', e => {
      const sp = e.target.closest && e.target.closest('.vg-elo');
      if (sp && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); mostrar(sp, true); }
      if (e.key === 'Escape') esconder();
    });
    win.addEventListener('scroll', () => { if (!tip.dataset.fixo) esconder(); }, { passive: true, capture: true });
    const api = { esconder }; docs.set(doc, api); return api;
  }

  /* ---------- chegada: ?elo=<conceito>&seg=<segmento> abre o segmento e pisca no trecho ---------- */
  const q = new URLSearchParams(location.search);
  let alvo = q.get('elo') ? { k: q.get('elo'), s: q.get('seg') || hashId(), t0: Date.now() } : null;
  function pousar() {
    if (!alvo || !DADOS) return;
    if (Date.now() - alvo.t0 > 20000) { alvo = null; return; }
    if (A.seg() !== alvo.s) { if (!alvo.foi) { alvo.foi = 1; A.ir(alvo.s); } return; }
    const raiz = A.raiz(); if (!raiz || raiz.textContent.trim().length < 40) return;
    const bs = blocos(raiz); let achou = null;
    for (const b of bs) { const m = acha(b, alvo.k); if (m) { achou = { b, m }; break; } }
    const k = alvo.k; alvo = null;
    try { const u = new URL(location.href); u.searchParams.delete('elo'); u.searchParams.delete('seg'); history.replaceState(history.state, '', u.pathname + u.search + u.hash); } catch (e) {}
    if (!achou) { raiz.scrollIntoView({ block: 'start' }); return; }
    const a = noDe(achou.b, achou.m.i), f = noDe(achou.b, achou.m.f), doc = a.n.ownerDocument;
    const mk = doc.createElement('mark'); mk.className = 'vg-elo-alvo'; mk.title = (DADOS.c[k] || {}).r || '';
    try {
      const rg = doc.createRange(); rg.setStart(a.n, a.o); if (f.n === a.n) rg.setEnd(f.n, f.o); else rg.setEnd(a.n, a.n.nodeValue.length);
      rg.surroundContents(mk);
    } catch (e) { a.n.parentNode.insertBefore(mk, a.n); }
    // alguns masters voltam ao topo depois de montar o segmento: rola de novo, a não ser que a pessoa já tenha rolado
    let mexeu = false; const parou = () => { mexeu = true; };
    ['wheel', 'touchstart', 'keydown'].forEach(ev => doc.defaultView.addEventListener(ev, parou, { once: true, passive: true }));
    [60, 500, 1200, 2200].forEach((t, i) => setTimeout(() => {
      if (mexeu || !mk.isConnected) return;
      const r = mk.getBoundingClientRect(), H = doc.defaultView.innerHeight;
      if (i === 0 || r.top < 60 || r.bottom > H - 60) mk.scrollIntoView({ block: 'center', behavior: i === 0 ? 'smooth' : 'auto' });
    }, t));
    setTimeout(() => { const p = mk.parentNode; if (!p) return; while (mk.firstChild) p.insertBefore(mk.firstChild, mk); mk.remove(); p.normalize(); }, 7000);
  }

  /* ---------- início ---------- */
  function iniciar() {
    fetch(BASE + 'elos.json' + (VER ? '?v=' + VER : '')).then(r => r.ok ? r.json() : null).then(j => {
      if (!j) return; DADOS = j;
      A.vigia(depois); depois();
      if (alvo) { const t = setInterval(() => { pousar(); if (!alvo) clearInterval(t); }, 300); }
    }).catch(() => {});
  }
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
