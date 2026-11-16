/* Simulado padrão do site (todas as matérias).
   Lista de provas e simulados -> tela "Como você quer fazer?" -> prova com cronômetro -> nota e correção comentada.
   A pessoa escolhe a entrega (no final, como na prova / por questão, treino) e a tela (prova inteira / uma questão por vez).

   VGSim.lista(host, {chave, grupos:[{titulo, sub, itens:[item]}], aoFim})   aba "Simulados" de um master
   VGSim.um(host, {chave, item, livre(on), voltar(), aoFim})                 página de um simulado só (Patologia, Farmacologia, Microbiologia)
   item    = {id, tag, titulo, desc, qs: [questão] | função, sorteio: true se qs() muda a cada chamada}
   questão = {id, tag, enun (HTML), alts [HTML], gab (índice, lista de índices ou null), com (HTML | função), grupo}
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
    '.vgsim .vgs-card{display:flex;flex-direction:column;gap:6px;border:1px solid var(--s-ln);background:var(--s-bg);border-radius:18px;padding:16px 18px;color:inherit;font:inherit;text-align:left;margin:0;min-height:0;width:auto}' +
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
    '.vgsim .vgs-alt{appearance:none;display:flex;gap:12px;align-items:flex-start;width:100%;min-height:0;margin:0 0 8px;padding:11px 13px;border-radius:14px;border:1px solid var(--s-ln);background:transparent;color:inherit;font:inherit;font-size:15px;line-height:1.5;text-align:left;cursor:pointer;box-shadow:none}' +
    '.vgsim .vgs-alt .vgs-l{flex:none;display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:50%;border:1px solid var(--s-ln);font-weight:600;font-size:13px}' +
    '.vgsim .vgs-alt .vgs-t{flex:1;min-width:0;padding-top:2px}' +
    '.vgsim .vgs-alt.sel{border-color:var(--s-acc);background:color-mix(in srgb,var(--s-acc) 16%,transparent);box-shadow:inset 0 0 0 1px var(--s-acc)}' +
    '.vgsim .vgs-alt.sel .vgs-l{background:var(--s-acc);border-color:var(--s-acc);color:#fff}' +
    '.vgsim .vgs-alt.ok{border-color:var(--s-ok);background:color-mix(in srgb,var(--s-ok) 17%,transparent)}' +
    '.vgsim .vgs-alt.ok .vgs-l{background:var(--s-ok);border-color:var(--s-ok);color:#fff}' +
    '.vgsim .vgs-alt.bad{border-color:var(--s-bad);background:color-mix(in srgb,var(--s-bad) 15%,transparent)}' +
    '.vgsim .vgs-alt.bad .vgs-l{background:var(--s-bad);border-color:var(--s-bad);color:#fff}' +
    '.vgsim .vgs-alt.lock{cursor:default}' +
    '.vgsim .vgs-qf{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:12px 0 0}' +
    '.vgsim .vgs-com{margin:14px 0 0;padding:14px 16px;border-radius:14px;background:var(--s-bg2);font-size:15px;line-height:1.6}' +
    '.vgsim .vgs-com p{margin:0 0 10px;max-width:none}.vgsim .vgs-com p:last-child{margin:0}' +
    '.vgsim .vgs-nota{display:flex;flex-wrap:wrap;gap:10px 26px;align-items:baseline;border:1px solid var(--s-ln);background:var(--s-bg);border-radius:20px;padding:18px 20px;margin:0 0 14px}' +
    '.vgsim .vgs-nota b{font-family:var(--vg-display,inherit);font-weight:400;font-size:44px;line-height:1}' +
    '.vgsim .vgs-tab{width:100%;border-collapse:collapse;margin:0 0 16px;font-size:14.5px;display:table}' +
    '.vgsim .vgs-tab td{padding:8px 10px 8px 0;border-bottom:1px solid var(--s-ln);background:transparent;color:inherit}' +
    '.vgsim .vgs-livre{display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between;border:1px solid var(--s-ln);background:var(--s-bg);border-radius:16px;padding:10px 14px;margin:0 0 18px;font-size:14px}' +
    '@media (max-width:700px){.vgsim .vgs-g2{grid-template-columns:1fr}.vgsim .vgs-q{padding:15px 14px;border-radius:16px}.vgsim .vgs-bar{top:4px;padding:8px 10px}.vgsim .vgs-tm{font-size:18px}.vgsim .vgs-grid button{width:32px;height:32px}}' +
    '@media print{.vgsim .vgs-bar,.vgsim .vgs-grid,.vgsim .vgs-acts{display:none}}';
  function estilo() {
    if (document.getElementById('vgsim-css')) return;
    var s = document.createElement('style'); s.id = 'vgsim-css'; s.textContent = CSS; document.head.appendChild(s);
  }

  function Sessao(host, cfg) {
    estilo();
    host.classList.add('vgsim');
    var S = this, db = ler(cfg.chave), itens = [], item = null, qs = [], run = null, tela = 'lista', tick = 0, livreOn = false;
    var pref = db.pref || { modo: 'f', vista: 'p' };
    (cfg.grupos || []).forEach(function (g) { (g.itens || []).forEach(function (it) { itens.push(it); }); });
    var unico = !!cfg.unico;

    function salvar() { db.pref = pref; db.run = run; gravar(cfg.chave, db); }
    function achar(id) { for (var k = 0; k < itens.length; k++) if (itens[k].id === id) return itens[k]; return null; }
    function resolver(it) { var q = typeof it.qs === 'function' ? it.qs() : it.qs; return (q || []).filter(Boolean); }
    function nQ(it) { if (it.n) return it.n; try { return it.sorteio ? 0 : resolver(it).length; } catch (e) { return 0; } }
    function total() { return qs.length * SEG; }
    function com(q, a) { try { return typeof q.com === 'function' ? q.com(a) : (q.com || ''); } catch (e) { return ''; } }

    /* ---------- telas ---------- */
    function tLista() {
      var h = cfg.intro ? '<p class="vgs-p">' + cfg.intro + '</p>' : '';
      (cfg.grupos || []).forEach(function (g) {
        if (!(g.itens || []).length) return;
        h += '<h3 class="vgs-gh">' + esc(g.titulo) + '</h3>' + (g.sub ? '<p class="vgs-gs">' + g.sub + '</p>' : '') + '<div class="vgs-cards">';
        g.itens.forEach(function (it) {
          var n = nQ(it), r = (db.res || {})[it.id], and = run && run.id === it.id && !run.done;
          h += '<div class="vgs-card">' + (it.tag ? '<small>' + esc(it.tag) + '</small>' : '') + '<b>' + esc(it.titulo) + '</b>' +
            (it.desc ? '<span>' + it.desc + '</span>' : '') +
            (n ? '<small>' + n + ' questões · ' + Math.round(n * SEG / 60) + ' min</small>' : '') +
            (r ? '<span class="vgs-res">Última nota: ' + r.p + '% · ' + r.d + '</span>' : '') +
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
      var q = qs[i], a = run.ans[i], dn = fim || !!run.dn[i], gb = gabs(q), h;
      h = '<div class="vgs-q" id="vgs-q-' + i + '"><div class="vgs-qh"><span class="vgs-n">' + (i + 1) + '</span>' + (q.tag ? '<span class="vgs-tag">' + q.tag + '</span>' : '') +
        (dn ? (!gb.length ? '' : certa(q, a) ? '<span class="vgs-st ok">Certa</span>' : '<span class="vgs-st no">' + (a == null ? 'Em branco' : 'Errada') + '</span>') : '') + '</div>' +
        '<div class="vgs-en">' + q.enun + '</div><div class="vgs-alts">';
      (q.alts || []).forEach(function (t, j) {
        if (dn) h += '<div class="vgs-alt lock' + (gb.indexOf(j) >= 0 ? ' ok' : a === j ? ' bad' : '') + '"><span class="vgs-l">' + L[j] + '</span><span class="vgs-t">' + t + '</span></div>';
        else h += '<button type="button" class="vgs-alt' + (a === j ? ' sel' : '') + '" data-vgs="alt" data-i="' + i + '" data-j="' + j + '" aria-pressed="' + (a === j) + '"><span class="vgs-l">' + L[j] + '</span><span class="vgs-t">' + t + '</span></button>';
      });
      h += '</div>';
      if (!fim) {
        h += '<div class="vgs-qf">';
        var disc = !(q.alts || []).length;
        if (!dn && disc) h += run.modo === 'q' ? '<button class="vgs-b pri sm" type="button" data-vgs="entq" data-i="' + i + '">Ver a resposta esperada</button>' : '<span class="vgs-tag">Discursiva: responda no papel; a resposta esperada aparece na correção</span>';
        else if (!dn && run.modo === 'q') h += '<button class="vgs-b pri sm" type="button" data-vgs="entq" data-i="' + i + '"' + (a == null ? ' disabled' : '') + '>Entregar esta questão</button>';
        if (!dn && !disc) h +='<button class="vgs-b sm" type="button" data-vgs="limpa" data-i="' + i + '"' + (a == null ? ' disabled' : '') + '>Limpar resposta</button>';
        h += '<button class="vgs-b sm" type="button" data-vgs="flag" data-i="' + i + '">' + (run.flag[i] ? 'Desmarcar revisão' : 'Marcar para revisar') + '</button></div>';
      }
      if (dn) { var c = com(q, a); if (c) h += '<div class="vgs-com">' + c + '</div>'; }
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
      return (run.modo === 'q' ? d + ' de ' + qs.length + ' entregues · ' : '') + r + ' de ' + qs.length + ' respondidas' + (f ? ' · ' + f + ' para revisar' : '');
    }
    function tRun() {
      var h = '<div class="vgs-crumb">' + esc(item.titulo) + ' · ' + (run.modo === 'q' ? 'entrega por questão' : 'simulando a prova') + '</div>' +
        '<div class="vgs-bar"><span class="vgs-tm">--:--</span><span class="vgs-ct">' + conta() + '</span>' +
        '<button class="vgs-b sm" type="button" data-vgs="sair">Abandonar</button><button class="vgs-b pri sm" type="button" data-vgs="fim">' + (run.modo === 'q' ? 'Encerrar e ver a nota' : 'Entregar prova') + '</button></div>' + tGrade();
      if (run.vista === 'u') {
        h += '<div class="vgs-qs">' + tQ(run.i) + '</div><div class="vgs-acts"><button class="vgs-b" type="button" data-vgs="ant"' + (run.i === 0 ? ' disabled' : '') + '>Anterior</button>' +
          '<button class="vgs-b" type="button" data-vgs="prox"' + (run.i === qs.length - 1 ? ' disabled' : '') + '>Próxima</button></div>';
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
    function tEnd() {
      var p = placar(), over = run.used > total(), gk = Object.keys(p.grupos), h;
      h = '<div class="vgs-crumb">' + esc(item.titulo) + ' · resultado</div>' +
        '<div class="vgs-nota"><b>' + p.pct + '%</b><span>' + p.ok + ' de ' + p.total + ' certas' + (p.brancas ? ' · ' + p.brancas + ' em branco' : '') +
        '</span><span>Tempo: ' + mmss(run.used) + ' de ' + mmss(total()) + (over ? ' (estourou)' : '') + '</span></div>';
      if (qs.length > p.total) h += '<p class="vgs-p">' + (qs.length - p.total) + ' questão(ões) sem gabarito objetivo ficaram fora da nota: confira pelo comentário.</p>';
      if (gk.length > 1 && gk.length <= p.total / 2) {
        h += '<div class="vgs-sec">Acerto por tema</div><table class="vgs-tab">';
        gk.sort(function (x, y) { return p.grupos[x][0] / p.grupos[x][1] - p.grupos[y][0] / p.grupos[y][1]; }).forEach(function (k) { h += '<tr><td>' + esc(k) + '</td><td>' + p.grupos[k][0] + ' de ' + p.grupos[k][1] + '</td></tr>'; });
        h += '</table>';
      }
      h += '<div class="vgs-acts" style="margin:0 0 18px"><button class="vgs-b pri" type="button" data-vgs="refaz">Refazer</button>' +
        (unico && !cfg.voltar ? '<button class="vgs-b" type="button" data-vgs="fechar">Voltar ao início</button>' : '<button class="vgs-b" type="button" data-vgs="fechar">Voltar aos simulados</button>') + '</div>' +
        '<div class="vgs-sec">Correção comentada</div>';
      qs.forEach(function (q, k) { h += tQ(k, true); });
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
      host.innerHTML = livreOn ? tLivre() : tela === 'pick' ? tPick() : tela === 'run' ? tRun() : tela === 'end' ? tEnd() : tLista();
      relogio();
      if (cfg.aoDesenhar) try { cfg.aoDesenhar(host, tela); } catch (e) { }
      if (topo) try { host.scrollIntoView({ block: 'start' }); } catch (e) { }
    }
    function upQ(i) {
      var el = host.querySelector('#vgs-q-' + i), t; if (!el) return;
      t = document.createElement('div'); t.innerHTML = tQ(i); el.parentNode.replaceChild(t.firstChild, el);
      var g = host.querySelector('.vgs-grid'); if (g) { t.innerHTML = tGrade(); g.parentNode.replaceChild(t.firstChild, g); }
      var c = host.querySelector('.vgs-ct'); if (c) c.textContent = conta();
      if (cfg.aoDesenhar) try { cfg.aoDesenhar(host, tela); } catch (e) { }
    }
    function irPara(i) {
      run.i = Math.max(0, Math.min(qs.length - 1, i)); salvar();
      if (run.vista === 'u') desenhar(true);
      else { var el = host.querySelector('#vgs-q-' + run.i); if (el) el.scrollIntoView({ block: 'start', behavior: 'smooth' }); }
    }
    function abrir(it) { item = it; qs = resolver(it); if (!qs.length) return; tela = 'pick'; desenhar(true); }
    function comecar() {
      run = { id: item.id, titulo: item.titulo, modo: pref.modo, vista: pref.vista, ans: {}, flag: {}, dn: {}, i: 0, t0: Date.now() };
      if (item.sorteio) run.qs = qs;
      tela = 'run'; salvar(); desenhar(true);
    }
    function entregar() {
      var br = qs.length - Object.keys(run.ans).length;
      if (!confirm((br ? br + ' em branco. ' : '') + (run.modo === 'q' ? 'Encerrar e ver a nota?' : 'Entregar a prova agora?'))) return;
      run.used = Math.floor((Date.now() - run.t0) / 1000); run.done = true; tela = 'end';
      var p = placar();
      db.res = db.res || {}; db.res[item.id] = { p: p.pct, ok: p.ok, t: p.total, d: new Date().toLocaleDateString('pt-BR') };
      salvar(); desenhar(true);
      if (cfg.aoFim) try { cfg.aoFim({ id: item.id, titulo: item.titulo, ok: p.ok, total: p.total, pct: p.pct, erradas: p.erradas, certas: p.certas }); } catch (e) { }
    }
    function largar() { run = null; salvar(); if (cfg.voltar) return cfg.voltar(); tela = unico ? 'pick' : 'lista'; if (unico) qs = resolver(item); desenhar(true); }

    host.addEventListener('click', function (e) {
      var b = e.target.closest('[data-vgs]'); if (!b || !host.contains(b) || b.disabled) return;
      var a = b.getAttribute('data-vgs'), i = +b.getAttribute('data-i');
      if (a === 'abrir') {
        var it = achar(b.getAttribute('data-id')); if (!it) return;
        if (run && run.id === it.id && !run.done) { item = it; qs = run.qs || resolver(it); tela = 'run'; desenhar(true); }
        else abrir(it);
      }
      else if (a === 'pref') { pref[b.getAttribute('data-k')] = b.getAttribute('data-v'); salvar(); desenhar(); }
      else if (a === 'lista') { tela = 'lista'; desenhar(true); }
      else if (a === 'voltar') cfg.voltar();
      else if (a === 'ir') comecar();
      else if (a === 'livre') { livreOn = true; desenhar(); cfg.livre(true); }
      else if (a === 'simular') { livreOn = false; desenhar(true); cfg.livre(false); }
      else if (a === 'alt') { if (run.dn[i]) return; run.ans[i] = +b.getAttribute('data-j'); run.i = i; salvar(); upQ(i); }
      else if (a === 'limpa') { delete run.ans[i]; salvar(); upQ(i); }
      else if (a === 'flag') { run.flag[i] = !run.flag[i]; salvar(); upQ(i); }
      else if (a === 'entq') { if (run.ans[i] == null && (qs[i].alts || []).length) return; run.dn[i] = 1; salvar(); upQ(i); }
      else if (a === 'vai') irPara(i);
      else if (a === 'ant') irPara(run.i - 1);
      else if (a === 'prox') irPara(run.i + 1);
      else if (a === 'fim') entregar();
      else if (a === 'sair') { if (confirm('Abandonar este simulado? As respostas serão apagadas.')) largar(); }
      else if (a === 'refaz') { run = null; salvar(); abrir(item); }
      else if (a === 'fechar') largar();
    });

    /* retoma o simulado em andamento (ou o resultado ainda aberto) */
    if (unico) { item = itens[0]; qs = resolver(item); tela = 'pick'; }
    if (db.run) {
      var it0 = achar(db.run.id);
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
