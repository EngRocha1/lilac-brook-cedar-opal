/* Ports · drag-reconnect proximity · no permanent red handles · v20261007c */
(function(){
  function $(id){ return document.getElementById(id); }
  function isGuest(){ return window.HEMOPI_SHARE_MODE==='guest'; }
  function uid(p){ return p+Math.random().toString(36).slice(2,9); }

  if(!document.getElementById('seb-css')){
    const st=document.createElement('style');
    st.id='seb-css';
    st.textContent=`
      .resize-node{cursor:nwse-resize;fill:#1a5f8a;stroke:#fff;stroke-width:1;opacity:.85}
      .port-dot{fill:#94a3b8;stroke:#fff;stroke-width:1.2;opacity:.55;pointer-events:none}
      .port-dot.port-hot{fill:#22c55e;stroke:#14532d;opacity:1}
      .edge-dragging{stroke:#ef4444!important;stroke-width:2.5!important}
      .edge-snap-ok{stroke:#22c55e!important;stroke-width:2.5!important}
      #sideNameMulti{width:100%;min-height:72px;resize:vertical;border:1px solid #d0d8e2;border-radius:8px;padding:8px;font:inherit;display:block}
      .edge-dd-row{display:flex;flex-direction:column;gap:6px;margin:8px 0}
      .edge-dd-row label{font-size:.7rem;font-weight:700}
      .edge-dd-row select{width:100%;padding:8px;border-radius:8px;border:1px solid #d0d8e2;font:inherit}
      .busbar-shape{fill:#1e293b;stroke:#0f172a}
      .ghost-line{stroke:#ef4444;stroke-width:2;stroke-dasharray:6 4;fill:none;pointer-events:none}
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

  /**
   * Useful connection ports for a node.
   * Returns [{id, x, y, t?}]
   *  - process/text: 4 side centers
   *  - decision: 4 vertices of diamond
   *  - busbar: N points along bar (min 3)
   */
  function portsOf(n){
    if(!n) return [];
    if(n.type==='busbar'){
      const horizontal = n.w >= n.h;
      // 1 port every ~40px, minimum 3
      const span = horizontal ? n.w : n.h;
      const count = Math.max(3, Math.round(span / 40) + 1);
      const ports = [];
      for(let i=0;i<count;i++){
        const t = count===1 ? 0.5 : i/(count-1);
        if(horizontal){
          ports.push({ id:'p'+i, x: n.x + n.w*t, y: n.y + n.h/2, t });
        } else {
          ports.push({ id:'p'+i, x: n.x + n.w/2, y: n.y + n.h*t, t });
        }
      }
      return ports;
    }
    if(n.type==='decision'){
      // diamond vertices: top, right, bottom, left
      const cx=n.x+n.w/2, cy=n.y+n.h/2;
      return [
        { id:'top',    x: cx,       y: n.y,      t:0 },
        { id:'right',  x: n.x+n.w,  y: cy,       t:1 },
        { id:'bottom', x: cx,       y: n.y+n.h,  t:2 },
        { id:'left',   x: n.x,      y: cy,       t:3 }
      ];
    }
    // rectangle / process / text — midpoints of each side
    const cx=n.x+n.w/2, cy=n.y+n.h/2;
    return [
      { id:'top',    x: cx,       y: n.y,      t:0 },
      { id:'right',  x: n.x+n.w,  y: cy,       t:1 },
      { id:'bottom', x: cx,       y: n.y+n.h,  t:2 },
      { id:'left',   x: n.x,      y: cy,       t:3 }
    ];
  }

  function attachPoint(n, other, portId, t){
    if(!n) return {x:0,y:0};
    const ports = portsOf(n);
    if(portId!=null){
      const p = ports.find(pp=>pp.id===portId || String(pp.t)===String(portId));
      if(p) return {x:p.x, y:p.y};
    }
    if(n.type==='busbar' && t!=null && !isNaN(t)){
      const horizontal = n.w >= n.h;
      const tt = Math.max(0, Math.min(1, t));
      if(horizontal) return { x: n.x + n.w*tt, y: n.y + n.h/2 };
      return { x: n.x + n.w/2, y: n.y + n.h*tt };
    }
    // nearest port toward other node, or center
    if(other){
      const ocx = other.x + other.w/2, ocy = other.y + other.h/2;
      let best=ports[0], bestD=Infinity;
      ports.forEach(p=>{
        const d=Math.hypot(p.x-ocx, p.y-ocy);
        if(d<bestD){ bestD=d; best=p; }
      });
      if(best) return {x:best.x, y:best.y};
    }
    return { x: n.x + n.w/2, y: n.y + n.h/2 };
  }

  window.pathForEdge = function(e){
    const a=nodeByIdLocal(e.from), b=nodeByIdLocal(e.to);
    if(!a||!b) return '';
    const p0 = attachPoint(a, b, e.fromPort, e.fromT);
    const p1 = attachPoint(b, a, e.toPort, e.toT);
    const pts = e.points || [];
    let d = 'M '+p0.x+' '+p0.y;
    pts.forEach(p=>{ d += ' L '+p.x+' '+p.y; });
    d += ' L '+p1.x+' '+p1.y;
    return d;
  };

  window.midOfEdge = function(e){
    const a=nodeByIdLocal(e.from), b=nodeByIdLocal(e.to);
    if(!a||!b) return {x:0,y:0};
    const pts=e.points||[];
    if(pts.length) return pts[Math.floor(pts.length/2)];
    const p0=attachPoint(a,b,e.fromPort,e.fromT), p1=attachPoint(b,a,e.toPort,e.toT);
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

  /** Find nearest useful port within radius (svg units) */
  function nearestPort(svgX, svgY, radius, excludeNodeId){
    radius = radius || 28;
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

  /* ===== Draw ports (subtle) + resize handles — NO permanent red edge handles ===== */
  function injectChrome(){
    const svg=$('canvas');
    if(!svg||!flow) return;

    svg.querySelectorAll('[data-node-resize],[data-port-dot],[data-ghost]').forEach(n=>n.remove());

    // Ports — subtle gray dots (only visible enough for orientation)
    (flow.nodes||[]).forEach(n=>{
      portsOf(n).forEach(p=>{
        const c = svgEl('circle', {
          'data-port-dot': n.id,
          'data-port-id': p.id,
          class: 'port-dot',
          cx: String(p.x), cy: String(p.y), r: '4'
        });
        svg.appendChild(c);
      });
    });

    // Node resize handle (blue square — keep)
    (flow.nodes||[]).forEach(n=>{
      const hx = n.x + n.w - 6;
      const hy = n.y + n.h - 6;
      const h = svgEl('rect', {
        'data-node-resize': n.id,
        class: 'resize-node',
        x: String(hx), y: String(hy),
        width: '11', height: '11', rx: '2'
      });
      h.addEventListener('mousedown', function(ev){
        if(isGuest()) return;
        ev.stopPropagation();
        ev.preventDefault();
        drag = { type: 'node-resize', id: n.id, ox: n.w, oy: n.h, sx: ev.clientX, sy: ev.clientY };
        selected = { kind:'node', id:n.id };
      });
      svg.appendChild(h);
    });

    // Wire edge hit areas for reconnect-by-proximity (no permanent red circles)
    wireEdgeHits(svg);
  }

  function wireEdgeHits(svg){
    // edge paths already have mousedown in base render; we intercept at capture on svg
    if(svg.dataset.sebEdge==='1') return;
    svg.dataset.sebEdge='1';
    svg.addEventListener('mousedown', function(ev){
      if(isGuest() || !flow) return;
      if(drag) return;
      const t = ev.target;
      if(!t) return;
      // only on edge stroke / hit
      const isEdge = t.classList && (t.classList.contains('edge') || t.classList.contains('edge-hit'));
      if(!isEdge) return;

      // Find which edge by walking — base doesn't store id on path; use selected or nearest mid
      const p = clientToSvg(ev.clientX, ev.clientY);
      let bestE=null, bestD=40, which='to';
      (flow.edges||[]).forEach(e=>{
        const a=nodeByIdLocal(e.from), b=nodeByIdLocal(e.to);
        if(!a||!b) return;
        const p0=attachPoint(a,b,e.fromPort,e.fromT);
        const p1=attachPoint(b,a,e.toPort,e.toT);
        const d0=Math.hypot(p0.x-p.x, p0.y-p.y);
        const d1=Math.hypot(p1.x-p.x, p1.y-p.y);
        // also distance to segment mid
        const mid={x:(p0.x+p1.x)/2,y:(p0.y+p1.y)/2};
        const dm=Math.hypot(mid.x-p.x, mid.y-p.y);
        if(d0<bestD){ bestD=d0; bestE=e; which='from'; }
        if(d1<bestD){ bestD=d1; bestE=e; which='to'; }
        if(dm<bestD && dm<18){ /* prefer ends over mid unless very close mid without end */ }
      });

      if(!bestE) return;
      // Only start reconnect if click is near an END (not pure middle)
      const a=nodeByIdLocal(bestE.from), b=nodeByIdLocal(bestE.to);
      const p0=attachPoint(a,b,bestE.fromPort,bestE.fromT);
      const p1=attachPoint(b,a,bestE.toPort,bestE.toT);
      const d0=Math.hypot(p0.x-p.x, p0.y-p.y);
      const d1=Math.hypot(p1.x-p.x, p1.y-p.y);
      if(Math.min(d0,d1) > 36) return; // too far from ends — let normal select happen

      which = d0 <= d1 ? 'from' : 'to';
      ev.stopPropagation();
      ev.preventDefault();

      selected = { kind:'edge', id:bestE.id };
      drag = {
        type: 'edge-reconnect',
        edgeId: bestE.id,
        which: which,
        sx: ev.clientX, sy: ev.clientY,
        fixed: which==='from'
          ? attachPoint(b,a,bestE.toPort,bestE.toT)
          : attachPoint(a,b,bestE.fromPort,bestE.fromT),
        excludeId: which==='from' ? bestE.to : bestE.from
      };
      // temporary detach visual
      bestE._reconnect = which;
      if(typeof render==='function') render();
      paintDragVisual(p.x, p.y, null);
    }, true);
  }

  function paintDragVisual(mx, my, snap){
    const svg=$('canvas');
    if(!svg || !drag || drag.type!=='edge-reconnect') return;
    svg.querySelectorAll('[data-ghost]').forEach(n=>n.remove());
    // clear hot ports
    svg.querySelectorAll('.port-dot.port-hot').forEach(el=>el.classList.remove('port-hot'));

    const fx = drag.fixed.x, fy = drag.fixed.y;
    const tx = snap ? snap.port.x : mx;
    const ty = snap ? snap.port.y : my;
    const line = svgEl('path', {
      'data-ghost': '1',
      class: 'ghost-line'+(snap?' ok':''),
      d: 'M '+fx+' '+fy+' L '+tx+' '+ty
    });
    svg.appendChild(line);

    if(snap){
      // highlight that port green
      const dots = svg.querySelectorAll('[data-port-dot="'+snap.node.id+'"][data-port-id="'+snap.port.id+'"]');
      dots.forEach(d=>d.classList.add('port-hot'));
      // also draw bigger green ring
      const ring = svgEl('circle', {
        'data-ghost':'1',
        cx: String(snap.port.x), cy: String(snap.port.y),
        r: '10', fill: 'none', stroke: '#22c55e', 'stroke-width': '2.5'
      });
      svg.appendChild(ring);
    }
  }

  const prevMove = window.onMove;
  window.onMove = function(ev){
    if(!drag || !flow){
      if(typeof prevMove==='function') return prevMove(ev);
      return;
    }
    const dx = ev.clientX - drag.sx;
    const dy = ev.clientY - drag.sy;

    if(drag.type === 'node-resize'){
      const n = nodeByIdLocal(drag.id);
      if(!n) return;
      const minW = n.type==='busbar' ? 80 : 60;
      const minH = n.type==='busbar' ? 16 : 32;
      n.w = Math.max(minW, drag.ox + dx);
      n.h = Math.max(minH, drag.oy + dy);
      if(typeof render==='function') render();
      return;
    }

    if(drag.type === 'edge-reconnect'){
      const p = clientToSvg(ev.clientX, ev.clientY);
      drag._mx = p.x; drag._my = p.y;
      const snap = nearestPort(p.x, p.y, 32, drag.excludeId);
      drag._snap = snap;
      paintDragVisual(p.x, p.y, snap);
      return;
    }

    if(typeof prevMove==='function') prevMove(ev);
  };

  const prevUp = window.onUp;
  window.onUp = function(ev){
    if(drag && drag.type === 'edge-reconnect' && flow){
      const e = (flow.edges||[]).find(x=>x.id===drag.edgeId);
      const snap = drag._snap;
      if(e && snap){
        if(drag.which==='from'){
          e.from = snap.node.id;
          e.fromPort = snap.port.id;
          if(snap.node.type==='busbar') e.fromT = snap.port.t;
          else delete e.fromT;
        } else {
          e.to = snap.node.id;
          e.toPort = snap.port.id;
          if(snap.node.type==='busbar') e.toT = snap.port.t;
          else delete e.toT;
        }
        delete e._reconnect;
        if(typeof toast==='function') toast('Conectado em '+snap.port.id);
        if(typeof saveLocal==='function') saveLocal();
      } else if(e){
        delete e._reconnect;
        if(typeof toast==='function') toast('Solte perto de um ponto de conexão (fica verde)', true);
      }
      drag = null;
      try{ window.drag = null; }catch(err){}
      const svg=$('canvas');
      if(svg) svg.querySelectorAll('[data-ghost]').forEach(n=>n.remove());
      if(typeof render==='function') render();
      if(typeof prevUp==='function') prevUp(ev);
      return;
    }
    if(drag && drag.type === 'node-resize'){
      drag = null;
      try{ window.drag = null; }catch(err){}
      if(typeof saveLocal==='function') saveLocal();
      if(typeof render==='function') render();
      if(typeof prevUp==='function') prevUp(ev);
      return;
    }
    if(typeof prevUp==='function') prevUp(ev);
  };

  window.addEventListener('mouseup', function(ev){
    if(drag && (drag.type==='edge-reconnect' || drag.type==='node-resize')){
      window.onUp(ev);
    }
  });

  const prevRender = window.render;
  window.render = function(){
    if(typeof prevRender==='function') prevRender.apply(this, arguments);
    const svg = $('canvas');
    if(svg && flow){
      svg.querySelectorAll('[data-busbar-overlay]').forEach(n=>n.remove());
      (flow.nodes||[]).filter(n=>n.type==='busbar').forEach(n=>{
        const bar = svgEl('rect', {
          x: String(n.x), y: String(n.y),
          width: String(n.w), height: String(n.h),
          rx: '4', class: 'busbar-shape',
          'data-busbar-overlay': n.id,
          'pointer-events': 'none'
        });
        svg.appendChild(bar);
        const lab = svgEl('text', {
          x: String(n.x + n.w/2), y: String(n.y - 6),
          'text-anchor': 'middle', 'font-size': '10', fill: '#64748b',
          'pointer-events': 'none'
        }, [n.title || 'Barramento']);
        svg.appendChild(lab);
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
    const n = {
      id: uid('bus'),
      macro: null,
      type: 'busbar',
      title: 'Barramento',
      x: 200 + Math.random()*80,
      y: 200 + Math.random()*60,
      w: 200,
      h: 18
    };
    if(flow.macros && flow.macros.length){
      const m = flow.macros[flow.macros.length-1];
      n.macro = m.id;
      n.x = m.x + 40;
      n.y = m.y + Math.max(30, m.h/2 - 9);
    }
    flow.nodes.push(n);
    selected = { kind:'node', id:n.id };
    if(typeof saveLocal==='function') saveLocal();
    if(typeof render==='function') render();
    if(typeof openModal==='function') openModal();
    if(typeof toast==='function') toast('Barramento · 3+ portas de conexão');
  }

  function ensureBusbarButton(){
    let b = $('btnAddBusbar');
    if(!b){
      const ref = $('btnAddMacro') || $('btnAddProcess');
      if(!ref) return;
      b = document.createElement('button');
      b.type = 'button'; b.className = 'btn'; b.id = 'btnAddBusbar';
      b.title = 'Barramento'; b.textContent = '⚡';
      ref.parentNode.insertBefore(b, ref.nextSibling);
    }
    b.onclick = function(ev){ ev.preventDefault(); createBusbar(); };
    const bt = $('boardTools');
    if(bt){
      let b2 = $('btnAddBusbar2');
      if(!b2){
        b2 = document.createElement('button');
        b2.type='button'; b2.className='btn'; b2.id='btnAddBusbar2';
        b2.textContent='⚡'; b2.title='Barramento';
        bt.appendChild(b2);
      }
      b2.onclick = function(ev){ ev.preventDefault(); createBusbar(); };
    }
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
  };

  function boot(){
    ensureBusbarButton();
    const ta = $('sideNameMulti');
    if(ta && ta.dataset.wired!=='1'){
      ta.dataset.wired='1';
      ta.addEventListener('input', function(){
        if(!selected || !flow) return;
        if(selected.kind==='node'){
          const n = nodeByIdLocal(selected.id);
          if(n){ n.title = ta.value; if(typeof saveLocal==='function') saveLocal(); if(typeof render==='function') render(); }
        } else if(selected.kind==='macro'){
          const m = typeof macroById==='function' ? macroById(selected.id) : null;
          if(m){ m.title = ta.value; if(typeof saveLocal==='function') saveLocal(); if(typeof render==='function') render(); }
        } else if(selected.kind==='edge'){
          const e = (flow.edges||[]).find(x=>x.id===selected.id);
          if(e){ e.label = ta.value; if(typeof saveLocal==='function') saveLocal(); if(typeof render==='function') render(); }
        }
      });
    }
    function applyEdgeEnds(){
      if(!selected || selected.kind!=='edge' || !flow) return;
      const e = (flow.edges||[]).find(x=>x.id===selected.id);
      if(!e) return;
      const fromSel = $('edgeFromSel'), toSel = $('edgeToSel');
      if(fromSel && fromSel.value){ e.from = fromSel.value; delete e.fromPort; delete e.fromT; }
      if(toSel && toSel.value){ e.to = toSel.value; delete e.toPort; delete e.toT; }
      if(typeof saveLocal==='function') saveLocal();
      if(typeof render==='function') render();
    }
    const fromSel = $('edgeFromSel'), toSel = $('edgeToSel');
    if(fromSel && fromSel.dataset.wired!=='1'){ fromSel.dataset.wired='1'; fromSel.onchange = applyEdgeEnds; }
    if(toSel && toSel.dataset.wired!=='1'){ toSel.dataset.wired='1'; toSel.onchange = applyEdgeEnds; }
  }

  boot();
  setTimeout(boot, 400);
  setTimeout(boot, 1200);
  setTimeout(boot, 2500);

  console.log('[Fluxora] shapes-edges-busbar v20261007c ports+snap ready');
})();
