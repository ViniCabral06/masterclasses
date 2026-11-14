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
   - **Cada aula** fecha com quiz, "⭐ O que mais é cobrado" e Arena.
   - **Seções finais**, como em Microbiologia: Revisão final (revisão em 1 hora **com esquemas**: tabelas, fluxogramas, comparações), O que vai cair, Simulados (com as provas anteriores em questões), Raio-X da prova e Minha revisão.
   - **Sempre avise o que falta.** Pode adicionar ou publicar um master incompleto se o usuário pedir, mas diga com todas as letras o que ainda falta ("ainda falta: questões reconstruídas da Somativa 81; revisão final sem esquemas"). Nunca dê como pronto um master com pendência no `conferir.py`.

## Onde fica cada coisa

| Caminho | O que é |
|---|---|
| `index.html` | Hub: períodos, matérias, fundo 3D. |
| `_tema/` | Tema de vidro compartilhado pelos masters. |
| `_tema/vidro.css` | Visual dos masters: claro/escuro, caixas de vidro grosso, celular e tablet. |
| `_tema/vidro.js` | Fundo 3D, lâmpada de cordinha do tema e monitor cardíaco (TH IV). |
| `_tema/modelos.js` | Modelos 3D. |
| `_tema/palco.js` | Palco 3D, com qualidade adaptativa. |
| `_tema/liquido.js` | Liquid glass real: refração do fundo na borda do vidro, com leve aumento (lente). Ver "Liquid glass". |
| `_tema/notas.js` | "Grifar com anotação": funciona sozinho em qualquer master e aula (o `publicar.py` inclui). Detalhes em "Grifos e anotações". |
| `_tema/segmentos.js` | Barra lateral v2 (uma linha com o nome curto; o item aberto mostra o título inteiro) + migalha "Aula › N. título", "Segmento X / Y" sob o título e ⭐ em "O que mais cai" (continua com concluir). O `publicar.py` inclui. Fonte padrão dos masters: Instrument Sans + Instrument Serif. |
| `_tema/extras.js` | Zoom ao clicar nas imagens do conteúdo e crédito no canto (o `publicar.py` inclui). |
| `_tema/memes.js` | Meme secreto ao gabaritar um grupo de questões. Lê `<pasta>/_img/memes.json`; respeita masters com sistema próprio (Farmacologia, Microbiologia, TH IV). |
| `_tema/foco.js` | Painel "🎯 Foco de estudo" no topo da barra lateral: grifo de frequência nas aulas e segmentos (parciais / somativas / todas / desligado), divisão das aulas escolhida pela pessoa ("a parcial da minha turma vai até a aula N") e grupo "✅ Já estudadas". Fica salvo por master em `vg-foco:<chave>`. Cada master tem um adaptador em `AD`; master novo precisa do seu. Patologia (dividida por sistema) e TH IV ficam de fora de propósito. O `publicar.py` inclui. |
| `conferir.py` | Confere se cada master tem o padrão do site e diz o que falta. |
| `publicar.py` | Tema, otimização e publicação. Os blocos entre `<!--vidro:...-->` nos masters são gerados por ele: não edite à mão. |

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

## Cuidados de desempenho

O site é usado em celular e PC fraco.

- Não ponha `backdrop-filter` em caixas de conteúdo, só em barras fixas.
- Não embuta imagens em base64 sem passar pelo script.
- Teste no tamanho de celular antes de publicar uma mudança visual.

## Créditos

Mantenha "Design by Vinícius Cabral · Masterclass by Matheus Tavares e Vinícius Cabral" no hub e na tela de carregamento.
