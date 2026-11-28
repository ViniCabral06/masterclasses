# -*- coding: utf-8 -*-
"""Auditoria rigorosa dos bancos de Verificação de Aprendizado:
  - _tema/questoes/<chave>.json      (3 Fáceis + 5 Médias + 3 Difíceis + 1 Aberta por segmento)
  - _tema/habilidades/<chave>.json   (2–3 habilidades + micro-questão aberta direta por questão)

Valida integralmente as regras do PDF "Instruções Padrão para Criação de Simulados Interativos":
  - Exceção permanente: DIC e TH em todos os períodos não entram.
  - Sempre 4 alternativas (A–D), gabarito 0..3.
  - Controle anti-padrão absoluto de comprimento (alternativa certa nunca é a mais longa por folga;
    nenhuma alternativa muito mais curta ou muito mais longa que a média).
  - Distribuição equilibrada de letras A/B/C/D no conjunto.
  - Gabarito comentado completo + `porque` e `trecho` exato para todas as 3 erradas.
  - Questão aberta com gabarito sugerido, termos-chave e limite <= 500 caracteres.
  - 2 a 3 habilidades concretas por questão, cada uma com micro-questão aberta direta.

Uso:
  python auditar_verificacao.py
  python auditar_verificacao.py huma micro --detalhes
"""
import html as html_mod
import json
import re
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent
Q_DIR = ROOT / "_tema" / "questoes"
H_DIR = ROOT / "_tema" / "habilidades"

# Masters que já possuem 3F/3P/3D nativos no HTML (podem complementar só +2 Médias + 1 Aberta no JSON)
COM_NIVEIS_NATIVOS = {"micro", "farmaco"}
DISPENSADOS_RE = re.compile(r"^(dic|th)\d*$", re.I)


def strip_html(s):
    return html_mod.unescape(re.sub(r"<[^>]+>", "", str(s or ""))).strip()


def checar_comprimento(alts, gab):
    """Regra anti-padrão absoluta do PDF + auditar.py."""
    lens = [len(strip_html(a)) for a in alts]
    if any(n < 8 for n in lens):
        return f"alternativa curta demais ({lens})"
    err = [lens[i] for i in range(len(lens)) if i != gab]
    media_err = sum(err) / max(1, len(err))
    maior_err = max(err)
    certa = lens[gab]
    if certa > maior_err and certa >= 1.3 * media_err and (certa - maior_err) >= 8:
        return f"certa desequilibrada (certa={certa}, maior_err={maior_err}, media_err={media_err:.1f})"
    maior, menor = max(lens), min(lens)
    if menor < 0.5 * maior and (maior - menor) >= 25:
        return f"comprimento desuniforme entre alternativas (min={menor}, max={maior})"
    return None


def checar_habilidades(habs, contexto, erros):
    if not isinstance(habs, list) or not (1 <= len(habs) <= 4):
        erros.append(f"{contexto}: precisa de 2 a 3 habilidades (achado: {len(habs) if isinstance(habs, list) else 0})")
        return
    if len(habs) < 2:
        erros.append(f"{contexto}: menos de 2 habilidades ({len(habs)})")
    for idx, h in enumerate(habs):
        if not isinstance(h, dict):
            erros.append(f"{contexto} hab[{idx}]: deve ser objeto")
            continue
        t = str(h.get("t") or "").strip()
        if len(t) < 15:
            erros.append(f"{contexto} hab[{idx}]: texto da habilidade curto demais")
        op = h.get("open")
        if not isinstance(op, dict):
            erros.append(f"{contexto} hab[{idx}]: falta micro-questão aberta 'open'")
            continue
        if len(str(op.get("p") or "").strip()) < 12:
            erros.append(f"{contexto} hab[{idx}]: micro-pergunta 'open.p' curta demais")
        if len(str(op.get("r") or "").strip()) < 8:
            erros.append(f"{contexto} hab[{idx}]: resposta esperada 'open.r' curta demais")
        chaves = op.get("chaves")
        if not isinstance(chaves, list) or len(chaves) < 1:
            erros.append(f"{contexto} hab[{idx}]: falta 'open.chaves' (termos-chave)")


def auditar_questoes_json(path, detalhes=False):
    k = path.stem.lower()
    erros, avisos = [], []
    if DISPENSADOS_RE.match(k):
        erros.append(f"{path.name}: matéria dispensada permanentemente (DIC/TH não entram)")
        return erros, avisos, 0
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except Exception as e:
        return [f"{path.name}: JSON inválido ({e})"], avisos, 0

    segs = data.get("segs")
    if not isinstance(segs, dict) or not segs:
        return [f"{path.name}: campo 'segs' ausente ou vazio"], avisos, 0

    gabs_counter = Counter()
    certa_maior = 0
    total_obj = 0
    total_ab = 0

    for seg_id, seg in segs.items():
        if not isinstance(seg, dict):
            erros.append(f"{k}/{seg_id}: segmento inválido")
            continue
        f_list = seg.get("f") or []
        m_list = seg.get("m") or []
        d_list = seg.get("d") or []
        ab = seg.get("a")

        if k in COM_NIVEIS_NATIVOS:
            if k == "farmaco" and re.match(r"^[kmn]\d+$", seg_id):
                if len(f_list) != 3:
                    avisos.append(f"{k}/{seg_id}: fáceis={len(f_list)} (aulas iniciais sem F nativo: meta 3)")
                if len(m_list) < 2:
                    avisos.append(f"{k}/{seg_id}: tem {len(m_list)} médias complementares (meta: +2 para completar 5)")
                if len(d_list) != 2:
                    avisos.append(f"{k}/{seg_id}: difíceis={len(d_list)} (aulas iniciais sem D nativo: meta 2)")
            elif len(m_list) < 2:
                avisos.append(f"{k}/{seg_id}: tem {len(m_list)} médias complementares (meta: +2 para completar 5)")
        else:
            if len(f_list) != 3:
                avisos.append(f"{k}/{seg_id}: fáceis={len(f_list)} (padrão: 3)")
            if len(m_list) != 5:
                avisos.append(f"{k}/{seg_id}: médias={len(m_list)} (padrão: 5)")
            if len(d_list) != 2:
                avisos.append(f"{k}/{seg_id}: difíceis={len(d_list)} (padrão: 2)")
        if not ab:
            avisos.append(f"{k}/{seg_id}: falta questão aberta ('a')")

        for lv, lista in (("f", f_list), ("m", m_list), ("d", d_list), ("pv", seg.get("pv") or [])):
            for i, q in enumerate(lista):
                ctx = f"{k}/{seg_id}/{lv}[{i}]"
                total_obj += 1
                alts = q.get("alts")
                gab = q.get("gab")
                if not isinstance(alts, list) or len(alts) != 4:
                    erros.append(f"{ctx}: precisa de exatamente 4 alternativas A–D")
                    continue
                if not isinstance(gab, int) or isinstance(gab, bool) or not (0 <= gab < 4):
                    erros.append(f"{ctx}: 'gab' inválido ({gab})")
                    continue
                if len(strip_html(q.get("enun"))) < 25:
                    erros.append(f"{ctx}: enunciado curto demais")
                gabs_counter[gab] += 1
                lens = [len(strip_html(a)) for a in alts]
                if lens[gab] == max(lens) and lens.count(max(lens)) == 1:
                    certa_maior += 1
                if lv != "pv":
                    err_len = checar_comprimento(alts, gab)
                    if err_len:
                        erros.append(f"{ctx}: {err_len}")
                # Comentário + porque + trecho
                porque = q.get("porque")
                trecho = q.get("trecho")
                if not isinstance(porque, list) or len(porque) != 4:
                    erros.append(f"{ctx}: falta array 'porque' de 4 posições")
                else:
                    vistas = set()
                    for j in range(4):
                        if j == gab:
                            continue
                        pq = str(porque[j] or "").strip()
                        if len(pq) < 12:
                            erros.append(f"{ctx}: porque[{j}] ausente ou curto")
                        if re.match(r"^(errad[ao]|incorret[ao]|fals[ao])\b", pq, re.I):
                            erros.append(f"{ctx}: porque[{j}] começa com 'Errada/Incorreta'")
                        if pq.lower() in vistas:
                            erros.append(f"{ctx}: porque[{j}] duplicado")
                        vistas.add(pq.lower())
                if not isinstance(trecho, list) or len(trecho) != 4:
                    erros.append(f"{ctx}: falta array 'trecho' de 4 posições")
                else:
                    for j in range(4):
                        if j == gab:
                            continue
                        tr = str(trecho[j] or "").strip()
                        if not tr:
                            erros.append(f"{ctx}: trecho[{j}] vazio")
                        elif tr.lower() not in strip_html(alts[j]).lower():
                            erros.append(f"{ctx}: trecho[{j}] ('{tr}') não aparece literalmente na alternativa")
                checar_habilidades(q.get("hab"), ctx, erros)

        if ab:
            total_ab += 1
            ctx = f"{k}/{seg_id}/aberta"
            if len(strip_html(ab.get("enun"))) < 20:
                erros.append(f"{ctx}: enunciado da aberta curto demais")
            if len(strip_html(ab.get("resp"))) < 20:
                erros.append(f"{ctx}: resposta ideal 'resp' curta demais")
            if not isinstance(ab.get("chaves"), list) or len(ab.get("chaves")) < 2:
                erros.append(f"{ctx}: 'chaves' precisa de ao menos 2 termos-chave")
            if (ab.get("lim") or 500) > 600:
                avisos.append(f"{ctx}: limite acima do padrão de 500 caracteres")
            checar_habilidades(ab.get("hab"), ctx, erros)

    if total_obj >= 12:
        prop_maior = certa_maior / total_obj
        if prop_maior > 0.40:
            avisos.append(f"{k}: alternativa certa é a mais longa em {prop_maior*100:.0f}% das questões (meta <= 30%)")
        for g in range(4):
            p = gabs_counter[g] / total_obj
            if p > 0.40 or p < 0.10:
                avisos.append(f"{k}: distribuição de gabarito desbalanceada ({dict(gabs_counter)})")
                break

    if detalhes:
        dist = {chr(65 + g): gabs_counter[g] for g in range(4)}
        print(f"  [{k}] segs={len(segs)} | obj={total_obj} | abertas={total_ab} | gabarito={dist} | certa_maior={certa_maior}/{total_obj}")
    return erros, avisos, total_obj + total_ab


def auditar_habilidades_json(path):
    k = path.stem.lower()
    erros = []
    if DISPENSADOS_RE.match(k):
        return [f"{path.name}: matéria dispensada (DIC/TH)"], 0
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except Exception as e:
        return [f"{path.name}: JSON inválido ({e})"], 0
    total = 0
    for sec in ("byId", "byHash", "byStem"):
        bloco = data.get(sec) or {}
        if not isinstance(bloco, dict):
            continue
        for qk, habs in bloco.items():
            total += 1
            checar_habilidades(habs, f"hab:{k}/{sec}/{qk}", erros)
    return erros, total


def main(args):
    detalhes = "--detalhes" in args
    filtro = {a.lower() for a in args if not a.startswith("--")}
    tot_erros = 0
    tot_avisos = 0

    q_files = sorted(Q_DIR.glob("*.json")) if Q_DIR.is_dir() else []
    h_files = sorted(H_DIR.glob("*.json")) if H_DIR.is_dir() else []
    if filtro:
        q_files = [f for f in q_files if f.stem.lower() in filtro]
        h_files = [f for f in h_files if f.stem.lower() in filtro]

    print("=== Auditoria _tema/questoes/ ===")
    if not q_files:
        print("  (nenhum arquivo ainda)")
    for f in q_files:
        erros, avisos, nq = auditar_questoes_json(f, detalhes=detalhes)
        tot_erros += len(erros)
        tot_avisos += len(avisos)
        status = "OK   " if not erros else "ERRO "
        print(f"  {status} {f.name:18} ({nq:4} questões · {len(erros)} erro(s) · {len(avisos)} aviso(s))")
        if detalhes or erros:
            for e in erros[:30]:
                print("     [ERRO]", e)
            if len(erros) > 30:
                print(f"     ... +{len(erros) - 30} erros")
        if detalhes:
            for a in avisos[:20]:
                print("     [AVISO]", a)

    print("\n=== Auditoria _tema/habilidades/ ===")
    if not h_files:
        print("  (nenhum arquivo ainda)")
    for f in h_files:
        erros, nq = auditar_habilidades_json(f)
        tot_erros += len(erros)
        status = "OK   " if not erros else "ERRO "
        print(f"  {status} {f.name:18} ({nq:4} entradas · {len(erros)} erro(s))")
        if detalhes or erros:
            for e in erros[:30]:
                print("     [ERRO]", e)

    print(f"\nResumo: {tot_erros} erro(s), {tot_avisos} aviso(s).")
    return 1 if tot_erros else 0


if __name__ == "__main__":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
    sys.exit(main(sys.argv[1:]))
