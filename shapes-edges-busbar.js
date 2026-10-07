/* Node resize · multiline title · edge dropdowns + drag reconnect · barramento */
(function(){
  function $(id){ return document.getElementById(id); }
  function isGuest(){ return window.HEMOPI_SHARE_MODE==='guest'; }
  function uid(p){ return p+Math.random().toString(36).slice(2,9); }

  if(!document.getElementById('seb-css')){
    const st=document.createElement('style');
    st.id='seb-css';
    st.textContent=`
      .resize-node{cursor:nwse-resize;fill:#1a5f8a;stroke:#fff;stroke-width:1}
      .edge-handle{cursor:grab;fill:#fff;stroke:#c41e3a;stroke-width:2}
      .edge-handle:hover{fill:#fee2e2}
      #sideNameMulti{width:100%;min-height:72px;resize:vertical;border:1px solid #d0d8e2;border-radius:8px;padding:8px;font:inherit}
      .edge-dd-row{display:flex;flex-direction:column;gap:6px;margin:8px 0}
      .edge-dd-row label{font-size:.7rem;font-weight:700}
      .edge-dd-row select{width:100%;padding:8px;border-radius:8px;border:1px solid #d0d8e2;font:inherit}
      .busbar-shape{fill:#1e293b;stroke:#0f172a}
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

  /** Attachment point on node (busbar supports t 0..1 along main axis) */
  function attachPoint(n, other, t){
    if(!n) return {x:0,y:0};
    if(n.type==='busbar'){
      const horizontal = n.w >= n.h;
      const tt = (t!=null && !isNaN(t)) ? Math.max(0, Math.min(1, t)) : 0.5;
      if(horizontal){
        return { x: n.x + n.w * tt, y: n.y + n.h/2 };
      }
      return { x: n.x + n.w/2, y: n.y + n.h * tt };
    }
    // default: center
    return { x: n.x + n.w/2, y: n.y + n.h/2 };
  }

  function inferTOnBusbar(bus, px, py){
    if(!bus || bus.type!=='busbar') return 0.5;
    if(bus.w >= bus.h){
      return Math.max(0, Math.min(1, (px - bus.x) / Math.max(1, bus.w)));
    }
    return Math.max(0, Math.min(1, (py - bus.y) / Math.max(1, bus.h)));
  }

  /** Override pathForEdge for busbar ports + waypoints */
  window.pathForEdge = function(e){
    const a=nodeByIdLocal(e.from), b=nodeByIdLocal(e.to);
    if(!a||!b) return '';
    const p0 = attachPoint(a, b, e.fromT);
    const p1 = attachPoint(b, a, e.toT);
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
    const p0=attachPoint(a,b,e.fromT), p1=attachPoint(b,a,e.toT);
    return {x:(p0.x+p1.x)/2, y:(p0.y+p1.y)/2};
  };

  /* ===== After render: resize handles on nodes + edge endpoint handles ===== */
  function injectNodeChrome(){
    const svg=$('canvas');
    if(!svg||!flow) return;

    // Node resize handles
    svg.querySelectorAll('[data-node-resize]').forEach(n=>n.remove());
    (flow.nodes||[]).forEach(n=>{
      // Find node group by scanning — append handle at absolute coords
      const hx = n.x + n.w - 6;
      const hy = n.y + n.h - 6;
      const h = svgEl('rect', {
        'data-node-resize': n.id,
        class: 'resize-node',
        x: String(hx), y: String(hy),
        width: '12', height: '12', rx: '2'
      });
      h.addEventListener('mousedown', function(ev){
        if(isGuest()) return;
        ev.stopPropagation();
        ev.preventDefault();
        drag = {
          type: 'node-resize',
          id: n.id,
          ox: n.w, oy: n.h,
          sx: ev.clientX, sy: ev.clientY
        };
        selected = { kind:'node', id:n.id };
      });
      svg.appendChild(h);
    });

    // Edge endpoint handles (from / to) for reconnect drag
    svg.querySelectorAll('[data-edge-end]').forEach(n=>n.remove());
    (flow.edges||[]).forEach(e=>{
      const a=nodeByIdLocal(e.from), b=nodeByIdLocal(e.to);
      if(!a||!b) return;
      const p0=attachPoint(a,b,e.fromT), p1=attachPoint(b,a,e.toT);
      [['from',p0],['to',p1]].forEach(([which,p])=>{
        const c=svgEl('circle',{
          'data-edge-end': e.id,
          'data-which': which,
          class: 'edge-handle',
          cx: String(p.x), cy: String(p.y), r: '7'
        });
        c.addEventListener('mousedown', function(ev){
          if(isGuest()) return;
          ev.stopPropagation();
          ev.preventDefault();
          drag = {
            type: 'edge-reconnect',
            edgeId: e.id,
            which: which,
            sx: ev.clientX, sy: ev.clientY
          };
          selected = { kind:'edge', id:e.id };
        });
        svg.appendChild(c);
      });
    });
  }

  /* ===== onMove extensions ===== */
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
      // visual only while dragging — snap on mouseup
      drag._mx = ev.clientX;
      drag._my = ev.clientY;
      // optional: show temp line via re-render with ghost — skip for perf
      return;
    }

    if(typeof prevMove==='function') prevMove(ev);
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

  function nearestNode(svgX, svgY, maxDist){
    maxDist = maxDist || 48;
    let best=null, bestD=maxDist;
    (flow.nodes||[]).forEach(n=>{
      // distance to box (or to busbar segment)
      let d;
      if(n.type==='busbar'){
        const ap = attachPoint(n, null, inferTOnBusbar(n, svgX, svgY));
        d = Math.hypot(ap.x - svgX, ap.y - svgY);
      } else {
        const cx=n.x+n.w/2, cy=n.y+n.h/2;
        const dx=Math.max(n.x-svgX, 0, svgX-(n.x+n.w));
        const dy=Math.max(n.y-svgY, 0, svgY-(n.y+n.h));
        d = Math.hypot(dx, dy);
        if(svgX>=n.x && svgX<=n.x+n.w && svgY>=n.y && svgY<=n.y+n.h) d=0;
      }
      if(d < bestD){ bestD=d; best=n; }
    });
    return best;
  }

  const prevUp = window.onUp;
  window.onUp = function(ev){
    if(drag && drag.type === 'edge-reconnect' && flow){
      const e = (flow.edges||[]).find(x=>x.id===drag.edgeId);
      if(e && (drag._mx!=null || ev)){
        const cx = drag._mx != null ? drag._mx : (ev && ev.clientX);
        const cy = drag._my != null ? drag._my : (ev && ev.clientY);
        if(cx!=null){
          const p = clientToSvg(cx, cy);
          const target = nearestNode(p.x, p.y, 56);
          if(target){
            if(drag.which==='from'){
              e.from = target.id;
              if(target.type==='busbar') e.fromT = inferTOnBusbar(target, p.x, p.y);
              else delete e.fromT;
            } else {
              e.to = target.id;
              if(target.type==='busbar') e.toT = inferTOnBusbar(target, p.x, p.y);
              else delete e.toT;
            }
            if(typeof toast==='function') toast('Conexão religada');
            if(typeof saveLocal==='function') saveLocal();
          }
        }
      }
      drag = null;
      try{ window.drag = null; }catch(err){}
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

  // also pointerup
  window.addEventListener('mouseup', function(ev){
    if(drag && (drag.type==='edge-reconnect' || drag.type==='node-resize')){
      window.onUp(ev);
    }
  });

  /* ===== Render wrapper: busbar shape + multiline (already in base) ===== */
  const prevRender = window.render;
  window.render = function(){
    // Pre-patch: ensure busbars render — inject by temporary type alias
    // Base render draws rect for non-decision; busbar is rect — OK
    if(typeof prevRender==='function') prevRender.apply(this, arguments);

    // Restyle busbars after render
    const svg = $('canvas');
    if(svg && flow){
      (flow.nodes||[]).filter(n=>n.type==='busbar').forEach(n=>{
        // overlay darker bar
        const bar = svgEl('rect', {
          x: String(n.x), y: String(n.y),
          width: String(n.w), height: String(n.h),
          rx: '4',
          class: 'busbar-shape',
          'data-busbar-overlay': n.id,
          'pointer-events': 'none'
        });
        svg.appendChild(bar);
        // small label above
        const lab = svgEl('text', {
          x: String(n.x + n.w/2), y: String(n.y - 6),
          'text-anchor': 'middle', 'font-size': '10', fill: '#64748b',
          'pointer-events': 'none'
        }, [n.title || 'Barramento']);
        svg.appendChild(lab);
      });
    }
    try{ injectNodeChrome(); }catch(e){}
  };

  /* ===== Modal: multiline title + edge from/to selects ===== */
  function ensureMultiTitle(){
    const name = $('sideName');
    if(!name) return;
    let ta = $('sideNameMulti');
    if(!ta){
      ta = document.createElement('textarea');
      ta.id = 'sideNameMulti';
      ta.rows = 3;
      ta.placeholder = 'Título (várias linhas)';
      name.parentNode.insertBefore(ta, name.nextSibling);
      name.style.display = 'none';
      ta.addEventListener('input', function(){
        if(!selected || !flow) return;
        if(selected.kind==='node'){
          const n = nodeByIdLocal(selected.id);
          if(n){ n.title = ta.value; if(typeof saveLocal==='function') saveLocal(); if(typeof render==='function') render(); }
        } else if(selected.kind==='macro'){
          const m = typeof macroById==='function' ? macroById(selected.id) : null;
          if(m){ m.title = ta.value; if(typeof saveLocal==='function') saveLocal(); if(typeof render==='function') render(); if(typeof renderMacroBar==='function') renderMacroBar(); }
        } else if(selected.kind==='edge'){
          const e = (flow.edges||[]).find(x=>x.id===selected.id);
          if(e){ e.label = ta.value; if(typeof saveLocal==='function') saveLocal(); if(typeof render==='function') render(); }
        }
      });
    }
  }

  function ensureEdgeDropdowns(){
    let box = $('edgeDdBox');
    if(!box){
      box = document.createElement('div');
      box.id = 'edgeDdBox';
      box.className = 'edge-dd-row';
      box.hidden = true;
      box.innerHTML =
        '<label>Origem (de)</label><select id="edgeFromSel"></select>'+
        '<label>Destino (para)</label><select id="edgeToSel"></select>'+
        '<p class="muted" style="font-size:11px;margin:0">Ou arraste as alças vermelhas nas pontas da linha até outra forma / barramento.</p>';
      const meta = $('sideMeta');
      if(meta && meta.parentNode) meta.parentNode.insertBefore(box, meta.nextSibling);

      function applyEdgeEnds(){
        if(!selected || selected.kind!=='edge' || !flow) return;
        const e = (flow.edges||[]).find(x=>x.id===selected.id);
        if(!e) return;
        const fromId = $('edgeFromSel').value;
        const toId = $('edgeToSel').value;
        if(fromId) e.from = fromId;
        if(toId) e.to = toId;
        const a = nodeByIdLocal(e.from), b = nodeByIdLocal(e.to);
        if(a && a.type==='busbar' && e.fromT==null) e.fromT = 0.5;
        if(b && b.type==='busbar' && e.toT==null) e.toT = 0.5;
        if(a && a.type!=='busbar') delete e.fromT;
        if(b && b.type!=='busbar') delete e.toT;
        if(typeof saveLocal==='function') saveLocal();
        if(typeof render==='function') render();
      }
      $('edgeFromSel').onchange = applyEdgeEnds;
      $('edgeToSel').onchange = applyEdgeEnds;
    }
  }

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

  const prevRefresh = window.refreshSide;
  window.refreshSide = function(){
    if(typeof prevRefresh==='function'){
      try{ prevRefresh.apply(this, arguments); }catch(e){}
    }
    ensureMultiTitle();
    ensureEdgeDropdowns();
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
      if(ta){ ta.style.display='block'; ta.value = e ? (e.label||'') : ''; ta.placeholder='Rótulo (SIM / NÃO…)'; }
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

  /* ===== Add Barramento button ===== */
  function ensureBusbarButton(){
    if($('btnAddBusbar')) return;
    const ref = $('btnAddMacro') || $('btnAddProcess');
    if(!ref) return;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn';
    b.id = 'btnAddBusbar';
    b.title = 'Barramento (junção)';
    b.textContent = '⚡';
    ref.parentNode.insertBefore(b, ref.nextSibling);
    b.onclick = function(){
      if(isGuest() || !flow) return;
      // prefer module-bind picker if exists — create busbar with macro null then user assigns
      if(typeof openPick === 'function'){
        // not exported — create then assign via modal
      }
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
      // if macros exist, attach to last
      if(flow.macros && flow.macros.length){
        const m = flow.macros[flow.macros.length-1];
        n.macro = m.id;
        n.x = m.x + 40;
        n.y = m.y + m.h/2;
      }
      flow.nodes.push(n);
      selected = { kind:'node', id:n.id };
      if(typeof saveLocal==='function') saveLocal();
      if(typeof render==='function') render();
      if(typeof openModal==='function') openModal();
      if(typeof toast==='function') toast('Barramento criado — ligue conexões nas alças');
    };

    // also on board tools
    const bt = $('boardTools');
    if(bt && !$('btnAddBusbar2')){
      const b2 = document.createElement('button');
      b2.type='button'; b2.className='btn'; b2.id='btnAddBusbar2'; b2.textContent='⚡'; b2.title='Barramento';
      b2.onclick = function(){ b.click(); };
      bt.appendChild(b2);
    }
  }

  // Double-click edge midpoint to add waypoint (bifurcation helper)
  document.addEventListener('dblclick', function(ev){
    if(isGuest() || !flow) return;
    const t = ev.target;
    if(!t || !t.classList || !(t.classList.contains('edge') || t.classList.contains('edge-hit'))) return;
    // find selected edge
    if(!selected || selected.kind!=='edge') return;
    const e = (flow.edges||[]).find(x=>x.id===selected.id);
    if(!e) return;
    const p = clientToSvg(ev.clientX, ev.clientY);
    if(!e.points) e.points = [];
    e.points.push({x:p.x, y:p.y});
    if(typeof saveLocal==='function') saveLocal();
    if(typeof render==='function') render();
    if(typeof toast==='function') toast('Ponto de curva adicionado');
  });

  function boot(){
    ensureMultiTitle();
    ensureEdgeDropdowns();
    ensureBusbarButton();
    enhanceRefreshSideSafe();
  }
  function enhanceRefreshSideSafe(){
    // already wrapped above
  }

  boot();
  setTimeout(boot, 400);
  setTimeout(boot, 1200);
  setTimeout(boot, 2500);

  // re-inject after render
  setTimeout(function(){
    if(typeof render==='function'){
      const r = window.render;
      // already wrapped
    }
  }, 100);

  console.log('[Fluxora] shapes-edges-busbar ready');
})();
