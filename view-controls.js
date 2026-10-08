/* View controls: collapse sections/sidebar, mobile scroll — no redundant Maximize */
(function(){
  function $(id){ return document.getElementById(id); }

  if(!document.getElementById('view-controls-css')){
    const st=document.createElement('style');
    st.id='view-controls-css';
    st.textContent=`
      html,body{overflow-x:hidden;overflow-y:auto!important;height:auto!important}
      .app{min-height:100vh;display:flex;flex-direction:column}
      .workspace{
        display:flex;flex:1;min-height:50vh;
        overflow:auto!important;
        -webkit-overflow-scrolling:touch;
      }
      .palette{
        overflow-y:auto!important;overflow-x:hidden;
        max-height:none;
        scrollbar-gutter:stable;
        scrollbar-width:thin;
        transition:width .3s ease, flex-basis .3s ease, max-width .3s ease, padding .2s;
        position:relative;
      }
      .canvas-wrap{
        flex:1;overflow:auto!important;
        -webkit-overflow-scrolling:touch;
        min-height:40vh;
        position:relative;
      }

      .board-tools{
        display:flex;align-items:center;flex-wrap:wrap;gap:8px;
        padding:6px 12px;margin:0 8px 6px;background:#fff;
        border:1px solid #e2e8f0;border-radius:10px;
      }
      .toolbar{
        display:flex!important;align-items:center;flex-wrap:wrap;
        gap:10px!important;padding:8px 12px!important;
      }
      .toolbar .tool-group{display:flex;align-items:center;flex-wrap:wrap;gap:6px}

      .sec-head{
        display:flex;align-items:center;justify-content:space-between;
        gap:8px;cursor:pointer;user-select:none;
        font-size:11px;font-weight:700;color:#64748b;
        padding:2px 0;
      }
      .sec-head .sec-toggle{
        border:1px solid #cbd5e1;background:#fff;border-radius:6px;
        width:22px;height:22px;line-height:18px;text-align:center;
        font-size:12px;cursor:pointer;flex-shrink:0;
      }
      .sec-collapsed .sec-body{display:none!important}
      .sec-collapsed.project-header,
      .sec-collapsed.share-panel,
      .sec-collapsed.presence-bar,
      .sec-collapsed.toolbar{
        padding-top:2px!important;padding-bottom:2px!important;
      }

      .palette.collapsed,
      #macroBar.collapsed{
        flex:0 0 56px!important;
        width:56px!important;
        min-width:56px!important;
        max-width:56px!important;
        padding:6px 4px!important;
        overflow:hidden!important;
      }
      .palette.collapsed .palette-full{display:none!important}
      .palette.collapsed .palette-mini{display:flex!important}
      .palette-mini{
        display:none;flex-direction:column;gap:6px;align-items:center;
      }
      .palette-mini .pm-chip{
        width:28px;height:28px;border-radius:8px;border:1.5px dashed;
        display:flex;align-items:center;justify-content:center;
        font-size:11px;font-weight:800;cursor:default;
      }
      .palette-toggle{
        border:1px solid #cbd5e1;background:#fff;border-radius:8px;
        width:28px;height:28px;cursor:pointer;font-size:12px;
        display:flex;align-items:center;justify-content:center;
        margin-bottom:4px;
      }
      body.board-max .modal-bg,body.board-max .modal-overlay{z-index:10000!important}
    `;
    document.head.appendChild(st);
  }

  function makeCollapsible(el, title, storageKey){
    if(!el || el.dataset.vcCollapse==='1') return;
    el.dataset.vcCollapse='1';
    const head=document.createElement('div');
    head.className='sec-head';
    head.innerHTML='<span>'+title+'</span><button type="button" class="sec-toggle" aria-label="Recolher">▾</button>';
    const body=document.createElement('div');
    body.className='sec-body';
    while(el.firstChild) body.appendChild(el.firstChild);
    el.appendChild(head);
    el.appendChild(body);
    const btn=head.querySelector('.sec-toggle');
    function apply(c){
      el.classList.toggle('sec-collapsed', c);
      if(btn) btn.textContent=c?'▸':'▾';
      try{ if(storageKey) localStorage.setItem(storageKey, c?'1':'0'); }catch(e){}
    }
    let collapsed=false;
    try{ collapsed=localStorage.getItem(storageKey)==='1'; }catch(e){}
    apply(collapsed);
    head.onclick=function(ev){
      if(ev.target.closest('input,textarea,select,button.btn,a')) return;
      apply(!el.classList.contains('sec-collapsed'));
    };
  }

  function wireSectionCollapses(){
    const ph=$('projectHeader');
    if(ph) makeCollapsible(ph, 'Projeto', 'vc_ph');
    const sp=document.querySelector('.share-panel');
    if(sp) makeCollapsible(sp, 'Compartilhar / Selo', 'vc_share');
    const pr=$('presenceBar');
    if(pr) makeCollapsible(pr, 'Presença', 'vc_pres');
    const seal=$('sealBox');
    if(seal) makeCollapsible(seal, 'Selo', 'vc_seal');
  }

  function buildPaletteMini(){
    const pal=$('macroBar');
    if(!pal) return;
    let mini=pal.querySelector('.palette-mini');
    if(!mini){
      mini=document.createElement('div');
      mini.className='palette-mini';
      pal.insertBefore(mini, pal.firstChild);
    }
    if(!pal.querySelector('.palette-full')){
      const full=document.createElement('div');
      full.className='palette-full';
      const kids=[...pal.childNodes].filter(n=>n!==mini);
      kids.forEach(n=>full.appendChild(n));
      pal.appendChild(full);
    }
    if(!pal.querySelector('.palette-toggle')){
      const tog=document.createElement('button');
      tog.type='button';
      tog.className='palette-toggle';
      tog.title='Recolher macros';
      const c=pal.classList.contains('collapsed');
      tog.textContent=c?'»':'«';
      tog.onclick=function(ev){
        ev.preventDefault();
        pal.classList.toggle('collapsed');
        const on=pal.classList.contains('collapsed');
        tog.textContent=on?'»':'«';
        try{ localStorage.setItem('vc_pal', on?'1':'0'); }catch(e){}
      };
      mini.appendChild(tog);
    }
    mini.querySelectorAll('.pm-chip').forEach(n=>n.remove());
    const macros=(typeof flow!=='undefined' && flow && flow.macros)||[];
    macros.forEach(m=>{
      const chip=document.createElement('div');
      chip.className='pm-chip';
      chip.textContent=m.id||'?';
      chip.style.borderColor=m.border||'#94a3b8';
      chip.style.color=m.border||'#334155';
      chip.title=m.title||m.id;
      mini.appendChild(chip);
    });
    try{
      if(localStorage.getItem('vc_pal')==='1'){
        pal.classList.add('collapsed');
        const tog=pal.querySelector('.palette-toggle');
        if(tog) tog.textContent='»';
      }
    }catch(e){}
  }

  function ensureBoardTools(){
    let bar=$('boardTools');
    if(bar) return bar;
    const ws=document.querySelector('.workspace');
    if(!ws) return null;
    bar=document.createElement('div');
    bar.id='boardTools';
    bar.className='board-tools';
    bar.innerHTML=
      '<button type="button" class="btn" id="btnPalToggle" title="Recolher macros">Macros «»</button>'+
      '<span style="flex:1"></span>'+
      '<button type="button" class="btn" id="btnAddProcess2" title="Processo">▭</button>'+
      '<button type="button" class="btn" id="btnAddDecision2" title="Decisão">◇</button>'+
      '<button type="button" class="btn" id="btnAddText2" title="Texto">T</button>'+
      '<button type="button" class="btn" id="btnAddMacro2" title="Macro">+ Macro</button>'+
      '<button type="button" class="btn" id="btnConnect2" title="Conectar">⟷</button>';
    ws.parentNode.insertBefore(bar, ws);

    $('btnPalToggle').onclick=function(){
      const pal=$('macroBar');
      if(!pal) return;
      pal.classList.toggle('collapsed');
      const c=pal.classList.contains('collapsed');
      try{ localStorage.setItem('vc_pal', c?'1':'0'); }catch(e){}
      const tog=pal.querySelector('.palette-toggle');
      if(tog) tog.textContent=c?'»':'«';
    };

    function proxy(from, toId){
      const a=$(from), b=$(toId);
      if(!a) return;
      a.onclick=function(ev){
        ev.preventDefault();
        if(b) b.click();
      };
    }
    proxy('btnAddProcess2','btnAddProcess');
    proxy('btnAddDecision2','btnAddDecision');
    proxy('btnAddText2','btnAddText');
    proxy('btnAddMacro2','btnAddMacro');
    proxy('btnConnect2','btnConnect');

    return bar;
  }

  document.addEventListener('keydown', function(e){
    if(e.key==='Escape' && document.body.classList.contains('board-max')){
      const openModal = document.querySelector('.modal-bg.open');
      if(openModal){
        openModal.classList.remove('open');
        return;
      }
      document.body.classList.remove('board-max');
    }
  });

  const _rmb = window.renderMacroBar;
  window.renderMacroBar = function(){
    if(typeof _rmb==='function') _rmb.apply(this, arguments);
    try{ buildPaletteMini(); }catch(e){}
  };

  function boot(){
    wireSectionCollapses();
    ensureBoardTools();
    buildPaletteMini();
  }
  boot();
  setTimeout(boot, 400);
  setTimeout(boot, 1200);
  setTimeout(boot, 2500);

  console.log('[Fluxora] view-controls ready (no Maximize, real collapse)');
})();
