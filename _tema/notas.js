/* Grifar com anotação v2 — vale para todas as masterclasses e aulas (o publicar.py inclui este arquivo).
   - 3 cores pessoais que NUNCA colidem com os 5 grifos de frequência de prova (verde, amarelo, laranja, vermelho, preto):
       rosa  (#ffd3ea) · Importante (padrão)
       lilas (#e6d6ff) · Dúvida / Revisar
       azul  (#cdeeff) · Decorar / Fórmula
   - Permite trocar a cor do grifo, editar/remover anotação e exportar todas as anotações da matéria (inclusive
     consolidando todas as aulas da Patologia).
   - Guardado em localStorage por página (vidro-notas:<pathname>), ancorado pelo texto + contexto. */
(function () {
  if (window.__vgNotas) return; window.__vgNotas = true;
  const D = document, html = D.documentElement;
  const KEY = 'vidro-notas:' + location.pathname;
  const CORES = [
    { k: 'rosa', nome: 'Importante', bg: '#ffd3ea', ln: '#f39ac6' },
    { k: 'lilas', nome: 'Dúvida', bg: '#e6d6ff', ln: '#b48cff' },
    { k: 'azul', nome: 'Decorar', bg: '#cdeeff', ln: '#5cc2f2' }
  ];
  const corDe = k => CORES.find(c => c.k === k) || CORES[0];
  let corAtiva = 'rosa';
  try { const c = localStorage.getItem('vidro-notas-cor'); if (CORES.some(x => x.k === c)) corAtiva = c; } catch (_) {}

  const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (_) { return []; } };
  const avisar = () => { try { D.dispatchEvent(new CustomEvent('vg-notas')); } catch (_) { } };
  const save = l => { try { localStorage.setItem(KEY, JSON.stringify(l)); } catch (_) { } avisar(); };
  let notas = load();

  /* lista consolidada da matéria inteira (na Patologia junta a pasta inteira, incluindo aulas/*.html) */
  function listaMateria() {
    const out = [];
    const pasta = location.pathname.replace(/\/aulas\/[^/]*$/, '/').replace(/[^/]*$/, '');
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k || !k.startsWith('vidro-notas:')) continue;
        const p = k.slice('vidro-notas:'.length);
        if (p === location.pathname || (pasta && pasta !== '/' && p.startsWith(pasta))) {
          const arr = JSON.parse(localStorage.getItem(k) || '[]');
          const orig = p.split('/').pop().replace(/\.html$/i, '');
          arr.forEach(n => out.push(Object.assign({ _k: k, _orig: orig }, n)));
        }
      }
    } catch (_) { return notas.slice(); }
    return out.sort((a, b) => (a.d || 0) - (b.d || 0));
  }

  function exportar() {
    const todas = listaMateria();
    if (!todas.length) { alert('Você ainda não tem grifos ou anotações salvos nesta matéria.'); return; }
    const titulo = (D.title || 'Masterclass').replace(/^(🍅|☕|⏸)( ⏸)? \d+:\d\d · /u, '');
    const linhas = ['# Minhas anotações · ' + titulo, 'Exportado em ' + new Date().toLocaleString('pt-BR'), ''];
    todas.forEach((n, idx) => {
      const c = corDe(n.c);
      linhas.push(`## ${idx + 1}. [${c.nome}]${n.h ? ' (' + n.h + ')' : ''}`);
      linhas.push('> ' + String(n.q || '').replace(/\s+/g, ' ').trim());
      if (n.t) linhas.push('', '**Nota:** ' + n.t.trim());
      linhas.push('');
    });
    const txt = linhas.join('\n');
    const blob = new Blob([txt], { type: 'text/markdown;charset=utf-8' });
    const a = D.createElement('a'), url = URL.createObjectURL(blob);
    a.href = url; a.download = 'anotacoes-' + (html.dataset.vidro || 'masterclass') + '.md';
    D.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const raiz = () => D.querySelector('main, #main, #view, .main') || D.body;
  const FORA = 'input,textarea,button,select,script,style,nav,aside,.sidebar,#sidebar,#side,.sb,.top,#top,.mbar,.tip,#tip,#hlbtn,.hlbtn,.vg-n-ui,#vidro-fx,#vidro-pers,#vidro-home,#vidro-load,[contenteditable]';

  /* ---------- texto <-> posição ---------- */
  function textNodes(root) {
    const w = D.createTreeWalker(root, NodeFilter.SHOW_TEXT), a = []; let n;
    while ((n = w.nextNode())) a.push(n);
    return a;
  }
  const offsetDe = (root, node, off) => { const r = D.createRange(); r.setStart(root, 0); r.setEnd(node, off); return r.toString().length; };
  function envolver(root, ini, fim, id, cor) {
    const out = []; let s = 0;
    const cls = 'vg-nota' + (cor && cor !== 'rosa' ? ' vg-c-' + cor : '');
    for (const n of textNodes(root)) {
      const L = n.nodeValue.length, a = s, b = s + L; s = b;
      if (b <= ini) continue; if (a >= fim) break;
      const de = Math.max(0, ini - a), ate = Math.min(L, fim - a); if (ate <= de) continue;
      if (n.parentNode.closest && n.parentNode.closest('script,style')) continue;
      if (!n.nodeValue.slice(de, ate).trim()) continue;
      const r = D.createRange(); r.setStart(n, de); r.setEnd(n, ate);
      const m = D.createElement('mark'); m.className = cls; m.dataset.n = id;
      try { r.surroundContents(m); out.push(m); } catch (_) { }
    }
    if (out.length) out[out.length - 1].classList.add('vg-fim');
    return out;
  }
  function desembrulhar(id) {
    D.querySelectorAll('mark.vg-nota[data-n="' + id + '"]').forEach(m => { const p = m.parentNode; while (m.firstChild) p.insertBefore(m.firstChild, m); p.removeChild(m); p.normalize(); });
  }
  function pintarCor(id, cor) {
    D.querySelectorAll('mark.vg-nota[data-n="' + id + '"]').forEach(m => {
      m.classList.remove('vg-c-lilas', 'vg-c-azul');
      if (cor && cor !== 'rosa') m.classList.add('vg-c-' + cor);
    });
  }

  /* ---------- reaplicar as notas salvas ---------- */
  let aplicando = false;
  function aplicar() {
    const faltam = notas.filter(n => !D.querySelector('mark.vg-nota[data-n="' + n.id + '"]'));
    if (!faltam.length) return;
    const root = raiz(); aplicando = true;
    try {
      for (const n of faltam) {
        const txt = root.textContent;
        let melhor = -1, pontos = -1, i = txt.indexOf(n.q);
        while (i >= 0) {
          const antes = txt.slice(Math.max(0, i - n.pre.length), i), depois = txt.slice(i + n.q.length, i + n.q.length + n.pos.length);
          let p = 0; for (let k = 1; k <= antes.length && antes[antes.length - k] === n.pre[n.pre.length - k]; k++) p++;
          for (let k = 0; k < depois.length && depois[k] === n.pos[k]; k++) p++;
          if (p > pontos) { pontos = p; melhor = i; }
          i = txt.indexOf(n.q, i + 1);
        }
        if (melhor >= 0) envolver(root, melhor, melhor + n.q.length, n.id, n.c);
      }
    } finally { aplicando = false; }
  }
  let tAplicar = 0;
  const depois = () => { if (aplicando || !notas.length) return; clearTimeout(tAplicar); tAplicar = setTimeout(aplicar, 350); };

  /* ---------- interface ---------- */
  const barra = D.createElement('div'); barra.className = 'vg-n-ui vg-n-barra';
  const tip = D.createElement('div'); tip.className = 'vg-n-ui vg-n-tip';
  const ed = D.createElement('div'); ed.className = 'vg-n-ui vg-n-ed';
  ed.innerHTML = '<div class="h">💬 Sua anotação</div><div class="vg-ncores"></div><textarea rows="4" placeholder="Escreva seu comentário sobre o trecho…"></textarea><div class="acoes"><span class="dica">Ctrl+Enter salva · Esc cancela</span><a data-a="cancelar">Cancelar</a><a data-a="salvar" class="pri">Salvar</a></div>';
  const ta = ed.querySelector('textarea'), edCores = ed.querySelector('.vg-ncores');
  let pendente = null, editando = null, segura = false, tTip = 0;

  function htmlCores(sel) {
    return CORES.map(c => `<button type="button" class="vg-nc${c.k === sel ? ' on' : ''}" data-nc="${c.k}" title="${c.nome}" aria-label="${c.nome}" style="--bg:${c.bg};--ln:${c.ln}"></button>`).join('');
  }

  function montar() {
    D.body.append(barra, tip, ed);
    const st = D.createElement('style'); st.id = 'vg-n-css';
    st.textContent = '#hl-pop:not(:has(.del[style*="flex"])){display:none!important}#hl-pop .add{display:none!important}'
      + 'html.vg-n-aberta #mc-tooltip,html.vg-n-aberta #tip,html.vg-n-aberta .tip{display:none!important}'
      + 'mark.vg-nota.vg-c-lilas{background:#e6d6ff;box-shadow:inset 0 -2px 0 #b48cff}'
      + 'mark.vg-nota.vg-c-azul{background:#cdeeff;box-shadow:inset 0 -2px 0 #5cc2f2}'
      + '.vg-ncores{display:inline-flex;align-items:center;gap:6px;margin:0 0 8px}'
      + '.vg-n-barra .vg-ncores{margin:0 2px 0 0;padding:4px 8px;border-radius:999px;background:#1d211f;box-shadow:0 8px 24px rgba(0,0,0,.3)}'
      + '.vg-nc{width:20px;height:20px;border-radius:50%;border:2px solid var(--ln);background:var(--bg);cursor:pointer;padding:0;transition:transform .12s}'
      + '.vg-nc:hover{transform:scale(1.12)}.vg-nc.on{box-shadow:0 0 0 2px #1d211f,0 0 0 3.5px #fff}'
      + '.vg-n-tip .chips a[data-a="remover"]{background:#5a2231;color:#ffd3ea}.vg-n-tip .chips a[data-a="remover"]:hover{background:#7a2c41}'
      + '.vg-n-tip .chips a{padding:6px 12px;font-size:13px}';
    D.head.appendChild(st);
  }
  const esconder = el => { el.classList.remove('on'); if (el === tip) html.classList.remove('vg-n-aberta'); };
  function posicionar(el, rect, acima = true) {
    el.style.left = '0px'; el.style.top = '0px'; el.classList.add('on');
    const w = el.offsetWidth, h = el.offsetHeight;
    const x = Math.min(innerWidth - w - 10, Math.max(10, rect.left));
    let y = acima ? rect.top - h - 8 : rect.bottom + 8;
    if (acima && y < 10) y = rect.bottom + 8;
    if (!acima && y + h > innerHeight - 10) y = Math.max(10, rect.top - h - 8);
    el.style.left = x + 'px'; el.style.top = y + 'px';
  }
  const escapar = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function selecaoValida() {
    const sel = getSelection(); if (!sel || sel.isCollapsed || !sel.rangeCount) return null;
    const rg = sel.getRangeAt(0), root = raiz();
    if (!root.contains(rg.commonAncestorContainer)) return null;
    const el = rg.commonAncestorContainer.nodeType === 1 ? rg.commonAncestorContainer : rg.commonAncestorContainer.parentNode;
    if (el.closest(FORA)) return null;
    const q = rg.toString(); if (q.trim().length < 2) return null;
    return { rg, root, q };
  }
  function aoSoltar(e) {
    if (e.target.closest && e.target.closest('.vg-n-ui')) return;
    setTimeout(() => {
      const s = selecaoValida(); if (!s) { esconder(barra); return; }
      const ini = offsetDe(s.root, s.rg.startContainer, s.rg.startOffset), fim = ini + s.q.length, txt = s.root.textContent;
      pendente = { q: s.q, pre: txt.slice(Math.max(0, ini - 40), ini), pos: txt.slice(fim, fim + 40), ini, fim };
      const nativo = D.querySelector('#hlbtn,.hlbtn');
      const hp = D.getElementById('hl-pop'); if (hp && !hp.querySelector('.del[style*="flex"]')) hp.style.display = 'none';
      const nativoVisivel = nativo && getComputedStyle(nativo).display !== 'none' && nativo.getBoundingClientRect().width > 0;
      barra.innerHTML = '<span class="vg-ncores">' + htmlCores(corAtiva) + '</span>' + (nativoVisivel ? '' : '<a data-a="grifar">🖍 Grifar</a>') + '<a data-a="anotar">💬 ' + (nativoVisivel ? 'Anotar' : 'Anotar') + '</a>';
      if (nativoVisivel) { const r = nativo.getBoundingClientRect(); barra.classList.add('on'); barra.style.left = Math.min(innerWidth - barra.offsetWidth - 10, r.right + 6) + 'px'; barra.style.top = r.top + 'px'; }
      else posicionar(barra, s.rg.getBoundingClientRect());
    }, 60);
  }
  D.addEventListener('mouseup', aoSoltar);
  D.addEventListener('touchend', aoSoltar, { passive: true });
  barra.addEventListener('mousedown', e => e.preventDefault());
  D.addEventListener('click', e => { if (e.target.closest && e.target.closest('#hlbtn,.hlbtn')) esconder(barra); }, true);
  barra.addEventListener('click', e => {
    const nc = e.target.closest('[data-nc]');
    if (nc) { corAtiva = nc.dataset.nc; try { localStorage.setItem('vidro-notas-cor', corAtiva); } catch (_) {} barra.querySelectorAll('.vg-nc').forEach(x => x.classList.toggle('on', x.dataset.nc === corAtiva)); return; }
    const a = e.target.closest('a'); if (!a || !pendente) return;
    if (a.dataset.a === 'grifar') { criar('', corAtiva); }
    else { editando = null; ta.value = ''; edCores.innerHTML = htmlCores(corAtiva); const r = barra.getBoundingClientRect(); esconder(barra); posicionar(ed, r, false); ta.focus(); }
  });

  function criar(texto, cor) {
    const p = pendente; if (!p) return;
    const c = cor || corAtiva;
    const n = { id: 'n' + Date.now().toString(36), q: p.q, pre: p.pre, pos: p.pos, t: texto, c, d: Date.now(), h: location.hash };
    notas.push(n); save(notas);
    aplicando = true; try { envolver(raiz(), p.ini, p.fim, n.id, c); } finally { aplicando = false; }
    getSelection().removeAllRanges(); pendente = null; esconder(barra); esconder(ed);
  }

  function remover(id) { notas = notas.filter(x => x.id !== id); save(notas); desembrulhar(id); }
  window.VGNotas = { lista: () => notas.map(n => Object.assign({}, n)), listaMateria, remover, exportar };

  /* editor */
  function fecharEd() { esconder(ed); editando = null; }
  ed.addEventListener('click', e => {
    const nc = e.target.closest('[data-nc]');
    if (nc) {
      corAtiva = nc.dataset.nc; try { localStorage.setItem('vidro-notas-cor', corAtiva); } catch (_) {}
      edCores.querySelectorAll('.vg-nc').forEach(x => x.classList.toggle('on', x.dataset.nc === corAtiva));
      if (editando) { const n = notas.find(x => x.id === editando); if (n) { n.c = corAtiva; save(notas); pintarCor(editando, corAtiva); } }
      return;
    }
    const a = e.target.closest('a'); if (!a) return;
    if (a.dataset.a === 'cancelar') { fecharEd(); return; }
    const t = ta.value.trim();
    if (editando) { const n = notas.find(x => x.id === editando); if (n) { n.t = t; n.c = corAtiva; save(notas); pintarCor(editando, corAtiva); } fecharEd(); }
    else criar(t, corAtiva);
  });
  ta.addEventListener('keydown', e => {
    if (e.key === 'Escape') fecharEd();
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) ed.querySelector('[data-a="salvar"]').click();
  });

  /* caixinha da anotação */
  function mostrarTip(m) {
    const n = notas.find(x => x.id === m.dataset.n); if (!n) return;
    const c = corDe(n.c);
    tip.innerHTML = '<div class="h">' + (n.t ? '💬 ' : '🖍 ') + c.nome + '</div>'
      + '<div class="vg-ncores">' + htmlCores(c.k) + '</div>'
      + (n.t ? '<div class="txt">' + escapar(n.t).replace(/\n/g, '<br>') + '</div>' : '')
      + '<div class="chips"><a data-a="editar">' + (n.t ? '✎ Editar' : '💬 Anotar') + '</a><a data-a="exportar">⬇ Exportar notas</a><a data-a="remover">✕ Remover</a></div>';
    tip.dataset.n = n.id; html.classList.add('vg-n-aberta');
    const marks = D.querySelectorAll('mark.vg-nota[data-n="' + n.id + '"]');
    posicionar(tip, (marks[0] || m).getBoundingClientRect());
  }
  D.addEventListener('mouseover', e => { const m = e.target.closest && e.target.closest('mark.vg-nota'); if (m) { clearTimeout(tTip); mostrarTip(m); } });
  D.addEventListener('mouseout', e => { const m = e.target.closest && e.target.closest('mark.vg-nota'); if (m) tTip = setTimeout(() => { if (!segura) esconder(tip); }, 700); });
  D.addEventListener('click', e => {
    const m = e.target.closest && e.target.closest('mark.vg-nota');
    if (m) { if (!getSelection().isCollapsed) return; e.stopPropagation(); e.preventDefault(); mostrarTip(m); segura = true; setTimeout(() => { segura = false; }, 400); return; }
    if (!e.target.closest('.vg-n-ui')) { esconder(tip); }
  }, true);
  tip.addEventListener('mouseenter', () => { segura = true; clearTimeout(tTip); });
  tip.addEventListener('mouseleave', () => { segura = false; esconder(tip); });
  tip.addEventListener('click', e => {
    const nc = e.target.closest('[data-nc]');
    if (nc) {
      const id = tip.dataset.n, n = notas.find(x => x.id === id);
      if (n) { n.c = nc.dataset.nc; corAtiva = n.c; save(notas); pintarCor(id, n.c); mostrarTip(D.querySelector('mark.vg-nota[data-n="' + id + '"]') || tip); }
      return;
    }
    const a = e.target.closest('a'); if (!a) return; const id = tip.dataset.n;
    if (a.dataset.a === 'remover') { remover(id); esconder(tip); }
    else if (a.dataset.a === 'exportar') { exportar(); esconder(tip); }
    else { const n = notas.find(x => x.id === id); editando = id; corAtiva = (n && n.c) || 'rosa'; edCores.innerHTML = htmlCores(corAtiva); ta.value = n ? n.t : ''; const r = tip.getBoundingClientRect(); esconder(tip); posicionar(ed, r, false); ta.focus(); }
  });
  addEventListener('scroll', () => { if (!segura) esconder(tip); esconder(barra); }, { passive: true, capture: true });

  function iniciar() {
    montar(); aplicar();
    const root = raiz();
    new MutationObserver(depois).observe(root, { childList: true, subtree: true });
    addEventListener('hashchange', depois); D.addEventListener('pane', depois);
    addEventListener('storage', e => { if (e.key === KEY) { const novas = load(); notas.filter(n => !novas.some(x => x.id === n.id)).forEach(n => desembrulhar(n.id)); notas = novas; aplicar(); avisar(); } });
    avisar();
  }
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
