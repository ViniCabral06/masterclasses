/* Propaganda da turma 83B: só roda quando o link /83b/ gravou o flag "vg-turma" neste navegador.
   Sem o flag, não faz nada. Nenhum valor em dinheiro aparece aqui, de propósito. */
(function () {
  'use strict';
  /* ===== CONFIG (edite aqui) ===== */
  var CONTATOS = [ /* números só com dígitos, com 55 + DDD. Ex.: "5511999999999" */
    { nome: 'Matheus',  tel: '' },
    { nome: 'Vinícius', tel: '' }
  ];
  var MATERIAS_5P = 'Patologia II, Técnicas Operatórias e mais';
  var MENSAGENS = [
    { t: 'Exclusivo da 83B', d: 'Este site foi feito pela turma, para a turma. Aproveite: é seu.' },
    { t: 'Semestre que vem tem mais', d: 'O acesso passa a ser pago, com preço de colega, bem mais barato que cursinho. Quem é da 83B entra primeiro.', cta: 'lista' },
    { t: '5º período quase pronto', d: 'As aulas do 5º período já estão quase todas prontas: ' + MATERIAS_5P + '.', cta: 'lista' },
    { t: 'Entre na lista', d: 'Fale com a gente e garanta seu lugar no semestre que vem.', cta: 'lista' },
    { t: 'Tem anotações ou provas antigas?', d: 'Troque por acesso grátis: fale com o Matheus ou o Vinícius.', cta: 'ajuda' }
  ];
  var PRIMEIRO_MS = 3 * 60 * 1000, ENTRE_MS = 8 * 60 * 1000, MAX_SESSAO = 3;

  /* ===== flag do modo ===== */
  function lerFlag() {
    try {
      var f = JSON.parse(localStorage.getItem('vg-turma') || 'null');
      if (f && f.t === '83b' && Date.now() < f.ate) return f;
    } catch (e) {}
    return null;
  }
  if (!lerFlag()) return;
  if (window.top !== window.self) return;                /* aulas em iframe: só o master mostra */
  if (/[?&]vgindice=/.test(location.search)) return;

  var ss = { get: function (k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
             set: function (k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} } };

  function link(c, msg) {
    if (!c.tel) return '#';
    return 'https://wa.me/' + c.tel + '?text=' + encodeURIComponent(msg);
  }
  var MSG_LISTA = 'Oi! Sou da 83B e quero entrar na lista do semestre que vem das Masterclasses.';
  var MSG_AJUDA = 'Oi! Sou da 83B e tenho anotações / provas antigas para trocar por acesso grátis.';
  function botoes(tipo) {
    var msg = tipo === 'ajuda' ? MSG_AJUDA : MSG_LISTA;
    return CONTATOS.map(function (c) {
      var off = c.tel ? '' : ' aria-disabled="true"';
      return '<a class="vgp-b" target="_blank" rel="noopener" href="' + link(c, msg) + '"' + off + '>Falar com o ' + c.nome + '</a>';
    }).join('');
  }

  /* ===== estilo ===== */
  var css = '' +
    '.vgp-card,.vgp-modal{font-family:"Instrument Sans",system-ui,sans-serif;color:var(--vg-ink,#e6e9e4)}' +
    '.vgp-card{position:fixed;left:16px;bottom:16px;z-index:96;width:min(340px,calc(100vw - 32px));padding:16px 16px 14px;border-radius:22px;' +
      'background:var(--vg-glass,rgba(30,34,32,.62));-webkit-backdrop-filter:var(--vg-blur,blur(24px) saturate(180%));backdrop-filter:var(--vg-blur,blur(24px) saturate(180%));' +
      'border:1px solid var(--vg-edge,rgba(255,255,255,.18));box-shadow:0 18px 50px rgba(0,0,0,.35);transform:translateY(20px);opacity:0;transition:transform .45s cubic-bezier(.32,.72,0,1),opacity .35s}' +
    '.vgp-card.on{transform:none;opacity:1}' +
    '.vgp-k{font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--vg-acc,#5fc4ae);font-weight:700;margin:0 24px 4px 0}' +
    '.vgp-t{font-family:"Instrument Serif",Georgia,serif;font-size:24px;line-height:1.1;margin:0 0 6px}' +
    '.vgp-d{font-size:14px;line-height:1.45;margin:0 0 12px;opacity:.88}' +
    '.vgp-x{position:absolute;top:8px;right:10px;width:30px;height:30px;border:0;border-radius:50%;background:transparent;color:inherit;font-size:20px;cursor:pointer;opacity:.7}' +
    '.vgp-x:hover{opacity:1;background:rgba(127,127,127,.2)}' +
    '.vgp-r{display:flex;flex-wrap:wrap;gap:8px}' +
    '.vgp-b{display:inline-flex;align-items:center;justify-content:center;min-height:38px;padding:0 14px;border-radius:99px;font-size:13.5px;font-weight:600;text-decoration:none;' +
      'background:var(--vg-acc,#5fc4ae);color:var(--vg-on-acc,#0b1210);border:0;cursor:pointer}' +
    '.vgp-b[aria-disabled="true"]{opacity:.45;pointer-events:none}' +
    '.vgp-b.sec{background:transparent;color:inherit;border:1px solid var(--vg-edge,rgba(255,255,255,.25))}' +
    '.vgp-modal{position:fixed;inset:0;z-index:200;display:grid;place-items:center;padding:16px;background:rgba(0,0,0,.5);opacity:0;transition:opacity .3s}' +
    '.vgp-modal.on{opacity:1}' +
    '.vgp-box{position:relative;width:min(460px,100%);padding:28px 24px 22px;border-radius:28px;background:var(--vg-glass2,rgba(30,34,32,.82));' +
      '-webkit-backdrop-filter:var(--vg-blur,blur(26px) saturate(185%));backdrop-filter:var(--vg-blur,blur(26px) saturate(185%));border:1px solid var(--vg-edge,rgba(255,255,255,.2));box-shadow:0 30px 80px rgba(0,0,0,.45)}' +
    '.vgp-box .vgp-t{font-size:34px;margin-bottom:10px}' +
    '.vgp-box .vgp-d{font-size:15.5px}' +
    '.vgp-fim{margin:28px auto 0;max-width:720px;padding:22px 20px;border-radius:24px;text-align:center;background:var(--vg-glass,rgba(30,34,32,.55));border:1px solid var(--vg-edge,rgba(255,255,255,.18));font-family:"Instrument Sans",system-ui,sans-serif;color:var(--vg-ink,#e6e9e4)}' +
    '.vgp-fim .vgp-r{justify-content:center}' +
    '@media(max-width:560px){.vgp-card{left:10px;bottom:70px;width:calc(100vw - 20px)}}' +
    '@media(prefers-reduced-motion:reduce){.vgp-card,.vgp-modal{transition:none}}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  /* não atrapalha: simulado, quiz ou painel aberto */
  function ocupado() {
    return !!document.querySelector('.vgsim-run,.vg-sim-run,[data-vgsim="run"],#vidro-pers:not([hidden]),.vgp-modal') ||
           document.documentElement.classList.contains('vgsim-aberto');
  }

  function fechar(el, chave) {
    el.classList.remove('on');
    setTimeout(function () { el.remove(); }, 400);
    if (chave != null) ss.set('vgp-x' + chave, '1');
  }

  /* ===== boas-vindas (1ª vez por sessão) ===== */
  function boasVindas() {
    if (ss.get('vgp-bv')) return;
    ss.set('vgp-bv', '1');
    var m = document.createElement('div'); m.className = 'vgp-modal'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true');
    m.innerHTML = '<div class="vgp-box" data-liquido><button class="vgp-x" aria-label="Fechar">×</button>' +
      '<p class="vgp-k">Exclusivo · Turma 83B</p><h2 class="vgp-t">Feito pela turma, para a turma.</h2>' +
      '<p class="vgp-d">Estas masterclasses são só da 83B. Estude à vontade: neste semestre o acesso é livre. No semestre que vem a gente continua, e quem é da turma sai na frente.</p>' +
      '<div class="vgp-r"><button class="vgp-b" data-ok>Bora estudar</button></div></div>';
    document.body.appendChild(m);
    requestAnimationFrame(function () { m.classList.add('on'); });
    var ok = function () { fechar(m); };
    m.querySelector('[data-ok]').onclick = ok; m.querySelector('.vgp-x').onclick = ok;
    m.addEventListener('click', function (e) { if (e.target === m) ok(); });
    document.addEventListener('keydown', function esc(e) { if (e.key === 'Escape') { ok(); document.removeEventListener('keydown', esc); } });
  }

  /* ===== cartões rotativos ===== */
  var mostrados = +(ss.get('vgp-n') || 0), ultimo = +(ss.get('vgp-t') || 0), idx = +(ss.get('vgp-i') || 0);
  function proximo() {
    if (mostrados >= MAX_SESSAO) return;
    if (ocupado() || document.hidden) return agendar(30 * 1000);
    var agora = Date.now();
    if (agora - ultimo < ENTRE_MS) return agendar(ENTRE_MS - (agora - ultimo) + 1000);
    var tent = 0;
    while (ss.get('vgp-x' + idx) && tent++ < MENSAGENS.length) idx = (idx + 1) % MENSAGENS.length;
    if (tent > MENSAGENS.length) return;
    var m = MENSAGENS[idx], atual = idx;
    var c = document.createElement('aside'); c.className = 'vgp-card'; c.setAttribute('data-liquido', ''); c.setAttribute('role', 'status');
    c.innerHTML = '<button class="vgp-x" aria-label="Fechar">×</button><p class="vgp-k">Turma 83B</p><h3 class="vgp-t">' + m.t + '</h3><p class="vgp-d">' + m.d + '</p>' +
      '<div class="vgp-r">' + (m.cta ? botoes(m.cta) : '') + '<button class="vgp-b sec" data-nao>Agora não</button></div>';
    document.body.appendChild(c);
    requestAnimationFrame(function () { c.classList.add('on'); });
    c.querySelector('.vgp-x').onclick = function () { fechar(c, atual); };
    c.querySelector('[data-nao]').onclick = function () { fechar(c, atual); };
    setTimeout(function () { if (c.isConnected) fechar(c); }, 20000);
    mostrados++; ultimo = agora; idx = (idx + 1) % MENSAGENS.length;
    ss.set('vgp-n', mostrados); ss.set('vgp-t', ultimo); ss.set('vgp-i', idx);
    agendar(ENTRE_MS);
  }
  var timer;
  function agendar(ms) { clearTimeout(timer); timer = setTimeout(proximo, ms); }

  /* ===== bloco final: convite para ajudar (rodapé do master) ===== */
  function blocoFinal() {
    if (window.VGP_HUB || document.querySelector('.vgp-fim')) return;
    var alvo = document.querySelector('main,#main,#view,.main') || document.body;
    var d = document.createElement('section'); d.className = 'vgp-fim';
    d.innerHTML = '<p class="vgp-k">Quer ajudar?</p><h3 class="vgp-t">Anotações ou provas antigas valem acesso grátis.</h3>' +
      '<p class="vgp-d">Se você tem anotações de aula ou provas antigas e quer ajudar a turma, fale com o Matheus ou com o Vinícius e negocie seu acesso grátis. No semestre que vem, o 5º período já vem quase todo pronto: ' + MATERIAS_5P + '.</p>' +
      '<div class="vgp-r">' + botoes('ajuda') + '</div>';
    alvo.appendChild(d);
  }

  function iniciar() {
    boasVindas();
    blocoFinal();
    agendar(PRIMEIRO_MS);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();

  /* o hub usa isto para o bloco final e a faixa */
  window.VGP = { contatos: CONTATOS, materias5p: MATERIAS_5P, botoes: botoes, ativo: true };
})();
