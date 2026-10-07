/* Board viewport: fit · zoom · marquee · FS controls · mobile UX · v20261007i */
(function(){
  function $(id){ return document.getElementById(id); }

  const VP = {
    scale: 1,
    panX: 0,
    panY: 0,
    fittedOnce: false,
    anim: null
  };
  window.__BOARD_VP = VP;

  if(!document.getElementById('board-vp-css')){
    const st=document.createElement('style');
    st.id='board-vp-css';
    st.textContent=`
      .canvas-wrap{
        position:relative!important;
        overflow:hidden!important;
        background:#f1f5f9;
        touch-action:none;
      }
      .canvas-wrap #canvas{
        transform-origin:0 0;
        transition:none;
        display:block;
      }
      .canvas-wrap.vp-animating #canvas{
        transition:transform .28s ease-out;
      }
      .vp-controls{
        position:absolute;top:10px;right:10px;z-index:40;
        display:flex;gap:6px;align-items:center;
      }
      .vp-controls button{
        border:1px solid #cbd5e1;background:#fff;color:#0f172a;
        border-radius:10px;padding:8px 10px;font-size:13px;font-weight:700;
        cursor:pointer;box-shadow:0 2px 8px rgba(15,23,42,.08);
        line-height:1;min-width:40px;
      }
      .vp-controls button:hover{background:#f8fafc}
      .vp-controls button.active{background:#0f172a;color:#fff;border-color:#0f172a}
      .vp-marquee{
        position:absolute;pointer-events:none;z-index:35;
        border:1.5px dashed #64748b;
        background:rgba(100,116,139,.18);
        border-radius:2px;
      }
      body.board-max .vp-controls{top:12px;right:12px}

      /* ===== MOBILE UX ===== */
      @media (max-width:768px){
        html,body{overflow-x:hidden;overflow-y:auto!important;height:auto!important;min-height:100%}
        #appMain.app{
          height:auto!important;min-height:100vh;overflow:visible!important;
          display:flex;flex-direction:column;
          padding:8px!important;
        }
        #appMain .hero{padding:10px!important;margin-bottom:6px!important;flex-shrink:0}
        #appMain .hero h1{font-size:1rem}
        #appMain .tagline{display:none}
        #appMain .toolbar{
          flex-wrap:nowrap!important;overflow-x:auto;overflow-y:hidden;
          -webkit-overflow-scrolling:touch;
          gap:8px;padding:6px!important;
          scrollbar-width:none;
        }
        #appMain .toolbar::-webkit-scrollbar{display:none}
        #appMain .toolbar .tool-group{
          flex-wrap:nowrap!important;flex-shrink:0;white-space:nowrap;
        }
        #appMain .toolbar .prog-wrap{display:none}
        #appMain .presence-bar,
        #appMain .project-header.collapsed-mobile,
        #appMain .share-panel.collapsed-mobile{display:none!important}
        #appMain .project-header:not(.collapsed-mobile),
        #appMain .share-panel:not(.collapsed-mobile){
          max-height:40vh;overflow:auto;
        }
        #appMain .workspace{
          display:flex!important;flex-direction:column!important;
          flex:1 1 auto;min-height:70vh!important;
          grid-template-columns:1fr!important;
        }
        #appMain .palette{
          width:100%!important;max-height:88px;overflow-x:auto;overflow-y:hidden;
          display:flex!important;flex-direction:row!important;flex-wrap:nowrap;
          gap:6px;padding:6px;order:0;
        }
        #appMain .canvas-wrap{
          flex:1 1 auto;min-height:65vh!important;height:65vh!important;
          order:1;
        }
        #boardTools{
          overflow-x:auto;flex-wrap:nowrap!important;
          scrollbar-width:none;
        }
        #boardTools::-webkit-scrollbar{display:none}
        .mobile-collapse-bar{
          display:flex;gap:6px;margin:4px 0 6px;flex-wrap:wrap;
        }
        .mobile-collapse-bar button{
          font-size:11px;padding:5px 10px;border-radius:999px;
          border:1px solid #cbd5e1;background:#fff;font-weight:700;cursor:pointer;
        }
        .mobile-collapse-bar button.on{background:#0f172a;color:#fff;border-color:#0f172a}
      }
      @media (min-width:769px){
        .mobile-collapse-bar{display:none!important}
      }
    `;
    document.head.appendChild(st);
  }

  function wrapEl(){ return document.querySelector('.canvas-wrap'); }
  function svgEl(){ return $('canvas'); }

  function applyTransform(animate){
    const svg = svgEl();
    const wrap = wrapEl();
    if(!svg || !wrap) return;
    if(animate) wrap.classList.add('vp-animating');
    else wrap.classList.remove('vp-animating');
    svg.style.transform = 'translate('+VP.panX+'px,'+VP.panY+'px) scale('+VP.scale+')';
    if(animate){
      clearTimeout(VP.anim);
      VP.anim = setTimeout(function(){ wrap.classList.remove('vp-animating'); }, 300);
    }
  }

  function contentBounds(){
    if(typeof flow==='undefined' || !flow) return {x:0,y:0,w:800,h:600};
    let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
    const hit = (x,y,w,h)=>{
      minX=Math.min(minX,x); minY=Math.min(minY,y);
      maxX=Math.max(maxX,x+w); maxY=Math.max(maxY,y+h);
    };
    (flow.macros||[]).forEach(m=>hit(m.x,m.y,m.w,m.h));
    (flow.nodes||[]).forEach(n=>hit(n.x,n.y,n.w,n.h));
    if(!isFinite(minX)) return {x:0,y:0,w:800,h:600};
    return { x:minX, y:minY, w:Math.max(80,maxX-minX), h:Math.max(80,maxY-minY) };
  }

  function fitBoardToScreen(animate){
    const wrap = wrapEl();
    if(!wrap) return;
    const bb = contentBounds();
    const pad = 48;
    const ww = wrap.clientWidth || 800;
    const wh = wrap.clientHeight || 600;
    const sx = (ww - pad*2) / bb.w;
    const sy = (wh - pad*2) / bb.h;
    let scale = Math.min(sx, sy, 1.25);
    if(scale < 0.15) scale = 0.15;
    VP.scale = scale;
    VP.panX = (ww - bb.w * scale) / 2 - bb.x * scale;
    VP.panY = (wh - bb.h * scale) / 2 - bb.y * scale;
    applyTransform(!!animate);
    VP.fittedOnce = true;
  }
  window.fitBoardToScreen = fitBoardToScreen;

  function fitRect(rx, ry, rw, rh, animate){
    const wrap = wrapEl();
    if(!wrap || rw < 8 || rh < 8) return;
    const pad = 24;
    const ww = wrap.clientWidth || 800;
    const wh = wrap.clientHeight || 600;
    let scale = Math.min((ww-pad*2)/rw, (wh-pad*2)/rh, 2.5);
    if(scale < 0.2) scale = 0.2;
    VP.scale = scale;
    VP.panX = (ww - rw * scale) / 2 - rx * scale;
    VP.panY = (wh - rh * scale) / 2 - ry * scale;
    applyTransform(!!animate);
  }

  function screenToContent(clientX, clientY){
    const wrap = wrapEl();
    if(!wrap) return {x:0,y:0};
    const r = wrap.getBoundingClientRect();
    const x = (clientX - r.left - VP.panX) / VP.scale;
    const y = (clientY - r.top - VP.panY) / VP.scale;
    return {x:x, y:y};
  }

  function ensureControls(){
    const wrap = wrapEl();
    if(!wrap) return;
    let box = wrap.querySelector('.vp-controls');
    if(!box){
      box = document.createElement('div');
      box.className = 'vp-controls';
      box.innerHTML =
        '<button type="button" id="btnVpFit" title="Zoom total (encaixar)">⬚</button>'+
        '<button type="button" id="btnVpFs" title="Tela cheia">⛶</button>'+
        '<button type="button" id="btnVpDup" title="Duplicar seleção">⧉</button>';
      wrap.appendChild(box);
    }
    const fit = $('btnVpFit');
    const fs = $('btnVpFs');
    const dup = $('btnVpDup');
    if(fit) fit.onclick = function(ev){ ev.preventDefault(); fitBoardToScreen(true); };
    if(fs) fs.onclick = function(ev){
      ev.preventDefault();
      const on = !document.body.classList.contains('board-max');
      document.body.classList.toggle('board-max', on);
      this.classList.toggle('active', on);
      this.title = on ? 'Sair da tela cheia' : 'Tela cheia';
      // sync legacy board tools button label if present
      const legacy = $('btnBoardMax');
      if(legacy) legacy.textContent = on ? '✕ Sair da tela cheia' : '⛶ Maximizar';
      setTimeout(function(){ fitBoardToScreen(true); }, 80);
    };
    if(dup) dup.onclick = function(ev){
      ev.preventDefault();
      if(typeof window.duplicateSelection==='function') window.duplicateSelection();
      else if(typeof toast==='function') toast('Duplicar indisponível', true);
    };
  }

  /* Marquee zoom on empty board */
  let marquee = null;
  function clearMarquee(){
    if(marquee && marquee.el && marquee.el.parentNode) marquee.el.parentNode.removeChild(marquee.el);
    marquee = null;
  }

  function isBackgroundTarget(t){
    if(!t) return false;
    if(t.id === 'canvas') return true;
    if(t.classList && t.classList.contains('canvas-wrap')) return true;
    // plain svg rect without data handlers — allow macro fill? only pure svg root
    return false;
  }

  function wireMarquee(){
    const wrap = wrapEl();
    if(!wrap || wrap.dataset.vpMarquee==='1') return;
    wrap.dataset.vpMarquee = '1';

    wrap.addEventListener('mousedown', function(ev){
      if(ev.button !== 0) return;
      if(typeof drag!=='undefined' && drag) return;
      if(window.__sebDrag) return;
      const t = ev.target;
      // only empty board / svg root — not nodes, edges, handles
      if(t.closest && (t.closest('[data-node-resize]') || t.closest('.edge') || t.closest('.edge-hit'))) return;
      if(t.closest && t.closest('.vp-controls')) return;
      const tag = (t.tagName||'').toLowerCase();
      const onEmpty = (t.id==='canvas') || (tag==='svg') ||
        (tag==='rect' && t.classList && t.classList.contains('macro-box') && ev.shiftKey);
      // free marquee only on svg background itself
      if(t.id !== 'canvas' && tag !== 'svg'){
        // allow if clicking directly on canvas-wrap padding area
        if(!t.classList || !t.classList.contains('canvas-wrap')) return;
      }
      // Don't start marquee if clicking a shape group — shapes stopPropagation usually
      if(tag==='text' || tag==='path' || tag==='circle' || (tag==='rect' && !t.classList.contains('macro-box'))){
        if(t.id !== 'canvas') return;
      }

      const r = wrap.getBoundingClientRect();
      const x0 = ev.clientX - r.left;
      const y0 = ev.clientY - r.top;
      clearMarquee();
      const el = document.createElement('div');
      el.className = 'vp-marquee';
      el.style.left = x0+'px';
      el.style.top = y0+'px';
      el.style.width = '0px';
      el.style.height = '0px';
      wrap.appendChild(el);
      marquee = { el:el, x0:x0, y0:y0, cx0:ev.clientX, cy0:ev.clientY };
      ev.preventDefault();
    });

    window.addEventListener('mousemove', function(ev){
      if(!marquee) return;
      const wrap = wrapEl();
      if(!wrap) return;
      const r = wrap.getBoundingClientRect();
      const x1 = ev.clientX - r.left;
      const y1 = ev.clientY - r.top;
      const l = Math.min(marquee.x0, x1);
      const t = Math.min(marquee.y0, y1);
      const w = Math.abs(x1 - marquee.x0);
      const h = Math.abs(y1 - marquee.y0);
      marquee.el.style.left = l+'px';
      marquee.el.style.top = t+'px';
      marquee.el.style.width = w+'px';
      marquee.el.style.height = h+'px';
    });

    window.addEventListener('mouseup', function(ev){
      if(!marquee) return;
      const wrap = wrapEl();
      const el = marquee.el;
      const w = parseFloat(el.style.width)||0;
      const h = parseFloat(el.style.height)||0;
      const left = parseFloat(el.style.left)||0;
      const top = parseFloat(el.style.top)||0;
      clearMarquee();
      if(w < 20 || h < 20) return;
      // screen rect in wrap → content
      const x = (left - VP.panX) / VP.scale;
      const y = (top - VP.panY) / VP.scale;
      const cw = w / VP.scale;
      const ch = h / VP.scale;
      fitRect(x, y, cw, ch, true);
    });
  }

  /* Scale-aware drag deltas for node/macro move */
  const prevMove = window.onMove;
  window.onMove = function(ev){
    if(typeof drag!=='undefined' && drag && (drag.type==='node' || drag.type==='macro')){
      // rewrite sx tracking: convert client delta to content delta
      const s = VP.scale || 1;
      const dx = (ev.clientX - drag.sx) / s;
      const dy = (ev.clientY - drag.sy) / s;
      // temporarily spoof by adjusting — call original with scaled synthetic is hard;
      // instead apply ourselves for node/macro when scaled
      if(s !== 1 && flow){
        if(drag.type==='node'){
          const n = typeof nodeById==='function' ? nodeById(drag.id) : (flow.nodes||[]).find(x=>x.id===drag.id);
          if(n){ n.x = drag.ox + dx; n.y = drag.oy + dy; if(typeof render==='function') render(); }
          return;
        }
        if(drag.type==='macro'){
          const m = typeof macroById==='function' ? macroById(drag.id) : (flow.macros||[]).find(x=>x.id===drag.id);
          if(m){
            const nx = drag.ox + dx, ny = drag.oy + dy;
            const pdx = nx - (drag._lastX!=null?drag._lastX:drag.ox);
            const pdy = ny - (drag._lastY!=null?drag._lastY:drag.oy);
            m.x = nx; m.y = ny;
            (flow.nodes||[]).forEach(n=>{ if(n.macro===m.id){ n.x+=pdx; n.y+=pdy; }});
            drag._lastX = nx; drag._lastY = ny;
            if(typeof render==='function') render();
          }
          return;
        }
      }
    }
    if(typeof prevMove==='function') return prevMove(ev);
  };

  /* After render — re-apply transform; first time fit */
  const prevRender = window.render;
  window.render = function(){
    if(typeof prevRender==='function') prevRender.apply(this, arguments);
    applyTransform(false);
    ensureControls();
    if(!VP.fittedOnce){
      requestAnimationFrame(function(){ fitBoardToScreen(false); });
    }
  };

  /* Mobile collapse toggles for header / share */
  function ensureMobileChrome(){
    const app = $('appMain');
    if(!app || app.querySelector('.mobile-collapse-bar')) return;
    const bar = document.createElement('div');
    bar.className = 'mobile-collapse-bar';
    bar.innerHTML =
      '<button type="button" data-mc="header">Projeto</button>'+
      '<button type="button" data-mc="share">Ações</button>'+
      '<button type="button" data-mc="fit">Zoom total</button>';
    const toolbar = app.querySelector('.toolbar');
    if(toolbar && toolbar.parentNode){
      toolbar.parentNode.insertBefore(bar, toolbar.nextSibling);
    } else {
      app.insertBefore(bar, app.firstChild);
    }
    // default collapsed on narrow screens
    const ph = $('projectHeader');
    const sp = document.querySelector('.share-panel');
    if(window.innerWidth <= 768){
      if(ph) ph.classList.add('collapsed-mobile');
      if(sp) sp.classList.add('collapsed-mobile');
    }
    bar.addEventListener('click', function(ev){
      const b = ev.target.closest('button[data-mc]');
      if(!b) return;
      const k = b.getAttribute('data-mc');
      if(k==='fit'){ fitBoardToScreen(true); return; }
      if(k==='header'){
        if(ph){ ph.classList.toggle('collapsed-mobile'); b.classList.toggle('on', !ph.classList.contains('collapsed-mobile')); }
      }
      if(k==='share'){
        if(sp){ sp.classList.toggle('collapsed-mobile'); b.classList.toggle('on', !sp.classList.contains('collapsed-mobile')); }
      }
    });
  }

  function boot(){
    ensureControls();
    wireMarquee();
    ensureMobileChrome();
    // Hide legacy maximizar outside board if present (keep function via our FS btn)
    const legacyBar = $('boardTools');
    if(legacyBar){
      const b = $('btnBoardMax');
      if(b) b.style.display = 'none';
    }
    if(typeof flow!=='undefined' && flow && (flow.nodes||[]).length){
      fitBoardToScreen(false);
    }
  }

  boot();
  setTimeout(boot, 400);
  setTimeout(boot, 1200);
  window.addEventListener('resize', function(){
    if(VP.fittedOnce) fitBoardToScreen(false);
  });

  console.log('[Fluxora] board-viewport v20261007i');
})();
