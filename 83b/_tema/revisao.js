/* Revisão final em esquemas, "⭐ O que mais é cobrado" e "🔁 Questões que se repetem" no Raio-X.
   Vale para os masters no formato de caderno (Medicina Preventiva, Propedêutica laboratorial e de imagem).
   Lê os dados do próprio master (data, examById, sectionRefs, provaItem...) e troca as funções review,
   maisCobrado e o Raio-X. Nenhuma resposta aparece antes de a pessoa conferir: as questões usam o provaItem
   do master, que só mostra o gabarito e a justificativa oficial depois do "Conferir". */
(function(){
'use strict';
const V=document.documentElement.dataset.vidro;
const CFG={
  prev:{nome:'Medicina Preventiva',
    par:{sub:'Aulas 1 a 5',ids:['a01','a02','a03','a04','a05'],g:'parciais',prova:'Parciais 80 a 83'},
    som:{sub:'Semestre inteiro',g:'somativas',prova:'Somativas 80 e 81',
      aviso:'A professora Edna disse que na somativa só cai o que <b>não foi cobrado na parcial</b>. Revise primeiro o que ficou de fora da sua parcial. <b>Foco da professora na teoria:</b> doenças crônicas não transmissíveis, neoplasias, tabagismo e alcoolismo, violência e acidentes por animais peçonhentos. Os <b>conceitos básicos</b> da matéria (Aulas 1 a 4) continuam essenciais.',
      grupos:[
      {t:'🎯 Foco da professora: as aulas cobradas',ids:['a05','a07','a09','a08','a10'],open:true,badge:['🎯 Foco da professora','foco']},
      {t:'Conceitos básicos: essenciais',ids:['a01','a02','a03','a04'],open:false,nota:'Base de tudo: promoção e prevenção, determinantes, vigilância e indicadores. A somativa cobra o semestre inteiro.'},
      {t:'Também cai, com menos peso',ids:['a06'],open:false,nota:'Doenças transmissíveis e imunização não estão entre as aulas de foco.'}]}},
  lab:{nome:'Propedêutica laboratorial',
    par:{sub:'Aulas 1 a 6',ids:['a01','a02','a03','a04','a05','a06'],g:'parciais',prova:'Parciais 80 a 83'},
    som:{sub:'Foco na matéria nova',g:'somativas',prova:'Somativas 77 a 82',
      aviso:'<b>O foco bem maior é a matéria nova</b> (função hepática, marcadores inflamatórios, autoimunidade, COVID-19 e arboviroses, hepatites, HIV e ISTs, microbiologia e hiperglicemia). A <b>matéria passada</b> (hemograma, rim, lípides) entra como um valor no enunciado, que você precisa saber ler na hora.',
      foco:['a08-1','a11-1','a12-1','a13-1','a08-5','a14-1','a09-1','a10-1'],
      grupos:[
      {t:'🎯 Foco da professora: a matéria nova',ids:['a08','a09','a10','a11','a12','a13','a14'],open:true,badge:['🎯 Foco da professora','foco']},
      {t:'Também cai',ids:['a07'],open:true,nota:'Dislipidemia: a professora avisou cerca de 1 questão.'},
      {t:'Matéria passada: entra como valor no enunciado',ids:['a01','a02','a03','a04','a05','a06'],open:false,nota:'Saiba ler o valor de cabeça (Hb, VCM, plaquetas, creatinina). PCR, VHS e procalcitonina agora estão na Aula 11.'}]}},
  img:{nome:'Propedêutica de imagem',
    par:{sub:'Aulas 1 a 7 · tórax',ids:['a01','a02','a03','a04','a05','a06','a07'],g:'somativas',prova:'Somativas 77 a 82'},
    som:{sub:'Semestre inteiro',g:'somativas',prova:'Somativas 77 a 82',grupos:[
      {t:'Matéria nova: osso e abdome',ids:['a08','a10','a11','a12','a13','a14'],open:true},
      {t:'Tórax e princípios (Aulas 1 a 7): também caem',ids:['a01','a02','a03','a04','a05','a06','a07'],open:false,nota:'A somativa cobra o semestre inteiro. Abra cada aula para revisar.'}]}}
};
const C=CFG[V];
if(!C||typeof data==='undefined'||typeof examById==='undefined'||typeof provaItem!=='function'||typeof render!=='function')return;

const LS='vg-revx:'+V;
let bloco='som';try{const v=localStorage.getItem(LS);if(v==='par'||v==='som')bloco=v}catch(e){}
const E=s=>String(s??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
const lk=(k,t,a)=>typeof link==='function'?link(k,t,a):'<a class="jump" href="#'+k+(a?'/'+a:'')+'">'+E(t)+'</a>';
const refsOf=s=>(s.refs||[]).map(k=>examById[k]).filter(Boolean);
const nExam=(rs,g)=>new Set(rs.filter(x=>!g||x.group===g).map(x=>x.exam)).size;
const exams=g=>data.exams.filter(e=>e.group===g);
const nomeProva=e=>(e.group==='parciais'?'Parcial ':'Somativa ')+e.turma;
const EXN=Object.fromEntries(data.exams.map(e=>[e.key,nomeProva(e)]));
const lesById=Object.fromEntries(data.lessons.map(l=>[l.id,l]));
const ondeItem={};data.lessons.forEach(l=>l.sections.forEach(s=>(s.refs||[]).forEach(r=>{if(!ondeItem[r])ondeItem[r]=[l,s]})));

/* ---------- questões repetidas: mesmo enunciado, mesmas alternativas ou mesma justificativa oficial ---------- */
const nrm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9 ]+/g,' ').split(/\s+/).filter(w=>w.length>2);
const sh=w=>{const S=new Set();for(let i=0;i+3<=w.length;i++)S.add(w[i]+' '+w[i+1]+' '+w[i+2]);return S};
const jac=(a,b)=>{let n=0;for(const x of a)if(b.has(x))n++;return n/((a.size+b.size-n)||1)};
const CL={};let CLS=[];
(function(){
  const its=Object.values(examById).filter(x=>x.question&&x.question.kind!=='note');
  const F=its.map(x=>{const q=x.question;return{st:sh(nrm((q.stem||'')+' '+(q.command||''))),op:sh(nrm((q.options||[]).join(' '))),wy:sh(nrm(q.why||'')),gab:/^\s*gabarito oficial/i.test(q.why||'')}});
  const p=its.map((_,i)=>i),f=i=>p[i]===i?i:(p[i]=f(p[i]));
  for(let i=0;i<its.length;i++)for(let j=i+1;j<its.length;j++){
    if(its[i].exam===its[j].exam)continue;const A=F[i],B=F[j];
    const a=jac(A.st,B.st);
    const ok=(a>=.6&&A.st.size>=8)||(!A.gab&&!B.gab&&A.wy.size&&B.wy.size&&((jac(A.wy,B.wy)>=.45&&A.wy.size>=10&&B.wy.size>=10)||(jac(A.wy,B.wy)>=.9&&A.wy.size>=6)))||(A.op.size>=20&&a>=.15&&jac(A.op,B.op)>=.75);
    if(ok)p[f(i)]=f(j);
  }
  const G={};its.forEach((x,i)=>(G[f(i)]=G[f(i)]||[]).push(x));
  const ord=Object.fromEntries(data.exams.map((e,i)=>[e.key,i]));
  CLS=Object.values(G).filter(g=>new Set(g.map(x=>x.exam)).size>1).map(g=>g.sort((a,b)=>ord[a.exam]-ord[b.exam]));
  CLS.sort((a,b)=>new Set(b.map(x=>x.exam)).size-new Set(a.map(x=>x.exam)).size);
  CLS.forEach(g=>g.forEach(x=>CL[x.id]=g));
})();
const nCl=x=>CL[x.id]?new Set(CL[x.id].map(y=>y.exam)).size:1;
const repDe=g=>{const c=g.filter(x=>x.question.kind==='choice');return (c.length?c:g)[(c.length?c:g).length-1]};
const repChip=g=>'<p class="rx-rep">🔁 <b>Caiu em '+new Set(g.map(x=>x.exam)).size+' provas</b> '+g.map(y=>typeof target==='function'?target(y):E(y.label)).join(' ')+'</p>';
const segRep=s=>refsOf(s).some(x=>CL[x.id]);

/* ---------- peças visuais ---------- */
function heat(s,rs){const n=nExam(rs);return n?'<mark class="exam'+Math.min(5,n)+' rx-mk">'+E(s.title)+'</mark>':E(s.title)}
function chip(n,g){if(!n)return '<span class="rx-chip zero">nunca caiu</span>';const t=g==='parciais'?(n>1?'parciais':'parcial'):(n>1?'somativas':'somativa');return '<span class="rx-chip'+(n>=3?' hot':'')+'">caiu em '+n+' '+t+'</span>'}
function esquemaDe(l){
  if(typeof ESQUEMAS==='string'){
    const m=ESQUEMAS.split('<h3>').slice(1).find(p=>new RegExp('^Aula '+l.number+'\\b').test(p));
    if(m)return '<div class="rx-esq"><div class="rx-esqt">Esquema da aula</div>'+m.slice(m.indexOf('</h3>')+5).replace(/<\/section>/g,'')+'</div>';
  }
  const S=(XD.sinais||[]).filter(s=>s.aula===l.id);
  if(S.length)return '<div class="rx-esq"><div class="rx-esqt">'+(V==='lab'?'Valores para saber de cabeça':'Sinais e conceitos para reconhecer')+'</div><div class="table"><table class="rx-tab"><tbody>'+S.map(s=>'<tr><th scope="row">'+E(s.t)+'</th><td>'+E(s.d)+'</td></tr>').join('')+'</tbody></table></div></div>';
  return '';
}
let XD={};try{const el=document.getElementById('extra-data');if(el)XD=JSON.parse(el.textContent)}catch(e){}
let usadas=new Set();
function cartao(l,s,g){
  const rs=refsOf(s),n=nExam(rs,g),foco=bloco==='som'&&C.som.foco&&C.som.foco.includes(s.id);
  const cand=rs.filter(x=>x.question&&x.question.kind!=='note'&&!usadas.has(x.id)).sort((a,b)=>(b.group===g)-(a.group===g)||nCl(b)-nCl(a));
  const q=cand[0];if(q)(CL[q.id]||[q]).forEach(y=>usadas.add(y.id));
  return '<article class="rx-c'+(foco?' foco':'')+'"><header><h4>'+lk(l.id,'',s.id).replace('></a>','>'+heat(s,rs)+'</a>')+'</h4>'+chip(n,g)+(segRep(s)?'<span class="rx-chip rep" title="Uma questão deste tema se repetiu">🔁 repetiu</span>':'')+(foco?'<span class="rx-chip foco">🎯 foco</span>':'')+'</header>'+
   ((s.keys||[]).length?'<ul class="rx-keys">'+s.keys.map(k=>'<li>'+E(k)+'</li>').join('')+'</ul>':'')+
   (s.trap?'<p class="rx-trap"><b>⚠️ Pegadinha</b> '+E(s.trap)+'</p>':'')+
   (q?'<details class="rx-q"><summary>Testar com a questão de prova'+(nCl(q)>1?' · 🔁 caiu em '+nCl(q)+' provas':'')+'</summary>'+provaItem(q)+'</details>':'')+'</article>';
}
function aulaBloco(l,g,fechada,badge){
  const n=l.sections.reduce((t,s)=>t+refsOf(s).filter(x=>x.group===g).length,0);
  const cab='<span class="rx-num">Aula '+l.number+'</span><h3>'+E(l.title)+'</h3>'+(badge?'<span class="rx-badge '+badge[1]+'">'+badge[0]+'</span>':'')+'<span class="rx-n">'+(n?n+(n>1?' questões':' questão')+(g==='parciais'?' nas parciais':' nas somativas'):'nunca caiu'+(g==='parciais'?' nas parciais':' nas somativas'))+'</span>';
  const corpo=(l.review?'<p class="rx-lema">'+E(l.review)+'</p>':'')+esquemaDe(l)+'<div class="rx-grid">'+l.sections.map(s=>cartao(l,s,g)).join('')+'</div><p class="rx-acts">'+lk(l.id,'Estudar a Aula '+l.number)+' '+lk(l.id,'⭐ O que mais é cobrado',l.id+'-revisao')+'</p>';
  return fechada?'<details class="rx-aula" id="rx-'+l.id+'"><summary class="rx-hd">'+cab+'</summary>'+corpo+'</details>':'<section class="rx-aula" id="rx-'+l.id+'"><div class="rx-hd">'+cab+'</div>'+corpo+'</section>';
}
function ranking(ls,g){
  const M=exams(g).length;
  const L=ls.flatMap(l=>l.sections.map(s=>({l,s,rs:refsOf(s)}))).map(o=>({...o,n:nExam(o.rs,g)})).filter(o=>o.n).sort((a,b)=>b.n-a.n||b.rs.length-a.rs.length).slice(0,12);
  if(!L.length)return '';
  return '<section class="rx-box"><h3>O que mais voltou nas '+E(C[bloco].prova)+'</h3><p class="rx-lema">Os temas que mais caíram. Comece por eles.</p><div class="table"><table class="rx-tab"><thead><tr><th>#</th><th>Tema</th><th>Aula</th><th>Caiu em</th></tr></thead><tbody>'+
   L.map((o,i)=>'<tr><th scope="row">'+(i+1)+'</th><td>'+lk(o.l.id,o.s.title,o.s.id)+(segRep(o.s)?' <span title="Uma questão deste tema se repetiu">🔁</span>':'')+(bloco==='som'&&C.som.foco&&C.som.foco.includes(o.s.id)?' <span title="Foco da professora">🎯</span>':'')+'</td><td>'+o.l.number+'</td><td><span class="rx-chip'+(o.n>=3?' hot':'')+'">'+o.n+' de '+M+'</span></td></tr>').join('')+'</tbody></table></div></section>';
}
function revisaoNova(){
  usadas=new Set();const B=C[bloco],g=B.g;
  const sw='<div class="rx-sw" role="group" aria-label="Qual prova">'+[['par','📘 Parcial',C.par.sub],['som','📕 Somativa',C.som.sub]].map(([k,t,d])=>'<button type="button" data-rxb="'+k+'" class="'+(bloco===k?'on':'')+'" aria-pressed="'+(bloco===k)+'"><b>'+t+'</b><span>'+E(d)+'</span></button>').join('')+'</div>';
  let grupos;
  if(bloco==='par')grupos=[{t:'',ids:C.par.ids,open:true}];else grupos=C.som.grupos;
  const ls=ids=>ids.map(i=>lesById[i]).filter(Boolean);
  const todas=grupos.flatMap(gr=>ls(gr.ids));
  const mapa='<nav class="rx-mapa" aria-label="Aulas">'+todas.map(l=>lk('revisao','Aula '+l.number+' · '+l.title,'rx-'+l.id)).join('')+'</nav>';
  let h=(typeof hero==='function'?hero('Revisão em 1 hora · '+(bloco==='par'?'Parcial':'Somativa'),'Revisão final','O essencial de cada aula em esquemas, tabelas e pontos para gravar. Os grifos coloridos mostram quantas vezes o tema caiu; 🔁 marca questão que se repetiu entre provas.'):'')+'<section class="section rx">'+sw;
  if(bloco==='som'&&C.som.aviso)h+='<div class="panel rx-aviso"><b>🎯 O que a professora avisou</b><p>'+C.som.aviso+'</p></div>';
  h+=mapa+ranking(todas,g);
  grupos.forEach(gr=>{const L=ls(gr.ids);if(!L.length)return;
    if(gr.t)h+='<h2 class="rx-gt">'+E(gr.t)+'</h2>'+(gr.nota?'<p class="rx-lema">'+E(gr.nota)+'</p>':'');
    h+=L.map(l=>aulaBloco(l,g,!gr.open,gr.badge)).join('');
  });
  h+='<p class="rx-acts">'+lk(PG_RAIO,'🔁 Questões que se repetem',PG_RAIO==='repetem'?'':'rx-rep')+' '+lk('simulados','Fazer as provas anteriores como simulado')+'</p></section>';
  return h;
}
const PG_RAIO=window.XPAGES&&XPAGES.repetem?'repetem':window.XPAGES&&XPAGES.raiox?'raiox':'cair';

/* ---------- ⭐ O que mais é cobrado (por aula) ---------- */
const velhoMais=typeof maisCobrado==='function'?maisCobrado:null;
function maisNovo(l){
  const temPar=exams('parciais').length>0;
  const linhas=l.sections.map(s=>{const rs=refsOf(s);return{s,rs,par:nExam(rs,'parciais'),som:nExam(rs,'somativas'),n:nExam(rs)}}).sort((a,b)=>b.n-a.n||b.rs.length-a.rs.length);
  const tab='<div class="table"><table class="rx-tab"><thead><tr><th>Tema</th>'+(temPar?'<th>Parciais</th>':'')+'<th>Somativas</th><th>🔁</th></tr></thead><tbody>'+linhas.map(o=>'<tr><td>'+lk(l.id,'',o.s.id).replace('></a>','>'+heat(o.s,o.rs)+'</a>')+'</td>'+(temPar?'<td>'+(o.par||'–')+'</td>':'')+'<td>'+(o.som||'–')+'</td><td>'+(segRep(o.s)?'🔁':'')+'</td></tr>').join('')+'</tbody></table></div>';
  const top=linhas.filter(o=>o.n).slice(0,4);const base=top.length?top:linhas.slice(0,3);
  const grave='<div class="rx-grave"><b>Grave isto</b>'+base.map(o=>'<div><h4>'+E(o.s.title)+(o.n?' <span class="rx-chip'+(o.n>=3?' hot':'')+'">'+o.n+(o.n>1?' provas':' prova')+'</span>':'')+'</h4>'+((o.s.keys||[]).length?'<ul class="rx-keys">'+o.s.keys.slice(0,3).map(k=>'<li>'+E(k)+'</li>').join('')+'</ul>':'')+(o.s.trap?'<p class="rx-trap"><b>⚠️ Pegadinha</b> '+E(o.s.trap)+'</p>':'')+'</div>').join('')+'</div>';
  const vis=new Set(),qs=[];
  linhas.forEach(o=>o.rs.forEach(x=>{if(vis.has(x.id))return;const g=CL[x.id];if(g){g.forEach(y=>vis.add(y.id));const r=g.filter(y=>ondeItem[y.id]&&ondeItem[y.id][0]===l);qs.push({x:r.length?repDe(r):x,g,n:o.n})}else{vis.add(x.id);qs.push({x,g:null,n:o.n})}}));
  qs.sort((a,b)=>(b.g?new Set(b.g.map(y=>y.exam)).size:1)-(a.g?new Set(a.g.map(y=>y.exam)).size:1)||b.n-a.n);
  const nRep=qs.filter(q=>q.g).length;
  const fin=(data.final||[]).filter(q=>q.aula===l.id),aut=fin.length&&typeof quiz==='function'?quiz(fin,'Questões autorais ✍️'):'';
  const cab='<h3 class="rx-sub">Onde a prova bate nesta aula</h3>'+tab+grave;
  if(!qs.length)return cab+'<div class="panel pvnone"><b>Esta aula não teve questão nas provas do acervo.</b><p>Os pontos acima mostram o essencial. As questões abaixo são autorais (✍️), feitas por nós para fixar.</p></div>'+aut;
  return cab+'<div class="pv-box"><h3>Questões das provas desta aula · '+qs.length+(nRep?' <span class="rx-chip rep">🔁 '+nRep+(nRep>1?' repetidas':' repetida')+'</span>':'')+'</h3><p class="rx-lema">As que se repetiram entre provas vêm primeiro.</p>'+qs.map(q=>(q.g?repChip(q.g):'')+provaItem(q.x)).join('')+'</div>'+(aut?'<details class="panel pv-aut"><summary>Treinar mais: questões autorais ✍️</summary>'+aut+'</details>':'');
}

/* ---------- 🔁 Questões que se repetem (Raio-X) ---------- */
function repetidas(){
  const usa=new Set();
  const cards=CLS.map(g=>{const r=repDe(g);if(usa.has(r.id))return '';usa.add(r.id);const o=ondeItem[r.id]||g.map(y=>ondeItem[y.id]).find(Boolean);
    return '<div class="rx-repc">'+repChip(g)+(o?'<p class="rx-onde">Tema: '+lk(o[0].id,'Aula '+o[0].number+' · '+o[1].title,o[1].id)+'</p>':'')+provaItem(r)+'</div>'}).join('');
  const temas=data.lessons.flatMap(l=>l.sections.map(s=>({l,s,rs:refsOf(s)}))).map(o=>({...o,ex:[...new Set(o.rs.map(x=>x.exam))]})).filter(o=>o.ex.length>=2).sort((a,b)=>b.ex.length-a.ex.length||b.rs.length-a.rs.length).slice(0,20);
  return '<section class="section rx" id="rx-rep"><h2>🔁 Questões que se repetem</h2><p>'+(CLS.length?'<b>'+CLS.length+(CLS.length>1?' questões voltaram':' questão voltou')+' em mais de uma prova</b>, com o mesmo enunciado, as mesmas alternativas ou a mesma justificativa oficial. Faça cada uma: o gabarito só aparece depois de conferir.':'Nenhuma questão se repetiu igual entre as provas do acervo, mas os temas abaixo voltaram.')+'</p>'+cards+
   (temas.length?'<h3 class="rx-sub">Temas que voltaram em várias provas</h3><div class="table"><table class="rx-tab"><thead><tr><th>Tema</th><th>Aula</th><th>Provas</th></tr></thead><tbody>'+temas.map(o=>'<tr><td>'+lk(o.l.id,o.s.title,o.s.id)+(segRep(o.s)?' 🔁':'')+'</td><td>'+o.l.number+'</td><td><span class="rx-chip'+(o.ex.length>=3?' hot':'')+'">'+o.ex.length+'</span> <small class="muted">'+o.ex.map(k=>EXN[k]).join(' · ')+'</small></td></tr>').join('')+'</tbody></table></div>':'')+'</section>';
}

/* ---------- liga no master ---------- */
window.review=revisaoNova;try{review=revisaoNova}catch(e){}
if(velhoMais){window.maisCobrado=maisNovo;try{maisCobrado=maisNovo}catch(e){}}
if(window.XPAGES){
  XPAGES.revisao=revisaoNova;
  if(XPAGES.raiox){const r0=XPAGES.raiox;XPAGES.raiox=a=>r0(a)+repetidas()}
  if(XPAGES.repetem)XPAGES.repetem=()=>(typeof hero==='function'?hero('Banca repetida','Questões que se repetem','Questões que voltaram em provas diferentes. Domine estas primeiro.'):'')+repetidas();
}
if(typeof vaiCair==='function'){const v0=vaiCair;const vn=()=>v0()+repetidas();window.vaiCair=vn;try{vaiCair=vn}catch(e){}}

document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-rxb]');if(!b)return;
  bloco=b.dataset.rxb==='par'?'par':'som';try{localStorage.setItem(LS,bloco)}catch(_){}
  render({scroll:false});});

const css=document.createElement('style');css.textContent=`
.rx-sw{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:0 0 18px}
.rx-sw button{all:unset;box-sizing:border-box;cursor:pointer;display:flex;flex-direction:column;gap:2px;padding:14px 18px;border-radius:18px;border:1px solid var(--border);background:var(--surface)}
.rx-sw button b{font:600 17px/1.2 var(--sans)}.rx-sw button span{font:400 13px/1.35 var(--sans);color:var(--muted)}
.rx-sw button.on{border-color:var(--accent);background:var(--accent-soft);box-shadow:inset 0 0 0 1px var(--accent)}
.rx-sw button:focus-visible{outline:2px solid var(--accent);outline-offset:3px}
.rx-mapa{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 18px}
.rx-mapa a.jump{font:500 13px/1.2 var(--sans);padding:7px 12px;border-radius:99px;border:1px solid var(--border);text-decoration:none;color:var(--ink)}
.rx-mapa a.jump:hover{border-color:var(--accent)}
.rx-aviso p{margin:6px 0 0}
.rx-box{margin:0 0 22px}.rx-box h3,.rx-sub{font:400 22px/1.25 var(--serif);margin:18px 0 4px}
.rx-gt{margin:30px 0 4px}
.rx-aula{margin:16px 0 26px;scroll-margin-top:80px}
.rx-hd{display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 12px;border-bottom:2px solid var(--accent);padding-bottom:8px;margin-bottom:8px}
.rx-hd h3{font:400 24px/1.2 var(--serif);margin:0}
details.rx-aula>summary.rx-hd{cursor:pointer;list-style:none;border-bottom-color:var(--border)}
details.rx-aula>summary::-webkit-details-marker{display:none}
details.rx-aula>summary.rx-hd::after{content:"▸";margin-left:auto;color:var(--muted);transition:transform .2s}
details.rx-aula[open]>summary.rx-hd{border-bottom-color:var(--accent)}
details.rx-aula[open]>summary.rx-hd::after{transform:rotate(90deg)}
.rx-num{font:700 12px var(--sans);letter-spacing:.05em;text-transform:uppercase;color:var(--muted)}
.rx-n{font:400 13px var(--sans);color:var(--muted)}
.rx-badge{font:600 12px/1 var(--sans);padding:5px 10px;border-radius:99px;border:1px solid var(--accent);background:var(--accent-soft)}
.rx-lema{font:italic 400 17px/1.5 var(--serif);color:var(--muted);margin:6px 0 12px}
.rx-esq{border:1px solid var(--border);border-radius:18px;padding:12px 16px;margin:0 0 14px;background:var(--surface);min-width:0}
.rx-esq h3{font:600 15px var(--sans);margin:14px 0 6px}
.rx-esqt{font:700 12px var(--sans);letter-spacing:.05em;text-transform:uppercase;color:var(--muted);margin-bottom:6px}
.rx-esq .table,.rx-c .table{overflow-x:auto;-webkit-overflow-scrolling:touch}
.rx-tab{width:100%;font-size:14.5px}.rx-tab th[scope=row]{font-weight:600;text-align:left}
.rx-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,400px),1fr));gap:14px}
.rx-c{border:1px solid var(--border);border-radius:18px;padding:14px 16px;background:var(--surface);min-width:0}
.rx-c.foco{border-color:var(--accent);box-shadow:inset 0 0 0 1px var(--accent)}
.rx-c>header{display:flex;flex-wrap:wrap;align-items:center;gap:6px 8px;margin-bottom:6px}
.rx-c h4{font:600 16px/1.35 var(--sans);margin:0;flex:1 1 100%}
.rx-c h4 a{color:inherit;text-decoration:none}
.rx-mk{padding:0 3px;border-radius:4px}
.rx-chip{display:inline-block;font:600 12px/1 var(--sans);padding:5px 9px;border-radius:99px;border:1px solid var(--border);color:var(--ink);white-space:nowrap}
.rx-chip.hot{background:var(--bad-bg);border-color:var(--bad);color:var(--ink)}
.rx-chip.rep{background:var(--accent-soft);border-color:var(--accent)}
.rx-chip.foco{background:var(--accent);border-color:var(--accent);color:var(--on-ink,#fff)}
.rx-chip.zero{color:var(--muted)}
.rx-keys{margin:6px 0;padding-left:20px;font:400 15px/1.5 var(--sans)}.rx-keys li{margin:3px 0}
.rx-trap{margin:8px 0 2px;padding:8px 12px;border-radius:12px;background:var(--warn-bg);color:var(--warn-ink,var(--ink));font-size:14.5px;line-height:1.5}
.rx-trap b{margin-right:4px}
details.rx-q{margin-top:10px;border-top:1px solid var(--border);padding-top:8px}
details.rx-q>summary{cursor:pointer;font:600 14px var(--sans);color:var(--ink)}
.rx-acts{display:flex;flex-wrap:wrap;gap:8px 16px;margin:12px 0 0}
.rx-grave{border:1px solid var(--accent);background:var(--accent-soft);border-radius:14px;padding:12px 16px;margin:14px 0}
.rx-grave>b{font:700 12px var(--sans);letter-spacing:.05em;text-transform:uppercase;color:var(--muted)}
.rx-grave h4{font:600 16px var(--sans);margin:12px 0 4px}
.rx-rep{margin:18px 0 6px;font:500 13.5px/1.6 var(--sans)}.rx-rep a.jump{margin-right:6px}
.rx-repc{border-top:1px solid var(--border);padding-top:6px;margin-top:10px}
.rx-onde{margin:0 0 6px;font-size:14px;color:var(--muted)}
@media (max-width:640px){.rx-sw button{padding:10px 12px}.rx-sw button b{font-size:15px}.rx-sw button span{font-size:12px}.rx-hd h3{font-size:20px}.rx-c{padding:12px}.rx-esq{padding:10px 12px}.rx-tab{font-size:13.5px}}
`;document.head.appendChild(css);

const [pg,an]=(location.hash.slice(1)||'').split('/');
if(pg==='revisao'||pg==='cair'||pg==='raiox'||pg==='repetem'||(an&&/-revisao$/.test(an)))render({scroll:!!an&&pg!=='revisao'});
})();
