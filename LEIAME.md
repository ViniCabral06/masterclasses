# Masterclasses de Medicina

Site: https://vinicabral06.github.io/masterclasses/

Esta pasta **é** o site. O GitHub Pages publica o que está aqui no ramo `main`.
Vão para o GitHub só: o hub (`index.html`), o tema (`_tema/`), este script e cada master
com as suas pastas de mídia (`_img/`, `audios/`, `imagens/`). PDFs, prompts, rascunhos e
versões antigas ficam só no computador de cada um.

## Primeira vez (em cada computador)

1. Instale o [Git](https://git-scm.com) e o [Python](https://www.python.org) 3.10 ou mais novo.
2. Instale o Pillow (otimiza as imagens):

   ```bash
   pip install pillow
   ```

3. Baixe o projeto:

   ```bash
   git clone https://github.com/ViniCabral06/masterclasses.git "Criação de masterclasses"
   ```

## Publicar uma mudança

Dentro da pasta, rode:

```bash
python publicar.py "o que mudou"
```

O script faz tudo em ordem:

1. Puxa o que o outro já enviou.
2. Aplica o tema de vidro nos masters.
3. Tira as imagens de dentro dos HTMLs e as coloca em `_img/` como WebP. Assim um master de 80 MB vira poucos MB.
4. Faz o commit e envia.

O site atualiza em cerca de 1 minuto.

Para só ver no computador, sem enviar:

```bash
python publicar.py --local
python -m http.server 8765
```

e abra http://localhost:8765.

## Adicionar uma masterclass nova

1. Ponha o HTML numa pasta da matéria. Exemplo: `Patologia médica/Patologia.html`. Pode ser o arquivo gigante, com as imagens dentro.
2. No `index.html`, acrescente a matéria na lista `SUBJECTS`, com `name` e `href`, seguindo as que já existem.
3. Rode `python publicar.py "Adiciona Patologia"`.

O original com as imagens dentro fica guardado em `_originais/`, só no seu PC.

## Trabalhando em dupla

- Sempre publique pelo script: ele puxa as mudanças do outro antes de enviar.
- Evitem editar o mesmo master ao mesmo tempo. Combinem quem mexe em qual matéria.
- Se o script avisar de **conflito**, os dois mexeram no mesmo trecho. Abra os arquivos marcados, escolha o que fica (ou peça ao Claude para resolver) e rode de novo.
- O script recusa arquivos acima de 50 MB, que o GitHub não aceita. Se aparecer esse aviso, quase sempre é vídeo ou áudio grande: comprima antes.
