/* Fluxora fix v8 — raw Convex API, list flows, profile, null-safe */
(function(){
  function $(id){ return document.getElementById(id); }
  function isGuest(){ return window.HEMOPI_SHARE_MODE==='guest'; }
  function onlyShow(id){
    ['publicPage','appMain','adminPage','adminGate','flowManager','guestModal'].forEach(k=>{
      const el=$(k); if(!el) return;
      if(k==='guestModal'){ el.hidden=(id!=='guestModal'); return; }
      el.hidden=(k!==id);
    });
  }
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

  // Wait until convex-api.js set window.convexClient
  function cx(){ return window.convexClient; }

  /* ---- debounced save ---- */
  let _saveTimer=null, _saving=false, _queued=false;
  window.saveLocal=function(){
    try{ if(flow) localStorage.setItem(STORAGE_KEY, JSON.stringify(flow)); }catch(e){}
    if(!cx()||!flowKey||String(flowKey).startsWith('local-')) return;
    clearTimeout(_saveTimer);
    _saveTimer=setTimeout(flushSave, 900);
  };
  async function flushSave(){
    if(_saving){ _queued=true; return; }
    if(!cx()||!flowKey||!flow||String(flowKey).startsWith('local-')) return;
    _saving=true;
    try{
      await cx().mutation('flows:save',{
        key:flowKey, title:flowTitle,
        ownerEmail:(user?.email||'').toLowerCase()||undefined,
        data:flow
      });
    }catch(e){ console.warn('save', e); }
    finally{
      _saving=false;
      if(_queued){ _queued=false; _saveTimer=setTimeout(flushSave,600); }
    }
  }

  /* ---- drag release ---- */
  function endDrag(){
    const was=(typeof drag!=='undefined'&&drag)||window.drag;
    window.drag=null; try{ drag=null; }catch(e){}
    if(was) try{ saveLocal(); }catch(e){}
  }
  window.onUp=endDrag;
  window.addEventListener('mouseup',endDrag,true);
  window.addEventListener('pointerup',endDrag,true);
  window.addEventListener('blur',endDrag,true);

  /* ---- refreshSide / vote ---- */
  window.refreshSide=function(){
    const title=$('sideTitle'), meta=$('sideMeta'), name=$('sideName'), comment=$('sideComment');
    document.querySelectorAll('.vbtn').forEach(b=>b.classList.remove('on-ok','on-no'));
    if(!selected){
      if(title) title.textContent='Avaliação';
      if(meta) meta.textContent='Clique no 💬';
      if(name) name.value='';
      if(comment) comment.value='';
      return;
    }
    const v=(typeof getVotes==='function')?getVotes(selected.kind,selected.id):{ok:0,no:0,mine:null};
    if(v.mine==='ok') document.querySelector('.vbtn[data-v="ok"]')?.classList.add('on-ok');
    if(v.mine==='no') document.querySelector('.vbtn[data-v="no"]')?.classList.add('on-no');
    if(comment) comment.value=(flow?.comments&&flow.comments[selected.kind+':'+selected.id])||'';
    if(selected.kind==='node'){
      const n=nodeById(selected.id);
      if(title) title.textContent=(n?.title||'').replace(/\n/g,' · ');
      if(meta) meta.textContent='Módulo '+(n?.macro||'—');
      if(name){ name.value=n?.title||''; name.readOnly=isGuest(); }
    } else if(selected.kind==='edge'){
      const e=edgeById(selected.id);
      if(title) title.textContent=(e?.from||'')+' → '+(e?.to||'');
      if(name){ name.value=e?.label||''; name.readOnly=isGuest(); }
    } else if(selected.kind==='macro'){
      const m=macroById(selected.id);
      if(title) title.textContent=m?.title||selected.id;
      if(name){ name.value=m?.title||''; name.readOnly=isGuest(); }
    }
    const del=$('btnModalDelete');
    if(del) del.style.display=isGuest()?'none':'';
    const isM=selected.kind==='macro';
    if($('colorLabel')) $('colorLabel').style.display=(isM&&!isGuest())?'block':'none';
    if($('sideColor')) $('sideColor').style.display=(isM&&!isGuest())?'block':'none';
  };
  window.openModal=function(){ try{ refreshSide(); }catch(e){} $('modalBg')?.classList.add('open'); };
  window.closeModal=function(){ $('modalBg')?.classList.remove('open'); };
  window.voteSelected=function(val){
    if(!selected||!flow) return;
    if(typeof setMyVote==='function') setMyVote(selected.kind,selected.id,val);
    try{ refreshSide(); }catch(e){}
    if(typeof toast==='function') toast(val==='ok'?'👍':'👎');
  };

  /* ---- LIST FLOWS FROM CONVEX ---- */
  async function loadFlowListSafe(){
    const sel=$('flowSelect');
    const email=(user?.email||'').toLowerCase().trim();
    console.log('[Fluxora] list flows for', email, 'cx=', !!cx());
    let rows=[];
    if(cx()&&email&&!isGuest()){
      try{
        rows = await cx().query('flows:list', { ownerEmail: email }) || [];
        console.log('[Fluxora] flows listed', rows.length, rows.map(r=>r.key));
      }catch(e){
        console.error('[Fluxora] list error', e);
        if(typeof toast==='function') toast('Erro ao listar fluxos', true);
      }
    }
    if(sel){
      sel.innerHTML='';
      if(!rows.length){
        const o=document.createElement('option');
        o.value=flowKey||'hemopi-main';
        o.textContent=flowTitle||'(nenhum na nuvem)';
        sel.appendChild(o);
      } else {
        rows.sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0));
        rows.forEach(r=>{
          const o=document.createElement('option');
          o.value=r.key; o.textContent=r.title||r.key;
          if(r.key===flowKey) o.selected=true;
          sel.appendChild(o);
        });
      }
    }
    return rows;
  }
  window.loadFlowList = loadFlowListSafe;

  async function renderFlowManager(){
    const list=$('flowManagerList'); if(!list) return;
    const email=(user?.email||'').toLowerCase().trim();
    list.innerHTML='<p class="muted">Consultando Convex…</p>';
    if(!cx()){
      list.innerHTML='<p class="muted">Cliente Convex não carregou. Recarregue a página.</p>';
      return;
    }
    if(!email){
      list.innerHTML='<p class="muted">Faça login.</p>';
      return;
    }
    let rows=[];
    try{
      rows = await cx().query('flows:list', { ownerEmail: email }) || [];
    }catch(e){
      list.innerHTML='<p class="muted">Erro: '+String(e.message||e)+'</p>';
      return;
    }
    if(!rows.length){
      list.innerHTML='<p class="muted">Nenhum fluxo para <b>'+email+'</b>. Use + Novo (cria no Convex).</p>';
      return;
    }
    rows.sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0));
    list.innerHTML='';
    rows.forEach(r=>{
      const card=document.createElement('div');
      card.className='flow-mgr-card';
      const nodes=r.data?.nodes?.length||0;
      const macros=r.data?.macros?.length||0;
      card.innerHTML='<div><h4>'+(r.title||r.key)+'</h4><div class="flow-mgr-meta">'+r.key+' · '+macros+' macros · '+nodes+' nós</div></div>';
      const actions=document.createElement('div');
      actions.style.cssText='display:flex;gap:6px';
      const open=document.createElement('button'); open.className='btn pri'; open.textContent='Abrir';
      open.onclick=async()=>{
        flowKey=r.key; localStorage.setItem(FLOW_KEY_STORE,flowKey); flowTitle=r.title||r.key;
        if($('flowManager')) $('flowManager').hidden=true;
        onlyShow('appMain');
        await loadFlow();
        try{ render(); renderMacroBar(); updateProgress(); renderProjectHeader?.(); }catch(e){}
      };
      const del=document.createElement('button'); del.className='btn danger'; del.textContent='Excluir';
      del.style.cssText='width:auto;margin:0';
      del.onclick=async()=>{
        if(!confirm('Excluir "'+(r.title||r.key)+'"?')) return;
        try{ await cx().mutation('flows:remove',{key:r.key, ownerEmail:email}); }catch(e){ console.error(e); }
        await renderFlowManager(); await loadFlowListSafe();
      };
      actions.append(open,del); card.appendChild(actions); list.appendChild(card);
    });
  }

  async function createNewFlow(title){
    const email=(user?.email||'').toLowerCase().trim();
    if(!email){ if(typeof toast==='function') toast('Faça login',true); return null; }
    if(!cx()){ if(typeof toast==='function') toast('Convex offline',true); return null; }
    const data=(typeof emptyFlow==='function')?emptyFlow():{macros:[],nodes:[],edges:[],votes:{},comments:{},header:{}};
    data.header={projectName:title};
    try{
      const r=await cx().mutation('flows:create',{title, ownerEmail:email, data});
      const rows=await cx().query('flows:list',{ownerEmail:email});
      console.log('[Fluxora] after create', rows?.length, r);
      flowKey=r.key; flowTitle=title; flow=data;
      localStorage.setItem(FLOW_KEY_STORE, flowKey);
      await loadFlowListSafe();
      if(typeof toast==='function') toast('Na nuvem: '+title+' · total '+rows.length);
      return r.key;
    }catch(e){
      console.error(e);
      if(typeof toast==='function') toast('Erro create: '+e.message, true);
      return null;
    }
  }

  /* ---- PROFILE ---- */
  async function hashPass(pw){
    const data=new TextEncoder().encode('fluxora:'+pw);
    const buf=await crypto.subtle.digest('SHA-256',data);
    return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
  }
  function wireProfile(){
    const openBtn=$('btnOpenProfile');
    if(openBtn) openBtn.onclick=async function(ev){
      ev.preventDefault();
      if(!user) return;
      if(cx()){
        try{
          const p=await cx().query('auth:getByEmail',{email:user.email});
          if(p){
            user.name=p.name||user.name;
            user.company=p.company||'';
            user.phone=p.phone||'';
            localStorage.setItem(USER_KEY, JSON.stringify(user));
          }
        }catch(e){ console.warn(e); }
      }
      if($('profName')) $('profName').value=user.name||'';
      if($('profCompany')) $('profCompany').value=user.company||'';
      if($('profPhone')) $('profPhone').value=user.phone||'';
      $('profileModal')?.classList.add('open');
    };
    const saveBtn=$('btnSaveProfile');
    if(saveBtn) saveBtn.onclick=async function(){
      if(!user?.email) return;
      const name=($('profName')?.value||'').trim()||user.name;
      const company=($('profCompany')?.value||'').trim();
      const phone=($('profPhone')?.value||'').trim();
      user.name=name; user.company=company; user.phone=phone;
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      if(!cx()){ if(typeof toast==='function') toast('Convex offline',true); return; }
      try{
        await cx().mutation('auth:updateProfile',{
          email:user.email.toLowerCase(), name, company, phone,
          photoStorageId: user.photoStorageId?String(user.photoStorageId):undefined,
          logoStorageId: user.logoStorageId?String(user.logoStorageId):undefined
        });
        const p=await cx().query('auth:getByEmail',{email:user.email});
        console.log('[Fluxora] profile saved', p);
        if(typeof toast==='function') toast('Perfil OK: '+(p?.company||company));
        $('profileModal')?.classList.remove('open');
        if($('userLabel')) $('userLabel').textContent=user.name+' · '+user.email;
      }catch(e){
        console.error(e);
        if(typeof toast==='function') toast('Erro perfil: '+e.message, true);
      }
    };
  }

  /* ---- AUTH ---- */
  const form=$('authForm');
  if(form) form.onsubmit=async(ev)=>{
    ev.preventDefault();
    const email=($('authEmail')?.value||'').trim().toLowerCase();
    const password=$('authPassword')?.value||'';
    const err=$('authError');
    const showErr=(t)=>{ if(err){ err.textContent=t; err.hidden=false; } };
    if(!email.includes('@')){ showErr('E-mail inválido'); return; }
    if(password.length<6){ showErr('Senha mín. 6'); return; }
    const passwordHash=await hashPass(password);
    const mode=(typeof authMode!=='undefined')?authMode:($('tabRegister')?.classList.contains('active')?'register':'login');
    let name=($('authName')?.value||'').trim();
    const company=($('authCompany')?.value||'').trim();
    const phone=($('authPhone')?.value||'').trim();
    if(mode==='register'){
      if(!name) name=email.split('@')[0];
      if(cx()){
        try{
          const existing=await cx().query('auth:getByEmail',{email});
          if(existing?.hasPassword){ showErr('Cadastro já existe. Use Entrar.'); return; }
          await cx().mutation('auth:register',{email,name,passwordHash,company,phone});
        }catch(e){
          if(String(e.message||e).includes('EMAIL_EXISTS')){ showErr('Cadastro já existe. Use Entrar.'); return; }
          console.warn(e);
        }
      }
      user={email,name,company,phone};
      localStorage.setItem(USER_KEY,JSON.stringify(user));
      if($('loginModal')) $('loginModal').hidden=true;
      await window.enterApp();
      return;
    }
    let ok=null;
    if(cx()){
      try{ ok=await cx().query('auth:login',{email,passwordHash}); }catch(e){}
      if(!ok){
        try{
          const existing=await cx().query('auth:getByEmail',{email});
          if(existing && !existing.hasPassword){
            await cx().mutation('auth:register',{email,name:existing.name||email.split('@')[0],passwordHash,company:existing.company||'',phone:existing.phone||''});
            ok=await cx().query('auth:login',{email,passwordHash});
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

  window.loadFlow=async function(){
    if(cx()){
      try{
        const remote=await cx().query('flows:get',{key:flowKey});
        if(remote?.data && flowHasContent(remote.data)){
          flow=remote.data; flowTitle=remote.title||flowKey;
          if(!flow.votes)flow.votes={}; if(!flow.comments)flow.comments={};
          return;
        }
      }catch(e){ console.warn(e); }
    }
    try{
      const raw=localStorage.getItem(STORAGE_KEY);
      if(raw){ const p=JSON.parse(raw); if(flowHasContent(p)){ flow=p; return; } }
    }catch(e){}
    flow=cloneDefaultFlow();
  };

  function applyGuestUI(){
    if(!isGuest()) return;
    ['btnNewFlow','btnAddMacro','btnOpenMgr','btnOpenProfile','btnShare','btnSeal'].forEach(id=>{
      const el=$(id); if(el) el.style.display='none';
    });
    const box=$('projectHeader');
    if(box) box.querySelectorAll('input').forEach(i=>{ i.disabled=true; i.readOnly=true; });
  }

  async function presenceTick(){
    if(!cx()||!flowKey||!user?.email||String(flowKey).startsWith('local')) return;
    try{
      await cx().mutation('shares:heartbeat',{flowKey,email:user.email.toLowerCase(),name:user.name||user.email});
      const list=await cx().query('shares:listPresence',{flowKey});
      const bar=$('presenceBar');
      if(bar){
        bar.innerHTML=list?.length
          ? '<strong>Online:</strong> '+list.map(p=>p.name||p.email).join(', ')
          : '<strong>Online:</strong> —';
      }
    }catch(e){}
  }

  function rebindAll(){
    wireProfile();
    if($('btnNewFlow')) $('btnNewFlow').onclick=async()=>{
      const title=prompt('Nome do novo fluxo','Novo fluxo');
      if(!title) return;
      const key=await createNewFlow(title);
      if(key) try{ render(); renderMacroBar(); updateProgress(); }catch(e){}
    };
    if($('btnOpenMgr')) $('btnOpenMgr').onclick=async()=>{
      if($('appMain')) $('appMain').hidden=true;
      if($('flowManager')) $('flowManager').hidden=false;
      await renderFlowManager();
    };
    if($('btnMgrClose')) $('btnMgrClose').onclick=()=>{
      if($('flowManager')) $('flowManager').hidden=true;
      onlyShow('appMain');
    };
    if($('btnMgrNew')) $('btnMgrNew').onclick=async()=>{
      const title=prompt('Nome do novo fluxo','Novo fluxo');
      if(!title) return;
      await createNewFlow(title);
      await renderFlowManager();
    };
    if($('btnShare')) $('btnShare').onclick=async()=>{
      if(isGuest()||!user||!cx()) return;
      if(String(flowKey).startsWith('local')){ if(typeof toast==='function') toast('Salve na nuvem antes',true); return; }
      await flushSave();
      const raw=prompt('E-mails convidados:',(flow.sharedEmails||[]).join(', '));
      if(raw==null) return;
      const emails=raw.split(/[,;\s]+/).map(e=>e.trim().toLowerCase()).filter(e=>e.includes('@'));
      if(!emails.length) return;
      try{
        const r=await cx().mutation('shares:create',{flowKey,emails,canEdit:false,createdBy:user.email.toLowerCase()});
        const url=location.origin+location.pathname.replace(/\/index\.html$/,'/')+'?share='+encodeURIComponent(r.token);
        try{ await navigator.clipboard.writeText(url); }catch(e){}
        prompt('Link convidado:', url);
      }catch(e){ if(typeof toast==='function') toast('Erro share',true); }
    };
  }

  const _enterApp=window.enterApp;
  window.enterApp=async function(){
    onlyShow('appMain');
    if(typeof _enterApp==='function'){
      try{ await _enterApp(); }catch(e){ console.warn(e); }
    }
    onlyShow('appMain');
    // Force our convex client (override esm if broken)
    if(!window.__convexReady){
      console.warn('convex-api not ready');
    }
    rebindAll();
    try{ await loadFlowListSafe(); }catch(e){ console.error(e); }
    try{ await loadFlow(); }catch(e){}
    if(!flowHasContent(flow)&&!isGuest()){
      flow=cloneDefaultFlow();
      flowKey=flowKey||'hemopi-main';
      flowTitle='HEMOPI principal';
      try{
        if(cx()&&user?.email){
          await cx().mutation('flows:save',{key:'hemopi-main',title:'HEMOPI principal',ownerEmail:user.email.toLowerCase(),data:flow});
          flowKey='hemopi-main';
          await loadFlowListSafe();
        }
      }catch(e){}
    }
    try{ render(); renderMacroBar(); updateProgress(); renderProjectHeader?.(); }catch(e){}
    applyGuestUI();
    presenceTick();
    if(!window._presenceTimer) window._presenceTimer=setInterval(()=>{ try{ presenceTick(); }catch(e){} }, 15000);
  };

  // Neutralize broken handlers that crash on missing DOM nodes
  window.initGoogleBtn=function(){};
  try{
    const safe = (id, fn)=>{
      const el=$(id);
      if(el) el.onclick=fn;
    };
    // prevent editor.js btnMaster crash by defining dummy if missing
    if(!$('btnMaster')){
      const d=document.createElement('button');
      d.id='btnMaster'; d.hidden=true; document.body.appendChild(d);
    }
    if(!$('masterPass')){
      const d=document.createElement('input');
      d.id='masterPass'; d.hidden=true; document.body.appendChild(d);
    }
    if(!$('masterMsg')){
      const d=document.createElement('p');
      d.id='masterMsg'; d.hidden=true; document.body.appendChild(d);
    }
    if(!$('googleBtn')){
      const d=document.createElement('div');
      d.id='googleBtn'; d.hidden=true; document.body.appendChild(d);
    }
    if(!$('googleHint')){
      const d=document.createElement('p');
      d.id='googleHint'; d.hidden=true; document.body.appendChild(d);
    }
  }catch(e){}

  async function boot(){
    rebindAll();
    // share entry
    const token=new URLSearchParams(location.search).get('share');
    if(token){
      if($('publicPage')) $('publicPage').hidden=true;
      if($('appMain')) $('appMain').hidden=true;
      if($('loginModal')) $('loginModal').hidden=true;
      const gm=$('guestModal'); if(gm) gm.hidden=false;
      window._shareToken=token;
      $('guestForm')?.addEventListener('submit', async(ev)=>{
        ev.preventDefault();
        const email=($('guestEmail')?.value||'').trim().toLowerCase();
        if(!email.includes('@')) return;
        try{
          const sh=await cx().query('shares:getByToken',{token});
          if(!sh||(!sh.emails.includes(email)&&sh.createdBy!==email)){
            if($('guestError')){ $('guestError').textContent='E-mail não autorizado'; $('guestError').hidden=false; }
            return;
          }
          flowKey=sh.flowKey;
          user={name:email.split('@')[0],email,isGuest:true};
          window.HEMOPI_SHARE_MODE='guest';
          if(gm) gm.hidden=true;
          await loadFlow();
          onlyShow('appMain');
          if($('userLabel')) $('userLabel').textContent='Convidado · '+email;
          applyGuestUI();
          try{ render(); renderMacroBar(); updateProgress(); }catch(e){}
          presenceTick();
        }catch(e){ console.error(e); }
      });
      return;
    }
    try{
      const u=JSON.parse(localStorage.getItem(USER_KEY)||'null');
      if(u&&u.email){ user=u; await window.enterApp(); }
      else onlyShow('publicPage');
    }catch(e){ onlyShow('publicPage'); }
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', boot);
  else setTimeout(boot, 50);
  setTimeout(rebindAll, 800);
})();
