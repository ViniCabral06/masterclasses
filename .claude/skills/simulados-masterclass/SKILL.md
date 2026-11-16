---
name: "simulados-masterclass"
description: "Cria simulados de prova (somativa ou parcial) para a masterclass de uma disciplina do site de masterclasses de medicina, no padrão único do site. USE SEMPRE que o usuário digitar “/simulados-masterclass”, ou pedir para criar, montar, gerar ou adicionar um simulado (ou simulados) de qualquer matéria/disciplina/período, ou mandar justificativas de somativa para virar questões. Faz a leitura da masterclass e das provas antigas, mostra o banco de desempenho, escreve as questões no estilo do professor (com controle anti-padrão e gabarito comentado alternativa por alternativa), reconstrói questões a partir de justificativas oficiais e coloca o simulado na aba Simulados da matéria, rodando no simulado padrão (_tema/simulado.js)."
---

# Simulados das masterclasses

Todo simulado de qualquer disciplina, de qualquer período, segue este padrão — seja do Vinícius ou do Matheus. Não existe simulado "do jeito daquela matéria": muda o conteúdo e o estilo do professor, nunca o formato.

O texto completo do padrão, com todos os detalhes e o exemplo, está em [`instrucoes.html`](instrucoes.html), nesta pasta (é a fonte do PDF *Instruções Padrão para Criação de Simulados Interativos*). **Leia o `instrucoes.html` inteiro antes de começar.** Abaixo, o fluxo e as regras que não podem falhar.

Responda sempre em português (Brasil). Siga também o `CLAUDE.md` do projeto (pull antes de editar, publicar só com `publicar.py` e só quando pedirem).

## Entrada

Modelo de pedido: “Simulado de [matéria] — [somativa | parcial]. Base: masterclass de [matéria]. Nível: [básico | intermediário | avançado — padrão: o da prova real].”

Se faltar a matéria ou o tipo de prova, pergunte (uma vez, as duas coisas juntas). O resto tem padrão:

| Pedido | Fechadas (ABCD) | Dissertativas | Tempo |
|---|---|---|---|
| Somativa | 30 | — | 90 min |
| Parcial | 21 | 3, com resposta ideal | 72 min |

4 alternativas, uma correta; dissertativa até 500 caracteres; o tempo é sempre 3 min por questão, contado pelo site. Número de questões do pedido vale mais que o padrão.

Matérias e períodos: veja `SUBJECTS` no `index.html` (hoje, 4º período). Matéria de outro período segue o mesmo padrão; se o master ainda não existir, avise — o simulado entra na aba Simulados do master da matéria.

## Fluxo

1. **Fase 0 — leitura (obrigatória).** Da masterclass: tópicos e peso nas provas (grifo "Caiu em N provas", "O que mais cai", Raio-X), valores de referência, pegadinhas. Das provas antigas e justificativas: linhas do enunciado e das alternativas, formato do comando, vocabulário, tipo de raciocínio, formatos usados, nível e padrão dos distratores. Essas medidas são molde rígido.
2. **Banco de desempenho.** Mostre a tabela de temas (Tema | Feitas | Acertos | Erros | % erro | Peso) e a divisão das questões entre eles. Peso pelo % de erro: Normal 0–30% (1×), Alto 31–60% (2×), Prioritário >60% (3×), combinado com a incidência nas provas. Na 1ª rodada parte da incidência; nas seguintes, do texto que a pessoa colou do botão **"Copiar resultado"**. **Espere a confirmação** antes de escrever as questões.
3. **Escrever as questões** (regras abaixo).
4. **Checklist** do `instrucoes.html` (seção 12), questão por questão e no simulado inteiro.
5. **Pôr no site** (seção "Entrega"), testar e rodar `python conferir.py`.
6. **Avisar no chat** as pendências: justificativa curta demais, gabarito discutível, questão anulada, tema sem cobertura.

## Regras das questões

- **Fontes:** masterclass da matéria, provas antigas, justificativas oficiais. Toda questão respaldada por elas.
- **Pode** reaproveitar questões de prova (inclusive as reconstruídas). **Nunca** copie as autorais da masterclass (quiz, Arena, ✍️): o simulado precisa ser inédito para quem estudou.
- Questão nova: pense como o professor — parta de um achado, mecanismo ou correlação e construa vinheta original.
- Fora da matéria da prova e questões bônus: fora.
- **Estilo:** enunciado com o número de linhas das provas reais; comando de 1 linha no mesmo formato; alternativas sem listas ou tabelas, no tamanho das reais. Varie os formatos na proporção do professor: ABCD clássico, afirmativas I–IV, sequência temporal, associação, caso compartilhado (2 a 4 questões seguidas), achados descritos em texto.
- **Anti-padrão (absoluto):** as 4 alternativas com comprimento e estilo uniformes; a correta nunca é a mais longa ou a mais curta; termo-chave do enunciado nunca só na correta; cada distrator é um erro conceitual real e só uma alternativa é defensável; gabarito equilibrado entre A, B, C e D (as reconstruídas mantêm a letra oficial).
- **Ordem:** embaralhada por blocos (questão avulsa = 1 bloco; caso compartilhado = 1 bloco, na ordem). Nunca agrupado por tema.
- **Gabarito comentado:** todas as alternativas justificadas, A a D na ordem, a certa marcada "(certa)" — 2 a 4 linhas cada, com a regra clínica e, na errada, o trecho que a torna falsa. Afirmativas I–IV: cada uma como verdadeira ou falsa. Questão de prova: 📄 justificativa oficial na íntegra, embaixo e separada. Sempre 📚 o capítulo da masterclass.
- **Origem sempre visível:** `📝 Das provas` · `📝 Questão de prova · reconstruída da justificativa · Somativa X, questão Y` (com o aviso "Enunciado e alternativas reconstruídos a partir da justificativa oficial; o gabarito é o oficial") · `✍️ Nova`.
- **Nunca entregue a resposta antes da hora:** nada de letra no rótulo, título, aviso ou botão; o tema e a justificativa oficial só depois de entregar; o enunciado reconstruído não copia frase da justificativa que denuncie a certa.

### Justificativas oficiais (somativa não liberada)

Viram **questões reconstruídas** — nunca foto, recorte ou texto solto. Passo a passo no `instrucoes.html` (seção 11): extrair o que a justificativa diz → descobrir o formato pelas pistas → reconstruir o enunciado sem contradizê-la → alternativa certa só com o que ela sustenta → erradas pelos erros que ela aponta ou pelas confusões típicas → letra oficial → gabarito comentado. Não mude o gabarito; se parecer errado, avise e anote como comentário nosso. Justificativa curta demais: não invente questão de prova — liste como pendência e cubra o tema com `✍️ Nova`. Se a masterclass já tem a reconstrução, use a mesma. Toda reconstruída entra também no capítulo do tema e na prova correspondente em "Provas anteriores".

## Entrega: o simulado padrão do site

O simulado **não** é uma página à parte. Ele entra na **aba "Simulados" do master da matéria** e roda no `_tema/simulado.js`, que já faz tudo: lista, tela "Como você quer fazer?" (simular a prova ou entregar por questão; prova inteira ou uma por vez), cronômetro, marcar para revisar, retomar de onde parou, dissertativa com contador, nota, **grade "Seu gabarito"** (a letra marcada em cada questão, verde se acertou, vermelho se errou, tracejada se ficou em branco; tocar leva à questão na correção comentada, que tem "↑ Voltar ao gabarito"), desempenho por tema, "Copiar resultado" e correção comentada.

**Nunca** crie tela de início, cronômetro, placar, grade ou correção próprios. Se o padrão não fizer algo de que o simulado precisa, mude o `simulado.js` — vale para todas as matérias — e avise.

### Cada questão

```js
{ id: 'sim3-q07',                 // único e estável: o site guarda erros e acertos por ele
  tag: '✍️ Nova',                  // origem
  enun: '<p>Vinheta…</p><p>Comando…</p>',
  alts: ['…', '…', '…', '…'],     // A, B, C, D. Dissertativa: sem alts
  gab: 2,                          // índice da certa (0 = A). Dissertativa: sem gab
  com: '<ul><li><b>A (errada):</b> …</li>…</ul><p>📄 …</p><p>📚 …</p>',  // dissertativa: a resposta ideal
  grupo: 'Nome do tema',          // igual ao do banco de desempenho
  lim: 500 }                       // só dissertativa, se não for 500
```

### Onde pôr, por master

- **Masters com `VGSim.lista`** (Humanização, Medicina preventiva, Propedêutica de imagem e laboratorial, Português): acrescente um item ao grupo "Simulados" em `vgSimMontar` (Português: em `rSim`) — `{id, tag, titulo, desc, qs: () => [...]}`. As questões ficam num bloco de dados do master; não espalhe pelo código.
- **Microbiologia:** os simulados entram na lista da página (`PRESETS` / `provaPanel`), com as questões no banco do master (`QMAP`), e rodam no padrão pelo `vgSimMontar` dela.
- **Patologia:** página nova em `Patologia médica/aulas/simuladoN.html` (modelo: `simulado4.html`), entrada em `SUBJECTS`/`DOCS` e no grupo "Provas e simulados" do master, e `VGSim.um(...)`.
- **Farmacologia:** painel novo `pane-…` com `<div class="sim" data-sim="…">` e as questões no formato dos outros; o bloco `vgsim` do fim do arquivo liga sozinho.
- **Master novo:** use `VGSim.lista` como na Humanização.

Simulado de prova antiga entra em "Provas anteriores"; o nosso, em "Simulados", com nome curto, uma linha de descrição e se é de somativa ou parcial.

### Testar antes de dizer que está pronto

- `python publicar.py --local` e o servidor local; abra a aba Simulados da matéria.
- Faça o simulado nas duas entregas e nas duas telas, até a nota. Confira: nenhuma pista do gabarito antes de entregar, todas as alternativas comentadas, tema aparece depois; na nota, a grade "Seu gabarito" com as cores certas e o toque levando à questão, "Desempenho por tema" e "Copiar resultado".
- Tela de celular e temas claro e escuro.
- `python conferir.py` sem pendência.
- Publicar só se pedirem, com `python publicar.py "mensagem"`.

## Ao terminar

Diga o que foi feito e **o que falta**, com todas as letras ("ainda falta: reconstruir as questões 12 e 19 da Somativa 81, justificativa curta demais"). Nunca dê como pronto um simulado com pendência.
