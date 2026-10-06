/* Fluxora fix v5 — register, profile, flows list */
(function(){
  function $(id){ return document.getElementById(id); }
  function onlyShow(id){
    ['publicPage','appMain','adminPage','adminGate','flowManager','guestModal'].forEach(k=>{
      const el=$(k); if(!el) return;
      if(k==='guestModal'){ el.hidden=(id!=='guestModal'); return; }
      el.hidden=(k!==id);
    });
  }
  function isGuest(){ return window.HEMOPI_SHARE_MODE==='guest'; }
  function flowHasContent(f){
    return !!(f && ((f.macros&&f.macros.length)||(f.nodes&&f.nodes.length)));
  }
  function cloneDefaultFlow(){
    const base = window.DEFAULT_FLOW || {macros:[],nodes:[],edges:[],votes:{},comments:{}};
    const f = JSON.parse(JSON.stringify(base));
    if(!f.votes)f.votes={}; if(!f.comments)f.comments={};
    if(!f.header)f.header={projectName:'HEMOPI 2.0',manager:'',director:'',po:'',pm:'',stakeholders:''};
    return f;
  }
  window.restoreHemopiFlow = async function(){
    flow = cloneDefaultFlow();
    flowTitle = flow.title || 'HEMOPI — Jornada do doador';
    if(!flowKey || String(flowKey).startsWith('local-')) flowKey='hemopi-main';
    try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(flow)); localStorage.setItem(FLOW_KEY_STORE, flowKey); }catch(e){}
    if(convexClient){
      try{
        await convexClient.mutation('flows:save',{
          key:flowKey, title:flowTitle,
          ownerEmail:(user?.email||'').toLowerCase()||undefined,
          data:flow
        });
      }catch(e){}
    }
    try{ render(); renderMacroBar(); updateProgress(); }catch(e){}
    if(typeof toast==='function') toast('HEMOPI restaurado');
  };
  window.loadFlow = async function(){
    if(convexClient){
      try{
        const remote = await convexClient.query('flows:get',{key:flowKey});
        if(remote?.data && flowHasContent(remote.data)){
          flow=remote.data; flowTitle=remote.title||flowKey;
          if(!flow.votes)flow.votes={}; if(!flow.comments)flow.comments={};
          return;
        }
        if(remote && !flowHasContent(remote.data||{})){
          flow=cloneDefaultFlow();
          flowTitle=remote.title||'HEMOPI — Jornada do doador';
          try{
            await convexClient.mutation('flows:save',{
              key:flowKey, title:flowTitle,
              ownerEmail:(user?.email||'').toLowerCase()||undefined,
              data:flow
            });
          }catch(e){}
          return;
        }
      }catch(e){}
    }
    try{
      const raw=localStorage.getItem(STORAGE_KEY);
      if(raw){ const p=JSON.parse(raw); if(flowHasContent(p)){ flow=p; return; } }
    }catch(e){}
    flow=cloneDefaultFlow();
    flowTitle=flowTitle||flow.title||'HEMOPI — Jornada do doador';
  };

  const _enterApp=window.enterApp;
  window.enterApp=async function(){
    onlyShow('appMain');
    if(typeof _enterApp==='function') await _enterApp();
    onlyShow('appMain');
    ensureFlow(); rebindAll();
    try{ await loadFlowListSafe(); }catch(e){}
    try{ await loadFlow(); }catch(e){}
    if(!flowHasContent(flow)) try{ await restoreHemopiFlow(); }catch(e){}
    // load profile fields from convex
    if(user?.email && convexClient){
      try{
        const p=await convexClient.query('auth:getByEmail',{email:user.email});
        if(p){ user.name=p.name||user.name; user.company=p.company||''; user.phone=p.phone||'';
          localStorage.setItem(USER_KEY, JSON.stringify(user));
          const lab=$('userLabel'); if(lab) lab.textContent=user.name+' · '+user.email;
        }
      }catch(e){}
    }
    try{ render(); renderMacroBar(); updateProgress(); }catch(e){}
    applyGuestUI();
  };

  function ensureFlow(){
    if(!flow||typeof flow!=='object') flow=(typeof emptyFlow==='function')?emptyFlow():{macros:[],nodes:[],edges:[],votes:{},comments:{}};
    if(!flow.macros)flow.macros=[]; if(!flow.nodes)flow.nodes=[]; if(!flow.edges)flow.edges=[];
    if(!flow.votes)flow.votes={}; if(!flow.comments)flow.comments={};
  }
  function applyGuestUI(){
    if(!isGuest()) return;
    ['btnNewFlow','btnAddMacro','btnOpenMgr','btnOpenProfile','btnShare','btnSeal','btnRestoreHemopi'].forEach(id=>{
      const el=$(id); if(el) el.style.display='none';
    });
  }

  async function loadFlowListSafe(){
    const sel=$('flowSelect'); if(!sel) return;
    const email=(user?.email||'').toLowerCase().trim();
    let rows=[];
    if(convexClient&&email&&!isGuest()){
      try{ rows=await convexClient.query('flows:list',{ownerEmail:email}); }catch(e){}
    }
    sel.innerHTML='';
    if(!rows?.length){
      const o=document.createElement('option');
      o.value=flowKey||'hemopi-main'; o.textContent=flowTitle||'HEMOPI principal';
      sel.appendChild(o); return;
    }
    rows.sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0));
    rows.forEach(r=>{
      const o=document.createElement('option');
      o.value=r.key; o.textContent=r.title||r.key;
      if(r.key===flowKey) o.selected=true;
      sel.appendChild(o);
    });
  }
  window.loadFlowList=loadFlowListSafe;

  async function hashPass(pw){
    const data=new TextEncoder().encode('fluxora:'+pw);
    const buf=await crypto.subtle.digest('SHA-256',data);
    return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
  }

  /* ---- AUTH: register blocks existing ---- */
  const form=$('authForm');
  if(form) form.onsubmit=async(ev)=>{
    ev.preventDefault();
    const email=($('authEmail')?.value||'').trim().toLowerCase();
    const password=$('authPassword')?.value||'';
    const err=$('authError');
    const showErr=(t)=>{ if(err){ err.textContent=t; err.hidden=false; } };
    if(!email.includes('@')){ showErr('E-mail inválido'); return; }
    if(password.length<6){ showErr('Senha com no mínimo 6 caracteres'); return; }
    const passwordHash=await hashPass(password);
    const mode=(typeof authMode!=='undefined')?authMode:($('tabRegister')?.classList.contains('active')?'register':'login');
    let name=($('authName')?.value||'').trim();
    const company=($('authCompany')?.value||'').trim();
    const phone=($('authPhone')?.value||'').trim();

    if(mode==='register'){
      if(!name) name=email.split('@')[0];
      // Pre-check Convex
      if(convexClient){
        try{
          const existing=await convexClient.query('auth:getByEmail',{email});
          if(existing && existing.hasPassword){
            showErr('Cadastro já existe para este e-mail. Use Entrar.');
            return;
          }
        }catch(e){}
      }
      // local db
      let db=[]; try{ db=JSON.parse(localStorage.getItem(USERS_KEY)||'[]'); }catch(e){}
      if(db.find(u=>u.email===email && u.passwordHash)){
        showErr('Cadastro já existe para este e-mail. Use Entrar.');
        return;
      }
      try{
        if(convexClient){
          await convexClient.mutation('auth:register',{email,name,passwordHash,company,phone});
        }
      }catch(e){
        const msg=String(e?.message||e||'');
        if(msg.includes('EMAIL_EXISTS')){
          showErr('Cadastro já existe para este e-mail. Use Entrar.');
          return;
        }
        console.warn(e);
      }
      db=db.filter(u=>u.email!==email);
      db.push({email,name,passwordHash,company,phone,createdAt:Date.now()});
      localStorage.setItem(USERS_KEY,JSON.stringify(db));
      user={email,name,company,phone};
      localStorage.setItem(USER_KEY,JSON.stringify(user));
      if($('loginModal')) $('loginModal').hidden=true;
      await window.enterApp();
      if(typeof toast==='function') toast('Conta criada');
      return;
    }

    // LOGIN — never auto-set password for foreign emails
    let ok=null;
    if(convexClient){
      try{ ok=await convexClient.query('auth:login',{email,passwordHash}); }catch(e){}
    }
    if(!ok){
      let db=[]; try{ db=JSON.parse(localStorage.getItem(USERS_KEY)||'[]'); }catch(e){}
      const row=db.find(u=>u.email===email&&u.passwordHash===passwordHash);
      if(row) ok={email:row.email,name:row.name,company:row.company||'',phone:row.phone||''};
    }
    if(!ok){
      // one-time complete if profile exists without password
      if(convexClient){
        try{
          const existing=await convexClient.query('auth:getByEmail',{email});
          if(existing && !existing.hasPassword){
            await convexClient.mutation('auth:register',{email,name:existing.name||email.split('@')[0],passwordHash,company:existing.company,phone:existing.phone});
            ok=await convexClient.query('auth:login',{email,passwordHash});
          }
        }catch(e){}
      }
    }
    if(!ok){ showErr('E-mail ou senha incorretos'); return; }
    user={email:ok.email,name:ok.name,company:ok.company||'',phone:ok.phone||''};
    localStorage.setItem(USER_KEY,JSON.stringify(user));
    if($('loginModal')) $('loginModal').hidden=true;
    await window.enterApp();
  };

  /* ---- PROFILE save + files ---- */
  async function uploadFile(file){
    if(!file||!convexClient) return null;
    const uploadUrl=await convexClient.mutation('files:generateUploadUrl',{});
    const result=await fetch(uploadUrl,{method:'POST',headers:{'Content-Type':file.type},body:file});
    const {storageId}=await result.json();
    const url=await convexClient.mutation('files:getUrl',{storageId});
    return {url,storageId};
  }
  function wireProfile(){
    const btn=$('btnOpenProfile');
    if(btn) btn.onclick=function(ev){
      ev.preventDefault();
      if(!user) return;
      const modal=$('profileModal'); if(!modal) return;
      if($('profName')) $('profName').value=user.name||'';
      if($('profCompany')) $('profCompany').value=user.company||'';
      if($('profPhone')) $('profPhone').value=user.phone||'';
      modal.classList.add('open');
    };
    const save=$('btnSaveProfile');
    if(save) save.onclick=async function(){
      if(!user) return;
      try{
        user.name=($('profName')?.value||'').trim()||user.name;
        user.company=($('profCompany')?.value||'').trim();
        user.phone=($('profPhone')?.value||'').trim();
        localStorage.setItem(USER_KEY,JSON.stringify(user));
        if(convexClient){
          await convexClient.mutation('auth:updateProfile',{
            email:user.email,
            name:user.name,
            company:user.company,
            phone:user.phone,
            photoStorageId:user.photoStorageId||undefined,
            logoStorageId:user.logoStorageId||undefined
          });
        }
        const lab=$('userLabel'); if(lab) lab.textContent=user.name+' · '+user.email;
        $('profileModal')?.classList.remove('open');
        if(typeof toast==='function') toast('Perfil salvo no Convex');
      }catch(e){
        console.warn(e);
        if(typeof toast==='function') toast('Erro ao salvar perfil',true);
      }
    };
    const pf=$('profPhotoFile');
    if(pf) pf.onchange=async(e)=>{
      const f=e.target.files?.[0]; if(!f) return;
      try{
        if(user.photoStorageId&&convexClient){
          try{ await convexClient.mutation('files:deleteFile',{storageId:user.photoStorageId}); }catch(err){}
        }
        const up=await uploadFile(f);
        if(up){ user.photo=up.url; user.photoStorageId=up.storageId;
          const img=$('profPhotoPrev'); if(img){ img.src=up.url; img.style.display='block'; }
          if(typeof toast==='function') toast('Foto enviada');
        }
      }catch(err){ console.warn(err); if(typeof toast==='function') toast('Falha no upload',true); }
    };
    const lf=$('profLogoFile');
    if(lf) lf.onchange=async(e)=>{
      const f=e.target.files?.[0]; if(!f) return;
      try{
        if(user.logoStorageId&&convexClient){
          try{ await convexClient.mutation('files:deleteFile',{storageId:user.logoStorageId}); }catch(err){}
        }
        const up=await uploadFile(f);
        if(up){ user.logo=up.url; user.logoStorageId=up.storageId;
          const img=$('profLogoPrev'); if(img){ img.src=up.url; img.style.display='block'; }
          if(typeof toast==='function') toast('Logo enviada');
        }
      }catch(err){ console.warn(err); }
    };
  }

  /* ---- FLOW MANAGER: list ALL + create appends ---- */
  async function renderFlowManager(){
    const list=$('flowManagerList'); if(!list) return;
    list.innerHTML='<p class="muted">Carregando…</p>';
    const email=(user?.email||'').toLowerCase().trim();
    let rows=[];
    if(convexClient&&email){
      try{ rows=await convexClient.query('flows:list',{ownerEmail:email}); }catch(e){ console.warn(e); }
    }
    if(!rows?.length){
      list.innerHTML='<p class="muted">Nenhum fluxo na nuvem. Use + Novo.</p>';
      return;
    }
    rows.sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0));
    list.innerHTML='';
    rows.forEach(r=>{
      const card=document.createElement('div');
      card.className='flow-mgr-card';
      card.innerHTML='<div><h4>'+(r.title||r.key)+'</h4><div class="flow-mgr-meta">'+r.key+'</div></div>';
      const actions=document.createElement('div');
      actions.style.cssText='display:flex;gap:6px;flex-wrap:wrap';
      const open=document.createElement('button'); open.className='btn pri'; open.textContent='Abrir';
      open.onclick=async()=>{
        flowKey=r.key; localStorage.setItem(FLOW_KEY_STORE,flowKey); flowTitle=r.title||r.key;
        $('flowManager').hidden=true; onlyShow('appMain');
        await loadFlow(); ensureFlow(); render(); renderMacroBar(); updateProgress();
      };
      const del=document.createElement('button'); del.className='btn danger'; del.textContent='Excluir';
      del.style.cssText='width:auto;margin:0';
      del.onclick=async()=>{
        if(!confirm('Excluir "'+(r.title||r.key)+'"?')) return;
        if(convexClient) try{ await convexClient.mutation('flows:remove',{key:r.key,ownerEmail:email}); }catch(e){}
        await renderFlowManager(); await loadFlowListSafe();
      };
      actions.append(open,del); card.appendChild(actions); list.appendChild(card);
    });
  }
  async function openFlowManager(){
    if(isGuest()) return;
    $('appMain').hidden=true;
    $('flowManager').hidden=false;
    await renderFlowManager();
  }
  async function createNewFlow(title){
    const email=(user?.email||'').toLowerCase().trim();
    if(!email){ if(typeof toast==='function') toast('Faça login',true); return; }
    const data=(typeof emptyFlow==='function')?emptyFlow():{macros:[],nodes:[],edges:[],votes:{},comments:{},header:{}};
    data.header={projectName:title};
    if(!convexClient){
      flowKey='local-'+Date.now().toString(36); flowTitle=title; flow=data;
      localStorage.setItem(FLOW_KEY_STORE,flowKey);
      if(typeof toast==='function') toast('Só local — Convex offline',true);
      return;
    }
    try{
      const r=await convexClient.mutation('flows:create',{title,ownerEmail:email,data});
      flowKey=r.key; flowTitle=title; flow=data;
      localStorage.setItem(FLOW_KEY_STORE,flowKey);
      await loadFlowListSafe();
      if(typeof toast==='function') toast('Fluxo na nuvem: '+title+' ('+r.key+')');
    }catch(e){
      console.warn(e);
      if(typeof toast==='function') toast('Erro ao criar no Convex',true);
    }
  }

  function rebindAll(){
    wireProfile();
    const bn=$('btnNewFlow');
    if(bn) bn.onclick=async()=>{
      const title=prompt('Nome do novo fluxo','Novo fluxo');
      if(!title) return;
      await createNewFlow(title);
      onlyShow('appMain');
      $('flowManager').hidden=true;
      try{ render(); renderMacroBar(); updateProgress(); }catch(e){}
    };
    const bm=$('btnOpenMgr');
    if(bm) bm.onclick=()=>openFlowManager();
    const bc=$('btnMgrClose');
    if(bc) bc.onclick=()=>{ $('flowManager').hidden=true; onlyShow('appMain'); };
    const bmn=$('btnMgrNew');
    if(bmn) bmn.onclick=async()=>{
      const title=prompt('Nome do novo fluxo','Novo fluxo');
      if(!title) return;
      await createNewFlow(title);
      await renderFlowManager();
    };
    // restore btn
    if(!$('btnRestoreHemopi')){
      const g=document.querySelector('.toolbar .tool-group');
      if(g){
        const b=document.createElement('button');
        b.type='button'; b.className='btn'; b.id='btnRestoreHemopi';
        b.textContent='↻ HEMOPI';
        b.onclick=()=>{ if(confirm('Restaurar fluxo HEMOPI?')) restoreHemopiFlow(); };
        g.appendChild(b);
      }
    }
    const am=$('btnAddMacro');
    if(am) am.onclick=()=>{
      ensureFlow();
      const used=new Set(flow.macros.map(m=>m.id));
      let id='A'; for(let i=0;i<26;i++){ const c=String.fromCharCode(65+i); if(!used.has(c)){ id=c; break; } }
      const y=flow.macros.length?Math.max(...flow.macros.map(m=>m.y+(m.h||200)))+40:40;
      flow.macros.push({id,title:'MACRO '+id,x:40,y,w:360,h:220,color:'#e8f4fc',border:'#1a5f8a'});
      saveLocal(); render(); renderMacroBar();
    };
  }

  // neutralize broken googleBtn / missing nodes
  window.initGoogleBtn=function(){};

  // null-safe refreshSide if missing sideOk
  const _refresh=window.refreshSide;
  window.refreshSide=function(){
    try{
      if($('sideOk')&&$('sideNo')&&typeof _refresh==='function') return _refresh();
      // minimal
      if(!selected) return;
    }catch(e){}
  };

  async function boot(){
    rebindAll();
    // password eye
    const inp=$('authPassword');
    if(inp&&!inp.parentElement.querySelector('.pw-toggle')){
      const wrap=document.createElement('div');
      wrap.style.cssText='position:relative;display:flex;align-items:center';
      inp.parentNode.insertBefore(wrap,inp); wrap.appendChild(inp);
      inp.style.paddingRight='40px'; inp.style.width='100%';
      const b=document.createElement('button'); b.type='button'; b.className='pw-toggle'; b.innerHTML='👁';
      b.style.cssText='position:absolute;right:8px;top:50%;transform:translateY(-50%);border:none;background:transparent;cursor:pointer';
      b.onclick=()=>{ const s=inp.type==='password'; inp.type=s?'text':'password'; b.innerHTML=s?'🙈':'👁'; };
      wrap.appendChild(b);
    }
    try{
      const u=JSON.parse(localStorage.getItem(USER_KEY)||'null');
      if(u&&u.email){ user=u; await window.enterApp(); }
      else onlyShow('publicPage');
    }catch(e){ onlyShow('publicPage'); }
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', boot);
  else setTimeout(boot,100);
  setTimeout(rebindAll,800);
})();
