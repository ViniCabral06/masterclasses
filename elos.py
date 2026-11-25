"""🔗 Ligações entre matérias: monta _tema/elos.json, que o _tema/elos.js lê nos masters.

Como funciona
  1. Corpus: o texto de cada segmento de cada master, sem as questões, em _elos/corpus/<chave>.json
     (local, fica fora do Git). É coletado no navegador, com o site rodando em localhost:
         python elos.py --js        imprime o código para colar no console de cada master
  2. Conceitos (C, abaixo): rótulo e sinônimos em regex sobre o texto sem acento.
     Sinônimo que começa com "=" diferencia maiúsculas (ex.: "=\bFA\b").
  3. Regras: em cada matéria, a "casa" de um conceito é o segmento que mais o explica (CASA corrige à mão;
     SEM_CASA e SEM_ORIGEM tiram matérias onde a palavra tem outro sentido).
     Um segmento ganha 🔗 quando cita o conceito (2+ vezes, no título, ou é a casa) e outra matéria o explica de verdade.
     Até 4 🔗 por segmento; até 3 segmentos de uma matéria para o mesmo conceito × destino.
  4. Descrições: uma por conceito × matéria de destino, escritas a partir do segmento-casa do destino.
     Ficam no próprio _tema/elos.json (campo "d"); as novas entram em _elos/descricoes.json.

Uso
     python elos.py                 recalcula as ligações e grava _tema/elos.json (mantém as descrições que já existem)
     python elos.py --faltam        lista os pares sem descrição e grava os trechos em _elos/trechos.txt
     python elos.py --js            código de coleta do corpus
Depois, python publicar.py publica (o elos.json vai junto com o tema).
"""
import json, os, re, sys, unicodedata, collections

ROOT = os.path.dirname(os.path.abspath(__file__))
CORPUS = os.path.join(ROOT, "_elos", "corpus")
SAIDA = os.path.join(ROOT, "_tema", "elos.json")
NOVAS = os.path.join(ROOT, "_elos", "descricoes.json")
ORD = ["micro", "pato", "farmaco", "lab", "img", "semio", "prev", "dic"]   # conteúdo clínico + Preventiva (epidemiologia)
MATS = {
    "micro": ["Microbiologia", "Microbiologia/Microbiologia.html", "🦠"],
    "pato": ["Patologia", "Patologia médica/Patologia_I_Masterclass.html", "🔬"],
    "farmaco": ["Farmacologia", "Farmacologia/Farmacologia_4o período completo.html", "💊"],
    "lab": ["Propedêutica Laboratorial", "Propedêutica laboratorial/Propedeutica_Laboratorial_Masterclass.html", "🧪"],
    "img": ["Propedêutica de Imagem", "Propedêutica de imagem/Propedeutica_Imagem_Masterclass.html", "🩻"],
    "semio": ["Semiologia", "Semiologia/Semiologia.html", "🩺"],
    "prev": ["Medicina Preventiva", "Medicina preventiva/Medicina_Preventiva_Masterclass.html", "🛡️"],
    "dic": ["DIC IV", "DIC IV/DIC_IV_Masterclass.html", "🛏️"],
}
FORA = re.compile(r"(^|/)(quiz|kquiz|mquiz|nquiz|pquiz|rquiz|dquiz|uquiz|gquiz|lquiz|vquiz|arena|disc|osce|capa|home|apendice|pront|pan|cob|mais|revisao|.*-cob|.*-revisao|.*-imagens|k0|m0|n0)$")
MAX_SEG = 4

# Catálogo de conceitos: id -> (rótulo, [regex no texto sem acento e minúsculo; "=" no início = diferencia maiúsculas])
C = {
 # ---------- agentes ----------
 "pyogenes": ("Streptococcus pyogenes", [r"\bs\.? ?pyogenes\b", r"streptococcus pyogenes", r"estreptococo beta[- ]hemolitico do grupo a", r"\bgrupo a de lancefield"]),
 "febre_reumatica": ("Febre reumática", [r"febre reumatica"]),
 "aslo": ("ASLO / antiestreptolisina O", [r"\baslo\b", r"antiestreptolisina"]),
 "s_aureus": ("Staphylococcus aureus", [r"\bs\.? ?aureus\b", r"staphylococcus aureus"]),
 "mrsa": ("MRSA", [r"\bmrsa\b"]),
 "epidermidis": ("S. epidermidis / coagulase-negativos", [r"epidermidis", r"coagulase[- ]negativ"]),
 "saprophyticus": ("S. saprophyticus", [r"saprophyticus"]),
 "pneumococo": ("Streptococcus pneumoniae (pneumococo)", [r"pneumococ", r"s\.? ?pneumoniae", r"streptococcus pneumoniae"]),
 "viridans": ("Estreptococos viridans", [r"\bviridans\b"]),
 "bovis": ("S. bovis / gallolyticus", [r"\bs\.? ?bovis\b", r"gallolyticus"]),
 "agalactiae": ("S. agalactiae (grupo B)", [r"agalactiae", r"estreptococo do grupo b"]),
 "enterococo": ("Enterococcus", [r"enterococ"]),
 "ecoli": ("Escherichia coli", [r"\be\.? ?coli\b", r"escherichia"]),
 "klebsiella": ("Klebsiella", [r"klebsiella"]),
 "proteus": ("Proteus", [r"\bproteus\b"]),
 "salmonella": ("Salmonella", [r"salmonel"]),
 "shigella": ("Shigella", [r"shigel"]),
 "pseudomonas": ("Pseudomonas aeruginosa", [r"pseudomonas"]),
 "candida": ("Candida", [r"\bcandid"]),
 "aspergillus": ("Aspergillus", [r"aspergil"]),
 "mucor": ("Mucormicose", [r"mucor"]),
 "criptococo": ("Cryptococcus", [r"criptococ", r"cryptococ"]),
 "pneumocystis": ("Pneumocystis", [r"pneumocist", r"pneumocyst"]),
 "h_pylori": ("Helicobacter pylori", [r"\bh\.? ?pylori\b", r"helicobacter"]),
 "tb": ("Tuberculose", [r"tubercul", r"\bbk\b", r"mycobacterium"]),
 "hanseniase": ("Hanseníase", [r"hansen"]),
 "chagas": ("Doença de Chagas", [r"chagas", r"trypanosoma", r"tripanossom"]),
 "esquisto": ("Esquistossomose", [r"esquistossom", r"schistosom", r"mansoni"]),
 "parasitoses": ("Parasitoses intestinais", [r"parasitos", r"ascari", r"ancilostom", r"giardi"]),
 "hiv": ("HIV / aids", [r"\bhiv\b", r"\baids\b"]),
 "sifilis": ("Sífilis", [r"sifili", r"treponem", r"\bvdrl\b"]),
 "hepatite_b": ("Hepatite B", [r"hepatite b\b", r"\bhbsag\b", r"\bhbv\b", r"anti-hbs"]),
 "hepatite_c": ("Hepatite C", [r"hepatite c\b", r"\bhcv\b"]),
 "hepatite_a": ("Hepatite A", [r"hepatite a\b", r"\bhav\b"]),
 "hepatites": ("Hepatites virais", [r"hepatites? vira"]),
 "dengue": ("Dengue", [r"\bdengue"]),
 "zika": ("Zika", [r"\bzika"]),
 "chikungunya": ("Chikungunya", [r"chikungunya"]),
 "covid": ("COVID-19", [r"covid", r"sars-cov-2"]),
 "influenza": ("Influenza", [r"influenza", r"\bgripe\b"]),
 "hpv": ("HPV", [r"\bhpv\b", r"papilomav"]),
 "meningite": ("Meningite", [r"meningit"]),
 "meningococo": ("Meningococo", [r"meningococ", r"neisseria meningitidis"]),
 "sarampo": ("Sarampo", [r"sarampo"]),
 "varicela": ("Varicela", [r"varicela"]),
 "itu": ("Infecção urinária (ITU)", [r"=\bITU\b", r"infeccao (do trato )?urinaria", r"\bcistite"]),
 "pielonefrite": ("Pielonefrite", [r"pielonefrit"]),
 "iras": ("IRAS / infecção hospitalar", [r"\biras\b", r"infeccao hospitalar", r"infeccoes relacionadas a assistencia"]),
 "biofilme": ("Biofilme", [r"biofilme"]),
 "gram": ("Coloração de Gram", [r"coloracao de gram", r"\bgram[- ]positiv", r"\bgram[- ]negativ", r"=\bgram ?[+-]", r"bacterioscopia"]),
 "hemocultura": ("Hemocultura", [r"hemocultura"]),
 "urocultura": ("Urocultura", [r"urocultura"]),
 "antibiograma": ("Antibiograma", [r"antibiograma", r"\bcim\b", r"concentracao inibitoria"]),
 "sepse": ("Sepse", [r"\bsepse\b", r"septic"]),
 "endocardite": ("Endocardite infecciosa", [r"endocardite"]),
 "pneumonia": ("Pneumonia", [r"pneumonia"]),
 "abscesso_pulmonar": ("Abscesso pulmonar / empiema", [r"abscesso pulmonar", r"empiema"]),
 # ---------- antimicrobianos ----------
 "betalactamicos": ("Betalactâmicos", [r"betalactam", r"beta-lactam", r"penicilina", r"amoxicilina", r"cefalospor", r"ceftriaxona"]),
 "vancomicina": ("Vancomicina", [r"vancomicina"]),
 "aminoglicosideos": ("Aminoglicosídeos", [r"aminoglicos", r"gentamicina", r"amicacina"]),
 "macrolideos": ("Macrolídeos", [r"macrolid", r"azitromicina", r"claritromicina", r"eritromicina"]),
 "quinolonas": ("Fluoroquinolonas", [r"quinolona", r"ciprofloxacin", r"levofloxacin"]),
 "nitrofurantoina": ("Nitrofurantoína", [r"nitrofurantoina"]),
 "antifungicos": ("Antifúngicos", [r"antifung", r"fluconazol", r"anfotericina", r"\bazois\b", r"voriconazol"]),
 "rifampicina": ("Rifampicina", [r"rifampicina"]),
 "metronidazol": ("Metronidazol", [r"metronidazol"]),
 # ---------- cardiovascular ----------
 "aterosclerose": ("Aterosclerose", [r"ateroscler", r"ateroma", r"aterogen"]),
 "placa_instavel": ("Placa instável", [r"placa instavel", r"placa vulneravel", r"capa fibrosa fina"]),
 "ldl": ("LDL e lipoproteínas", [r"=\bLDL", r"=\bHDL\b", r"=\bVLDL\b", r"lipoproteinas? (plasmaticas|de baixa|de alta|aterogenicas)", r"apolipoprotein", r"\bapob\b"]),
 "estatinas": ("Estatinas", [r"estatina", r"sinvastatina", r"atorvastatina", r"rosuvastatina"]),
 "has": ("Hipertensão arterial sistêmica", [r"hipertensao arterial(?! pulmonar)( sistemica)?", r"=\bHAS\b"]),
 "cardiopatia_hipertensiva": ("Cardiopatia hipertensiva / HVE", [r"cardiopatia hipertensiva", r"hipertrofia (ventricular|concentrica)", r"\bhve\b"]),
 "ieca_bra": ("IECA e BRA", [r"\bieca\b", r"inibidores? da eca", r"captopril", r"enalapril", r"\bbra\b", r"sartana", r"losartana"]),
 "sraa": ("Sistema renina-angiotensina-aldosterona", [r"\bsraa\b", r"renina", r"angiotensina"]),
 "espironolactona": ("Espironolactona / antagonistas da aldosterona", [r"espironolactona", r"antagonistas? da aldosterona", r"eplerenona"]),
 "furosemida": ("Furosemida / diuréticos de alça", [r"furosemida", r"diureticos? de alca"]),
 "tiazidicos": ("Tiazídicos", [r"tiazid", r"hidroclorotiazida", r"clortalidona"]),
 "diureticos": ("Diuréticos", [r"diuretic"]),
 "betabloq": ("Betabloqueadores", [r"betabloq", r"beta-bloq", r"propranolol", r"metoprolol", r"carvedilol", r"atenolol", r"antagonistas? beta"]),
 "bcc": ("Bloqueadores de canal de cálcio", [r"bloqueadores? (dos? )?canais? de ca", r"anlodipin", r"nifedipin", r"verapamil", r"diltiazem"]),
 "nitratos": ("Nitratos", [r"nitrato", r"nitroglicerin", r"isossorbida", r"nitroprussiato"]),
 "ic": ("Insuficiência cardíaca", [r"insuficiencia cardiaca", r"=\bICC?\b"]),
 "ic_esquerda": ("IC esquerda / congestão pulmonar", [r"insuficiencia cardiaca esquerda", r"\bice\b", r"congestao pulmonar", r"ortopneia", r"dispneia paroxistica noturna"]),
 "ic_direita": ("IC direita / cor pulmonale", [r"insuficiencia cardiaca direita", r"cor pulmonale", r"turgencia jugular", r"estase jugular"]),
 "bnp": ("BNP / peptídeos natriuréticos", [r"\bbnp\b", r"nt-probnp", r"peptideos? natriuretic"]),
 "iam": ("Infarto agudo do miocárdio", [r"\biam\b", r"infarto agudo do miocardio", r"infarto do miocardio", r"sindrome coronariana"]),
 "angina": ("Angina", [r"angina"]),
 "troponina": ("Troponina", [r"troponina"]),
 "dor_toracica": ("Dor torácica isquêmica", [r"dor toracica", r"sinal de levine"]),
 "morte_subita": ("Morte súbita cardíaca", [r"morte subita"]),
 "valvopatias": ("Valvopatias", [r"valvopatia", r"doencas? valvar", r"lesoes? valvar"]),
 "estenose_mitral": ("Estenose mitral", [r"estenose mitral"]),
 "insuf_mitral": ("Insuficiência mitral", [r"insuficiencia mitral", r"regurgitacao mitral"]),
 "estenose_aortica": ("Estenose aórtica", [r"estenose aortica"]),
 "insuf_aortica": ("Insuficiência aórtica", [r"insuficiencia aortica", r"regurgitacao aortica"]),
 "sopros": ("Sopros cardíacos", [r"\bsopros?\b"]),
 "b3_b4": ("B3 e B4", [r"\bb3\b", r"\bb4\b", r"terceira bulha", r"quarta bulha", r"galope"]),
 "fa": ("Fibrilação atrial", [r"fibrilacao atrial", r"=\bFA\b(?! ?\(fosfatase)"]),
 "pericardite": ("Pericardite / derrame pericárdico", [r"pericardit", r"derrame pericardico", r"tamponamento", r"dressler"]),
 "disseccao_aorta": ("Dissecção / aneurisma da aorta", [r"disseccao (aguda )?da aorta", r"disseccao aortica", r"aneurismas? (da aorta|aortic|de aorta|da aorta abdominal)", r"aorta abdominal"]),
 "tep": ("Tromboembolismo pulmonar", [r"\btep\b", r"tromboembolismo pulmonar", r"embolia pulmonar"]),
 "tvp": ("Trombose venosa profunda", [r"\btvp\b", r"trombose venosa profunda"]),
 "hip_pulmonar": ("Hipertensão pulmonar", [r"hipertensao (arterial )?pulmonar"]),
 "edema_pulmonar": ("Edema pulmonar", [r"edema pulmonar", r"edema agudo de pulmao", r"linhas? b\b", r"linhas de kerley"]),
 "sdra": ("SDRA / dano alveolar difuso", [r"\bsdra\b", r"dano alveolar difuso", r"membranas? hialinas?", r"desconforto respiratorio agudo"]),
 "sincope": ("Síncope", [r"sincope"]),
 "hipotensao_ortostatica": ("Hipotensão ortostática", [r"hipotensao (postural|ortostatica)"]),
 "pa_medida": ("Medida da pressão arterial", [r"medida da (pressao arterial|pa)", r"esfigmoman", r"hiato auscultatorio"]),
 "pulso": ("Pulso arterial", [r"pulso (arterial|parvus|em martelo|de corrigan|alternante|paradoxal)", r"parvus et tardus"]),
 "avc": ("AVC", [r"\bavc\b", r"acidente vascular"]),
 "cardiomegalia": ("Cardiomegalia / índice cardiotorácico", [r"cardiomegalia", r"indice cardiotoracico", r"\bict\b"]),
 # ---------- respiratório ----------
 "dpoc": ("DPOC", [r"\bdpoc\b", r"doenca pulmonar obstrutiva cronica"]),
 "enfisema": ("Enfisema", [r"enfisema"]),
 "bronquite_cronica": ("Bronquite crônica", [r"bronquite cronica", r"blue bloater", r"pink puffer", r"soprador rosado", r"inchado azul"]),
 "asma": ("Asma", [r"\basma\b", r"\basmatic"]),
 "broncodilatadores": ("Broncodilatadores (β2 e antimuscarínicos)", [r"broncodilatador", r"salbutamol", r"formoterol", r"salmeterol", r"tiotropio", r"ipratropio", r"\blaba\b", r"\blama\b", r"\bsaba\b"]),
 "corticoide": ("Corticosteroides", [r"corticoide", r"corticosteroide", r"glicocorticoide", r"prednison", r"budesonida", r"beclometasona"]),
 "espirometria": ("Espirometria", [r"espirometria", r"\bvef1\b", r"vef1/cvf", r"tiffeneau"]),
 "bronquiectasia": ("Bronquiectasia", [r"bronquiectasia"]),
 "atelectasia": ("Atelectasia", [r"atelectasia"]),
 "consolidacao": ("Consolidação / broncograma aéreo", [r"consolidacao", r"broncograma"]),
 "derrame_pleural": ("Derrame pleural", [r"derrame pleural", r"exsudato", r"transudato", r"criterios de light"]),
 "pneumotorax": ("Pneumotórax", [r"pneumotorax"]),
 "cavitacao": ("Cavitação pulmonar", [r"cavitac", r"cavidade pulmonar", r"lesao cavitaria", r"\bcaverna"]),
 "nodulo_pulmonar": ("Nódulo e massa pulmonar", [r"nodulo pulmonar", r"massa pulmonar", r"nodulo solitario"]),
 "ca_pulmao": ("Câncer de pulmão", [r"cancer de pulmao", r"carcinoma (pulmonar|broncogenico)", r"neoplasias? (de|do) pulmao", r"oat cell", r"pequenas celulas"]),
 "tabagismo": ("Tabagismo", [r"tabagis", r"\bmacos?[- ]ano", r"cigarro", r"\bfumo\b", r"fumante"]),
 "vidro_fosco": ("Vidro fosco", [r"vidro fosco"]),
 "padrao_intersticial": ("Padrão intersticial / faveolamento", [r"padrao intersticial", r"pneumonia intersticial", r"doenca intersticial", r"faveolamento", r"padrao reticular", r"\bmiliar\b"]),
 "cianose": ("Cianose", [r"cianose", r"cianotic"]),
 "dispneia": ("Dispneia", [r"dispneia", r"ortopneia", r"platipneia", r"trepopneia"]),
 "hemoptise": ("Hemoptise", [r"hemoptise"]),
 "baqueteamento": ("Baqueteamento digital", [r"baqueteamento", r"hipocratismo digital", r"dedos? em baqueta"]),
 "frémito_percussao": ("Frêmito e percussão", [r"fremito", r"hipersonoridade", r"som claro pulmonar", r"macicez a percussao do torax", r"submacicez"]),
 "estertores": ("Estertores e sibilos", [r"estertor", r"crepitac", r"sibilo", r"roncos?\b"]),
 "anafilaxia": ("Anafilaxia", [r"anafila", r"choque anafilatico"]),
 "tosse": ("Tosse e antitussígenos", [r"antitussigen", r"reflexo da tosse", r"tosse cronica", r"tosse seca", r"tosse produtiva"]),
 # ---------- digestório / fígado ----------
 "drge": ("DRGE", [r"\bdrge\b", r"doenca do refluxo", r"refluxo gastroesofagico", r"esofagite de refluxo"]),
 "barrett": ("Esôfago de Barrett", [r"barrett"]),
 "ibp": ("Inibidores da bomba de prótons", [r"\bibps?\b", r"inibidores? da bomba de protons", r"omeprazol", r"pantoprazol"]),
 "anti_h2": ("Antagonistas H2", [r"antagonistas? (do receptor )?h2", r"anti-h2", r"ranitidina", r"cimetidina", r"famotidina"]),
 "ulcera_peptica": ("Úlcera péptica", [r"ulcera peptica", r"ulcera gastrica", r"ulcera duodenal", r"doenca acido-peptica"]),
 "aines": ("AINEs / COX", [r"\baines?\b", r"anti-inflamatorios? nao esteroid", r"\bcox-?1\b", r"\bcox-?2\b", r"ibuprofeno", r"diclofenaco", r"\baas\b", r"acido acetilsalicilico", r"aspirina"]),
 "prostaglandinas": ("Prostaglandinas", [r"prostaglandina", r"misoprostol"]),
 "varizes": ("Varizes esofágicas", [r"varizes (esofag|gastro|de esofago)", r"variz(es)? esofag", r"sangramento varicoso", r"hemorragia varicosa", r"ligadura elastica"]),
 "hip_portal": ("Hipertensão portal e ascite", [r"hipertensao portal", r"ascite", r"cabeca de medusa", r"circulacao colateral"]),
 "cirrose": ("Cirrose", [r"cirrose", r"cirrotic"]),
 "ictericia": ("Icterícia e bilirrubina", [r"ictericia", r"bilirrubina", r"ictericic"]),
 "hepatograma": ("Enzimas hepáticas (AST, ALT, FA, GGT)", [r"=\bAST\b", r"=\bALT\b", r"=\bTGO\b", r"=\bTGP\b", r"transaminase", r"aminotransferase", r"=\bGGT\b", r"fosfatase alcalina", r"hepatograma"]),
 "albumina_inr": ("Albumina e TP/INR", [r"albumina", r"\binr\b", r"tempo de protrombina"]),
 "dha": ("Doença hepática alcoólica", [r"hepatica alcoolica", r"hepatite alcoolica", r"corpusculos? de mallory", r"hialino de mallory"]),
 "alcool": ("Álcool", [r"\balcool\b(?!-acido)", r"alcoolis", r"etilis", r"etilic", r"=\bCAGE\b", r"\bbebida alcoolica"]),
 "esteatose": ("Esteatose / DHGNA", [r"esteatose", r"\bdhgna\b", r"\bdhgm\b", r"\bmasld\b", r"gordurosa nao alcoolica", r"esteato-hepatite", r"\bnash\b"]),
 "chc": ("Carcinoma hepatocelular", [r"\bchc\b", r"hepatocarcinoma", r"carcinoma hepatocelular"]),
 "acalasia": ("Acalasia / megaesôfago", [r"acalasia", r"megaesofago", r"megacolon", r"bico de passaro"]),
 "esofagograma": ("Esofagograma e RX contrastado", [r"esofagograma", r"=\bREED\b", r"enema opaco", r"\bbario\b", r"transito intestinal"]),
 "endoscopia": ("Endoscopia / colonoscopia", [r"endoscopia", r"\beda\b", r"colonoscopia"]),
 "ca_gastrico": ("Câncer gástrico", [r"carcinoma gastrico", r"cancer gastrico", r"adenocarcinoma gastrico", r"borrmann", r"lauren"]),
 "gastrite_autoimune": ("Gastrite autoimune / anemia perniciosa", [r"gastrite (cronica )?autoimune", r"anemia perniciosa", r"anti-celula parietal", r"anticorpos? anti-?(celula parietal|fator intrinseco)", r"fator intrinseco"]),
 "apendicite": ("Apendicite", [r"apendicite"]),
 "diverticulite": ("Doença diverticular / diverticulite", [r"diverticul"]),
 "isquemia_mesenterica": ("Isquemia intestinal", [r"isquemia (intestinal|mesenterica)", r"infarto (intestinal|transmural|da mucosa)", r"angina abdominal", r"angina intestinal"]),
 "abdome_agudo": ("Abdome agudo", [r"abdome agudo", r"abdomen agudo"]),
 "pneumoperitonio": ("Pneumoperitônio / perfuração", [r"pneumoperitonio", r"perfuracao (intestinal|gastrica|duodenal|de viscera|livre)", r"ar livre", r"sinal de rigler", r"sinal de jobert"]),
 "obstrucao_intestinal": ("Obstrução intestinal / volvo", [r"obstrucao intestinal", r"\bvolvo", r"ileo (paralitico|adinamico|biliar)", r"\bbrida", r"suboclusao"]),
 "dii": ("Doença inflamatória intestinal", [r"doenca inflamatoria intestinal", r"\bdii\b"]),
 "crohn": ("Doença de Crohn", [r"crohn"]),
 "rcu": ("Retocolite ulcerativa", [r"\brcu\b", r"retocolite", r"colite ulcerativa"]),
 "polipos": ("Pólipos e adenomas colônicos", [r"polipos? (colonic|intestina|adenomatos|hiperplasic|serrilhad|do colon|colorret)", r"adenomas? (tubular|vilos|tubuloviloso|colonic|serrilhad)", r"polipose", r"=\bFAP\b", r"sequencia adenoma-carcinoma"]),
 "ca_colorretal": ("Câncer colorretal", [r"cancer colorretal", r"adenocarcinoma (colonico|de colon|colorretal)", r"carcinoma colorretal", r"cancer de colon", r"sangue oculto"]),
 "pancreatite": ("Pancreatite", [r"pancreatit"]),
 "colelitiase": ("Colelitíase / colecistite", [r"colelitiase", r"colecistit", r"calculo biliar", r"coledocolitiase", r"colangite"]),
 "litiase_urinaria": ("Litíase urinária / hidronefrose", [r"litiase (urinaria|renal)", r"nefrolitiase", r"calculo (renal|urinario|coraliforme)", r"hidronefrose", r"coraliforme"]),
 "vomito": ("Vômito e antieméticos", [r"antiemetic", r"ondansetrona", r"metoclopramida", r"zona de gatilho", r"centro do vomito"]),
 "diarreia": ("Diarreia / gastroenterite", [r"diarreia", r"gastroenterite", r"desidratacao", r"\bsro\b", r"soro de reidratacao"]),
 # ---------- sangue, rim, endócrino, imune ----------
 "hemograma": ("Hemograma", [r"hemograma"]),
 "ferropriva": ("Anemia ferropriva e ferro", [r"ferropriva", r"ferritina", r"deficiencia de ferro", r"sulfato ferroso", r"ferro serico"]),
 "megaloblastica": ("Anemia megaloblástica / B12 e folato", [r"megaloblast", r"vitamina b12", r"\bb12\b", r"cobalamina", r"acido folico", r"folato", r"macrocit"]),
 "adc": ("Anemia de doença crônica", [r"anemia (de|da) doenca cronica", r"anemia da inflamacao", r"hepcidina"]),
 "hemolise": ("Hemólise", [r"anemias? hemolitica", r"hemolise (intra|extra)vascular", r"haptoglobina", r"esferocit", r"=\bG6PD\b"]),
 "talassemia": ("Talassemia", [r"talassemi"]),
 "leucograma": ("Leucograma / neutrofilia e desvio", [r"leucograma", r"leucocitose", r"neutrofilia", r"desvio a esquerda", r"bastonet"]),
 "eosinofilia": ("Eosinofilia / eosinófilos", [r"eosinofil"]),
 "plaquetopenia": ("Plaquetopenia", [r"plaquetopenia", r"trombocitopenia"]),
 "creatinina_tfg": ("Creatinina e TFG", [r"creatinina", r"\btfg\b", r"taxa de filtracao glomerular", r"clearance", r"depuracao", r"cockcroft", r"ckd-epi"]),
 "proteinuria": ("Proteinúria / albuminúria", [r"proteinuria", r"albuminuria", r"microalbumin"]),
 "urinalise": ("Urinálise / EAS", [r"urinalise", r"\beas\b", r"urina (tipo|rotina)", r"sedimento urinario", r"cilindro", r"hematuria", r"piuria", r"leucocituria", r"nitrito"]),
 "lra_drc": ("Lesão renal aguda e DRC", [r"\blra\b", r"lesao renal aguda", r"\bdrc\b", r"doenca renal cronica", r"insuficiencia renal", r"nefrotox"]),
 "potassio": ("Potássio (hipo e hipercalemia)", [r"hipocalem", r"hipercalem", r"hipopotassem", r"hiperpotassem", r"potassio"]),
 "diabetes": ("Diabetes mellitus", [r"diabet", r"\bdm\b", r"hba1c", r"hemoglobina glicada", r"glicemia"]),
 "cetoacidose": ("Cetoacidose diabética", [r"cetoacidose", r"\bcad\b", r"estado hiperglicemico"]),
 "gliflozinas": ("Gliflozinas (iSGLT2)", [r"gliflozina", r"sglt2", r"dapagliflozina", r"empagliflozina"]),
 "pcr_vhs": ("PCR e VHS", [r"proteina c reativa", r"=(?<![-\w])(?<!RT )PCR\b(?![- ]?(em tempo|multiplex|qualitativ|quantitativ))", r"=\bVHS\b", r"velocidade de hemossedimentacao", r"proteinas? de fase aguda"]),
 "procalcitonina": ("Procalcitonina", [r"procalcitonina", r"\bpct\b"]),
 "les": ("Lúpus eritematoso sistêmico", [r"lupus", r"=\bLES\b", r"libman"]),
 "ar": ("Artrite reumatoide", [r"artrite reumatoide", r"fator reumatoide", r"anti-ccp"]),
 "fan": ("FAN / autoanticorpos", [r"=\bFAN\b", r"fator antinuclear", r"hep-2", r"anti-dsdna", r"anticorpos? antinucle"]),
 "autoimunidade": ("Autoimunidade e mimetismo molecular", [r"perda de tolerancia", r"tolerancia imunologica", r"doencas? autoimun"]),
 "osteoartrite": ("Osteoartrite / artrose", [r"osteoartrite", r"osteoartrose", r"artrose"]),
 "osteoporose": ("Osteoporose", [r"osteoporose", r"osteopenia"]),
 "metastase_ossea": ("Lesões ósseas líticas e blásticas", [r"lesoes? (osteo)?liticas?", r"lesoes? (osteo)?blasticas?", r"metastases? osse"]),
 "vacinas": ("Vacinas e imunização", [r"\bvacina", r"imunizac", r"=\bPNI\b", r"calendario vacinal"]),
 "imunidade": ("IgM, IgG e resposta imune", [r"imunidade (inata|adaptativa|humoral|celular)", r"resposta imune (primaria|secundaria)", r"memoria imunologica", r"=\bIgM\b", r"=\bIgG\b"]),
 # ---------- farmacologia geral ----------
 "cyp": ("Metabolismo hepático / CYP450", [r"\bcyp", r"citocromo p450", r"indutor(es)? enzimatic", r"inibidor(es)? enzimatic", r"inducao enzimatica", r"inibicao enzimatica"]),
 "farmacocinetica": ("Farmacocinética (Vd, meia-vida, depuração)", [r"farmacocinetic", r"meia-vida", r"volume de distribuicao", r"biodisponibilidade"]),
 "janela_terapeutica": ("Índice / janela terapêutica", [r"janela terapeutica", r"indice terapeutico", r"margem terapeutica", r"nivel serico"]),
 "agonista_adrenergico": ("Adrenalina e agonistas adrenérgicos", [r"adrenalina", r"epinefrina", r"noradrenalina", r"norepinefrina", r"dobutamina", r"dopamina", r"agonistas? adrenergic"]),
 "colinergico": ("Acetilcolina e receptores muscarínicos", [r"acetilcolina", r"muscarinic", r"\batropina", r"colinergic", r"=\bACh\b"]),
 "organofosforados": ("Anticolinesterásicos / organofosforados", [r"organofosforad", r"anticolinesteras", r"carbamato", r"pralidoxima", r"neostigmina"]),
 "toxina_botulinica": ("Toxina botulínica / Clostridium", [r"botulin", r"clostridi"]),
 "miastenia": ("Miastenia gravis", [r"miastenia"]),
 "opioides": ("Opioides", [r"opioide", r"morfina", r"naloxona", r"codeina", r"tramadol", r"fentanil"]),
 "dor_tipos": ("Tipos de dor (nociceptiva, neuropática, referida)", [r"dor (nociceptiva|neuropatica|referida|irradiada|visceral|somatica|psicogenica)", r"nocicep"]),
 "histamina": ("Histamina", [r"histamina", r"anti-histaminic"]),
 "vasopressina": ("Vasopressina / ADH", [r"vasopressina", r"hormonio antidiuretico", r"terlipressina", r"desmopressina"]),
 "oxido_nitrico": ("Óxido nítrico / endotélio", [r"oxido nitrico", r"disfuncao endotelial"]),
 "pde5": ("Inibidores da PDE5", [r"pde5", r"sildenafil", r"tadalafil"]),
 "teofilina": ("Teofilina / metilxantinas", [r"teofilina", r"metilxantina", r"aminofilina", r"cafeina"]),
 # ---------- semiologia / imagem / epidemiologia ----------
 "edema": ("Edema", [r"\bedema\b(?! pulmonar)", r"sinal de cacifo", r"anasarca", r"\bgodet\b"]),
 "fascies": ("Fácies", [r"facies"]),
 "ictus": ("Ictus cordis", [r"ictus cordis", r"\bictus\b"]),
 "dor_referida": ("Dor referida e irradiada", [r"dor referida", r"dor irradiada", r"irradia(cao)? (para|ao|a) ", r"dor a distancia"]),
 "sensibilidade_especificidade": ("Sensibilidade, especificidade e valores preditivos", [r"sensibilidade e especificidade", r"especificidade", r"valor(es)? preditivo", r"=\bVP[PN]\b", r"razao de verossimilhanca", r"falsos? (positivo|negativo)"]),
 "incidencia_prevalencia": ("Incidência e prevalência", [r"\bprevalencia", r"(taxa|coeficiente) de incidencia", r"incidencia (acumulada|e prevalencia|x prevalencia)"]),
 "letalidade": ("Letalidade e mortalidade", [r"letalidade", r"taxa de mortalidade", r"coeficiente de mortalidade"]),
 "rastreamento": ("Rastreamento", [r"rastreamento", r"rastreio", r"screening"]),
 "prevencao_niveis": ("Níveis de prevenção", [r"prevencao (primaria|secundaria|terciaria|quaternaria)", r"niveis de prevencao"]),
 "notificacao": ("Notificação compulsória", [r"notificac", r"\bsinan\b", r"compulsori"]),
 "radiacao": ("Radiação ionizante", [r"radiacao ionizante", r"radioprotec", r"protecao radiologica", r"=\bALARA\b", r"dose de radiacao"]),
 "tc_contraste": ("Contraste iodado", [r"contraste iodado", r"nefropatia (induzida )?(por|pelo) contraste", r"alergia ao contraste", r"meio de contraste"]),
 "pocus": ("POCUS / ultrassom à beira do leito", [r"pocus", r"ultrassom (a beira|point)", r"ultrassonografia a beira"]),
 "peconhentos": ("Acidentes por animais peçonhentos", [r"peconhent", r"ofidic", r"botropic", r"crotalic", r"escorpi", r"antiveneno", r"soro antiofidico"]),
 "violencia": ("Violência", [r"violencia"]),
 "determinantes": ("Determinantes sociais da saúde", [r"determinantes sociais", r"vulnerabilidade social", r"pobreza", r"saneamento"]),
 "mimetismo": ("Mimetismo molecular", [r"mimetismo molecular"]),
 "anca": ("ANCA", [r"=c?p?-?ANCA", r"anticorpos? anticitoplasma de neutrofilo"]),
 "celula_parietal": ("Célula parietal e secreção ácida", [r"celulas? parieta", r"bomba de protons", r"h\+/k\+", r"secrecao (gastrica|acida)", r"acido cloridrico", r"=HCl"]),
 "antifolatos": ("Antifolatos (sulfa-trimetoprima)", [r"trimetoprim", r"sulfametoxazol", r"smx", r"tmp", r"antifolato", r"sulfa"]),
 "curb65": ("Gravidade da pneumonia (CURB-65)", [r"curb-?65", r"crb-?65"]),
 "jejum_pre_analitica": ("Fase pré-analítica e jejum", [r"pre-analitic", r"jejum de", r"jejum"]),
 "carga_tabagica": ("Carga tabágica (maços-ano)", [r"carga tabagica", r"macos?[- ]ano"]),
 "fumaca_alfa1": ("Deficiência de alfa-1-antitripsina", [r"alfa-?1[- ]antitripsina", r"α1[- ]?antitripsina", r"a1-?at"]),
 "barorreceptor": ("Reflexo barorreceptor", [r"barorrecept", r"barorreflexo"]),
 "sncs_simpatico": ("Ativação simpática / catecolaminas", [r"catecolamina", r"hiperatividade simpatica", r"ativacao simpatica", r"descarga adrenergica"]),
}


def semac(t):
    return "".join(c for c in unicodedata.normalize("NFD", t) if unicodedata.category(c) != "Mn")


RX = {k: [(True, re.compile(p[1:])) if p.startswith("=") else (False, re.compile(p)) for p in pats] for k, (rot, pats) in C.items()}
SEG, M = {}, {}


def ler_corpus():
    for m in ORD:
        d = json.load(open(os.path.join(CORPUS, m + ".json"), encoding="utf-8"))
        vistos = set()
        for s in d["segs"]:
            sid = s["id"].lstrip("#")
            if sid in vistos:
                continue
            vistos.add(sid)
            t = s["titulo"]
            fora = bool(FORA.search(sid)) or any(x in t for x in ("O que mais", "Quiz", "⭐", "Questã", "Leitura das imagens"))
            txc = semac(s["texto"])
            SEG[(m, sid)] = dict(m=m, id=sid, titulo=t, aula=s["aula"], txc=txc, tx=txc.lower(), ti=semac(t).lower(), fora=fora, raw=s["texto"])


def conta(k, s):
    return sum(len(r.findall(s["txc"] if cs else s["tx"])) for cs, r in RX[k])


def titulo_tem(k, s):
    return any(r.search(semac(s["titulo"]) if cs else s["ti"]) for cs, r in RX[k])


# matérias que não podem ser "casa" de um conceito (a palavra tem outro sentido lá, ou a matéria só cita)
SEM_CASA = {"fa": {"lab"}, "sensibilidade_especificidade": {"farmaco"}, "edema": {"pato", "img", "farmaco", "prev", "lab", "dic"},
            "diabetes": {"pato"}, "pielonefrite": {"pato"}, "cavitacao": {"pato", "micro"}, "colinergico": {"dic"}, "hepatograma": {"img"},
            "determinantes": {"farmaco"}, "betalactamicos": {"farmaco"}, "antifungicos": {"farmaco"}, "leucograma": {"pato", "img"},
            "imunidade": {"pato"}, "vacinas": {"pato"}, "hiv": {"micro", "pato"}, "albumina_inr": {"farmaco"}, "estertores": {"img"}, "disseccao_aorta": {"dic"}, "colelitiase": {"dic"}}
# matérias que não recebem 🔗 para um conceito (citam de passagem, com outro sentido)
SEM_ORIGEM = {"alcool": {"micro"}, "cavitacao": {"micro"}, "fa": {"lab"}, "sensibilidade_especificidade": {"farmaco"}, "imunidade": {"farmaco"}}
# casa escolhida à mão quando a contagem erra
CASA = {("angina", "semio"): "a9/s1", ("gram", "micro"): "a1/s3", ("hemolise", "lab"): "a04/a04-4", ("alcool", "prev"): "a09/a09-1",
        ("aterosclerose", "pato"): "aula1/seg3", ("has", "pato"): "aula1/seg2", ("ldl", "pato"): "aula1/seg4", ("ic", "pato"): "aula3/seg1",
        ("iam", "pato"): "aula2/s4", ("tabagismo", "pato"): "aula6/seg2", ("ldl", "lab"): "a07/a07-2", ("estatinas", "lab"): "a07/a07-4",
        ("ic", "img"): "a03/a03-4", ("diabetes", "lab"): "a10/a10-2", ("vacinas", "dic"): "caso1/s3", ("dpoc", "pato"): "aula6/seg4",
        ("disseccao_aorta", "pato"): "aula1/seg7", ("histamina", "farmaco"): "s4", ("notificacao", "prev"): "a03/a03-2", ("ic", "farmaco"): "v7",
        ("ic", "dic"): "caso4/s2", ("tabagismo", "prev"): "a09/a09-3", ("tb", "prev"): "a06/a06-3", ("hepatite_b", "prev"): "a06/a06-2",
        ("hiv", "prev"): "a06/a06-2", ("sifilis", "prev"): "a06/a06-2", ("has", "prev"): "a05/a05-3", ("avc", "prev"): "a05/a05-4",
        ("ca_pulmao", "prev"): "a07/a07-4", ("rastreamento", "prev"): "a07/a07-2", ("sensibilidade_especificidade", "prev"): "a04/a04-4",
        ("determinantes", "prev"): "a02/a02-4", ("influenza", "prev"): "a06/a06-5", ("meningococo", "prev"): "a06/a06-5",
        ("sarampo", "prev"): "a06/a06-1", ("varicela", "prev"): "a06/a06-1", ("zika", "prev"): "a06/a06-4", ("chikungunya", "prev"): "a06/a06-4",
        ("dengue", "prev"): "a06/a06-4", ("hpv", "prev"): "a07/a07-2", ("letalidade", "prev"): "a04/a04-3", ("incidencia_prevalencia", "prev"): "a04/a04-3",
        ("diabetes", "prev"): "a05/a05-2", ("vacinas", "prev"): "a06/a06-5", ("prevencao_niveis", "prev"): "a01/a01-3", ("alcool", "prev"): "a09/a09-1"}
def montar_matriz():
    M.clear()
    for k in C:
        M[k] = {}
        for m in ORD:
            cs = []
            for s in SEG.values():
                if s["m"] != m or s["fora"]:
                    continue
                n = conta(k, s)
                if n:
                    cs.append((s, n, titulo_tem(k, s)))
            if not cs:
                continue
            best = max(cs, key=lambda x: x[1] + (8 if x[2] else 0))
            if (k, m) in CASA:
                best = next((x for x in cs if x[0]["id"] == CASA[(k, m)]), best)
            M[k][m] = dict(casa=best[0]["id"], n=best[1], tit=best[2], total=sum(x[1] for x in cs),
                           men={x[0]["id"]: (x[1], x[2]) for x in cs}, pode_casa=m not in SEM_CASA.get(k, ()),
                           pode_origem=m not in SEM_ORIGEM.get(k, ()), manual=(k, m) in CASA)


def casa_forte(v):
    return v["pode_casa"] and (v["manual"] or v["n"] >= 5 or (v["tit"] and v["n"] >= 2))


def ligacoes():
    """[(m_origem, seg_origem, conceito, m_destino, seg_destino, peso)]"""
    cand = collections.defaultdict(list)
    for k, por in M.items():
        for mo, vo in por.items():
            if not vo["pode_origem"]:
                continue
            dona = casa_forte(vo)  # a matéria de origem também explica o tema: só os segmentos fortes ligam para fora
            for sid, (n, tit) in vo["men"].items():
                eh_casa = sid == vo["casa"]
                if not (n >= 2 or tit):
                    continue
                if dona and not (eh_casa or tit or n >= 4):
                    continue
                for md, vd in por.items():
                    if md == mo or not casa_forte(vd):
                        continue
                    peso = min(n, 8) + (6 if tit else 0) + (3 if eh_casa else 0) + min(vd["n"], 10) / 2 + (4 if vd["tit"] else 0)
                    cand[(mo, sid)].append((peso, k, md, vd["casa"]))
    # no máximo 3 segmentos de uma matéria apontando para o mesmo conceito na mesma matéria de destino
    por_destino = collections.defaultdict(list)
    for (mo, sid), lst in cand.items():
        for item in lst:
            por_destino[(mo, item[1], item[2])].append((item[0], sid))
    deixa = set()
    for chave, l in por_destino.items():
        l.sort(reverse=True)
        for p, sid in l[:3]:
            deixa.add((chave, sid))
    cand = {ms: [it for it in lst if ((ms[0], it[1], it[2]), ms[1]) in deixa] for ms, lst in cand.items()}
    out = []
    for (mo, sid), lst in cand.items():
        lst.sort(reverse=True)
        usados, por_conc = 0, collections.Counter()
        for peso, k, md, sd in lst:
            if usados >= MAX_SEG:
                break
            if por_conc[k] >= 2:  # no máximo 2 matérias por conceito no mesmo segmento
                continue
            por_conc[k] += 1
            usados += 1
            out.append((mo, sid, k, md, sd, round(peso, 1)))
    return out


def rotulo(md, sd):
    s = SEG[(md, sd)]
    t = re.sub(r"^\d+(?=[A-ZÀ-Ú])", "", s["titulo"]).strip()
    au = s["aula"]
    if md == "pato":
        m = re.match(r"(.*?) — Aula (\d+)", au)
        au = (m.group(1) + " " + m.group(2)) if m else au.split(" · ")[0]
    else:
        au = au.split(" · ")[0]
    return f"{au} · {t}"


def descricoes():
    d = {}
    if os.path.exists(SAIDA):
        for k, v in json.load(open(SAIDA, encoding="utf-8")).get("d", {}).items():
            d[k] = v["t"]
    if os.path.exists(NOVAS):
        d.update(json.load(open(NOVAS, encoding="utf-8")))
    return d


def frases(raw):
    return [f.strip() for f in re.split(r"(?<=[.!?;])\s+(?=[A-ZÀ-Ú0-9•\-–(])", raw) if len(f.strip()) > 25]


def trecho(k, md, sd):
    hit = []
    for f in frases(SEG[(md, sd)]["raw"]):
        fc = semac(f)
        if any(r.search(fc if cs else fc.lower()) for cs, r in RX[k]):
            hit.append(f[:260])
    return " ‖ ".join(hit[:3])


def main(args):
    if "--js" in args:
        print(COLETA_JS)
        return
    ler_corpus()
    montar_matriz()
    L = ligacoes()
    desc = descricoes()
    out = {"m": MATS, "c": {}, "d": {}, "l": {}}
    falta = {}
    for mo, so, k, md, sd, p in L:
        ch = f"{k}|{md}"
        if ch not in desc:
            falta[ch] = (k, md, sd)
            continue
        out["l"].setdefault(mo, {}).setdefault(so, []).append([k, md])
        out["d"].setdefault(ch, {"s": sd, "a": rotulo(md, sd), "t": desc[ch]})
        out["c"].setdefault(k, {"r": C[k][0], "p": C[k][1]})
    if "--faltam" in args:
        os.makedirs(os.path.dirname(NOVAS), exist_ok=True)
        with open(os.path.join(ROOT, "_elos", "trechos.txt"), "w", encoding="utf-8") as f:
            for ch, (k, md, sd) in sorted(falta.items()):
                f.write(f"{ch}  ->  {rotulo(md, sd)}\n  {trecho(k, md, sd)}\n")
        print(len(falta), 'pares sem descrição; trechos em _elos/trechos.txt. Escreva em _elos/descricoes.json ({"conceito|matéria": "texto"}).')
        return
    # caixas "🔗 LIGA COM O SEGMENTO / A AULA" (dentro da mesma matéria): escritas à mão, ficam como estão
    # ({chave: {segmento: {"r": rótulo, "p": [regex da âncora], "t": texto}}}); as novas entram em _elos/caixas.json
    antigo = json.load(open(SAIDA, encoding="utf-8")) if os.path.exists(SAIDA) else {}
    out["i"] = antigo.get("i", {})
    novas = os.path.join(ROOT, "_elos", "caixas.json")
    if os.path.exists(novas):
        for m, segs in json.load(open(novas, encoding="utf-8")).items():
            out["i"].setdefault(m, {}).update(segs)
    with open(SAIDA, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
    n = sum(len(v) for m in out["l"].values() for v in m.values())
    print(f"elos.json: {n} ligações, {len(out['d'])} descrições, {len(falta)} pares sem descrição (rode --faltam)")


COLETA_JS = r"""
// Cole no console de cada master aberto em localhost (python -m http.server na pasta do site),
// com o 🥷 Modo foco ligado na Personalização (é o abas.js que percorre os segmentos).
// Ele abre a cópia escondida (?vgindice, a mesma da 🔍 Buscar), lê cada segmento SEM as questões e baixa <chave>.json.
// Guarde os arquivos em _elos/corpus/.
const EXC = '.qsec,.qset,.q,.qzone,.qcard,.vblock,.pv-box,.pv-aut,.quiz,.quiz-item,.qblock,.qsection,.aut-box,.navfoot,.vga-seg,.vg-crumb,.vg-segxy,.legend,.done-bar,.crumb,.actions,.ref-pop,.vg-meme,.mode-note,.sec-disc,.toc';
const baixar = (nome, obj) => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(obj)], {type: 'application/json'})); a.download = nome + '.json'; a.click(); };
function coletar() {
  const nome = document.documentElement.dataset.vidro, segs = [];
  const fr = document.createElement('iframe'); fr.style.cssText = 'position:fixed;left:-12000px;width:1200px;height:900px';
  fr.src = location.pathname + '?vgindice=1';
  const t = setInterval(() => { try { const w = fr.contentWindow; if (!w || w.__p || !/vgindice/.test(w.location.href)) return;
    const o = w.Element.prototype.cloneNode; w.Element.prototype.cloneNode = function (d) { const c = o.call(this, d); if (d) c.querySelectorAll(EXC).forEach(x => x.remove()); return c; }; w.__p = 1; } catch (e) {} }, 10);
  addEventListener('message', function on(e) { const d = e.data || {}; if (d.vgIdx === 'seg') segs.push({id: d.id, titulo: d.titulo, aula: d.aula, texto: d.texto});
    if (d.vgIdx === 'fim') { removeEventListener('message', on); clearInterval(t); baixar(nome, {m: nome, segs}); fr.remove(); } });
  document.body.appendChild(fr);
}
// Patologia: no master, rode coletarPato() (as aulas são lidas direto de aulas/).
async function coletarPato() {
  const T = typeof TABS !== 'undefined' ? TABS : [], segs = [];
  for (const it of document.querySelectorAll('#tabbtns .it[data-key][data-seg]')) {
    const k = it.dataset.key; if (!/^(aula|tgi)\d+$/.test(k)) continue;
    const d = new DOMParser().parseFromString(await (await fetch('aulas/' + k + '.html')).text(), 'text/html'), el = d.getElementById(it.dataset.seg); if (!el) continue;
    el.querySelectorAll('script,style,button,' + EXC).forEach(x => x.remove());
    const t = T.find(x => x.key === k) || {};
    segs.push({id: k + '/' + it.dataset.seg, titulo: it.textContent.replace(/\s+/g, ' ').trim(), aula: String(t.label || k) + ' · ' + (t.short || ''), texto: el.textContent.replace(/\s+/g, ' ').trim()});
  }
  baixar('pato', {m: 'pato', segs});
}
// A aula2 da Patologia é montada por JS: abra aulas/aula2.html, cole EXC e baixar, e rode
//   const out=[]; for (const s of SEGMENTS) { goTo('s'+s.num); await new Promise(r=>setTimeout(r,150)); const c=document.getElementById('content').cloneNode(true); c.querySelectorAll('script,style,button,'+EXC).forEach(x=>x.remove()); out.push({id:'aula2/s'+s.num,titulo:s.title,aula:'Cardiovascular — Aula 2 · Cardiopatia Isquêmica',texto:c.textContent.replace(/\s+/g,' ').trim()}); } baixar('pato_aula2',{segs:out})
// e troque os segmentos aula2/* do pato.json pelos dessa coleta.
"""


if __name__ == "__main__":
    main(sys.argv[1:])
