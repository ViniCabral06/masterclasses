"""Confere se cada master tem o padrão do site (skill masterclass-medica, seção L, e CLAUDE.md).

Uso:
  python conferir.py              confere todos os masters do hub (SUBJECTS no index.html)
  python conferir.py pasta/x.html confere só esse arquivo

Para cada item que falta, diz o que fazer e qual master serve de modelo. Rode antes de publicar um
master novo (seja do Vinícius ou do Matheus) e corrija o que ele marcar. O publicar.py roda isto
sozinho e mostra os avisos, mas não impede a publicação.
"""
import json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent

# (rótulo, teste, o que fazer). O teste recebe o texto do master, a pasta dele e o texto das aulas separadas.
def tem(*pads):
    return lambda s, pasta, aulas: any(re.search(p, s + aulas, re.I | re.S) for p in pads)

ITENS = [
    ('Tema de vidro aplicado', tem(r'<!--vidro:cabeca-->|<!--vidro:'),
     'rode python publicar.py --local (o script põe o bloco do tema)'),
    ('Botão de tema claro/escuro', tem(r'data-act="theme"|id="btnTheme"|\bthemebtn\b'),
     'o botão precisa de data-act="theme", id="btnTheme" ou class="themebtn" para a lâmpada achar'),
    ('Texto dentro de <main>', tem(r'<main\b|id="main"|id="view"|class="main\b'),
     'ponha o conteúdo em <main> (ou #main, #view, .main): os grifos só funcionam ali'),
    ('Primeira visita (VIDRO_NOVO)', tem(r'VIDRO_NOVO', r'pato-pos'),
     'na abertura, se window.VIDRO_NOVO for verdadeiro, feche todos os grupos e abra a página de boas-vindas (ver Farmacologia: focusActive)'),
    ('Página de boas-vindas', tem(r'Boas-vindas', r'Bem-vind', r'Visão geral', r'>\s*Início\s*<'),
     'crie a página de boas-vindas (como usar, blocos de aulas, crédito), aberta na primeira visita'),
    ('Blocos parcial / somativa', tem(r'Bloco da parcial|sb-bloco|base-closed|\bBLOCOS\b'),
     'agrupe as aulas na sidebar em blocos recolhíveis: parcial, somativa, pós-somativa (ver Farmacologia)'),
    ('Questões só de prova por capítulo', tem(r'pv-box|Das provas|data-grp="seg-pv"|seg-pv|Questão de prova'),
     'cada capítulo mostra primeiro só as questões reais das provas; sem nenhuma, o aviso "nunca caiu" e as autorais num bloco recolhível'),
    ('Aviso "nunca caiu"', tem(r'nunca caiu|não foi cobrad|pvnone|pv-none|Nenhuma questão das provas'),
     'capítulo sem questão de prova precisa do aviso "Este tema nunca caiu nas provas, mas fiz as minhas questões"'),
    ('Página "O que mais cai"', tem(r'O que mais (é )?(cai|cobrad)|mais caiu|mais foi cobrado'),
     'cada aula fecha com a página "O que mais cai", com todas as questões de prova da aula'),
    ('Memes ao gabaritar', lambda s, pasta, aulas: (pasta / '_img' / 'memes.json').exists()
        or bool(re.search(r'id="meme-js"|window\.MEMES|data-memes="proprio"|"tipo":"Meme"', s)),
     'ponha a lista de memes em <pasta>/_img/memes.json (o _tema/memes.js faz o resto); ~60 por master'),
    ('Crédito Vinícius e Matheus', tem(r'Vin[ií]cius[^<]{0,40}Matheus|Matheus[^<]{0,40}Vin[ií]cius'),
     'ponha "by Vinícius Cabral e Matheus Tavares" no topo da sidebar'),
]


# master que não precisa de algum item, com o motivo (aparece no relatório)
DISPENSA = {
    'TH4_Masterclass_OSCE.html': ({'Blocos parcial / somativa', 'Questões só de prova por capítulo', 'Aviso "nunca caiu"',
                                   'Página "O que mais cai"'}, 'prova prática (OSCE), sem provas escritas'),
}


def aulas_de(pasta):
    a = pasta / 'aulas'
    return ''.join(p.read_text(encoding='utf-8', errors='ignore') for p in sorted(a.glob('*.html'))) if a.is_dir() else ''


def masters():
    s = (ROOT / 'index.html').read_text(encoding='utf-8')
    return [ROOT / h for h in re.findall(r'\bhref:"([^"]+\.html)"', s)]


def conferir(f):
    s = f.read_text(encoding='utf-8', errors='ignore')
    aulas = aulas_de(f.parent)
    livre, _ = DISPENSA.get(f.name, (set(), ''))
    faltam = [(r, o) for r, t, o in ITENS if r not in livre and not t(s, f.parent, aulas)]
    return faltam


def main(args):
    alvos = [Path(a).resolve() for a in args] or masters()
    total = 0
    for f in alvos:
        if not f.exists():
            print('não achei', f); continue
        faltam = conferir(f)
        nome = f.relative_to(ROOT) if f.is_relative_to(ROOT) else f
        if not faltam:
            print('OK    ', nome, ('(dispensado: %s)' % DISPENSA[f.name][1]) if f.name in DISPENSA else ''); continue
        total += len(faltam)
        print('FALTA ', nome)
        for r, o in faltam:
            print('   -', r + ':', o)
    if total:
        print('\n%d pendência(s). Modelos: Farmacologia (questões, blocos, boas-vindas), Humanização/Preventiva (questões de prova), Patologia (aulas separadas).' % total)
    return total


if __name__ == '__main__':
    try: sys.stdout.reconfigure(encoding='utf-8')
    except Exception: pass
    sys.exit(1 if main(sys.argv[1:]) else 0)
