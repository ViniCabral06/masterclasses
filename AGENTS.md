# Regras para o Codex (e qualquer outro agente) neste repositório

Este repositório é o site "Masterclasses de Medicina" (GitHub Pages publica o `main`).
Vinícius e Matheus mexem nele, cada um com o seu Claude Code, e também com o Codex.
Responda sempre em português (Brasil).

## Leia antes de qualquer tarefa
1. `CLAUDE.md`: regras oficiais do projeto. Valem para você igual valem para o Claude.
   Se algo aqui contradizer o CLAUDE.md, o CLAUDE.md ganha, e você avisa a diferença.
2. `.claude/skills/masterclass-medica/SKILL.md`: a skill que define o padrão das masterclasses
   (o Claude Code lê esse mesmo arquivo). É a ÚNICA cópia oficial da skill.

## Skill compartilhada (sincronia automática)
- Existe uma só skill: `.claude/skills/masterclass-medica/SKILL.md`. Claude e Codex leem o mesmo arquivo,
  então uma mudança feita por qualquer um vale para os dois depois do `git pull`.
- Não crie cópia da skill em outra pasta (`~/.codex/skills`, `.agents/skills` etc.). Cópia = versões divergentes.
- Mudou a skill? Diga o que mudou e publique com `python publicar.py "Skill: ..."`, só quando pedirem.
- Antes de usar a skill, rode `git pull --rebase --autostash` para pegar a versão mais nova.

## Ao começar
1. `git pull --rebase --autostash` antes de editar qualquer arquivo.
2. Conflito no pull: PARE e explique o que conflitou. Não resolva sozinho.
3. `git log -10 --stat`: se houver commit recente na mesma matéria ou arquivo (`_tema/`, `index.html`,
   HTML de um master, a skill), pergunte antes de continuar. Ninguém edita o mesmo master ao mesmo tempo.
4. Mexa só no que a tarefa pede. Nada de reformatar ou "limpar" outros arquivos.

## Rodando na nuvem (tarefa no GitHub)
- Nunca faça push direto no `main`. Use o ramo `codex/<descricao-curta>` e abra um Pull Request.
- Não faça merge do PR. Antes de abrir, `git fetch origin && git rebase origin/main`; conflito = descreva no PR.

## Rodando no PC
- Publique só com `python publicar.py "mensagem"` e só quando pedirem.
- Ver sem enviar: `python publicar.py --local` e `python -m http.server 8765`.
- Depois de publicar: `gh api repos/ViniCabral06/masterclasses/pages/builds/latest`.

## Proibido
- `git push --force`, `--force-with-lease`, `git reset --hard` sobre trabalho enviado, amend/rebase do que já foi enviado.
- `git add` manual (ou `-f`) de PDFs, prompts, rascunhos, `_originais/`, `_site/`, `_cache_otimizado/`.
- Editar à mão os blocos `<!--vidro:...-->` ou as versões `?v=...` do tema: quem gera é o `publicar.py`.
- Editar `CLAUDE.md`, `publicar.py` ou `conferir.py` sem pedido explícito.
- Embutir imagem em base64 sem passar pelo script.

## Commits
- Pequenos, um assunto por commit, no padrão "Matéria: o que mudou". Termine com a linha `[codex]`.

## Padrão dos masters
Siga o modelo de Microbiologia descrito no CLAUDE.md e na skill. Rode `python conferir.py` e nunca dê como pronto
um master com pendência: diga com todas as letras o que falta.

## Ao terminar
Diga quais arquivos mudou, se fez commit/push/PR (e em qual ramo), o que não testou e o que falta.
