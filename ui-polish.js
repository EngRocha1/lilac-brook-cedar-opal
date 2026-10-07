/* ui-polish sanitized — no list re-render storms · v20261007j */
(function(){
  function $(id){ return document.getElementById(id); }

  function openEditForFlow(r){
    if(typeof openFlowEditModal==='function'){
      openFlowEditModal({ key:r.key, title:r.title||r.key, data:r.data||null });
    }
  }
  window.openEditForFlow = openEditForFlow;

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

  if(!window.__uiPolishBooted){
    window.__uiPolishBooted = true;
    wireAdmin();
  }
  console.log('[Fluxora] ui-polish v20261007j');
})();
