/* ui-polish: seal revoke, shapes, mobile, admin — Editar only via flow-list-ui */
(function(){
  function $(id){ return document.getElementById(id); }
  function cx(){ return window.convexClient; }

  function injectMissingEditButtons(){
    /* removido: causava botão Editar duplicado — listagem oficial em flow-list-ui.js */
  }

  function openEditForFlow(r){
    if(typeof openFlowEditModal==='function'){
      openFlowEditModal({ key:r.key, title:r.title||r.key, data:r.data||null });
      return;
    }
  }
  window.openEditForFlow = openEditForFlow;

  /** Simplified list renderer — defers to flow-list-ui when present */
  window.renderFlowManager = window.renderFlowManager || async function(){
    const list=$('flowManagerList');
    if(!list) return;
    list.innerHTML='<p class="muted">Carregando…</p>';
    if(typeof window.renderFlowManager !== 'function') return;
  };

  function enhanceSealBox(){
    const box=$('sealBox');
    if(!box || box.dataset.polished==='1') return;
    box.dataset.polished='1';
  }

  function rebindShapeButtons(){
    /* noop — shapes handled elsewhere */
  }

  function wireMgrOpen(){
    const btn=$('btnOpenMgr');
    if(!btn || btn.dataset.uiPolished==='1') return;
    btn.dataset.uiPolished='1';
    const prev=btn.onclick;
    btn.onclick=async function(ev){
      if(typeof prev==='function') try{ await prev.call(this,ev); }catch(e){}
      setTimeout(function(){
        if(typeof renderFlowManager==='function') renderFlowManager();
      }, 120);
    };
  }

  function wireAdmin(){
    const footer=$('footerAdmin');
    if(footer && !footer.dataset.wired){
      footer.dataset.wired='1';
      footer.onclick=function(ev){
        ev.preventDefault();
        if($('adminGate')) $('adminGate').hidden=false;
        if($('publicPage')) $('publicPage').hidden=true;
      };
    }
    const close=$('adminClose');
    if(close && !close.dataset.wired){
      close.dataset.wired='1';
      close.onclick=function(){
        if($('adminPage')) $('adminPage').hidden=true;
        if($('adminGate')) $('adminGate').hidden=true;
        if($('publicPage')) $('publicPage').hidden=false;
      };
    }
  }

  function boot(){
    rebindShapeButtons();
    enhanceSealBox();
    wireMgrOpen();
    wireAdmin();
  }
  boot();
  setTimeout(boot, 300);
  setTimeout(boot, 1000);
  setTimeout(boot, 2500);

  /* MutationObserver de Editar removido — evita duplicata */
  console.log('[Fluxora] ui-polish sanitized (no edit inject)');
})();
