/* praticar.js — widgets "🎮 Pratique o raciocínio" (padrão Farmacologia/Patologia TGI) para qualquer master.
   O master declara os dados em window.VG_PRATICAR = [{seg, apos?, t, ic, tit, sub, ...}] e este arquivo
   desenha cada widget no segmento certo (dentro de #prose / .prose / main), com XP uma vez por widget.
   Tipos:
     plantao     {casos:[{txt, perguntas:[{p, ops:[...], c, exp}]}]}  passo a passo, resposta só depois de escolher
     ordem       {itens:[na ordem certa], exp}                        toque na ordem; confere no fim
     classifique {cats:[...], cards:[[texto, iCat, porquê?], ...], exp?} um cartão por vez
     escore      {itens:[[rótulo, pontos], ...], faixas:[[min, texto], ...], nota?}
   seg: o hash do segmento sem o # (Microbiologia "a3/s2"; Preventiva "a03/a03-2"). apos: regex (sem acento) do título h2/h3 depois do qual entra; sem apos, vai no fim.
   Regras do site: a certa nunca aparece antes de responder; alternativas equilibradas; nada de sigla em balão (.wg). */
(function () {
  'use strict';
  var DADOS = window.VG_PRATICAR;
  if (!DADOS || !DADOS.length) return;
  var CHAVE = 'vg-wg:' + location.pathname;
  var feitos = {};
  try { feitos = JSON.parse(localStorage.getItem(CHAVE) || '{}'); } catch (e) {}
  var XP = 15;

  function semAc(s) { return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function emb(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var x = a[i]; a[i] = a[j]; a[j] = x; } return a; }
  function idDe(w, i) { return w.id || (w.seg + '#' + i); }

  function concluir(w, raiz, nota) {
    var id = raiz.dataset.wgid, badge = raiz.querySelector('.wg-xp');
    if (!feitos[id]) {
      feitos[id] = 1;
      try { localStorage.setItem(CHAVE, JSON.stringify(feitos)); } catch (e) {}
      if (typeof window.addXp === 'function') { try { window.addXp(XP, 'wg-' + id); } catch (e) {} }
      raiz.classList.add('wg-novo'); setTimeout(function () { raiz.classList.remove('wg-novo'); }, 900);
    }
    badge.textContent = '✓ feito'; badge.classList.add('ok');
    var fim = raiz.querySelector('.wg-fim'); if (fim) { fim.innerHTML = nota || ''; fim.hidden = !nota; }
  }

  /* ---------- plantão ---------- */
  function plantao(w, b, raiz) {
    var ci = 0, pi = 0, acertos = 0, total = 0;
    w.casos.forEach(function (c) { total += c.perguntas.length; });
    function caso() {
      var c = w.casos[ci]; pi = 0;
      b.innerHTML = '';
      b.appendChild(el('div', 'wg-pass', 'Paciente ' + (ci + 1) + ' de ' + w.casos.length));
      b.appendChild(el('div', 'wg-caso', c.txt));
      var area = el('div', 'wg-passos'); b.appendChild(area);
      pergunta(c, area);
    }
    function pergunta(c, area) {
      var q = c.perguntas[pi], bloco = el('div', 'wg-q');
      bloco.appendChild(el('div', 'wg-p', q.p));
      var ops = el('div', 'wg-ops');
      var ordem = q.ops.map(function (o, i) { return i; });
      ordem = emb(ordem);
      ordem.forEach(function (i) {
        var bt = el('button', 'wg-op', q.ops[i]); bt.type = 'button';
        bt.onclick = function () {
          if (bloco.dataset.r) return; bloco.dataset.r = 1;
          var certo = i === q.c; if (certo) acertos++;
          [].forEach.call(ops.children, function (x) { x.disabled = true; });
          bt.classList.add(certo ? 'ok' : 'erro');
          if (!certo) ops.querySelector('[data-i="' + q.c + '"]').classList.add('ok');
          var fb = el('div', 'wg-fb ' + (certo ? 'ok' : 'erro'), '<b>' + (certo ? 'Isso.' : 'Não.') + '</b> ' + q.exp);
          bloco.appendChild(fb);
          var nx = el('button', 'wg-btn', pi < c.perguntas.length - 1 ? 'Próxima pergunta →' : (ci < w.casos.length - 1 ? 'Próximo paciente →' : 'Fechar o plantão')); nx.type = 'button';
          nx.onclick = function () {
            nx.remove();
            if (pi < c.perguntas.length - 1) { pi++; pergunta(c, area); }
            else if (ci < w.casos.length - 1) { ci++; caso(); raiz.scrollIntoView({ block: 'start', behavior: 'smooth' }); }
            else fim();
          };
          bloco.appendChild(nx);
        };
        bt.dataset.i = i; ops.appendChild(bt);
      });
      bloco.appendChild(ops); area.appendChild(bloco);
    }
    function fim() {
      b.innerHTML = '';
      b.appendChild(el('div', 'wg-placar', '<b>' + acertos + ' de ' + total + '</b> decisões certas'));
      var r = el('button', 'wg-btn', 'Refazer o plantão'); r.type = 'button';
      r.onclick = function () { ci = 0; acertos = 0; caso(); };
      b.appendChild(r);
      concluir(w, raiz);
    }
    caso();
  }

  /* ---------- monte a sequência ---------- */
  function ordem(w, b, raiz) {
    function montar() {
      b.innerHTML = '';
      var escolhidos = [];
      var alvo = el('ol', 'wg-seq'); var banco = el('div', 'wg-banco');
      b.appendChild(el('div', 'wg-dica', 'Toque nos passos na ordem certa. Toque num passo já posto para tirá-lo.'));
      b.appendChild(alvo); b.appendChild(banco);
      var conf = el('button', 'wg-btn', 'Conferir a ordem'); conf.type = 'button'; conf.disabled = true;
      b.appendChild(conf);
      var fb = el('div', 'wg-fb'); fb.hidden = true; b.appendChild(fb);
      emb(w.itens.map(function (t, i) { return i; })).forEach(function (i) {
        var bt = el('button', 'wg-chip', w.itens[i]); bt.type = 'button';
        bt.onclick = function () {
          if (b.dataset.r) return;
          if (bt.parentNode === banco) { escolhidos.push(i); alvo.appendChild(bt); }
          else { escolhidos.splice(escolhidos.indexOf(i), 1); banco.appendChild(bt); }
          conf.disabled = escolhidos.length !== w.itens.length;
        };
        banco.appendChild(bt);
      });
      conf.onclick = function () {
        b.dataset.r = 1; conf.remove();
        var certos = 0;
        [].forEach.call(alvo.children, function (c, k) { var ok = escolhidos[k] === k; if (ok) certos++; c.classList.add(ok ? 'ok' : 'erro'); });
        fb.hidden = false; fb.className = 'wg-fb ' + (certos === w.itens.length ? 'ok' : 'erro');
        var html = '<b>' + certos + ' de ' + w.itens.length + ' no lugar certo.</b>';
        if (certos < w.itens.length) html += '<div class="wg-gab">A ordem certa:<ol>' + w.itens.map(function (t) { return '<li>' + t + '</li>'; }).join('') + '</ol></div>';
        if (w.exp) html += '<p>' + w.exp + '</p>';
        fb.innerHTML = html;
        var r = el('button', 'wg-btn', 'Montar de novo'); r.type = 'button'; r.onclick = function () { delete b.dataset.r; montar(); };
        b.appendChild(r);
        concluir(w, raiz);
      };
    }
    montar();
  }

  /* ---------- classifique ---------- */
  function classifique(w, b, raiz) {
    var cards, k, acertos, seq = 0, rec = 0;
    function iniciar() { cards = emb(w.cards); k = 0; acertos = 0; seq = 0; prox(); }
    function prox() {
      b.innerHTML = '';
      if (k >= cards.length) return fim();
      var c = cards[k];
      b.appendChild(el('div', 'wg-pass', 'Cartão ' + (k + 1) + ' de ' + cards.length + (seq > 1 ? ' · sequência ' + seq : '')));
      b.appendChild(el('div', 'wg-carta', c[0]));
      var ops = el('div', 'wg-ops wg-cats');
      w.cats.forEach(function (cat, i) {
        var bt = el('button', 'wg-op', cat); bt.type = 'button';
        bt.onclick = function () {
          if (ops.dataset.r) return; ops.dataset.r = 1;
          var ok = i === c[1]; if (ok) { acertos++; seq++; rec = Math.max(rec, seq); } else seq = 0;
          [].forEach.call(ops.children, function (x, j) { x.disabled = true; if (j === c[1]) x.classList.add('ok'); });
          if (!ok) bt.classList.add('erro');
          var fb = el('div', 'wg-fb ' + (ok ? 'ok' : 'erro'), '<b>' + (ok ? 'Certo.' : 'É ' + w.cats[c[1]] + '.') + '</b>' + (c[2] ? ' ' + c[2] : ''));
          b.appendChild(fb);
          var nx = el('button', 'wg-btn', k < cards.length - 1 ? 'Próximo cartão →' : 'Ver o resultado'); nx.type = 'button';
          nx.onclick = function () { k++; prox(); };
          b.appendChild(nx);
        };
        ops.appendChild(bt);
      });
      b.appendChild(ops);
    }
    function fim() {
      b.appendChild(el('div', 'wg-placar', '<b>' + acertos + ' de ' + cards.length + '</b> certos · melhor sequência: ' + rec));
      if (w.exp) b.appendChild(el('p', 'wg-dica', w.exp));
      var r = el('button', 'wg-btn', 'Embaralhar e jogar de novo'); r.type = 'button'; r.onclick = iniciar;
      b.appendChild(r);
      concluir(w, raiz);
    }
    iniciar();
  }

  /* ---------- escore ---------- */
  function escore(w, b, raiz) {
    b.innerHTML = '';
    var lista = el('div', 'wg-esc'); b.appendChild(lista);
    var tot = el('div', 'wg-placar'); b.appendChild(tot);
    function calc() {
      var s = 0;
      [].forEach.call(lista.querySelectorAll('input'), function (x) { if (x.checked) s += +x.value; });
      var faixa = '';
      w.faixas.forEach(function (f) { if (s >= f[0]) faixa = f[1]; });
      tot.innerHTML = '<b>' + s + ' ponto' + (s === 1 ? '' : 's') + '</b> · ' + faixa;
      concluir(w, raiz);
    }
    w.itens.forEach(function (it, i) {
      var l = el('label', 'wg-esc-i');
      l.innerHTML = '<input type="checkbox" value="' + it[1] + '"><span>' + it[0] + '</span><em>+' + it[1] + '</em>';
      l.querySelector('input').onchange = calc;
      lista.appendChild(l);
    });
    tot.innerHTML = 'Marque o que o paciente tem.';
    if (w.nota) b.appendChild(el('p', 'wg-dica', w.nota));
  }

  var TIPOS = { plantao: plantao, ordem: ordem, classifique: classifique, escore: escore };

  function widget(w, i) {
    var raiz = el('div', 'wg vg-wg'); raiz.dataset.wgid = idDe(w, i); raiz.setAttribute('data-nosiglas', '');
    var feito = feitos[raiz.dataset.wgid];
    raiz.innerHTML = '<div class="wg-h"><div class="wg-ic">' + (w.ic || '🎮') + '</div><div class="wg-tt"><b>' + w.tit + '</b><span>' + (w.sub || '') + '</span></div>' +
      '<span class="wg-xp' + (feito ? ' ok' : '') + '">' + (feito ? '✓ feito' : '+' + XP + ' XP') + '</span></div><div class="wg-b"></div><div class="wg-fim" hidden></div>';
    var corpo = raiz.querySelector('.wg-b');
    var abrir = el('button', 'wg-btn wg-start', 'Começar'); abrir.type = 'button';
    abrir.onclick = function () { abrir.remove(); TIPOS[w.t](w, corpo, raiz); };
    corpo.appendChild(abrir);
    return raiz;
  }

  function segAtual() {
    var h = location.hash.replace(/^#\/?/, '');
    var m = h.match(/^([\w-]+)\/([\w-]+)/);
    if (m) return m[1] + '/' + m[2];
    try { if (typeof currentView === 'string') return 'view:' + currentView; } catch (e) {} /* aula2 da Patologia: goTo('s3'), let global */
    return '';
  }

  function inserir(prose) {
    var seg = segAtual();
    if (!seg || prose.dataset.wgSeg === seg) return;
    prose.dataset.wgSeg = seg;
    [].forEach.call(prose.querySelectorAll(':scope > .vg-wg'), function (x) { x.remove(); });
    DADOS.forEach(function (w, i) {
      if (w.seg !== seg || !TIPOS[w.t]) return;
      var no = widget(w, i), alvo = null;
      if (w.apos) {
        var re = new RegExp(w.apos, 'i');
        var hs = prose.querySelectorAll('h2,h3');
        for (var k = 0; k < hs.length; k++) if (re.test(semAc(hs[k].textContent))) { alvo = hs[k]; break; }
      }
      if (alvo) {
        var n = alvo.nextElementSibling;
        while (n && !/^H[23]$/.test(n.tagName)) n = n.nextElementSibling;
        if (n) prose.insertBefore(no, n); else prose.appendChild(no);
      } else {
        var fimQ = prose.querySelector(':scope > .pv-box, :scope > .pv-aut, :scope > .cel-fin');
        if (fimQ) prose.insertBefore(no, fimQ); else prose.appendChild(no);
      }
    });
  }

  /* Segmentos que ficam todos no DOM, cada um numa seção com id (aulas da Patologia: seg "#seg3").
     O widget entra no fim do .prose da seção (antes das questões). */
  function porId() {
    DADOS.forEach(function (w, i) {
      if (!w.seg || w.seg.charAt(0) !== '#' || !TIPOS[w.t]) return;
      var id = idDe(w, i);
      if (document.querySelector('.vg-wg[data-wgid="' + id.replace(/"/g, '') + '"]')) return;
      var sec = document.getElementById(w.seg.slice(1));
      if (!sec) return;
      var alvo = sec.querySelector('.prose') || sec;
      alvo.appendChild(widget(w, i));
    });
  }

  function varrer() {
    porId();
    var p = document.getElementById('prose') || document.querySelector('main .prose') || document.querySelector('main section.section[id]') || document.querySelector('#content .content-body');
    if (p) inserir(p);
  }
  var agendado = 0;
  new MutationObserver(function () { if (agendado) return; agendado = 1; requestAnimationFrame(function () { agendado = 0; varrer(); }); })
    .observe(document.body, { childList: true, subtree: true });
  window.addEventListener('hashchange', function () { setTimeout(varrer, 30); });
  if (document.readyState !== 'loading') varrer(); else document.addEventListener('DOMContentLoaded', varrer);
})();
