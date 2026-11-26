# -*- coding: utf-8 -*-
"""Auditoria automatizada de qualidade das masterclasses.

Confere automaticamente regras da skill masterclass-medica e CLAUDE.md que o conferir.py básico não mede:
  1. Equilíbrio das alternativas (regra da seção E): sinaliza questões autorais/reconstruídas em que a alternativa
     certa é a mais longa, tem >= 1,3x a média das erradas E passa a maior errada em >= 8 caracteres.
     (Texto original "Das provas" fica isento, como manda a regra.)
  2. Imagens quebradas (src="_img/..." ou "../_img/..." inexistente no disco) e <figure> sem <figcaption>/fonte.
  3. Edições órfãs em _tema/edicoes.json (âncoras cujo texto original não aparece mais no HTML do master).
  4. Cobertura de correção alternativa por alternativa (VG_PORQUE) e de flashcards (_tema/flash/<k>.txt).

Uso:
  python auditar.py              audita todos os masters do hub
  python auditar.py --detalhes   mostra cada questão desequilibrada e cada imagem/âncora com problema
"""
import html as html_mod
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent


def sem_tags(s):
    s = re.sub(r"<[^>]+>", " ", str(s or ""))
    return re.sub(r"\s+", " ", html_mod.unescape(s)).strip()


def masters():
    s = (ROOT / "index.html").read_text(encoding="utf-8")
    bloco = s[s.index("const SUBJECTS"):s.index("const TICK")]
    out = []
    for m in re.finditer(r'(\w+)\s*:\s*\{(.*?)\n\s*\}', bloco, re.S):
        k, corpo = m.group(1), m.group(2)
        h = re.search(r'href\s*:\s*"([^"]+)"', corpo)
        n = re.search(r'name\s*:\s*"([^"]+)"', corpo)
        if h and n:
            out.append((k, n.group(1), ROOT / h.group(1)))
    return out


def eh_desequilibrada(alts, gab):
    """Regra oficial da skill (seção E): certa é a maior AND >= 1.3x média das erradas AND > maior errada + 8 chars."""
    if not isinstance(alts, list) or len(alts) < 3 or not isinstance(gab, int) or not (0 <= gab < len(alts)):
        return False, None
    tams = [len(sem_tags(a)) for a in alts]
    c = tams[gab]
    err = [t for i, t in enumerate(tams) if i != gab]
    if not err or max(err) == 0:
        return False, None
    med = sum(err) / len(err)
    maior_err = max(err)
    if c > maior_err and c >= 1.3 * med and (c - maior_err) >= 8:
        return True, (c, round(med, 1), maior_err)
    return False, None


def auditar_imagens(arq):
    """Verifica srcs locais quebrados e figuras sem legenda/fonte."""
    texto = arq.read_text(encoding="utf-8", errors="ignore")
    quebradas, sem_cap = [], []
    for m in re.finditer(r'<img\b[^>]*\bsrc=["\']([^"\']+)["\']', texto, re.I):
        src = m.group(1).strip()
        if src.startswith(("http://", "https://", "data:", "blob:", "#")) or "${" in src or "+" in src:
            continue
        alvo = (arq.parent / src.split("?")[0]).resolve()
        if not alvo.exists():
            quebradas.append(src)
    for fig in re.finditer(r"<figure\b[^>]*>(.*?)</figure>", texto, re.I | re.S):
        corpo = fig.group(1)
        if "<img" in corpo.lower() and not re.search(r"<figcaption\b", corpo, re.I):
            src = re.search(r'src=["\']([^"\']+)["\']', corpo, re.I)
            sem_cap.append(src.group(1) if src else "(sem src)")
    return quebradas, sem_cap


def auditar_questoes_json(texto):
    """Encontra blocos JSON/JS de questões com {alts:[...], gab:N} ou {options:[...], answer:N}."""
    deseq, total = [], 0
    # Padrão 1: objetos JSON {"options": [...], "answer": N} (cadernos: huma, prev, img, lab)
    for m in re.finditer(r'\{[^{}]*"(?:options|alts)"\s*:\s*\[([^\]]+)\][^{}]*\}', texto, re.S):
        bloco = m.group(0)
        if re.search(r'"source"\s*:\s*"prova"|"pvReal"\s*:\s*true|📝 Das provas', bloco, re.I) and not re.search(r'reconstru', bloco, re.I):
            continue
        gab_m = re.search(r'"(?:answer|gab|correct|c)"\s*:\s*(\d+)', bloco)
        if not gab_m:
            continue
        alts = re.findall(r'"((?:[^"\\]|\\.)*)"', m.group(1))
        gab = int(gab_m.group(1))
        if len(alts) >= 3:
            total += 1
            ruin, info = eh_desequilibrada(alts, gab)
            if ruin:
                en = re.search(r'"(?:stem|enun|q|p)"\s*:\s*"((?:[^"\\]|\\.)*)"', bloco)
                deseq.append((sem_tags(en.group(1))[:70] if en else "(questão)", info))
    return total, deseq


def auditar_edicoes():
    """Confere se as âncoras em _tema/edicoes.json ainda batem nos HTMLs atuais."""
    arq = ROOT / "_tema" / "edicoes.json"
    if not arq.exists():
        return 0, []
    try:
        dados = json.loads(arq.read_text(encoding="utf-8"))
    except Exception:
        return 0, [("_tema/edicoes.json", "JSON inválido")]
    total, orfas = 0, []
    for pg, obj in dados.items():
        alvo = ROOT / pg
        if not alvo.exists():
            orfas.append((pg, "arquivo não existe mais"))
            continue
        txt = re.sub(r"\s+", " ", sem_tags(alvo.read_text(encoding="utf-8", errors="ignore")))
        for item in obj.get("t", []):
            total += 1
            q = re.sub(r"\s+", " ", item.get("q", "")).strip()
            if q and q not in txt:
                orfas.append((pg, f'texto órfão ({item.get("id")}): "{q[:55]}…"'))
        for item in obj.get("b", []):
            total += 1
            q = re.sub(r"\s+", " ", item.get("q", "")).strip()
            if q and q not in txt:
                orfas.append((pg, f'balão órfão ({item.get("id")}): "{q[:55]}…"'))
    return total, orfas


def main(args):
    detalhes = "--detalhes" in args or "-v" in args
    ms = masters()
    tot_prob = 0
    print("=== Auditoria automatizada das masterclasses ===\n")
    for k, nome, arq in ms:
        if not arq.exists():
            continue
        arqs = [arq]
        pasta_aulas = arq.parent / "aulas"
        if pasta_aulas.is_dir():
            arqs.extend(sorted(pasta_aulas.glob("*.html")))
        queb, semc, q_tot, q_des = [], [], 0, []
        tem_porque = False
        for a in arqs:
            q1, s1 = auditar_imagens(a)
            queb.extend([(a.name, x) for x in q1])
            semc.extend([(a.name, x) for x in s1])
            txt = a.read_text(encoding="utf-8", errors="ignore")
            if "VG_PORQUE" in txt or "VGCorrecao.bloco" in txt or 'class="pv-alts' in txt:
                tem_porque = True
            t0, d0 = auditar_questoes_json(txt)
            q_tot += t0
            q_des.extend([(a.name, x[0], x[1]) for x in d0])
        tem_flash = (ROOT / "_tema" / "flash" / f"{k}.txt").exists()
        status = "OK   " if not (queb or q_des) else "AVISO"
        tot_prob += len(queb) + len(q_des)
        print(f"{status} {nome:30s} | imgs quebradas: {len(queb):2d} | fig s/ legenda: {len(semc):2d} | alt. deseq.: {len(q_des):2d}/{q_tot:<3d} | porques: {'sim' if tem_porque else 'não'} | flash: {'sim' if tem_flash else 'não'}")
        if detalhes:
            for a, s in queb[:10]:
                print(f"      [img quebrada] {a}: {s}")
            for a, en, inf in q_des[:10]:
                print(f"      [alt. longa]   {a}: certa={inf[0]}c vs média={inf[1]}c / maior errada={inf[2]}c — {en}")

    n_ed, orfas = auditar_edicoes()
    print(f"\n=== Editor ao vivo (_tema/edicoes.json): {n_ed} edições, {len(orfas)} órfã(s) ===")
    if detalhes or orfas:
        for pg, msg in orfas[:20]:
            print(f"  ! {pg}: {msg}")
    if not detalhes and (tot_prob or orfas):
        print("\nDica: rode `python auditar.py --detalhes` para ver cada item específico.")
    return 1 if (tot_prob or orfas) else 0


if __name__ == "__main__":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
    sys.exit(main(sys.argv[1:]))
