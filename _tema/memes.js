/* Meme secreto ao gabaritar, para masters que não têm sistema próprio de meme.
   (Farmacologia, Microbiologia e TH IV têm o deles; este arquivo não faz nada lá.)

   - A lista de memes fica em <pasta da matéria>/_img/memes.json: ["arquivo.webp", ...].
     Sem esse arquivo, nada acontece. As aulas em <pasta>/aulas/ usam a mesma lista e o mesmo baralho.
   - Cada grupo de questões (segmento, "Das provas", quiz, "O que mais cai") ganha um slot trancado.
     Acertou todas do grupo: o meme é liberado e abre um modal. Errou alguma: "zere e tente de novo".
   - Funciona com os formatos de questão dos masters: opções marcadas como certas/erradas por classe
     (is-correct/is-wrong, right/wrong, selected-correct/selected-incorrect).
   - Baralho sem repetição, salvo no localStorage da matéria. Respeita prefers-reduced-motion. */
(function () {
  if (window.__vgMemes) return; window.__vgMemes = true;
  const D = document, html = D.documentElement;
  if (D.getElementById('meme-js') || window.MEMES || html.dataset.memes === 'proprio') return;
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const naAula = /\/aulas\/[^/]*$/.test(location.pathname);
  const base = naAula ? '../_img/' : '_img/';
  const pasta = decodeURIComponent(location.pathname.replace(/\/aulas\/[^/]*$/, '/').replace(/[^/]*$/, ''));
  const KEY = 'vidro-memes:' + pasta;

  const GRUPO = '.pv-box,#quizlist,.qzone,.qsection,.quiz,.quizlist';
  const ITEM = '.q:not(.q-open),.qcard,fieldset.quiz-item';
  const CERTO = '.is-correct[aria-pressed="true"],.option.right input:checked,.option.right:has(input:checked),.selected-correct';
  const ERRADO = '.is-wrong,.option.wrong,.selected-incorrect';
  const RESPONDIDA = el => el.classList.contains('done') || !!el.querySelector('.qoption[disabled],.option.right,.option.wrong,' + ERRADO + ',' + CERTO);

  const TAUNT = ['Ei! Clicar não libera 😤', 'Insistir não abre. Acertar abre.', 'Tá trancado. As questões estão logo acima ☝️',
    'Nem com jeitinho.', 'Sem gabarito, sem meme.', 'Ele tremeu, mas não cedeu.', 'Isso não cai na prova, mas o meme cai no colo de quem acerta.'];
  const DICA = ['👀 Tem um meme aqui. Só aparece com gabarito perfeito.', 'Spoiler: é melhor que o slide 47.', 'Nenhum meme se repete até você ver todos.'];
  const LEGENDA = ['Diagnóstico: gabarito perfeito.', 'O professor ficaria orgulhoso (ou desconfiado).', 'Achado de necropsia: zero erros.', 'Prognóstico excelente.', 'Mereceu. Próximo segmento?'];
  const ANIM = [
    [{ transform: 'translateX(0)' }, { transform: 'translateX(-8px)' }, { transform: 'translateX(8px)' }, { transform: 'translateX(-5px)' }, { transform: 'translateX(0)' }],
    [{ transform: 'scale(1,1)' }, { transform: 'scale(1.08,.9)' }, { transform: 'scale(.94,1.06)' }, { transform: 'scale(1,1)' }],
    [{ transform: 'translateY(0)' }, { transform: 'translateY(-14px)' }, { transform: 'translateY(0)' }, { transform: 'translateY(-5px)' }, { transform: 'translateY(0)' }],
    [{ transform: 'rotate(0)' }, { transform: 'rotate(360deg)' }],
    [{ transform: 'rotate(0)' }, { transform: 'rotate(-5deg)' }, { transform: 'rotate(5deg)' }, { transform: 'rotate(-2deg)' }, { transform: 'rotate(0)' }],
    [{ transform: 'perspective(600px) rotateY(0)' }, { transform: 'perspective(600px) rotateY(180deg)' }, { transform: 'perspective(600px) rotateY(360deg)' }],
    [{ transform: 'scale(1)' }, { transform: 'scale(.86)' }, { transform: 'scale(1)' }]];
  const pick = (a, last) => { let n; do { n = Math.floor(Math.random() * a.length); } while (n === last && a.length > 1); return n; };

  let memes = [], st = { deck: [], got: {} };
  try { st = Object.assign(st, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (_) { }
  const salvar = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (_) { } };
  function sortear() {
    st.deck = (st.deck || []).filter(i => i < memes.length);
    if (!st.deck.length) { st.deck = memes.map((_, i) => i); for (let i = st.deck.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [st.deck[i], st.deck[j]] = [st.deck[j], st.deck[i]]; } }
    return st.deck.shift();
  }

  const css = D.createElement('style');
  css.textContent = `
.vg-meme{position:relative;display:flex;align-items:center;gap:14px;margin:14px 0 6px;padding:12px 14px;border-radius:14px;
  border:1px dashed var(--border,rgba(127,127,127,.45));cursor:pointer;user-select:none;-webkit-tap-highlight-color:transparent}
.vg-meme .vm-th{width:64px;height:64px;flex:none;border-radius:10px;overflow:hidden;background:#222}
.vg-meme .vm-th img{width:100%;height:100%;object-fit:cover;filter:blur(9px) brightness(.55);transform:scale(1.2)}
.vg-meme.on .vm-th img{filter:none;transform:none}
.vg-meme .vm-t{font:600 14px/1.35 system-ui,sans-serif}.vg-meme .vm-s{display:block;font-weight:400;font-size:12.5px;opacity:.75}
.vg-meme .vm-tip{position:absolute;left:50%;bottom:calc(100% + 6px);transform:translateX(-50%);white-space:nowrap;max-width:92vw;overflow:hidden;text-overflow:ellipsis;
  padding:6px 10px;border-radius:10px;background:#15181e;color:#fff;font:13px system-ui;pointer-events:none;opacity:0;transition:opacity .2s}
.vg-meme .vm-tip.on{opacity:1}
.vg-mm{position:fixed;inset:0;z-index:2147482000;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(4,6,10,.82);opacity:0;transition:opacity .2s cubic-bezier(.23,1,.32,1)}
.vg-mm.on{opacity:1}
.vg-mm .vm-box{max-width:min(560px,100%);max-height:100%;overflow:auto;background:var(--surface,#14171d);color:var(--ink,#eef1f5);border-radius:18px;padding:18px;text-align:center;transform:scale(.96);transition:transform .25s cubic-bezier(.23,1,.32,1)}
.vg-mm.on .vm-box{transform:scale(1)}
.vg-mm .vm-n{font:12px system-ui;opacity:.7;letter-spacing:.06em;text-transform:uppercase}.vg-mm h3{margin:4px 0 12px;font:700 22px system-ui}
.vg-mm img{display:block;max-width:100%;max-height:62vh;margin:0 auto;border-radius:12px}
.vg-mm p{margin:10px 0 14px;opacity:.85;font:14px system-ui}
.vg-mm button{border:0;border-radius:999px;padding:10px 22px;font:600 14px system-ui;background:var(--accent,#5aa9ff);color:#fff;cursor:pointer}
.vg-mm button:active{transform:scale(.97)}
@media (prefers-reduced-motion:reduce){.vg-mm,.vg-mm .vm-box{transition:none;transform:none}}`;
  D.head.appendChild(css);

  let aberto = null;
  function modal(i, n) {
    if (aberto) return; const volta = D.activeElement;
    const m = D.createElement('div'); m.className = 'vg-mm'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true'); m.setAttribute('aria-label', 'Meme liberado');
    m.innerHTML = '<div class="vm-box"><div class="vm-n">' + (n ? n + ' de ' + n + ' certas' : 'Meme liberado') + '</div><h3>Gabarito perfeito 🏆</h3><img alt="Meme"><p></p><button type="button">Continuar</button></div>';
    m.querySelector('img').src = base + memes[i]; m.querySelector('p').textContent = LEGENDA[Math.floor(Math.random() * LEGENDA.length)];
    const fecha = () => { if (!aberto) return; aberto = null; m.classList.remove('on'); setTimeout(() => m.remove(), RM ? 0 : 200); D.removeEventListener('keydown', tecla, true); if (volta && volta.focus) try { volta.focus({ preventScroll: true }); } catch (_) { } };
    const tecla = e => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); fecha(); } else if (e.key === 'Tab') { e.preventDefault(); m.querySelector('button').focus(); } };
    m.addEventListener('click', e => { if (e.target === m || e.target.tagName === 'BUTTON') fecha(); });
    D.body.appendChild(m); aberto = m; D.addEventListener('keydown', tecla, true);
    requestAnimationFrame(() => { m.classList.add('on'); m.querySelector('button').focus({ preventScroll: true }); });
  }

  function chave(g, itens) {
    const f = itens[0], id = f.getAttribute('data-qid') || f.id || f.getAttribute('data-exam') || (f.textContent || '').trim().slice(0, 60);
    return location.pathname.split('/').pop() + '|' + id + '|' + itens.length;
  }
  function slotDe(g) {
    let s = g.querySelector(':scope > .vg-meme');
    if (s) return s;
    s = D.createElement('div'); s.className = 'vg-meme'; s.setAttribute('role', 'button'); s.tabIndex = 0;
    s.innerHTML = '<span class="vm-th"><img alt="" loading="lazy"></span><span class="vm-t"></span><span class="vm-tip" aria-hidden="true"></span>';
    g.appendChild(s);
    let tl = -1, tt = 0;
    const tip = (txt, ms) => { const t = s.querySelector('.vm-tip'); t.textContent = txt; t.classList.add('on'); clearTimeout(tt); if (ms) tt = setTimeout(() => t.classList.remove('on'), ms); };
    s.addEventListener('mouseenter', () => { if (!s.classList.contains('on')) tip(DICA[Math.floor(Math.random() * DICA.length)]); });
    s.addEventListener('mouseleave', () => s.querySelector('.vm-tip').classList.remove('on'));
    const ativa = () => {
      const k = s.dataset.k;
      if (st.got[k] != null) { modal(st.got[k], 0); return; }
      tl = pick(TAUNT, tl); tip(TAUNT[tl], 1800);
      if (RM) { s.animate([{ opacity: .5 }, { opacity: 1 }], 300); return; }
      s.__a = pick(ANIM, s.__a); s.animate(ANIM[s.__a], { duration: 400 + Math.random() * 250, easing: 'cubic-bezier(.23,1,.32,1)' });
    };
    s.addEventListener('click', ativa);
    s.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ativa(); } });
    return s;
  }

  function varrer(final) {
    if (!memes.length) return;
    D.querySelectorAll(GRUPO).forEach(g => {
      if (g.closest('[data-sim],.vg-mm')) return;
      const itens = [...g.querySelectorAll(ITEM)].filter(x => x.closest(GRUPO) === g && x.querySelector('button,input'));
      if (!itens.length) return;
      const s = slotDe(g), k = chave(g, itens); s.dataset.k = k;
      const resp = itens.filter(RESPONDIDA), certas = resp.filter(x => x.querySelector(CERTO) && !x.querySelector(ERRADO));
      const errou = resp.length > certas.length, n = itens.length, t = s.querySelector('.vm-t'), img = s.querySelector('img');
      if (st.got[k] == null && !errou && certas.length === n && final) {
        st.got[k] = sortear(); salvar(); const i = st.got[k]; setTimeout(() => modal(i, n), 750);
      }
      const ok = st.got[k] != null;
      s.classList.toggle('on', ok);
      const alvo = base + memes[ok ? st.got[k] : (st.deck && st.deck.length ? st.deck[0] : 0)];
      if (img.getAttribute('src') !== alvo) img.src = alvo;
      t.innerHTML = ok ? 'Meme liberado 🏆<span class="vm-s">Clique para ver de novo</span>'
        : errou ? 'Meme secreto · ' + certas.length + ' de ' + n + ' certas<span class="vm-s">Uma errada… zere a questão e tente de novo</span>'
          : 'Meme secreto · ' + certas.length + ' de ' + n + ' certas<span class="vm-s">Acerte todas para revelar</span>';
    });
  }
  let tm = 0;
  const depois = final => { clearTimeout(tm); tm = setTimeout(() => varrer(final), 120); };

  fetch(base + 'memes.json', { cache: 'no-cache' }).then(r => r.ok ? r.json() : []).then(l => {
    memes = Array.isArray(l) ? l : []; if (!memes.length) return;
    varrer(false);
    D.addEventListener('click', e => { if (!e.target.closest('.vg-meme,.vg-mm')) depois(true); }, true);
    D.addEventListener('change', () => depois(false), true);
    addEventListener('hashchange', () => depois(false));
    new MutationObserver(ms => { if (ms.some(m => [...m.addedNodes].some(n => n.nodeType === 1 && !n.closest('.vg-meme,.vg-mm') && !n.classList.contains('vg-meme')))) depois(false); })
      .observe(D.body, { childList: true, subtree: true });
  }).catch(() => { });
})();
