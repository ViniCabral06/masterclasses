/* Flashcards padrão do site v3 — com desbloqueio progressivo por aula (Vinícius e Matheus).
   - Repetição espaçada leve (SRS): Errei (volta na sessão), Difícil (1d), Bom (3d→7d→15d→30d), Fácil (5d→14d→30d).
   - Suporte a Cloze ({{lacuna}}), imagens (![legenda](caminho)), negrito/itálico/código e grifos de frequência nas 5 cores reais de prova.
   - Desbloqueio progressivo por aula:
     · Dentro de cada aula: faixa automática com "🃏 Praticar esta aula" + "+ Adicionar flashcards à lista da disciplina".
     · Na lista da disciplina: estuda só as aulas adicionadas (sem spoiler), com opção visível logo na frente para "🔓 Liberar todos os flashcards da disciplina agora".
   - Uso inline: <div data-vg-flash="pato"></div>; cartas em _tema/flash/<chave>.txt.
   - Salvo por matéria em localStorage "vg-flash:<chave>" ({ m, s, lib, tudo, b, so }). */
(function () {
  'use strict';
  if (window.VGFlash) return;
  var D = document, html = D.documentElement, K = html.dataset.vidro || '';
  var BASE = (function () { var s = D.currentScript && D.currentScript.src; return s ? s.replace(/[^/]*$/, '') : '../_tema/'; })();
  var REDUZ = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var DIA = 86400e3;
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var hash = function (s) { var h = 5381; for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); };

  /* nível de grifo de prova (1 a 5, igual aos grifos de frequência do site: verde → amarelo → laranja → vermelho → preto/dourado) */
  function nivelProva(c) {
    if (!c) return 0;
    var s = String(c);
    var m = s.match(/(\d+)\s*\/\s*(\d+)/);
    if (m) { var n = +m[1]; return Math.max(1, Math.min(5, n)); }
    var m2 = s.match(/(\d+)\s*(?:provas?|somativas?|parciais?|vezes|quest|na\s+s\d+)/i);
    if (m2) return Math.max(1, Math.min(5, +m2[1]));
    if (/parcial|somativa|prova|recorrente|sempre/i.test(s)) return 1;
    return 0;
  }

  /* formata texto: **negrito**, *itálico*, `código`, \n, imagens ![alt](src), e cloze {{...}} */
  function fmtBase(s) {
    var out = esc(s).replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, function (_, alt, src) {
      return '<figure class="vgfc-fig"><img src="' + src + '" alt="' + alt + '" loading="lazy" decoding="async">' + (alt ? '<figcaption>' + alt + '</figcaption>' : '') + '</figure>';
    });
    return out
      .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
      .replace(/(^|[^*])\*([^*\n]+?)\*(?!\*)/g, '$1<em>$2</em>')
      .replace(/`([^`\n]+?)`/g, '<code style="font-size:.9em;padding:1px 5px;border-radius:5px;background:var(--fc-bg)">$1</code>')
      .replace(/\\n|\n/g, '<br>');
  }
  function fmtFrente(c) {
    if (c.cloze) return fmtBase(c.f).replace(/\{\{([^}]+)\}\}/g, '<span class="vgfc-cloze">[ … ]</span>');
    return fmtBase(c.f);
  }
  function fmtVerso(c) {
    if (c.cloze) {
      var rev = fmtBase(c.f).replace(/\{\{([^}]+)\}\}/g, '<mark class="vgfc-cloze-ok">$1</mark>');
      return rev + (c.v ? '<div class="vgfc-extra">' + fmtBase(c.v) + '</div>' : '');
    }
    return fmtBase(c.v);
  }

  /* SRS leve: devolve próximo estado {due, ivl, ease, reps} e rótulo de intervalo */
  function proxSrs(cur, nota, agora) {
    var ivl = (cur && cur.ivl) || 0, ease = (cur && cur.ease) || 2.3, reps = (cur && cur.reps) || 0;
    if (nota === 0) return { due: agora, ivl: 0, ease: Math.max(1.5, ease - 0.2), reps: 0 };
    if (nota === 1) {
      var n1 = ivl ? Math.max(1, Math.round(ivl * 1.2)) : 1;
      return { due: agora + n1 * DIA, ivl: n1, ease: Math.max(1.6, ease - 0.12), reps: reps + 1 };
    }
    if (nota === 2) {
      var n2 = reps === 0 ? 3 : reps === 1 ? 7 : Math.min(45, Math.round(ivl * ease));
      return { due: agora + n2 * DIA, ivl: n2, ease: ease, reps: reps + 1 };
    }
    var n3 = reps === 0 ? 5 : reps === 1 ? 14 : Math.min(60, Math.round(ivl * (ease + 0.3)));
    return { due: agora + n3 * DIA, ivl: n3, ease: Math.min(2.8, ease + 0.15), reps: reps + 1 };
  }
  function rotIvl(dias) { return dias <= 0 ? 'agora' : dias === 1 ? '1 dia' : dias + ' dias'; }

  /* ---------- estado e lista progressiva da disciplina ---------- */
  function ler(k) { try { return JSON.parse(localStorage.getItem(k)) || {}; } catch (e) { return {}; } }
  function grava(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function normalizaEstado(chave) {
    var S = ler('vg-flash:' + chave);
    S.m = S.m || {};
    S.s = S.s || {};
    if (S.tudo === undefined) {
      /* preserva comportamento para quem já tinha revisões antes do modo progressivo; novos usuários começam no progressivo */
      var temProg = Object.keys(S.m).length > 0 || Object.keys(S.s).length > 0;
      S.tudo = temProg && !Array.isArray(S.lib);
    }
    if (!Array.isArray(S.lib)) S.lib = [];
    if (!S.b) S.b = S.tudo ? 'todos' : 'lista';
    if (S.so === undefined) S.so = '';
    return S;
  }
  function estaNaLista(S, baralhoId) { return S.lib.indexOf(baralhoId) >= 0; }
  function alternaAulaNaLista(chave, baralhoId, forcarAdd) {
    var S = normalizaEstado(chave);
    var i = S.lib.indexOf(baralhoId);
    var adicionado;
    if (forcarAdd === true) { if (i < 0) S.lib.push(baralhoId); adicionado = true; }
    else if (forcarAdd === false) { if (i >= 0) S.lib.splice(i, 1); adicionado = false; }
    else { if (i >= 0) { S.lib.splice(i, 1); adicionado = false; } else { S.lib.push(baralhoId); adicionado = true; } }
    grava('vg-flash:' + chave, S);
    notificaAtualizacao(chave);
    return adicionado;
  }
  function definirTudo(chave, ativo) {
    var S = normalizaEstado(chave);
    S.tudo = !!ativo;
    S.b = S.tudo ? 'todos' : 'lista';
    grava('vg-flash:' + chave, S);
    notificaAtualizacao(chave);
  }
  function notificaAtualizacao(chave) {
    try { D.dispatchEvent(new CustomEvent('vg-flash-upd', { detail: { chave: chave } })); } catch (_) {}
    try { if (window.parent && window.parent !== window) window.parent.postMessage({ vgFlashUpd: chave }, '*'); } catch (_) {}
  }

  /* ---------- detecção automática da aula atual em qualquer master ---------- */
  function aulaAtual() {
    /* 1) Patologia dentro de iframe de aula (aulas/aula1.html, tgi2.html, pratica2.html) */
    if (K === 'pato') {
      if (html.classList.contains('vidro-aula')) {
        var mp = location.pathname.match(/\/(aula\d+|tgi\d+|pratica\d+)\.html$/i);
        return mp ? mp[1].toLowerCase() : '';
      }
      var ifr = D.querySelector('iframe[src*="aulas/"]');
      if (ifr) {
        var mi = (ifr.getAttribute('src') || '').match(/aulas\/(aula\d+|tgi\d+|pratica\d+)\.html/i);
        if (mi) return mi[1].toLowerCase();
      }
      var pit = D.querySelector('.it.active[data-src],.it.on[data-src]');
      if (pit) {
        var ms = (pit.getAttribute('data-src') || '').match(/(aula\d+|tgi\d+|pratica\d+)/i);
        if (ms) return ms[1].toLowerCase();
      }
      return '';
    }
    /* 2) Cadernos (huma, prev, img, lab): section.section visível ou hash #a01/... */
    if (K === 'huma' || K === 'prev' || K === 'img' || K === 'lab') {
      var sec = D.querySelector('main section.section:not([hidden])');
      if (sec && sec.id) {
        var m0 = sec.id.match(/^(a\d+)/i);
        if (m0) return m0[1].toLowerCase();
      }
      var mh = location.hash.match(/#?(a\d+)/i);
      if (mh) return mh[1].toLowerCase();
      var ah = D.querySelector('#nav .it.active,#nav .it.on');
      if (ah) {
        var dh = (ah.getAttribute('href') || ah.dataset.id || ah.dataset.go || '').match(/(a\d+)/i);
        if (dh) return dh[1].toLowerCase();
      }
      return '';
    }
    /* 3) Microbiologia e Semiologia: .it.active[data-go="a3/s1"] ou hash */
    if (K === 'micro' || K === 'semio') {
      var it = D.querySelector('.it.active[data-go],.it.on[data-go]');
      var g = (it && it.dataset.go) || location.hash.replace(/^#/, '');
      var mm = g.match(/^(a\d+|vir)\b/i);
      return mm ? mm[1].toLowerCase() : '';
    }
    /* 4) Farmacologia: seção/pane visível com prefixo k/m/n/p/r/s/v/d/u/g/l */
    if (K === 'farmaco') {
      var fp = D.querySelector('section.on,section.active,.pane.on,.pane.active,section[id]:not([hidden])');
      var fid = (fp && fp.id) || location.hash.replace(/^#/, '');
      if (!fid) {
        var fit = D.querySelector('.it.active,.it.on');
        if (fit) fid = fit.dataset.id || fit.dataset.go || (fit.getAttribute('href') || '').replace(/^#/, '');
      }
      var mf = fid.match(/^([kmnprsvdugl])(?:\d|quiz|-cob)/i);
      return mf ? mf[1].toLowerCase() : '';
    }
    /* 5) DIC IV: caso01..caso10 */
    if (K === 'dic') {
      var dh2 = location.hash.match(/(caso\d+)/i);
      if (dh2) return dh2[1].toLowerCase();
      var dit = D.querySelector('.it.active,.it.on,[data-case].active');
      if (dit) {
        var dc = (dit.dataset.case || dit.dataset.id || dit.dataset.go || dit.getAttribute('href') || '').match(/(caso\d+)/i);
        if (dc) return dc[1].toLowerCase();
      }
      var dsec = D.querySelector('main [id*="caso"]:not([hidden])');
      if (dsec) {
        var dm = dsec.id.match(/(caso\d+)/i);
        if (dm) return dm[1].toLowerCase();
      }
      return '';
    }
    /* 6) Português: a1..a8 */
    if (K === 'port') {
      var p1 = D.querySelector('.sb.on,.it.active,.it.on');
      var src = (p1 && (p1.dataset.id || p1.dataset.go || p1.getAttribute('href') || p1.textContent)) || location.hash;
      var mp2 = String(src || '').match(/\b(?:a|aula\s*)(\d+)\b/i);
      return mp2 ? 'a' + mp2[1] : '';
    }
    return '';
  }

  function baralhoDaAula(dados, aid) {
    if (!dados || !aid) return null;
    aid = String(aid).toLowerCase();
    for (var i = 0; i < dados.baralhos.length; i++) {
      var b = dados.baralhos[i];
      if (b.id.toLowerCase() === aid) return b;
      if (b.aulas && b.aulas.indexOf(aid) >= 0) return b;
    }
    return null;
  }

  var CSS = '' +
    '.vgfc{--fc-acc:var(--vg-acc,var(--accent,#5fc4ae));--fc-ln:color-mix(in srgb,currentColor 14%,transparent);--fc-bg:color-mix(in srgb,currentColor 5%,transparent);max-width:760px;margin:0 auto;padding:8px 0 40px;font-size:16px;line-height:1.5}' +
    '.vgfc *{box-sizing:border-box}' +
    '.vgfc-top h2{font-family:var(--serif,var(--vg-display,"Instrument Serif"),Georgia,serif);font-weight:400;font-size:clamp(30px,5vw,40px);line-height:1.1;margin:0 0 6px}' +
    '.vgfc-top p{margin:0 0 14px;opacity:.78}' +
    '.vgfc-modo{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;padding:10px 14px;margin:0 0 14px;border-radius:14px;border:1px solid var(--fc-ln);background:var(--fc-bg);font-size:13.5px}' +
    '.vgfc-modo b{font-weight:600}' +
    '.vgfc-modo-acts{display:flex;gap:8px;flex-wrap:wrap;align-items:center}' +
    '.vgfc-mbtn{font:inherit;font-size:13px;font-weight:600;padding:6px 12px;border-radius:999px;border:1px solid var(--fc-ln);background:transparent;color:inherit;cursor:pointer;touch-action:manipulation}' +
    '.vgfc-mbtn.pri{background:var(--fc-acc);border-color:var(--fc-acc);color:var(--vg-on-acc,#fff)}' +
    ':root[data-theme="dark"] .vgfc-mbtn.pri{color:var(--vg-on-acc,#101211)}' +
    '.vgfc-mbtn.ok{background:rgba(48,164,108,.18);border-color:rgba(48,164,108,.5);color:#30a46c}' +
    '.vgfc-vazio{border:1px solid var(--fc-ln);border-radius:20px;padding:24px 22px;background:var(--surface,var(--fc-bg));display:flex;flex-direction:column;gap:14px}' +
    '.vgfc-vazio h3{font-family:var(--serif,var(--vg-display,"Instrument Serif"),Georgia,serif);font-weight:400;font-size:28px;line-height:1.15;margin:0}' +
    '.vgfc-vazio p{margin:0;opacity:.82;font-size:15px}' +
    '.vgfc-vazio-cta{display:flex;gap:10px;flex-wrap:wrap}' +
    '.vgfc-pick-h{font-size:13px;font-weight:600;opacity:.75;margin:6px 0 0}' +
    '.vgfc-pick{display:flex;flex-wrap:wrap;gap:7px}' +
    '.vgfc-lock{font:inherit;font-size:13px;padding:6px 11px;border-radius:999px;border:1px dashed var(--fc-ln);background:transparent;color:inherit;opacity:.82;cursor:pointer;display:inline-flex;align-items:center;gap:6px}' +
    '.vgfc-lock:hover{opacity:1;border-style:solid;border-color:var(--fc-acc)}' +
    '.vgfc-addbox{margin:0 0 12px;font-size:13.5px}' +
    '.vgfc-addbox summary{cursor:pointer;opacity:.75;padding:4px 0;font-weight:600}' +
    '.vgfc-addbox .vgfc-pick{margin-top:8px}' +
    '.vgfc-chips{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 12px}' +
    '.vgfc-chip{font:inherit;font-size:14px;border:1px solid var(--fc-ln);background:transparent;color:inherit;border-radius:999px;padding:7px 13px;cursor:pointer;touch-action:manipulation;display:inline-flex;gap:7px;align-items:center}' +
    '.vgfc-chip small{opacity:.65;font-size:12.5px}' +
    '.vgfc-chip[aria-pressed="true"]{background:var(--fc-acc);border-color:var(--fc-acc);color:var(--vg-on-acc,#fff)}' +
    ':root[data-theme="dark"] .vgfc-chip[aria-pressed="true"]{color:var(--vg-on-acc,#101211)}' +
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
    '.vgfc-card.fq1 .vgfc-face{box-shadow:inset 5px 0 0 #3fb950,0 8px 24px rgba(0,0,0,.06)}' +
    '.vgfc-card.fq2 .vgfc-face{box-shadow:inset 5px 0 0 #e3b341,0 8px 24px rgba(0,0,0,.06)}' +
    '.vgfc-card.fq3 .vgfc-face{box-shadow:inset 5px 0 0 #f0883e,0 8px 24px rgba(0,0,0,.06)}' +
    '.vgfc-card.fq4 .vgfc-face{box-shadow:inset 5px 0 0 #f85149,0 8px 24px rgba(0,0,0,.06)}' +
    '.vgfc-card.fq5 .vgfc-face{box-shadow:inset 5px 0 0 #0b0b0b,0 8px 24px rgba(0,0,0,.08)}' +
    ':root[data-theme="dark"] .vgfc-card.fq5 .vgfc-face{box-shadow:inset 5px 0 0 #ffe3a3,0 0 0 1px rgba(255,214,107,.45),0 8px 24px rgba(0,0,0,.22)}' +
    '.vgfc-tag{font-size:12.5px;letter-spacing:.02em;opacity:.85;display:flex;gap:8px;flex-wrap:wrap;align-items:center}' +
    '.vgfc-caiu{border-radius:999px;padding:3px 10px;font-weight:600;opacity:1;font-size:12px}' +
    '.vgfc-caiu.fq1{background:rgba(63,185,80,.2);box-shadow:inset 0 0 0 1px rgba(63,185,80,.55)}' +
    '.vgfc-caiu.fq2{background:rgba(227,179,65,.22);box-shadow:inset 0 0 0 1px rgba(227,179,65,.55)}' +
    '.vgfc-caiu.fq3{background:rgba(240,136,62,.24);box-shadow:inset 0 0 0 1px rgba(240,136,62,.6)}' +
    '.vgfc-caiu.fq4{background:rgba(248,81,73,.24);box-shadow:inset 0 0 0 1px rgba(248,81,73,.6)}' +
    '.vgfc-caiu.fq5{background:#0b0b0b;color:#ffe3a3;box-shadow:inset 0 0 0 1px rgba(255,214,107,.75)}' +
    '.vgfc-badge-cl{border-radius:999px;padding:2px 8px;font-size:11.5px;background:color-mix(in srgb,var(--fc-acc) 16%,transparent);font-weight:600}' +
    '.vgfc-q{font-family:var(--serif,var(--vg-display,"Instrument Serif"),Georgia,serif);font-size:clamp(22px,3.4vw,29px);line-height:1.26;margin:auto 0}' +
    '.vgfc-a{font-size:17px;line-height:1.55;margin:auto 0}' +
    '.vgfc-a b,.vgfc-q b{color:var(--fc-acc)}' +
    '.vgfc-cloze{display:inline-block;padding:0 10px;margin:0 2px;border-radius:8px;border:1.5px dashed var(--fc-acc);background:color-mix(in srgb,var(--fc-acc) 12%,transparent);font-family:var(--sans,var(--vg-text,system-ui));font-size:.78em;font-weight:700;vertical-align:baseline}' +
    '.vgfc-cloze-ok{background:color-mix(in srgb,var(--fc-acc) 26%,transparent);color:inherit;padding:1px 6px;border-radius:6px;font-weight:700;box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--fc-acc) 55%,transparent)}' +
    '.vgfc-extra{margin-top:12px;padding-top:10px;border-top:1px solid var(--fc-ln);font-size:15px;opacity:.9}' +
    '.vgfc-fig{margin:10px 0 4px;text-align:center}.vgfc-fig img{max-width:100%;max-height:240px;border-radius:12px;object-fit:contain;background:#0d0f0e}.vgfc-fig figcaption{font-size:12.5px;opacity:.7;margin-top:4px}' +
    '.vgfc-hint{font-size:13px;opacity:.55}' +
    '.vgfc-acts{display:flex;gap:8px;margin:14px 0 0;flex-wrap:wrap}' +
    '.vgfc-btn{font:inherit;font-size:14.5px;font-weight:600;flex:1 1 110px;min-height:52px;padding:6px 10px;border-radius:14px;border:1px solid var(--fc-ln);background:transparent;color:inherit;cursor:pointer;touch-action:manipulation;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px}' +
    '.vgfc-btn small{font-size:11.5px;font-weight:500;opacity:.75}' +
    '.vgfc-btn:disabled{opacity:.35;cursor:default}' +
    '.vgfc-btn.no{border-color:color-mix(in srgb,#e5484d 55%,transparent);color:#e5484d}' +
    '.vgfc-btn.dif{border-color:color-mix(in srgb,#f0883e 55%,transparent);color:#f0883e}' +
    '.vgfc-btn.ok{background:var(--fc-acc);border-color:var(--fc-acc);color:var(--vg-on-acc,#fff)}' +
    '.vgfc-btn.fac{border-color:color-mix(in srgb,#3fb950 55%,transparent);color:#3fb950}' +
    '.vgfc-btn.sm{flex:0 0 auto;min-height:44px;padding:0 16px;font-weight:500;flex-direction:row}' +
    '.vgfc-fim{text-align:center;border:1px solid var(--fc-ln);border-radius:20px;padding:30px 22px}' +
    '.vgfc-fim h3{font-family:var(--serif,var(--vg-display,"Instrument Serif"),Georgia,serif);font-weight:400;font-size:34px;margin:0 0 6px}' +
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
    '.vgfc-mod-bg{position:fixed;inset:0;z-index:2147482600;background:rgba(4,6,10,.62);display:flex;align-items:center;justify-content:center;padding:14px}' +
    '.vgfc-mod{width:min(840px,100%);max-height:calc(100dvh - 28px);overflow:auto;border-radius:22px;border:1px solid var(--vg-edge,rgba(127,127,127,.3));background:var(--vg-ground,#121413);color:var(--vg-ink,inherit);padding:18px 22px 10px;box-shadow:0 24px 70px rgba(0,0,0,.5);position:relative}' +
    '.vgfc-mod-x{position:sticky;top:0;float:right;z-index:5;width:36px;height:36px;border-radius:50%;border:1px solid var(--vg-edge,rgba(127,127,127,.3));background:var(--vg-ground,#121413);color:inherit;font-size:18px;cursor:pointer}' +
    '.vgfc-foco-bt{display:flex;align-items:center;justify-content:space-between;width:calc(100% - 16px);margin:4px 8px 2px;padding:7px 10px;border-radius:11px;border:1px solid var(--vg-edge,rgba(127,127,127,.25));background:var(--vg-glass,rgba(127,127,127,.08));color:inherit;font:600 13px/1.2 var(--vg-text,system-ui,sans-serif);cursor:pointer;text-align:left}' +
    '.vgfc-foco-bt:hover{border-color:var(--vg-acc)}.vgfc-foco-bt small{font-weight:600;opacity:.8}' +
    '.vgfc-foco-aula{display:flex;gap:4px;width:calc(100% - 16px);margin:2px 8px 4px}' +
    '.vgfc-foco-aula button{font:600 12px/1.2 var(--vg-text,system-ui,sans-serif);border-radius:9px;padding:6px 8px;border:1px solid var(--vg-edge,rgba(127,127,127,.25));background:transparent;color:inherit;cursor:pointer}' +
    '.vgfc-foco-aula .vgfc-fa-open{flex:1;text-align:left;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '.vgfc-foco-aula .vgfc-fa-add{flex:0 0 auto;background:var(--vg-acc,var(--accent,#5fc4ae));border-color:transparent;color:var(--vg-on-acc,#fff)}' +
    ':root[data-theme="dark"] .vgfc-foco-aula .vgfc-fa-add{color:var(--vg-on-acc,#101211)}' +
    '.vgfc-foco-aula .vgfc-fa-add.on{background:rgba(48,164,108,.18);border-color:rgba(48,164,108,.5);color:#30a46c}' +
    /* faixa discreta injetada no rodapé da aula atual */
    '.vgfc-aula-bar{margin:28px auto 12px;max-width:780px;padding:14px 16px;border-radius:16px;border:1px solid color-mix(in srgb,currentColor 16%,transparent);background:color-mix(in srgb,currentColor 4%,transparent);display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;font-family:var(--sans,var(--vg-text,system-ui,sans-serif))}' +
    '.vgfc-aula-bar .t{display:flex;flex-direction:column;gap:2px;min-width:200px;flex:1}' +
    '.vgfc-aula-bar .t b{font-size:14.5px;font-weight:600}.vgfc-aula-bar .t small{font-size:12.5px;opacity:.72}' +
    '.vgfc-aula-bar .bs{display:flex;gap:8px;flex-wrap:wrap}' +
    '.vgfc-aula-bar button{font:600 13px/1.2 inherit;padding:9px 14px;border-radius:11px;border:1px solid color-mix(in srgb,currentColor 20%,transparent);background:transparent;color:inherit;cursor:pointer;touch-action:manipulation}' +
    '.vgfc-aula-bar button.pri{background:var(--vg-acc,var(--accent,#5fc4ae));border-color:transparent;color:var(--vg-on-acc,#fff)}' +
    ':root[data-theme="dark"] .vgfc-aula-bar button.pri{color:var(--vg-on-acc,#101211)}' +
    '.vgfc-aula-bar button.ok{background:rgba(48,164,108,.18);border-color:rgba(48,164,108,.5);color:#30a46c}' +
    '@media (max-width:600px){.vgfc-chips,.vgfc-opts{flex-wrap:nowrap;overflow-x:auto;margin-left:-16px;margin-right:-16px;padding:0 16px 4px;scrollbar-width:none;-webkit-overflow-scrolling:touch}.vgfc-chips::-webkit-scrollbar,.vgfc-opts::-webkit-scrollbar{display:none}.vgfc-chip{flex:0 0 auto;white-space:nowrap}.vgfc-top p{font-size:15px}.vgfc-face{padding:20px 18px 18px;min-height:260px;border-radius:16px}.vgfc-card{min-height:260px}.vgfc-a{font-size:16px}.vgfc-btn{flex:1 1 42%;min-height:48px}.vgfc-mod{padding:14px 14px 8px}.vgfc-aula-bar{padding:12px 13px}}' +
    '@media (prefers-reduced-motion:reduce){.vgfc-card{transition:none}}';

  function estilo() {
    if (D.getElementById('vgfc-css')) return;
    var st = D.createElement('style'); st.id = 'vgfc-css'; st.textContent = CSS; D.head.appendChild(st);
  }

  function montar(host, chave, dados, opts) {
    opts = opts || {};
    var KEY = 'vg-flash:' + chave;
    var soAula = opts.soAula || host.dataset.vgFlashAula || '';
    var S = normalizaEstado(chave);
    var todos = [];
    dados.baralhos.forEach(function (b) {
      b.cards.forEach(function (c) {
        todos.push({ id: b.id + ':' + hash(c.f), b: b, f: c.f, v: c.v, c: c.c, cloze: !!c.cloze, nv: nivelProva(c.c) });
      });
    });
    var fila = [], pos = 0, virado = false, sessao = { ok: 0, no: 0 };

    function baralhosVisiveis() {
      if (soAula) return dados.baralhos.filter(function (b) { return b.id === soAula; });
      if (S.tudo) return dados.baralhos;
      return dados.baralhos.filter(function (b) { return estaNaLista(S, b.id); });
    }
    function cartasLiberadas() {
      if (soAula) return todos.filter(function (x) { return x.b.id === soAula; });
      if (S.tudo) return todos;
      return todos.filter(function (x) { return estaNaLista(S, x.b.id); });
    }
    function doBaralho() {
      if (soAula) return todos.filter(function (x) { return x.b.id === soAula; });
      if (S.b === 'todos' && S.tudo) return todos;
      if (S.b === 'lista' || S.b === 'todos') return cartasLiberadas();
      return todos.filter(function (x) { return x.b.id === S.b; });
    }
    function vencida(x, agora) { var st = S.s[x.id]; return !!(st && st.due <= agora); }
    function paraHoje(l) {
      var ag = Date.now();
      return l.filter(function (x) { return S.s[x.id] ? S.s[x.id].due <= ag : S.m[x.id] !== 1; });
    }
    function monta(embaralha) {
      var l = doBaralho(), ag = Date.now();
      if (S.so === 'hoje') l = paraHoje(l);
      else if (S.so === 'errei') l = l.filter(function (x) { return S.m[x.id] === 0; });
      else if (S.so === 'novas') l = l.filter(function (x) { return S.m[x.id] === undefined && !S.s[x.id]; });
      else if (S.so === 'provas') l = l.filter(function (x) { return x.nv > 0; }).sort(function (a, b) { return b.nv - a.nv; });
      l = l.slice();
      if (S.so === 'hoje' && !embaralha) {
        l.sort(function (a, b) {
          var va = vencida(a, ag) ? 0 : (S.m[a.id] === 0 ? 1 : 2);
          var vb = vencida(b, ag) ? 0 : (S.m[b.id] === 0 ? 1 : 2);
          return va - vb || b.nv - a.nv;
        });
      }
      if (embaralha) for (var i = l.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = l[i]; l[i] = l[j]; l[j] = t; }
      fila = l; pos = 0; virado = false; sessao = { ok: 0, no: 0 };
    }
    function conta(l) {
      var o = 0, n = 0, hj = 0, pv = 0, ag = Date.now();
      l.forEach(function (x) {
        if (S.m[x.id] === 1) o++; else if (S.m[x.id] === 0) n++;
        if (S.s[x.id] ? S.s[x.id].due <= ag : S.m[x.id] !== 1) hj++;
        if (x.nv > 0) pv++;
      });
      return { o: o, n: n, t: l.length, hj: hj, pv: pv };
    }

    function barraModo() {
      if (soAula) {
        var ba = baralhoDaAula(dados, soAula);
        if (!ba) return '';
        var na = estaNaLista(S, ba.id);
        return '<div class="vgfc-modo">' +
          '<div><b>' + esc(ba.t) + '</b> · ' + ba.cards.length + ' cartas</div>' +
          '<div class="vgfc-modo-acts">' +
            '<button type="button" class="vgfc-mbtn ' + (na ? 'ok' : 'pri') + '" data-acao="toggle-aula" data-aid="' + esc(ba.id) + '">' + (na ? '✓ Na lista da disciplina' : '+ Adicionar à lista da disciplina') + '</button>' +
            '<button type="button" class="vgfc-mbtn" data-acao="ver-disc">Ver lista da disciplina →</button>' +
          '</div></div>';
      }
      if (S.tudo) {
        return '<div class="vgfc-modo">' +
          '<div>🔓 <b>Todas as aulas liberadas</b> (' + dados.baralhos.length + ' baralhos · ' + todos.length + ' cartas)</div>' +
          '<div class="vgfc-modo-acts"><button type="button" class="vgfc-mbtn" data-acao="modo-prog">Usar lista por aula</button></div></div>';
      }
      var vis = baralhosVisiveis();
      return '<div class="vgfc-modo">' +
        '<div>📚 <b>Sua lista da disciplina:</b> ' + vis.length + ' de ' + dados.baralhos.length + ' aulas adicionadas</div>' +
        '<div class="vgfc-modo-acts"><button type="button" class="vgfc-mbtn pri" data-acao="liberar-tudo">🔓 Liberar tudo (' + todos.length + ')</button></div></div>';
    }

    function chips() {
      if (soAula) return '';
      var vis = baralhosVisiveis();
      var libCartas = cartasLiberadas();
      var rootId = S.tudo ? 'todos' : 'lista';
      var rootLbl = S.tudo ? 'Todos' : '📚 Minha lista';
      var h = '<button type="button" class="vgfc-chip" data-b="' + rootId + '" aria-pressed="' + (S.b === rootId || (rootId === 'lista' && S.b === 'todos')) + '">' + rootLbl + ' <small>' + libCartas.length + '</small></button>';
      vis.forEach(function (b) {
        h += '<button type="button" class="vgfc-chip" data-b="' + esc(b.id) + '" aria-pressed="' + (S.b === b.id) + '">' + esc(b.t) + ' <small>' + b.cards.length + '</small></button>';
      });
      return h;
    }

    function caixaAdicionarMais() {
      if (soAula || S.tudo) return '';
      var faltam = dados.baralhos.filter(function (b) { return !estaNaLista(S, b.id); });
      if (!faltam.length) return '';
      var remover = (S.b !== 'lista' && S.b !== 'todos' && estaNaLista(S, S.b))
        ? '<button type="button" class="vgfc-mbtn" style="margin-left:8px" data-acao="toggle-aula" data-aid="' + esc(S.b) + '">Remover esta aula da lista</button>' : '';
      return '<details class="vgfc-addbox"><summary>🔒 Adicionar outras aulas à sua lista (' + faltam.length + ' disponíveis)</summary>' +
        '<div class="vgfc-pick">' + faltam.map(function (b) {
          return '<button type="button" class="vgfc-lock" data-acao="add-aula" data-aid="' + esc(b.id) + '">+ ' + esc(b.t) + ' <small>(' + b.cards.length + ')</small></button>';
        }).join('') + '</div>' + remover + '</details>';
    }

    function telaInicialProgressiva() {
      return '<div class="vgfc-vazio">' +
        '<h3>Monte seus flashcards aula por aula</h3>' +
        '<p>Para você não revisar assuntos que ainda não viu, a lista da disciplina começa vazia. Conforme terminar cada aula, clique em <b>+ Adicionar à lista da disciplina</b> — ou libere tudo agora se já quiser revisar o conteúdo completo.</p>' +
        '<div class="vgfc-vazio-cta">' +
          '<button type="button" class="vgfc-btn ok sm" data-acao="liberar-tudo">🔓 Liberar todos os flashcards agora (' + todos.length + ' cartas)</button>' +
        '</div>' +
        '<div class="vgfc-pick-h">Ou marque abaixo as aulas que você já estudou:</div>' +
        '<div class="vgfc-pick">' + dados.baralhos.map(function (b) {
          return '<button type="button" class="vgfc-lock" data-acao="add-aula" data-aid="' + esc(b.id) + '">+ ' + esc(b.t) + ' <small>(' + b.cards.length + ')</small></button>';
        }).join('') + '</div></div>';
    }

    function optsHtml() {
      var c = conta(doBaralho());
      var o = function (v, t) { return '<button type="button" class="vgfc-chip" data-so="' + v + '" aria-pressed="' + (S.so === v) + '">' + t + '</button>'; };
      return o('hoje', '📅 Para hoje <small>' + c.hj + '</small>') +
        o('', 'Todas') +
        (c.pv ? o('provas', '🔥 Já caiu em prova <small>' + c.pv + '</small>') : '') +
        o('errei', 'Só as que errei <small>' + c.n + '</small>') +
        o('novas', 'Não vistas <small>' + (c.t - c.o - c.n) + '</small>') +
        '<button type="button" class="vgfc-chip" data-acao="embaralha">🔀 Embaralhar</button>';
    }

    function cartao() {
      if (!fila.length) {
        var msg = S.so === 'hoje' ? 'Você zerou todas as cartas agendadas para hoje neste baralho! 🎉'
          : S.so === 'errei' ? 'Você não tem cartas erradas neste baralho.'
          : S.so === 'provas' ? 'Nenhuma carta marcada com prova neste baralho.'
          : 'Você já viu todas as cartas deste baralho.';
        return '<div class="vgfc-fim"><h3>Tudo em dia</h3><p>' + msg + '</p><div class="vgfc-acts"><button type="button" class="vgfc-btn sm" data-so-volta="1">Ver todas as cartas</button></div></div>';
      }
      if (pos >= fila.length) {
        var tot = sessao.ok + sessao.no;
        return '<div class="vgfc-fim"><h3>Fim da rodada</h3><p>Você acertou <b>' + sessao.ok + '</b> de ' + tot + ' revisões.' + (sessao.no ? ' As erradas ficam agendadas para revisão imediata.' : ' Mandou muito bem!') + '</p><div class="vgfc-acts">' +
          (sessao.no ? '<button type="button" class="vgfc-btn ok" data-acao="refaz">Refazer as que errei</button>' : '') +
          '<button type="button" class="vgfc-btn sm" data-acao="recomeca">Recomeçar</button></div></div>';
      }
      var x = fila[pos], m = S.m[x.id], st = S.s[x.id], ag = Date.now();
      var fqCls = x.nv ? ' fq' + x.nv : '';
      var tag = '<span>' + esc(x.b.t) + '</span>' +
        (x.cloze ? '<span class="vgfc-badge-cl">Lacuna</span>' : '') +
        (x.c ? '<span class="vgfc-caiu' + fqCls + '">' + esc(x.c) + '</span>' : '') +
        (m === 0 ? '<span>· errou antes</span>' : st && st.ivl ? '<span>· intervalo ' + rotIvl(st.ivl) + '</span>' : '');
      var d1 = rotIvl(proxSrs(st, 1, ag).ivl), d2 = rotIvl(proxSrs(st, 2, ag).ivl), d3 = rotIvl(proxSrs(st, 3, ag).ivl);
      return '<div class="vgfc-stage"><button type="button" class="vgfc-card' + fqCls + (virado ? ' vira' : '') + '" data-acao="vira" aria-label="' + (virado ? 'Resposta. Toque para ver a pergunta' : 'Pergunta. Toque para ver a resposta') + '">' +
        '<span class="vgfc-face"><span class="vgfc-tag">' + tag + '</span><span class="vgfc-q">' + fmtFrente(x) + '</span><span class="vgfc-hint">Toque ou aperte Espaço para ver a resposta</span></span>' +
        '<span class="vgfc-face vgfc-back"><span class="vgfc-tag"><span>Resposta</span>' + (x.c ? '<span class="vgfc-caiu' + fqCls + '">' + esc(x.c) + '</span>' : '') + '</span><span class="vgfc-a">' + fmtVerso(x) + '</span><span class="vgfc-hint">Como foi lembrar? (teclas 1–4)</span></span>' +
        '</button></div>' +
        '<div class="vgfc-acts">' + (virado
          ? '<button type="button" class="vgfc-btn no" data-acao="srs" data-n="0"><span>✗ Errei</span><small>volta já</small></button>' +
            '<button type="button" class="vgfc-btn dif" data-acao="srs" data-n="1"><span>😅 Difícil</span><small>' + d1 + '</small></button>' +
            '<button type="button" class="vgfc-btn ok" data-acao="srs" data-n="2"><span>✓ Bom</span><small>' + d2 + '</small></button>' +
            '<button type="button" class="vgfc-btn fac" data-acao="srs" data-n="3"><span>⚡ Fácil</span><small>' + d3 + '</small></button>'
          : '<button type="button" class="vgfc-btn sm" data-acao="volta"' + (pos ? '' : ' disabled') + ' aria-label="Carta anterior">←</button><button type="button" class="vgfc-btn ok" data-acao="vira">Ver resposta</button>') +
        '</div>';
    }

    function lista() {
      var vis = baralhosVisiveis();
      if (!vis.length) return '';
      return '<details class="vgfc-lista"><summary>📋 Ver cartas liberadas em lista (' + cartasLiberadas().length + ')</summary>' + vis.map(function (b) {
        return '<h4>' + esc(b.t) + '</h4><dl>' + b.cards.map(function (c) {
          var id = b.id + ':' + hash(c.f), m = S.m[id], nv = nivelProva(c.c);
          return '<dt><span class="vgfc-st' + (m === 1 ? ' s1' : m === 0 ? ' s0' : '') + '"></span>' + fmtFrente(c) + (c.c ? ' <span class="vgfc-caiu' + (nv ? ' fq' + nv : '') + '">' + esc(c.c) + '</span>' : '') + '</dt><dd>' + fmtVerso(c) + '</dd>';
        }).join('') + '</dl>';
      }).join('') + '</details>';
    }

    function pinta() {
      var aberto = host.querySelector('.vgfc-lista[open]');
      var addAb = host.querySelector('.vgfc-addbox[open]');
      var vazio = !soAula && !S.tudo && !baralhosVisiveis().length;
      if (vazio) {
        host.innerHTML = '<div class="vgfc">' +
          (host.dataset.topo === 'nao' ? '' : '<div class="vgfc-top"><h2>' + esc(dados.titulo || 'Flashcards') + '</h2><p>' + esc(dados.sub || '') + '</p></div>') +
          telaInicialProgressiva() + '</div>';
        return;
      }
      var l = doBaralho(), c = conta(l);
      var feito = fila.length ? Math.min(pos, fila.length) : 0;
      host.innerHTML = '<div class="vgfc">' +
        (host.dataset.topo === 'nao' ? '' : '<div class="vgfc-top"><h2>' + esc(dados.titulo || 'Flashcards') + '</h2><p>' + esc(dados.sub || 'Toque no cartão para virar e escolha como lembrou. As faixas coloridas marcam o que já caiu em prova.') + '</p></div>') +
        barraModo() +
        (chips() ? '<div class="vgfc-chips" role="group" aria-label="Baralho">' + chips() + '</div>' : '') +
        caixaAdicionarMais() +
        '<div class="vgfc-opts" role="group" aria-label="Quais cartas">' + optsHtml() + '</div>' +
        '<div class="vgfc-bar"><i style="width:' + (fila.length ? Math.round(feito / fila.length * 100) : 0) + '%"></i></div>' +
        '<div class="vgfc-cont"><span>' + (fila.length ? 'Carta ' + Math.min(pos + 1, fila.length) + ' de ' + fila.length : '') + '</span><span>Neste baralho: ' + c.hj + ' para hoje · ' + c.o + ' dominadas · ' + c.n + ' erradas</span></div>' +
        cartao() + lista() + '</div>';
      if (aberto && host.querySelector('.vgfc-lista')) host.querySelector('.vgfc-lista').open = true;
      if (addAb && host.querySelector('.vgfc-addbox')) host.querySelector('.vgfc-addbox').open = true;
    }

    function vira() { virado = !virado; var cd = host.querySelector('.vgfc-card'); if (cd && !REDUZ) { cd.classList.toggle('vira', virado); setTimeout(pinta, 230); } else pinta(); }
    function avaliar(nota) {
      var x = fila[pos]; if (!x) return;
      var ag = Date.now();
      S.s[x.id] = proxSrs(S.s[x.id], nota, ag);
      S.m[x.id] = nota === 0 ? 0 : 1;
      grava(KEY, S);
      if (nota === 0) {
        sessao.no++;
        if (!x._re) { var cp = Object.assign({}, x, { _re: 1 }); fila.splice(Math.min(fila.length, pos + 4), 0, cp); }
      } else sessao.ok++;
      pos++; virado = false; pinta();
      notificaAtualizacao(chave);
    }

    host.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b || !host.contains(b)) return;
      if (b.dataset.b) { S.b = b.dataset.b; grava(KEY, S); monta(false); pinta(); return; }
      if (b.dataset.so !== undefined) { S.so = b.dataset.so; grava(KEY, S); monta(false); pinta(); return; }
      if (b.dataset.soVolta) { S.so = ''; grava(KEY, S); monta(false); pinta(); return; }
      var a = b.dataset.acao;
      if (a === 'vira') vira();
      else if (a === 'srs') avaliar(+b.dataset.n);
      else if (a === 'volta') { if (pos) { pos--; virado = false; pinta(); } }
      else if (a === 'embaralha') { monta(true); pinta(); }
      else if (a === 'recomeca') { monta(false); pinta(); }
      else if (a === 'refaz') { S.so = 'errei'; grava(KEY, S); monta(true); pinta(); }
      else if (a === 'liberar-tudo') { definirTudo(chave, true); S = normalizaEstado(chave); monta(false); pinta(); }
      else if (a === 'modo-prog') { definirTudo(chave, false); S = normalizaEstado(chave); monta(false); pinta(); }
      else if (a === 'add-aula') {
        alternaAulaNaLista(chave, b.dataset.aid, true);
        S = normalizaEstado(chave);
        if (S.b !== 'lista' && S.b !== b.dataset.aid) S.b = 'lista';
        grava(KEY, S);
        monta(false); pinta();
      } else if (a === 'toggle-aula') {
        alternaAulaNaLista(chave, b.dataset.aid);
        S = normalizaEstado(chave);
        if (!soAula && !estaNaLista(S, S.b)) S.b = 'lista';
        grava(KEY, S);
        monta(false); pinta();
      } else if (a === 'ver-disc') {
        soAula = '';
        delete host.dataset.vgFlashAula;
        S = normalizaEstado(chave);
        monta(false); pinta();
      }
    });
    host.addEventListener('keydown', function (e) {
      if (e.target.closest('summary,input,textarea')) return;
      if (e.key === ' ' || e.key === 'Enter') { if (e.target.closest('.vgfc-card') || !e.target.closest('button')) { e.preventDefault(); vira(); } }
      else if (virado && e.key === '1') avaliar(0);
      else if (virado && e.key === '2') avaliar(1);
      else if (virado && (e.key === '3' || e.key === 'ArrowRight')) avaliar(2);
      else if (virado && e.key === '4') avaliar(3);
      else if (virado && e.key === 'ArrowLeft') avaliar(0);
      else if (!virado && e.key === 'ArrowLeft' && pos) { pos--; pinta(); }
    });
    if (!soAula && S.b !== 'todos' && S.b !== 'lista' && !baralhosVisiveis().some(function (x) { return x.id === S.b; })) {
      S.b = S.tudo ? 'todos' : 'lista';
    }
    monta(false); pinta();
  }

  /* _tema/flash/<chave>.txt:
     @titulo … / @sub … / # id | Nome do baralho [| aula1,aula2,…]
     Formato clássico: frente :: verso [:: caiu em…]
     Formato Cloze:    Frase com {{lacuna}} [:: nota extra] [:: caiu em…] */
  function lerTexto(t) {
    var d = { titulo: '', sub: '', baralhos: [] }, b = null;
    t.split(/\r?\n/).forEach(function (l) {
      l = l.trim(); if (!l || l.indexOf('//') === 0) return;
      if (/^@titulo\s/.test(l)) { d.titulo = l.slice(8).trim(); return; }
      if (/^@sub\s/.test(l)) { d.sub = l.slice(5).trim(); return; }
      if (l[0] === '#') {
        var p = l.slice(1).split('|');
        var bid = p[0].trim();
        var aulas = [bid.toLowerCase()];
        if (p[2]) p[2].split(',').forEach(function (a) { a = a.trim().toLowerCase(); if (a && aulas.indexOf(a) < 0) aulas.push(a); });
        b = { id: bid, t: (p[1] || bid).trim(), aulas: aulas, cards: [] };
        d.baralhos.push(b);
        return;
      }
      if (!b) return;
      var n = function (s) { return s ? s.replace(/\\n/g, '\n') : ''; };
      var c = l.split(/\s+::\s+/);
      var ehCloze = /\{\{[^}]+\}\}/.test(c[0]);
      if (ehCloze) {
        var extra = '', caiu = '';
        if (c.length >= 3) { extra = n(c[1]); caiu = c[2]; }
        else if (c.length === 2) {
          if (/^(caiu|parcial|somativa|prova|recorrente)/i.test(c[1])) caiu = c[1];
          else extra = n(c[1]);
        }
        b.cards.push({ f: n(c[0]), v: extra, c: caiu, cloze: true });
      } else if (c.length >= 2) {
        b.cards.push({ f: n(c[0]), v: n(c[1]), c: c[2] || '', cloze: false });
      }
    });
    d.baralhos = d.baralhos.filter(function (x) { return x.cards.length; });
    return d;
  }

  var cacheTxt = {};
  function buscarDados(chave) {
    if (!cacheTxt[chave]) {
      cacheTxt[chave] = fetch(BASE + 'flash/' + encodeURIComponent(chave) + '.txt', { cache: 'no-cache' })
        .then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); })
        .then(lerTexto);
    }
    return cacheTxt[chave];
  }

  function montaEl(el, opts) {
    if (el.dataset.vgfOk) return; el.dataset.vgfOk = '1';
    var chave = el.getAttribute('data-vg-flash');
    estilo();
    el.innerHTML = '<p style="opacity:.6;padding:20px 0">Carregando os flashcards…</p>';
    buscarDados(chave)
      .then(function (d) { montar(el, chave, d, opts); })
      .catch(function () { el.innerHTML = '<p style="padding:20px 0">Não consegui carregar os flashcards. Recarregue a página.</p>'; delete el.dataset.vgfOk; });
  }
  function montarTudo() { D.querySelectorAll('[data-vg-flash]').forEach(function (el) { montaEl(el); }); }

  /* ---------- modal universal (disciplina inteira ou focado em 1 aula) ---------- */
  function abrirModal(chave, opts) {
    chave = chave || K; if (!chave) return;
    opts = opts || {};
    estilo();
    var old = D.querySelector('.vgfc-mod-bg'); if (old) old.remove();
    var bg = D.createElement('div'); bg.className = 'vgfc-mod-bg';
    var box = D.createElement('div'); box.className = 'vgfc-mod'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-label', 'Flashcards');
    box.innerHTML = '<button type="button" class="vgfc-mod-x" aria-label="Fechar">✕</button><div data-vg-flash="' + esc(chave) + '"></div>';
    bg.appendChild(box); D.body.appendChild(bg);
    var fechar = function () { bg.remove(); D.removeEventListener('keydown', onK); };
    var onK = function (e) { if (e.key === 'Escape') fechar(); };
    D.addEventListener('keydown', onK);
    bg.addEventListener('click', function (e) { if (e.target === bg || e.target.closest('.vgfc-mod-x')) fechar(); });
    montaEl(box.querySelector('[data-vg-flash]'), opts);
  }

  /* ---------- integração automática: painel de Foco + faixa dentro da aula ---------- */
  var dispChave = null;
  function contarHoje(chave, d) {
    var S = normalizaEstado(chave), ag = Date.now(), n = 0, lib = 0;
    d.baralhos.forEach(function (b) {
      if (!S.tudo && !estaNaLista(S, b.id)) return;
      lib++;
      b.cards.forEach(function (c) {
        var id = b.id + ':' + hash(c.f);
        if (S.s[id] ? S.s[id].due <= ag : S.m[id] !== 1) n++;
      });
    });
    return { hoje: n, aulas: lib, tudo: S.tudo };
  }

  function alvoFaixaAula() {
    if (K === 'pato' && html.classList.contains('vidro-aula')) {
      return D.querySelector('section.pane.active,section.pane.on,section.pane:not([hidden])') || D.querySelector('main');
    }
    if (K === 'huma' || K === 'prev' || K === 'img' || K === 'lab') {
      return D.querySelector('main section.section:not([hidden])');
    }
    if (K === 'micro' || K === 'semio') return D.querySelector('#view .page');
    if (K === 'farmaco') return D.querySelector('section.on,section.active,.pane.on,.pane.active');
    if (K === 'dic') return D.querySelector('main .page,main section:not([hidden])');
    return null;
  }

  function atualizaInterfaceAula(d) {
    if (!d) return;
    var aid = aulaAtual();
    var ba = baralhoDaAula(d, aid);
    var S = normalizaEstado(K);
    var st = contarHoje(K, d);

    /* 1) Painel de Foco (.vgf-panel) */
    D.querySelectorAll('.vgf-panel').forEach(function (p) {
      var cont = p.querySelector('.vgf-b') || p;
      var b = p.querySelector('.vgfc-foco-bt');
      if (!b) {
        b = D.createElement('button'); b.type = 'button'; b.className = 'vgfc-foco-bt';
        b.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); abrirModal(K); });
        cont.appendChild(b);
      }
      var lbl = (!st.tudo && st.aulas === 0) ? 'montar lista' : (st.hoje ? st.hoje + ' hoje' : 'em dia');
      var h1 = '<span>🃏 Flashcards</span><small>' + lbl + '</small>';
      if (b.dataset.vgH !== h1) { b.innerHTML = h1; b.dataset.vgH = h1; }

      var row = p.querySelector('.vgfc-foco-aula');
      if (ba) {
        if (!row) {
          row = D.createElement('div'); row.className = 'vgfc-foco-aula';
          row.innerHTML = '<button type="button" class="vgfc-fa-open"></button><button type="button" class="vgfc-fa-add"></button>';
          row.querySelector('.vgfc-fa-open').addEventListener('click', function (e) {
            e.preventDefault(); e.stopPropagation();
            if (row.dataset.bid) abrirModal(K, { soAula: row.dataset.bid });
          });
          row.querySelector('.vgfc-fa-add').addEventListener('click', function (e) {
            e.preventDefault(); e.stopPropagation();
            if (row.dataset.bid) { alternaAulaNaLista(K, row.dataset.bid); atualizaInterfaceAula(d); }
          });
          cont.appendChild(row);
        }
        var na = estaNaLista(S, ba.id);
        if (row.dataset.bid !== ba.id) row.dataset.bid = ba.id;
        var bOpen = row.querySelector('.vgfc-fa-open');
        var bAdd = row.querySelector('.vgfc-fa-add');
        var tOpen = 'Esta aula (' + ba.cards.length + ')';
        if (bOpen.textContent !== tOpen) bOpen.textContent = tOpen;
        var tAdd = na ? '✓ Na lista' : '+ Lista';
        if (bAdd.textContent !== tAdd) bAdd.textContent = tAdd;
        bAdd.classList.toggle('on', na);
      } else if (row) {
        row.remove();
      }
    });

    /* 2) Faixa contextual dentro da aula atual (não aparece se a tela atual já é a página de flashcards) */
    var alvo = alvoFaixaAula();
    D.querySelectorAll('.vgfc-aula-bar').forEach(function (el) {
      if (!ba || !alvo || el.parentElement !== alvo || alvo.querySelector('[data-vg-flash]')) el.remove();
    });
    if (ba && alvo && !alvo.querySelector('[data-vg-flash]')) {
      var bar = alvo.querySelector(':scope > .vgfc-aula-bar');
      var na2 = estaNaLista(S, ba.id);
      if (!bar) {
        bar = D.createElement('div'); bar.className = 'vgfc-aula-bar';
        bar.innerHTML = '<div class="t"><b></b><small></small></div><div class="bs"><button type="button" class="vgfc-ab-ver">🃏 Flashcards desta aula</button><button type="button" class="vgfc-ab-add"></button></div>';
        bar.querySelector('.vgfc-ab-ver').addEventListener('click', function () {
          abrirModal(K, { soAula: bar.dataset.bid });
        });
        bar.querySelector('.vgfc-ab-add').addEventListener('click', function () {
          alternaAulaNaLista(K, bar.dataset.bid);
          atualizaInterfaceAula(d);
        });
        alvo.appendChild(bar);
      }
      if (bar.dataset.bid !== ba.id) bar.dataset.bid = ba.id;
      var tit = '🃏 ' + ba.t;
      var sub = ba.cards.length + ' cartas prontas · ' + (na2 ? 'já estão na sua lista da disciplina' : 'adicione à lista da disciplina quando terminar esta aula');
      if (bar.querySelector('.t b').textContent !== tit) bar.querySelector('.t b').textContent = tit;
      if (bar.querySelector('.t small').textContent !== sub) bar.querySelector('.t small').textContent = sub;
      var btAdd = bar.querySelector('.vgfc-ab-add');
      var tBtn = na2 ? '✓ Na lista da disciplina' : '+ Adicionar à lista da disciplina';
      if (btAdd.textContent !== tBtn) btAdd.textContent = tBtn;
      var cBtn = 'vgfc-ab-add ' + (na2 ? 'ok' : 'pri');
      if (btAdd.className !== cBtn) btAdd.className = cBtn; /* regravar igual também dispara o observer de 'class' */
    }
  }

  function iniciarAuto() {
    if (!K || K === 'th4' || window.__vgIndex) return;
    /* em iframes de aula, só roda para Patologia (onde cada aula é um iframe separado) */
    if (html.classList.contains('vidro-aula') && K !== 'pato') return;
    buscarDados(K).then(function (d) {
      if (!d || !d.baralhos.length) return;
      dispChave = d; estilo();
      var tm = 0;
      var agenda = function () { if (tm) return; tm = setTimeout(function () { tm = 0; atualizaInterfaceAula(d); }, 120); };
      atualizaInterfaceAula(d);
      new MutationObserver(agenda).observe(D.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'hidden', 'src'] });
      addEventListener('hashchange', agenda);
      addEventListener('storage', function (e) { if (e.key === 'vg-flash:' + K) agenda(); });
      addEventListener('message', function (e) { if (e.data && e.data.vgFlashUpd === K) agenda(); });
      D.addEventListener('vg-flash-upd', agenda);
      D.dispatchEvent(new CustomEvent('vg-flash-pronto', { detail: { chave: K, hoje: contarHoje(K, d).hoje } }));
    }).catch(function () { /* matéria sem baralho ainda */ });
  }

  window.VGFlash = {
    montar: montarTudo,
    abrir: abrirModal,
    disponivel: function () { return !!dispChave; },
    adicionarAula: function (chave, bid) { return alternaAulaNaLista(chave || K, bid, true); },
    liberarTudo: function (chave, ativo) { definirTudo(chave || K, ativo !== false); }
  };
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', function () { montarTudo(); iniciarAuto(); });
  else { montarTudo(); iniciarAuto(); }
})();
