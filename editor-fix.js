/* Fluxora fix v7 — debounce save, profile, multi-flow list, drag release */
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

  /* ========== DEBOUNCED SAVE (fixes write conflicts) ========== */
  let _saveTimer = null;
  let _saveInFlight = false;
  let _saveQueued = false;
  window.saveLocal = function(){
    try{ if(flow) localStorage.setItem(STORAGE_KEY, JSON.stringify(flow)); }catch(e){}
    if(!convexClient || !flowKey) return;
    // never spam Convex
    clearTimeout(_saveTimer);
    _saveTimer = setTimeout(flushSave, 800);
  };
  async function flushSave(){
    if(_saveInFlight){ _saveQueued = true; return; }
    if(!convexClient || !flowKey || !flow) return;
    // skip pure-local keys until promoted
    if(String(flowKey).startsWith('local-')) return;
    _saveInFlight = true;
    try{
      await convexClient.mutation('flows:save', {
        key: flowKey,
        title: flowTitle,
        ownerEmail: (user?.email||'').toLowerCase() || undefined,
        data: flow
      });
    }catch(e){
      console.warn('flows:save', e);
    }finally{
      _saveInFlight = false;
      if(_saveQueued){ _saveQueued = false; _saveTimer = setTimeout(flushSave, 500); }
    }
  }
  window.flushSave = flushSave;

  /* ========== DRAG: only while button held; always release ========== */
  function endDrag(){
    const was = (typeof drag!=='undefined' && drag) || window.drag;
    window.drag = null;
    try{ drag = null; }catch(e){}
    if(was){
      try{ saveLocal(); }catch(e){}
    }
  }
  window.onUp = endDrag;
  // capture phase so nothing can block release
  window.addEventListener('mouseup', endDrag, true);
  window.addEventListener('pointerup', endDrag, true);
  window.addEventListener('pointercancel', endDrag, true);
  window.addEventListener('blur', endDrag, true);
  document.addEventListener('mouseup', endDrag, true);

  /* ========== refreshSide null-safe (vote works) ========== */
  window.refreshSide = function(){
    const title=$('sideTitle'), meta=$('sideMeta'), name=$('sideName'), comment=$('sideComment');
    document.querySelectorAll('.vbtn').forEach(b=>b.classList.remove('on-ok','on-no'));
    if(!selected){
      if(title) title.textContent='Avaliação';
      if(meta) meta.textContent='Clique no 💬';
      if(name) name.value='';
      if(comment) comment.value='';
      return;
    }
    const v = (typeof getVotes==='function') ? getVotes(selected.kind, selected.id) : {ok:0,no:0,mine:null};
    if(v.mine==='ok') document.querySelector('.vbtn[data-v="ok"]')?.classList.add('on-ok');
    if(v.mine==='no') document.querySelector('.vbtn[data-v="no"]')?.classList.add('on-no');
    if(comment) comment.value = (flow?.comments && flow.comments[selected.kind+':'+selected.id]) || '';
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
      if(meta) meta.textContent='Macro '+selected.id;
      if(name){ name.value=m?.title||''; name.readOnly=isGuest(); }
    }
    const del=$('btnModalDelete');
    if(del) del.style.display=isGuest()?'none':'';
    const isM=selected.kind==='macro';
    const cl=$('colorLabel'), sc=$('sideColor');
    if(cl) cl.style.display=(isM&&!isGuest())?'block':'none';
    if(sc) sc.style.display=(isM&&!isGuest())?'block':'none';
  };
  window.openModal=function(){ try{ refreshSide(); }catch(e){} $('modalBg')?.classList.add('open'); };
  window.closeModal=function(){ $('modalBg')?.classList.remove('open'); };
  window.voteSelected=function(val){
    if(!selected||!flow) return;
    if(typeof setMyVote==='function') setMyVote(selected.kind, selected.id, val);
    else {
      const key=selected.kind+':'+selected.id;
      if(!flow.votes[key]) flow.votes[key]={ok:0,no:0,mine:null};
      const v=flow.votes[key];
      if(v.mine===val){ if(val==='ok')v.ok=Math.max(0,v.ok-1); if(val==='no')v.no=Math.max(0,v.no-1); v.mine=null; }
      else { if(v.mine==='ok')v.ok=Math.max(0,v.ok-1); if(v.mine==='no')v.no=Math.max(0,v.no-1); if(val==='ok')v.ok++; if(val==='no')v.no++; v.mine=val; }
      saveLocal(); try{ render(); renderMacroBar(); updateProgress(); }catch(e){}
    }
    try{ refreshSide(); }catch(e){}
    if(typeof toast==='function') toast(val==='ok'?'👍':'👎');
  };

  /* ========== PROFILE — force Convex update ========== */
  async function hashPass(pw){
    const data=new TextEncoder().encode('fluxora:'+pw);
    const buf=await crypto.subtle.digest('SHA-256',data);
    return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
  }
  async function uploadFile(file){
    if(!file||!convexClient) return null;
    const uploadUrl=await convexClient.mutation('files:generateUploadUrl',{});
    const res=await fetch(uploadUrl,{method:'POST',headers:{'Content-Type':file.type||'application/octet-stream'},body:file});
    const json=await res.json();
    const storageId=json.storageId;
    const url=await convexClient.mutation('files:getUrl',{storageId});
    return {url, storageId:String(storageId)};
  }
  function wireProfile(){
    const openBtn=$('btnOpenProfile');
    if(openBtn) openBtn.onclick=async function(ev){
      ev.preventDefault();
      if(!user) return;
      // refresh from convex
      if(convexClient){
        try{
          const p=await convexClient.query('auth:getByEmail',{email:user.email});
          if(p){
            user.name=p.name||user.name;
            user.company=p.company||'';
            user.phone=p.phone||'';
            user.photoStorageId=p.photoStorageId||user.photoStorageId;
            user.logoStorageId=p.logoStorageId||user.logoStorageId;
          }
        }catch(e){}
      }
      if($('profName')) $('profName').value=user.name||'';
      if($('profCompany')) $('profCompany').value=user.company||'';
      if($('profPhone')) $('profPhone').value=user.phone||'';
      $('profileModal')?.classList.add('open');
    };
    const saveBtn=$('btnSaveProfile');
    if(saveBtn) saveBtn.onclick=async function(){
      if(!user?.email){ if(typeof toast==='function') toast('Faça login',true); return; }
      const name=($('profName')?.value||'').trim()||user.name;
      const company=($('profCompany')?.value||'').trim();
      const phone=($('profPhone')?.value||'').trim();
      user.name=name; user.company=company; user.phone=phone;
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      if(!convexClient){ if(typeof toast==='function') toast('Convex offline',true); return; }
      try{
        await convexClient.mutation('auth:updateProfile',{
          email: user.email.toLowerCase(),
          name, company, phone,
          photoStorageId: user.photoStorageId ? String(user.photoStorageId) : undefined,
          logoStorageId: user.logoStorageId ? String(user.logoStorageId) : undefined
        });
        // verify
        const p=await convexClient.query('auth:getByEmail',{email:user.email});
        console.log('profile after save', p);
        if(typeof toast==='function') toast('Perfil salvo: '+(p?.company||company||'ok'));
        $('profileModal')?.classList.remove('open');
        const lab=$('userLabel'); if(lab) lab.textContent=user.name+' · '+user.email;
      }catch(e){
        console.error('updateProfile', e);
        if(typeof toast==='function') toast('Erro perfil: '+String(e?.message||e), true);
      }
    };
    const pf=$('profPhotoFile');
    if(pf) pf.onchange=async(e)=>{
      const f=e.target.files?.[0]; if(!f) return;
      try{
        if(user.photoStorageId){
          try{ await convexClient.mutation('files:deleteFile',{storageId:user.photoStorageId}); }catch(err){}
        }
        const up=await uploadFile(f);
        if(up){
          user.photo=up.url; user.photoStorageId=up.storageId;
          const img=$('profPhotoPrev'); if(img){ img.src=up.url; img.style.display='block'; }
          if(typeof toast==='function') toast('Foto ok — clique Salvar perfil');
        }
      }catch(err){ console.error(err); if(typeof toast==='function') toast('Upload falhou',true); }
    };
    const lf=$('profLogoFile');
    if(lf) lf.onchange=async(e)=>{
      const f=e.target.files?.[0]; if(!f) return;
      try{
        if(user.logoStorageId){
          try{ await convexClient.mutation('files:deleteFile',{storageId:user.logoStorageId}); }catch(err){}
        }
        const up=await uploadFile(f);
        if(up){
          user.logo=up.url; user.logoStorageId=up.storageId;
          const img=$('profLogoPrev'); if(img){ img.src=up.url; img.style.display='block'; }
          if(typeof toast==='function') toast('Logo ok — clique Salvar perfil');
        }
      }catch(err){ console.error(err); }
    };
  }

  /* ========== AUTH register / login ========== */
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
      if(convexClient){
        try{
          const existing=await convexClient.query('auth:getByEmail',{email});
          if(existing?.hasPassword){ showErr('Cadastro já existe para este e-mail. Use Entrar.'); return; }
        }catch(e){}
        try{
          await convexClient.mutation('auth:register',{email,name,passwordHash,company,phone});
        }catch(e){
          if(String(e?.message||e).includes('EMAIL_EXISTS')){
            showErr('Cadastro já existe para este e-mail. Use Entrar.'); return;
          }
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
    if(convexClient){ try{ ok=await convexClient.query('auth:login',{email,passwordHash}); }catch(e){} }
    if(!ok && convexClient){
      // complete password only if profile has NO password yet
      try{
        const existing=await convexClient.query('auth:getByEmail',{email});
        if(existing && !existing.hasPassword){
          await convexClient.mutation('auth:register',{email,name:existing.name||email.split('@')[0],passwordHash,company:existing.company||'',phone:existing.phone||''});
          ok=await convexClient.query('auth:login',{email,passwordHash});
        }
      }catch(e){}
    }
    if(!ok){ showErr('E-mail ou senha incorretos'); return; }
    user={email:ok.email,name:ok.name,company:ok.company||'',phone:ok.phone||''};
    localStorage.setItem(USER_KEY,JSON.stringify(user));
    if($('loginModal')) $('loginModal').hidden=true;
    await window.enterApp();
  };

  /* ========== FLOWS: list ALL + create appends ========== */
  async function loadFlowListSafe(){
    const sel=$('flowSelect'); if(!sel) return;
    const email=(user?.email||'').toLowerCase().trim();
    let rows=[];
    if(convexClient&&email&&!isGuest()){
      try{ rows=await convexClient.query('flows:list',{ownerEmail:email}); }catch(e){ console.warn(e); }
    }
    sel.innerHTML='';
    if(!rows?.length){
      const o=document.createElement('option');
      o.value=flowKey||'hemopi-main'; o.textContent=flowTitle||'HEMOPI principal';
      sel.appendChild(o);
      return rows||[];
    }
    rows.sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0));
    rows.forEach(r=>{
      const o=document.createElement('option');
      o.value=r.key; o.textContent=r.title||r.key;
      if(r.key===flowKey) o.selected=true;
      sel.appendChild(o);
    });
    return rows;
  }
  window.loadFlowList=loadFlowListSafe;

  async function createNewFlow(title){
    const email=(user?.email||'').toLowerCase().trim();
    if(!email){ if(typeof toast==='function') toast('Faça login',true); return null; }
    if(!convexClient){ if(typeof toast==='function') toast('Convex offline — não cria na nuvem',true); return null; }
    const data=(typeof emptyFlow==='function')?emptyFlow():{macros:[],nodes:[],edges:[],votes:{},comments:{},header:{}};
    data.header={projectName:title};
    try{
      const r=await convexClient.mutation('flows:create',{title, ownerEmail:email, data});
      // verify it appears in list
      const rows=await convexClient.query('flows:list',{ownerEmail:email});
      console.log('flows after create', rows?.map(x=>x.key+' '+x.title));
      flowKey=r.key; flowTitle=title; flow=data;
      localStorage.setItem(FLOW_KEY_STORE, flowKey);
      await loadFlowListSafe();
      if(typeof toast==='function') toast('Criado na nuvem: '+title+' ('+rows.length+' fluxos)');
      return r.key;
    }catch(e){
      console.error('create flow', e);
      if(typeof toast==='function') toast('Erro ao criar: '+String(e?.message||e), true);
      return null;
    }
  }

  async function renderFlowManager(){
    const list=$('flowManagerList'); if(!list) return;
    list.innerHTML='<p class="muted">Carregando do Convex…</p>';
    const email=(user?.email||'').toLowerCase().trim();
    let rows=[];
    if(convexClient&&email){
      try{ rows=await convexClient.query('flows:list',{ownerEmail:email}); }catch(e){}
    }
    if(!rows?.length){
      list.innerHTML='<p class="muted">Nenhum fluxo na nuvem para '+email+'. Use + Novo.</p>';
      return;
    }
    rows.sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0));
    list.innerHTML='';
    rows.forEach(r=>{
      const card=document.createElement('div');
      card.className='flow-mgr-card';
      card.innerHTML='<div><h4>'+(r.title||r.key)+'</h4><div class="flow-mgr-meta">'+r.key+'</div></div>';
      const actions=document.createElement('div');
      actions.style.cssText='display:flex;gap:6px';
      const open=document.createElement('button'); open.className='btn pri'; open.textContent='Abrir';
      open.onclick=async()=>{
        flowKey=r.key; localStorage.setItem(FLOW_KEY_STORE,flowKey); flowTitle=r.title||r.key;
        $('flowManager').hidden=true; onlyShow('appMain');
        await loadFlow(); try{ render(); renderMacroBar(); updateProgress(); renderProjectHeader(); }catch(e){}
      };
      const del=document.createElement('button'); del.className='btn danger'; del.textContent='Excluir';
      del.style.cssText='width:auto;margin:0';
      del.onclick=async()=>{
        if(!confirm('Excluir "'+(r.title||r.key)+'"?')) return;
        try{ await convexClient.mutation('flows:remove',{key:r.key,ownerEmail:email}); }catch(e){}
        await renderFlowManager(); await loadFlowListSafe();
      };
      actions.append(open,del); card.appendChild(actions); list.appendChild(card);
    });
  }

  /* ========== Guest lock header ========== */
  function lockHeaderForGuest(){
    const box=$('projectHeader'); if(!box) return;
    box.querySelectorAll('input,textarea,select').forEach(inp=>{
      inp.readOnly=true; inp.disabled=true;
      inp.style.pointerEvents='none'; inp.style.background='#eef1f4';
      inp.title='Somente o criador edita o cabeçalho';
    });
  }
  function applyGuestUI(){
    if(!isGuest()) return;
    ['btnNewFlow','btnAddProcess','btnAddDecision','btnAddText','btnAddMacro','btnConnect',
     'btnOpenMgr','btnOpenProfile','btnShare','btnSeal','btnRestoreHemopi'].forEach(id=>{
      const el=$(id); if(el) el.style.display='none';
    });
    lockHeaderForGuest();
  }

  /* ========== Presence ========== */
  async function presenceTick(){
    if(!convexClient||!flowKey||!user?.email) return;
    if(String(flowKey).startsWith('local')) return;
    const email=user.email.toLowerCase();
    try{ await convexClient.mutation('shares:heartbeat',{flowKey,email,name:user.name||email.split('@')[0]}); }catch(e){}
    try{
      const list=await convexClient.query('shares:listPresence',{flowKey});
      const bar=$('presenceBar');
      if(!bar) return;
      if(!list?.length){ bar.innerHTML='<strong>Online:</strong> —'; return; }
      bar.innerHTML='<strong>Online:</strong> '+list.map(p=>
        '<span style="display:inline-flex;align-items:center;gap:4px;margin:0 6px;padding:2px 8px;border-radius:999px;background:#e8f4fc;font-size:12px">'+
        '<span style="width:7px;height:7px;border-radius:50%;background:#22c55e"></span>'+(p.name||p.email)+
        (p.email===email?' (você)':'')+'</span>'
      ).join('');
    }catch(e){}
  }

  window.loadFlow=async function(){
    if(convexClient){
      try{
        const remote=await convexClient.query('flows:get',{key:flowKey});
        if(remote?.data && flowHasContent(remote.data)){
          flow=remote.data; flowTitle=remote.title||flowKey;
          if(!flow.votes)flow.votes={}; if(!flow.comments)flow.comments={};
          return;
        }
        if(remote && !flowHasContent(remote.data||{})){
          flow=cloneDefaultFlow(); flowTitle=remote.title||'HEMOPI';
          if(!isGuest()){ try{ await convexClient.mutation('flows:save',{key:flowKey,title:flowTitle,ownerEmail:(user?.email||'').toLowerCase(),data:flow}); }catch(e){} }
          return;
        }
      }catch(e){}
    }
    try{
      const raw=localStorage.getItem(STORAGE_KEY);
      if(raw){ const p=JSON.parse(raw); if(flowHasContent(p)){ flow=p; return; } }
    }catch(e){}
    flow=cloneDefaultFlow();
  };

  window.restoreHemopiFlow=async function(){
    if(isGuest()) return;
    flow=cloneDefaultFlow(); flowTitle=flow.title||'HEMOPI';
    if(!flowKey||String(flowKey).startsWith('local')) flowKey='hemopi-main';
    localStorage.setItem(FLOW_KEY_STORE,flowKey);
    localStorage.setItem(STORAGE_KEY,JSON.stringify(flow));
    try{ await flushSave(); }catch(e){}
    try{ render(); renderMacroBar(); updateProgress(); }catch(e){}
    if(typeof toast==='function') toast('HEMOPI restaurado');
  };

  async function enterAsGuest(token,email){
    email=email.toLowerCase().trim();
    const err=$('guestError');
    const showErr=(t)=>{ if(err){ err.textContent=t; err.hidden=false; } };
    if(!email.includes('@')){ showErr('E-mail inválido'); return; }
    let sh=null;
    if(convexClient){ try{ sh=await convexClient.query('shares:getByToken',{token}); }catch(e){} }
    if(!sh){ showErr('Convite inválido — peça um novo link ao criador'); return; }
    if(!sh.emails.includes(email)&&sh.createdBy!==email){ showErr('E-mail não está neste convite'); return; }
    flowKey=sh.flowKey;
    localStorage.setItem(FLOW_KEY_STORE,flowKey);
    user={name:email.split('@')[0],email,isGuest:true};
    window.HEMOPI_SHARE_MODE='guest';
    if($('guestModal')) $('guestModal').hidden=true;
    await loadFlow();
    onlyShow('appMain');
    const lab=$('userLabel'); if(lab) lab.textContent='Convidado · '+email;
    applyGuestUI();
    try{ render(); renderMacroBar(); updateProgress(); renderProjectHeader?.(); }catch(e){}
    lockHeaderForGuest();
    presenceTick();
  }
  async function tryShareEntry(){
    const token=new URLSearchParams(location.search).get('share');
    if(!token) return false;
    if($('publicPage')) $('publicPage').hidden=true;
    if($('appMain')) $('appMain').hidden=true;
    if($('loginModal')) $('loginModal').hidden=true;
    const gm=$('guestModal'); if(gm) gm.hidden=false;
    window._shareToken=token;
    return true;
  }
  $('guestForm')?.addEventListener('submit',async(ev)=>{
    ev.preventDefault();
    await enterAsGuest(window._shareToken, $('guestEmail')?.value||'');
  });

  window.shareFlow=async function(){
    if(isGuest()||!user||!convexClient) return;
    if(String(flowKey).startsWith('local')){
      if(typeof toast==='function') toast('Salve o fluxo na nuvem antes',true); return;
    }
    await flushSave();
    const raw=prompt('E-mails convidados:',(flow.sharedEmails||[]).join(', '));
    if(raw==null) return;
    const emails=raw.split(/[,;\s]+/).map(e=>e.trim().toLowerCase()).filter(e=>e.includes('@'));
    if(!emails.length) return;
    try{
      const r=await convexClient.mutation('shares:create',{flowKey,emails,canEdit:false,createdBy:user.email.toLowerCase()});
      const url=location.origin+location.pathname.replace(/\/index\.html$/,'/')+'?share='+encodeURIComponent(r.token);
      try{ await navigator.clipboard.writeText(url); }catch(e){}
      prompt('Link convidado:', url);
    }catch(e){ if(typeof toast==='function') toast('Erro ao compartilhar',true); }
  };

  function rebindAll(){
    wireProfile();
    const bn=$('btnNewFlow');
    if(bn) bn.onclick=async()=>{
      const title=prompt('Nome do novo fluxo','Novo fluxo');
      if(!title) return;
      const key=await createNewFlow(title);
      if(key){ try{ render(); renderMacroBar(); updateProgress(); }catch(e){} }
    };
    const bm=$('btnOpenMgr');
    if(bm) bm.onclick=async()=>{ $('appMain').hidden=true; $('flowManager').hidden=false; await renderFlowManager(); };
    const bc=$('btnMgrClose');
    if(bc) bc.onclick=()=>{ $('flowManager').hidden=true; onlyShow('appMain'); };
    const bmn=$('btnMgrNew');
    if(bmn) bmn.onclick=async()=>{
      const title=prompt('Nome do novo fluxo','Novo fluxo');
      if(!title) return;
      await createNewFlow(title);
      await renderFlowManager();
    };
    const bs=$('btnShare');
    if(bs) bs.onclick=()=>shareFlow();
    if(!$('btnRestoreHemopi')){
      const g=document.querySelector('.toolbar .tool-group');
      if(g){
        const b=document.createElement('button');
        b.type='button'; b.className='btn'; b.id='btnRestoreHemopi'; b.textContent='↻ HEMOPI';
        b.onclick=()=>{ if(confirm('Restaurar HEMOPI?')) restoreHemopiFlow(); };
        g.appendChild(b);
      }
    }
  }

  const _enterApp=window.enterApp;
  window.enterApp=async function(){
    onlyShow('appMain');
    if(typeof _enterApp==='function') await _enterApp();
    onlyShow('appMain');
    rebindAll();
    try{ await loadFlowListSafe(); }catch(e){}
    try{ await loadFlow(); }catch(e){}
    if(!flowHasContent(flow)&&!isGuest()) try{ await restoreHemopiFlow(); }catch(e){}
    try{ render(); renderMacroBar(); updateProgress(); renderProjectHeader?.(); }catch(e){}
    applyGuestUI();
    presenceTick();
    if(!window._presenceTimer) window._presenceTimer=setInterval(()=>{ try{ presenceTick(); }catch(e){} }, 15000);
  };

  window.initGoogleBtn=function(){};

  async function boot(){
    rebindAll();
    if(await tryShareEntry()) return;
    try{
      const u=JSON.parse(localStorage.getItem(USER_KEY)||'null');
      if(u&&u.email){ user=u; await window.enterApp(); }
      else onlyShow('publicPage');
    }catch(e){ onlyShow('publicPage'); }
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', boot);
  else setTimeout(boot, 100);
  setTimeout(rebindAll, 900);
})();
