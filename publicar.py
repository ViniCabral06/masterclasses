# -*- coding: utf-8 -*-
"""
Publica o site das masterclasses. O repositório É o site: GitHub Pages serve esta pasta.

  python publicar.py "mensagem"   puxa o que o outro enviou, aplica o tema, otimiza as imagens,
                                  faz o commit e envia ao GitHub (o site atualiza em ~1 minuto)
  python publicar.py --local      só aplica o tema e otimiza (não envia), para ver no PC
  python publicar.py --remover    tira o tema dos masters

As matérias vêm da lista SUBJECTS do index.html (name, href e, se tiver, game).
Para incluir uma matéria nova, acrescente uma entrada lá e rode este script. Veja LEIAME.md.
"""
import os, re, sys, shutil, subprocess, json, base64, hashlib, io
import html as html_mod
from pathlib import Path

ROOT = Path(__file__).resolve().parent
ORIGINAIS = ROOT / "_originais"   # cópia dos masters antes de tirar as imagens (fica só no seu PC)
MIDIA = ("_img", "aulas", "audios", "imagens", "img", "midia")
LIMITE_MB = 50
TEMA = ROOT / "_tema"


def ver(nome):
    """Versão curta do arquivo do tema (muda quando o conteúdo muda). Vai no endereço (?v=...)
    para o navegador baixar o arquivo novo na hora, em vez de usar o guardado em cache.
    Ignora a diferença de quebra de linha (Windows/Linux) para os dois PCs gerarem a mesma versão."""
    dados = (TEMA / nome).read_bytes().replace(b"\r\n", b"\n")
    return hashlib.sha1(dados).hexdigest()[:8]
CACHE = ROOT / "_cache_otimizado"   # imagens já convertidas (não precisa versionar)
DATA_RE = re.compile(r"data:(image/(?:jpeg|png|gif|webp));base64,([A-Za-z0-9+/=]{2000,})")
IMG_SEM_LAZY = re.compile(r"<img(?![^>]*\bloading=)")


def imagem_otimizada(mime, b64):
    """Converte a imagem embutida num arquivo WebP (ou mantém o original se ficar maior). Cache por conteúdo."""
    h = hashlib.sha1(b64.encode()).hexdigest()[:16]
    for f in CACHE.glob(h + ".*"):
        return f
    CACHE.mkdir(exist_ok=True)
    raw = base64.b64decode(b64)
    ext, out = {"image/jpeg": "jpg", "image/png": "png", "image/gif": "gif", "image/webp": "webp"}[mime], raw
    if mime in ("image/jpeg", "image/png"):
        try:
            from PIL import Image
            im = Image.open(io.BytesIO(raw))
            if max(im.size) > 1800:
                im.thumbnail((1800, 1800), Image.LANCZOS)
            if im.mode not in ("RGB", "RGBA"):
                im = im.convert("RGBA" if "A" in im.mode or "transparency" in im.info else "RGB")
            buf = io.BytesIO(); im.save(buf, "WEBP", quality=80, method=5)
            if buf.tell() < len(raw):
                ext, out = "webp", buf.getvalue()
        except Exception as e:
            print("  aviso: imagem mantida sem conversão:", e)
    f = CACHE / f"{h}.{ext}"; f.write_bytes(out)
    return f


def otimizar_html(src, dst):
    """Tira as imagens de dentro do HTML (vão para _img/ ao lado) e liga o carregamento preguiçoso."""
    texto = src.read_text(encoding="utf-8")
    pasta = dst.parent / "_img"; pasta.mkdir(parents=True, exist_ok=True)
    antes = len(texto)

    def troca(m):
        f = imagem_otimizada(m.group(1), m.group(2))
        alvo = pasta / f.name
        if not alvo.exists():
            shutil.copy2(f, alvo)
        return "_img/" + f.name
    texto = DATA_RE.sub(troca, texto)
    texto = IMG_SEM_LAZY.sub("<img loading=lazy decoding=async", texto)
    with open(dst, "w", encoding="utf-8", newline="") as fh:
        fh.write(texto)
    imgs = sum(f.stat().st_size for f in pasta.iterdir())
    print(f"  {src.name}: {antes/1e6:.1f} MB -> HTML {len(texto.encode())/1e6:.1f} MB + imagens {imgs/1e6:.1f} MB (sob demanda)")
BACKUP = ROOT / "_backup_antes_do_vidro"

CORES = {"farmaco": "#ff4d6d", "micro": "#9a5bff", "th4": "#38f5a3", "pato": "#ff6fb5", "prev": "#ffb547", "huma": "#5aa9ff", "port": "#ff8a5b", "img": "#9fd3ff", "lab": "#4fe0cf", "semio": "#ffd93d", "dic": "#b8f35a"}
ICONES = {
    "farmaco": '<rect x="3" y="9" width="18" height="6" rx="3" transform="rotate(-35 12 12)"/><path d="M9.2 7.6 14.8 16.4"/>',
    "micro": '<rect x="4" y="9" width="11" height="6" rx="3"/><path d="M15 12c2 0 2-2 4-2M15 12c2 0 2 2 4 2"/><circle cx="18" cy="5" r="1.6"/><circle cx="6" cy="19" r="1.6"/>',
    "th4": '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
    "pato": '<path d="M6 21h12M9 21v-3h6v3M10 18l-2-6 5-7 3 2-4 7M13 5l1.5-2 2 1.4-1.4 2"/><circle cx="14" cy="14" r="2"/>',
    "prev": '<path d="M12 3 4.5 6v5.5c0 4.6 3.2 8.4 7.5 9.5 4.3-1.1 7.5-4.9 7.5-9.5V6z"/><path d="M12 9v6M9 12h6"/>',
    "huma": '<path d="m11 17 2 2a1 1 0 1 0 3-3"/><path d="m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l2.81-2.81a5.79 5.79 0 0 1 7.06-.87l.47.28a2 2 0 0 0 1.42.25L21 4"/><path d="m21 3 1 11h-2"/><path d="M3 3 2 14l6.5 6.5a1 1 0 1 0 3-3"/><path d="M3 4h8"/>',
    "port": '<path d="M5 4h10l4 4v12H5z"/><path d="M15 4v4h4M8 12h8M8 16h5"/>',
    "img": '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M12 6v12M8 8c-2 1-2 3-2 5M16 8c2 1 2 3 2 5M8 11c-1.5.5-1.5 2-1.5 3M16 11c1.5.5 1.5 2 1.5 3"/>',
    "lab": '<path d="M8 3h8M9.5 3v14.5a2.5 2.5 0 0 0 5 0V3"/><path d="M9.5 10h5"/><path d="M9.5 3.5h5"/>',
    "semio": '<path d="M6 3v6a4 4 0 0 0 8 0V3"/><path d="M10 13v3a5 5 0 0 0 10 0v-2"/><circle cx="20" cy="12" r="2"/>',
    "dic": '<path d="M3 18V8M3 14h18v4M21 14v-2a3 3 0 0 0-3-3h-7v5"/><circle cx="7" cy="11" r="2"/>',
}
# master de outra autoria: crédito próprio na tela de carregamento (o padrão é Vinícius e Matheus)
CREDITOS = {"dic": "Made by <b>Thiaginho</b>"}
CREDITO_PADRAO = "Design by <b>Vinícius Cabral</b> · Masterclass by <b>Matheus Tavares e Vinícius Cabral</b>"
COR_PADRAO, ICONE_PADRAO = "#4ff3ff", '<path d="M8 4c0 6 8 6 8 8s-8 2-8 8M16 4c0 6-8 6-8 8s8 2 8 8"/>'

H_INI, H_FIM = "<!--vidro:cabeca-->", "<!--/vidro:cabeca-->"
B_INI, B_FIM = "<!--vidro:corpo-->", "<!--/vidro:corpo-->"
FONTES = ('<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
          '<link href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700&family=Instrument+Serif:ital@0;1&display=swap" rel="stylesheet">')
IMPORTMAP = ('<script type="importmap">{"imports":{"three":"https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js",'
             '"three/addons/":"https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/"}}</script>')


def materias():
    s = (ROOT / "index.html").read_text(encoding="utf-8")
    bloco = s[s.index("const SUBJECTS"):s.index("const TICK")]
    out = []
    for m in re.finditer(r'(\w+)\s*:\s*\{(.*?)\n\s*\}', bloco, re.S):
        k, corpo = m.group(1), m.group(2)
        nome = re.search(r'name\s*:\s*"([^"]+)"', corpo)
        href = re.search(r'href\s*:\s*"([^"]+)"', corpo)
        game = re.search(r'game\s*:\s*"([^"]+)"', corpo)
        if not (nome and href):
            continue
        out.append({"k": k, "nome": nome.group(1), "arquivo": href.group(1), "modo": "tema"})
        if game:
            out.append({"k": k, "nome": "Corredor da OSCE" if k == "th4" else nome.group(1), "arquivo": game.group(1), "modo": "carregar"})
    return out


def bloco_cabeca(m, rel):
    if m["modo"] != "tema":
        return f"{H_INI}{FONTES}{H_FIM}"
    k = m["k"]
    # posição: volta para onde a pessoa parou (hash salvo por vidro.js); VIDRO_NOVO = primeira visita, sidebar toda fechada
    # ?vgindice: cópia escondida que a 🔍 Buscar (abas.js) usa para ler o texto da matéria; não grava nada no navegador
    pos = ("if(/[?&]vgindice=/.test(location.search)){window.__vgIndex=1;try{Storage.prototype.setItem=Storage.prototype.removeItem=Storage.prototype.clear=function(){}}catch(e){}}"
           "(function(){var h='';try{h=localStorage.getItem('vidro-pos:'+location.pathname)||''}catch(e){}"
           "window.VIDRO_NOVO=!location.hash&&!h;if(!location.hash&&h)history.replaceState(null,'',h)})();")
    forcar = "<script>document.documentElement.dataset.vidro=%s;%s</script>" % (json.dumps(k), pos)
    return (f"{H_INI}\n{forcar}\n{FONTES}\n<link rel=\"stylesheet\" href=\"{rel}/vidro.css?v={ver('vidro.css')}\">\n{IMPORTMAP}\n"
            f"<script defer src=\"{rel}/modelos.js?v={ver('modelos.js')}\"></script><script defer src=\"{rel}/palco.js?v={ver('palco.js')}\"></script><script defer src=\"{rel}/vidro.js?v={ver('vidro.js')}\"></script><script defer src=\"{rel}/notas.js?v={ver('notas.js')}\"></script><script defer src=\"{rel}/segmentos.js?v={ver('segmentos.js')}\"></script><script defer src=\"{rel}/extras.js?v={ver('extras.js')}\"></script><script defer src=\"{rel}/memes.js?v={ver('memes.js')}\"></script><script defer src=\"{rel}/liquido.js?v={ver('liquido.js')}\"></script><script defer src=\"{rel}/simulado.js?v={ver('simulado.js')}\"></script><script defer src=\"{rel}/flashcards.js?v={ver('flashcards.js')}\"></script><script defer src=\"{rel}/revisao.js?v={ver('revisao.js')}\"></script><script defer src=\"{rel}/foco.js?v={ver('foco.js')}\"></script><script defer src=\"{rel}/elos.js?v={ver('elos.js')}\" data-v=\"{ver('elos.json')}\"></script><script defer src=\"{rel}/abas.js?v={ver('abas.js')}\"></script>\n{H_FIM}")


def bloco_corpo(m):
    cor, icone = CORES.get(m["k"], COR_PADRAO), ICONES.get(m["k"], ICONE_PADRAO)
    nome = m["nome"]
    css = """
#vidro-load{position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;background:#04070b;color:#eef4f6;font-family:"Instrument Sans",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;overflow:hidden;transition:opacity .8s cubic-bezier(.2,.8,.2,1),filter .8s,transform .9s cubic-bezier(.2,.8,.2,1)}
#vidro-load::before{content:"";position:absolute;inset:0;background:var(--vl);clip-path:circle(150% at 50% 50%);animation:vl-shrink 1s cubic-bezier(.7,0,.2,1) .05s forwards}
#vidro-load::after{content:"";position:absolute;width:70vmax;height:70vmax;border-radius:50%;background:var(--vl);filter:blur(120px);opacity:.18;animation:vl-float 7s ease-in-out infinite alternate}
@keyframes vl-shrink{to{clip-path:circle(0% at 50% 42%)}}
@keyframes vl-float{from{transform:translate(-20vw,-10vh)}to{transform:translate(20vw,12vh)}}
#vidro-load .vl-in{position:relative;z-index:2;display:flex;flex-direction:column;align-items:center;gap:20px;padding:0 16px;opacity:0;transform:translateY(18px);animation:vl-up .9s .6s cubic-bezier(.2,.8,.2,1) forwards}
@keyframes vl-up{to{opacity:1;transform:none}}
#vidro-load .vl-orb{width:136px;height:136px;border-radius:50%;position:relative;overflow:hidden;background:rgba(255,255,255,.05);
  box-shadow:inset 0 2px 0 rgba(255,255,255,.45),inset 0 0 0 1px rgba(255,255,255,.18),inset 0 -24px 40px rgba(255,255,255,.05),0 30px 90px -24px var(--vl);animation:vl-breathe 2.4s ease-in-out infinite}
@keyframes vl-breathe{50%{transform:scale(1.04)}}
#vidro-load .vl-orb::before,#vidro-load .vl-orb::after{content:"";position:absolute;left:50%;top:50%;width:300px;height:300px;margin:-150px 0 0 -150px;border-radius:43%;background:var(--vl);opacity:.85;
  translate:0 120px;animation:vl-wave 4s linear infinite,vl-fill 7s cubic-bezier(.2,.7,.3,1) .7s forwards}
#vidro-load .vl-orb::after{opacity:.35;border-radius:38%;animation-duration:6.5s,7s}
@keyframes vl-wave{to{rotate:360deg}}
@keyframes vl-fill{to{translate:0 30px}}
#vidro-load .vl-orb i{position:absolute;left:18%;top:10%;width:38%;height:22%;border-radius:50%;background:rgba(255,255,255,.55);filter:blur(6px);z-index:3;rotate:-25deg}
#vidro-load .vl-orb svg{position:absolute;inset:0;margin:auto;width:58px;height:58px;z-index:2;fill:none;stroke:#fff;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round;filter:drop-shadow(0 2px 8px rgba(0,0,0,.35))}
#vidro-load .vl-t{font-family:"Instrument Serif","Iowan Old Style",Georgia,serif;font-weight:400;font-size:clamp(38px,6.4vw,80px);line-height:.98;letter-spacing:-.01em;text-align:center;max-width:14ch}
#vidro-load .vl-ecg{width:min(320px,70vw);height:40px;overflow:visible}
#vidro-load .vl-ecg path{fill:none;stroke:var(--vl);stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:520;stroke-dashoffset:520;animation:vl-ecg 1.8s linear infinite}
@keyframes vl-ecg{to{stroke-dashoffset:-520}}
#vidro-load .vl-s{font-size:14px;color:rgba(238,244,246,.62)}
#vidro-load .vl-s b{font-weight:500;color:rgba(238,244,246,.9)}
#vidro-load .vl-c{position:absolute;left:0;right:0;bottom:26px;z-index:2;text-align:center;font-size:12px;letter-spacing:.02em;color:rgba(238,244,246,.5);opacity:0;animation:vl-up .9s .9s cubic-bezier(.2,.8,.2,1) forwards}
#vidro-load .vl-c b{font-weight:500;color:rgba(238,244,246,.82)}
#vidro-load.out{opacity:0;filter:blur(16px);transform:scale(1.08);pointer-events:none}
@media (prefers-reduced-motion:reduce){#vidro-load *,#vidro-load::before,#vidro-load::after{animation-duration:.01s!important;animation-iteration-count:1!important}}
"""
    dicas = json.dumps(["Separando os segmentos", "Embaralhando as questões", "Revelando as imagens", "Afinando o quiz final"], ensure_ascii=False)
    js = ("(function(){var L=document.getElementById('vidro-load'),s=L.querySelector('.vl-s b'),d=%s,i=0,t0=Date.now(),ok=0;"
          "var iv=setInterval(function(){i=(i+1)%%d.length;s.textContent=d[i]},1300);"
          "function abre(){clearInterval(iv);setTimeout(function(){document.documentElement.classList.add('vidro-ready');L.classList.add('out');"
          "setTimeout(function(){L.remove()},950)},Math.max(0,1500-(Date.now()-t0)))}"
          # espera o 3D (fundo e lâmpada) ficar pronto, com limite: a página só aparece depois do pesado
          "function done(){if(ok)return;ok=1;var p=window.VIDRO_3D,f=0,g=function(){if(!f){f=1;abre()}};"
          "if(p&&p.then){p.then(g,g);setTimeout(g,4500)}else g()}"
          "if(document.readyState==='complete')done();else addEventListener('load',done);setTimeout(done,10000);"
          "addEventListener('pageshow',function(e){if(e.persisted)done()})})();") % dicas
    return (f"{B_INI}\n<style>{css}</style>\n"
            f"<div id=\"vidro-load\" style=\"--vl:{cor}\" role=\"status\" aria-label=\"Carregando {nome}\"><div class=\"vl-in\">"
            f"<div class=\"vl-orb\"><i></i><svg viewBox=\"0 0 24 24\">{icone}</svg></div>"
            f"<div class=\"vl-t\">{nome}</div>"
            "<svg class=\"vl-ecg\" viewBox=\"0 0 320 40\" preserveAspectRatio=\"none\"><path d=\"M0 22 H80 l8 -5 l7 5 H130 l6 10 l9 -30 l9 34 l6 -10 H210 l11 -7 l11 7 H320\"/></svg>"
            "<div class=\"vl-s\"><b>Separando os segmentos</b></div></div>"
            f"<div class=\"vl-c\">{CREDITOS.get(m['k'], CREDITO_PADRAO)}</div></div>\n"
            f"<script>{js}</script>\n{B_FIM}")


def limpar(s):
    s = re.sub(re.escape(H_INI) + r".*?" + re.escape(H_FIM) + r"\n?", "", s, flags=re.S)
    s = re.sub(re.escape(B_INI) + r".*?" + re.escape(B_FIM) + r"\n?", "", s, flags=re.S)
    return s


def injetar(m, remover=False):
    arq = ROOT / m["arquivo"]
    if not arq.exists():
        print(f"  ! não achei {m['arquivo']}"); return False
    with open(arq, encoding="utf-8", newline="") as f:
        s = f.read()
    if not remover and H_INI not in s:
        dest = BACKUP / m["arquivo"]
        if not dest.exists():
            dest.parent.mkdir(parents=True, exist_ok=True); shutil.copy2(arq, dest)
    novo = limpar(s)
    if not remover:
        corpo = re.search(r"<body[^>]*>", novo)
        fim_head = novo.find("</head>")
        if not corpo or fim_head < 0 or fim_head > corpo.start():
            print(f"  ! estrutura inesperada em {m['arquivo']}, pulei"); return False
        rel = os.path.relpath(TEMA, arq.parent).replace("\\", "/")
        novo = novo[:fim_head] + bloco_cabeca(m, rel) + "\n" + novo[fim_head:]
        corpo = re.search(r"<body[^>]*>", novo)
        novo = novo[:corpo.end()] + "\n" + bloco_corpo(m) + novo[corpo.end():]
    if novo != s:
        with open(arq, "w", encoding="utf-8", newline="") as f:
            f.write(novo)
        print(f"  {'tema removido de' if remover else 'tema aplicado em'} {m['arquivo']}")
    else:
        print(f"  {m['arquivo']} já estava em dia")
    return True


DOCS_RE = re.compile(r'DOCS\["([\w-]+)"\]="([A-Za-z0-9+/=]{200,})";')
BLOB_RE = re.compile(r"b64ToBlobUrl\(DOCS\[(\w+)\]\)")


def separar_aulas(m, texto):
    """Masters que guardam cada aula inteira em base64 (DOCS["aula1"]="...") viram um arquivo por aula
    em aulas/, carregado só quando aberto; as imagens de cada aula vão para _img/."""
    src = ROOT / m["arquivo"]
    if not DOCS_RE.search(texto):
        return texto
    pasta, img = src.parent / "aulas", src.parent / "_img"
    pasta.mkdir(exist_ok=True); img.mkdir(exist_ok=True)
    rel_tema = os.path.relpath(TEMA, pasta).replace("\\", "/")

    def troca_img(mm):
        f = imagem_otimizada(mm.group(1), mm.group(2))
        if not (img / f.name).exists():
            shutil.copy2(f, img / f.name)
        return "../_img/" + f.name

    def troca(mm):
        k, doc = mm.group(1), base64.b64decode(mm.group(2)).decode("utf-8")
        doc = DATA_RE.sub(troca_img, doc)
        doc = IMG_SEM_LAZY.sub("<img loading=lazy decoding=async", doc)
        doc = bloco_aula(m, rel_tema) + doc if "<head" not in doc else re.sub(r"(<head[^>]*>)", lambda h: h.group(1) + bloco_aula(m, rel_tema), doc, count=1)
        with open(pasta / f"{k}.html", "w", encoding="utf-8", newline="") as fh:
            fh.write(doc)
        return f'DOCS["{k}"]="@aulas/{k}.html";'
    texto = DOCS_RE.sub(troca, texto)
    texto = BLOB_RE.sub(lambda b: f"(DOCS[{b.group(1)}][0]==='@'?DOCS[{b.group(1)}].slice(1):b64ToBlobUrl(DOCS[{b.group(1)}]))", texto)
    print(f"  {src.name}: aulas separadas em {pasta.name}/ ({len(list(pasta.glob('*.html')))} arquivos)")
    return texto


def bloco_aula(m, rel):
    """Tema de vidro dentro das aulas (iframes): fundo transparente para o 3D do master aparecer atrás."""
    k = json.dumps(m["k"])
    return (f"{H_INI}<script>document.documentElement.dataset.vidro={k};document.documentElement.classList.add('vidro-aula','vidro-ready')</script>"
            f"<link rel=\"stylesheet\" href=\"{rel}/vidro.css?v={ver('vidro.css')}\"><script defer src=\"{rel}/notas.js?v={ver('notas.js')}\"></script><script defer src=\"{rel}/segmentos.js?v={ver('segmentos.js')}\"></script><script defer src=\"{rel}/extras.js?v={ver('extras.js')}\"></script><script defer src=\"{rel}/memes.js?v={ver('memes.js')}\"></script><script defer src=\"{rel}/liquido.js?v={ver('liquido.js')}\"></script><script defer src=\"{rel}/simulado.js?v={ver('simulado.js')}\"></script><script defer src=\"{rel}/flashcards.js?v={ver('flashcards.js')}\"></script><script defer src=\"{rel}/siglas.js?v={ver('siglas.js')}\"></script>{H_FIM}")


def atualizar_aulas(m):
    """Aulas já separadas (pasta aulas/ ao lado do master) recebem o bloco de tema atual,
    para que mudanças no tema (ex.: notas.js) cheguem também nelas, e não só nas aulas novas."""
    pasta = (ROOT / m["arquivo"]).parent / "aulas"
    if not pasta.is_dir():
        return
    rel = os.path.relpath(TEMA, pasta).replace("\\", "/")
    novo = bloco_aula(m, rel)
    padrao = re.compile(re.escape(H_INI) + r".*?" + re.escape(H_FIM), re.S)
    n = 0
    for f in sorted(pasta.glob("*.html")):
        s = f.read_text(encoding="utf-8")
        if H_INI not in s:
            continue
        t = padrao.sub(lambda _: novo, s, count=1)
        if t != s:
            with open(f, "w", encoding="utf-8", newline="") as fh:
                fh.write(t)
            n += 1
    if n:
        print(f"  {pasta.parent.name}/aulas: tema atualizado em {n} aula(s)")


FOCO_INI, FOCO_FIM = "<!--vidro:foco-->", "<!--/vidro:foco-->"
FOCO_Q = re.compile(r"(Parcial|Somativa)\s*(\d+)\D{0,6}?Quest[aã]o\s*(Aberta\s*)?(\d+)", re.I)
FOCO_PULA = {"capa", "home", "apendice", "quiz", "arena"}


def _questoes_de_prova(doc):
    """{segmento: (título, {questões de prova})} de uma aula separada. Uma questão é (P|S, número da prova,
    número da questão), tirada do rótulo de origem ("Parcial 82 — Questão 16", "Somativa 79 · Questão 9 ·
    reconstruída da justificativa"); autorais e adaptadas não contam."""
    def chave(rot):
        rot = html_mod.unescape(re.sub(r"<[^>]+>", "", rot))
        if re.search(r"autoral|estilo das provas|adaptad", rot, re.I):
            return None
        q = FOCO_Q.search(rot)
        return (q.group(1)[0].upper(), q.group(2), ("A" if q.group(3) else "") + q.group(4)) if q else None
    segs = {}
    dj = re.search(r'<script id="app-data"[^>]*>(.*?)</script>', doc, re.S)
    if dj:  # aula montada por JSON (ex.: Patologia, aula 2)
        for sg in json.loads(dj.group(1)).get("segments", []):
            segs[sg["id"]] = (sg.get("title", ""), {chave(q.get("sourceLabel", "")) for q in (sg.get("pv") or []) if q.get("pvReal")} - {None})
    else:
        for p in re.finditer(r'<section class="pane" id="([\w-]+)"[^>]*>(.*?)</section>', doc, re.S):
            t = re.search(r"<h[12][^>]*>(.*?)</h[12]>", p.group(2), re.S)
            ks = {chave(x) for x in re.findall(r'class="q-source[^"]*"[^>]*>(.*?)</span>', p.group(2), re.S)} - {None}
            segs[p.group(1)] = (re.sub(r"<[^>]+>", "", t.group(1)) if t else "", ks)
    return segs


def foco_das_aulas(m):
    """Master com as aulas em aulas/ (Patologia): conta as questões de prova de cada segmento e grava em
    window.VG_FOCO, no bloco vidro:foco do master. O _tema/foco.js usa isso para grifar aulas e segmentos
    na barra lateral (o master não enxerga o texto das aulas, que abrem em iframes). Páginas que só repetem
    questões (O que mais cai, quiz, apêndice) não ganham grifo próprio, mas entram no total da aula."""
    src = ROOT / m["arquivo"]
    pasta = src.parent / "aulas"
    if not pasta.is_dir() or not src.exists():
        return
    with open(src, encoding="utf-8", newline="") as f:
        s = f.read()
    nav, tabs = re.search(r"^const NAV = (\{.*\});\s*$", s, re.M), re.search(r"^const TABS = (\[.*\]);\s*$", s, re.M)
    if not (nav and tabs):
        return
    nav, tabs = json.loads(nav.group(1)), json.loads(tabs.group(1))
    dados = {}
    for t in tabs:
        k, arq = t["key"], pasta / f"{t['key']}.html"
        if t.get("group") in ("sim", "pratica") or k not in nav or not arq.exists():
            continue
        titulos = {i["k"]: i.get("t", "") for i in nav[k]}
        todas, conta = set(), {}
        for sid, (tit, ks) in _questoes_de_prova(arq.read_text(encoding="utf-8")).items():
            if sid in FOCO_PULA:
                continue
            todas |= ks
            if sid in titulos and ks and not re.search(r"mais cai", tit + " " + titulos[sid], re.I):
                conta[sid] = [sum(x[0] == "P" for x in ks), sum(x[0] == "S" for x in ks)]
        dados[k] = {"p": sum(x[0] == "P" for x in todas), "s": sum(x[0] == "S" for x in todas), "segs": conta}
    bloco = f"{FOCO_INI}<script>window.VG_FOCO={json.dumps(dados, ensure_ascii=False, separators=(',', ':'))};</script>{FOCO_FIM}"
    if FOCO_INI in s:
        t = re.sub(re.escape(FOCO_INI) + r".*?" + re.escape(FOCO_FIM), lambda _: bloco, s, count=1, flags=re.S)
    else:
        i = s.rfind("</body>")
        t = s[:i] + bloco + "\n" + s[i:] if i >= 0 else s
    if t != s:
        with open(src, "w", encoding="utf-8", newline="") as f:
            f.write(t)
        print(f"  {m['arquivo']}: frequência das provas por segmento atualizada (Foco de estudo)")


def otimizar_fonte(m):
    """Tira as imagens embutidas do master (vão para _img/ ao lado). O original fica em _originais/."""
    src = ROOT / m["arquivo"]
    if not src.exists():
        return
    texto = src.read_text(encoding="utf-8")
    if DOCS_RE.search(texto):
        dest = ORIGINAIS / m["arquivo"]
        if not dest.exists():
            dest.parent.mkdir(parents=True, exist_ok=True); shutil.copy2(src, dest)
        texto = separar_aulas(m, texto)
        with open(src, "w", encoding="utf-8", newline="") as fh:
            fh.write(texto)
    atualizar_aulas(m)
    tem_dados = DATA_RE.search(texto) is not None
    if not tem_dados and not IMG_SEM_LAZY.search(texto):
        return
    if tem_dados:
        dest = ORIGINAIS / m["arquivo"]
        if not dest.exists():
            dest.parent.mkdir(parents=True, exist_ok=True); shutil.copy2(src, dest)
    otimizar_html(src, src)


def arquivos_do_site(ms):
    fixos = [".gitignore", ".nojekyll", "index.html", "83b", "_83b", "gerar_83b.py", "publicar.py", "conferir.py", "elos.py", "LEIAME.md", "CLAUDE.md", "AGENTS.md", ".claude/skills", "_tema"]
    out = [f for f in fixos if (ROOT / f).exists()]
    for m in ms:
        src = ROOT / m["arquivo"]
        if not src.exists():
            continue
        out.append(m["arquivo"])
        for nome in MIDIA:
            if (src.parent / nome).is_dir():
                out.append((src.parent / nome).relative_to(ROOT).as_posix())
    return sorted(set(out))


def git(*args, ok_falha=False):
    r = subprocess.run(["git", *args], cwd=ROOT, capture_output=True, text=True, encoding="utf-8")
    if r.returncode != 0 and not ok_falha and "nothing to commit" not in (r.stdout + r.stderr):
        print(r.stdout, r.stderr); sys.exit(f"git {' '.join(args)} falhou")
    return r.stdout.strip()


def versionar_hub():
    """O hub (index.html) também carrega arquivos do tema; põe a versão no endereço deles (?v=...)
    para o 3D novo aparecer na hora, igual nos masters."""
    hub = ROOT / "index.html"
    s = hub.read_text(encoding="utf-8")
    t = re.sub(r'(["\'])_tema/([\w.-]+\.(?:js|css))(?:\?v=[0-9a-f]+)?\1',
               lambda m: f"{m.group(1)}_tema/{m.group(2)}?v={ver(m.group(2))}{m.group(1)}" if (TEMA / m.group(2)).exists() else m.group(0), s)
    if t != s:
        with open(hub, "w", encoding="utf-8", newline="") as fh:
            fh.write(t)
        print("  index.html: versão do tema atualizada")


def main():
    args = sys.argv[1:]
    remover, local = "--remover" in args, "--local" in args or "--preparar" in args
    if not (remover or local):
        print("Puxando o que já está no GitHub...")
        r = subprocess.run(["git", "pull", "--rebase", "--autostash"], cwd=ROOT, capture_output=True, text=True, encoding="utf-8")
        if r.returncode != 0:
            print(r.stdout, r.stderr)
            sys.exit("Conflito ao puxar as mudanças do outro. Resolva os arquivos marcados (ou peça ajuda ao Claude) e rode de novo.")
    ms = materias()
    print("Matérias no hub:", ", ".join(f"{m['nome']} ({m['modo']})" for m in ms))
    for m in ms:
        injetar(m, remover)
    if remover:
        print("Pronto (sem publicar)."); return
    for m in ms:
        otimizar_fonte(m)
        foco_das_aulas(m)
    versionar_hub()
    (ROOT / ".nojekyll").touch()
    # compara cada master com o padrão do site (skill masterclass-medica, seção L); só avisa, não impede
    try:
        import conferir
        print("\nConferindo o padrão dos masters:")
        if conferir.main([]):
            print("Corrija as pendências acima (ou peça ao Claude) antes de dar o master por pronto.\n")
    except Exception as e:
        print("(não consegui rodar o conferir.py:", e, ")")
    if local:
        print("Pronto (sem enviar). Para ver: python -m http.server 8765 nesta pasta e abra http://localhost:8765"); return
    msg = next((a for a in args if not a.startswith("--")), "Atualiza masterclasses")
    git("add", "-f", "--", *arquivos_do_site(ms))
    git("add", "-u")
    grandes = []
    for f in git("diff", "--cached", "--name-only", "-z").split("\0"):
        p = ROOT / f
        if f and p.is_file() and p.stat().st_size > LIMITE_MB * 1e6:
            grandes.append(f"{f} ({p.stat().st_size/1e6:.0f} MB)")
    if grandes:
        git("reset", "-q")
        sys.exit("Arquivo grande demais para o GitHub (limite " + str(LIMITE_MB) + " MB):\n  " + "\n  ".join(grandes))
    if not git("diff", "--cached", "--name-only"):
        print("Nada mudou desde a última publicação."); return
    git("commit", "-m", msg)
    print("Enviando para o GitHub...")
    git("push")
    print("Publicado! Em ~1 minuto: https://vinicabral06.github.io/masterclasses/")


if __name__ == "__main__":
    main()
