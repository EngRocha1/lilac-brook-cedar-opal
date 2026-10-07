/* ui-polish: Editar cards, seal revoke, shapes, mobile, admin Convex */
(function(){
  function $(id){ return document.getElementById(id); }
  function cx(){ return window.convexClient; }
  function isGuest(){ return window.HEMOPI_SHARE_MODE==='guest'; }
  function uid(p){ return p+Math.random().toString(36).slice(2,8); }

  /* ===== Mobile CSS ===== */
  if(!document.getElementById('fluxora-mobile-css')){
    const st=document.createElement('style');
    st.id='fluxora-mobile-css';
    st.textContent=`
      html,body{overflow-x:hidden;max-width:100vw}
      @media (max-width:720px){
        .hero,.hero-top{padding:8px 10px!important}
        .hero h1{font-size:1.15rem!important;margin:0!important}
        .tagline{font-size:.7rem!important;margin:2px 0 0!important}
        .hero-user{flex-wrap:wrap;gap:4px!important}
        .user-chip{max-width:160px;font-size:.65rem!important}
        .user-avatar{width:26px!important;height:26px!important}
        .hero-btn,.btn.hero-btn{padding:4px 8px!important;font-size:.7rem!important}
        .toolbar{flex-wrap:wrap;gap:6px!important;padding:6px 8px!important}
        .tool-group{flex-wrap:wrap}
        .prog-wrap{width:100%;order:10}
        .project-header{padding:6px 8px!important;gap:6px!important}
        .hdr-field{min-width:calc(50% - 8px)!important}
        .share-panel{flex-wrap:wrap;gap:6px;padding:6px 8px!important}
        .workspace{flex-direction:column!important;min-height:50vh}
        .palette{width:100%!important;max-height:120px;overflow:auto;flex-direction:row!important;flex-wrap:wrap}
        .canvas-wrap{min-height:55vh;overflow:auto;-webkit-overflow-scrolling:touch}
        #canvas{min-width:640px}
        .modal{max-width:96vw!important;max-height:90vh;overflow:auto}
        .flow-mgr-card{flex-direction:column;align-items:stretch!important}
        .flow-mgr-card .btn{width:100%;margin:2px 0}
        .presence-bar{font-size:12px;padding:4px 8px}
        .wa-float{width:48px;height:48px;bottom:16px;right:12px}
        .nav{padding:8px 12px}
        .hero-public h1{font-size:1.5rem!important}
        .hero-public .lead{font-size:.9rem}
        .admin-grid{grid-template-columns:1fr!important}
      }
      #sealBox{position:relative}
      .seal{position:relative;padding-right:36px}
      .seal-x{position:absolute;top:6px;right:8px;border:none;background:transparent;font-size:16px;cursor:pointer;line-height:1;opacity:.7}
      .seal-x:hover{opacity:1}
    `;
    document.head.appendChild(st);
  }

  /* ===== Shapes / macros rebind ===== */
  function rebindShapeButtons(){
    const add = (id, fn)=>{
      const el=$(id);
      if(!el) return;
      el.onclick = function(ev){
        ev.preventDefault();
        if(isGuest()){ if(typeof toast==='function') toast('Convidado não edita formas',true); return; }
        if(typeof flow==='undefined' || !flow){
          if(typeof toast==='function') toast('Nenhum fluxo carregado',true);
          return;
        }
        if(!flow.nodes) flow.nodes=[];
        if(!flow.macros) flow.macros=[];
        fn();
      };
    };
    add('btnAddProcess', ()=>{
      const n={id:uid('n'),macro:null,type:'process',title:'Novo processo',
        x:120+Math.random()*200,y:120+Math.random()*100,w:180,h:48};
      flow.nodes.push(n);
      selected={kind:'node',id:n.id};
      saveLocal(); render(); updateProgress();
      try{ openModal(); }catch(e){}
      if(typeof toast==='function') toast('Processo adicionado');
    });
    add('btnAddDecision', ()=>{
      const n={id:uid('n'),macro:null,type:'decision',title:'Decisão?',
        x:120+Math.random()*200,y:120+Math.random()*100,w:160,h:70};
      flow.nodes.push(n);
      selected={kind:'node',id:n.id};
      saveLocal(); render(); updateProgress();
      try{ openModal(); }catch(e){}
      if(typeof toast==='function') toast('Decisão adicionada');
    });
    add('btnAddText', ()=>{
      const n={id:uid('t'),macro:null,type:'process',title:'Texto',
        x:120,y:80,w:140,h:36};
      flow.nodes.push(n);
      saveLocal(); render();
    });
    add('btnAddMacro', ()=>{
      const used = new Set((flow.macros||[]).map(m=>m.id));
      let id='A';
      for(let i=0;i<26;i++){
        const c=String.fromCharCode(65+i);
        if(!used.has(c)){ id=c; break; }
      }
      flow.macros.push({id,title:'MACRO '+id,x:40,y:40+flow.macros.length*12,w:320,h:200,color:'#f0f3f7',border:'#5c6b7a'});
      saveLocal(); render(); renderMacroBar();
      if(typeof toast==='function') toast('Macro '+id+' criado');
    });
    const bc=$('btnConnect');
    if(bc) bc.onclick=function(){
      if(isGuest()) return;
      tool = (tool==='connect') ? 'select' : 'connect';
      connectFrom=null;
      bc.classList.toggle('active', tool==='connect');
      if(typeof toast==='function') toast(tool==='connect'?'Modo conexão: clique origem → destino':'Modo seleção');
    };
  }

  /* ===== Seal revoke ===== */
  function enhanceSealBox(){
    const box=$('sealBox');
    if(!box) return;
    const obs = new MutationObserver(()=>{
      const seal = box.querySelector('.seal');
      if(seal && !seal.querySelector('.seal-x')){
        const x=document.createElement('button');
        x.type='button'; x.className='seal-x'; x.title='Revogar selo'; x.textContent='×';
        x.onclick=function(ev){
          ev.stopPropagation();
          if(!confirm('Revogar o selo de revisão deste fluxo?')) return;
          if(flow){
            delete flow.seal;
            if(typeof saveLocal==='function') saveLocal();
            box.innerHTML='';
            if(typeof toast==='function') toast('Selo revogado');
          }
        };
        seal.appendChild(x);
      }
    });
    obs.observe(box,{childList:true,subtree:true});
    // run once
    const seal = box.querySelector('.seal');
    if(seal && !seal.querySelector('.seal-x')){
      const x=document.createElement('button');
      x.type='button'; x.className='seal-x'; x.textContent='×';
      x.onclick=function(){
        if(!confirm('Revogar o selo de revisão deste fluxo?')) return;
        if(flow){ delete flow.seal; saveLocal(); box.innerHTML=''; if(typeof toast==='function') toast('Selo revogado'); }
      };
      seal.appendChild(x);
    }
  }

  /* ===== Meus fluxos: full card rebuild with Editar ===== */
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
    try{ rows = await cx().query('flows:list',{ownerEmail:email})||[]; }
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
      const nodes=r.data?.nodes?.length||0;
      const macros=r.data?.macros?.length||0;
      let logoHtml='<div class="flow-card-logo flow-card-logo--ph">◇</div>';
      const h=r.data?.header||{};
      if(h.logoUrl) logoHtml='<img class="flow-card-logo" src="'+h.logoUrl+'" alt=""/>';
      card.innerHTML=
        '<div class="flow-card-left">'+logoHtml+
        '<div><h4>'+(r.title||r.key)+'</h4>'+
        '<div class="flow-mgr-meta">'+r.key+' · '+macros+' macros · '+nodes+' nós</div></div></div>';
      const actions=document.createElement('div');
      actions.style.cssText='display:flex;gap:6px;flex-wrap:wrap';

      const edit=document.createElement('button');
      edit.type='button'; edit.className='btn'; edit.textContent='✎ Editar';
      edit.onclick=()=>{
        if(typeof openFlowEditModal==='function'){
          openFlowEditModal({ key:r.key, title:r.title||r.key, data:r.data });
        } else if(typeof toast==='function') toast('Modal de edição indisponível',true);
      };

      const open=document.createElement('button');
      open.type='button'; open.className='btn pri'; open.textContent='Abrir';
      open.onclick=async()=>{
        flowKey=r.key;
        localStorage.setItem(FLOW_KEY_STORE,flowKey);
        flowTitle=r.title||r.key;
        if($('flowManager')) $('flowManager').hidden=true;
        if($('appMain')) $('appMain').hidden=false;
        if(typeof loadFlow==='function') await loadFlow();
        try{ render(); renderMacroBar(); updateProgress(); if(typeof renderProjectHeader==='function') await renderProjectHeader(); }catch(e){}
      };

      const del=document.createElement('button');
      del.type='button'; del.className='btn danger'; del.textContent='Excluir';
      del.style.cssText='width:auto;margin:0';
      del.onclick=async()=>{
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

  /* ===== Admin Convex ===== */
  async function renderAdminUsers(){
    const box=$('userList');
    if(!box) return;
    box.innerHTML='<p class="hint">Carregando Convex…</p>';
    if(!cx()){ box.innerHTML='<p class="hint">Convex offline</p>'; return; }
    let rows=[];
    try{ rows = await cx().query('auth:listAll',{})||[]; }
    catch(e){ box.innerHTML='<p class="hint">Erro: '+(e.message||e)+'</p>'; return; }
    if(!rows.length){ box.innerHTML='<p class="hint">Nenhum perfil no Convex</p>'; return; }
    box.innerHTML='';
    rows.forEach(u=>{
      const d=document.createElement('div');
      d.style.cssText='display:flex;justify-content:space-between;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,.08)';
      d.innerHTML='<span style="font-size:12px">'+(u.name||'')+' · '+u.email+
        (u.company?' · '+u.company:'')+
        (u.hasPassword?'':' · <em>sem senha</em>')+'</span>';
      const rm=document.createElement('button');
      rm.className='btn-ghost'; rm.textContent='Remover';
      rm.style.cssText='padding:2px 8px;font-size:11px';
      rm.onclick=async()=>{
        if(!confirm('Remover '+u.email+' do Convex?')) return;
        const key = (window.HEMOPI_CONFIG&&HEMOPI_CONFIG.MASTER_ADMIN_HASH)||'';
        try{
          await cx().mutation('auth:adminRemove',{email:u.email, adminKey:key});
          if(typeof toast==='function') toast('Removido');
          await renderAdminUsers();
        }catch(e){ if(typeof toast==='function') toast('Erro',true); }
      };
      d.appendChild(rm);
      box.appendChild(d);
    });
  }

  function wireAdmin(){
    const footer=$('footerAdmin');
    if(footer){
      footer.onclick=async(e)=>{
        e.preventDefault();
        // gate: use admin gate page if exists
        if($('publicPage')) $('publicPage').hidden=true;
        if($('appMain')) $('appMain').hidden=true;
        if($('adminGate')){
          $('adminGate').hidden=false;
          return;
        }
        if($('adminPage')){
          $('adminPage').hidden=false;
          await renderAdminUsers();
        }
      };
    }
    const btnLogin=$('btnAdminLogin');
    if(btnLogin){
      btnLogin.onclick=async()=>{
        const email=($('adminEmail')?.value||'').trim().toLowerCase();
        const pass=$('adminPass')?.value||'';
        const cfg=window.HEMOPI_CONFIG||{};
        const okEmail = !cfg.ADMIN_EMAIL || email===cfg.ADMIN_EMAIL.toLowerCase();
        const okPass = pass && (pass===cfg.MASTER_ADMIN_HASH || pass===localStorage.getItem('fluxora_master'));
        if(!okEmail||!okPass){
          if($('adminGateMsg')){ $('adminGateMsg').textContent='Credenciais inválidas'; $('adminGateMsg').hidden=false; }
          return;
        }
        if($('adminGate')) $('adminGate').hidden=true;
        if($('adminPage')) $('adminPage').hidden=false;
        await renderAdminUsers();
      };
    }
    if($('adminClose')){
      $('adminClose').onclick=()=>{
        if($('adminPage')) $('adminPage').hidden=true;
        if($('publicPage')) $('publicPage').hidden=false;
      };
    }
    if($('btnAddUser')){
      $('btnAddUser').onclick=async()=>{
        const email=($('newUserEmail')?.value||'').trim().toLowerCase();
        const name=($('newUserName')?.value||'').trim()||email.split('@')[0];
        if(!email.includes('@')) return;
        if(!cx()){ if(typeof toast==='function') toast('Convex offline',true); return; }
        // create profile shell via register with temp hash user must reset — or updateProfile after minimal insert
        try{
          const existing=await cx().query('auth:getByEmail',{email});
          if(existing){ if(typeof toast==='function') toast('Já existe'); await renderAdminUsers(); return; }
          // use register with placeholder password hash admin-set
          const data=new TextEncoder().encode('fluxora:changeme');
          const buf=await crypto.subtle.digest('SHA-256',data);
          const passwordHash=Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
          await cx().mutation('auth:register',{email,name,passwordHash,company:'',phone:''});
          if(typeof toast==='function') toast('Usuário criado (senha temporária changeme)');
          if($('newUserEmail')) $('newUserEmail').value='';
          if($('newUserName')) $('newUserName').value='';
          await renderAdminUsers();
        }catch(e){ if(typeof toast==='function') toast(String(e.message||e),true); }
      };
    }
  }

  function boot(){
    rebindShapeButtons();
    enhanceSealBox();
    wireAdmin();
  }
  boot();
  setTimeout(boot, 400);
  setTimeout(boot, 1200);
  setTimeout(rebindShapeButtons, 2000);
})();
