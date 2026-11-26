/* 📊 Meu rendimento (protótipo): monitor de concentração sem IA, igual em todos os masters.
   - Coleta sozinho, enquanto a pessoa estuda: horário, tempo ativo (aba visível, com mexida nos últimos 90 s),
     saídas da aba, tempo fora e segmentos concluídos.
   - Ao fim de cada sessão (pausa de mais de 30 min, ou "Encerrar sessão"), pergunta em 10 s: nota de 1 a 5,
     fatores do dia e local.
   - O painel cruza tudo com conta simples: rendimento por faixa de horário e diferença com × sem cada fator.
     Só tira conclusão com sessões suficientes (MIN com e MIN sem). Mostra associação, não causa.
   Tudo fica no navegador da pessoa (localStorage "vg-conc"), valendo para todas as matérias.
   Abre pelo botão "📊 Meu rendimento" no painel do Foco de estudo (ou window.VGConc.abrir()). TH IV fica de fora. */
(function () {
  const D = document, html = D.documentElement, K = html.dataset.vidro || '';
  if (window.VGConc || !K || K === 'th4' || /[?&]vgindice/.test(location.search)) return;
  const CK = 'vg-conc', PAUSA = 30 * 60e3, MIN_SESS = 5 * 60, TICK = 15, INATIVO = 5 * 60e3, MIN = 3;
  const FAT = [['sono', '😴 Dormi bem'], ['cafe', '☕ Café'], ['cel', '📱 Celular longe'], ['exe', '🏃 Fiz exercício'], ['ans', '😰 Ansioso(a)'],
    ['barulho', '🔊 Barulho'], ['musica', '🎧 Música'], ['fome', '🍽️ Com fome'], ['junto', '👥 Estudei com alguém']];
  const LOC = [['casa', '🏠 Casa'], ['bib', '📚 Biblioteca'], ['fac', '🏫 Faculdade'], ['outro', '📍 Outro']];
  const FAIXAS = [['Madrugada', 0, 6], ['Manhã', 6, 12], ['Tarde', 12, 18], ['Noite', 18, 24]];
  const NOME = { farmaco: 'Farmacologia', micro: 'Microbiologia', pato: 'Patologia', semio: 'Semiologia', prev: 'Med Prev', huma: 'Humanização', lab: 'Prop. Laboratorial', img: 'Prop. de Imagem', port: 'Português', dic: 'DIC IV' };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const ler = () => { try { const d = JSON.parse(localStorage.getItem(CK) || 'null'); if (d && Array.isArray(d.sess)) return d; } catch (e) {} return { v: 1, sess: [], atual: null }; };
  const grava = d => { try { localStorage.setItem(CK, JSON.stringify(d)); } catch (e) {} };
  const min = s => Math.round(s / 60), hm = t => new Date(t).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const dur = s => { const m = min(s); return m < 60 ? m + ' min' : Math.floor(m / 60) + 'h' + String(m % 60).padStart(2, '0'); };
  const dia = t => new Date(t).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });

  /* ---------- coleta ---------- */
  let ultMexida = Date.now(), saiuEm = 0;
  // ler também é estudar: qualquer sinal de presença (mouse passando, seleção, rolagem) mantém a sessão ativa
  const EVS = ['pointerdown', 'pointermove', 'mousemove', 'keydown', 'scroll', 'wheel', 'touchstart', 'touchmove', 'selectionchange', 'focus'];
  const mexeu = () => { ultMexida = Date.now(); };
  EVS.forEach(ev => addEventListener(ev, mexeu, { passive: true, capture: true }));
  D.addEventListener('selectionchange', mexeu);
  // aulas em iframe (Patologia): mexida dentro da aula também conta
  const ligaIframes = () => D.querySelectorAll('iframe').forEach(f => { try { const d = f.contentDocument; if (d && !d.__vgc) { d.__vgc = 1; EVS.forEach(ev => d.addEventListener(ev, mexeu, { passive: true, capture: true })); } } catch (e) {} });
  D.addEventListener('load', e => { if (e.target && e.target.tagName === 'IFRAME') ligaIframes(); }, true);

  function fecha(d, a) { // encerra a sessão a; só guarda se teve tempo ativo suficiente
    if (a && a.ativo >= MIN_SESS) d.sess.push(Object.assign({}, a, { fim: a.ult, pend: true }));
    d.atual = null;
  }
  function tick() {
    const d = ler(), agora = Date.now();
    let a = d.atual;
    if (a && agora - a.ult > PAUSA) { fecha(d, a); a = null; }
    const ativo = !D.hidden && agora - ultMexida < INATIVO;
    if (!a && ativo) a = d.atual = { id: agora.toString(36), ini: agora, ult: agora, ativo: 0, fora: 0, saidas: 0, segs: 0, ks: [K] };
    if (a) {
      if (ativo) { a.ativo += TICK; a.ult = agora; }
      if (!a.ks.includes(K)) a.ks.push(K);
    }
    grava(d);
    if (!aberto) checkin();
  }
  D.addEventListener('visibilitychange', () => {
    const d = ler(), a = d.atual; if (!a) return;
    if (D.hidden) saiuEm = Date.now();
    else if (saiuEm) { const fora = (Date.now() - saiuEm) / 1e3; saiuEm = 0;
      if (fora > 5 && fora < PAUSA / 1e3) { a.saidas++; a.fora += Math.round(fora); grava(d); } }
  });
  // concluir segmento (os mesmos botões que o foco.js observa)
  D.addEventListener('click', e => { if (e.target.closest('[data-read],.done-t,.cel-finish,[data-sbread],.vga-concluir')) { const d = ler(); if (d.atual) { d.atual.segs++; grava(d); } } }, true);

  /* ---------- estilo ---------- */
  const st = D.createElement('style');
  st.textContent = `
.vgc-bt{display:block;width:calc(100% - 16px);margin:6px 8px 2px;padding:7px 10px;border-radius:11px;border:1px solid var(--vg-edge,rgba(127,127,127,.25));background:var(--vg-glass,rgba(127,127,127,.08));color:inherit;font:600 13px/1.2 var(--vg-text,system-ui,sans-serif);cursor:pointer;text-align:left}
.vgc-bt:hover{border-color:var(--vg-acc)}
.vgc-fundo{position:fixed;inset:0;z-index:2147483000;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;padding:16px}
.vgc-box{width:min(760px,100%);max-height:calc(100vh - 32px);overflow:auto;border-radius:20px;border:1px solid var(--vg-edge,rgba(127,127,127,.3));background:var(--vg-ground,#121413);color:var(--vg-ink,inherit);font:400 14px/1.45 var(--vg-text,system-ui,sans-serif);box-shadow:0 20px 60px rgba(0,0,0,.4);padding:18px 20px 20px}
.vgc-box h2{margin:0;font:400 26px/1.1 var(--vg-display,serif)}
.vgc-box h3{margin:18px 0 6px;font-size:15px}
.vgc-top{display:flex;justify-content:space-between;align-items:flex-start;gap:10px}
.vgc-x{border:0;background:none;color:inherit;font-size:20px;cursor:pointer;opacity:.7}
.vgc-sub{color:var(--vg-muted,#888);font-size:12.5px;margin:4px 0 0}
.vgc-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:14px}
.vgc-kpi{border:1px solid var(--vg-edge,rgba(127,127,127,.25));border-radius:14px;padding:9px 11px;background:var(--vg-glass,transparent)}
.vgc-kpi b{display:block;font-size:22px;line-height:1.1}
.vgc-kpi span{font-size:12px;color:var(--vg-muted,#888)}
.vgc-frases{margin:12px 0 0;padding:0;list-style:none}
.vgc-frases li{margin:6px 0;padding:8px 11px;border-radius:12px;border:1px solid color-mix(in srgb,var(--vg-acc) 35%,transparent);background:color-mix(in srgb,var(--vg-acc) 8%,transparent)}
.vgc-row{display:grid;grid-template-columns:110px 1fr 74px;gap:8px;align-items:center;margin:5px 0;font-size:13px}
.vgc-bar{height:12px;border-radius:7px;background:color-mix(in srgb,var(--vg-ink,#888) 12%,transparent);overflow:hidden;position:relative}
.vgc-bar i{position:absolute;inset:0 auto 0 0;border-radius:7px;background:var(--vg-acc)}
.vgc-bar.dif i{left:50%}
.vgc-bar.dif i.neg{left:auto;right:50%;background:#e5534b}
.vgc-bar.dif i.pos{background:#3fb950}
.vgc-bar.dif:after{content:'';position:absolute;left:50%;top:-2px;bottom:-2px;width:1px;background:var(--vg-muted,#888)}
.vgc-row small{color:var(--vg-muted,#888);text-align:right}
.vgc-falta{color:var(--vg-muted,#888);font-size:12.5px}
.vgc-chips{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0}
.vgc-chip{border:1px solid var(--vg-edge,rgba(127,127,127,.3));background:transparent;color:inherit;border-radius:20px;padding:5px 11px;font:500 13px var(--vg-text,system-ui,sans-serif);cursor:pointer}
.vgc-chip[aria-pressed="true"]{background:var(--vg-acc);color:var(--vg-on-acc,#000);border-color:var(--vg-acc)}
.vgc-nota{display:flex;gap:6px;margin:6px 0}
.vgc-nota button{flex:1;padding:9px 0;font-size:18px}
.vgc-acoes{display:flex;flex-wrap:wrap;gap:8px;margin-top:16px}
.vgc-acoes button{border-radius:12px;padding:8px 13px;border:1px solid var(--vg-edge,rgba(127,127,127,.3));background:var(--vg-glass,transparent);color:inherit;font:600 13px var(--vg-text,system-ui,sans-serif);cursor:pointer}
.vgc-acoes .pri{background:var(--vg-acc);color:var(--vg-on-acc,#000);border-color:var(--vg-acc)}
.vgc-lista{width:100%;border-collapse:collapse;font-size:12.5px}
.vgc-lista td{padding:4px 6px;border-top:1px solid var(--vg-edge,rgba(127,127,127,.2))}
.vgc-demo{display:inline-block;margin-left:8px;font-size:11px;font-weight:700;padding:2px 8px;border-radius:10px;background:#e5534b;color:#fff;vertical-align:middle}
.vgc-card{position:fixed;right:16px;bottom:16px;z-index:2147482000;width:min(380px,calc(100vw - 32px));border-radius:18px;border:1px solid var(--vg-edge,rgba(127,127,127,.3));background:var(--vg-ground,#121413);color:var(--vg-ink,inherit);font:400 14px/1.4 var(--vg-text,system-ui,sans-serif);padding:14px 16px;box-shadow:0 14px 40px rgba(0,0,0,.35)}
.vgc-card b.t{display:block;font-size:15px;margin-bottom:2px}
@media (max-width:600px){.vgc-kpis{grid-template-columns:repeat(2,1fr)}.vgc-row{grid-template-columns:84px 1fr 62px}.vgc-box{padding:14px}.vgc-card{right:8px;left:8px;bottom:8px;width:auto}}
`;
  D.head.appendChild(st);

  /* ---------- check-in (fim da sessão) ---------- */
  let aberto = false;
  function formCheckin(s, aoSalvar) {
    const el = D.createElement('div');
    const fat = new Set(s.fat || []); let nota = s.nota || 0, loc = s.local || '';
    const pinta = () => {
      el.innerHTML = `<div class="vgc-nota">${[1, 2, 3, 4, 5].map(n => `<button type="button" class="vgc-chip" data-n="${n}" aria-pressed="${n === nota}">${['😵', '😕', '😐', '🙂', '🔥'][n - 1]}</button>`).join('')}</div>
<div class="vgc-sub">Concentração: 😵 péssima · 🔥 excelente</div>
<div class="vgc-chips">${FAT.map(([k, r]) => `<button type="button" class="vgc-chip" data-f="${k}" aria-pressed="${fat.has(k)}">${r}</button>`).join('')}</div>
<div class="vgc-chips">${LOC.map(([k, r]) => `<button type="button" class="vgc-chip" data-l="${k}" aria-pressed="${loc === k}">${r}</button>`).join('')}</div>
<div class="vgc-acoes"><button type="button" class="pri" data-ok ${nota ? '' : 'disabled style="opacity:.5"'}>Salvar</button><button type="button" data-pula>Pular</button></div>`;
    };
    el.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.n) nota = +b.dataset.n;
      if (b.dataset.f) fat.has(b.dataset.f) ? fat.delete(b.dataset.f) : fat.add(b.dataset.f);
      if (b.dataset.l) loc = loc === b.dataset.l ? '' : b.dataset.l;
      if (b.hasAttribute('data-ok') && nota) return aoSalvar({ nota, fat: [...fat], local: loc });
      if (b.hasAttribute('data-pula')) return aoSalvar(null);
      pinta();
    });
    pinta(); return el;
  }
  function checkin() {
    if (D.querySelector('.vgc-card')) return;
    const d = ler(), s = d.sess.find(x => x.pend); if (!s) return;
    const card = D.createElement('div'); card.className = 'vgc-card'; card.setAttribute('data-liquido', '');
    card.innerHTML = `<b class="t">Como foi o estudo de ${dia(s.ini)}, ${hm(s.ini)}–${hm(s.fim)}?</b><div class="vgc-sub">${dur(s.ativo)} ativo · saiu da aba ${s.saidas}× · leva 10 segundos</div>`;
    card.appendChild(formCheckin(s, r => {
      const d2 = ler(), x = d2.sess.find(y => y.id === s.id);
      if (x) { delete x.pend; if (r) Object.assign(x, r); else x.pulou = true; grava(d2); }
      card.remove();
    }));
    D.body.appendChild(card);
  }

  /* ---------- análise (só conta) ---------- */
  const foco = s => s.ativo / Math.max(1, s.ativo + s.fora); // fração do tempo em que estava na aba
  const media = a => a.length ? a.reduce((t, x) => t + x, 0) / a.length : null;
  function analisa(sess) {
    const com = sess.filter(s => s.nota);
    const tot = sess.reduce((t, s) => t + s.ativo, 0);
    const faixas = FAIXAS.map(([n, a, b]) => { const ss = com.filter(s => { const h = new Date(s.ini).getHours(); return h >= a && h < b; });
      return { n, q: ss.length, nota: media(ss.map(s => s.nota)), foco: media(ss.map(foco)), saidasH: media(ss.map(s => s.saidas / (s.ativo / 3600))) }; });
    const fat = FAT.map(([k, r]) => { const c = com.filter(s => (s.fat || []).includes(k)), sem = com.filter(s => !(s.fat || []).includes(k));
      const ok = c.length >= MIN && sem.length >= MIN;
      return { k, r, qc: c.length, qs: sem.length, ok, dif: ok ? media(c.map(s => s.nota)) - media(sem.map(s => s.nota)) : 0,
        difSaidas: ok ? media(c.map(s => s.saidas / (s.ativo / 3600))) - media(sem.map(s => s.saidas / (s.ativo / 3600))) : 0 }; });
    const loc = LOC.map(([k, r]) => { const ss = com.filter(s => s.local === k); return { r, q: ss.length, nota: media(ss.map(s => s.nota)) }; }).filter(x => x.q >= MIN);
    // frases prontas, preenchidas com os números
    const fr = [];
    const fx = faixas.filter(f => f.q >= MIN).sort((a, b) => b.nota - a.nota);
    if (fx.length >= 2) fr.push(`Você rende mais de <b>${fx[0].n.toLowerCase()}</b>: nota média ${fx[0].nota.toFixed(1).replace(".", ",")} contra ${fx[fx.length - 1].nota.toFixed(1).replace(".", ",")} de ${fx[fx.length - 1].n.toLowerCase()}.`);
    const fo = fat.filter(f => f.ok).sort((a, b) => a.dif - b.dif);
    if (fo.length && fo[0].dif <= -0.4) fr.push(`O que mais atrapalha: <b>${fo[0].r}</b> (nota ${Math.abs(fo[0].dif).toFixed(1).replace(".", ",")} ponto${Math.abs(fo[0].dif) >= 1.5 ? 's' : ''} menor quando aparece).`);
    const bo = fo[fo.length - 1];
    if (bo && bo.dif >= 0.4) fr.push(`O que mais ajuda: <b>${bo.r}</b> (nota ${bo.dif.toFixed(1).replace(".", ",")} maior).`);
    const sa = fat.filter(f => f.ok).sort((a, b) => b.difSaidas - a.difSaidas)[0];
    if (sa && sa.difSaidas >= 1) fr.push(`Com <b>${sa.r}</b> você sai da aba ${sa.difSaidas.toFixed(1).replace(".", ",")} vezes a mais por hora.`);
    if (loc.length >= 2) { const l = loc.sort((a, b) => b.nota - a.nota); fr.push(`Melhor lugar até agora: <b>${l[0].r}</b> (nota ${l[0].nota.toFixed(1).replace(".", ",")}).`); }
    return { com, tot, faixas, fat, fr };
  }

  /* ---------- dados de exemplo (só para ver o painel cheio; não são gravados) ---------- */
  function exemplo() {
    let seed = 7; const r = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
    const out = [], hoje = Date.now();
    for (let i = 0; i < 34; i++) {
      const h = [7, 9, 10, 14, 15, 16, 20, 21, 22, 23][Math.floor(r() * 10)], t = new Date(hoje - (i * 0.9 + 1) * 864e5); t.setHours(h, Math.floor(r() * 60));
      const fat = FAT.map(f => f[0]).filter(() => r() < 0.35), celPerto = !fat.includes('cel');
      let n = 3 + (h < 12 ? 1 : 0) - (h >= 22 ? 1 : 0) + (fat.includes('sono') ? 1 : 0) - (celPerto ? 1 : 0) - (fat.includes('ans') ? 1 : 0) + (r() < .5 ? 0 : (r() < .5 ? 1 : -1));
      n = Math.max(1, Math.min(5, n));
      const ativo = (30 + Math.floor(r() * 90)) * 60, saidas = Math.round((celPerto ? 5 : 1.5) * ativo / 3600 + r() * 2);
      out.push({ id: 'ex' + i, ini: +t, fim: +t + ativo * 1150, ativo, fora: saidas * 70, saidas, segs: Math.floor(ativo / 900), ks: [Object.keys(NOME)[Math.floor(r() * 8)]], nota: n, fat, local: LOC[Math.floor(r() * 3)][0] });
    }
    return out;
  }

  /* ---------- painel ---------- */
  let demo = false;
  function abrir() {
    aberto = true; D.querySelector('.vgc-card')?.remove();
    const f = D.createElement('div'); f.className = 'vgc-fundo';
    const box = D.createElement('div'); box.className = 'vgc-box'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', 'Meu rendimento'); box.setAttribute('data-liquido', '');
    f.appendChild(box); D.body.appendChild(f);
    const fechar = () => { f.remove(); aberto = false; };
    f.addEventListener('click', e => { if (e.target === f) fechar(); });
    D.addEventListener('keydown', function k(e) { if (e.key === 'Escape') { fechar(); D.removeEventListener('keydown', k); } });
    const pinta = () => {
      const d = ler(), corte = Date.now() - 30 * 864e5;
      const sess = (demo ? exemplo() : d.sess).filter(s => s.ini >= corte);
      const A = analisa(sess), a = d.atual;
      const kp = (v, t) => `<div class="vgc-kpi"><b>${v}</b><span>${t}</span></div>`;
      const barF = (v, maxV, txt) => `<div class="vgc-bar"><i style="width:${v == null ? 0 : Math.max(3, 100 * v / maxV)}%"></i></div><small>${txt}</small>`;
      const maxDif = Math.max(1, ...A.fat.filter(x => x.ok).map(x => Math.abs(x.dif)));
      box.innerHTML = `<div class="vgc-top"><div><h2>📊 Meu rendimento${demo ? '<span class="vgc-demo">DADOS DE EXEMPLO</span>' : ''}</h2>
<p class="vgc-sub">Últimos 30 dias, todas as matérias. ${a ? `Sessão em andamento desde ${hm(a.ini)} (${dur(a.ativo)} ativo).` : 'Nenhuma sessão em andamento.'}</p></div><button type="button" class="vgc-x" aria-label="Fechar">✕</button></div>
<div class="vgc-kpis">${kp(dur(A.tot), 'estudados')}${kp(sess.length, 'sessões')}${kp(sess.length ? Math.round(100 * media(sess.map(foco))) + '%' : '–', 'do tempo na aba')}${kp(A.com.length ? media(A.com.map(s => s.nota)).toFixed(1).replace(".", ",") : '–', 'nota média (1 a 5)')}</div>
${A.fr.length ? `<ul class="vgc-frases">${A.fr.map(x => `<li>${x}</li>`).join('')}</ul>` : `<p class="vgc-falta" style="margin-top:12px">Ainda não dá para tirar conclusões: cada comparação precisa de pelo menos ${MIN} sessões avaliadas de cada lado. Continue estudando e respondendo o "Como foi?" no fim de cada sessão.</p>`}
<h3>Quando você rende mais</h3>
${A.faixas.map(x => `<div class="vgc-row"><span>${x.n}</span>${barF(x.q ? x.nota : null, 5, x.q ? `${x.nota.toFixed(1).replace(".", ",")} · ${x.q} sess.` : 'sem dados')}</div>`).join('')}
<h3>O que ajuda e o que atrapalha <span class="vgc-sub" style="font-weight:400">(nota com o fator − sem ele)</span></h3>
${A.fat.map(x => x.ok
  ? `<div class="vgc-row"><span>${x.r}</span><div class="vgc-bar dif"><i class="${x.dif < 0 ? 'neg' : 'pos'}" style="width:${50 * Math.abs(x.dif) / maxDif}%"></i></div><small>${x.dif > 0 ? '+' : ''}${x.dif.toFixed(1).replace(".", ",")}</small></div>`
  : `<div class="vgc-row"><span>${x.r}</span><span class="vgc-falta">faltam sessões (${x.qc} com · ${x.qs} sem)</span><small></small></div>`).join('')}
<h3>Últimas sessões</h3>
<table class="vgc-lista">${sess.slice().sort((p, q) => q.ini - p.ini).slice(0, 8).map(s => `<tr><td>${dia(s.ini)} ${hm(s.ini)}</td><td>${dur(s.ativo)}</td><td>${(s.ks || []).map(k => NOME[k] || k).join(', ')}</td><td>${s.nota ? ['😵', '😕', '😐', '🙂', '🔥'][s.nota - 1] : (s.pend ? 'a avaliar' : '–')}</td><td>${s.saidas} saídas</td></tr>`).join('') || '<tr><td class="vgc-falta">Nenhuma sessão ainda (conta a partir de 5 min de estudo ativo).</td></tr>'}</table>
<p class="vgc-sub" style="margin-top:12px">Mostra associação, não causa: quem estuda de manhã pode ser também quem dormiu melhor. Os dados ficam só neste navegador.</p>
<div class="vgc-acoes">${a && !demo ? '<button type="button" class="pri" data-enc>⏹ Encerrar sessão agora</button>' : ''}<button type="button" data-demo>${demo ? 'Voltar aos meus dados' : 'Ver com dados de exemplo'}</button>${demo ? '' : '<button type="button" data-apaga>Apagar meus dados</button>'}</div>`;
    };
    box.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.classList.contains('vgc-x')) return fechar();
      if (b.hasAttribute('data-demo')) { demo = !demo; pinta(); }
      if (b.hasAttribute('data-apaga') && confirm('Apagar todas as sessões guardadas neste navegador? Não dá para desfazer.')) { grava({ v: 1, sess: [], atual: null }); pinta(); }
      if (b.hasAttribute('data-enc')) {
        const d = ler(), at = d.atual; if (!at) return;
        if (at.ativo < MIN_SESS) { d.atual = null; grava(d); return pinta(); }
        fecha(d, at); grava(d);
        const s = d.sess[d.sess.length - 1];
        box.innerHTML = `<div class="vgc-top"><h2>Como foi esta sessão?</h2><button type="button" class="vgc-x" aria-label="Fechar">✕</button></div><p class="vgc-sub">${hm(s.ini)}–${hm(s.fim)} · ${dur(s.ativo)} ativo · saiu da aba ${s.saidas}×</p>`;
        box.appendChild(formCheckin(s, r => { const d2 = ler(), x = d2.sess.find(y => y.id === s.id); if (x) { delete x.pend; if (r) Object.assign(x, r); else x.pulou = true; grava(d2); } pinta(); }));
      }
    });
    pinta();
  }

  /* ---------- botão no painel do Foco de estudo ---------- */
  function poeBotao() {
    D.querySelectorAll('.vgf-panel').forEach(p => {
      if (p.querySelector('.vgc-bt')) return;
      const b = D.createElement('button'); b.type = 'button'; b.className = 'vgc-bt'; b.textContent = '📊 Meu rendimento';
      b.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); abrir(); });
      const alvo = p.querySelector('.vgf-b') || p; alvo.appendChild(b);
    });
  }
  new MutationObserver(() => poeBotao()).observe(D.documentElement, { childList: true, subtree: true });

  window.VGConc = { abrir };
  const inicia = () => { ligaIframes(); poeBotao(); tick(); setInterval(tick, TICK * 1e3); };
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', inicia); else inicia();
})();
