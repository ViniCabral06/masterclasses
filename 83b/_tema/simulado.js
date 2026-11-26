/* Simulado padrão do site (todas as matérias).
   Lista de provas e simulados -> tela "Como você quer fazer?" -> prova com cronômetro -> nota e correção comentada.
   A pessoa escolhe a entrega (no final, como na prova / por questão, treino) e a tela (prova inteira / uma questão por vez).

   VGSim.lista(host, {chave, grupos:[{titulo, sub, itens:[item]}], aoFim})   aba "Simulados" de um master
   VGSim.um(host, {chave, item, livre(on), voltar(), aoFim})                 página de um simulado só (Patologia, Farmacologia, Microbiologia)
   item    = {id, tag, titulo, desc, qs: [questão] | função, sorteio: true se qs() muda a cada chamada}
   questão = {id, tag, enun (HTML), alts [HTML], gab (índice, lista de índices ou null), com (HTML | função), grupo}
             dissertativa = sem alts e sem gab; com = resposta ideal; lim = limite de caracteres (500)
   Fica salvo por master em localStorage, chave "vg-sim:<chave>": simulado em andamento, última nota e a escolha de modo. */
(function () {
  'use strict';
  if (window.VGSim) return;
  var L = 'ABCDEFGH', SEG = 180;

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function ler(ch) { try { return JSON.parse(localStorage.getItem('vg-sim:' + ch)) || {}; } catch (e) { return {}; } }
  function gravar(ch, o) { try { localStorage.setItem('vg-sim:' + ch, JSON.stringify(o)); } catch (e) { } }
  function mmss(t) { t = Math.abs(t); return String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0'); }
  function gabs(q) { return q.gab == null ? [] : [].concat(q.gab); }
  function certa(q, a) { return a != null && gabs(q).indexOf(a) >= 0; }

  var CSS = '.vgsim{--s-acc:var(--vg-acc,#1b6e66);--s-ok:#2f9e55;--s-bad:#d9503f;--s-warn:#c98a12;' +
    '--s-ln:color-mix(in srgb,currentColor 16%,transparent);--s-bg:color-mix(in srgb,currentColor 6%,transparent);--s-bg2:color-mix(in srgb,currentColor 12%,transparent);' +
    'font-size:15.5px;line-height:1.55;text-align:left;max-width:920px;margin:0 auto;opacity:1!important;transform:none!important}' +
    '.vgsim *{box-sizing:border-box}' +
    '.vgsim .vgs-crumb{font-size:13px;font-weight:600;opacity:.7;margin:0 0 6px}' +
    '.vgsim .vgs-h{font-family:var(--vg-display,inherit);font-weight:400;font-size:clamp(26px,3.2vw,36px);line-height:1.1;margin:0 0 8px}' +
    '.vgsim .vgs-p{margin:0 0 16px;opacity:.78;max-width:68ch}' +
    '.vgsim .vgs-sec{font-size:13px;font-weight:700;letter-spacing:.02em;margin:20px 0 8px;opacity:.75}' +
    '.vgsim .vgs-gh{font-family:var(--vg-display,inherit);font-weight:400;font-size:24px;margin:26px 0 4px}' +
    '.vgsim .vgs-gs{margin:0 0 12px;opacity:.72;font-size:14px}' +
    '.vgsim .vgs-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:12px}' +
    '.vgsim .vgs-g2{display:grid;grid-template-columns:1fr 1fr;gap:12px}' +
    '.vgsim .vgs-card{display:flex;flex-direction:column;gap:6px;border:1px solid var(--s-ln);background:var(--s-bg);border-radius:18px;padding:16px 18px;color:inherit;font:inherit;text-align:left;margin:0;min-height:0;height:auto;width:auto}' +
    '.vgsim button.vgs-card{cursor:pointer;appearance:none}' +
    '.vgsim button.vgs-card.on{border-color:var(--s-acc);box-shadow:inset 0 0 0 1.5px var(--s-acc);background:color-mix(in srgb,var(--s-acc) 13%,transparent)}' +
    '.vgsim .vgs-card b{font-size:16.5px;font-weight:600;line-height:1.3}' +
    '.vgsim .vgs-card small{font-size:12.5px;font-weight:600;opacity:.7}' +
    '.vgsim .vgs-card span{font-size:14px;opacity:.8;line-height:1.5}' +
    '.vgsim .vgs-card .vgs-res{font-size:13px;font-weight:600;opacity:1;color:var(--s-acc)}' +
    '.vgsim .vgs-card .vgs-acts{margin-top:auto;padding-top:8px}' +
    '.vgsim .vgs-acts{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:16px 0 0}' +
    '.vgsim .vgs-b{appearance:none;display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:40px;padding:0 18px;margin:0;width:auto;border-radius:999px;border:1px solid var(--s-ln);background:var(--s-bg);color:inherit;font:600 14px/1.1 inherit;font-family:inherit;cursor:pointer;text-decoration:none;box-shadow:none}' +
    '.vgsim .vgs-b.pri{background:color-mix(in srgb,var(--s-acc) 80%,#000);border-color:transparent;color:#fff}' +
    '.vgsim .vgs-b.sm{min-height:34px;padding:0 13px;font-size:13px}' +
    '.vgsim .vgs-b[disabled]{opacity:.45;cursor:default}' +
    '.vgsim .vgs-b:active{transform:scale(.97)}' +
    '.vgsim .vgs-bar{position:sticky;top:8px;z-index:6;display:flex;flex-wrap:wrap;gap:8px 14px;align-items:center;padding:10px 14px;margin:0 0 12px;border-radius:18px;border:1px solid var(--s-ln);background:var(--s-bg2);-webkit-backdrop-filter:blur(20px) saturate(160%);backdrop-filter:blur(20px) saturate(160%)}' +
    '.vgsim .vgs-tm{font-weight:700;font-size:20px;font-variant-numeric:tabular-nums}' +
    '.vgsim .vgs-tm.over{color:var(--s-bad)}' +
    '.vgsim .vgs-ct{font-size:13.5px;opacity:.8;flex:1 1 140px}' +
    '.vgsim .vgs-grid{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 16px}' +
    '.vgsim .vgs-grid button{appearance:none;width:34px;height:34px;min-height:0;padding:0;margin:0;border-radius:10px;border:1px solid var(--s-ln);background:transparent;color:inherit;font:600 12.5px/1 inherit;font-family:inherit;cursor:pointer;font-variant-numeric:tabular-nums;box-shadow:none}' +
    '.vgsim .vgs-grid .ans{background:var(--s-bg2)}' +
    '.vgsim .vgs-grid .rt{background:color-mix(in srgb,var(--s-ok) 30%,transparent);border-color:var(--s-ok)}' +
    '.vgsim .vgs-grid .wr{background:color-mix(in srgb,var(--s-bad) 28%,transparent);border-color:var(--s-bad)}' +
    '.vgsim .vgs-grid .flag{box-shadow:inset 0 -3px 0 var(--s-warn)}' +
    '.vgsim .vgs-grid .cur{border-color:var(--s-acc);box-shadow:inset 0 0 0 1.5px var(--s-acc)}' +
    '.vgsim .vgs-grid .cur.flag{box-shadow:inset 0 0 0 1.5px var(--s-acc),inset 0 -4px 0 var(--s-warn)}' +
    '.vgsim .vgs-q{border:1px solid var(--s-ln);background:var(--s-bg);border-radius:20px;padding:18px 20px;margin:0 0 14px;scroll-margin-top:84px}' +
    '.vgsim .vgs-qh{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:0 0 10px}' +
    '.vgsim .vgs-n{display:inline-flex;align-items:center;justify-content:center;min-width:28px;height:28px;padding:0 7px;border-radius:999px;background:var(--s-bg2);font-weight:700;font-size:13px}' +
    '.vgsim .vgs-tag{font-size:12.5px;font-weight:600;padding:3px 10px;border-radius:999px;background:var(--s-bg2)}' +
    '.vgsim .vgs-st{font-size:12.5px;font-weight:700;padding:3px 10px;border-radius:999px}' +
    '.vgsim .vgs-st.ok{background:color-mix(in srgb,var(--s-ok) 24%,transparent)}' +
    '.vgsim .vgs-st.no{background:color-mix(in srgb,var(--s-bad) 24%,transparent)}' +
    '.vgsim .vgs-en{font-size:16px;line-height:1.62;margin:0 0 12px}' +
    '.vgsim .vgs-en p{margin:0 0 10px;max-width:none}' +
    '.vgsim .vgs-en img{max-width:100%;height:auto;border-radius:10px}' +
    '.vgsim .vgs-alt{appearance:none;display:flex;gap:12px;align-items:flex-start;width:100%;min-height:0;height:auto;margin:0 0 8px;padding:11px 13px;border-radius:14px;border:1px solid var(--s-ln);background:transparent;color:inherit;font:inherit;font-size:15px;line-height:1.5;text-align:left;cursor:pointer;box-shadow:none}' +
    '.vgsim .vgs-alt .vgs-l{flex:none;display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:50%;border:1px solid var(--s-ln);font-weight:600;font-size:13px}' +
    '.vgsim .vgs-alt .vgs-t{flex:1;min-width:0;padding-top:2px}' +
    '.vgsim .vgs-alt.sel{border-color:var(--s-acc);background:color-mix(in srgb,var(--s-acc) 16%,transparent);box-shadow:inset 0 0 0 1px var(--s-acc)}' +
    '.vgsim .vgs-alt.sel .vgs-l{background:var(--s-acc);border-color:var(--s-acc);color:#fff}' +
    '.vgsim .vgs-alt.ok{border-color:var(--s-ok);background:color-mix(in srgb,var(--s-ok) 17%,transparent)}' +
    '.vgsim .vgs-alt.ok .vgs-l{background:var(--s-ok);border-color:var(--s-ok);color:#fff}' +
    '.vgsim .vgs-alt.bad{border-color:var(--s-bad);background:color-mix(in srgb,var(--s-bad) 15%,transparent)}' +
    '.vgsim .vgs-alt.bad .vgs-l{background:var(--s-bad);border-color:var(--s-bad);color:#fff}' +
    '.vgsim .vgs-alt-row{display:flex;align-items:stretch;gap:6px;margin:0 0 8px}' +
    '.vgsim .vgs-alt-row .vgs-alt{margin:0;flex:1;min-width:0}' +
    '.vgsim .vgs-elim{appearance:none;flex:none;width:36px;border-radius:12px;border:1px solid var(--s-ln);background:transparent;color:inherit;opacity:.5;font:600 13px/1 inherit;cursor:pointer;display:grid;place-items:center;padding:0;margin:0;box-shadow:none;transition:opacity .15s,background .15s,border-color .15s}' +
    '.vgsim .vgs-elim:hover{opacity:1;background:var(--s-bg2)}' +
    '.vgsim .vgs-elim[aria-pressed="true"]{opacity:1;border-color:var(--s-bad);color:var(--s-bad);background:color-mix(in srgb,var(--s-bad) 12%,transparent)}' +
    '.vgsim .vgs-alt.elim{opacity:.42}' +
    '.vgsim .vgs-alt.elim .vgs-t{text-decoration:line-through;text-decoration-thickness:1.5px}' +
    '.vgsim .vgs-alt.lock{cursor:default}' +
    '.vgsim .vgs-qf{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:12px 0 0}' +
    '.vgsim .vgs-com{margin:14px 0 0;padding:14px 16px;border-radius:14px;background:var(--s-bg2);font-size:15px;line-height:1.6}' +
    '.vgsim .vgs-com p{margin:0 0 10px;max-width:none}.vgsim .vgs-com p:last-child{margin:0}' +
    '.vgsim .vgs-dauto{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:10px 0 0;font-size:13px}' +
    '.vgsim .vgs-dauto span{opacity:.75;margin-right:4px}' +
    '.vgsim .vgs-dauto button{appearance:none;min-height:32px;padding:0 12px;border-radius:999px;border:1px solid var(--s-ln);background:transparent;color:inherit;font:600 12.5px/1 inherit;cursor:pointer;box-shadow:none}' +
    '.vgsim .vgs-dauto button.on-ok{border-color:var(--s-ok);background:color-mix(in srgb,var(--s-ok) 24%,transparent)}' +
    '.vgsim .vgs-dauto button.on-par{border-color:var(--s-warn);background:color-mix(in srgb,var(--s-warn) 24%,transparent)}' +
    '.vgsim .vgs-dauto button.on-no{border-color:var(--s-bad);background:color-mix(in srgb,var(--s-bad) 22%,transparent)}' +
    '.vgsim .vgs-ta{display:block;width:100%;margin:0;padding:12px 14px;border-radius:14px;border:1px solid var(--s-ln);background:transparent;color:inherit;font:inherit;font-size:15px;line-height:1.5;resize:vertical}' +
    '.vgsim .vgs-cc{text-align:right;font-size:12.5px;opacity:.7;font-variant-numeric:tabular-nums;margin:4px 2px 0}' +
    '.vgsim .vgs-pre{white-space:pre-wrap}' +
    '.vgsim .vgs-nota{display:flex;flex-wrap:wrap;gap:10px 26px;align-items:baseline;border:1px solid var(--s-ln);background:var(--s-bg);border-radius:20px;padding:18px 20px;margin:0 0 14px}' +
    '.vgsim .vgs-nota b{font-family:var(--vg-display,inherit);font-weight:400;font-size:44px;line-height:1}' +
    '.vgsim .vgs-hist{font-size:13px;opacity:.8;margin:-6px 0 14px;display:flex;flex-wrap:wrap;gap:6px 10px;align-items:center}' +
    '.vgsim .vgs-hist b{font-weight:600;opacity:1}' +
    '.vgsim .vgs-filt{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 14px;align-items:center}' +
    '.vgsim .vgs-filt button{appearance:none;min-height:34px;padding:0 13px;border-radius:999px;border:1px solid var(--s-ln);background:transparent;color:inherit;font:600 13px/1 inherit;cursor:pointer;box-shadow:none}' +
    '.vgsim .vgs-filt button[aria-pressed="true"]{background:var(--s-acc);border-color:var(--s-acc);color:var(--vg-on-acc,#fff)}' +
    '.vgsim .vgs-monte{border:1px solid color-mix(in srgb,var(--s-acc) 45%,var(--s-ln));background:color-mix(in srgb,var(--s-acc) 9%,var(--s-bg));border-radius:20px;padding:16px 18px;margin:0 0 22px;display:flex;flex-wrap:wrap;gap:12px 18px;align-items:center;justify-content:space-between}' +
    '.vgsim .vgs-monte b{display:block;font-size:17px;margin-bottom:2px}.vgsim .vgs-monte span{font-size:14px;opacity:.8}' +
    '.vgsim .vgs-mchips{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 12px}' +
    '.vgsim .vgs-mchips button{appearance:none;min-height:34px;padding:0 12px;border-radius:999px;border:1px solid var(--s-ln);background:transparent;color:inherit;font:500 13.5px/1.2 inherit;cursor:pointer;box-shadow:none}' +
    '.vgsim .vgs-mchips button[aria-pressed="true"]{background:var(--s-acc);border-color:var(--s-acc);color:var(--vg-on-acc,#fff);font-weight:600}' +
    '.vgsim .vgs-mres{font-size:14.5px;margin:12px 0 0;opacity:.9}' +
    '.vgsim .vgs-kbd{font-size:12px;opacity:.6;margin:10px 0 0}@media (hover:none){.vgsim .vgs-kbd{display:none}}' +
    '.vgsim .vgs-tab{width:100%;border-collapse:collapse;margin:0 0 16px;font-size:14.5px;display:table}' +
    '.vgsim .vgs-tab td{padding:8px 10px 8px 0;border-bottom:1px solid var(--s-ln);background:transparent;color:inherit}' +
    '.vgsim .vgs-tab tr.clic{cursor:pointer}.vgsim .vgs-tab tr.clic:hover td{background:var(--s-bg)}' +
    '.vgsim .vgs-tab tr.clic.on td{color:var(--s-acc);font-weight:600}' +
    '.vgsim .vgs-livre{display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between;border:1px solid var(--s-ln);background:var(--s-bg);border-radius:16px;padding:10px 14px;margin:0 0 18px;font-size:14px}' +
    '@media (max-width:700px){.vgsim .vgs-g2{grid-template-columns:1fr}.vgsim .vgs-q{padding:15px 14px;border-radius:16px}.vgsim .vgs-bar{top:4px;padding:8px 10px}.vgsim .vgs-tm{font-size:18px}.vgsim .vgs-grid button{width:32px;height:32px}.vgsim .vgs-elim{width:34px}}' +
    '.vgsim #vgs-gf-top{scroll-margin-top:84px}' +
    '.vgsim .vgs-gf{display:grid;grid-template-columns:repeat(auto-fill,minmax(54px,1fr));gap:6px;margin:0 0 10px}' +
    '.vgsim .vgs-gf button{appearance:none;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;min-height:50px;height:auto;width:auto;padding:4px 0;margin:0;border-radius:12px;border:1px solid var(--s-ln);background:transparent;color:inherit;font:inherit;font-family:inherit;cursor:pointer;box-shadow:none;font-variant-numeric:tabular-nums}' +
    '.vgsim .vgs-gf small{font-size:11px;font-weight:600;opacity:.7;line-height:1}' +
    '.vgsim .vgs-gf b{font-size:16px;font-weight:700;line-height:1.1}' +
    '.vgsim .vgs-gf .rt{background:color-mix(in srgb,var(--s-ok) 26%,transparent);border-color:var(--s-ok)}' +
    '.vgsim .vgs-gf .wr{background:color-mix(in srgb,var(--s-bad) 24%,transparent);border-color:var(--s-bad)}' +
    '.vgsim .vgs-gf .pr{background:color-mix(in srgb,var(--s-warn) 26%,transparent);border-color:var(--s-warn)}' +
    '.vgsim .vgs-gf .br{border-style:dashed;border-color:var(--s-bad)}' +
    '.vgsim .vgs-gf .ds{background:var(--s-bg2)}' +
    '.vgsim .vgs-gf button:active{transform:scale(.96)}' +
    '.vgsim .vgs-leg{display:flex;flex-wrap:wrap;gap:6px 16px;font-size:12.5px;opacity:.8;margin:0 0 18px}' +
    '.vgsim .vgs-leg i{display:inline-block;width:11px;height:11px;border-radius:4px;margin-right:5px;vertical-align:-1px;border:1px solid var(--s-ln)}' +
    '.vgsim .vgs-q.vgs-flash{animation:vgsflash 1.6s ease-out}' +
    '@keyframes vgsflash{0%,35%{box-shadow:0 0 0 3px var(--s-acc)}100%{box-shadow:0 0 0 0 transparent}}' +
    '.vgsim .vgs-up{margin-left:auto}' +
    '@media (max-width:700px){.vgsim .vgs-gf{grid-template-columns:repeat(auto-fill,minmax(48px,1fr))}.vgsim .vgs-gf button{min-height:46px}}' +
    '@media print{.vgsim .vgs-bar,.vgsim .vgs-grid,.vgsim .vgs-acts{display:none}}';
  function estilo() {
    if (document.getElementById('vgsim-css')) return;
    var s = document.createElement('style'); s.id = 'vgsim-css'; s.textContent = CSS; document.head.appendChild(s);
  }

  function Sessao(host, cfg) {
    estilo();
    host.classList.add('vgsim');
    var S = this, db = ler(cfg.chave), itens = [], item = null, qs = [], run = null, tela = 'lista', tick = 0, livreOn = false;
    var filt = 'all', filtTema = '';
    var mc = { temas: {}, modo: 'all', qtd: 20 }; // estado do "Monte seu simulado"
    var pref = db.pref || { modo: 'f', vista: 'p' };
    (cfg.grupos || []).forEach(function (g) { (g.itens || []).forEach(function (it) { itens.push(it); }); });
    var unico = !!cfg.unico;

    function salvar() { db.pref = pref; db.run = run; gravar(cfg.chave, db); }
    function achar(id) { for (var k = 0; k < itens.length; k++) if (itens[k].id === id) return itens[k]; return null; }
    function resolver(it) { var q = typeof it.qs === 'function' ? it.qs() : it.qs; return (q || []).filter(Boolean); }
    function nQ(it) { if (it.n) return it.n; try { return it.sorteio ? 0 : resolver(it).length; } catch (e) { return 0; } }
    function total() { return qs.length * SEG; }
    function com(q, a) { try { return typeof q.com === 'function' ? q.com(a) : (q.com || ''); } catch (e) { return ''; } }
    function errIdx() {
      var out = [];
      qs.forEach(function (q, k) { if (gabs(q).length && !certa(q, run.ans[k])) out.push(k); });
      return out;
    }
    /* banco unificado da matéria (para "Monte seu simulado"), deduplicado por id ou texto do enunciado */
    var _banco = null;
    function banco() {
      if (_banco) return _banco;
      var vistos = {}, out = [], fonte = typeof cfg.banco === 'function' ? cfg.banco() : cfg.banco;
      function add(q, fallbackGrupo) {
        if (!q || !(q.alts || []).length || !gabs(q).length) return;
        var k = q.id || String(q.enun || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().slice(0, 100);
        if (!k || vistos[k]) return;
        vistos[k] = 1;
        out.push(q.grupo ? q : Object.assign({}, q, { grupo: fallbackGrupo || 'Geral' }));
      }
      if (Array.isArray(fonte) && fonte.length) fonte.forEach(function (q) { add(q, q.grupo || 'Geral'); });
      else itens.forEach(function (it) { if (it.ir || it.sorteio) return; try { resolver(it).forEach(function (q) { add(q, it.titulo); }); } catch (e) {} });
      _banco = out; return out;
    }
    function ehProva(q) {
      var t = String(q.tag || '');
      return /prova|somativa|parcial|reconstru/i.test(t) && !/autoral|nova/i.test(t);
    }
    function temasBanco() {
      var m = {};
      banco().forEach(function (q) { var g = q.grupo || 'Geral'; m[g] = (m[g] || 0) + 1; });
      return Object.keys(m).sort().map(function (k) { return { k: k, n: m[k] }; });
    }
    function filtrarBanco() {
      var qst = db.qst || {}, selTemas = Object.keys(mc.temas).filter(function (k) { return mc.temas[k]; });
      return banco().filter(function (q) {
        if (selTemas.length && selTemas.indexOf(q.grupo || 'Geral') < 0) return false;
        var st = q.id ? qst[q.id] : null;
        if (mc.modo === 'prova') return ehProva(q);
        if (mc.modo === 'err') return !!(st && st.er > 0 && st.ult === 0);
        if (mc.modo === 'nov') return !st;
        return true;
      });
    }
    function embaralhar(a) {
      a = a.slice();
      for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; }
      return a;
    }

    /* ---------- telas ---------- */
    function tLista() {
      var h = cfg.intro ? '<p class="vgs-p">' + cfg.intro + '</p>' : '';
      var bk = !unico ? banco() : [];
      if (bk.length >= 5) {
        var qst = db.qst || {}, nEr = bk.filter(function (q) { var s = q.id && qst[q.id]; return s && s.er > 0 && s.ult === 0; }).length;
        h += '<div class="vgs-monte"><div><b>🎲 Monte seu simulado</b><span>Combine temas, filtre só questões de prova, inéditas ou as que você errou (' + bk.length + ' questões no banco' + (nEr ? ' · ' + nEr + ' para corrigir' : '') + ').</span></div>' +
          '<button class="vgs-b pri" type="button" data-vgs="monte">Montar simulado</button></div>';
      }
      (cfg.grupos || []).forEach(function (g) {
        if (!(g.itens || []).length) return;
        h += '<h3 class="vgs-gh">' + esc(g.titulo) + '</h3>' + (g.sub ? '<p class="vgs-gs">' + g.sub + '</p>' : '') + '<div class="vgs-cards">';
        g.itens.forEach(function (it) {
          var n = nQ(it), r = (db.res || {})[it.id], hi = (db.hist || {})[it.id] || [], and = run && run.id === it.id && !run.done;
          var best = hi.reduce(function (m, x) { return Math.max(m, x.p || 0); }, r ? r.p : 0);
          var resTxt = r ? (hi.length > 1 ? 'Última: ' + r.p + '% · Melhor: ' + best + '% (' + hi.length + '×)' : 'Última nota: ' + r.p + '% · ' + r.d) : '';
          h += '<div class="vgs-card">' + (it.tag ? '<small>' + esc(it.tag) + '</small>' : '') + '<b>' + esc(it.titulo) + '</b>' +
            (it.desc ? '<span>' + it.desc + '</span>' : '') +
            (n ? '<small>' + n + ' questões · ' + Math.round(n * SEG / 60) + ' min</small>' : '') +
            (resTxt ? '<span class="vgs-res">' + resTxt + '</span>' : '') +
            '<div class="vgs-acts"><button class="vgs-b pri" type="button" data-vgs="abrir" data-id="' + esc(it.id) + '">' + (and ? 'Continuar' : 'Começar') + '</button></div></div>';
        });
        h += '</div>';
      });
      return h;
    }
    function opc(k, v, tag, t, d) {
      return '<button type="button" class="vgs-card' + (pref[k] === v ? ' on' : '') + '" data-vgs="pref" data-k="' + k + '" data-v="' + v + '" aria-pressed="' + (pref[k] === v) + '"><small>' + tag + '</small><b>' + t + '</b><span>' + d + '</span></button>';
    }
    function tPick() {
      var n = qs.length;
      return '<div class="vgs-crumb">' + esc(item.titulo) + ' · ' + n + ' questões · ' + Math.round(n * SEG / 60) + ' min</div>' +
        '<h2 class="vgs-h">Como você quer fazer?</h2><p class="vgs-p">Escolha antes de começar. O cronômetro (3 minutos por questão) só começa depois da escolha.</p>' +
        '<div class="vgs-sec">Entrega</div><div class="vgs-g2">' +
        opc('modo', 'f', 'Como na prova', 'Simular a prova', 'Você responde tudo sem ver o gabarito e entrega a prova inteira. A nota e a correção comentada vêm de uma vez.') +
        opc('modo', 'q', 'Treino', 'Entregar por questão', 'Você marca a alternativa e entrega a questão. Na hora aparece se acertou e o comentário. A questão entregue não muda mais. No fim ainda sai a nota.') +
        '</div><div class="vgs-sec">Questões na tela</div><div class="vgs-g2">' +
        opc('vista', 'p', 'Folha de prova', 'Prova inteira na página', 'Todas as questões em sequência, rolando a página.') +
        opc('vista', 'u', 'Foco', 'Uma questão por vez', 'Uma questão na tela, com Anterior, Próxima e a grade numerada.') +
        '</div><div class="vgs-acts"><button class="vgs-b pri" type="button" data-vgs="ir">Começar</button>' +
        (!unico ? '<button class="vgs-b" type="button" data-vgs="lista">Voltar</button>' : cfg.voltar ? '<button class="vgs-b" type="button" data-vgs="voltar">Voltar</button>' : '') +
        (cfg.livre ? '<button class="vgs-b" type="button" data-vgs="livre">Estudar sem cronômetro</button>' : '') + '</div>';
    }
    function tQ(i, fim) {
      var q = qs[i], a = run.ans[i], dn = fim || !!run.dn[i], gb = gabs(q), elim = (run.elim && run.elim[i]) || {}, h;
      h = '<div class="vgs-q" id="vgs-q-' + i + '"><div class="vgs-qh"><span class="vgs-n">' + (i + 1) + '</span>' + (q.tag ? '<span class="vgs-tag">' + q.tag + '</span>' : '') +
        (dn ? (!gb.length ? '' : certa(q, a) ? '<span class="vgs-st ok">Certa</span>' : '<span class="vgs-st no">' + (a == null ? 'Em branco' : 'Errada') + '</span>') : '') + (dn && q.grupo ? '<span class="vgs-tag">' + esc(q.grupo) + '</span>' : '') + '</div>' +
        '<div class="vgs-en">' + q.enun + '</div><div class="vgs-alts">';
      (q.alts || []).forEach(function (t, j) {
        if (dn) h += '<div class="vgs-alt lock' + (gb.indexOf(j) >= 0 ? ' ok' : a === j ? ' bad' : '') + '"><span class="vgs-l">' + L[j] + '</span><span class="vgs-t">' + t + '</span></div>';
        else {
          var el = !!elim[j];
          h += '<div class="vgs-alt-row"><button type="button" class="vgs-alt' + (a === j ? ' sel' : '') + (el ? ' elim' : '') + '" data-vgs="alt" data-i="' + i + '" data-j="' + j + '" aria-pressed="' + (a === j) + '"><span class="vgs-l">' + L[j] + '</span><span class="vgs-t">' + t + '</span></button>' +
            '<button type="button" class="vgs-elim" data-vgs="elim" data-i="' + i + '" data-j="' + j + '" aria-pressed="' + el + '" aria-label="' + (el ? 'Restaurar alternativa ' : 'Riscar alternativa ') + L[j] + '" title="' + (el ? 'Restaurar alternativa' : 'Riscar alternativa (ou clique direito)') + '">✕</button></div>';
        }
      });
      h += '</div>';
      /* dissertativa: campo de texto com contador; a resposta ideal só aparece depois de entregar */
      var disc = !(q.alts || []).length, lim = q.lim || 500, tx = (run.txt || {})[i] || '';
      if (disc && !dn) h += '<textarea class="vgs-ta" data-i="' + i + '" maxlength="' + lim + '" rows="5" placeholder="Escreva a sua resposta" aria-label="Resposta da questão ' + (i + 1) + '">' + esc(tx) + '</textarea><div class="vgs-cc">' + tx.length + '/' + lim + '</div>';
      if (disc && dn && tx) h += '<div class="vgs-com"><p><b>Sua resposta</b></p><p class="vgs-pre">' + esc(tx) + '</p></div>';
      if (!fim) {
        h += '<div class="vgs-qf">';
        if (!dn && disc) h += run.modo === 'q' ? '<button class="vgs-b pri sm" type="button" data-vgs="entq" data-i="' + i + '">Ver a resposta ideal</button>' : '';
        else if (!dn && run.modo === 'q') h += '<button class="vgs-b pri sm" type="button" data-vgs="entq" data-i="' + i + '"' + (a == null ? ' disabled' : '') + '>Entregar esta questão</button>';
        if (!dn && !disc) h +='<button class="vgs-b sm" type="button" data-vgs="limpa" data-i="' + i + '"' + (a == null ? ' disabled' : '') + '>Limpar resposta</button>';
        h += '<button class="vgs-b sm" type="button" data-vgs="flag" data-i="' + i + '">' + (run.flag[i] ? 'Desmarcar revisão' : 'Marcar para revisar') + '</button></div>';
      }
      if (dn) {
        var c = com(q, a);
        var cx = (!disc && window.VGCorrecao && String(c).indexOf('vg-cor') < 0 && (q.porque || VGCorrecao.tem(q))) ? VGCorrecao.bloco(q, { pick: a }) : '';
        if (c || cx) h += '<div class="vgs-com">' + (disc ? '<p><b>Resposta ideal</b></p>' : '') + c + cx + '</div>';
        if (disc) {
          var da = (run.dAuto || {})[i] || '';
          h += '<div class="vgs-dauto"><span>Como você se saiu?</span>' +
            '<button type="button" class="' + (da === 'ok' ? 'on-ok' : '') + '" data-vgs="dauto" data-i="' + i + '" data-v="ok" aria-pressed="' + (da === 'ok') + '">✓ Acertei</button>' +
            '<button type="button" class="' + (da === 'par' ? 'on-par' : '') + '" data-vgs="dauto" data-i="' + i + '" data-v="par" aria-pressed="' + (da === 'par') + '">◐ Parcial</button>' +
            '<button type="button" class="' + (da === 'no' ? 'on-no' : '') + '" data-vgs="dauto" data-i="' + i + '" data-v="no" aria-pressed="' + (da === 'no') + '">✗ Errei</button></div>';
        }
      }
      if (fim) h += '<div class="vgs-qf"><button class="vgs-b sm vgs-up" type="button" data-vgs="grade">↑ Voltar ao gabarito</button></div>';
      return h + '</div>';
    }
    function tGrade() {
      var h = '<div class="vgs-grid">';
      qs.forEach(function (q, k) {
        var c = run.dn[k] ? (!gabs(q).length ? 'ans' : certa(q, run.ans[k]) ? 'rt' : 'wr') : run.ans[k] != null ? 'ans' : '';
        h += '<button type="button" class="' + c + (run.vista === 'u' && k === run.i ? ' cur' : '') + (run.flag[k] ? ' flag' : '') + '" data-vgs="vai" data-i="' + k + '" aria-label="Questão ' + (k + 1) + '">' + (k + 1) + '</button>';
      });
      return h + '</div>';
    }
    function conta() {
      var r = Object.keys(run.ans).length, f = 0, d = 0, k;
      for (k in run.flag) if (run.flag[k]) f++;
      for (k in run.dn) if (run.dn[k]) d++;
      for (k in (run.txt || {})) if (run.txt[k] && run.ans[k] == null) r++;
      return (run.modo === 'q' ? d + ' de ' + qs.length + ' entregues · ' : '') + r + ' de ' + qs.length + ' respondidas' + (f ? ' · ' + f + ' para revisar' : '');
    }
    function tRun() {
      var h = '<div class="vgs-crumb">' + esc(run.titulo || item.titulo) + ' · ' + (run.modo === 'q' ? 'entrega por questão' : 'simulando a prova') + '</div>' +
        '<div class="vgs-bar"><span class="vgs-tm">--:--</span><span class="vgs-ct">' + conta() + '</span>' +
        (window.VGValores ? '<button class="vgs-b sm" type="button" data-vgs="val" title="Abrir tabela de valores de referência (Alt+V)">🧪 Valores</button>' : '') +
        '<button class="vgs-b sm" type="button" data-vgs="sair">Abandonar</button><button class="vgs-b pri sm" type="button" data-vgs="fim">' + (run.modo === 'q' ? 'Encerrar e ver a nota' : 'Entregar prova') + '</button></div>' + tGrade();
      if (run.vista === 'u') {
        h += '<div class="vgs-qs">' + tQ(run.i) + '</div><div class="vgs-acts"><button class="vgs-b" type="button" data-vgs="ant"' + (run.i === 0 ? ' disabled' : '') + '>Anterior</button>' +
          '<button class="vgs-b" type="button" data-vgs="prox"' + (run.i === qs.length - 1 ? ' disabled' : '') + '>Próxima</button></div>' +
          '<p class="vgs-kbd">Teclado: A–D ou 1–4 marcam · ← / → navegam · F marca revisão' + (run.modo === 'q' ? ' · Enter entrega' : '') + ' · botão direito risca alternativa</p>';
      } else {
        h += '<div class="vgs-qs">'; qs.forEach(function (q, k) { h += tQ(k); });
        h += '</div><div class="vgs-acts"><button class="vgs-b pri" type="button" data-vgs="fim">' + (run.modo === 'q' ? 'Encerrar e ver a nota' : 'Entregar prova') + '</button></div>';
      }
      return h;
    }
    function placar() {
      var ok = 0, val = 0, br = 0, g = {}, err = [], cer = [];
      qs.forEach(function (q, k) {
        if (!gabs(q).length) return;
        val++; var a = run.ans[k], c = certa(q, a);
        if (c) { ok++; cer.push(q.id); } else err.push(q.id);
        if (a == null) br++;
        if (q.grupo) { (g[q.grupo] = g[q.grupo] || [0, 0])[1]++; if (c) g[q.grupo][0]++; }
      });
      return { ok: ok, total: val, brancas: br, pct: val ? Math.round(ok / val * 100) : 0, grupos: g, erradas: err, certas: cer };
    }
    /* grade do resultado: a letra que a pessoa marcou em cada questão, verde se acertou, vermelho se errou;
       tocar leva à questão na correção comentada */
    function tGradeFim() {
      var h = '<div class="vgs-sec" id="vgs-gf-top">Seu gabarito</div><div class="vgs-gf">';
      qs.forEach(function (q, k) {
        var a = run.ans[k], disc = !(q.alts || []).length, c, l, d;
        if (disc) {
          var da = (run.dAuto || {})[k] || '';
          c = da === 'ok' ? 'rt' : da === 'par' ? 'pr' : da === 'no' ? 'wr' : 'ds';
          l = da === 'ok' ? '✓' : da === 'par' ? '◐' : da === 'no' ? '✗' : ((run.txt || {})[k] ? '✎' : '—');
          d = 'dissertativa' + (da ? ' (' + ({ ok: 'acertei', par: 'parcial', no: 'errei' }[da]) + ')' : '');
        }
        else if (!gabs(q).length) { c = 'ds'; l = a == null ? '—' : L[a]; d = 'sem gabarito'; }
        else if (a == null) { c = 'br'; l = '—'; d = 'em branco'; }
        else { c = certa(q, a) ? 'rt' : 'wr'; l = L[a]; d = certa(q, a) ? 'certa' : 'errada'; }
        h += '<button type="button" class="' + c + '" data-vgs="verq" data-i="' + k + '" aria-label="Questão ' + (k + 1) + ': marcou ' + (l === '—' ? 'nada' : l) + ', ' + d + '"><small>' + (k + 1) + '</small><b>' + l + '</b></button>';
      });
      return h + '</div><div class="vgs-leg"><span><i style="background:color-mix(in srgb,var(--s-ok) 26%,transparent);border-color:var(--s-ok)"></i>Acertou</span><span><i style="background:color-mix(in srgb,var(--s-bad) 24%,transparent);border-color:var(--s-bad)"></i>Errou</span><span><i style="border:1px dashed var(--s-bad)"></i>Em branco</span><span>Toque numa questão para ver a correção</span></div>';
    }
    function passaFiltro(q, k) {
      if (filtTema && q.grupo !== filtTema) return false;
      if (filt === 'err') return gabs(q).length ? !certa(q, run.ans[k]) : (run.dAuto || {})[k] === 'no';
      if (filt === 'br') return gabs(q).length ? run.ans[k] == null : !((run.txt || {})[k] || '').trim();
      if (filt === 'flag') return !!run.flag[k];
      return true;
    }
    function temHistAcumulado() {
      var hi = db.hist || {}, tot = 0;
      Object.keys(hi).forEach(function (k) { tot += (hi[k] || []).length; });
      return tot >= 2;
    }
    function tEnd() {
      var p = placar(), over = run.used > total(), gk = Object.keys(p.grupos), h;
      var hi = (!run.soErradas && db.hist && db.hist[item.id]) || [];
      var nErr = errIdx().length, nFlag = Object.keys(run.flag || {}).filter(function (k) { return run.flag[k]; }).length;
      h = '<div class="vgs-crumb">' + esc(run.titulo || item.titulo) + ' · resultado</div>' +
        '<div class="vgs-nota"><b>' + p.pct + '%</b><span>' + p.ok + ' de ' + p.total + ' certas' + (p.brancas ? ' · ' + p.brancas + ' em branco' : '') +
        '</span><span>Tempo: ' + mmss(run.used) + ' de ' + mmss(total()) + (over ? ' (estourou)' : '') + '</span></div>';
      if (hi.length > 1) {
        h += '<div class="vgs-hist"><span>Evolução (' + hi.length + ' tentativas):</span><b>' + hi.slice(-6).map(function (x) { return x.p + '%'; }).join(' → ') + '</b></div>';
      }
      h += tGradeFim();
      if (qs.length > p.total) h += '<p class="vgs-p">' + (qs.length - p.total) + ' questão(ões) sem gabarito objetivo ficaram fora da nota: confira pelo comentário e faça sua autoavaliação abaixo.</p>';
      if (gk.length > 1 && gk.length <= p.total / 2) {
        h += '<div class="vgs-sec">Desempenho por tema <small style="font-weight:400;opacity:.7">(clique num tema para filtrar a correção)</small></div><table class="vgs-tab"><tr><td><b>Tema</b></td><td><b>Acertos</b></td><td><b>% de erro</b></td></tr>';
        gk.sort(function (x, y) { return p.grupos[x][0] / p.grupos[x][1] - p.grupos[y][0] / p.grupos[y][1]; }).forEach(function (k) {
          var v = p.grupos[k], on = filtTema === k;
          h += '<tr class="clic' + (on ? ' on' : '') + '" data-vgs="ftema" data-tema="' + esc(k) + '"><td>' + esc(k) + '</td><td>' + v[0] + ' de ' + v[1] + '</td><td>' + Math.round((v[1] - v[0]) / v[1] * 100) + '%</td></tr>';
        });
        h += '</table>';
      }
      h += '<div class="vgs-acts" style="margin:0 0 18px"><button class="vgs-b pri" type="button" data-vgs="refaz">Refazer</button>' +
        (nErr > 0 && nErr < qs.length ? '<button class="vgs-b" type="button" data-vgs="refazerr">Refazer só as erradas (' + nErr + ')</button>' : '') +
        (gk.length ? '<button class="vgs-b" type="button" data-vgs="copiar">Copiar resultado</button>' : '') +
        (temHistAcumulado() ? '<button class="vgs-b" type="button" data-vgs="copiarhist">Copiar histórico acumulado</button>' : '') +
        (unico && !cfg.voltar ? '<button class="vgs-b" type="button" data-vgs="fechar">Voltar ao início</button>' : '<button class="vgs-b" type="button" data-vgs="fechar">Voltar aos simulados</button>') + '</div>' +
        '<div class="vgs-sec">Correção comentada</div><div class="vgs-filt" role="group" aria-label="Filtrar questões da correção">' +
        '<button type="button" data-vgs="filt" data-f="all" aria-pressed="' + (filt === 'all' && !filtTema) + '">Todas (' + qs.length + ')</button>' +
        (nErr ? '<button type="button" data-vgs="filt" data-f="err" aria-pressed="' + (filt === 'err') + '">Só erradas (' + nErr + ')</button>' : '') +
        (p.brancas ? '<button type="button" data-vgs="filt" data-f="br" aria-pressed="' + (filt === 'br') + '">Em branco (' + p.brancas + ')</button>' : '') +
        (nFlag ? '<button type="button" data-vgs="filt" data-f="flag" aria-pressed="' + (filt === 'flag') + '">Marcadas 🚩 (' + nFlag + ')</button>' : '') +
        (filtTema ? '<button type="button" data-vgs="ftema" data-tema="" aria-pressed="true">Tema: ' + esc(filtTema) + ' ✕</button>' : '') +
        '</div>';
      var mostradas = 0;
      qs.forEach(function (q, k) { if (passaFiltro(q, k)) { mostradas++; h += tQ(k, true); } });
      if (!mostradas) h += '<p class="vgs-p">Nenhuma questão nesse filtro. <button type="button" class="vgs-b sm" data-vgs="filt" data-f="all">Ver todas</button></p>';
      return h;
    }
    /* texto do resultado por tema, para colar no pedido do próximo simulado (banco de desempenho) */
    function resTexto() {
      var p = placar(), t = 'Resultado · ' + (run.titulo || item.titulo) + ' · ' + new Date().toLocaleDateString('pt-BR') + '\nNota: ' + p.ok + ' de ' + p.total + ' (' + p.pct + '%)\nTema | Feitas | Acertos | Erros | % erro';
      Object.keys(p.grupos).forEach(function (k) { var v = p.grupos[k]; t += '\n' + k + ' | ' + v[1] + ' | ' + v[0] + ' | ' + (v[1] - v[0]) + ' | ' + Math.round((v[1] - v[0]) / v[1] * 100) + '%'; });
      var da = run.dAuto || {}, dk = Object.keys(da);
      if (dk.length) {
        var cOk = 0, cPar = 0, cNo = 0;
        dk.forEach(function (k) { if (da[k] === 'ok') cOk++; else if (da[k] === 'par') cPar++; else if (da[k] === 'no') cNo++; });
        t += '\nDissertativas (autoavaliação): ' + cOk + ' certas · ' + cPar + ' parciais · ' + cNo + ' erradas';
      }
      return t;
    }
    function histTexto() {
      var hi = db.hist || {}, g = {}, totOk = 0, totQ = 0, nTent = 0;
      Object.keys(hi).forEach(function (id) {
        (hi[id] || []).forEach(function (e) {
          nTent++; totOk += e.ok || 0; totQ += e.t || 0;
          Object.keys(e.g || {}).forEach(function (tm) {
            var v = e.g[tm];
            if (!g[tm]) g[tm] = [0, 0];
            g[tm][0] += v[0]; g[tm][1] += v[1];
          });
        });
      });
      var pct = totQ ? Math.round(totOk / totQ * 100) : 0;
      var t = 'Histórico acumulado (' + nTent + ' tentativas) · ' + new Date().toLocaleDateString('pt-BR') + '\nTotal: ' + totOk + ' de ' + totQ + ' (' + pct + '%)\nTema | Feitas | Acertos | Erros | % erro';
      Object.keys(g).sort(function (a, b) { return g[a][0] / g[a][1] - g[b][0] / g[b][1]; }).forEach(function (k) {
        var v = g[k]; t += '\n' + k + ' | ' + v[1] + ' | ' + v[0] + ' | ' + (v[1] - v[0]) + ' | ' + Math.round((v[1] - v[0]) / v[1] * 100) + '%';
      });
      return t;
    }
    function copiarTxt(b, t, rot) {
      var ok = function () { b.textContent = rot || 'Resultado copiado'; };
      var velho = function () { var a = document.createElement('textarea'); a.value = t; document.body.appendChild(a); a.select(); try { document.execCommand('copy'); ok(); } catch (e) { } a.remove(); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(ok, velho); else velho();
    }
    function tMonte() {
      var ts = temasBanco(), disp = filtrarBanco(), selN = Object.keys(mc.temas).filter(function (k) { return mc.temas[k]; }).length;
      var bk = banco(), qst = db.qst || {};
      var nPv = bk.filter(ehProva).length;
      var nEr = bk.filter(function (q) { var s = q.id && qst[q.id]; return s && s.er > 0 && s.ult === 0; }).length;
      var nNov = bk.filter(function (q) { return !(q.id && qst[q.id]); }).length;
      var modBtn = function (k, rot) { return '<button type="button" data-vgs="mmodo" data-v="' + k + '" aria-pressed="' + (mc.modo === k) + '">' + rot + '</button>'; };
      var qBtn = function (n, rot) { return '<button type="button" data-vgs="mqtd" data-v="' + n + '" aria-pressed="' + (mc.qtd === n) + '">' + rot + '</button>'; };
      var h = '<div class="vgs-crumb">Simulado personalizado</div><h2 class="vgs-h">🎲 Monte seu simulado</h2>' +
        '<p class="vgs-p">Escolha os filtros abaixo. O cronômetro segue o padrão (3 min por questão) e só começa depois de escolher o modo.</p>' +
        '<div class="vgs-sec">Quais questões</div><div class="vgs-mchips">' +
        modBtn('all', 'Todas (' + bk.length + ')') +
        (nPv ? modBtn('prova', '📝 Só de prova (' + nPv + ')') : '') +
        modBtn('err', '✗ Só as que errei (' + nEr + ')') +
        modBtn('nov', '✨ Inéditas (' + nNov + ')') + '</div>';
      if (ts.length > 1) {
        h += '<div class="vgs-sec">Temas / provas <small style="font-weight:400;opacity:.7">(' + (selN ? selN + ' selecionado(s)' : 'todos incluídos') + ')</small></div>' +
          '<div class="vgs-mchips">' +
          ts.map(function (t) { return '<button type="button" data-vgs="mtema" data-v="' + esc(t.k) + '" aria-pressed="' + (!!mc.temas[t.k]) + '">' + esc(t.k) + ' (' + t.n + ')</button>'; }).join('') +
          (selN ? '<button type="button" data-vgs="mlimpa">Limpar temas</button>' : '') + '</div>';
      }
      var eff = mc.qtd === 0 ? disp.length : Math.min(mc.qtd, disp.length);
      h += '<div class="vgs-sec">Quantidade</div><div class="vgs-mchips">' +
        qBtn(10, '10') + qBtn(15, '15') + qBtn(20, '20') + qBtn(30, '30') + qBtn(0, 'Todas (' + disp.length + ')') + '</div>' +
        '<p class="vgs-mres"><b>' + disp.length + '</b> questão(ões) disponível(is) · o simulado terá <b>' + eff + '</b> (' + Math.round(eff * SEG / 60) + ' min)</p>' +
        '<div class="vgs-acts"><button class="vgs-b pri" type="button" data-vgs="mir"' + (eff ? '' : ' disabled') + '>Continuar</button>' +
        '<button class="vgs-b" type="button" data-vgs="lista">Voltar</button></div>';
      return h;
    }
    function tLivre() {
      return '<div class="vgs-livre"><span>Estudando sem cronômetro: as questões estão abaixo, com o gabarito de cada uma.</span><button class="vgs-b pri sm" type="button" data-vgs="simular">Fazer como simulado</button></div>';
    }

    /* ---------- desenho ---------- */
    function relogio() {
      clearInterval(tick);
      if (tela !== 'run') return;
      var f = function () {
        var el = host.querySelector('.vgs-tm');
        if (!el || !host.isConnected) return clearInterval(tick);
        var r = total() - Math.floor((Date.now() - run.t0) / 1000);
        el.textContent = r >= 0 ? mmss(r) : '+' + mmss(r) + ' tempo estourado';
        el.classList.toggle('over', r < 0);
      };
      f(); tick = setInterval(f, 1000);
    }
    function desenhar(topo) {
      host.innerHTML = livreOn ? tLivre() : tela === 'monte' ? tMonte() : tela === 'pick' ? tPick() : tela === 'run' ? tRun() : tela === 'end' ? tEnd() : tLista();
      relogio();
      if (cfg.aoDesenhar) try { cfg.aoDesenhar(host, tela); } catch (e) { }
      if (topo) try { host.scrollIntoView({ block: 'start' }); } catch (e) { }
    }
    function upQ(i) {
      var el = host.querySelector('#vgs-q-' + i), t; if (!el) return;
      t = document.createElement('div'); t.innerHTML = tQ(i, tela === 'end'); el.parentNode.replaceChild(t.firstChild, el);
      var g = host.querySelector('.vgs-grid'); if (g) { t.innerHTML = tGrade(); g.parentNode.replaceChild(t.firstChild, g); }
      var gf = host.querySelector('.vgs-gf'); if (gf) { var d = document.createElement('div'); d.innerHTML = tGradeFim(); gf.parentNode.replaceChild(d.querySelector('.vgs-gf'), gf); }
      var c = host.querySelector('.vgs-ct'); if (c) c.textContent = conta();
      if (cfg.aoDesenhar) try { cfg.aoDesenhar(host, tela); } catch (e) { }
    }
    function irPara(i) {
      run.i = Math.max(0, Math.min(qs.length - 1, i)); salvar();
      if (run.vista === 'u') desenhar(true);
      else { var el = host.querySelector('#vgs-q-' + run.i); if (el) el.scrollIntoView({ block: 'start', behavior: 'smooth' }); }
    }
    function abrir(it) { item = it; qs = resolver(it); if (!qs.length) return; filt = 'all'; filtTema = ''; tela = 'pick'; desenhar(true); }
    function comecar(subQs, subTitulo) {
      var custom = Array.isArray(subQs) && subQs.length;
      if (custom) qs = subQs;
      run = { id: item.id, titulo: subTitulo || item.titulo, modo: pref.modo, vista: pref.vista, ans: {}, flag: {}, dn: {}, elim: {}, dAuto: {}, i: 0, t0: Date.now() };
      if (item.sorteio || custom) run.qs = qs;
      if (custom) run.soErradas = true;
      filt = 'all'; filtTema = ''; tela = 'run'; salvar(); desenhar(true);
    }
    function entregar() {
      var br = qs.length - Object.keys(run.ans).length;
      if (!confirm((br ? br + ' em branco. ' : '') + (run.modo === 'q' ? 'Encerrar e ver a nota?' : 'Entregar a prova agora?'))) return;
      run.used = Math.floor((Date.now() - run.t0) / 1000); run.done = true; tela = 'end'; filt = 'all'; filtTema = '';
      var p = placar(), dataHoje = new Date().toLocaleDateString('pt-BR');
      /* registra desempenho por questão (alimenta "Só as que errei" e "Inéditas" no Monte seu simulado) */
      db.qst = db.qst || {};
      qs.forEach(function (q, k) {
        if (!q.id || !gabs(q).length) return;
        var st = db.qst[q.id] || { ok: 0, er: 0, ult: 0 };
        if (certa(q, run.ans[k])) { st.ok++; st.ult = 1; } else { st.er++; st.ult = 0; }
        db.qst[q.id] = st;
      });
      if (!run.soErradas && item.id !== '__custom') {
        db.res = db.res || {}; db.res[item.id] = { p: p.pct, ok: p.ok, t: p.total, d: dataHoje };
        db.hist = db.hist || {}; db.hist[item.id] = db.hist[item.id] || [];
        db.hist[item.id].push({ p: p.pct, ok: p.ok, t: p.total, d: dataHoje, used: run.used, g: p.grupos });
        if (db.hist[item.id].length > 15) db.hist[item.id] = db.hist[item.id].slice(-15);
      }
      salvar(); desenhar(true);
      if (cfg.aoFim) try { cfg.aoFim({ id: item.id, titulo: run.titulo || item.titulo, ok: p.ok, total: p.total, pct: p.pct, erradas: p.erradas, certas: p.certas }); } catch (e) { }
    }
    function largar() { run = null; filt = 'all'; filtTema = ''; salvar(); if (cfg.voltar) return cfg.voltar(); tela = unico ? 'pick' : 'lista'; if (unico) qs = resolver(item); desenhar(true); }
    function toggleElim(i, j) {
      if (!run || run.dn[i] || tela !== 'run') return;
      run.elim = run.elim || {}; run.elim[i] = run.elim[i] || {};
      if (run.elim[i][j]) delete run.elim[i][j]; else run.elim[i][j] = 1;
      salvar(); upQ(i);
    }

    host.addEventListener('contextmenu', function (e) {
      var b = e.target.closest('[data-vgs="alt"]');
      if (!b || !host.contains(b) || tela !== 'run') return;
      e.preventDefault();
      toggleElim(+b.getAttribute('data-i'), +b.getAttribute('data-j'));
    });

    host.addEventListener('click', function (e) {
      var b = e.target.closest('[data-vgs]'); if (!b || !host.contains(b) || b.disabled) return;
      var a = b.getAttribute('data-vgs'), i = +b.getAttribute('data-i');
      if (a === 'abrir') {
        var it = achar(b.getAttribute('data-id')); if (!it) return;
        if (it.ir) return it.ir(); /* cartão que leva ao simulado em outra página do master */
        if (run && run.id === it.id && !run.done) { item = it; qs = run.qs || resolver(it); tela = 'run'; desenhar(true); }
        else abrir(it);
      }
      else if (a === 'pref') { pref[b.getAttribute('data-k')] = b.getAttribute('data-v'); salvar(); desenhar(); }
      else if (a === 'monte') { tela = 'monte'; desenhar(true); }
      else if (a === 'mmodo') { mc.modo = b.getAttribute('data-v') || 'all'; desenhar(); }
      else if (a === 'mtema') { var tv = b.getAttribute('data-v'); if (mc.temas[tv]) delete mc.temas[tv]; else mc.temas[tv] = 1; desenhar(); }
      else if (a === 'mlimpa') { mc.temas = {}; desenhar(); }
      else if (a === 'mqtd') { mc.qtd = +b.getAttribute('data-v'); desenhar(); }
      else if (a === 'mir') {
        var disp = embaralhar(filtrarBanco()), n = mc.qtd === 0 ? disp.length : Math.min(mc.qtd, disp.length);
        if (!n) return;
        var escQs = disp.slice(0, n);
        item = { id: '__custom', titulo: 'Simulado personalizado (' + n + ' questões)', qs: escQs, sorteio: true };
        qs = escQs; filt = 'all'; filtTema = ''; tela = 'pick'; desenhar(true);
      }
      else if (a === 'lista') { tela = 'lista'; desenhar(true); }
      else if (a === 'voltar') cfg.voltar();
      else if (a === 'ir') comecar();
      else if (a === 'livre') { livreOn = true; desenhar(); cfg.livre(true); }
      else if (a === 'simular') { livreOn = false; desenhar(true); cfg.livre(false); }
      else if (a === 'alt') { if (run.dn[i]) return; var j = +b.getAttribute('data-j'); run.ans[i] = j; run.i = i; if (run.elim && run.elim[i]) delete run.elim[i][j]; salvar(); upQ(i); }
      else if (a === 'elim') toggleElim(i, +b.getAttribute('data-j'));
      else if (a === 'limpa') { delete run.ans[i]; salvar(); upQ(i); }
      else if (a === 'flag') { run.flag[i] = !run.flag[i]; salvar(); upQ(i); }
      else if (a === 'entq') { if (run.ans[i] == null && (qs[i].alts || []).length) return; run.dn[i] = 1; salvar(); upQ(i); }
      else if (a === 'dauto') { run.dAuto = run.dAuto || {}; var v = b.getAttribute('data-v'); run.dAuto[i] = run.dAuto[i] === v ? '' : v; salvar(); upQ(i); }
      else if (a === 'vai') irPara(i);
      else if (a === 'ant') irPara(run.i - 1);
      else if (a === 'prox') irPara(run.i + 1);
      else if (a === 'fim') entregar();
      else if (a === 'val') { if (window.VGValores) VGValores.abrir(); }
      else if (a === 'sair') { if (confirm('Abandonar este simulado? As respostas serão apagadas.')) largar(); }
      else if (a === 'refaz') { run = null; salvar(); abrir(item); }
      else if (a === 'refazerr') {
        var sub = errIdx().map(function (k) { return qs[k]; });
        if (sub.length) comecar(sub, item.titulo + ' · só as erradas');
      }
      else if (a === 'fechar') largar();
      else if (a === 'copiar') copiarTxt(b, resTexto(), 'Resultado copiado');
      else if (a === 'copiarhist') copiarTxt(b, histTexto(), 'Histórico copiado');
      else if (a === 'filt') { filt = b.getAttribute('data-f') || 'all'; if (filt === 'all') filtTema = ''; desenhar(); }
      else if (a === 'ftema') { var tm = b.getAttribute('data-tema') || ''; filtTema = filtTema === tm ? '' : tm; desenhar(); }
      else if (a === 'verq') {
        var el = host.querySelector('#vgs-q-' + i);
        if (!el && (filt !== 'all' || filtTema)) { filt = 'all'; filtTema = ''; desenhar(); el = host.querySelector('#vgs-q-' + i); }
        if (el) { el.scrollIntoView({ block: 'start', behavior: 'smooth' }); el.classList.remove('vgs-flash'); void el.offsetWidth; el.classList.add('vgs-flash'); }
      }
      else if (a === 'grade') { var gt = host.querySelector('#vgs-gf-top'); if (gt) gt.scrollIntoView({ block: 'start', behavior: 'smooth' }); }
    });
    document.addEventListener('keydown', function (e) {
      if (tela !== 'run' || !run || run.vista !== 'u' || !host.isConnected || host.offsetParent === null) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      var t = e.target;
      if (t && t.closest && t.closest('input,textarea,select,[contenteditable]')) return;
      var q = qs[run.i]; if (!q) return;
      var k = e.key;
      if (k === 'ArrowLeft') { if (run.i > 0) { e.preventDefault(); irPara(run.i - 1); } return; }
      if (k === 'ArrowRight') { if (run.i < qs.length - 1) { e.preventDefault(); irPara(run.i + 1); } return; }
      if (k === 'f' || k === 'F') { e.preventDefault(); run.flag[run.i] = !run.flag[run.i]; salvar(); upQ(run.i); return; }
      if (k === 'Enter' && run.modo === 'q' && !run.dn[run.i] && (run.ans[run.i] != null || !(q.alts || []).length)) {
        e.preventDefault(); run.dn[run.i] = 1; salvar(); upQ(run.i); return;
      }
      if (!run.dn[run.i] && (q.alts || []).length) {
        var idx = -1;
        if (/^[1-8]$/.test(k)) idx = +k - 1;
        else if (/^[a-h]$/i.test(k)) idx = L.indexOf(k.toUpperCase());
        if (idx >= 0 && idx < q.alts.length) {
          e.preventDefault(); run.ans[run.i] = idx;
          if (run.elim && run.elim[run.i]) delete run.elim[run.i][idx];
          salvar(); upQ(run.i);
        }
      }
    });
    host.addEventListener('input', function (e) {
      var t = e.target; if (!t.classList || !t.classList.contains('vgs-ta') || !run) return;
      run.txt = run.txt || {}; run.txt[+t.getAttribute('data-i')] = t.value; salvar();
      var c = t.nextElementSibling; if (c) c.textContent = t.value.length + '/' + t.getAttribute('maxlength');
      c = host.querySelector('.vgs-ct'); if (c) c.textContent = conta();
    });

    /* retoma o simulado em andamento (ou o resultado ainda aberto) */
    if (unico) { item = itens[0]; qs = resolver(item); tela = 'pick'; }
    if (db.run) {
      var it0 = db.run.id === '__custom' && db.run.qs ? { id: '__custom', titulo: db.run.titulo || 'Simulado personalizado', qs: db.run.qs, sorteio: true } : achar(db.run.id);
      if (it0) { run = db.run; item = it0; qs = run.qs || resolver(it0); tela = run.done ? 'end' : 'run'; if (!qs.length) { run = null; tela = unico ? 'pick' : 'lista'; } }
      else if (unico) { /* andamento de outra página da mesma matéria: fica guardado */ }
    }
    S.desenhar = desenhar;
    S.livre = function () { if (cfg.livre && !livreOn && tela !== 'run') { livreOn = true; desenhar(); cfg.livre(true); } };
    S.abrir = function (id) { var it = achar(id); if (it && !(run && !run.done)) abrir(it); };
    desenhar();
    if (livreOn === false && cfg.livre) cfg.livre(false);
  }

  window.VGSim = {
    esc: esc,
    lista: function (host, cfg) { return new Sessao(host, cfg); },
    um: function (host, cfg) {
      var c = {}; for (var k in cfg) c[k] = cfg[k];
      c.unico = true; c.grupos = [{ titulo: '', itens: [cfg.item] }];
      return new Sessao(host, c);
    },
    /* Lê uma questão já montada na página (padrão das aulas de Patologia: .q-stem, .opt-text, .q-why). */
    deArtigo: function (art) {
      var st = art.querySelector('.q-stem'), w = art.querySelector('.q-why'), src = art.querySelector('.q-source, .mon-fonte');
      if (w) { w = w.cloneNode(true); var v = w.querySelector('.q-verdict'); if (v) v.remove(); }
      return {
        enun: st ? st.innerHTML : '',
        alts: [].map.call(art.querySelectorAll('.opt .opt-text'), function (o) { return o.innerHTML; }),
        com: w ? w.innerHTML : '',
        tag: src ? esc(src.textContent) : ''
      };
    }
  };
})();
