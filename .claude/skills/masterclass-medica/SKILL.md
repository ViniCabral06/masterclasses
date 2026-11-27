---
name: "masterclass-medica"
description: "Transforma um PDF de aula (slides, apostila ou aula + anotações) em uma masterclass interativa, aprofundada, segmentada e RICA EM IMAGENS para estudos de medicina. USE SEMPRE que o usuário enviar um PDF de aula com o comando “/masterclass” (em qualquer parte da mensagem), ou pedir para “transformar essa aula em masterclass”. A skill extrai e reaproveita as imagens do PDF (essencial para semiologia, propedêutica, microbiologia, farmacologia), segmenta o conteúdo, aprofunda cada segmento com explicações de nível professor e correlações clínicas (marcando o que é extra vs. do PDF), inclui 3 perguntas por segmento em estilo vinheta clínica de residência (algumas baseadas em imagem), monta um quiz final de 15 questões, e oferece um HTML interativo, visualmente moderno e com imagens embutidas. Dispare mesmo só com “/masterclass” e um PDF anexado."
---

# Masterclass Médica

## Por que essa skill existe
Sou um estudantes de medicina e uso PDFs de aula como matéria-prima para criar material de estudo denso, aprofundado e no formato de perguntas típicas de prova (residência / vinheta clínica). O objetivo não é resumir a aula — é dar uma aula melhor que a aula, complementando com correlações clínicas e mecanismos, e testando a compreensão em tempo real, não só decoreba. Em matérias como semiologia, propedêutica, microbiologia e farmacologia, boa parte do aprendizado é visual (reconhecer um achado no exame físico, uma lesão, uma lâmina, um mecanismo de ação ilustrado) — então imagens não são um extra, são parte central do material. INFORMAÇÃO IMPORTANTE A PROVA PARCIAL ABORDA APENAS AS PRIMEIRAS MATÉRIAS DO SEMESTRE, A SOMATIVA TENDE A COBRAR TUDO, COM FOCO NAS MATÉRIAS SEGUINTES A PARCIAL, PORÉM ALGUNS NÃO COBRAM A MATÉRIA ANTIGA OUTROS COBRAM

## Skills de design a usar
Ao montar o HTML, use as skills `emil-design-eng` (animações e polimento) e `design-taste-frontend` (direção de arte) para melhorar o design do site [Claude Code exclusivamente]. Inclua sempre um botão para entrar e sair da tela cheia e um botão de tema claro/escuro com animação.

## Quando disparar
• Mensagem contém um PDF anexado + a palavra “/masterclass” em qualquer posição
• Pedido explícito tipo “transforma essa aula em masterclass”, mesmo sem o comando exato
Se o PDF for só mencionado mas não estiver de fato anexado, confira antes de prosseguir — arquivos não aparecem automaticamente na conversa.

## Fluxo de trabalho

### 1. Ler o PDF
Extraia todo o conteúdo textual e a estrutura de tópicos/slides. Use a skill pdf-reading para orientação de extração (texto, imagens, tabelas).

### 2. Extrair as imagens (sempre que a aula tiver conteúdo visual)
Isso é essencial, não opcional, sempre que o material tiver qualquer valor visual — o que inclui praticamente toda aula de semiologia, propedêutica, microbiologia, farmacologia, patologia e afins.
• Liste e extraia as imagens embutidas: pdfimages -list document.pdf e depois pdfimages -png document.pdf /tmp/img
• Se a aula tiver gráficos/diagramas vetoriais (comuns em slide exportado do PowerPoint) que pdfimages não capture, rasterize a página com pdftoppm -jpeg -r 150 -f N -l N document.pdf /tmp/page só como etapa intermediária e RECORTE apenas a figura. A página rasterizada nunca entra na aula (ver seção B.1: nunca o slide inteiro)
• Descarte imagens minúsculas/decorativas (máscaras, logos, bullets) filtrando por tamanho de arquivo
• Veja (view) cada imagem relevante para entender o que ela mostra e escrever uma legenda útil — na prática, isso é o que permite depois usar a imagem tanto no texto quanto nas perguntas
• Salve as imagens úteis em uma subpasta imagens/ com nomes descritivos (ex: ausculta-focos-cardiacos.png, não img-014.png)

### 3. Mapear a estrutura em segmentos
Divida o conteúdo em segmentos lógicos e coerentes — nunca corte no meio de um raciocínio. Como referência, 4 a 8 segmentos costuma funcionar bem para uma aula típica; aulas mais densas ou com vários subtemas podem ter mais. Mantenha a ordem didática original, a menos que reorganizar melhore a compreensão — nesse caso, avise que reorganizou e por quê. Associe desde já cada imagem extraída ao segmento a que ela pertence.

### 4. Escrever cada segmento
Cada segmento deve conter:
Título do segmento — curto e específico (ex: “Fisiopatologia da Cetoacidose Diabética”, não “Parte 1”).
Conteúdo aprofundado, com imagens embutidas no ponto certo — não resuma slide por slide.
Explique de verdade: mecanismos, “porquês”, relações causa-efeito, tudo aquilo que normalmente fica implícito na aula mas que faz diferença pra entender de verdade. Escreva como um professor dando aula particular, não como quem resume slide.
• Conteúdo que vier diretamente do PDF: desenvolva por completo, com profundidade.
• Conteúdo adicional — correlações clínicas, pegadinhas de prova conhecidas, tópicos relacionados que não estavam no PDF mas são relevantes: marque sempre com “■ EXTRA:” no início do trecho, para os alunos saberem o que veio da aula original e o que foi acrescentado.
• Sempre que uma imagem extraída ilustrar o que está sendo explicado, insira-a ali mesmo no texto com ![legenda](imagens/nome-do-arquivo.png), e escreva a legenda explicando o que observar na imagem — para matérias visuais, a legenda É o conteúdo (ex: “note a hiperextensão do quirodáctilo e a base ungueal em vidro de relógio, características do baqueteamento digital”). Não jogue as imagens soltas no fim do segmento; elas pertencem ao trecho que estão ilustrando.
• Se o PDF não tiver uma imagem boa para algo claramente visual (ex: uma lesão clássica, um achado semiológico canônico), pesquise na internet, em livro de referência ou em artigo uma imagem ou esquema melhor, respeitando direitos autorais, e SEMPRE cite a fonte (ver seção B.1).

3 perguntas de verificação — múltipla escolha, estilo vinheta clínica de residência brasileira: caso clínico curto (2-4 linhas) seguido de 4-5 alternativas, testando raciocínio sobre o segmento. Em matérias visuais, pelo menos 1 das 3 deve ser baseada em imagem — mostre a imagem e peça pra identificar/interpretar o achado, exatamente como cai em prova prática e em provas de residência com imagem. Depois das 3 perguntas, inclua um gabarito comentado: para cada questão, explique por que a correta está certa e por que as principais erradas estão erradas.

Exemplo de pergunta textual:
Paciente de 45 anos, diabético tipo 1 em uso irregular de insulina, dá entrada no PS com dor abdominal, taquipneia e hálito cetônico. Glicemia capilar: 480 mg/dL. Qual o principal mecanismo fisiopatológico responsável pelo quadro?
A) Resistência periférica à insulina com hiperglicemia compensatória
B) Deficiência absoluta de insulina levando à lipólise e produção de corpos cetônicos
C) Aumento da secreção de insulina com supressão do glucagon
D) Desidratação por diurese osmótica isolada, sem alteração hormonal

Exemplo de pergunta baseada em imagem:
![achado de exame físico](imagens/baqueteamento-digital.png)
O achado demonstrado na imagem acima está classicamente associado a qual das seguintes condições?
A) Anemia ferropriva
B) Doença pulmonar obstrutiva crônica com hipoxemia crônica
C) Hipotireoidismo
D) Insuficiência renal aguda

### 5. Quiz final — 15 questões
Depois de todos os segmentos, monte um quiz único cobrindo múltiplos tópicos da aula inteira (não repita as perguntas dos segmentos). Características:
• Múltipla escolha, estilo vinheta clínica de residência
• Em matérias visuais, inclua várias questões baseadas em imagem (reaproveitando imagens extraídas que ainda não foram usadas, ou buscando novas quando fizer sentido)
• Distribua a dificuldade: misture questões diretas, questões que exigem integrar 2+ conceitos da aula, e pelo menos 2-3 mais difíceis (nível de residência avançada)
• Gabarito comentado ao final, no mesmo padrão dos segmentos

### 6. Montar a versão HTML interativa (com imagens embutidas)
Depois de entregar segmentos + quiz, monte a versão em HTML interativo — no mesmo espírito dos simuladores de OSCE e quiz que Matheus e Vinícius já constroem: navegação entre segmentos, imagens exibidas inline nos pontos certos, botão “ver resposta” em cada pergunta de verificação (incluindo as baseadas em imagem), e um modo quiz final com pontuação.

## Direção visual — moderna, disruptiva, sem “cara de IA”
Este é um ponto central, não um detalhe de acabamento. Evite o visual padrão de artefato gerado por IA: nada de gradiente roxo/azul genérico, cards com sombra suave iguais entre si, ícones de emoji soltos como decoração, ou layout que parece template de landing page. Busque uma identidade visual própria, com personalidade — como se tivesse sido desenhada por um designer para um produto real de estudo, não gerada automaticamente.
• Tema escuro na interface — navegação, cabeçalho, barra lateral, botões, fundo geral da página em tons escuros.
• Fundo branco na área de leitura do texto — o conteúdo de cada segmento (texto corrido, explicações) fica sobre um fundo claro/branco, para não cansar a vista em leituras longas. Trate a leitura como um “cartão” claro dentro da moldura escura da interface, não a página inteira em modo escuro.
• Tipografia com boa legibilidade para textos longos (contraste equilibrado, espaçamento de linha confortável, sem excesso de peso/negrito).
• Micro-interações e transições discretas (hover, troca de segmento, revelar gabarito) para dar sensação de produto polido, sem exagerar em animação.
• Ainda assim, siga a skill frontend-design como base técnica (tokens, espaçamento, componentes) — a diretriz acima define o tom e a paleta, não substitui os fundamentos da skill.

Para as imagens não quebrarem quando o arquivo for baixado/compartilhado, embuta-as como base64 (data URI) diretamente no HTML, em vez de referenciar arquivos externos — isso deixa o HTML autocontido e portátil.

## Onde entregar o conteúdo
Salve a masterclass completa (segmentos + quiz + gabaritos, com as imagens referenciadas) como um arquivo .md em /mnt/user-data/outputs/, junto da pasta imagens/, e o HTML interativo final. É conteúdo longo que vai ser reaberto e revisado depois — não é uma resposta de chat descartável. Além do arquivo, mostre as imagens mais importantes diretamente na conversa (não só no arquivo) para que dê pra ver o material sem precisar abrir nada. Apresente os arquivos finais com present_files ao final.

## Idioma e tom
Sempre em português do Brasil, no nível de aprofundamento e vocabulário técnico de quem já está em fases clínicas — não precisa reexplicar conceitos básicos de graduação, mas também não pule etapas de raciocínio fisiopatológico que costumam cair em prova.

---

# Padrões acumulados (indicações de Matheus e Vinícius — aplicar SEMPRE, além do fluxo acima)

Estas regras vieram do uso real da skill (Farmacologia, Aulas 6–9). Valem para qualquer matéria; quando conflitarem com o fluxo acima, estas prevalecem.

## A. Antes de começar
• Se já existe um HTML da matéria (ex.: Farmacologia_Somativas.html), a aula nova entra como MAIS UM MÓDULO nesse mesmo arquivo (mesma sidebar, mesmo progresso, mesmas abas de revisão) — não crie arquivo separado. Pergunte/confirme a numeração da aula (ex.: Aula 6 = Parassimpático, 7 = Respiratório, 8 = Digestório, 9 = Vascular) e use a numeração que o aluno der.
• Descubra quem é o professor ATUAL e quais provas são dele. O estilo de tudo (questões, foco, figuras) segue as provas desse professor. Provas e resumos de professores anteriores são referência secundária; resumos antigos devem ser usados com cautela e corrigidos onde estiverem errados.
• Se o aluno mandar o PDF em duas versões (limpo e anotado), use o limpo para recortar as imagens e o anotado para extrair as falas do professor.

## B. Imagens e figuras
• Figuras numeradas, com etapas, e gráficos são o CENTRO da aula: explique cada uma passo a passo (bloco de etapas 1 → 2 → 3), ancorado no livro-texto citado no slide (ex.: Rang & Dale). Leia eixos, curvas, valores e o que muda entre os painéis.
• Se não conseguir entender uma figura com segurança, PERGUNTE ao aluno em vez de inventar. Não invente número de figura do livro; se não tiver certeza, cite só o capítulo.
• Recorte as figuras limpas (sem título do slide vazando, sem anotação por cima quando não for útil). Para usar uma figura NUMA QUESTÃO, gere uma versão sem anotações — anotação do aluno/professor entrega a resposta.

## B.1 Slides: nunca a foto do slide inteiro (regra)
• **Nunca** ponha na aula a foto ou o print do slide inteiro, nem como imagem, nem como "fonte", nem como "ver o slide original". O slide é matéria-prima: o texto dele vira texto da masterclass e as figuras dele são recortadas.
• **O texto do slide pode e deve ser usado**, só que escrito, não como foto: título, tópicos, listas e tabelas do slide são reescritos em HTML (texto, lista, tabela), logo abaixo da figura recortada ou no ponto do texto em que se encaixam. Destaques do slide (grifos, cores, negrito) viram grifo ou negrito no texto.
  - Exemplo: o slide "Enterobacterales – Espécies de maior importância médica" tem uma foto de bacilos à esquerda e a lista de espécies à direita. Errado: a foto do slide inteiro com uma legenda que repete a lista. Certo: só a foto dos bacilos (com a fonte), e embaixo a lista escrita (*Escherichia coli*; *Klebsiella pneumoniae*, *K. oxytoca*, *K. aerogenes*; *Enterobacter*…), com as grifadas no slide em destaque.
• Se o slide tem uma imagem (foto clínica, lâmina, gráfico, esquema, tabela desenhada), use **só a imagem**, recortada sem título, bullets, logo, rodapé ou numeração do slide. Se ela não sair limpa com pdfimages, rasterize e recorte só a área da figura.
• Slide que é só texto não vira imagem: vira texto, lista, tabela ou esquema em HTML.
• **Fonte confirmada embaixo de cada imagem + página de Referências**, na legenda (`<figcaption>`), depois do "o que olhar":
  - figura de livro citada ou confirmada: "Fonte: Robbins Patologia Básica, 10ª ed., Fig. 10-4" ou "Fonte: Rang & Dale, Farmacologia, 9ª ed., cap. 13" (não invente número de figura; sem certeza, cite só o capítulo);
  - imagem da internet: autor ou instituição, título e link/licença (ex.: "Fonte: Wikimedia Commons, Fulano, CC BY-SA 4.0, <link>", Unicamp, WebPath etc.);
  - artigo: autores, título, revista, ano e DOI ou link;
  - esquema feito por nós: "Esquema próprio, baseado em [livro/artigo/aula]";
  - **imagem sem origem identificada/confirmada: deixe sem linha de fonte** (nunca invente fonte, livro ou número de figura);
  - **página/seção "Referências" no fim de cada aula** (modelo: Patologia), listando apenas as fontes confirmadas daquela aula.
• **Crie esquemas quando ajudarem**: fluxogramas, tabelas comparativas, linhas do tempo, mapas de mecanismo, em HTML/CSS/SVG no visual do tema (claro e escuro). Quando valer a pena, faça interativo, como já existe em outros masters: hotspots, revelar etapa por etapa, arrastar para classificar, simulador com botões ou sliders (ver seção D).
• **Vá além do slide**: quando a figura do slide for ruim, pequena ou faltar, pesquise na internet, em livro de referência (o citado pelo professor primeiro) e em artigos outras imagens e esquemas melhores. Prefira fontes de uso livre (Wikimedia Commons, OpenStax, PubMed Central com licença aberta, sites de sociedades e do Ministério da Saúde). Toda imagem ou dado trazido de busca entra com a referência na legenda; o que for acréscimo nosso leva "■ EXTRA:".
• Se não achar imagem boa nem conseguir fazer um esquema, descreva em texto e avise o usuário que faltou a figura. Mesmo assim, nunca use o slide inteiro.

## C. Falas do professor (PDF anotado)
• As anotações do PDF anotado (no padrão deles: caixas verdes; em outra aula podem ser texto vermelho/manuscrito — confirme com o aluno) = o que o professor falou em aula. Insira cada fala como caixa “🗣️ O professor em aula” no ponto exato do conteúdo, entre aspas, com os termos-chave em negrito.
• Consolide todas as falas numa aba “O que o professor disse”, por aula, com “Recados diretos de prova” no topo (ex.: “tem que saber X”). Fala do tipo “não precisa saber” rebaixa aquele trecho no material.
• Quando uma anotação tiver erro (typo, conceito trocado, ex.: “clonidina agonista β-2”), mantenha a fala e acrescente uma caixa ⚠️ de correção explicando o certo.
• Se um recado do professor virou questão de prova, destaque isso (ex.: “saber varfarina e rifampicina” → caiu na 82:Q8).

## D. Gamificação (gamificar bastante tudo)
• Todo gráfico ou figura importante vira um widget interativo, não só imagem: explorar com hotspots, desafio “clique no ponto certo”, simulador com sliders/botões e MISSÕES, card game de classificação (com sequência e recorde), plantão com casos clínicos (escolher a conduta), “monte o gráfico” curva a curva, “preveja ↑/↓/=” etc.
• **🎮 Pratique o raciocínio (regra)**: quase toda aula ganha de 3 a 6 widgets que fazem a pessoa USAR o raciocínio do segmento, não só reler. Use o motor pronto `_tema/praticar.js` (v2), com os dados em `window.VG_PRATICAR` (bloco `<!--praticar:inicio-->…<!--praticar:fim-->` antes do `</body>`). Tipos disponíveis: `plantao` (pacientes, com hipótese → mecanismo → conduta, uma decisão por vez), `ordem` (monte a patogênese ou o fluxo), `classifique` (cartões em 2 a 5 categorias: "X ou Y?", "qual estrutura/fator/fármaco?"), `escore` (calculadora clínica da aula), `preveja` (prever direção ↑ / = / ↓ de parâmetros), `associar` (ligar pares entre duas colunas) e `hotspot` (clicar no ponto certo sobre uma imagem/exame/lâmina). Prefira o plantão quando a aula tiver conduta; o classifique para comparações que caem em prova; a ordem para cadeias causais; preveja/associar/hotspot para fisiopatologia, correlações e achados visuais. Cada resposta traz o porquê curto. A certa nunca aparece antes da escolha e nunca é a mais longa (seção E). Modelo: Microbiologia. Widgets sob medida (simulador com sliders) continuam bem-vindos quando a figura pedir.
• Sistema de XP (acerto de primeira, missões, discursivas autoavaliadas), níveis (de Calouro até o nome do professor) e uma aba “Arena” listando todos os widgets com o XP de cada um.
• Resets: por widget, por seção de questões e um botão global “Zerar todas as respostas do material” (com confirmação em dois cliques), que mantém grifos e “estudado”. Nunca use location.reload num reset — reconstrua o widget (isso já travou o plantão uma vez).

## E. Questões no estilo do professor
• Antes de escrever questões, analise as provas e as JUSTIFICATIVAS do professor atual: formatos (caso clínico → mecanismo, gráfico/figura do slide, cenário de laboratório com fármacos/preparações A–D, conceito → consequência, análise de afirmativas I–IV, associação fármaco–mecanismo, paradoxo, sinergia de duas classes), verbos de comando e padrões de distrator (fármaco certo com receptor errado, direção invertida, nível errado da cadeia, palavra absoluta, potência × eficácia, pseudomecanismo plausível).
• Use o MESMO número de alternativas das provas reais (Farmacologia: 4, A–D) e o formato “situação-problema + Comando:” separado.
• Nem toda questão precisa de gráfico: ~25% com imagem, o resto texto.
• Questões INÉDITAS: use as provas antigas para entender o estilo, sem reaproveitar a matéria/questão já cobrada.
• **Prova completa no espelho = cópia na íntegra (regra).** Quando o espelho da somativa (ou parcial) trouxer enunciado, comando, alternativas e justificativa — o padrão a partir da Somativa 83 —, a questão entra IDÊNTICA à prova, como a Parcial 81 de Microbiologia: texto copiado palavra por palavra (só se consertam quebras de linha e caracteres estragados do PDF), gabarito oficial e justificativa oficial depois de responder. Imagem da questão vai junto, recortada da prova. Anulada fica marcada como anulada e fora da nota. A reconstrução a partir da justificativa só vale quando a prova vier sem enunciado. A regra de alternativas equilibradas não se aplica ao texto original da prova.
• **Alternativas equilibradas: a certa NUNCA pode ser a mais longa por folga.** Vale para toda questão que nós escrevemos (autorais, reconstruídas da justificativa, simulados, quiz, Arena, flashcards com alternativas). Só o texto original de prova fica como veio.
  - Regra que o site confere: é desequilibrada a questão em que a certa é a maior **e** tem ≥ 1,3 × a média das erradas **e** passa a maior errada em ≥ 8 caracteres. Nenhuma questão nossa pode cair nisso.
  - Meta: todas com tamanho parecido (nenhuma com menos de ~60% da maior); pelo menos uma errada tão longa quanto a certa; a certa às vezes é a mais curta, às vezes a do meio. No conjunto da matéria, a certa só pode ser a mais longa em ~1 de cada 4 questões (o acaso).
  - Como: tire da certa a explicação embutida (parênteses, "pois…", "— …", exemplo); ela vai para o comentário. Dê às erradas o mesmo nível de detalhe técnico (mecanismo, número, consequência), errado pelo mesmo motivo do comentário delas.
  - Sem pistas trocadas: nada de palavra absoluta só nas erradas ("sempre", "nunca", "apenas") nem "pode/geralmente" só na certa; nada de repetir o enunciado só na certa; nada de errada absurda.
  - Letras do gabarito bem distribuídas.
  - Ao terminar um master ou um lote de questões, meça (comprimento da certa × das erradas) e corrija antes de publicar.
• Gabarito comentado por alternativa, com a cadeia de mecanismo em setas (fármaco → receptor → proteína G → segundo mensageiro → efeito).
• **Correção alternativa por alternativa (regra, modelo: Patologia).** Toda questão de múltipla escolha, de qualquer origem (prova, reconstruída, autoral, quiz, Arena, simulado), mostra depois da resposta o bloco "Por que as outras alternativas estão erradas", desenhado pelo `_tema/correcao.js` (visual no `_tema/vidro.css`, classe `.vg-cor`). Nada de lista própria de "por que as outras estão erradas" no master.
  - Cada questão traz, além do gabarito, `porque` (uma frase por alternativa errada: o erro dela e o que seria o certo; não comece com "Errada", não repita a alternativa; duas alternativas nunca com o mesmo porquê) e `trecho` (o pedaço exato da alternativa que a torna errada, copiado letra por letra, 2 a 8 palavras; alternativa curta vai inteira). Na certa, os dois ficam vazios.
  - O bloco só aparece depois de responder, põe primeiro a alternativa que a pessoa marcou ("sua resposta") e grifa o `trecho` em ondinha vermelha. A justificativa oficial continua embaixo, separada.
  - Como ligar: questão em objeto JS → `VGCorrecao.bloco(q, {pick})` na tela de correção (com `q.alts`, `q.gab` e `q.porque`/`q.trecho`, ou os dados do bloco `<!--porque:inicio-->` gravado pelo `importar_porques.py`); questão no HTML como a Farmacologia (`.q[data-a]` com `.opt[data-l] .ot`) → automático; simulado padrão → automático.
  - Questões que já existem sem porquê: `py exportar_questoes.py` (lotes em `_exportados/questoes/lotes/`, prompt em `_exportados/questoes/PROMPT.md`), outro modelo preenche, `py conferir_porques.py` confere (português, sem frase-modelo, trecho exato) e `py importar_porques.py` grava nos masters.
• Discursivas no molde do professor (receptor + proteína G + segundo mensageiro + efeito), com caixa de texto que salva, “ver resposta esperada” e autoavaliação (acertei / parcial / errei).

## F. Cruzamento com as provas
• Grifos de frequência (5 níveis) com tooltip que leva à questão no espelho da somativa, filtrado pela aula de onde o aluno veio. Espelhos com filtro por aula e tag da aula em cada questão.
• **Todo segmento com questão de prova tem grifo no texto (regra).** Pelo menos uma frase do texto que trata do assunto da questão vai grifada como `<mark class="examN|fqN" data-refs="PROVA:Q,...">` (N = quantas provas diferentes), e ao passar o mouse aparece o balão com as provas. Vale também para os segmentos "O que mais cai em prova" e para a página "⭐ O que mais foi cobrado" (o `_tema/revisao.js` já põe o balão no grifo do título). **O grifo vai no conteúdo que a questão cobra, nunca na introdução** ("A aula abre com dois casos...", caso clínico de abertura, pergunta retórica). Na Laboratorial, Imagem e Humanização o grifo é escolhido sozinho (`gfAlvos` no master): cada questão de prova do segmento (já sem repetidas) grifa a frase do texto, da lista ou do "🗣️ A professora destaca" que mais divide termos com a resposta certa e a justificativa oficial, com peso menor para enunciado, frase de introdução e frase de caso clínico; até 3 frases por segmento, cada uma com o balão só das provas dela. Ao pôr aula ou questão nova, confira: segmento com "📝 Das provas" e texto sem nenhum grifo é erro. Se a questão "mais próxima" não é tratada no texto do segmento, não force o grifo numa frase que não fala dela.
• Detecte justificativas IDÊNTICAS entre provas (inclusive reaproveitadas pelo professor atual) e liste na aba “Questões idênticas da banca”.
• **Nenhuma questão repetida no mesmo segmento.** A mesma questão de prova que caiu em várias provas (texto igual, ou reconstruída da mesma justificativa com outras palavras, ou com as alternativas em outra ordem) entra UMA vez no capítulo, com as outras provas no rótulo: "📝 Das provas · Somativa 80 · Questão 17 · também caiu em Somativa 78 · Questão 1". A contagem "Das provas · N questões" conta questões diferentes. Não copie a questão de prova para "Treinar mais: questões autorais" (nada de "Prova real — ..." entre as autorais); adaptada só entra lá se for de fato outra questão (outro caso ou outras alternativas). Mesmo caso com outro comando é outra questão e fica. Só as páginas de cada prova (Simulados, Parciais, Somativas) mostram a prova inteira, com as repetidas. Escreva "Questão N" por extenso no rótulo, porque o `publicar.py` conta a frequência por ele.
• Mantenha uma aba “Raio-X da prova do professor”: formatos e frequência, anatomia da questão, distratores, distribuição de letras do gabarito (como curiosidade, não estratégia), comandos usados, molde das discursivas, recados que viraram questão e figuras da aula que viraram questão.
• Erros em gabaritos/justificativas oficiais ou no material: nota ⚠️ de correção.
• A revisão final (resumo, V/F, checklist, casos em tabela, treino “só o caso”, ranking de frequência, verdades absolutas, pegadinhas) ganha uma seção para cada aula nova.

## G. Simulados
• Todo simulado roda no motor padrão `_tema/simulado.js` (`VGSim.lista` em matéria nova; veja a skill `/simulados-masterclass`). Nada de tela de início, cronômetro, placar ou correção próprios.
• O motor padrão já entrega: lista com "Provas anteriores" + "Simulados", **🎲 Monte seu simulado** unificado (combinar temas, filtrar *todas*, *só de prova*, *só as que errei* ou *inéditas* e escolher quantidade), cronômetro (3 min/questão, mostrando o tempo estourado), **riscar alternativas** (eliminação), botão **🧪 Valores** (`Alt+V`), marcação 🚩 para revisar, grade "Seu gabarito", autoavaliação nas dissertativas, **filtros na correção** (todas, só erradas, em branco, marcadas 🚩, por tema), **Refazer só as erradas**, desempenho por tema, "Copiar resultado" e **"Copiar histórico acumulado"**.

## H. Interface e robustez técnica
• Botão de TELA CHEIA (⛶) sempre visível: na barra lateral (inclusive recolhida) e na barra superior do celular. Usa a Fullscreen API; onde o navegador não permite (iPhone), vira “modo foco”, que esconde o supérfluo e amplia a área de leitura. O mesmo botão sai da tela cheia (✕), e Esc também funciona.
• HTML único e autocontido; imagens em base64 redimensionadas (≤ 1300 px, JPEG ~80) para o arquivo não ficar pesado.
• Ao mudar as alternativas de uma questão, versione (hash) para descartar respostas salvas antigas; ao adicionar aula nova, não altere as letras das questões das aulas anteriores (respostas do aluno continuam válidas).
• Tabelas com rolagem horizontal no celular, sem rolagem lateral da página.
• Teste no navegador (desktop e celular) antes de entregar: todos os widgets carregam, imagens aparecem, missões funcionam, resets e tela cheia funcionam, sem erros no console.
• Na mensagem final, diga o que foi SUPOSIÇÃO (ex.: “tratei o texto vermelho como fala do professor”) e peça confirmação.

---

# Prompt — Masterclass Completo com Provas Antigas - 2a parte da criação do masterclass: o foco em provas (necessita de provas antigas sen não houverem peça!)

Cole este prompt inteiro no início de uma conversa nova com o Claude, trocando o que está em `[COLCHETES]` pelas informações da matéria que você quiser (troque "Patologia Médica I" pelo nome da matéria, "Cardiovascular + Respiratório" pelos módulos/capítulos, etc). Anexe os slides/materiais de cada aula e os PDFs das provas antigas que você tiver.

---

## O pedido

Quero que você monte um **masterclass completo em HTML**, com foco total em me preparar pra prova, usando:

1. **Os materiais de cada aula** que vou anexar (slides, PDFs, apostilas) — uma aula = um capítulo do masterclass.
2. **As provas antigas** que vou anexar em PDF (parciais/provas anteriores da matéria) — você vai cruzar o conteúdo de cada aula com essas provas pra saber exatamente o que mais cai, o que é pegadinha, e o que nunca caiu. QUANDO RECEBER JUSTIFICATIVA DE SOMATIVAS QUERO QUE DESENVOLVA UM RACIOCÍNIO COMPLEXO - peça questões de provas antigas para que você compreenda como o professor desenvolve as questões, como ele faz distratores, como desenvolve casos clínicos e a partir das justificativas tente imaginar como eram as questões originais e desenvolva simulados de acordo com isso

Isso não é resumo raso — é material de estudo interativo e denso, do nível de detalhe que eu preciso pra realmente aprender e não só decorar.

## 1. Cada aula vira um capítulo interativo

Para cada aula/tema, monte um documento HTML autocontido (CSS e JS embutidos, sem depender de internet) com:

- **Navegação lateral por seções** (uma barra de navegação com os tópicos da aula, tipo sumário clicável).
- **Texto em prosa bem escrito**, organizado por tópico, explicando os mecanismos (causa → efeito), não só listando fatos soltos.
- **Tabelas comparativas** sempre que houver dois conceitos que a prova gosta de confundir (ex: doença A × doença B, mecanismo X × mecanismo Y).
- **Quiz de fixação ao final de cada seção/aula**, com perguntas de múltipla escolha, botão de "ver gabarito" que revela a explicação. **Meça bem os distratores**: as alternativas erradas precisam ter o mesmo tamanho/nível de detalhe que a certa — nunca deixe a alternativa certa visivelmente mais longa ou mais "completa" que as erradas, isso entrega a resposta sem eu precisar saber o conteúdo. Todo distrator devia ser um erro plausível (troca de termo parecido, troca de lateralidade/tempo/localização, mecanismo de uma doença vizinha), nunca um erro absurdo fácil de eliminar.
- **Sistema de 5 níveis de destaque por frequência em prova**, usando `<mark>` com 5 classes de cor (de "já caiu 1 vez" até "certeza absoluta / caiu quase toda prova"): verde → amarelo → laranja → vermelho → preto (preto = maior prioridade). Cada `<mark>` carrega um atributo tipo `data-refs="PROVA:QUESTÃO,PROVA:QUESTÃO"` listando exatamente em quais provas/questões aquele trecho foi cobrado (aceite também `PROVA:aberta1` para questão discursiva e `PROVA:?` para "tema geral, sem questão específica identificável").
- Ao passar o mouse sobre um trecho marcado, deve aparecer um **tooltip mostrando em quais provas/questões aquilo caiu**, com opção de clicar e ir direto pra questão correspondente na aba de simulados (ver seção 3).
- **Prioridade ao grifar de preto (nível mais alto)**: se um tema é claramente recorrente (aparece de formas diferentes em várias provas, mesmo que a redação mude), grife como preto e liste TODAS as provas relacionadas no `data-refs`, mesmo que algumas sejam como "tema geral" (`PROVA:?`) — não deixe o nível mais alto com uma referência solitária.
- Um pequeno checkbox ao lado de cada item da navegação, pra eu marcar o que já estudei.

## 2. Cruzamento com as provas antigas

Antes de escrever qualquer aula, **leia todas as provas antigas anexadas por completo** (extraia o texto se forem PDFs de imagem/escaneados). Para cada aula, identifique:

- Quais temas daquela aula já caíram, em quais provas, em quais questões exatas.
- Qual é a pegadinha/distrator mais repetido pra cada tema (coisas que a banca gosta de trocar: termo parecido, lateralidade, ordem cronológica, categoria maior/menor de um critério).
- Se o mesmo tema aparece em mais de uma prova com redações diferentes — isso é sinal de alta prioridade, grife como tal.

## 3. Aba "Simulados" — reprodução completa das provas antigas

Monte uma aba separada com **todas as questões de todas as provas antigas anexadas**, reproduzidas fielmente (enunciado completo, todas as alternativas, gabarito oficial), no mesmo formato interativo de quiz (clique na alternativa, botão "ver gabarito", explicação). Cada prova antiga vira uma sub-aba dentro de "Simulados". Inclua TODAS as questões da prova, mesmo as que não são do meu foco de matéria específico — quero a prova completa pra treinar tempo e formato real.
PEGUE A PROVA ANTIGA E CRIE UM SIMULADO INTERATIVO APENAS COM AS QUESTÕES DA PROVA, se houverem imagens na questão que não conseguiu exportar ou ficou confuso me avise aponte a questão e prova que quem mandou oprompt pode procurar e te mandar a imagem, bote um place holder vermelho falando que faltou imagem no lugar 

## 4. Juntar tudo em um arquivo único, navegável

Depois que cada aula e a aba de simulados estiverem prontos, **junte tudo em um único arquivo HTML final**, com:

- Uma barra lateral com um botão por aula + a aba de Simulados, permitindo trocar de aba sem perder o progresso.
- **Progresso persistente**: o que eu marquei como estudado (checkboxes) precisa continuar marcado mesmo se eu fechar e reabrir o arquivo depois. Uma bolinha ao lado do nome de cada aula na barra lateral mostra o progresso (cinza = nada, laranja = parcial, **verde só quando 100% da aula estiver concluída** — nunca verde por causa de uma seção isolada).
- **Barra lateral retrátil** (um botão pra minimizar/expandir, deixando mais espaço horizontal pro conteúdo).
- **Botão de tela cheia** ao lado do botão de recolher a barra lateral (e na barra do celular).
- **Fundo com uma cor sutil e diferente por aula/módulo** (tons escuros, baixa saturação, nunca cores berrantes) — só o suficiente pra dar uma sensação de "mudei de assunto" quando eu troco de aba depois de horas estudando o mesmo conteúdo. O texto continua sobre um fundo claro de leitura; só a margem/entorno muda de tom.
- **Barra de busca** no topo da barra lateral, que pesquisa em TODAS as aulas ao mesmo tempo (mesmo as que eu ainda não abri naquela sessão) e mostra os resultados agrupados por aula, com clique-pra-ir-direto ao trecho.
- **Marca-texto pessoal**: eu poder selecionar qualquer trecho de texto em qualquer aula e marcá-lo com uma cor que não é usada pelo sistema de frequência de prova (ex: rosa), pra eu grifar o que EU acho importante. Precisa persistir entre sessões, e dar pra clicar de novo no grifo pra remover.
- Se eu mandar simulados/questões extras que eu mesmo pedi que você criasse antes (baseado no estilo do professor), adicione como abas extras dentro de Simulados, separadas por dificuldade se eu especificar.

## 5. Capítulo "Revisão Final" — o mais importante de tudo

Ao final de tudo (depois da última aula), monte um capítulo extra chamado **"Revisão Final"**, pensado pra quem tem pouco tempo antes da prova e precisa saber exatamente o essencial. Ele deve ter, nesta ordem, cada um como uma sub-seção navegável:

1. **Resumo completo por aula** — não um resumo raso, mas denso o bastante pra ser uma boa revisão sozinha: se eu souber tudo que está aqui, vou bem na prova. Reaproveite os grifos de frequência (preto/vermelho) de cada aula.
2. **Pegadinhas clássicas (V/F)** — lista direta de "se aparecer isso, desconfie", puxada de tudo que já foi cobrado como item falso/trocado nas provas antigas.
3. **Checklist final** — lista curta dos pontos que, se eu souber de cabeça, cobrem a maior parte do peso da prova.
4. **"Foco do professor"** — se eu te disser que o professor avisou em aula que um tema específico vai cair, adicione (ou aprofunde) uma seção só sobre isso, com o nível de detalhe morfológico/mecanístico completo (não só a superfície), mesmo que já esteja mencionado em outro lugar.
5. **Casos clínicos clássicos, em tabela, por aula** — para cada doença de cada aula, uma linha de tabela com: a vinheta clínica "modelo" (a que a banca sempre usa), os achados que são **obrigatórios** pra aquele caso continuar sendo aquele diagnóstico (grifados), e uma coluna separada só com o principal distrator/pegadinha usado pra confundir aquele tema com o vizinho parecido.
6. **Treino "só o caso"** — um mini-quiz com vinhetas clínicas adaptadas do estilo real das provas antigas, perguntando só "qual o diagnóstico/mecanismo", com bons distratores (pensados pra confundir com o tema vizinho mais parecido, não erros óbvios).
7. **Estudo pras questões abertas/discursivas** — se as provas antigas tiverem questões discursivas com gabarito oficial, monte uma seção com: (a) dicas de técnica pra responder esse tipo de questão (responder item por item, usar o termo técnico exato, não reescrever o enunciado, explicar mecanismo como cadeia causa→efeito), (b) todas as questões discursivas reais encontradas nas provas antigas, com uma caixa de texto pra eu escrever minha resposta antes de revelar o gabarito oficial transcrito literalmente, (c) um banco de frases-prontas pra explicar os mecanismos mais comuns da matéria.
8. **Análise de frequência** — uma contagem de em quantas provas antigas cada tema apareceu, ordenado do mais repetido pro menos, com uma leitura prática de "por onde estudar primeiro se o tempo for curto" (deixe claro que é uma tendência estatística do banco disponível, não uma garantia) IMPORTANTE FALAR QUANDO UMA QUESTÃO SE REPETE IGUAL VARIAS VEZES.

## 6. "Minha Revisão" — painel dos meus erros e grifos (funcionalidade extra)

Depois que eu já tiver usado o masterclass por um tempo (feito quizzes, errado questões, grifado trechos de rosa), monte também um painel/aba **"Minha Revisão"** que junta automaticamente:

- toda questão de qualquer quiz (das aulas, do "treino só o caso", do quiz relâmpago) que eu errei ou nunca respondi,
- todo trecho que eu grifei de rosa,
- priorizando primeiro os temas marcados como maior frequência (preto/vermelho) e os que apareceram como mais repetidos na Análise de Frequência,

numa fila única de revisão, com link direto pra aula/questão original, sem eu precisar montar essa lista na mão navegando aula por aula. Essa fila deve se atualizar sozinha conforme eu uso mais o masterclass (mais erros/grifos = fila atualizada).

## 7. Cola de prova em PDF (documento separado, físico/impresso)

Além do masterclass em HTML, monte também uma **cola de prova em PDF, densa, de no máximo 4 páginas** (2 colunas por página), só com o que mais pesa e o que mais engana — nada de espaço em branco desperdiçado. Cada doença/tema deve ter uma caixinha curta e objetiva do tipo **"Fecha o caso quando: [achados exatos que fecham aquele diagnóstico, incluindo o que NÃO pode faltar]"**, além dos quadros de V/F, pegadinhas e tabelas comparativas que já são cobrados no masterclass. Se eu pedir pra tirar alguma seção (como uma análise estatística) pra caber no limite de páginas, substitua por mais achados de caso clínico específicos em vez de deixar espaço vazio.

## 8. Regras gerais de execução

- Peça pra eu anexar: (a) os materiais/slides de cada aula, (b) os PDFs das provas antigas, (c) se eu tiver, avisos do professor sobre o que vai cair.
- Se eu não deixar claro o escopo de alguma parte (ex: "quero a prova completa ou só as questões da minha matéria específica dentro de uma prova mista"), pergunte antes de fazer tudo.
- Vá construindo por partes (uma aula de cada vez, depois a junção final) e me avise conforme cada parte fica pronta, sem esperar tudo terminar pra eu ver o primeiro resultado.
- Sempre que eu pedir ajuste de estilo/cor/formatação depois de pronto, edite o arquivo que já existe — não crie um arquivo novo do zero.
- Se eu avisar que meu uso/orçamento de mensagens está acabando, priorize terminar o que está em andamento da forma mais direta possível, sem gastar tempo em verificações extensas que não sejam essenciais.

---

*Este prompt foi gerado a partir de um masterclass real de Patologia Médica I (Cardiovascular + Respiratório) construído nesta conta — pode ser reaproveitado pra qualquer matéria trocando os anexos e os nomes dos módulos.*

---

# I. Design, animação e recompensas (padrão Farmacologia_Somativas.html — aplicar SEMPRE)

Referência viva: Farmacologia_Somativas.html (Aulas 6–9). Copie dali tokens, CSS e JS em vez de reinventar. PORÉM É IMPORTANTE QUE CADA MATÉRIA TENHA UM POUCO DE PERSONALIDADE NÃO QUERO TODOS OS MASTERCLASSES UM IGUALZINHO AO OUTRO

## I.1 Visual
Redesign aprovado pelo aluno ("gostei do design, animações e botões"): aplicar SEMPRE em masterclass novo.
• Fontes Instrument Sans (texto) + Instrument Serif (títulos). Acento verde-petróleo (#1b6e66 claro / #5fc4ae escuro). Sem gradientes, sem glass.
• Cores só via variáveis em :root (--ground, --surface, --surface-2, --raised, --border, --ink, --ink-2, --muted, --accent, --ok, --bad, --ease-out:cubic-bezier(.23,1,.32,1), --ease-drawer:cubic-bezier(.32,.72,0,1)) redefinidas em :root[data-theme="dark"]. Tema escuro como padrão, botão de alternar com animação.
• Sidebar: um grupo aberto por vez, títulos curtos, recolhível, busca, tela cheia.
• Animações no estilo Emil Kowalski: sutis na leitura (150–250 ms, ease-out, scale(.97) no :active), mais presentes nas ações raras. Sempre respeitar prefers-reduced-motion.

## I.2 Questões
• Cada verificação de segmento tem seletor Fácil · Padrão · Difícil (3 questões por nível, data-grp "seg-f"/"seg-d"), nível salvo por segmento.
• Além dos simulados no formato da prova, gere um Simulado fácil e um Simulado difícil.
• Aba "💊 Todos os fármacos (A–Z)" (ou equivalente da matéria: agentes, doenças, achados) na Revisão final: nome, classe, mecanismo em uma linha, aula/segmento onde aparece (link), busca e filtro por aula; cartões no celular.

## I.3 Meme de recompensa
• Gabaritar um segmento (todas as questões certas, nenhuma errada) revela UM meme, em modal centrado (scale .96→1 + opacidade, 250 ms, ease-out; fecha com Esc, clique fora ou "Continuar"). Nunca mostre vários memes seguidos: NÃO existe botão "Outro meme".
• Baralho sem repetição: cada novo segmento gabaritado recebe a próxima carta do baralho embaralhado (imagens do aluno primeiro, depois cartões em HTML). Nenhum meme se repete até todos terem saído; só então reembaralha (sem repetir o último). O meme de cada segmento fica salvo; "rever" mostra o mesmo.
• Silhueta borrada da próxima carta no fim de cada verificação; hover mostra frase de curiosidade; clique enquanto trancado dispara animação aleatória (7 variações, sem repetir a anterior).
• Banco do aluno: "C:\Users\Vinib\OneDrive\Área de Trabalho\Medicina\memes" (subpastas por matéria, ex.: "memes farmaco"). Reduza para ≤ 900 px (JPEG ~80), embuta em base64 e converta para blob: URL em runtime. Código pronto: references/meme-recompensa.html (troque /*@@IMGS@@*/[] pelo JSON das imagens) e references/preparar-memes.mjs (usa o Chrome para redimensionar).

## I.4 Concluir aula e subir de nível
• Código pronto e testado: references/celebracoes.html. Cole antes do último </body>; não exige reescrever o JS existente. Ele detecta conclusão lendo localStorage (chave prefixo+"done") e o nível lendo o elemento #xpL, então funciona em qualquer material que siga a estrutura (.done-t[data-id], .it[data-id], .grp, #xpL, #xpN).
• Botão "Concluir segmento" grande no FIM de cada aba (além do topo), sincronizado com o do topo; desfazer não celebra.
• Concluir: overlay em tela cheia, ≤ 2,6 s, partículas temáticas por aula (neurônio/sinapse, bolhas, cápsulas, hemácias — troque por temas da matéria), badge com check desenhado, ondas, barra de progresso do módulo enchendo. Concluir o último item do módulo dispara a versão grande ("Módulo completo", 4,2 s).
• Subir de nível: overlay grandioso (≈ 5 s) com flash da cor do acento, número do nível, nome do nível em serifa enorme e chuva temática. Mostrado uma vez por nível (chave lvlseen).
• Sempre puláveis: botão "Pular", Esc ou clique. Fila (nunca duas ao mesmo tempo). prefers-reduced-motion: só fade, sem partículas. Só transform/opacity.
• Para outra matéria: ajuste LEVELS/MINXP, o mapa de temas (themeOf) e o desenho das partículas (drawP).

Prompt para aplicar em outro masterclass (qualquer matéria)
Cole na sessão do masterclass (skill masterclass-medica), trocando o que está entre [colchetes]. Vale para qualquer matéria: farmacologia, patologia, semiologia, microbiologia, fisiologia etc. Onde o texto fala em "tópicos que caem", use a unidade que importa na matéria: fármaco, doença, achado de exame, agente, mecanismo, via ou técnica.

Neste masterclass de [MATÉRIA], do professor [NOME], com as provas antigas [LISTA DE PROVAS] já analisadas, quero:

Questões de prova em cada capítulo. Cada seção ganha a aba "Das provas", aberta por padrão, com as questões reconstruídas a partir do gabarito e da justificativa oficial que tenham relação REAL com aquela seção. Procure em todas as provas, não só nas da mesma aula, porque um tema costuma aparecer em questão de outra aula. Coloque etiquetas em todas as questões: "📝 Questão de prova · Prova X · questão Y · gabarito oficial" ou "✍️ Autoral".

Seção sem prova. Mostre o aviso "Esta seção não foi cobrada diretamente nas provas", com uma mensagem que não desencoraje: a seção é a base, e um tema novo pode estrear na prova. Explique que você criou questões autorais, provavelmente diferentes das da prova, mas que ajudam a fixar. Ponha botões que levem aos níveis Fácil, Padrão e Difícil.

Página final de cada aula, "⭐ O que mais é cobrado". Pense em alguém que não estudou o tema e tem 30 minutos antes de uma prova importante para a carreira. A página segue esta ordem:

relação-chave (5 min): a ideia ou cadeia que organiza a aula inteira (mecanismo, fisiopatologia, classificação, raciocínio diagnóstico, o que fizer sentido na matéria), com um ESQUEMA SVG próprio para refazer de memória;
o que mais cai (10 min): tabela com os tópicos que o professor cobra (fármacos, doenças, achados, agentes etc., conforme a matéria) e a pegadinha de cada um;
figuras essenciais da aula (7 min): cada uma com "o que olhar", priorizando a que já virou questão. Em matéria visual (semiologia, patologia, microbiologia, imagem), este bloco pode ser o maior;
questões que mais se repetem (8 min): em ordem de recorrência, com o selo "caiu em N provas (lista)". Meça a recorrência pela justificativa igual. Complete com autorais marcadas quando faltar prova;
checklist de 1 minuto.
Os esquemas devem ser legíveis nos temas claro e escuro. Use fundos semitransparentes, nunca uma cor clara fixa.

Siglas com balão (grifo das abreviações), em TODAS as matérias. No texto do master (aulas, revisão, "O que mais é cobrado"), a sigla fica com sublinhado pontilhado e, ao passar o mouse (ou tocar, no celular), abre um balão de vidro com o significado: "TGP → transaminase glutâmico-pirúvica (ALT, mais específica do fígado)", "GGT → gama-glutamiltransferase (gama-GT)". Quem faz é o `_tema/siglas.js`, que o `publicar.py` põe em todos os masters e nas aulas de `aulas/`; o master não precisa de código próprio.
- Ao escrever uma aula, confira se as siglas dela estão no dicionário do `_tema/siglas.js`. Sigla nova vai em `SIG` (vale para todas as matérias), com o significado por extenso e, se ajudar, o porquê entre parênteses ("PCSK9 → enzima que degrada o receptor de LDL (alvo de anticorpos que baixam o LDL)").
- Sigla ambígua (FA = fosfatase alcalina ou fibrilação atrial; PA = pressão arterial ou incidência posteroanterior; IM = intramuscular ou insuficiência mitral) leva a lista de contextos: `[[/contexto/, 'significado'], [/outro/, 'outro'], 'padrão']`, procurados no parágrafo onde a sigla está. O contexto nunca pode conter a própria sigla. Sem contexto que bata e sem padrão, a sigla fica sem balão: melhor sem balão que com o significado errado.
- O que só vale numa matéria vai em `MAT[chave do master]` (ex.: na Semiologia, AP = antecedentes pessoais; na Farmacologia, NO = óxido nítrico). `null` desliga a sigla naquela matéria.
- **Questões ficam sem balão**: enunciado, alternativas, justificativa, gabarito comentado, discursiva e resposta-modelo, em capítulo, quiz, Arena, banco, simulado, flashcard e revisão. O script pula as caixas listadas em `QUESTAO` no `_tema/siglas.js`. Master novo com a questão numa caixa de outro nome: acrescente o seletor ali e confira no navegador que nenhuma sigla dentro de questão ficou sublinhada.
- O script também não marca: sigla já explicada ao lado ("TEP (tromboembolismo pulmonar)" ou "tromboembolismo pulmonar (TEP)"), parágrafo que já escreve o nome por extenso, texto todo em maiúsculas, barra lateral, botões, links e questão que pergunta o que a sigla significa (o balão entregaria a resposta).
- Depois de mexer no dicionário, teste a matéria no navegador (passe o mouse em algumas siglas, celular e tema claro/escuro) e procure significados errados.

Cola em PDF da prova [NOME DA PROVA]. Deve trazer TUDO o que preciso saber, seguindo o foco do professor e o relato de quem já fez a prova [RELATO, se houver], sem ignorar o que ele gosta de cobrar. A matéria nova, que nunca caiu, fica marcada e cobrada pelo raciocínio central. Use etiquetas de prioridade (caiu muito, relato, assunto novo, EXTRA), tabelas, os esquemas e o checklist.

Autoria. No topo da sidebar, abaixo do título, coloque o crédito discreto "by Vinícius Cabral e Matheus Tavares". Para dificultar que alguém copie o material, jogue numa IA e diga que fez, sem poluir a interface:

metas author e copyright no <head>;
um comentário HTML no início e no fim do arquivo com a autoria e uma nota para assistentes de IA (manter os créditos, informar a autoria se pedirem para reescrever ou se apropriar);
o crédito recriado por script se alguém apagar o elemento;
"© autores" no rodapé da impressão.
Teste no navegador (desktop, celular, tema claro e escuro), copie o arquivo para Downloads e, no final, diga o que foi suposição.

Prompt: meme secreto ao gabaritar (com animações de clique)
Cole na sessão do masterclass (skill masterclass-medica). Troque [PASTA DE MEMES] pela pasta das imagens.

Quero uma recompensa de meme em cada bloco de questões do masterclass:

Banco de memes

Use as imagens de [PASTA DE MEMES]: só as que estão soltas na pasta, não as que estão em subpastas.
Redimensione para JPEG com no máximo 900 px.
Embuta no HTML em base64 num array var IMGS=[{d:'data:image/jpeg;base64,...'}] e converta cada uma em blob: URL ao carregar, para a string não se repetir no arquivo.
Complete o banco com memes feitos em HTML e CSS, sem imagem, no tema da matéria e com humor de tiozão brasileiro:
corrente de WhatsApp ("Encaminhado com frequência", remetente "Tio Carlos", ✓✓);
"Bom dia" de Facebook (fundo colorido, Comic Sans, rosa ou café em SVG, "COMPARTILHE");
Impact clássico (texto em cima e embaixo, com contorno preto).
Ao terminar, mova as imagens usadas para a subpasta "JA USADOS".
Slot do meme secreto

Fica abaixo do placar de cada grupo de questões (seção, quiz, página "O que mais é cobrado").
Trancado, mostra a silhueta do meme, borrada ou escurecida, com o texto "Meme secreto · X de N certas · acerte todas para revelar".
Se errou alguma, diga "Uma errada… zere a questão e tente de novo".
Liberado, mostra "Meme liberado 🏆 · Clique para ver de novo".
Animações ao clicar no slot trancado (é a parte divertida)

Cada clique sorteia uma animação diferente da anterior, com a Web Animations API:
tremida lateral;
squash e stretch;
pulinho;
giro de 360°;
balançar;
flip 3D no eixo Y;
encolher e voltar.
Use easing com saída suave (cubic-bezier(.23,1,.32,1)) e duração entre 400 e 650 ms.
Junto aparece um balão com uma provocação sorteada, que some em cerca de 1,8 s e nunca repete a anterior. Exemplos:
"Ei! Clicar não libera 😤"
"Insistência não é posologia."
"Tá trancado. As questões estão logo acima ☝️"
Adapte as piadas à matéria.
Ao passar o mouse sobre o slot, aparece uma frase de suspense ("👀 Tem um meme aqui. Só aparece com gabarito perfeito.").
Respeite prefers-reduced-motion: só um fade, sem movimento.
Gabarito perfeito

Quando a última questão do grupo for conferida e todas estiverem certas de primeira, abra um modal com:
"N de N certas";
o título "Gabarito perfeito";
o meme grande;
uma legenda aleatória;
o botão Continuar.
Ele abre cerca de 750 ms depois do último acerto e tem entrada com scale de .96 para 1.
Fecha com Esc, clique fora ou o botão, e mantém o foco preso dentro do modal enquanto está aberto.
Baralho sem repetição

Nenhum meme se repete até todos terem saído. As imagens reais saem antes dos memes em HTML.
Cada grupo guarda o meme que sorteou, para rever o mesmo depois.
Salve no localStorage (com try/catch): os grupos liberados, o meme de cada grupo e o baralho restante.
O botão "Zerar respostas" não apaga os memes já liberados.
Robustez

Questões de simulado (data-sim) não têm meme.
Ao adicionar memes novos, acrescente ao array sem quebrar os já sorteados.
Teste no navegador: o slot trancado anima a cada clique, gabaritar abre o modal, recarregar a página mantém o meme liberado e não há erros no console.

---

# L. Padrão oficial do site para matéria nova (checklist obrigatório)

Todo master novo (de qualquer período, seja do Vinícius ou do Matheus) nasce integrado ao site e segue este padrão completo (modelo principal: **Microbiologia**, somado às ferramentas globais de `_tema/`). O `conferir.py` e o `auditar.py` validam estes itens; nunca dê um master por pronto com pendência sem listar o que falta.

## L.1 Registro, tema e navegação
- **Hub (`index.html`)**: registrar a matéria em `SUBJECTS` (com `name`, `href`, `desc`, `tags` e `periodo` quando for período diferente do 4º, para o `gerar_busca.py` gerar `p<N>.json` isolado).
- **Tema de vidro e Liquid glass**: rodar `python publicar.py --local` (injeta todos os scripts do `_tema/` com `?v=...` e otimiza imagens para `_img/` em WebP) e criar a **pele do master no `_tema/vidro.css`** (cor em `--vg-acc` + barra lateral e barra do celular com `backdrop-filter`).
- **Estrutura base**: conteúdo dentro de `<main>` (ou `#main`, `#view`, `.main`), botão de tema claro/escuro (`data-act="theme"`, `id="btnTheme"` ou `.themebtn`), botão de tela cheia, crédito "by Vinícius Cabral e Matheus Tavares" (exceto autoria própria registrada em `CREDITOS`/`DISPENSA`).
- **Primeira visita e sidebar**: se `window.VIDRO_NOVO` for verdadeiro, abrir a **página de boas-vindas** com todos os grupos da sidebar fechados; aulas agrupadas em blocos recolhíveis (**Parcial / Somativa / Pós-somativa**); painel **🎯 Foco de estudo** sempre abre fechado na barra lateral.
- **Adaptadores (quando necessário)**: incluir adaptador da nova chave em `_tema/foco.js` (`AD`), `_tema/abas.js` (`AD`), `_tema/siglas.js` (`MAT`/`QUESTAO`, se houver sigla específica ou classe nova de questão) e `elos.py`/`_tema/elos.js` (para matérias clínicas/Preventiva). Em `_tema/flashcards.js` e `_tema/retafinal.js`, matérias novas no padrão Microbiologia ou Caderno já são detectadas automaticamente.

## L.2 Conteúdo, imagens, questões e provas
- **Slides e imagens (seção B.1)**: nunca foto do slide inteiro; recortar só a figura e reescrever o texto/tabelas em HTML. Colocar **fonte confirmada** na legenda (`<figcaption>`); **imagens sem origem identificada ficam sem linha de fonte** (nunca inventar). Fechar cada aula com seção/página **Referências** contendo só as fontes confirmadas.
- **Provas e origem (seções E e F)**: espelho completo (padrão S83+) = cópia na íntegra (`📝 Das provas`); só justificativa = questão reconstruída (`📝 Questão de prova · reconstruída da justificativa`, nunca foto de justificativa e nunca vazar letra certa antes da resposta); autorais recolhidas (`✍️ Autoral`). Capítulo sem prova mostra o aviso "nunca caiu" antes das autorais.
- **Sem repetição e com grifo no texto**: cada questão de prova aparece uma vez no segmento ("também caiu em ..."), e todo segmento com questão de prova tem `<mark>` de frequência no conteúdo cobrado.
- **Qualidade das questões (seção E)**: **alternativas equilibradas** em toda questão nossa (autorais, reconstruídas, quiz, Arena, simulados) + **correção alternativa por alternativa** (`_tema/correcao.js`, campos `porque` e `trecho` em toda questão de múltipla escolha).
- **Siglas com balão**: conferir siglas novas da matéria em `_tema/siglas.js` (nunca em caixas de questão).

## L.3 Ferramentas de estudo obrigatórias no padrão
- **🃏 Flashcards por aula (`_tema/flash/<chave>.txt`)**: obrigatório em toda matéria teórica/clínica nova (exceções práticas entram em `DISPENSA` no `conferir.py`). Formato do arquivo:
  - cabeçalho `@titulo ...` e `@sub ...`;
  - blocos por aula `# <id-da-aula> | <título da aula>` (usando o mesmo id da aula no master, ex.: `a1`, `a2`, `aula1`);
  - cartas `Frente :: Verso :: Frequência` (ex.: `Caiu em 3 somativas`), com suporte a **Cloze** (`{{lacuna}}`), negrito/itálico/código e imagens `![legenda](caminho)`.
  - O `_tema/flashcards.js` v3 liga automaticamente: repetição espaçada (SRS), faixa contextual dentro de cada aula ("🃏 Flashcards desta aula" + "+ Adicionar à lista da disciplina", desbloqueio progressivo sem spoiler + opção "Liberar todos"), botão no Foco de estudo, item "🃏 Flashcards" em Reta final / Revisão final da sidebar e atalho nos Ajustes do Modo Foco.
- **🎮 Pratique o raciocínio (`_tema/praticar.js` v2)**: 3 a 6 widgets por aula em `window.VG_PRATICAR` (`plantao`, `ordem`, `classifique`, `escore`, `preveja`, `associar`, `hotspot`).
- **⏱️ Simulados (`_tema/simulado.js`)**: usar `VGSim.lista` com "Provas anteriores" + "Simulados"; o motor já adiciona **🎲 Monte seu simulado**, **riscar alternativas**, botão **🧪 Valores**, **filtros na correção**, **Refazer só as erradas**, autoavaliação dissertativa e **Copiar histórico acumulado**.
- **🔥 Modo Reta Final (`_tema/retafinal.js`)**: cronograma reverso automático até a data da prova priorizando o que mais cai (acessível pelo Foco de estudo e Modo Foco).
- **🧪 Valores de Referência (`_tema/valores.js`, `Alt+V`)**: gaveta rápida de exames disponível na matéria e nos simulados.
- **🔍 Busca instantânea isolada por período (`gerar_busca.py`)**: índices estáticos `_tema/busca/<chave>.json` (Modo Foco `Ctrl+K`) e `_tema/busca/p<N>.json` (Hub `Ctrl+K`), gerados automaticamente pelo `publicar.py`.
- **🖍️ Grifos e anotações v2 (`_tema/notas.js`)**: 3 cores pessoais (Rosa = Importante, Lilás = Dúvida/Revisar, Azul = Decorar/Fórmula) + exportar notas em Markdown.
- **📊 Meu rendimento (`_tema/concentracao.js`)** + **🍅 Pomodoro (`_tema/pomodoro.js`)** + **Editor ao vivo (`_tema/editor.js` + `mesclar_edicoes.py`)**: incluídos automaticamente pelo `publicar.py`.
- **Seções finais e recompensas**: cada aula fecha com quiz, **"⭐ O que mais é cobrado"** (seguindo o modo do Foco de estudo) e Arena; o master fecha com **Revisão final** (revisão em 1 hora com esquemas, tabelas e fluxogramas), **O que vai cair / Raio-X**, **Simulados**, **Flashcards** e **Minha revisão**; memes em `<pasta>/_img/memes.json` (~60).

## L.4 Validação antes de dar por pronto
1. `python publicar.py --local` — aplica tema, otimiza imagens, gera índices de busca e atualiza a vitrine se aplicável.
2. `python conferir.py` — **0 pendências** (se algum item não se aplica, registrar em `DISPENSA` com motivo).
3. `python auditar.py --detalhes` (ou `python conferir.py --auditar --detalhes`) — conferir 0 imagens quebradas, legendas/fontes, 0 alternativas desequilibradas em questões nossas, cobertura de `VG_PORQUE` e flashcards, 0 edições órfãs.
4. Testar no navegador (desktop + celular, claro + escuro): abertura das aulas, faixa de flashcards da aula, Modo Reta Final, Valores (`Alt+V`), Simulado / Monte seu simulado, Modo Foco (`Ctrl+K`) e ausência de laço contínuo em `MutationObserver`.
