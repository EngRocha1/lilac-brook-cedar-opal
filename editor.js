/* HEMOPI visual flow editor — clean canvas, votes in modal + macros only */
const STORAGE_KEY = 'hemopi_editor_v1';
const CONVEX_URL = 'https://disciplined-jaguar-3.convex.cloud';

let flow = null;
let selected = null;
let tool = 'select';
let drag = null;
let connectFrom = null;
const svgNS = 'http://www.w3.org/2000/svg';

function loadFlow(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(raw){ flow = JSON.parse(raw); return; }
  }catch(e){}
  flow = JSON.parse(JSON.stringify(window.DEFAULT_FLOW));
  if(!flow.votes) flow.votes = {};
  if(!flow.comments) flow.comments = {};
}

function saveLocal(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(flow));
  flash('Salvo localmente');
}

function exportJSON(){
  const blob = new Blob([JSON.stringify(flow,null,2)],{type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'hemopi-flow.json';
  a.click();
}

function flash(msg){
  const el = document.createElement('div');
  el.textContent = msg;
  el.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#0b3d5c;color:#fff;padding:8px 14px;border-radius:8px;z-index:99;font-size:13px';
  document.body.appendChild(el);
  setTimeout(()=>el.remove(),1600);
}

function nodeById(id){ return flow.nodes.find(n=>n.id===id); }
function edgeById(id){ return flow.edges.find(e=>e.id===id); }
function macroById(id){ return flow.macros.find(m=>m.id===id); }
function voteKey(kind,id){ return kind+':'+id; }

function getVotes(kind,id){
  return flow.votes[voteKey(kind,id)] || {ok:0,no:0,mine:null};
}

function setMyVote(kind,id,val){
  const k = voteKey(kind,id);
  if(!flow.votes[k]) flow.votes[k] = {ok:0,no:0,mine:null};
  const v = flow.votes[k];
  if(v.mine === val){
    if(val==='ok') v.ok = Math.max(0,v.ok-1);
    if(val==='no') v.no = Math.max(0,v.no-1);
    v.mine = null;
  } else {
    if(v.mine==='ok') v.ok = Math.max(0,v.ok-1);
    if(v.mine==='no') v.no = Math.max(0,v.no-1);
    if(val==='ok') v.ok++;
    if(val==='no') v.no++;
    v.mine = val;
  }
  saveLocal();
  render();
  renderMacroBar();
  updateProgress();
  refreshSide();
}

function centerOf(n){ return {x: n.x + n.w/2, y: n.y + n.h/2}; }

function pathForEdge(e){
  const a = nodeById(e.from), b = nodeById(e.to);
  if(!a||!b) return '';
  const p0 = centerOf(a), p1 = centerOf(b);
  const pts = e.points || [];
  let d = 'M '+p0.x+' '+p0.y;
  pts.forEach(p=>{ d += ' L '+p.x+' '+p.y; });
  d += ' L '+p1.x+' '+p1.y;
  return d;
}

function midOfEdge(e){
  const a = nodeById(e.from), b = nodeById(e.to);
  if(!a||!b) return {x:0,y:0};
  const pts = e.points||[];
  if(pts.length) return pts[Math.floor(pts.length/2)];
  const p0 = centerOf(a), p1 = centerOf(b);
  return {x:(p0.x+p1.x)/2, y:(p0.y+p1.y)/2};
}

function el(tag, attrs={}, kids=[]){
  const n = document.createElementNS(svgNS, tag);
  Object.entries(attrs).forEach(([k,v])=>{
    if(k==='class') n.setAttribute('class', v);
    else n.setAttribute(k, v);
  });
  kids.forEach(c=>n.appendChild(typeof c==='string'?document.createTextNode(c):c));
  return n;
}

function renderMacroBar(){
  const bar = document.getElementById('macroBar');
  bar.innerHTML = '<h3>Macros</h3>';
  flow.macros.forEach(m=>{
    const v = getVotes('macro', m.id);
    let short = (m.title||'');
    short = short.replace(/^MACRO\s*[A-Z]\s*·\s*/i,'').replace(/^MACRO\s*/i,'');
    const b = document.createElement('button');
    b.className = 'macro-chip';
    b.style.borderColor = m.border;
    b.style.background = m.color;
    b.innerHTML = '<span><b>'+m.id+'</b> · '+short+'</span>'+
      '<span class="votes"><span style="color:#1b7a4e">👍 '+v.ok+'</span><span style="color:#c41e3a">👎 '+v.no+'</span></span>';
    b.onclick = ()=>{ selected={kind:'macro',id:m.id}; openModal(); };
    bar.appendChild(b);
  });
}

function render(){
  const svg = document.getElementById('canvas');
  svg.innerHTML = '';
  const defs = el('defs');
  ['#1a5f8a','#c9a227','#5b4b8a','#c41e3a','#1b7a4e','#5c6b7a'].forEach((c,i)=>{
    const m = el('marker',{id:'mk'+i, markerWidth:'8', markerHeight:'8', refX:'6', refY:'4', orient:'auto'});
    m.appendChild(el('path',{d:'M0,0 L8,4 L0,8 Z', fill:c}));
    defs.appendChild(m);
  });
  svg.appendChild(defs);

  flow.macros.forEach(m=>{
    const g = el('g',{'class':'macro', 'data-id':m.id});
    g.appendChild(el('rect',{'class':'macro-box', x:String(m.x), y:String(m.y), width:String(m.w), height:String(m.h), rx:'14', fill:m.color, stroke:m.border}));
    g.appendChild(el('text',{'class':'macro-label', x:String(m.x+12), y:String(m.y+18), fill:m.border}, [m.title]));
    svg.appendChild(g);
  });

  flow.edges.forEach(e=>{
    const g = el('g',{'class':'edge-group', 'data-id':e.id});
    const color = e.color || '#5c6b7a';
    const d = pathForEdge(e);
    const hit = el('path',{'class':'edge-hit', d:d});
    const path = el('path',{'class':'edge'+(selected&&selected.kind==='edge'&&selected.id===e.id?' selected':''), d:d, stroke:color, 'marker-end':'url(#mk5)'});
    hit.addEventListener('mousedown', ev=>{
      ev.stopPropagation();
      selected={kind:'edge',id:e.id};
      render();
    });
    hit.addEventListener('dblclick', ev=>{
      ev.stopPropagation();
      selected={kind:'edge',id:e.id};
      openModal();
      render();
    });
    hit.addEventListener('click', ev=>{
      if(!ev.altKey) return;
      ev.stopPropagation();
      const pt = clientToSvg(ev.clientX, ev.clientY);
      if(!e.points) e.points=[];
      e.points.push(pt);
      saveLocal(); render();
    });
    g.appendChild(hit);
    g.appendChild(path);
    if(e.label){
      const mid = midOfEdge(e);
      g.appendChild(el('text',{x:String(mid.x), y:String(mid.y-8), 'text-anchor':'middle', 'font-size':'10', 'font-weight':'700', fill:color}, [e.label]));
    }
    (e.points||[]).forEach((p,i)=>{
      const c = el('circle',{'class':'waypoint', cx:String(p.x), cy:String(p.y), r:'5'});
      c.addEventListener('mousedown', ev=>{
        ev.stopPropagation();
        drag = {type:'wp', edgeId:e.id, index:i, ox:p.x, oy:p.y, sx:ev.clientX, sy:ev.clientY};
      });
      g.appendChild(c);
    });
    svg.appendChild(g);
  });

  flow.nodes.forEach(n=>{
    const g = el('g',{'class':'node '+(n.type||'')+' '+(n.style||'')+(selected&&selected.kind==='node'&&selected.id===n.id?' selected':''), 'data-id':n.id, transform:'translate('+n.x+','+n.y+')'});
    let shape;
    if(n.type==='decision'){
      const hw=n.w/2, hh=n.h/2;
      shape = el('polygon',{'class':'shape', points:hw+',0 '+n.w+','+hh+' '+hw+','+n.h+' 0,'+hh});
    } else if(n.type==='event'){
      shape = el('ellipse',{'class':'shape', cx:String(n.w/2), cy:String(n.h/2), rx:String(n.w/2), ry:String(n.h/2)});
    } else {
      shape = el('rect',{'class':'shape', x:'0', y:'0', width:String(n.w), height:String(n.h), rx:'8'});
    }
    g.appendChild(shape);
    const lines = (n.title||'').split('\n');
    lines.forEach((ln,i)=>{
      g.appendChild(el('text',{x:String(n.w/2), y:String(n.h/2 - (lines.length-1)*7 + i*14), 'text-anchor':'middle', 'dominant-baseline':'middle'}, [ln]));
    });
    g.addEventListener('mousedown', ev=>{
      ev.stopPropagation();
      if(tool==='connect'){
        if(!connectFrom){ connectFrom=n.id; flash('Selecione o destino'); }
        else if(connectFrom!==n.id){
          flow.edges.push({id:'e'+Date.now(), from:connectFrom, to:n.id, label:'', points:[]});
          connectFrom=null; saveLocal(); render(); updateProgress();
        }
        return;
      }
      selected={kind:'node',id:n.id};
      drag = {type:'node', id:n.id, ox:n.x, oy:n.y, sx:ev.clientX, sy:ev.clientY};
      render();
    });
    g.addEventListener('dblclick', ev=>{
      ev.stopPropagation();
      selected={kind:'node',id:n.id};
      openModal();
      render();
    });
    svg.appendChild(g);
  });
}

function clientToSvg(cx,cy){
  const svg = document.getElementById('canvas');
  const pt = svg.createSVGPoint();
  pt.x = cx; pt.y = cy;
  const ctm = svg.getScreenCTM().inverse();
  const p = pt.matrixTransform(ctm);
  return {x:p.x, y:p.y};
}

function onMove(ev){
  if(!drag) return;
  const dx = (ev.clientX - drag.sx);
  const dy = (ev.clientY - drag.sy);
  if(drag.type==='node'){
    const n = nodeById(drag.id);
    n.x = drag.ox + dx; n.y = drag.oy + dy;
    render();
  } else if(drag.type==='wp'){
    const e = edgeById(drag.edgeId);
    e.points[drag.index] = {x: drag.ox + dx, y: drag.oy + dy};
    render();
  }
}
function onUp(){ if(drag){ saveLocal(); drag=null; } }

function openModal(){
  refreshSide();
  document.getElementById('modalBg').classList.add('open');
  const isMacro = selected && selected.kind==='macro';
  document.getElementById('colorLabel').style.display = isMacro ? 'block' : 'none';
  document.getElementById('sideColor').style.display = isMacro ? 'block' : 'none';
}
function closeModal(){
  document.getElementById('modalBg').classList.remove('open');
}

function refreshSide(){
  const title = document.getElementById('sideTitle');
  const meta = document.getElementById('sideMeta');
  const name = document.getElementById('sideName');
  const comment = document.getElementById('sideComment');
  document.querySelectorAll('.vbtn').forEach(b=>b.classList.remove('on-ok','on-no'));
  if(!selected){
    title.textContent = 'Avaliação';
    meta.textContent = 'Selecione um elemento no fluxo';
    name.value=''; comment.value='';
    document.getElementById('sideOk').textContent='0';
    document.getElementById('sideNo').textContent='0';
    return;
  }
  const v = getVotes(selected.kind, selected.id);
  document.getElementById('sideOk').textContent = v.ok;
  document.getElementById('sideNo').textContent = v.no;
  if(v.mine==='ok') document.querySelector('.vbtn[data-v="ok"]').classList.add('on-ok');
  if(v.mine==='no') document.querySelector('.vbtn[data-v="no"]').classList.add('on-no');
  comment.value = flow.comments[voteKey(selected.kind, selected.id)] || '';
  if(selected.kind==='node'){
    const n = nodeById(selected.id);
    title.textContent = (n.title||'').replace(/\n/g,' · ');
    meta.textContent = 'Nó · '+(n.type||'process')+' · macro '+(n.macro||'—');
    name.value = n.title;
  } else if(selected.kind==='edge'){
    const e = edgeById(selected.id);
    title.textContent = 'Conexão '+e.from+' → '+e.to;
    meta.textContent = 'Linha · duplo clique avalia · Alt+clique cria ponto';
    name.value = e.label || '';
  } else if(selected.kind==='macro'){
    const m = macroById(selected.id);
    title.textContent = m.title;
    meta.textContent = 'Macro / quadrante';
    name.value = m.title;
    document.getElementById('sideColor').value = (m.color||'#e8f4fc').startsWith('#')?m.color:'#e8f4fc';
  }
}

function voteSelected(val){ if(!selected) return; setMyVote(selected.kind, selected.id, val); }

document.getElementById('sideName').addEventListener('change', e=>{
  if(!selected) return;
  if(selected.kind==='node') nodeById(selected.id).title = e.target.value;
  if(selected.kind==='edge') edgeById(selected.id).label = e.target.value;
  if(selected.kind==='macro') macroById(selected.id).title = e.target.value;
  saveLocal(); render(); renderMacroBar();
});
document.getElementById('sideComment').addEventListener('input', e=>{
  if(!selected) return;
  flow.comments[voteKey(selected.kind,selected.id)] = e.target.value;
  saveLocal();
});
document.getElementById('sideColor').addEventListener('change', e=>{
  if(selected&&selected.kind==='macro'){
    macroById(selected.id).color = e.target.value;
    saveLocal(); render(); renderMacroBar();
  }
});

function clearSelection(){ selected=null; closeModal(); refreshSide(); render(); }

function deleteSelected(){
  if(!selected) return;
  if(selected.kind==='node'){
    flow.nodes = flow.nodes.filter(n=>n.id!==selected.id);
    flow.edges = flow.edges.filter(e=>e.from!==selected.id && e.to!==selected.id);
  } else if(selected.kind==='edge'){
    flow.edges = flow.edges.filter(e=>e.id!==selected.id);
  } else if(selected.kind==='macro'){
    if(!confirm('Remover macro? Nós permanecem.')) return;
    flow.macros = flow.macros.filter(m=>m.id!==selected.id);
  }
  selected=null; closeModal(); saveLocal(); render(); renderMacroBar(); updateProgress(); refreshSide();
}

function uid(prefix){ return prefix+Math.random().toString(36).slice(2,8); }

document.getElementById('btnAddProcess').onclick = ()=>{
  const n={id:uid('n'),macro:null,type:'process',title:'Novo processo',x:120+Math.random()*200,y:120+Math.random()*100,w:180,h:48};
  flow.nodes.push(n); selected={kind:'node',id:n.id}; saveLocal(); render(); updateProgress(); openModal();
};
document.getElementById('btnAddDecision').onclick = ()=>{
  const n={id:uid('n'),macro:null,type:'decision',title:'Decisão?',x:120+Math.random()*200,y:120+Math.random()*100,w:160,h:70};
  flow.nodes.push(n); selected={kind:'node',id:n.id}; saveLocal(); render(); updateProgress(); openModal();
};
document.getElementById('btnAddText').onclick = ()=>{
  const n={id:uid('t'),macro:null,type:'process',title:'Texto livre',x:120+Math.random()*200,y:80,w:160,h:36,style:'ok'};
  flow.nodes.push(n); selected={kind:'node',id:n.id}; saveLocal(); render(); updateProgress(); openModal();
};
document.getElementById('btnAddMacro').onclick = ()=>{
  const id = String.fromCharCode(65+flow.macros.length);
  flow.macros.push({id, title:'MACRO '+id+' · Novo', x:40, y:40+flow.macros.length*20, w:320, h:200, color:'#f0f3f7', border:'#5c6b7a'});
  saveLocal(); render(); renderMacroBar();
};
document.getElementById('btnConnect').onclick = ()=>{
  tool = tool==='connect'?'select':'connect';
  connectFrom=null;
  document.getElementById('btnConnect').classList.toggle('active', tool==='connect');
  flash(tool==='connect'?'Clique na origem e depois no destino':'Seleção');
};

function updateProgress(){
  const ids = [...flow.nodes.map(n=>voteKey('node',n.id)), ...flow.edges.map(e=>voteKey('edge',e.id))];
  let done=0, ok=0, no=0;
  ids.forEach(k=>{ const v = flow.votes[k]; if(v && v.mine){ done++; if(v.mine==='ok') ok++; if(v.mine==='no') no++; } });
  const pct = ids.length? Math.round(100*done/ids.length):0;
  document.getElementById('progText').textContent = pct+'%';
  document.getElementById('progBar').style.width = pct+'%';
  document.getElementById('statEls').textContent = ids.length;
  document.getElementById('statDone').textContent = done;
  document.getElementById('statOk').textContent = ok;
  document.getElementById('statNo').textContent = no;
}

function printMode(mode){
  const root = document.getElementById('printRoot');
  root.innerHTML = '';
  if(mode==='overview'){
    const page = document.createElement('div');
    page.className = 'print-page';
    page.innerHTML = '<h2>HEMOPI — Visão geral</h2><p style="font-size:18px;margin:16px 0"><strong>'+flow.macros.map(m=>m.id).join(' → ')+'</strong></p>';
    root.appendChild(page);
  } else {
    flow.macros.forEach(m=>{
      const page = document.createElement('div');
      page.className = 'print-page';
      const nodes = flow.nodes.filter(n=>n.macro===m.id);
      const edges = flow.edges.filter(e=>{ const a=nodeById(e.from), b=nodeById(e.to); return (a&&a.macro===m.id)||(b&&b.macro===m.id); });
      let html = '<h2>'+m.title+'</h2><div style="display:grid;grid-template-columns:1fr 1fr;gap:16px"><div><h3>Elementos</h3><ul>';
      nodes.forEach(n=>{ const v=getVotes('node',n.id); html += '<li>'+n.title.replace(/\n/g,' / ')+' · 👍'+v.ok+' 👎'+v.no+'</li>'; });
      edges.forEach(e=>{ const v=getVotes('edge',e.id); html += '<li>Linha '+e.from+'→'+e.to+' · 👍'+v.ok+' 👎'+v.no+'</li>'; });
      html += '</ul></div><div><h3>Comentários</h3><ul>';
      [...nodes.map(n=>voteKey('node',n.id)), ...edges.map(e=>voteKey('edge',e.id)), voteKey('macro',m.id)].forEach(k=>{
        if(flow.comments[k]) html += '<li><strong>'+k+'</strong>: '+flow.comments[k]+'</li>';
      });
      html += '</ul></div></div>';
      page.innerHTML = html;
      root.appendChild(page);
    });
  }
  window.print();
}

loadFlow();
render();
renderMacroBar();
updateProgress();
window.addEventListener('mousemove', onMove);
window.addEventListener('mouseup', onUp);
document.getElementById('canvas').addEventListener('mousedown', ()=>{ selected=null; closeModal(); render(); });

window.saveLocal = saveLocal;
window.exportJSON = exportJSON;
window.printMode = printMode;
window.voteSelected = voteSelected;
window.clearSelection = clearSelection;
window.closeModal = closeModal;
window.deleteSelected = deleteSelected;
console.log('HEMOPI editor · double-click to evaluate');
