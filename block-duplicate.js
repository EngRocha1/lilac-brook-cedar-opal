/* Duplicate selected node or macro (+ child nodes) · v20261007i */
(function(){
  function $(id){ return document.getElementById(id); }
  function isGuest(){ return window.HEMOPI_SHARE_MODE==='guest'; }
  function uid(p){ return (p||'id') + Math.random().toString(36).slice(2,10); }

  function deepClone(o){ return JSON.parse(JSON.stringify(o)); }

  function duplicateSelection(){
    if(isGuest()){ if(typeof toast==='function') toast('Convidado não edita', true); return; }
    if(typeof flow==='undefined' || !flow || typeof selected==='undefined' || !selected){
      if(typeof toast==='function') toast('Selecione um bloco ou macro', true);
      return;
    }

    if(selected.kind === 'node'){
      const src = (flow.nodes||[]).find(n=>n.id===selected.id);
      if(!src) return;
      const copy = deepClone(src);
      copy.id = uid('n');
      copy.x = (src.x||0) + 50;
      copy.y = (src.y||0) + 50;
      if(copy.title) copy.title = copy.title + ' (cópia)';
      flow.nodes.push(copy);
      selected = { kind:'node', id:copy.id };
      if(typeof saveLocal==='function') saveLocal();
      if(typeof render==='function') render();
      if(typeof toast==='function') toast('Bloco duplicado');
      return;
    }

    if(selected.kind === 'macro'){
      const src = (flow.macros||[]).find(m=>m.id===selected.id);
      if(!src) return;
      const newMacroId = uid('m');
      const copyM = deepClone(src);
      copyM.id = newMacroId;
      copyM.x = (src.x||0) + 50;
      copyM.y = (src.y||0) + 50;
      if(copyM.title) copyM.title = copyM.title + ' (cópia)';
      flow.macros.push(copyM);

      const idMap = {};
      const children = (flow.nodes||[]).filter(n=>n.macro===src.id);
      children.forEach(n=>{
        const cn = deepClone(n);
        const nid = uid('n');
        idMap[n.id] = nid;
        cn.id = nid;
        cn.macro = newMacroId;
        cn.x = (n.x||0) + 50;
        cn.y = (n.y||0) + 50;
        flow.nodes.push(cn);
      });

      // edges between children
      (flow.edges||[]).slice().forEach(e=>{
        if(idMap[e.from] && idMap[e.to]){
          const ce = deepClone(e);
          ce.id = uid('e');
          ce.from = idMap[e.from];
          ce.to = idMap[e.to];
          flow.edges.push(ce);
        }
      });

      selected = { kind:'macro', id:newMacroId };
      if(typeof saveLocal==='function') saveLocal();
      if(typeof render==='function') render();
      if(typeof renderMacroBar==='function') renderMacroBar();
      if(typeof toast==='function') toast('Macro duplicada');
      return;
    }

    if(typeof toast==='function') toast('Selecione um bloco ou macro', true);
  }

  window.duplicateSelection = duplicateSelection;

  function ensureDupInModal(){
    const body = document.querySelector('#modalBg .modal-b');
    if(!body || body.querySelector('#btnDupBlock')) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn';
    btn.id = 'btnDupBlock';
    btn.textContent = '⧉ Duplicar';
    btn.style.marginTop = '8px';
    btn.onclick = function(ev){ ev.preventDefault(); duplicateSelection(); };
    const save = $('btnModalSave');
    if(save && save.parentNode) save.parentNode.insertBefore(btn, save);
    else body.appendChild(btn);
  }

  const prevOpen = window.openModal;
  if(typeof prevOpen === 'function'){
    window.openModal = function(){
      prevOpen.apply(this, arguments);
      ensureDupInModal();
    };
  }

  // Keyboard Ctrl+D
  window.addEventListener('keydown', function(ev){
    if((ev.ctrlKey||ev.metaKey) && (ev.key==='d' || ev.key==='D')){
      if(ev.target && /input|textarea|select/i.test(ev.target.tagName)) return;
      ev.preventDefault();
      duplicateSelection();
    }
  });

  setTimeout(ensureDupInModal, 800);
  console.log('[Fluxora] block-duplicate ready');
})();
