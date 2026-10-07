/* share-access.js — collaborator mode on share links · restored */
(function(){
  function $(id){ return document.getElementById(id); }

  function applyCollaboratorUI(){
    ['btnNewFlow','btnOpenMgr','btnShare'].forEach(id=>{
      const el=$(id); if(el) el.style.display='none';
    });
    ['btnAddProcess','btnAddDecision','btnAddText','btnAddBusbar','btnAddMacro','btnConnect','btnSeal'].forEach(id=>{
      const el=$(id); if(el) el.style.display='';
    });
    const box = $('projectHeader');
    if(box){
      box.classList.remove('locked');
      box.querySelectorAll('input,textarea,select').forEach(inp=>{
        inp.readOnly = false;
        inp.disabled = false;
        inp.style.pointerEvents = '';
        inp.style.background = '';
        inp.style.cursor = '';
        inp.title = '';
      });
    }
    if(typeof toast==='function') toast('Colaborador — edição total do fluxo');
  }

  async function enterShare(token, email){
    const cx = window.convexClient;
    if(!cx) throw new Error('Convex offline');
    const sh = await cx.query('shares:getByToken', { token });
    if(!sh || (!sh.emails.includes(email) && sh.createdBy !== email)){
      throw new Error('E-mail não autorizado');
    }
    const canEdit = !!sh.canEdit;

    try{ flowKey = sh.flowKey; }catch(e){}
    window.flowKey = sh.flowKey;

    const u = { name: email.split('@')[0], email, isGuest: !canEdit, isCollaborator: canEdit };
    try{ user = u; }catch(e){}
    window.user = u;
    window.HEMOPI_SHARE_MODE = canEdit ? 'collaborator' : 'guest';

    const gm = $('guestModal'); if(gm) gm.hidden = true;
    ['publicPage','adminPage','adminGate','flowManager'].forEach(id=>{ const el=$(id); if(el) el.hidden=true; });
    if($('appMain')) $('appMain').hidden = false;

    if(typeof loadFlow === 'function') await loadFlow();
    if(typeof refreshUserChrome === 'function') await refreshUserChrome();

    if(canEdit){
      applyCollaboratorUI();
    } else if(typeof applyGuestUI === 'function'){
      applyGuestUI();
    }
    if($('btnSeal')) $('btnSeal').style.display = '';

    try{
      if(typeof render==='function') render();
      if(typeof renderMacroBar==='function') renderMacroBar();
      if(typeof updateProgress==='function') updateProgress();
      if(typeof renderProjectHeader==='function') await renderProjectHeader();
    }catch(e){}
    if(typeof presenceTick==='function') presenceTick();
  }

  function wireGuestForm(){
    const form = $('guestForm');
    if(!form || form.dataset.collabWired==='1') return;
    form.dataset.collabWired = '1';
    form.addEventListener('submit', async function(ev){
      const token = window._shareToken || new URLSearchParams(location.search).get('share');
      if(!token) return;
      ev.preventDefault();
      ev.stopImmediatePropagation();
      const email = ($('guestEmail')?.value||'').trim().toLowerCase();
      if(!email.includes('@')) return;
      try{
        await enterShare(token, email);
      }catch(e){
        const err = $('guestError');
        if(err){ err.textContent = e.message||String(e); err.hidden=false; }
        console.error(e);
      }
    }, true);
  }

  async function bootShareTitle(){
    const token = new URLSearchParams(location.search).get('share');
    if(!token) return;
    window._shareToken = token;
    try{
      const cx = window.convexClient;
      if(!cx) return;
      const prev = await cx.query('shares:getByToken', { token });
      const h = document.querySelector('#guestModal h2');
      if(h && prev){
        h.textContent = prev.canEdit ? 'Acesso Colaborador' : 'Acesso de convidado';
      }
    }catch(e){}
  }

  function boot(){
    wireGuestForm();
    bootShareTitle();
  }
  boot();
  setTimeout(boot, 400);
  setTimeout(boot, 1200);
  setTimeout(boot, 2500);
  console.log('[Fluxora] share-access collaborator ready (restored)');
})();
