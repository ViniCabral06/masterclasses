"""Confere os lotes de "porquê" que voltaram do outro modelo (pasta Prontos da Área de Trabalho).
Acha o lote de cada arquivo pelos códigos das questões (o nome do arquivo não importa).
Uso: py conferir_porques.py [pasta]
"""
import glob, json, os, re, sys

RAIZ = os.path.dirname(os.path.abspath(__file__))
LOTES = os.path.join(RAIZ, '_exportados', 'questoes', 'lotes')
PADRAO = os.path.join(os.path.dirname(RAIZ), 'Prontos')
ING = re.compile(r'\b(the|is|are|and|does|not|with|which)\b', re.I)
GEN = re.compile(r'^\s*(A alternativa|Alternativa|Errad|Incorret|Fals)', re.I)


def ler(p):
    t = open(p, encoding='utf8').read()
    m = re.search(r'\[.*\]', t, re.S)
    return json.loads(m.group()) if m else None


def main():
    sys.stdout.reconfigure(encoding='utf8')
    pasta = sys.argv[1] if len(sys.argv) > 1 else PADRAO
    lotes = {os.path.basename(f)[:-5]: {q['id']: q for q in json.load(open(f, encoding='utf8'))}
             for f in glob.glob(os.path.join(LOTES, '*.json'))}
    de_id = {i: n for n, qs in lotes.items() for i in qs}
    feitos = {}
    for f in sorted(glob.glob(os.path.join(pasta, '*'))):
        if os.path.isdir(f): continue
        nome = os.path.basename(f)
        try:
            d = ler(f)
        except Exception as e:
            print(f'❌ {nome}: não é um JSON válido ({e.__class__.__name__})'); continue
        if not d: print(f'❌ {nome}: sem lista JSON'); continue
        conta = {}
        for q in d: conta[de_id.get(q.get('id'))] = conta.get(de_id.get(q.get('id')), 0) + 1
        lote = max(conta, key=conta.get)
        if not lote: print(f'❌ {nome}: nenhum código de questão conhecido'); continue
        orig = lotes[lote]
        prob = {'vazio': 0, 'trecho': 0, 'mudada': 0, 'inglês': 0, 'genérico': 0, 'repetido': 0}
        ok = 0; vistos = set()
        for q in d:
            b = orig.get(q.get('id'))
            if not b or q.get('gabarito') != b['gabarito'] or q.get('alternativas') != b['alternativas']:
                prob['mudada'] += 1; continue
            vistos.add(q['id'])
            P, T = q.get('porque') or [], q.get('trecho') or []
            ps = []
            for j, a in enumerate(b['alternativas']):
                if j == b['gabarito']: continue
                p = (P[j] if j < len(P) else '').strip(); t = T[j] if j < len(T) else ''
                if not p: prob['vazio'] += 1; continue
                ps.append(p)
                if t and t not in a: prob['trecho'] += 1
                elif ING.search(p) and len(ING.findall(p)) >= 2: prob['inglês'] += 1
                elif GEN.match(p): prob['genérico'] += 1
                else: ok += 1
            if len(set(ps)) < len(ps): prob['repetido'] += 1
        falta = len(orig) - len(vistos)
        ruim = {k: v for k, v in prob.items() if v}
        st = '✅' if not ruim and not falta else ('⚠️' if sum(ruim.values()) <= 3 and not falta and 'repetido' not in ruim else '❌')
        extra = (' | faltam %d questões' % falta if falta else '') + (' | ' + ', '.join(f'{k}: {v}' for k, v in ruim.items()) if ruim else '')
        print(f'{st} {nome} → {lote}: {len(vistos)}/{len(orig)} questões, {ok} porquês bons{extra}')
        if st != '❌': feitos[lote] = f
    mats = sorted({n.rsplit('_', 1)[0] for n in lotes})
    print('\nPor matéria:')
    for m in mats:
        tot = sorted(n for n in lotes if n.rsplit('_', 1)[0] == m)
        ok = [n for n in tot if n in feitos]
        print(f'  {m:14} {len(ok)}/{len(tot)} lotes' + ('  ✅ completa' if len(ok) == len(tot) else '  faltam: ' + ', '.join(n.rsplit('_', 1)[1] for n in tot if n not in feitos)))


if __name__ == '__main__':
    main()
