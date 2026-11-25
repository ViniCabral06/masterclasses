"""Grava os "porquês" (pasta Prontos da Área de Trabalho) nos masters, num bloco
<!--porque:inicio--> <script>window.VG_PORQUE={...}</script> <!--porque:fim--> antes do </body>.
O _tema/correcao.js acha a questão pelas alternativas (em qualquer ordem) e desenha a correção.
Só entram lotes aprovados pelo conferir_porques.py. Rode de novo quando chegar lote novo.
Uso: py importar_porques.py [pasta]
"""
import glob, html, json, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from exportar_questoes import MASTERS, RAIZ

LOTES = os.path.join(RAIZ, '_exportados', 'questoes', 'lotes')
PADRAO = os.path.join(os.path.dirname(RAIZ), 'Prontos')
INI, FIM = '<!--porque:inicio-->', '<!--porque:fim-->'


def norm(s):
    s = html.unescape(re.sub(r'<[^>]+>', '', str(s)))
    return re.sub(r'[\W_]+', '', s.lower())


def fnv(s):
    # FNV-1a sobre unidades UTF-16, igual ao JS (charCodeAt)
    h = 0x811c9dc5
    b = s.encode('utf-16-le')
    for i in range(0, len(b), 2):
        h ^= b[i] | (b[i + 1] << 8)
        h = (h * 0x01000193) & 0xffffffff
    return format(h, 'x')


def chave(alts):
    return fnv('|'.join(sorted(norm(a) for a in alts)))


def ler(p):
    t = open(p, encoding='utf8').read()
    m = re.search(r'\[.*\]', t, re.S)
    return json.loads(m.group()) if m else []


def main():
    sys.stdout.reconfigure(encoding='utf8')
    pasta = sys.argv[1] if len(sys.argv) > 1 else PADRAO
    orig = {}
    for f in glob.glob(os.path.join(LOTES, '*.json')):
        for q in json.load(open(f, encoding='utf8')): orig[q['id']] = q
    dados = {}
    for f in sorted(glob.glob(os.path.join(pasta, '*'))):
        if os.path.isdir(f): continue
        try: d = ler(f)
        except Exception: continue
        for q in d:
            b = orig.get(q.get('id'))
            if not b or q.get('gabarito') != b['gabarito'] or q.get('alternativas') != b['alternativas']: continue
            P, T = q.get('porque') or [], q.get('trecho') or []
            ent = []
            for j, a in enumerate(b['alternativas']):
                if j == b['gabarito']: continue
                p = (P[j] if j < len(P) else '').strip()
                t = (T[j] if j < len(T) else '').strip()
                if not p: continue
                if t and t not in a: t = ''
                ent.append([norm(a)[:24], p, t])
            if ent:
                mat = q['id'].split(':')[0]
                dados.setdefault(mat, {})[chave(b['alternativas'])] = ent
    for mat, rel in MASTERS.items():
        dd = dados.get(mat)
        if not dd: continue
        p = os.path.join(RAIZ, rel)
        s = open(p, encoding='utf8').read()
        bloco = INI + '<script>window.VG_PORQUE=' + json.dumps(dd, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/') + ';</script>' + FIM
        if INI in s:
            s = re.sub(re.escape(INI) + '.*?' + re.escape(FIM), lambda m: bloco, s, flags=re.S)
        else:
            i = s.rfind('</body>')
            s = s[:i] + bloco + '\n' + s[i:]
        open(p, 'w', encoding='utf8', newline='').write(s)
        print(f'{mat:14} {len(dd):5} questões gravadas em {rel}')


if __name__ == '__main__':
    main()
