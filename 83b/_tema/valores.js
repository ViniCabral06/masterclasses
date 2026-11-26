/* 🧪 Gaveta flutuante de Valores de Referência (estilo UWorld/USMLE).
   Acessível de qualquer matéria e durante simulados (botão "🧪 Valores" na barra do simulado,
   no painel do Foco de estudo, em Ajustes do Modo Foco, ou atalho Alt+V). */
(function () {
  'use strict';
  const D = document, html = D.documentElement, K = html.dataset.vidro || '';
  if (window.VGValores || !K || K === 'th4' || K === 'dic' || html.classList.contains('vidro-aula') || window.__vgIndex) return;

  const CATS = [
    {
      id: 'hemo', t: '🩸 Hemograma e Coag.', itens: [
        ['Hemoglobina (Hb)', 'H: 13,5–17,5 · M: 12,0–16,0 g/dL', 'anemia policitemia'],
        ['Hematócrito (Ht)', 'H: 40–52% · M: 36–46%', 'anemia hemoconcentracao dengue'],
        ['VCM (Vol. Corp. Médio)', '80–100 fL', 'microcitica normocitica macrocitica anemia'],
        ['HCM / CHCM', 'HCM: 27–33 pg · CHCM: 32–36 g/dL', 'hipocromica'],
        ['RDW (anisocitose)', '11,5–14,5%', 'ferropriva talassemia'],
        ['Reticulócitos', '0,5–2,0% (25.000–75.000/mm³)', 'hiperproliferativa hipoproliferativa hemolise'],
        ['Leucócitos totais', '4.000–10.000 /mm³', 'leucocitose leucopenia infeccao'],
        ['Neutrófilos (segmentados / bastões)', '45–70% (1.800–7.000) · Bastões ≤ 5%', 'desvio esquerda bacteriana'],
        ['Linfócitos', '20–40% (1.000–4.000 /mm³)', 'linfocitose linfopenia viral'],
        ['Eosinófilos / Monócitos', 'Eos: 1–5% (< 500) · Mono: 2–10%', 'alergia parasita'],
        ['Plaquetas', '150.000–450.000 /mm³', 'plaquetopenia trombocitopenia dengue'],
        ['TP / RNI (INR)', 'TP: 11–14 s · INR: 0,8–1,2 (varfarina: 2,0–3,0)', 'coagulacao extrinseca warfarina'],
        ['TTPa', '25–35 s (relação 0,8–1,2)', 'coagulacao intrinseca heparina hnf'],
        ['Fibrinogênio / D-dímero', 'Fib: 200–400 mg/dL · D-dímero: < 500 ng/mL', 'civd tep tvp trombose'],
      ]
    },
    {
      id: 'renal', t: '⚗️ Eletrólitos e Rim', itens: [
        ['Sódio (Na⁺)', '135–145 mEq/L', 'hiponatremia hipernatremia siadh'],
        ['Potássio (K⁺)', '3,5–5,0 mEq/L', 'hipocalemia hipercalemia ecg diuretico'],
        ['Cloreto (Cl⁻)', '98–107 mEq/L', 'acidose hipercloremica'],
        ['Cálcio total / ionizado', 'Total: 8,5–10,5 mg/dL · Ionizado: 4,5–5,3 mg/dL', 'hipercalcemia hipocalcemia pth'],
        ['Magnésio (Mg²⁺)', '1,7–2,4 mg/dL', 'hipomagnesemia arritmia torsades'],
        ['Fósforo (P)', '2,5–4,5 mg/dL', 'hiperfosfatemia drc'],
        ['Ureia', '15–45 mg/dL', 'azotemia pre-renal hemorragia digestiva'],
        ['Creatinina', 'H: 0,7–1,3 · M: 0,6–1,1 mg/dL', 'lra ira drc funcao renal'],
        ['TFG estimada (CKD-EPI)', '≥ 90 mL/min/1,73 m² (DRC < 60 por ≥ 3 meses)', 'filtracao glomerular'],
        ['Ácido úrico', 'H: 3,5–7,2 · M: 2,6–6,0 mg/dL', 'gota hiperuricemia tiazidico'],
        ['Osmolaridade sérica', '275–295 mOsm/kg', '2xNa + Glic/18 + Ureia/6'],
      ]
    },
    {
      id: 'gaso', t: '🫁 Gasometria', itens: [
        ['pH arterial', '7,35–7,45', 'acidose alcalose acidemia alcalemia'],
        ['PaCO₂', '35–45 mmHg', 'respiratoria hipercapnia hipocapnia dpoc'],
        ['HCO₃⁻ (Bicarbonato)', '22–26 mEq/L', 'metabolica cetoacidose'],
        ['PaO₂ / SatO₂', 'PaO₂: 80–100 mmHg · SatO₂: 95–100%', 'hipoxemia insuficiencia respiratoria'],
        ['Base Excess (BE)', '−2 a +2 mEq/L', 'excesso base'],
        ['Ânion-gap (AG)', '8–12 mEq/L (Na − Cl − HCO₃)', 'cetoacidose lactato uremia intoxicacao'],
        ['Lactato arterial', '< 2,0 mmol/L (< 18 mg/dL)', 'sepse choque hipoperfusao'],
      ]
    },
    {
      id: 'hep', t: '🟡 Hepática e Inflam.', itens: [
        ['TGO (AST) / TGP (ALT)', 'Até ~35–40 U/L (TGP mais específica do fígado)', 'transaminases hepatite lesao hepatocelular'],
        ['Fosfatase alcalina (FA)', '40–130 U/L', 'colestase via biliar osso'],
        ['GGT (Gama-GT)', 'H: < 60 · M: < 40 U/L', 'colestase alcool hepatobiliar'],
        ['Bilirrubinas', 'Total: ≤ 1,2 · Direta: ≤ 0,3 · Indireta: ≤ 0,9 mg/dL', 'ictericia hemolise gilbert colestase'],
        ['Albumina', '3,5–5,0 g/dL', 'cirrose sindrome nefrotica desnutricao'],
        ['Amilase / Lipase', 'Amilase: < 100–120 · Lipase: < 60 U/L (pancreatite ≥ 3× LSN)', 'pancreatite aguda'],
        ['PCR (Prot. C Reativa)', '< 5 mg/L (< 0,5 mg/dL)', 'inflamacao infeccao marcador'],
        ['VHS', 'H: < 15 · M: < 20 mm/h', 'velocidade hemossedimentacao inflamacao'],
        ['Ferritina / Sat. transferrina', 'Ferritina: 30–300 ng/mL · Sat: 20–45%', 'ferro anemia ferropriva inflamacao'],
      ]
    },
    {
      id: 'cardio', t: '🫀 Cardio, Lípides e DM', itens: [
        ['Glicemia de jejum', 'Normal: < 100 · Pré-DM: 100–125 · DM: ≥ 126 mg/dL', 'diabetes hiperglicemia'],
        ['HbA1c (Hemogl. glicada)', 'Normal: < 5,7% · Pré-DM: 5,7–6,4% · DM: ≥ 6,5%', 'diabetes controle glicemico'],
        ['TOTG 75g (2h)', 'Normal: < 140 · Pré-DM: 140–199 · DM: ≥ 200 mg/dL', 'diabetes tolerancia glicose'],
        ['Colesterol total', '< 190 mg/dL', 'dislipidemia'],
        ['LDL-c (metas)', 'Baixo risco < 130 · Interm. < 100 · Alto < 70 · Muito alto < 50', 'estatina aterosclerose dislipidemia'],
        ['HDL-c / Triglicerídeos', 'HDL: > 40 mg/dL · TG: < 150 mg/dL (jejum)', 'sindrome metabolica pancreatite'],
        ['Troponina (us) / CK-MB', 'Troponina < p99 (curva ↑/↓ = IAM) · CK-MB < 5 ng/mL', 'infarto sca necrose miocardica'],
        ['BNP / NT-proBNP', 'BNP < 100 pg/mL · NT-proBNP < 300 pg/mL (afasta IC aguda)', 'insuficiencia cardiaca dispneia'],
      ]
    },
    {
      id: 'outros', t: '🦋 Tireoide e Líquidos', itens: [
        ['TSH / T4 livre', 'TSH: 0,4–4,5 mUI/L · T4L: 0,8–1,8 ng/dL', 'hipotireoidismo hipertireoidismo'],
        ['Líquor (LCR) normal', 'Células ≤ 4 (linf.) · Prot. 15–45 mg/dL · Glic. ≥ 2/3 da sérica', 'meningite bacteriana viral fungica'],
        ['Critérios de Light (exsudato)', 'Prot pl/s > 0,5 · LDH pl/s > 0,6 · LDH pl > 2/3 LSN sérico (≥ 1 = exsudato)', 'derrame pleural transudato'],
        ['GASA (ascite)', '≥ 1,1 g/dL = hipertensão portal (cirrose, IC) · < 1,1 = peritoneal', 'albumina ascite cirrose'],
        ['Urina I (EAS) normal', 'pH 5–7 · Dens. 1005–1030 · Hemácias < 3 · Leuc. < 5/campo · Nitrito neg.', 'itu pielonefrite glomerulonefrite'],
      ]
    }
  ];

  const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  const CSS = `
.vgv-bg{position:fixed;inset:0;z-index:2147482700;background:rgba(4,6,10,.45);display:flex;justify-content:flex-end}
.vgv-gav{width:min(460px,100vw);height:100%;display:flex;flex-direction:column;background:var(--vg-ground,#121413);color:var(--vg-ink,inherit);
  border-left:1px solid var(--vg-edge,rgba(127,127,127,.28));box-shadow:-16px 0 48px rgba(0,0,0,.45);font:400 14px/1.45 var(--vg-text,system-ui,sans-serif);
  animation:vgv-in .22s cubic-bezier(.2,.8,.2,1)}
@keyframes vgv-in{from{transform:translateX(28px);opacity:0}}
@media (prefers-reduced-motion:reduce){.vgv-gav{animation:none}}
.vgv-hd{padding:16px 18px 12px;border-bottom:1px solid var(--vg-edge,rgba(127,127,127,.2));display:flex;align-items:center;gap:10px}
.vgv-hd h2{margin:0;font:400 24px/1.1 var(--vg-display,serif);flex:1}
.vgv-x{width:34px;height:34px;border-radius:50%;border:1px solid var(--vg-edge,rgba(127,127,127,.3));background:transparent;color:inherit;font-size:17px;cursor:pointer}
.vgv-busca{padding:10px 18px 8px}
.vgv-busca input{width:100%;box-sizing:border-box;height:40px;padding:0 14px;border-radius:12px;border:1px solid var(--vg-edge,rgba(127,127,127,.3));background:var(--vg-glass,rgba(127,127,127,.08));color:inherit;font:inherit;font-size:15px}
.vgv-busca input:focus{outline:2px solid var(--vg-acc,#5aa9ff);outline-offset:-1px}
.vgv-tabs{display:flex;gap:6px;overflow-x:auto;padding:0 18px 10px;scrollbar-width:none}
.vgv-tabs::-webkit-scrollbar{display:none}
.vgv-tabs button{flex:none;border:1px solid var(--vg-edge,rgba(127,127,127,.28));background:transparent;color:inherit;border-radius:999px;padding:6px 11px;font:600 12.5px/1.1 inherit;cursor:pointer;white-space:nowrap}
.vgv-tabs button[aria-pressed="true"]{background:var(--vg-acc,#5aa9ff);border-color:var(--vg-acc,#5aa9ff);color:var(--vg-on-acc,#04162b)}
.vgv-list{flex:1;overflow:auto;padding:4px 18px 24px}
.vgv-cat{font-size:11.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--vg-muted,#888);margin:14px 0 6px}
.vgv-it{padding:9px 11px;border-radius:12px;border:1px solid var(--vg-edge,rgba(127,127,127,.2));background:var(--vg-glass,transparent);margin:0 0 7px}
.vgv-it b{display:block;font-size:14px;margin-bottom:2px}
.vgv-it span{display:block;font-size:13.5px;color:var(--vg-ink2,inherit);opacity:.92}
.vgv-nota{padding:10px 18px;border-top:1px solid var(--vg-edge,rgba(127,127,127,.2));font-size:11.5px;color:var(--vg-muted,#888)}
.vgv-foco-bt{display:block;width:calc(100% - 16px);margin:4px 8px 2px;padding:7px 10px;border-radius:11px;border:1px solid var(--vg-edge,rgba(127,127,127,.25));background:var(--vg-glass,rgba(127,127,127,.08));color:inherit;font:600 13px/1.2 var(--vg-text,system-ui,sans-serif);cursor:pointer;text-align:left}
.vgv-foco-bt:hover{border-color:var(--vg-acc)}
`;

  function estilo() {
    if (D.getElementById('vgv-css')) return;
    const s = D.createElement('style'); s.id = 'vgv-css'; s.textContent = CSS; D.head.appendChild(s);
  }

  let catAtiva = 'todos', bg = null;
  function abrir(termo) {
    if (bg) { const i = bg.querySelector('input'); if (i) i.focus(); return; }
    estilo();
    bg = D.createElement('div'); bg.className = 'vgv-bg';
    const gav = D.createElement('div'); gav.className = 'vgv-gav'; gav.setAttribute('role', 'dialog'); gav.setAttribute('aria-modal', 'true'); gav.setAttribute('aria-label', 'Valores de referência');
    gav.innerHTML = `<div class="vgv-hd"><h2>🧪 Valores de referência</h2><button type="button" class="vgv-x" aria-label="Fechar">✕</button></div>
      <div class="vgv-busca"><input type="search" placeholder="Buscar exame (ex.: potássio, VCM, pH, TGO, Light…)" autocomplete="off"></div>
      <div class="vgv-tabs"></div><div class="vgv-list"></div>
      <div class="vgv-nota">Referências didáticas de adulto para estudo e simulados (variam levemente conforme laboratório). Atalho: Alt+V.</div>`;
    bg.appendChild(gav); D.body.appendChild(bg);
    const inp = gav.querySelector('input'), tabs = gav.querySelector('.vgv-tabs'), list = gav.querySelector('.vgv-list');
    if (termo) inp.value = termo;

    function pintaTabs() {
      tabs.innerHTML = `<button type="button" data-c="todos" aria-pressed="${catAtiva === 'todos'}">Todos</button>` +
        CATS.map(c => `<button type="button" data-c="${c.id}" aria-pressed="${catAtiva === c.id}">${c.t}</button>`).join('');
    }
    function pintaLista() {
      const q = norm(inp.value.trim());
      let h = '';
      CATS.forEach(c => {
        if (!q && catAtiva !== 'todos' && catAtiva !== c.id) return;
        const ms = c.itens.filter(it => !q || norm(it[0] + ' ' + it[1] + ' ' + it[2]).includes(q));
        if (!ms.length) return;
        h += `<div class="vgv-cat">${c.t}</div>` + ms.map(it => `<div class="vgv-it"><b>${esc(it[0])}</b><span>${esc(it[1])}</span></div>`).join('');
      });
      list.innerHTML = h || '<p style="opacity:.65;padding:12px 0">Nenhum exame encontrado para essa busca.</p>';
    }
    pintaTabs(); pintaLista();
    inp.addEventListener('input', pintaLista);
    tabs.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; catAtiva = b.dataset.c; inp.value = ''; pintaTabs(); pintaLista(); });
    const fechar = () => { if (!bg) return; bg.remove(); bg = null; D.removeEventListener('keydown', onK); };
    const onK = e => { if (e.key === 'Escape') fechar(); };
    D.addEventListener('keydown', onK);
    bg.addEventListener('click', e => { if (e.target === bg || e.target.closest('.vgv-x')) fechar(); });
    setTimeout(() => inp.focus(), 20);
  }

  D.addEventListener('keydown', e => {
    if (e.altKey && !e.ctrlKey && !e.metaKey && e.key.toLowerCase() === 'v') {
      e.preventDefault(); if (bg) { bg.remove(); bg = null; } else abrir();
    }
  });

  function poeBotao() {
    D.querySelectorAll('.vgf-panel').forEach(p => {
      if (p.querySelector('.vgv-foco-bt')) return;
      estilo();
      const b = D.createElement('button'); b.type = 'button'; b.className = 'vgv-foco-bt'; b.textContent = '🧪 Valores de referência';
      b.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); abrir(); });
      (p.querySelector('.vgf-b') || p).appendChild(b);
    });
  }
  new MutationObserver(poeBotao).observe(D.documentElement, { childList: true, subtree: true });
  window.VGValores = { abrir };
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', poeBotao); else poeBotao();
})();
