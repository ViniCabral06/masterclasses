# -*- coding: utf-8 -*-
"""Exporta lotes de segmentos, amostras de Fase 0 (provas reais) e lotes de questões existentes
(para habilidades) em _exportados/verificacao/<chave>/ (fora do Git):
  1) lote_XX.json       -> segmentos para gerar _tema/questoes/<chave>.json
                           (3 Fáceis + 5 Médias + 2 Difíceis + 1 Aberta; ou +2M + 1A em micro/farmaco)
  2) fase0.json         -> amostra de questões reais das provas da matéria (molde rígido do PDF)
  3) hab_lote_XX.json   -> questões reais/nativas já existentes com hash FNV-1a exato para
                           gerar _tema/habilidades/<chave>.json (2–3 habilidades + micro-abertas)
  4) PROMPT.md          -> prompt completo no padrão psicométrico do PDF

Exceções permanentes (todos os períodos): DIC e TH ficam fora; práticas da Patologia ficam fora.

Uso:
  python gerar_lotes_verificacao.py              exporta todas as matérias elegíveis
  python gerar_lotes_verificacao.py semio port   exporta só as matérias pedidas
"""
import html as html_mod
import json
import re
import sys
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "_exportados" / "verificacao"

MASTERS = {
    "huma": ("Humanização", "Humanização/Humanizacao_Masterclass.html", "caderno"),
    "port": ("Português II", "Português/LPII_Masterclass.html", "port"),
    "prev": ("Medicina Preventiva", "Medicina preventiva/Medicina_Preventiva_Masterclass.html", "caderno"),
    "semio": ("Semiologia", "Semiologia/Semiologia.html", "micro"),
    "micro": ("Microbiologia", "Microbiologia/Microbiologia.html", "micro"),
    "img": ("Propedêutica de Imagem", "Propedêutica de imagem/Propedeutica_Imagem_Masterclass.html", "caderno"),
    "lab": ("Propedêutica Laboratorial", "Propedêutica laboratorial/Propedeutica_Laboratorial_Masterclass.html", "caderno"),
    "farmaco": ("Farmacologia", "Farmacologia/Farmacologia_4o período completo.html", "farmaco"),
    "pato": ("Patologia Médica I", "Patologia médica/aulas", "pato"),
}

PROMPT_TEMPLATE = """# Prompt de Geração — Verificação de Aprendizado ({materia})

Atue como especialista em psicometria e educação médica.
Gere o JSON de questões e habilidades para os segmentos anexados de **{materia}**, seguindo RIGOROSAMENTE o padrão das *Instruções Padrão para Criação de Simulados Interativos*:

## 1. Fase 0 obrigatória (estilo da disciplina)
- Use as amostras de `fase0.json` como **molde rígido**: replique linhas do enunciado e alternativas, formato de comando (1 linha), vocabulário clínico e distratores típicos das provas reais de {materia}.
- Varie os formatos conforme o estilo da disciplina: ABCD clássico (vinheta clínica), afirmativas I–IV, sequência cronológica/temporal, correlação/associação e achados descritos em texto.

## 2. Composição obrigatória por segmento
{composicao}

## 3. Controle anti-padrão (REGRA ABSOLUTA — validado automaticamente)
- Sempre **4 alternativas (A, B, C, D)** e uma única defensável, 100% respaldada pelo texto do segmento.
- **Comprimento uniforme:** nenhuma alternativa pode ser visivelmente maior ou menor que as demais. A alternativa certa NUNCA pode ser a mais longa por folga (nem ≥ 1,3× a média das erradas; meta global ≤ 30% como mais longa).
- **Estilo idêntico:** mesma estrutura sintática, tempo verbal, pessoa gramatical e nível de tecnicidade nas 4 alternativas. Nunca repetir termos-chave do enunciado só na certa; sem absolutos só nas erradas nem suavizadores só na certa.
- **Distratores reais:** cada errada representa um erro conceitual plausível (confusão típica de prova), claramente incorreto para quem domina o tema.
- **Distribuição equilibrada do gabarito** entre `0` (A), `1` (B), `2` (C) e `3` (D).
- **Diferença cognitiva entre níveis:**
  - `f` (Fácil — 3 questões): 1 passo de raciocínio, quadro clássico/direto do segmento, sem pegadinha oculta.
  - `m` (Médio — 5 questões): espelho fiel da prova real (2 passos: caso/achado → mecanismo, diagnóstico ou conduta).
  - `d` (Difícil — 2 questões): 3 passos, diferencial muito próximo, contraindicação específica, exceção ou integração de conceitos.
  - `a` (Aberta — 1 questão): comando discursivo direto (limite 500 caracteres), resposta ideal objetiva (`resp`) e lista de 2–5 termos-chave (`chaves`).

## 4. Correção alternativa por alternativa + Habilidades + Micro-abertas
- Toda objetiva traz:
  - `com`: lista de 4 explicações diretas (A–D, 2–3 linhas cada).
  - `porque`: lista de 4 strings (vazia `""` na correta; nas 3 erradas, explique o erro e o certo **sem começar com "Errada/Incorreta/Falsa"** e sem repetir entre si).
  - `trecho`: lista de 4 strings (vazia `""` na correta; nas 3 erradas, o trecho **literal exato** copiado da alternativa que a torna falsa, 2 a 8 palavras).
  - `hab`: lista de **2 a 3 habilidades** de raciocínio exigidas pela questão, cada uma com:
    - `t`: frase curta no pretérito descrevendo o passo de raciocínio.
    - `tag`: rótulo curto do conceito (2–4 palavras).
    - `open`: `{"p": "Pergunta aberta curta e direta (1–2 linhas) testando só esse conceito", "r": "Resposta direta esperada (1–3 linhas)", "chaves": ["termo1", "termo2"]}`.

Após gravar em `_tema/questoes/{chave}.json` e `_tema/habilidades/{chave}.json`, valide com `py auditar_verificacao.py {chave} --detalhes` (0 erros).
"""


def strip_html(s):
    return html_mod.unescape(re.sub(r"<[^>]+>", " ", str(s or ""))).replace("\r", " ")


def clean(s, lim=2600):
    t = re.sub(r"\s+", " ", strip_html(s)).strip()
    return t[:lim]


def norm_hash(s):
    t = unicodedata.normalize("NFD", strip_html(s).lower())
    t = "".join(c for c in t if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z0-9]+", "", t)


def fnv1a(s):
    h = 0x811C9DC5
    for ch in s:
        h ^= ord(ch)
        h = (h * 0x01000193) & 0xFFFFFFFF
    return format(h, "x")


def hash_alts(alts):
    if not alts:
        return ""
    return fnv1a("|".join(sorted(norm_hash(a) for a in alts)))


def extrair_caderno(path):
    s = path.read_text(encoding="utf-8")
    m = re.search(r'<script id="dataset" type="application/json">(.*?)</script>', s, re.S)
    if not m:
        return [], [], []
    data = json.loads(m.group(1))
    segs = []
    for l in data.get("lessons", []):
        for sg in l.get("sections", []):
            texto = " ".join(sg.get("paragraphs") or [])
            if sg.get("keys"):
                texto += " | Pontos-chave: " + " ; ".join(sg["keys"])
            if sg.get("deep"):
                texto += " | Aprofundamento: " + " ".join(sg["deep"])
            if sg.get("case"):
                texto += " | Caso: " + str(sg["case"])
            if sg.get("trap"):
                texto += " | Pegadinha: " + str(sg["trap"])
            item_seg = {
                "seg_id": sg["id"],
                "aula": f"Aula {l.get('number')}: {l.get('title')}",
                "titulo": sg.get("title", ""),
                "texto": clean(texto, 3200),
                "provas_n": len(sg.get("refs") or []),
            }
            if sg.get("figures"):
                item_seg["figs"] = [
                    {"src": f.get("src", ""), "caption": clean(f.get("caption", ""), 260)}
                    for f in sg["figures"]
                    if f.get("src")
                ]
            segs.append(item_seg)
    provas, vistos = [], set()
    for ex in data.get("exams", []):
        for it in ex.get("items", []):
            q = it.get("question") or {}
            opts = q.get("options") or []
            if len(opts) < 2 or q.get("answer") is None:
                continue
            h = hash_alts(opts)
            if not h or h in vistos:
                continue
            vistos.add(h)
            provas.append({
                "id": it.get("id"),
                "hash": h,
                "origem": ex.get("label") or ex.get("id") or "",
                "enun": clean((q.get("stem") or "") + " " + (q.get("command") or ""), 900),
                "alts": [clean(o, 260) for o in opts],
                "gab": q.get("answer"),
                "why": clean(q.get("why") or "", 600),
            })
    return segs, provas[:12], provas


def extrair_micro(path):
    s = path.read_text(encoding="utf-8")
    line = next((l for l in s.splitlines() if re.match(r"^\s*const DATA\s*=\s*\{", l)), "")
    if not line:
        return [], [], []
    raw_json = re.sub(r"^\s*const DATA\s*=\s*", "", line).rstrip("; ")
    data = json.loads(raw_json)
    segs = []
    qs_hab, vistos = [], set()
    tem_fmd = path.stem.lower() == "microbiologia"
    for mod in data.get("modules", []):
        for sg in mod.get("segs", []):
            segs.append({
                "seg_id": f"{mod['id']}/{sg['id']}",
                "aula": f"Aula {mod.get('num')}: {mod.get('nome')}",
                "titulo": sg.get("titulo", ""),
                "texto": clean(sg.get("html", ""), 3200),
                "provas_n": len(sg.get("pv") or []),
            })
            # Em Microbiologia preservamos as 3F/3P/3D nativas e geramos habilidades para todas;
            # em Semiologia as autorais antigas são substituídas por 3F+5M+2D+1A novas (geramos hab só p/ provas).
            if tem_fmd:
                for lv in ("f", "p", "d"):
                    for q in (sg.get("qs") or {}).get(lv) or []:
                        alts = q.get("alts") or []
                        h = hash_alts(alts)
                        if h and h not in vistos:
                            vistos.add(h)
                            qs_hab.append({
                                "id": q.get("id") or f"{mod['id']}/{sg['id']}/{lv}",
                                "hash": h,
                                "origem": f"Aula {mod.get('num')} · {sg.get('titulo','')}",
                                "enun": clean((q.get("enun") or "") + " " + (q.get("cmd") or ""), 800),
                                "alts": [clean(a, 240) for a in alts],
                                "gab": q.get("gab"),
                                "why": clean(" ".join(q.get("com") or []) if isinstance(q.get("com"), list) else (q.get("com") or ""), 500),
                            })
    # Provas (Microbiologia: data.prova; Semiologia: data.prova / data.provas / data.pq / data.lib / etc.)
    pv_cands = []
    for k in ("prova", "provas", "pq", "lib", "ed"):
        v = data.get(k)
        if isinstance(v, list):
            pv_cands.extend(v)
        elif isinstance(v, dict):
            for sub in v.values():
                if isinstance(sub, list):
                    pv_cands.extend(sub)
    fase0 = []
    for q in pv_cands:
        if not isinstance(q, dict):
            continue
        alts = q.get("alts") or []
        if len(alts) < 2 or q.get("gab") is None:
            continue
        h = hash_alts(alts)
        item = {
            "id": str(q.get("id") or ""),
            "hash": h,
            "origem": str(q.get("prova") or q.get("origem") or "Prova"),
            "enun": clean((q.get("enun") or "") + " " + (q.get("cmd") or ""), 800),
            "alts": [clean(a, 240) for a in alts],
            "gab": q.get("gab"),
            "why": clean(" ".join(q.get("com") or []) if isinstance(q.get("com"), list) else (q.get("com") or ""), 500),
        }
        if len(fase0) < 12:
            fase0.append(item)
        if h and h not in vistos:
            vistos.add(h)
            qs_hab.append(item)
    return segs, fase0, qs_hab


def extrair_pato(pasta):
    segs, fase0, qs_hab, vistos = [], [], [], set()
    for arq in sorted(pasta.glob("*.html")):
        if re.match(r"^(pratica|simulado|simgrade|banco|revisao|flashcards)", arq.stem, re.I):
            continue
        doc = arq.read_text(encoding="utf-8")
        dj = re.search(r'<script id="app-data"[^>]*>(.*?)</script>', doc, re.S)
        if dj:
            d = json.loads(dj.group(1))
            for sg in d.get("segments", []):
                segs.append({
                    "seg_id": f"{arq.stem}/{sg['id']}",
                    "aula": arq.stem,
                    "titulo": sg.get("title", ""),
                    "texto": clean(sg.get("content", ""), 3200),
                    "provas_n": len(sg.get("pv") or []),
                })
                for q in sg.get("pv") or []:
                    opts = q.get("options") or []
                    if len(opts) >= 2 and q.get("correct") is not None:
                        h = hash_alts(opts)
                        if h and h not in vistos:
                            vistos.add(h)
                            item = {
                                "id": q.get("id") or f"{arq.stem}/{sg['id']}",
                                "hash": h,
                                "origem": q.get("sourceLabel") or arq.stem,
                                "enun": clean(q.get("vignette") or "", 800),
                                "alts": [clean(o, 240) for o in opts],
                                "gab": q.get("correct"),
                                "why": clean(q.get("explanation") or "", 500),
                            }
                            qs_hab.append(item)
                            if len(fase0) < 12:
                                fase0.append(item)
        else:
            for p in re.finditer(r'<section class="pane" id="(seg\d+)"[^>]*>(.*?)</section>', doc, re.S):
                h1 = re.search(r"<h[12][^>]*>(.*?)</h[12]>", p.group(2), re.S)
                corpo = p.group(2).split('<div class="qzone">')[0]
                segs.append({
                    "seg_id": f"{arq.stem}/{p.group(1)}",
                    "aula": arq.stem,
                    "titulo": clean(h1.group(1) if h1 else p.group(1), 160),
                    "texto": clean(corpo, 3200),
                    "provas_n": len(re.findall(r'class="q-source real"', p.group(2))),
                })
                # Questões de prova dentro de .pv-box na aula HTML estática (ex.: aula1.html)
                for pm in re.finditer(r'<div class="pv-box">(.*?)</div>\s*(?:<!--/pv:fim-->|<details|</div>)', p.group(2), re.S):
                    for qm in re.finditer(r'<article class="q" data-correct="([A-E])"(?: data-qid="([^"]+)")?[^>]*>(.*?)</article>', pm.group(1), re.S):
                        cor_l, qid, qbody = qm.group(1), qm.group(2) or f"{arq.stem}-{p.group(1)}", qm.group(3)
                        stem = re.search(r'<div class="q-stem">(.*?)</div>', qbody, re.S)
                        opts = re.findall(r'<button class="opt"[^>]*data-letter="([A-E])"[^>]*>.*?<span class="opt-text">(.*?)</span>', qbody, re.S)
                        why = re.search(r'<div class="q-why"[^>]*>(.*?)</div>', qbody, re.S)
                        if len(opts) < 2:
                            continue
                        letras = [o[0] for o in opts]
                        alts = [clean(o[1], 240) for o in opts]
                        if cor_l not in letras:
                            continue
                        h = hash_alts(alts)
                        if h and h not in vistos:
                            vistos.add(h)
                            item = {
                                "id": qid,
                                "hash": h,
                                "origem": arq.stem,
                                "enun": clean(stem.group(1) if stem else "", 800),
                                "alts": alts,
                                "gab": letras.index(cor_l),
                                "why": clean(why.group(1) if why else "", 500),
                            }
                            qs_hab.append(item)
                            if len(fase0) < 12:
                                fase0.append(item)
    return segs, fase0, qs_hab


def extrair_farmaco(path):
    s = path.read_text(encoding="utf-8")
    segs, fase0, qs_hab, vistos = [], [], [], set()
    for p in re.finditer(r'<section class="pane[^"]*" id="pane-([^"]+)"[^>]*>(.*?)</section>', s, re.S):
        pid, corpo = p.group(1), p.group(2)
        if 'class="qsec"' not in corpo or re.search(r"sim|quiz|rev|arena", pid, re.I):
            continue
        eh_revisao = pid.endswith("-cob") or pid.startswith("r-prov") or pid == "r-treino"
        if not eh_revisao:
            h1 = re.search(r"<h1[^>]*>(.*?)</h1>", corpo, re.S)
            has_f = bool(re.search(r'data-lvl="f"', corpo))
            has_d = bool(re.search(r'data-lvl="d"', corpo))
            segs.append({
                "seg_id": pid,
                "aula": pid[0].upper(),
                "titulo": clean(h1.group(1) if h1 else pid, 160),
                "texto": clean(corpo.split('<div class="qsec">')[0], 3200),
                "provas_n": len(re.findall(r'data-lvl="pv"', corpo)),
                "modo": "completo_fpd" if (has_f and has_d) else "so_p",
            })
        # Extrai todas as questões nativas (.q[data-qid][data-a]) do segmento para habilidades + fase0
        for part in re.split(r'(?=<div class="q" data-qid=)', corpo)[1:]:
            m = re.match(r'<div class="q" data-qid="([^"]+)" data-a="([A-J])"', part)
            st = re.search(r'<div class="stem">(.*?)</div>\s*(?:</div>)?\s*(?:<figure.*?</figure>\s*)?<button class="opt"', part, re.S)
            if not (m and st):
                continue
            ops = re.findall(r'<button class="opt" data-l="([A-J])">.*?<span class="ot">(.*?)</span>(?:<span class="why">(.*?)</span>)?', part, re.S)
            if len(ops) < 2:
                continue
            letras = [o[0] for o in ops]
            if m.group(2) not in letras:
                continue
            alts = [clean(o[1], 240) for o in ops]
            h = hash_alts(alts)
            if not h or h in vistos:
                continue
            vistos.add(h)
            fb = re.search(r'<div class="qfb">(.*?)</div>\s*</div>', part, re.S)
            is_pv = 'class="pvb"' in part[:400]
            item = {
                "id": m.group(1),
                "hash": h,
                "origem": "Prova" if is_pv else f"Segmento {pid}",
                "enun": clean(st.group(1), 800),
                "alts": alts,
                "gab": letras.index(m.group(2)),
                "why": clean(fb.group(1) if fb else " ".join(o[2] for o in ops if o[2]), 500),
            }
            qs_hab.append(item)
            if is_pv and len(fase0) < 12:
                fase0.append(item)
    return segs, fase0, qs_hab


def extrair_port(path):
    s = path.read_text(encoding="utf-8")
    i0 = s.find("const MODS=[")
    segs, fase0, qs_hab, vistos = [], [], [], set()
    if i0 >= 0:
        mods = list(re.finditer(r"\{id:'([^']+)',n:'([^']+)',nome:'([^']+)'", s[i0:]))
        for idx, m in enumerate(mods):
            ini = i0 + m.start()
            fim = i0 + mods[idx + 1].start() if idx + 1 < len(mods) else s.find("\nconst ", ini)
            bloco = s[ini:fim]
            mid, num, nome = m.group(1), m.group(2), m.group(3)
            for si, sm in enumerate(re.finditer(r"\{t:'([^']+)',h:`(.*?)`", bloco, re.S)):
                segs.append({
                    "seg_id": f"{mid}:{si}",
                    "aula": f"Aula {num}: {nome}",
                    "titulo": sm.group(1),
                    "texto": clean(sm.group(2), 3200),
                    "provas_n": len(re.findall(r'data-j="', sm.group(2))),
                })
    # Extrai PROVA (Somativa 81 reconstruída) usando parser de literais JS de exportar_questoes
    p0 = s.find("const PROVA=[")
    if p0 >= 0:
        p1 = s.find("\nconst ", p0 + 12)
        bloco_p = s[p0:p1] if p1 > 0 else s[p0:]
        for qm in re.finditer(r"\{m:'([^']+)',t:'([^']*)',q:'((?:\\'|[^'])*)',a:\[(.*?)\],c:(\d+),e:'((?:\\'|[^'])*)'", bloco_p, re.S):
            alts_raw = re.findall(r"'((?:\\'|[^'])*)'", qm.group(4))
            if len(alts_raw) < 2:
                continue
            alts = [a.replace("\\'", "'") for a in alts_raw]
            h = hash_alts(alts)
            if not h or h in vistos:
                continue
            vistos.add(h)
            item = {
                "id": f"port-pv-{len(qs_hab)+1}",
                "hash": h,
                "origem": f"Somativa 81 · {qm.group(2)}",
                "enun": qm.group(3).replace("\\'", "'"),
                "alts": alts,
                "gab": int(qm.group(5)),
                "why": qm.group(6).replace("\\'", "'"),
            }
            qs_hab.append(item)
            if len(fase0) < 12:
                fase0.append(item)
    return segs, fase0, qs_hab


def main(args):
    alvos = [a.lower() for a in args] or list(MASTERS.keys())
    OUT.mkdir(parents=True, exist_ok=True)
    for k in alvos:
        if k not in MASTERS:
            print("chave desconhecida:", k)
            continue
        nome, rel, tipo = MASTERS[k]
        p = ROOT / rel
        if not p.exists():
            print("falta:", rel)
            continue
        if tipo == "caderno":
            segs, fase0, qs_hab = extrair_caderno(p)
        elif tipo == "micro":
            segs, fase0, qs_hab = extrair_micro(p)
        elif tipo == "pato":
            segs, fase0, qs_hab = extrair_pato(p)
        elif tipo == "farmaco":
            segs, fase0, qs_hab = extrair_farmaco(p)
        else:
            segs, fase0, qs_hab = extrair_port(p)

        dst = OUT / k
        dst.mkdir(parents=True, exist_ok=True)
        for old in dst.glob("lote_*.json"):
            old.unlink()
        for old in dst.glob("hab_lote_*.json"):
            old.unlink()

        q_arq = ROOT / "_tema" / "questoes" / f"{k}.json"
        prontos_segs = set()
        if q_arq.exists():
            try:
                prontos_segs = set((json.loads(q_arq.read_text(encoding="utf-8")).get("segs") or {}).keys())
            except Exception:
                pass
        pendentes = [sg for sg in segs if sg["seg_id"] not in prontos_segs]

        tam = 3 if k not in ("micro", "farmaco") else 6
        for i in range(0, len(pendentes), tam):
            lote = pendentes[i:i + tam]
            (dst / f"lote_{i // tam + 1:02d}.json").write_text(
                json.dumps({"materia": k, "nome": nome, "segmentos": lote}, ensure_ascii=False, indent=2),
                encoding="utf-8",
            )
        if fase0:
            (dst / "fase0.json").write_text(json.dumps(fase0, ensure_ascii=False, indent=2), encoding="utf-8")

        h_arq = ROOT / "_tema" / "habilidades" / f"{k}.json"
        prontos_h = set()
        if h_arq.exists():
            try:
                prontos_h = set((json.loads(h_arq.read_text(encoding="utf-8")).get("byHash") or {}).keys())
            except Exception:
                pass
        pend_h = [q for q in qs_hab if q["hash"] not in prontos_h]
        htam = 15
        for i in range(0, len(pend_h), htam):
            (dst / f"hab_lote_{i // htam + 1:02d}.json").write_text(
                json.dumps({"materia": k, "nome": nome, "questoes": pend_h[i:i + htam]}, ensure_ascii=False, indent=2),
                encoding="utf-8",
            )

        comp = (
            "- **+2 Médias complementares** (para completar 5 médias somadas às 3 nativas) + **1 Aberta** por segmento, além das habilidades para todas."
            if k in ("micro", "farmaco")
            else "- **3 Fáceis (`f`) + 5 Médias (`m`) + 2 Difíceis (`d`) + 1 Aberta (`a`)** por segmento = 10 objetivas + 1 aberta."
        )
        prompt = PROMPT_TEMPLATE.replace("{materia}", nome).replace("{chave}", k).replace("{composicao}", comp)
        (dst / "PROMPT.md").write_text(prompt, encoding="utf-8")
        print(f"  {k:8} ({nome:26}): {len(segs):3} segs ({len(pendentes):3} pend -> {(len(pendentes)+tam-1)//tam if pendentes else 0:2} lotes) | hab provas/nat: {len(pend_h):3} pend ({(len(pend_h)+htam-1)//htam if pend_h else 0:2} lotes)")


if __name__ == "__main__":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
    main(sys.argv[1:])
