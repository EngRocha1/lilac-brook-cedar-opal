/* Patch: macros drag/resize, header, share, seal, print, presence */
(function(){
  const svgNS='http://www.w3.org/2000/svg';
  function ensureMeta(){
    if(!flow) return;
    if(!flow.header) flow.header={projectName:'',manager:'',director:'',po:'',pm:'',stakeholders:''};
    if(!flow.seal) flow.seal=null;
    if(!flow.sharedEmails) flow.sharedEmails=[];
  }
  window.renderProjectHeader=function(){
    const box=document.getElementById('projectHeader');
    if(!box||!flow) return;
    ensureMeta();
    const h=flow.header||{};
    const locked=window.HEMOPI_SHARE_MODE==='guest';
    box.className='project-header'+(locked?' locked':'');
    const fields=[['projectName','Projeto'],['manager','Gerente'],['director','Diretor'],['po','PO'],['pm','PM'],['stakeholders','Stakeholders']];
    box.innerHTML=fields.map(([k,lab])=>'<label>'+lab+'<input data-hk="'+k+'" value="'+(h[k]||'').replace(/"/g,'&quot;')+'"/></label>').join('');
    box.querySelectorAll('input').forEach(inp=>{
      inp.onchange=()=>{ if(locked) return; ensureMeta(); flow.header[inp.getAttribute('data-hk')]=inp.value; saveLocal(); };
    });
    const sealEl=document.getElementById('sealBox');
    if(sealEl) sealEl.innerHTML=flow.seal?('<div class="seal '+flow.seal.color+'">selo '+flow.seal.color+' · '+flow.seal.name+' · '+flow.seal.email+'</div>'):'';
  };
  window.render=function(){
    if(!flow) return;
    ensureMeta();
    try{ renderProjectHeader(); }catch(e){}
    const svg=document.getElementById('canvas');
    if(!svg) return;
    svg.innerHTML='';
    function el(tag,attrs,kids){
      const n=document.createElementNS(svgNS,tag);
      Object.entries(attrs||{}).forEach(([k,v])=>{ if(k==='class') n.setAttribute('class',v); else n.setAttribute(k,v); });
      (kids||[]).forEach(c=>n.appendChild(typeof c==='string'?document.createTextNode(c):c));
      return n;
    }
    const defs=el('defs');
    ['#1a5f8a','#c9a227','#5b4b8a','#c41e3a','#1b7a4e','#5c6b7a'].forEach((c,i)=>{
      const m=el('marker',{id:'mk'+i,markerWidth:'8',markerHeight:'8',refX:'6',refY:'4',orient:'auto'});
      m.appendChild(el('path',{d:'M0,0 L8,4 L0,8 Z',fill:c})); defs.appendChild(m);
    });
    svg.appendChild(defs);
    flow.macros.forEach(m=>{
      const g=el('g',{'class':'macro','data-id':m.id});
      const box=el('rect',{'class':'macro-box',x:String(m.x),y:String(m.y),width:String(m.w),height:String(m.h),rx:'14',fill:m.color||'#eef',stroke:m.border||'#5c6b7a','stroke-width':'2','stroke-dasharray':'8 5'});
      box.style.pointerEvents='all'; box.style.cursor='move';
      box.addEventListener('mousedown',ev=>{
        ev.stopPropagation();
        selected={kind:'macro',id:m.id};
        drag={type:'macro',id:m.id,ox:m.x,oy:m.y,sx:ev.clientX,sy:ev.clientY,_lastX:m.x,_lastY:m.y};
        render();
      });
      g.appendChild(box);
      g.appendChild(el('text',{'class':'macro-label',x:String(m.x+12),y:String(m.y+18),fill:m.border||'#333','pointer-events':'none'},[m.title||('MACRO '+m.id)]));
      const h=el('rect',{'class':'resize-h',x:String(m.x+m.w-8),y:String(m.y+m.h-8),width:'14',height:'14',rx:'2'});
      h.addEventListener('mousedown',ev=>{ ev.stopPropagation(); drag={type:'resize',id:m.id,ox:m.w,oy:m.h,sx:ev.clientX,sy:ev.clientY}; });
      g.appendChild(h);
      svg.appendChild(g);
    });
    flow.edges.forEach(e=>{
      const a=nodeById(e.from),b=nodeById(e.to); if(!a||!b) return;
      const g=el('g');
      const d=pathForEdge(e); const color=e.color||'#5c6b7a';
      const hit=el('path',{'class':'edge-hit',d:d});
      const path=el('path',{'class':'edge',d:d,stroke:color,'marker-end':'url(#mk5)'});
      hit.addEventListener('mousedown',ev=>{ev.stopPropagation();selected={kind:'edge',id:e.id};render();});
      const mid=midOfEdge(e);
      const cg=el('g',{'class':'comment-btn',transform:'translate('+(mid.x+14)+','+(mid.y-6)+')'});
      cg.appendChild(el('circle',{cx:'0',cy:'0',r:'9',fill:'#fff',stroke:'#1a5f8a','stroke-width':'1.5'}));
      cg.appendChild(el('text',{x:'0',y:'4','text-anchor':'middle','font-size':'11'},['💬']));
      cg.addEventListener('mousedown',ev=>{ev.stopPropagation();selected={kind:'edge',id:e.id};openModal();render();});
      g.appendChild(hit); g.appendChild(path); g.appendChild(cg);
      if(e.label) g.appendChild(el('text',{x:String(mid.x),y:String(mid.y-10),'text-anchor':'middle','font-size':'10','font-weight':'700',fill:color},[e.label]));
      svg.appendChild(g);
    });
    flow.nodes.forEach(n=>{
      const g=el('g',{'class':'node '+(n.type||''),transform:'translate('+n.x+','+n.y+')'});
      let shape;
      if(n.type==='decision'){ const hw=n.w/2,hh=n.h/2; shape=el('polygon',{'class':'shape',points:hw+',0 '+n.w+','+hh+' '+hw+','+n.h+' 0,'+hh}); }
      else shape=el('rect',{'class':'shape',x:'0',y:'0',width:String(n.w),height:String(n.h),rx:'8'});
      g.appendChild(shape);
      (n.title||'').split('\n').forEach((ln,i)=>{
        g.appendChild(el('text',{x:String(n.w/2),y:String(n.h/2-((n.title||'').split('\n').length-1)*7+i*14),'text-anchor':'middle','dominant-baseline':'middle'},[ln]));
      });
      const cg=el('g',{'class':'comment-btn',transform:'translate('+(n.w-2)+',-2)'});
      cg.appendChild(el('circle',{cx:'0',cy:'0',r:'10',fill:'#fff',stroke:'#1a5f8a','stroke-width':'1.5'}));
      cg.appendChild(el('text',{x:'0',y:'4','text-anchor':'middle','font-size':'11'},['💬']));
      cg.addEventListener('mousedown',ev=>{ev.stopPropagation();selected={kind:'node',id:n.id};openModal();render();});
      g.appendChild(cg);
      g.addEventListener('mousedown',ev=>{
        if(ev.target.closest&&ev.target.closest('.comment-btn')) return;
        ev.stopPropagation();
        if(tool==='connect'){
          if(!connectFrom){ connectFrom=n.id; flash('Destino…'); }
          else if(connectFrom!==n.id){ flow.edges.push({id:'e'+Date.now(),from:connectFrom,to:n.id,label:'',points:[]}); connectFrom=null; saveLocal(); render(); updateProgress(); }
          return;
        }
        selected={kind:'node',id:n.id};
        drag={type:'node',id:n.id,ox:n.x,oy:n.y,sx:ev.clientX,sy:ev.clientY};
        render();
      });
      svg.appendChild(g);
    });
  };
  window.onMove=function(ev){
    if(!drag||!flow) return;
    const dx=ev.clientX-drag.sx, dy=ev.clientY-drag.sy;
    if(drag.type==='node'){ const n=nodeById(drag.id); n.x=drag.ox+dx; n.y=drag.oy+dy; render(); }
    else if(drag.type==='macro'){
      const m=macroById(drag.id); if(!m) return;
      const nx=drag.ox+dx, ny=drag.oy+dy;
      const pdx=nx-(drag._lastX!=null?drag._lastX:drag.ox);
      const pdy=ny-(drag._lastY!=null?drag._lastY:drag.oy);
      m.x=nx; m.y=ny;
      flow.nodes.forEach(n=>{ if(n.macro===m.id){ n.x+=pdx; n.y+=pdy; } });
      drag._lastX=nx; drag._lastY=ny;
      render();
    } else if(drag.type==='resize'){
      const m=macroById(drag.id); if(!m) return;
      m.w=Math.max(140, drag.ox+dx); m.h=Math.max(100, drag.oy+dy);
      render();
    }
  };
  window.shareFlow=async function(){
    if(!user){ flash('Entre para compartilhar'); return; }
    const raw=prompt('E-mails para compartilhar (vírgula):',(flow.sharedEmails||[]).join(', '));
    if(raw==null) return;
    const emails=raw.split(/[,;\s]+/).map(e=>e.trim().toLowerCase()).filter(e=>e.includes('@'));
    if(!emails.length){ flash('Informe e-mails'); return; }
    flow.sharedEmails=emails; saveLocal();
    let token=null;
    if(convexClient){
      try{ const r=await convexClient.mutation('shares:create',{flowKey,emails,canEdit:true,createdBy:user.email}); token=r.token; }catch(e){ console.warn(e); }
    }
    if(!token) token='local-'+flowKey;
    const url=location.origin+location.pathname+'?share='+encodeURIComponent(token)+'&flow='+encodeURIComponent(flowKey);
    try{ await navigator.clipboard.writeText(url); }catch(e){}
    prompt('Link (copie e envie):', url);
  };
  window.finalizeSeal=function(){
    if(!user){ flash('Entre para carimbar'); return; }
    ensureMeta();
    let ok=0,no=0;
    Object.values(flow.votes||{}).forEach(v=>{ ok+=v.ok||0; no+=v.no||0; });
    let color='yellow';
    if(ok+no>0){ const r=ok/(ok+no); color=r>=0.7?'green':r>=0.4?'yellow':'red'; }
    flow.seal={ color, name:user.name, email:user.email, at:Date.now() };
    saveLocal(); renderProjectHeader();
    flash('Selo '+color+' aplicado');
  };
  window.printMode=function(mode){
    const root=document.getElementById('printRoot'); root.innerHTML='';
    ensureMeta();
    const h=flow.header||{};
    const headerHtml='<div style="font-size:11px;margin-bottom:8px"><b>'+(h.projectName||flowTitle)+'</b><br>Gerente: '+(h.manager||'—')+' · Diretor: '+(h.director||'—')+' · PO: '+(h.po||'—')+' · PM: '+(h.pm||'—')+' · Stakeholders: '+(h.stakeholders||'—')+'</div>';
    const sealHtml=flow.seal?('<div class="seal '+flow.seal.color+'">Autenticado: '+flow.seal.name+' ('+flow.seal.email+')</div>'):'';
    if(mode==='overview'){
      const p=document.createElement('div'); p.className='print-page';
      p.innerHTML=headerHtml+'<h2>'+flowTitle+'</h2><p>'+flow.macros.map(m=>m.id).join(' → ')+'</p>'+sealHtml;
      root.appendChild(p);
    } else {
      flow.macros.forEach(m=>{
        const p=document.createElement('div'); p.className='print-page';
        const nodes=flow.nodes.filter(n=>n.macro===m.id);
        let draw='<svg width="100%" height="300" viewBox="'+m.x+' '+m.y+' '+Math.max(m.w,1)+' '+Math.max(m.h,1)+'" xmlns="http://www.w3.org/2000/svg">';
        draw+='<rect x="'+m.x+'" y="'+m.y+'" width="'+m.w+'" height="'+m.h+'" fill="'+(m.color||'#eef')+'" stroke="'+(m.border||'#333')+'" stroke-dasharray="6 4" rx="10"/>';
        nodes.forEach(n=>{
          if(n.type==='decision'){ const hw=n.w/2,hh=n.h/2; draw+='<polygon points="'+(n.x+hw)+','+n.y+' '+(n.x+n.w)+','+(n.y+hh)+' '+(n.x+hw)+','+(n.y+n.h)+' '+n.x+','+(n.y+hh)+'" fill="#fdf6e3" stroke="#c9a227"/>'; }
          else draw+='<rect x="'+n.x+'" y="'+n.y+'" width="'+n.w+'" height="'+n.h+'" rx="6" fill="#e8f4fc" stroke="#1a5f8a"/>';
          draw+='<text x="'+(n.x+n.w/2)+'" y="'+(n.y+n.h/2)+'" text-anchor="middle" dominant-baseline="middle" font-size="10" font-weight="600">'+(n.title||'').replace(/</g,'')+'</text>';
        });
        flow.edges.forEach(e=>{
          const a=nodeById(e.from),b=nodeById(e.to); if(!a||!b) return;
          if(a.macro!==m.id&&b.macro!==m.id) return;
          const p0=centerOf(a),p1=centerOf(b);
          draw+='<line x1="'+p0.x+'" y1="'+p0.y+'" x2="'+p1.x+'" y2="'+p1.y+'" stroke="#555" stroke-width="2"/>';
          if(e.label) draw+='<text x="'+((p0.x+p1.x)/2)+'" y="'+((p0.y+p1.y)/2-6)+'" font-size="9" fill="#c41e3a" font-weight="700">'+e.label+'</text>';
        });
        draw+='</svg>';
        let comments='<h4>Comentários — Módulo '+m.id+'</h4><ul style="font-size:11px">';
        nodes.forEach(n=>{
          const k=voteKey('node',n.id); const v=getVotes('node',n.id);
          comments+='<li><b>'+(n.title||'').replace(/\n/g,' / ')+'</b> 👍'+v.ok+' 👎'+v.no;
          if(flow.comments[k]) comments+=' — <i>'+flow.comments[k]+'</i>';
          comments+='</li>';
        });
        comments+='</ul>';
        p.innerHTML=headerHtml+'<h3>Módulo '+m.id+' — '+(m.title||'')+'</h3><div class="print-page-grid"><div class="print-draw">'+draw+'</div><div class="print-comments">'+comments+'</div></div>'+sealHtml;
        root.appendChild(p);
      });
    }
    window.print();
  };
  async function presenceTick(){
    if(!user||!convexClient||!flowKey) return;
    try{
      await convexClient.mutation('shares:heartbeat',{flowKey,email:user.email,name:user.name||user.email});
      const list=await convexClient.query('shares:listPresence',{flowKey});
      const bar=document.getElementById('presenceBar');
      if(bar) bar.innerHTML='<strong>Online:</strong> '+(list||[]).map(p=>'<span class="presence-chip"><span class="presence-dot"></span>'+p.name+'</span>').join(' ')||'só você';
    }catch(e){}
  }
  async function tryShareEntry(){
    const params=new URLSearchParams(location.search);
    const token=params.get('share'); const fk=params.get('flow');
    if(!token) return;
    let email=prompt('E-mail com o qual o fluxo foi compartilhado:');
    if(!email) return;
    email=email.toLowerCase().trim();
    if(convexClient){
      try{
        const sh=await convexClient.query('shares:getByToken',{token});
        if(sh&&sh.emails&&!sh.emails.includes(email)&&sh.createdBy!==email){ alert('E-mail não autorizado.'); return; }
        if(sh) flowKey=sh.flowKey;
      }catch(e){}
    }
    if(fk) flowKey=fk;
    localStorage.setItem(FLOW_KEY_STORE,flowKey);
    user={name:email.split('@')[0],email};
    localStorage.setItem(USER_KEY,JSON.stringify(user));
    window.HEMOPI_SHARE_MODE='guest';
    if(typeof enterApp==='function') await enterApp();
    setInterval(presenceTick,15000); presenceTick();
  }
  function wire(){
    const hs=document.getElementById('btnShare');
    if(hs) hs.onclick=shareFlow;
    const se=document.getElementById('btnSeal');
    if(se) se.onclick=finalizeSeal;
    setInterval(presenceTick,20000);
    tryShareEntry();
    window.addEventListener('mousemove', window.onMove);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', wire);
  else setTimeout(wire, 300);
})();
