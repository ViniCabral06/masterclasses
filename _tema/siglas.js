/* Siglas com explicação ao passar o mouse (ou tocar, no celular): "TGP" → "transaminase glutâmico-pirúvica (ALT)".
   Vale em todos os masters e nas aulas separadas em aulas/ (o publicar.py inclui este arquivo nos dois blocos do tema).
   Marca só a sigla que não tem explicação ao lado: pula "TEP (tromboembolismo...)", "tromboembolismo pulmonar (TEP)"
   e o parágrafo que já escreve o nome por extenso. O balão é de vidro, como o resto do tema.

   Dicionário:
   - SIG: siglas de todas as matérias. O valor é o significado, ou uma lista para sigla ambígua:
       [[/contexto/, 'significado'], [/outro contexto/, 'outro significado'], 'padrão (opcional)']
     O contexto é procurado no parágrafo (ou item, célula, alternativa) onde a sigla está.
     Sem contexto que bata e sem padrão, a sigla fica sem balão.
   - MAT: o que muda numa matéria (chave = data-vidro do master: lab, semio, farmaco...). null desliga a sigla ali.
   Sigla nova: acrescente em SIG (ou em MAT, se só valer numa matéria) e publique. */
(function(){
  'use strict';
  if (window.__vgSiglas) return; window.__vgSiglas = 1;
  if (window.__vgIndex) return;   /* cópia escondida da 🔍 Buscar: não precisa de balão */

  /* contextos que se repetem */
  var X_FIG = /fosfatase|colest|GGT|gama-?GT|bilirrub|hepát|hepat|fígado|canalic|TGO|TGP|\bAST\b|\bALT\b|LSN|óss|Paget|icteríc/i;
  var X_FA  = /fibrila|arritm|\britmo|anticoag|ECG|átrio|atrial|\bAE\b|AVC|\bCHA|onda P|\bB1\b|embol|varfarina|DOAC|cardioembó|palpita/i;
  var X_RX  = /incidência|radiograf|\bRX\b|raio|perfil|tórax em|leito|decúbito|chassi|filme|ortostat/i;
  /* atenção: o contexto de uma sigla não pode conter a própria sigla (senão sempre bate) */
  var X_VIA = /\bvias? (de administra|intramusc|parenteral|oral|ID|SC|IM|EV|VO)|injeç|aplicaç|apresentaç|adrenalina|anafilax|\bmg\b|\bmL\b|intraven|endoven|deltoide|vasto lateral|glúte|vacina|benzatina|penicilina|agulha|seringa|subcut|intradérm/i;
  var X_VAL = /sopro|valv|regurg|foco (mitral|aórtico|tricúsp|pulmonar)|ausculta|\bB[1-4]\b|sistól|diastól|ruflar|estalido|Rivero|mitral|reumát/i;
  var X_ESP = /espirom|volume|capacidade|reserva|\bCPT\b|pletism|hiperinsufl|aprisionamento/i;
  var X_TEST = /positiv|negativ|sensibil|especific|teste|VPP|VPN|preditiv|padrão-ouro/i;
  var X_ANAM = /anamnese|interrogat|\bQP\b|\bHMA\b|\bHPP\b|queixa|história|antecedent/i;

  var SIG = {
    /* ---------- cardiologia e circulação ---------- */
    'VE':'ventrículo esquerdo','VD':'ventrículo direito',
    'AE':[[/anamnese especial|interrogat|\bRS\b|\bQP\b|\bHMA\b|\bIS\b/,'anamnese especial (revisão de sistemas)'],'átrio esquerdo'],
    'AD':[[/autossôm|herança|heredit|mendel/i,'autossômica dominante'],'átrio direito'],
    'IC':[[/confiança|95 ?%|estatíst|odds|\bRR\b|\bOR\b|amostra/i,'intervalo de confiança'],'insuficiência cardíaca'],
    'ICC':'insuficiência cardíaca congestiva','IAM':'infarto agudo do miocárdio',
    'ICFEr':'insuficiência cardíaca com fração de ejeção reduzida','ICFEp':'insuficiência cardíaca com fração de ejeção preservada',
    'FEVE':'fração de ejeção do ventrículo esquerdo',
    'HAS':'hipertensão arterial sistêmica',
    'PA':[[/\b(ao|no|do|pelo) PA\b/,'pronto atendimento'],[/\bPA\s*(de\s*)?\d+\s*[x×\/]|mmHg|pressão arterial|hipertens|hipotens/i,'pressão arterial'],[/incidência|radiograf|\bRX\b|tórax em PA|chassi|\bAP\b/i,'incidência posteroanterior (o raio entra pelas costas e sai pela frente)'],'pressão arterial'],
    'PAS':'pressão arterial sistólica','PAD':'pressão arterial diastólica',
    'PAM':[[/vasculite|ANCA|MPO|poliang/i,'poliangiite microscópica'],'pressão arterial média'],
    'PVC':'pressão venosa central','RVP':'resistência vascular periférica','PIC':'pressão intracraniana','HIC':'hipertensão intracraniana',
    'FC':'frequência cardíaca','FR':[[/irpm|ipm\b|\bFR\s*[=:]?\s*\d/i,'frequência respiratória'],[/reumat|artrite|anti-CCP|\bAR\b|\bFAN\b|autoanticorp|autoimun/i,'fator reumatoide'],'frequência respiratória'],
    'FP':[[X_TEST,'falso-positivo'],[/pulso|ppm|\bFC\b|\bFR\b|\bPA\b|vitais|taquisfíg/i,'frequência de pulso']],
    'FE':'fração de ejeção','DC':[[/crohn|RCU|retocolite/i,'doença de Crohn'],'débito cardíaco'],
    'B1':[[/vitamina|tiamina|Wernicke|beribéri/i,'vitamina B1 (tiamina)'],'primeira bulha (fechamento das valvas mitral e tricúspide)'],
    'B2':[[/bradicinin/i,'receptor B2 da bradicinina'],[/vitamina|riboflav/i,'vitamina B2 (riboflavina)'],'segunda bulha (fechamento das valvas aórtica e pulmonar)'],
    'B3':[[/anfoter|vitamina|niacina/i,null],'terceira bulha cardíaca'],'B4':'quarta bulha cardíaca',
    'ECG':'eletrocardiograma','ECO':'ecocardiograma',
    'ST':[[/ECG|supra|infra|desnivel|segmento|onda T|\bIAM\b|infarto|isquemia/i,'segmento ST do eletrocardiograma'],[/toxina|ETEC|termoest|enterotox/i,'toxina termoestável'],'segmento ST do eletrocardiograma'],
    'QT':'intervalo QT do eletrocardiograma','QRS':'complexo QRS do eletrocardiograma (despolarização dos ventrículos)',
    'PR':[[/intervalo|ECG|onda|\bBAV|segmento/i,'intervalo PR do eletrocardiograma']],
    'RR':[[/ECG|intervalo|irregular|onda|ritmo|batimento/i,'intervalo RR do eletrocardiograma (entre dois batimentos)'],[/risco|coorte|incidência|exposto/i,'risco relativo']],
    'BRD':'bloqueio de ramo direito','BRE':'bloqueio de ramo esquerdo','BAV':'bloqueio atrioventricular','BAVT':'bloqueio atrioventricular total',
    'BDAS':'bloqueio divisional anterossuperior esquerdo',
    'FA':[[X_FIG,'fosfatase alcalina'],[X_FA,'fibrilação atrial']],
    'FV':'fibrilação ventricular','TV':[[/ventric|taquicard|arritm|ECG/i,'taquicardia ventricular']],
    'HVE':'hipertrofia ventricular esquerda','HVD':'hipertrofia ventricular direita',
    'CIA':'comunicação interatrial','CIV':'comunicação interventricular','PCA':'persistência do canal arterial',
    'EAo':'estenose aórtica','IAo':'insuficiência aórtica','EMt':'estenose mitral','IMt':'insuficiência mitral',
    'EM':[[X_VAL,'estenose mitral'],[/mitral|\bFA\b|\bAE\b|febre reumática|diástole/i,'estenose mitral']],
    'IM':[[X_VIA,'intramuscular'],[X_VAL,'insuficiência mitral']],
    'IT':[[/tricúsp|sopro|valv|Rivero|foco/i,'insuficiência tricúspide'],[/terapêutic|DL50|DE50|janela|toxic|margem/i,'índice terapêutico']],
    'ET':[[/endotelin|vasoconstr|HAP|bosentan|ambrisentan|receptor/i,'endotelina'],[/tricúsp|sopro|valv|diastól|estenose/i,'estenose tricúspide']],
    'EP':[[/porta|lóbulo|ácino|hepát|fígado/i,'espaço porta'],[/pulmon|sopro|valv|sistól|estenose/i,'estenose pulmonar']],
    'IP':[[/pulmon|sopro|valv|diastól|estenose/i,'insuficiência pulmonar']],
    'AV':[[/valva|folheto|bloqueio|\bnó\b|nodo|\bBAV|condução|mitral|tricúsp|junção/i,'atrioventricular']],
    'DA':[[/dopamin|levodopa|\bD2\b|Parkinson|\bMAO\b|\bCOMT\b|VMAT/i,'dopamina'],[/coronár|artéria|infarto|\bIAM\b|irriga/i,'artéria descendente anterior']],
    'CD':[[/coronária|irriga|dominância|\bVD\b/i,'coronária direita']],
    'AVC':'acidente vascular cerebral','AVE':'acidente vascular encefálico','AVCi':'AVC isquêmico','AVCh':'AVC hemorrágico',
    'AIT':'ataque isquêmico transitório','HSA':'hemorragia subaracnóidea','HIP':'hemorragia intraparenquimatosa','MAV':'malformação arteriovenosa',
    'ACM':'artéria cerebral média','ACA':[[/artéria|território|cerebral|\bACM\b|\bACP\b|hemisf/i,'artéria cerebral anterior']],
    'ACP':[[/artéria|território|cerebral|\bACM\b|\bACA\b|hemisf|occipit/i,'artéria cerebral posterior']],
    'NIHSS':'escala do NIH que mede a gravidade do AVC (déficit neurológico)',
    'AAA':'aneurisma de aorta abdominal','VCI':'veia cava inferior','VCS':'veia cava superior',
    'SRAA':'sistema renina-angiotensina-aldosterona','RAA':'sistema renina-angiotensina-aldosterona',
    'IECA':'inibidor da enzima conversora de angiotensina','IECAs':'inibidores da enzima conversora de angiotensina',
    'BRA':'bloqueador do receptor de angiotensina','BRAs':'bloqueadores do receptor de angiotensina',
    'ECA':'enzima conversora de angiotensina','AII':'angiotensina II',
    'AT1':'receptor tipo 1 da angiotensina II (vasoconstrição, aldosterona)','AT2':'receptor tipo 2 da angiotensina II',
    'INRA':'inibidor da neprilisina e do receptor de angiotensina (sacubitril/valsartana)','ARNI':'inibidor da neprilisina e do receptor de angiotensina (sacubitril/valsartana)',
    'NYHA':'classificação funcional da insuficiência cardíaca (New York Heart Association, classes I a IV)',
    'BNP':'peptídeo natriurético tipo B (sobe na insuficiência cardíaca)','NT-proBNP':'fragmento N-terminal do pró-BNP (marcador de insuficiência cardíaca)',
    'ANP':'peptídeo natriurético atrial','CNP':'peptídeo natriurético tipo C','NPR':'receptor de peptídeo natriurético','NEP':'neprilisina (enzima que degrada os peptídeos natriuréticos)',
    'LDL':'lipoproteína de baixa densidade (“colesterol ruim”)','HDL':'lipoproteína de alta densidade (“colesterol bom”)',
    'VLDL':'lipoproteína de densidade muito baixa','IDL':'lipoproteína de densidade intermediária','QM':'quilomícrons',
    'LDL-C':'colesterol LDL','LDLR':'receptor de LDL','LDL-R':'receptor de LDL','ApoB':'apolipoproteína B',
    'TG':[[/tireo|tireoid/i,'tireoglobulina'],'triglicerídeos'],
    'CT':[[/\bHDL|\bLDL|colesterol|\bTG\b|Friedewald|lipíd/i,'colesterol total'],[/clam[ií]dia|chlamydia|gonorr|\bIST|NAAT|uretrite|cervicite/i,'Chlamydia trachomatis']],
    'ASCVD':'doença cardiovascular aterosclerótica','SCORE2':'escore europeu de risco cardiovascular em 10 anos',
    'CML':'células musculares lisas','MLV':'músculo liso vascular','MEC':'matriz extracelular','MMP':'metaloproteinases de matriz','MMP-12':'metaloproteinase de matriz 12 (destrói a elastina no enfisema)',
    'ICAM-1':'molécula de adesão intercelular 1','VCAM-1':'molécula de adesão celular vascular 1',
    'CK':'creatinoquinase (CPK)','CPK':'creatinofosfoquinase',
    'CK-MB':'creatinoquinase, fração MB (marcador de lesão do miocárdio)','CKMB':'creatinoquinase, fração MB (marcador de lesão do miocárdio)',
    'TEP':'tromboembolismo pulmonar','TVP':'trombose venosa profunda','TEV':'tromboembolismo venoso',
    'DOAC':'anticoagulante oral direto','DOACs':'anticoagulantes orais diretos','HBPM':'heparina de baixo peso molecular',

    /* ---------- respiratório ---------- */
    'DPOC':'doença pulmonar obstrutiva crônica','SDRA':'síndrome do desconforto respiratório agudo','SARA':'síndrome da angústia respiratória aguda',
    'DAD':'dano alveolar difuso','DMH':'doença da membrana hialina','RDS':'síndrome do desconforto respiratório do recém-nascido',
    'BAC':'barreira alvéolo-capilar','VEF1':'volume expiratório forçado no 1º segundo','CVF':'capacidade vital forçada',
    'CPT':'capacidade pulmonar total','DLCO':'capacidade de difusão do monóxido de carbono','LBA':'lavado broncoalveolar',
    'VC':[[X_ESP,'volume corrente']],'VR':[[X_ESP,'volume residual']],'VRI':'volume de reserva inspiratório',
    'VRE':[[X_ESP,'volume de reserva expiratório'],[/enteroc|vancomic|resist/i,'enterococo resistente à vancomicina']],
    'CV':[[X_ESP,'capacidade vital']],
    'CI':[[/concentra|inibe|inibitória|curva/i,'concentração inibitória (CI50 = a que inibe 50% da resposta)'],[X_ESP,'capacidade inspiratória']],
    'CRF':[[X_ESP,'capacidade residual funcional'],[/hipotálamo|cortic|ACTH|estresse|corticotrof/i,'fator liberador de corticotrofina']],
    'HTD':'hemitórax direito','HTE':'hemitórax esquerdo','PAC':'pneumonia adquirida na comunidade','PAV':'pneumonia associada à ventilação mecânica',
    'IVAS':'infecções das vias aéreas superiores','VNI':'ventilação não invasiva',
    'GOLD':'classificação da DPOC (Global Initiative for Chronic Obstructive Lung Disease)',
    'CURB-65':'escore de gravidade da pneumonia: confusão, ureia, FR ≥ 30, PA baixa e idade ≥ 65',
    'SABA':'β2-agonista de curta ação (broncodilatador de resgate)','LABA':'β2-agonista de longa ação',
    'SAMA':'antimuscarínico de curta ação','LAMA':'antimuscarínico de longa ação','ICS':'corticoide inalatório',
    'MV':'murmúrio vesicular','FTV':'frêmito toracovocal',
    'SpO2':'saturação periférica de oxigênio (oxímetro de pulso)','PaO2':'pressão parcial de oxigênio no sangue arterial','PaCO2':'pressão parcial de gás carbônico no sangue arterial',
    'CO2':'dióxido de carbono (gás carbônico)','O2':'oxigênio',
    'CO':[[/débito|cardíac/i,'débito cardíaco (cardiac output)'],[/monóxido|intoxica|carboxi|fumaça/i,'monóxido de carbono']],
    'TB':'tuberculose','TBC':'tuberculose','BK':'bacilo de Koch (Mycobacterium tuberculosis)','BAAR':'bacilo álcool-ácido resistente',
    'PPD':'prova tuberculínica (derivado proteico purificado)',
    'BCG':'bacilo de Calmette-Guérin (vacina contra a tuberculose)','SARS':'síndrome respiratória aguda grave',
    'SRAG':'síndrome respiratória aguda grave','VSR':'vírus sincicial respiratório',
    'TTF-1':'fator de transcrição da tireoide 1 (marcador de adenocarcinoma de pulmão)','EGFR':'receptor do fator de crescimento epidérmico',
    'ALK':'quinase do linfoma anaplásico (alvo de tratamento no adenocarcinoma de pulmão)','ROS1':'gene ROS1 (alvo de tratamento no adenocarcinoma de pulmão)',
    'PD-L1':'ligante de morte programada 1 (alvo da imunoterapia)','PDL-1':'ligante de morte programada 1 (alvo da imunoterapia)',
    'CPCP':'carcinoma pulmonar de pequenas células','CPNPC':'carcinoma pulmonar de não pequenas células',
    'NNK':'nitrosamina do tabaco (cancerígena)','CDKN2A':'gene supressor tumoral (codifica a p16)',

    /* ---------- patologia geral, imuno e oncologia ---------- */
    'AE1':'clone de anticorpo contra citoqueratinas (AE1/AE3 = pancitoqueratina)','AE3':'clone de anticorpo contra citoqueratinas (AE1/AE3 = pancitoqueratina)',
    'IHQ':'imuno-histoquímica','TNM':'estadiamento por tumor, linfonodo e metástase','ACTH':'hormônio adrenocorticotrófico','PTH':'paratormônio',
    'PTHrP':'peptídeo relacionado ao paratormônio (causa hipercalcemia em tumores)','PTH-rp':'peptídeo relacionado ao paratormônio',
    'SIADH':'síndrome da secreção inapropriada do hormônio antidiurético','MYC':'oncogene MYC',
    'SAF':'síndrome do anticorpo antifosfolípide','ACO':'anticoncepcional oral',
    'MMII':'membros inferiores','MMSS':'membros superiores',
    'MSE':'membro superior esquerdo','MSD':'membro superior direito','MIE':'membro inferior esquerdo','MID':'membro inferior direito',
    'IMC':'índice de massa corporal','DM':'diabetes mellitus','DM1':'diabetes mellitus tipo 1','DM2':'diabetes mellitus tipo 2',
    'TC':'tomografia computadorizada','RX':'radiografia',
    'CTI':'centro de terapia intensiva','UTI':'unidade de terapia intensiva','UBS':'unidade básica de saúde',
    'PS':[[/socorro|emergên|urgên|atendimento|plantão|deu entrada|admitid|chega/i,'pronto-socorro']],
    'UPA':'unidade de pronto atendimento','SAMU':'Serviço de Atendimento Móvel de Urgência',
    'OMS':'Organização Mundial da Saúde','OPAS':'Organização Pan-Americana da Saúde','TA':'temperatura axilar','TAX':'temperatura axilar',
    'SNC':'sistema nervoso central','SNP':'sistema nervoso periférico','SNA':'sistema nervoso autônomo','SNE':'sistema nervoso entérico',
    'IRA':'insuficiência renal aguda','LRA':'lesão renal aguda','AKI':'lesão renal aguda (acute kidney injury)',
    'SIRS':'síndrome da resposta inflamatória sistêmica',
    'CIVD':'coagulação intravascular disseminada','ATB':'antibiótico','PMN':'polimorfonucleares (neutrófilos)','PMNs':'polimorfonucleares (neutrófilos)',
    'IIMN':'infiltrado inflamatório mononuclear','IIPMN':'infiltrado inflamatório polimorfonuclear',
    'CD4':'linfócito T auxiliar (CD4+)','TCD4':'linfócito T auxiliar (CD4+)','CD8':'linfócito T citotóxico (CD8+)',
    'TH1':'linfócito T auxiliar tipo 1','TH2':'linfócito T auxiliar tipo 2','TH17':'linfócito T auxiliar tipo 17',
    'NK':[[/natural killer|célula|citotóx|linfóc|imunid/i,'célula natural killer'],[/receptor|substância P|aprepit|vômit|neurocin/i,'receptor de neurocinina (NK1 = receptor da substância P)']],
    'NK1':'receptor de neurocinina 1 (receptor da substância P; alvo do aprepitanto)',
    'TNF':'fator de necrose tumoral','IFN':'interferon','INF':'interferon','LTB-4':'leucotrieno B4',
    'NF-κB':'fator nuclear kappa B (liga os genes da inflamação)','NFKB':'fator nuclear kappa B (liga os genes da inflamação)',
    'IgM':'imunoglobulina M (anticorpo da fase aguda)','IgG':'imunoglobulina G (anticorpo tardio, de memória)',
    'IgA':'imunoglobulina A (anticorpo das mucosas)','IgE':'imunoglobulina E (alergia e parasitas)',
    'MHC':'complexo principal de histocompatibilidade','HLA':'antígeno leucocitário humano',
    'HIV':'vírus da imunodeficiência humana','AIDS':'síndrome da imunodeficiência adquirida','CMV':'citomegalovírus','EBV':'vírus Epstein-Barr',
    'HPV':'papilomavírus humano','HSV':'herpes-vírus simples','VZV':'vírus varicela-zóster','HTLV-1':'vírus linfotrópico de células T humanas tipo 1',
    'AINE':'anti-inflamatório não esteroide','AINES':'anti-inflamatórios não esteroides','AINEs':'anti-inflamatórios não esteroides',
    'COX':'ciclo-oxigenase','COXs':'ciclo-oxigenases',
    'COX-1':'ciclo-oxigenase 1 (protege a mucosa gástrica)','COX-2':'ciclo-oxigenase 2 (induzida na inflamação)',
    'IBP':'inibidor da bomba de prótons','IBPs':'inibidores da bomba de prótons',
    'INR':'razão normalizada internacional (tempo de protrombina)','RNI':'razão normalizada internacional (tempo de protrombina)',
    'DNA':'ácido desoxirribonucleico','RNA':'ácido ribonucleico','RNAm':'RNA mensageiro',
    'RN':'recém-nascido','CEC':'carcinoma espinocelular (de células escamosas)',
    'GIST':'tumor estromal gastrointestinal','AFP':'alfafetoproteína','CEA':'antígeno carcinoembrionário','PSA':'antígeno prostático específico',
    'HPB':'hiperplasia prostática benigna','LES':'lúpus eritematoso sistêmico',
    'HD':[[/diális|renal|fístula/i,'hemodiálise'],'hipótese diagnóstica'],
    'HP':[[/portal|varizes|ascite|esplenomeg|cabeça de medusa|cirros/i,'hipertensão portal'],[/pulmonar|\bVD\b|cor pulmonale|vasoconstr|plexiform|pressão/i,'hipertensão pulmonar'],[/pylori|gastrite|úlcera|urease/i,'Helicobacter pylori']],
    'IH':[[/icteríc|encefalop|coagulop|hepát|cirros|fígado/i,'insuficiência hepática']],
    'HAP':'hipertensão arterial pulmonar',

    /* ---------- digestório e fígado ---------- */
    'TGI':'trato gastrointestinal','GI':'gastrointestinal','EDA':'endoscopia digestiva alta',
    'DRGE':'doença do refluxo gastroesofágico','EEI':'esfíncter esofágico inferior','EES':'esfíncter esofágico superior',
    'JEG':'junção esofagogástrica','DBG':'displasia de baixo grau',
    'DAG':[[/\bPLC\b|\bIP3|IP₃|fosfolip|\bPKC\b|segundo mensag|\bGq\b/i,'diacilglicerol'],'displasia de alto grau'],
    'HDA':[[X_ANAM,'história da doença atual'],'hemorragia digestiva alta'],'HDB':'hemorragia digestiva baixa','RHA':'ruídos hidroaéreos',
    'UPG':'úlcera péptica gástrica','UPD':'úlcera péptica duodenal','FI':'fator intrínseco','ECL':'células enterocromafins-like (produzem histamina)',
    'MALT':'tecido linfoide associado à mucosa','VCM':'volume corpuscular médio',
    'AMS':'artéria mesentérica superior','AMI':'artéria mesentérica inferior','FID':'fossa ilíaca direita','FIE':'fossa ilíaca esquerda',
    'HCD':'hipocôndrio direito','HCE':'hipocôndrio esquerdo',
    'SII':'síndrome do intestino irritável','RCU':'retocolite ulcerativa','RCUI':'retocolite ulcerativa idiopática','DII':'doença inflamatória intestinal',
    'ASCA':'anticorpo anti-Saccharomyces cerevisiae (favorece Crohn)','p-ANCA':'anticorpo anticitoplasma de neutrófilo, padrão perinuclear (favorece RCU)',
    'P-ANCA':'anticorpo anticitoplasma de neutrófilo, padrão perinuclear','ANCA':'anticorpo anticitoplasma de neutrófilo (vasculites)',
    'FAP':'polipose adenomatosa familiar','PAF':[[/polipose|adenoma|cólon|colorret|\bAPC\b/i,'polipose adenomatosa familiar'],[/plaqueta|leucotr|asma|anafil|inflama|broncoc/i,'fator ativador de plaquetas']],
    'HNPCC':'câncer colorretal hereditário sem polipose (síndrome de Lynch)',
    'APC':[[/apresent|alérgeno|linfócito|\bCD4|\bTh[0-9]|\bMHC/i,'célula apresentadora de antígeno'],[/gene|polipose|adenoma|colorret|cólon|supressor|mutaç/i,'gene APC, supressor tumoral (via adenoma-carcinoma)']],'TP53':'gene supressor tumoral p53',
    'MSH2':'gene de reparo do DNA (falha na síndrome de Lynch)','MLH1':'gene de reparo do DNA (falha na síndrome de Lynch)',
    'MSH6':'gene de reparo do DNA (falha na síndrome de Lynch)','PMS2':'gene de reparo do DNA (falha na síndrome de Lynch)',
    'KRAS':'oncogene KRAS','K-RAS':'oncogene KRAS','BRAF':'oncogene BRAF','CDH1':'gene da E-caderina (câncer gástrico difuso)',
    'STK11':'gene da síndrome de Peutz-Jeghers','NOD2':'gene NOD2 (associado à doença de Crohn)',
    'CFTR':'regulador de condutância transmembrana da fibrose cística',
    'IMS':'instabilidade de microssatélites','CIMP':'fenótipo metilador de ilhas CpG',
    'HBV':'vírus da hepatite B','HCV':'vírus da hepatite C','HAV':'vírus da hepatite A','HDV':'vírus da hepatite D','HEV':'vírus da hepatite E',
    'VHA':'vírus da hepatite A','VHB':'vírus da hepatite B','VHC':'vírus da hepatite C',
    'HBsAg':'antígeno de superfície do vírus B','HBeAg':'antígeno “e” do vírus B (replicação ativa)','HBcAg':'antígeno do core (núcleo) do vírus B',
    'TGO':'transaminase glutâmico-oxalacética (AST)','TGP':'transaminase glutâmico-pirúvica (ALT, mais específica do fígado)',
    'AST':'aspartato aminotransferase (TGO)','ALT':'alanina aminotransferase (TGP, mais específica do fígado)',
    'GGT':'gama-glutamiltransferase (gama-GT): enzima do canalículo biliar, sobe na colestase e no álcool',
    'BT':[[/bilirrub|\bBD\b|\bBI\b|icteríc/i,'bilirrubina total']],'BD':[[/bilirrub|\bBT\b|\bBI\b|icteríc|\bFA\b|\bGGT\b/i,'bilirrubina direta (conjugada)']],
    'BI':[[/bilirrub|\bBT\b|\bBD\b|icteríc|hemól/i,'bilirrubina indireta (não conjugada)']],
    'UGT1A1':'enzima que conjuga a bilirrubina (falha na síndrome de Gilbert)',
    'CHC':'carcinoma hepatocelular','VCL':'veia centrolobular',
    'PBE':'peritonite bacteriana espontânea','DHA':'doença hepática alcoólica','DHGNA':'doença hepática gordurosa não alcoólica',
    'NASH':'esteato-hepatite não alcoólica','MASH':'esteato-hepatite associada à disfunção metabólica',
    'MASLD':'doença hepática esteatótica associada à disfunção metabólica',
    'CBP':[[/biliar|colest|\bAMA\b|prurido|\bFA\b|\bGGT\b|hepát|cirros/i,'colangite biliar primária'],[/NF|histona|acetil|\bHAT\b|transcri/i,'proteína ligadora de CREB (coativadora com atividade HAT)']],
    'CEP':[[/colang|biliar|colest|\bFA\b|\bGGT\b|\bRCU\b|ANCA/i,'colangite esclerosante primária']],
    'AMA':[[/mitocôn|\bCBP\b|biliar|colest|anticorpo|autoimun/i,'anticorpo antimitocôndria']],
    'MELD':'escore de gravidade da cirrose (Model for End-Stage Liver Disease)','FIB-4':'índice de fibrose hepática (idade, AST, ALT e plaquetas)',
    'AASLD':'Associação Americana para o Estudo das Doenças do Fígado',
    'CAGE':'questionário de rastreio de abuso de álcool (Cut down, Annoyed, Guilty, Eye-opener)',
    'NAD':'nicotinamida adenina dinucleotídeo','NADH':'forma reduzida do NAD','NADPH':'forma reduzida do NADP (doa elétrons ao citocromo P450)',
    'ALDH':'aldeído desidrogenase','ALDH1':'aldeído desidrogenase 1','ALDH2':'aldeído desidrogenase 2',
    'CYP2E1':'citocromo P450 2E1 (via que oxida o etanol)','P450':'citocromo P450',
    'METAVIR':'escore que gradua a atividade e a fibrose na hepatite crônica',
    'ADH':[[/álcool|etanol|alcoól|acetaldeído|hepat/i,'álcool desidrogenase'],'hormônio antidiurético (vasopressina)'],
    'HE':[[/encefalopatia|amônia|flapping/i,'encefalopatia hepática'],'coloração hematoxilina-eosina'],
    'MI':[[/metaplasia|gástr|Barrett|atrofia/i,'metaplasia intestinal']],
    'PC':[[/curvatura|gástr|estômago/i,'pequena curvatura do estômago']],
    'GC':[[/curvatura|gástr|estômago/i,'grande curvatura do estômago']],
    'CPRE':'colangiopancreatografia retrógrada endoscópica','CPRM':'colangiopancreatografia por ressonância magnética',

    /* ---------- laboratório ---------- */
    'Hb':'hemoglobina','Ht':'hematócrito','HbA1c':'hemoglobina glicada (média da glicemia dos últimos 3 meses)',
    'HCM':[[/cardiomiopat|hipertróf|septo/i,'cardiomiopatia hipertrófica'],'hemoglobina corpuscular média'],
    'CHCM':'concentração de hemoglobina corpuscular média',
    'RDW':'amplitude de distribuição dos eritrócitos (o quanto as hemácias variam de tamanho)',
    'IPR':'índice de produção reticulocitária','ADC':[[/anemia|ferritina|ferro|hepcid/i,'anemia de doença crônica'],[/difus|ressonância|\bRM\b/i,'coeficiente de difusão aparente (RM)']],
    'TIBC':'capacidade total de ligação do ferro','CTLF':'capacidade total de ligação do ferro','TSAT':'saturação da transferrina',
    'G6PD':'glicose-6-fosfato desidrogenase','LDH':'desidrogenase láctica','LSN':'limite superior da normalidade',
    'PCT':'procalcitonina (sobe na infecção bacteriana)','VHS':'velocidade de hemossedimentação',
    'PCR':[[/parada|cardiorrespirat|reanima|\bRCP\b|massagem card|desfibril/i,'parada cardiorrespiratória'],[/RNA|DNA|viral|amplifica|molecular|swab|SARS|COVID|HIV|HPV|carga|gene|sequenc|clamíd|chlamydia|gonorr/i,'reação em cadeia da polimerase (teste molecular)'],'proteína C reativa'],
    'RT-PCR':'transcrição reversa seguida de reação em cadeia da polimerase (detecta o RNA do vírus)',
    'NAAT':'teste de amplificação de ácidos nucleicos (teste molecular)','ELISA':'ensaio imunoenzimático',
    'IE':[[/HIV|geração|anticorpo|antígeno|p24|imunoens/i,'imunoensaio'],[/endocard|valv|Duke/i,'endocardite infecciosa']],
    'TR1':'teste rápido 1','TR2':'teste rápido 2 (de outro fabricante)',
    'ASLO':'antiestreptolisina O','FAN':'fator antinuclear','ENA':'antígenos nucleares extraíveis',
    'ASMA':[[/antimúsculo|hepatite autoimune|autoimun|\bFAN\b|\bAMA\b/i,'anticorpo antimúsculo liso']],
    'TRAb':'anticorpo antirreceptor de TSH (doença de Graves)','TSH':'hormônio tireoestimulante','T4L':'tiroxina livre',
    'EDTA':'anticoagulante do tubo roxo (ácido etilenodiaminotetracético)',
    'TP':[[/sífilis|treponem|FTA|TPHA/i,null],'tempo de protrombina'],'TTPa':'tempo de tromboplastina parcial ativada','PTT':'tempo de tromboplastina parcial',
    'TTGO':'teste de tolerância oral à glicose','UFC':'unidades formadoras de colônia',
    'VDRL':'teste não treponêmico da sífilis (Venereal Disease Research Laboratory)','RPR':'teste não treponêmico rápido da sífilis (rapid plasma reagin)',
    'FTA-ABS':'teste treponêmico da sífilis (anticorpos treponêmicos fluorescentes)',
    'NS1':'proteína não estrutural 1 do vírus da dengue (antígeno dos primeiros dias)',
    'PRNT':'teste de neutralização por redução de placas','ADE':'potencialização dependente de anticorpos (dengue grave na reinfecção)',
    'VPP':[[/vacina|pneumo|polissacar/i,'vacina pneumocócica polissacarídica'],'valor preditivo positivo'],'VPN':'valor preditivo negativo',
    'VPP23':'vacina pneumocócica polissacarídica 23-valente',
    'VP':[[X_TEST,'verdadeiro-positivo']],'VN':[[X_TEST,'verdadeiro-negativo']],'FN':[[X_TEST,'falso-negativo']],
    'SpPIn':'teste muito específico, se positivo, confirma o diagnóstico','SnNOut':'teste muito sensível, se negativo, afasta o diagnóstico',
    'IST':'infecção sexualmente transmissível','ISTs':'infecções sexualmente transmissíveis',
    'TFG':'taxa de filtração glomerular','TFGe':'taxa de filtração glomerular estimada','DRC':'doença renal crônica','NTA':'necrose tubular aguda',
    'CKD-EPI':'equação que estima a filtração glomerular pela creatinina','KDIGO':'diretriz internacional de doença renal (Kidney Disease: Improving Global Outcomes)',
    'EAS':'exame de urina tipo 1 (elementos anormais e sedimento)',
    'CAD':[[/cetoac|cetona|diabet|glicemia|\bBHB\b|ânion/i,'cetoacidose diabética'],[/coronar|artéria/i,'doença arterial coronariana']],
    'EHH':'estado hiperglicêmico hiperosmolar','BHB':'beta-hidroxibutirato',
    'AR':[[/reumat|articula|anti-CCP|fator reumat|sinovi/i,'artrite reumatoide'],[/autossôm|herança|heredit/i,'autossômica recessiva'],[/ACV|aparelho|ausculta/i,'aparelho respiratório']],
    'ACR':'American College of Rheumatology (Colégio Americano de Reumatologia)','EULAR':'Liga Europeia contra o Reumatismo',
    'GPA':[[/gesta|parto|aborto|obstétr/i,'gestações, partos e abortos'],[/vasculite|ANCA|PR3|Wegener|granulomat/i,'granulomatose com poliangiite']],
    'PAN':[[/vasculite|ANCA|poliarter|HBV|aneurism/i,'poliarterite nodosa']],
    'PK':'farmacocinética','PD':[[/\bPK\b|farmac|antibiót|dose/i,'farmacodinâmica']],

    /* ---------- microbiologia e infecção ---------- */
    'ESBL':'β-lactamase de espectro estendido','KPC':'Klebsiella pneumoniae carbapenemase','NDM':'New Delhi metalo-β-lactamase',
    'OXA-48':'carbapenemase do tipo oxacilinase 48',
    'MRSA':'S. aureus resistente à meticilina','MSSA':'S. aureus sensível à meticilina',
    'CA-MRSA':'MRSA adquirido na comunidade','HA-MRSA':'MRSA associado aos serviços de saúde',
    'VISA':'S. aureus com sensibilidade intermediária à vancomicina','VRSA':'S. aureus resistente à vancomicina',
    'PBP':'proteína ligadora de penicilina','PBPs':'proteínas ligadoras de penicilina','PBP2a':'proteína ligadora de penicilina 2a (dá a resistência do MRSA)',
    'SHU':'síndrome hemolítico-urêmica','EHEC':'E. coli enterohemorrágica','ETEC':'E. coli enterotoxigênica',
    'EPEC':'E. coli enteropatogênica','EIEC':'E. coli enteroinvasiva','EAEC':'E. coli enteroagregativa',
    'LT':[[/toxina|ETEC|termolábil|cólera|diarr/i,'toxina termolábil']],
    'BGNNF':'bacilo Gram-negativo não fermentador','BGN':'bacilo Gram-negativo','LPS':'lipopolissacarídeo',
    'ITU':'infecção do trato urinário','ITUs':'infecções do trato urinário','IRAS':'infecção relacionada à assistência à saúde',
    'IPCS':'infecção primária da corrente sanguínea','ISC':'infecção de sítio cirúrgico','CCIH':'Comissão de Controle de Infecção Hospitalar',
    'TSST-1':'toxina 1 da síndrome do choque tóxico',
    'SST':[[/choque|tóxic|TSST|estafilo|tampão/i,'síndrome do choque tóxico'],[/somatost|hormônio|octreot|gastrina|\bGH\b|secreção/i,'somatostatina']],
    'SMX-TMP':'sulfametoxazol + trimetoprim','PABA':'ácido para-aminobenzoico',
    'PCM':'paracoccidioidomicose','KOH':'hidróxido de potássio (exame direto para fungos)','SQLE':'esqualeno epoxidase (alvo da terbinafina)',
    'LCR':'líquido cefalorraquidiano (liquor)',
    'CAPA':[[/aspergil|COVID|pulmon|fúng|\bUTI\b/i,'aspergilose pulmonar associada à COVID-19']],
    'EBGA':'estreptococo beta-hemolítico do grupo A (S. pyogenes)','EGB':'estreptococo do grupo B (S. agalactiae)','GBS':'estreptococo do grupo B (S. agalactiae)',
    'GNDA':'glomerulonefrite difusa aguda',
    'ESKAPE':'bactérias hospitalares multirresistentes: Enterococcus, S. aureus, Klebsiella, Acinetobacter, Pseudomonas e Enterobacter',
    'ESKAPEE':'bactérias hospitalares multirresistentes: Enterococcus, S. aureus, Klebsiella, Acinetobacter, Pseudomonas, Enterobacter e E. coli',
    'MIC':'concentração inibitória mínima','CIM':'concentração inibitória mínima',
    'NAG':'N-acetilglicosamina','NAM':'ácido N-acetilmurâmico',
    'COVID-19':'doença causada pelo coronavírus SARS-CoV-2','SARS-CoV-2':'coronavírus da síndrome respiratória aguda grave 2 (causa a COVID-19)',
    'CDC':'Centros de Controle e Prevenção de Doenças (EUA)','ANVISA':'Agência Nacional de Vigilância Sanitária',
    'FDA':'agência reguladora de medicamentos dos EUA (Food and Drug Administration)',

    /* ---------- imagem ---------- */
    'USG':'ultrassonografia','US':'ultrassom','RM':'ressonância magnética','PET-CT':'tomografia por emissão de pósitrons com TC',
    'POCUS':'ultrassom à beira-leito (point-of-care)','FAST':[[/trauma|ultrass|\bUSG\b|líquido livre|abdome/i,'ultrassom focado no trauma (Focused Assessment with Sonography for Trauma)'],[/AVC|face|braço|fala|SAMU/i,'sinais de AVC: face, braço, fala e tempo']],
    'HNF':'hiperplasia nodular focal','UH':'unidades Hounsfield (densidade na TC)','HU':'unidades Hounsfield (densidade na TC)',
    'ICT':'índice cardiotorácico','REED':'radiografia contrastada de esôfago, estômago e duodeno',
    'AP':[[/diâmetro/i,'anteroposterior (da frente para trás)'],[X_RX,'incidência anteroposterior (o raio entra pela frente e sai pelas costas)']],
    'TCE':'traumatismo cranioencefálico','BI-RADS':'sistema de laudo da mama (Breast Imaging Reporting and Data System)',

    /* ---------- semiologia ---------- */
    'EIC':'espaço intercostal','EIC2':'segundo espaço intercostal','EIE':'espaço intercostal esquerdo',
    'LHC':'linha hemiclavicular','LH':[[/linha|clavic|ictus|intercost/i,'linha hemiclavicular'],[/ovul|hormôn|\bFSH\b|testost|gonad/i,'hormônio luteinizante']],
    'GH':'hormônio do crescimento','FSH':'hormônio folículo-estimulante',
    'QP':'queixa principal','HMA':'história da moléstia atual','HPP':'história patológica pregressa','HF':'história familiar','HV':'hábitos de vida',
    'HSC':'história social e condições socioculturais','ISDA':'interrogatório sobre os diversos aparelhos',
    'HS':[[/fuma|bebe|álcool|tabag|hábito|social/i,'hábitos sociais']],
    'RS':[[X_ANAM,'revisão de sistemas'],[/ECG|ritmo|onda P/i,'ritmo sinusal']],
    'IS':[[X_ANAM,'interrogatório sintomatológico']],
    'AF':[[X_ANAM,'antecedentes familiares']],
    'ID':[[X_VIA,'intradérmica'],[/anamnese|identifica|nome|idade|\bQP\b/i,'identificação']],
    'BEG':'bom estado geral','MEG':'mau estado geral','NDN':'nada digno de nota',
    'REG':[[/estado geral|\bBEG\b|\bMEG\b|corad|hidratad|ectoscop|exame físico/i,'regular estado geral']],
    'DPN':[[/dispneia|noturna|ortopneia|\bIC\b|congest/i,'dispneia paroxística noturna'],[/neuropat|diabét|pé|monofil|sensib/i,'polineuropatia diabética periférica']],
    'ACV':'aparelho cardiovascular','TEC':'tempo de enchimento capilar','TJ':'turgência jugular',
    'MRC':'escala de força muscular do Medical Research Council (graus 0 a 5)',

    /* ---------- farmacologia ---------- */
    'ACh':'acetilcolina','AChE':'acetilcolinesterase','ChAT':'colina acetiltransferase',
    'AMPc':'AMP cíclico (monofosfato cíclico de adenosina)','cAMP':'AMP cíclico (monofosfato cíclico de adenosina)',
    'GMPc':'GMP cíclico (monofosfato cíclico de guanosina)','cGMP':'GMP cíclico (monofosfato cíclico de guanosina)',
    'ATP':'trifosfato de adenosina','ADP':'difosfato de adenosina','AMP':'monofosfato de adenosina','GTP':'trifosfato de guanosina','GDP':'difosfato de guanosina',
    'PKA':'proteína quinase A','PKC':'proteína quinase C','PKG':'proteína quinase G','PLC':'fosfolipase C','PLA2':'fosfolipase A2',
    'IP3':'inositol trifosfato (libera cálcio do retículo)','PIP2':'fosfatidilinositol bifosfato','PI3K':'fosfoinositídeo 3-quinase','AKT':'proteína quinase B (AKT)',
    'AC':[[/adenil|AMPc|cAMP|\bGs\b|ciclase/i,'adenilil ciclase']],
    'CaM':'calmodulina','MLCK':'cinase da cadeia leve da miosina','MAPK':'proteína quinase ativada por mitógeno','JAK':'Janus quinase','STAT':'transdutor de sinal e ativador da transcrição',
    'GPCR':'receptor acoplado à proteína G','GPCRs':'receptores acoplados à proteína G','GRK':'quinase do receptor acoplado à proteína G (dessensibiliza o receptor)',
    'AAS':'ácido acetilsalicílico',
    'NKCC2':'cotransportador Na-K-2Cl (alvo da furosemida, na alça de Henle)','NCC':'cotransportador Na-Cl (alvo dos tiazídicos, no túbulo distal)',
    'ENaC':'canal epitelial de sódio (alvo da amilorida)','SGLT2':'cotransportador sódio-glicose 2 (alvo das glifozinas)','SGLT1':'cotransportador sódio-glicose 1 (absorve glicose no intestino)',
    'PCSK9':'enzima que degrada o receptor de LDL (alvo de anticorpos que baixam o LDL)',
    'HMG-CoA':'hidroximetilglutaril-coenzima A (a HMG-CoA redutase é o alvo das estatinas)',
    'NPC1L1':'transportador intestinal de colesterol (alvo da ezetimiba)','LPL':'lipase lipoproteica',
    'MTP':'proteína microssomal de transferência de triglicerídeos (alvo da lomitapida)',
    'PPAR':'receptor ativado por proliferadores de peroxissomos (alvo dos fibratos e das glitazonas)',
    'PGI2':'prostaciclina (vasodilata e inibe as plaquetas)','PGE2':'prostaglandina E2','PGD2':'prostaglandina D2','PGH2':'prostaglandina H2',
    'PGE1':'prostaglandina E1','PGs':'prostaglandinas','TXA2':'tromboxano A2 (agrega plaquetas e contrai vasos)',
    'LTB4':'leucotrieno B4','LTC4':'leucotrieno C4','LTD4':'leucotrieno D4','LTE4':'leucotrieno E4',
    'CysLT':'leucotrienos cisteinílicos','CisLT':'leucotrienos cisteinílicos',
    'ET-1':'endotelina-1','ETA':'receptor A da endotelina','ETB':'receptor B da endotelina','ET-A':'receptor A da endotelina','ET-B':'receptor B da endotelina',
    'ECE':'enzima conversora de endotelina','EDHF':'fator hiperpolarizante derivado do endotélio',
    'NO':[[/nítric|vasodila|endotél|GMPc|cGMP|sintase|\bNOS|guanil|nitrat|nitrogl|arginina/i,'óxido nítrico']],
    'NOS':'óxido nítrico sintase','NOS1':'óxido nítrico sintase neuronal','NOS2':'óxido nítrico sintase induzível','NOS3':'óxido nítrico sintase endotelial',
    'eNOS':'óxido nítrico sintase endotelial','iNOS':'óxido nítrico sintase induzível','nNOS':'óxido nítrico sintase neuronal',
    'L-NAME':'inibidor da óxido nítrico sintase (usado em experimentos)','sGC':'guanilil ciclase solúvel',
    'PDE':'fosfodiesterase','PDE3':'fosfodiesterase 3','PDE4':'fosfodiesterase 4','PDE5':'fosfodiesterase 5 (alvo da sildenafila)',
    'HCl':'ácido clorídrico','HCO3':'bicarbonato','KCl':'cloreto de potássio',
    'NMDA':'receptor de glutamato do tipo NMDA','AMPA':'receptor de glutamato do tipo AMPA','GABA':'ácido gama-aminobutírico (principal inibidor do SNC)','GABA-A':'receptor GABA-A (canal de cloreto)',
    'CYP':'citocromo P450','CYPs':'enzimas do citocromo P450','CYP3A4':'enzima do citocromo P450 que metaboliza a maioria dos fármacos',
    'CYP2D6':'enzima do citocromo P450 2D6','CYP2C9':'enzima do citocromo P450 2C9 (varfarina)','CYP2C19':'enzima do citocromo P450 2C19 (ativa o clopidogrel)','CYP1A2':'enzima do citocromo P450 1A2',
    'OAT':'transportador de ânions orgânicos','OCT':'transportador de cátions orgânicos','OCT1':'transportador de cátions orgânicos 1',
    'MAO':'monoamina oxidase','IMAO':'inibidor da monoamina oxidase','COMT':'catecol-O-metiltransferase',
    'NET':'transportador de noradrenalina (alvo da cocaína e dos antidepressivos)','VMAT':'transportador vesicular de monoaminas (alvo da reserpina)',
    'NA':[[/noradren|adren|simpát|receptor|\bNET\b|\bMAO\b|\bCOMT\b|VMAT|varicos/i,'noradrenalina']],
    'NE':[[/noradren|norepinef|adren|simpát|receptor|\bNET\b|\bMAO\b|\bCOMT\b|VMAT/i,'norepinefrina (noradrenalina)']],
    'PNMT':'enzima que transforma noradrenalina em adrenalina','DOPA':'di-hidroxifenilalanina (precursor da dopamina)','L-DOPA':'levodopa',
    'VMA':'ácido vanilmandélico (metabólito urinário das catecolaminas)','MHPG':'metabólito da noradrenalina no SNC',
    'SNARE':'proteínas que fundem a vesícula à membrana (alvo da toxina botulínica)','SNAREs':'proteínas que fundem a vesícula à membrana (alvo da toxina botulínica)',
    'TRPV1':'receptor da capsaicina e do calor','TRPM8':'receptor do frio e do mentol','TRPA1':'receptor de substâncias irritantes',
    'ASIC':'canal iônico sensível a ácido','P2X':'receptor de ATP (canal iônico)','P2Y':'receptor de ATP/ADP acoplado à proteína G','P2Y12':'receptor de ADP das plaquetas (alvo do clopidogrel)',
    'NGF':'fator de crescimento neural','CGRP':'peptídeo relacionado ao gene da calcitonina',
    'SP':[[/substância|nocicep|\bdor\b|\bNK/i,'substância P']],
    'IASP':'Associação Internacional para o Estudo da Dor','TENS':'estimulação elétrica nervosa transcutânea',
    'PAG':'substância cinzenta periaquedutal','RVM':'bulbo rostral ventromedial','NOP':'receptor da nociceptina (opioide atípico)',
    'CB1':'receptor canabinoide 1','CB2':'receptor canabinoide 2','CBD':'canabidiol','THC':'tetra-hidrocanabinol',
    'ZGQ':'zona de gatilho quimiorreceptora','NTS':'núcleo do trato solitário','BHE':'barreira hematoencefálica',
    '5-HT':'serotonina (5-hidroxitriptamina)','5-HT3':'receptor de serotonina tipo 3 (alvo da ondansetrona)','5-HT4':'receptor de serotonina tipo 4 (procinéticos)',
    'D2':[[/vitamina|ergocalc/i,'vitamina D2 (ergocalciferol)'],'receptor de dopamina tipo 2'],'H1':'receptor de histamina tipo 1','H2':'receptor de histamina tipo 2',
    'ADME':'absorção, distribuição, metabolismo e excreção','ASC':'área sob a curva (exposição total ao fármaco)','AUC':'área sob a curva (exposição total ao fármaco)',
    'Vd':'volume de distribuição','Kd':'constante de dissociação (quanto menor, maior a afinidade)',
    'CL':[[/depura|clearance|t½|meia-vida|\bVd\b|dose|manutenção/i,'clearance (depuração)']],
    'CE50':'concentração que produz 50% do efeito máximo','CI50':'concentração que inibe 50% da resposta',
    'DE50':'dose efetiva em 50% dos indivíduos','DL50':'dose letal em 50% dos indivíduos',
    'CEM':[[/ética|código|conselho|\bCFM\b|\bCRM\b|artigo|sigilo/i,'Código de Ética Médica'],[/concentra|efeito|resposta|curva|tóxic|adversa/i,'concentração efetiva mínima']],
    'ASI':'atividade simpaticomimética intrínseca','JG':'células justaglomerulares (liberam renina)',
    'DHP':'di-hidropiridinas (bloqueadores de canal de cálcio vasculares, como o anlodipino)',
    'K-ATP':'canal de potássio sensível a ATP','SUR1':'subunidade do canal K-ATP (alvo das sulfonilureias)','GIRK':'canal de potássio acoplado à proteína G',
    'GLP-1':'peptídeo semelhante ao glucagon 1 (incretina)','GIP':'peptídeo insulinotrópico dependente de glicose (incretina)','DPP-4':'dipeptidil peptidase 4 (degrada as incretinas)',
    'HDAC':'histona desacetilase','HDAC2':'histona desacetilase 2 (recrutada pelo corticoide)',
    'GR':[[/glicocort|cortic|núcleo|HDAC|dexamet|predniso/i,'receptor de glicocorticoide']],
    'EMBP':'proteína básica principal do eosinófilo','ECP':[[/eosin/i,'proteína catiônica eosinofílica']],
    'SERM':'modulador seletivo do receptor de estrogênio','NAC':'N-acetilcisteína (antídoto do paracetamol)','NAPQI':'metabólito tóxico do paracetamol',
    'CCK':'colecistocinina','VIP':[[/vacina|pólio|\bVOP\b|reforço|meses|calendário|dose/i,'vacina inativada contra a poliomielite'],[/peptídeo|intestin|vasoativ|secreção|neurônio|\bSNE\b|VIPoma/i,'peptídeo intestinal vasoativo']],
    'SL':[[/\bvia|comprimid|nitrat|isossorbida|captopril|nitroglic/i,'sublingual']],
    'SC':[[X_VIA,'subcutânea']],'VO':'via oral','EV':[[X_VIA,'via endovenosa']],

    /* ---------- vacinas e pediatria ---------- */
    'SCR':'vacina tríplice viral (sarampo, caxumba e rubéola)','SCRV':'vacina tetraviral (sarampo, caxumba, rubéola e varicela)',
    'DTP':'vacina tríplice bacteriana (difteria, tétano e coqueluche)','VOP':'vacina oral contra a poliomielite',
    'ACWY':'vacina meningocócica contra os sorogrupos A, C, W e Y',
    'HB':[[/vacina|hepatite|Hib|penta|\bDTP\b/i,'vacina contra a hepatite B']],
    'PNI':'Programa Nacional de Imunizações','CRIE':'Centros de Referência para Imunobiológicos Especiais',
    'ESAVI':'evento supostamente atribuível à vacinação ou imunização','SRO':'sais de reidratação oral',
    'G-CSF':'fator estimulador de colônias de granulócitos','TPMT':'tiopurina metiltransferase',
    'DMT1':'transportador de metal divalente 1 (absorve ferro no duodeno)','THF':'tetra-hidrofolato',
    'USPSTF':'força-tarefa de prevenção dos EUA (U.S. Preventive Services Task Force)','AHA':'American Heart Association',

    /* ---------- saúde coletiva, ética e humanização ---------- */
    'SUS':'Sistema Único de Saúde','APS':'atenção primária à saúde','ESF':'Estratégia Saúde da Família','NASF':'Núcleo Ampliado de Saúde da Família',
    'ACS':[[/comunit|agente|\bUBS\b|\bESF\b|territ|visita|equipe/i,'agente comunitário de saúde']],
    'MS':[[/Portaria|Ministério|\bGM\b|nota técnica|calendário|protocolo|diretriz/i,'Ministério da Saúde']],
    'GM':[[/Portaria/i,'Gabinete do Ministro']],
    'SINAN':'Sistema de Informação de Agravos de Notificação','SINASC':'Sistema de Informações sobre Nascidos Vivos',
    'SIM':[[/mortalid|óbito|SINASC|SINAN|declaração|sistema de inform/i,'Sistema de Informações sobre Mortalidade']],
    'SIH':'Sistema de Informações Hospitalares','SIH-SUS':'Sistema de Informações Hospitalares do SUS','SIVEP':'Sistema de Informação de Vigilância Epidemiológica',
    'DCNT':'doença crônica não transmissível','DCNTs':'doenças crônicas não transmissíveis','INCA':'Instituto Nacional de Câncer',
    'VISAT':'Vigilância em Saúde do Trabalhador','CRAS':'Centro de Referência de Assistência Social','CREAS':'Centro de Referência Especializado de Assistência Social',
    'TEPT':'transtorno de estresse pós-traumático',
    'CID':[[/coagula|fibrin|plaqueta|D-dímero|sangramento/i,'coagulação intravascular disseminada'],'Classificação Internacional de Doenças'],
    'CID-10':'Classificação Internacional de Doenças, 10ª revisão',
    'OR':[[/chances|odds|risco|caso-controle|\bIC\b|exposi/i,'odds ratio (razão de chances)']],
    'NNT':'número necessário para tratar','RAR':'redução absoluta do risco','RRR':'redução relativa do risco',
    'CRM':'Conselho Regional de Medicina','CFM':'Conselho Federal de Medicina','IML':'Instituto Médico Legal','SVO':'Serviço de Verificação de Óbito',
    'DO':[[/óbito|declaração|atestado|cartório|morte|fetal/i,'declaração de óbito']],
    'DNV':'declaração de nascido vivo','LGPD':'Lei Geral de Proteção de Dados','TCLE':'termo de consentimento livre e esclarecido',
    'PNH':[[/hemólise|hemoglobinúria|CD55|CD59|eculizumab/i,'hemoglobinúria paroxística noturna'],[/humaniz|polític|\bSUS\b|acolhim|cogestão|clínica ampliada|ambiência/i,'Política Nacional de Humanização']],
    'CNV':'comunicação não violenta',
    'CP':[[/paliativ|dor total|terminal|fim de vida|sofrimento/i,'cuidados paliativos']],
    'PTS':[[/projeto|terapêutic|singular|equipe|clínica ampliada|matricial/i,'Projeto Terapêutico Singular']],
    'CR':[[/classificação de risco|acolhim/i,'classificação de risco']],
    'SBAR':'passagem de caso em 4 partes: Situação, Breve histórico, Avaliação e Recomendação',
    'SPIKES':'protocolo de 6 passos para comunicar más notícias',

    /* só valem com o índice embaixo (PGI₂, TXA₂, PaCO₂, AT₁, CE₅₀...): sozinhas ficam sem balão */
    'PGI':null,'PGE':null,'PGD':null,'PGH':null,'TXA':null,'LTB':null,'LTC':null,'LTD':null,'LTE':null,'PLA':null,'PIP':null,
    'PaO':null,'PaCO':null,'SpO':null,'HCO':null,'VEF':null,'CB':null,'AT':null,'CE':null,'DE':null,'DL':null
  };

  /* o que muda em cada matéria (chave = data-vidro do master) */
  var MAT = {
    lab:   { 'FA':[[X_FIG,'fosfatase alcalina'],[X_FA,'fibrilação atrial'],'fosfatase alcalina'] },
    img:   { 'FA':[[X_FIG,'fosfatase alcalina'],[X_FA,'fibrilação atrial'],'fosfatase alcalina'],
             'PA':[[/mmHg|\bPA\s*(de\s*)?\d+\s*[x×\/]|pressão arterial|hipertens|hipotens/i,'pressão arterial'],'incidência posteroanterior (o raio entra pelas costas e sai pela frente)'],
             'AP':[[/diâmetro/i,'anteroposterior (da frente para trás)'],'incidência anteroposterior (o raio entra pela frente e sai pelas costas)'] },
    semio: { 'FA':[[X_FA,'fibrilação atrial'],[X_FIG,'fosfatase alcalina'],'fibrilação atrial'],
             'AE':[[/átrio|VE|AD|mitral|dilata|sobrecarga|ECG|onda P/i,'átrio esquerdo'],'anamnese especial (revisão de sistemas)'],
             'AR':[[/reumat|anti-CCP|fator reumat/i,'artrite reumatoide'],'aparelho respiratório'], 'AP':'antecedentes pessoais (história patológica pregressa)',
             'AF':'antecedentes familiares (história familiar)', 'EM':'estenose mitral', 'IM':[[X_VIA,'intramuscular'],'insuficiência mitral'],
             'FP':[[X_TEST,'falso-positivo'],'frequência de pulso'], 'IS':'interrogatório sintomatológico (revisão de sistemas)' },
    dic:   { 'FA':[[X_FA,'fibrilação atrial'],[X_FIG,'fosfatase alcalina'],'fibrilação atrial'], 'EM':[[X_VIA,null],'estenose mitral'] },
    pato:  { 'DA':[[/dopamin|levodopa|Parkinson/i,'dopamina'],'artéria descendente anterior'] },
    farmaco: { 'NO':'óxido nítrico', 'CEM':'concentração efetiva mínima', 'PAF':[[/polipose|adenoma|cólon/i,'polipose adenomatosa familiar'],'fator ativador de plaquetas'],
             'AE':[[/HCO|Cl−|cloreto|bicarbonato|antiporte|trocador/i,'trocador de ânions (troca Cl− por HCO3−)'],[/átrio|\bVE\b|mitral|ECG/i,'átrio esquerdo']],
             'EP':[[/PGE|prostaglandina|receptor/i,'receptor EP (da prostaglandina E)'],[X_VAL,'estenose pulmonar']],
             'IP':[[/PGI|prostaciclina|receptor/i,'receptor IP (da prostaciclina)'],[X_VAL,'insuficiência pulmonar']],
             'TP':[[/TXA|tromboxano|receptor/i,'receptor TP (do tromboxano)'],[/protromb|coagul|INR|varfarina/i,'tempo de protrombina']],
             'BK':[[/bradicinin|receptor/i,'bradicinina (receptores BK = receptores da bradicinina)'],[/tuberc|bacilo|Koch/i,'bacilo de Koch']], 'NA':[[/sódio|\bNa\+/i,null],'noradrenalina'], 'NE':'norepinefrina (noradrenalina)',
             'IM':[[X_VAL,'insuficiência mitral'],'intramuscular'], 'SST':'somatostatina', 'PG':'prostaglandina',
             'B2':[[/bradicinin/i,'receptor B2 da bradicinina'],[/bulha|ausculta|sopro/i,'segunda bulha cardíaca']],
             'DA':[[/coronár|artéria|infarto|\bIAM\b/i,'artéria descendente anterior'],'dopamina'] },
    micro: { 'SST':'síndrome do choque tóxico', 'IM':[[X_VAL,'insuficiência mitral'],'intramuscular'], 'VRE':'Enterococcus resistente à vancomicina' },
    huma:  { 'PNH':'Política Nacional de Humanização', 'CP':'cuidados paliativos', 'PTS':'Projeto Terapêutico Singular', 'TO':'terapeuta ocupacional' },
    port:  { 'PCR':[[/RNA|DNA|viral|molecular|swab/i,'reação em cadeia da polimerase (teste molecular)'],'parada cardiorrespiratória'], 'SA':[[/sumário|alta/i,'Sumário de Alta']], 'DN':[[/nascid|declaração/i,'declaração de nascido vivo']] },
    prev:  { 'SIM':'Sistema de Informações sobre Mortalidade' }
  };
  var IL = /^IL-(\d+)$/;
  var MATK = MAT[document.documentElement.dataset.vidro] || {};

  function existe(k){ return Object.prototype.hasOwnProperty.call(MATK, k) || Object.prototype.hasOwnProperty.call(SIG, k); }
  var todas = Object.keys(SIG).concat(Object.keys(MATK).filter(function(k){ return !Object.prototype.hasOwnProperty.call(SIG, k); }));
  var keys = todas.sort(function(a,b){return b.length-a.length});
  var esc = function(s){return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')};
  var LETRA = '0-9A-Za-zÀ-ÿ_';
  var RE = new RegExp('(^|[^' + LETRA + '-])(' + keys.map(esc).join('|') + '|IL-\\d{1,2})(?![' + LETRA + '])', 'g');
  var SUBS = '₀₁₂₃₄₅₆₇₈₉';
  /* questões (de capítulo, quiz, arena, banco, simulado, flashcard, revisão) ficam sem balão: enunciado, alternativas e
     justificativa. Cada master chama a caixa da questão de um jeito; master novo com outro nome entra aqui. */
  var QUESTAO = '.q,.qs,.qh,.qblock,.qcard,.qbank,.qb,.qset,.bk,.wg,.qzone,.quiz,.quiz-item,.mcq,.stem,.q-stem,.qenun,.qcmd,.qcom,.qfb,.qfoot,.qimgs,' +
             '.q-why,.q-verdict,.pv-box,.pv-item,.pv-just,.transcription,.gabrev,.opt,.opts,.alt,.alts,.option,.lx-opts,.rl-opts,.wopts,' +
             '.dq,.model,.ai-out,.gabarito,article.d,.prose:has(.q-source),' +
             '.vgsim,.vgfc,.rx-q,.rx-rep,.arena,[class*="arena"],[data-sim]';
  var PULA = 'script,style,svg,button,select,textarea,input,code,pre,abbr,a,kbd,.vg-sg,.q-source,.q-num,.opt-letter,nav,aside,header,' +
             '.sidebar,.nav,.toc,.mc-chip,#mc-tooltip,.vg-sgtip,#vg-abas,#vg-lista,#vg-busca,#vg-ajustes,#vg-canto,.vg-n-ui,[contenteditable],[data-nosiglas],' + QUESTAO;
  var BLOCO = 'p,li,td,th,dd,dt,figcaption,blockquote,h1,h2,h3,h4,h5,.opt-text,.q-stem,div';

  function semAcento(s){ return s.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase(); }
  function significado(k, blocoTxt){
    var m = IL.exec(k); if (m) return 'interleucina ' + m[1];
    var v = Object.prototype.hasOwnProperty.call(MATK, k) ? MATK[k] : SIG[k];
    if (v == null) return null;
    if (typeof v === 'string') return v;
    for (var i = 0; i < v.length; i++){
      var x = v[i];
      if (Array.isArray(x)){ if (x[0].test(blocoTxt)) return x[1]; }
      else return x;
    }
    return null;
  }
  /* o parágrafo já explica? (o nome por extenso aparece nele, sem acento, sem maiúsculas e sem hífen) */
  function explicado(sig, blocoTxt){
    var base = semAcento(sig.replace(/\s*[(:].*$/,'').replace(/[“”"]/g,''));
    var palavras = base.split(/[\s,-]+/).filter(function(w){return w.length > 3});
    if (!palavras.length) return false;
    var alvo = palavras.slice(0, Math.min(2, palavras.length)).join('');
    return semAcento(blocoTxt).replace(/[^a-z0-9]/g,'').indexOf(alvo) >= 0;
  }
  /* texto todo em maiúsculas ("CORRETA EM PARTE, MAS INCORRETA"): as palavras não são siglas */
  function gritado(txt){
    var n = 0, ws = txt.split(/[^A-Za-zÀ-ÿ]+/);
    for (var i = 0; i < ws.length; i++){
      var w = ws[i];
      if (w.length >= 4 && w === w.toUpperCase() && w !== w.toLowerCase() && !existe(w) && ++n >= 2) return true;
    }
    return false;
  }
  var NUM = function(s){ return s.replace(/[₀-₉]/g, function(c){ return SUBS.indexOf(c); }); };

  var cacheTxt = new WeakMap();
  function textoBloco(el){
    var t = cacheTxt.get(el);
    if (t === undefined){ t = (el.textContent || '').slice(0, 1500); cacheTxt.set(el, t); }
    return t;
  }

  var vistos = new WeakSet();   /* textos já olhados (e os pedaços que sobram depois de marcar): não refaz */
  function marca(no){
    if (!no.parentElement || vistos.has(no)) return;
    vistos.add(no);
    var bloco = no.parentElement.closest(BLOCO) || no.parentElement;
    var btxt = textoBloco(bloco);
    if (/\bsigla|abreviaç|abreviatura/i.test(btxt)) return;        /* questão sobre a sigla: o balão daria a resposta */
    var txt = no.data;
    if (gritado(txt)) return;
    var out = document.createDocumentFragment(), last = 0, mudou = false, m;
    RE.lastIndex = 0;
    while ((m = RE.exec(txt))){
      var ini = m.index + m[1].length, k = m[2], fim = ini + k.length, sig;
      var depois = txt.slice(fim, fim + 3), antes = txt.slice(Math.max(0, ini - 1), ini);
      /* índice embaixo: "IP₃", "CO₂", ou <sub>3</sub> logo depois */
      var sub = new RegExp('^[' + SUBS + ']+').exec(txt.slice(fim));
      var subEl = (!sub && fim === txt.length && no.nextSibling && /^SUB$/.test(no.nextSibling.nodeName)) ? (no.nextSibling.textContent || '').trim() : '';
      if (sub || /^\d+$/.test(subEl)){
        var kk = k + (sub ? NUM(sub[0]) : subEl);
        if (!existe(kk)) continue;                                   /* "CE₅₀" sem CE50 no dicionário: não chuta */
        sig = significado(kk, btxt);
        if (sub) fim += sub[0].length;
      } else if (subEl) continue;
      else sig = significado(k, btxt);
      if (!sig) continue;
      if (/^\s?\(\s*[A-Za-zÀ-ÿ][a-zà-ÿ]/.test(txt.slice(fim, fim + 5))) continue;   /* "TEP (tromboembolismo...)"; "CBP (AMA)" segue */
      if (antes === '(' && txt.charAt(fim) === ')') continue;        /* "tromboembolismo pulmonar (TEP)" */
      if (explicado(sig, btxt)) continue;                            /* o parágrafo já diz o nome */
      out.appendChild(pedaco(txt.slice(last, ini)));
      var ab = document.createElement('abbr');
      ab.className = 'vg-sg'; ab.textContent = txt.slice(ini, fim); ab.dataset.sg = sig; ab.tabIndex = 0;
      ab.setAttribute('aria-label', ab.textContent + ': ' + sig);
      out.appendChild(ab); last = fim; mudou = true;
      RE.lastIndex = fim;
    }
    if (!mudou) return;
    out.appendChild(pedaco(txt.slice(last)));
    no.parentNode.replaceChild(out, no);
  }
  function pedaco(s){ var t = document.createTextNode(s); vistos.add(t); return t; }

  /* acha os textos com sigla e marca aos poucos, sem travar a página (masters grandes, celular) */
  var pend = [], rodando = false;
  /* Safari não tem requestIdleCallback: fatias de ~12 ms */
  var ocioso = window.requestIdleCallback || function(f){ return setTimeout(function(){ var t0 = performance.now(); f({ timeRemaining: function(){ return 12 - (performance.now() - t0); } }); }, 30); };
  function processa(raiz){
    if (!raiz || !raiz.ownerDocument) return;
    if (raiz.nodeType === 1 && raiz.closest(PULA)) return;
    var w = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT, { acceptNode: function(n){
      var p = n.parentElement;
      if (!p || vistos.has(n) || p.closest(PULA)) return NodeFilter.FILTER_REJECT;
      RE.lastIndex = 0;
      return RE.test(n.data) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
    }});
    pend.push(w);
    if (!rodando){ rodando = true; ocioso(trabalha); }
  }
  /* o próximo texto é lido antes de marcar o atual: marcar troca o nó, e o walker não pode estar nele */
  function passo(w){
    var n = w.prox !== undefined ? w.prox : w.nextNode();
    w.prox = n ? w.nextNode() : null;
    return n;
  }
  function trabalha(prazo){
    var feitos = 0;
    while (pend.length && (feitos < 60 || prazo.timeRemaining() > 2)){
      var no = passo(pend[0]); feitos++;
      if (!no){ pend.shift(); continue; }
      if (no.isConnected) try { marca(no); } catch (e) {}
    }
    if (pend.length) ocioso(trabalha); else { rodando = false; cacheTxt = new WeakMap(); }
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

  /* ---------- aplica agora e no conteúdo que os masters montam depois (abas, segmentos, questões) ---------- */
  var fila = [], marcado = false;
  function agenda(n){
    fila.push(n);
    if (marcado) return; marcado = true;
    setTimeout(function(){
      marcado = false; var lote = fila.splice(0);
      lote.forEach(function(no){ if (no.isConnected) processa(no); });
    }, 60);
  }
  function inicia(){
    processa(document.body);
    new MutationObserver(function(ms){
      ms.forEach(function(m){
        m.addedNodes.forEach(function(no){
          if (no.nodeType === 1){ if (!no.closest('abbr.vg-sg,.vg-sgtip,#mc-tooltip')) agenda(no); }
          else if (no.nodeType === 3 && no.parentElement && !no.parentElement.closest('abbr.vg-sg')) agenda(no.parentElement);
        });
      });
    }).observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', inicia); else inicia();
})();
