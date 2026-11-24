/* ✏️ Editor do site (Vinícius e Matheus) — o publicar.py inclui nos masters e nas aulas.

   - Caneta pequena no canto superior direito, só no PC (some no celular e no tablet), só no site principal (vinicabral06.github.io; localhost para teste).
     Não aparece na vitrine 83B. Abre com a senha dos administradores.
   - Modo edição: clique num texto do conteúdo para reescrever (Enter termina, Shift+Enter quebra linha, Esc desfaz).
     Selecione um trecho para pôr um 💬 balão (texto que aparece ao passar o mouse).
   - Salva sozinho: cada mudança vira um commit em _tema/edicoes.json pela API do GitHub; todo visitante
     aplica esse arquivo ao abrir a página (o site também na vitrine, sem a caneta).
   - A senha não fica no código: ela decifra o token do GitHub guardado cifrado em _tema/editor-chave.json
     (PBKDF2 + AES-GCM). No primeiro uso, a senha e um token criam esse arquivo.
   - Âncora pelo texto (igual ao notas.js): cada edição guarda o texto original do elemento + o contexto. */
(function () {
  if (window.__vgEditor) return; window.__vgEditor = true;
  const D = document, html = D.documentElement;
  const REPO = 'ViniCabral06/masterclasses', ARQ = '_tema/edicoes.json', ARQ_CHAVE = '_tema/editor-chave.json';
  const API = 'https://api.github.com/repos/' + REPO + '/contents/';
  const BASE = (D.currentScript && D.currentScript.src) ? new URL('.', D.currentScript.src).href : null;
  const TOPO = window.top === window;
  const LOCAL = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  let pg = decodeURIComponent(location.pathname).replace(/^\/masterclasses\//, '/').replace(/^\/+/, '');
  const VITRINE = /^83b\//.test(pg);
  pg = pg.replace(/^83b\//, ''); if (!pg || pg.endsWith('/')) pg += 'index.html';
  const PG = pg;
  const ADMIN = !VITRINE && (location.hostname === 'vinicabral06.github.io' || LOCAL);
  const K_TOK = 'vg-ed-tok', K_ON = 'vg-ed-on';

  const raiz = () => D.querySelector('main, #main, #view, .main') || D.body;
  const FORA = 'input,textarea,button,select,script,style,nav,.sidebar,#sidebar,#side,.sb,.top,#top,.mbar,#hlbtn,.hlbtn,.vg-n-ui,.vge-ui,#vidro-fx,#vidro-pers,#vidro-home,#vidro-load,#vg-abas,#vg-ajustes';
  const BLOCO = 'p,li,h1,h2,h3,h4,h5,h6,td,th,dd,dt,figcaption,blockquote,summary,label,caption,small';
  const norm = s => (s || '').replace(/\s+/g, ' ').trim();
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  let dados = { t: [], b: [] };           // edições desta página: t = textos, b = balões
  let ligado = false;

  /* ---------- aplicar edições (todo visitante) ---------- */
  function contexto(root, el) {
    const r = D.createRange();
    r.setStart(root, 0); r.setEndBefore(el); const pre = norm(r.toString()).slice(-40);
    r.setStartAfter(el); r.setEnd(root, root.childNodes.length); const pos = norm(r.toString()).slice(0, 40);
    return { pre, pos };
  }
  function pontos(a, b, fim) { let p = 0; if (fim) { for (let k = 1; k <= Math.min(a.length, b.length) && a[a.length - k] === b[b.length - k]; k++) p++; } else { for (let k = 0; k < Math.min(a.length, b.length) && a[k] === b[k]; k++) p++; } return p; }
  function acharEl(root, e) {
    let melhor = null, best = -1;
    root.querySelectorAll(e.tag).forEach(el => {
      if (el.dataset.vge || el.closest(FORA)) return;
      if (norm(el.textContent) !== e.q) return;
      const c = contexto(root, el), p = pontos(c.pre, e.pre, true) + pontos(c.pos, e.pos, false);
      if (p > best) { best = p; melhor = el; }
    });
    return melhor;
  }
  function textNodes(root) { const w = D.createTreeWalker(root, NodeFilter.SHOW_TEXT), a = []; let n; while ((n = w.nextNode())) a.push(n); return a; }
  function envolver(root, ini, fim, id) {
    let s = 0, fez = 0;
    for (const n of textNodes(root)) {
      const L = n.nodeValue.length, a = s, b = s + L; s = b;
      if (b <= ini) continue; if (a >= fim) break;
      const de = Math.max(0, ini - a), ate = Math.min(L, fim - a); if (ate <= de) continue;
      if (n.parentNode.closest && n.parentNode.closest('script,style')) continue;
      if (!n.nodeValue.slice(de, ate).trim()) continue;
      const r = D.createRange(); r.setStart(n, de); r.setEnd(n, ate);
      const m = D.createElement('mark'); m.className = 'vge-bal'; m.dataset.b = id;
      try { r.surroundContents(m); fez++; } catch (_) { }
    }
    return fez;
  }
  function desembrulhar(id) { D.querySelectorAll('mark.vge-bal[data-b="' + id + '"]').forEach(m => { const p = m.parentNode; while (m.firstChild) p.insertBefore(m.firstChild, m); p.removeChild(m); p.normalize(); }); }

  let aplicando = false;
  function aplicar() {
    const root = raiz(); if (!root) return; aplicando = true;
    try {
      for (const e of dados.t) {
        if (D.querySelector('[data-vge="' + e.id + '"]')) continue;
        const el = acharEl(root, e); if (!el) continue;
        el.innerHTML = e.r; el.dataset.vge = e.id;
      }
      for (const b of dados.b) {
        if (D.querySelector('mark.vge-bal[data-b="' + b.id + '"]')) continue;
        const txt = root.textContent; let melhor = -1, best = -1, i = txt.indexOf(b.q);
        while (i >= 0) {
          const p = pontos(txt.slice(Math.max(0, i - b.pre.length), i), b.pre, true) + pontos(txt.slice(i + b.q.length, i + b.q.length + b.pos.length), b.pos, false);
          if (p > best) { best = p; melhor = i; } i = txt.indexOf(b.q, i + 1);
        }
        if (melhor >= 0) envolver(root, melhor, melhor + b.q.length, b.id);
      }
    } finally { aplicando = false; }
  }
  let tAp = 0; const depois = () => { if (aplicando || (!dados.t.length && !dados.b.length)) return; clearTimeout(tAp); tAp = setTimeout(aplicar, 300); };

  async function carregar() {
    if (!BASE) return;
    try {
      const r = await fetch(BASE + 'edicoes.json', { cache: 'no-cache' });
      if (!r.ok) return;
      const j = await r.json(), p = j[PG] || {};
      dados = { t: p.t || [], b: p.b || [] }; aplicar();
    } catch (_) { }
  }

  /* ---------- estilo ---------- */
  const st = D.createElement('style');
  st.textContent = 'mark.vge-bal{background:none;color:inherit;border-bottom:2px dotted #f39ac6;cursor:help;-webkit-box-decoration-break:clone;box-decoration-break:clone}'
    + '#vge-btn{position:fixed;right:10px;top:10px;z-index:2147481500;width:30px;height:30px;border-radius:50%;display:grid;place-items:center;cursor:pointer;padding:0;'
    + 'border:1px solid rgba(127,127,127,.28);background:color-mix(in srgb,var(--vg-glass,rgba(255,255,255,.55)) 85%,transparent);color:inherit;opacity:.55;'
    + '-webkit-backdrop-filter:blur(12px) saturate(1.4);backdrop-filter:blur(12px) saturate(1.4);box-shadow:0 2px 10px rgba(0,0,0,.12);transition:opacity .15s,transform .15s}'
    + '#vge-btn:hover{opacity:1;transform:scale(1.06)}#vge-btn svg{width:14px;height:14px}'
    + 'html.vge-on #vge-btn{opacity:1;background:#f39ac6;color:#2a0d1b;border-color:#f39ac6}'
    + '#vge-btn i{position:absolute;right:-2px;top:-2px;width:9px;height:9px;border-radius:50%;background:transparent}'
    + '#vge-btn.salvando i{background:#f2c14e}#vge-btn.salvo i{background:#3fbf7f}#vge-btn.erro i{background:#e5484d}'
    + 'html.vge-on .vg-n-barra{display:none!important}'
    + 'html.vge-on :is(' + BLOCO + '):not(.vge-ui *):hover{outline:1px dashed rgba(243,154,198,.7);outline-offset:2px;cursor:text}'
    + '[contenteditable].vge-ed{outline:2px solid #f39ac6!important;outline-offset:3px;border-radius:3px;cursor:text}'
    + '#vge-aviso{position:fixed;right:48px;top:12px;z-index:2147481500;font:12px/1.3 system-ui,sans-serif;background:#1d211f;color:#eef0ec;padding:6px 10px;border-radius:999px;box-shadow:0 6px 18px rgba(0,0,0,.25);display:none}'
    + 'html.vge-on #vge-aviso{display:block}'
    + '.vge-ui input{display:block;width:100%;box-sizing:border-box;margin:2px 0 8px;padding:8px 10px;border-radius:9px;border:1px solid #3a3f3b;background:#121513;color:#eef0ec;font:inherit;font-size:14px}'
    + '.vge-ui .erro{color:#ff8f9a;font-size:12px;margin-bottom:6px;min-height:1em}.vge-ui .mini{font-size:11px;color:#8f968f;margin-bottom:6px}'
    + '@media (max-width:1024px),(pointer:coarse){#vge-btn,#vge-aviso{display:none!important}}';

  /* ---------- balão para todos ---------- */
  const tip = D.createElement('div'); tip.className = 'vg-n-ui vg-n-tip vge-ui';
  let tTip = 0, segura = false;
  function posicionar(el, rect, acima = true) {
    el.style.left = '0px'; el.style.top = '0px'; el.classList.add('on');
    const w = el.offsetWidth, h = el.offsetHeight, x = Math.min(innerWidth - w - 10, Math.max(10, rect.left));
    let y = acima ? rect.top - h - 8 : rect.bottom + 8;
    if (acima && y < 10) y = rect.bottom + 8; if (!acima && y + h > innerHeight - 10) y = Math.max(10, rect.top - h - 8);
    el.style.left = x + 'px'; el.style.top = y + 'px';
  }
  const esconder = el => el.classList.remove('on');
  function mostrarTip(m) {
    const b = dados.b.find(x => x.id === m.dataset.b); if (!b) return;
    tip.dataset.b = b.id;
    tip.innerHTML = '<div class="txt">' + esc(b.t).replace(/\n/g, '<br>') + '</div>'
      + (ligado ? '<div class="chips"><a data-a="editar">✎ Editar</a><a data-a="remover">✕ Remover</a></div>' : '');
    posicionar(tip, m.getBoundingClientRect());
  }
  D.addEventListener('mouseover', e => { const m = e.target.closest && e.target.closest('mark.vge-bal'); if (m) { clearTimeout(tTip); mostrarTip(m); } });
  D.addEventListener('mouseout', e => { const m = e.target.closest && e.target.closest('mark.vge-bal'); if (m) tTip = setTimeout(() => { if (!segura) esconder(tip); }, 600); });
  D.addEventListener('click', e => {
    const m = e.target.closest && e.target.closest('mark.vge-bal');
    if (m && getSelection().isCollapsed) { e.stopPropagation(); e.preventDefault(); mostrarTip(m); segura = true; setTimeout(() => { segura = false; }, 400); return; }
    if (!e.target.closest || !e.target.closest('.vge-ui')) esconder(tip);
  }, true);
  tip.addEventListener('mouseenter', () => { segura = true; clearTimeout(tTip); });
  tip.addEventListener('mouseleave', () => { segura = false; esconder(tip); });
  addEventListener('scroll', () => { if (!segura) esconder(tip); }, { passive: true, capture: true });

  /* ---------- salvar no GitHub ---------- */
  const tok = () => { try { return localStorage.getItem(K_TOK) || ''; } catch (_) { return ''; } };
  const b64 = s => { const u = new TextEncoder().encode(s); let x = ''; for (let i = 0; i < u.length; i += 0x8000) x += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(x); };
  const deb64 = s => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/\s/g, '')), c => c.charCodeAt(0)));
  async function gh(caminho, op) {
    const h = { Authorization: 'Bearer ' + tok(), Accept: 'application/vnd.github+json' };
    return fetch(API + caminho, Object.assign({ headers: h, cache: 'no-store' }, op || {}, op && op.body ? { headers: Object.assign(h, { 'Content-Type': 'application/json' }) } : {}));
  }
  let fila = [], tSalvar = 0, enviando = false;
  function marcar(c) { const b = D.getElementById('vge-btn') || (window.top !== window && (() => { try { return window.top.document.getElementById('vge-btn'); } catch (_) { return null; } })()); if (!b) return; b.classList.remove('salvando', 'salvo', 'erro'); if (c) b.classList.add(c); }
  function agendar(op) { fila.push(op); marcar('salvando'); clearTimeout(tSalvar); tSalvar = setTimeout(enviar, 1200); }
  function aplicarOps(obj, ops) {
    const p = obj[PG] || (obj[PG] = { t: [], b: [] }); p.t = p.t || []; p.b = p.b || [];
    for (const o of ops) {
      const l = p[o.k], i = l.findIndex(x => x.id === o.item.id);
      if (o.del) { if (i >= 0) l.splice(i, 1); } else if (i >= 0) l[i] = o.item; else l.push(o.item);
    }
    if (!p.t.length && !p.b.length) delete obj[PG];
  }
  async function enviar() {
    if (enviando) { tSalvar = setTimeout(enviar, 800); return; }
    if (!fila.length) return;
    enviando = true; const ops = fila; fila = [];
    try {
      for (let tent = 0; tent < 4; tent++) {
        const r = await gh(ARQ + '?ref=main');
        let obj = {}, sha;
        if (r.ok) { const j = await r.json(); sha = j.sha; obj = j.content ? JSON.parse(deb64(j.content) || '{}') : {}; }
        else if (r.status !== 404) throw new Error('leitura ' + r.status);
        aplicarOps(obj, ops);
        const corpo = { message: 'Editor do site: ' + PG, content: b64(JSON.stringify(obj, null, 1) + '\n'), branch: 'main' };
        if (sha) corpo.sha = sha;
        const w = await gh(ARQ, { method: 'PUT', body: JSON.stringify(corpo) });
        if (w.ok) { marcar(fila.length ? 'salvando' : 'salvo'); return; }
        if (w.status === 401 || w.status === 403) { aviso('Sem permissão no GitHub: entre de novo pela caneta.'); try { localStorage.removeItem(K_TOK); } catch (_) { } throw new Error('auth'); }
        if (w.status !== 409 && w.status !== 422) throw new Error('escrita ' + w.status);
      }
      throw new Error('conflito');
    } catch (e) { fila = ops.concat(fila); marcar('erro'); aviso('Não salvou (' + e.message + '). Tento de novo em 10 s.'); tSalvar = setTimeout(enviar, 10000); }
    finally { enviando = false; }
  }
  function aviso(t) { const a = D.getElementById('vge-aviso') || (window.top !== window && (() => { try { return window.top.document.getElementById('vge-aviso'); } catch (_) { return null; } })()); if (a) { a.textContent = t; clearTimeout(a._t); a._t = setTimeout(() => { a.textContent = AVISO; }, 5000); } }
  const AVISO = '✏️ Modo edição: clique num texto para mudar · selecione um trecho para pôr um 💬 balão';

  /* ---------- editar texto ---------- */
  function limpar(el) {
    const c = el.cloneNode(true);
    c.querySelectorAll('script,style,iframe,object,embed').forEach(x => x.remove());
    // tira o que os outros scripts põem por cima (grifos, siglas, ligações, balões): eles voltam sozinhos
    c.querySelectorAll('mark.vg-nota,mark.vge-bal,mark.vg-elo-alvo,.vg-sg,.vg-elo').forEach(x => { const p = x.parentNode; while (x.firstChild) p.insertBefore(x.firstChild, x); x.remove(); });
    c.querySelectorAll('*').forEach(x => { [...x.attributes].forEach(a => { if (/^on/i.test(a.name) || (/^(href|src)$/i.test(a.name) && /^\s*javascript:/i.test(a.value))) x.removeAttribute(a.name); }); });
    c.normalize(); return c.innerHTML.trim();
  }
  let atual = null; // {el, antes, q, pre, pos, id}
  function editar(el) {
    if (atual && atual.el === el) return; terminar();
    const root = raiz(), id = el.dataset.vge;
    const ex = id && dados.t.find(x => x.id === id);
    const c = ex ? { pre: ex.pre, pos: ex.pos } : contexto(root, el);
    atual = { el, antes: el.innerHTML, limpoAntes: limpar(el), q: ex ? ex.q : norm(el.textContent), pre: c.pre, pos: c.pos, id: id || ('e' + Date.now().toString(36)), tag: el.tagName.toLowerCase() };
    el.contentEditable = 'true'; el.classList.add('vge-ed'); el.focus();
  }
  function terminar(desfazer) {
    if (!atual) return; const a = atual; atual = null;
    a.el.removeAttribute('contenteditable'); a.el.classList.remove('vge-ed');
    if (!a.el.getAttribute('class')) a.el.removeAttribute('class');
    if (desfazer) { a.el.innerHTML = a.antes; return; }
    const novo = limpar(a.el);
    if (novo === a.limpoAntes) return;
    const item = { id: a.id, tag: a.tag, q: a.q, pre: a.pre, pos: a.pos, r: novo, d: Date.now() };
    const i = dados.t.findIndex(x => x.id === a.id); if (i >= 0) dados.t[i] = item; else dados.t.push(item);
    a.el.dataset.vge = a.id; agendar({ k: 't', item });
  }
  D.addEventListener('focusout', e => { if (atual && e.target === atual.el) setTimeout(() => { if (atual && D.activeElement !== atual.el) terminar(); }, 0); });
  D.addEventListener('keydown', e => {
    if (!atual) return;
    if (e.key === 'Escape') { e.preventDefault(); terminar(true); }
    else if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); terminar(); }
  }, true);
  // modo edição: clicar no conteúdo edita (e não aciona botões/alternativas do master)
  function noConteudo(t) { const root = raiz(); return root && root.contains(t) && !(t.closest && t.closest(FORA)); }
  D.addEventListener('click', e => {
    if (!ligado || !e.target.closest || e.target.closest('.vge-ui,#vge-btn,mark.vge-bal')) return;
    if (atual && atual.el.contains(e.target)) return;
    if (!noConteudo(e.target)) return;
    if (!getSelection().isCollapsed) return;
    const el = e.target.closest(BLOCO) || (e.target.childNodes && [...e.target.childNodes].some(n => n.nodeType === 3 && n.nodeValue.trim()) ? e.target : null);
    if (!el || !noConteudo(el)) return;
    e.preventDefault(); e.stopPropagation(); editar(el);
  }, true);

  /* ---------- balão: selecionar → 💬 ---------- */
  const barra = D.createElement('div'); barra.className = 'vg-n-ui vg-n-barra vge-ui'; barra.innerHTML = '<a data-a="bal">💬 Pôr balão</a>';
  const caixa = D.createElement('div'); caixa.className = 'vg-n-ui vg-n-ed vge-ui';
  caixa.innerHTML = '<div class="h">💬 Balão (todos veem)</div><textarea rows="3" placeholder="Texto que aparece ao passar o mouse…"></textarea><div class="acoes"><span class="dica">Ctrl+Enter salva · Esc cancela</span><a data-a="cancelar">Cancelar</a><a data-a="salvar" class="pri">Salvar</a></div>';
  const ta = caixa.querySelector('textarea');
  let pend = null, balEd = null;
  function aoSoltar(e) {
    if (!ligado || atual || (e.target.closest && e.target.closest('.vge-ui'))) return;
    setTimeout(() => {
      const sel = getSelection(); if (!sel || sel.isCollapsed || !sel.rangeCount) { esconder(barra); return; }
      const rg = sel.getRangeAt(0), root = raiz(), el = rg.commonAncestorContainer.nodeType === 1 ? rg.commonAncestorContainer : rg.commonAncestorContainer.parentNode;
      const q = rg.toString(); if (q.trim().length < 2 || !root.contains(el) || el.closest(FORA)) { esconder(barra); return; }
      const r0 = D.createRange(); r0.setStart(root, 0); r0.setEnd(rg.startContainer, rg.startOffset);
      const ini = r0.toString().length, fim = ini + q.length, txt = root.textContent;
      pend = { q, pre: txt.slice(Math.max(0, ini - 40), ini), pos: txt.slice(fim, fim + 40), ini, fim };
      posicionar(barra, rg.getBoundingClientRect());
    }, 60);
  }
  D.addEventListener('mouseup', aoSoltar); D.addEventListener('touchend', aoSoltar, { passive: true });
  barra.addEventListener('mousedown', e => e.preventDefault());
  barra.addEventListener('click', () => { if (!pend) return; balEd = null; ta.value = ''; const r = barra.getBoundingClientRect(); esconder(barra); posicionar(caixa, r, false); ta.focus(); });
  function fecharCaixa() { esconder(caixa); balEd = null; }
  caixa.addEventListener('click', e => {
    const a = e.target.closest('a'); if (!a) return;
    if (a.dataset.a === 'cancelar') { fecharCaixa(); return; }
    const t = ta.value.trim(); if (!t) { ta.focus(); return; }
    if (balEd) { const b = dados.b.find(x => x.id === balEd); if (b) { b.t = t; agendar({ k: 'b', item: b }); } }
    else if (pend) {
      const b = { id: 'b' + Date.now().toString(36), q: pend.q, pre: pend.pre, pos: pend.pos, t, d: Date.now() };
      dados.b.push(b); aplicando = true; try { envolver(raiz(), pend.ini, pend.fim, b.id); } finally { aplicando = false; }
      getSelection().removeAllRanges(); pend = null; agendar({ k: 'b', item: b });
    }
    fecharCaixa();
  });
  ta.addEventListener('keydown', e => { if (e.key === 'Escape') fecharCaixa(); if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) caixa.querySelector('[data-a="salvar"]').click(); });
  tip.addEventListener('click', e => {
    const a = e.target.closest('a'); if (!a || !ligado) return; const id = tip.dataset.b, b = dados.b.find(x => x.id === id);
    if (a.dataset.a === 'remover') { dados.b = dados.b.filter(x => x.id !== id); desembrulhar(id); esconder(tip); if (b) agendar({ k: 'b', del: 1, item: b }); }
    else if (b) { balEd = id; ta.value = b.t; const r = tip.getBoundingClientRect(); esconder(tip); posicionar(caixa, r, false); ta.focus(); }
  });

  /* ---------- liga/desliga (o topo manda; as aulas em iframe seguem pelo storage) ---------- */
  function definir(on) {
    ligado = !!on && !!tok(); html.classList.toggle('vge-on', ligado);
    if (!ligado) { terminar(); esconder(barra); esconder(caixa); }
  }
  addEventListener('storage', e => { if (e.key === K_ON || e.key === K_TOK) definir(localStorage.getItem(K_ON) === '1'); });

  /* ---------- senha → token (cifrado em editor-chave.json) ---------- */
  const enc = new TextEncoder();
  const bytes = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  const tob64 = u => btoa(String.fromCharCode.apply(null, new Uint8Array(u)));
  async function chaveDe(senha, sal) {
    const k = await crypto.subtle.importKey('raw', enc.encode(senha), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: sal, iterations: 310000, hash: 'SHA-256' }, k, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  }
  async function decifrar(c, senha) { const k = await chaveDe(senha, bytes(c.sal)); return new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes(c.iv) }, k, bytes(c.ct))); }
  async function cifrar(tk, senha) { const sal = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12)), k = await chaveDe(senha, sal); return { v: 1, sal: tob64(sal), iv: tob64(iv), ct: tob64(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, k, enc.encode(tk))) }; }

  const login = D.createElement('div'); login.className = 'vg-n-ui vg-n-ed vge-ui';
  function abrirLogin(primeiro) {
    login.innerHTML = '<div class="h">✏️ Editor do site</div>'
      + '<input type="password" data-c="s" placeholder="Senha" autocomplete="current-password">'
      + (primeiro ? '<div class="mini">Primeiro uso: cole um token do GitHub com permissão de escrita (Contents) neste repositório. Ele fica guardado cifrado pela senha.</div><input type="password" data-c="t" placeholder="Token do GitHub (github_pat_…)">' : '')
      + '<div class="erro"></div><div class="acoes"><span class="dica">Enter entra</span><a data-a="cancelar">Cancelar</a><a data-a="ok" class="pri">Entrar</a></div>';
    const b = D.getElementById('vge-btn').getBoundingClientRect(); posicionar(login, b, false);
    login.querySelector('input').focus();
  }
  async function entrar() {
    const s = login.querySelector('[data-c="s"]').value, tIn = login.querySelector('[data-c="t"]'), er = login.querySelector('.erro');
    if (!s) return; er.textContent = 'Conferindo…';
    try {
      if (!tIn) {
        const r = await fetch(BASE + 'editor-chave.json', { cache: 'no-cache' });
        if (!r.ok) { abrirLogin(true); login.querySelector('[data-c="s"]').value = s; return; }
        let tk; try { tk = await decifrar(await r.json(), s); } catch (_) { er.textContent = 'Senha errada.'; return; }
        localStorage.setItem(K_TOK, tk);
      } else {
        const tk = tIn.value.trim(); if (!tk) { er.textContent = 'Cole o token.'; return; }
        const rr = await fetch('https://api.github.com/repos/' + REPO, { headers: { Authorization: 'Bearer ' + tk, Accept: 'application/vnd.github+json' } });
        const j = rr.ok ? await rr.json() : null;
        if (!j || !(j.permissions && j.permissions.push)) { er.textContent = 'Esse token não pode escrever no repositório.'; return; }
        localStorage.setItem(K_TOK, tk);
        const corpo = { message: 'Editor do site: chave cifrada', content: b64(JSON.stringify(await cifrar(tk, s)) + '\n'), branch: 'main' };
        const ex = await gh(ARQ_CHAVE + '?ref=main'); if (ex.ok) corpo.sha = (await ex.json()).sha;
        const w = await gh(ARQ_CHAVE, { method: 'PUT', body: JSON.stringify(corpo) });
        if (!w.ok) { er.textContent = 'Não consegui gravar a chave (' + w.status + ').'; return; }
      }
      esconder(login); localStorage.setItem(K_ON, '1'); definir(true);
    } catch (e) { er.textContent = 'Erro: ' + e.message; }
  }
  login.addEventListener('click', e => { const a = e.target.closest('a'); if (!a) return; if (a.dataset.a === 'cancelar') esconder(login); else entrar(); });
  login.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); entrar(); } if (e.key === 'Escape') esconder(login); });

  function montarBotao() {
    const b = D.createElement('button'); b.id = 'vge-btn'; b.type = 'button'; b.setAttribute('data-liquido', ''); b.title = 'Editor do site'; b.setAttribute('aria-label', 'Editor do site');
    b.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg><i></i>';
    const av = D.createElement('div'); av.id = 'vge-aviso'; av.className = 'vge-ui'; av.textContent = AVISO;
    b.addEventListener('click', e => {
      e.stopPropagation();
      if (ligado) { terminar(); localStorage.setItem(K_ON, '0'); definir(false); return; }
      if (tok()) { localStorage.setItem(K_ON, '1'); definir(true); return; }
      if (login.classList.contains('on')) esconder(login); else abrirLogin(false);
    });
    b.addEventListener('dblclick', e => { if (!ligado) return; e.preventDefault(); if (confirm('Sair do editor neste navegador? (vai pedir a senha de novo)')) { localStorage.removeItem(K_TOK); localStorage.setItem(K_ON, '0'); definir(false); } });
    D.body.append(b, av, login);
  }

  function iniciar() {
    D.head.appendChild(st); D.body.append(tip, barra, caixa);
    const PC = !matchMedia('(max-width:1024px),(pointer:coarse)').matches;
    if (ADMIN && TOPO && PC) { montarBotao(); try { localStorage.setItem(K_ON, '0'); } catch (_) { } }
    else if (ADMIN) definir(localStorage.getItem(K_ON) === '1');
    carregar();
    const root = raiz(); if (root) new MutationObserver(depois).observe(root, { childList: true, subtree: true });
    addEventListener('hashchange', depois); D.addEventListener('pane', depois);
  }
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
