/* Correção alternativa por alternativa, igual em todo o site (modelo: Patologia).
   VGCorrecao.bloco(q, {pick, letras}) devolve o HTML de "Por que as outras alternativas estão erradas".
   Dados da questão:
     q.alts    : textos das alternativas
     q.gab     : índice da certa
     q.porque  : [por quê de cada alternativa] (vazio na certa ou onde não há)
                 se faltar, usa q.com quando for lista (formato da Microbiologia)
     q.trecho  : [trecho exato da alternativa que está errado] (opcional; grifado em ondinha)
   pick: índice que a pessoa marcou; a alternativa dela vem primeiro e destacada.
   Uso só depois de a pessoa responder: o bloco nunca entrega a resposta antes. */
(function () {
  'use strict';
  var L = 'ABCDEFGHIJ';
  function limpa(s) {
    return String(s == null ? '' : s)
      .replace(/^\s*(<b>)?\s*(Errad[ao]s?|Incorret[ao]s?|Fals[ao])\s*[.:—-]?\s*(<\/b>)?\s*/i, '')
      .trim();
  }
  function semTag(s) { return String(s || '').replace(/<[^>]+>/g, ''); }
  function grifa(alt, tr) {
    if (!tr) return alt;
    var i = alt.indexOf(tr);
    if (i < 0) { // tenta ignorando tags/maiúsculas
      var p = semTag(alt), k = p.toLowerCase().indexOf(semTag(tr).toLowerCase());
      if (k < 0 || /<[^>]+>/.test(alt)) return alt;
      return p.slice(0, k) + '<mark class="pv-x">' + p.slice(k, k + semTag(tr).length) + '</mark>' + p.slice(k + semTag(tr).length);
    }
    return alt.slice(0, i) + '<mark class="pv-x">' + tr + '</mark>' + alt.slice(i + tr.length);
  }
  /* dados gravados pelo importar_porques.py: window.VG_PORQUE = {chave: [[início da alternativa, porquê, trecho], ...]} */
  var dv = document.createElement('div');
  function norm(s) { dv.innerHTML = String(s == null ? '' : s); return (dv.textContent || '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ''); }
  function fnv(s) { var h = 0x811c9dc5; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(16); }
  function achar(alts) {
    var D = window.VG_PORQUE; if (!D || !alts) return null;
    var n = alts.map(norm), e = D[fnv(n.slice().sort().join('|'))]; if (!e) return null;
    var p = [], t = [];
    n.forEach(function (x, j) { p[j] = ''; t[j] = ''; e.forEach(function (r) { if (x.slice(0, 24) === r[0]) { p[j] = r[1]; t[j] = r[2]; } }); });
    return { p: p, t: t };
  }
  function porques(q) {
    if (Array.isArray(q.porque)) return q.porque;
    var a = q.alts && achar(q.alts), c = Array.isArray(q.com) ? q.com : null;
    if (a) { if (!q.trecho) q.trecho = a.t; return a.p.map(function (x, j) { return j === q.gab ? '' : (x || (c && c[j]) || ''); }); }
    if (c) return c.map(function (x, j) { return j === q.gab ? '' : x; });
    return null;
  }
  function tem(q) {
    var p = porques(q);
    return !!(p && q.alts && p.some(function (c, j) { return j !== q.gab && limpa(c); }));
  }
  function bloco(q, o) {
    o = o || {};
    var p = porques(q); if (!p || !q.alts) return '';
    var Ls = o.letras || L, tr = q.trecho || [], ordem = [];
    q.alts.forEach(function (_, j) { if (j !== q.gab && limpa(p[j])) ordem.push(j); });
    if (!ordem.length) return '';
    if (o.pick != null && ordem.indexOf(o.pick) > 0) { ordem.splice(ordem.indexOf(o.pick), 1); ordem.unshift(o.pick); }
    var h = '<div class="pv-alts vg-cor"><b>Por que as outras alternativas estão erradas</b><ul>';
    ordem.forEach(function (j) {
      h += '<li' + (j === o.pick ? ' class="sua"' : '') + '><span class="pv-al">' + (Ls[j] || j + 1) + '</span><div class="pv-ab">' +
        '<p class="pv-op">' + grifa(String(q.alts[j]), tr[j]) + (j === o.pick ? ' <i class="vg-cor-sua">sua resposta</i>' : '') + '</p>' +
        '<p class="pv-pq">' + limpa(p[j]) + '</p></div></li>';
    });
    return h + '</ul></div>';
  }
  window.VGCorrecao = { bloco: bloco, tem: tem, limpa: limpa, achar: achar };

  /* Questões montadas no HTML (Farmacologia): <div class="q" data-a="D"> com .opt[data-l] > .ot.
     Quando a questão ganha "done", põe a correção depois da última alternativa; some ao refazer. */
  function domQ(q) {
    var ok = q.classList.contains('done'), velho = q.querySelector('.vg-cor');
    if (!ok) { if (velho) velho.remove(); return; }
    if (velho) return;
    var ops = Array.prototype.slice.call(q.querySelectorAll('.opt[data-l]'));
    if (ops.length < 2) return;
    var L = ops.map(function (o) { return o.getAttribute('data-l'); }), gab = L.indexOf(q.getAttribute('data-a'));
    var alts = ops.map(function (o) { var t = o.querySelector('.ot'); return t ? t.innerHTML : ''; });
    var w = ops.findIndex(function (o) { return o.classList.contains('wrong'); });
    var h = bloco({ alts: alts, gab: gab }, { pick: w >= 0 ? w : null, letras: L.join('') });
    if (!h) return;
    var ult = ops[ops.length - 1];
    ult.insertAdjacentHTML('afterend', h);
  }
  function varrer(raiz) {
    if (!window.VG_PORQUE) return;
    (raiz.querySelectorAll ? raiz : document).querySelectorAll('.q[data-a]').forEach(domQ);
  }
  function ligar() {
    if (!window.VG_PORQUE || !document.querySelector('.q[data-a] .opt[data-l]')) return;
    varrer(document);
    new MutationObserver(function (ms) {
      ms.forEach(function (m) { if (m.type === 'attributes' && m.target.matches && m.target.matches('.q[data-a]')) domQ(m.target); });
    }).observe(document.body, { subtree: true, attributes: true, attributeFilter: ['class'] });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ligar); else ligar();
})();
