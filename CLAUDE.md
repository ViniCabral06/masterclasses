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

## Onde fica cada coisa

| Caminho | O que é |
|---|---|
| `index.html` | Hub: períodos, matérias, fundo 3D. |
| `_tema/` | Tema de vidro compartilhado pelos masters. |
| `_tema/vidro.css` | Visual dos masters: claro/escuro, caixas de vidro grosso, celular e tablet. |
| `_tema/vidro.js` | Fundo 3D, lâmpada de cordinha do tema e monitor cardíaco (TH IV). |
| `_tema/modelos.js` | Modelos 3D. |
| `_tema/palco.js` | Palco 3D, com qualidade adaptativa. |
| `_tema/notas.js` | "Grifar com anotação": funciona sozinho em qualquer master e aula (o `publicar.py` inclui). Detalhes em "Grifos e anotações". |
| `publicar.py` | Tema, otimização e publicação. Os blocos entre `<!--vidro:...-->` nos masters são gerados por ele: não edite à mão. |

## Grifos e anotações

- Ao selecionar texto, o `_tema/notas.js` mostra "💬 Grifar com anotação". Se o master já tiver o botão de grifar dele (`#hlbtn`/`.hlbtn`, como Farmacologia e Microbiologia), aparece só "💬 Anotar", ao lado dele; se não tiver, aparecem "🖍 Grifar" e "💬 Grifar com anotação".
- A anotação abre na mesma caixinha escura das questões ("Caiu em X somativas"), com Editar e Remover.
- Fica no navegador de cada pessoa (`localStorage`, chave `vidro-notas:<caminho da página>`), ancorada pelo texto do trecho, então não depende da estrutura do master.
- Master ou aula nova não precisa de nada: o `publicar.py` põe o `notas.js` no bloco do tema, inclusive nas aulas separadas em `aulas/` (também nas que já existiam).
- O texto do master deve ficar dentro de `<main>` (ou `#main`, `#view`, `.main`); barra lateral, menus e botões ficam de fora de propósito.

## Cuidados de desempenho

O site é usado em celular e PC fraco.

- Não ponha `backdrop-filter` em caixas de conteúdo, só em barras fixas.
- Não embuta imagens em base64 sem passar pelo script.
- Teste no tamanho de celular antes de publicar uma mudança visual.

## Créditos

Mantenha "Design by Vinícius Cabral · Masterclass by Matheus Tavares e Vinícius Cabral" no hub e na tela de carregamento.
