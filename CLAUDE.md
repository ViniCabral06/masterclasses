# Regras do projeto Masterclasses de Medicina

Este projeto é feito por duas pessoas, Vinícius e Matheus, cada um no seu computador e com o seu Claude.
O repositório https://github.com/ViniCabral06/masterclasses **é** o site: o GitHub Pages publica o ramo `main`.
Site: https://vinicabral06.github.io/masterclasses/

Responda sempre em português (Brasil).

## Ao começar qualquer trabalho

1. Rode `git pull --rebase --autostash` na pasta do projeto antes de editar qualquer arquivo. O outro pode ter publicado algo.
2. Se o pull der conflito, pare e explique ao usuário o que conflitou, antes de resolver.
3. Pergunte, ou confira no histórico (`git log -5`), se o outro está mexendo na mesma matéria. Os dois não devem editar o mesmo master ao mesmo tempo.

## Publicar

- Publique **sempre** com `python publicar.py "mensagem"`. O script faz, em ordem:
  1. puxa as mudanças do outro;
  2. aplica o tema;
  3. tira as imagens embutidas dos HTMLs (vão para `_img/` como WebP);
  4. barra arquivos acima de 50 MB;
  5. faz o commit e envia.
- Só publique quando o usuário pedir.
- **Nunca** use `git push --force`, `git reset --hard` sobre trabalho enviado, nem reescreva o histórico do `main`.
- **Nunca** faça `git add` manual de PDFs, prompts, rascunhos, `_originais/`, `_site/` ou `_cache_otimizado/`. O `.gitignore` deixa tudo de fora de propósito: o que é site entra pelo script.
- O script põe uma versão no endereço dos arquivos do tema nos masters (ex.: `vidro.css?v=1a2b3c4d`, tirada do conteúdo). Assim, quem abre o site recebe o tema novo na hora, sem depender de Ctrl+F5. Não edite essas versões à mão.
- Para ver no PC, sem enviar, rode `python publicar.py --local` e depois `python -m http.server 8765`.
- Depois de publicar, confira o build com `gh api repos/ViniCabral06/masterclasses/pages/builds/latest` e abra a página alterada.

## Masterclass nova

1. Ponha o HTML na pasta da matéria. Pode ser o arquivo gigante, com as imagens em base64.
2. Acrescente a matéria em `SUBJECTS` no `index.html`, seguindo as entradas que já existem.
3. Rode o script. Ele otimiza o arquivo e guarda o original em `_originais/`, que fica só naquele PC.
4. Masters com `DOCS["x"]="<base64>"` (como o de Patologia) têm as aulas separadas pelo script em `<pasta>/aulas/`.
5. Sidebar: o master **sempre abre com a sidebar o mais recolhida possível**, com todos os grupos fechados na primeira visita. Se a pessoa já estava num capítulo, ele volta para onde ela parou, com só aquele grupo aberto.
   - O tema cuida disso para masters que navegam por `#hash`: o `<head>` restaura o hash salvo e define `window.VIDRO_NOVO` (`true` na primeira visita); o `vidro.js` salva o hash.
   - No código de abertura do master novo, quando `window.VIDRO_NOVO` for verdadeiro, feche todos os grupos (ver Farmacologia: `focusActive`; Microbiologia: `openGrp`).
   - Master sem hash (Patologia) guarda a posição por conta própria (`pato-pos`).
6. Teste a mudança no tamanho de celular e o tema claro e escuro.
7. **Regra: todo master entra com o design integrado e comparado com os outros**, seja do Vinícius ou do Matheus. Rode `python conferir.py` (o `publicar.py` também roda e mostra os avisos). Ele compara o master com o padrão da skill `masterclass-medica` (seção L) e com os outros masters, e aponta o que falta:
   - tema de vidro, botão de tema, texto em `<main>`;
   - primeira visita com boas-vindas e sidebar fechada;
   - blocos parcial / somativa / pós-somativa;
   - em cada capítulo, só questões de prova, ou o aviso "nunca caiu" mais as autorais recolhidas;
   - página "O que mais cai";
   - liquid glass (`_tema/liquido.js`) **e** a pele do master no `_tema/vidro.css` (barra lateral de vidro);
   - provas como questões (nada de foto de justificativa), cada questão com a origem marcada;
   - seções finais: revisão final, o que vai cair, simulados, minha revisão;
   - memes (`<pasta>/_img/memes.json`, ~60, revisados);
   - crédito "Vinícius e Matheus".

   Corrija tudo antes de dar o master por pronto. Se um item não se aplica (ex.: TH IV é prova prática), ponha o master em `DISPENSA` no `conferir.py`, com o motivo. Item novo no padrão entra em `ITENS` no `conferir.py` **e** na seção L da skill.

8. **Regra: Modelo: Microbiologia.** Todo master segue o que foi feito no de Microbiologia, seja do Vinícius ou do Matheus:
   - **Liquid glass de verdade.** O `liquido.js` só põe a lente onde o tema já põe vidro. Master novo precisa da sua pele no `_tema/vidro.css` (cor da matéria em `--vg-acc`, barra lateral e barra do celular com `backdrop-filter`); veja o bloco "MASTERS NOVOS". Sem ela a barra fica sólida, fora do tema.
   - **Questões, não fotos.** Prova que chegou só como justificativa de gabarito vira **questão reconstruída**: enunciado e alternativas imaginados no padrão da prova, gabarito na mesma letra e justificativa oficial embaixo. Foto ou recorte da justificativa não conta como questão e não entra no master (o OCR serve de matéria-prima). **Nunca mostre qual é a alternativa certa antes de a pessoa responder**: nada de letra no aviso, no rótulo, no título ou no botão da justificativa; a justificativa oficial (que entrega a resposta) só aparece depois de conferir.
   - **Origem de cada questão marcada**, sempre visível:
     - `📝 Das provas`: texto original da prova;
     - `📝 Questão de prova · reconstruída da justificativa`: com o aviso "Enunciado e alternativas reconstruídos a partir da justificativa oficial; o gabarito é o oficial";
     - `✍️ Autoral`: feita por nós, num bloco recolhível, nunca misturada com as de prova.
   - **Se o tema caiu na prova**: o capítulo diz quantas vezes caiu (grifo de frequência, "Caiu em N provas"); se nunca caiu, o aviso "nunca caiu" antes das autorais.
   - **Ordem em cada capítulo de aula, em todos os masters: primeiro as questões de prova**, incluindo as reconstruídas das justificativas (que contam como questão de prova e vão no capítulo do tema delas). Só depois, recolhidas, as autorais. Se o tema nunca caiu, o capítulo mostra o aviso "Este tema nunca caiu nas provas do acervo" e as autorais logo abaixo, como na Microbiologia. Toda justificativa nova que chegar vira questão reconstruída e entra no capítulo e na seção da prova.
   - **Nunca a foto do slide inteiro**: do slide sai só a imagem que ele tem, recortada, e o texto do slide (título, tópicos, tabelas) é escrito embaixo, em HTML; slide só de texto vira texto, tabela ou esquema (pode ser interativo). Toda imagem tem a fonte na legenda (livro, artigo, link ou "slides da aula N"); imagens e esquemas melhores podem vir da internet, de livro de referência ou de artigo, sempre com a referência. Detalhes na skill (seção B.1).
   - **Alternativas equilibradas**: em toda questão nossa (autoral, reconstruída, simulado, quiz, Arena), a certa nunca é a mais longa por folga. Regra e jeito de corrigir na skill (seção E).
   - **Sem questão repetida no segmento**: a mesma questão que caiu em várias provas (ou reconstruída da mesma justificativa) aparece uma vez, com "também caiu em ..." no rótulo; nada de cópia "Prova real — ..." nas autorais. Na Laboratorial, Imagem, Preventiva e Humanização o código já junta (`pvUnicas`); nos outros, confira ao pôr questão nova. Detalhes na skill (seção F).
   - **Cada aula** fecha com quiz, "⭐ O que mais é cobrado" e Arena.
   - **Seções finais**, como em Microbiologia: Revisão final (revisão em 1 hora **com esquemas**: tabelas, fluxogramas, comparações), O que vai cair, Simulados (com as provas anteriores em questões), Raio-X da prova e Minha revisão.
   - **Sempre avise o que falta.** Pode adicionar ou publicar um master incompleto se o usuário pedir, mas diga com todas as letras o que ainda falta ("ainda falta: questões reconstruídas da Somativa 81; revisão final sem esquemas"). Nunca dê como pronto um master com pendência no `conferir.py`.

## Onde fica cada coisa

| Caminho | O que é |
|---|---|
| `index.html` | Hub: períodos, matérias, fundo 3D. |
| `_tema/` | Tema de vidro compartilhado pelos masters. |
| `_tema/vidro.css` | Visual dos masters: claro/escuro, caixas de vidro grosso, celular e tablet. |
| `_tema/vidro.js` | Fundo 3D, lâmpada de cordinha do tema, monitor cardíaco (TH IV) e o botão "Personalização" (canto de baixo): tema claro/escuro, fundo degradê ou liso (clicar em Liso abre a escolha do tom: `#121413` ou `#000` no escuro; `#f7f8f7` ou creme `#fffaef` no claro), cor de destaque e liga/desliga dos efeitos 3D. Fica salvo para todos os masters em `vidro-fundo`, `vidro-cor` e `vidro-calmo`; as aulas em `aulas/` seguem pelo `extras.js`. |
| `_tema/modelos.js` | Modelos 3D. |
| `_tema/palco.js` | Palco 3D, com qualidade adaptativa. |
| `_tema/liquido.js` | Liquid glass real: refração do fundo na borda do vidro, com leve aumento (lente). Ver "Liquid glass". |
| `_tema/notas.js` | "Grifar com anotação": funciona sozinho em qualquer master e aula (o `publicar.py` inclui). Detalhes em "Grifos e anotações". |
| `_tema/segmentos.js` | Barra lateral v2 (uma linha com o nome curto; o item aberto mostra o título inteiro) + migalha "Aula › N. título", "Segmento X / Y" sob o título e ⭐ em "O que mais cai" (continua com concluir). O `publicar.py` inclui. Fonte padrão dos masters: Instrument Sans + Instrument Serif. |
| `_tema/extras.js` | Zoom ao clicar nas imagens do conteúdo e crédito no canto (o `publicar.py` inclui). |
| `_tema/memes.js` | Meme secreto ao gabaritar um grupo de questões. Lê `<pasta>/_img/memes.json`; respeita masters com sistema próprio (Farmacologia, Microbiologia, TH IV). |
| `_tema/foco.js` | Painel "🎯 Foco de estudo" no topo da barra lateral: grifo de frequência nas aulas e segmentos (parciais / somativas / todas / desligado), divisão das aulas escolhida pela pessoa ("a parcial da minha turma vai até a aula N") e grupo "✅ Já estudadas". Fica salvo por master em `vg-foco:<chave>`. Cada master tem um adaptador em `AD`; master novo precisa do seu. Na Patologia (aulas em `aulas/`, abertas em iframe), a frequência de cada segmento é contada pelo `publicar.py` nas aulas e gravada no master no bloco `vidro:foco` (`window.VG_FOCO`): aula ou questão nova entra sozinha ao publicar. TH IV fica de fora de propósito. O `publicar.py` inclui. |
| `_tema/simulado.js` | Simulado padrão do site, igual em todas as matérias: lista de provas e simulados, tela "Como você quer fazer?" (simular a prova ou entregar por questão; prova inteira na página ou uma questão por vez), cronômetro de 3 min por questão, dissertativa com contador, nota, grade "Seu gabarito" (letra marcada, verde ou vermelho, toque leva à correção), desempenho por tema, "Copiar resultado" e correção comentada. Fica salvo por master em `vg-sim:<chave>`. O `publicar.py` inclui. Ver "Simulados". |
| `_tema/abas.js` | **🥷 Modo foco** (opcional: só liga pelo botão na Personalização do `vidro.js`, salvo em `vidro-modo-foco` para todos os masters; recarrega a página). Modo direto ao ponto, no lugar da barra lateral: abas embaixo (📖 Aulas, 🎮 Arena e ⭐ Mais cai da aula aberta, ⏱️ Simulados, 📝 Notas, 🔍 Buscar, ⚙️ Ajustes com o painel do Foco). A barra encaixa embaixo, em cima ou nas laterais (vertical). A 🔍 Buscar lê o texto da matéria numa cópia escondida do master (`?vgindice`, que o `<head>` gerado pelo `publicar.py` impede de gravar no navegador); na Patologia lê direto `aulas/*.html`. Aulas e Simulados abrem uma lista limpa (aula: número, título, segmentos, x/N, verde quando concluída, cor de frequência do Foco). No segmento: ← Anterior · Concluir segmento · Próximo → no início e no fim. Sem fundo 3D, lâmpada nem painel do Foco. A barra lateral fica no DOM, escondida: o script lê as aulas dela e navega por ela. Um adaptador por master em `AD` (todos menos TH IV, de propósito). Só o PC foi acertado; celular fica para depois. O `publicar.py` inclui. |
| `_tema/revisao.js` | Revisão final nova dos masters em formato de caderno (Medicina Preventiva, Propedêutica laboratorial e de imagem): chave Parcial / Somativa (salva em `vg-revx:<matéria>`), ranking do que mais voltou, esquema e cartões por aula (pontos-chave `keys` e pegadinha `trap` de cada segmento, questão de prova para testar), "⭐ O que mais é cobrado" por aula e "🔁 Questões que se repetem" no Raio-X (agrupa por enunciado, alternativas ou justificativa oficial iguais). As divisões ficam em `CFG` no arquivo. O `publicar.py` inclui. |
| `_tema/elos.js` + `_tema/elos.json` | 🔗 Ligações entre matérias: depois da frase que cita um tema explicado em outra matéria, um 🔗 abre a caixinha escura com o que a outra matéria ensina e "Ir para o conteúdo" (nova guia, no segmento, piscando no trecho). Os dados vêm do `elos.py`. O `publicar.py` inclui. Ver "Ligações entre matérias". |
| `_tema/siglas.js` | Grifo das abreviações em todas as matérias: sigla com sublinhado pontilhado e balão de vidro com o significado ao passar o mouse ou tocar ("TGP → transaminase glutâmico-pirúvica", "GGT → gama-glutamiltransferase"). Dicionário único em `SIG` (sigla ambígua escolhe o significado pelo contexto do parágrafo) e o que muda por matéria em `MAT`. Questões nunca têm balão (enunciado, alternativas, justificativa, discursiva, simulado, Arena, flashcard): as caixas de questão de cada master estão em `QUESTAO`; master novo com outro nome de caixa entra ali. Também pula sigla já explicada ao lado, texto em maiúsculas e barra lateral. Sigla nova: acrescente lá e publique. O `publicar.py` inclui nos masters e nas aulas. Ver a skill `masterclass-medica`. |
| `elos.py` | Monta o `_tema/elos.json`: catálogo de conceitos, regras de ligação e descrições. Corpus local em `_elos/` (fora do Git). |
| `AGENTS.md` | Regras para o Codex (lê o CLAUDE.md e a skill). O `publicar.py` envia. |
| `.claude/skills/masterclass-medica/` | Cópia única da skill, usada pelo Claude Code e pelo Codex. Edite só aqui; o `publicar.py` envia. |
| `.claude/skills/simulados-masterclass/` | Skill dos simulados (`/simulados-masterclass`) e o texto completo do padrão (`instrucoes.html`). Cópia única, como a outra. |
| `conferir.py` | Confere se cada master tem o padrão do site e diz o que falta. |
| `publicar.py` | Tema, otimização e publicação. Os blocos entre `<!--vidro:...-->` nos masters são gerados por ele: não edite à mão. |

## Simulados

**Regra: todo simulado roda no simulado padrão (`_tema/simulado.js`).** Nada de tela de início, cronômetro, placar ou correção próprios num master.

- **Simulado novo, de qualquer matéria e período: use a skill `/simulados-masterclass`** (`.claude/skills/simulados-masterclass/`). Ela tem o fluxo, as regras das questões e onde pôr em cada master. O texto completo do padrão é o `instrucoes.html` da pasta da skill (fonte do PDF *Instruções Padrão para Criação de Simulados Interativos*). Mudou o padrão? Edite lá e gere o PDF de novo.
- Aba "Simulados" de um master: `VGSim.lista(host, {chave, grupos, aoFim})`, com o grupo "Provas anteriores" (cada prova inteira é um simulado) e, abaixo, "Simulados" (os nossos). Modelo: `vgSimMontar` em Humanização.
- Simulado em página ou painel próprio (Patologia, Farmacologia): `VGSim.um(host, {chave, item, livre})`. Modelo: `aulas/simulado4.html`.
- **Toda matéria tem a página "Simulados" com a grade de cartões** (Provas anteriores + Simulados), no modo normal e no 🥷 modo foco (a aba ⏱️ Simulados abre direto nela). Simulado que mora em outra página do master entra na grade com `ir()` no item: o cartão leva até ele. Modelos: `pane-sim-grade` na Farmacologia, `aulas/simgrade.html` na Patologia, `vgListaMontar` na Microbiologia.
- Cada questão: `{id, tag (origem), enun, alts, gab, com, grupo (tema)}`. Dissertativa: sem `alts` e sem `gab`; `com` é a resposta ideal.
- O tema (`grupo`) nunca aparece antes de a questão ser entregue; o motor já cuida disso.
- Se faltar algo, mude o `simulado.js`, para valer em todas as matérias.
- Ainda no gerador próprio: "Monte sua prova" da Farmacologia.

## Grifos e anotações

- Ao selecionar texto, o `_tema/notas.js` mostra "💬 Grifar com anotação". Se o master já tiver o botão de grifar dele (`#hlbtn`/`.hlbtn`, como Farmacologia e Microbiologia), aparece só "💬 Anotar", ao lado dele; se não tiver, aparecem "🖍 Grifar" e "💬 Grifar com anotação".
- A anotação abre na mesma caixinha escura das questões ("Caiu em X somativas"), com Editar e Remover.
- Fica no navegador de cada pessoa (`localStorage`, chave `vidro-notas:<caminho da página>`), ancorada pelo texto do trecho, então não depende da estrutura do master.
- Master ou aula nova não precisa de nada: o `publicar.py` põe o `notas.js` no bloco do tema, inclusive nas aulas separadas em `aulas/` (também nas que já existiam).
- O texto do master deve ficar dentro de `<main>` (ou `#main`, `#view`, `.main`); barra lateral, menus e botões ficam de fora de propósito.

## Liquid glass

**Regra: o site inteiro usa o tema liquid glass.** Hub, masters, aulas e qualquer página nova entram com ele; nada de vidro próprio ou visual à parte.

- O `_tema/liquido.js` dá a cada peça de vidro um mapa de refração feito do tamanho e do raio dela. O `publicar.py` inclui o arquivo nos masters e nas aulas; o hub carrega direto.
- Vale para barras, botões, cartões do hub e janelas flutuantes. Peça flutuante nova: ponha `data-liquido` nela (ou acrescente o seletor em `SEL`, no `liquido.js`) e dê a ela um `backdrop-filter` de vidro fosco, que é o que fica quando a lente não liga.
- Caixas de conteúdo (questões, cards de texto) não recebem a lente: seguem "Cuidados de desempenho".
- A lente só liga em Chrome/Edge no PC. Safari, Firefox, celular e PC fraco ficam com o vidro fosco: é de propósito, não "conserte".
- O `conferir.py` acusa master sem o `liquido.js`.

## Ligações entre matérias (🔗)

Entram as matérias de conteúdo clínico e a Preventiva (epidemiologia): Microbiologia, Patologia, Farmacologia, Laboratório, Imagem, Semiologia, Preventiva e DIC IV. Humanização, Português e TH IV ficam de fora de propósito.

- O 🔗 fica no fim da frase que cita o tema. Ao passar o mouse (ou tocar, no celular), abre a caixinha escura, no mesmo visual das anotações, com a matéria, a aula e o segmento, uma descrição curta e "Ir para o conteúdo". Toda ligação vale nos dois sentidos.
- O 🔗 é desenhado pelo CSS (`.vg-elo::after`), sem texto no DOM: não mexe na 🔍 Buscar nem na âncora dos grifos. Nunca entra em questões, títulos, legendas nem botões.
- "Ir para o conteúdo" abre `<master>?elo=<conceito>&seg=<segmento>`. O `elos.js` do destino abre o segmento, rola até o trecho e pisca nele (`mark.vg-elo-alvo`). Na Patologia ele roda no master e trabalha dentro do iframe da aula.
- Equilíbrio: só liga quando a outra matéria explica de verdade (tem um segmento "casa" do tema). Até 4 🔗 por segmento, e até 3 segmentos de uma matéria apontando para o mesmo tema na mesma matéria.
- **Aula nova ou segmento novo:** colete o corpus de novo (`python elos.py --js` mostra o código de coleta; os arquivos vão para `_elos/corpus/`) e rode `python elos.py --faltam`. Escreva as descrições que faltarem em `_elos/descricoes.json` (uma por conceito × matéria de destino, tirada do segmento-casa da matéria de destino), rode `python elos.py` e publique.
- Tema novo que cruza matérias: acrescente em `C` no `elos.py` (rótulo e sinônimos em regex sem acento; com `=` no início, diferencia maiúsculas). Se a palavra tiver outro sentido numa matéria, use `SEM_CASA` ou `SEM_ORIGEM`. Se a contagem escolher a casa errada, corrija em `CASA`.
- Master novo nas ligações: acrescente em `ORD`/`MATS` no `elos.py` e um adaptador em `AD` no `_tema/elos.js` (segmento aberto, raiz do texto, como abrir um segmento).

### Caixas "🔗 LIGA COM O SEGMENTO / A AULA" (dentro da mesma matéria)

- Mostram, no meio do texto, que um tema já foi (ou vai ser) explicado em outro segmento da mesma matéria, e por que isso importa ali. É o mesmo formato das caixas feitas à mão na Patologia e na Farmacologia. Só texto, sem botão.
- Entram em todas as matérias com aulas, menos TH IV. No máximo 1 por segmento, e nunca em segmento que já tem uma caixa "LIGA COM" feita à mão.
- O `elos.js` põe a caixa logo depois do parágrafo, da lista ou da tabela que cita o tema, num `<aside class="vg-liga">`. O `notas.js` ignora `aside`, então a caixa não mexe nos grifos. O estilo está no `_tema/vidro.css`, com claro e escuro.
- Os dados ficam no campo `i` do `_tema/elos.json`: `{matéria: {segmento: {r: rótulo, p: [regex da âncora, sem acento], t: texto}}}`. O `elos.py` preserva esse campo ao recalcular as ligações. Caixa nova vai em `_elos/caixas.json` (mesmo formato) e entra ao rodar `python elos.py`.

## Cuidados de desempenho

O site é usado em celular e PC fraco.

- Não ponha `backdrop-filter` em caixas de conteúdo, só em barras fixas.
- Não embuta imagens em base64 sem passar pelo script.
- Teste no tamanho de celular antes de publicar uma mudança visual.

## Créditos

Mantenha "Feito por: Matheus Tavares e Vinícius Cabral" no hub e na tela de carregamento (igual aos masters).

Exceção: o master de **DIC IV é do Thiaginho** e diz só "Made by Thiaginho" (barra lateral, rodapé e tela de carregamento). A tela de carregamento vem de `CREDITOS` no `publicar.py`; o `data-credito-proprio` no master impede o selo do `extras.js`; o `conferir.py` dispensa o item do crédito em `DISPENSA`. Master de outra autoria segue o mesmo caminho. O DIC IV é editado direto no HTML: não rode de novo o `_planos/montar_dic.py`.

## Vitrine 83B (cópia separada)

- A vitrine da turma 83B (propaganda, só 6 matérias) mora em `83b/` e é **gerada** por `python gerar_83b.py`, a partir dos masters já processados. A propaganda (`_83b/propaganda.js`) existe **só** nessa cópia.
- **Regra: nada da vitrine pode entrar no site normal** (hub, masters, `_tema/`, `publicar.py` sem propaganda ou filtro). Atualizou os masters? Pode rodar o `gerar_83b.py` de novo para a vitrine acompanhar; o contrário nunca.
- **Regra: toda atualização das aulas que já estão na vitrine vale para os dois** (site completo e vitrine). O `publicar.py` roda o `gerar_83b.py` sozinho antes de cada envio (e no `--local`), então a vitrine acompanha sem passo extra. Se o gerador falhar, o envio é cancelado. Matéria nova na vitrine: acrescente em `MASTERS` e `MANTER` no `gerar_83b.py`.
- Contatos, matérias do 5º período e textos: topo de `_83b/propaganda.js`; ajustes do hub e do master de Patologia: constantes do `gerar_83b.py`.
