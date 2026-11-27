/* Liquid glass de verdade: refração do fundo na borda do vidro, com leve aumento no meio,
   como uma lente. Cada peça ganha um mapa de deslocamento feito do seu tamanho e do seu raio
   (feDisplacementMap dentro de backdrop-filter). Só o Chromium aceita isso; nos outros
   navegadores e em aparelho modesto fica o vidro fosco de sempre, sem mexer em nada.
   Vale só para barras, botões e janelas flutuantes (ver "Cuidados de desempenho" no CLAUDE.md). */
(function () {
  'use strict';
  var html = document.documentElement;
  var chromium = navigator.userAgentData && navigator.userAgentData.brands.some(function (b) { return /Chrom/.test(b.brand); });
  var fraco = window.FRACO || window.LENTO || matchMedia('(pointer:coarse)').matches ||
    (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4;
  var API = window.Liquido = { on: false, off: function () {}, scan: function () {} };
  if (!chromium || fraco || !window.ResizeObserver) return;

  var SEL = '[data-liquido],.glass,#vidro-fx,#vidro-home,#vidro-heart,.sidebar,.mbar,#side,#top,.sb,.top,.tip,#tip';
  var NS = 'http://www.w3.org/2000/svg';
  var svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('aria-hidden', 'true');
  svg.style.cssText = 'position:absolute;width:0;height:0;pointer-events:none';
  var cache = {}, seq = 0, feitos = new Set(), desligado = false;

  /* mapa: R = desvio em x, G = desvio em y (128 = parado). Na borda o vidro curva o fundo para dentro;
     no miolo puxa de leve para o centro, o que dá o pequeno aumento. */
  function mapa(w, h, r) {
    var k = Math.min(1, 520 / Math.max(w, h)), W = Math.max(8, Math.round(w * k)), H = Math.max(8, Math.round(h * k));
    var bisel = Math.max(10, Math.min(r * .9 + 8, Math.min(w, h) / 2));
    var forca = bisel * .95, zoom = Math.min(.045, 9 / (Math.max(w, h) / 2)), max = forca + 9;
    var c = document.createElement('canvas'); c.width = W; c.height = H;
    var g = c.getContext('2d'), im = g.createImageData(W, H), d = im.data;
    var hx = w / 2, hy = h / 2, rr = Math.min(r, hx, hy);
    for (var j = 0; j < H; j++) for (var i = 0; i < W; i++) {
      var px = (i + .5) * w / W - hx, py = (j + .5) * h / H - hy;
      var qx = Math.abs(px) - (hx - rr), qy = Math.abs(py) - (hy - rr);
      var ox = Math.max(qx, 0), oy = Math.max(qy, 0), len = Math.hypot(ox, oy);
      var dist = rr - (len + Math.min(Math.max(qx, qy), 0));           /* distância até a borda, por dentro */
      var nx, ny;                                                      /* normal apontando para fora */
      if (qx > 0 && qy > 0) { nx = ox / len; ny = oy / len; }
      else if (qx > qy) { nx = 1; ny = 0; } else { nx = 0; ny = 1; }
      nx *= px < 0 ? -1 : 1; ny *= py < 0 ? -1 : 1;
      var t = Math.min(Math.max(dist / bisel, 0), 1), u = 1 - t;
      var f = (1 - Math.sqrt(1 - u * u)) * forca;                      /* perfil de lente convexa */
      var dx = -nx * f - px * zoom, dy = -ny * f - py * zoom;
      var o = (j * W + i) * 4;
      d[o] = 128 + Math.max(-1, Math.min(1, dx / max)) * 127;
      d[o + 1] = 128 + Math.max(-1, Math.min(1, dy / max)) * 127;
      d[o + 2] = 128; d[o + 3] = 255;
    }
    g.putImageData(im, 0, 0);
    return { url: c.toDataURL('image/png'), escala: max * 2 };
  }

  function el(n, a) { var e = document.createElementNS(NS, n); for (var k in a) e.setAttribute(k, a[k]); return e; }

  function filtro(w, h, r) {
    var chave = w + 'x' + h + 'r' + r;
    if (cache[chave]) return cache[chave];
    var m = mapa(w, h, r), id = 'lq' + (++seq);
    var f = el('filter', { id: id, x: '0', y: '0', width: '100%', height: '100%', 'color-interpolation-filters': 'sRGB' });
    var img = el('feImage', { x: '0', y: '0', width: '100%', height: '100%', preserveAspectRatio: 'none', result: 'm' });
    img.setAttribute('href', m.url);
    f.appendChild(img);
    if (w * h < 140000) {
      /* peça pequena: cada cor desvia um pouco diferente (franja de cor na borda, como em vidro grosso) */
      [['r', 1, '1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0'], ['g', .93, '0 0 0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 1 0'], ['b', .86, '0 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0 0 1 0']]
        .forEach(function (c) {
          f.appendChild(el('feDisplacementMap', { in: 'SourceGraphic', in2: 'm', scale: (m.escala * c[1]).toFixed(1), xChannelSelector: 'R', yChannelSelector: 'G', result: 'd' + c[0] }));
          f.appendChild(el('feColorMatrix', { in: 'd' + c[0], type: 'matrix', values: c[2], result: c[0] }));
        });
      f.appendChild(el('feBlend', { in: 'r', in2: 'g', mode: 'screen', result: 'rg' }));
      f.appendChild(el('feBlend', { in: 'rg', in2: 'b', mode: 'screen' }));
    } else {
      f.appendChild(el('feDisplacementMap', { in: 'SourceGraphic', in2: 'm', scale: m.escala.toFixed(1), xChannelSelector: 'R', yChannelSelector: 'G' }));
    }
    svg.appendChild(f);
    return (cache[chave] = id);
  }

  function vestir(e) {
    if (desligado) return;
    var w = Math.round(e.offsetWidth), h = Math.round(e.offsetHeight);
    if (w < 24 || h < 24) return;
    var cs = getComputedStyle(e);
    if (!e.dataset.lq && (cs.backdropFilter || 'none') === 'none') return;   /* só onde o tema já põe vidro */
    var r = Math.round(parseFloat(cs.borderTopLeftRadius) || 0);
    var grande = w * h > 140000;
    var v = 'url(#' + filtro(w, h, r) + ') blur(' + (grande ? 5 : 3) + 'px) saturate(175%) brightness(1.06)';
    e._lqW = w; e._lqH = h;
    if (e._lqV === v) return;
    e._lqV = v;
    e.dataset.lq = '1';
    e.style.setProperty('-webkit-backdrop-filter', v);
    e.style.setProperty('backdrop-filter', v);
  }

  /* Peça mudando de tamanho (barra lateral abrindo ou fechando, janela sendo arrastada): o mapa que ela
     já tem estica junto (o feImage ocupa 100%) e só se faz um mapa novo quando ela para de mexer.
     Fazer um mapa por quadro (canvas → PNG → filtro novo) travava a animação e enchia a memória. */
  var ESPERA = 180;
  var ro = new ResizeObserver(function (es) {
    es.forEach(function (x) {
      var e = x.target;
      if (!e.dataset.lq) { vestir(e); return; }
      if (Math.round(e.offsetWidth) === e._lqW && Math.round(e.offsetHeight) === e._lqH) return;
      clearTimeout(e._lqT);
      e._lqT = setTimeout(function () { vestir(e); }, ESPERA);
    });
  });
  API.scan = function (raiz) {
    if (desligado) return;
    (raiz && raiz.querySelectorAll ? raiz : document).querySelectorAll(SEL).forEach(function (e) {
      if (feitos.has(e)) return; feitos.add(e); ro.observe(e);
    });
  };
  API.off = function () {
    desligado = true; API.on = false; ro.disconnect();
    feitos.forEach(function (e) { e.style.removeProperty('-webkit-backdrop-filter'); e.style.removeProperty('backdrop-filter'); delete e.dataset.lq; clearTimeout(e._lqT); e._lqV = ''; });
    html.classList.remove('liquido');
  };

  function leve() { return html.classList.contains('vidro-leve') || html.classList.contains('modo-leve'); }
  function ligar() {
    if (leve()) return;
    document.body.appendChild(svg);
    html.classList.add('liquido'); API.on = true;
    API.scan();
    /* peças que entram depois (cartões do hub, botões do tema) */
    var t; new MutationObserver(function () { clearTimeout(t); t = setTimeout(API.scan, 250); })
      .observe(document.body, { childList: true, subtree: true });
    /* se o tema concluir que o aparelho não aguenta, sai de cena */
    new MutationObserver(function () { if (leve()) API.off(); })
      .observe(html, { attributes: true, attributeFilter: ['class'] });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ligar); else ligar();
})();
