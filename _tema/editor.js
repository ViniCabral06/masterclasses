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

  let dados = { t: [], b: [], i: [] };    // edições desta página: t = textos, b = balões, i = imagens
  // imagem enviada pelo editor: guardada como "vge:edicoes-img/x.webp" e resolvida pela pasta do tema
  const resolver = s => !s ? s : /^vge:/.test(s) ? (BASE || '') + s.slice(4) : s;
  const resolverHtml = h => (h || '').replace(/(src=")vge:([^"]+)"/g, (_, a, r) => a + (BASE || '') + r + '" data-vge-src="' + r + '"');
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
        let el = acharEl(root, e); if (!el) continue;
        if (e.nt && e.nt !== el.tagName.toLowerCase()) el = trocarTag(el, e.nt);
        el.innerHTML = resolverHtml(e.r); el.dataset.vge = e.id;
        if (e.st != null) { if (e.st) el.setAttribute('style', e.st); else el.removeAttribute('style'); }
      }
      for (const m of dados.i) {
        if (D.querySelector('img[data-vgi="' + m.id + '"]')) continue;
        const l = [...root.querySelectorAll('img')].filter(x => x.getAttribute('src') === m.src && !x.dataset.vgi);
        const img = l[Math.min(m.n || 0, l.length - 1)]; if (!img) continue;
        img.dataset.vgi = m.id; aplicarImg(img, m);
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
  function trocarTag(el, tag) {
    const n = D.createElement(tag);
    [...el.attributes].forEach(a => n.setAttribute(a.name, a.value));
    while (el.firstChild) n.appendChild(el.firstChild);
    el.replaceWith(n); return n;
  }
  function aplicarImg(img, m) {
    if (!img.dataset.vgiSrc) img.dataset.vgiSrc = img.getAttribute('src');
    img.style.display = m.del ? 'none' : '';
    if (m.ns) { img.src = resolver(m.ns); img.removeAttribute('srcset'); } else if (img.getAttribute('src') !== img.dataset.vgiSrc) img.setAttribute('src', img.dataset.vgiSrc);
    if (m.w) { img.style.width = m.w + 'px'; img.style.maxWidth = m.h ? 'none' : '100%'; img.style.height = m.h ? m.h + 'px' : 'auto'; } else { img.style.width = ''; img.style.height = ''; }
    img.style.transform = m.x || m.y ? 'translate(' + (m.x || 0) + 'px,' + (m.y || 0) + 'px)' : '';
  }
  let tAp = 0; const depois = () => { if (aplicando || (!dados.t.length && !dados.b.length && !dados.i.length)) return; clearTimeout(tAp); tAp = setTimeout(aplicar, 300); };

  async function carregar() {
    if (!BASE) return;
    try {
      const r = await fetch(BASE + 'edicoes.json', { cache: 'no-cache' });
      if (!r.ok) return;
      const j = await r.json(), p = j[PG] || {};
      dados = { t: p.t || [], b: p.b || [], i: p.i || [] }; aplicar();
    } catch (_) { }
  }

  /* ---------- estilo ---------- */
  const st = D.createElement('style');
  st.textContent = 'mark.vge-bal{background:none;color:inherit;text-decoration:underline dotted;text-decoration-thickness:1.5px;text-underline-offset:3px;text-decoration-color:color-mix(in srgb,var(--vg-acc,#ff6fb5) 75%,transparent);cursor:help;-webkit-box-decoration-break:clone;box-decoration-break:clone}'
    + 'mark.vge-bal:hover,mark.vge-bal.on{text-decoration-style:solid;background:color-mix(in srgb,var(--vg-acc,#ff6fb5) 14%,transparent);border-radius:4px}'
    // balão no mesmo visual das siglas (.vg-sgtip, do siglas.js); com o editor ligado, ganha Editar/Remover
    + '.vge-tip{position:fixed;z-index:2147483600;left:0;top:0;max-width:min(300px,calc(100vw - 24px));padding:9px 13px 10px;border-radius:16px;pointer-events:none;'
    + 'font:500 13.5px/1.4 "Instrument Sans",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#eef4f6;'
    + 'background:linear-gradient(160deg,rgba(255,255,255,.16),rgba(255,255,255,.04) 45%,rgba(255,255,255,.08)),rgba(12,16,22,.72);'
    + '-webkit-backdrop-filter:blur(18px) saturate(170%);backdrop-filter:blur(18px) saturate(170%);'
    + 'box-shadow:inset 0 1px 0 rgba(255,255,255,.28),inset 0 0 0 1px rgba(255,255,255,.14),0 14px 34px -12px rgba(0,0,0,.55);'
    + 'opacity:0;visibility:hidden;transform:translateY(4px) scale(.97);transform-origin:var(--o,50% 0);transition:opacity .16s ease,transform .22s cubic-bezier(.2,.8,.2,1)}'
    + '.vge-tip.on{opacity:1;visibility:visible;transform:none}html.vge-on .vge-tip.on{pointer-events:auto}'
    + '.vge-tip b{display:block;font:600 11px/1.2 "Instrument Sans",sans-serif;letter-spacing:.06em;text-transform:uppercase;color:var(--vg-acc-ink,#ffb3d9);margin-bottom:3px}'
    + '.vge-tip .txt{white-space:normal;overflow-wrap:anywhere}'
    + '.vge-tip .chips{display:flex;gap:6px;margin-top:8px}.vge-tip .chips a{background:rgba(255,255,255,.14);color:inherit;border-radius:999px;padding:3px 10px;font-size:12px;cursor:pointer;text-decoration:none}.vge-tip .chips a:hover{background:rgba(255,255,255,.24)}'
    + ':root[data-theme="light"] .vge-tip{color:#14161c;background:linear-gradient(160deg,rgba(255,255,255,.75),rgba(255,255,255,.45)),rgba(250,251,253,.7);box-shadow:inset 0 1px 0 #fff,inset 0 0 0 1px rgba(16,22,40,.08),0 14px 34px -12px rgba(16,22,40,.35)}'
    + ':root[data-theme="light"] .vge-tip b{color:var(--vg-acc-ink,#c2186f)}:root[data-theme="light"] .vge-tip .chips a{background:rgba(16,22,40,.08)}'
    + '@media (prefers-reduced-motion:reduce){.vge-tip{transition:none}}'
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
    + '#vge-aviso.msg{display:block!important;max-width:min(520px,calc(100vw - 120px));white-space:normal;border-radius:14px}'
    + '.vge-ui input{display:block;width:100%;box-sizing:border-box;margin:2px 0 8px;padding:8px 10px;border-radius:9px;border:1px solid #3a3f3b;background:#121513;color:#eef0ec;font:inherit;font-size:14px}'
    + '.vge-ui .erro{color:#ff8f9a;font-size:12px;margin-bottom:6px;min-height:1em}.vge-ui .mini{font-size:11px;color:#8f968f;margin-bottom:6px}'
    + '@media (max-width:1024px),(pointer:coarse){#vge-btn,#vge-aviso{display:none!important}}';

  /* ---------- balão para todos ---------- */
  const tip = D.createElement('div'); tip.className = 'vge-tip vge-ui'; tip.setAttribute('role', 'tooltip');
  let tTip = 0, segura = false;
  function posicionar(el, rect, acima = true) {
    el.style.left = '0px'; el.style.top = '0px'; el.classList.add('on');
    const w = el.offsetWidth, h = el.offsetHeight, x = Math.min(innerWidth - w - 10, Math.max(10, rect.left));
    let y = acima ? rect.top - h - 8 : rect.bottom + 8;
    if (acima && y < 10) y = rect.bottom + 8; if (!acima && y + h > innerHeight - 10) y = Math.max(10, rect.top - h - 8);
    el.style.left = x + 'px'; el.style.top = y + 'px';
  }
  const esconder = el => { el.classList.remove('on'); if (el === tip) D.querySelectorAll('mark.vge-bal.on').forEach(x => x.classList.remove('on')); };
  function mostrarTip(m) {
    const b = dados.b.find(x => x.id === m.dataset.b); if (!b) return;
    tip.dataset.b = b.id;
    tip.innerHTML = '<b>' + esc(norm(b.q)) + '</b><div class="txt">' + esc(b.t).replace(/\n/g, '<br>') + '</div>'
      + (ligado ? '<div class="chips"><a data-a="editar">✎ Editar</a><a data-a="remover">✕ Remover</a></div>' : '');
    D.querySelectorAll('mark.vge-bal.on').forEach(x => x.classList.remove('on'));
    D.querySelectorAll('mark.vge-bal[data-b="' + b.id + '"]').forEach(x => x.classList.add('on'));
    tip.classList.remove('on'); tip.style.left = '0px'; tip.style.top = '0px';
    const r = m.getBoundingClientRect(), tw = tip.offsetWidth, th = tip.offsetHeight;
    const x = Math.max(12, Math.min(r.left + r.width / 2 - tw / 2, innerWidth - tw - 12));
    let y = r.bottom + 8, baixo = true; if (y + th > innerHeight - 8) { y = r.top - th - 8; baixo = false; }
    tip.style.left = x + 'px'; tip.style.top = y + 'px';
    tip.style.setProperty('--o', (r.left + r.width / 2 - x) + 'px ' + (baixo ? '0' : '100%'));
    tip.classList.add('on');
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
  const TESTE = () => { try { return LOCAL && sessionStorage.getItem('vg-ed-teste') === '1'; } catch (_) { return false; } };
  const tok = () => { if (TESTE()) return 'teste'; try { return localStorage.getItem(K_TOK) || ''; } catch (_) { return ''; } };
  const b64 = s => { const u = new TextEncoder().encode(s); let x = ''; for (let i = 0; i < u.length; i += 0x8000) x += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(x); };
  const deb64 = s => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/\s/g, '')), c => c.charCodeAt(0)));
  async function gh(caminho, op) {
    if (TESTE()) { console.info('[editor · teste] ' + ((op && op.method) || 'GET') + ' ' + caminho + ' (não enviado)'); return new Response('{}', { status: op && op.method === 'PUT' ? 201 : 404 }); }
    const h = { Authorization: 'Bearer ' + tok(), Accept: 'application/vnd.github+json' };
    return fetch(API + caminho, Object.assign({ headers: h, cache: 'no-store' }, op || {}, op && op.body ? { headers: Object.assign(h, { 'Content-Type': 'application/json' }) } : {}));
  }
  let fila = [], tSalvar = 0, enviando = false;
  function marcar(c) { const b = D.getElementById('vge-btn') || (window.top !== window && (() => { try { return window.top.document.getElementById('vge-btn'); } catch (_) { return null; } })()); if (!b) return; b.classList.remove('salvando', 'salvo', 'erro'); if (c) b.classList.add(c); }
  function agendar(op) { fila.push(op); marcar('salvando'); clearTimeout(tSalvar); tSalvar = setTimeout(enviar, 1200); }
  function aplicarOps(obj, ops) {
    const p = obj[PG] || (obj[PG] = { t: [], b: [] }); p.t = p.t || []; p.b = p.b || []; p.i = p.i || [];
    for (const o of ops) {
      const l = p[o.k], i = l.findIndex(x => x.id === o.item.id);
      if (o.del) { if (i >= 0) l.splice(i, 1); } else if (i >= 0) l[i] = o.item; else l.push(o.item);
    }
    if (!p.i.length) delete p.i;
    if (!p.t.length && !p.b.length && !p.i) delete obj[PG];
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
        if (w.status === 401 || w.status === 403 || w.status === 404) { sairToken(); throw new Error(w.status === 404 ? 'o token não tem permissão de escrita: crie outro marcando public_repo e entre de novo pela caneta' : 'o token não vale mais: entre de novo pela caneta'); }
        if (w.status !== 409 && w.status !== 422) throw new Error('escrita ' + w.status);
      }
      throw new Error('conflito');
    } catch (e) { marcar('erro'); if (!tok()) { aviso('Não salvou: ' + e.message + '.'); return; } fila = ops.concat(fila); aviso('Não salvou (' + e.message + '). Tento de novo em 10 s.'); tSalvar = setTimeout(enviar, 10000); }
    finally { enviando = false; }
  }
  function sairToken() { try { localStorage.removeItem(K_TOK); localStorage.setItem(K_ON, '0'); } catch (_) { } fila = []; setTimeout(() => definir(false), 0); }
  function aviso(t) { const a = D.getElementById('vge-aviso') || (window.top !== window && (() => { try { return window.top.document.getElementById('vge-aviso'); } catch (_) { return null; } })()); if (a) { a.textContent = t; a.classList.add('msg'); clearTimeout(a._t); a._t = setTimeout(() => { a.textContent = AVISO; a.classList.remove('msg'); }, /^Não salvou|não subiu/.test(t) ? 15000 : 4000); } }
  const AVISO = '✏️ Modo edição: clique num texto para mudar · selecione um trecho para pôr um 💬 balão';

  /* ---------- editar texto ---------- */
  function limpar(el) {
    const c = el.cloneNode(true);
    c.querySelectorAll('script,style,iframe,object,embed').forEach(x => x.remove());
    // tira o que os outros scripts põem por cima (grifos, siglas, ligações, balões): eles voltam sozinhos
    c.querySelectorAll('mark.vg-nota,mark.vge-bal,mark.vg-elo-alvo,.vg-sg,.vg-elo').forEach(x => { const p = x.parentNode; while (x.firstChild) p.insertBefore(x.firstChild, x); x.remove(); });
    c.querySelectorAll('.vge-sel').forEach(x => x.classList.remove('vge-sel'));
    c.querySelectorAll('img[data-vge-src]').forEach(x => { x.setAttribute('src', 'vge:' + x.dataset.vgeSrc); x.removeAttribute('data-vge-src'); });
    c.querySelectorAll('*').forEach(x => { if (x.getAttribute('class') === '') x.removeAttribute('class'); [...x.attributes].forEach(a => { if (/^on/i.test(a.name) || (/^(href|src)$/i.test(a.name) && /^\s*javascript:/i.test(a.value))) x.removeAttribute(a.name); }); });
    c.normalize(); return c.innerHTML.trim();
  }
  let atual = null; // {el, antes, q, pre, pos, id}
  function editar(el) {
    if (atual && atual.el === el) return; terminar();
    const root = raiz(), id = el.dataset.vge;
    const ex = id && dados.t.find(x => x.id === id);
    const c = ex ? { pre: ex.pre, pos: ex.pos } : contexto(root, el);
    const tag0 = ex ? ex.tag : el.tagName.toLowerCase();
    atual = { el, el0: el, antes: el.innerHTML, stAntes: el.getAttribute('style') || '', limpoAntes: limpar(el), q: ex ? ex.q : norm(el.textContent), pre: c.pre, pos: c.pos, id: id || ('e' + Date.now().toString(36)), tag: tag0, tagAntes: el.tagName.toLowerCase() };
    el.contentEditable = 'true'; el.classList.add('vge-ed'); el.focus();
    mostrarBarraFmt();
  }
  function terminar(desfazer) {
    if (!atual) return; const a = atual; atual = null;
    esconderBarraFmt();
    a.el.removeAttribute('contenteditable'); a.el.classList.remove('vge-ed');
    if (!a.el.getAttribute('class')) a.el.removeAttribute('class');
    if (desfazer) {
      let el = a.el; if (el.tagName.toLowerCase() !== a.tagAntes) el = trocarTag(el, a.tagAntes);
      el.innerHTML = a.antes; if (a.stAntes) el.setAttribute('style', a.stAntes); else el.removeAttribute('style'); return;
    }
    const novo = limpar(a.el), stNovo = a.el.getAttribute('style') || '', tagNova = a.el.tagName.toLowerCase();
    if (novo === a.limpoAntes && stNovo === a.stAntes && tagNova === a.tagAntes) return;
    const item = { id: a.id, tag: a.tag, q: a.q, pre: a.pre, pos: a.pos, r: novo, d: Date.now() };
    if (stNovo || a.stAntes) item.st = stNovo;
    if (tagNova !== a.tag) item.nt = tagNova;
    const i = dados.t.findIndex(x => x.id === a.id); if (i >= 0) dados.t[i] = item; else dados.t.push(item);
    a.el.dataset.vge = a.id; agendar({ k: 't', item });
  }
  // sai da edição ao clicar fora do texto (a barra de formatação e as caixinhas do editor não contam)
  const DO_EDITOR = '.vge-ui,#vge-tb,#vge-btn,#vge-moldura';
  D.addEventListener('mousedown', e => {
    if (!atual || !e.target.closest) return;
    if (atual.el.contains(e.target) || e.target.closest(DO_EDITOR)) return;
    terminar();
  }, true);
  D.addEventListener('keydown', e => {
    if (!atual || !atual.el.contains(e.target)) return;
    if (e.key === 'Escape') { e.preventDefault(); terminar(true); }
    else if (e.key === 'Enter' && !(getSelection().anchorNode && getSelection().anchorNode.parentElement && getSelection().anchorNode.parentElement.closest('li'))) { e.preventDefault(); D.execCommand('insertLineBreak'); }
    else if ((e.ctrlKey || e.metaKey) && !e.shiftKey && /^[biu]$/i.test(e.key)) { e.preventDefault(); D.execCommand({ b: 'bold', i: 'italic', u: 'underline' }[e.key.toLowerCase()]); }
  }, true);
  // modo edição: clicar no conteúdo edita (e não aciona botões/alternativas do master)
  function noConteudo(t) { const root = raiz(); return root && root.contains(t) && !(t.closest && t.closest(FORA)); }
  D.addEventListener('click', e => {
    if (!ligado || !e.target.closest || e.target.closest(DO_EDITOR + ',mark.vge-bal')) return;
    if (e.target.tagName === 'IMG' && noConteudo(e.target)) { e.preventDefault(); e.stopImmediatePropagation(); selecionarImg(e.target); return; }
    if (atual && atual.el.contains(e.target)) return;
    if (!noConteudo(e.target)) return;
    if (!getSelection().isCollapsed) return;
    const el = e.target.closest(BLOCO) || (e.target.childNodes && [...e.target.childNodes].some(n => n.nodeType === 3 && n.nodeValue.trim()) ? e.target : null);
    if (!el || !noConteudo(el)) return;
    e.preventDefault(); e.stopImmediatePropagation(); editar(el);
  }, true);

  /* ---------- balão: selecionar → 💬 ---------- */
  const barra = D.createElement('div'); barra.className = 'vg-n-ui vg-n-barra vge-ui'; barra.innerHTML = '<a data-a="bal">💬 Pôr balão</a>';
  const caixa = D.createElement('div'); caixa.className = 'vg-n-ui vg-n-ed vge-ui';
  caixa.innerHTML = '<div class="h">💬 Balão (todos veem)</div><textarea rows="3" placeholder="Texto que aparece ao passar o mouse…"></textarea><div class="acoes"><span class="dica">Ctrl+Enter salva · Esc cancela</span><a data-a="cancelar">Cancelar</a><a data-a="salvar" class="pri">Salvar</a></div>';
  const ta = caixa.querySelector('textarea');
  let pend = null, balEd = null;
  function aoSoltar(e) {
    if (!ligado || atual || (e.target.closest && e.target.closest(DO_EDITOR))) return;
    setTimeout(() => { const rg = pendDaSelecao(); if (!rg) { esconder(barra); return; } posicionar(barra, rg.getBoundingClientRect()); }, 60);
  }
  // trecho selecionado → pend (âncora do balão); devolve o range ou null
  function pendDaSelecao() {
    const sel = getSelection(); if (!sel || sel.isCollapsed || !sel.rangeCount) return null;
    const rg = sel.getRangeAt(0), root = raiz(), el = rg.commonAncestorContainer.nodeType === 1 ? rg.commonAncestorContainer : rg.commonAncestorContainer.parentNode;
    const q = rg.toString(); if (q.trim().length < 2 || !root.contains(el) || (el.closest(FORA) && !el.closest('[contenteditable]'))) return null;
    const r0 = D.createRange(); r0.setStart(root, 0); r0.setEnd(rg.startContainer, rg.startOffset);
    const ini = r0.toString().length, fim = ini + q.length, txt = root.textContent;
    pend = { q, pre: txt.slice(Math.max(0, ini - 40), ini), pos: txt.slice(fim, fim + 40), ini, fim };
    return rg;
  }
  function abrirCaixaBalao(rect) { balEd = null; ta.value = ''; posicionar(caixa, rect, false); ta.focus(); }
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

  /* ---------- barra de formatação (no estilo do Google Docs), no topo enquanto edita um texto ---------- */
  const ic = d => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' + d + '</svg>';
  const I = {
    busca: ic('<circle cx="11" cy="11" r="6"/><path d="m20 20-4.2-4.2"/>'),
    desf: ic('<path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>'),
    ref: ic('<path d="m15 14 5-5-5-5"/><path d="M20 9H10a6 6 0 0 0 0 12h3"/>'),
    impr: ic('<path d="M7 9V3h10v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M7 14h10v7H7z"/>'),
    orto: ic('<path d="M4 15 7.5 5h1L12 15M5.2 12h5.6"/><path d="m13 17 3 3 5-7"/>'),
    pincel: ic('<rect x="4" y="3" width="14" height="6" rx="1"/><path d="M18 6h2v5h-8v3"/><path d="M11 14h2v7h-2z"/>'),
    link: ic('<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>'),
    coment: ic('<path d="M4 4h16v12H8l-4 4z"/><path d="M12 7v6M9 10h6"/>'),
    img: ic('<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="m21 16-5-5-9 9"/>'),
    alinE: ic('<path d="M4 6h16M4 10h10M4 14h16M4 18h10"/>'), alinC: ic('<path d="M4 6h16M7 10h10M4 14h16M7 18h10"/>'),
    alinD: ic('<path d="M4 6h16M10 10h10M4 14h16M10 18h10"/>'), alinJ: ic('<path d="M4 6h16M4 10h16M4 14h16M4 18h16"/>'),
    esp: ic('<path d="M11 6h9M11 12h9M11 18h9"/><path d="m4 8 2-2 2 2M4 16l2 2 2-2M6 6v12"/>'),
    check: ic('<path d="m3 7 2 2 3-4M3 17l2 2 3-4"/><path d="M11 7h10M11 17h10"/>'),
    lista: ic('<circle cx="4.5" cy="7" r="1"/><circle cx="4.5" cy="17" r="1"/><path d="M9 7h12M9 17h12"/>'),
    num: ic('<path d="M10 7h11M10 17h11"/><path d="M4 5h1.5v4M3.5 9h3M3.5 15.5a1.5 1.5 0 0 1 3 0c0 1.2-3 2-3 3.5h3"/>'),
    menos: ic('<path d="M4 5h16M11 10h9M11 14h9M4 19h16"/><path d="m8 9-3 3 3 3"/>'),
    mais: ic('<path d="M4 5h16M11 10h9M11 14h9M4 19h16"/><path d="m4 9 3 3-3 3"/>'),
    limpa: ic('<path d="M6 5h12M12 5l-4 14"/><path d="m15 14 6 6M21 14l-6 6"/>'),
    marca: ic('<path d="m14 4 6 6-8 8H6v-6z"/><path d="M3 21h8"/>')
  };
  // fontes usadas nos masters (guardadas em _tema/fontes/) + as do sistema
  const FONTES = ['Instrument Sans', 'Instrument Serif', 'Hanken Grotesk', 'Inter', 'Geist', 'Bricolage Grotesque', 'IBM Plex Sans', 'IBM Plex Mono', 'Fraunces', 'Newsreader', 'Source Serif 4', 'Arial', 'Calibri', 'Segoe UI', 'Verdana', 'Trebuchet MS', 'Georgia', 'Times New Roman', 'Courier New', 'Consolas', 'Comic Sans MS', 'Impact'];
  const ESTILOS = [['p', 'Texto normal'], ['h1', 'Título'], ['h2', 'Título 1'], ['h3', 'Título 2'], ['h4', 'Título 3']];
  const tb = D.createElement('div'); tb.id = 'vge-tb'; tb.className = 'vge-ui-tb';
  tb.innerHTML =
    '<button data-c="busca" title="Pesquisar na página (Ctrl+F)">' + I.busca + '</button>'
    + '<button class="so-txt" data-c="undo" title="Desfazer (Ctrl+Z)">' + I.desf + '</button><button class="so-txt" data-c="redo" title="Refazer (Ctrl+Y)">' + I.ref + '</button>'
    + '<button data-c="print" title="Imprimir (Ctrl+P)">' + I.impr + '</button><button class="so-txt" data-c="orto" title="Verificação ortográfica">' + I.orto + '</button>'
    + '<button class="so-txt" data-c="pincel" title="Pintar formatação">' + I.pincel + '</button>'
    + '<select data-c="zoom" title="Zoom">' + [50, 75, 90, 100, 125, 150, 200].map(z => '<option value="' + z + '"' + (z === 100 ? ' selected' : '') + '>' + z + '%</option>').join('') + '</select><i></i>'
    + '<select data-c="estilo" class="lg" title="Estilos">' + ESTILOS.map(e => '<option value="' + e[0] + '">' + e[1] + '</option>').join('') + '</select><i></i>'
    + '<select data-c="fonte" class="lg" title="Fonte"><option value="">Fonte</option>' + FONTES.map(f => '<option style="font-family:\'' + f + '\'">' + f + '</option>').join('') + '</select><i></i>'
    + '<button class="so-txt" data-c="tam-" title="Diminuir tamanho da fonte">−</button><input data-c="tam" title="Tamanho da fonte" inputmode="numeric"><button class="so-txt" data-c="tam+" title="Aumentar tamanho da fonte">+</button><i></i>'
    + '<button class="so-txt" data-c="bold" title="Negrito (Ctrl+B)"><b>B</b></button><button class="so-txt" data-c="italic" title="Itálico (Ctrl+I)"><em style="font-family:Georgia,serif">I</em></button><button class="so-txt" data-c="underline" title="Sublinhado (Ctrl+U)"><u>U</u></button>'
    + '<label class="cor" title="Cor do texto"><span class="A">A</span><s data-k="cor"></s><input type="color" data-c="cor" value="#e5484d"></label>'
    + '<label class="cor" title="Cor de destaque">' + I.marca + '<s data-k="dest"></s><input type="color" data-c="dest" value="#ffe066"></label><i></i>'
    + '<button class="so-txt" data-c="link" title="Inserir link (Ctrl+K)">' + I.link + '</button><button class="so-txt" data-c="coment" title="Pôr balão de explicação no trecho">' + I.coment + '</button><i></i>'
    + '<select data-c="alin" class="ico" title="Alinhar"><option value="">⯀</option><option value="left">Esquerda</option><option value="center">Centro</option><option value="right">Direita</option><option value="justify">Justificado</option></select>'
    + '<select data-c="esp" class="ico" title="Espaçamento entre linhas"><option value="">↕</option><option value="1">Simples</option><option value="1.15">1,15</option><option value="1.5">1,5</option><option value="2">Duplo</option></select>'
    + '<button class="so-txt" data-c="checklist" title="Lista de verificação">' + I.check + '</button><button class="so-txt" data-c="ul" title="Lista com marcadores">' + I.lista + '</button><button class="so-txt" data-c="ol" title="Lista numerada">' + I.num + '</button>'
    + '<button class="so-txt" data-c="outdent" title="Diminuir recuo">' + I.menos + '</button><button class="so-txt" data-c="indent" title="Aumentar recuo">' + I.mais + '</button><button class="so-txt" data-c="limpar" title="Limpar formatação (Ctrl+\\)">' + I.limpa + '</button>'
    + '<i></i><button data-c="img" class="txt" title="Inserir imagem do computador (no ponto do texto) ou trocar a imagem selecionada">' + I.img + '<span>Imagem</span></button>'
    + '<button data-c="imgorig" class="txt so-img" title="Volta a imagem ao tamanho e lugar originais">↺ Original</button><button data-c="imgdel" class="txt so-img del" title="Apagar a imagem (Delete)">🗑 Apagar</button>';
  const selAlin = tb.querySelector('[data-c="alin"]'), selEsp = tb.querySelector('[data-c="esp"]');
  selAlin.options[0].textContent = 'Alinhar'; selEsp.options[0].textContent = 'Espaço';
  const inTam = tb.querySelector('[data-c="tam"]');
  let rangeSalvo = null, pincel = null;
  D.addEventListener('selectionchange', () => {
    if (!atual) return; const s = getSelection(); if (!s.rangeCount) return;
    const r = s.getRangeAt(0); if (atual.el.contains(r.commonAncestorContainer)) { rangeSalvo = r.cloneRange(); atualizarBarra(); }
  });
  function voltarSelecao() {
    if (!atual) return false; atual.el.focus();
    if (rangeSalvo) { const s = getSelection(); s.removeAllRanges(); s.addRange(rangeSalvo); }
    return true;
  }
  const noSel = () => { const s = getSelection(); const n = s.anchorNode; return n ? (n.nodeType === 1 ? n : n.parentElement) : atual && atual.el; };
  function atualizarBarra() {
    if (!atual) return;
    const el = noSel() || atual.el, cs = getComputedStyle(el);
    inTam.value = Math.round(parseFloat(cs.fontSize) * 0.75); // px → pt, como no Docs
    const est = tb.querySelector('[data-c="estilo"]'), t = atual.el.tagName.toLowerCase();
    est.value = ESTILOS.some(e => e[0] === t) ? t : 'p';
    const fam = (cs.fontFamily.split(',')[0] || '').replace(/["']/g, '').trim(), fs = tb.querySelector('[data-c="fonte"]');
    fs.value = FONTES.includes(fam) ? fam : ''; fs.options[0].textContent = FONTES.includes(fam) ? 'Fonte' : (fam || 'Fonte');
    ['bold', 'italic', 'underline'].forEach(c => { let v = false; try { v = D.queryCommandState(c); } catch (_) { } tb.querySelector('[data-c="' + c + '"]').classList.toggle('on', v); });
    tb.querySelector('[data-c="orto"]').classList.toggle('on', atual.el.spellcheck);
    tb.querySelector('[data-c="pincel"]').classList.toggle('on', !!pincel);
  }
  const htmlTopo = () => { if (TOPO) return null; try { return window.top.document.documentElement; } catch (_) { return null; } };
  function mostrarBarraFmt() { html.classList.add('vge-editando'); const t = htmlTopo(); if (t) t.classList.add('vge-editando'); atualizarBarra(); }
  function esconderBarraFmt() { html.classList.remove('vge-editando'); const t = htmlTopo(); if (t) t.classList.remove('vge-editando'); pincel = null; }
  // embrulha a seleção num <span style> (tamanho em pt, pincel)
  function embrulhar(estilo) {
    const s = getSelection(); if (!s.rangeCount || s.isCollapsed) return null;
    const r = s.getRangeAt(0); if (!atual.el.contains(r.commonAncestorContainer)) return null;
    const sp = D.createElement('span'); Object.assign(sp.style, estilo);
    sp.appendChild(r.extractContents()); r.insertNode(sp);
    sp.querySelectorAll('span[style]').forEach(x => { Object.keys(estilo).forEach(k => x.style[k] = ''); if (!x.getAttribute('style')) { while (x.firstChild) x.parentNode.insertBefore(x.firstChild, x); x.remove(); } });
    const nr = D.createRange(); nr.selectNodeContents(sp); s.removeAllRanges(); s.addRange(nr); rangeSalvo = nr.cloneRange();
    return sp;
  }
  function mudarTam(pt) {
    pt = Math.max(6, Math.min(96, Math.round(pt))); inTam.value = pt;
    if (!voltarSelecao()) return;
    if (getSelection().isCollapsed) atual.el.style.fontSize = pt + 'pt'; else embrulhar({ fontSize: pt + 'pt' });
  }
  function recuo(d) {
    const li = noSel() && noSel().closest('li');
    if (li && atual.el.contains(li)) { D.execCommand(d > 0 ? 'indent' : 'outdent'); return; }
    const m = parseFloat(atual.el.style.marginLeft) || 0, n = Math.max(0, m + d * 36);
    atual.el.style.marginLeft = n ? n + 'px' : '';
  }
  function lista(tipo, check) {
    D.execCommand(tipo === 'ol' ? 'insertOrderedList' : 'insertUnorderedList');
    const l = noSel() && noSel().closest('ul,ol'); if (l && atual.el.contains(l)) l.classList.toggle('vge-check', !!check);
  }
  // aula aberta num iframe (Patologia): a barra do topo comanda o editor de dentro do iframe
  function editorDoIframe() {
    if (!TOPO || atual || imgSel) return null;
    for (const f of D.querySelectorAll('iframe')) {
      if (!f.offsetParent || f.getBoundingClientRect().width < 200 || /[?&]vgindice=/.test(f.src || '')) continue;
      try { const w = f.contentWindow; if (w && w.__vgEditorCmd) return w; } catch (_) { }
    }
    return null;
  }
  window.__vgEditorCmd = (c, v) => cmd(c, v);
  function usarImagem(s) {
    if (imgSel) { trocarImg(imgSel, s); posImg(); }
    else if (atual) { editar(atual.el); voltarSelecao(); D.execCommand('insertHTML', false, '<img src="' + s.url + '"' + (s.rel ? ' data-vge-src="' + s.rel + '"' : '') + ' style="max-width:100%;height:auto">'); }
  }
  function cmd(c, v) {
    if (c === 'img-pronta') { usarImagem(v); return; }
    const fw = editorDoIframe();
    if (fw) {
      // o seletor de arquivo precisa abrir aqui (o clique foi neste documento); a imagem vai pronta para o iframe
      if (c === 'img') escolherImagem(s => fw.__vgEditorCmd('img-pronta', s)); else fw.__vgEditorCmd(c, v);
      return;
    }
    if (c === 'img') {
      if (imgSel) { const im = imgSel; escolherImagem(s => { trocarImg(im, s); posImg(); }); }
      else if (atual) { const el = atual.el; escolherImagem(src => { editar(el); voltarSelecao(); D.execCommand('insertHTML', false, '<img src="' + src.url + '"' + (src.rel ? ' data-vge-src="' + src.rel + '"' : '') + ' style="max-width:100%;height:auto">'); }); }
      else aviso('Clique no texto onde a imagem vai entrar, ou numa imagem para trocar.');
      return;
    }
    if (c === 'imgdel') { if (imgSel) apagarImg(imgSel); return; }
    if (c === 'imgorig') { if (imgSel) originalImg(imgSel); return; }
    if (c === 'print') { window.print(); return; }
    if (c === 'busca') { const t = prompt('Pesquisar na página:'); if (t && window.find) window.find(t); return; }
    if (c === 'zoom') { const m = raiz(); m.style.zoom = v === '100' ? '' : (v / 100); return; }
    if (!atual) { aviso('Clique num texto da página para editar.'); return; }
    voltarSelecao();
    switch (c) {
      case 'undo': case 'redo': case 'bold': case 'italic': case 'underline': case 'outdent': case 'indent': D.execCommand(c); break;
      case 'print': window.print(); break;
      case 'busca': { const t = prompt('Pesquisar na página:'); if (t) window.find && window.find(t); break; }
      case 'orto': atual.el.spellcheck = !atual.el.spellcheck; atual.el.blur(); voltarSelecao(); break;
      case 'pincel': {
        if (pincel) { pincel = null; break; }
        const cs = getComputedStyle(noSel() || atual.el);
        pincel = { fontWeight: cs.fontWeight, fontStyle: cs.fontStyle, textDecoration: cs.textDecorationLine === 'none' ? '' : cs.textDecorationLine, color: cs.color, fontFamily: cs.fontFamily, fontSize: cs.fontSize, backgroundColor: cs.backgroundColor === 'rgba(0, 0, 0, 0)' ? '' : cs.backgroundColor };
        aviso('🖌 Pinte: selecione o trecho que vai receber a formatação.'); break;
      }
      case 'estilo': { const n = trocarTag(atual.el, v); atual.el = n; n.contentEditable = 'true'; n.focus(); rangeSalvo = null; break; }
      case 'fonte': if (v) { D.execCommand('styleWithCSS', false, true); D.execCommand('fontName', false, v); } break;
      case 'tam-': mudarTam((parseFloat(inTam.value) || 12) - 1); break;
      case 'tam+': mudarTam((parseFloat(inTam.value) || 12) + 1); break;
      case 'tam': mudarTam(parseFloat(v) || 12); break;
      case 'cor': D.execCommand('styleWithCSS', false, true); D.execCommand('foreColor', false, v); tb.querySelector('s[data-k="cor"]').style.background = v; break;
      case 'dest': D.execCommand('styleWithCSS', false, true); D.execCommand('hiliteColor', false, v); tb.querySelector('s[data-k="dest"]').style.background = v; break;
      case 'link': { const a0 = noSel() && noSel().closest('a'); const u = prompt('Link (deixe vazio para tirar):', a0 ? a0.getAttribute('href') : 'https://'); voltarSelecao(); if (u === null) break; if (!u.trim() || u.trim() === 'https://') D.execCommand('unlink'); else if (!/^\s*javascript:/i.test(u)) D.execCommand('createLink', false, u.trim()); break; }
      case 'coment': { const rg = pendDaSelecao(); if (!rg) { aviso('Selecione o trecho que vai ganhar o balão.'); break; } abrirCaixaBalao(rg.getBoundingClientRect()); break; }
      case 'alin': if (v) atual.el.style.textAlign = v === 'left' ? '' : v; selAlin.value = ''; break;
      case 'esp': if (v) atual.el.style.lineHeight = v; selEsp.value = ''; break;
      case 'checklist': lista('ul', true); break;
      case 'ul': lista('ul'); break;
      case 'ol': lista('ol'); break;
      case 'limpar': D.execCommand('removeFormat'); D.execCommand('unlink'); break;
      case 'zoom': { const m = raiz(); m.style.zoom = v === '100' ? '' : (v / 100); break; }
    }
    atualizarBarra();
  }
  tb.addEventListener('mousedown', e => { if (!e.target.closest('select,input')) e.preventDefault(); });
  tb.addEventListener('click', e => { const b = e.target.closest('button[data-c]'); if (b) cmd(b.dataset.c); });
  tb.addEventListener('change', e => { const c = e.target.dataset.c; if (c && c !== 'tam') cmd(c, e.target.value); });
  tb.querySelectorAll('input[type=color]').forEach(x => x.addEventListener('input', e => cmd(e.target.dataset.c, e.target.value)));
  inTam.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); cmd('tam', inTam.value); } });
  D.addEventListener('keydown', e => {
    if (!atual || !(e.ctrlKey || e.metaKey)) return;
    if (e.key === 'k' || e.key === 'K') { e.preventDefault(); cmd('link'); }
    else if (e.key === '\\') { e.preventDefault(); cmd('limpar'); }
  }, true);
  // pincel: a próxima seleção recebe a formatação copiada
  D.addEventListener('mouseup', () => {
    if (!atual || !pincel) return;
    setTimeout(() => { const s = getSelection(); if (s.isCollapsed || !atual.el.contains(s.anchorNode)) return; const p = pincel; pincel = null; embrulhar(p); atualizarBarra(); }, 10);
  });

  /* ---------- imagens: enviar, trocar, remover, redimensionar ---------- */
  const inArq = D.createElement('input'); inArq.type = 'file'; inArq.accept = 'image/*'; inArq.style.display = 'none';
  function reduzir(file) {
    return new Promise((ok, erro) => {
      const im = new Image(), u = URL.createObjectURL(file);
      im.onload = () => {
        const k = Math.min(1, 1600 / Math.max(im.width, im.height)), c = D.createElement('canvas');
        c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
        c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); URL.revokeObjectURL(u);
        ok(c.toDataURL('image/webp', 0.86));
      };
      im.onerror = () => erro(new Error('imagem inválida')); im.src = u;
    });
  }
  // sobe a imagem para _tema/edicoes-img/ e devolve {url (para mostrar já), rel}
  async function subir(file) {
    const dataUrl = await reduzir(file), id = 'i' + Date.now().toString(36), rel = 'edicoes-img/' + id + '.webp';
    marcar('salvando');
    while (enviando) await new Promise(r => setTimeout(r, 300));
    enviando = true;
    try {
      const w = await gh('_tema/' + rel, { method: 'PUT', body: JSON.stringify({ message: 'Editor do site: imagem em ' + PG, content: dataUrl.split(',')[1], branch: 'main' }) });
      if (!w.ok) throw new Error('imagem ' + w.status);
      marcar(fila.length ? 'salvando' : 'salvo');
    } catch (e) { marcar('erro'); aviso('A imagem não subiu (' + e.message + ').'); throw e; }
    finally { enviando = false; }
    return { url: dataUrl, rel };
  }
  function escolherImagem(fn) {
    inArq.value = ''; inArq.onchange = async () => { const f = inArq.files[0]; if (!f) return; aviso('Enviando a imagem…'); try { fn(await subir(f)); } catch (_) { } }; inArq.click();
  }

  let imgSel = null, imgFoiMovida = false;
  const moldura = D.createElement('div'); moldura.id = 'vge-moldura'; moldura.className = 'vge-ui';
  moldura.innerHTML = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'].map(d => '<i data-d="' + d + '"></i>').join('') + '<span class="w"></span>';
  function itemImg(img) {
    if (img.dataset.vgi) return dados.i.find(x => x.id === img.dataset.vgi);
    const src0 = img.dataset.vgiSrc || img.getAttribute('src');
    const l = [...raiz().querySelectorAll('img')].filter(x => (x.dataset.vgiSrc || x.getAttribute('src')) === src0);
    const m = { id: 'g' + Date.now().toString(36), src: src0, n: Math.max(0, l.indexOf(img)) };
    img.dataset.vgi = m.id; img.dataset.vgiSrc = src0; dados.i.push(m); return m;
  }
  const doTexto = img => !!(img.dataset.vgeSrc || (img.closest('[data-vge]') && !img.dataset.vgi));
  function posImg() {
    if (!imgSel) return;
    if (!imgSel.isConnected) { soltarImg(); return; }
    const r = imgSel.getBoundingClientRect();
    Object.assign(moldura.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' });
    moldura.querySelector('.w').textContent = Math.round(r.width) + ' × ' + Math.round(r.height);
  }
  function selecionarImg(img) {
    terminar(); soltarImg(); imgSel = img; img.classList.add('vge-sel');
    moldura.classList.add('on'); html.classList.add('vge-img'); posImg(); atualizarBarra();
  }
  function soltarImg() { if (imgSel) imgSel.classList.remove('vge-sel'); imgSel = null; moldura.classList.remove('on'); html.classList.remove('vge-img'); }
  // posição e tamanho moram no style da imagem: width/height e translate (arrastar)
  const desloc = img => { const m = /translate\((-?[\d.]+)px,\s*(-?[\d.]+)px\)/.exec(img.style.transform || ''); return m ? [+m[1], +m[2]] : [0, 0]; };
  function fimImg(img) {
    if (doTexto(img)) { const el = img.closest('[data-vge]') || img.closest(BLOCO); if (el) { editar(el); terminar(); } return; }
    const m = itemImg(img), d = desloc(img);
    m.w = img.style.width ? Math.round(parseFloat(img.style.width)) : 0;
    m.h = img.style.height && img.style.height !== 'auto' ? Math.round(parseFloat(img.style.height)) : 0;
    m.x = Math.round(d[0]); m.y = Math.round(d[1]);
    ['w', 'h', 'x', 'y'].forEach(k => { if (!m[k]) delete m[k]; });
    m.d = Date.now(); agendar({ k: 'i', item: Object.assign({}, m) });
  }
  function apagarImg(img) {
    if (doTexto(img)) { const el = img.closest('[data-vge]') || img.closest(BLOCO); img.remove(); soltarImg(); if (el) { editar(el); terminar(); } return; }
    const m = itemImg(img); m.del = 1; aplicarImg(img, m); m.d = Date.now(); agendar({ k: 'i', item: Object.assign({}, m) }); soltarImg();
  }
  function trocarImg(img, s) {
    if (doTexto(img)) { img.src = s.url; if (s.rel) img.dataset.vgeSrc = s.rel; else img.removeAttribute('data-vge-src'); fimImg(img); return; }
    const m = itemImg(img); m.ns = s.rel ? 'vge:' + s.rel : s.url; delete m.del; img.src = s.url; img.removeAttribute('srcset'); m.d = Date.now(); agendar({ k: 'i', item: Object.assign({}, m) });
  }
  function originalImg(img) {
    if (doTexto(img)) { img.style.width = img.style.height = img.style.transform = ''; fimImg(img); posImg(); return; }
    const m = itemImg(img); dados.i = dados.i.filter(x => x.id !== m.id); aplicarImg(img, { src: m.src }); img.style.height = img.style.transform = ''; img.removeAttribute('data-vgi'); agendar({ k: 'i', del: 1, item: m }); posImg();
  }
  // bolinhas: os cantos mantêm a proporção, as laterais esticam um lado só (como no Word)
  moldura.addEventListener('mousedown', e => {
    if (!imgSel) return; e.preventDefault(); e.stopPropagation();
    const img = imgSel, h = e.target.closest('i[data-d]'), x0 = e.clientX, y0 = e.clientY, p0 = desloc(img), r0 = img.getBoundingClientRect();
    if (!h) {                                                          // no meio: arrasta a imagem pela página
      imgFoiMovida = false;
      const mv = ev => { const dx = ev.clientX - x0, dy = ev.clientY - y0; if (Math.abs(dx) + Math.abs(dy) > 3) imgFoiMovida = true; img.style.transform = 'translate(' + Math.round(p0[0] + dx) + 'px,' + Math.round(p0[1] + dy) + 'px)'; moldura.classList.add('arrasta'); posImg(); };
      const up = () => { removeEventListener('mousemove', mv); removeEventListener('mouseup', up); moldura.classList.remove('arrasta'); if (imgFoiMovida) fimImg(img); };
      addEventListener('mousemove', mv); addEventListener('mouseup', up); return;
    }
    const d = h.dataset.d, k = r0.height / r0.width;
    const mv = ev => {
      const dx = ev.clientX - x0, dy = ev.clientY - y0;
      let w = r0.width, hh = r0.height;
      if (d.includes('e')) w = r0.width + dx; if (d.includes('w')) w = r0.width - dx;
      if (d.includes('s')) hh = r0.height + dy; if (d.includes('n')) hh = r0.height - dy;
      if (d.length === 2) hh = w * k;
      w = Math.max(30, w); hh = Math.max(20, hh);
      img.style.maxWidth = 'none'; img.style.width = Math.round(w) + 'px'; img.style.height = Math.round(hh) + 'px'; img.style.objectFit = 'fill';
      // puxando pela esquerda ou por cima, a borda oposta fica parada
      const nx = p0[0] + (d.includes('w') ? r0.width - w : 0), ny = p0[1] + (d.includes('n') ? r0.height - hh : 0);
      img.style.transform = nx || ny ? 'translate(' + Math.round(nx) + 'px,' + Math.round(ny) + 'px)' : '';
      posImg();
    };
    const up = () => { removeEventListener('mousemove', mv); removeEventListener('mouseup', up); fimImg(img); };
    addEventListener('mousemove', mv); addEventListener('mouseup', up);
  });
  moldura.addEventListener('wheel', () => { moldura.style.pointerEvents = 'none'; setTimeout(() => { moldura.style.pointerEvents = ''; }, 150); }, { passive: true });
  D.addEventListener('mousedown', e => { if (imgSel && !(e.target.closest && e.target.closest('#vge-moldura,#vge-tb,.vge-escolhe'))) soltarImg(); }, true);
  D.addEventListener('keydown', e => {
    if (!imgSel || atual || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName || '')) return;
    if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); apagarImg(imgSel); }
    else if (e.key === 'Escape') soltarImg();
  }, true);
  addEventListener('scroll', posImg, { passive: true, capture: true }); addEventListener('resize', posImg);

  st.textContent += '#vge-tb{position:fixed;z-index:2147481600;left:0;right:0;top:0;height:46px;box-sizing:border-box;display:none;align-items:center;gap:2px;padding:0 54px 0 12px;overflow-x:auto;scrollbar-width:thin;'
    + 'font:500 13px/1 "Instrument Sans",system-ui,sans-serif;color:#1f2328;background:#edf2fa;border-bottom:1px solid #c4c7c5;box-shadow:0 2px 8px rgba(0,0,0,.12)}'
    + 'html.vge-on #vge-tb{display:flex}html.vge-on body{padding-top:46px!important}html.vge-on #vge-btn{top:8px;z-index:2147481700}html.vge-on #vge-aviso{display:none}html.vge-on #vge-aviso.msg{display:block;top:56px;right:auto;left:50%;transform:translateX(-50%);z-index:2147481700}'
    + '#vge-tb button{flex:none;height:30px;min-width:30px;padding:0 6px;border:0;border-radius:6px;background:none;color:inherit;font:inherit;font-size:15px;cursor:pointer;display:grid;place-items:center}'
    + '#vge-tb button:hover,#vge-tb label.cor:hover,#vge-tb select:hover{background:rgba(16,22,40,.08)}#vge-tb button.on{background:#d3e3fd;color:#0b57d0}'
    + '#vge-tb svg{width:18px;height:18px}#vge-tb i{flex:none;width:1px;height:20px;background:rgba(16,22,40,.2);margin:0 5px}'
    + '#vge-tb select{flex:none;height:30px;border:0;border-radius:6px;background:transparent;color:inherit;font:inherit;padding:0 4px;cursor:pointer;max-width:74px}#vge-tb select.lg{max-width:130px}'
    + '#vge-tb select option{color:#1f2328;background:#fff}'
    + '#vge-tb input[data-c=tam]{flex:none;width:34px;height:24px;text-align:center;border:1px solid rgba(16,22,40,.35);border-radius:5px;background:transparent;color:inherit;font:inherit}'
    + '#vge-tb label.cor{flex:none;position:relative;width:30px;height:30px;border-radius:6px;display:grid;place-items:center;cursor:pointer}#vge-tb label.cor .A{font-size:15px;font-weight:600;margin-top:-5px}'
    + '#vge-tb label.cor svg{width:16px;height:16px;margin-top:-5px}#vge-tb label.cor s{position:absolute;left:7px;right:7px;bottom:5px;height:4px;background:#e5484d;text-decoration:none}#vge-tb label.cor s[data-k=dest]{background:#ffe066}'
    + '#vge-tb input[type=color]{position:absolute;inset:0;opacity:0;cursor:pointer;width:100%;height:100%;border:0;padding:0}'
    + '#vge-tb .so-img{display:none!important}html.vge-img #vge-tb .so-img{display:flex!important}'
    + 'html:not(.vge-editando) #vge-tb .so-txt{opacity:.4}'
    + '#vge-tb button.txt{font-size:13px;padding:0 10px;display:flex;gap:6px;align-items:center;white-space:nowrap}#vge-tb button.txt svg{width:16px;height:16px}#vge-tb button.del{color:#d93025}'
    + ':root:not([data-theme="light"]) #vge-tb{color:#e3e3e3;background:#1f2329;border-bottom-color:#3c4043;box-shadow:0 2px 10px rgba(0,0,0,.5)}'
    + ':root:not([data-theme="light"]) #vge-tb button:hover,:root:not([data-theme="light"]) #vge-tb select:hover,:root:not([data-theme="light"]) #vge-tb label.cor:hover{background:rgba(255,255,255,.10)}'
    + ':root:not([data-theme="light"]) #vge-tb button.on{background:#004a77;color:#c2e7ff}:root:not([data-theme="light"]) #vge-tb i{background:rgba(255,255,255,.2)}:root:not([data-theme="light"]) #vge-tb input[data-c=tam]{border-color:rgba(255,255,255,.4)}'
    + ':root:not([data-theme="light"]) #vge-tb button.del{color:#f28b82}'
    + 'html.vge-on main img,html.vge-on #main img,html.vge-on #view img,html.vge-on .main img{cursor:pointer}'
    + 'html.vge-on main img:hover,html.vge-on #main img:hover,html.vge-on #view img:hover,html.vge-on .main img:hover{outline:1px dashed rgba(26,115,232,.8);outline-offset:2px}'
    + '#vge-moldura{position:fixed;z-index:2147481500;display:none;box-sizing:border-box;border:1.5px dashed #1a73e8;cursor:move}#vge-moldura.on{display:block}'
    + '#vge-moldura i{position:absolute;width:12px;height:12px;border-radius:50%;background:#fff;border:2px solid #1a73e8;box-sizing:border-box;margin:-6px 0 0 -6px;box-shadow:0 1px 3px rgba(0,0,0,.35)}'
    + '#vge-moldura i[data-d=nw]{left:0;top:0;cursor:nwse-resize}#vge-moldura i[data-d=n]{left:50%;top:0;cursor:ns-resize}#vge-moldura i[data-d=ne]{left:100%;top:0;cursor:nesw-resize}'
    + '#vge-moldura i[data-d=e]{left:100%;top:50%;cursor:ew-resize}#vge-moldura i[data-d=se]{left:100%;top:100%;cursor:nwse-resize}#vge-moldura i[data-d=s]{left:50%;top:100%;cursor:ns-resize}'
    + '#vge-moldura i[data-d=sw]{left:0;top:100%;cursor:nesw-resize}#vge-moldura i[data-d=w]{left:0;top:50%;cursor:ew-resize}'
    + '#vge-moldura .w{position:absolute;left:50%;top:100%;transform:translate(-50%,12px);font:600 11px/1 system-ui,sans-serif;color:#fff;background:#1a73e8;border-radius:4px;padding:3px 6px;white-space:nowrap;opacity:0;transition:opacity .12s;pointer-events:none}'
    + '#vge-moldura:hover .w,#vge-moldura.arrasta .w{opacity:1}'
    + 'ul.vge-check{list-style:none;padding-left:1.4em}ul.vge-check>li{position:relative}ul.vge-check>li::before{content:"☐";position:absolute;left:-1.3em}'
    + '@media print{#vge-tb,#vge-btn,#vge-aviso,#vge-moldura{display:none!important}html.vge-on body{padding-top:0!important}}';

  /* ---------- liga/desliga (o topo manda; as aulas em iframe seguem pelo storage) ---------- */
  function definir(on) {
    ligado = !!on && !!tok(); html.classList.toggle('vge-on', ligado);
    if (!ligado) { terminar(); soltarImg(); esconder(barra); esconder(caixa); }
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
      + '<div class="erro"></div><div class="acoes"><span class="dica">Enter entra</span><a data-a="cancelar">Cancelar</a><a data-a="ok" class="pri">Entrar</a></div>'
      + (LOCAL ? '<div class="mini" style="margin:10px 0 0">No PC (localhost) dá para testar tudo sem token: nada é salvo no GitHub.</div><div class="acoes"><a data-a="teste">🧪 Testar sem salvar</a></div>' : '');
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
        if (!j || !(j.permissions && j.permissions.push)) { er.textContent = 'Essa conta não pode escrever no repositório.'; return; }
        // token clássico (ghp_): o GitHub informa os escopos; sem public_repo/repo a gravação volta 404
        const esc = rr.headers.get('x-oauth-scopes');
        if (esc !== null && !/(^|,\s*)(public_repo|repo)(\s*,|$)/.test(esc)) { er.textContent = 'Esse token não tem permissão de escrita. Crie outro marcando public_repo.'; return; }
        localStorage.setItem(K_TOK, tk);
        const corpo = { message: 'Editor do site: chave cifrada', content: b64(JSON.stringify(await cifrar(tk, s)) + '\n'), branch: 'main' };
        const ex = await gh(ARQ_CHAVE + '?ref=main'); if (ex.ok) corpo.sha = (await ex.json()).sha;
        const w = await gh(ARQ_CHAVE, { method: 'PUT', body: JSON.stringify(corpo) });
        if (!w.ok) { localStorage.removeItem(K_TOK); er.textContent = w.status === 404 ? 'O GitHub recusou a gravação (404): o token não tem permissão de escrita. Crie outro marcando public_repo (clássico) ou Contents: Read and write (fine-grained).' : 'Não consegui gravar a chave (' + w.status + ').'; return; }
      }
      esconder(login); localStorage.setItem(K_ON, '1'); definir(true);
    } catch (e) { er.textContent = 'Erro: ' + e.message; }
  }
  login.addEventListener('click', e => { const a = e.target.closest('a'); if (!a) return; if (a.dataset.a === 'cancelar') esconder(login); else if (a.dataset.a === 'teste') { try { sessionStorage.setItem('vg-ed-teste', '1'); } catch (_) { } esconder(login); localStorage.setItem(K_ON, '1'); definir(true); aviso('🧪 Modo de teste: as mudanças ficam só nesta aba e não vão para o site.'); } else entrar(); });
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
    if (!TOPO) st.textContent += '#vge-tb{display:none!important}html.vge-on body{padding-top:0!important}';
    if (BASE && !D.getElementById('vge-fontes')) { const l = D.createElement('link'); l.id = 'vge-fontes'; l.rel = 'stylesheet'; l.href = BASE + 'fontes/fontes.css'; D.head.appendChild(l); }
    D.head.appendChild(st); D.body.append(tip, barra, caixa); if (ADMIN) D.body.append(tb, moldura, inArq);
    const PC = !matchMedia('(max-width:1024px),(pointer:coarse)').matches;
    if (ADMIN && TOPO && PC) { montarBotao(); try { localStorage.setItem(K_ON, '0'); } catch (_) { } }
    else if (ADMIN) definir(localStorage.getItem(K_ON) === '1');
    carregar();
    const root = raiz(); if (root) new MutationObserver(depois).observe(root, { childList: true, subtree: true });
    addEventListener('hashchange', depois); D.addEventListener('pane', depois);
  }
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
