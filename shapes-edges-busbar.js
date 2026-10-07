/* Ports locked · closest-edge pick · sticky snap · resize release · v20261007f */
(function(){
  function $(id){ return document.getElementById(id); }
  function isGuest(){ return window.HEMOPI_SHARE_MODE==='guest'; }
  function uid(p){ return p+Math.random().toString(36).slice(2,9); }
  function getDrag(){ return (typeof drag!=='undefined' && drag) ? drag : window.__sebDrag; }
  function setDrag(d){
    try{ drag = d; }catch(e){}
    window.__sebDrag = d;
    try{ window.drag = d; }catch(e){}
  }
  function clearDrag(){
    setDrag(null);
    try{ if(typeof drag!=='undefined') drag=null; }catch(e){}
    try{ window.drag=null; }catch(e){}
    window.__sebDrag = null;
  }

  if(!document.getElementById('seb-css')){
    const st=document.createElement('style');
    st.id='seb-css';
    st.textContent=`
      .resize-node{cursor:nwse-resize;fill:#1a5f8a;stroke:#fff;stroke-width:1;opacity:.85}
      .port-dot{fill:#94a3b8;stroke:#fff;stroke-width:1.2;opacity:.55;pointer-events:none}
      .port-dot.port-hot{fill:#22c55e;stroke:#14532d;opacity:1}
      #sideNameMulti{width:100%;min-height:72px;resize:vertical;border:1px solid #d0d8e2;border-radius:8px;padding:8px;font:inherit;display:block}
      .edge-dd-row{display:flex;flex-direction:column;gap:6px;margin:8px 0}
      .edge-dd-row label{font-size:.7rem;font-weight:700}
      .edge-dd-row select{width:100%;padding:8px;border-radius:8px;border:1px solid #d0d8e2;font:inherit}
      .busbar-shape{fill:#1e293b;stroke:#0f172a}
      .ghost-line{stroke:#ef4444;stroke-width:2.5;stroke-dasharray:6 4;fill:none;pointer-events:none}
      .ghost-line.ok{stroke:#22c55e;stroke-dasharray:none}
    `;
    document.head.appendChild(st);
  }

  function svgEl(tag, attrs, kids){
    const n=document.createElementNS('http://www.w3.org/2000/svg', tag);
    if(attrs) Object.keys(attrs).forEach(k=>n.setAttribute(k, attrs[k]));
    (kids||[]).forEach(c=>n.appendChild(typeof c==='string'?document.createTextNode(c):c));
    return n;
  }

  function nodeByIdLocal(id){
    if(typeof nodeById==='function') return nodeById(id);
    return (flow&&flow.nodes||[]).find(n=>n.id===id);
  }

  function portsOf(n){
    if(!n) return [];
    if(n.type==='busbar'){
      const horizontal = n.w >= n.h;
      const span = horizontal ? n.w : n.h;
      const count = Math.max(3, Math.round(span / 40) + 1);
      const ports = [];
      for(let i=0;i<count;i++){
        const t = count===1 ? 0.5 : i/(count-1);
        if(horizontal) ports.push({ id:'p'+i, x: n.x + n.w*t, y: n.y + n.h/2, t });
        else ports.push({ id:'p'+i, x: n.x + n.w/2, y: n.y + n.h*t, t });
      }
      return ports;
    }
    if(n.type==='decision'){
      const cx=n.x+n.w/2, cy=n.y+n.h/2;
      return [
        { id:'top',    x: cx,       y: n.y },
        { id:'right',  x: n.x+n.w,  y: cy },
        { id:'bottom', x: cx,       y: n.y+n.h },
        { id:'left',   x: n.x,      y: cy }
      ];
    }
    const cx=n.x+n.w/2, cy=n.y+n.h/2;
    return [
      { id:'top',    x: cx,       y: n.y },
      { id:'right',  x: n.x+n.w,  y: cy },
      { id:'bottom', x: cx,       y: n.y+n.h },
      { id:'left',   x: n.x,      y: cy }
    ];
  }

  function attachPoint(n, portId, t){
    if(!n) return {x:0,y:0};
    const ports = portsOf(n);
    if(portId!=null && portId!==''){
      const p = ports.find(pp=>pp.id===portId || String(pp.t)===String(portId));
      if(p) return {x:p.x, y:p.y};
    }
    if(n.type==='busbar' && t!=null && !isNaN(t)){
      const horizontal = n.w >= n.h;
      const tt = Math.max(0, Math.min(1, Number(t)));
      if(horizontal) return { x: n.x + n.w*tt, y: n.y + n.h/2 };
      return { x: n.x + n.w/2, y: n.y + n.h*tt };
    }
    return { x: n.x + n.w/2, y: n.y + n.h/2 };
  }

  function ensureLockedPorts(e){
    if(!e || !flow) return;
    const a=nodeByIdLocal(e.from), b=nodeByIdLocal(e.to);
    if(!a||!b) return;
    let changed=false;
    if(e.fromPort==null || e.fromPort===''){
      const ports=portsOf(a);
      const target={x:b.x+b.w/2, y:b.y+b.h/2};
      let best=ports[0], bestD=Infinity;
      ports.forEach(p=>{ const d=Math.hypot(p.x-target.x,p.y-target.y); if(d<bestD){bestD=d;best=p;} });
      if(best){ e.fromPort=best.id; if(a.type==='busbar') e.fromT=best.t; changed=true; }
    }
    if(e.toPort==null || e.toPort===''){
      const ports=portsOf(b);
      const target={x:a.x+a.w/2, y:a.y+a.h/2};
      let best=ports[0], bestD=Infinity;
      ports.forEach(p=>{ const d=Math.hypot(p.x-target.x,p.y-target.y); if(d<bestD){bestD=d;best=p;} });
      if(best){ e.toPort=best.id; if(b.type==='busbar') e.toT=best.t; changed=true; }
    }
    if(changed){
      clearTimeout(window.__sebLockSave);
      window.__sebLockSave=setTimeout(function(){ try{ if(typeof saveLocal==='function') saveLocal(); }catch(err){} }, 800);
    }
  }

  window.pathForEdge = function(e){
    const a=nodeByIdLocal(e.from), b=nodeByIdLocal(e.to);
    if(!a||!b) return '';
    ensureLockedPorts(e);
    const p0 = attachPoint(a, e.fromPort, e.fromT);
    const p1 = attachPoint(b, e.toPort, e.toT);
    const pts = e.points || [];
    let d = 'M '+p0.x+' '+p0.y;
    pts.forEach(p=>{ d += ' L '+p.x+' '+p.y; });
    d += ' L '+p1.x+' '+p1.y;
    return d;
  };

  window.midOfEdge = function(e){
    const a=nodeByIdLocal(e.from), b=nodeByIdLocal(e.to);
    if(!a||!b) return {x:0,y:0};
    ensureLockedPorts(e);
    const pts=e.points||[];
    if(pts.length) return pts[Math.floor(pts.length/2)];
    const p0=attachPoint(a,e.fromPort,e.fromT), p1=attachPoint(b,e.toPort,e.toT);
    return {x:(p0.x+p1.x)/2, y:(p0.y+p1.y)/2};
  };

  function clientToSvg(clientX, clientY){
    const svg = $('canvas');
    if(!svg) return {x:clientX,y:clientY};
    const pt = svg.createSVGPoint();
    pt.x = clientX; pt.y = clientY;
    const ctm = svg.getScreenCTM();
    if(!ctm) return {x:clientX,y:clientY};
    const p = pt.matrixTransform(ctm.inverse());
    return {x:p.x, y:p.y};
  }

  function distPointSeg(px,py,x1,y1,x2,y2){
    const dx=x2-x1, dy=y2-y1;
    const len2=dx*dx+dy*dy;
    if(len2 < 1e-6) return Math.hypot(px-x1, py-y1);
    let t=((px-x1)*dx+(py-y1)*dy)/len2;
    t=Math.max(0, Math.min(1, t));
    return Math.hypot(px-(x1+t*dx), py-(y1+t*dy));
  }

  function edgePolyline(e){
    const a=nodeByIdLocal(e.from), b=nodeByIdLocal(e.to);
    if(!a||!b) return [];
    ensureLockedPorts(e);
    const p0=attachPoint(a,e.fromPort,e.fromT);
    const p1=attachPoint(b,e.toPort,e.toT);
    const pts=e.points||[];
    return [p0].concat(pts).concat([p1]);
  }

  function distToEdgePath(px, py, e){
    const poly=edgePolyline(e);
    let best=Infinity;
    for(let i=0;i<poly.length-1;i++){
      const d=distPointSeg(px,py, poly[i].x,poly[i].y, poly[i+1].x,poly[i+1].y);
      if(d<best) best=d;
    }
    return best;
  }

  function nearestPort(svgX, svgY, radius, excludeNodeId){
    radius = radius || 36;
    let best=null, bestD=radius;
    (flow.nodes||[]).forEach(n=>{
      if(excludeNodeId && n.id===excludeNodeId) return;
      portsOf(n).forEach(p=>{
        const d = Math.hypot(p.x - svgX, p.y - svgY);
        if(d < bestD){
          bestD = d;
          best = { node:n, port:p, dist:d };
        }
      });
    });
    return best;
  }

  function pickEdgeNear(px, py){
    let best=null;
    let bestPath=14;
    (flow.edges||[]).forEach(e=>{
      const dPath = distToEdgePath(px, py, e);
      const a=nodeByIdLocal(e.from), b=nodeByIdLocal(e.to);
      if(!a||!b) return;
      ensureLockedPorts(e);
      const p0=attachPoint(a,e.fromPort,e.fromT);
      const p1=attachPoint(b,e.toPort,e.toT);
      const d0=Math.hypot(p0.x-px, p0.y-py);
      const d1=Math.hypot(p1.x-px, p1.y-py);
      const dEnd=Math.min(d0,d1);
      if(dEnd > 42 && dPath > 12) return;
      if(dPath < bestPath || (Math.abs(dPath-bestPath)<0.5 && best && dEnd < best.dEnd)){
        bestPath = dPath;
        best = { e:e, which: d0<=d1?'from':'to', dPath:dPath, dEnd:dEnd, p0:p0, p1:p1 };
      }
    });
    if(!best){
      let bestEnd=36;
      (flow.edges||[]).forEach(e=>{
        const a=nodeByIdLocal(e.from), b=nodeByIdLocal(e.to);
        if(!a||!b) return;
        ensureLockedPorts(e);
        const p0=attachPoint(a,e.fromPort,e.fromT);
        const p1=attachPoint(b,e.toPort,e.toT);
        const d0=Math.hypot(p0.x-px, p0.y-py);
        const d1=Math.hypot(p1.x-px, p1.y-py);
        if(d0<bestEnd){ bestEnd=d0; best={e:e,which:'from',dPath:d0,dEnd:d0,p0:p0,p1:p1}; }
        if(d1<bestEnd){ bestEnd=d1; best={e:e,which:'to',dPath:d1,dEnd:d1,p0:p0,p1:p1}; }
      });
    }
    return best;
  }

  function injectChrome(){
    const svg=$('canvas');
    if(!svg||!flow) return;
    svg.querySelectorAll('[data-node-resize],[data-port-dot],[data-ghost]').forEach(n=>n.remove());

    (flow.nodes||[]).forEach(n=>{
      portsOf(n).forEach(p=>{
        svg.appendChild(svgEl('circle', {
          'data-port-dot': n.id, 'data-port-id': p.id,
          class: 'port-dot', cx: String(p.x), cy: String(p.y), r: '4'
        }));
      });
    });

    (flow.nodes||[]).forEach(n=>{
      const h = svgEl('rect', {
        'data-node-resize': n.id, class: 'resize-node',
        x: String(n.x+n.w-6), y: String(n.y+n.h-6),
        width: '11', height: '11', rx: '2'
      });
      h.addEventListener('mousedown', function(ev){
        if(isGuest()) return;
        ev.stopPropagation(); ev.preventDefault();
        setDrag({ type:'node-resize', id:n.id, ox:n.w, oy:n.h, sx:ev.clientX, sy:ev.clientY });
        selected = { kind:'node', id:n.id };
      });
      svg.appendChild(h);
    });

    wireEdgeHits(svg);
  }

  function wireEdgeHits(svg){
    if(svg.dataset.sebEdge==='1') return;
    svg.dataset.sebEdge='1';
    svg.addEventListener('mousedown', function(ev){
      if(isGuest() || !flow || getDrag()) return;
      const t = ev.target;
      if(!t || !t.classList) return;
      const onEdge = t.classList.contains('edge') || t.classList.contains('edge-hit');
      if(!onEdge) return;

      const p = clientToSvg(ev.clientX, ev.clientY);
      const pick = pickEdgeNear(p.x, p.y);
      if(!pick) return;

      ev.stopPropagation();
      ev.preventDefault();

      const e = pick.e;
      const which = pick.which;
      selected = { kind:'edge', id:e.id };

      setDrag({
        type: 'edge-reconnect',
        edgeId: e.id,
        which: which,
        sx: ev.clientX, sy: ev.clientY,
        fixed: which==='from' ? pick.p1 : pick.p0,
        excludeId: which==='from' ? e.to : e.from,
        _snap: null
      });

      paintDragVisual(p.x, p.y, null);
    }, true);
  }

  function paintDragVisual(mx, my, snap){
    const svg=$('canvas');
    const d = getDrag();
    if(!svg || !d || d.type!=='edge-reconnect') return;
    svg.querySelectorAll('[data-ghost]').forEach(n=>n.remove());
    svg.querySelectorAll('.port-dot.port-hot').forEach(el=>el.classList.remove('port-hot'));

    const fx = d.fixed.x, fy = d.fixed.y;
    const tx = snap ? snap.port.x : mx;
    const ty = snap ? snap.port.y : my;
    svg.appendChild(svgEl('path', {
      'data-ghost': '1',
      class: 'ghost-line'+(snap?' ok':''),
      d: 'M '+fx+' '+fy+' L '+tx+' '+ty
    }));
    if(snap){
      svg.querySelectorAll('[data-port-dot="'+snap.node.id+'"][data-port-id="'+snap.port.id+'"]').forEach(el=>el.classList.add('port-hot'));
      svg.appendChild(svgEl('circle', {
        'data-ghost':'1',
        cx: String(snap.port.x), cy: String(snap.port.y),
        r: '11', fill: 'none', stroke: '#22c55e', 'stroke-width': '2.5'
      }));
    }
  }

  function commitReconnect(ev){
    const d = getDrag();
    if(!d || d.type !== 'edge-reconnect' || !flow) return false;

    const e = (flow.edges||[]).find(x=>x.id===d.edgeId);
    if(!e){
      clearDrag();
      return true;
    }

    let px = d._mx, py = d._my;
    if(ev && (ev.clientX!=null)){
      const p = clientToSvg(ev.clientX, ev.clientY);
      px = p.x; py = p.y;
    }
    let snap = d._snap;
    if(px!=null){
      const now = nearestPort(px, py, 40, d.excludeId);
      if(now) snap = now;
    }

    if(snap){
      if(d.which==='from'){
        e.from = snap.node.id;
        e.fromPort = String(snap.port.id);
        if(snap.node.type==='busbar') e.fromT = snap.port.t;
        else delete e.fromT;
      } else {
        e.to = snap.node.id;
        e.toPort = String(snap.port.id);
        if(snap.node.type==='busbar') e.toT = snap.port.t;
        else delete e.toT;
      }
      if(typeof toast==='function') toast('Fixado em '+snap.port.id);
      if(typeof saveLocal==='function') saveLocal();
    } else {
      if(typeof toast==='function') toast('Solte perto de um ponto verde', true);
    }

    clearDrag();
    const svg=$('canvas');
    if(svg) svg.querySelectorAll('[data-ghost]').forEach(n=>n.remove());
    if(typeof render==='function') render();
    return true;
  }

  const prevMove = window.onMove;
  window.onMove = function(ev){
    const d = getDrag();
    if(!d || !flow){
      if(typeof prevMove==='function') return prevMove(ev);
      return;
    }
    if(d.type === 'node-resize'){
      // Only while button held — buttons bit 1 = left
      if(ev.buttons !== undefined && (ev.buttons & 1) === 0){
        clearDrag();
        if(typeof saveLocal==='function') saveLocal();
        if(typeof render==='function') render();
        return;
      }
      const n = nodeByIdLocal(d.id);
      if(!n) return;
      n.w = Math.max(n.type==='busbar'?80:60, d.ox + (ev.clientX-d.sx));
      n.h = Math.max(n.type==='busbar'?16:32, d.oy + (ev.clientY-d.sy));
      if(typeof render==='function') render();
      return;
    }
    if(d.type === 'edge-reconnect'){
      const p = clientToSvg(ev.clientX, ev.clientY);
      d._mx = p.x; d._my = p.y;
      const snap = nearestPort(p.x, p.y, 40, d.excludeId);
      d._snap = snap;
      setDrag(d);
      paintDragVisual(p.x, p.y, snap);
      return;
    }
    if(typeof prevMove==='function') prevMove(ev);
  };

  const prevUp = window.onUp;
  window.onUp = function(ev){
    const d = getDrag();
    if(d && d.type === 'edge-reconnect'){
      commitReconnect(ev);
      return;
    }
    if(d && d.type === 'node-resize'){
      clearDrag();
      if(typeof saveLocal==='function') saveLocal();
      if(typeof render==='function') render();
      if(typeof prevUp==='function') prevUp(ev);
      return;
    }
    if(typeof prevUp==='function') prevUp(ev);
  };

  // Capture mouseup: commit edge snap OR release resize (hold-to-resize only)
  window.addEventListener('mouseup', function(ev){
    const d = getDrag();
    if(d && d.type==='edge-reconnect'){
      commitReconnect(ev);
      ev.stopPropagation();
      return;
    }
    if(d && d.type==='node-resize'){
      clearDrag();
      if(typeof saveLocal==='function') saveLocal();
    }
  }, true);

  window.addEventListener('pointerup', function(ev){
    const d = getDrag();
    if(d && d.type==='node-resize'){
      clearDrag();
      if(typeof saveLocal==='function') saveLocal();
    }
  }, true);

  const prevRender = window.render;
  window.render = function(){
    if(typeof prevRender==='function') prevRender.apply(this, arguments);
    const svg = $('canvas');
    if(svg && flow){
      svg.querySelectorAll('[data-busbar-overlay]').forEach(n=>n.remove());
      (flow.nodes||[]).filter(n=>n.type==='busbar').forEach(n=>{
        svg.appendChild(svgEl('rect', {
          x:String(n.x), y:String(n.y), width:String(n.w), height:String(n.h),
          rx:'4', class:'busbar-shape', 'data-busbar-overlay':n.id, 'pointer-events':'none'
        }));
        svg.appendChild(svgEl('text', {
          x:String(n.x+n.w/2), y:String(n.y-6),
          'text-anchor':'middle', 'font-size':'10', fill:'#64748b', 'pointer-events':'none'
        }, [n.title||'Barramento']));
      });
    }
    try{ injectChrome(); }catch(e){}
  };

  function fillNodeOptions(sel, currentId){
    if(!sel || !flow) return;
    sel.innerHTML = '';
    (flow.nodes||[]).forEach(n=>{
      const o = document.createElement('option');
      o.value = n.id;
      const tag = n.type==='busbar' ? '⚡ ' : (n.type==='decision' ? '◇ ' : '▭ ');
      o.textContent = tag + (n.macro?('['+n.macro+'] '):'') + (n.title||n.id).split('\n')[0];
      if(n.id === currentId) o.selected = true;
      sel.appendChild(o);
    });
  }

  function createBusbar(){
    if(isGuest() || !flow) return;
    if(!flow.nodes) flow.nodes = [];
    const n = { id:uid('bus'), macro:null, type:'busbar', title:'Barramento',
      x:200+Math.random()*80, y:200+Math.random()*60, w:200, h:18 };
    if(flow.macros && flow.macros.length){
      const m=flow.macros[flow.macros.length-1];
      n.macro=m.id; n.x=m.x+40; n.y=m.y+Math.max(30,m.h/2-9);
    }
    flow.nodes.push(n);
    selected={kind:'node',id:n.id};
    if(typeof saveLocal==='function') saveLocal();
    if(typeof render==='function') render();
    if(typeof openModal==='function') openModal();
  }

  function ensureBusbarButton(){
    let b=$('btnAddBusbar');
    if(!b){
      const ref=$('btnAddMacro')||$('btnAddProcess');
      if(!ref) return;
      b=document.createElement('button');
      b.type='button'; b.className='btn'; b.id='btnAddBusbar'; b.title='Barramento'; b.textContent='⚡';
      ref.parentNode.insertBefore(b, ref.nextSibling);
    }
    b.onclick=function(ev){ ev.preventDefault(); createBusbar(); };
    const bt=$('boardTools');
    if(bt){
      let b2=$('btnAddBusbar2');
      if(!b2){ b2=document.createElement('button'); b2.type='button'; b2.className='btn'; b2.id='btnAddBusbar2'; b2.textContent='⚡'; bt.appendChild(b2); }
      b2.onclick=function(ev){ ev.preventDefault(); createBusbar(); };
    }
  }

  function applyModalForm(){
    if(!selected || !flow) return false;
    const ta = $('sideNameMulti');
    const comment = $('sideComment');
    const titleVal = ta ? ta.value : (($('sideName')&&$('sideName').value)||'');
    if(selected.kind==='node'){
      const n = nodeByIdLocal(selected.id);
      if(n) n.title = titleVal;
    } else if(selected.kind==='macro'){
      const m = typeof macroById==='function' ? macroById(selected.id) : (flow.macros||[]).find(x=>x.id===selected.id);
      if(m) m.title = titleVal;
    } else if(selected.kind==='edge'){
      const e = (flow.edges||[]).find(x=>x.id===selected.id);
      if(e) e.label = titleVal;
    }
    if(comment){
      if(!flow.comments) flow.comments = {};
      const key = (typeof voteKey==='function') ? voteKey(selected.kind, selected.id) : (selected.kind+':'+selected.id);
      flow.comments[key] = comment.value;
    }
    const modSel = $('sideMacroSelect');
    if(modSel && selected.kind==='node'){
      const n = nodeByIdLocal(selected.id);
      if(n) n.macro = modSel.value || null;
    }
    if(typeof saveLocal==='function') saveLocal();
    if(typeof render==='function') render();
    if(typeof renderMacroBar==='function') renderMacroBar();
    return true;
  }

  function wireModalSave(){
    const btn = $('btnModalSave');
    if(!btn) return;
    btn.onclick = function(ev){
      ev.preventDefault();
      if(isGuest()){ if(typeof toast==='function') toast('Convidado não edita',true); return; }
      if(applyModalForm()){
        if(typeof toast==='function') toast('Salvo');
        if(typeof closeModal==='function') closeModal();
      }
    };
  }

  const prevRefresh = window.refreshSide;
  window.refreshSide = function(){
    if(typeof prevRefresh==='function'){
      try{ prevRefresh.apply(this, arguments); }catch(e){}
    }
    const ta = $('sideNameMulti');
    const name = $('sideName');
    const box = $('edgeDdBox');
    if(!selected){
      if(ta) ta.value = '';
      if(box) box.hidden = true;
      return;
    }
    if(selected.kind==='node'){
      const n = nodeByIdLocal(selected.id);
      if(ta){ ta.style.display='block'; ta.value = n ? (n.title||'') : ''; }
      if(name) name.style.display='none';
      if(box) box.hidden = true;
    } else if(selected.kind==='edge'){
      const e = (flow.edges||[]).find(x=>x.id===selected.id);
      if(ta){ ta.style.display='block'; ta.value = e ? (e.label||'') : ''; }
      if(name) name.style.display='none';
      if(box){
        box.hidden = false;
        fillNodeOptions($('edgeFromSel'), e && e.from);
        fillNodeOptions($('edgeToSel'), e && e.to);
      }
    } else if(selected.kind==='macro'){
      const m = typeof macroById==='function' ? macroById(selected.id) : null;
      if(ta){ ta.style.display='block'; ta.value = m ? (m.title||'') : ''; }
      if(name) name.style.display='none';
      if(box) box.hidden = true;
    }
    wireModalSave();
  };

  function boot(){
    ensureBusbarButton();
    wireModalSave();
    const ta = $('sideNameMulti');
    if(ta && ta.dataset.wired!=='1'){
      ta.dataset.wired='1';
      ta.addEventListener('input', function(){
        if(!selected || !flow) return;
        if(selected.kind==='node'){
          const n=nodeByIdLocal(selected.id);
          if(n){ n.title=ta.value; if(typeof render==='function') render(); }
        } else if(selected.kind==='macro'){
          const m=typeof macroById==='function'?macroById(selected.id):null;
          if(m){ m.title=ta.value; if(typeof render==='function') render(); }
        } else if(selected.kind==='edge'){
          const e=(flow.edges||[]).find(x=>x.id===selected.id);
          if(e){ e.label=ta.value; if(typeof render==='function') render(); }
        }
        if(typeof saveLocal==='function') saveLocal();
      });
    }
    function applyEdgeEnds(){
      if(!selected || selected.kind!=='edge' || !flow) return;
      const e=(flow.edges||[]).find(x=>x.id===selected.id);
      if(!e) return;
      const fromSel=$('edgeFromSel'), toSel=$('edgeToSel');
      if(fromSel&&fromSel.value){ e.from=fromSel.value; delete e.fromPort; delete e.fromT; }
      if(toSel&&toSel.value){ e.to=toSel.value; delete e.toPort; delete e.toT; }
      ensureLockedPorts(e);
      if(typeof saveLocal==='function') saveLocal();
      if(typeof render==='function') render();
    }
    const fromSel=$('edgeFromSel'), toSel=$('edgeToSel');
    if(fromSel&&fromSel.dataset.wired!=='1'){ fromSel.dataset.wired='1'; fromSel.onchange=applyEdgeEnds; }
    if(toSel&&toSel.dataset.wired!=='1'){ toSel.dataset.wired='1'; toSel.onchange=applyEdgeEnds; }
  }

  boot();
  setTimeout(boot, 400);
  setTimeout(boot, 1200);
  setTimeout(boot, 2500);

  console.log('[Fluxora] shapes-edges-busbar v20261007f resize release on mouseup');
})();
