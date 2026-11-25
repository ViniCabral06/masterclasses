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

def pele_de_vidro(s, pasta, aulas):
    """O vidro.css precisa ter a pele deste master: barra lateral com backdrop-filter (é onde o
    liquido.js põe a lente). Sem isso o master fica com barra sólida, fora do liquid glass."""
    k = CHAVE.get(pasta.name)
    if not k:
        return True
    css = (ROOT / '_tema' / 'vidro.css').read_text(encoding='utf-8')
    return any('"%s"' % k in sel and 'backdrop-filter' in corpo
               for sel, corpo in re.findall(r'([^{}]+)\{([^{}]*)\}', css))


def sem_foto_de_justificativa(s, pasta, aulas):
    """Prova que chegou só como justificativa vira questão reconstruída, nunca foto da justificativa."""
    t = s + aulas
    if re.search(r'"question"\s*:\s*null|fac-simil', t, re.I):
        return False
    # nunca entregar a letra certa antes da resposta (aviso, rótulo ou botão da justificativa)
    if re.search(r'"kind"\s*:\s*"note"[^{}]*Justificativa da quest', t):
        return False  # justificativa solta no lugar da questão
    return not re.search(r'gabarito oficial:? [A-E]\b(?!\))|gabarito \(letra [A-E]\)|\(letra [A-E]\) e a justificativa'
                         r'|· gabarito [A-E]\b|· alternativa [A-E]"'
                         r'|class="(?:pv-)?gab"[^>]*>\s*Gabarito:?\s*(?:<b>)?[A-E]\b|"gab"\s*:\s*"Gabarito:?\s*[A-E]\b', t, re.I)


def origem_das_questoes(s, pasta, aulas):
    t = s + aulas
    prova = re.search(r'Das provas|Questão de prova|pv-box|seg-pv', t, re.I)
    autoral = re.search(r'autora', t, re.I)
    reconstr = re.search(r'reconstru', t, re.I) or not re.search(r'justificativa', t, re.I)
    return bool(prova and autoral and reconstr)


def fim_do_master(s, pasta, aulas):
    t = s + aulas
    return all(re.search(p, t, re.I) for p in (r'Revis[aã]o final', r'O que vai cair|Raio-X da prova',
                                                 r'Simulad', r'Minha revis[aã]o'))


ITENS = [
    ('Tema de vidro aplicado', tem(r'<!--vidro:cabeca-->|<!--vidro:'),
     'rode python publicar.py --local (o script põe o bloco do tema)'),
    ('Editor do site (editor.js, caneta)', tem(r'_tema/editor\.js'),
     'rode python publicar.py --local: o script inclui o _tema/editor.js (caneta, barra de edição, balões e imagens)'),
    ('Liquid glass (liquido.js)', tem(r'liquido\.js'),
     'rode python publicar.py --local: o script inclui o _tema/liquido.js; peça flutuante nova entra em SEL nesse arquivo'),
    ('Pele de liquid glass no tema', pele_de_vidro,
     'acrescente a pele do master no _tema/vidro.css (cor em --vg-acc e barra lateral/barra do celular com backdrop-filter); '
     'veja o bloco "MASTERS NOVOS" ou o da Microbiologia'),
    ('Provas como questões, não fotos', sem_foto_de_justificativa,
     'prova que veio só com justificativa vira questão reconstruída (enunciado e alternativas imaginados, gabarito e '
     'justificativa oficiais), como em Microbiologia e Português; foto da justificativa não conta como questão; '
     'e nunca mostre a letra certa antes da resposta (nem no aviso, nem no rótulo)'),
    ('Origem de cada questão marcada', origem_das_questoes,
     'cada questão diz de onde veio: "Das provas" (texto original), "reconstruída da justificativa" ou "✍️ autoral"'),
    ('Seções finais (revisão final, o que vai cair, simulados, minha revisão)', fim_do_master,
     'feche o master como a Microbiologia: Revisão final (revisão em 1 hora com esquemas), O que vai cair, '
     'Simulados com as provas anteriores e Minha revisão'),
    ('Correção alternativa por alternativa', tem(r'<!--porque:inicio-->', r'VGCorrecao\.bloco', r'class="pv-alts'),
     'toda questão mostra "Por que as outras alternativas estão erradas" pelo _tema/correcao.js: dê porque e trecho a cada '
     'questão (py exportar_questoes.py → outro modelo → py conferir_porques.py → py importar_porques.py) e chame '
     'VGCorrecao.bloco(q, {pick}) na tela de correção; veja a seção E da skill masterclass-medica'),
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
                                   'Página "O que mais cai"',
                                   'Origem de cada questão marcada', 'Seções finais (revisão final, o que vai cair, simulados, minha revisão)', 'Correção alternativa por alternativa'}, 'prova prática (OSCE), sem provas escritas'),
    'DIC_IV_Masterclass.html': ({'Crédito Vinícius e Matheus', 'Correção alternativa por alternativa'}, 'master do Thiaginho: o crédito é "Made by Thiaginho"; os exercícios dele não são múltipla escolha no formato do site'),
}


def aulas_de(pasta):
    a = pasta / 'aulas'
    return ''.join(p.read_text(encoding='utf-8', errors='ignore') for p in sorted(a.glob('*.html'))) if a.is_dir() else ''


def masters():
    s = (ROOT / 'index.html').read_text(encoding='utf-8')
    return [ROOT / h for h in re.findall(r'\bhref:"([^"]+\.html)"', s)]


def _chaves():
    s = (ROOT / 'index.html').read_text(encoding='utf-8')
    bloco = s[s.index('const SUBJECTS'):]
    out = {}
    for k, corpo in re.findall(r'(\w+)\s*:\s*\{(.*?)\n\s*\}', bloco, re.S):
        h = re.search(r'href\s*:\s*"([^"]+)"', corpo)
        if h and '/' in h.group(1):
            out.setdefault(h.group(1).split('/')[0], k)
    return out


CHAVE = _chaves()


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
        print('\n%d pendência(s). Modelo principal: Microbiologia (seções finais, questões reconstruídas das justificativas, origem de cada questão). Também: Farmacologia (blocos, boas-vindas), Patologia (aulas separadas).' % total)
    return total


if __name__ == '__main__':
    try: sys.stdout.reconfigure(encoding='utf-8')
    except Exception: pass
    sys.exit(1 if main(sys.argv[1:]) else 0)
