/* Macro 💬 comment + cascade vote to children + autosave on every change */
(function(){
  function voteKey(k,id){ return (typeof window.voteKey==='function') ? window.voteKey(k,id) : (k+':'+id); }

  /* ===== Cascade: macro OK/NO → all child nodes ===== */
  function cascadeMacroVote(macroId, val){
    if(!flow || !flow.nodes) return;
    if(!flow.votes) flow.votes = {};
    flow.nodes.forEach(n=>{
      if(n.macro !== macroId && String(n.macro) !== String(macroId)) return;
      const key = voteKey('node', n.id);
      if(!flow.votes[key]) flow.votes[key] = {ok:0, no:0, mine:null};
      const v = flow.votes[key];
      if(v.mine === 'ok') v.ok = Math.max(0, (v.ok||0)-1);
      if(v.mine === 'no') v.no = Math.max(0, (v.no||0)-1);
      if(val === 'ok'){ v.ok = (v.ok||0)+1; v.mine = 'ok'; }
      else if(val === 'no'){ v.no = (v.no||0)+1; v.mine = 'no'; }
      else { v.mine = null; }
    });
  }

  // Strengthen setMyVote if present
  const prevSet = window.setMyVote;
  window.setMyVote = function(k, id, val){
    if(typeof prevSet === 'function'){
      prevSet(k, id, val);
    } else if(typeof applyVoteToKey === 'function'){
      const key = voteKey(k, id);
      applyVoteToKey(key, val);
    } else {
      if(!flow.votes) flow.votes = {};
      const key = voteKey(k, id);
      if(!flow.votes[key]) flow.votes[key] = {ok:0,no:0,mine:null};
      const v = flow.votes[key];
      if(v.mine === 'ok') v.ok = Math.max(0,v.ok-1);
      if(v.mine === 'no') v.no = Math.max(0,v.no-1);
      if(val === 'ok'){ v.ok++; v.mine='ok'; }
      else if(val === 'no'){ v.no++; v.mine='no'; }
      else v.mine = null;
    }
    // Always cascade both directions for macro
    if(k === 'macro' && (val === 'ok' || val === 'no' || val === null)){
      cascadeMacroVote(id, val);
    }
    if(typeof saveLocal === 'function') saveLocal();
    if(typeof render === 'function') render();
    if(typeof renderMacroBar === 'function') renderMacroBar();
    if(typeof updateProgress === 'function') updateProgress();
  };

  // voteSelected wrapper
  const prevVote = window.voteSelected;
  window.voteSelected = function(val){
    if(!selected) return;
    window.setMyVote(selected.kind, selected.id, val);
    if(selected.kind === 'macro'){
      if(typeof toast === 'function'){
        toast(val==='ok'
          ? 'Macro OK — todos os blocos internos herdaram 👍'
          : (val==='no' ? 'Macro NÃO — todos os blocos internos herdaram 👎' : 'Voto do macro removido'));
      }
    }
    if(typeof refreshSide === 'function') try{ refreshSide(); }catch(e){}
    if(typeof saveLocal === 'function') saveLocal();
  };

  /* ===== Comment icon on each macro (top-right of box) ===== */
  function el(tag, attrs, kids){
    const n = document.createElementNS('http://www.w3.org/2000/svg', tag);
    if(attrs) Object.keys(attrs).forEach(k=> n.setAttribute(k, attrs[k]));
    (kids||[]).forEach(c=> n.appendChild(typeof c==='string'? document.createTextNode(c) : c));
    return n;
  }

  function injectMacroCommentButtons(){
    const svg = document.getElementById('canvas');
    if(!svg || !flow || !flow.macros) return;
    // remove previous injected
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
      // badge if has comment or vote
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

  /* ===== Aggressive autosave ===== */
  // localStorage every change (already in saveLocal) + shorter debounce to Convex
  let _timer = null;
  const origSave = window.saveLocal;
  window.saveLocal = function(){
    // immediate local backup
    try{
      if(typeof flow !== 'undefined' && flow){
        const key = (typeof STORAGE_KEY !== 'undefined' ? STORAGE_KEY : 'fluxora_flow_backup');
        localStorage.setItem(key, JSON.stringify({
          flowKey: typeof flowKey!=='undefined'?flowKey:null,
          flowTitle: typeof flowTitle!=='undefined'?flowTitle:null,
          flow: flow,
          savedAt: Date.now()
        }));
      }
    }catch(e){}
    if(typeof origSave === 'function'){
      origSave.apply(this, arguments);
      return;
    }
    // fallback convex
    if(typeof convexClient !== 'undefined' && convexClient && flowKey && flow && !String(flowKey).startsWith('local-')){
      clearTimeout(_timer);
      _timer = setTimeout(async ()=>{
        try{
          await convexClient.mutation('flows:save', {
            key: flowKey,
            title: flowTitle || flowKey,
            ownerEmail: (user && user.email) || '',
            data: flow
          });
        }catch(e){}
      }, 500);
    }
  };

  // Hook comment typing
  function wireCommentAutosave(){
    const ta = document.getElementById('sideComment');
    if(!ta || ta.dataset.autosave==='1') return;
    ta.dataset.autosave='1';
    ta.addEventListener('input', function(){
      if(!selected || !flow) return;
      if(!flow.comments) flow.comments = {};
      flow.comments[voteKey(selected.kind, selected.id)] = ta.value;
      window.saveLocal();
    });
    const name = document.getElementById('sideName');
    if(name && name.dataset.autosave!=='1'){
      name.dataset.autosave='1';
      name.addEventListener('input', function(){
        if(!selected || !flow) return;
        if(selected.kind==='node'){
          const n = nodeById(selected.id);
          if(n){ n.title = name.value; window.saveLocal(); if(typeof render==='function') render(); }
        } else if(selected.kind==='macro'){
          const m = macroById(selected.id);
          if(m){ m.title = name.value; window.saveLocal(); if(typeof render==='function') render(); if(typeof renderMacroBar==='function') renderMacroBar(); }
        }
      });
    }
  }

  // After drag ends
  const prevUp = window.onUp;
  window.onUp = function(){
    if(typeof prevUp==='function') prevUp.apply(this, arguments);
    else { try{ drag=null; }catch(e){} }
    if(typeof saveLocal==='function') saveLocal();
  };
  window.addEventListener('mouseup', function(){
    if(typeof drag!=='undefined' && drag) return;
    // after any pointer release, soft save
    if(typeof saveLocal==='function') saveLocal();
  });
  window.addEventListener('pointerup', function(){
    if(typeof saveLocal==='function') saveLocal();
  });

  // Periodic safety net every 12s
  setInterval(function(){
    if(typeof flow==='undefined'||!flow) return;
    if(typeof saveLocal==='function') saveLocal();
  }, 12000);

  // Before leave
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

  // Restore backup if load fails empty
  window.__fluxoraTryRestoreBackup = function(){
    try{
      const raw = localStorage.getItem('fluxora_flow_backup');
      if(!raw) return null;
      return JSON.parse(raw);
    }catch(e){ return null; }
  };

  function boot(){
    wireCommentAutosave();
    try{ if(typeof render==='function') injectMacroCommentButtons(); }catch(e){}
  }
  boot();
  setTimeout(boot, 500);
  setTimeout(boot, 1500);

  // Re-wire when modal opens
  const prevOpen = window.openModal;
  window.openModal = function(){
    if(typeof prevOpen==='function') prevOpen.apply(this, arguments);
    setTimeout(wireCommentAutosave, 50);
  };

  console.log('[Fluxora] macro-comment + cascade + autosave ready');
})();
