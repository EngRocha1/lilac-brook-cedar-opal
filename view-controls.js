/* View controls: fullscreen board, collapse sections/sidebar, mobile scroll */
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
      }
      .canvas-wrap{
        flex:1;overflow:auto!important;
        -webkit-overflow-scrolling:touch;
        min-height:40vh;
        position:relative;
      }

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

      .palette{
        transition:width .2s,max-height .2s,padding .2s;
        position:relative;
      }
      .palette.collapsed{
        width:42px!important;min-width:42px!important;
        padding:6px 4px!important;
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
        margin-bottom:6px;
      }

      .board-tools{
        display:flex;gap:6px;align-items:center;flex-wrap:wrap;
        padding:4px 8px;background:#f8fafc;border-bottom:1px solid #e2e8f0;
      }
      .board-tools .btn, .board-tools button{
        font-size:12px;padding:4px 8px;
      }
      .btn-max{
        background:#0f172a;color:#fff;border:none;border-radius:8px;
        padding:6px 10px;font-weight:700;cursor:pointer;font-size:12px;
      }
      .btn-max:hover{background:#1e293b}

      body.board-max .hero,
      body.board-max .presence-bar,
      body.board-max .project-header,
      body.board-max .share-panel,
      body.board-max #sealBox,
      body.board-max .toolbar .prog-wrap{
        display:none!important;
      }
      body.board-max .app{
        position:fixed;inset:0;z-index:9000;background:#fff;
        min-height:100vh;
      }
      body.board-max .workspace{
        flex:1;height:calc(100vh - 48px);min-height:0;
      }
      body.board-max .canvas-wrap{
        min-height:0;height:100%;
      }
      body.board-max .board-tools{
        position:sticky;top:0;z-index:10;
        box-shadow:0 1px 4px rgba(0,0,0,.08);
      }
      body.board-max .palette{
        max-height:100%;
      }
      body.board-max .palette:not(.collapsed){
        width:56px!important;min-width:56px!important;
      }
      body.board-max .palette:not(.collapsed) .palette-full{display:none!important}
      body.board-max .palette:not(.collapsed) .palette-mini{display:flex!important}
      body.board-max .wa-float{display:none!important}

      /* CRITICAL: modals/comments above maximized board */
      body.board-max .modal-bg,
      body.board-max .modal-bg.open,
      body.board-max .modal-overlay,
      body.board-max #modalBg,
      body.board-max #profileModal,
      body.board-max #flowEditModal,
      body.board-max #dupModal,
      body.board-max #macroPickModal,
      body.board-max #loginModal,
      body.board-max #guestModal,
      body.board-max #toast{
        z-index:10050!important;
      }

      /* Also raise global modal stack so open always wins */
      .modal-bg{z-index:10050!important}
      .modal-overlay{z-index:10060!important}
      #macroPickModal{z-index:10070!important}
      #toast{z-index:10100!important}

      @media (max-width:720px){
        .workspace{flex-direction:column!important}
        .palette{
          width:100%!important;max-height:140px;
          border-right:none;border-bottom:1px solid #e2e8f0;
          flex-direction:row!important;flex-wrap:wrap;
          align-items:flex-start;
        }
        .palette.collapsed{
          width:100%!important;max-height:40px!important;
          min-width:0!important;
          overflow:hidden;
        }
        .palette .palette-mini{
          flex-direction:row;flex-wrap:wrap;
        }
        body.board-max .workspace{height:calc(100vh - 52px)}
        body.board-max .palette:not(.collapsed){
          width:100%!important;max-height:56px!important;
        }
        .board-tools{position:sticky;top:0;z-index:5}
      }
    `;
    document.head.appendChild(st);
  }

  function makeCollapsible(el, title, storageKey){
    if(!el || el.dataset.collapsible==='1') return;
    el.dataset.collapsible='1';
    const head=document.createElement('div');
    head.className='sec-head';
    head.innerHTML='<span>'+title+'</span><button type="button" class="sec-toggle" title="Recolher/expandir">▾</button>';
    const body=document.createElement('div');
    body.className='sec-body';
    while(el.firstChild) body.appendChild(el.firstChild);
    el.appendChild(head);
    el.appendChild(body);
    const btn=head.querySelector('.sec-toggle');
    function apply(collapsed){
      el.classList.toggle('sec-collapsed', collapsed);
      btn.textContent = collapsed ? '▸' : '▾';
      try{ localStorage.setItem(storageKey, collapsed?'1':'0'); }catch(e){}
    }
    let start=false;
    try{ start=localStorage.getItem(storageKey)==='1'; }catch(e){}
    apply(start);
    head.onclick=function(e){
      if(e.target.closest('input,select,textarea,a,button.btn')) return;
      apply(!el.classList.contains('sec-collapsed'));
    };
    btn.onclick=function(e){ e.stopPropagation(); apply(!el.classList.contains('sec-collapsed')); };
  }

  function wireSectionCollapses(){
    makeCollapsible($('presenceBar'), 'Online', 'vc_pres');
    makeCollapsible($('projectHeader'), 'Cabeçalho do projeto', 'vc_hdr');
    const share=document.querySelector('.share-panel');
    if(share) makeCollapsible(share, 'Ações (compartilhar / selo)', 'vc_share');
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
    let tog=pal.querySelector('.palette-toggle');
    if(!tog){
      tog=document.createElement('button');
      tog.type='button';
      tog.className='palette-toggle';
      tog.title='Recolher macros';
      tog.textContent='«';
      mini.appendChild(tog);
      tog.onclick=function(e){
        e.stopPropagation();
        const c=!pal.classList.contains('collapsed');
        pal.classList.toggle('collapsed', c);
        tog.textContent = c ? '»' : '«';
        try{ localStorage.setItem('vc_pal', c?'1':'0'); }catch(e){}
      };
    }
    mini.querySelectorAll('.pm-chip').forEach(n=>n.remove());
    const macros=(typeof flow!=='undefined' && flow && flow.macros) ? flow.macros : [];
    macros.forEach(m=>{
      const chip=document.createElement('div');
      chip.className='pm-chip';
      chip.style.background=m.color||'#e8f4fc';
      chip.style.borderColor=m.border||'#94a3b8';
      chip.style.color=m.border||'#334155';
      let ok=0,no=0;
      if(flow && flow.votes){
        const v=flow.votes['macro:'+m.id];
        if(v){ ok=v.ok||0; no=v.no||0; }
        (flow.nodes||[]).forEach(n=>{
          if(n.macro!==m.id) return;
          const nv=flow.votes['node:'+n.id];
          if(nv&&nv.mine==='ok') ok++;
          if(nv&&nv.mine==='no') no++;
        });
      }
      chip.title=(m.title||m.id)+' · 👍'+ok+' 👎'+no;
      chip.innerHTML='<span>'+m.id+'</span>';
      mini.appendChild(chip);
    });
    try{
      if(localStorage.getItem('vc_pal')==='1'){
        pal.classList.add('collapsed');
        tog.textContent='»';
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
      '<button type="button" class="btn-max" id="btnBoardMax" title="Maximizar board">⛶ Maximizar</button>'+
      '<button type="button" class="btn" id="btnPalToggle" title="Recolher macros">Macros «»</button>'+
      '<span style="flex:1"></span>'+
      '<button type="button" class="btn" id="btnAddProcess2" title="Processo">▭</button>'+
      '<button type="button" class="btn" id="btnAddDecision2" title="Decisão">◇</button>'+
      '<button type="button" class="btn" id="btnAddText2" title="Texto">T</button>'+
      '<button type="button" class="btn" id="btnAddMacro2" title="Macro">+ Macro</button>'+
      '<button type="button" class="btn" id="btnConnect2" title="Conectar">⟷</button>';
    ws.parentNode.insertBefore(bar, ws);

    $('btnBoardMax').onclick=function(){
      const on=!document.body.classList.contains('board-max');
      document.body.classList.toggle('board-max', on);
      this.textContent = on ? '✕ Sair da tela cheia' : '⛶ Maximizar';
      buildPaletteMini();
      try{ if(typeof render==='function') render(); }catch(e){}
    };
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
      // if a modal is open, close modal first — don't exit fullscreen
      const openModal = document.querySelector('.modal-bg.open');
      if(openModal){
        openModal.classList.remove('open');
        return;
      }
      document.body.classList.remove('board-max');
      const b=$('btnBoardMax');
      if(b) b.textContent='⛶ Maximizar';
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

  console.log('[Fluxora] view-controls ready (modal z-index fix)');
})();
