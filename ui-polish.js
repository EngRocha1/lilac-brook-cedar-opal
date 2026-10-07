/* ui-polish: Editar on cards (forced), seal revoke, shapes, mobile, admin */
(function(){
  function $(id){ return document.getElementById(id); }
  function cx(){ return window.convexClient; }
  function isGuest(){ return window.HEMOPI_SHARE_MODE==='guest'; }
  function uid(p){ return p+Math.random().toString(36).slice(2,8); }

  if(!document.getElementById('fluxora-mobile-css')){
    const st=document.createElement('style');
    st.id='fluxora-mobile-css';
    st.textContent=`
      html,body{overflow-x:hidden;max-width:100vw}
      @media (max-width:720px){
        .hero,.hero-top{padding:8px 10px!important}
        .hero h1{font-size:1.15rem!important;margin:0!important}
        .tagline{font-size:.7rem!important}
        .hero-user{flex-wrap:wrap;gap:4px!important}
        .user-chip{max-width:160px;font-size:.65rem!important}
        .toolbar{flex-wrap:wrap;gap:6px!important;padding:6px 8px!important}
        .prog-wrap{width:100%;order:10}
        .project-header{padding:6px 8px!important;gap:6px!important}
        .hdr-field{min-width:calc(50% - 8px)!important}
        .share-panel{flex-wrap:wrap;gap:6px;padding:6px 8px!important}
        .workspace{flex-direction:column!important;min-height:50vh}
        .palette{width:100%!important;max-height:120px;overflow:auto;flex-direction:row!important;flex-wrap:wrap}
        .canvas-wrap{min-height:55vh;overflow:auto}
        #canvas{min-width:640px}
        .modal{max-width:96vw!important;max-height:90vh;overflow:auto}
        .flow-mgr-card{flex-direction:column;align-items:stretch!important}
        .flow-mgr-card .btn{width:100%;margin:2px 0}
        .admin-grid{grid-template-columns:1fr!important}
      }
      #sealBox{position:relative}
      .seal{position:relative;padding-right:36px}
      .seal-x{position:absolute;top:6px;right:8px;border:none;background:transparent;font-size:16px;cursor:pointer;line-height:1;opacity:.7}
      .flow-mgr-card .btn-edit-flow{
        background:#0f172a;color:#fff;border:none;border-radius:8px;
        padding:6px 12px;font-weight:600;cursor:pointer;font-size:13px;
      }
      .flow-mgr-card .btn-edit-flow:hover{background:#1e293b}
    `;
    document.head.appendChild(st);
  }

  function rebindShapeButtons(){
    const add=(id,fn)=>{
      const el=$(id); if(!el) return;
      el.onclick=function(ev){
        ev.preventDefault();
        if(isGuest()){ if(typeof toast==='function') toast('Convidado não edita formas',true); return; }
        if(typeof flow==='undefined'||!flow){ if(typeof toast==='function') toast('Nenhum fluxo carregado',true); return; }
        if(!flow.nodes) flow.nodes=[];
        if(!flow.macros) flow.macros=[];
        fn();
      };
    };
    add('btnAddProcess',()=>{
      const n={id:uid('n'),macro:null,type:'process',title:'Novo processo',x:120+Math.random()*200,y:120+Math.random()*100,w:180,h:48};
      flow.nodes.push(n); selected={kind:'node',id:n.id};
      saveLocal(); render(); updateProgress(); try{ openModal(); }catch(e){}
    });
    add('btnAddDecision',()=>{
      const n={id:uid('n'),macro:null,type:'decision',title:'Decisão?',x:120+Math.random()*200,y:120+Math.random()*100,w:160,h:70};
      flow.nodes.push(n); selected={kind:'node',id:n.id};
      saveLocal(); render(); updateProgress(); try{ openModal(); }catch(e){}
    });
    add('btnAddText',()=>{
      flow.nodes.push({id:uid('t'),macro:null,type:'process',title:'Texto',x:120,y:80,w:140,h:36});
      saveLocal(); render();
    });
    add('btnAddMacro',()=>{
      const used=new Set((flow.macros||[]).map(m=>m.id));
      let id='A';
      for(let i=0;i<26;i++){ const c=String.fromCharCode(65+i); if(!used.has(c)){ id=c; break; } }
      flow.macros.push({id,title:'MACRO '+id,x:40,y:40+flow.macros.length*12,w:320,h:200,color:'#f0f3f7',border:'#5c6b7a'});
      saveLocal(); render(); renderMacroBar();
    });
    const bc=$('btnConnect');
    if(bc) bc.onclick=function(){
      if(isGuest()) return;
      tool=(tool==='connect')?'select':'connect';
      connectFrom=null;
      bc.classList.toggle('active', tool==='connect');
    };
  }

  function enhanceSealBox(){
    const box=$('sealBox'); if(!box) return;
    const ensure=()=>{
      const seal=box.querySelector('.seal');
      if(seal && !seal.querySelector('.seal-x')){
        const x=document.createElement('button');
        x.type='button'; x.className='seal-x'; x.textContent='×'; x.title='Revogar selo';
        x.onclick=function(ev){
          ev.stopPropagation();
          if(!confirm('Revogar o selo de revisão deste fluxo?')) return;
          if(flow){ delete flow.seal; saveLocal(); box.innerHTML=''; if(typeof toast==='function') toast('Selo revogado'); }
        };
        seal.appendChild(x);
      }
    };
    ensure();
    new MutationObserver(ensure).observe(box,{childList:true,subtree:true});
  }

  /** Open the same modal as screenshot — always */
  function openEditForFlow(r){
    if(typeof openFlowEditModal==='function'){
      openFlowEditModal({ key:r.key, title:r.title||r.key, data:r.data });
      return;
    }
    // fallback: dispatch event
    window.dispatchEvent(new CustomEvent('fluxora-edit-flow',{ detail:{ key:r.key, title:r.title||r.key, data:r.data } }));
  }

  /** Canonical list renderer with ✎ Editar */
  window.renderFlowManager = async function(){
    const list=$('flowManagerList');
    if(!list) return;
    const email=(user?.email||'').toLowerCase().trim();
    list.innerHTML='<p class="muted">Consultando Convex…</p>';
    if(!cx()||!email){
      list.innerHTML='<p class="muted">Faça login.</p>';
      return;
    }
    let rows=[];
    try{ rows=await cx().query('flows:list',{ownerEmail:email})||[]; }
    catch(e){ list.innerHTML='<p class="muted">Erro: '+(e.message||e)+'</p>'; return; }
    if(!rows.length){
      list.innerHTML='<p class="muted">Nenhum fluxo. Use + Novo.</p>';
      return;
    }
    rows.sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0));
    list.innerHTML='';
    for(const r of rows){
      const card=document.createElement('div');
      card.className='flow-mgr-card';
      card.setAttribute('data-flow-key', r.key);
      const nodes=r.data?.nodes?.length||0;
      const macros=r.data?.macros?.length||0;
      const h=r.data?.header||{};
      const logoHtml = h.logoUrl
        ? '<img class="flow-card-logo" src="'+h.logoUrl+'" alt=""/>'
        : '<div class="flow-card-logo flow-card-logo--ph">◇</div>';
      card.innerHTML=
        '<div class="flow-card-left">'+logoHtml+
        '<div><h4>'+(r.title||r.key)+'</h4>'+
        '<div class="flow-mgr-meta">'+r.key+' · '+macros+' macros · '+nodes+' nós</div></div></div>';

      const actions=document.createElement('div');
      actions.className='flow-mgr-actions';
      actions.style.cssText='display:flex;gap:6px;flex-wrap:wrap;align-items:center';

      const edit=document.createElement('button');
      edit.type='button';
      edit.className='btn-edit-flow';
      edit.textContent='✎ Editar';
      edit.setAttribute('data-fe-edit','1');
      edit.onclick=function(ev){
        ev.preventDefault();
        ev.stopPropagation();
        openEditForFlow(r);
      };

      const open=document.createElement('button');
      open.type='button'; open.className='btn pri'; open.textContent='Abrir';
      open.onclick=async function(){
        flowKey=r.key;
        localStorage.setItem(FLOW_KEY_STORE, flowKey);
        flowTitle=r.title||r.key;
        if($('flowManager')) $('flowManager').hidden=true;
        if($('appMain')) $('appMain').hidden=false;
        if(typeof loadFlow==='function') await loadFlow();
        try{
          render(); renderMacroBar(); updateProgress();
          if(typeof renderProjectHeader==='function') await renderProjectHeader();
        }catch(e){}
      };

      const del=document.createElement('button');
      del.type='button'; del.className='btn danger'; del.textContent='Excluir';
      del.style.cssText='width:auto;margin:0';
      del.onclick=async function(){
        if(!confirm('Excluir "'+(r.title||r.key)+'"?')) return;
        try{ await cx().mutation('flows:remove',{key:r.key,ownerEmail:email}); }catch(e){}
        await window.renderFlowManager();
        if(typeof loadFlowList==='function') await loadFlowList();
      };

      actions.append(edit, open, del);
      card.appendChild(actions);
      list.appendChild(card);
    }
  };

  /** If another script rebuilt list without Editar, inject it */
  async function injectMissingEditButtons(){
    const list=$('flowManagerList');
    if(!list||list.hidden) return;
    const cards=list.querySelectorAll('.flow-mgr-card');
    if(!cards.length) return;
    const email=(user?.email||'').toLowerCase().trim();
    if(!cx()||!email) return;
    let rows=[];
    try{ rows=await cx().query('flows:list',{ownerEmail:email})||[]; }catch(e){ return; }
    const byKey={}; rows.forEach(r=>byKey[r.key]=r);
    const byTitle={}; rows.forEach(r=>byTitle[r.title||r.key]=r);

    cards.forEach(card=>{
      if(card.querySelector('[data-fe-edit]')) return;
      const key=card.getAttribute('data-flow-key');
      const h4=card.querySelector('h4');
      const title=h4?h4.textContent.trim():'';
      const r = (key&&byKey[key]) || byTitle[title] || rows[0];
      if(!r) return;
      const edit=document.createElement('button');
      edit.type='button';
      edit.className='btn-edit-flow';
      edit.textContent='✎ Editar';
      edit.setAttribute('data-fe-edit','1');
      edit.onclick=function(ev){ ev.preventDefault(); ev.stopPropagation(); openEditForFlow(r); };
      const actions=card.querySelector('.flow-mgr-actions') || card.querySelector('div:last-child');
      if(actions) actions.insertBefore(edit, actions.firstChild);
      else card.appendChild(edit);
    });
  }

  // When Meus fluxos opens
  function wireMgrOpen(){
    const btn=$('btnOpenMgr');
    if(!btn) return;
    const prev=btn.onclick;
    btn.onclick=async function(ev){
      if(typeof prev==='function') try{ await prev.call(this,ev); }catch(e){}
      if($('appMain')) $('appMain').hidden=true;
      if($('flowManager')) $('flowManager').hidden=false;
      await window.renderFlowManager();
      setTimeout(injectMissingEditButtons, 100);
      setTimeout(injectMissingEditButtons, 400);
    };
  }

  /* Admin Convex (keep) */
  async function renderAdminUsers(){
    const box=$('userList'); if(!box) return;
    box.innerHTML='<p class="hint">Carregando…</p>';
    if(!cx()){ box.innerHTML='<p class="hint">Convex offline</p>'; return; }
    let rows=[];
    try{ rows=await cx().query('auth:listAll',{})||[]; }
    catch(e){ box.innerHTML='<p class="hint">Erro listAll — aguarde deploy Convex</p>'; return; }
    if(!rows.length){ box.innerHTML='<p class="hint">Nenhum perfil</p>'; return; }
    box.innerHTML='';
    rows.forEach(u=>{
      const d=document.createElement('div');
      d.style.cssText='display:flex;justify-content:space-between;gap:8px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,.08);font-size:12px';
      d.innerHTML='<span>'+(u.name||'')+' · '+u.email+(u.company?' · '+u.company:'')+'</span>';
      const rm=document.createElement('button');
      rm.className='btn-ghost'; rm.textContent='Remover';
      rm.onclick=async()=>{
        if(!confirm('Remover '+u.email+'?')) return;
        const key=(window.HEMOPI_CONFIG&&HEMOPI_CONFIG.MASTER_ADMIN_HASH)||'';
        try{ await cx().mutation('auth:adminRemove',{email:u.email,adminKey:key}); await renderAdminUsers(); }catch(e){}
      };
      d.appendChild(rm); box.appendChild(d);
    });
  }

  function wireAdmin(){
    const footer=$('footerAdmin');
    if(footer) footer.onclick=async(e)=>{
      e.preventDefault();
      if($('publicPage')) $('publicPage').hidden=true;
      if($('appMain')) $('appMain').hidden=true;
      if($('adminGate')){ $('adminGate').hidden=false; return; }
      if($('adminPage')){ $('adminPage').hidden=false; await renderAdminUsers(); }
    };
    if($('btnAdminLogin')) $('btnAdminLogin').onclick=async()=>{
      const email=($('adminEmail')?.value||'').trim().toLowerCase();
      const pass=$('adminPass')?.value||'';
      const cfg=window.HEMOPI_CONFIG||{};
      const okEmail=!cfg.ADMIN_EMAIL||email===String(cfg.ADMIN_EMAIL).toLowerCase();
      const okPass=pass&&(pass===cfg.MASTER_ADMIN_HASH||pass===localStorage.getItem('fluxora_master'));
      if(!okEmail||!okPass){
        if($('adminGateMsg')){ $('adminGateMsg').textContent='Credenciais inválidas'; $('adminGateMsg').hidden=false; }
        return;
      }
      if($('adminGate')) $('adminGate').hidden=true;
      if($('adminPage')) $('adminPage').hidden=false;
      await renderAdminUsers();
    };
    if($('adminClose')) $('adminClose').onclick=()=>{
      if($('adminPage')) $('adminPage').hidden=true;
      if($('publicPage')) $('publicPage').hidden=false;
    };
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

  // Observe list for cards without edit
  const listEl=$('flowManagerList');
  if(listEl){
    new MutationObserver(()=>{ setTimeout(injectMissingEditButtons, 50); }).observe(listEl,{childList:true,subtree:true});
  }
})();
