# -*- coding: utf-8 -*-
"""Mescla edições feitas pela caneta ao vivo (_tema/edicoes.json) direto nos HTMLs reais dos masters.

Por padrão roda em modo simulação (dry-run), mostrando o que casou e o que ficou órfão.
Com --aplicar, grava as alterações nos HTMLs e remove do _tema/edicoes.json as edições incorporadas.

Uso:
  python mesclar_edicoes.py            mostra o relatório (não altera nada)
  python mesclar_edicoes.py --aplicar  incorpora edições de texto nos HTMLs e limpa edicoes.json
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
ARQ = ROOT / "_tema" / "edicoes.json"


def norm(s):
    return re.sub(r"\s+", " ", str(s or "")).strip()


def sem_tags(s):
    return norm(re.sub(r"<[^>]+>", " ", s))


def main(args):
    aplicar = "--aplicar" in args
    if not ARQ.exists():
        print("Nenhum _tema/edicoes.json encontrado."); return 0
    dados = json.loads(ARQ.read_text(encoding="utf-8"))
    if not dados:
        print("_tema/edicoes.json está vazio."); return 0

    mescladas, mantidas, orfas = 0, 0, 0
    for pg in list(dados.keys()):
        obj = dados[pg]
        alvo = ROOT / pg
        if not alvo.exists():
            print(f"! Arquivo ausente: {pg}")
            orfas += len(obj.get("t", []))
            continue
        html = alvo.read_text(encoding="utf-8")
        novo_html = html
        restantes_t = []
        for item in obj.get("t", []):
            tag = item.get("tag", "p")
            q = norm(item.get("q", ""))
            r = item.get("r", "")
            # procura tag simples no HTML cujo texto interno normalizado bata com q
            pad = re.compile(rf"(<{re.escape(tag)}\b[^>]*>)(.*?)(</{re.escape(tag)}>)", re.I | re.S)
            achou = None
            for m in pad.finditer(novo_html):
                if sem_tags(m.group(2)) == q:
                    achou = m
                    break
            if achou:
                print(f"OK   {pg} [{item.get('id')}]: <{tag}> \"{q[:60]}\" -> \"{sem_tags(r)[:60]}\"")
                if aplicar:
                    nt = item.get("nt") or tag
                    ab = re.sub(rf"^<{re.escape(tag)}\b", f"<{nt}", achou.group(1), flags=re.I)
                    novo_html = novo_html[:achou.start()] + ab + r + f"</{nt}>" + novo_html[achou.end():]
                mescladas += 1
            else:
                print(f"PUL  {pg} [{item.get('id')}]: texto gerado por JS ou órfão (mantido em edicoes.json) — \"{q[:55]}\"")
                restantes_t.append(item)
                mantidas += 1
        if aplicar and novo_html != html:
            alvo.write_text(novo_html, encoding="utf-8", newline="")
            obj["t"] = restantes_t
            if not obj.get("t") and not obj.get("b") and not obj.get("i"):
                del dados[pg]
    if aplicar and mescladas:
        ARQ.write_text(json.dumps(dados, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
        print(f"\nAplicadas {mescladas} edição(ões) nos HTMLs e atualizei _tema/edicoes.json.")
    else:
        print(f"\nResumo (simulação): {mescladas} pronta(s) para mesclar, {mantidas} mantida(s) em JS/JSON, {orfas} órfã(s).")
        if mescladas:
            print("Rode `python mesclar_edicoes.py --aplicar` para incorporar nos HTMLs.")
    return 0


if __name__ == "__main__":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
    sys.exit(main(sys.argv[1:]))
