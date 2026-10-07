/* Macro 💬 + cascade vote to children nodes AND edges + edge origin/dest in modal + autosave */
(function(){
  function voteKey(k,id){ return (typeof window.voteKey==='function') ? window.voteKey(k,id) : (k+':'+id); }

  function applyVoteOnKey(key, val){
    if(!flow.votes) flow.votes = {};
    if(!flow.votes[key]) flow.votes[key] = {ok:0, no:0, mine:null};
    const v = flow.votes[key];
    if(v.mine === 'ok') v.ok = Math.max(0, (v.ok||0)-1);
    if(v.mine === 'no') v.no = Math.max(0, (v.no||0)-1);
    if(val === 'ok'){ v.ok = (v.ok||0)+1; v.mine = 'ok'; }
    else if(val === 'no'){ v.no = (v.no||0)+1; v.mine = 'no'; }
    else { v.mine = null; }
  }

  /** Macro OK/NO → nodes inside + edges touching that macro */
  function cascadeMacroVote(macroId, val){
    if(!flow) return;
    if(!flow.votes) flow.votes = {};

    // child nodes
    (flow.nodes||[]).forEach(n=>{
      if(n.macro !== macroId && String(n.macro) !== String(macroId)) return;
      applyVoteOnKey(voteKey('node', n.id), val);
    });

    // edges: internal (both ends in macro) OR any edge with at least one end in macro
    (flow.edges||[]).forEach(e=>{
      const a = (typeof nodeById==='function') ? nodeById(e.from) : (flow.nodes||[]).find(n=>n.id===e.from);
      const b = (typeof nodeById==='function') ? nodeById(e.to) : (flow.nodes||[]).find(n=>n.id===e.to);
      if(!a || !b) return;
      const aIn = a.macro === macroId || String(a.macro) === String(macroId);
      const bIn = b.macro === macroId || String(b.macro) === String(macroId);
      if(aIn || bIn){
        applyVoteOnKey(voteKey('edge', e.id), val);
      }
    });
  }

  const prevSet = window.setMyVote;
  window.setMyVote = function(k, id, val){
    // toggle if same
    const key = voteKey(k, id);
    const cur = (flow && flow.votes && flow.votes[key]) || {mine:null};
    let finalVal = val;
    if(cur.mine === val) finalVal = null;

    if(typeof prevSet === 'function' && k !== 'macro'){
      // let existing handle non-macro; still cascade handled below for macro
      prevSet(k, id, val);
    } else {
      applyVoteOnKey(key, finalVal);
    }

    if(k === 'macro'){
      // ensure macro key itself is set (prevSet may have cascaded only OK before)
      applyVoteOnKey(key, finalVal);
      cascadeMacroVote(id, finalVal);
    }

    if(typeof saveLocal === 'function') saveLocal();
    if(typeof render === 'function') render();
    if(typeof renderMacroBar === 'function') renderMacroBar();
    if(typeof updateProgress === 'function') updateProgress();
  };

  window.voteSelected = function(val){
    if(!selected || !flow) return;
    window.setMyVote(selected.kind, selected.id, val);
    if(selected.kind === 'macro'){
      if(typeof toast === 'function'){
        toast(val==='ok'
          ? 'Macro OK — blocos e conexões internas herdaram 👍'
          : (val==='no' ? 'Macro NÃO — blocos e conexões internas herdaram 👎' : 'Voto do macro removido'));
      }
    }
    try{ if(typeof refreshSide === 'function') refreshSide(); }catch(e){}
    if(typeof saveLocal === 'function') saveLocal();
  };

  /* ===== Edge modal: show origin → destination ===== */
  function describeEdge(e){
    if(!e || !flow) return { from:'?', to:'?', label:'' };
    const a = (typeof nodeById==='function') ? nodeById(e.from) : (flow.nodes||[]).find(n=>n.id===e.from);
    const b = (typeof nodeById==='function') ? nodeById(e.to) : (flow.nodes||[]).find(n=>n.id===e.to);
    return {
      from: a ? ((a.macro?('['+a.macro+'] '):'')+(a.title||a.id)) : (e.from||'?'),
      to: b ? ((b.macro?('['+b.macro+'] '):'')+(b.title||b.id)) : (e.to||'?'),
      label: e.label || '',
      fromMacro: a && a.macro,
      toMacro: b && b.macro
    };
  }

  function enhanceRefreshSide(){
    const prev = window.refreshSide;
    window.refreshSide = function(){
      if(typeof prev === 'function'){
        try{ prev.apply(this, arguments); }catch(e){}
      }
      if(!selected || !flow) return;

      const title = document.getElementById('sideTitle');
      const meta = document.getElementById('sideMeta');
      const name = document.getElementById('sideName');

      if(selected.kind === 'edge'){
        const e = (flow.edges||[]).find(x=>x.id===selected.id);
        const d = describeEdge(e);
        if(title) title.textContent = 'Conexão';
        if(meta){
          meta.innerHTML =
            '<div style="line-height:1.45">'+
              '<div><b>Origem</b><br/><span style="color:#1a5f8a">'+esc(d.from)+'</span></div>'+
              '<div style="margin:6px 0;color:#64748b">↓</div>'+
              '<div><b>Destino</b><br/><span style="color:#1b7a4e">'+esc(d.to)+'</span></div>'+
              (d.fromMacro && d.toMacro && d.fromMacro !== d.toMacro
                ? '<div style="margin-top:6px;font-size:11px;color:#5b4b8a">🔗 Entre módulos '+esc(d.fromMacro)+' → '+esc(d.toMacro)+'</div>'
                : '')+
            '</div>';
        }
        if(name){
          name.value = e ? (e.label || '') : '';
          name.placeholder = 'Rótulo da conexão (ex.: SIM, NÃO)';
        }
        // vote buttons state
        const v = (flow.votes && flow.votes[voteKey('edge', selected.id)]) || {mine:null};
        document.querySelectorAll('.vbtn').forEach(b=>{
          b.classList.remove('on-ok','on-no');
          if(v.mine==='ok' && b.getAttribute('data-v')==='ok') b.classList.add('on-ok');
          if(v.mine==='no' && b.getAttribute('data-v')==='no') b.classList.add('on-no');
        });
      }

      if(selected.kind === 'macro'){
        if(title) title.textContent = 'Módulo (macro)';
        if(meta){
          const m = (typeof macroById==='function') ? macroById(selected.id) : (flow.macros||[]).find(x=>x.id===selected.id);
          const childNodes = (flow.nodes||[]).filter(n=>n.macro===selected.id || String(n.macro)===String(selected.id));
          let edgeCount = 0;
          (flow.edges||[]).forEach(e=>{
            const a = (flow.nodes||[]).find(n=>n.id===e.from);
            const b = (flow.nodes||[]).find(n=>n.id===e.to);
            if(a && b && (a.macro===selected.id || b.macro===selected.id)) edgeCount++;
          });
          meta.innerHTML =
            '<div>Módulo <b>'+esc(selected.id)+'</b> — '+esc(m&&m.title||'')+'</div>'+
            '<div style="font-size:12px;color:#64748b;margin-top:4px">'+
              childNodes.length+' blocos · '+edgeCount+' conexões — voto aplica a todos'+
            '</div>';
        }
      }
    };
  }

  function esc(s){
    return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  // When editing edge label via sideName
  function wireEdgeLabel(){
    const name = document.getElementById('sideName');
    if(!name || name.dataset.edgeWire==='1') return;
    name.dataset.edgeWire='1';
    name.addEventListener('input', function(){
      if(!selected || selected.kind!=='edge' || !flow) return;
      const e = (flow.edges||[]).find(x=>x.id===selected.id);
      if(e){
        e.label = name.value;
        if(typeof saveLocal==='function') saveLocal();
        if(typeof render==='function') render();
      }
    });
  }

  /* ===== Comment icon on macros ===== */
  function el(tag, attrs, kids){
    const n = document.createElementNS('http://www.w3.org/2000/svg', tag);
    if(attrs) Object.keys(attrs).forEach(k=> n.setAttribute(k, attrs[k]));
    (kids||[]).forEach(c=> n.appendChild(typeof c==='string'? document.createTextNode(c) : c));
    return n;
  }

  function injectMacroCommentButtons(){
    const svg = document.getElementById('canvas');
    if(!svg || !flow || !flow.macros) return;
    svg.querySelectorAll('[data-macro-comment]').forEach(n=> n.remove());
    flow.macros.forEach(m=>{
      const cx = m.x + m.w - 18;
      const cy = m.y + 16;
      const g = el('g', {
        'class': 'comment-btn macro-comment',
        'data-macro-comment': m.id,
        'transform': 'translate('+cx+','+cy+')',
        'style': 'cursor:pointer'
      });
      g.appendChild(el('circle', {
        cx:'0', cy:'0', r:'11',
        fill:'#fff', stroke:(m.border||'#1a5f8a'), 'stroke-width':'1.8'
      }));
      g.appendChild(el('text', {
        x:'0', y:'4', 'text-anchor':'middle', 'font-size':'12', 'pointer-events':'none'
      }, ['💬']));
      const vk = voteKey('macro', m.id);
      const hasC = flow.comments && flow.comments[vk];
      const hasV = flow.votes && flow.votes[vk] && flow.votes[vk].mine;
      if(hasC || hasV){
        const col = hasV && flow.votes[vk].mine==='ok' ? '#1b7a4e' : (hasV && flow.votes[vk].mine==='no' ? '#c41e3a' : '#1a5f8a');
        g.appendChild(el('circle', { cx:'8', cy:'-8', r:'5', fill:col }));
      }
      g.addEventListener('mousedown', function(ev){
        ev.stopPropagation();
        ev.preventDefault();
        selected = { kind:'macro', id:m.id };
        if(typeof openModal === 'function') openModal();
        if(typeof render === 'function') render();
      });
      svg.appendChild(g);
    });
  }

  const prevRender = window.render;
  window.render = function(){
    if(typeof prevRender === 'function') prevRender.apply(this, arguments);
    try{ injectMacroCommentButtons(); }catch(e){}
  };

  /* ===== Autosave ===== */
  const origSave = window.saveLocal;
  window.saveLocal = function(){
    try{
      if(typeof flow !== 'undefined' && flow){
        localStorage.setItem('fluxora_flow_backup', JSON.stringify({
          flowKey: typeof flowKey!=='undefined'?flowKey:null,
          flowTitle: typeof flowTitle!=='undefined'?flowTitle:null,
          flow: flow,
          savedAt: Date.now()
        }));
      }
    }catch(e){}
    if(typeof origSave === 'function') origSave.apply(this, arguments);
  };

  function wireCommentAutosave(){
    const ta = document.getElementById('sideComment');
    if(ta && ta.dataset.autosave!=='1'){
      ta.dataset.autosave='1';
      ta.addEventListener('input', function(){
        if(!selected || !flow) return;
        if(!flow.comments) flow.comments = {};
        flow.comments[voteKey(selected.kind, selected.id)] = ta.value;
        window.saveLocal();
      });
    }
    wireEdgeLabel();
  }

  const prevUp = window.onUp;
  window.onUp = function(){
    if(typeof prevUp==='function') prevUp.apply(this, arguments);
    if(typeof saveLocal==='function') saveLocal();
  };
  window.addEventListener('mouseup', function(){ if(typeof saveLocal==='function') saveLocal(); });
  window.addEventListener('pointerup', function(){ if(typeof saveLocal==='function') saveLocal(); });
  setInterval(function(){
    if(typeof flow==='undefined'||!flow) return;
    if(typeof saveLocal==='function') saveLocal();
  }, 12000);
  window.addEventListener('beforeunload', function(){
    try{
      if(flow){
        localStorage.setItem('fluxora_flow_backup', JSON.stringify({
          flowKey: typeof flowKey!=='undefined'?flowKey:null,
          flowTitle: typeof flowTitle!=='undefined'?flowTitle:null,
          flow: flow,
          savedAt: Date.now()
        }));
      }
    }catch(e){}
  });

  enhanceRefreshSide();

  const prevOpen = window.openModal;
  window.openModal = function(){
    if(typeof prevOpen==='function') prevOpen.apply(this, arguments);
    setTimeout(function(){
      wireCommentAutosave();
      try{ if(typeof refreshSide==='function') refreshSide(); }catch(e){}
    }, 30);
  };

  function boot(){
    wireCommentAutosave();
    enhanceRefreshSide();
    try{ if(typeof render==='function') injectMacroCommentButtons(); }catch(e){}
  }
  boot();
  setTimeout(boot, 500);
  setTimeout(boot, 1500);

  console.log('[Fluxora] edge origin/dest + macro→edges cascade ready');
})();
