/* Flashcards padrão do site (Vinícius e Matheus).
   Uso: <div data-vg-flash="pato"></div> na página; as cartas vêm de _tema/flash/<chave>.txt (formato em lerTexto).
   Master que monta a página depois de carregar chama window.VGFlash && VGFlash.montarTudo().
   O que a pessoa marcou fica neste navegador em vg-flash:<chave>. */
(function () {
  'use strict';
  if (window.VGFlash) return;
  var D = document;
  var BASE = (function () { var s = D.currentScript && D.currentScript.src; return s ? s.replace(/[^/]*$/, '') : '../_tema/'; })();
  var REDUZ = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  // **negrito** e quebras de linha no texto dos cartões
  var fmt = function (s) { return esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>'); };
  var hash = function (s) { var h = 5381; for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); };

  var CSS = '' +
    '.vgfc{--fc-acc:var(--vg-acc,var(--accent,#5fc4ae));--fc-ln:color-mix(in srgb,currentColor 14%,transparent);--fc-bg:color-mix(in srgb,currentColor 5%,transparent);max-width:760px;margin:0 auto;padding:8px 0 40px;font-size:16px;line-height:1.5}' +
    '.vgfc *{box-sizing:border-box}' +
    '.vgfc-top h2{font-family:var(--serif,"Instrument Serif",Georgia,serif);font-weight:400;font-size:clamp(30px,5vw,40px);line-height:1.1;margin:0 0 6px}' +
    '.vgfc-top p{margin:0 0 18px;opacity:.78}' +
    '.vgfc-chips{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 12px}' +
    '.vgfc-chip{font:inherit;font-size:14px;border:1px solid var(--fc-ln);background:transparent;color:inherit;border-radius:999px;padding:7px 13px;cursor:pointer;touch-action:manipulation;display:inline-flex;gap:7px;align-items:center}' +
    '.vgfc-chip small{opacity:.65;font-size:12.5px}' +
    '.vgfc-chip[aria-pressed="true"]{background:var(--fc-acc);border-color:var(--fc-acc);color:#fff}' +
    ':root[data-theme="dark"] .vgfc-chip[aria-pressed="true"]{color:#101211}' +
    '.vgfc-chip[aria-pressed="true"] small{opacity:.85}' +
    '.vgfc-opts{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 18px}' +
    '.vgfc-opts .vgfc-chip{font-size:13.5px;padding:6px 12px}' +
    '.vgfc-bar{height:4px;border-radius:4px;background:var(--fc-ln);overflow:hidden;margin:0 0 8px}' +
    '.vgfc-bar i{display:block;height:100%;background:var(--fc-acc);transition:width .25s}' +
    '.vgfc-cont{display:flex;justify-content:space-between;font-size:13.5px;opacity:.75;margin:0 0 10px;gap:4px 12px;flex-wrap:wrap}.vgfc-cont span:first-child{white-space:nowrap}' +
    '.vgfc-stage{perspective:1400px}' +
    '.vgfc-card{position:relative;width:100%;min-height:300px;border:0;padding:0;background:none;color:inherit;font:inherit;text-align:left;cursor:pointer;touch-action:manipulation;transform-style:preserve-3d;transition:transform .45s cubic-bezier(.23,1,.32,1);display:grid}' +
    '.vgfc-card.vira{transform:rotateY(180deg)}' +
    '.vgfc-face{grid-area:1/1;backface-visibility:hidden;-webkit-backface-visibility:hidden;border:1px solid var(--fc-ln);background:var(--surface,var(--fc-bg));border-radius:20px;padding:26px 26px 22px;display:flex;flex-direction:column;gap:14px;min-height:300px;box-shadow:0 1px 2px rgba(0,0,0,.06),0 8px 24px rgba(0,0,0,.06)}' +
    '.vgfc-back{transform:rotateY(180deg)}' +
    '.vgfc-tag{font-size:12.5px;letter-spacing:.02em;opacity:.7;display:flex;gap:8px;flex-wrap:wrap;align-items:center}' +
    '.vgfc-caiu{background:color-mix(in srgb,var(--fc-acc) 18%,transparent);color:inherit;border-radius:999px;padding:2px 9px;opacity:1}' +
    '.vgfc-q{font-family:var(--serif,"Instrument Serif",Georgia,serif);font-size:clamp(24px,3.6vw,30px);line-height:1.22;margin:auto 0}' +
    '.vgfc-a{font-size:17px;line-height:1.55;margin:auto 0}' +
    '.vgfc-a b,.vgfc-q b{color:var(--fc-acc)}' +
    '.vgfc-hint{font-size:13px;opacity:.55}' +
    '.vgfc-acts{display:flex;gap:10px;margin:14px 0 0;flex-wrap:wrap}' +
    '.vgfc-btn{font:inherit;font-size:15.5px;font-weight:600;flex:1 1 140px;min-height:50px;border-radius:14px;border:1px solid var(--fc-ln);background:transparent;color:inherit;cursor:pointer;touch-action:manipulation}' +
    '.vgfc-btn:disabled{opacity:.35;cursor:default}' +
    '.vgfc-btn.no{border-color:color-mix(in srgb,#e5484d 55%,transparent);color:#e5484d}' +
    '.vgfc-btn.ok{background:var(--fc-acc);border-color:var(--fc-acc);color:#fff}' +
    ':root[data-theme="dark"] .vgfc-btn.ok{color:#101211}' +
    '.vgfc-btn.sm{flex:0 0 auto;min-height:44px;padding:0 16px;font-weight:500}' +
    '.vgfc-fim{text-align:center;border:1px solid var(--fc-ln);border-radius:20px;padding:30px 22px}' +
    '.vgfc-fim h3{font-family:var(--serif,"Instrument Serif",Georgia,serif);font-weight:400;font-size:34px;margin:0 0 6px}' +
    '.vgfc-fim .vgfc-acts{justify-content:center}' +
    '.vgfc-lista{margin:26px 0 0}' +
    '.vgfc-lista summary{cursor:pointer;font-weight:600;padding:8px 0}' +
    '.vgfc-lista h4{margin:22px 0 8px;font-size:15px}' +
    '.vgfc-lista dl{margin:0;display:grid;gap:0}' +
    '.vgfc-lista dt{font-weight:600;padding:12px 0 2px;border-top:1px solid var(--fc-ln)}' +
    '.vgfc-lista dd{margin:0 0 4px;opacity:.85}' +
    '.vgfc-lista dd b{color:var(--fc-acc)}' +
    '.vgfc-st{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:6px;vertical-align:middle;background:var(--fc-ln)}' +
    '.vgfc-st.s1{background:#30a46c}.vgfc-st.s0{background:#e5484d}' +
    '@media (max-width:600px){.vgfc-chips,.vgfc-opts{flex-wrap:nowrap;overflow-x:auto;margin-left:-16px;margin-right:-16px;padding:0 16px 4px;scrollbar-width:none;-webkit-overflow-scrolling:touch}.vgfc-chips::-webkit-scrollbar,.vgfc-opts::-webkit-scrollbar{display:none}.vgfc-chip{flex:0 0 auto;white-space:nowrap}.vgfc-top p{font-size:15px}.vgfc-face{padding:20px 18px 18px;min-height:260px;border-radius:16px}.vgfc-card{min-height:260px}.vgfc-a{font-size:16px}}' +
    '@media (prefers-reduced-motion:reduce){.vgfc-card{transition:none}}';

  function estilo() {
    if (D.getElementById('vgfc-css')) return;
    var st = D.createElement('style'); st.id = 'vgfc-css'; st.textContent = CSS; D.head.appendChild(st);
  }

  function ler(k) { try { return JSON.parse(localStorage.getItem(k)) || {}; } catch (e) { return {}; } }
  function grava(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

  function montar(host, chave, dados) {
    var KEY = 'vg-flash:' + chave;
    var S = ler(KEY); S.m = S.m || {}; S.b = S.b || 'todos'; S.so = S.so || '';
    var todos = [];
    dados.baralhos.forEach(function (b) {
      b.cards.forEach(function (c) { todos.push({ id: b.id + ':' + hash(c.f), b: b, f: c.f, v: c.v, c: c.c }); });
    });
    var fila = [], pos = 0, virado = false, sessao = { ok: 0, no: 0 };

    function doBaralho() { return S.b === 'todos' ? todos : todos.filter(function (x) { return x.b.id === S.b; }); }
    function monta(embaralha) {
      var l = doBaralho();
      if (S.so === 'errei') l = l.filter(function (x) { return S.m[x.id] === 0; });
      else if (S.so === 'novas') l = l.filter(function (x) { return S.m[x.id] === undefined; });
      l = l.slice();
      if (embaralha) for (var i = l.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = l[i]; l[i] = l[j]; l[j] = t; }
      fila = l; pos = 0; virado = false; sessao = { ok: 0, no: 0 };
    }
    function conta(l) { var o = 0, n = 0; l.forEach(function (x) { if (S.m[x.id] === 1) o++; else if (S.m[x.id] === 0) n++; }); return { o: o, n: n, t: l.length }; }

    function chips() {
      var h = '<button type="button" class="vgfc-chip" data-b="todos" aria-pressed="' + (S.b === 'todos') + '">Todos <small>' + todos.length + '</small></button>';
      dados.baralhos.forEach(function (b) { h += '<button type="button" class="vgfc-chip" data-b="' + esc(b.id) + '" aria-pressed="' + (S.b === b.id) + '">' + esc(b.t) + ' <small>' + b.cards.length + '</small></button>'; });
      return h;
    }
    function opts() {
      var c = conta(doBaralho());
      var o = function (v, t) { return '<button type="button" class="vgfc-chip" data-so="' + v + '" aria-pressed="' + (S.so === v) + '">' + t + '</button>'; };
      return o('', 'Todas as cartas') + o('errei', 'Só as que errei <small>' + c.n + '</small>') + o('novas', 'Só as que não vi <small>' + (c.t - c.o - c.n) + '</small>') +
        '<button type="button" class="vgfc-chip" data-acao="embaralha">🔀 Embaralhar</button>';
    }
    function cartao() {
      if (!fila.length) return '<div class="vgfc-fim"><h3>Nada aqui</h3><p>' + (S.so === 'errei' ? 'Você não tem cartas erradas neste baralho.' : 'Você já viu todas as cartas deste baralho.') + '</p><div class="vgfc-acts"><button type="button" class="vgfc-btn sm" data-so-volta="1">Ver todas as cartas</button></div></div>';
      if (pos >= fila.length) {
        var tot = sessao.ok + sessao.no;
        return '<div class="vgfc-fim"><h3>Fim do baralho</h3><p>Você sabia <b>' + sessao.ok + '</b> de ' + tot + ' cartas.' + (sessao.no ? ' As ' + sessao.no + ' que você errou ficam em "Só as que errei".' : ' Gabaritou!') + '</p><div class="vgfc-acts">' +
          (sessao.no ? '<button type="button" class="vgfc-btn ok" data-acao="refaz">Refazer as que errei</button>' : '') +
          '<button type="button" class="vgfc-btn sm" data-acao="recomeca">Recomeçar</button></div></div>';
      }
      var x = fila[pos], m = S.m[x.id];
      var tag = '<span>' + esc(x.b.t) + '</span>' + (x.c ? '<span class="vgfc-caiu">' + esc(x.c) + '</span>' : '') + (m === 0 ? '<span>· você errou da última vez</span>' : m === 1 ? '<span>· você sabia</span>' : '');
      return '<div class="vgfc-stage"><button type="button" class="vgfc-card' + (virado ? ' vira' : '') + '" data-acao="vira" aria-label="' + (virado ? 'Resposta. Toque para ver a pergunta' : 'Pergunta. Toque para ver a resposta') + '">' +
        '<span class="vgfc-face"><span class="vgfc-tag">' + tag + '</span><span class="vgfc-q">' + fmt(x.f) + '</span><span class="vgfc-hint">Toque para ver a resposta</span></span>' +
        '<span class="vgfc-face vgfc-back"><span class="vgfc-tag"><span>Resposta</span></span><span class="vgfc-a">' + fmt(x.v) + '</span><span class="vgfc-hint">Você sabia?</span></span>' +
        '</button></div>' +
        '<div class="vgfc-acts">' + (virado
          ? '<button type="button" class="vgfc-btn no" data-acao="no">✗ Errei</button><button type="button" class="vgfc-btn ok" data-acao="ok">✓ Sabia</button>'
          : '<button type="button" class="vgfc-btn sm" data-acao="volta"' + (pos ? '' : ' disabled') + ' aria-label="Carta anterior">←</button><button type="button" class="vgfc-btn ok" data-acao="vira">Ver resposta</button>') +
        '</div>';
    }
    function lista() {
      return '<details class="vgfc-lista"><summary>📋 Ver todas as cartas em lista</summary>' + dados.baralhos.map(function (b) {
        return '<h4>' + esc(b.t) + '</h4><dl>' + b.cards.map(function (c) {
          var m = S.m[b.id + ':' + hash(c.f)];
          return '<dt><span class="vgfc-st' + (m === 1 ? ' s1' : m === 0 ? ' s0' : '') + '"></span>' + fmt(c.f) + '</dt><dd>' + fmt(c.v) + '</dd>';
        }).join('') + '</dl>';
      }).join('') + '</details>';
    }
    function pinta() {
      var aberto = host.querySelector('.vgfc-lista[open]');
      var l = doBaralho(), c = conta(l);
      var feito = fila.length ? Math.min(pos, fila.length) : 0;
      host.innerHTML = '<div class="vgfc">' +
        (host.dataset.topo === 'nao' ? '' : '<div class="vgfc-top"><h2>' + esc(dados.titulo || 'Flashcards') + '</h2><p>' + esc(dados.sub || 'Toque no cartão para ver a resposta e marque se você sabia. As que você errar ficam guardadas para revisar depois.') + '</p></div>') +
        '<div class="vgfc-chips" role="group" aria-label="Baralho">' + chips() + '</div>' +
        '<div class="vgfc-opts" role="group" aria-label="Quais cartas">' + opts() + '</div>' +
        '<div class="vgfc-bar"><i style="width:' + (fila.length ? Math.round(feito / fila.length * 100) : 0) + '%"></i></div>' +
        '<div class="vgfc-cont"><span>' + (fila.length ? 'Carta ' + Math.min(pos + 1, fila.length) + ' de ' + fila.length : '') + '</span><span>Neste baralho: ' + c.o + ' sabia · ' + c.n + ' errei · ' + (c.t - c.o - c.n) + ' não vistas</span></div>' +
        cartao() + lista() + '</div>';
      if (aberto) host.querySelector('.vgfc-lista').open = true;
    }
    function vira() { virado = !virado; var cd = host.querySelector('.vgfc-card'); if (cd && !REDUZ) { cd.classList.toggle('vira', virado); setTimeout(pinta, 230); } else pinta(); }
    function marca(v) {
      var x = fila[pos]; if (!x) return;
      S.m[x.id] = v; grava(KEY, S);
      if (v) sessao.ok++; else sessao.no++;
      pos++; virado = false; pinta();
    }

    host.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b || !host.contains(b)) return;
      if (b.dataset.b) { S.b = b.dataset.b; grava(KEY, S); monta(false); pinta(); return; }
      if (b.dataset.so !== undefined) { S.so = b.dataset.so; grava(KEY, S); monta(false); pinta(); return; }
      if (b.dataset.soVolta) { S.so = ''; grava(KEY, S); monta(false); pinta(); return; }
      var a = b.dataset.acao;
      if (a === 'vira') vira();
      else if (a === 'ok') marca(1);
      else if (a === 'no') marca(0);
      else if (a === 'volta') { if (pos) { pos--; virado = false; pinta(); } }
      else if (a === 'embaralha') { monta(true); pinta(); }
      else if (a === 'recomeca') { monta(false); pinta(); }
      else if (a === 'refaz') { S.so = 'errei'; grava(KEY, S); monta(true); pinta(); }
    });
    host.addEventListener('keydown', function (e) {
      if (e.target.closest('summary,input,textarea')) return;
      if (e.key === ' ' || e.key === 'Enter') { if (e.target.closest('.vgfc-card') || !e.target.closest('button')) { e.preventDefault(); vira(); } }
      else if (virado && (e.key === '1' || e.key === 'ArrowLeft')) marca(0);
      else if (virado && (e.key === '2' || e.key === 'ArrowRight')) marca(1);
      else if (!virado && e.key === 'ArrowLeft' && pos) { pos--; pinta(); }
    });
    if (!todos.some(function (x) { return S.b === 'todos' || x.b.id === S.b; })) S.b = 'todos';
    monta(false); pinta();
  }

  /* _tema/flash/<chave>.txt:  @titulo …  /  @sub …  /  # id | Nome do baralho  /  frente :: verso [:: caiu em…]
     No texto: **negrito** e \n para quebrar linha. */
  function lerTexto(t) {
    var d = { titulo: '', sub: '', baralhos: [] }, b = null;
    t.split(/\r?\n/).forEach(function (l) {
      l = l.trim(); if (!l) return;
      if (/^@titulo\s/.test(l)) { d.titulo = l.slice(8).trim(); return; }
      if (/^@sub\s/.test(l)) { d.sub = l.slice(5).trim(); return; }
      if (l[0] === '#') { var p = l.slice(1).split('|'); b = { id: p[0].trim(), t: (p[1] || p[0]).trim(), cards: [] }; d.baralhos.push(b); return; }
      var c = l.split(/\s+::\s+/); if (c.length < 2 || !b) return;
      var n = function (s) { return s ? s.replace(/\\n/g, '\n') : s; };
      b.cards.push({ f: n(c[0]), v: n(c[1]), c: c[2] });
    });
    d.baralhos = d.baralhos.filter(function (x) { return x.cards.length; });
    return d;
  }

  function montaEl(el) {
    if (el.dataset.vgfOk) return; el.dataset.vgfOk = '1';
    var chave = el.getAttribute('data-vg-flash');
    estilo();
    el.innerHTML = '<p style="opacity:.6;padding:20px 0">Carregando os flashcards…</p>';
    fetch(BASE + 'flash/' + encodeURIComponent(chave) + '.txt', { cache: 'no-cache' })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); })
      .then(lerTexto)
      .then(function (d) { montar(el, chave, d); })
      .catch(function () { el.innerHTML = '<p style="padding:20px 0">Não consegui carregar os flashcards. Recarregue a página.</p>'; delete el.dataset.vgfOk; });
  }
  function montarTudo() { D.querySelectorAll('[data-vg-flash]').forEach(montaEl); }

  window.VGFlash = { montarTudo: montarTudo };
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', montarTudo); else montarTudo();
})();
