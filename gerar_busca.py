# -*- coding: utf-8 -*-
"""Gera índices estáticos de busca em _tema/busca/ (isolados por matéria e por período).

Regra de isolamento comercial:
  - Cada matéria tem seu próprio arquivo _tema/busca/<chave>.json (usado pelo _tema/abas.js).
  - Cada período tem seu próprio arquivo _tema/busca/p<N>.json (hoje p4.json, contendo APENAS as
    matérias do 4º período). Quando o 5º período existir, ganhará p5.json separado — quem acessa
    um período nunca enxerga conteúdo de outro período na busca.
"""
import html as html_mod
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "_tema" / "busca"


def limpar(s):
    s = re.sub(r"<(?:script|style|svg)[^>]*>.*?</(?:script|style|svg)>", " ", str(s or ""), flags=re.I | re.S)
    s = re.sub(r"<[^>]+>", " ", s)
    return re.sub(r"\s+", " ", html_mod.unescape(s)).strip()


def materias_hub():
    s = (ROOT / "index.html").read_text(encoding="utf-8")
    bloco = s[s.index("const SUBJECTS"):s.index("const TICK")]
    out = []
    for m in re.finditer(r'(\w+)\s*:\s*\{(.*?)\n\s*\}', bloco, re.S):
        k, corpo = m.group(1), m.group(2)
        nome = re.search(r'name\s*:\s*"([^"]+)"', corpo)
        href = re.search(r'href\s*:\s*"([^"]+)"', corpo)
        desc = re.search(r'desc\s*:\s*"([^"]+)"', corpo)
        tags = re.findall(r'"([^"]+)"', (re.search(r'tags\s*:\s*\[([^\]]*)\]', corpo) or [None, ""])[1]) if re.search(r'tags\s*:\s*\[', corpo) else []
        if nome and href:
            out.append({"k": k, "nome": nome.group(1), "href": href.group(1), "desc": desc.group(1) if desc else "", "tags": tags, "periodo": 4})
    return out


def extrair_json_bruto(doc, inicio):
    """Extrai um objeto/lista JSON balanceado a partir de uma posição no documento."""
    prof = 0
    em_str = False
    esc = False
    aberto = None
    for i in range(inicio, len(doc)):
        ch = doc[i]
        if em_str:
            if esc:
                esc = False
            elif ch == "\\":
                esc = True
            elif ch == '"':
                em_str = False
            continue
        if ch == '"':
            em_str = True
        elif ch in "{[":
            if aberto is None:
                aberto = i
            prof += 1
        elif ch in "}]":
            prof -= 1
            if prof == 0 and aberto is not None:
                return doc[aberto:i + 1]
    return None


def extrair_segmentos(m):
    arq = ROOT / m["href"]
    if not arq.exists():
        return []
    k = m["k"]
    segs = []

    # 1) Patologia: aulas em aulas/*.html
    pasta_aulas = arq.parent / "aulas"
    if k == "pato" and pasta_aulas.is_dir():
        for a in sorted(pasta_aulas.glob("*.html")):
            if not re.match(r"^(aula|tgi|pratica)\d+\.html$", a.name):
                continue
            doc = a.read_text(encoding="utf-8", errors="ignore")
            aula_k = a.stem
            tit_a = limpar((re.search(r"<h1[^>]*>(.*?)</h1>", doc, re.S) or [None, aula_k])[1])[:80]
            for p in re.finditer(r'<section class="pane" id="([\w-]+)"[^>]*>(.*?)</section>', doc, re.S):
                sid, corpo = p.group(1), p.group(2)
                if sid in ("capa", "home", "quiz", "arena", "apendice"):
                    continue
                t = limpar((re.search(r"<h[12][^>]*>(.*?)</h[12]>", corpo, re.S) or [None, sid])[1])
                tx = limpar(corpo)[:2400]
                if len(tx) > 40:
                    segs.append({"id": f"{aula_k}/{sid}", "aula": tit_a, "titulo": t, "texto": tx})
        return segs

    doc = arq.read_text(encoding="utf-8", errors="ignore")

    # 2) Cadernos com <script id="dataset|app-data" type="application/json"> (lab, img, prev, huma, port)
    dj = re.search(r'<script[^>]*id="(?:dataset|app-data)"[^>]*>(.*?)</script>', doc, re.S)
    if dj:
        try:
            data = json.loads(dj.group(1))
            for l in data.get("lessons", []):
                al = f"Aula {l.get('number', '')} · {l.get('title', '')}".strip(" ·")
                for s in l.get("sections", []):
                    pars = s.get("paragraphs") or []
                    partes = [s.get("body", ""), " ".join(pars), " ".join(s.get("keys") or []), s.get("trap", "") or ""]
                    tx = limpar(" ".join(str(x) for x in partes if x))[:2400]
                    if len(tx) > 30:
                        segs.append({"id": f"#{l['id']}/{s['id']}", "aula": al, "titulo": s.get("title", ""), "texto": tx})
            if segs:
                return segs
        except Exception:
            pass

    # 3) Masters com `const DATA = {"modules": [...]}` (Microbiologia, Semiologia)
    dm = re.search(r'\bconst\s+DATA\s*=\s*\{', doc)
    if dm:
        bruto = extrair_json_bruto(doc, dm.end() - 1)
        if bruto:
            try:
                data = json.loads(bruto)
                for mod in data.get("modules", []):
                    al = f"Aula {mod.get('num', '')} · {mod.get('nome', '')}".strip(" ·")
                    for s in mod.get("segs", []):
                        tx = limpar(s.get("html", ""))[:2400]
                        if len(tx) > 30:
                            segs.append({"id": f"#{mod['id']}/{s['id']}", "aula": al, "titulo": s.get("titulo", ""), "texto": tx})
                if segs:
                    return segs
            except Exception:
                pass

    # 4) Fallback genérico: <section id="..."> (Farmacologia etc.)
    for p in re.finditer(r'<section[^>]*\bid="([\w-]+)"[^>]*>(.*?)</section>', doc, re.S):
        sid, corpo = p.group(1), p.group(2)
        t = limpar((re.search(r"<h[12][^>]*>(.*?)</h[12]>", corpo, re.S) or [None, sid])[1])
        tx = limpar(corpo)[:2000]
        if len(tx) > 60:
            segs.append({"id": "#" + sid, "aula": m["nome"], "titulo": t, "texto": tx})
    return segs


def gerar():
    OUT.mkdir(parents=True, exist_ok=True)
    por_periodo = {}
    for m in materias_hub():
        segs = extrair_segmentos(m)
        if segs:
            (OUT / f"{m['k']}.json").write_text(json.dumps(segs, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
        p = m["periodo"]
        lista = por_periodo.setdefault(p, [])
        # entrada de topo da matéria + segmentos resumidos (isolados no arquivo do período)
        lista.append({"k": m["k"], "mat": m["nome"], "aula": m["nome"], "titulo": m["nome"], "href": m["href"], "texto": m["desc"] + " " + " ".join(m["tags"])})
        for s in segs:
            href = m["href"] + (s["id"] if s["id"].startswith("#") else "")
            lista.append({"k": m["k"], "mat": m["nome"], "aula": s["aula"], "titulo": s["titulo"], "href": href, "texto": s["texto"][:420]})
    for p, itens in por_periodo.items():
        (OUT / f"p{p}.json").write_text(json.dumps(itens, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
        print(f"  busca: _tema/busca/p{p}.json ({len(itens)} entradas, isolado no {p}º período)")


if __name__ == "__main__":
    gerar()
