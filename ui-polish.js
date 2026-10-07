/* ui-polish: seal, shapes, mobile, admin — list Editar only via flow-list-ui */
(function(){
  function $(id){ return document.getElementById(id); }
  function cx(){ return window.convexClient; }

  function injectMissingEditButtons(){
    /* removido: causava botão Editar duplicado — listagem oficial em flow-list-ui.js */
  }

  // When Meus fluxos opens
  function wireMgrOpen(){
    const btn=$('btnOpenMgr');
    if(!btn) return;
    const prev=btn.onclick;
    btn.onclick=async function(ev){
      if(typeof prev==='function') try{ prev.call(this,ev); }catch(e){}
      setTimeout(function(){
        if(typeof renderFlowManager==='function') renderFlowManager();
      }, 100);
    };
  }

  function openEditForFlow(r){
    if(typeof openFlowEditModal==='function'){
      openFlowEditModal({ key:r.key, title:r.title||r.key, data:r.data||null });
    }
  }
  window.openEditForFlow = openEditForFlow;

  function enhanceSealBox(){
    /* keep legacy seal UI if present */
  }

  function rebindShapeButtons(){
    /* shape tools remain in editor-fix / view-controls */
  }

  function wireAdmin(){
    const footer=$('footerAdmin');
    if(footer){
      footer.onclick=function(ev){
        ev.preventDefault();
        if($('adminGate')) $('adminGate').hidden=false;
        if($('publicPage')) $('publicPage').hidden=true;
      };
    }
    const close=$('adminClose');
    if(close){
      close.onclick=function(){
        if($('adminPage')) $('adminPage').hidden=true;
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
  console.log('[Fluxora] ui-polish sanitized');
})();
