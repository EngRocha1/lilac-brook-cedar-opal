/* HEMOPI editor v2 — multi-fluxo, conta e-mail, ícone comentário, impressão */
const STORAGE_KEY = 'hemopi_editor_v1';
const USER_KEY = 'hemopi_user';
const FLOW_KEY_STORE = 'hemopi_flow_key';
const CONVEX_URL = 'https://disciplined-jaguar-3.convex.cloud';
let flow = null, selected = null, tool = 'select', drag = null, connectFrom = null, convexClient = null;
let flowKey = localStorage.getItem(FLOW_KEY_STORE) || 'hemopi-main';
let flowTitle = 'HEMOPI principal';
let user = null;
try { user = JSON.parse(localStorage.getItem(USER_KEY) || 'null'); } catch(e) { user = null; }
const svgNS = 'http://www.w3.org/2000/svg';

async function initConvex(){
  try{
    const mod = await import('https://esm.sh/convex@1.17.0/browser');
    if(!mod.ConvexHttpClient) return;
    convexClient = new mod.ConvexHttpClient(CONVEX_URL);
  }catch(e){ console.warn('Convex offline', e); convexClient = null; }
}
function emptyFlow(){ return { macros:[], nodes:[], edges:[], votes:{}, comments:{} }; }

async function loadFlowList(){
  const sel = document.getElementById('flowSelect'); if(!sel) return;
  sel.innerHTML = '';
  let rows = [];
  if(convexClient){
    try{
      rows = await convexClient.query('flows:list', user?.email ? { ownerEmail: user.email } : {});
      if(!rows || !rows.length) rows = await convexClient.query('flows:list', {});
    }catch(e){ console.warn(e); }
  }
  if(!rows || !rows.length){
    const o = document.createElement('option'); o.value = flowKey; o.textContent = flowTitle || flowKey; sel.appendChild(o); return;
  }
  rows.sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0));
  rows.forEach(r=>{
    const o = document.createElement('option'); o.value = r.key; o.textContent = r.title || r.key;
    if(r.key === flowKey) o.selected = true; sel.appendChild(o);
  });
  if(!rows.find(r=>r.key===flowKey) && rows[0]){
    flowKey = rows[0].key; localStorage.setItem(FLOW_KEY_STORE, flowKey); sel.value = flowKey;
  }
}

async function loadFlow(){
  if(convexClient){
    try{
      const remote = await convexClient.query('flows:get', { key: flowKey });
      if(remote && remote.data){
        flow = remote.data; flowTitle = remote.title || flowKey;
        if(!flow.votes) flow.votes = {}; if(!flow.comments) flow.comments = {};
        localStorage.setItem(STORAGE_KEY, JSON.stringify(flow)); return;
      }
      // compat: se data veio como o próprio fluxo (legado)
      if(remote && remote.nodes){ flow = remote; if(!flow.votes) flow.votes={}; if(!flow.comments) flow.comments={}; return; }
    }catch(e){ console.warn(e); }
  }
  try{ const raw = localStorage.getItem(STORAGE_KEY); if(raw){ flow = JSON.parse(raw); return; } }catch(e){}
  flow = JSON.parse(JSON.stringify(window.DEFAULT_FLOW || emptyFlow()));
  if(!flow.votes) flow.votes = {}; if(!flow.comments) flow.comments = {};
}

function saveLocal(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(flow));
  if(convexClient){
    convexClient.mutation('flows:save', { key: flowKey, title: flowTitle, ownerEmail: user?.email, data: flow })
      .then(()=> flash('Salvo · local + Convex'))
      .catch(err=>{ console.warn(err); flash('Salvo localmente'); });
  } else flash('Salvo localmente');
}
function exportJSON(){
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(flow,null,2)],{type:'application/json'}));
  a.download = (flowKey||'hemopi')+'.json'; a.click();
}
function flash(msg){
  const el = document.createElement('div'); el.textContent = msg;
  el.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#0b3d5c;color:#fff;padding:8px 14px;border-radius:8px;z-index:99;font-size:13px';
  document.body.appendChild(el); setTimeout(()=>el.remove(),1600);
}
function nodeById(id){ return flow.nodes.find(n=>n.id===id); }
function edgeById(id){ return flow.edges.find(e=>e.id===id); }
function macroById(id){ return flow.macros.find(m=>m.id===id); }
function voteKey(kind,id){ return kind+':'+id; }
function getVotes(kind,id){ return flow.votes[voteKey(kind,id)] || {ok:0,no:0,mine:null}; }
function setMyVote(kind,id,val){
  const k = voteKey(kind,id);
  if(!flow.votes[k]) flow.votes[k] = {ok:0,no:0,mine:null};
  const v = flow.votes[k];
  if(v.mine === val){ if(val==='ok') v.ok=Math.max(0,v.ok-1); if(val==='no') v.no=Math.max(0,v.no-1); v.mine=null; }
  else { if(v.mine==='ok') v.ok=Math.max(0,v.ok-1); if(v.mine==='no') v.no=Math.max(0,v.no-1); if(val==='ok') v.ok++; if(val==='no') v.no++; v.mine=val; }
  saveLocal(); render(); renderMacroBar(); updateProgress(); refreshSide();
}
function centerOf(n){ return {x: n.x + n.w/2, y: n.y + n.h/2}; }
function pathForEdge(e){
  const a=nodeById(e.from), b=nodeById(e.to); if(!a||!b) return '';
  const p0=centerOf(a), p1=centerOf(b), pts=e.points||[];
  let d='M '+p0.x+' '+p0.y; pts.forEach(p=>{ d+=' L '+p.x+' '+p.y; }); d+=' L '+p1.x+' '+p1.y; return d;
}
function midOfEdge(e){
  const a=nodeById(e.from), b=nodeById(e.to); if(!a||!b) return {x:0,y:0};
  const pts=e.points||[]; if(pts.length) return pts[Math.floor(pts.length/2)];
  const p0=centerOf(a), p1=centerOf(b); return {x:(p0.x+p1.x)/2, y:(p0.y+p1.y)/2};
}
function el(tag, attrs={}, kids=[]){
  const n=document.createElementNS(svgNS, tag);
  Object.entries(attrs).forEach(([k,v])=>{ if(k==='class') n.setAttribute('class',v); else n.setAttribute(k,v); });
  kids.forEach(c=>n.appendChild(typeof c==='string'?document.createTextNode(c):c)); return n;
}
function renderMacroBar(){
  const bar=document.getElementById('macroBar'); bar.innerHTML='<h3>Macros</h3>';
  flow.macros.forEach(m=>{
    const v=getVotes('macro', m.id);
    let short=(m.title||'').replace(/^MACRO\s*[A-Z]\s*·\s*/i,'').replace(/^MACRO\s*/i,'');
    const b=document.createElement('button'); b.className='macro-chip';
    b.style.borderColor=m.border; b.style.background=m.color;
    b.innerHTML='<span><b>'+m.id+'</b> · '+short+'</span><span class="votes"><span style="color:#1b7a4e">👍 '+v.ok+'</span><span style="color:#c41e3a">👎 '+v.no+'</span></span>';
    b.onclick=()=>{ selected={kind:'macro',id:m.id}; openModal(); }; bar.appendChild(b);
  });
}
function render(){
  const svg=document.getElementById('canvas'); svg.innerHTML='';
  const defs=el('defs');
  ['#1a5f8a','#c9a227','#5b4b8a','#c41e3a','#1b7a4e','#5c6b7a'].forEach((c,i)=>{
    const m=el('marker',{id:'mk'+i,markerWidth:'8',markerHeight:'8',refX:'6',refY:'4',orient:'auto'});
    m.appendChild(el('path',{d:'M0,0 L8,4 L0,8 Z',fill:c})); defs.appendChild(m);
  });
  svg.appendChild(defs);
  flow.macros.forEach(m=>{
    const g=el('g',{'class':'macro','data-id':m.id});
    g.appendChild(el('rect',{'class':'macro-box',x:String(m.x),y:String(m.y),width:String(m.w),height:String(m.h),rx:'14',fill:m.color,stroke:m.border}));
    g.appendChild(el('text',{'class':'macro-label',x:String(m.x+12),y:String(m.y+18),fill:m.border},[m.title]));
    svg.appendChild(g);
  });
  flow.edges.forEach(e=>{
    const g=el('g',{'class':'edge-group','data-id':e.id});
    const color=e.color||'#5c6b7a'; const d=pathForEdge(e);
    const hit=el('path',{'class':'edge-hit',d:d});
    const path=el('path',{'class':'edge'+(selected&&selected.kind==='edge'&&selected.id===e.id?' selected':''),d:d,stroke:color,'marker-end':'url(#mk5)'});
    hit.addEventListener('mousedown',ev=>{ ev.stopPropagation(); selected={kind:'edge',id:e.id}; render(); });
    const mid=midOfEdge(e); const a=nodeById(e.from), b=nodeById(e.to);
    const cross=a&&b&&a.macro&&b.macro&&a.macro!==b.macro;
    if(e.label||cross){
      let lab=e.label||''; if(cross) lab=(lab?lab+' · ':'')+'🔗 '+a.macro+'→'+b.macro;
      g.appendChild(el('text',{x:String(mid.x),y:String(mid.y-10),'text-anchor':'middle','font-size':'10','font-weight':'700',fill:color},[lab]));
    }
    const cg=el('g',{'class':'comment-btn',transform:'translate('+(mid.x+14)+','+(mid.y-6)+')'});
    cg.appendChild(el('circle',{cx:'0',cy:'0',r:'9',fill:'#fff',stroke:'#1a5f8a','stroke-width':'1.5'}));
    cg.appendChild(el('text',{x:'0',y:'4','text-anchor':'middle','font-size':'11'},['💬']));
    cg.addEventListener('mousedown',ev=>{ ev.stopPropagation(); selected={kind:'edge',id:e.id}; openModal(); render(); });
    g.appendChild(hit); g.appendChild(path); g.appendChild(cg);
    (e.points||[]).forEach((p,i)=>{
      const c=el('circle',{'class':'waypoint',cx:String(p.x),cy:String(p.y),r:'5'});
      c.addEventListener('mousedown',ev=>{ ev.stopPropagation(); drag={type:'wp',edgeId:e.id,index:i,ox:p.x,oy:p.y,sx:ev.clientX,sy:ev.clientY}; });
      g.appendChild(c);
    });
    svg.appendChild(g);
  });
  flow.nodes.forEach(n=>{
    const g=el('g',{'class':'node '+(n.type||'')+' '+(n.style||'')+(selected&&selected.kind==='node'&&selected.id===n.id?' selected':''),'data-id':n.id,transform:'translate('+n.x+','+n.y+')'});
    let shape;
    if(n.type==='decision'){ const hw=n.w/2,hh=n.h/2; shape=el('polygon',{'class':'shape',points:hw+',0 '+n.w+','+hh+' '+hw+','+n.h+' 0,'+hh}); }
    else if(n.type==='event'){ shape=el('ellipse',{'class':'shape',cx:String(n.w/2),cy:String(n.h/2),rx:String(n.w/2),ry:String(n.h/2)}); }
    else { shape=el('rect',{'class':'shape',x:'0',y:'0',width:String(n.w),height:String(n.h),rx:'8'}); }
    g.appendChild(shape);
    (n.title||'').split('\n').forEach((ln,i)=>{ g.appendChild(el('text',{x:String(n.w/2),y:String(n.h/2-((n.title||'').split('\n').length-1)*7+i*14),'text-anchor':'middle','dominant-baseline':'middle'},[ln])); });
    const hasC=!!(flow.comments[voteKey('node',n.id)]);
    const cg=el('g',{'class':'comment-btn',transform:'translate('+(n.w-2)+',-2)'});
    cg.appendChild(el('circle',{cx:'0',cy:'0',r:'10',fill:hasC?'#e8f4fc':'#fff',stroke:'#1a5f8a','stroke-width':'1.5'}));
    cg.appendChild(el('text',{x:'0',y:'4','text-anchor':'middle','font-size':'11'},['💬']));
    cg.addEventListener('mousedown',ev=>{ ev.stopPropagation(); selected={kind:'node',id:n.id}; openModal(); render(); });
    g.appendChild(cg);
    g.addEventListener('mousedown',ev=>{
      if(ev.target.closest && ev.target.closest('.comment-btn')) return;
      ev.stopPropagation();
      if(tool==='connect'){
        if(!connectFrom){ connectFrom=n.id; flash('Selecione o destino'); }
        else if(connectFrom!==n.id){ flow.edges.push({id:'e'+Date.now(),from:connectFrom,to:n.id,label:'',points:[]}); connectFrom=null; saveLocal(); render(); updateProgress(); }
        return;
      }
      selected={kind:'node',id:n.id}; drag={type:'node',id:n.id,ox:n.x,oy:n.y,sx:ev.clientX,sy:ev.clientY}; render();
    });
    svg.appendChild(g);
  });
}
function clientToSvg(cx,cy){ const svg=document.getElementById('canvas'); const pt=svg.createSVGPoint(); pt.x=cx; pt.y=cy; return pt.matrixTransform(svg.getScreenCTM().inverse()); }
function onMove(ev){ if(!drag) return; const dx=ev.clientX-drag.sx, dy=ev.clientY-drag.sy;
  if(drag.type==='node'){ const n=nodeById(drag.id); n.x=drag.ox+dx; n.y=drag.oy+dy; render(); }
  else if(drag.type==='wp'){ const e=edgeById(drag.edgeId); e.points[drag.index]={x:drag.ox+dx,y:drag.oy+dy}; render(); }
}
function onUp(){ if(drag){ saveLocal(); drag=null; } }
function openModal(){ refreshSide(); document.getElementById('modalBg').classList.add('open');
  const isMacro=selected&&selected.kind==='macro';
  document.getElementById('colorLabel').style.display=isMacro?'block':'none';
  document.getElementById('sideColor').style.display=isMacro?'block':'none';
}
function closeModal(){ document.getElementById('modalBg').classList.remove('open'); }
function refreshSide(){
  const title=document.getElementById('sideTitle'), meta=document.getElementById('sideMeta');
  const name=document.getElementById('sideName'), comment=document.getElementById('sideComment');
  document.querySelectorAll('.vbtn').forEach(b=>b.classList.remove('on-ok','on-no'));
  if(!selected){ title.textContent='Avaliação'; meta.textContent='Clique no 💬 do elemento'; name.value=''; comment.value=''; document.getElementById('sideOk').textContent='0'; document.getElementById('sideNo').textContent='0'; return; }
  const v=getVotes(selected.kind,selected.id);
  document.getElementById('sideOk').textContent=v.ok; document.getElementById('sideNo').textContent=v.no;
  if(v.mine==='ok') document.querySelector('.vbtn[data-v="ok"]').classList.add('on-ok');
  if(v.mine==='no') document.querySelector('.vbtn[data-v="no"]').classList.add('on-no');
  comment.value=flow.comments[voteKey(selected.kind,selected.id)]||'';
  if(selected.kind==='node'){ const n=nodeById(selected.id); title.textContent=(n.title||'').replace(/\n/g,' · '); const m=n.macro?macroById(n.macro):null; meta.textContent='Módulo '+(n.macro||'—')+(m?' · '+m.title:''); name.value=n.title; }
  else if(selected.kind==='edge'){ const e=edgeById(selected.id); const a=nodeById(e.from), b=nodeById(e.to); title.textContent='Conexão '+(a?.title||e.from)+' → '+(b?.title||e.to); let mm=''; if(a&&b&&a.macro!==b.macro) mm=' · 🔗 '+a.macro+' → '+b.macro; meta.textContent='Linha'+mm; name.value=e.label||''; }
  else if(selected.kind==='macro'){ const m=macroById(selected.id); title.textContent=m.title; meta.textContent='Macro / módulo '+m.id; name.value=m.title; document.getElementById('sideColor').value=(m.color||'#e8f4fc').startsWith('#')?m.color:'#e8f4fc'; }
}
function voteSelected(val){ if(!selected) return; setMyVote(selected.kind, selected.id, val); }
document.getElementById('sideName').addEventListener('change', e=>{ if(!selected) return; if(selected.kind==='node') nodeById(selected.id).title=e.target.value; if(selected.kind==='edge') edgeById(selected.id).label=e.target.value; if(selected.kind==='macro') macroById(selected.id).title=e.target.value; saveLocal(); render(); renderMacroBar(); });
document.getElementById('sideComment').addEventListener('input', e=>{ if(!selected) return; flow.comments[voteKey(selected.kind,selected.id)]=e.target.value; saveLocal(); });
document.getElementById('sideColor').addEventListener('change', e=>{ if(selected&&selected.kind==='macro'){ macroById(selected.id).color=e.target.value; saveLocal(); render(); renderMacroBar(); } });
function clearSelection(){ selected=null; closeModal(); refreshSide(); render(); }
function deleteSelected(){
  if(!selected) return;
  if(selected.kind==='node'){ flow.nodes=flow.nodes.filter(n=>n.id!==selected.id); flow.edges=flow.edges.filter(e=>e.from!==selected.id&&e.to!==selected.id); }
  else if(selected.kind==='edge'){ flow.edges=flow.edges.filter(e=>e.id!==selected.id); }
  else if(selected.kind==='macro'){ if(!confirm('Remover macro?')) return; flow.macros=flow.macros.filter(m=>m.id!==selected.id); }
  selected=null; closeModal(); saveLocal(); render(); renderMacroBar(); updateProgress(); refreshSide();
}
function uid(p){ return p+Math.random().toString(36).slice(2,8); }
document.getElementById('btnAddProcess').onclick=()=>{ const n={id:uid('n'),macro:null,type:'process',title:'Novo processo',x:120+Math.random()*200,y:120+Math.random()*100,w:180,h:48}; flow.nodes.push(n); selected={kind:'node',id:n.id}; saveLocal(); render(); updateProgress(); openModal(); };
document.getElementById('btnAddDecision').onclick=()=>{ const n={id:uid('n'),macro:null,type:'decision',title:'Decisão?',x:120+Math.random()*200,y:120+Math.random()*100,w:160,h:70}; flow.nodes.push(n); selected={kind:'node',id:n.id}; saveLocal(); render(); updateProgress(); openModal(); };
document.getElementById('btnAddText').onclick=()=>{ const n={id:uid('t'),macro:null,type:'process',title:'Texto livre',x:120+Math.random()*200,y:80,w:160,h:36,style:'ok'}; flow.nodes.push(n); selected={kind:'node',id:n.id}; saveLocal(); render(); updateProgress(); openModal(); };
document.getElementById('btnAddMacro').onclick=()=>{ const id=String.fromCharCode(65+flow.macros.length); flow.macros.push({id,title:'MACRO '+id+' · Novo',x:40,y:40+flow.macros.length*20,w:320,h:200,color:'#f0f3f7',border:'#5c6b7a'}); saveLocal(); render(); renderMacroBar(); };
document.getElementById('btnConnect').onclick=()=>{ tool=tool==='connect'?'select':'connect'; connectFrom=null; document.getElementById('btnConnect').classList.toggle('active',tool==='connect'); flash(tool==='connect'?'Clique na origem e no destino':'Seleção'); };
function updateProgress(){
  const ids=[...flow.nodes.map(n=>voteKey('node',n.id)),...flow.edges.map(e=>voteKey('edge',e.id))];
  let done=0,ok=0,no=0; ids.forEach(k=>{ const v=flow.votes[k]; if(v&&v.mine){ done++; if(v.mine==='ok')ok++; if(v.mine==='no')no++; } });
  const pct=ids.length?Math.round(100*done/ids.length):0;
  document.getElementById('progText').textContent=pct+'%'; document.getElementById('progBar').style.width=pct+'%';
  document.getElementById('statEls').textContent=ids.length; document.getElementById('statDone').textContent=done;
  document.getElementById('statOk').textContent=ok; document.getElementById('statNo').textContent=no;
}
function printMode(mode){
  const root=document.getElementById('printRoot'); root.innerHTML='';
  if(mode==='overview'){
    const page=document.createElement('div'); page.className='print-page';
    page.innerHTML='<h2>HEMOPI — '+flowTitle+'</h2><p><strong>'+flow.macros.map(m=>m.id).join(' → ')+'</strong></p>'; root.appendChild(page);
  } else {
    flow.macros.forEach(m=>{
      const page=document.createElement('div'); page.className='print-page';
      const nodes=flow.nodes.filter(n=>n.macro===m.id);
      const edges=flow.edges.filter(e=>{ const a=nodeById(e.from),b=nodeById(e.to); return (a&&a.macro===m.id)||(b&&b.macro===m.id); });
      const cross=edges.filter(e=>{ const a=nodeById(e.from),b=nodeById(e.to); return a&&b&&a.macro&&b.macro&&a.macro!==b.macro; });
      let html='<div class="print-mod"><h2>Módulo '+m.id+' — '+(m.title||'')+'</h2><p style="font-size:12px;color:#5c6b7a">Fluxo: '+flowTitle+'</p></div>';
      if(cross.length){ html+='<h3>Conectores entre módulos (circuito)</h3>';
        cross.forEach(e=>{ const a=nodeById(e.from),b=nodeById(e.to); const fromM=macroById(a.macro),toM=macroById(b.macro);
          html+='<div class="print-conn"><span class="tag">DE</span> ['+a.macro+'] '+(fromM?fromM.title:'')+' · '+(a.title||'').replace(/\n/g,' / ');
          html+=' <strong>════►</strong> <span class="tag">PARA</span> ['+b.macro+'] '+(toM?toM.title:'')+' · '+(b.title||'').replace(/\n/g,' / ');
          if(e.label) html+='<br><em>rótulo: '+e.label+'</em>'; html+='</div>'; });
      }
      html+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:12px"><div><h3>Elementos deste módulo</h3><ul>';
      nodes.forEach(n=>{ const v=getVotes('node',n.id); html+='<li><strong>'+n.title.replace(/\n/g,' / ')+'</strong> · 👍'+v.ok+' 👎'+v.no+'</li>'; });
      html+='</ul></div><div><h3>Comentários do módulo '+m.id+'</h3><ul>';
      nodes.forEach(n=>{ const k=voteKey('node',n.id); if(flow.comments[k]) html+='<li><strong>'+n.title.replace(/\n/g,' / ')+'</strong>: '+flow.comments[k]+'</li>'; });
      edges.forEach(e=>{ const k=voteKey('edge',e.id); if(flow.comments[k]){ const a=nodeById(e.from),b=nodeById(e.to); html+='<li><strong>Linha '+(a?.title||e.from)+'→'+(b?.title||e.to)+'</strong>: '+flow.comments[k]+'</li>'; } });
      const mk=voteKey('macro',m.id); if(flow.comments[mk]) html+='<li><strong>Macro '+m.id+'</strong>: '+flow.comments[mk]+'</li>';
      html+='</ul></div></div>'; page.innerHTML=html; root.appendChild(page);
    });
  }
  window.print();
}
function refreshUserUI(){
  const lab=document.getElementById('userLabel'), btnL=document.getElementById('btnLogin'), btnO=document.getElementById('btnLogout');
  if(user){ lab.textContent=user.name+' ('+user.email+')'; btnL.style.display='none'; btnO.style.display=''; document.getElementById('inName').style.display='none'; document.getElementById('inEmail').style.display='none'; }
  else { lab.textContent='Visitante'; btnL.style.display=''; btnO.style.display='none'; document.getElementById('inName').style.display=''; document.getElementById('inEmail').style.display=''; }
}
document.getElementById('btnLogin').onclick=async()=>{
  const name=document.getElementById('inName').value.trim(); const email=document.getElementById('inEmail').value.trim().toLowerCase();
  if(!name||!email||!email.includes('@')){ flash('Informe nome e e-mail válidos (ex.: Gmail)'); return; }
  user={name,email}; localStorage.setItem(USER_KEY, JSON.stringify(user));
  if(convexClient){ try{ await convexClient.mutation('flows:upsertProfile',{email,name}); }catch(e){ console.warn(e); } }
  refreshUserUI(); await loadFlowList(); flash('Conta ativa: '+email);
};
document.getElementById('btnLogout').onclick=()=>{ user=null; localStorage.removeItem(USER_KEY); refreshUserUI(); flash('Saiu da conta'); };
document.getElementById('btnNewFlow').onclick=async()=>{
  const title=prompt('Nome do novo fluxo:','Novo fluxo HEMOPI'); if(!title) return;
  if(convexClient){
    try{
      const r=await convexClient.mutation('flows:create',{title, ownerEmail:user?.email, data:emptyFlow()});
      flowKey=r.key; flowTitle=title; localStorage.setItem(FLOW_KEY_STORE, flowKey); flow=emptyFlow();
      await loadFlowList(); render(); renderMacroBar(); updateProgress(); flash('Fluxo criado: '+title); return;
    }catch(e){ console.warn(e); }
  }
  flowKey='local-'+Date.now().toString(36); flowTitle=title; localStorage.setItem(FLOW_KEY_STORE, flowKey); flow=emptyFlow();
  await loadFlowList(); render(); renderMacroBar(); updateProgress(); flash('Fluxo local: '+title);
};
document.getElementById('flowSelect').onchange=async(e)=>{
  flowKey=e.target.value; localStorage.setItem(FLOW_KEY_STORE, flowKey);
  const opt=e.target.selectedOptions[0]; flowTitle=opt?opt.textContent:flowKey;
  await loadFlow(); render(); renderMacroBar(); updateProgress(); flash('Fluxo: '+flowTitle);
};
(async function boot(){ refreshUserUI(); await initConvex(); await loadFlowList(); await loadFlow(); render(); renderMacroBar(); updateProgress(); })();
window.addEventListener('mousemove',onMove); window.addEventListener('mouseup',onUp);
document.getElementById('canvas').addEventListener('mousedown',()=>{ selected=null; closeModal(); render(); });
window.saveLocal=saveLocal; window.exportJSON=exportJSON; window.printMode=printMode;
window.voteSelected=voteSelected; window.clearSelection=clearSelection; window.closeModal=closeModal; window.deleteSelected=deleteSelected;
