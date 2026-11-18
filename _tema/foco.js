/* Foco de estudo: painel no topo da barra lateral de cada master.
   - Grifos nas aulas e nos segmentos da barra, pela frequência nas provas: das parciais, das somativas, de todas, ou desligados.
     A cor segue a dos grifos do texto (verde → amarelo → laranja → vermelho → preto) e é relativa ao master:
     preto = o que mais cai nele.
   - Divisão das aulas escolhida pela pessoa ("a parcial da minha turma vai até a aula N"), porque cada turma divide de um jeito.
   - Aulas já estudadas (todos os segmentos concluídos) vão para um grupo recolhido, para a barra ficar curta.
   Tudo pode ser desligado, e fica salvo no navegador, por master (localStorage "vg-foco:<chave>").
   O script lê o DOM e os dados de cada master sem mexer no código dele: cada master tem um adaptador em AD.
   Patologia: as aulas ficam em aulas/ (iframes), então a frequência de cada segmento vem de window.VG_FOCO,
   que o publicar.py conta nas aulas e grava no master (bloco vidro:foco). TH IV (prova prática) fica de fora. */
(function () {
  const D = document, html = D.documentElement, K = html.dataset.vidro || '';
  if (window.__vgFoco) return; window.__vgFoco = true;
  const LS = k => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } };
  const refsDe = h => { const out = []; String(h || '').replace(/\\"/g, '"').replace(/data-refs="([^"]*)"/g, (_, r) => { r.split(',').forEach(x => { x = x.trim(); if (x) out.push(x); }); }); return out; };
  const uniq = a => [...new Set(a)];

  /* ---------- adaptadores ---------- */
  const caderno = { // Humanização, Preventiva, Propedêutica (molde "caderno interativo")
    nav: () => D.getElementById('nav'),
    aulas: () => [...D.querySelectorAll('#nav .grp[data-lesson]')].map(el => ({ el, key: el.dataset.lesson, head: el.querySelector('.grp-h'), cur: el.classList.contains('on') })),
    segs: a => [...a.el.querySelectorAll('.it[data-seg]')].map(el => ({ el, key: el.dataset.seg })),
    dados: () => data.lessons.map(l => {
      const segs = {};
      l.sections.forEach(s => { const rs = (s.refs || []).map(r => examById[r]).filter(Boolean); segs[s.id] = { p: rs.filter(x => x.group === 'parciais').length, s: rs.filter(x => x.group === 'somativas').length }; });
      return { key: l.id, nome: 'Aula ' + l.number, done: l.sections.length > 0 && l.sections.every(s => state.read[s.id]), segs };
    }),
  };
  const AD = {
    huma: caderno, prev: caderno, img: caderno, lab: caderno,
    micro: {
      nav: () => D.getElementById('nav'),
      aulas: () => [...D.querySelectorAll('#nav .grp[data-g]')].map(el => ({ el, key: el.dataset.g, head: el.querySelector('.gh'), cur: el.classList.contains('cur') })),
      segs: a => [...a.el.querySelectorAll('.it[data-go]')].map(el => ({ el, key: el.dataset.go })),
      dados: () => { const st = LS('mc-micro-v1') || {}, dn = st.done || {}; return DATA.modules.map(m => {
        const segs = {};
        m.segs.forEach(s => { const r = refsDe(s.html); const P = uniq(r.filter(x => /^P/i.test(x))).length; segs[m.id + '/' + s.id] = { p: P, s: uniq(r).length - P }; });
        return { key: m.id, nome: 'Aula ' + m.num, done: m.segs.every(s => dn[m.id + '/' + s.id]), segs };
      }); },
    },
    semio: { // mesmo molde da Microbiologia; parcial = P80–P82 e Estudo dirigido (ED)
      nav: () => AD.micro.nav(), aulas: () => AD.micro.aulas(), segs: a => AD.micro.segs(a),
      dados: () => { const st = LS('mc-semio-v1') || {}, dn = st.done || {}; return DATA.modules.map(m => {
        const segs = {};
        m.segs.forEach(s => { const r = uniq(refsDe(s.html).concat(s.pv || [])); const P = r.filter(x => /^(P|ED)/i.test(x)).length; segs[m.id + '/' + s.id] = { p: P, s: r.length - P }; });
        return { key: m.id, nome: 'Aula ' + m.num, done: m.segs.every(s => dn[m.id + '/' + s.id]), segs };
      }); },
    },
    farmaco: {
      nav: () => D.querySelector('.sb-nav'),
      aulas: () => [...D.querySelectorAll('.sb-nav > .grp')].filter(el => /^Aula/.test((el.querySelector('.grp-h') || {}).title || '')).map(el => ({ el, key: (el.querySelector('.it') || {}).dataset.id, head: el.querySelector('.grp-h'), cur: !!el.querySelector('.it.active') })),
      segs: a => [...a.el.querySelectorAll('.it[data-id]')].map(el => ({ el, key: el.dataset.id })),
      dados: () => AD.farmaco.aulas().map(a => {
        const segs = {}, its = AD.farmaco.segs(a);
        its.forEach(s => { const d = D.querySelector('.done-t[data-id="' + s.key + '"]'), p = d && d.closest('section.pane');
          segs[s.key] = { p: 0, s: p ? uniq([...p.querySelectorAll('mark[data-refs]')].flatMap(m => refsDe('data-refs="' + m.dataset.refs + '"'))).length : 0 }; });
        const ins = [...a.el.querySelectorAll('.it input')];
        return { key: a.key, nome: ((a.head.title || '').match(/^Aula[^:]*/) || [''])[0], done: ins.length > 0 && ins.every(i => i.checked), segs };
      }),
    },
    port: {
      nav: () => D.getElementById('nav'),
      aulas: () => [...D.querySelectorAll('#nav .nv[data-v="mod"]')].map(el => { const n = el.nextElementSibling; return { el, key: el.dataset.id, head: el, cur: el.classList.contains('on'), extra: n && n.classList.contains('sub') ? [n] : [] }; }),
      segs: a => (a.extra || []).flatMap(x => [...x.querySelectorAll('.sb[data-sg]')]).map(el => ({ el, key: a.key + ':' + el.dataset.sg })),
      dados: () => { const st = LS('lpii') || {}, dn = st.done || {}; return MODS.map(m => {
        const segs = {};
        m.segs.forEach((s, i) => { const js = []; String(s.h || '').replace(/data-j="([^"]*)"/g, (_, r) => { r.split(',').forEach(x => js.push(x.trim())); }); segs[m.id + ':' + i] = { p: 0, s: uniq(js).length }; });
        return { key: m.id, nome: 'Aula ' + m.n, done: m.segs.every((_, i) => dn[m.id + ':' + i]), segs, sAula: PROVA.filter(q => q.m === m.id).length };
      }); },
    },
    pato: { // shell com as aulas em iframes; o título de sistema (Cardiovascular, TGI...) anda junto com a 1ª aula dele.
      // Ordem do curso (TABS): Neoplasias de pulmão (aula8) vem logo depois de Resp 3.
      grps: () => { const F = window.VG_FOCO || {}, T = typeof TABS !== 'undefined' ? TABS.map(x => x.key) : [], o = k => { const i = T.indexOf(k); return i < 0 ? 999 : i; };
        return [...D.querySelectorAll('#tabbtns .grp[data-key]')].filter(el => F[el.dataset.key]).sort((a, b) => o(a.dataset.key) - o(b.dataset.key)); },
      nav: () => D.getElementById('tabbtns'),
      aulas: () => AD.pato.grps().map(el => {
        const p = el.previousElementSibling;
        return { el, key: el.dataset.key, head: el.querySelector('.grp-h'), cur: el.classList.contains('on'), pre: p && p.classList.contains('sb-sec') ? [p] : [] };
      }),
      segs: a => [...a.el.querySelectorAll('.it[data-seg]')].map(el => ({ el, key: el.dataset.seg })),
      dados: () => { const F = window.VG_FOCO || {}, AB = { Cardiovascular: 'Cardio', 'Respiratório': 'Resp' };
        return AD.pato.grps().map(el => {
          const k = el.dataset.key, f = F[k], t = (typeof TABS !== 'undefined' ? TABS : []).find(x => x.key === k) || {};
          const [sis, n] = String(t.label || k).split(/\s*—\s*/), nome = (AB[sis] || sis) + ' ' + String(n || '').replace(/\D/g, '');
          const segs = {}; Object.entries(f.segs || {}).forEach(([s, v]) => { segs[s] = { p: v[0], s: v[1] }; });
          const ins = [...el.querySelectorAll('.it input')];
          return { key: k, nome, rot: nome + (t.short ? ' · ' + t.short : ''), done: ins.length > 0 && ins.every(i => i.checked), segs, pAula: f.p, sAula: f.s };
        }); },
    },
  };
  const A = AD[K]; if (!A) return;

  /* ---------- configuração ---------- */
  const CK = 'vg-foco:' + K;
  const cfg = Object.assign({ modo: 'todos', div: true, corte: null, recolher: true, open: {} }, LS(CK) || {});
  const SEM_FEITAS = new Proxy({}, { get: () => 1 }); // o grupo "Já estudadas" saiu de todos os masters (pedido do Matheus)
  if (SEM_FEITAS[K]) cfg.recolher = false;
  const salva = () => { try { localStorage.setItem(CK, JSON.stringify(cfg)); } catch (e) {} };
  const CORTE0 = { huma: 4, prev: 5, img: 7, micro: 3, semio: 4, farmaco: 3, port: 4, pato: 7 }; // divisão que o master já usava

  /* ---------- estilo ---------- */
  const st = D.createElement('style'); st.id = 'vg-foco-css';
  st.textContent = `
html.vgf-on .sb-bloco,html.vgf-on .sb-fold{display:none!important}
html.vgf-on .sb-bloco-c{display:contents!important}
html.vgf-on .vgf-nav{display:flex!important;flex-direction:column}
html.vgf-on .vgf-nav>*{flex:0 0 auto}
html.vgf-on .vgf-nav .grp:not(.vgf-x){display:block!important}
html.vgf-on .vgf-nav .vgf-x,html.vgf-on .vgf-nav .grp.vgf-x{display:none!important}
.vgf-h{all:unset;box-sizing:border-box;display:flex;align-items:center;gap:8px;width:100%;margin:10px 0 4px;padding:7px 10px;border-radius:12px;cursor:pointer;
  font:600 12px/1.2 var(--vg-text,system-ui,sans-serif);letter-spacing:.06em;text-transform:uppercase;color:var(--muted,#8a94a3)}
.vgf-h:hover{background:var(--vg-hov,rgba(127,127,127,.12))}
.vgf-h .c{transition:transform .2s;font-size:9px}.vgf-h[aria-expanded="true"] .c{transform:rotate(90deg)}
.vgf-h>span:nth-child(2){white-space:nowrap}
.vgf-h .n{margin-left:auto;text-align:right;font-weight:500;text-transform:none;letter-spacing:0;opacity:.8}
.vgf-h:focus-visible{outline:2px solid var(--vg-acc,#5aa9ff)}
/* barra recolhida (cada master marca de um jeito: .sidebar.collapsed, body.sb-collapsed, body.collapsed) */
:is(.collapsed,.sb-collapsed,.sb-off) .vgf-panel{display:none!important}
:is(.collapsed,.sb-collapsed,.sb-off) .vgf-h{justify-content:center;padding:6px 0;margin:6px 0 2px}
:is(.collapsed,.sb-collapsed,.sb-off) .vgf-h>span:not(.c){display:none!important}
@media (max-width:900px){ /* no celular a barra abre inteira por cima: nada recolhido */
  :is(.collapsed,.sb-collapsed,.sb-off) .vgf-panel{display:block!important}
  :is(.collapsed,.sb-collapsed,.sb-off) .vgf-h{justify-content:flex-start;padding:7px 10px;margin:10px 0 4px}
  :is(.collapsed,.sb-collapsed,.sb-off) .vgf-h>span:not(.c){display:inline!important}
}
.vgf-panel{margin:4px 8px 10px;border-radius:14px;background:var(--vg-glass,rgba(127,127,127,.08));font:400 13px/1.4 var(--vg-text,system-ui,sans-serif);color:var(--ink,inherit)}
.vgf-panel>summary{list-style:none;cursor:pointer;padding:9px 12px;font-weight:600;display:flex;gap:8px;align-items:center}
.vgf-panel>summary::-webkit-details-marker{display:none}
.vgf-panel>summary .m{margin-left:auto;font-weight:400;color:var(--muted,#8a94a3);font-size:12px}
.vgf-b{padding:0 12px 12px;display:grid;gap:10px}
.vgf-b .lb{font-size:11.5px;letter-spacing:.05em;text-transform:uppercase;color:var(--muted,#8a94a3);margin-bottom:5px}
.vgf-seg{display:flex;flex-wrap:wrap;gap:4px}
.vgf-seg button{all:unset;cursor:pointer;padding:5px 10px;border-radius:999px;font-size:12.5px;background:var(--vg-control,rgba(127,127,127,.14))}
.vgf-seg button[aria-pressed="true"]{background:var(--vg-acc,#5aa9ff);color:var(--vg-on-acc,#04162b);font-weight:600}
.vgf-seg button[disabled]{opacity:.4;cursor:not-allowed}
.vgf-seg button:focus-visible{outline:2px solid var(--vg-acc,#5aa9ff)}
.vgf-leg{display:flex;align-items:center;gap:4px;font-size:11.5px;color:var(--muted,#8a94a3)}
.vgf-leg i{width:18px;height:8px;border-radius:4px;display:inline-block}
.vgf-b label{display:flex;gap:8px;align-items:center;cursor:pointer}
.vgf-b select{font:inherit;color:inherit;background:var(--vg-control,rgba(127,127,127,.14));border:0;border-radius:8px;padding:4px 6px;max-width:100%}
.vgf-b select option{color:#111}
.vgf-b label.corte{display:block}.vgf-b label.corte select{display:block;width:100%;margin-top:5px}
.vgf-b .nota{font-size:12px;color:var(--muted,#8a94a3)}
:root{--vgf1:#3fb950;--vgf2:#e3b341;--vgf3:#f0883e;--vgf4:#f85149;--vgf5:#0b0b0b}
.vgf-leg i.g1{background:var(--vgf1)}.vgf-leg i.g2{background:var(--vgf2)}.vgf-leg i.g3{background:var(--vgf3)}.vgf-leg i.g4{background:var(--vgf4)}.vgf-leg i.g5{background:var(--vgf5);box-shadow:0 0 0 1px rgba(255,255,255,.45)}
:is(.vgf-g1,.vgf-g2,.vgf-g3,.vgf-g4,.vgf-g5){position:relative}
.vgf-g1{--vgf:var(--vgf1)}.vgf-g2{--vgf:var(--vgf2)}.vgf-g3{--vgf:var(--vgf3)}.vgf-g4{--vgf:var(--vgf4)}.vgf-g5{--vgf:var(--vgf5)}
html .vgf-g1,html .vgf-g2,html .vgf-g3,html .vgf-g4,html .vgf-g5{box-shadow:inset 4px 0 0 var(--vgf)!important;background-image:linear-gradient(90deg,color-mix(in srgb,var(--vgf) 22%,transparent),transparent 85%)!important}
html .vgf-g5{box-shadow:inset 4px 0 0 var(--vgf),inset 5px 0 0 rgba(255,255,255,.55)!important;background-image:linear-gradient(90deg,rgba(0,0,0,.26),transparent 85%)!important}
`;
  D.head.appendChild(st);

  /* ---------- painel ---------- */
  let painel = null, totP = 0, totS = 0, info = [];
  const MODOS = [['todos', 'Todas'], ['parciais', 'Parciais'], ['somativas', 'Somativas'], ['off', 'Desligados']];
  function montaPainel(nav) {
    if (painel && painel.isConnected && (painel.nextElementSibling === nav || painel.parentElement === window.VGFocoHost)) return; // o abas.js põe o painel em "Ajustes da matéria"
    if (!painel) {
      painel = D.createElement('details'); painel.className = 'vgf-panel';
      painel.addEventListener('click', e => {
        const b = e.target.closest('[data-modo]'); if (b && !b.disabled) { cfg.modo = b.dataset.modo; salva(); aplica(); }
      });
      painel.addEventListener('change', e => {
        const t = e.target;
        if (t.name === 'div') cfg.div = t.checked;
        if (t.name === 'rec') cfg.recolher = t.checked && !SEM_FEITAS[K];
        if (t.name === 'corte') cfg.corte = +t.value;
        salva(); aplica();
      });
      painel.addEventListener('toggle', () => { cfg.painel = painel.open; salva(); });
      painel.open = !!cfg.painel;
    }
    if (window.VGFocoHost) window.VGFocoHost.appendChild(painel); else nav.parentElement.insertBefore(painel, nav);
  }
  function pintaPainel() {
    const corte = corteAtual(), nm = { todos: 'todas as provas', parciais: 'parciais', somativas: 'somativas', off: 'grifos desligados' }[cfg.modo];
    const sem = m => (m === 'parciais' && !totP) || (m === 'somativas' && !totS);
    const h = '<summary>🎯 Foco de estudo<span class="m">' + nm + '</span></summary><div class="vgf-b">' +
      '<div><div class="lb">Grifos nas aulas</div><div class="vgf-seg">' + MODOS.map(([k, t]) => '<button type="button" data-modo="' + k + '" aria-pressed="' + (cfg.modo === k) + '"' + (sem(k) ? ' disabled title="Não há ' + t.toLowerCase() + ' no acervo deste master"' : '') + '>' + t + '</button>').join('') + '</div></div>' +
      (cfg.modo !== 'off' ? '<div class="vgf-leg">cai pouco <i class="g1"></i><i class="g2"></i><i class="g3"></i><i class="g4"></i><i class="g5"></i> cai sempre</div>' : '') +
      (!totP ? '<div class="nota">Este master só tem somativas no acervo.</div>' : '') +
      '<label><input type="checkbox" name="div"' + (cfg.div ? ' checked' : '') + '> Dividir as aulas pela parcial</label>' +
      (cfg.div ? '<label class="corte">A parcial da minha turma vai até a <select name="corte">' + info.map((a, i) => '<option value="' + (i + 1) + '"' + (i + 1 === corte ? ' selected' : '') + '>' + esc(a.rot || a.nome || ('aula ' + (i + 1))) + '</option>').join('') + '</select></label>' : '') +
      (SEM_FEITAS[K] ? '' : '<label><input type="checkbox" name="rec"' + (cfg.recolher ? ' checked' : '') + '> Recolher as aulas já estudadas</label>') + '</div>';
    if (painel.dataset.k !== h) { const o = painel.open; painel.innerHTML = h; painel.open = o; painel.dataset.k = h; }
  }
  const esc = s => String(s).replace(/[<>&"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));
  const corteAtual = () => Math.max(1, Math.min(info.length || 1, cfg.corte || CORTE0[K] || Math.ceil((info.length || 2) / 2)));

  /* ---------- grifos ---------- */
  const val = o => cfg.modo === 'parciais' ? o.p : cfg.modo === 'somativas' ? o.s : o.p + o.s;
  const nivel = (v, max) => { if (!v || !max) return 0; const r = v / max; return r >= .8 ? 5 : r >= .6 ? 4 : r >= .4 ? 3 : r >= .2 ? 2 : 1; };
  const tiraG = el => { if (el) el.classList.remove('vgf-g1', 'vgf-g2', 'vgf-g3', 'vgf-g4', 'vgf-g5'); };
  const poeG = (el, n, txt) => { if (!el) return; tiraG(el); if (n) { el.classList.add('vgf-g' + n); el.dataset.vgfTip = txt; } else delete el.dataset.vgfTip; };

  /* ---------- aplicar ---------- */
  let obs = null, raf = 0, ocupado = false;
  function aplica() {
    raf = 0;
    const nav = A.nav(); if (!nav) return;
    let aulas; try { aulas = A.aulas(); info = A.dados(); } catch (e) { return; }
    if (!aulas.length || !info.length) return;
    const scrollAntes = K === 'farmaco' ? nav.scrollTop : null;
    ocupado = true; if (obs) obs.disconnect();
    try {
      const porKey = Object.fromEntries(info.map(a => [a.key, a]));
      aulas = aulas.filter(a => porKey[a.key]); // grupos que não são aula (revisão, simulados) ficam onde estão
      const somaP = i => i.pAula != null ? i.pAula : Object.values(i.segs).reduce((u, s) => u + s.p, 0);
      const somaS = i => i.sAula != null ? i.sAula : Object.values(i.segs).reduce((u, s) => u + s.s, 0);
      totP = info.reduce((t, a) => t + somaP(a), 0);
      totS = info.reduce((t, a) => t + somaS(a), 0);
      if ((cfg.modo === 'parciais' && !totP) || (cfg.modo === 'somativas' && !totS)) cfg.modo = 'todos';
      montaPainel(nav); pintaPainel();

      /* grifos */
      // total da aula: questões únicas (pAula/sAula, quando o adaptador sabe) ou a soma dos segmentos
      const vA = a => { const i = porKey[a.key]; if (!i) return 0; return cfg.modo === 'parciais' ? somaP(i) : cfg.modo === 'somativas' ? somaS(i) : somaP(i) + somaS(i); };
      const maxA = Math.max(0, ...aulas.map(vA));
      const maxS = Math.max(0, ...info.flatMap(i => Object.values(i.segs).map(val)));
      const nomeM = { todos: 'nas provas', parciais: 'nas parciais', somativas: 'nas somativas' }[cfg.modo];
      aulas.forEach(a => {
        const v = cfg.modo === 'off' ? 0 : vA(a);
        poeG(a.head, nivel(v, maxA), v + ' quest' + (v === 1 ? 'ão' : 'ões') + ' ' + nomeM);
        const i = porKey[a.key];
        A.segs(a).forEach(s => { const o = i && i.segs[s.key]; const w = cfg.modo === 'off' || !o ? 0 : val(o); poeG(s.el, nivel(w, maxS), w + ' ' + nomeM); });
      });

      /* divisão e recolhidas */
      // Farmacologia mantém o mesmo botão durante a atualização para não interromper o toque.
      const headers = new Map();
      nav.querySelectorAll(':scope > .vgf-h').forEach(h => {
        if (K === 'farmaco') headers.set(h.dataset.g, h); else h.remove();
      });
      const liga = cfg.div || cfg.recolher;
      html.classList.toggle('vgf-on', liga); nav.classList.toggle('vgf-nav', liga);
      // os cabeçalhos reaproveitados (.vgf-h) não entram na lista: a ordem deles é dada abaixo, junto do grupo
      const flat = []; [...nav.children].forEach(c => { if (c.classList.contains('vgf-h')) return; if (c.classList.contains('sb-bloco-c')) flat.push(...c.children); else flat.push(c); });
      flat.forEach(c => { c.style.order = ''; c.classList.remove('vgf-x'); });
      if (!liga) { headers.forEach(h => h.remove()); return; }
      const ehAula = new Map(); aulas.forEach((a, idx) => { ehAula.set(a.el, { a, idx }); [...(a.pre || []), ...(a.extra || [])].forEach(x => ehAula.set(x, { a, idx, extra: true })); });
      const primeira = flat.findIndex(c => ehAula.has(c));
      const antes = flat.slice(0, primeira).filter(c => !ehAula.has(c));
      const depois = flat.slice(primeira).filter(c => !ehAula.has(c));
      const corte = corteAtual();
      const feita = a => { const i = porKey[a.key]; return !!(cfg.recolher && i && i.done); };
      const grupos = [];
      const nomeDe = a => (porKey[a.key] || {}).nome || '';
      if (cfg.div) {
        const g1 = aulas.filter((a, i) => i < corte && !feita(a)), g2 = aulas.filter((a, i) => i >= corte && !feita(a));
        const faixa = (ini, fim) => {
          const a = nomeDe(aulas[ini]), b = nomeDe(aulas[fim]); if (ini === fim) return a;
          const x = (a.match(/\d+/) || [])[0], y = (b.match(/\d+(?!.*\d)/) || [])[0];
          const pa = a.replace(/\s*\d.*$/, ''), pb = b.replace(/\s*\d.*$/, ''); // "Aula", "Cardio", "TGI"...
          if (x && y && pa === pb) return (/^aula$/i.test(pa) ? 'Aulas' : pa) + ' ' + x + ' a ' + y;
          return a + ' a ' + b.replace(/^Aula\s*/i, 'aula ');
        };
        grupos.push({ id: 'parcial', t: 'Até a parcial', n: faixa(0, corte - 1), a: g1 });
        if (corte < aulas.length) grupos.push({ id: 'depois', t: 'Depois da parcial', n: faixa(corte, aulas.length - 1), a: g2 });
      } else grupos.push({ id: 'todas', t: null, a: aulas.filter(a => !feita(a)) });
      if (cfg.recolher) { const f = aulas.filter(feita); if (f.length) grupos.push({ id: 'feitas', t: '✅ Já estudadas', n: f.length + ' aula' + (f.length > 1 ? 's' : ''), a: f }); }
      let o = 0; antes.forEach(c => { c.style.order = ++o; });
      grupos.forEach(g => {
        const temCur = g.a.some(a => a.cur);
        let ab = g.t == null ? true : (cfg.open[g.id] != null ? cfg.open[g.id] : (g.id !== 'feitas' && temCur));
        if (temCur && g.id !== 'feitas' && cfg.openAula !== curKey(aulas)) { ab = true; }
        if (g.t != null) {
          const anterior = headers.get(g.id);
          headers.delete(g.id);
          const h = anterior || D.createElement('button');
          if (!anterior) { h.type = 'button'; h.className = 'vgf-h'; h.dataset.g = g.id; }
          h.setAttribute('aria-expanded', ab); const rotulo = '<span class="c">▶</span><span>' + esc(g.t) + '</span><span class="n">' + esc(g.n || '') + '</span>';
          if (h.dataset.rotulo !== rotulo) { h.innerHTML = rotulo; h.dataset.rotulo = rotulo; }
          h.style.order = ++o; if (!anterior) nav.appendChild(h);
        }
        g.a.forEach(a => { [...(a.pre || []), a.el, ...(a.extra || [])].forEach(x => { x.style.order = ++o; x.classList.toggle('vgf-x', !ab); }); });
      });
      headers.forEach(h => h.remove());
      cfg.openAula = curKey(aulas);
      depois.forEach(c => { c.style.order = ++o; });
    } finally {
      if (scrollAntes !== null) nav.scrollTop = scrollAntes;
      ocupado = false;
      observa(nav);
    }
  }
  const curKey = aulas => { const c = aulas.find(a => a.cur); return c ? c.key : ''; };
  const rolador = nav => { for (let e = nav; e && e !== D.body; e = e.parentElement) { const o = getComputedStyle(e).overflowY; if ((o === 'auto' || o === 'scroll') && e.scrollHeight > e.clientHeight + 1) return e; } return null; };
  let memo = null; // { top, t }: rolagem da barra no momento do clique/tecla dentro dela
  const lembra = e => { const nav = A.nav(); if (!nav || !nav.contains(e.target)) return; const r = rolador(nav); if (r) memo = { top: r.scrollTop, t: Date.now() }; };
  D.addEventListener('pointerdown', lembra, true);
  D.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') lembra(e); }, true);
  function arrumaRolagem(nav) {
    const r = rolador(nav); if (!r) return;
    if (memo && Date.now() - memo.t < 1500) r.scrollTop = memo.top;
    const at = nav.querySelector('.it.active,.it.on,.it.cur,.sb.on,.it[aria-current="page"],.it[aria-current="true"]');
    if (!at || !at.getClientRects().length) return;
    const a = at.getBoundingClientRect(), b = r.getBoundingClientRect();
    if (a.top < b.top + 4) r.scrollTop -= b.top + 4 - a.top; else if (a.bottom > b.bottom - 4) r.scrollTop += a.bottom - (b.bottom - 4);
  }
  function observa(nav) {
    if (!obs) obs = new MutationObserver(() => { if (!ocupado && !raf) raf = requestAnimationFrame(() => { aplica(); const nav = A.nav(); if (nav && K !== 'farmaco') arrumaRolagem(nav); }); });
    obs.observe(nav, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  }
  D.addEventListener('click', e => {
    const h = e.target.closest('.vgf-h'); if (!h) return;
    e.preventDefault(); e.stopPropagation();
    const nav = A.nav();
    const topo = K === 'farmaco' ? h.getBoundingClientRect().top : null;
    cfg.open[h.dataset.g] = h.getAttribute('aria-expanded') !== 'true'; salva(); aplica();
    if (topo !== null && h.isConnected) nav.scrollTop += h.getBoundingClientRect().top - topo;
  }, true);
  /* concluir um segmento muda "já estudadas": reaplica quando o estado salvo muda */
  addEventListener('storage', () => aplica());
  D.addEventListener('change', e => { if (!e.target.closest('.vgf-panel')) setTimeout(aplica, 50); }, true);
  D.addEventListener('click', e => { if (e.target.closest('[data-read],.done-t,.cel-finish,[data-sbread]')) setTimeout(aplica, 80); }, true);

  function start() { let n = 0; const t = setInterval(() => { if (A.nav() || ++n > 40) { clearInterval(t); aplica(); } }, 150); }
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', start); else start();
})();
