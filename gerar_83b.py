"""Gera a VITRINE da turma 83B em 83b/ (cópia separada; o site normal nunca é alterado).

Uso:  python gerar_83b.py        (depois de python publicar.py --local, ou de um publicar.py)
Copia só as matérias da vitrine (masters já processados: tema aplicado, imagens otimizadas) para 83b/,
filtra o hub e põe a propaganda (_83b/propaganda.js) SÓ na cópia. Os arquivos do site normal não são tocados.
Para a vitrine acompanhar uma atualização dos masters, rode de novo e publique com o publicar.py.
"""
import json, re, shutil, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "83b"
MIDIA = ("_img", "audios", "imagens", "img", "midia")
H_FIM = "<!--/vidro:cabeca-->"

# pasta -> master. Patologia entra só com a Prática 2.
MASTERS = {
    "DIC IV": "DIC_IV_Masterclass.html",
    "Semiologia": "Semiologia.html",
    "Medicina preventiva": "Medicina_Preventiva_Masterclass.html",
    "Propedêutica laboratorial": "Propedeutica_Laboratorial_Masterclass.html",
    "Propedêutica de imagem": "Propedeutica_Imagem_Masterclass.html",
    "Patologia médica": "Patologia_I_Masterclass.html",
}
MANTER = ["lab", "img", "pato", "dic", "semio", "prev"]

HUB_FILTRO = """/* ---- vitrine 83B (só existe nesta cópia) ---- */
const T83 = true;
window.VGP_HUB = true;
{
  const manter = %s;
  Object.keys(SUBJECTS).forEach(k=>{ if(!manter.includes(k)) delete SUBJECTS[k]; });
  Object.assign(SUBJECTS.pato, {name:"Patologia · Prática 2", href:"Patologia médica/Patologia_I_Masterclass.html#pratica2",
    desc:"A prova prática de TGI e fígado, lâmina por lâmina: esôfago, estômago, intestino, fígado e pâncreas, com treino de lâminas e simulados.",
    tags:["Esôfago","Estômago","Intestino","Fígado","Pâncreas","Treino de lâminas"], readout:["Prática 2","TGI e fígado · lâminas e simulados"]});
}
""" % json.dumps(MANTER)

HUB_FAIXA = """
{
  document.getElementById('lede').textContent = 'Exclusivo da turma 83B. O que vamos estudar hoje?';
  document.title = 'Masterclasses · Turma 83B';
  document.getElementById('mats').insertAdjacentHTML('beforebegin', `<aside class="t83-faixa glass" data-liquido>
    <b>Exclusivo 83B</b><span>Feito pela turma, para a turma. Neste semestre é livre; <u>semestre que vem tem mais</u>: o 5º período já está quase todo pronto.</span></aside>`);
  document.querySelector('.fim-in .credits').insertAdjacentHTML('beforebegin', `<div class="t83-fim glass" data-liquido>
    <h3>Quer ajudar a turma?</h3>
    <p>Se você tem anotações de aula ou provas antigas, fale com o Matheus ou com o Vinícius e negocie seu acesso grátis. As aulas do 5º período (Patologia II, Técnicas Operatórias e mais) já estão quase todas prontas.</p>
    <div class="t83-r" id="t83-r"></div></div>`);
  /* 5º período: cartão clicável com 6 aulas; o clique avisa que não está no teste grátis */
  function saibaMais() {
    let m = document.getElementById('t83-modal');
    if (m) m.remove();
    m = document.createElement('div'); m.id = 't83-modal';
    m.innerHTML = `<div class="t83-card glass" data-liquido role="dialog" aria-modal="true" aria-labelledby="t83-mt">
      <button type="button" class="t83-x" aria-label="Fechar">×</button>
      <p class="t83-k">Semestre que vem</p>
      <h3 id="t83-mt">Masterclasses bem mais baratas, para a nossa sala.</h3>
      <p>Neste semestre você testa de graça. Quando o próximo começar, a gente passa a <b>vender as masterclasses</b> por um preço <b>bem mais barato</b>, pensado para a turma, e não para cursinho.</p>
      <p>Vai ter também um <b>programa de indicações</b>: quem chamar colegas para estudar com a gente ganha vantagem no acesso.</p>
      <p>O 5º período já está quase todo pronto. Quer garantir seu lugar ou entender melhor? Fale com a gente.</p>
      <div class="t83-r" id="t83-rm"></div></div>`;
    document.body.appendChild(m);
    const rm = m.querySelector('#t83-rm'); if (window.VGP) rm.innerHTML = window.VGP.botoes('lista');
    const fechar = () => m.remove();
    m.querySelector('.t83-x').onclick = fechar;
    m.addEventListener('click', e => { if (e.target === m) fechar(); });
    addEventListener('keydown', function esc(e) { if (e.key === 'Escape') { fechar(); removeEventListener('keydown', esc); } });
  }
  const p5 = document.querySelector('.period[data-p="5"]');
  if (p5) {
    p5.classList.remove('soon'); p5.classList.add('t83-p5'); p5.removeAttribute('aria-disabled');
    p5.setAttribute('aria-label', '5º período, 6 aulas. Indisponível no teste grátis. Quase pronto');
    p5.querySelector('.st').innerHTML = '<i class="t83-lock" aria-hidden="true">🔒</i>6 aulas';
    let tm;
    p5.addEventListener('click', e => {
      e.stopPropagation();
      let t = document.getElementById('t83-toast');
      if (!t) { t = document.createElement('div'); t.id = 't83-toast'; t.className = 'glass'; t.setAttribute('role', 'status'); t.setAttribute('data-liquido', ''); document.body.appendChild(t); }
      t.innerHTML = '<b>🔒 Indisponível no teste grátis</b><span>As aulas do 5º período estão quase prontas.</span><button type="button" class="t83-mais">Saiba mais</button>';
      t.querySelector('.t83-mais').onclick = () => { t.classList.remove('on'); saibaMais(); };
      t.classList.remove('on'); void t.offsetWidth; t.classList.add('on');
      p5.classList.remove('shake'); void p5.offsetWidth; p5.classList.add('shake');
      clearTimeout(tm); tm = setTimeout(() => t.classList.remove('on'), 7000);
    });
  }
  addEventListener('load', ()=>{ const r=document.getElementById('t83-r'); if(r&&window.VGP) r.innerHTML=window.VGP.botoes('ajuda'); });
}
"""

HUB_CSS = """
.t83-faixa{display:flex;flex-wrap:wrap;gap:6px 14px;align-items:center;justify-content:center;margin:0 var(--gutter,16px) 18px;padding:12px 18px;border-radius:99px;text-align:center;font-size:14px}
.t83-faixa b{color:var(--hub,#d8ff3d);letter-spacing:.08em;text-transform:uppercase;font-size:12px}
.t83-fim{max-width:640px;margin:26px auto 0;padding:22px 20px;border-radius:26px;text-align:center}
.t83-fim h3{font-family:var(--display);font-size:26px;margin:0 0 8px}
.t83-fim p{margin:0 0 14px;font-size:15px;line-height:1.5;opacity:.9}
.t83-r{display:flex;flex-wrap:wrap;gap:8px;justify-content:center}
.t83-r .vgp-b{display:inline-flex;align-items:center;min-height:40px;padding:0 16px;border-radius:99px;background:var(--hub,#d8ff3d);color:var(--on-hub,#111);font-weight:700;text-decoration:none;font-size:14px}
.t83-r .vgp-b[aria-disabled="true"]{opacity:.45;pointer-events:none}
.period.t83-p5{cursor:pointer;--tint:var(--hub,#d8ff3d)}
.period.t83-p5 .num{color:var(--ink,#eef4f6)}
.period.t83-p5 .st{color:var(--ink,#eef4f6);display:flex;align-items:center;gap:6px}
.period.t83-p5 .t83-lock{font-style:normal;font-size:13px}
.period.t83-p5:hover{transform:translateY(-6px) scale(1.02)}
#t83-toast{position:fixed;left:50%;bottom:calc(24px + env(safe-area-inset-bottom,0px));z-index:9999;transform:translate(-50%,20px);opacity:0;pointer-events:none;display:flex;flex-direction:column;gap:2px;padding:14px 22px;border-radius:22px;text-align:center;font-size:14px;max-width:min(92vw,420px);transition:opacity .25s,transform .25s}
#t83-toast.on{opacity:1;transform:translate(-50%,0)}
#t83-toast b{font-size:15px}
#t83-toast span{opacity:.8}
#t83-toast.on{pointer-events:auto}
.t83-mais{margin-top:8px;align-self:center;min-height:36px;padding:0 18px;border:0;border-radius:99px;background:var(--hub,#d8ff3d);color:var(--on-hub,#111);font-weight:700;font-size:14px;cursor:pointer}
#t83-modal{position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(0,0,0,.55)}
.t83-card{position:relative;max-width:480px;width:100%;max-height:90vh;overflow:auto;padding:26px 22px 22px;border-radius:26px;text-align:left}
.t83-card h3{font-family:var(--display);font-size:26px;line-height:1.1;margin:4px 0 12px}
.t83-card p{margin:0 0 12px;font-size:15px;line-height:1.5}
.t83-k{font-size:12px!important;letter-spacing:.08em;text-transform:uppercase;color:var(--hub,#d8ff3d)}
.t83-x{position:absolute;top:10px;right:12px;width:34px;height:34px;border:0;border-radius:50%;background:transparent;color:inherit;font-size:22px;cursor:pointer}
.t83-card .t83-r{justify-content:flex-start}
@media(max-width:560px){.t83-faixa{border-radius:22px}}
"""

PATO_FILTRO = """/* vitrine 83B: só a Prática 2 */
{
  TABS.splice(0, TABS.length, ...TABS.filter(t=>t.key==='pratica2'));
  const sec = SECTIONS.find(x=>x.t==='Provas práticas'); sec.keys = ['pratica2'];
  SECTIONS.splice(0, SECTIONS.length, sec);
  addEventListener('load',()=>document.querySelectorAll('aside *,#side *').forEach(e=>{ if(!e.children.length&&e.textContent.trim()==='Cardio · Resp. · TGI · CMMG') e.textContent='Prática 2 · TGI e fígado'; }));
}
"""


def ler(p):
    return p.read_text(encoding="utf-8")


def gravar(p, s):
    p.write_text(s, encoding="utf-8", newline="")


def trocar(s, antigo, novo, nome):
    if s.count(antigo) != 1:
        sys.exit(f"gerar_83b: não achei (ou achei mais de uma vez) o ponto de ajuste '{nome}'. O hub ou o master mudou; ajuste o gerador.")
    return s.replace(antigo, novo)


def copiar_midia(pasta_src, pasta_dst, so_usadas=None):
    for nome in MIDIA:
        d = pasta_src / nome
        if not d.is_dir():
            continue
        for f in d.rglob("*"):
            if not f.is_file():
                continue
            if so_usadas is not None and f.relative_to(pasta_src).as_posix() not in so_usadas:
                continue
            alvo = pasta_dst / f.relative_to(pasta_src)
            alvo.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(f, alvo)


def main():
    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir()

    # tema (cópia) + propaganda, que só existe aqui
    shutil.copytree(ROOT / "_tema", OUT / "_tema")
    shutil.copy2(ROOT / "_83b" / "propaganda.js", OUT / "_tema" / "propaganda.js")
    (OUT / ".nojekyll").write_text("", encoding="utf-8")

    # hub filtrado
    s = ler(ROOT / "index.html")
    s = trocar(s, "document.getElementById('tick').innerHTML", HUB_FILTRO + "\ndocument.getElementById('tick').innerHTML", "tick")
    s = trocar(s, "document.getElementById('n-aul').textContent = N_AUL;", "document.getElementById('n-aul').textContent = N_AUL;" + HUB_FAIXA, "n-aul")
    s = trocar(s, "if (SUBJECTS.pato) { const P = SUBJECTS.pato, H = P.href;", "if (false) { const P = SUBJECTS.pato, H = P.href;", "grupo pato")
    s = trocar(s, "</style>", HUB_CSS + "</style>", "style")
    s = trocar(s, '<script src="_tema/liquido.js', '<script src="_tema/propaganda.js"></script>\n<script src="_tema/liquido.js', "liquido")
    s = trocar(s, "<head>", '<head>\n<meta name="robots" content="noindex">', "head")
    gravar(OUT / "index.html", s)

    # masters
    for pasta, arq in MASTERS.items():
        src, dst = ROOT / pasta, OUT / pasta
        if not (src / arq).exists():
            sys.exit(f"gerar_83b: falta {pasta}/{arq}")
        dst.mkdir(parents=True, exist_ok=True)
        m = ler(src / arq)
        tag = '<script defer src="../_tema/propaganda.js"></script>'
        m = trocar(m, H_FIM, tag + H_FIM, f"bloco do tema de {pasta}")
        if pasta == "Patologia médica":
            m = trocar(m, "const TABMAP = {}; TABS.forEach", PATO_FILTRO + "const TABMAP = {}; TABS.forEach", "TABMAP")
            m = trocar(m, "let blocoAberto = {};", "BLOCOS.splice(0, BLOCOS.length, ...BLOCOS.filter(x=>x.id==='pratica'));\nlet blocoAberto = {};", "BLOCOS")
            lead = ("'<p class=\"wc-lead\">Aqui você treina a <b>prova prática de TGI e fígado</b>: lâmina ou peça, diagnóstico e os itens curtos "
                    "que a prova cobra. Comece por <b>Esôfago</b> na barra lateral e feche cada capítulo com as questões.</p>' +")
            m = re.sub(r"'<p class=.{0,3}wc-lead.{0,3}>Cada aula vira.*?</p>' \+", lambda _: lead, m, count=1, flags=re.S)
            m = trocar(m, "Bem-vindo à Patologia", "Bem-vindo à Prática 2", "titulo boas-vindas")
            m = trocar(m, "Patologia Médica I · CMMG</p><h1>", "Patologia Médica I · Prática 2</p><h1>", "kicker")
            (dst / "aulas").mkdir(exist_ok=True)
            p2 = ler(src / "aulas" / "pratica2.html")
            gravar(dst / "aulas" / "pratica2.html", p2)
            usadas = set(re.findall(r"_img/[\w\-./%]+?\.(?:webp|png|jpe?g|gif|svg)", p2 + m))
            usadas.add("_img/memes.json")
            copiar_midia(src, dst, so_usadas=usadas)
        else:
            copiar_midia(src, dst)
        gravar(dst / arq, m)

    mb = sum(f.stat().st_size for f in OUT.rglob("*") if f.is_file()) / 1e6
    print(f"Vitrine 83B gerada em 83b/ ({mb:.0f} MB). Site normal intacto. Para ver: python -m http.server 8765 e abra /83b/")


if __name__ == "__main__":
    main()
