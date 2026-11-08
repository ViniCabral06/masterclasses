/* Grifar com anotação — vale para todas as masterclasses e aulas (o publicar.py inclui este arquivo).

   Selecione um trecho:
   - se o master já tem o botão "Grifar" dele (Farmacologia, Microbiologia), aparece ao lado o "💬 Anotar";
   - se não tem (Patologia, TH IV, masters novos), aparecem "🖍 Grifar" e "💬 Grifar com anotação".
   O trecho fica rosa com um 💬; passar o mouse (ou tocar) abre a mesma caixinha escura das questões
   ("Caiu em X somativas"), com a anotação, Editar e Remover.

   Guardado no navegador de cada pessoa (localStorage), por página. A âncora é o próprio texto do trecho
   + um pedaço antes e depois, então funciona em qualquer master sem conhecer a estrutura dele e
   sobrevive a pequenas mudanças no HTML. */
(function () {
  if (window.__vgNotas) return; window.__vgNotas = true;
  const D = document, html = D.documentElement;
  const KEY = 'vidro-notas:' + location.pathname;
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (_) { return []; } };
  const save = l => { try { localStorage.setItem(KEY, JSON.stringify(l)); } catch (_) { } };
  let notas = load();

  // raiz do conteúdo: onde o texto da aula mora (cai no body se o master não tiver <main>)
  const raiz = () => D.querySelector('main, #main, #view, .main') || D.body;
  const FORA = 'input,textarea,button,select,script,style,nav,aside,.sidebar,#sidebar,#side,.sb,.top,#top,.mbar,.tip,#tip,#hlbtn,.hlbtn,.vg-n-ui,#vidro-fx,#vidro-home,#vidro-load,[contenteditable]';

  /* ---------- texto <-> posição ---------- */
  function textNodes(root) {
    const w = D.createTreeWalker(root, NodeFilter.SHOW_TEXT), a = []; let n;
    while ((n = w.nextNode())) a.push(n);
    return a;
  }
  const offsetDe = (root, node, off) => { const r = D.createRange(); r.setStart(root, 0); r.setEnd(node, off); return r.toString().length; };
  function envolver(root, ini, fim, id) {
    const out = []; let s = 0;
    for (const n of textNodes(root)) {
      const L = n.nodeValue.length, a = s, b = s + L; s = b;
      if (b <= ini) continue; if (a >= fim) break;
      const de = Math.max(0, ini - a), ate = Math.min(L, fim - a); if (ate <= de) continue;
      if (n.parentNode.closest && n.parentNode.closest('script,style')) continue;
      if (!n.nodeValue.slice(de, ate).trim()) continue;     // não envolve só espaço/quebra de linha
      const r = D.createRange(); r.setStart(n, de); r.setEnd(n, ate);
      const m = D.createElement('mark'); m.className = 'vg-nota'; m.dataset.n = id;
      try { r.surroundContents(m); out.push(m); } catch (_) { }
    }
    if (out.length) out[out.length - 1].classList.add('vg-fim');
    return out;
  }
  function desembrulhar(id) {
    D.querySelectorAll('mark.vg-nota[data-n="' + id + '"]').forEach(m => { const p = m.parentNode; while (m.firstChild) p.insertBefore(m.firstChild, m); p.removeChild(m); p.normalize(); });
  }

  /* ---------- reaplicar as notas salvas (também quando o master redesenha o conteúdo) ---------- */
  let aplicando = false;
  function aplicar() {
    const faltam = notas.filter(n => !D.querySelector('mark.vg-nota[data-n="' + n.id + '"]'));
    if (!faltam.length) return;
    const root = raiz(); aplicando = true;
    try {
      for (const n of faltam) {
        const txt = root.textContent;
        let melhor = -1, pontos = -1, i = txt.indexOf(n.q);
        while (i >= 0) {                                   // várias ocorrências: fica a de contexto mais parecido
          const antes = txt.slice(Math.max(0, i - n.pre.length), i), depois = txt.slice(i + n.q.length, i + n.q.length + n.pos.length);
          let p = 0; for (let k = 1; k <= antes.length && antes[antes.length - k] === n.pre[n.pre.length - k]; k++) p++;
          for (let k = 0; k < depois.length && depois[k] === n.pos[k]; k++) p++;
          if (p > pontos) { pontos = p; melhor = i; }
          i = txt.indexOf(n.q, i + 1);
        }
        if (melhor >= 0) envolver(root, melhor, melhor + n.q.length, n.id);
      }
    } finally { aplicando = false; }
  }
  let tAplicar = 0;
  const depois = () => { if (aplicando || !notas.length) return; clearTimeout(tAplicar); tAplicar = setTimeout(aplicar, 350); };

  /* ---------- interface ---------- */
  const barra = D.createElement('div'); barra.className = 'vg-n-ui vg-n-barra';
  const tip = D.createElement('div'); tip.className = 'vg-n-ui vg-n-tip';
  const ed = D.createElement('div'); ed.className = 'vg-n-ui vg-n-ed';
  ed.innerHTML = '<div class="h">💬 Sua anotação</div><textarea rows="4" placeholder="Escreva seu comentário sobre o trecho…"></textarea><div class="acoes"><span class="dica">Ctrl+Enter salva · Esc cancela</span><a data-a="cancelar">Cancelar</a><a data-a="salvar" class="pri">Salvar</a></div>';
  const ta = ed.querySelector('textarea');
  let pendente = null, editando = null, segura = false, tTip = 0;

  function montar() { D.body.append(barra, tip, ed); }
  const esconder = el => { el.classList.remove('on'); };
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

  /* seleção → barra de botões */
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
      // master com grifo próprio: só o "Anotar", grudado no botão dele
      const nativo = D.querySelector('#hlbtn,.hlbtn');
      const nativoVisivel = nativo && getComputedStyle(nativo).display !== 'none' && nativo.getBoundingClientRect().width > 0;
      barra.innerHTML = (nativoVisivel ? '' : '<a data-a="grifar">🖍 Grifar</a>') + '<a data-a="anotar">💬 ' + (nativoVisivel ? 'Anotar' : 'Grifar com anotação') + '</a>';
      if (nativoVisivel) { const r = nativo.getBoundingClientRect(); barra.classList.add('on'); barra.style.left = Math.min(innerWidth - barra.offsetWidth - 10, r.right + 6) + 'px'; barra.style.top = r.top + 'px'; }
      else posicionar(barra, s.rg.getBoundingClientRect());
    }, 60);
  }
  D.addEventListener('mouseup', aoSoltar);
  D.addEventListener('touchend', aoSoltar, { passive: true });
  barra.addEventListener('mousedown', e => e.preventDefault());       // não perde a seleção ao clicar
  // clicou no "Grifar" do próprio master: some o nosso botão junto
  D.addEventListener('click', e => { if (e.target.closest && e.target.closest('#hlbtn,.hlbtn')) esconder(barra); }, true);
  barra.addEventListener('click', e => {
    const a = e.target.closest('a'); if (!a || !pendente) return;
    if (a.dataset.a === 'grifar') { criar(''); }
    else { editando = null; ta.value = ''; const r = barra.getBoundingClientRect(); esconder(barra); posicionar(ed, r, false); ta.focus(); }
  });

  function criar(texto) {
    const p = pendente; if (!p) return;
    const n = { id: 'n' + Date.now().toString(36), q: p.q, pre: p.pre, pos: p.pos, t: texto, d: Date.now() };
    notas.push(n); save(notas);
    aplicando = true; try { envolver(raiz(), p.ini, p.fim, n.id); } finally { aplicando = false; }
    getSelection().removeAllRanges(); pendente = null; esconder(barra); esconder(ed);
  }

  /* editor */
  function fecharEd() { esconder(ed); editando = null; }
  ed.addEventListener('click', e => {
    const a = e.target.closest('a'); if (!a) return;
    if (a.dataset.a === 'cancelar') { fecharEd(); return; }
    const t = ta.value.trim();
    if (editando) { const n = notas.find(x => x.id === editando); if (n) { n.t = t; save(notas); } fecharEd(); }
    else criar(t);
  });
  ta.addEventListener('keydown', e => {
    if (e.key === 'Escape') fecharEd();
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) ed.querySelector('[data-a="salvar"]').click();
  });

  /* caixinha da anotação (mesmo visual da caixinha das questões) */
  function mostrarTip(m) {
    const n = notas.find(x => x.id === m.dataset.n); if (!n) return;
    tip.innerHTML = '<div class="h">' + (n.t ? '💬 Sua anotação' : '🖍 Seu grifo') + '</div>'
      + (n.t ? '<div class="txt">' + escapar(n.t).replace(/\n/g, '<br>') + '</div>' : '')
      + '<div class="chips"><a data-a="editar">' + (n.t ? '✎ Editar' : '💬 Anotar') + '</a><a data-a="remover">✕ Remover</a></div>';
    tip.dataset.n = n.id;
    const marks = D.querySelectorAll('mark.vg-nota[data-n="' + n.id + '"]');
    posicionar(tip, (marks[0] || m).getBoundingClientRect());
  }
  D.addEventListener('mouseover', e => { const m = e.target.closest && e.target.closest('mark.vg-nota'); if (m) { clearTimeout(tTip); mostrarTip(m); } });
  D.addEventListener('mouseout', e => { const m = e.target.closest && e.target.closest('mark.vg-nota'); if (m) tTip = setTimeout(() => { if (!segura) esconder(tip); }, 350); });
  D.addEventListener('click', e => {
    const m = e.target.closest && e.target.closest('mark.vg-nota');
    if (m) { e.stopPropagation(); mostrarTip(m); return; }
    if (!e.target.closest('.vg-n-ui')) { esconder(tip); }
  }, true);
  tip.addEventListener('mouseenter', () => { segura = true; clearTimeout(tTip); });
  tip.addEventListener('mouseleave', () => { segura = false; esconder(tip); });
  tip.addEventListener('click', e => {
    const a = e.target.closest('a'); if (!a) return; const id = tip.dataset.n;
    if (a.dataset.a === 'remover') { notas = notas.filter(x => x.id !== id); save(notas); desembrulhar(id); esconder(tip); }
    else { const n = notas.find(x => x.id === id); editando = id; ta.value = n ? n.t : ''; const r = tip.getBoundingClientRect(); esconder(tip); posicionar(ed, r, false); ta.focus(); }
  });
  addEventListener('scroll', () => { if (!segura) esconder(tip); esconder(barra); }, { passive: true, capture: true });

  /* ---------- início ---------- */
  function iniciar() {
    montar(); aplicar();
    const root = raiz();
    new MutationObserver(depois).observe(root, { childList: true, subtree: true });
    addEventListener('hashchange', depois); D.addEventListener('pane', depois);
    // outra aba editou as notas desta página
    addEventListener('storage', e => { if (e.key === KEY) { const novas = load(); notas.filter(n => !novas.some(x => x.id === n.id)).forEach(n => desembrulhar(n.id)); notas = novas; aplicar(); } });
  }
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
