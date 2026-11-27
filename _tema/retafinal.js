/* 🔥 Modo Reta Final: cronograma reverso até o dia da prova.
   - O aluno informa a data da prova (ou quantos dias faltam) e o escopo (todas as aulas ou as que marcou como
     Parcial / Somativa no Foco de estudo).
   - O script lê da barra lateral todos os segmentos da matéria, identifica quais já estão concluídos e o nível
     de frequência nas provas (vgf-g5 → g1), ordena do que MAIS CAI para o menos cobrado e divide em metas diárias
     (Dia 1, Dia 2, ..., Véspera = revisão expressa + simulado).
   - Salvo por matéria em localStorage "vg-reta:<chave>".
   - Acessível no painel do Foco de estudo, no 🥷 Modo foco e por window.VGRetaFinal.abrir(). */
(function () {
  'use strict';
  const D = document, html = D.documentElement, K = html.dataset.vidro || '';
  if (window.VGRetaFinal || !K || K === 'th4' || K === 'dic' || html.classList.contains('vidro-aula') || window.__vgIndex) return;

  const CK = 'vg-reta:' + K;
  const $ = (s, r) => (r || D).querySelector(s), $$ = (s, r) => [...(r || D).querySelectorAll(s)];
  const txt = e => (e ? e.textContent : '').replace(/\s+/g, ' ').trim();
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fqNum = el => { const m = el && String(el.className || '').match(/vgf-g(\d)/); return m ? +m[1] : 0; };
  const ler = () => { try { return JSON.parse(localStorage.getItem(CK) || 'null') || {}; } catch (_) { return {}; } };
  const grava = o => { try { localStorage.setItem(CK, JSON.stringify(o)); } catch (_) {} };
  const focoCfg = () => { try { return JSON.parse(localStorage.getItem('vg-foco:' + K) || 'null') || {}; } catch (_) { return {}; } };

  /* coleta aulas e segmentos de qualquer master (lê a barra lateral já montada + grifos vgf-g1..g5 do foco.js) */
  function coletar() {
    const out = [];
    const cad = (selGrp, selHead, selIt, selTit, fnKey, fnDone, fnIr) => {
      $$(selGrp).forEach(g => {
        const h = $(selHead, g), ak = fnKey(g); if (!h || !ak) return;
        const nomeAula = txt(h).replace(/(\s*\d+\s*(\/|de)\s*\d+(\s*segmentos?)?)+\s*$/i, '').trim(); // tira os contadores "3/8" e "0 de 5 segmentos" (a Microbiologia tem os dois)
        const fqA = fqNum(h);
        const segs = $$(selIt, g).map(it => {
          const tEl = selTit ? $(selTit, it) : it;
          const t = txt(tEl).replace(/^⭐\s*/, '').trim();
          if (/o que mais (é|foi)?\s*(cai|cobrado)|arena|quiz/i.test(t)) return null;
          return { aulaKey: ak, aula: nomeAula, titulo: t, feito: fnDone(it), fq: fqNum(it) || fqA, ir: () => fnIr(it) };
        }).filter(Boolean);
        if (segs.length) out.push({ key: ak, nome: nomeAula, fq: fqA, segs });
      });
    };

    if (/^(huma|prev|img|lab|dic)$/.test(K)) {
      cad('#nav .grp[data-lesson]', '.grp-h', '.it[data-seg]', '.x', g => g.dataset.lesson,
        it => !!($('input', it) && $('input', it).checked),
        it => { const h = it.getAttribute('href'); if (h) location.hash = h; else it.click(); });
    } else if (K === 'micro' || K === 'semio') {
      cad('#nav .grp[data-g]', '.gh', '.it[data-go]', '.lb', g => /^a\d+$/.test(g.dataset.g) ? g.dataset.g : '',
        it => it.classList.contains('done'),
        it => { location.hash = '#' + it.dataset.go; });
    } else if (K === 'farmaco') {
      $$('.sb-nav > .grp, .sb-nav .sb-bloco-c > .grp').filter((g, i, a) => a.indexOf(g) === i && $('.it[data-id^="arena-"]', g)).forEach(g => {
        const h = $('.grp-h', g), its = $$('.it[data-id]', g).filter(it => $('input', it));
        if (!h || !its.length) return;
        const ak = its[0].dataset.id, nomeAula = txt($('.lbl', h) || h), fqA = fqNum(h);
        out.push({
          key: ak, nome: nomeAula, fq: fqA,
          segs: its.map(it => ({ aulaKey: ak, aula: nomeAula, titulo: txt($('.x', it)), feito: $('input', it).checked, fq: fqNum(it) || fqA, ir: () => { if (window.MC && MC.go) MC.go(it.dataset.id); else it.click(); } }))
        });
      });
    } else if (K === 'pato') {
      $$('#tabbtns .grp[data-key]').filter(g => /^(aula|tgi|pratica)\d+$/.test(g.dataset.key) && g.dataset.cap !== 'extra').forEach(g => {
        const h = $('.grp-h', g), ak = g.dataset.key, nomeAula = txt(h), fqA = fqNum(h);
        const its = $$('.it[data-seg]', g).filter(it => $('input', it));
        if (!its.length) return;
        out.push({
          key: ak, nome: nomeAula, fq: fqA,
          segs: its.map(it => ({ aulaKey: ak, aula: nomeAula, titulo: txt($('.x', it) || it), feito: $('input', it).checked, fq: fqNum(it) || fqA, ir: () => it.click() }))
        });
      });
    } else if (K === 'port') {
      const st = (() => { try { return JSON.parse(localStorage.getItem('lpii') || '{}'); } catch (_) { return {}; } })();
      const dn = st.done || {};
      $$('#nav .nv[data-v="mod"]').forEach(b => {
        const ak = b.dataset.id, sub = b.nextElementSibling, nomeAula = txt(b), fqA = fqNum(b);
        const sbs = sub && sub.classList.contains('sub') ? $$('.sb[data-sg]', sub) : [];
        if (!sbs.length) return;
        out.push({
          key: ak, nome: nomeAula, fq: fqA,
          segs: sbs.map(s => ({ aulaKey: ak, aula: nomeAula, titulo: txt(s), feito: !!dn[ak + ':' + s.dataset.sg], fq: fqNum(s) || fqA, ir: () => { if (!b.classList.contains('on')) b.click(); setTimeout(() => s.click(), 30); } }))
        });
      });
    } else {
      /* fallback automático para qualquer matéria nova (padrão Caderno ou Microbiologia) */
      if ($('#nav .grp[data-lesson]')) {
        cad('#nav .grp[data-lesson]', '.grp-h', '.it[data-seg]', '.x', g => g.dataset.lesson,
          it => !!($('input', it) && $('input', it).checked),
          it => { const h = it.getAttribute('href'); if (h) location.hash = h; else it.click(); });
      } else if ($('#nav .grp[data-g]')) {
        cad('#nav .grp[data-g]', '.gh', '.it[data-go]', '.lb', g => /^a\d+$/.test(g.dataset.g) ? g.dataset.g : '',
          it => it.classList.contains('done'),
          it => { location.hash = '#' + it.dataset.go; });
      }
    }
    return out;
  }

  function diasAte(dataStr) {
    if (!dataStr) return 0;
    const p = dataStr.split('-').map(Number);
    if (p.length !== 3) return 0;
    const alvo = new Date(p[0], p[1] - 1, p[2]), hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    return Math.ceil((alvo - hoje) / 86400e3);
  }
  function fmtDia(offset) {
    const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + offset);
    if (offset === 0) return 'Hoje (' + d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + ')';
    if (offset === 1) return 'Amanhã (' + d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + ')';
    return d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });
  }
  function dataPadrao(dias) {
    const d = new Date(); d.setDate(d.getDate() + dias);
    const p = x => String(x).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }

  const CSS = `
.vgr-bg{position:fixed;inset:0;z-index:2147482700;background:rgba(4,6,10,.58);display:flex;align-items:center;justify-content:center;padding:14px}
.vgr-box{width:min(760px,100%);max-height:calc(100dvh - 28px);overflow:auto;border-radius:22px;border:1px solid var(--vg-edge,rgba(127,127,127,.3));
  background:var(--vg-ground,#121413);color:var(--vg-ink,inherit);padding:20px 22px 22px;box-shadow:0 24px 70px rgba(0,0,0,.5);font:400 14.5px/1.45 var(--vg-text,system-ui,sans-serif)}
.vgr-top{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
.vgr-top h2{margin:0;font:400 28px/1.1 var(--vg-display,serif)}
.vgr-x{width:34px;height:34px;border-radius:50%;border:1px solid var(--vg-edge,rgba(127,127,127,.3));background:transparent;color:inherit;font-size:17px;cursor:pointer;flex:none}
.vgr-sub{margin:4px 0 14px;font-size:13.5px;color:var(--vg-muted,#888)}
.vgr-ctl{display:flex;flex-wrap:wrap;gap:10px 14px;align-items:flex-end;padding:12px 14px;border-radius:16px;border:1px solid var(--vg-edge,rgba(127,127,127,.25));background:var(--vg-glass,transparent);margin:0 0 16px}
.vgr-ctl label{display:grid;gap:4px;font-size:12px;font-weight:600;color:var(--vg-muted,#888)}
.vgr-ctl input,.vgr-ctl select{height:36px;padding:0 10px;border-radius:10px;border:1px solid var(--vg-edge,rgba(127,127,127,.3));background:var(--vg-ground,#121413);color:inherit;font:inherit;font-size:14px}
.vgr-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:0 0 14px}
.vgr-kpi{border:1px solid var(--vg-edge,rgba(127,127,127,.22));border-radius:14px;padding:9px 11px;background:var(--vg-glass,transparent)}
.vgr-kpi b{display:block;font-size:22px;line-height:1.1}.vgr-kpi span{font-size:12px;color:var(--vg-muted,#888)}
.vgr-bar{height:8px;border-radius:999px;background:color-mix(in srgb,currentColor 12%,transparent);overflow:hidden;margin:0 0 16px}
.vgr-bar i{display:block;height:100%;background:var(--vg-acc,#5aa9ff);transition:width .3s}
.vgr-dia{margin:0 0 14px;border:1px solid var(--vg-edge,rgba(127,127,127,.24));border-radius:16px;padding:12px 14px;background:var(--vg-glass,transparent)}
.vgr-dia-h{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:0 0 8px}
.vgr-dia-h b{font-size:15px}.vgr-dia-h small{font-size:12px;color:var(--vg-muted,#888)}
.vgr-item{all:unset;box-sizing:border-box;display:flex;align-items:center;gap:10px;width:100%;padding:8px 10px;border-radius:11px;cursor:pointer;font-size:14px;transition:background .12s}
.vgr-item:hover{background:var(--vg-hov,rgba(127,127,127,.14))}
.vgr-dot{width:10px;height:10px;border-radius:50%;flex:none;background:rgba(127,127,127,.4)}
.vgr-dot.f1{background:#3fb950}.vgr-dot.f2{background:#e3b341}.vgr-dot.f3{background:#f0883e}.vgr-dot.f4{background:#f85149}.vgr-dot.f5{background:#0b0b0b;box-shadow:0 0 0 1.5px #ffe3a3}
.vgr-item .tx{flex:1;min-width:0}.vgr-item .tx small{display:block;font-size:12px;color:var(--vg-muted,#888)}
.vgr-item .go{font-size:12.5px;font-weight:600;color:var(--vg-acc-ink,var(--vg-acc,#5aa9ff));white-space:nowrap}
.vgr-vesp{padding:10px 12px;border-radius:12px;background:color-mix(in srgb,var(--vg-acc,#5aa9ff) 14%,transparent);border:1px solid color-mix(in srgb,var(--vg-acc,#5aa9ff) 38%,transparent);font-size:13.5px}
.vgr-foco-bt{display:flex;align-items:center;justify-content:space-between;width:calc(100% - 16px);margin:4px 8px 2px;padding:7px 10px;border-radius:11px;border:1px solid color-mix(in srgb,var(--vg-acc,#5aa9ff) 40%,var(--vg-edge,rgba(127,127,127,.25)));background:color-mix(in srgb,var(--vg-acc,#5aa9ff) 10%,var(--vg-glass,transparent));color:inherit;font:600 13px/1.2 var(--vg-text,system-ui,sans-serif);cursor:pointer;text-align:left}
.vgr-foco-bt:hover{border-color:var(--vg-acc)}.vgr-foco-bt small{font-weight:700;color:var(--vg-acc-ink,var(--vg-acc))}
@media (max-width:600px){.vgr-kpis{grid-template-columns:repeat(2,1fr)}.vgr-box{padding:14px}}
`;

  function estilo() {
    if (D.getElementById('vgr-css')) return;
    const s = D.createElement('style'); s.id = 'vgr-css'; s.textContent = CSS; D.head.appendChild(s);
  }

  function abrir() {
    estilo();
    if (D.querySelector('.vgr-bg')) return;
    const bg = D.createElement('div'); bg.className = 'vgr-bg';
    const box = D.createElement('div'); box.className = 'vgr-box'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-label', 'Modo Reta Final');
    bg.appendChild(box); D.body.appendChild(bg);
    const fechar = () => { bg.remove(); D.removeEventListener('keydown', onK); };
    const onK = e => { if (e.key === 'Escape') fechar(); };
    D.addEventListener('keydown', onK);
    bg.addEventListener('click', e => { if (e.target === bg) fechar(); });

    let cfg = ler();
    if (!cfg.data) { cfg.data = dataPadrao(5); grava(cfg); }
    cfg.escopo = cfg.escopo || 'all';
    let itensClick = [];

    function pinta() {
      const aulas = coletar(), fc = focoCfg(), pv = fc.prova || {};
      const temP = aulas.some(a => pv[a.key] === 'p'), temS = aulas.some(a => pv[a.key] === 's');
      if ((cfg.escopo === 'p' && !temP) || (cfg.escopo === 's' && !temS)) cfg.escopo = 'all';
      const filtradas = aulas.filter(a => cfg.escopo === 'all' || pv[a.key] === cfg.escopo);
      const todosSegs = filtradas.flatMap(a => a.segs);
      const feitos = todosSegs.filter(s => s.feito).length;
      const pend = todosSegs.filter(s => !s.feito);
      /* ordena pendentes do que MAIS CAI (fq 5→0), mantendo a ordem didática dentro da mesma prioridade */
      const ord = pend.slice().sort((a, b) => b.fq - a.fq);
      const dias = Math.max(1, diasAte(cfg.data));
      const diasEstudo = dias >= 3 ? dias - 1 : dias; // reserva o último dia para revisão + simulado se houver >= 3 dias
      const porDia = Math.max(1, Math.ceil(ord.length / diasEstudo));
      const pct = todosSegs.length ? Math.round(feitos / todosSegs.length * 100) : 100;
      const quentes = ord.filter(s => s.fq >= 4).length;

      itensClick = [];
      let planoHtml = '';
      if (!ord.length) {
        planoHtml = '<div class="vgr-vesp"><b>🎉 Você já concluiu todos os segmentos desse escopo!</b> Agora é hora de fazer simulados cronometrados, revisar os flashcards vencidos e repassar "O que mais cai".</div>';
      } else {
        for (let d = 0; d < diasEstudo; d++) {
          const fatia = ord.slice(d * porDia, (d + 1) * porDia);
          if (!fatia.length) break;
          planoHtml += `<div class="vgr-dia"><div class="vgr-dia-h"><b>Dia ${d + 1} · ${fmtDia(d)}</b><small>${fatia.length} segmento(s) · ~${fatia.length * 15} min</small></div>`;
          fatia.forEach(s => {
            const idx = itensClick.push(s) - 1;
            const rotFq = s.fq >= 4 ? 'cai muito' : s.fq >= 2 ? 'cai com frequência' : s.fq === 1 ? 'já caiu' : 'base';
            planoHtml += `<button type="button" class="vgr-item" data-idx="${idx}"><span class="vgr-dot f${s.fq}" title="${rotFq}"></span><span class="tx"><b>${esc(s.titulo)}</b><small>${esc(s.aula)} · ${rotFq}</small></span><span class="go">Abrir →</span></button>`;
          });
          planoHtml += '</div>';
        }
        if (dias >= 3) {
          planoHtml += `<div class="vgr-dia"><div class="vgr-dia-h"><b>Dia ${dias} · Véspera (${fmtDia(dias - 1)})</b><small>Consolidação</small></div><div class="vgr-vesp">⚡ Reserve este dia para <b>1 simulado completo cronometrado</b>, <b>Revisão em 1 hora</b> e os <b>flashcards/erros</b> acumulados.</div></div>`;
        }
      }

      box.innerHTML = `<div class="vgr-top"><div><h2>🔥 Modo Reta Final</h2><p class="vgr-sub">Plano automático ordenado pelo que mais cai nas provas, usando apenas os segmentos que você ainda não concluiu.</p></div><button type="button" class="vgr-x" aria-label="Fechar">✕</button></div>
        <div class="vgr-ctl">
          <label>Data da prova<input type="date" name="data" value="${esc(cfg.data)}"></label>
          <label>Escopo<select name="escopo">
            <option value="all"${cfg.escopo === 'all' ? ' selected' : ''}>Todas as aulas (${aulas.length})</option>
            ${temP ? `<option value="p"${cfg.escopo === 'p' ? ' selected' : ''}>Só marcadas como Parcial</option>` : ''}
            ${temS ? `<option value="s"${cfg.escopo === 's' ? ' selected' : ''}>Só marcadas como Somativa</option>` : ''}
          </select></label>
        </div>
        <div class="vgr-kpis">
          <div class="vgr-kpi"><b>${diasAte(cfg.data) <= 0 ? 'Hoje!' : dias + (dias === 1 ? ' dia' : ' dias')}</b><span>até a prova</span></div>
          <div class="vgr-kpi"><b>${ord.length}</b><span>segmentos pendentes</span></div>
          <div class="vgr-kpi"><b>${porDia}/dia</b><span>ritmo sugerido</span></div>
          <div class="vgr-kpi"><b>${quentes}</b><span>prioridade máxima</span></div>
        </div>
        <div class="vgr-bar"><i style="width:${pct}%"></i></div>
        ${planoHtml}`;
      atualizaBotaoFoco();
    }

    box.addEventListener('click', e => {
      if (e.target.closest('.vgr-x')) return fechar();
      const it = e.target.closest('.vgr-item');
      if (it) { const s = itensClick[+it.dataset.idx]; fechar(); if (s && s.ir) s.ir(); }
    });
    box.addEventListener('change', e => {
      if (e.target.name === 'data') { cfg.data = e.target.value; grava(cfg); pinta(); }
      if (e.target.name === 'escopo') { cfg.escopo = e.target.value; grava(cfg); pinta(); }
    });
    pinta();
  }

  function atualizaBotaoFoco() {
    const cfg = ler(), d = cfg.data ? diasAte(cfg.data) : null;
    const tag = d == null ? 'plano' : d <= 0 ? 'hoje!' : d === 1 ? '1 dia' : d + ' dias';
    D.querySelectorAll('.vgf-panel').forEach(p => {
      let b = p.querySelector('.vgr-foco-bt');
      if (!b) {
        estilo();
        b = D.createElement('button'); b.type = 'button'; b.className = 'vgr-foco-bt';
        b.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); abrir(); });
        (p.querySelector('.vgf-b') || p).appendChild(b);
      }
      /* só reescreve quando muda: o innerHTML gera mutação childList, que chamaria o observer de novo (laço infinito) */
      if (b.dataset.tag !== tag) { b.dataset.tag = tag; b.innerHTML = '<span>🔥 Modo Reta Final</span><small>' + tag + '</small>'; }
    });
  }
  new MutationObserver(atualizaBotaoFoco).observe(D.documentElement, { childList: true, subtree: true });
  window.VGRetaFinal = { abrir };
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', atualizaBotaoFoco); else atualizaBotaoFoco();
})();
