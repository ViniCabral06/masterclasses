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
- Para ver no PC, sem enviar, rode `python publicar.py --local` e depois `python -m http.server 8765`.
- Depois de publicar, confira o build com `gh api repos/ViniCabral06/masterclasses/pages/builds/latest` e abra a página alterada.

## Masterclass nova

1. Ponha o HTML na pasta da matéria. Pode ser o arquivo gigante, com as imagens em base64.
2. Acrescente a matéria em `SUBJECTS` no `index.html`, seguindo as entradas que já existem.
3. Rode o script. Ele otimiza o arquivo e guarda o original em `_originais/`, que fica só naquele PC.

## Onde fica cada coisa

| Caminho | O que é |
|---|---|
| `index.html` | Hub: períodos, matérias, fundo 3D. |
| `_tema/` | Tema de vidro compartilhado pelos masters. |
| `_tema/vidro.css` | Visual dos masters: claro/escuro, caixas de vidro grosso, celular e tablet. |
| `_tema/vidro.js` | Fundo 3D, lâmpada de cordinha do tema e monitor cardíaco (TH IV). |
| `_tema/modelos.js` | Modelos 3D. |
| `_tema/palco.js` | Palco 3D, com qualidade adaptativa. |
| `publicar.py` | Tema, otimização e publicação. Os blocos entre `<!--vidro:...-->` nos masters são gerados por ele: não edite à mão. |

## Cuidados de desempenho

O site é usado em celular e PC fraco.

- Não ponha `backdrop-filter` em caixas de conteúdo, só em barras fixas.
- Não embuta imagens em base64 sem passar pelo script.
- Teste no tamanho de celular antes de publicar uma mudança visual.

## Créditos

Mantenha "Design by Vinícius Cabral · Masterclasses by Vinícius e Matheus" no hub e na tela de carregamento.
