/* Siglas com explicação ao passar o mouse (ou tocar, no celular).
   Marca só a sigla que não tem explicação ao lado: pula "TEP (tromboembolismo...)", "tromboembolismo pulmonar (TEP)"
   e o parágrafo que já escreve o nome por extenso. O balão é de vidro, como o resto do tema.
   O publicar.py inclui este arquivo nas aulas separadas em aulas/ (Patologia). */
(function(){
  'use strict';
  if (window.__vgSiglas) return; window.__vgSiglas = 1;

  /* sigla: significado | [significado, contexto (regex no parágrafo), significado se o contexto não bater] */
  var SIG = {
    'RCU':'retocolite ulcerativa','RCUI':'retocolite ulcerativa idiopática','DII':'doença inflamatória intestinal',
    'VE':'ventrículo esquerdo','VD':'ventrículo direito','AE':'átrio esquerdo','AD':'átrio direito',
    'IC':'insuficiência cardíaca','ICC':'insuficiência cardíaca congestiva','IAM':'infarto agudo do miocárdio',
    'HAS':'hipertensão arterial sistêmica','PA':'pressão arterial','FC':'frequência cardíaca','FR':'frequência respiratória',
    'FE':'fração de ejeção','B3':'terceira bulha cardíaca','B4':'quarta bulha cardíaca','ECG':'eletrocardiograma',
    'ST':'segmento ST do eletrocardiograma','BRD':'bloqueio de ramo direito','BRE':'bloqueio de ramo esquerdo','BAV':'bloqueio atrioventricular',
    'DA':'artéria descendente anterior','AVC':'acidente vascular cerebral','AAA':'aneurisma de aorta abdominal',
    'SRAA':'sistema renina-angiotensina-aldosterona','RAA':'sistema renina-angiotensina-aldosterona',
    'IECA':'inibidor da enzima conversora de angiotensina','BRA':'bloqueador do receptor de angiotensina',
    'LDL':'lipoproteína de baixa densidade (“colesterol ruim”)','HDL':'lipoproteína de alta densidade (“colesterol bom”)',
    'CML':'células musculares lisas','MEC':'matriz extracelular','MMP':'metaloproteinases de matriz',
    'ICAM-1':'molécula de adesão intercelular 1','VCAM-1':'molécula de adesão celular vascular 1',
    'CK-MB':'creatinoquinase, fração MB (marcador de lesão do miocárdio)','CKMB':'creatinoquinase, fração MB (marcador de lesão do miocárdio)',
    'VHS':'velocidade de hemossedimentação','PCR':'proteína C reativa','ASLO':'antiestreptolisina O',
    'TEP':'tromboembolismo pulmonar','TVP':'trombose venosa profunda','TEV':'tromboembolismo venoso',
    'DPOC':'doença pulmonar obstrutiva crônica','SDRA':'síndrome do desconforto respiratório agudo','SARA':'síndrome da angústia respiratória aguda',
    'DAD':'dano alveolar difuso','DMH':'doença da membrana hialina','RDS':'síndrome do desconforto respiratório do recém-nascido',
    'BAC':'barreira alvéolo-capilar','VEF1':'volume expiratório forçado no 1º segundo','CVF':'capacidade vital forçada',
    'CPT':'capacidade pulmonar total','DLCO':'capacidade de difusão do monóxido de carbono','LBA':'lavado broncoalveolar',
    'HTD':'hemitórax direito','HTE':'hemitórax esquerdo','PAC':'pneumonia adquirida na comunidade','IVAS':'infecções das vias aéreas superiores',
    'TB':'tuberculose','TBC':'tuberculose','BK':'bacilo de Koch (Mycobacterium tuberculosis)','BAAR':'bacilo álcool-ácido resistente',
    'BCG':'bacilo de Calmette-Guérin (vacina contra a tuberculose)','SARS':'síndrome respiratória aguda grave',
    'TTF-1':'fator de transcrição da tireoide 1 (marcador de adenocarcinoma de pulmão)','EGFR':'receptor do fator de crescimento epidérmico',
    'ALK':'quinase do linfoma anaplásico (alvo de tratamento no adenocarcinoma de pulmão)','ROS1':'gene ROS1 (alvo de tratamento no adenocarcinoma de pulmão)',
    'PD-L1':'ligante de morte programada 1 (alvo da imunoterapia)','PDL-1':'ligante de morte programada 1 (alvo da imunoterapia)',
    'AE1':'clone de anticorpo contra citoqueratinas (AE1/AE3 = pancitoqueratina)','AE3':'clone de anticorpo contra citoqueratinas (AE1/AE3 = pancitoqueratina)',
    'IHQ':'imuno-histoquímica','TNM':'estadiamento por tumor, linfonodo e metástase','ACTH':'hormônio adrenocorticotrófico','PTH':'paratormônio',
    'SIADH':'síndrome da secreção inapropriada do hormônio antidiurético','MYC':'oncogene MYC',
    'SAF':'síndrome do anticorpo antifosfolípide','ACO':'anticoncepcional oral','MMII':'membros inferiores','MMSS':'membros superiores',
    'MSE':'membro superior esquerdo','MSD':'membro superior direito','MIE':'membro inferior esquerdo','MID':'membro inferior direito',
    'IMC':'índice de massa corporal','DM':'diabetes mellitus','TC':'tomografia computadorizada','RX':'radiografia',
    'CTI':'centro de terapia intensiva','UTI':'unidade de terapia intensiva','PS':'pronto-socorro','UBS':'unidade básica de saúde',
    'OMS':'Organização Mundial da Saúde','SAMU':'Serviço de Atendimento Móvel de Urgência','TA':'temperatura axilar',
    'SNC':'sistema nervoso central','IRA':'insuficiência renal aguda','SIRS':'síndrome da resposta inflamatória sistêmica',
    'CIVD':'coagulação intravascular disseminada','ATB':'antibiótico','PMN':'polimorfonucleares (neutrófilos)',
    'IIMN':'infiltrado inflamatório mononuclear','IIPMN':'infiltrado inflamatório polimorfonuclear',
    'CD4':'linfócito T auxiliar (CD4+)','TCD4':'linfócito T auxiliar (CD4+)','CD8':'linfócito T citotóxico (CD8+)',
    'TH1':'linfócito T auxiliar tipo 1','TH2':'linfócito T auxiliar tipo 2','TH17':'linfócito T auxiliar tipo 17',
    'TNF':'fator de necrose tumoral','IFN':'interferon','INF':'interferon','LTB-4':'leucotrieno B4',
    'HIV':'vírus da imunodeficiência humana','AIDS':'síndrome da imunodeficiência adquirida','CMV':'citomegalovírus','EBV':'vírus Epstein-Barr',
    'AINE':'anti-inflamatório não esteroide','AINES':'anti-inflamatórios não esteroides','AINEs':'anti-inflamatórios não esteroides',
    'COX-1':'ciclo-oxigenase 1 (protege a mucosa gástrica)','COX-2':'ciclo-oxigenase 2 (induzida na inflamação)',
    'IBP':'inibidor da bomba de prótons','INR':'razão normalizada internacional (tempo de protrombina)',
    'DNA':'ácido desoxirribonucleico','RNA':'ácido ribonucleico',
    'TGI':'trato gastrointestinal','GI':'gastrointestinal','EDA':'endoscopia digestiva alta',
    'DRGE':'doença do refluxo gastroesofágico','EEI':'esfíncter esofágico inferior','EES':'esfíncter esofágico superior',
    'JEG':'junção esofagogástrica','CCE':'carcinoma de células escamosas (espinocelular)',
    'DBG':'displasia de baixo grau','DAG':'displasia de alto grau',
    'HDA':'hemorragia digestiva alta','HDB':'hemorragia digestiva baixa','RHA':'ruídos hidroaéreos',
    'UPG':'úlcera péptica gástrica','UPD':'úlcera péptica duodenal','FI':'fator intrínseco','ECL':'células enterocromafins-like (produzem histamina)',
    'MALT':'tecido linfoide associado à mucosa','VCM':'volume corpuscular médio',
    'AMS':'artéria mesentérica superior','AMI':'artéria mesentérica inferior','FID':'fossa ilíaca direita','FIE':'fossa ilíaca esquerda',
    'SII':'síndrome do intestino irritável',
    'ASCA':'anticorpo anti-Saccharomyces cerevisiae (favorece Crohn)','p-ANCA':'anticorpo anticitoplasma de neutrófilo, padrão perinuclear (favorece RCU)',
    'FAP':'polipose adenomatosa familiar','PAF':'polipose adenomatosa familiar',
    'HNPCC':'câncer colorretal hereditário sem polipose (síndrome de Lynch)',
    'APC':'gene APC, supressor tumoral (via adenoma-carcinoma)','TP53':'gene supressor tumoral p53',
    'MSH2':'gene de reparo do DNA (falha na síndrome de Lynch)','MLH1':'gene de reparo do DNA (falha na síndrome de Lynch)',
    'KRAS':'oncogene KRAS','K-RAS':'oncogene KRAS','BRAF':'oncogene BRAF','CDH1':'gene da E-caderina (câncer gástrico difuso)',
    'STK11':'gene da síndrome de Peutz-Jeghers','NOD2':'gene NOD2 (associado à doença de Crohn)',
    'CFTR':'regulador de condutância transmembrana da fibrose cística',
    'IMS':'instabilidade de microssatélites','CIMP':'fenótipo metilador de ilhas CpG',
    'HBV':'vírus da hepatite B','HCV':'vírus da hepatite C','HAV':'vírus da hepatite A','HDV':'vírus da hepatite D','HEV':'vírus da hepatite E',
    'VHA':'vírus da hepatite A','VHB':'vírus da hepatite B','VHC':'vírus da hepatite C',
    'HBsAg':'antígeno de superfície do vírus B','HBeAg':'antígeno “e” do vírus B (replicação ativa)',
    'TGO':'transaminase oxalacética (AST)','TGP':'transaminase pirúvica (ALT, mais específica do fígado)',
    'AST':'aspartato aminotransferase (TGO)','ALT':'alanina aminotransferase (TGP)',
    'CHC':'carcinoma hepatocelular','VCL':'veia centrolobular','VCI':'veia cava inferior',
    'PBE':'peritonite bacteriana espontânea','DHA':'doença hepática alcoólica','DHGNA':'doença hepática gordurosa não alcoólica',
    'NASH':'esteato-hepatite não alcoólica','MASH':'esteato-hepatite associada à disfunção metabólica',
    'MASLD':'doença hepática esteatótica associada à disfunção metabólica',
    'NAD':'nicotinamida adenina dinucleotídeo','NADH':'forma reduzida do NAD',
    'ALDH':'aldeído desidrogenase','ALDH1':'aldeído desidrogenase 1','ALDH2':'aldeído desidrogenase 2',
    'CYP2E1':'citocromo P450 2E1 (via que oxida o etanol)','P450':'citocromo P450',
    'METAVIR':'escore que gradua a atividade e a fibrose na hepatite crônica',
    'ADH':['álcool desidrogenase',/álcool|etanol|alcoól|acetaldeído|hepat/i,'hormônio antidiurético (vasopressina)'],
    'HE':['encefalopatia hepática',/encefalopatia|amônia|flapping/i,'coloração hematoxilina-eosina'],
    'DC':['doença de Crohn',/crohn|RCU|retocolite/i,'débito cardíaco'],
    'EP':['espaço porta',/porta|lóbulo|ácino|hepát|fígado/i,null],
    'MI':['metaplasia intestinal',/metaplasia|gástr|Barrett|atrofia/i,null],
    'PC':['pequena curvatura do estômago',/curvatura|gástr|estômago/i,null],
    'GC':['grande curvatura do estômago',/curvatura|gástr|estômago/i,null]
  };
  var IL = /^IL-(\d+)$/;

  var keys = Object.keys(SIG).sort(function(a,b){return b.length-a.length});
  var esc = function(s){return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')};
  var RE = new RegExp('(^|[^0-9A-Za-zÀ-ÿ_-])(' + keys.map(esc).join('|') + '|IL-\\d{1,2})(?![0-9A-Za-zÀ-ÿ_])', 'g');
  var PULA = 'script,style,svg,button,select,textarea,input,code,pre,abbr,a,kbd,.vg-sg,.q-source,.q-num,.opt-letter,nav,aside,.sidebar,.nav,.toc,.mc-chip,#mc-tooltip,.vg-sgtip,[data-nosiglas]';
  var BLOCO = 'p,li,td,th,dd,dt,figcaption,blockquote,h1,h2,h3,h4,h5,.opt-text,.q-stem,div';

  function semAcento(s){ return s.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase(); }
  function significado(k, blocoTxt){
    var m = IL.exec(k); if (m) return 'interleucina ' + m[1];
    var v = SIG[k]; if (!v) return null;
    if (typeof v === 'string') return v;
    return v[1].test(blocoTxt) ? v[0] : v[2];
  }
  /* o parágrafo já explica? (o nome por extenso aparece nele, sem acento e sem maiúsculas) */
  function explicado(sig, blocoTxt){
    var base = semAcento(sig.replace(/\s*\(.*$/,'').replace(/[“”"]/g,''));
    var palavras = base.split(/[\s,-]+/).filter(function(w){return w.length > 3});
    if (!palavras.length) return false;
    var alvo = palavras.slice(0, Math.min(2, palavras.length)).join(' ');
    return semAcento(blocoTxt).indexOf(alvo) >= 0;
  }

  function processa(raiz){
    if (!raiz || !raiz.ownerDocument) return;
    var w = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT, { acceptNode: function(n){
      var p = n.parentElement;
      if (!p || p.closest(PULA)) return NodeFilter.FILTER_REJECT;
      RE.lastIndex = 0;
      return RE.test(n.data) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
    }});
    var nos = [], n; while ((n = w.nextNode())) nos.push(n);
    nos.forEach(function(no){
      var bloco = no.parentElement.closest(BLOCO) || no.parentElement;
      var btxt = bloco.textContent || '';
      if (btxt.length > 1500) btxt = btxt.slice(0, 1500);
      var txt = no.data, out = document.createDocumentFragment(), last = 0, mudou = false, m;
      RE.lastIndex = 0;
      while ((m = RE.exec(txt))){
        var ini = m.index + m[1].length, k = m[2], fim = ini + k.length;
        var depois = txt.slice(fim, fim + 3), antes = txt.slice(Math.max(0, ini - 1), ini);
        var sig = significado(k, btxt);
        if (!sig) continue;
        if (/^\s?\(/.test(depois)) continue;                       /* "TEP (tromboembolismo...)" */
        if (antes === '(' && txt.charAt(fim) === ')') continue;      /* "tromboembolismo pulmonar (TEP)" */
        if (explicado(sig, btxt)) continue;                          /* o parágrafo já diz o nome */
        out.appendChild(document.createTextNode(txt.slice(last, ini)));
        var ab = document.createElement('abbr');
        ab.className = 'vg-sg'; ab.textContent = k; ab.dataset.sg = sig; ab.tabIndex = 0;
        ab.setAttribute('aria-label', k + ': ' + sig);
        out.appendChild(ab); last = fim; mudou = true;
      }
      if (!mudou) return;
      out.appendChild(document.createTextNode(txt.slice(last)));
      no.parentNode.replaceChild(out, no);
    });
  }

  /* ---------- balão ---------- */
  var css = document.createElement('style');
  css.textContent =
    'abbr.vg-sg{text-decoration:underline dotted;text-decoration-thickness:1.5px;text-underline-offset:3px;text-decoration-color:color-mix(in srgb,var(--vg-acc,#ff6fb5) 75%,transparent);cursor:help;border:0}' +
    'abbr.vg-sg:hover,abbr.vg-sg:focus-visible,abbr.vg-sg.on{text-decoration-style:solid;outline:none;background:color-mix(in srgb,var(--vg-acc,#ff6fb5) 14%,transparent);border-radius:4px}' +
    '.vg-sgtip{position:fixed;z-index:2147483600;max-width:min(300px,calc(100vw - 24px));padding:9px 13px 10px;border-radius:16px;pointer-events:none;' +
      'font:500 13.5px/1.4 "Instrument Sans",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#eef4f6;' +
      'background:linear-gradient(160deg,rgba(255,255,255,.16),rgba(255,255,255,.04) 45%,rgba(255,255,255,.08)),rgba(12,16,22,.72);' +
      '-webkit-backdrop-filter:blur(18px) saturate(170%);backdrop-filter:blur(18px) saturate(170%);' +
      'box-shadow:inset 0 1px 0 rgba(255,255,255,.28),inset 0 0 0 1px rgba(255,255,255,.14),0 14px 34px -12px rgba(0,0,0,.55);' +
      'opacity:0;transform:translateY(4px) scale(.97);transform-origin:var(--o,50% 0);transition:opacity .16s ease,transform .22s cubic-bezier(.2,.8,.2,1)}' +
    '.vg-sgtip.on{opacity:1;transform:none}' +
    '.vg-sgtip b{display:block;font:600 11px/1.2 "Instrument Sans",sans-serif;letter-spacing:.06em;text-transform:uppercase;color:var(--vg-acc-ink,#ffb3d9);margin-bottom:3px}' +
    ':root[data-theme="light"] .vg-sgtip{color:#14161c;background:linear-gradient(160deg,rgba(255,255,255,.75),rgba(255,255,255,.45)),rgba(250,251,253,.7);box-shadow:inset 0 1px 0 #fff,inset 0 0 0 1px rgba(16,22,40,.08),0 14px 34px -12px rgba(16,22,40,.35)}' +
    ':root[data-theme="light"] .vg-sgtip b{color:var(--vg-acc-ink,#c2186f)}' +
    '@media (prefers-reduced-motion:reduce){.vg-sgtip{transition:none}}';
  (document.head || document.documentElement).appendChild(css);

  var tip = null, atual = null;
  function balao(){
    if (tip) return tip;
    tip = document.createElement('div'); tip.className = 'vg-sgtip'; tip.setAttribute('role','tooltip');
    document.body.appendChild(tip); return tip;
  }
  function mostra(ab){
    var t = balao(); atual = ab;
    document.querySelectorAll('abbr.vg-sg.on').forEach(function(x){ if (x !== ab) x.classList.remove('on'); });
    ab.classList.add('on');
    t.innerHTML = '<b></b><span></span>';
    t.firstChild.textContent = ab.textContent; t.lastChild.textContent = ab.dataset.sg;
    t.style.left = '0px'; t.style.top = '0px'; t.classList.remove('on');
    var r = ab.getBoundingClientRect(), tw = t.offsetWidth, th = t.offsetHeight, vw = window.innerWidth;
    var x = Math.max(12, Math.min(r.left + r.width / 2 - tw / 2, vw - tw - 12));
    var y = r.bottom + 8, baixo = true;
    if (y + th > window.innerHeight - 8){ y = r.top - th - 8; baixo = false; }
    t.style.left = x + 'px'; t.style.top = y + 'px';
    t.style.setProperty('--o', (r.left + r.width / 2 - x) + 'px ' + (baixo ? '0' : '100%'));
    requestAnimationFrame(function(){ t.classList.add('on'); });
  }
  function esconde(){ if (tip) tip.classList.remove('on'); if (atual) atual.classList.remove('on'); atual = null; }

  var toque = window.matchMedia && matchMedia('(hover: none)').matches;
  document.addEventListener('mouseover', function(e){
    if (toque) return;
    var ab = e.target.closest && e.target.closest('abbr.vg-sg'); if (ab) mostra(ab);
  });
  document.addEventListener('mouseout', function(e){
    if (toque) return;
    var ab = e.target.closest && e.target.closest('abbr.vg-sg');
    if (ab && !(e.relatedTarget && ab.contains(e.relatedTarget))) esconde();
  });
  document.addEventListener('focusin', function(e){ if (e.target.matches && e.target.matches('abbr.vg-sg')) mostra(e.target); });
  document.addEventListener('focusout', function(e){ if (e.target.matches && e.target.matches('abbr.vg-sg')) esconde(); });
  document.addEventListener('click', function(e){
    var ab = e.target.closest && e.target.closest('abbr.vg-sg');
    if (ab){ if (atual === ab && toque){ esconde(); } else mostra(ab); return; }
    if (atual) esconde();
  });
  document.addEventListener('keydown', function(e){ if (e.key === 'Escape') esconde(); });
  window.addEventListener('scroll', esconde, true);
  window.addEventListener('resize', esconde);

  /* ---------- aplica agora e no conteúdo que as aulas montam depois (abas, questões) ---------- */
  var fila = [], marcado = false;
  function agenda(n){
    fila.push(n);
    if (marcado) return; marcado = true;
    (window.requestIdleCallback || function(f){ return setTimeout(f, 60); })(function(){
      marcado = false; var lote = fila.splice(0);
      lote.forEach(function(no){ if (no.isConnected) processa(no); });
    });
  }
  function inicia(){
    processa(document.body);
    new MutationObserver(function(ms){
      ms.forEach(function(m){
        m.addedNodes.forEach(function(no){
          if (no.nodeType === 1 && !no.closest('abbr.vg-sg,.vg-sgtip,#mc-tooltip')) agenda(no);
          else if (no.nodeType === 3 && no.parentElement && !no.parentElement.closest('abbr.vg-sg')) agenda(no.parentElement);
        });
      });
    }).observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', inicia); else inicia();
})();
