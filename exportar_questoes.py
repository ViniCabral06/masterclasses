"""Exporta as questões de múltipla escolha dos masters para _exportados/questoes/<matéria>.json,
para outro modelo escrever o "porquê" de cada alternativa (ver _exportados/questoes/PROMPT.md).
Uso: py exportar_questoes.py
"""
import hashlib, json, os, re, sys

RAIZ = os.path.dirname(os.path.abspath(__file__))
MASTERS = {
    'Microbiologia': 'Microbiologia/Microbiologia.html',
    'Semiologia': 'Semiologia/Semiologia.html',
    'Farmacologia': 'Farmacologia/Farmacologia_4o período completo.html',
    'Humanizacao': 'Humanização/Humanizacao_Masterclass.html',
    'Preventiva': 'Medicina preventiva/Medicina_Preventiva_Masterclass.html',
    'Portugues': 'Português/LPII_Masterclass.html',
    'Imagem': 'Propedêutica de imagem/Propedeutica_Imagem_Masterclass.html',
    'Laboratorial': 'Propedêutica laboratorial/Propedeutica_Laboratorial_Masterclass.html',
    'DIC_IV': 'DIC IV/DIC_IV_Masterclass.html',
}
K_ALTS = ('alts', 'options', 'ops', 'a', 'o', 'alternativas')
K_GAB = ('gab', 'answer', 'c', 'correct', 'ok', 'r', 'resp', 'certa')
K_ENUN = ('enun', 'prompt', 'q', 'stem', 'pergunta', 'text', 't', 'title')
K_CMD = ('cmd', 'comando')
K_WHY = ('com', 'why', 'exp', 'just', 'ok', 'expl', 'feedback')
K_ID = ('id', 'jid', 'key')


class P:
    """Leitor tolerante de literais JS (objetos, listas, strings, números)."""
    def __init__(s, t, i): s.t, s.i = t, i
    def ws(s):
        t = s.t
        while s.i < len(t) and t[s.i] in ' \t\r\n': s.i += 1
    def val(s):
        s.ws(); c = s.t[s.i]
        if c == '{': return s.obj()
        if c == '[': return s.arr()
        if c in '"\'`': return s.str()
        m = re.compile(r'-?\d+(\.\d+)?').match(s.t, s.i)
        if m: s.i = m.end(); return float(m.group()) if m.group(1) else int(m.group())
        for w, v in (('true', True), ('false', False), ('null', None), ('!0', True), ('!1', False)):
            if s.t.startswith(w, s.i): s.i += len(w); return v
        raise ValueError('expr')
    def str(s):
        q = s.t[s.i]; s.i += 1; out = []
        while True:
            c = s.t[s.i]
            if c == '\\':
                n = s.t[s.i + 1]
                if n == 'u': out.append(chr(int(s.t[s.i + 2:s.i + 6], 16))); s.i += 6; continue
                out.append({'n': '\n', 't': '\t'}.get(n, n)); s.i += 2; continue
            if c == q: s.i += 1; return ''.join(out)
            if q == '`' and c == '$' and s.t[s.i + 1] == '{': raise ValueError('tpl')
            out.append(c); s.i += 1
    def arr(s):
        s.i += 1; r = []
        while True:
            s.ws()
            if s.t[s.i] == ']': s.i += 1; return r
            r.append(s.val()); s.ws()
            if s.t[s.i] == ',': s.i += 1
    def obj(s):
        s.i += 1; r = {}
        while True:
            s.ws()
            if s.t[s.i] == '}': s.i += 1; return r
            if s.t[s.i] in '"\'': k = s.str()
            else:
                m = re.compile(r'[A-Za-z_$][\w$]*').match(s.t, s.i)
                if not m: raise ValueError('key')
                k = m.group(); s.i = m.end()
            s.ws()
            if s.t[s.i] != ':': raise ValueError('colon')
            s.i += 1; r[k] = s.val(); s.ws()
            if s.t[s.i] == ',': s.i += 1


def pega(o, ks):
    for k in ks:
        if k in o: return k, o[k]
    return None, None


def questao(o):
    ka, alts = pega(o, K_ALTS)
    if not (isinstance(alts, list) and 2 <= len(alts) <= 6 and all(isinstance(x, str) and x.strip() for x in alts)):
        return None
    gab = None
    for k in K_GAB:
        if k != ka and isinstance(o.get(k), int) and not isinstance(o.get(k), bool) and 0 <= o[k] < len(alts):
            gab = o[k]; break
    if gab is None: return None
    _, enun = pega(o, K_ENUN)
    if not isinstance(enun, str) or len(enun) < 8: return None
    why = None
    for k in K_WHY:
        if isinstance(o.get(k), (str, list)): why = o[k]; break
    _, cmd = pega(o, K_CMD)
    _, qid = pega(o, K_ID)
    return {'enun': enun + ((' ' + cmd) if isinstance(cmd, str) else ''), 'alts': alts, 'gab': gab,
            'comentario': why, 'id_master': qid if isinstance(qid, (str, int)) else None}


def extrai(html):
    achou, vistos = [], set()
    for m in re.finditer(r'["\']?(?:%s)["\']?\s*:\s*\[' % '|'.join(K_ALTS), html):
        # sobe até o "{" que abre o objeto (no máximo 6000 caracteres)
        ini = m.start(); prof = 0; j = ini
        while j > max(0, ini - 6000):
            j -= 1; c = html[j]
            if c == '}': prof += 1
            elif c == '{':
                if prof == 0: break
                prof -= 1
        if html[j] != '{' or j in vistos: continue
        try:
            o = P(html, j).obj()
        except Exception:
            continue
        vistos.add(j)
        q = questao(o)
        if q: achou.append(q)
    return achou


def txt(h):
    import html as H
    return H.unescape(re.sub(r'<[^>]+>', '', h)).strip()


def extrai_html(html):
    """Formato da Farmacologia: <div class="q" data-qid data-a="D"> .stem, .opt > .ot + .why"""
    out = []
    partes = re.split(r'(?=<div class="q" data-qid=)', html)
    for p in partes[1:]:
        m = re.match(r'<div class="q" data-qid="([^"]+)" data-a="([A-J])"', p)
        st = re.search(r'<div class="stem">(.*?)</div>\s*(?:</div>)?\s*<button class="opt"', p, re.S)
        if not (m and st): continue
        ops = re.findall(r'<button class="opt" data-l="([A-J])">.*?<span class="ot">(.*?)</span>(?:<span class="why">(.*?)</span>)?', p, re.S)
        if len(ops) < 2: continue
        letras = [o[0] for o in ops]
        if m.group(2) not in letras: continue
        out.append({'enun': txt(st.group(1)), 'alts': [o[1].strip() for o in ops], 'gab': letras.index(m.group(2)),
                    'comentario': [o[2].strip() for o in ops], 'id_master': m.group(1)})
    return out


def main():
    sys.stdout.reconfigure(encoding='utf8')
    dst = os.path.join(RAIZ, '_exportados', 'questoes'); os.makedirs(dst, exist_ok=True)
    tot = 0
    for nome, rel in MASTERS.items():
        p = os.path.join(RAIZ, rel)
        if not os.path.exists(p): print('falta', rel); continue
        h0 = open(p, encoding='utf8').read()
        qs, uniq = extrai(h0) + extrai_html(h0), {}
        for q in qs:
            h = hashlib.sha1((q['enun'] + '|' + '|'.join(q['alts'])).encode('utf8')).hexdigest()[:10]
            if h in uniq: continue
            q = {'id': nome + ':' + h, **q, 'porque': [''] * len(q['alts']), 'trecho': [''] * len(q['alts'])}
            uniq[h] = q
        lst = list(uniq.values())
        json.dump({'materia': nome, 'arquivo': rel, 'questoes': lst},
                  open(os.path.join(dst, nome + '.json'), 'w', encoding='utf8'), ensure_ascii=False, indent=1)
        print(f'{nome:14} {len(lst):5} questões')
        tot += len(lst)
    print('total', tot, '→', dst)


if __name__ == '__main__':
    main()
