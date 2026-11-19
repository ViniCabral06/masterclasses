/* Abas de baixo: a navegação simples dos masters, no lugar da barra lateral (modo direto ao ponto).
   Uma barra fixa embaixo da tela, com cinco abas:
     📖 Aulas       lista das aulas: número, título, segmentos e x/N (verde quando todos concluídos),
                    com a cor de frequência na prova (a mesma do Foco de estudo). Clicar abre a aula
                    no primeiro segmento ainda não concluído.
     🎮 Arena       a Arena da aula aberta
     ⭐ Mais cai    "O que mais é cobrado" (revisão rápida) da aula aberta
     ⏱️ Simulados   lista dos simulados e das provas anteriores
     📝 Notas       Minha revisão: questões erradas e grifos
   Dentro do segmento: "← Anterior · Concluir segmento · Próximo →" no início e no fim.
   Sem fundo 3D, lâmpada, Foco de estudo nem enfeites. A barra lateral do master continua no DOM, escondida:
   é dela (ou dos dados do master) que o script lê as aulas, e é pelos cliques nela que ele navega.
   Cada master tem um adaptador em AD; master sem adaptador (TH IV) continua como sempre.
   A última aula aberta fica em "vg-abas:<chave>". Só o PC foi acertado; o celular fica para depois. */
(function () {
  const D = document, html = D.documentElement, K = html.dataset.vidro || '';
  if (window.__vgAbas || html.classList.contains('vidro-aula')) return; window.__vgAbas = true;

  const $ = (s, r) => (r || D).querySelector(s), $$ = (s, r) => [...(r || D).querySelectorAll(s)];
  const txt = e => (e ? e.textContent : '').replace(/\s+/g, ' ').trim();
  const fq = e => ((e && e.className && String(e.className).match(/vgf-g\d/)) || [''])[0];
  const LS = k => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } };
  const CAI = /⭐|o que mais (é|foi) cobrado|o que mais cai/i;
  const limpa = s => s.replace(/^[\s•Q\d]+(?=[^\d\s])/, '').replace(/^⭐\s*/, '').trim();
  const tipoAvulso = t => /simulad|parciais|somativas|provas antigas|banco/i.test(t) ? 'sim' : /minha revis/i.test(t) ? 'notas' : /arena/i.test(t) ? 'arena' : 'rev';

  /* ---------- adaptadores ----------
     aulas(): [{key, nome, rot, freq, segs:[{id, titulo, feito}], cai, arena}]   (segs: os que contam no x/N)
     avulsos(): [{id, titulo, tipo:'sim'|'rev'|'notas'|'arena'}]               (fora das aulas)
     atual(): id aberto; ir(id); concluir(id); feito(id)
     pagina(): {doc, topo, fim} do segmento aberto (onde pôr Anterior/Concluir/Próximo) ou null
     esconde: CSS para a página do segmento (botões próprios do master que as novas peças substituem)
     css: CSS do master (barra lateral fora, conteúdo na largura toda)
     vigia(fn): avisa quando a página muda */
  const caderno = { // Humanização, Medicina Preventiva, Propedêutica de Imagem e Laboratorial
    aulas: () => $$('#nav .grp[data-lesson]').map(g => {
      const h = $('.grp-h', g), lb = $('.lbl', h), ga = txt($('.ga', lb)).replace(/[·\s]+$/, '');
      const its = $$('.it[data-seg]', g), href = it => it.getAttribute('href');
      const cai = its.find(it => /-revisao$/.test(it.dataset.seg) || CAI.test(txt(it)));
      const arena = its.find(it => /-arena$/.test(it.dataset.seg));
      return { key: g.dataset.lesson, rot: ga, nome: txt(lb).replace(ga, '').replace(/^[·\s]+/, ''), freq: fq(h),
        segs: its.filter(it => it !== cai && it !== arena && $('input', it)).map(it => ({ id: href(it), titulo: txt($('.x', it)), feito: $('input', it).checked, freq: fq(it) })),
        cai: cai ? href(cai) : null, arena: arena ? href(arena) : null };
    }),
    avulsos: () => $$('#nav .grp.single .grp-h').filter(a => !/#home$/.test(a.getAttribute('href'))).map(a => { const t = txt($('.lbl', a)); return { id: a.getAttribute('href'), titulo: t, tipo: tipoAvulso(t) }; }),
    atual: () => location.hash || '#home',
    ir: id => { if (location.hash === id) return; location.hash = id; },
    feito: id => { const i = $('#nav .it[href="' + id + '"] input'); return !!(i && i.checked); },
    concluir: id => { const b = $('#main [data-read="' + id.split('/').pop() + '"]'); if (b) b.click(); },
    pagina: () => { const s = $('#main .section[id]'); if (!s) return null; const h = $('h2', s); return { doc: D, cont: s, topo: h && h.nextElementSibling && h.nextElementSibling.classList.contains('vg-segxy') ? h.nextElementSibling : h, fim: null }; },
    esconde: '#main .navfoot,#main .done-t,#main .cel-finish{display:none!important}',
    css: '#side,.side,.sidebar,aside,.drawer-btn,.mbar,.topbar{display:none!important}',
    vigia: fn => { addEventListener('hashchange', () => setTimeout(fn, 30)); new MutationObserver(fn).observe($('#main'), { childList: true }); },
  };
  const AD = {
    huma: caderno, prev: caderno, img: caderno, lab: caderno, dic: caderno,
    farmaco: {
      grupos: () => $$('.sb-nav > .grp, .sb-nav .sb-bloco-c > .grp, .sb-nav .grp').filter((g, i, a) => a.indexOf(g) === i),
      aulas: () => AD.farmaco.grupos().filter(g => $('.it[data-id^="arena-"]', g)).map(g => {
        const h = $('.grp-h', g), lbl = txt($('.lbl', h)), m = lbl.match(/^(.*?):\s*(.*)$/), its = $$('.it[data-id]', g);
        const cai = its.find(it => /-cob$/.test(it.dataset.id)), ar = its.find(it => /^arena-/.test(it.dataset.id));
        return { key: its[0] && its[0].dataset.id, rot: m ? m[1] : '', nome: m ? m[2] : lbl, freq: fq(h),
          segs: its.filter(it => $('input', it)).map(it => ({ id: it.dataset.id, titulo: txt($('.x', it)), feito: $('input', it).checked, freq: fq(it) })),
          cai: cai ? cai.dataset.id : null, arena: ar ? ar.dataset.id : null };
      }),
      avulsos: () => AD.farmaco.grupos().filter(g => !$('.it[data-id^="arena-"]', g)).flatMap(g => {
        const grp = txt($('.grp-h .lbl', g));
        return $$('.it[data-id]', g).filter(it => it.dataset.id !== 'home').map(it => {
          const id = it.dataset.id, t = txt($('.x', it));
          return { id, titulo: t, tipo: id === 'mrev' ? 'notas' : id === 'arena' ? 'arena' : /simulad|somativas/i.test(grp) ? 'sim' : 'rev' };
        });
      }),
      atual: () => { const a = $('.sb-nav .it.active'); return a ? a.dataset.id : (location.hash || '').slice(1); },
      ir: id => window.MC && MC.go && MC.go(id),
      feito: id => { const i = $('.sb-nav .it[data-id="' + id + '"] input'); return !!(i && i.checked); },
      concluir: id => { const b = $('#pane-' + id + ' .ptop .done-t'); if (b) b.click(); },
      pagina: () => { const p = $('.pane.active'); return p ? { doc: D, cont: p, topo: $('.ptop', p), fim: $('.navfoot', p) } : null; },
      esconde: '.navfoot,.pane .ptop .done-t{display:none!important}',
      css: '#sidebar,.mbar,.sb-scrim{display:none!important}',
      vigia: fn => D.addEventListener('pane', () => setTimeout(fn, 0)),
    },
    micro: {
      aulas: () => $$('#nav .grp[data-g]').filter(g => /^a\d+$/.test(g.dataset.g)).map(g => {
        const h = $('.gh', g), t = txt($('.t', h).firstChild), m = t.match(/^(Aula \d+)\s*·\s*(.*)$/), id = g.dataset.g;
        return { key: id, rot: m ? m[1] : '', nome: m ? m[2] : t, freq: fq(h),
          segs: $$('.it[data-go]', g).filter(it => new RegExp('^' + id + '/s').test(it.dataset.go)).map(it => ({ id: it.dataset.go, titulo: txt($('.lb', it)), feito: it.classList.contains('done'), freq: fq(it) })),
          cai: $('.it[data-go="' + id + '/cob"]', g) ? id + '/cob' : null, arena: $('.it[data-go="' + id + '/arena"]', g) ? id + '/arena' : null };
      }),
      avulsos: () => $$('#nav .grp[data-g="_rev"] .it[data-go]').map(it => {
        const id = it.dataset.go, t = txt($('.lb', it)).replace(/^[^\wÀ-ú]+/, '');
        return { id, titulo: t, tipo: id === 'my' ? 'notas' : /^(sim|xsim|som)$/.test(id) ? 'sim' : 'rev' };
      }),
      atual: () => { const a = $('#nav .it.on[data-go]'); return a ? a.dataset.go : (location.hash || '').slice(1); },
      ir: id => { location.hash = '#' + id; },
      feito: id => { const i = $('#nav .it[data-go="' + id + '"]'); return !!(i && i.classList.contains('done')); },
      concluir: () => { const b = $('#view [data-act=done]'); if (b) b.click(); },
      pagina: () => { const p = $('#view .page'), h = p && $('h1.pt', p); if (!h || !$('[data-act=done]', p)) return null; const x = h.nextElementSibling; return { doc: D, cont: p, topo: x && x.classList.contains('vg-segxy') ? x : h, fim: null }; },
      esconde: '#view .page>.actions{display:none!important}',
      css: '#sb,aside,.sbtoggle,.mtop,.topbar{display:none!important}',
      vigia: fn => { addEventListener('hashchange', () => setTimeout(fn, 30)); new MutationObserver(fn).observe($('#view'), { childList: true }); },
    },
    port: {
      ls: () => LS('lpii') || {},
      aulas: () => { const dn = (AD.port.ls().done) || {}; return (window.MODS || (typeof MODS !== 'undefined' ? MODS : [])).map(m => {
        const h = $('#nav .nv[data-v=mod][data-id="' + m.id + '"]');
        return { key: m.id, rot: 'Aula ' + m.n, nome: m.nome, freq: fq(h),
          segs: m.segs.map((s, i) => ({ id: m.id + ':' + i, titulo: s.t, feito: !!dn[m.id + ':' + i] })),
          cai: m.mais ? m.id + ':mais' : null, arena: null };
      }); },
      avulsos: () => $$('#nav .nv[data-v]').filter(b => !/^(mod|home)$/.test(b.dataset.v)).map(b => {
        const v = b.dataset.v, t = txt(b).replace(/^[^\wÀ-ú]+/, '');
        return { id: 'v:' + v, titulo: t, tipo: v === 'meu' ? 'notas' : v === 'arena' ? 'arena' : v === 'sim' ? 'sim' : 'rev' };
      }),
      atual: () => { const m = $('#nav .nv.on[data-v=mod]'); if (m) { const s = $('#nav .sub .sb.on'); return m.dataset.id + ':' + (s ? (s.dataset.mais ? 'mais' : s.dataset.sg) : '0'); } const v = $('#nav .nv.on[data-v]'); return v ? 'v:' + v.dataset.v : ''; },
      ir: id => {
        if (id.startsWith('v:')) { const b = $('#nav .nv[data-v="' + id.slice(2) + '"]'); if (b) b.click(); return; }
        const [m, s] = id.split(':'), b = $('#nav .nv[data-v=mod][data-id="' + m + '"]');
        if (b && !b.classList.contains('on')) b.click();
        const sb = $(s === 'mais' ? '#nav .sub .sb[data-mais]' : '#nav .sub .sb[data-sg="' + s + '"]'); if (sb && !sb.classList.contains('on')) sb.click();
      },
      feito: id => !!((AD.port.ls().done || {})[id]),
      concluir: id => { const b = $('#tb .cbtn[data-done="' + id + '"]'); if (b) b.click(); },
      pagina: () => { const tb = $('#tb'); if (!tb || !$('.cbtn[data-done]', tb)) return null; const p = $('.paper', tb); return { doc: D, cont: tb, topo: p ? p.previousElementSibling : null, antes: p, fim: $('.navfoot', tb) }; },
      esconde: '#tb>.steps2,#tb>.navfoot,#tb>.done{display:none!important}',
      css: '#sb,aside,.side,.mtop,.topbar{display:none!important}',
      vigia: fn => new MutationObserver(fn).observe($('main') || D.body, { childList: true, subtree: true }),
    },
    pato: {
      grupos: () => $$('#tabbtns .grp[data-key]'),
      aulas: () => AD.pato.grupos().filter(g => /^(aula|tgi)\d+$/.test(g.dataset.key)).sort((a, b) => { const T = typeof TABS !== 'undefined' ? TABS.map(x => x.key) : []; return T.indexOf(a.dataset.key) - T.indexOf(b.dataset.key); }).map(g => {
        const k = g.dataset.key, h = $('.grp-h', g), t = (typeof TABS !== 'undefined' ? TABS : []).find(x => x.key === k) || {};
        const its = $$('.it[data-seg]', g), id = it => k + '/' + it.dataset.seg;
        const cai = its.find(it => CAI.test(txt(it))), ar = its.find(it => it.dataset.seg === 'arena');
        return { key: k, rot: String(t.label || '').replace(/\s*—\s*/, ' · '), nome: t.short || txt(h), freq: fq(h),
          segs: its.filter(it => $('input', it)).map(it => ({ id: id(it), titulo: limpa(txt(it)), feito: $('input', it).checked, freq: fq(it) })),
          cai: cai ? id(cai) : null, arena: ar ? id(ar) : null };
      }),
      avulsos: () => AD.pato.grupos().filter(g => !/^(aula|tgi)\d+$/.test(g.dataset.key) && g.dataset.key !== 'home').flatMap(g => {
        const k = g.dataset.key, its = $$('.it[data-seg]', g).filter(it => it.dataset.seg !== 'capa');
        const t = (typeof TABS !== 'undefined' ? TABS : []).find(x => x.key === k) || {};
        if (!its.length) return [{ id: k + '/', titulo: t.short || txt($('.grp-h', g)), tipo: t.group === 'sim' && !/reta|flash/i.test(t.short || '') ? 'sim' : 'rev' }];
        return its.map(it => { const tt = limpa(txt(it)); return { id: k + '/' + it.dataset.seg, titulo: tt, tipo: /minha/i.test(tt) ? 'notas' : k === 'simulados' ? 'sim' : 'rev' }; });
      }),
      atual: () => { const it = $('#tabbtns .it.on[data-seg], #tabbtns .it.active[data-seg]'); if (it) return it.dataset.key + '/' + it.dataset.seg; const g = $('#tabbtns .grp.on[data-key]'); return g ? g.dataset.key + '/' : ''; },
      ir: id => { const [k, s] = id.split('/'), el = s ? $('#tabbtns .it[data-key="' + k + '"][data-seg="' + s + '"]') : $('#tabbtns .grp-h[data-key="' + k + '"]'); if (el) el.click(); },
      feito: id => { const [k, s] = id.split('/'), i = $('#tabbtns input[data-key="' + k + '"][data-seg="' + s + '"]'); return !!(i && i.checked); },
      fr: () => $$('iframe').find(f => f.offsetParent !== null),
      concluir: id => { const f = AD.pato.fr(), s = id.split('/')[1], b = f && f.contentDocument && $('.done-t[data-key="' + s + '"]', f.contentDocument); if (b) b.click(); },
      pagina: () => {
        const f = AD.pato.fr(), d = f && f.contentDocument; if (!d) return null;
        const s = AD.pato.atual().split('/')[1], p = s && d.getElementById(s); if (!p || !$('.done-t', p)) return null;
        const h = $('h1', p), x = h && h.nextElementSibling;
        return { doc: d, cont: p, topo: x && x.classList.contains('vg-segxy') ? x : h, fim: null };
      },
      esconde: '.pane .done-t,.pane .cel-finish,.pane .navfoot,.pane .pane-nav,.pane .nav-btns{display:none!important}',
      css: '#sidebar,.sidebar,aside,.mbar,.topbar{display:none!important}',
      vigia: fn => { new MutationObserver(fn).observe($('#tabbtns'), { attributes: true, subtree: true, attributeFilter: ['class'] }); D.addEventListener('load', e => { if (e.target.tagName === 'IFRAME') { setTimeout(fn, 60); try { e.target.contentWindow.addEventListener('hashchange', () => setTimeout(fn, 30)); } catch (x) {} } }, true); },
    },
  };
  AD.semio = AD.micro; // Semiologia usa o motor da Microbiologia
  const A = AD[K]; if (!A) return;

  const CK = 'vg-abas:' + K;
  const mem = LS(CK) || {};
  const salva = () => { try { localStorage.setItem(CK, JSON.stringify(mem)); } catch (e) {} };
  const esc = t => String(t == null ? '' : t).replace(/[<>&"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));

  /* ---------- estilo ---------- */
  const CSS_SEG = `
mark.vga-mk{background:color-mix(in srgb,#f5c542 60%,transparent);color:inherit;border-radius:3px;padding:0 1px;scroll-margin:120px}
.vga-seg{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:14px 0 22px;font-family:var(--vg-text,var(--sans,system-ui,sans-serif))}
.vga-seg.fim{margin:48px 0 8px;padding-top:22px;border-top:1px solid var(--border,rgba(127,127,127,.22))}
.vga-seg button{all:unset;box-sizing:border-box;cursor:pointer;height:40px;padding:0 16px;border-radius:999px;font:500 14px/1 var(--vg-text,var(--sans,system-ui,sans-serif));
  background:var(--surface,rgba(127,127,127,.12));color:var(--ink,inherit);transition:background-color .15s ease,transform .12s ease;white-space:nowrap}
.vga-seg button:hover{background:var(--surface-2,rgba(127,127,127,.2))}
.vga-seg button:active{transform:scale(.97)}
.vga-seg button:focus-visible{outline:2px solid var(--vg-acc,#5aa9ff);outline-offset:2px}
.vga-seg .dn.on{background:var(--ok-bg,rgba(63,185,80,.16));color:var(--ok,#3fb950);font-weight:600}
.vga-seg span{flex:0 0 auto;min-width:1px}`;
  const st = D.createElement('style'); st.id = 'vg-abas-css';
  st.textContent = `
:root{--vga-h:64px;--vga-gap:12px}
#vg-abas{position:fixed;left:50%;bottom:calc(var(--vga-gap) + env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:610;
  width:min(620px,calc(100vw - 20px));height:var(--vga-h);padding:6px;box-sizing:border-box;display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:4px;
  border-radius:22px;background:color-mix(in srgb,var(--ground,var(--vg-ground,#0b0d10)) 78%,transparent);-webkit-backdrop-filter:blur(18px) saturate(1.4);backdrop-filter:blur(18px) saturate(1.4);
  box-shadow:0 10px 34px rgba(0,0,0,.28),inset 0 0 0 1px rgba(127,127,127,.22);font-family:var(--vg-text,system-ui,sans-serif)}
#vg-abas button[hidden]{display:none!important}
#vg-ajustes{position:fixed;z-index:611;width:min(320px,calc(100vw - 20px));max-height:calc(100dvh - var(--vga-h) - 60px);overflow-y:auto;padding:10px;box-sizing:border-box;border-radius:18px;
  background:color-mix(in srgb,var(--ground,var(--vg-ground,#0b0d10)) 94%,transparent);-webkit-backdrop-filter:blur(18px);backdrop-filter:blur(18px);
  box-shadow:0 14px 40px rgba(0,0,0,.32),inset 0 0 0 1px rgba(127,127,127,.22);color:var(--ink,inherit);font-family:var(--vg-text,system-ui,sans-serif);
  opacity:0;visibility:hidden;transform:translateY(6px);transition:opacity .15s ease,transform .15s ease,visibility 0s linear .15s}
#vg-ajustes.on{opacity:1;visibility:visible;transform:none;transition-delay:0s}
#vg-ajustes .h{padding:4px 6px 8px;font-size:12px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--muted,var(--ink-2,#8a94a3))}
html.vga-on #vg-ajustes .vgf-panel{display:block!important;margin:0}
/* barra encaixada: embaixo (padrão), em cima ou nas laterais (vertical) */
html[data-vga-lado=t] #vg-abas{bottom:auto;top:var(--vga-gap)}
html:is([data-vga-lado=l],[data-vga-lado=r]) #vg-abas{left:auto;right:auto;bottom:auto;top:50%;transform:translateY(-50%);width:76px;height:auto;max-height:calc(100dvh - 20px);grid-template-columns:minmax(0,1fr)!important;grid-auto-rows:60px}
html[data-vga-lado=l] #vg-abas{left:var(--vga-gap)}
html[data-vga-lado=r] #vg-abas{right:var(--vga-gap)}
html[data-vga-lado=t].vga-on :is(.main,#main,#view,main){padding-top:calc(var(--vga-h) + 24px)!important}
html[data-vga-lado=t] #vg-lista .in{padding-top:calc(var(--vga-h) + 40px)}
@media (min-width:701px){html[data-vga-lado=l].vga-on :is(.main,#main,#view,main),html[data-vga-lado=l] #vg-lista .in{padding-left:110px!important}
html[data-vga-lado=r].vga-on :is(.main,#main,#view,main),html[data-vga-lado=r] #vg-lista .in{padding-right:110px!important}}
#vg-abas.arrasta{opacity:.85}
/* celular e tablet */
@media (hover:none){#vg-abas button:hover{background:none}}
@media (max-width:700px){
  :root{--vga-h:58px;--vga-gap:8px}
  #vg-abas{width:calc(100vw - 12px);padding:4px;gap:2px;border-radius:18px}
  #vg-abas button{font-size:10px;gap:2px;border-radius:13px}
  #vg-abas button .i{font-size:18px}
  #vg-abas button .t{text-overflow:clip}
  /* em tela estreita não há espaço para a barra em pé: lateral vira embaixo */
  html:is([data-vga-lado=l],[data-vga-lado=r]) #vg-abas{top:auto;bottom:calc(var(--vga-gap) + env(safe-area-inset-bottom,0px));left:50%;right:auto;transform:translateX(-50%);width:calc(100vw - 12px);height:var(--vga-h);grid-template-columns:repeat(7,minmax(0,1fr))!important;grid-auto-rows:auto}
  #vg-lista .in{padding:24px 14px calc(var(--vga-h) + 40px)}
  #vg-lista h1{font-size:28px}
  .vga-l{gap:12px;padding:14px 14px}
  .vga-l b{font-size:15px}
  #vg-busca,#vg-ajustes,#vg-segs{max-height:calc(100dvh - var(--vga-h) - 40px)}
}
@media (max-width:420px){.vga-seg{gap:6px}.vga-seg button{height:38px;padding:0 12px;font-size:13px}}
#vg-abas{touch-action:none;user-select:none;-webkit-user-select:none}
#vg-abas.arrasta{cursor:grabbing;box-shadow:0 18px 50px rgba(0,0,0,.4),inset 0 0 0 1px color-mix(in srgb,var(--vg-acc,#5aa9ff) 50%,transparent)}
#vg-abas.arrasta button{pointer-events:none}
#vg-abas button{all:unset;box-sizing:border-box;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;min-width:0;
  border-radius:16px;color:var(--ink-2,var(--ink,inherit));font-size:12.5px;font-weight:500;line-height:1;-webkit-tap-highlight-color:transparent;
  transition:background-color .18s ease,color .18s ease,transform .12s ease}
#vg-abas button .i{font-size:20px;line-height:1}
#vg-abas button .t{max-width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#vg-abas button:hover{background:rgba(127,127,127,.14)}
#vg-abas button:active{transform:scale(.96)}
#vg-abas button:focus-visible{outline:2px solid var(--vg-acc,#5aa9ff);outline-offset:-2px}
#vg-abas button.on{background:color-mix(in srgb,var(--vg-acc,#5aa9ff) 22%,transparent);color:var(--ink,inherit);font-weight:600;
  box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--vg-acc,#5aa9ff) 42%,transparent)}
#vg-abas-aviso{position:fixed;left:50%;bottom:calc(var(--vga-h) + var(--vga-gap) + 14px);transform:translateX(-50%) translateY(8px);z-index:612;
  padding:9px 14px;border-radius:999px;background:var(--ink,#111);color:var(--ground,#fff);font:500 13.5px/1.2 var(--vg-text,system-ui,sans-serif);
  box-shadow:0 8px 24px rgba(0,0,0,.3);opacity:0;pointer-events:none;transition:opacity .2s ease,transform .2s ease;white-space:nowrap}
#vg-abas-aviso.on{opacity:1;transform:translateX(-50%)}

/* modo direto ao ponto: sem barra lateral, fundo 3D, lâmpada, Foco de estudo nem enfeites */
html.vga-on body{background:var(--ground,var(--vg-ground,#0b0d10))!important}
html.vga-on :is(#vidro-bg,#vidro-home,#vidro-lamp,#vidro-flash,#vidro-heart,.vg-credito,.vgf-panel,.vidro-inicio){display:none!important}
${A.css}
html.vga-on :is(.app,#app,.layout,.shell,body){grid-template-columns:minmax(0,1fr)!important}
html.vga-on :is(.main,#main,#view,main){margin-left:0!important;padding-bottom:calc(var(--vga-h) + 64px)!important}
html.vga-on #vidro-fx{display:none!important} /* no modo foco, a Personalização e a saída moram em ⚙️ Ajustes */
html.vga-on #vidro-pers .vp-sec:has(#vp-ninja){display:none}
#vg-ajustes .vga-aj{all:unset;box-sizing:border-box;cursor:pointer;display:flex;align-items:center;gap:10px;width:100%;padding:10px 10px;border-radius:12px;font-size:14px;font-weight:500}
#vg-ajustes .vga-aj:hover,#vg-ajustes .vga-aj:focus-visible{background:rgba(127,127,127,.14)}
#vg-ajustes .vga-aj small{display:block;font-size:12px;font-weight:400;color:var(--muted,var(--ink-2,#8a94a3))}
#vg-ajustes .vga-aj .tx{flex:1;min-width:0}
#vg-ajustes .vga-sw{flex:none;width:40px;height:24px;border-radius:999px;background:var(--vg-acc,#5aa9ff);position:relative}
#vg-ajustes .vga-sw::after{content:"";position:absolute;top:3px;right:3px;width:18px;height:18px;border-radius:50%;background:#fff}
#vg-ajustes .vga-aj.off .vga-sw{background:rgba(127,127,127,.4)}
#vg-ajustes .vga-aj.off .vga-sw::after{right:auto;left:3px}
#vg-ajustes hr{border:0;border-top:1px solid rgba(127,127,127,.22);margin:6px 4px 10px}
html.vga-on #vidro-pers{bottom:calc(var(--vga-h) + var(--vga-gap) + 60px)!important;max-height:calc(100dvh - var(--vga-h) - 96px)!important}
${A.esconde}
${CSS_SEG}

/* listas (aba "Aulas" e aba "Simulados") */
#vg-lista{position:fixed;inset:0;z-index:590;overflow-y:auto;background:var(--ground,var(--vg-ground,#0b0d10));color:var(--ink,inherit);font-family:var(--vg-text,var(--sans,system-ui,sans-serif));display:none}
html.vga-lista #vg-lista{display:block}
/* fundo sempre sólido: em alguns masters o tema deixa --ground transparente e o master aparecia por trás */
#vg-lista{background:var(--vg-ground,#111312)!important;background-color:#111312!important}
html[data-theme=light] #vg-lista{background-color:#f7f8f7!important}
html[data-theme=light] .vga-l{background-color:#fff;border-color:rgba(0,0,0,.1)}
html[data-theme=light] .vga-l:hover{background-color:#f1f3f2}
html.vga-on body{padding-top:52px!important}
#vg-canto{position:fixed;top:12px;left:12px;z-index:615;display:flex;gap:8px}
html[data-vga-lado=t] #vg-canto{top:calc(var(--vga-h) + 22px)}
@media(min-width:701px){html[data-vga-lado=l] #vg-canto{left:98px}}
#vg-canto>*{width:40px;height:40px;display:grid;place-items:center;border-radius:12px;border:1px solid rgba(255,255,255,.14);
  background:rgba(20,22,21,.55);-webkit-backdrop-filter:blur(14px) saturate(1.4);backdrop-filter:blur(14px) saturate(1.4);color:#eef2ef;cursor:pointer;padding:0;text-decoration:none}
#vg-canto>*[hidden]{display:none}
#vg-canto svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
#vg-canto>*:hover{background:rgba(40,44,42,.7)}
html.light #vg-canto>*,html[data-theme=light] #vg-canto>*{background:rgba(255,255,255,.7);color:#1d211f;border-color:rgba(0,0,0,.1)}
html.vidro-ready body > :is(#vg-canto,#vg-lista,#vg-abas,#vg-segs,#vg-ajustes,#vg-busca,#vg-abas-aviso){animation:none!important}
html.vidro-ready body > #vg-lista{opacity:1!important}
#vg-lista{isolation:isolate}
#vg-lista .in{max-width:740px;margin:0 auto;padding:40px 20px calc(var(--vga-h) + 60px)}
#vg-lista h1{margin:0 0 6px;font:400 34px/1.1 var(--vg-display,var(--serif,serif));letter-spacing:-.01em;color:var(--ink,inherit)}
#vg-lista h2{margin:28px 0 10px;font:600 12px/1 var(--vg-text,system-ui);letter-spacing:.08em;text-transform:uppercase;color:var(--muted,var(--ink-2,#8a94a3))}
#vg-lista p.s{margin:0 0 18px;color:var(--ink-2,inherit);font-size:14.5px}
.vga-l{all:unset;box-sizing:border-box;cursor:pointer;display:flex;align-items:center;gap:16px;width:100%;margin:0 0 10px;padding:16px 18px;border-radius:14px;
  background:var(--surface,rgba(127,127,127,.08));border:1px solid var(--border,rgba(127,127,127,.2));transition:background-color .15s ease,border-color .15s ease}
.vga-l:hover{background:var(--surface-2,rgba(127,127,127,.14))}
.vga-l:focus-visible{outline:2px solid var(--vg-acc,#5aa9ff);outline-offset:2px}
.vga-l .n{flex:none;width:28px;text-align:center;font:400 24px/1 var(--vg-display,var(--serif,serif));color:var(--vg-acc-ink,var(--vg-acc,inherit))}
.vga-l .tx{flex:1;min-width:0}
.vga-l b{display:block;font-weight:600;font-size:16px;line-height:1.3;color:var(--ink,inherit)}
.vga-l small{display:block;margin-top:4px;font-size:13px;color:var(--muted,var(--ink-2,#8a94a3))}
.vga-l .ct{flex:none;font-size:13px;font-variant-numeric:tabular-nums;color:var(--muted,var(--ink-2,#8a94a3))}
.vga-l.ok{background:color-mix(in srgb,#3fb950 14%,var(--surface,transparent));border-color:color-mix(in srgb,#3fb950 55%,transparent)}
.vga-l .ct .g{color:#3fb950;font-weight:700}
.vga-l.ok .ct{color:#3fb950;font-weight:600}
.vga-l.atual{border-color:color-mix(in srgb,var(--vg-acc,#5aa9ff) 60%,transparent)}
.vga-div{display:flex;align-items:center;gap:12px;margin:18px 0 20px;color:var(--muted,var(--ink-2,#8a94a3));font-size:12px;font-weight:600;letter-spacing:.04em}
.vga-div::before,.vga-div::after{content:"";flex:1;height:2px;border-radius:2px;background:rgba(140,140,140,.45)}
.vga-l.sm{padding:12px 16px}
.vga-l.sm b{font-size:15px;font-weight:500}
/* 🔍 Buscar */
#vg-busca{position:fixed;z-index:611;width:min(560px,calc(100vw - 20px));max-height:min(620px,calc(100dvh - 110px));display:flex;flex-direction:column;box-sizing:border-box;padding:12px;border-radius:18px;
  background:color-mix(in srgb,var(--ground,var(--vg-ground,#0b0d10)) 96%,transparent);-webkit-backdrop-filter:blur(18px);backdrop-filter:blur(18px);
  box-shadow:0 14px 40px rgba(0,0,0,.32),inset 0 0 0 1px rgba(127,127,127,.22);color:var(--ink,inherit);font-family:var(--vg-text,system-ui,sans-serif);
  opacity:0;visibility:hidden;transform:translateY(6px);transition:opacity .15s ease,transform .15s ease,visibility 0s linear .15s}
#vg-busca.on{opacity:1;visibility:visible;transform:none;transition-delay:0s}
#vg-busca input{all:unset;box-sizing:border-box;width:100%;height:44px;padding:0 14px;border-radius:12px;font-size:16px;background:rgba(127,127,127,.12);box-shadow:inset 0 0 0 1px rgba(127,127,127,.25);color:var(--ink,inherit)}
#vg-busca input:focus{box-shadow:inset 0 0 0 2px var(--vg-acc,#5aa9ff)}
#vg-busca .st{margin:8px 4px 6px;font-size:12.5px;color:var(--muted,var(--ink-2,#8a94a3))}
#vg-busca .rs{overflow-y:auto;min-height:0}
#vg-busca .r{all:unset;box-sizing:border-box;cursor:pointer;display:block;width:100%;padding:10px 12px;border-radius:10px}
#vg-busca .r:hover,#vg-busca .r:focus-visible{background:rgba(127,127,127,.14)}
#vg-busca .r small{display:block;font-size:11.5px;color:var(--muted,var(--ink-2,#8a94a3));margin-bottom:2px}
#vg-busca .r b{display:block;font-size:14.5px;font-weight:600}
#vg-busca .r p{margin:4px 0 0;font-size:13px;line-height:1.45;color:var(--ink-2,inherit)}
#vg-busca mark{background:color-mix(in srgb,#f5c542 55%,transparent);color:inherit;border-radius:3px;padding:0 1px}
/* menuzinho dos segmentos: passar o mouse em "Aulas" com uma aula aberta */
#vg-segs{position:fixed;z-index:611;bottom:calc(var(--vga-h) + var(--vga-gap) + 8px);width:min(360px,calc(100vw - 20px));max-height:min(460px,calc(100dvh - var(--vga-h) - 60px));overflow-y:auto;
  padding:8px;box-sizing:border-box;border-radius:18px;background:color-mix(in srgb,var(--ground,var(--vg-ground,#0b0d10)) 94%,transparent);-webkit-backdrop-filter:blur(18px);backdrop-filter:blur(18px);
  box-shadow:0 14px 40px rgba(0,0,0,.32),inset 0 0 0 1px rgba(127,127,127,.22);font-family:var(--vg-text,system-ui,sans-serif);color:var(--ink,inherit);
  opacity:0;visibility:hidden;transform:translateY(6px);transition:opacity .15s ease,transform .15s ease,visibility 0s linear .15s}
#vg-segs.on{opacity:1;visibility:visible;transform:none;transition-delay:0s}
#vg-segs .h{padding:6px 10px 8px;font-size:12px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--muted,var(--ink-2,#8a94a3))}
#vg-segs button{margin:1px 0;
  all:unset;box-sizing:border-box;cursor:pointer;display:flex;align-items:center;gap:10px;width:100%;padding:8px 10px;border-radius:10px;font-size:14px;line-height:1.3}
#vg-segs button:hover,#vg-segs button:focus-visible{background:rgba(127,127,127,.14)}
#vg-segs button .n{flex:none;width:20px;text-align:right;font-variant-numeric:tabular-nums;color:var(--muted,var(--ink-2,#8a94a3))}
#vg-segs button .x{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#vg-segs button .c{flex:none;width:16px;color:#3fb950;font-weight:700}
#vg-segs button.ok .n{color:#3fb950}
#vg-segs button.at{background:color-mix(in srgb,var(--vg-acc,#5aa9ff) 20%,transparent);font-weight:600}
@media (prefers-reduced-motion:reduce){#vg-segs,#vg-abas button,#vg-abas-aviso,.vga-l,.vga-seg button{transition:none!important}}
@media print{#vg-abas,#vg-abas-aviso,#vg-lista,.vga-seg{display:none!important}}
`;

  /* ---------- montagem ---------- */
  const ABAS = [
    { k: 'aulas', i: '📖', t: 'Aulas', a: 'Lista de aulas' },
    { k: 'arena', i: '🎮', t: 'Arena', a: 'Arena da aula aberta' },
    { k: 'cai', i: '⭐', t: 'Mais cai', a: 'O que mais cai em prova: revisão rápida da aula aberta' },
    { k: 'sim', i: '⏱️', t: 'Simulados', a: 'Simulados e provas anteriores' },
    { k: 'notas', i: '📝', t: 'Notas', a: 'Notas: questões erradas e grifos' },
    { k: 'busca', i: '🔍', t: 'Buscar', a: 'Buscar uma palavra na matéria' },
    { k: 'ajustes', i: '⚙️', t: 'Ajustes', a: 'Ajustes da matéria' },
  ];
  let segsMenu, tSegs = 0, bar, aviso, lista, folha = '', tAviso = 0, cache = [];
  const aulas = () => { try { cache = A.aulas(); } catch (e) { } return cache; };
  const aulaDe = (id, L) => (L || aulas()).find(a => a.segs.some(s => s.id === id) || a.cai === id || a.arena === id);
  function aulaAberta() { const L = aulas(); return aulaDe(A.atual(), L) || L.find(a => a.key === mem.aula) || null; }
  function avulso(tipo) { try { return A.avulsos().filter(x => x.tipo === tipo); } catch (e) { return []; } }

  function avisar(msg) { aviso.textContent = msg; aviso.classList.add('on'); clearTimeout(tAviso); tAviso = setTimeout(() => aviso.classList.remove('on'), 2400); }

  function abrir(qual) {
    folha = qual; html.classList.add('vga-lista'); monta(qual); pintar();
    setTimeout(() => { if (folha === qual) monta(qual); }, 900); // o Foco de estudo pode pintar as cores depois
    lista.scrollTop = 0; const f = $('.vga-l.atual', lista) || $('.vga-l', lista); if (f) f.focus({ preventScroll: true });
  }
  D.addEventListener('vgfoco', () => { if (!bar) return; if (folha) monta(folha); pintar(); }); // filtro do Foco mudou: cores novas na lista
  function fechar() { if (!folha) return; folha = ''; html.classList.remove('vga-lista'); pintar(); }

  function monta(qual) {
    const nome = (D.title || '').split(/\s[:—–-]\s|·|:/)[0].trim();
    if (qual === 'sim') {
      const ss = avulso('sim');
      lista.innerHTML = `<div class="in"><h1>Simulados</h1><p class="s">Simulados e provas anteriores de ${esc(nome)}.</p>`
        + (ss.length ? ss.map(x => `<button type="button" class="vga-l sm" data-id="${esc(x.id)}"><span class="tx"><b>${esc(x.titulo)}</b></span><span class="ct">→</span></button>`).join('') : '<p class="s">Esta matéria ainda não tem simulados.</p>') + '</div>';
      return;
    }
    const L = aulas(), au = aulaAberta(), rev = avulso('rev');
    const item = (a, n) => {
      const tot = a.segs.length, f = a.segs.filter(s => s.feito).length, ok = tot > 0 && f === tot;
      return `<button type="button" class="vga-l${a.freq ? ' ' + a.freq : ''}${ok ? ' ok' : ''}${au === a ? ' atual' : ''}" data-aula="${esc(a.key)}">`
        + `<span class="n">${n}</span><span class="tx"><b>${esc(a.nome)}</b><small>${a.rot ? esc(a.rot) + ' · ' : ''}${tot} ${tot === 1 ? 'segmento' : 'segmentos'}</small></span>`
        + `<span class="ct"><span class="f${f ? ' g' : ''}">${f}</span>/${tot}</span></button>`;
    };
    lista.innerHTML = `<div class="in"><h1>${esc(nome || 'Aulas')}</h1><p class="s">Escolha a aula. Ela abre no segmento em que você parou.</p>`
      + porProva(L).map(g => (g.t ? '<div class="vga-div"><span>' + esc(g.t) + '</span></div>' : '') + g.a.map(([a, i]) => item(a, i + 1)).join('')).join('')
      + (rev.length ? '<h2>Revisão</h2>' + rev.map(x => `<button type="button" class="vga-l sm" data-id="${esc(x.id)}"><span class="tx"><b>${esc(x.titulo)}</b></span><span class="ct">→</span></button>`).join('') : '')
      + '</div>';
  }
  /* barrinhas cinza da divisão: seguem o que a pessoa marcou no Foco de estudo (Parcial, Somativa, Pós-somativa);
     sem marcação, a lista fica em ordem, sem divisão */
  function porProva(L) {
    const pv = (LS('vg-foco:' + K) || {}).prova || {}, ix = L.map((a, i) => [a, i]);
    if (!L.some(a => pv[a.key])) return [{ t: null, a: ix }];
    const G = [['p', 'Parcial'], ['s', 'Somativa'], ['ps', 'Pós-somativa']].map(([k, t]) => ({ t, a: ix.filter(([a]) => pv[a.key] === k) }));
    G.push({ t: 'Sem marcação', a: ix.filter(([a]) => !pv[a.key]) });
    return G.filter(g => g.a.length);
  }
  const CORTE0 = { dic: 5, huma: 4, prev: 5, img: 7, micro: 3, semio: 4, farmaco: 3, port: 4, pato: 7 }; // o mesmo padrão do foco.js
  function corte() {
    const c = LS('vg-foco:' + K) || {}; if (c.div === false) return 0;
    const n = aulas().length; return Math.max(1, Math.min(n || 1, c.corte || CORTE0[K] || Math.ceil((n || 2) / 2)));
  }
  function abreAula(key) {
    const a = aulas().find(x => x.key === key); if (!a) return;
    const alvo = a.segs.find(s => !s.feito) || a.segs[0];
    fechar(); if (alvo) A.ir(alvo.id);
  }

  function pintar() {
    const id = A.atual(), au = aulaAberta(), na = aulaDe(id);
    const t = (avulso('notas')[0] || {}).id, ar = avulso('arena').map(x => x.id), sims = avulso('sim').map(x => x.id);
    let on = 'aulas';
    if (folha) on = folha;
    else if (id === t) on = 'notas';
    else if (sims.indexOf(id) !== -1) on = 'sim';
    else if ((na && id === na.arena) || ar.indexOf(id) !== -1) on = 'arena';
    else if (na && id === na.cai) on = 'cai';
    const dentro = !!na && folha !== 'aulas' && folha !== 'sim'; // Arena e Mais cai só com uma aula aberta na tela
    const bA = bar.querySelector('[data-k=ajustes]'); bA.hidden = !temAjustes(); bA.classList.toggle('on', ajAberto()); bA.setAttribute('aria-expanded', String(ajAberto()));
    const nB = (dentro ? 6 : 4) + (temAjustes() ? 1 : 0);
    { const bb = bar.querySelector('[data-k=busca]'); bb.classList.toggle('on', buscaAberta()); bb.setAttribute('aria-expanded', String(buscaAberta())); }
    bar.style.gridTemplateColumns = 'repeat(' + nB + ',minmax(0,1fr))'; // nas laterais o CSS põe uma coluna só
    bar.querySelectorAll('button').forEach(b => {
      const k = b.dataset.k, sel = k === on; if (k === 'ajustes' || k === 'busca') return;
      b.classList.toggle('on', sel);
      if (sel) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
      if (k === 'arena' || k === 'cai') b.hidden = !dentro;
      if (k === 'arena' || k === 'cai') { const base = ABAS.find(x => x.k === k).a, n = na ? (na.rot || na.nome) : ''; b.title = n ? base.replace('da aula aberta', 'da ' + n) : base; b.setAttribute('aria-label', b.title); }
    });
  }
  /* ---------- ⚙️ Ajustes da matéria: o painel do Foco de estudo, numa janelinha ---------- */
  let aj;
  const temAjustes = () => !!aj; // sempre: tem a saída do modo foco e a Personalização
  const ajAberto = () => !!(aj && aj.classList.contains('on'));
  /* janelinha ao lado da barra, do lado de dentro da tela, conforme a borda em que a barra está */
  function posPop(el, btn, w0) {
    const b = btn.getBoundingClientRect(), br = bar.getBoundingClientRect(), w = el.offsetWidth || w0, h = el.offsetHeight || 300, lado = innerWidth <= 700 && /[lr]/.test(html.dataset.vgaLado || '') ? 'b' : (html.dataset.vgaLado || 'b');
    el.style.left = el.style.right = el.style.top = el.style.bottom = 'auto';
    if (lado === 'l' || lado === 'r') {
      if (lado === 'l') el.style.left = (br.right + 8) + 'px'; else el.style.right = (innerWidth - br.left + 8) + 'px';
      el.style.top = Math.max(10, Math.min(innerHeight - h - 10, b.top + b.height / 2 - h / 2)) + 'px';
    } else {
      el.style.left = Math.max(10, Math.min(innerWidth - w - 10, b.left + b.width / 2 - w / 2)) + 'px';
      if (lado === 't') el.style.top = (br.bottom + 8) + 'px'; else el.style.bottom = (innerHeight - br.top + 8) + 'px';
    }
  }
  function posAj() { posPop(aj, bar.querySelector('[data-k=ajustes]'), 320); }
  function ajustes(abre) {
    if (!aj) return; abre = abre == null ? !ajAberto() : abre;
    if (abre) { const p = aj.querySelector('.vgf-panel'); if (p) p.open = true; posAj(); }
    aj.classList.toggle('on', abre); pintar();
  }
  function toque(k) {
    if (k === 'ajustes') { busca(false); ajustes(); return; }
    if (k === 'busca') { ajustes(false); busca(); return; }
    ajustes(false); busca(false);
    if (k === 'sim') { /* Simulados abre direto na grade de cartões, sem lista antes */
      if (AD[K] === caderno) { fechar(); A.ir('#simulados'); return; }
      const ss = avulso('sim'), alvo = ss.find(x => /^simulados?$/i.test(x.titulo.replace(/^[^\wÀ-ú]+/, '').trim())) || ss.find(x => /simulad/i.test(x.titulo)) || ss[0];
      if (alvo) { fechar(); A.ir(alvo.id); return; }
    }
    if (k === 'aulas' || k === 'sim') { if (folha === k) fechar(); else abrir(k); return; }
    fechar();
    if (k === 'notas') { const n = avulso('notas')[0]; if (n) A.ir(n.id); else avisar('Esta matéria ainda não tem a página de notas'); return; }
    const au = aulaDe(A.atual()); if (!au) return;
    if (k === 'arena') { const id = au && au.arena; if (id) A.ir(id); else { abrir('aulas'); avisar('Escolha uma aula para abrir a Arena dela'); } return; }
    if (k === 'cai') { const id = au && au.cai; if (id) A.ir(id); else { abrir('aulas'); avisar('Escolha uma aula para ver o que mais cai nela'); } }
  }

  /* ---------- 🔍 Buscar: índice de todo o texto da matéria ----------
     Os masters montam o texto por JavaScript, então o índice é feito numa cópia escondida da própria página
     (srcdoc, sem gravar nada no navegador): ela abre segmento por segmento e manda o texto para cá. */
  const norm = t => { let o = ''; for (const c of t) { const n = c.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); o += n.length === 1 ? n : (c.toLowerCase()[0] || ' '); } return o; };
  function corpo() {
    if (K === 'pato') { const f = AD.pato.fr(), sg = A.atual().split('/')[1], fd = f && f.contentDocument; return fd && sg ? fd.getElementById(sg) : null; }
    let p = null; try { p = A.pagina(); } catch (e) {}
    return (p && p.cont) || $('.pane.active') || $('#tb') || $('#view .page') || $('#main .section[id]') || $('#main') || $('main');
  }
  const textoDe = el => { if (!el) return ''; const c = el.cloneNode(true); c.querySelectorAll('script,style,.vga-seg,.vg-crumb,.vg-segxy,button').forEach(x => x.remove()); return c.textContent.replace(/\s+/g, ' ').trim(); };
  const nomeAula = a => a.rot ? a.rot + ' · ' + a.nome : a.nome;
  const alvos = () => aulas().flatMap(a => a.segs.map(sg => ({ id: sg.id, titulo: sg.titulo, aula: nomeAula(a) })).concat(a.cai ? [{ id: a.cai, titulo: '⭐ O que mais cai', aula: nomeAula(a) }] : []));
  async function indexar() { // roda dentro da cópia escondida
    const T = alvos(), pa = window.parent; let ant = '';
    pa.postMessage({ vgIdx: 'ini', n: T.length }, '*');
    for (const t of T) {
      try { A.ir(t.id); } catch (e) {}
      let tx = '';
      const t0 = Date.now();
      while (Date.now() - t0 < 4000) {
        await new Promise(r => setTimeout(r, 60));
        if (A.atual() !== t.id) continue;
        tx = textoDe(corpo()); if (tx.length > 30 && tx !== ant) break;
      }
      ant = tx; pa.postMessage({ vgIdx: 'seg', id: t.id, titulo: t.titulo, aula: t.aula, texto: tx }, '*');
    }
    pa.postMessage({ vgIdx: 'fim' }, '*');
  }
  let bx, IDX = null, idxN = 0, idxFr = null;
  const buscaAberta = () => !!(bx && bx.classList.contains('on'));
  async function criaIndice() {
    if (IDX) return; IDX = [];
    if (K === 'pato') { // Patologia: cada aula é um arquivo (aulas/<aula>.html), lido direto, sem cópia escondida
      const T = alvos(), porAula = {}; idxN = T.length;
      T.forEach(t => { const k = t.id.split('/')[0]; (porAula[k] = porAula[k] || []).push(t); });
      for (const k of Object.keys(porAula)) {
        try {
          const d = new DOMParser().parseFromString(await (await fetch('aulas/' + k + '.html')).text(), 'text/html');
          porAula[k].forEach(t => { const tx = textoDe(d.getElementById(t.id.split('/')[1])); IDX.push({ id: t.id, titulo: t.titulo, aula: t.aula, texto: tx, n: norm(tx) }); });
        } catch (e) {}
        if (buscaAberta()) roda();
      }
      idxN = -1; if (buscaAberta()) roda(); return;
    }
    try {
      idxFr = D.createElement('iframe'); idxFr.setAttribute('aria-hidden', 'true'); idxFr.tabIndex = -1;
      idxFr.style.cssText = 'position:fixed;left:-12000px;top:0;width:1200px;height:900px;border:0;visibility:hidden;pointer-events:none';
      idxFr.src = location.pathname + '?vgindice=1'; // o <head> do master (publicar.py) liga o modo índice e não grava nada
      D.body.appendChild(idxFr);
    } catch (e) { idxN = -1; }
  }
  addEventListener('message', e => {
    const m = e.data; if (!m || !m.vgIdx || !idxFr || e.source !== idxFr.contentWindow) return;
    if (m.vgIdx === 'ini') idxN = m.n;
    else if (m.vgIdx === 'seg') { m.n = norm(m.texto); IDX.push(m); }
    else if (m.vgIdx === 'fim') { idxN = -1; const f = idxFr; setTimeout(() => f.remove(), 100); }
    if (buscaAberta()) roda();
  });
  const stBusca = t => { const x = bx && bx.querySelector('.st'); if (x) x.textContent = t; };
  let tRoda = 0;
  function roda() { clearTimeout(tRoda); tRoda = setTimeout(rodaJa, 150); }
  function rodaJa() {
    const q = bx.querySelector('input').value.trim(), nq = norm(q), rs = bx.querySelector('.rs');
    const lendo = idxN >= 0 && IDX ? ' · lendo a matéria… ' + IDX.length + '/' + (idxN || '?') : '';
    if (nq.length < 2) { rs.innerHTML = ''; stBusca('Digite pelo menos 2 letras' + lendo); return; }
    const res = [];
    alvos().forEach(t => { if (norm(t.titulo).includes(nq)) res.push({ id: t.id, titulo: t.titulo, aula: t.aula, n: 0, trecho: '' }); });
    (IDX || []).forEach(x => {
      const i = x.n.indexOf(nq); if (i < 0) return;
      let n = 0, p = i; while (p >= 0 && n < 99) { n++; p = x.n.indexOf(nq, p + nq.length); }
      const a = Math.max(0, i - 70), b = Math.min(x.texto.length, i + nq.length + 90);
      const trecho = (a ? '…' : '') + esc(x.texto.slice(a, i)) + '<mark>' + esc(x.texto.slice(i, i + nq.length)) + '</mark>' + esc(x.texto.slice(i + nq.length, b)) + (b < x.texto.length ? '…' : '');
      const j = res.find(r => r.id === x.id);
      if (j) { j.trecho = trecho; j.n = n; } else res.push({ id: x.id, titulo: x.titulo, aula: x.aula, n, trecho });
    });
    stBusca((res.length ? res.length + (res.length === 1 ? ' segmento' : ' segmentos') : 'Nada encontrado') + lendo);
    rs.innerHTML = res.slice(0, 80).map(r => `<button type="button" class="r" data-id="${esc(r.id)}"><small>${esc(r.aula)}${r.n > 1 ? ' · ' + r.n + ' vezes' : ''}</small><b>${esc(r.titulo)}</b>${r.trecho ? '<p>' + r.trecho + '</p>' : ''}</button>`).join('');
  }
  function busca(abre) {
    if (!bx) return; abre = abre == null ? !buscaAberta() : abre;
    bx.classList.toggle('on', abre);
    if (abre) { posPop(bx, bar.querySelector('[data-k=busca]'), 560); criaIndice(); rodaJa(); setTimeout(() => { const i = bx.querySelector('input'); i.focus(); i.select(); }, 30); }
    pintar();
  }
  function grifa(q, id) { // depois de abrir o resultado: marca a palavra no texto e rola até ela
    const nq = norm(q); let n = 0;
    const tenta = () => {
      if (A.atual() !== id) return false;
      const c = corpo(); if (!c) return false;
      const d = c.ownerDocument; d.querySelectorAll('mark.vga-mk').forEach(m => m.replaceWith(...m.childNodes));
      const w = d.createTreeWalker(c, NodeFilter.SHOW_TEXT); let t;
      while ((t = w.nextNode())) {
        if (t.parentElement.closest('script,style,.vga-seg')) continue;
        const i = norm(t.data).indexOf(nq); if (i < 0) continue;
        const r = t.splitText(i); r.splitText(nq.length);
        const m = d.createElement('mark'); m.className = 'vga-mk'; r.replaceWith(m); m.appendChild(r);
        let e = m.parentElement; while (e && e !== c) { if (e.tagName === 'DETAILS') e.open = true; e = e.parentElement; }
        const vai = () => m.isConnected && m.scrollIntoView({ block: 'center', behavior: 'instant' }); vai(); setTimeout(vai, 350); setTimeout(vai, 900); return true; // o master rola para o topo depois de abrir
      }
      return false;
    };
    const loop = () => { if (!tenta() && ++n < 40) setTimeout(loop, 100); };
    setTimeout(loop, 150);
  }

  /* ---------- Anterior · Concluir · Próximo no início e no fim do segmento ---------- */
  function navSeg() {
    let p; try { p = A.pagina(); } catch (e) { p = null; }
    if (!p || !p.cont) return;
    const id = A.atual(), au = aulaDe(id); if (!au) return;
    const seq = au.segs.map(s => s.id), i = seq.indexOf(id); if (i < 0) return;
    const prev = seq[i - 1], next = seq[i + 1] || (au.cai && seq.indexOf(au.cai) < 0 ? au.cai : null);
    const d = p.doc;
    if (d !== D && !d.getElementById('vg-abas-seg-css')) { const s = d.createElement('style'); s.id = 'vg-abas-seg-css'; s.textContent = CSS_SEG + '\n' + A.esconde; d.head.appendChild(s); }
    const nomeDe = x => { const s = au.segs.find(z => z.id === x); return s ? s.titulo : x === au.cai ? 'O que mais cai' : ''; };
    const faz = cls => {
      const el = d.createElement('div'); el.className = 'vga-seg ' + cls; el.dataset.seg = id;
      el.innerHTML = (prev ? `<button type="button" data-to="${esc(prev)}" title="${esc(nomeDe(prev))}">← Anterior</button>` : '<span></span>')
        + '<button type="button" class="dn"></button>'
        + (next ? `<button type="button" data-to="${esc(next)}" title="${esc(nomeDe(next))}">${next === au.cai ? '⭐ O que mais cai →' : 'Próximo →'}</button>` : '<span></span>');
      el.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return;
        if (b.classList.contains('dn')) { A.concluir(id); setTimeout(pintaDone, 60); setTimeout(pintaDone, 300); } else A.ir(b.dataset.to); });
      return el;
    };
    $$('.vga-seg', p.cont).forEach(x => { if (x.dataset.seg !== id) x.remove(); });
    if (!$('.vga-seg.ini', p.cont)) { const t = faz('ini'); if (p.topo) p.topo.insertAdjacentElement('afterend', t); else if (p.antes) p.antes.insertAdjacentElement('beforebegin', t); else p.cont.prepend(t); }
    if (!$('.vga-seg.fim', p.cont)) { const f = faz('fim'); if (p.fim) p.fim.insertAdjacentElement('beforebegin', f); else p.cont.append(f); }
    pintaDone();
  }
  function pintaDone() {
    let p; try { p = A.pagina(); } catch (e) { p = null; } if (!p || !p.cont) return;
    $$('.vga-seg .dn', p.cont).forEach(b => {
      const on = A.feito(b.closest('.vga-seg').dataset.seg);
      b.classList.toggle('on', on); b.textContent = on ? '✓ Segmento concluído' : 'Concluir segmento';
    });
  }

  let tRef = 0;
  function atualiza() {
    if (tRef) return;
    tRef = setTimeout(() => {
      tRef = 0;
      const au = aulaDe(A.atual()); if (au && mem.aula !== au.key) { mem.aula = au.key; salva(); }
      pintar(); navSeg();
      if (folha === 'aulas') monta('aulas');
    }, 40);
  }

  function start() {
    let ligado = false; try { ligado = localStorage.getItem('vidro-modo-foco') === 'true'; } catch (e) {} if (!ligado) return; // só com o 🥷 Modo foco ligado na Personalização
    if (!aulas().length) return;
    D.head.appendChild(st);
    html.classList.add('vga-on');
    lista = D.createElement('div'); lista.id = 'vg-lista'; lista.setAttribute('role', 'dialog'); lista.setAttribute('aria-label', 'Aulas');
    lista.addEventListener('click', e => { const b = e.target.closest('.vga-l'); if (!b) return; if (b.dataset.aula) abreAula(b.dataset.aula); else { fechar(); A.ir(b.dataset.id); } });
    aviso = D.createElement('div'); aviso.id = 'vg-abas-aviso'; aviso.setAttribute('role', 'status');
    { /* canto de cima à esquerda: casinha (volta ao hub) e tela cheia, só ícones */
      const sc = D.querySelector('script[src*="_tema/abas.js"]');
      let hub = '../index.html'; try { hub = new URL('../index.html', sc.src).href; } catch (e) {}
      const cn = D.createElement('div'); cn.id = 'vg-canto';
      cn.innerHTML = `<a href="${hub}" title="Menu principal" aria-label="Menu principal"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11.5 12 4l9 7.5M5.5 9.5V20h5v-6h3v6h5V9.5"/></svg></a><button type="button" title="Tela cheia" aria-label="Tela cheia"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg></button>`;
      const fs = cn.querySelector('button');
      if (!D.documentElement.requestFullscreen) fs.hidden = true;
      fs.addEventListener('click', () => { if (D.fullscreenElement) D.exitFullscreen(); else D.documentElement.requestFullscreen().catch(() => {}); });
      D.addEventListener('fullscreenchange', () => { const on = !!D.fullscreenElement; fs.title = fs.ariaLabel = on ? 'Sair da tela cheia' : 'Tela cheia'; fs.querySelector('path').setAttribute('d', on ? 'M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5' : 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5'); });
      D.body.appendChild(cn);
    }
    bar =D.createElement('nav'); bar.id = 'vg-abas'; bar.setAttribute('aria-label', 'Navegação da masterclass');
    bar.innerHTML = ABAS.map(x => `<button type="button" data-k="${x.k}" title="${x.a}" aria-label="${x.a}"><span class="i" aria-hidden="true">${x.i}</span><span class="t">${x.t}</span></button>`).join('');
    bar.addEventListener('click', e => { if (arrastou) { arrastou = false; return; } const b = e.target.closest('button'); if (b) toque(b.dataset.k); });
    /* barra móvel: segurar e arrastar até uma borda (embaixo, em cima, esquerda ou direita); nas laterais ela fica vertical.
       A borda fica salva para todos os masters; duplo clique volta para baixo. */
    const PK = 'vg-abas-lado';
    const lado = l => { if (l && l !== 'b') html.dataset.vgaLado = l; else delete html.dataset.vgaLado; };
    { let l0 = null; try { l0 = localStorage.getItem(PK); } catch (e) {} if (/^[tlr]$/.test(l0 || '')) lado(l0); }
    const borda = (x, y) => { const d = { b: innerHeight - y, t: y, l: x, r: innerWidth - x }; return Object.keys(d).reduce((m, k) => d[k] < d[m] ? k : m, 'b'); };
    const volta = () => { lado('b'); try { localStorage.removeItem(PK); } catch (e) {} };
    let arrastou = false, ini = null;
    bar.addEventListener('pointerdown', e => { if (e.button !== 0) return; ini = { x: e.clientX, y: e.clientY, mov: false, id: e.pointerId }; });
    addEventListener('pointermove', e => {
      if (!ini) return;
      if (!ini.mov && Math.hypot(e.clientX - ini.x, e.clientY - ini.y) < 12) return;
      if (!ini.mov) { ini.mov = true; bar.classList.add('arrasta'); segsMenu.classList.remove('on'); ajustes(false); busca(false); try { bar.setPointerCapture(ini.id); } catch (x) {} }
      lado(borda(e.clientX, e.clientY));
    });
    addEventListener('pointerup', () => {
      if (!ini) return;
      if (ini.mov) { arrastou = true; setTimeout(() => { arrastou = false; }, 0); bar.classList.remove('arrasta'); try { localStorage.setItem(PK, html.dataset.vgaLado || 'b'); } catch (x) {} }
      ini = null;
    });
    try { localStorage.removeItem('vg-abas-pos'); } catch (e) {}
    bar.addEventListener('dblclick', e => { e.preventDefault(); volta(); });
    segsMenu = D.createElement('div'); segsMenu.id = 'vg-segs'; segsMenu.setAttribute('role', 'menu');
    aj = D.createElement('div'); aj.id = 'vg-ajustes'; aj.setAttribute('role', 'dialog'); aj.setAttribute('aria-label', 'Ajustes da matéria');
    aj.innerHTML = '<div class="h">⚙️ Ajustes da matéria</div>'
      + '<button type="button" class="vga-aj" data-aj="sair" role="switch" aria-checked="true"><span class="tx">🥷 Modo foco<small>Desligar volta ao master com a barra lateral (recarrega a página)</small></span><span class="vga-sw" aria-hidden="true"></span></button>'
      + '<button type="button" class="vga-aj" data-aj="tema" role="switch"><span class="tx">☀️ Tema claro<small>Liga o modo foco claro; desligado fica escuro</small></span><span class="vga-sw" aria-hidden="true"></span></button>'
      + '<button type="button" class="vga-aj" data-aj="pers"><span class="tx">🎨 Personalização<small>Tema claro ou escuro, fundo e cor de destaque</small></span><span aria-hidden="true">›</span></button><hr>';
    const pintaTema = () => { const b = aj.querySelector('[data-aj=tema]'), on = html.dataset.theme === 'light'; b.setAttribute('aria-checked', String(on)); b.classList.toggle('off', !on); };
    pintaTema(); new MutationObserver(pintaTema).observe(html, { attributes: true, attributeFilter: ['data-theme'] });
    aj.addEventListener('click', e => {
      const b = e.target.closest('[data-aj]'); if (!b) return;
      if (b.dataset.aj === 'tema') {
        // o botão de tema do master fica escondido no modo foco: clica nele direto
        const t = D.querySelector('[data-act="theme"],#btnTheme,.themebtn');
        if (t) t.click(); setTimeout(pintaTema, 50); return;
      }
      if (b.dataset.aj === 'sair') { try { localStorage.setItem('vidro-modo-foco', 'false'); } catch (x) {} location.reload(); }
      else { ajustes(false); const fx = D.getElementById('vidro-fx'); if (fx) setTimeout(() => fx.click(), 0); }
    });
    window.VGFocoHost = aj;
    bx = D.createElement('div'); bx.id = 'vg-busca'; bx.setAttribute('role', 'dialog'); bx.setAttribute('aria-label', 'Buscar na matéria');
    bx.innerHTML = '<input type="search" placeholder="Buscar na matéria…" aria-label="Palavra para buscar" autocomplete="off"><div class="st"></div><div class="rs"></div>';
    bx.querySelector('input').addEventListener('input', roda);
    bx.querySelector('input').addEventListener('keydown', e => { if (e.key === 'Enter') { const r = bx.querySelector('.r'); if (r) r.click(); } });
    bx.addEventListener('click', e => { const r = e.target.closest('.r'); if (!r) return; const q = bx.querySelector('input').value.trim(); busca(false); fechar(); A.ir(r.dataset.id); grifa(q, r.dataset.id); });
    D.body.append(lista, aviso, bar, segsMenu, aj, bx);
    { const p = D.querySelector('.vgf-panel'); if (p) { p.open = true; aj.appendChild(p); } setTimeout(pintar, 0); new MutationObserver(() => pintar()).observe(aj, { childList: true }); }
    aj.addEventListener('change', () => setTimeout(() => { if (folha === 'aulas') monta('aulas'); }, 30));
    D.addEventListener('pointerdown', e => { if (ajAberto() && !aj.contains(e.target) && !e.target.closest('#vg-abas [data-k=ajustes]')) ajustes(false); });
    addEventListener('keydown', e => { if (e.key === 'Escape' && ajAberto()) ajustes(false); if (e.key === 'Escape' && buscaAberta()) busca(false); });
    D.addEventListener('pointerdown', e => { if (buscaAberta() && !bx.contains(e.target) && !e.target.closest('#vg-abas [data-k=busca]')) busca(false); });
    const bAulas = bar.querySelector('[data-k=aulas]');
    const mostra = () => {
      clearTimeout(tSegs); if (folha) return;
      const id = A.atual(), au = aulaDe(id); if (!au) return;
      segsMenu.innerHTML = `<div class="h">${esc(au.rot ? au.rot + ' · ' : '')}${esc(au.nome)}</div>` + au.segs.map((s, i) =>
        `<button type="button" role="menuitem" data-id="${esc(s.id)}" class="${s.freq || ''}${s.feito ? ' ok' : ''}${s.id === id ? ' at' : ''}"><span class="n">${i + 1}</span><span class="x" title="${esc(s.titulo)}">${esc(s.titulo)}</span><span class="c">${s.feito ? '✓' : ''}</span></button>`).join('');
      posPop(segsMenu, bAulas, 360);
      segsMenu.classList.add('on');
    };
    const some = () => { clearTimeout(tSegs); tSegs = setTimeout(() => segsMenu.classList.remove('on'), 180); };
    bAulas.addEventListener('mouseenter', mostra); bAulas.addEventListener('mouseleave', some);
    segsMenu.addEventListener('mouseenter', () => clearTimeout(tSegs)); segsMenu.addEventListener('mouseleave', some);
    bAulas.addEventListener('click', () => segsMenu.classList.remove('on'));
    segsMenu.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; segsMenu.classList.remove('on'); A.ir(b.dataset.id); });

    A.vigia(atualiza);
    addEventListener('keydown', e => { if (e.key === 'Escape' && folha) { fechar(); const b = bar.querySelector('button.on'); if (b) b.focus(); } });
    pintar(); navSeg();
    // ao entrar no master: sempre a lista de aulas (a Arena e o Mais cai só aparecem depois de abrir uma aula)
    abrir('aulas');
  }
  // depois dos scripts do master (a barra lateral e o Foco de estudo já montados)
  const go = window.__vgIndex && window.parent !== window ? () => setTimeout(indexar, 400) : start;
  if (D.readyState === 'complete') setTimeout(go, 0); else addEventListener('load', () => setTimeout(go, 0));
})();
