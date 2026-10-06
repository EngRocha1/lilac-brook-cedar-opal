/* Fluxora fix v9 — avatar, logo, macro cascade vote, client seal */
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
  function cx(){ return window.convexClient; }
  function voteKey(k,id){ return k+':'+id; }

  /* ===== URL cache for storage ===== */
  const urlCache = {};
  async function resolveStorageUrl(storageId){
    if(!storageId) return null;
    const id = String(storageId);
    if(urlCache[id]) return urlCache[id];
    if(!cx()) return null;
    try{
      const url = await cx().mutation('files:getUrl', { storageId: id });
      if(url) urlCache[id] = url;
      return url;
    }catch(e){
      console.warn('getUrl', e);
      return null;
    }
  }

  /* ===== Avatar + user chip ===== */
  async function refreshUserChrome(){
    const lab = $('userLabel');
    if(!lab || !user) return;
    let photoUrl = user.photo || null;
    if(!photoUrl && user.photoStorageId){
      photoUrl = await resolveStorageUrl(user.photoStorageId);
      if(photoUrl) user.photo = photoUrl;
    }
    const name = user.name || user.email || '—';
    const email = user.email || '';
    const badge = isGuest() ? 'Convidado' : name;
    lab.innerHTML =
      (photoUrl
        ? '<img class="user-avatar" src="'+photoUrl+'" alt="" />'
        : '<span class="user-avatar user-avatar--ph">'+(name.charAt(0)||'?').toUpperCase()+'</span>') +
      '<span class="user-chip-text">'+badge+(isGuest()?' · '+email:' · '+email)+'</span>';
  }

  /* ===== Project header with logo ===== */
  function lockHeaderForGuest(){
    const box = $('projectHeader');
    if(!box) return;
    box.querySelectorAll('input,textarea,select').forEach(inp=>{
      inp.readOnly = true;
      inp.disabled = true;
      inp.style.pointerEvents = 'none';
      inp.style.background = '#eef1f4';
      inp.style.cursor = 'not-allowed';
      inp.title = 'Somente o criador pode editar o cabeçalho';
    });
  }

  window.renderProjectHeader = async function(){
    const box = $('projectHeader');
    if(!box || !flow) return;
    if(!flow.header) flow.header = {projectName:'',manager:'',director:'',po:'',pm:'',stakeholders:''};
    const h = flow.header;

    // logo: flow.header.logoUrl or creator logo
    let logoUrl = h.logoUrl || user?.logo || null;
    if(!logoUrl && (h.logoStorageId || user?.logoStorageId)){
      logoUrl = await resolveStorageUrl(h.logoStorageId || user.logoStorageId);
      if(logoUrl){
        if(h.logoStorageId) h.logoUrl = logoUrl;
        else if(user) user.logo = logoUrl;
      }
    }

    const fields = [
      ['projectName','Projeto'],['manager','Gerente'],['director','Diretor'],
      ['po','PO'],['pm','PM'],['stakeholders','Stakeholders']
    ];
    const logoHtml = logoUrl
      ? '<div class="header-logo-wrap"><img class="header-logo" src="'+logoUrl+'" alt="Logo"/></div>'
      : '<div class="header-logo-wrap header-logo-wrap--empty" title="Logo da empresa">◇</div>';

    box.innerHTML = logoHtml + fields.map(([k,lab])=>
      '<label class="hdr-field"><span>'+lab+'</span>'+
      '<input data-hk="'+k+'" value="'+String(h[k]||'').replace(/"/g,'"')+'" /></label>'
    ).join('');

    box.querySelectorAll('input[data-hk]').forEach(inp=>{
      inp.addEventListener('change', ()=>{
        if(isGuest()) return;
        if(!flow.header) flow.header = {};
        flow.header[inp.getAttribute('data-hk')] = inp.value;
        saveLocal();
      });
    });

    if(isGuest()) lockHeaderForGuest();
    renderSealBox();
  };

  /* ===== SEAL ===== */
  function renderSealBox(){
    const box = $('sealBox');
    if(!box) return;
    const s = flow && flow.seal;
    if(!s){
      box.innerHTML = '';
      return;
    }
    const color = s.status === 'green' ? 'green' : (s.status === 'red' ? 'red' : 'yellow');
    const label = s.status === 'green' ? '✓ REVISADO / APROVADO' : (s.status === 'red' ? '✗ REPROVADO' : '⚠ REVISÃO PARCIAL');
    box.innerHTML = '<div class="seal '+color+'">'+label+
      '<br/><small>'+(s.name||'')+' · '+(s.email||'')+
      (s.at ? ' · '+new Date(s.at).toLocaleString('pt-BR') : '')+
      '</small></div>';
  }

  function applyVoteToKey(key, val){
    if(!flow.votes) flow.votes = {};
    if(!flow.votes[key]) flow.votes[key] = {ok:0,no:0,mine:null};
    const v = flow.votes[key];
    // reset previous mine
    if(v.mine === 'ok') v.ok = Math.max(0, v.ok-1);
    if(v.mine === 'no') v.no = Math.max(0, v.no-1);
    if(val === 'ok'){ v.ok++; v.mine = 'ok'; }
    else if(val === 'no'){ v.no++; v.mine = 'no'; }
    else { v.mine = null; }
  }

  /** Macro OK → all nodes inside inherit OK */
  window.setMyVote = function(k, id, val){
    if(!flow) return;
    if(!flow.votes) flow.votes = {};
    const key = voteKey(k, id);
    const cur = flow.votes[key] || {ok:0,no:0,mine:null};
    // toggle off if same
    if(cur.mine === val){
      applyVoteToKey(key, null);
      // if macro un-voted, do not force children
    } else {
      applyVoteToKey(key, val);
      if(k === 'macro' && val === 'ok'){
        (flow.nodes||[]).forEach(n=>{
          if(n.macro === id || n.macro === String(id)){
            applyVoteToKey(voteKey('node', n.id), 'ok');
          }
        });
      }
      if(k === 'macro' && val === 'no'){
        // only mark macro; children stay individual
      }
    }
    saveLocal();
    try{ render(); renderMacroBar(); updateProgress(); refreshSide(); }catch(e){}
  };

  /** Client seal → all macros + nodes OK / green */
  window.applyClientSeal = function(status){
    if(!flow || !user) return;
    status = status || 'green';
    if(status === 'green'){
      (flow.macros||[]).forEach(m=> applyVoteToKey(voteKey('macro', m.id), 'ok'));
      (flow.nodes||[]).forEach(n=> applyVoteToKey(voteKey('node', n.id), 'ok'));
    }
    flow.seal = {
      status: status,
      name: user.name || user.email,
      email: user.email,
      at: Date.now()
    };
    saveLocal();
    try{ render(); renderMacroBar(); updateProgress(); renderSealBox(); }catch(e){}
    if(typeof toast==='function') toast(status==='green'?'Selo verde aplicado — tudo OK':'Selo registrado');
  };

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
    const v = (typeof getVotes==='function') ? getVotes(selected.kind, selected.id) : (flow.votes[voteKey(selected.kind,selected.id)]||{ok:0,no:0,mine:null});
    if(v.mine==='ok') document.querySelector('.vbtn[data-v="ok"]')?.classList.add('on-ok');
    if(v.mine==='no') document.querySelector('.vbtn[data-v="no"]')?.classList.add('on-no');
    if(comment) comment.value=(flow?.comments&&flow.comments[voteKey(selected.kind,selected.id)])||'';
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
      if(meta) meta.textContent='Macro '+(selected.id)+(isGuest()?'':' · 👍 aplica a todos os blocos');
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
    window.setMyVote(selected.kind, selected.id, val);
    try{ refreshSide(); }catch(e){}
    if(typeof toast==='function'){
      if(selected.kind==='macro' && val==='ok') toast('Macro OK — blocos internos herdaram 👍');
      else toast(val==='ok'?'👍':'👎');
    }
  };

  /* ---- LIST FLOWS + logo ---- */
  async function loadFlowListSafe(){
    const sel=$('flowSelect');
    const email=(user?.email||'').toLowerCase().trim();
    let rows=[];
    if(cx()&&email&&!isGuest()){
      try{ rows = await cx().query('flows:list', { ownerEmail: email }) || []; }
      catch(e){ console.error(e); }
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

  async function cardLogoUrl(r){
    const h = r?.data?.header || {};
    if(h.logoUrl) return h.logoUrl;
    if(h.logoStorageId) return await resolveStorageUrl(h.logoStorageId);
    if(user?.logo) return user.logo;
    if(user?.logoStorageId) return await resolveStorageUrl(user.logoStorageId);
    return null;
  }

  async function renderFlowManager(){
    const list=$('flowManagerList'); if(!list) return;
    const email=(user?.email||'').toLowerCase().trim();
    list.innerHTML='<p class="muted">Consultando Convex…</p>';
    if(!cx()||!email){
      list.innerHTML='<p class="muted">Faça login / Convex offline.</p>';
      return;
    }
    let rows=[];
    try{ rows = await cx().query('flows:list', { ownerEmail: email }) || []; }
    catch(e){ list.innerHTML='<p class="muted">Erro: '+String(e.message||e)+'</p>'; return; }
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
      const logo = await cardLogoUrl(r);
      const logoHtml = logo
        ? '<img class="flow-card-logo" src="'+logo+'" alt=""/>'
        : '<div class="flow-card-logo flow-card-logo--ph">◇</div>';
      card.innerHTML =
        '<div class="flow-card-left">'+logoHtml+
        '<div><h4>'+(r.title||r.key)+'</h4>'+
        '<div class="flow-mgr-meta">'+r.key+' · '+macros+' macros · '+nodes+' nós</div></div></div>';
      const actions=document.createElement('div');
      actions.style.cssText='display:flex;gap:6px;flex-wrap:wrap';
      const open=document.createElement('button'); open.className='btn pri'; open.textContent='Abrir';
      open.onclick=async()=>{
        flowKey=r.key; localStorage.setItem(FLOW_KEY_STORE,flowKey); flowTitle=r.title||r.key;
        if($('flowManager')) $('flowManager').hidden=true;
        onlyShow('appMain');
        await loadFlow();
        try{ render(); renderMacroBar(); updateProgress(); await renderProjectHeader(); }catch(e){}
      };
      const del=document.createElement('button'); del.className='btn danger'; del.textContent='Excluir';
      del.style.cssText='width:auto;margin:0';
      del.onclick=async()=>{
        if(!confirm('Excluir "'+(r.title||r.key)+'"?')) return;
        try{ await cx().mutation('flows:remove',{key:r.key, ownerEmail:email}); }catch(e){}
        await renderFlowManager(); await loadFlowListSafe();
      };
      actions.append(open,del); card.appendChild(actions); list.appendChild(card);
    }
  }

  async function createNewFlow(title){
    const email=(user?.email||'').toLowerCase().trim();
    if(!email||!cx()){ if(typeof toast==='function') toast('Login/Convex necessário',true); return null; }
    const data=(typeof emptyFlow==='function')?emptyFlow():{macros:[],nodes:[],edges:[],votes:{},comments:{},header:{}};
    data.header={projectName:title};
    // attach creator logo to new flow header if available
    if(user.logoStorageId) data.header.logoStorageId = String(user.logoStorageId);
    if(user.logo) data.header.logoUrl = user.logo;
    try{
      const r=await cx().mutation('flows:create',{title, ownerEmail:email, data});
      const rows=await cx().query('flows:list',{ownerEmail:email});
      flowKey=r.key; flowTitle=title; flow=data;
      localStorage.setItem(FLOW_KEY_STORE, flowKey);
      await loadFlowListSafe();
      if(typeof toast==='function') toast('Na nuvem: '+title+' · total '+rows.length);
      return r.key;
    }catch(e){
      if(typeof toast==='function') toast('Erro create: '+e.message, true);
      return null;
    }
  }

  /* ---- PROFILE with photo/logo upload ---- */
  async function hashPass(pw){
    const data=new TextEncoder().encode('fluxora:'+pw);
    const buf=await crypto.subtle.digest('SHA-256',data);
    return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
  }
  async function uploadFile(file){
    if(!file||!cx()) return null;
    const uploadUrl=await cx().mutation('files:generateUploadUrl',{});
    const res=await fetch(uploadUrl,{method:'POST',headers:{'Content-Type':file.type||'application/octet-stream'},body:file});
    const json=await res.json();
    const storageId=json.storageId;
    const url=await cx().mutation('files:getUrl',{storageId});
    return {url, storageId:String(storageId)};
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
            user.photoStorageId=p.photoStorageId||user.photoStorageId;
            user.logoStorageId=p.logoStorageId||user.logoStorageId;
            localStorage.setItem(USER_KEY, JSON.stringify(user));
          }
        }catch(e){}
      }
      if($('profName')) $('profName').value=user.name||'';
      if($('profCompany')) $('profCompany').value=user.company||'';
      if($('profPhone')) $('profPhone').value=user.phone||'';
      if(user.photoStorageId){
        const u=await resolveStorageUrl(user.photoStorageId);
        if(u && $('profPhotoPrev')){ $('profPhotoPrev').src=u; $('profPhotoPrev').style.display='block'; user.photo=u; }
      }
      if(user.logoStorageId){
        const u=await resolveStorageUrl(user.logoStorageId);
        if(u && $('profLogoPrev')){ $('profLogoPrev').src=u; $('profLogoPrev').style.display='block'; user.logo=u; }
      }
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
        // attach logo to current flow header for presentation
        if(flow && flow.header){
          if(user.logoStorageId) flow.header.logoStorageId = String(user.logoStorageId);
          if(user.logo) flow.header.logoUrl = user.logo;
          saveLocal();
        }
        await refreshUserChrome();
        await renderProjectHeader();
        if(typeof toast==='function') toast('Perfil salvo');
        $('profileModal')?.classList.remove('open');
      }catch(e){
        if(typeof toast==='function') toast('Erro perfil: '+e.message, true);
      }
    };
    if($('profPhotoFile')) $('profPhotoFile').onchange=async(e)=>{
      const f=e.target.files?.[0]; if(!f) return;
      try{
        const up=await uploadFile(f);
        if(up){
          user.photo=up.url; user.photoStorageId=up.storageId;
          if($('profPhotoPrev')){ $('profPhotoPrev').src=up.url; $('profPhotoPrev').style.display='block'; }
          if(typeof toast==='function') toast('Foto pronta — Salvar perfil');
        }
      }catch(err){ if(typeof toast==='function') toast('Upload falhou',true); }
    };
    if($('profLogoFile')) $('profLogoFile').onchange=async(e)=>{
      const f=e.target.files?.[0]; if(!f) return;
      try{
        const up=await uploadFile(f);
        if(up){
          user.logo=up.url; user.logoStorageId=up.storageId;
          if($('profLogoPrev')){ $('profLogoPrev').src=up.url; $('profLogoPrev').style.display='block'; }
          if(typeof toast==='function') toast('Logo pronta — Salvar perfil');
        }
      }catch(err){}
    };
  }

  /* ---- AUTH (keep) ---- */
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
    user={email:ok.email,name:ok.name,company:ok.company||'',phone:ok.phone||'',photoStorageId:ok.photoStorageId,logoStorageId:ok.logoStorageId};
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
      }catch(e){}
    }
    try{
      const raw=localStorage.getItem(STORAGE_KEY);
      if(raw){ const p=JSON.parse(raw); if(flowHasContent(p)){ flow=p; return; } }
    }catch(e){}
    flow=cloneDefaultFlow();
  };

  function applyGuestUI(){
    if(!isGuest()) return;
    ['btnNewFlow','btnAddMacro','btnOpenMgr','btnOpenProfile','btnShare'].forEach(id=>{
      const el=$(id); if(el) el.style.display='none';
    });
    // seal remains available for guest client
    lockHeaderForGuest();
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
      if(key) try{ render(); renderMacroBar(); updateProgress(); await renderProjectHeader(); }catch(e){}
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
    // Seal: creator OR guest client
    if($('btnSeal')){
      $('btnSeal').onclick=function(){
        if(!user){ if(typeof toast==='function') toast('Identifique-se',true); return; }
        if(!confirm('Aplicar SELO VERDE de revisão? Todos os macros e blocos ficarão OK.')) return;
        applyClientSeal('green');
      };
      // Guest can also seal
      if(isGuest()) $('btnSeal').style.display='';
    }
  }

  const _enterApp=window.enterApp;
  window.enterApp=async function(){
    onlyShow('appMain');
    if(typeof _enterApp==='function'){
      try{ await _enterApp(); }catch(e){}
    }
    onlyShow('appMain');
    rebindAll();
    // load profile media ids
    if(cx()&&user?.email){
      try{
        const p=await cx().query('auth:getByEmail',{email:user.email});
        if(p){
          user.name=p.name||user.name;
          user.company=p.company||user.company;
          user.phone=p.phone||user.phone;
          user.photoStorageId=p.photoStorageId||user.photoStorageId;
          user.logoStorageId=p.logoStorageId||user.logoStorageId;
          localStorage.setItem(USER_KEY, JSON.stringify(user));
        }
      }catch(e){}
    }
    await refreshUserChrome();
    try{ await loadFlowListSafe(); }catch(e){}
    try{ await loadFlow(); }catch(e){}
    if(!flowHasContent(flow)&&!isGuest()){
      flow=cloneDefaultFlow();
      flowKey=flowKey||'hemopi-main';
      flowTitle='HEMOPI principal';
    }
    try{ render(); renderMacroBar(); updateProgress(); await renderProjectHeader(); }catch(e){}
    applyGuestUI();
    presenceTick();
    if(!window._presenceTimer) window._presenceTimer=setInterval(()=>{ try{ presenceTick(); }catch(e){} }, 15000);
  };

  window.initGoogleBtn=function(){};
  try{
    ['btnMaster','masterPass','masterMsg','googleBtn','googleHint'].forEach(id=>{
      if(!$(id)){
        const d=document.createElement(id.includes('Pass')||id.includes('Email')?'input':'div');
        d.id=id; d.hidden=true; document.body.appendChild(d);
      }
    });
  }catch(e){}

  // CSS inject for avatar/logo
  if(!document.getElementById('fluxora-v9-css')){
    const st=document.createElement('style');
    st.id='fluxora-v9-css';
    st.textContent=`
      .user-chip{display:inline-flex!important;align-items:center;gap:8px;max-width:280px}
      .user-avatar{width:32px;height:32px;border-radius:50%;object-fit:cover;border:2px solid rgba(255,255,255,.5);flex-shrink:0}
      .user-avatar--ph{display:inline-flex;align-items:center;justify-content:center;background:#ff2d95;color:#fff;font-weight:800;font-size:14px}
      .user-chip-text{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .header-logo-wrap{width:52px;height:52px;border-radius:10px;background:#f0f4f8;display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0;border:1px solid #d0d7de}
      .header-logo{max-width:100%;max-height:100%;object-fit:contain}
      .header-logo-wrap--empty{color:#94a3b8;font-size:20px}
      #projectHeader{display:flex;flex-wrap:wrap;gap:10px;align-items:flex-end}
      .hdr-field{display:flex;flex-direction:column;font-size:11px;gap:2px;min-width:120px;flex:1}
      .hdr-field input{padding:6px 8px;border:1px solid #cfd8e3;border-radius:8px}
      .flow-mgr-card{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:12px;border:1px solid #e2e8f0;border-radius:12px;margin-bottom:10px;background:#fff}
      .flow-card-left{display:flex;align-items:center;gap:12px;min-width:0}
      .flow-card-logo{width:48px;height:48px;border-radius:10px;object-fit:contain;background:#f8fafc;border:1px solid #e2e8f0}
      .flow-card-logo--ph{display:flex;align-items:center;justify-content:center;color:#94a3b8;font-size:18px}
      #sealBox{padding:0 16px}
    `;
    document.head.appendChild(st);
  }

  async function boot(){
    rebindAll();
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
          await refreshUserChrome();
          applyGuestUI();
          try{ render(); renderMacroBar(); updateProgress(); await renderProjectHeader(); }catch(e){}
          // show seal button for guest
          if($('btnSeal')) $('btnSeal').style.display='';
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
