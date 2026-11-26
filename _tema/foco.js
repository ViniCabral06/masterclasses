/* Foco de estudo: painel no topo da barra lateral de cada master.
   - Grifos nas aulas e nos segmentos da barra, pela frequência nas provas: das parciais, das somativas, de todas, ou desligados.
     A cor segue a dos grifos do texto (verde → amarelo → laranja → vermelho → preto) e é relativa ao master:
     preto = o que mais cai nele.
   - Divisão das aulas feita pela pessoa: ela marca cada aula como Parcial, Somativa ou Pós-somativa (cfg.prova),
     porque cada turma divide de um jeito. Nada é dividido sozinho; sem marcação, a barra mostra as aulas em ordem.
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
    dic: { // DIC IV (Enfermaria): leitos = aulas, abas do leito = segmentos; sem provas no acervo ainda, então frequência 0
      nav: caderno.nav, aulas: caderno.aulas, segs: caderno.segs,
      dados: () => AD.dic.aulas().map(a => { const its = AD.dic.segs(a), segs = {}; its.forEach(s => { segs[s.key] = { p: 0, s: 0 }; });
        const ins = [...a.el.querySelectorAll('.it input')]; return { key: a.key, nome: (a.head.querySelector('.ga') || a.head).textContent.replace(/[·\s]+$/, ''), done: ins.length > 0 && ins.every(i => i.checked), segs }; }),
    },
    micro: {
      nav: () => D.getElementById('nav'),
      aulas: () => [...D.querySelectorAll('#nav .grp[data-g]')].map(el => ({ el, key: el.dataset.g, head: el.querySelector('.gh'), cur: el.classList.contains('cur') })),
      segs: a => [...a.el.querySelectorAll('.it[data-go]')].map(el => ({ el, key: el.dataset.go })),
      dados: () => { const st = LS('mc-micro-v1') || {}, dn = st.done || {}; return DATA.modules.map(m => {
        const segs = {};
        m.segs.forEach(s => { const r = refsDe(s.html); const P = uniq(r.filter(x => /^P/i.test(x))).length; segs[m.id + '/' + s.id] = { p: P, s: uniq(r).length - P }; });
        // a Parcial 81 fica em DATA.prova.p81 (tema = aula), sem marcação por segmento: entra no total da aula
        const pr = (DATA.prova || {}), P81 = [...(pr.p81 || []), ...(pr.p81disc || [])].filter(q => q.tema === m.id).length;
        const o = { key: m.id, nome: 'Aula ' + m.num, done: m.segs.every(s => dn[m.id + '/' + s.id]), segs };
        if (P81) { o.pAula = P81 + Object.values(segs).reduce((u, s) => u + s.p, 0); o.sAula = Object.values(segs).reduce((u, s) => u + s.s, 0); }
        return o;
      }); },
    },
    semio: { // mesmo molde da Microbiologia; parcial = P80–P82 e Estudo dirigido (ED)
      nav: () => AD.micro.nav(), aulas: () => AD.micro.aulas(), segs: a => AD.micro.segs(a),
      dados: () => { const st = LS('mc-semio-v1') || {}, dn = st.done || {}; return DATA.modules.map(m => {
        const segs = {};
        m.segs.forEach(s => { const r = uniq(refsDe(s.html).concat(s.pv || [])); const P = r.filter(x => /^(P|ED(?!S))/i.test(x)).length; /* EDS (estudo dirigido da somativa) conta como somativa */ segs[m.id + '/' + s.id] = { p: P, s: r.length - P }; });
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
        return { key: m.id, nome: 'Aula ' + m.n, done: m.segs.every((_, i) => dn[m.id + ':' + i]), segs, sAula: Object.values(PROVA || {}).filter(q => q && q.m === m.id).length }; // PROVA pode vir como lista ou objeto
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
  /* divisão das aulas: a pessoa marca cada aula como parcial (p), somativa (s) ou pós-somativa (ps); nada é automático */
  if (!cfg.prova || typeof cfg.prova !== 'object') cfg.prova = {};
  const PV = [['p', 'Parcial', 'P'], ['s', 'Somativa', 'S'], ['ps', 'Pós-somativa', 'Pós']];
  const AVISO_PV = { prev: 'A professora avisou: na somativa só cai o que não foi cobrado na parcial.' };
  /* 🎯 Foco da professora: as aulas que ela disse que caem na próxima prova. Grifa só elas e separa o resto na barra. */
  const PROF = {
    lab: { ids: ['a08', 'a09', 'a10', 'a11', 'a12', 'a13', 'a14'],
      aviso: 'A professora avisou que caem: função hepática, marcadores inflamatórios, autoimunidade, COVID-19, dengue, zika e chikungunya, hepatites virais, HIV e outras ISTs, introdução à microbiologia e hiperglicemia.' },
  };
  const M = () => cfg.modo === 'prof' ? 'todos' : cfg.modo; // nos grifos, o foco da professora conta todas as provas
  const temMarca = () => Object.keys(cfg.prova).some(k => cfg.prova[k]);
  const SEM_FEITAS = new Proxy({}, { get: () => 1 }); // o grupo "Já estudadas" saiu de todos os masters (pedido do Matheus)
  if (SEM_FEITAS[K]) cfg.recolher = false;
  if (K === 'dic' && !('div' in (LS(CK) || {}))) cfg.div = false; // DIC IV: sem parcial/somativa (OSCE, revisão dos casos e APIC); a pessoa pode ligar a divisão
  const salva = () => { try { localStorage.setItem(CK, JSON.stringify(cfg)); } catch (e) {} };
  /* subgrupos de "Provas e revisão" (masters de caderno, onde a lista é longa e sempre aberta) */
  const RX_MASTER = { huma: 1, prev: 1, img: 1, lab: 1, port: 1 };
  const RX = [['rx-provas', '📝 Provas anteriores'], ['rx-final', '🎯 Reta final'], ['rx-treino', '🎮 Treinar']];
  const rxDe = t => /vai cair/i.test(t) ? 1
    : /parcia|somativa|provas com|das provas|se repetem|raio-x/i.test(t) ? 0
    : /arena|treino|plant[aã]o|flashcard|autora|minha revis|quiz/i.test(t) ? 2
    : /revis[aã]o|simulad|sinais|pegadinh|frequ[eê]ncia|termos|valores/i.test(t) ? 1 : -1;
  const CORTE0 = { dic: 5, huma: 4, prev: 5, img: 7, micro: 3, semio: 4, farmaco: 3, port: 4, pato: 7 }; // divisão que o master já usava

  /* ---------- estilo ---------- */
  const st = D.createElement('style'); st.id = 'vg-foco-css';
  st.textContent = `
html.vgf-on .sb-bloco,html.vgf-on .sb-fold,html.vgf-semdiv .sb-bloco{display:none!important}
html.vgf-on .sb-bloco-c,html.vgf-semdiv .sb-bloco-c{display:contents!important}
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
.vgf-prof{all:unset;box-sizing:border-box;display:block;width:100%;margin-top:6px;cursor:pointer;padding:7px 10px;border-radius:999px;font-size:12.5px;text-align:center;background:var(--vg-control,rgba(127,127,127,.14))}
.vgf-prof[aria-pressed="true"]{background:var(--vg-acc,#5aa9ff);color:var(--vg-on-acc,#04162b);font-weight:600}
.vgf-prof:focus-visible{outline:2px solid var(--vg-acc,#5aa9ff)}
.vgf-leg{display:flex;align-items:center;gap:4px;font-size:11.5px;color:var(--muted,#8a94a3)}
.vgf-leg i{width:18px;height:8px;border-radius:4px;display:inline-block}
.vgf-b label{display:flex;gap:8px;align-items:center;cursor:pointer}
.vgf-b select{font:inherit;color:inherit;background:var(--vg-control,rgba(127,127,127,.14));border:0;border-radius:8px;padding:4px 6px;max-width:100%}
.vgf-b select option{color:#111}
.vgf-b label.corte{display:block}.vgf-b label.corte select{display:block;width:100%;margin-top:5px}
.vgf-b .nota{font-size:12px;color:var(--muted,#8a94a3)}
.vgf-b .aviso{font-size:12px;line-height:1.4;padding:7px 9px;border-radius:10px;background:color-mix(in srgb,var(--vg-acc,#5aa9ff) 14%,transparent);box-shadow:inset 3px 0 0 var(--vg-acc,#5aa9ff)}
.vgf-pv>summary{cursor:pointer;font-weight:600;font-size:12.5px;list-style:none;display:flex;gap:6px;align-items:center}
.vgf-pv>summary::-webkit-details-marker{display:none}
.vgf-pv>summary::before{content:"▶";font-size:9px;transition:transform .2s}.vgf-pv[open]>summary::before{transform:rotate(90deg)}
.vgf-pv>summary .m{margin-left:auto;font-weight:400;color:var(--muted,#8a94a3);font-size:11.5px}
.vgf-pvl{display:grid;gap:3px;margin-top:8px;max-height:46vh;overflow:auto;padding-right:2px}
.vgf-pvr{display:flex;align-items:center;gap:6px;font-size:12.5px}
.vgf-pvr>span{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.vgf-pvr .vgf-seg{flex:0 0 auto;flex-wrap:nowrap;gap:3px}
.vgf-pvr .vgf-seg button{padding:3px 7px;font-size:11.5px}
.vgf-pvx{all:unset;cursor:pointer;font-size:12px;color:var(--muted,#8a94a3);text-decoration:underline;margin-top:6px;display:inline-block}
:root{--vgf1:#3fb950;--vgf2:#e3b341;--vgf3:#f0883e;--vgf4:#f85149;--vgf5:#0b0b0b}
.vgf-leg i.g1{background:var(--vgf1)}.vgf-leg i.g2{background:var(--vgf2)}.vgf-leg i.g3{background:var(--vgf3)}.vgf-leg i.g4{background:var(--vgf4)}.vgf-leg i.g5{background:var(--vgf5);box-shadow:0 0 0 1px rgba(255,255,255,.45)}
:is(.vgf-g1,.vgf-g2,.vgf-g3,.vgf-g4,.vgf-g5){position:relative}
.vgf-g1{--vgf:var(--vgf1)}.vgf-g2{--vgf:var(--vgf2)}.vgf-g3{--vgf:var(--vgf3)}.vgf-g4{--vgf:var(--vgf4)}.vgf-g5{--vgf:var(--vgf5)}
html .vgf-g1,html .vgf-g2,html .vgf-g3,html .vgf-g4,html .vgf-g5{box-shadow:inset 4px 0 0 var(--vgf)!important;background-image:linear-gradient(90deg,color-mix(in srgb,var(--vgf) 22%,transparent),transparent 85%)!important}
html .vgf-g5{box-shadow:inset 4px 0 0 var(--vgf),inset 5px 0 0 rgba(255,255,255,.55)!important;background-image:linear-gradient(90deg,rgba(0,0,0,.26),transparent 85%)!important}
/* tema escuro: a faixa preta sumia no fundo e o dourado se confundia com o amarelo (nível 2 e cor da Semiologia).
   O item vira um cartão preto sólido, com faixa e contorno brancos: dá para ver de longe qual é o mais cobrado. */
html[data-theme="dark"] .vgf-g5{background-color:#000!important;background-image:none!important;box-shadow:inset 4px 0 0 #fff,inset 0 0 0 1.5px rgba(255,255,255,.55)!important}
html[data-theme="dark"] .vgf-leg i.g5{background:#000;box-shadow:0 0 0 1.5px #fff}
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
        const v = e.target.closest('[data-pv]');
        if (v) { const k = v.dataset.a; if (cfg.prova[k] === v.dataset.pv) delete cfg.prova[k]; else cfg.prova[k] = v.dataset.pv; salva(); aplica(); }
        if (e.target.closest('[data-pvlimpa]')) { cfg.prova = {}; salva(); aplica(); }
      });
      painel.addEventListener('change', e => {
        const t = e.target;
        if (t.name === 'div') cfg.div = t.checked;
        if (t.name === 'rec') cfg.recolher = t.checked && !SEM_FEITAS[K];
        if (t.name === 'corte') cfg.corte = +t.value;
        salva(); aplica();
      });
      painel.addEventListener('toggle', e => { // captura: pega também o "Marcar as aulas" de dentro
        if (e.target !== painel && e.target.classList.contains('vgf-pv')) { cfg.pvAberto = e.target.open; salva(); }
      }, true);
      // o painel sempre abre fechado na barra lateral (não guarda aberto/fechado: o 🥷 modo foco abre ele em Ajustes e isso ficava salvo)
      painel.open = false;
    }
    if (window.VGFocoHost) window.VGFocoHost.appendChild(painel); else nav.parentElement.insertBefore(painel, nav);
  }
  function pintaPainel() {
    const nm = { todos: 'todas as provas', parciais: 'parciais', somativas: 'somativas', off: 'grifos desligados', prof: 'foco da professora' }[cfg.modo];
    const nMarc = info.filter(a => cfg.prova[a.key]).length;
    const sem = m => (m === 'parciais' && !totP) || (m === 'somativas' && !totS);
    const h = '<summary>🎯 Foco de estudo<span class="m">' + nm + '</span></summary><div class="vgf-b">' +
      '<div><div class="lb">Grifos nas aulas</div><div class="vgf-seg">' + MODOS.map(([k, t]) => '<button type="button" data-modo="' + k + '" aria-pressed="' + (cfg.modo === k) + '"' + (sem(k) ? ' disabled title="Não há ' + t.toLowerCase() + ' no acervo deste master"' : '') + '>' + t + '</button>').join('') + '</div>' +
        (PROF[K] ? '<button type="button" class="vgf-prof" data-modo="prof" aria-pressed="' + (cfg.modo === 'prof') + '">🎯 Foco da professora</button>' : '') + '</div>' +
      (cfg.modo !== 'off' ? '<div class="vgf-leg">cai pouco <i class="g1"></i><i class="g2"></i><i class="g3"></i><i class="g4"></i><i class="g5"></i> cai sempre</div>' : '') +
      (!totP ? '<div class="nota">Este master só tem somativas no acervo.</div>' : '') +
      (cfg.modo === 'prof' && PROF[K] ? '<div class="aviso">📣 ' + esc(PROF[K].aviso) + '</div>' : '') +
      (AVISO_PV[K] ? '<div class="aviso">📣 ' + esc(AVISO_PV[K]) + '</div>' : '') +
      '<details class="vgf-pv"' + (cfg.pvAberto ? ' open' : '') + '><summary>Em qual prova cai cada aula<span class="m">' + (nMarc ? nMarc + ' marcada' + (nMarc > 1 ? 's' : '') : 'nenhuma marcada') + '</span></summary>' +
      '<div class="nota" style="margin-top:6px">Marque conforme a sua turma: P = parcial, S = somativa, Pós = pós-somativa. A barra lateral se organiza pelo que você marcar. Toque de novo para desmarcar.</div>' +
      '<div class="vgf-pvl">' + info.map(a => '<div class="vgf-pvr"><span title="' + esc(a.rot || a.nome) + '">' + esc(a.rot || a.nome) + '</span><div class="vgf-seg">' +
        PV.map(([t, nome, curto]) => '<button type="button" data-a="' + esc(a.key) + '" data-pv="' + t + '" aria-pressed="' + (cfg.prova[a.key] === t) + '" title="' + nome + '">' + curto + '</button>').join('') + '</div></div>').join('') + '</div>' +
      (nMarc ? '<button type="button" class="vgf-pvx" data-pvlimpa>Limpar marcações</button>' : '') + '</details>' +
      (SEM_FEITAS[K] ? '' : '<label><input type="checkbox" name="rec"' + (cfg.recolher ? ' checked' : '') + '> Recolher as aulas já estudadas</label>') + '</div>';
    if (painel.dataset.k !== h) { const o = painel.open; painel.innerHTML = h; painel.open = o; painel.dataset.k = h; }
  }
  const esc = s => String(s).replace(/[<>&"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));
  const corteAtual = () => Math.max(1, Math.min(info.length || 1, cfg.corte || CORTE0[K] || Math.ceil((info.length || 2) / 2)));

  /* ---------- grifos ---------- */
  const val = o => M() === 'parciais' ? o.p : M() === 'somativas' ? o.s : o.p + o.s;
  const nivel = (v, max) => { if (!v || !max) return 0; const r = v / max; return r >= .8 ? 5 : r >= .6 ? 4 : r >= .4 ? 3 : r >= .2 ? 2 : 1; };
  const tiraG = el => { if (el) el.classList.remove('vgf-g1', 'vgf-g2', 'vgf-g3', 'vgf-g4', 'vgf-g5'); };
  const poeG = (el, n, txt) => { if (!el) return; tiraG(el); if (n) { el.classList.add('vgf-g' + n); el.dataset.vgfTip = txt; } else delete el.dataset.vgfTip; };

  /* ---------- grifos no texto (mark[data-refs] do próprio master) ----------
     Cada master pinta os grifos do texto com o nível pela quantidade de provas (exam1–5, f1–5, fq1–5).
     Aqui o grifo segue o filtro: só as refs das parciais, só as das somativas, todas, ou nenhum. */
  const cad = r => { const x = typeof examById !== 'undefined' && examById[r]; return x ? (x.group === 'parciais' ? 'p' : 's') : (/^p/i.test(r) ? 'p' : 's'); };
  const TIPO = { huma: cad, prev: cad, img: cad, lab: cad, micro: r => /^P/i.test(r) ? 'p' : 's', semio: r => /^(P|ED)/i.test(r) ? 'p' : 's', farmaco: () => 's', pato: () => 'p' }; // Patologia: os grifos das aulas são das parciais (rótulo "Parcial N — Questão X")
  const PROVA = r => { const x = typeof examById !== 'undefined' && examById[r]; return x && x.exam ? x.exam : String(r).split(/[-.:]/)[0]; };
  const NIV = /^(exam|fq|f)([1-5])$/;
  const CSS_SM = 'mark.vgf-sm{background:none!important;color:inherit!important;box-shadow:none!important;border:0!important;padding:0!important;text-decoration:none!important}mark.vgf-sm::before,mark.vgf-sm::after{display:none!important}';
  const docsVistos = new WeakSet();
  function docsTexto() {
    const out = [D];
    D.querySelectorAll('iframe').forEach(f => { try { const d = f.contentDocument; if (d && d.body) out.push(d); } catch (e) {} });
    return out;
  }
  /* ---------- questões de prova separadas por parcial e somativa ----------
     Com o Foco em "Parciais" ou "Somativas", cada lista de questões de prova (⭐ O que mais foi cobrado,
     "Das provas" do segmento) ganha duas abas: a do foco abre primeiro, a outra fica a um toque.
     Em "Todas" (ou desligado) as questões ficam juntas, como sempre. */
  const QS = { huma: ['.pv-item', '.pv-chip'], prev: ['.pv-item', '.pv-chip'], img: ['.pv-item', '.pv-chip'], lab: ['.pv-item', '.pv-chip'],
    semio: ['.q', '.qtag.pv'] }; // Microbiologia: os segmentos só têm somativas (a Parcial 81 fica à parte), nada a separar
  const qTipo = t => /somativa|\bS\s?\d{2}\b/i.test(t) ? 's' : /parcia|estudo dirigido|\bP\s?\d{2}\b|\bED\b/i.test(t) ? 'p' : '';
  const qAba = new Map(); // aba escolhida em cada lista (por página), para não voltar ao re-desenhar
  const CSS_Q = `.vgf-qx{display:none!important}
.vgf-qtabs{display:flex;flex-wrap:wrap;gap:6px;margin:10px 0 12px}
.vgf-qtabs button{all:unset;cursor:pointer;padding:7px 13px;border-radius:999px;font:600 13.5px/1.2 var(--vg-text,system-ui,sans-serif);
  background:color-mix(in srgb,currentColor 7%,transparent);box-shadow:inset 0 0 0 1px color-mix(in srgb,currentColor 18%,transparent)}
.vgf-qtabs button[aria-selected="true"]{background:var(--vg-acc,#5aa9ff);color:var(--vg-on-acc,#04162b);box-shadow:none}
.vgf-qtabs button:focus-visible{outline:2px solid var(--vg-acc,#5aa9ff);outline-offset:2px}
.vgf-qtabs .n{opacity:.75;font-weight:500;margin-left:4px}
.vgf-qvazio{border:1px dashed color-mix(in srgb,currentColor 25%,transparent);border-radius:12px;padding:12px 14px;margin:0 0 12px;font-size:14.5px;line-height:1.45}`;
  function separa() {
    const q = QS[K]; if (!q) return;
    if (!D.getElementById('vgf-q-css')) { const s = D.createElement('style'); s.id = 'vgf-q-css'; s.textContent = CSS_Q; D.head.appendChild(s); }
    const pais = new Map();
    D.querySelectorAll(q[0]).forEach(it => { const tg = it.querySelector(q[1]); if (!tg || !it.parentElement) return; const t = qTipo(tg.textContent || ''); if (!pais.has(it.parentElement)) pais.set(it.parentElement, []); pais.get(it.parentElement).push([it, t]); });
    let i = 0;
    pais.forEach((its, pai) => {
      const chave = location.pathname + location.hash + '|' + (i++);
      const np = its.filter(x => x[1] === 'p').length, ns = its.filter(x => x[1] === 's').length;
      const foco = M() === 'parciais' ? 'p' : M() === 'somativas' ? 's' : '';
      const usa = foco && np + ns > 0;
      const aba = usa ? (qAba.get(chave) || foco) : '';
      const sig = cfg.modo + '|' + np + '|' + ns + '|' + aba;
      const barra = pai.querySelector(':scope > .vgf-qtabs');
      if (pai.dataset.vgfq === sig && (!usa || barra)) return;
      pai.dataset.vgfq = sig;
      pai.querySelectorAll(':scope > .vgf-qtabs, :scope > .vgf-qvazio').forEach(x => x.remove());
      its.forEach(([it, t]) => it.classList.toggle('vgf-qx', !!usa && !!t && t !== aba));
      if (!usa) return;
      const outra = foco === 'p' ? 's' : 'p', ordem = [foco, outra];
      const nome = { p: 'Parciais', s: 'Somativas' }, n = { p: np, s: ns };
      const b = D.createElement('div'); b.className = 'vgf-qtabs'; b.setAttribute('role', 'tablist');
      b.innerHTML = ordem.map(k => '<button type="button" role="tab" data-vgfq="' + k + '" aria-selected="' + (k === aba) + '">' + (k === 'p' ? '📝 ' : '📚 ') + nome[k] + '<span class="n">' + n[k] + '</span></button>').join('');
      b.dataset.chave = chave;
      pai.insertBefore(b, its[0][0]);
      if (!n[aba]) {
        const v = D.createElement('div'); v.className = 'vgf-qvazio';
        const o = aba === 'p' ? 's' : 'p';
        v.innerHTML = '<b>Nenhuma questão daqui caiu nas ' + nome[aba].toLowerCase() + '.</b> ' + (n[o] ? (n[o] === 1 ? 'A única questão é' : 'As ' + n[o] + ' questões são') + ' das ' + nome[o].toLowerCase() + ': toque na outra aba para ver.' : '');
        pai.insertBefore(v, its[0][0]);
      }
    });
  }
  D.addEventListener('click', e => {
    const bt = e.target.closest('.vgf-qtabs button[data-vgfq]'); if (!bt) return;
    e.preventDefault(); e.stopPropagation();
    qAba.set(bt.parentElement.dataset.chave, bt.dataset.vgfq); separa();
  }, true);

  function textos() {
    try { separa(); } catch (e) {}
    const tipo = TIPO[K]; if (!tipo) return;
    docsTexto().forEach(d => {
      if (!docsVistos.has(d)) {
        docsVistos.add(d);
        const s = d.createElement('style'); s.textContent = CSS_SM; (d.head || d.body).appendChild(s);
        if (d !== D) new MutationObserver(() => { if (!d.__vgfT) d.__vgfT = setTimeout(() => { d.__vgfT = 0; textos(); }, 60); }).observe(d.body, { childList: true, subtree: true });
      }
      d.querySelectorAll('mark[data-refs]').forEach(m => {
        if (m.closest('.vgf-panel')) return;
        if (m.dataset.vgfOrig == null) m.dataset.vgfOrig = m.className;
        const orig = m.dataset.vgfOrig, toks = orig.split(/\s+/).filter(Boolean), nt = toks.find(t => NIV.test(t));
        if (!nt) return; // grifo sem nível (não é de frequência)
        const [, pre, lv] = nt.match(NIV), refs = m.dataset.refs.split(',').map(x => x.trim()).filter(Boolean);
        let cls;
        if (M() === 'todos') cls = orig;
        else {
          const kept = M() === 'off' ? [] : refs.filter(r => tipo(r) === (M() === 'parciais' ? 'p' : 's'));
          const base = toks.filter(t => t !== nt);
          if (!kept.length) cls = base.concat('vgf-sm').join(' ');
          else if (kept.length === refs.length) cls = orig;
          else { // o nível conta provas distintas (até 5) quando o master segue essa regra; senão, proporcional ao original
            const nk = uniq(kept.map(PROVA)).length, na = uniq(refs.map(PROVA)).length;
            const n = +lv === Math.min(5, na) ? Math.min(5, nk) : Math.max(1, Math.min(5, Math.round(+lv * nk / Math.max(1, na))));
            cls = base.concat(pre + n).join(' '); }
        }
        if (m.className !== cls) m.className = cls;
      });
    });
  }
  let obsT = null;
  function observaTexto() {
    if (obsT || !D.body) return;
    let t = 0;
    obsT = new MutationObserver(() => { if (!t) t = setTimeout(() => { t = 0; textos(); }, 60); });
    obsT.observe(D.body, { childList: true, subtree: true });
    D.addEventListener('load', e => { if (e.target && e.target.tagName === 'IFRAME') setTimeout(textos, 50); }, true);
  }

  /* ---------- aplicar ---------- */
  let obs = null, raf = 0, ocupado = false;
  function aplica() {
    raf = 0;
    const nav = A.nav(); if (!nav) return;
    // o master pode ainda não ter criado os dados (ex.: MODS do Português): tenta de novo por alguns segundos
    const deNovo = () => { aplica.tent = (aplica.tent || 0) + 1; if (aplica.tent < 40) setTimeout(aplica, 250); };
    let aulas; try { aulas = A.aulas(); info = A.dados(); } catch (e) { deNovo(); return; }
    if (!aulas.length || !info.length) { deNovo(); return; }
    const scrollAntes = K === 'farmaco' ? nav.scrollTop : null;
    ocupado = true; if (obs) obs.disconnect();
    try {
      const porKey = Object.fromEntries(info.map(a => [a.key, a]));
      aulas = aulas.filter(a => porKey[a.key]); // grupos que não são aula (revisão, simulados) ficam onde estão
      const somaP = i => i.pAula != null ? i.pAula : Object.values(i.segs).reduce((u, s) => u + s.p, 0);
      const somaS = i => i.sAula != null ? i.sAula : Object.values(i.segs).reduce((u, s) => u + s.s, 0);
      totP = info.reduce((t, a) => t + somaP(a), 0);
      totS = info.reduce((t, a) => t + somaS(a), 0);
      if ((cfg.modo === 'parciais' && !totP) || (cfg.modo === 'somativas' && !totS) || (cfg.modo === 'prof' && !PROF[K])) cfg.modo = 'todos';
      montaPainel(nav); pintaPainel();

      /* grifos */
      // total da aula: questões únicas (pAula/sAula, quando o adaptador sabe) ou a soma dos segmentos
      const vA = a => { const i = porKey[a.key]; if (!i) return 0; return M() === 'parciais' ? somaP(i) : M() === 'somativas' ? somaS(i) : somaP(i) + somaS(i); };
      const maxA = Math.max(0, ...aulas.map(vA));
      const maxS = Math.max(0, ...info.flatMap(i => Object.values(i.segs).map(val)));
      const nomeM = { todos: 'nas provas', parciais: 'nas parciais', somativas: 'nas somativas' }[M()];
      aulas.forEach(a => {
        const fora = cfg.modo === 'prof' && !PROF[K].ids.includes(a.key), v = M() === 'off' || fora ? 0 : vA(a);
        poeG(a.head, nivel(v, maxA), v + ' quest' + (v === 1 ? 'ão' : 'ões') + ' ' + nomeM);
        const i = porKey[a.key];
        A.segs(a).forEach(s => { const o = i && i.segs[s.key]; const w = M() === 'off' || fora || !o ? 0 : val(o); poeG(s.el, nivel(w, maxS), w + ' ' + nomeM); });
      });

      /* divisão e recolhidas */
      // Farmacologia mantém o mesmo botão durante a atualização para não interromper o toque.
      const headers = new Map();
      nav.querySelectorAll(':scope > .vgf-h').forEach(h => {
        if (K === 'farmaco') headers.set(h.dataset.g, h); else h.remove();
      });
      const marcou = info.some(a => cfg.prova[a.key]);
      const prof = cfg.modo === 'prof' && PROF[K];
      const liga = marcou || prof || cfg.recolher || !!RX_MASTER[K];
      html.classList.toggle('vgf-on', liga); nav.classList.toggle('vgf-nav', liga);
      html.classList.add('vgf-semdiv'); // a divisão automática do master (blocos parcial/somativa) não aparece: quem divide é a pessoa
      // os cabeçalhos reaproveitados (.vgf-h) não entram na lista: a ordem deles é dada abaixo, junto do grupo
      const flat = []; [...nav.children].forEach(c => { if (c.classList.contains('vgf-h')) return; if (c.classList.contains('sb-bloco-c')) flat.push(...c.children); else flat.push(c); });
      flat.forEach(c => { c.style.order = ''; c.classList.remove('vgf-x'); });
      if (!liga) { headers.forEach(h => h.remove()); return; }
      const ehAula = new Map(); aulas.forEach((a, idx) => { ehAula.set(a.el, { a, idx }); [...(a.pre || []), ...(a.extra || [])].forEach(x => ehAula.set(x, { a, idx, extra: true })); });
      const primeira = flat.findIndex(c => ehAula.has(c));
      const antes = flat.slice(0, primeira).filter(c => !ehAula.has(c));
      const depois = flat.slice(primeira).filter(c => !ehAula.has(c));
      const feita = a => { const i = porKey[a.key]; return !!(cfg.recolher && i && i.done); };
      const grupos = [];
      const qt = n => n + ' aula' + (n > 1 ? 's' : '');
      if (prof) {
        const g = aulas.filter(a => prof.ids.includes(a.key) && !feita(a)), r = aulas.filter(a => !prof.ids.includes(a.key) && !feita(a));
        if (g.length) grupos.push({ id: 'prof-sim', t: '🎯 Cai na prova', n: qt(g.length), a: g });
        if (r.length) grupos.push({ id: 'prof-nao', t: 'Não cai nesta prova', n: qt(r.length), a: r });
      } else if (marcou) {
        PV.forEach(([t, nome]) => { const g = aulas.filter(a => cfg.prova[a.key] === t && !feita(a)); if (g.length) grupos.push({ id: 'pv-' + t, t: nome, n: qt(g.length), a: g }); });
        const r = aulas.filter(a => !cfg.prova[a.key] && !feita(a)); if (r.length) grupos.push({ id: 'pv-resto', t: 'Sem marcação', n: qt(r.length), a: r });
      } else grupos.push({ id: 'todas', t: null, a: aulas.filter(a => !feita(a)) });
      if (cfg.recolher) { const f = aulas.filter(feita); if (f.length) grupos.push({ id: 'feitas', t: '✅ Já estudadas', n: f.length + ' aula' + (f.length > 1 ? 's' : ''), a: f }); }
      let o = 0; antes.forEach(c => { c.style.order = ++o; });
      grupos.forEach(g => {
        const temCur = g.a.some(a => a.cur);
        let ab = g.t == null ? true : (cfg.open[g.id] != null ? cfg.open[g.id] : (g.id === 'prof-sim' || (g.id !== 'feitas' && g.id !== 'prof-nao' && temCur)));
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
      /* provas e revisão: a lista longa do fim vira subgrupos recolhíveis (só nos masters de caderno) */
      const cab = (id, t, n, ab) => {
        const anterior = headers.get(id); headers.delete(id);
        const h = anterior || D.createElement('button');
        if (!anterior) { h.type = 'button'; h.className = 'vgf-h vgf-rx'; h.dataset.g = id; }
        h.setAttribute('aria-expanded', ab); const rotulo = '<span class="c">▶</span><span>' + esc(t) + '</span><span class="n">' + esc(n) + '</span>';
        if (h.dataset.rotulo !== rotulo) { h.innerHTML = rotulo; h.dataset.rotulo = rotulo; }
        h.style.order = ++o; if (!anterior) nav.appendChild(h);
      };
      if (RX_MASTER[K]) {
        const itens = depois.filter(c => c.matches('.grp.single, button.nv'));
        const gs = RX.map(([id, t]) => ({ id, t, a: [] }));
        const fora = [];
        itens.forEach(c => { const i = rxDe(c.textContent || ''); if (i < 0) fora.push(c); else gs[i].a.push(c); });
        const usa = gs.filter(g => g.a.length >= 2);
        gs.filter(g => g.a.length < 2).forEach(g => fora.push(...g.a));
        const ini = itens.length ? depois.indexOf(itens[0]) : depois.length;
        depois.slice(0, ini).forEach(c => { c.style.order = ++o; });
        const ativo = (itens.find(c => c.classList.contains('on')) || {}).textContent || '';
        usa.forEach(g => {
          const temCur = g.a.some(c => c.classList.contains('on'));
          let ab = cfg.open[g.id] != null ? cfg.open[g.id] : temCur;
          if (temCur && cfg.openRx !== ativo) ab = true;
          cab(g.id, g.t, g.a.length + ' itens', ab);
          g.a.forEach(c => { c.style.order = ++o; c.classList.toggle('vgf-x', !ab); });
        });
        cfg.openRx = ativo;
        depois.slice(ini).filter(c => !itens.includes(c) || fora.includes(c)).forEach(c => {
          c.style.order = ++o;
          // rótulos do próprio master no meio da lista (ex.: "Revisão final" no Português) ficariam soltos entre os subgrupos
          if (!itens.includes(c) && c.matches('.grp:not(.single), .sb-sec') && !c.querySelector('a,button')) c.classList.add('vgf-x');
        });
      } else depois.forEach(c => { c.style.order = ++o; });
      headers.forEach(h => h.remove());
      cfg.openAula = curKey(aulas);
    } finally {
      if (scrollAntes !== null) nav.scrollTop = scrollAntes;
      try { textos(); observaTexto(); } catch (e) {}
      // o modo foco (abas.js) repinta a lista de aulas/segmentos com as cores novas
      const sig = cfg.modo + '|' + JSON.stringify(cfg.prova);
      if (sig !== aplica.sig) { aplica.sig = sig; setTimeout(() => D.dispatchEvent(new CustomEvent('vgfoco', { detail: { modo: cfg.modo } })), 0); }
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
