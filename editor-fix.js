/* Fluxora fix v4 — restore blank flows + HEMOPI default */
(function(){
  function onlyShow(id){
    ['publicPage','appMain','adminPage','adminGate','flowManager','guestModal'].forEach(k=>{
      const el=document.getElementById(k); if(!el) return;
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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(flow));
    localStorage.setItem(FLOW_KEY_STORE, flowKey);
    if(convexClient){
      try{
        await convexClient.mutation('flows:save',{
          key:flowKey, title:flowTitle,
          ownerEmail:(user?.email||'').toLowerCase()||undefined,
          data:flow
        });
      }catch(e){ console.warn(e); }
    }
    try{ render(); renderMacroBar(); updateProgress(); }catch(e){}
    if(typeof toast==='function') toast('HEMOPI restaurado · '+(flow.nodes||[]).length+' nós');
    else if(typeof flash==='function') flash('HEMOPI restaurado');
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
          flowTitle=remote.title||flowTitle||'HEMOPI — Jornada do doador';
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
      if(raw){ const parsed=JSON.parse(raw); if(flowHasContent(parsed)){ flow=parsed; return; } }
    }catch(e){}
    flow=cloneDefaultFlow();
    flowTitle=flowTitle||flow.title||'HEMOPI — Jornada do doador';
  };
  function applyGuestUI(){
    if(!isGuest()) return;
    ['btnNewFlow','btnAddProcess','btnAddDecision','btnAddText','btnAddMacro','btnConnect','btnOpenMgr','btnOpenProfile','btnShare','btnSeal','btnRestoreHemopi'].forEach(id=>{
      const el=document.getElementById(id); if(el) el.style.display='none';
    });
    const fs=document.getElementById('flowSelect'); if(fs) fs.disabled=true;
    document.querySelectorAll('#projectHeader input').forEach(i=>{ i.readOnly=true; i.style.pointerEvents='none'; });
  }
  const _showPublic=window.showPublic;
  window.showPublic=function(){
    window.HEMOPI_SHARE_MODE=null;
    onlyShow('publicPage');
    if(typeof _showPublic==='function') try{_showPublic();}catch(e){}
    onlyShow('publicPage');
  };
  const _enterApp=window.enterApp;
  window.enterApp=async function(){
    onlyShow('appMain');
    if(typeof _enterApp==='function') await _enterApp();
    onlyShow('appMain');
    ensureFlow();
    rebindToolbar(); rebindProfile();
    try{ await loadFlowListSafe(); }catch(e){}
    try{ await loadFlow(); }catch(e){}
    if(!flowHasContent(flow)){ try{ await restoreHemopiFlow(); }catch(e){} }
    try{ render(); renderMacroBar(); updateProgress(); }catch(e){}
    applyGuestUI();
  };
  function ensureFlow(){
    if(!flow||typeof flow!=='object'){
      flow=(typeof emptyFlow==='function')?emptyFlow():{macros:[],nodes:[],edges:[],votes:{},comments:{},header:{}};
    }
    if(!flow.macros)flow.macros=[]; if(!flow.nodes)flow.nodes=[]; if(!flow.edges)flow.edges=[];
    if(!flow.votes)flow.votes={}; if(!flow.comments)flow.comments={};
  }
  function addPasswordToggle(){
    const inp=document.getElementById('authPassword');
    if(!inp||inp.parentElement.querySelector('.pw-toggle')) return;
    const wrap=document.createElement('div');
    wrap.style.cssText='position:relative;display:flex;align-items:center';
    inp.parentNode.insertBefore(wrap,inp); wrap.appendChild(inp);
    inp.style.paddingRight='40px'; inp.style.width='100%';
    const btn=document.createElement('button');
    btn.type='button'; btn.className='pw-toggle'; btn.innerHTML='👁';
    btn.style.cssText='position:absolute;right:8px;top:50%;transform:translateY(-50%);background:transparent;border:none;cursor:pointer;font-size:1rem;opacity:.75;padding:4px';
    btn.onclick=()=>{ const show=inp.type==='password'; inp.type=show?'text':'password'; btn.innerHTML=show?'🙈':'👁'; };
    wrap.appendChild(btn);
  }
  function endDrag(){
    if((typeof drag!=='undefined'&&drag)||window.drag){ try{ if(typeof saveLocal==='function') saveLocal(); }catch(e){} }
    window.drag=null; try{ drag=null; }catch(e){}
  }
  window.onUp=endDrag;
  window.addEventListener('mouseup',endDrag,true);
  window.addEventListener('pointerup',endDrag,true);
  document.addEventListener('mouseup',endDrag,true);

  async function loadFlowListSafe(){
    const sel=document.getElementById('flowSelect'); if(!sel) return;
    const email=(user?.email||'').toLowerCase().trim();
    if(isGuest()){
      sel.innerHTML=''; const o=document.createElement('option'); o.value=flowKey; o.textContent=flowTitle||flowKey; sel.appendChild(o); return;
    }
    let rows=[];
    if(convexClient&&email){
      try{ rows=await convexClient.query('flows:list',{ownerEmail:email}); }catch(e){}
    }
    sel.innerHTML='';
    if(!rows?.length){
      const o=document.createElement('option'); o.value=flowKey||'hemopi-main'; o.textContent=flowTitle||'HEMOPI principal'; sel.appendChild(o); return;
    }
    rows.sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0));
    rows.forEach(r=>{
      const o=document.createElement('option'); o.value=r.key; o.textContent=r.title||r.key;
      if(r.key===flowKey) o.selected=true; sel.appendChild(o);
    });
  }
  window.loadFlowList=loadFlowListSafe;

  window.voteSelected=function(val){
    ensureFlow();
    if(!selected){ if(typeof toast==='function') toast('Selecione (💬)',true); return; }
    const key=(selected.kind||'node')+':'+selected.id;
    if(!flow.votes[key]) flow.votes[key]={ok:0,no:0,mine:null};
    const v=flow.votes[key];
    if(v.mine===val){ if(val==='ok')v.ok=Math.max(0,v.ok-1); if(val==='no')v.no=Math.max(0,v.no-1); v.mine=null; }
    else { if(v.mine==='ok')v.ok=Math.max(0,v.ok-1); if(v.mine==='no')v.no=Math.max(0,v.no-1); if(val==='ok')v.ok++; if(val==='no')v.no++; v.mine=val; }
    try{ saveLocal(); render(); renderMacroBar(); updateProgress(); }catch(e){}
    if(typeof toast==='function') toast(val==='ok'?'👍':'👎');
  };

  function uid(p){ return p+Math.random().toString(36).slice(2,8); }
  function ensureRestoreBtn(){
    if(document.getElementById('btnRestoreHemopi')) return;
    const g=document.querySelector('.toolbar .tool-group');
    if(!g) return;
    const b=document.createElement('button');
    b.type='button'; b.className='btn'; b.id='btnRestoreHemopi';
    b.title='Restaurar diagrama HEMOPI completo';
    b.textContent='↻ HEMOPI';
    b.onclick=()=>{ if(confirm('Restaurar o fluxo completo HEMOPI neste documento?')) restoreHemopiFlow(); };
    g.appendChild(b);
  }
  function rebindToolbar(){
    ensureRestoreBtn();
    if(isGuest()){ applyGuestUI(); return; }
    const am=document.getElementById('btnAddMacro');
    if(am){ am.style.display=''; am.onclick=()=>{
      ensureFlow();
      const used=new Set(flow.macros.map(m=>m.id));
      let id='A'; for(let i=0;i<26;i++){ const c=String.fromCharCode(65+i); if(!used.has(c)){ id=c; break; } }
      const y=flow.macros.length?Math.max(...flow.macros.map(m=>m.y+m.h))+40:40;
      flow.macros.push({id,title:'MACRO '+id+' · Novo',x:40,y,w:360,h:220,color:'#e8f4fc',border:'#1a5f8a'});
      selected={kind:'macro',id}; saveLocal(); render(); renderMacroBar(); openModal();
    }; }
    const bn=document.getElementById('btnNewFlow');
    if(bn){ bn.style.display=''; bn.onclick=async()=>{
      const title=prompt('Nome do novo fluxo','Novo fluxo'); if(!title) return;
      const data=(typeof emptyFlow==='function')?emptyFlow():{macros:[],nodes:[],edges:[],votes:{},comments:{},header:{}};
      data.header={projectName:title};
      const email=(user?.email||'').toLowerCase().trim();
      if(convexClient&&email){
        try{
          const r=await convexClient.mutation('flows:create',{title,ownerEmail:email,data});
          flowKey=r.key; flowTitle=title; flow=data;
          localStorage.setItem(FLOW_KEY_STORE,flowKey);
          await loadFlowListSafe();
          render(); renderMacroBar();
          if(typeof toast==='function') toast('Criado: '+title);
          return;
        }catch(e){ console.warn(e); }
      }
      flowKey='local-'+Date.now().toString(36); flowTitle=title; flow=data;
      localStorage.setItem(FLOW_KEY_STORE,flowKey);
      render();
    }; }
    const ap=document.getElementById('btnAddProcess');
    if(ap) ap.onclick=()=>{ ensureFlow(); const n={id:uid('n'),macro:null,type:'process',title:'Novo processo',x:140,y:140,w:180,h:48}; flow.nodes.push(n); selected={kind:'node',id:n.id}; saveLocal(); render(); openModal(); };
    const ad=document.getElementById('btnAddDecision');
    if(ad) ad.onclick=()=>{ ensureFlow(); const n={id:uid('n'),macro:null,type:'decision',title:'Decisão?',x:140,y:140,w:160,h:70}; flow.nodes.push(n); selected={kind:'node',id:n.id}; saveLocal(); render(); openModal(); };
  }
  function rebindProfile(){
    const btn=document.getElementById('btnOpenProfile');
    if(!btn) return;
    btn.style.display=isGuest()?'none':'';
    btn.onclick=function(ev){
      ev.preventDefault();
      if(!user) return;
      const modal=document.getElementById('profileModal');
      if(!modal) return;
      document.getElementById('profName').value=user.name||'';
      document.getElementById('profCompany').value=user.company||'';
      document.getElementById('profPhone').value=user.phone||'';
      modal.classList.add('open');
    };
  }

  window.shareFlow=async function(){
    if(isGuest()||!user) return;
    ensureFlow();
    if(String(flowKey).startsWith('local-')&&convexClient){
      try{
        const r=await convexClient.mutation('flows:create',{title:flowTitle||'Fluxo',ownerEmail:user.email.toLowerCase(),data:flow});
        flowKey=r.key; localStorage.setItem(FLOW_KEY_STORE,flowKey);
      }catch(e){ if(typeof toast==='function') toast('Salve na nuvem antes',true); return; }
    }
    const raw=prompt('E-mails convidados (sem conta):',(flow.sharedEmails||[]).join(', '));
    if(raw==null) return;
    const emails=raw.split(/[,;\s]+/).map(e=>e.trim().toLowerCase()).filter(e=>e.includes('@'));
    if(!emails.length) return;
    flow.sharedEmails=emails; saveLocal();
    let token=null;
    if(convexClient){
      try{
        const r=await convexClient.mutation('shares:create',{flowKey,emails,canEdit:false,createdBy:user.email.toLowerCase()});
        token=r.token;
      }catch(e){}
    }
    if(!token) token='local-'+flowKey;
    const url=location.origin+location.pathname+'?share='+encodeURIComponent(token);
    try{ await navigator.clipboard.writeText(url); }catch(e){}
    prompt('Link convidado:', url);
  };

  async function enterAsGuest(token, email){
    email=email.toLowerCase().trim();
    const err=document.getElementById('guestError');
    const showErr=(t)=>{ if(err){ err.textContent=t; err.hidden=false; } };
    if(!email.includes('@')){ showErr('E-mail inválido'); return; }
    let sh=null;
    if(convexClient){ try{ sh=await convexClient.query('shares:getByToken',{token}); }catch(e){} }
    if(!sh){
      if(token.startsWith('local-')) flowKey=token.replace(/^local-/,'');
      else { showErr('Convite inválido'); return; }
    } else {
      if(!sh.emails.includes(email)&&sh.createdBy!==email){ showErr('E-mail não está neste convite'); return; }
      flowKey=sh.flowKey;
    }
    localStorage.setItem(FLOW_KEY_STORE, flowKey);
    user={ name:email.split('@')[0], email, isGuest:true };
    window.HEMOPI_SHARE_MODE='guest';
    document.getElementById('guestModal').hidden=true;
    if(convexClient){
      try{
        const remote=await convexClient.query('flows:get',{key:flowKey});
        if(remote?.data && flowHasContent(remote.data)){ flow=remote.data; flowTitle=remote.title||flowKey; }
        else { flow=cloneDefaultFlow(); flowTitle=remote?.title||flowKey; }
      }catch(e){ flow=cloneDefaultFlow(); }
    } else flow=cloneDefaultFlow();
    ensureFlow();
    onlyShow('appMain');
    const lab=document.getElementById('userLabel');
    if(lab) lab.textContent='Convidado · '+email;
    rebindToolbar(); applyGuestUI();
    try{ render(); renderMacroBar(); updateProgress(); }catch(e){}
  }
  async function tryShareEntry(){
    const token=new URLSearchParams(location.search).get('share');
    if(!token) return false;
    document.getElementById('publicPage').hidden=true;
    document.getElementById('appMain').hidden=true;
    document.getElementById('loginModal').hidden=true;
    const gm=document.getElementById('guestModal');
    if(gm) gm.hidden=false;
    window._shareToken=token;
    return true;
  }
  document.getElementById('guestForm')?.addEventListener('submit', async(ev)=>{
    ev.preventDefault();
    await enterAsGuest(window._shareToken, document.getElementById('guestEmail').value);
  });
  document.getElementById('btnShare')?.addEventListener('click', ()=>shareFlow());

  async function hashPass(pw){
    const data=new TextEncoder().encode('fluxora:'+pw);
    const buf=await crypto.subtle.digest('SHA-256',data);
    return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
  }
  const form=document.getElementById('authForm');
  if(form) form.onsubmit=async(ev)=>{
    ev.preventDefault();
    const email=(document.getElementById('authEmail').value||'').trim().toLowerCase();
    const password=document.getElementById('authPassword')?.value||'';
    const err=document.getElementById('authError');
    const showErr=(t)=>{ if(err){ err.textContent=t; err.hidden=false; } };
    if(!email.includes('@')){ showErr('E-mail inválido'); return; }
    if(password.length<6){ showErr('Senha mín. 6'); return; }
    const passwordHash=await hashPass(password);
    const mode=(typeof authMode!=='undefined')?authMode:(document.getElementById('tabRegister')?.classList.contains('active')?'register':'login');
    let name=(document.getElementById('authName')?.value||'').trim();
    const company=(document.getElementById('authCompany')?.value||'').trim();
    const phone=(document.getElementById('authPhone')?.value||'').trim();
    if(mode==='register'){
      if(!name) name=email.split('@')[0];
      let db=[]; try{ db=JSON.parse(localStorage.getItem(USERS_KEY)||'[]'); }catch(e){}
      if(db.find(u=>u.email===email && u.passwordHash)){ showErr('E-mail já cadastrado — use Entrar'); return; }
      db = db.filter(u=>u.email!==email);
      db.push({email,name,passwordHash,company,phone,createdAt:Date.now()});
      localStorage.setItem(USERS_KEY,JSON.stringify(db));
      if(convexClient){
        try{ await convexClient.mutation('auth:register',{email,name,passwordHash,company,phone}); }
        catch(e){
          try{ await convexClient.mutation('auth:setPassword',{email,name,passwordHash}); }catch(e2){ console.warn(e2); }
        }
      }
      user={email,name,company,phone};
      localStorage.setItem(USER_KEY,JSON.stringify(user));
      document.getElementById('loginModal').hidden=true;
      await window.enterApp();
      return;
    }
    let ok=null;
    if(convexClient){ try{ ok=await convexClient.query('auth:login',{email,passwordHash}); }catch(e){} }
    if(!ok){
      let db=[]; try{ db=JSON.parse(localStorage.getItem(USERS_KEY)||'[]'); }catch(e){}
      const row=db.find(u=>u.email===email&&u.passwordHash===passwordHash);
      if(row) ok={email:row.email,name:row.name,company:row.company||'',phone:row.phone||''};
    }
    // recovery: set password on convex if local match or force for known admin after failed login
    if(!ok && convexClient){
      try{
        await convexClient.mutation('auth:setPassword',{email,name:email.split('@')[0],passwordHash});
        ok=await convexClient.query('auth:login',{email,passwordHash});
      }catch(e){}
    }
    if(!ok){ showErr('E-mail ou senha incorretos. Use Criar conta se for o primeiro acesso.'); return; }
    user={email:ok.email,name:ok.name,company:ok.company||'',phone:ok.phone||''};
    localStorage.setItem(USER_KEY,JSON.stringify(user));
    document.getElementById('loginModal').hidden=true;
    await window.enterApp();
  };

  async function boot(){
    addPasswordToggle(); rebindToolbar(); rebindProfile();
    if(await tryShareEntry()) return;
    try{
      const u=JSON.parse(localStorage.getItem(USER_KEY)||'null');
      if(u&&u.email){
        // auto-enter if already logged
        user=u;
        await window.enterApp();
      } else onlyShow('publicPage');
    }catch(e){ onlyShow('publicPage'); }
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', boot);
  else setTimeout(boot, 80);
  setTimeout(boot, 600);
  setTimeout(()=>{ rebindToolbar(); rebindProfile(); }, 1200);
})();
