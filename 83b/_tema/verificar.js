/* Verificação de aprendizado unificada (_tema/verificar.js) — Vinícius e Matheus.
   - Recolhe as questões do fim de cada segmento teórico atrás do cartão "Verificar aprendizado"
     (sem criar segmento novo na barra lateral), abrindo um overlay em tela cheia, 1 questão por vez.
   - Anti-missclick adaptativo por dispositivo (pointerType em tempo real):
       · PC (mouse): 1º clique seleciona; 2º clique na mesma alternativa confirma (ou teclado A-D/1-4 + Enter).
       · iPad / tablet / celular (touch): toque seleciona; botão explícito "Confirmar resposta" entrega.
   - Conjuntos padronizados por segmento: Das provas · Fácil (3) · Médio (5) · Difícil (3) · Aberta (1).
     Mescla questões nativas do HTML com questões externas de _tema/questoes/<chave>.json.
   - Questão Aberta: gabarito sugerido + autoavaliação manual (Acertei / Errei); marcar Acertei
     contabiliza para a liberação do Meme Secreto do segmento.
   - Metacognição por habilidades (modelo do print): logo abaixo do gabarito, 2–3 habilidades
     da questão com Sim · Incerteza · Desatenção · Não (lidas de _tema/habilidades/<chave>.json
     ou do próprio JSON de questões).
   - Análise de lacunas + Micro-questões abertas de conceito (simples e diretas): rodada imediata
     ao fechar o segmento + painel acumulado "🎯 Meus pontos frágeis" (Foco de estudo + Modo Foco).
   - Exceções permanentes:
       · DIC e TH em TODOS os períodos (dic*, th*).
       · Matérias/provas práticas (ex.: Patologia Prática 1 e 2) mantêm sempre as questões abertas inline.
   - Persistência local: vg-verif:<chave> (respostas externas + abertas) e vg-hab:<chave> (habilidades). */
(function () {
  'use strict';
  if (window.VGVerif || window.__vgIndex) return;

  var D = document, html = D.documentElement, K = (html.dataset.vidro || '').toLowerCase();
  if (!K) return;
  /* Exceção permanente em todos os períodos: DIC e TH */
  if (/^(dic|th)\d*$/i.test(K)) return;
  /* Exceção permanente: matérias/provas práticas mantêm sempre as questões abertas inline */
  if (/\/pratica\d*\.html$/i.test(location.pathname) || /[?&]parte=pratica/i.test(location.search) || /^#pratica/i.test(location.hash)) return;
  /* Páginas auxiliares dentro de aulas/ não são segmentos teóricos */
  if (/\/aulas\/(simulado\d*|simgrade|banco|revisao|flashcards)\.html$/i.test(location.pathname)) return;

  var RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var BASE = (function () {
    var s = D.currentScript && D.currentScript.src;
    if (s) return s.replace(/[^/]*$/, '');
    return /\/aulas\/[^/]*$/.test(location.pathname) ? '../../_tema/' : '../_tema/';
  })();
  var naAula = /\/aulas\/[^/]*$/.test(location.pathname);
  var IMG_BASE = naAula ? '../_img/' : '_img/';
  var PASTA = decodeURIComponent(location.pathname.replace(/\/aulas\/[^/]*$/, '/').replace(/[^/]*$/, ''));
  var L = 'ABCDEFGHIJ';
  var SK_V = 'vg-verif:' + K;
  var SK_H = 'vg-hab:' + K;
  var SK_MEME = 'vidro-memes:' + PASTA;

  /* ---------- utilitários ---------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function stripHtml(s) {
    var d = D.createElement('div'); d.innerHTML = String(s == null ? '' : s);
    return (d.textContent || '').replace(/\s+/g, ' ').trim();
  }
  function norm(s) {
    return stripHtml(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '');
  }
  function normTxt(s) {
    return String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
  }
  /* Mesmo hash FNV-1a de _tema/correcao.js para casar habilidades mesmo sem ID estável */
  function fnv(s) {
    var h = 0x811c9dc5;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    return h.toString(16);
  }
  function hashAlts(alts) {
    if (!alts || !alts.length) return '';
    return fnv(alts.map(norm).sort().join('|'));
  }
  function hashStem(enun) {
    var n = norm(enun).slice(0, 120);
    return n ? fnv(n) : '';
  }
  function ler(k, def) {
    try { var v = JSON.parse(localStorage.getItem(k) || 'null'); return v && typeof v === 'object' ? v : def; } catch (e) { return def; }
  }
  function gravar(k, v) {
    try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { }
  }

  /* Estado persistido */
  var ST = ler(SK_V, {});
  ST.ans = ST.ans || {};     // respostas das questões externas { qid: { p, ok } }
  ST.open = ST.open || {};   // respostas das questões abertas { qid: { txt, rev, ev: 'ok'|'no'|'' } }
  ST.memeSeg = ST.memeSeg || {}; // controle extra de memes por segmento+nível

  var HAB = ler(SK_H, {});
  HAB.m = HAB.m || {};       // { habKey: { st:'sim'|'inc'|'des'|'nao', seg, segTit, qid, t, tag, open, ok, rec, ts } }

  function salvaV() { gravar(SK_V, ST); }
  function salvaH() { gravar(SK_H, HAB); atualizaBotaoFoco(); }

  /* Detecção adaptativa de entrada (mouse vs touch) */
  var inputMode = (matchMedia('(hover: none), (pointer: coarse)').matches) ? 'touch' : 'mouse';
  D.addEventListener('pointerdown', function (e) {
    var m = (e.pointerType === 'touch' || e.pointerType === 'pen') ? 'touch' : 'mouse';
    if (m !== inputMode) {
      inputMode = m;
      if (OV) OV.dataset.input = inputMode;
    }
  }, true);

  /* ---------- carregamento sob demanda de JSONs externos ---------- */
  var EXT_Q = null;     // _tema/questoes/<K>.json
  var EXT_H = null;     // _tema/habilidades/<K>.json
  var EXT_LOADED = false;
  var MEMES = [];
  var MEMES_LOADED = false;

  function fetchJson(url) {
    return fetch(url, { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) return null;
      return r.json();
    }).catch(function () { return null; });
  }
  function carregarExternos() {
    if (EXT_LOADED) return Promise.resolve();
    EXT_LOADED = true;
    var ver = '';
    var sc = D.querySelector('script[src*="verificar.js"]');
    if (sc && sc.src.indexOf('?v=') >= 0) ver = sc.src.slice(sc.src.indexOf('?v='));
    return Promise.all([
      fetchJson(BASE + 'questoes/' + K + '.json' + ver),
      fetchJson(BASE + 'habilidades/' + K + '.json' + ver)
    ]).then(function (res) {
      EXT_Q = res[0] && typeof res[0] === 'object' ? res[0] : null;
      EXT_H = res[1] && typeof res[1] === 'object' ? res[1] : null;
      varrer();
      if (OV && OV_CTX) renderOverlay();
    });
  }
  function carregarMemes() {
    if (MEMES_LOADED) return Promise.resolve(MEMES);
    MEMES_LOADED = true;
    if (D.getElementById('meme-js') || window.MEMES || html.dataset.memes === 'proprio') return Promise.resolve(MEMES);
    return fetchJson(IMG_BASE + 'memes.json').then(function (l) {
      MEMES = Array.isArray(l) ? l : [];
      return MEMES;
    });
  }

  /* ---------- busca de habilidades para uma questão ---------- */
  function habilidadesDaQuestao(q) {
    if (!q) return [];
    if (Array.isArray(q.hab) && q.hab.length) return q.hab;
    if (!EXT_H) return [];
    if (q.id && EXT_H.byId && EXT_H.byId[q.id]) return EXT_H.byId[q.id];
    if (q.alts && q.alts.length && EXT_H.byHash) {
      var h = hashAlts(q.alts);
      if (h && EXT_H.byHash[h]) return EXT_H.byHash[h];
    }
    if (q.enun && EXT_H.byStem) {
      var hs = hashStem(q.enun);
      if (hs && EXT_H.byStem[hs]) return EXT_H.byStem[hs];
    }
    return [];
  }

  function habKey(q, idx) {
    var base = q.id || hashAlts(q.alts) || hashStem(q.enun) || 'q';
    return base + ':h' + idx;
  }

  /* ---------- Meme Secreto (compatível com _tema/memes.js) ---------- */
  var MEME_LEGENDA = [
    'Diagnóstico: gabarito perfeito.',
    'O professor ficaria orgulhoso (ou desconfiado).',
    'Achado de necropsia: zero erros.',
    'Prognóstico excelente.',
    'Mereceu. Próximo segmento?'
  ];
  function memeEstado() {
    var s = ler(SK_MEME, { deck: [], got: {} });
    s.deck = Array.isArray(s.deck) ? s.deck : [];
    s.got = s.got && typeof s.got === 'object' ? s.got : {};
    return s;
  }
  function sortearMeme(s) {
    s.deck = s.deck.filter(function (i) { return i < MEMES.length; });
    if (!s.deck.length) {
      s.deck = MEMES.map(function (_, i) { return i; });
      for (var i = s.deck.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = s.deck[i]; s.deck[i] = s.deck[j]; s.deck[j] = tmp;
      }
    }
    return s.deck.shift();
  }
  function abrirModalMeme(segKey, totalCertas, forcarRever) {
    carregarMemes().then(function () {
      if (D.querySelector('.vg-mm.on, .vgq-mm')) return;
      var s = memeEstado();
      var mk = 'vgq:' + K + ':' + segKey;
      var novo = false;
      if (s.got[mk] == null) {
        if (!MEMES.length && !forcarRever) {
          /* fallback sem memes.json (ex.: master com memes inline sem JSON): celebra sem imagem quebrada */
          s.got[mk] = -1;
          gravar(SK_MEME, s);
          novo = true;
        } else if (MEMES.length) {
          s.got[mk] = sortearMeme(s);
          gravar(SK_MEME, s);
          novo = true;
        }
      }
      if (!novo && !forcarRever) return;
      var idx = s.got[mk];
      var m = D.createElement('div');
      m.className = 'vgq-mm';
      m.setAttribute('role', 'dialog');
      m.setAttribute('aria-modal', 'true');
      m.setAttribute('aria-label', 'Meme liberado');
      var imgHtml = (idx >= 0 && MEMES[idx]) ? '<img src="' + esc(IMG_BASE + MEMES[idx]) + '" alt="Meme secreto">' : '<div class="vgq-mm-trophy">🏆</div>';
      m.innerHTML =
        '<div class="vgq-mm-box">' +
          '<div class="vgq-mm-k">' + (totalCertas ? totalCertas + ' de ' + totalCertas + ' certas' : 'Meme liberado') + '</div>' +
          '<h3>Gabarito perfeito 🏆</h3>' +
          imgHtml +
          '<p>' + esc(MEME_LEGENDA[Math.floor(Math.random() * MEME_LEGENDA.length)]) + '</p>' +
          '<button type="button" class="vgq-btn pri">Continuar</button>' +
        '</div>';
      function fechar() {
        m.classList.remove('on');
        setTimeout(function () { m.remove(); }, RM ? 0 : 180);
        D.removeEventListener('keydown', onKey, true);
      }
      function onKey(e) {
        if (e.key === 'Escape' || e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); fechar(); }
      }
      m.addEventListener('click', function (e) { if (e.target === m || e.target.closest('button')) fechar(); });
      D.body.appendChild(m);
      D.addEventListener('keydown', onKey, true);
      requestAnimationFrame(function () { m.classList.add('on'); });
    });
  }
  function temMemeLiberado(segKey) {
    var s = memeEstado();
    return s.got['vgq:' + K + ':' + segKey] != null;
  }

  /* ---------- CSS ---------- */
  var CSS_TXT = [
    '.vgq-orig-hide{display:none!important}',
    /* Cartão-chamada no fim do segmento */
    '.vgq-cta{--q-acc:var(--vg-acc,var(--accent,#1b6e66));--q-ln:color-mix(in srgb,currentColor 15%,transparent);--q-bg:color-mix(in srgb,currentColor 5%,transparent);' +
      'margin:30px 0 18px;padding:22px 24px;border-radius:20px;border:1px solid color-mix(in srgb,var(--q-acc) 36%,var(--q-ln));' +
      'background:linear-gradient(135deg,color-mix(in srgb,var(--q-acc) 9%,var(--q-bg)),var(--q-bg));' +
      'display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:14px 20px;' +
      'font-family:var(--vg-text,"Instrument Sans",-apple-system,BlinkMacSystemFont,sans-serif);color:inherit}',
    '.vgq-cta-info{flex:1 1 280px;min-width:0}',
    '.vgq-cta-k{font-size:12px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:var(--q-acc);margin:0 0 4px}',
    '.vgq-cta h3{font-family:var(--vg-display,var(--serif,"Instrument Serif"),Georgia,serif);font-weight:400;font-size:clamp(24px,3vw,30px);line-height:1.12;margin:0 0 6px;color:inherit}',
    '.vgq-cta-sub{margin:0;font-size:14px;line-height:1.5;opacity:.82}',
    '.vgq-cta-pills{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}',
    '.vgq-pill{display:inline-flex;align-items:center;gap:5px;padding:4px 10px;border-radius:999px;font-size:12.5px;font-weight:600;border:1px solid var(--q-ln);background:var(--q-bg)}',
    '.vgq-pill.ok{border-color:rgba(46,160,67,.5);background:rgba(46,160,67,.14);color:#2ea043}',
    '.vgq-pill.warn{border-color:rgba(217,119,6,.5);background:rgba(217,119,6,.14);color:#d97706}',
    '.vgq-cta-acts{display:flex;flex-wrap:wrap;gap:8px;align-items:center}',
    '.vgq-go{appearance:none;border:0;border-radius:999px;padding:12px 22px;font:600 15px/1.1 inherit;cursor:pointer;display:inline-flex;align-items:center;gap:8px;' +
      'background:color-mix(in srgb,var(--q-acc) 82%,#000);color:#fff;box-shadow:0 8px 24px -10px var(--q-acc);transition:transform .16s cubic-bezier(.23,1,.32,1),filter .16s}',
    '.vgq-go:hover{filter:brightness(1.08)}.vgq-go:active{transform:scale(.97)}',
    /* Overlay em tela cheia */
    '.vgq-ov{--q-acc:var(--vg-acc,var(--accent,#1b6e66));--q-ok:#238636;--q-inc:#c95e0c;--q-des:#7c5cff;--q-bad:#cf3a3a;' +
      '--q-ground:var(--vg-ground,var(--ground,#111417));--q-surf:var(--surface,#181c20);--q-ink:var(--ink,#eef2f5);--q-mut:var(--muted,#8f99a3);' +
      '--q-ln:color-mix(in srgb,var(--q-ink) 14%,transparent);--q-bg:color-mix(in srgb,var(--q-ink) 5%,transparent);--q-bg2:color-mix(in srgb,var(--q-ink) 10%,transparent);' +
      'position:fixed;inset:0;z-index:2147481800;display:flex;flex-direction:column;background:var(--q-ground);color:var(--q-ink);' +
      'font-family:var(--vg-text,"Instrument Sans",-apple-system,BlinkMacSystemFont,sans-serif);' +
      'opacity:0;transform:translateY(28px);transition:opacity .22s cubic-bezier(.23,1,.32,1),transform .28s cubic-bezier(.23,1,.32,1)}',
    ':root[data-theme="light"] .vgq-ov{--q-ground:#f7f8f7;--q-surf:#ffffff;--q-ink:#191b1c;--q-mut:#5d646b;--q-ok:#1e7a34;--q-inc:#c25209;--q-des:#6446e0;--q-bad:#c22d2d}',
    '.vgq-ov.on{opacity:1;transform:none}',
    '.vgq-ov *{box-sizing:border-box}',
    '@media(prefers-reduced-motion:reduce){.vgq-ov{transition:none;transform:none}}',
    /* Topbar fixa (glass leve permitido em barra fixa) */
    '.vgq-top{flex:none;display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px;padding:10px clamp(12px,3vw,24px);' +
      'border-bottom:1px solid var(--q-ln);background:color-mix(in srgb,var(--q-ground) 86%,transparent);' +
      '-webkit-backdrop-filter:blur(16px) saturate(140%);backdrop-filter:blur(16px) saturate(140%)}',
    '.vgq-back{appearance:none;border:1px solid var(--q-ln);background:var(--q-bg);color:inherit;border-radius:999px;padding:7px 13px;font:600 13.5px/1.1 inherit;cursor:pointer;display:inline-flex;align-items:center;gap:6px}',
    '.vgq-back:hover{background:var(--q-bg2)}.vgq-back:active{transform:scale(.97)}',
    '.vgq-seg-t{font-size:13.5px;font-weight:600;opacity:.8;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:34vw}',
    '.vgq-tabs{display:flex;flex-wrap:wrap;gap:5px;margin-left:auto;align-items:center}',
    '.vgq-tab{appearance:none;border:1px solid var(--q-ln);background:transparent;color:inherit;border-radius:999px;padding:6px 12px;font:600 12.5px/1.1 inherit;cursor:pointer;display:inline-flex;align-items:center;gap:5px}',
    '.vgq-tab[aria-selected="true"]{background:color-mix(in srgb,var(--q-acc) 82%,#000);border-color:transparent;color:#fff}',
    '.vgq-tab small{opacity:.82;font-weight:500}',
    '.vgq-tab.done{border-color:color-mix(in srgb,var(--q-ok) 60%,transparent)}',
    '.vgq-val-bt{appearance:none;border:1px solid var(--q-ln);background:var(--q-bg);color:inherit;border-radius:999px;padding:6px 11px;font:600 12.5px/1.1 inherit;cursor:pointer}',
    '.vgq-val-bt:hover{background:var(--q-bg2)}',
    /* Progresso */
    '.vgq-prog-wrap{flex:none;padding:8px clamp(14px,3vw,28px) 0;max-width:860px;width:100%;margin:0 auto}',
    '.vgq-bar{height:3px;border-radius:3px;background:var(--q-ln);overflow:hidden;margin-bottom:8px}',
    '.vgq-bar i{display:block;height:100%;background:var(--q-acc);transition:width .24s cubic-bezier(.23,1,.32,1)}',
    '.vgq-dots{display:flex;flex-wrap:wrap;gap:6px;align-items:center}',
    '.vgq-dot{appearance:none;min-width:28px;height:26px;padding:0 7px;border-radius:8px;border:1px solid var(--q-ln);background:transparent;color:inherit;font:600 12px/1 inherit;cursor:pointer;font-variant-numeric:tabular-nums}',
    '.vgq-dot.cur{border-color:var(--q-acc);box-shadow:inset 0 0 0 1.5px var(--q-acc);color:var(--q-acc)}',
    '.vgq-dot.rt{background:color-mix(in srgb,var(--q-ok) 22%,transparent);border-color:var(--q-ok)}',
    '.vgq-dot.wr{background:color-mix(in srgb,var(--q-bad) 20%,transparent);border-color:var(--q-bad)}',
    '.vgq-dot-meta{margin-left:auto;font-size:12.5px;color:var(--q-mut);font-variant-numeric:tabular-nums}',
    /* Corpo rolável */
    '.vgq-body{flex:1 1 auto;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:18px clamp(14px,4vw,28px) 36px}',
    '.vgq-stage{max-width:780px;margin:0 auto}',
    '.vgq-tag{display:inline-flex;align-items:center;gap:6px;padding:4px 11px;border-radius:999px;font-size:12.5px;font-weight:600;background:var(--q-bg2);margin:0 0 10px}',
    '.vgq-tag.pv{background:color-mix(in srgb,var(--q-acc) 16%,transparent);color:var(--q-acc)}',
    '.vgq-warn{margin:0 0 14px;padding:10px 13px;border-radius:12px;border:1px solid color-mix(in srgb,var(--q-inc) 40%,transparent);background:color-mix(in srgb,var(--q-inc) 10%,transparent);font-size:13.5px;line-height:1.45}',
    '.vgq-enun{font-size:17px;line-height:1.68;margin:0 0 14px}',
    '.vgq-enun p{margin:0 0 10px;max-width:none}.vgq-enun p:last-child{margin:0}',
    '.vgq-enun img,.vgq-imgs img{max-width:100%;height:auto;border-radius:12px;margin:10px 0;display:block;border:1px solid var(--q-ln);cursor:zoom-in}',
    '.vgq-cmd{font-size:16.5px;font-weight:600;line-height:1.5;margin:0 0 16px;padding-top:4px}',
    /* Alternativas */
    '.vgq-alts{display:flex;flex-direction:column;gap:9px;margin:0 0 14px}',
    '.vgq-arow{display:flex;align-items:stretch;gap:7px}',
    '.vgq-alt{appearance:none;flex:1;min-width:0;display:flex;align-items:flex-start;gap:12px;padding:13px 15px;border-radius:15px;' +
      'border:1.5px solid var(--q-ln);background:var(--q-surf);color:inherit;font:400 15.5px/1.52 inherit;text-align:left;cursor:pointer;' +
      'transition:border-color .15s,background .15s,transform .12s;touch-action:manipulation}',
    '.vgq-alt:hover:not(.lock){border-color:color-mix(in srgb,var(--q-acc) 60%,var(--q-ln));background:color-mix(in srgb,var(--q-acc) 6%,var(--q-surf))}',
    '.vgq-alt:active:not(.lock){transform:scale(.992)}',
    '.vgq-alt .vgq-l{flex:none;width:28px;height:28px;border-radius:50%;border:1.5px solid var(--q-ln);display:grid;place-items:center;font-weight:700;font-size:13px;margin-top:1px}',
    '.vgq-alt .vgq-tx{flex:1;min-width:0}',
    '.vgq-alt .vgq-hint{display:none;margin-top:6px;font-size:12px;font-weight:600;color:var(--q-acc)}',
    '.vgq-alt.sel{border-color:var(--q-acc);background:color-mix(in srgb,var(--q-acc) 12%,var(--q-surf));box-shadow:0 0 0 1px var(--q-acc)}',
    '.vgq-alt.sel .vgq-l{background:var(--q-acc);border-color:var(--q-acc);color:var(--vg-on-acc,#fff)}',
    ':root[data-theme="dark"] .vgq-alt.sel .vgq-l{color:var(--vg-on-acc,#0c1012)}',
    '.vgq-ov[data-input="mouse"] .vgq-alt.sel:not(.lock) .vgq-hint{display:block}',
    '.vgq-alt.ok{border-color:var(--q-ok);background:color-mix(in srgb,var(--q-ok) 15%,var(--q-surf))}',
    '.vgq-alt.ok .vgq-l{background:var(--q-ok);border-color:var(--q-ok);color:#fff}',
    '.vgq-alt.bad{border-color:var(--q-bad);background:color-mix(in srgb,var(--q-bad) 14%,var(--q-surf))}',
    '.vgq-alt.bad .vgq-l{background:var(--q-bad);border-color:var(--q-bad);color:#fff}',
    '.vgq-alt.elim{opacity:.4}.vgq-alt.elim .vgq-tx{text-decoration:line-through;text-decoration-thickness:1.5px}',
    '.vgq-alt.lock{cursor:default}',
    '.vgq-elim{appearance:none;flex:none;width:36px;border-radius:12px;border:1px solid var(--q-ln);background:transparent;color:inherit;opacity:.45;cursor:pointer;font:600 13px/1 inherit;display:grid;place-items:center}',
    '.vgq-elim:hover{opacity:1;background:var(--q-bg2)}',
    '.vgq-elim[aria-pressed="true"]{opacity:1;border-color:var(--q-bad);color:var(--q-bad);background:color-mix(in srgb,var(--q-bad) 12%,transparent)}',
    /* Barra de confirmação (Touch sempre visível; PC dica de atalho) */
    '.vgq-confirm-bar{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px;margin:6px 0 12px}',
    '.vgq-kbd-tip{font-size:12.5px;color:var(--q-mut)}',
    '.vgq-ov[data-input="touch"] .vgq-kbd-tip{display:none}',
    '.vgq-ov[data-input="mouse"] .vgq-touch-cfm{display:none}',
    '.vgq-touch-cfm{width:100%;padding:13px 20px;border-radius:14px;border:0;font:700 15.5px/1.1 inherit;cursor:pointer;' +
      'background:color-mix(in srgb,var(--q-acc) 82%,#000);color:#fff;transition:opacity .15s,transform .12s}',
    '.vgq-touch-cfm:disabled{opacity:.38;cursor:default}',
    '.vgq-touch-cfm:active:not(:disabled){transform:scale(.98)}',
    /* Veredito e Gabarito */
    '.vgq-verd{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px;padding:12px 15px;border-radius:14px;margin:16px 0 12px;font-weight:600;font-size:15px}',
    '.vgq-verd.ok{background:color-mix(in srgb,var(--q-ok) 18%,transparent);border:1px solid color-mix(in srgb,var(--q-ok) 55%,transparent)}',
    '.vgq-verd.bad{background:color-mix(in srgb,var(--q-bad) 16%,transparent);border:1px solid color-mix(in srgb,var(--q-bad) 50%,transparent)}',
    '.vgq-com{padding:15px 17px;border-radius:16px;border:1px solid var(--q-ln);background:var(--q-surf);font-size:15px;line-height:1.62;margin:0 0 14px}',
    '.vgq-com p{margin:0 0 10px;max-width:none}.vgq-com p:last-child{margin:0}',
    '.vgq-com ul{margin:0;padding-left:18px}.vgq-com li{margin:0 0 6px}',
    '.vgq-acc{border:1px solid var(--q-ln);border-radius:14px;background:var(--q-bg);margin:0 0 10px;overflow:hidden}',
    '.vgq-acc>summary{cursor:pointer;padding:11px 15px;font-weight:600;font-size:14px;list-style:none;display:flex;align-items:center;justify-content:space-between;gap:8px}',
    '.vgq-acc>summary::-webkit-details-marker{display:none}',
    '.vgq-acc>summary::after{content:"▾";opacity:.65;transition:transform .18s}',
    '.vgq-acc[open]>summary::after{transform:rotate(180deg)}',
    '.vgq-acc-in{padding:0 15px 14px;font-size:14.5px;line-height:1.58}',
    '.vgq-acc-in .vg-cor{margin:0;border:0;padding:0;background:transparent}',
    /* Bloco de Habilidades (estilo do print!) */
    '.vgq-hab{margin:20px 0 8px;padding:18px 18px 16px;border-radius:18px;border:1px solid var(--q-ln);background:var(--q-surf);text-align:center}',
    '.vgq-hab-h{font-size:13px;font-weight:600;color:var(--q-mut);margin:0 0 16px;letter-spacing:.02em}',
    '.vgq-hab-item{margin:0 0 18px;padding-bottom:16px;border-bottom:1px solid var(--q-ln)}',
    '.vgq-hab-item:last-child{margin:0;padding-bottom:0;border-bottom:0}',
    '.vgq-hab-t{font-size:15px;line-height:1.48;margin:0 0 10px;display:inline-flex;align-items:flex-start;justify-content:center;gap:8px;max-width:62ch;text-align:center}',
    '.vgq-hab-arr{flex:none;width:20px;height:20px;border-radius:50%;border:1.5px solid var(--q-ok);color:var(--q-ok);display:inline-grid;place-items:center;font-size:11px;font-weight:700;margin-top:2px}',
    '.vgq-hab-btns{display:flex;flex-wrap:wrap;justify-content:center;gap:7px}',
    '.vgq-hb{appearance:none;border:1px solid var(--q-ln);background:var(--q-bg);color:inherit;border-radius:10px;padding:7px 14px;font:600 13.5px/1.1 inherit;cursor:pointer;transition:background .14s,border-color .14s,color .14s,transform .12s;touch-action:manipulation}',
    '.vgq-hb:hover{background:var(--q-bg2)}',
    '.vgq-hb:active{transform:scale(.96)}',
    '.vgq-hb.on-sim{background:var(--q-ok);border-color:var(--q-ok);color:#fff}',
    '.vgq-hb.on-inc{background:var(--q-inc);border-color:var(--q-inc);color:#fff}',
    '.vgq-hb.on-des{background:var(--q-des);border-color:var(--q-des);color:#fff}',
    '.vgq-hb.on-nao{background:var(--q-bad);border-color:var(--q-bad);color:#fff}',
    /* Questão Aberta + Micro-abertas */
    '.vgq-ta{display:block;width:100%;min-height:116px;padding:13px 15px;border-radius:14px;border:1.5px solid var(--q-ln);background:var(--q-surf);color:inherit;font:400 15.5px/1.55 inherit;resize:vertical}',
    '.vgq-ta:focus{outline:none;border-color:var(--q-acc)}',
    '.vgq-cc{display:flex;justify-content:space-between;align-items:center;font-size:12.5px;color:var(--q-mut);margin:6px 2px 12px;font-variant-numeric:tabular-nums}',
    '.vgq-ideal{margin:14px 0;padding:16px 18px;border-radius:16px;border:1px solid color-mix(in srgb,var(--q-acc) 40%,var(--q-ln));background:color-mix(in srgb,var(--q-acc) 7%,var(--q-surf))}',
    '.vgq-ideal h4{margin:0 0 8px;font-size:13px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--q-acc)}',
    '.vgq-ideal p{margin:0 0 8px;font-size:15.5px;line-height:1.6}.vgq-ideal p:last-child{margin:0}',
    '.vgq-chaves{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}',
    '.vgq-ch{padding:3px 9px;border-radius:999px;font-size:12px;font-weight:600;border:1px solid var(--q-ln);background:var(--q-bg)}',
    '.vgq-ch.hit{border-color:var(--q-ok);background:color-mix(in srgb,var(--q-ok) 20%,transparent);color:var(--q-ok)}',
    '.vgq-self{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:14px 0 4px}',
    '.vgq-self span{font-size:14px;font-weight:600;margin-right:4px}',
    '.vgq-sbtn{appearance:none;border:1.5px solid var(--q-ln);background:var(--q-surf);color:inherit;border-radius:999px;padding:9px 18px;font:600 14px/1.1 inherit;cursor:pointer;touch-action:manipulation}',
    '.vgq-sbtn.ok.on,.vgq-sbtn.ok:hover{border-color:var(--q-ok);background:color-mix(in srgb,var(--q-ok) 20%,transparent)}',
    '.vgq-sbtn.par.on,.vgq-sbtn.par:hover{border-color:var(--q-inc);background:color-mix(in srgb,var(--q-inc) 20%,transparent)}',
    '.vgq-sbtn.no.on,.vgq-sbtn.no:hover{border-color:var(--q-bad);background:color-mix(in srgb,var(--q-bad) 18%,transparent)}',
    /* Rodapé fixo */
    '.vgq-foot{flex:none;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:11px clamp(14px,3vw,26px) calc(11px + env(safe-area-inset-bottom,0px));' +
      'border-top:1px solid var(--q-ln);background:color-mix(in srgb,var(--q-ground) 90%,transparent);' +
      '-webkit-backdrop-filter:blur(16px) saturate(140%);backdrop-filter:blur(16px) saturate(140%)}',
    '.vgq-btn{appearance:none;border:1px solid var(--q-ln);background:var(--q-bg);color:inherit;border-radius:999px;padding:10px 18px;font:600 14px/1.1 inherit;cursor:pointer;display:inline-flex;align-items:center;gap:6px;touch-action:manipulation}',
    '.vgq-btn:hover:not(:disabled){background:var(--q-bg2)}.vgq-btn:active:not(:disabled){transform:scale(.97)}',
    '.vgq-btn:disabled{opacity:.38;cursor:default}',
    '.vgq-btn.pri{background:color-mix(in srgb,var(--q-acc) 82%,#000);border-color:transparent;color:#fff}',
    '.vgq-btn.sm{padding:7px 13px;font-size:13px}',
    '.vgq-cnt{font-size:13.5px;font-weight:600;color:var(--q-mut);font-variant-numeric:tabular-nums}',
    /* Tela de resumo + Rodada de conceitos abertos */
    '.vgq-sum{border:1px solid var(--q-ln);border-radius:20px;background:var(--q-surf);padding:24px 22px;margin:8px 0 16px}',
    '.vgq-sum h2{font-family:var(--vg-display,var(--serif,"Instrument Serif"),Georgia,serif);font-weight:400;font-size:clamp(28px,4vw,38px);line-height:1.1;margin:0 0 8px}',
    '.vgq-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px;margin:16px 0}',
    '.vgq-kpi{padding:12px 14px;border-radius:14px;border:1px solid var(--q-ln);background:var(--q-bg)}',
    '.vgq-kpi b{display:block;font-size:24px;line-height:1.1;font-variant-numeric:tabular-nums}.vgq-kpi span{font-size:12.5px;color:var(--q-mut)}',
    '.vgq-sum-box{margin:14px 0;padding:15px 16px;border-radius:15px;border:1px solid var(--q-ln);background:var(--q-bg)}',
    '.vgq-sum-box.acc{border-color:color-mix(in srgb,var(--q-acc) 45%,var(--q-ln));background:color-mix(in srgb,var(--q-acc) 10%,var(--q-bg))}',
    '.vgq-sum-box.ok{border-color:color-mix(in srgb,var(--q-ok) 55%,transparent);background:color-mix(in srgb,var(--q-ok) 12%,var(--q-bg))}',
    '.vgq-sum-acts{display:flex;flex-wrap:wrap;gap:9px;margin-top:16px}',
    /* Modal de Meme Secreto + garantir que modais nativos de meme abram acima do overlay */
    '.mmod,#mmod,.meme-modal,.mmodal{z-index:2147482100!important}' +
    '.vgq-mm{position:fixed;inset:0;z-index:2147482000;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(4,6,10,.82);opacity:0;transition:opacity .2s cubic-bezier(.23,1,.32,1)}',
    '.vgq-mm.on{opacity:1}',
    '.vgq-mm-box{max-width:min(540px,100%);max-height:92vh;overflow:auto;background:var(--surface,#15181e);color:var(--ink,#eef2f5);border-radius:20px;padding:20px;text-align:center;transform:scale(.95);transition:transform .24s cubic-bezier(.23,1,.32,1)}',
    '.vgq-mm.on .vgq-mm-box{transform:scale(1)}',
    '.vgq-mm-k{font-size:12px;opacity:.7;letter-spacing:.07em;text-transform:uppercase}',
    '.vgq-mm-box h3{margin:4px 0 12px;font-size:23px}',
    '.vgq-mm-box img{display:block;max-width:100%;max-height:60vh;margin:0 auto;border-radius:12px}',
    '.vgq-mm-trophy{font-size:64px;line-height:1;margin:12px 0}',
    '.vgq-mm-box p{margin:12px 0 16px;opacity:.85;font-size:14.5px}',
    /* Botão no Foco de Estudo + Painel Pontos Frágeis */
    '.vgq-foco-bt{appearance:none;width:100%;display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 11px;margin-top:6px;border-radius:11px;' +
      'border:1px solid color-mix(in srgb,var(--vg-acc,#5aa9ff) 36%,transparent);background:color-mix(in srgb,var(--vg-acc,#5aa9ff) 11%,transparent);color:inherit;font:600 12.5px/1.2 inherit;cursor:pointer;text-align:left}',
    '.vgq-foco-bt:hover{background:color-mix(in srgb,var(--vg-acc,#5aa9ff) 18%,transparent)}',
    '.vgq-foco-bt small{font-weight:600;opacity:.85}',
    '.vgq-pmod{position:fixed;inset:0;z-index:2147482650;display:flex;align-items:center;justify-content:center;padding:14px;background:rgba(4,6,10,.62)}',
    '.vgq-pbox{--q-acc:var(--vg-acc,var(--accent,#1b6e66));--q-ok:#238636;--q-inc:#c95e0c;--q-des:#7c5cff;--q-bad:#cf3a3a;' +
      '--q-ink:var(--ink,#eef2f5);--q-mut:var(--muted,#8f99a3);--q-ln:color-mix(in srgb,var(--q-ink) 14%,transparent);--q-bg:color-mix(in srgb,var(--q-ink) 6%,transparent);' +
      'width:min(760px,100%);max-height:88vh;overflow:auto;border-radius:22px;padding:22px 22px 24px;background:var(--surface,#15181e);color:var(--q-ink);border:1px solid var(--q-ln);' +
      'font-family:var(--vg-text,"Instrument Sans",system-ui,sans-serif)}',
    ':root[data-theme="light"] .vgq-pbox{--q-ink:#191b1c;--q-mut:#5d646b;background:#ffffff}',
    '.vgq-ph{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin:0 0 14px}',
    '.vgq-ph h2{font-family:var(--vg-display,var(--serif,"Instrument Serif"),Georgia,serif);font-weight:400;font-size:30px;line-height:1.1;margin:0}',
    '.vgq-px{appearance:none;width:36px;height:36px;border-radius:50%;border:1px solid var(--q-ln);background:var(--q-bg);color:inherit;font-size:20px;cursor:pointer;flex:none}',
    '.vgq-rxbar{display:flex;height:10px;border-radius:99px;overflow:hidden;background:var(--q-bg);margin:12px 0 8px}',
    '.vgq-rxbar i{display:block;height:100%}',
    '.vgq-flist{display:flex;flex-direction:column;gap:8px;margin-top:14px}',
    '.vgq-fitem{padding:12px 14px;border-radius:14px;border:1px solid var(--q-ln);background:var(--q-bg);display:flex;flex-direction:column;gap:5px}',
    '.vgq-fitem-top{display:flex;flex-wrap:wrap;gap:6px;align-items:center;font-size:12px}',
    '.vgq-badge{padding:2px 8px;border-radius:999px;font-weight:700;font-size:11.5px;color:#fff}',
    '.vgq-badge.nao{background:var(--q-bad)}.vgq-badge.inc{background:var(--q-inc)}.vgq-badge.des{background:var(--q-des)}.vgq-badge.sim{background:var(--q-ok)}',
    '@media(max-width:680px){.vgq-cta{padding:17px 16px}.vgq-top{padding:9px 12px}.vgq-seg-t{display:none}.vgq-tabs{margin-left:0;width:100%}.vgq-enun{font-size:16px}.vgq-alt{padding:12px 12px;font-size:15px}.vgq-hab{padding:15px 12px}}'
  ].join('');

  function estilo() {
    if (D.getElementById('vgq-css')) return;
    var s = D.createElement('style'); s.id = 'vgq-css'; s.textContent = CSS_TXT;
    (D.head || D.documentElement).appendChild(s);
  }

  /* ---------- extrator universal de questões do DOM escondido ---------- */
  function innerClean(el) { return el ? el.innerHTML.trim() : ''; }

  function parseDomQuestion(el, idx) {
    /* 1) Microbiologia / Semiologia: .q[data-qid] > .qenun, .qcmd, .qimgs, .alts > .alt, .qcom */
    if (el.matches('.q[data-qid]') && el.querySelector('.alts .alt')) {
      var qid = el.getAttribute('data-qid');
      var tagEl = el.querySelector('.qtag');
      var warnEl = el.querySelector('.qwarn');
      var enunEl = el.querySelector('.qenun');
      var imgsEl = el.querySelector('.qimgs');
      var cmdEl = el.querySelector('.qcmd');
      var altEls = Array.prototype.slice.call(el.querySelectorAll('.alts .alt'));
      var alts = altEls.map(function (b) {
        var sp = b.querySelectorAll('span');
        return sp.length > 1 ? sp[sp.length - 1].innerHTML : b.innerHTML;
      });
      return {
        id: qid || ('dom-m-' + idx),
        nativo: true,
        tag: tagEl ? stripHtml(tagEl.innerHTML).replace(/\([A-E]\)\s*$/, '').trim() : '',
        isPv: !!(tagEl && tagEl.classList.contains('pv')),
        warn: warnEl ? innerClean(warnEl) : '',
        enun: innerClean(enunEl) + (imgsEl ? '<div class="vgq-imgs">' + imgsEl.innerHTML + '</div>' : ''),
        cmd: cmdEl ? stripHtml(cmdEl.innerHTML).replace(/^Comando:\s*/i, '') : '',
        alts: alts,
        _el: el,
        _state: function () {
          var live = (el.isConnected ? el : D.querySelector('.q[data-qid="' + qid + '"]')) || el;
          var locked = live.classList.contains('locked');
          var bs = Array.prototype.slice.call(live.querySelectorAll('.alts .alt'));
          var gab = -1, pick = -1;
          bs.forEach(function (b, j) {
            if (b.classList.contains('right')) gab = j;
            if (b.classList.contains('wrong')) pick = j;
          });
          if (locked && pick < 0 && gab >= 0) {
            var qst = stripHtml((live.querySelector('.qst') || {}).textContent || '');
            pick = /revelada/i.test(qst) ? -1 : gab;
          }
          var comEl = live.querySelector('.qcom');
          var corEl = comEl && comEl.querySelector('.vg-cor');
          var comClone = comEl ? comEl.cloneNode(true) : null;
          if (comClone) { var rm = comClone.querySelector('.vg-cor'); if (rm) rm.remove(); }
          return {
            done: locked,
            pick: pick,
            gab: gab,
            ok: locked && pick >= 0 && pick === gab,
            comHtml: comClone ? comClone.innerHTML : '',
            corHtml: corEl ? corEl.outerHTML : '',
            justHtml: ''
          };
        },
        _answer: function (j) {
          var live = (el.isConnected ? el : D.querySelector('.q[data-qid="' + qid + '"]')) || el;
          var b = live.querySelectorAll('.alts .alt')[j];
          if (b) b.click();
        },
        _reset: null
      };
    }

    /* 2) Farmacologia: .q[data-a] > .qh/.src, .stem, figure, .opt[data-l], .qcheck, .qreset, .qfb */
    if (el.matches('.q[data-a]') && el.querySelector('.opt[data-l]')) {
      var fqid = el.getAttribute('data-qid') || ('farm-' + idx);
      var srcEl = el.querySelector('.qh .src');
      var stemEl = el.querySelector('.stem');
      var figEl = el.querySelector(':scope > figure');
      var opts = Array.prototype.slice.call(el.querySelectorAll('.opt[data-l]'));
      var letras = opts.map(function (o) { return o.getAttribute('data-l'); });
      var gabIdx = letras.indexOf(el.getAttribute('data-a'));
      var cmdIn = stemEl && stemEl.querySelector('.cmd');
      var stemClone = stemEl ? stemEl.cloneNode(true) : null;
      if (stemClone) { var cm = stemClone.querySelector('.cmd'); if (cm) cm.remove(); }
      return {
        id: fqid,
        nativo: true,
        tag: srcEl ? stripHtml(srcEl.innerHTML) : '',
        isPv: !!(srcEl && srcEl.querySelector('.pvb')),
        warn: '',
        enun: (stemClone ? stemClone.innerHTML : '') + (figEl ? '<div class="vgq-imgs">' + figEl.outerHTML + '</div>' : ''),
        cmd: cmdIn ? stripHtml(cmdIn.innerHTML).replace(/^Comando:\s*/i, '') : '',
        alts: opts.map(function (o) { var t = o.querySelector('.ot'); return t ? t.innerHTML : stripHtml(o.innerHTML); }),
        gab: gabIdx,
        _el: el,
        _state: function () {
          var done = el.classList.contains('done');
          var ops = Array.prototype.slice.call(el.querySelectorAll('.opt[data-l]'));
          var pick = -1;
          ops.forEach(function (o, j) {
            if (o.classList.contains('wrong') || (o.classList.contains('right') && (o.classList.contains('sel') || o.classList.contains('picked')))) pick = j;
          });
          if (done && pick < 0) {
            var w = ops.findIndex(function (o) { return o.classList.contains('wrong'); });
            pick = w >= 0 ? w : gabIdx;
          }
          var fb = el.querySelector('.qfb');
          var cor = el.querySelector('.vg-cor');
          var whys = ops.map(function (o, j) {
            var wEl = o.querySelector('.why');
            var t = wEl ? wEl.innerHTML.trim() : '';
            return t ? '<li><b>' + (letras[j] || L[j]) + ':</b> ' + t + '</li>' : '';
          }).filter(Boolean).join('');
          var comHtml = '';
          if (fb) {
            var c = fb.cloneNode(true);
            var r = c.querySelector('.res'); if (r) r.remove();
            comHtml = c.innerHTML;
          }
          if (!cor && whys) comHtml = '<ul>' + whys + '</ul>' + comHtml;
          return {
            done: done,
            pick: pick,
            gab: gabIdx,
            ok: done && pick === gabIdx,
            comHtml: comHtml,
            corHtml: cor ? cor.outerHTML : (window.VGCorrecao && done ? window.VGCorrecao.bloco({ alts: opts.map(function (o) { var t = o.querySelector('.ot'); return t ? t.innerHTML : ''; }), gab: gabIdx }, { pick: pick }) : ''),
            justHtml: ''
          };
        },
        _answer: function (j) {
          var ops = el.querySelectorAll('.opt[data-l]');
          if (ops[j]) ops[j].click();
          var chk = el.querySelector('.qcheck');
          if (chk) { chk.disabled = false; chk.click(); }
        },
        _reset: function () {
          var rst = el.querySelector('.qreset');
          if (rst) rst.click();
        }
      };
    }

    /* 3) Cadernos (Humanização, Preventiva, Imagem, Laboratorial): .pv-item ou fieldset.quiz-item */
    var fs = el.matches('fieldset.quiz-item') ? el : el.querySelector('fieldset.quiz-item');
    if (fs) {
      var qidC = fs.getAttribute('data-exam') || fs.getAttribute('data-quiz') || ('cad-' + idx);
      var chip = el.querySelector('.pv-chip');
      var trans = el.querySelector('.transcription');
      var warnC = el.querySelector('.warning');
      var labels = Array.prototype.slice.call(fs.querySelectorAll('label.option'));
      var enunHtml = '';
      if (trans) {
        Array.prototype.slice.call(trans.children).forEach(function (ch) {
          if (ch === fs || ch.matches('.warning,.pv-just,details')) return;
          enunHtml += ch.outerHTML;
        });
      } else {
        var leg = fs.querySelector('legend');
        if (leg && !/^Alternativas$/i.test(stripHtml(leg.innerHTML))) enunHtml = '<p>' + leg.innerHTML + '</p>';
        var prevP = fs.previousElementSibling;
        if (!enunHtml && prevP && prevP.matches('p,div')) enunHtml = prevP.outerHTML;
      }
      return {
        id: qidC,
        nativo: true,
        tag: chip ? stripHtml(chip.innerHTML) : '✍️ Autoral',
        isPv: !!chip,
        warn: warnC ? innerClean(warnC) : '',
        enun: enunHtml,
        cmd: '',
        alts: labels.map(function (lb) {
          var ot = lb.querySelector('.ot');
          if (ot) return ot.innerHTML;
          var c = lb.cloneNode(true);
          c.querySelectorAll('input,.L').forEach(function (x) { x.remove(); });
          return c.innerHTML.trim();
        }),
        _el: el,
        _state: function () {
          var liveFs = (fs.isConnected ? fs : D.querySelector('fieldset.quiz-item[data-exam="' + qidC + '"],fieldset.quiz-item[data-quiz="' + qidC + '"]')) || fs;
          var host = liveFs.closest('.pv-item,.transcription') || liveFs.parentElement;
          var lbs = Array.prototype.slice.call(liveFs.querySelectorAll('label.option'));
          var fb = liveFs.querySelector('.feedback');
          var done = !!(fb && !fb.hidden && stripHtml(fb.innerHTML)) || lbs.some(function (l) { return l.classList.contains('right') || l.classList.contains('wrong'); });
          var pick = -1, gab = -1;
          lbs.forEach(function (l, j) {
            var inp = l.querySelector('input');
            if (inp && inp.checked) pick = j;
            if (l.classList.contains('right')) gab = j;
          });
          if (done && gab < 0 && fb) {
            var m = /Gabarito[^:]*:\s*([A-E])\b/i.exec(stripHtml(fb.innerHTML));
            if (m) gab = L.indexOf(m[1].toUpperCase());
            else if (/acertou|corret/i.test(stripHtml(fb.innerHTML))) gab = pick;
          }
          var justEl = host && host.querySelector('.pv-just');
          var justClone = justEl ? justEl.cloneNode(true) : null;
          if (justClone) { var sm = justClone.querySelector('summary'); if (sm) sm.remove(); }
          var corEl = host && host.querySelector('.vg-cor');
          return {
            done: done,
            pick: pick,
            gab: gab,
            ok: done && pick >= 0 && (pick === gab || (gab < 0 && /acertou|corret/i.test(stripHtml(fb ? fb.innerHTML : '')))),
            comHtml: fb ? '<p>' + fb.innerHTML + '</p>' : '',
            corHtml: corEl ? corEl.outerHTML : (done && gab >= 0 && window.VGCorrecao ? window.VGCorrecao.bloco({
              alts: lbs.map(function (lb) { var ot = lb.querySelector('.ot'); return ot ? ot.innerHTML : stripHtml(lb.innerHTML); }),
              gab: gab
            }, { pick: pick }) : ''),
            justHtml: justClone ? justClone.innerHTML : ''
          };
        },
        _answer: function (j) {
          var liveFs = (fs.isConnected ? fs : D.querySelector('fieldset.quiz-item[data-exam="' + qidC + '"],fieldset.quiz-item[data-quiz="' + qidC + '"]')) || fs;
          var lbs = liveFs.querySelectorAll('label.option');
          if (lbs[j]) {
            var inp = lbs[j].querySelector('input');
            if (inp) { inp.checked = true; inp.dispatchEvent(new Event('change', { bubbles: true })); }
            lbs[j].click();
          }
          var chk = liveFs.querySelector('[data-exam-check],[data-quiz-check],button:not([data-exam-reset]):not([data-quiz-reset])');
          if (chk) chk.click();
        },
        _reset: function () {
          var liveFs = (fs.isConnected ? fs : D.querySelector('fieldset.quiz-item[data-exam="' + qidC + '"],fieldset.quiz-item[data-quiz="' + qidC + '"]')) || fs;
          var rst = liveFs.querySelector('[data-exam-reset],[data-quiz-reset]');
          if (rst) rst.click();
        }
      };
    }

    /* 4) Patologia aula1 / HTML estático: article.q[data-correct] > .q-head, .opts > .opt, .btn-reveal, .q-why */
    if (el.matches('article.q[data-correct], .q[data-correct]')) {
      var pqid = el.getAttribute('data-qid') || ('p1-' + idx);
      var psrc = el.querySelector('.q-source');
      var pstem = el.querySelector('.q-stem');
      var popts = Array.prototype.slice.call(el.querySelectorAll('.opts .opt'));
      var plet = popts.map(function (o) { return o.getAttribute('data-letter') || ''; });
      var pgab = plet.indexOf(el.getAttribute('data-correct'));
      return {
        id: pqid,
        nativo: true,
        tag: psrc ? stripHtml(psrc.innerHTML) : '✍️ Autoral',
        isPv: !!(psrc && psrc.classList.contains('real')),
        warn: '',
        enun: innerClean(pstem),
        cmd: '',
        alts: popts.map(function (o) { var t = o.querySelector('.opt-text'); return t ? t.innerHTML : stripHtml(o.innerHTML); }),
        gab: pgab,
        _el: el,
        _state: function () {
          var ops = Array.prototype.slice.call(el.querySelectorAll('.opts .opt'));
          var why = el.querySelector('.q-why');
          var done = !!(why && !why.hidden) || ops.some(function (o) { return o.classList.contains('is-correct') || o.classList.contains('is-wrong'); });
          var pick = -1;
          ops.forEach(function (o, j) { if (o.getAttribute('aria-pressed') === 'true' || o.classList.contains('is-wrong')) pick = j; });
          if (done && pick < 0 && ops.some(function (o) { return o.classList.contains('is-correct') && o.getAttribute('aria-pressed') === 'true'; })) pick = pgab;
          var cor = el.querySelector('.vg-cor');
          var wc = why ? why.cloneNode(true) : null;
          if (wc) wc.querySelectorAll('.q-verdict,.vg-cor,hr').forEach(function (x) { x.remove(); });
          return {
            done: done,
            pick: pick,
            gab: pgab,
            ok: done && pick === pgab,
            comHtml: wc ? wc.innerHTML : '',
            corHtml: cor ? cor.outerHTML : (done && window.VGCorrecao ? window.VGCorrecao.bloco({
              alts: ops.map(function (o) { var t = o.querySelector('.opt-text'); return t ? t.innerHTML : ''; }),
              gab: pgab
            }, { pick: pick }) : ''),
            justHtml: ''
          };
        },
        _answer: function (j) {
          var ops = el.querySelectorAll('.opts .opt');
          if (ops[j]) ops[j].click();
          var rev = el.querySelector('.btn-reveal');
          if (rev) rev.click();
        },
        _reset: null
      };
    }

    /* 5) Patologia aula2+ (JSON): .qcard > .q-source, .qvignette, .qoptions > .qoption, .qfeedback */
    if (el.matches('.qcard') && el.querySelector('.qoption')) {
      var qcid = el.id || ('p2-' + idx);
      var csrc = el.querySelector('.q-source');
      var cvig = el.querySelector('.qvignette');
      var cfig = el.querySelector('figure, .qimg');
      var copts = Array.prototype.slice.call(el.querySelectorAll('.qoption'));
      return {
        id: qcid,
        nativo: true,
        tag: csrc ? stripHtml(csrc.innerHTML) : '✍️ Autoral',
        isPv: !!(csrc && csrc.classList.contains('real')),
        warn: '',
        enun: (cfig ? '<div class="vgq-imgs">' + cfig.outerHTML + '</div>' : '') + (cvig ? '<p>' + cvig.innerHTML + '</p>' : ''),
        cmd: '',
        alts: copts.map(function (o) {
          var c = o.cloneNode(true);
          c.querySelectorAll('.qopt-letter,.opt-letter,.L').forEach(function (x) { x.remove(); });
          return c.innerHTML.trim().replace(/^[A-E]\)\s*/i, '');
        }),
        _el: el,
        _state: function () {
          var ops = Array.prototype.slice.call(el.querySelectorAll('.qoption'));
          var fb = el.querySelector('.qfeedback');
          var done = !!(fb && fb.classList.contains('show')) || ops.some(function (o) { return o.disabled; });
          var pick = -1, gab = -1;
          ops.forEach(function (o, j) {
            if (o.classList.contains('reveal-correct') || o.classList.contains('selected-correct')) gab = j;
            if (o.classList.contains('selected-correct') || o.classList.contains('selected-incorrect')) pick = j;
          });
          var cor = el.querySelector('.vg-cor');
          var fbc = fb ? fb.cloneNode(true) : null;
          if (fbc) fbc.querySelectorAll('.fb-title,.vg-cor').forEach(function (x) { x.remove(); });
          return {
            done: done,
            pick: pick,
            gab: gab,
            ok: done && pick >= 0 && pick === gab,
            comHtml: fbc ? fbc.innerHTML : '',
            corHtml: cor ? cor.outerHTML : (done && gab >= 0 && window.VGCorrecao ? window.VGCorrecao.bloco({
              alts: ops.map(function (o) { return stripHtml(o.innerHTML).replace(/^[A-E]\)\s*/i, ''); }),
              gab: gab
            }, { pick: pick }) : ''),
            justHtml: ''
          };
        },
        _answer: function (j) {
          var ops = el.querySelectorAll('.qoption');
          if (ops[j]) ops[j].click();
        },
        _reset: null
      };
    }

    /* 6) Português: .q[data-id] > .tag, .qt, button.alt[data-i], .exp */
    if (el.matches('.q[data-id]') && el.querySelector('button.alt[data-i]')) {
      var lpid = el.getAttribute('data-id');
      var ltag = el.querySelector('.tag');
      var lqt = el.querySelector('.qt');
      var lalts = Array.prototype.slice.call(el.querySelectorAll('button.alt[data-i]'));
      return {
        id: lpid,
        nativo: true,
        tag: ltag ? stripHtml(ltag.innerHTML) : '✍️ Autoral',
        isPv: !!(ltag && ltag.classList.contains('p')),
        warn: '',
        enun: lqt ? '<p>' + lqt.innerHTML + '</p>' : '',
        cmd: '',
        alts: lalts.map(function (b) { var sp = b.querySelector('span'); return sp ? sp.innerHTML : stripHtml(b.innerHTML); }),
        _el: el,
        _state: function () {
          var live = (el.isConnected ? el : D.querySelector('.q[data-id="' + lpid + '"]')) || el;
          var ops = Array.prototype.slice.call(live.querySelectorAll('button.alt[data-i]'));
          var done = ops.some(function (o) { return o.classList.contains('lock'); });
          var pick = -1, gab = -1;
          ops.forEach(function (o, j) {
            if (o.classList.contains('ok')) gab = j;
            if (o.classList.contains('bad')) pick = j;
          });
          if (done && pick < 0 && gab >= 0) pick = gab;
          var exp = live.querySelector('.exp');
          var cor = live.querySelector('.vg-cor');
          return {
            done: done,
            pick: pick,
            gab: gab,
            ok: done && pick >= 0 && pick === gab,
            comHtml: exp ? '<p>' + exp.innerHTML + '</p>' : '',
            corHtml: cor ? cor.outerHTML : '',
            justHtml: ''
          };
        },
        _answer: function (j) {
          var live = (el.isConnected ? el : D.querySelector('.q[data-id="' + lpid + '"]')) || el;
          var b = live.querySelectorAll('button.alt[data-i]')[j];
          if (b) b.click();
        },
        _reset: function () {
          var live = (el.isConnected ? el : D.querySelector('.q[data-id="' + lpid + '"]')) || el;
          var r = live.querySelector('[data-reset]');
          if (r) r.click();
        }
      };
    }
    return null;
  }

  /* Converte questão do JSON externo (_tema/questoes/<K>.json) no mesmo contrato */
  function wrapExternalQ(raw, nivel) {
    var rot = { f: '✍️ Fácil', m: '✍️ Médio', d: '✍️ Difícil', pv: '📝 Das provas' }[nivel] || '✍️ Autoral';
    var qid = raw.id || (K + ':' + nivel + ':' + hashAlts(raw.alts));
    var imgsHtml = (raw.imgs && raw.imgs.length) ? '<div class="vgq-imgs">' + raw.imgs.map(function (src) {
      return '<img src="' + esc(src) + '" alt="Imagem da questão" loading="lazy" decoding="async">';
    }).join('') + '</div>' : '';
    return {
      id: qid,
      nativo: false,
      externo: true,
      tag: raw.tag || rot,
      isPv: nivel === 'pv',
      warn: raw.warn || '',
      enun: (raw.enun || '') + imgsHtml,
      cmd: raw.cmd || '',
      alts: raw.alts || [],
      gab: raw.gab,
      com: raw.com,
      porque: raw.porque,
      trecho: raw.trecho,
      ref: raw.ref || '',
      hab: raw.hab || null,
      _state: function () {
        var a = ST.ans[qid];
        var done = !!(a && a.p != null);
        var pick = done ? a.p : -1;
        var comHtml = '';
        if (done) {
          if (Array.isArray(raw.com)) {
            comHtml = '<p><b>' + L[raw.gab] + ' (correta):</b> ' + (raw.com[raw.gab] || '') + '</p>';
          } else if (raw.com) {
            comHtml = '<p>' + raw.com + '</p>';
          }
          if (raw.ref) comHtml += '<p style="opacity:.78;font-size:13.5px">📚 ' + esc(raw.ref) + '</p>';
        }
        var corHtml = (done && window.VGCorrecao) ? window.VGCorrecao.bloco({
          alts: raw.alts, gab: raw.gab, porque: raw.porque, trecho: raw.trecho, com: raw.com
        }, { pick: pick }) : '';
        return {
          done: done,
          pick: pick,
          gab: raw.gab,
          ok: done && pick === raw.gab,
          comHtml: comHtml,
          corHtml: corHtml,
          justHtml: raw.just || ''
        };
      },
      _answer: function (j) {
        if (ST.ans[qid]) return;
        ST.ans[qid] = { p: j, ok: j === raw.gab };
        salvaV();
        if (j === raw.gab && typeof window.addXp === 'function') {
          try { window.addXp(5, 'vgq:' + qid); } catch (e) { }
        }
      },
      _reset: function () {
        delete ST.ans[qid];
        salvaV();
      }
    };
  }

  function wrapOpenQ(raw, segId) {
    if (!raw) return null;
    var qid = raw.id || (K + ':' + segId + ':aberta');
    return {
      id: qid,
      aberta: true,
      tag: raw.tag || '✍️ Questão aberta · dissertativa',
      enun: raw.enun || raw.p || '',
      resp: raw.resp || raw.r || '',
      chaves: Array.isArray(raw.chaves) ? raw.chaves : [],
      lim: raw.lim || 500,
      ref: raw.ref || '',
      hab: raw.hab || null
    };
  }

  /* ---------- adaptadores de segmento por família de master ---------- */
  function extSeg(segId) {
    if (!EXT_Q || !EXT_Q.segs) return null;
    return EXT_Q.segs[segId] || EXT_Q.segs[String(segId).toLowerCase()] || null;
  }

  function mergeDedupe(listA, listB) {
    var out = [], seen = {};
    function add(q) {
      if (!q) return;
      var k = (q.alts && q.alts.length) ? hashAlts(q.alts) : (q.id || hashStem(q.enun));
      if (k && seen[k]) return;
      if (k) seen[k] = 1;
      out.push(q);
    }
    (listA || []).forEach(add);
    (listB || []).forEach(add);
    return out;
  }

  /* Cache de contagens reais observadas por aba nativa (ex.: Micro re-cria #vb ao trocar de nível) */
  var NATIVE_CNT = {};

  /* Coleta todos os conjuntos disponíveis de um segmento (nativos + JSON externo) */
  function coletarConjuntos(ctx) {
    var sets = { pv: [], f: [], m: [], d: [], aut: [], a: null, semProvaAviso: '', _inactiveNative: {} };
    var es = extSeg(ctx.segId);

    if (ctx.tipo === 'micro') {
      var vb = (ctx.root && ctx.root.isConnected) ? ctx.root : (D.querySelector('#view .page > section.vblock#vb') || ctx.root);
      if (vb) {
        ctx.root = vb;
        ctx.hideEls = [vb];
        ctx.insertBefore = vb;
        if (!vb.classList.contains('vgq-orig-hide')) vb.classList.add('vgq-orig-hide');
      }
      var activeBtn = vb && vb.querySelector('.seg button.on[data-act="lvl"]');
      var curLv = activeBtn ? activeBtn.getAttribute('data-l') : 'v';
      var domQs = vb ? Array.prototype.slice.call(vb.querySelectorAll(':scope > .q[data-qid]')).map(parseDomQuestion).filter(Boolean) : [];
      var hasPvEmpty = !!(vb && vb.querySelector('.pvempty'));
      if (hasPvEmpty) sets.semProvaAviso = 'Esta seção não foi cobrada diretamente nas provas do acervo.';
      /* mapeia níveis nativos declarados pelos botões .seg */
      var navBtns = vb ? Array.prototype.slice.call(vb.querySelectorAll('.seg button[data-act="lvl"]')) : [];
      var mapKey = function (l) { return l === 'v' ? 'pv' : l === 'p' ? (K === 'semio' ? 'aut' : 'm') : l; };
      sets._nativeBtns = {};
      navBtns.forEach(function (b) {
        var l = b.getAttribute('data-l');
        var k = mapKey(l);
        sets._nativeBtns[k] = b;
        var ck = ctx.segId + ':' + k;
        if (l === curLv) {
          sets[k] = domQs;
          NATIVE_CNT[ck] = domQs.length;
        } else {
          sets._inactiveNative[k] = true;
          var m = /\((\d+)\)/.exec(b.textContent || '');
          var est = m ? +m[1] : (NATIVE_CNT[ck] != null ? NATIVE_CNT[ck] : (l === 'v' && hasPvEmpty ? 0 : 3));
          sets['_cnt_' + k] = est;
        }
      });
      if (sets._nativeBtns.pv && curLv === 'v' && !domQs.length) sets.semProvaAviso = sets.semProvaAviso || 'Esta seção não foi cobrada diretamente nas provas do acervo.';
    } else if (ctx.tipo === 'farmaco') {
      var qsec = ctx.root;
      var qsets = Array.prototype.slice.call(qsec.querySelectorAll('.qset'));
      if (qsets.length) {
        qsets.forEach(function (qs) {
          var lv = qs.getAttribute('data-lvl') || 'p';
          var k = lv === 'pv' ? 'pv' : lv === 'p' ? 'm' : lv;
          var list = Array.prototype.slice.call(qs.querySelectorAll('.q[data-a]')).map(parseDomQuestion).filter(Boolean);
          if (sets[k]) sets[k] = sets[k].concat(list);
        });
      } else {
        sets.aut = Array.prototype.slice.call(qsec.querySelectorAll('.q[data-a]')).map(parseDomQuestion).filter(Boolean);
      }
      if (!sets.pv.length) sets.semProvaAviso = 'Esta seção não foi cobrada diretamente nas provas do acervo.';
    } else if (ctx.tipo === 'caderno') {
      var sec = ctx.root;
      var pvBox = sec.querySelector(':scope > .pv-box');
      var pvNone = sec.querySelector(':scope > .pvnone');
      var pvAut = sec.querySelector(':scope > .pv-aut');
      var quizSolto = sec.querySelector(':scope > .quiz, :scope > .quizlist');
      if (pvNone) sets.semProvaAviso = 'Este tema nunca caiu nas provas do acervo.';
      if (pvBox) {
        sets.pv = Array.prototype.slice.call(pvBox.querySelectorAll(':scope > .pv-item')).map(parseDomQuestion).filter(Boolean);
      }
      var autHost = pvAut || quizSolto;
      if (autHost) {
        sets.aut = Array.prototype.slice.call(autHost.querySelectorAll('fieldset.quiz-item')).map(parseDomQuestion).filter(Boolean);
      }
    } else if (ctx.tipo === 'pato') {
      var qz = ctx.root;
      var pb = qz.querySelector('.pv-box');
      if (qz.querySelector('.pv-none')) sets.semProvaAviso = 'Este tema nunca caiu nas provas do acervo.';
      if (pb) {
        sets.pv = Array.prototype.slice.call(pb.querySelectorAll('article.q[data-correct], .q[data-correct], .qcard')).map(parseDomQuestion).filter(Boolean);
      }
      var auts = Array.prototype.slice.call(qz.querySelectorAll('article.q[data-correct], .q[data-correct], .qcard')).filter(function (x) {
        return !x.closest('.pv-box') && !x.classList.contains('pv-som');
      });
      sets.aut = auts.map(parseDomQuestion).filter(Boolean);
    } else if (ctx.tipo === 'port') {
      var qsP = ctx.root;
      var domP = Array.prototype.slice.call(qsP.querySelectorAll('.qw .q[data-id]')).map(parseDomQuestion).filter(Boolean);
      var lvs = Array.prototype.slice.call(qsP.querySelectorAll('.lvs button'));
      if (lvs.length) {
        sets._nativeBtns = {};
        lvs.forEach(function (b) {
          var t = normTxt(b.textContent);
          var k = /prova/.test(t) ? 'pv' : /facil/.test(t) ? 'f' : /dific/.test(t) ? 'd' : 'm';
          sets._nativeBtns[k] = b;
          if (b.classList.contains('on') || b.getAttribute('aria-pressed') === 'true') sets[k] = domP;
          else sets['_cnt_' + k] = 3;
        });
      } else {
        sets.aut = domP;
      }
    }

    /* Mescla com _tema/questoes/<K>.json (3 Fáceis, 5 Médias, 3 Difíceis, 1 Aberta) */
    if (es) {
      ['pv', 'f', 'm', 'd'].forEach(function (k) {
        if (Array.isArray(es[k]) && es[k].length) {
          var extList = es[k].map(function (q) { return wrapExternalQ(q, k); });
          sets[k] = mergeDedupe(sets[k], extList);
          if (sets._inactiveNative && sets._inactiveNative[k]) {
            sets['_cnt_' + k] = (sets['_cnt_' + k] || 0) + extList.length;
          }
        }
      });
      if (es.a) sets.a = wrapOpenQ(es.a, ctx.segId);
      /* Quando o segmento já tem os 3 níveis padronizados (Fácil / Médio / Difícil), remove a aba genérica "Autorais" antiga */
      if (sets.f.length && sets.m.length && sets.d.length) {
        sets.aut = [];
        delete sets._cnt_aut;
        if (sets._inactiveNative) delete sets._inactiveNative.aut;
      }
    }
    return sets;
  }

  /* Descobre os blocos de verificação na página atual */
  function descobrirSegmentos() {
    var out = [];
    /* 1) Microbiologia / Semiologia */
    if (K === 'micro' || K === 'semio') {
      var vb = D.querySelector('#view .page > section.vblock#vb');
      if (vb) {
        var h1 = D.querySelector('#view .page h1.pt');
        var segId = location.hash.replace(/^#/, '') || 'seg';
        out.push({ tipo: 'micro', segId: segId, titulo: stripHtml(h1 ? h1.textContent : 'Segmento'), root: vb, hideEls: [vb], insertBefore: vb });
      }
      return out;
    }
    /* 2) Farmacologia */
    if (K === 'farmaco') {
      D.querySelectorAll('.pane .qsec').forEach(function (qsec) {
        var pane = qsec.closest('.pane');
        if (!pane || /sim|quiz|rev|arena/i.test(pane.id || '')) return;
        var h1 = pane.querySelector('h1');
        var segId = (pane.id || '').replace(/^pane-/, '') || 'seg';
        out.push({ tipo: 'farmaco', segId: segId, titulo: stripHtml(h1 ? h1.textContent : 'Segmento'), root: qsec, hideEls: [qsec], insertBefore: qsec });
      });
      return out;
    }
    /* 3) Cadernos (Humanização, Preventiva, Imagem, Laboratorial) */
    if (K === 'huma' || K === 'prev' || K === 'img' || K === 'lab') {
      D.querySelectorAll('main section.section[id]').forEach(function (sec) {
        var sid = sec.id || '';
        if (!sid || /-(revisao|arena)$/.test(sid)) return;
        var eb = sec.querySelector(':scope > .eyebrow');
        if (!eb || !(/Segmento|›/.test(eb.textContent || ''))) return;
        var h2 = sec.querySelector(':scope > h2');
        var hide = Array.prototype.slice.call(sec.querySelectorAll(':scope > .pv-box, :scope > .pvnone, :scope > .pv-aut, :scope > .quiz, :scope > .quizlist'));
        if (!hide.length && !extSeg(sid)) return;
        var anchor = hide[0] || sec.querySelector(':scope > .cel-fin') || null;
        out.push({ tipo: 'caderno', segId: sid, titulo: stripHtml(h2 ? h2.textContent : sid), root: sec, hideEls: hide, insertBefore: anchor });
      });
      return out;
    }
    /* 4) Patologia (aulas teóricas em iframe) */
    if (K === 'pato' && html.classList.contains('vidro-aula')) {
      var aulaStem = (location.pathname.split('/').pop() || '').replace(/\.html$/i, '');
      D.querySelectorAll('section.pane[id^="seg"]').forEach(function (pane) {
        var qz = pane.querySelector('.qzone, .qsection');
        if (!qz) return;
        var h1 = pane.querySelector('h1, h2.seg-title');
        var segId = aulaStem + '/' + pane.id;
        out.push({ tipo: 'pato', segId: segId, titulo: stripHtml(h1 ? h1.textContent : pane.id), root: qz, hideEls: [qz], insertBefore: qz });
      });
      return out;
    }
    /* 5) Português */
    if (K === 'port') {
      D.querySelectorAll('.qs[data-k]').forEach(function (qs) {
        var k = qs.getAttribute('data-k');
        var qh = qs.querySelector(':scope > .qh');
        var hide = Array.prototype.slice.call(qs.querySelectorAll(':scope > .qh, :scope > .lvs, :scope > .qw, :scope > .mw'));
        if (!hide.length) return;
        var done = qs.querySelector(':scope > .done');
        out.push({
          tipo: 'port', segId: k,
          titulo: stripHtml(qh ? qh.textContent : k).replace(/^Verificação\s*·\s*/i, ''),
          root: qs, hideEls: hide, insertBefore: done || hide[0]
        });
      });
      return out;
    }
    return out;
  }

  /* ---------- renderização do cartão "Verificar aprendizado" no fim do segmento ---------- */
  var CTXS = new WeakMap();
  var NIVEL_INFO = [
    ['pv', '📝 Das provas'],
    ['f', '🟢 Fácil'],
    ['m', '🟡 Médio'],
    ['d', '🔴 Difícil'],
    ['aut', '✍️ Autorais'],
    ['a', '✍️ Aberta']
  ];

  function montarCta(ctx) {
    estilo();
    var sets = coletarConjuntos(ctx);
    var totalQ = 0, totalResp = 0, totalOk = 0;
    var pills = [];
    NIVEL_INFO.forEach(function (pair) {
      var key = pair[0], label = pair[1];
      if (key === 'a') {
        if (!sets.a) return;
        totalQ += 1;
        var oa = ST.open[sets.a.id];
        if (oa && oa.ev) { totalResp += 1; if (oa.ev === 'ok') totalOk += 1; }
        pills.push('<span class="vgq-pill' + (oa && oa.ev === 'ok' ? ' ok' : '') + '">' + label + (oa && oa.ev === 'ok' ? ' ✓' : ' · 1') + '</span>');
        return;
      }
      var list = sets[key] || [];
      var cnt = (sets._inactiveNative && sets._inactiveNative[key]) ? (sets['_cnt_' + key] || list.length) : (list.length || sets['_cnt_' + key] || 0);
      if (!cnt) return;
      totalQ += cnt;
      var resp = 0, ok = 0;
      list.forEach(function (q) { var s = q._state(); if (s.done) { resp++; if (s.ok) ok++; } });
      totalResp += resp; totalOk += ok;
      var cls = (list.length && ok === list.length) ? ' ok' : '';
      pills.push('<span class="vgq-pill' + cls + '">' + label + ' · ' + (resp ? ok + '/' + cnt : cnt) + '</span>');
    });

    if (!totalQ && !sets.semProvaAviso) return;

    /* Esconde os blocos originais de forma idempotente */
    ctx.hideEls.forEach(function (el) {
      if (!el.classList.contains('vgq-orig-hide')) el.classList.add('vgq-orig-hide');
    });

    var pai = ctx.insertBefore ? ctx.insertBefore.parentElement : ctx.root;
    if (!pai) return;
    var segEsc = (window.CSS && window.CSS.escape) ? window.CSS.escape(ctx.segId) : String(ctx.segId).replace(/["\\]/g, '\\$&');
    var cta = pai.querySelector(':scope > .vgq-cta[data-seg="' + segEsc + '"]');
    var memeOk = temMemeLiberado(ctx.segId);
    var frag = contarFrageisSegmento(ctx.segId);
    var sub = sets.semProvaAviso
      ? sets.semProvaAviso + ' Teste seu domínio questão por questão.'
      : (totalResp ? (totalResp + ' de ' + totalQ + ' respondidas · ' + totalOk + ' certas') : 'Questões focadas uma por vez, com diagnóstico de habilidades e reforço aberto.');
    var btnTxt = totalResp && totalResp < totalQ ? 'Continuar verificação →' : (totalResp >= totalQ && totalQ > 0 ? 'Revisar questões →' : 'Verificar aprendizado →');

    var sig = ctx.segId + '|' + pills.join('') + '|' + sub + '|' + btnTxt + '|' + memeOk + '|' + frag;
    if (!cta) {
      cta = D.createElement('section');
      cta.className = 'vgq-cta';
      cta.setAttribute('data-seg', ctx.segId);
      if (ctx.insertBefore) pai.insertBefore(cta, ctx.insertBefore);
      else pai.appendChild(cta);
    }
    CTXS.set(cta, ctx);
    if (cta.dataset.vgqSig === sig) return;
    cta.dataset.vgqSig = sig;

    cta.innerHTML =
      '<div class="vgq-cta-info">' +
        '<div class="vgq-cta-k">Verificação do segmento</div>' +
        '<h3>Verificar aprendizado</h3>' +
        '<p class="vgq-cta-sub">' + esc(sub) + '</p>' +
        '<div class="vgq-cta-pills">' + pills.join('') +
          (memeOk ? '<span class="vgq-pill ok">🏆 Meme liberado</span>' : '') +
          (frag ? '<span class="vgq-pill warn">🎯 ' + frag + ' ' + (frag > 1 ? 'pontos frágeis' : 'ponto frágil') + '</span>' : '') +
        '</div>' +
      '</div>' +
      '<div class="vgq-cta-acts">' +
        '<button type="button" class="vgq-go" data-vgq-open="1">' + btnTxt + '</button>' +
      '</div>';
  }

  function contarFrageisSegmento(segId) {
    var n = 0;
    Object.keys(HAB.m).forEach(function (k) {
      var it = HAB.m[k];
      if (it && it.seg === segId && !it.rec && (it.st === 'nao' || it.st === 'inc')) n++;
    });
    return n;
  }

  /* ---------- OVERLAY FULLSCREEN (1 questão por vez) ---------- */
  var OV = null;
  var OV_CTX = null;
  var OV_SETS = null;
  var OV_TAB = 'pv';
  var OV_IDX = 0;
  var OV_SEL = null;        // alternativa selecionada ainda não confirmada (anti-missclick!)
  var OV_ELIM = {};         // { qid: { j: true } }
  var OV_VIEW = 'q';        // 'q' | 'resumo' | 'conceitos'
  var OV_CONCS = [];        // fila de micro-questões abertas na sessão atual
  var OV_CIDX = 0;
  var OV_CREV = false;
  var OV_CDRAFT = '';
  var OV_PREV_OVERFLOW = '';

  function tabsDisponiveis(sets) {
    var out = [];
    NIVEL_INFO.forEach(function (pair) {
      var key = pair[0], label = pair[1];
      if (key === 'a') { if (sets.a) out.push({ k: 'a', label: label, n: 1 }); return; }
      var n = (sets._inactiveNative && sets._inactiveNative[key]) ? (sets['_cnt_' + key] || (sets[key] && sets[key].length) || 0) : ((sets[key] && sets[key].length) || sets['_cnt_' + key] || 0);
      if (n > 0) out.push({ k: key, label: label, n: n });
    });
    return out;
  }

  function abrirOverlay(ctx, abaInicial) {
    estilo();
    OV_CTX = ctx;
    OV_SETS = coletarConjuntos(ctx);
    var tabs = tabsDisponiveis(OV_SETS);
    if (!tabs.length) return;
    OV_TAB = abaInicial && tabs.some(function (t) { return t.k === abaInicial; }) ? abaInicial : tabs[0].k;
    OV_IDX = 0;
    OV_SEL = null;
    OV_VIEW = 'q';

    /* Se a aba inicial é um botão nativo não ativo (ex.: Micro/Semio), ativa */
    ativarAbaNativaSePreciso(OV_TAB, function () {
      montarOverlayDom();
      renderOverlay();
    });
  }

  function ativarAbaNativaSePreciso(tabKey, cb) {
    /* Re-coleta antes de clicar para garantir referência viva ao DOM (ex.: Micro recria #vb) */
    if (OV_CTX) OV_SETS = coletarConjuntos(OV_CTX);
    if (OV_SETS && OV_SETS._nativeBtns && OV_SETS._nativeBtns[tabKey]) {
      var btn = OV_SETS._nativeBtns[tabKey];
      var jaAtivo = btn.classList.contains('on') || btn.getAttribute('aria-pressed') === 'true';
      if (!jaAtivo) {
        btn.click();
        setTimeout(function () {
          OV_SETS = coletarConjuntos(OV_CTX);
          cb();
        }, 60);
        return;
      }
    }
    cb();
  }

  function montarOverlayDom() {
    if (OV) return;
    OV_PREV_OVERFLOW = D.body.style.overflow;
    D.body.style.overflow = 'hidden';
    OV = D.createElement('div');
    OV.className = 'vgq-ov';
    OV.dataset.input = inputMode;
    OV.setAttribute('role', 'dialog');
    OV.setAttribute('aria-modal', 'true');
    OV.setAttribute('aria-label', 'Verificar aprendizado');
    OV.addEventListener('click', onOverlayClick);
    OV.addEventListener('contextmenu', onOverlayContext);
    OV.addEventListener('input', onOverlayInput);
    D.body.appendChild(OV);
    D.addEventListener('keydown', onOverlayKey, true);
    requestAnimationFrame(function () { if (OV) OV.classList.add('on'); });
  }

  function fecharOverlay() {
    if (!OV) return;
    var el = OV; OV = null;
    D.removeEventListener('keydown', onOverlayKey, true);
    D.body.style.overflow = OV_PREV_OVERFLOW || '';
    el.classList.remove('on');
    setTimeout(function () { el.remove(); }, RM ? 0 : 220);
    OV_CTX = null; OV_SETS = null; OV_SEL = null;
    varrer();
  }

  function listaAtual() {
    if (!OV_SETS) return [];
    if (OV_TAB === 'a') return OV_SETS.a ? [OV_SETS.a] : [];
    return OV_SETS[OV_TAB] || [];
  }

  function checarMemeSegmento(soSeNovo) {
    if (!OV_SETS || !OV_CTX) return false;
    var temAberta = !!OV_SETS.a;
    var abertaOk = !temAberta || (ST.open[OV_SETS.a.id] && ST.open[OV_SETS.a.id].ev === 'ok');
    /* Checa se algum nível objetivo carregado está 100% gabaritado */
    var niveis = ['pv', 'f', 'm', 'd', 'aut'];
    var gabaritou = null;
    for (var i = 0; i < niveis.length; i++) {
      var list = OV_SETS[niveis[i]] || [];
      if (!list.length) continue;
      var okCount = 0;
      list.forEach(function (q) { if (q._state().ok) okCount++; });
      if (okCount === list.length) { gabaritou = { k: niveis[i], n: list.length + (temAberta ? 1 : 0) }; break; }
    }
    if (gabaritou && abertaOk) {
      if (!soSeNovo || !temMemeLiberado(OV_CTX.segId)) {
        setTimeout(function () { abrirModalMeme(OV_CTX.segId, gabaritou.n, false); }, 450);
      }
      return true;
    }
    return false;
  }

  /* ---------- renderização principal do Overlay ---------- */
  function renderOverlay() {
    if (!OV || !OV_SETS) return;
    OV.dataset.input = inputMode;
    var tabs = tabsDisponiveis(OV_SETS);
    var topHtml =
      '<div class="vgq-top">' +
        '<button type="button" class="vgq-back" data-act="close">← Voltar ao texto</button>' +
        '<span class="vgq-seg-t" title="' + esc(OV_CTX.titulo) + '">' + esc(OV_CTX.titulo) + '</span>' +
        '<div class="vgq-tabs" role="tablist">' +
          tabs.map(function (t) {
            return '<button type="button" class="vgq-tab" role="tab" data-tab="' + t.k + '" aria-selected="' + (t.k === OV_TAB && OV_VIEW !== 'conceitos') + '">' +
              t.label + ' <small>' + t.n + '</small></button>';
          }).join('') +
        '</div>' +
        (window.VGValores ? '<button type="button" class="vgq-val-bt" data-act="val" title="Valores de referência (Alt+V)">🧪 Valores</button>' : '') +
      '</div>';

    if (OV_VIEW === 'conceitos') {
      OV.innerHTML = topHtml + renderConceitosHtml();
      return;
    }
    if (OV_VIEW === 'resumo') {
      OV.innerHTML = topHtml + renderResumoHtml();
      return;
    }

    var list = listaAtual();
    if (!list.length) {
      OV.innerHTML = topHtml +
        '<div class="vgq-body"><div class="vgq-stage"><div class="vgq-sum">' +
          '<h2>Nenhuma questão neste conjunto</h2>' +
          '<p>' + esc(OV_SETS.semProvaAviso || 'Escolha outra aba acima para praticar.') + '</p>' +
        '</div></div></div>' +
        '<div class="vgq-foot"><button type="button" class="vgq-btn" data-act="close">← Voltar ao texto</button><span></span><span></span></div>';
      return;
    }
    if (OV_IDX >= list.length) OV_IDX = list.length - 1;
    if (OV_IDX < 0) OV_IDX = 0;

    var q = list[OV_IDX];
    if (q.aberta) {
      OV.innerHTML = topHtml + renderAbertaHtml(q);
      return;
    }

    var st = q._state();
    var elims = OV_ELIM[q.id] || {};
    var pct = Math.round(((OV_IDX + 1) / list.length) * 100);

    var dotsHtml = list.map(function (item, idx) {
      var s = item._state();
      var cls = 'vgq-dot' + (idx === OV_IDX ? ' cur' : '') + (s.done ? (s.ok ? ' rt' : ' wr') : '');
      return '<button type="button" class="' + cls + '" data-goto="' + idx + '">' + (idx + 1) + '</button>';
    }).join('');

    var altsHtml = (q.alts || []).map(function (txt, j) {
      var cls = 'vgq-alt';
      if (st.done) {
        cls += ' lock';
        if (j === st.gab) cls += ' ok';
        else if (j === st.pick) cls += ' bad';
      } else {
        if (OV_SEL === j) cls += ' sel';
        if (elims[j]) cls += ' elim';
      }
      return '<div class="vgq-arow">' +
        '<button type="button" class="' + cls + '" data-alt="' + j + '">' +
          '<span class="vgq-l">' + (L[j] || (j + 1)) + '</span>' +
          '<span class="vgq-tx">' + txt +
            '<span class="vgq-hint">Clique novamente ou pressione Enter para confirmar</span>' +
          '</span>' +
        '</button>' +
        (!st.done ? '<button type="button" class="vgq-elim" data-elim="' + j + '" aria-pressed="' + (!!elims[j]) + '" title="Riscar alternativa">✕</button>' : '') +
      '</div>';
    }).join('');

    var posRespHtml = '';
    if (st.done) {
      var gabLetra = st.gab >= 0 ? L[st.gab] : '';
      posRespHtml +=
        '<div class="vgq-verd ' + (st.ok ? 'ok' : 'bad') + '">' +
          '<span>' + (st.ok ? '✓ Resposta correta!' : ('✕ Resposta incorreta' + (gabLetra ? ' · Gabarito: ' + gabLetra : ''))) + '</span>' +
          (q._reset ? '<button type="button" class="vgq-btn sm" data-act="resetq">↺ Refazer</button>' : '') +
        '</div>';
      if (st.comHtml) posRespHtml += '<div class="vgq-com">' + st.comHtml + '</div>';
      if (st.corHtml) {
        posRespHtml += '<details class="vgq-acc"><summary>Por que as outras alternativas estão erradas</summary><div class="vgq-acc-in">' + st.corHtml + '</div></details>';
      }
      if (st.justHtml) {
        posRespHtml += '<details class="vgq-acc"><summary>📄 Justificativa oficial da prova</summary><div class="vgq-acc-in">' + st.justHtml + '</div></details>';
      }
      posRespHtml += renderHabilidadesHtml(q);
    }

    var confirmBarHtml = '';
    if (!st.done) {
      confirmBarHtml =
        '<div class="vgq-confirm-bar">' +
          '<button type="button" class="vgq-touch-cfm" data-act="confirm"' + (OV_SEL == null ? ' disabled' : '') + '>' +
            (OV_SEL == null ? 'Selecione uma alternativa para confirmar' : ('Confirmar resposta (' + L[OV_SEL] + ')')) +
          '</button>' +
          '<span class="vgq-kbd-tip">🖱️ 1º clique seleciona · 2º clique confirma · ⌨️ A–D + Enter · ← → navega · botão direito risca</span>' +
        '</div>';
    }

    var isLast = OV_IDX === list.length - 1;
    OV.innerHTML =
      topHtml +
      '<div class="vgq-prog-wrap">' +
        '<div class="vgq-bar"><i style="width:' + pct + '%"></i></div>' +
        '<div class="vgq-dots">' + dotsHtml + '<span class="vgq-dot-meta">Questão ' + (OV_IDX + 1) + ' de ' + list.length + '</span></div>' +
      '</div>' +
      '<div class="vgq-body"><div class="vgq-stage">' +
        (q.tag ? '<div class="vgq-tag' + (q.isPv ? ' pv' : '') + '">' + esc(q.tag) + '</div>' : '') +
        (q.warn ? '<div class="vgq-warn">' + q.warn + '</div>' : '') +
        '<div class="vgq-enun">' + q.enun + '</div>' +
        (q.cmd ? '<div class="vgq-cmd">' + q.cmd + '</div>' : '') +
        '<div class="vgq-alts">' + altsHtml + '</div>' +
        confirmBarHtml +
        posRespHtml +
      '</div></div>' +
      '<div class="vgq-foot">' +
        '<button type="button" class="vgq-btn" data-act="prev"' + (OV_IDX === 0 ? ' disabled' : '') + '>← Anterior</button>' +
        '<span class="vgq-cnt">' + (OV_IDX + 1) + ' / ' + list.length + '</span>' +
        (isLast
          ? '<button type="button" class="vgq-btn pri" data-act="resumo">Ver resumo →</button>'
          : '<button type="button" class="vgq-btn pri" data-act="next">Próxima →</button>') +
      '</div>';
  }

  /* ---------- Bloco de Habilidades (igual ao print!) ---------- */
  function renderHabilidadesHtml(q) {
    var hs = habilidadesDaQuestao(q);
    if (!hs.length) return '';
    var marcadas = 0, proxPend = -1;
    hs.forEach(function (_, idx) {
      var rec = HAB.m[habKey(q, idx)];
      if (rec && rec.st) marcadas++;
      else if (proxPend < 0) proxPend = idx;
    });
    var titulo = marcadas === hs.length ? ('Habilidade ' + hs.length + ' de ' + hs.length) : ('Habilidades · ' + marcadas + ' de ' + hs.length);
    var opts = [
      ['sim', 'Sim'],
      ['inc', 'Incerteza'],
      ['des', 'Desatenção'],
      ['nao', 'Não']
    ];
    return '<div class="vgq-hab">' +
      '<div class="vgq-hab-h">' + titulo + '</div>' +
      hs.map(function (h, idx) {
        var k = habKey(q, idx);
        var st = (HAB.m[k] && HAB.m[k].st) || '';
        var arr = (idx === proxPend || (proxPend < 0 && idx === 0)) ? '<span class="vgq-hab-arr" aria-hidden="true">→</span>' : '';
        return '<div class="vgq-hab-item">' +
          '<div class="vgq-hab-t">' + arr + '<span>' + esc(h.t) + '</span></div>' +
          '<div class="vgq-hab-btns">' +
            opts.map(function (o) {
              return '<button type="button" class="vgq-hb' + (st === o[0] ? ' on-' + o[0] : '') + '" data-hab-i="' + idx + '" data-hab-v="' + o[0] + '">' + o[1] + '</button>';
            }).join('') +
          '</div>' +
        '</div>';
      }).join('') +
    '</div>';
  }

  /* ---------- Renderização da Questão Aberta do segmento (1 por segmento) ---------- */
  function destacaChaves(chaves, textoAluno) {
    if (!chaves || !chaves.length) return '';
    var nt = normTxt(textoAluno || '');
    return '<div class="vgq-chaves">' + chaves.map(function (ch) {
      var hit = nt && nt.indexOf(normTxt(ch)) >= 0;
      return '<span class="vgq-ch' + (hit ? ' hit' : '') + '">' + (hit ? '✓ ' : '') + esc(ch) + '</span>';
    }).join('') + '</div>';
  }

  function renderAbertaHtml(q) {
    var st = ST.open[q.id] || { txt: '', rev: false, ev: '' };
    var len = (st.txt || '').length;
    var lim = q.lim || 500;
    return '<div class="vgq-body"><div class="vgq-stage">' +
      '<div class="vgq-tag pv">' + esc(q.tag) + '</div>' +
      '<div class="vgq-enun"><p>' + q.enun + '</p></div>' +
      '<textarea class="vgq-ta" data-open-ta="' + esc(q.id) + '" maxlength="' + lim + '" placeholder="Escreva sua resposta objetiva aqui (opcional — você também pode pensar mentalmente e clicar em Ver gabarito sugerido)...">' + esc(st.txt || '') + '</textarea>' +
      '<div class="vgq-cc"><span>Autoavaliação manual: marcar "Acertei" contabiliza para o Meme Secreto 🏆</span><span id="vgq-cc-n">' + len + '/' + lim + '</span></div>' +
      (!st.rev
        ? '<button type="button" class="vgq-btn pri" data-open-rev="' + esc(q.id) + '">Ver gabarito sugerido</button>'
        : '<div class="vgq-ideal">' +
            '<h4>Gabarito sugerido (resposta ideal)</h4>' +
            '<p>' + q.resp + '</p>' +
            destacaChaves(q.chaves, st.txt) +
            (q.ref ? '<p style="opacity:.75;font-size:13px;margin-top:8px">📚 ' + esc(q.ref) + '</p>' : '') +
          '</div>' +
          '<div class="vgq-self">' +
            '<span>Como você foi?</span>' +
            '<button type="button" class="vgq-sbtn ok' + (st.ev === 'ok' ? ' on' : '') + '" data-open-ev="ok">✅ Acertei</button>' +
            '<button type="button" class="vgq-sbtn no' + (st.ev === 'no' ? ' on' : '') + '" data-open-ev="no">❌ Errei</button>' +
          '</div>' +
          (st.ev ? renderHabilidadesHtml(q) : '')) +
    '</div></div>' +
    '<div class="vgq-foot">' +
      '<button type="button" class="vgq-btn" data-act="close">← Voltar ao texto</button>' +
      '<span class="vgq-cnt">Questão aberta · 1 / 1</span>' +
      '<button type="button" class="vgq-btn pri" data-act="resumo">Ver resumo →</button>' +
    '</div>';
  }

  /* ---------- Tela de Resumo do Segmento ---------- */
  function coletarFrageisDoSegmento(segId) {
    var out = [];
    Object.keys(HAB.m).forEach(function (k) {
      var it = HAB.m[k];
      if (!it || it.seg !== segId || it.rec) return;
      if (it.open && it.open.p && (it.st === 'nao' || it.st === 'inc' || (it.st === 'des' && (it.desN || 0) >= 2))) {
        out.push(Object.assign({ key: k }, it));
      }
    });
    var peso = { nao: 3, inc: 2, des: 1 };
    out.sort(function (a, b) { return (peso[b.st] || 0) - (peso[a.st] || 0); });
    return out;
  }

  function renderResumoHtml() {
    var list = listaAtual();
    var resp = 0, certas = 0;
    if (OV_TAB === 'a' && OV_SETS.a) {
      var oa = ST.open[OV_SETS.a.id];
      resp = oa && oa.ev ? 1 : 0;
      certas = oa && oa.ev === 'ok' ? 1 : 0;
    } else {
      list.forEach(function (q) { var s = q._state(); if (s.done) { resp++; if (s.ok) certas++; } });
    }
    var cntH = { sim: 0, inc: 0, des: 0, nao: 0 };
    Object.keys(HAB.m).forEach(function (k) {
      var it = HAB.m[k];
      if (it && it.seg === OV_CTX.segId && cntH[it.st] != null) cntH[it.st]++;
    });
    var frageis = coletarFrageisDoSegmento(OV_CTX.segId);
    var temAberta = !!OV_SETS.a;
    var abertaOk = !temAberta || (ST.open[OV_SETS.a.id] && ST.open[OV_SETS.a.id].ev === 'ok');
    var gabaritouAba = list.length > 0 && certas === list.length && OV_TAB !== 'a';
    var memeLiberado = temMemeLiberado(OV_CTX.segId);

    var memeBox = '';
    if (memeLiberado) {
      memeBox = '<div class="vgq-sum-box ok"><b>🏆 Meme secreto deste segmento liberado!</b><div class="vgq-sum-acts"><button type="button" class="vgq-btn pri" data-act="vermeme">Ver meme de novo 🏆</button></div></div>';
    } else if (gabaritouAba && temAberta && !abertaOk) {
      memeBox = '<div class="vgq-sum-box acc"><b>🏆 Quase lá! Você gabaritou este nível.</b><p style="margin:6px 0 0;font-size:14.5px">Responda a questão <b>Aberta</b> do segmento e marque <b>Acertei</b> para liberar o Meme Secreto.</p><div class="vgq-sum-acts"><button type="button" class="vgq-btn pri" data-tab="a">Ir para a Aberta →</button></div></div>';
    }

    var habBox = '';
    if (cntH.sim + cntH.inc + cntH.des + cntH.nao > 0) {
      habBox = '<div class="vgq-sum-box">' +
        '<b>Mapa de habilidades do segmento</b>' +
        '<div class="vgq-cta-pills" style="margin-top:8px">' +
          '<span class="vgq-pill ok">🟢 Sim · ' + cntH.sim + '</span>' +
          '<span class="vgq-pill warn">🟠 Incerteza · ' + cntH.inc + '</span>' +
          '<span class="vgq-pill">🟣 Desatenção · ' + cntH.des + '</span>' +
          '<span class="vgq-pill" style="border-color:var(--q-bad);color:var(--q-bad)">🔴 Não · ' + cntH.nao + '</span>' +
        '</div>' +
        (cntH.des >= 2 ? '<p style="margin:10px 0 0;font-size:13.5px;opacity:.85">⚠️ Atenção ao comando: você marcou <b>Desatenção</b> em ' + cntH.des + ' habilidades neste segmento.</p>' : '') +
        (frageis.length
          ? '<div class="vgq-sum-acts"><button type="button" class="vgq-btn pri" data-act="conceitos">🎯 Fixar ' + frageis.length + ' ' + (frageis.length > 1 ? 'conceitos frágeis' : 'conceito frágil') + ' agora (perguntas abertas)</button></div>'
          : '<p style="margin:10px 0 0;font-size:14px;opacity:.82">✅ Nenhum ponto frágil pendente neste segmento!</p>') +
      '</div>';
    }

    return '<div class="vgq-body"><div class="vgq-stage"><div class="vgq-sum">' +
      '<h2>Resumo da verificação</h2>' +
      '<p style="margin:0;opacity:.8">' + esc(OV_CTX.titulo) + '</p>' +
      '<div class="vgq-kpis">' +
        '<div class="vgq-kpi"><b>' + certas + '/' + list.length + '</b><span>certas neste conjunto</span></div>' +
        '<div class="vgq-kpi"><b>' + resp + '/' + list.length + '</b><span>respondidas</span></div>' +
        '<div class="vgq-kpi"><b>' + frageis.length + '</b><span>conceitos p/ reforço</span></div>' +
      '</div>' +
      memeBox +
      habBox +
      '<div class="vgq-sum-acts">' +
        '<button type="button" class="vgq-btn" data-act="voltarq">← Revisar questões</button>' +
        '<button type="button" class="vgq-btn pri" data-act="close">Voltar ao texto</button>' +
      '</div>' +
    '</div></div></div>' +
    '<div class="vgq-foot">' +
      '<button type="button" class="vgq-btn" data-act="voltarq">← Questões</button>' +
      '<span class="vgq-cnt">Resumo</span>' +
      '<button type="button" class="vgq-btn pri" data-act="close">Concluir e voltar</button>' +
    '</div>';
  }

  /* ---------- Rodada de Micro-questões Abertas de Conceito ---------- */
  function iniciarRodadaConceitos(itens, titulo) {
    if (!itens || !itens.length) return;
    OV_CONCS = itens;
    OV_CIDX = 0;
    OV_CREV = false;
    OV_CDRAFT = '';
    OV_VIEW = 'conceitos';
    if (!OV) {
      OV_CTX = { segId: '__global__', titulo: titulo || 'Meus pontos frágeis' };
      OV_SETS = { pv: [], f: [], m: [], d: [], aut: [], a: null };
      montarOverlayDom();
    }
    renderOverlay();
  }

  function renderConceitosHtml() {
    if (OV_CIDX >= OV_CONCS.length) {
      return '<div class="vgq-body"><div class="vgq-stage"><div class="vgq-sum">' +
        '<h2>Reforço de conceitos concluído 🎯</h2>' +
        '<p style="margin:0 0 12px;opacity:.85">Você revisou ' + OV_CONCS.length + ' ' + (OV_CONCS.length > 1 ? 'conceitos frágeis' : 'conceito frágil') + '. Os itens marcados como <b>Dominei</b> sobem na sua fila de recuperação.</p>' +
        '<div class="vgq-sum-acts">' +
          '<button type="button" class="vgq-btn pri" data-act="close">Voltar ao estudo</button>' +
        '</div>' +
      '</div></div></div>' +
      '<div class="vgq-foot"><span></span><span class="vgq-cnt">Concluído</span><button type="button" class="vgq-btn pri" data-act="close">Fechar</button></div>';
    }
    var it = OV_CONCS[OV_CIDX];
    var pct = Math.round(((OV_CIDX + 1) / OV_CONCS.length) * 100);
    var motivo = it.st === 'nao' ? '🔴 Marcada como "Não"' : (it.st === 'inc' ? '🟠 Marcada como "Incerteza"' : '🟣 Desatenção recorrente');
    return '<div class="vgq-prog-wrap">' +
        '<div class="vgq-bar"><i style="width:' + pct + '%"></i></div>' +
        '<div class="vgq-dots"><span class="vgq-badge ' + esc(it.st) + '">' + motivo + '</span>' +
          (it.tag ? '<span class="vgq-pill">' + esc(it.tag) + '</span>' : '') +
          '<span class="vgq-dot-meta">Conceito ' + (OV_CIDX + 1) + ' de ' + OV_CONCS.length + '</span></div>' +
      '</div>' +
      '<div class="vgq-body"><div class="vgq-stage">' +
        '<div class="vgq-tag pv">🎯 Verificação rápida de conceito</div>' +
        '<div class="vgq-enun"><p><b>' + esc(it.open.p) + '</b></p></div>' +
        '<textarea class="vgq-ta" style="min-height:86px" data-conc-ta="1" placeholder="Digite em 1–2 linhas (opcional — ou só pense na resposta e clique abaixo)...">' + esc(OV_CDRAFT) + '</textarea>' +
        (!OV_CREV
          ? '<div style="margin-top:12px"><button type="button" class="vgq-btn pri" data-act="crev">Já pensei · Ver resposta esperada</button></div>'
          : '<div class="vgq-ideal">' +
              '<h4>Resposta direta esperada</h4>' +
              '<p>' + esc(it.open.r) + '</p>' +
              destacaChaves(it.open.chaves, OV_CDRAFT) +
            '</div>' +
            '<div class="vgq-self">' +
              '<span>Como ficou este conceito?</span>' +
              '<button type="button" class="vgq-sbtn ok" data-conc-av="ok">✅ Dominei</button>' +
              '<button type="button" class="vgq-sbtn par" data-conc-av="par">🟡 Parcial</button>' +
              '<button type="button" class="vgq-sbtn no" data-conc-av="no">❌ Ainda não sabia</button>' +
            '</div>') +
      '</div></div>' +
      '<div class="vgq-foot">' +
        '<button type="button" class="vgq-btn" data-act="cprev"' + (OV_CIDX === 0 ? ' disabled' : '') + '>← Anterior</button>' +
        '<span class="vgq-cnt">' + (OV_CIDX + 1) + ' / ' + OV_CONCS.length + '</span>' +
        '<button type="button" class="vgq-btn" data-act="cnext">Pular →</button>' +
      '</div>';
  }

  /* ---------- Eventos do Overlay ---------- */
  function confirmarAlternativa(j) {
    var list = listaAtual(), q = list[OV_IDX];
    if (!q || q.aberta) return;
    if (q._state().done) return;
    OV_SEL = null;
    q._answer(j);
    setTimeout(function () {
      renderOverlay();
      checarMemeSegmento(true);
    }, 35);
  }

  function onOverlayClick(e) {
    var t = e.target;
    /* Ampliar imagem se existir zoom global ou clique direto */
    var closeBtn = t.closest('[data-act="close"]');
    if (closeBtn) { fecharOverlay(); return; }

    var valBtn = t.closest('[data-act="val"]');
    if (valBtn && window.VGValores) { window.VGValores.abrir(); return; }

    var tabBtn = t.closest('[data-tab]');
    if (tabBtn) {
      var tk = tabBtn.getAttribute('data-tab');
      OV_TAB = tk; OV_IDX = 0; OV_SEL = null; OV_VIEW = 'q';
      ativarAbaNativaSePreciso(tk, renderOverlay);
      return;
    }

    var gotoBtn = t.closest('[data-goto]');
    if (gotoBtn) { OV_IDX = +gotoBtn.getAttribute('data-goto'); OV_SEL = null; OV_VIEW = 'q'; renderOverlay(); return; }

    var elimBtn = t.closest('[data-elim]');
    if (elimBtn) {
      e.stopPropagation();
      var listE = listaAtual(), qE = listE[OV_IDX];
      if (!qE) return;
      var je = +elimBtn.getAttribute('data-elim');
      OV_ELIM[qE.id] = OV_ELIM[qE.id] || {};
      OV_ELIM[qE.id][je] = !OV_ELIM[qE.id][je];
      if (OV_ELIM[qE.id][je] && OV_SEL === je) OV_SEL = null;
      renderOverlay();
      return;
    }

    var altBtn = t.closest('[data-alt]');
    if (altBtn && !altBtn.classList.contains('lock')) {
      var j = +altBtn.getAttribute('data-alt');
      if (inputMode === 'mouse') {
        /* PC: 1º clique seleciona; 2º clique na mesma alternativa confirma */
        if (OV_SEL === j) confirmarAlternativa(j);
        else { OV_SEL = j; renderOverlay(); }
      } else {
        /* iPad / tablet / celular: toque apenas seleciona; botão Confirmar entrega */
        OV_SEL = j;
        renderOverlay();
      }
      return;
    }

    var cfmBtn = t.closest('[data-act="confirm"]');
    if (cfmBtn && OV_SEL != null) { confirmarAlternativa(OV_SEL); return; }

    var actBtn = t.closest('[data-act]');
    if (actBtn) {
      var act = actBtn.getAttribute('data-act');
      if (act === 'prev' && OV_IDX > 0) { OV_IDX--; OV_SEL = null; renderOverlay(); return; }
      if (act === 'next') { OV_IDX++; OV_SEL = null; renderOverlay(); return; }
      if (act === 'resumo') { OV_VIEW = 'resumo'; OV_SEL = null; renderOverlay(); checarMemeSegmento(true); return; }
      if (act === 'voltarq') { OV_VIEW = 'q'; renderOverlay(); return; }
      if (act === 'vermeme') { abrirModalMeme(OV_CTX.segId, 0, true); return; }
      if (act === 'resetq') {
        var qr = listaAtual()[OV_IDX];
        if (qr && qr._reset) { qr._reset(); setTimeout(renderOverlay, 35); }
        return;
      }
      if (act === 'conceitos') {
        var fr = coletarFrageisDoSegmento(OV_CTX.segId);
        if (fr.length) iniciarRodadaConceitos(fr, OV_CTX.titulo);
        return;
      }
      if (act === 'crev') { OV_CREV = true; renderOverlay(); return; }
      if (act === 'cprev' && OV_CIDX > 0) { OV_CIDX--; OV_CREV = false; OV_CDRAFT = ''; renderOverlay(); return; }
      if (act === 'cnext') { OV_CIDX++; OV_CREV = false; OV_CDRAFT = ''; renderOverlay(); return; }
    }

    /* Botão de Habilidade (Sim / Incerteza / Desatenção / Não) */
    var habBtn = t.closest('[data-hab-i]');
    if (habBtn) {
      var hi = +habBtn.getAttribute('data-hab-i');
      var hv = habBtn.getAttribute('data-hab-v');
      var qh = listaAtual()[OV_IDX];
      var hs = habilidadesDaQuestao(qh);
      var hObj = hs[hi];
      if (!qh || !hObj) return;
      var hk = habKey(qh, hi);
      var prev = HAB.m[hk] || {};
      var desN = (prev.desN || 0) + (hv === 'des' && prev.st !== 'des' ? 1 : 0);
      HAB.m[hk] = {
        st: hv,
        seg: OV_CTX.segId,
        segTit: OV_CTX.titulo,
        qid: qh.id,
        t: hObj.t,
        tag: hObj.tag || '',
        open: hObj.open || null,
        ok: hv === 'sim' ? Math.max(1, prev.ok || 0) : 0,
        desN: desN,
        rec: hv === 'sim',
        ts: Date.now()
      };
      salvaH();
      renderOverlay();
      return;
    }

    /* Questão Aberta: revelar gabarito */
    var revOpen = t.closest('[data-open-rev]');
    if (revOpen) {
      var oid = revOpen.getAttribute('data-open-rev');
      ST.open[oid] = ST.open[oid] || { txt: '', rev: false, ev: '' };
      ST.open[oid].rev = true;
      salvaV();
      renderOverlay();
      return;
    }

    /* Questão Aberta: autoavaliação manual Acertei / Errei (contabiliza para o Meme!) */
    var evOpen = t.closest('[data-open-ev]');
    if (evOpen && OV_SETS && OV_SETS.a) {
      var qoa = OV_SETS.a;
      var ev = evOpen.getAttribute('data-open-ev');
      ST.open[qoa.id] = ST.open[qoa.id] || { txt: '', rev: true, ev: '' };
      ST.open[qoa.id].rev = true;
      ST.open[qoa.id].ev = ev;
      salvaV();
      renderOverlay();
      if (ev === 'ok') checarMemeSegmento(true);
      return;
    }

    /* Rodada de micro-questões abertas: autoavaliação Dominei / Parcial / Ainda não sabia */
    var avConc = t.closest('[data-conc-av]');
    if (avConc && OV_CONCS[OV_CIDX]) {
      var av = avConc.getAttribute('data-conc-av');
      var cur = OV_CONCS[OV_CIDX];
      var reg = HAB.m[cur.key];
      if (reg) {
        if (av === 'ok') {
          reg.ok = (reg.ok || 0) + 1;
          /* Incerteza/Desatenção: 1x Dominei recupera; Não: 2x Dominei recupera (ou marca recuperada na sessão) */
          if (reg.st !== 'nao' || reg.ok >= 2) reg.rec = true;
        } else if (av === 'no') {
          reg.ok = 0; reg.rec = false;
        }
        reg.ts = Date.now();
        salvaH();
      }
      OV_CIDX++; OV_CREV = false; OV_CDRAFT = '';
      renderOverlay();
      return;
    }
  }

  function onOverlayContext(e) {
    var altBtn = e.target.closest('[data-alt]');
    if (!altBtn || altBtn.classList.contains('lock')) return;
    e.preventDefault();
    var q = listaAtual()[OV_IDX];
    if (!q) return;
    var j = +altBtn.getAttribute('data-alt');
    OV_ELIM[q.id] = OV_ELIM[q.id] || {};
    OV_ELIM[q.id][j] = !OV_ELIM[q.id][j];
    if (OV_ELIM[q.id][j] && OV_SEL === j) OV_SEL = null;
    renderOverlay();
  }

  function onOverlayInput(e) {
    var ta = e.target.closest('[data-open-ta]');
    if (ta) {
      var oid = ta.getAttribute('data-open-ta');
      ST.open[oid] = ST.open[oid] || { txt: '', rev: false, ev: '' };
      ST.open[oid].txt = ta.value;
      salvaV();
      var cc = D.getElementById('vgq-cc-n');
      if (cc) cc.textContent = ta.value.length + '/' + (ta.getAttribute('maxlength') || 500);
      return;
    }
    if (e.target.matches('[data-conc-ta]')) {
      OV_CDRAFT = e.target.value;
    }
  }

  function onOverlayKey(e) {
    if (!OV) return;
    /* Não intercepta se algum modal acima (Meme / Valores / Zoom) estiver aberto */
    if (D.querySelector('.vgq-mm, .vg-mm.on, .vgv-bg, .vg-zoom')) return;
    var inInput = e.target && (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT');
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); fecharOverlay(); return; }
    if (inInput) return;
    if (OV_VIEW !== 'q') return;

    var list = listaAtual(), q = list[OV_IDX];
    if (!q || q.aberta) return;
    var st = q._state();
    var key = e.key.toUpperCase();

    if (!st.done) {
      var idx = -1;
      if (/^[A-E]$/.test(key)) idx = L.indexOf(key);
      else if (/^[1-5]$/.test(key)) idx = +key - 1;
      if (idx >= 0 && idx < (q.alts || []).length) {
        e.preventDefault();
        OV_SEL = idx;
        renderOverlay();
        return;
      }
      if (e.key === 'Enter' && OV_SEL != null) {
        e.preventDefault();
        confirmarAlternativa(OV_SEL);
        return;
      }
    }
    if (e.key === 'ArrowLeft' && OV_IDX > 0) { e.preventDefault(); OV_IDX--; OV_SEL = null; renderOverlay(); }
    else if (e.key === 'ArrowRight') {
      e.preventDefault();
      if (OV_IDX < list.length - 1) { OV_IDX++; OV_SEL = null; renderOverlay(); }
      else { OV_VIEW = 'resumo'; OV_SEL = null; renderOverlay(); checarMemeSegmento(true); }
    }
  }

  /* ---------- Painel acumulado "🎯 Meus pontos frágeis" ---------- */
  function resumoGlobalHabilidades() {
    var itens = Object.keys(HAB.m).map(function (k) { return Object.assign({ key: k }, HAB.m[k]); }).filter(Boolean);
    var cnt = { sim: 0, inc: 0, des: 0, nao: 0, rec: 0, frageis: [] };
    itens.forEach(function (it) {
      if (cnt[it.st] != null) cnt[it.st]++;
      if (it.rec && it.st !== 'sim') cnt.rec++;
      if (!it.rec && (it.st === 'nao' || it.st === 'inc')) cnt.frageis.push(it);
    });
    var peso = { nao: 3, inc: 2, des: 1 };
    cnt.frageis.sort(function (a, b) { return (peso[b.st] || 0) - (peso[a.st] || 0) || (b.ts || 0) - (a.ts || 0); });
    cnt.todos = itens.sort(function (a, b) { return (b.ts || 0) - (a.ts || 0); });
    return cnt;
  }

  var PMOD = null;
  function abrirPainel() {
    estilo();
    if (PMOD) PMOD.remove();
    var filtro = 'frag';
    var bg = D.createElement('div');
    bg.className = 'vgq-pmod';
    bg.setAttribute('role', 'dialog');
    bg.setAttribute('aria-modal', 'true');
    bg.setAttribute('aria-label', 'Meus pontos frágeis');
    PMOD = bg;

    function fechar() {
      if (!PMOD) return;
      PMOD.remove(); PMOD = null;
      D.removeEventListener('keydown', onK, true);
    }
    function onK(e) { if (e.key === 'Escape') { e.preventDefault(); fechar(); } }

    function pinta() {
      var r = resumoGlobalHabilidades();
      var tot = r.sim + r.inc + r.des + r.nao;
      var comAberta = r.frageis.filter(function (x) { return x.open && x.open.p; });
      var vis = filtro === 'frag' ? r.frageis
        : filtro === 'des' ? r.todos.filter(function (x) { return x.st === 'des'; })
        : filtro === 'rec' ? r.todos.filter(function (x) { return x.rec && x.st !== 'sim'; })
        : r.todos;

      var barHtml = tot ? '<div class="vgq-rxbar" title="Distribuição das habilidades marcadas">' +
        '<i style="width:' + (r.sim / tot * 100) + '%;background:var(--q-ok)"></i>' +
        '<i style="width:' + (r.inc / tot * 100) + '%;background:var(--q-inc)"></i>' +
        '<i style="width:' + (r.des / tot * 100) + '%;background:var(--q-des)"></i>' +
        '<i style="width:' + (r.nao / tot * 100) + '%;background:var(--q-bad)"></i>' +
      '</div>' : '';

      var listaHtml = vis.length
        ? '<div class="vgq-flist">' + vis.slice(0, 60).map(function (it) {
            var lbl = { nao: 'Não', inc: 'Incerteza', des: 'Desatenção', sim: 'Sim' }[it.st] || it.st;
            return '<div class="vgq-fitem">' +
              '<div class="vgq-fitem-top">' +
                '<span class="vgq-badge ' + esc(it.st) + '">' + lbl + '</span>' +
                (it.rec && it.st !== 'sim' ? '<span class="vgq-pill ok">Recuperado ✓</span>' : '') +
                (it.tag ? '<span style="font-weight:600;opacity:.85">' + esc(it.tag) + '</span>' : '') +
                '<span style="opacity:.6;margin-left:auto">' + esc(it.segTit || it.seg || '') + '</span>' +
              '</div>' +
              '<div style="font-size:14.5px;line-height:1.45">' + esc(it.t) + '</div>' +
            '</div>';
          }).join('') + '</div>'
        : '<p style="opacity:.75;margin:16px 0 4px">Nenhum item neste filtro ainda. Responda questões em <b>Verificar aprendizado</b> e marque as habilidades logo abaixo do gabarito.</p>';

      bg.innerHTML = '<div class="vgq-pbox">' +
        '<div class="vgq-ph"><div><h2>🎯 Meus pontos frágeis</h2><p style="margin:4px 0 0;font-size:14px;opacity:.78">Raio-X do que você marcou como Lacuna (Não), Incerteza ou Desatenção.</p></div><button type="button" class="vgq-px" data-px="1" aria-label="Fechar">×</button></div>' +
        '<div class="vgq-kpis">' +
          '<div class="vgq-kpi"><b style="color:var(--q-bad)">' + r.nao + '</b><span>🔴 Não (lacunas)</span></div>' +
          '<div class="vgq-kpi"><b style="color:var(--q-inc)">' + r.inc + '</b><span>🟠 Incerteza</span></div>' +
          '<div class="vgq-kpi"><b style="color:var(--q-des)">' + r.des + '</b><span>🟣 Desatenção</span></div>' +
          '<div class="vgq-kpi"><b style="color:var(--q-ok)">' + r.sim + '</b><span>🟢 Dominadas</span></div>' +
        '</div>' +
        barHtml +
        '<div class="vgq-sum-acts" style="margin:14px 0">' +
          (comAberta.length ? '<button type="button" class="vgq-btn pri" data-ptreino="1">⚡ Treinar ' + comAberta.length + ' conceito' + (comAberta.length > 1 ? 's' : '') + ' aberto' + (comAberta.length > 1 ? 's' : '') + '</button>' : '') +
          (tot ? '<button type="button" class="vgq-btn" data-pcopy="1">📋 Copiar diagnóstico</button>' : '') +
        '</div>' +
        '<div class="vgq-cta-pills">' +
          [['frag', 'Frágeis (' + r.frageis.length + ')'], ['des', 'Desatenção (' + r.des + ')'], ['rec', 'Recuperados (' + r.rec + ')'], ['all', 'Todos (' + tot + ')']].map(function (f) {
            return '<button type="button" class="vgq-tab" data-pf="' + f[0] + '" aria-selected="' + (filtro === f[0]) + '">' + f[1] + '</button>';
          }).join('') +
        '</div>' +
        listaHtml +
      '</div>';
    }

    bg.addEventListener('click', function (e) {
      if (e.target === bg || e.target.closest('[data-px]')) { fechar(); return; }
      var fb = e.target.closest('[data-pf]');
      if (fb) { filtro = fb.getAttribute('data-pf'); pinta(); return; }
      if (e.target.closest('[data-ptreino]')) {
        var r = resumoGlobalHabilidades();
        var comA = r.frageis.filter(function (x) { return x.open && x.open.p; });
        fechar();
        iniciarRodadaConceitos(comA, 'Treino de pontos frágeis');
        return;
      }
      var cp = e.target.closest('[data-pcopy]');
      if (cp) {
        var rg = resumoGlobalHabilidades();
        var linhas = ['Diagnóstico de pontos frágeis (' + K.toUpperCase() + '):',
          'Resumo: Não=' + rg.nao + ' | Incerteza=' + rg.inc + ' | Desatenção=' + rg.des + ' | Sim=' + rg.sim, ''];
        rg.frageis.forEach(function (it, i) {
          linhas.push((i + 1) + '. [' + it.st.toUpperCase() + '] ' + (it.tag ? it.tag + ' — ' : '') + it.t + (it.segTit ? ' (' + it.segTit + ')' : ''));
        });
        try { navigator.clipboard.writeText(linhas.join('\n')); cp.textContent = '✓ Diagnóstico copiado!'; setTimeout(function () { cp.textContent = '📋 Copiar diagnóstico'; }, 2000); } catch (err) { }
      }
    });

    pinta();
    D.body.appendChild(bg);
    D.addEventListener('keydown', onK, true);
  }

  /* ---------- Botão no Foco de Estudo (.vgf-panel) ---------- */
  function atualizaBotaoFoco() {
    if (html.classList.contains('vidro-aula')) return;
    var r = resumoGlobalHabilidades();
    var n = r.frageis.length;
    var tag = n ? (n + (n === 1 ? ' ponto' : ' pontos')) : 'raio-X';
    D.querySelectorAll('.vgf-panel').forEach(function (p) {
      var b = p.querySelector('.vgq-foco-bt');
      if (!b) {
        estilo();
        b = D.createElement('button');
        b.type = 'button';
        b.className = 'vgq-foco-bt';
        b.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); abrirPainel(); });
        (p.querySelector('.vgf-b') || p).appendChild(b);
      }
      if (b.dataset.tag !== tag) {
        b.dataset.tag = tag;
        b.innerHTML = '<span>🎯 Pontos frágeis</span><small>' + tag + '</small>';
      }
    });
  }

  /* ---------- Delegação global de clique no botão "Verificar aprendizado" ---------- */
  D.addEventListener('click', function (e) {
    var openBtn = e.target.closest('.vgq-cta [data-vgq-open]');
    if (!openBtn) return;
    var cta = openBtn.closest('.vgq-cta');
    var ctx = CTXS.get(cta);
    if (ctx) { e.preventDefault(); abrirOverlay(ctx); }
  });

  /* ---------- Varredura idempotente ---------- */
  var tm = 0;
  function varrer() {
    try {
      descobrirSegmentos().forEach(montarCta);
      atualizaBotaoFoco();
    } catch (e) { /* nunca quebra o master */ }
  }
  function agendar() {
    if (tm) return;
    tm = setTimeout(function () { tm = 0; varrer(); }, 90);
  }

  function iniciar() {
    carregarExternos();
    varrer();
    new MutationObserver(function (ms) {
      /* Ignora mutações dentro do próprio overlay ou dos botões/cartões vgq */
      var relevante = ms.some(function (m) {
        var t = m.target;
        if (t && t.closest && t.closest('.vgq-ov,.vgq-pmod,.vgq-mm,.vgq-cta')) return false;
        return true;
      });
      if (relevante) agendar();
    }).observe(D.body, { childList: true, subtree: true });
    addEventListener('hashchange', agendar);
    addEventListener('storage', function (e) {
      if (e.key === SK_H) { HAB = ler(SK_H, { m: {} }); atualizaBotaoFoco(); }
    });
  }

  window.VGVerif = {
    abrirPainel: abrirPainel,
    resumo: resumoGlobalHabilidades,
    disponivel: function () { return true; }
  };
  D.dispatchEvent(new CustomEvent('vg-verif-pronto'));

  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})();
