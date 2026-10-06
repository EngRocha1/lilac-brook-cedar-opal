/* Fluxora fix v3 */
(function(){
  function onlyShow(id){
    ['publicPage','appMain','adminPage','adminGate','flowManager','guestModal'].forEach(k=>{
      const el=document.getElementById(k); if(!el)return;
      if(k==='guestModal'){ el.hidden=(id!=='guestModal'); return; }
      el.hidden=(k!==id);
    });
  }
  function isGuest(){ return window.HEMOPI_SHARE_MODE==='guest'; }
  function applyGuestUI(){
    if(!isGuest())return;
    ['btnNewFlow','btnAddProcess','btnAddDecision','btnAddText','btnAddMacro','btnConnect','btnOpenMgr','btnOpenProfile','btnShare','btnSeal'].forEach(id=>{const el=document.getElementById(id);if(el)el.style.display='none';});
    const fs=document.getElementById('flowSelect'); if(fs) fs.disabled=true;
    document.querySelectorAll('#projectHeader input').forEach(i=>{i.readOnly=true;i.style.pointerEvents='none';i.style.background='#f4f6f8';});
    const tag=document.querySelector('.tagline'); if(tag) tag.textContent='Modo convidado · vote e comente (💬)';
  }
  const _showPublic=window.showPublic;
  window.showPublic=function(){ window.HEMOPI_SHARE_MODE=null; onlyShow('publicPage'); if(typeof _showPublic==='function')try{_showPublic();}catch(e){} onlyShow('publicPage'); };
  const _enterApp=window.enterApp;
  window.enterApp=async function(){
    onlyShow('appMain');
    if(typeof _enterApp==='function') await _enterApp();
    onlyShow('appMain');
    ensureFlow(); rebindToolbar(); rebindProfile();
    try{ await loadFlowListSafe(); }catch(e){}
    try{ render(); renderMacroBar(); updateProgress(); }catch(e){}
    applyGuestUI();
  };
  function ensureFlow(){
    if(!flow||typeof flow!=='object') flow=(typeof emptyFlow==='function')?emptyFlow():{macros:[],nodes:[],edges:[],votes:{},comments:{},header:{},seal:null,sharedEmails:[]};
    if(!flow.macros)flow.macros=[]; if(!flow.nodes)flow.nodes=[]; if(!flow.edges)flow.edges=[];
    if(!flow.votes)flow.votes={}; if(!flow.comments)flow.comments={};
  }
  function addPasswordToggle(){
    const inp=document.getElementById('authPassword');
    if(!inp||inp.parentElement.querySelector('.pw-toggle'))return;
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
    if((typeof drag!=='undefined'&&drag)||window.drag){ try{ if(typeof saveLocal==='function')saveLocal(); }catch(e){} }
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
      try{ rows=await convexClient.query('flows:list',{ownerEmail:email}); }catch(e){ console.warn(e); }
    }
    sel.innerHTML='';
    if(!rows?.length){
      const o=document.createElement('option'); o.value=flowKey||''; o.textContent=flowTitle||'Sem fluxos na nuvem'; sel.appendChild(o); return;
    }
    rows.sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0));
    rows.forEach(r=>{ const o=document.createElement('option'); o.value=r.key; o.textContent=r.title||r.key; if(r.key===flowKey)o.selected=true; sel.appendChild(o); });
    if(flowKey&&![...sel.options].some(o=>o.value===flowKey)){
      const o=document.createElement('option'); o.value=flowKey; o.textContent=flowTitle||flowKey; o.selected=true; sel.appendChild(o);
    }
  }
  window.loadFlowList=loadFlowListSafe;

  const _saveLocal=window.saveLocal;
  window.saveLocal=function(){
    ensureFlow();
    try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(flow)); }catch(e){}
    if(!convexClient||!user?.email) return;
    const email=user.email.toLowerCase().trim();
    if(flowKey&&!String(flowKey).startsWith('local-')){
      convexClient.mutation('flows:save',{key:flowKey,title:flowTitle,ownerEmail:email,data:flow}).catch(e=>console.warn(e));
    } else if(String(flowKey).startsWith('local-')){
      convexClient.mutation('flows:create',{title:flowTitle||'Fluxo',ownerEmail:email,data:flow})
        .then(r=>{ flowKey=r.key; localStorage.setItem(FLOW_KEY_STORE,flowKey); loadFlowListSafe(); })
        .catch(e=>console.warn(e));
    }
  };

  window.voteSelected=function(val){
    ensureFlow();
    if(!selected){ if(typeof toast==='function')toast('Selecione um elemento (💬)',true); return; }
    const key=(selected.kind||'node')+':'+selected.id;
    if(!flow.votes[key]) flow.votes[key]={ok:0,no:0,mine:null};
    const v=flow.votes[key];
    if(v.mine===val){ if(val==='ok')v.ok=Math.max(0,v.ok-1); if(val==='no')v.no=Math.max(0,v.no-1); v.mine=null; }
    else { if(v.mine==='ok')v.ok=Math.max(0,v.ok-1); if(v.mine==='no')v.no=Math.max(0,v.no-1); if(val==='ok')v.ok++; if(val==='no')v.no++; v.mine=val; }
    try{ saveLocal(); render(); renderMacroBar(); updateProgress(); }catch(e){}
    document.querySelectorAll('.vbtn').forEach(b=>b.classList.remove('on-ok','on-no'));
    if(v.mine==='ok') document.querySelector('.vbtn[data-v="ok"]')?.classList.add('on-ok');
    if(v.mine==='no') document.querySelector('.vbtn[data-v="no"]')?.classList.add('on-no');
    if(typeof toast==='function') toast(val==='ok'?'👍 registrado':'👎 registrado');
  };

  function uid(p){ return p+Math.random().toString(36).slice(2,8); }

  function rebindToolbar(){
    ensureFlow();
    if(isGuest()){ applyGuestUI(); return; }
    const am=document.getElementById('btnAddMacro');
    if(am){ am.style.display=''; am.onclick=()=>{
      ensureFlow();
      const used=new Set(flow.macros.map(m=>m.id));
      let id='A'; for(let i=0;i<26;i++){ const c=String.fromCharCode(65+i); if(!used.has(c)){ id=c; break; } }
      const y=flow.macros.length?Math.max(...flow.macros.map(m=>m.y+m.h))+40:40;
      flow.macros.push({id,title:'MACRO '+id+' · Novo',x:40,y,w:360,h:220,color:'#e8f4fc',border:'#1a5f8a'});
      selected={kind:'macro',id}; saveLocal(); render(); renderMacroBar(); openModal();
      if(typeof toast==='function') toast('Macro '+id+' criado');
    }; }
    ['btnAddProcess','btnAddDecision','btnAddText'].forEach((id,i)=>{
      const el=document.getElementById(id); if(!el) return; el.style.display='';
      el.onclick=()=>{
        ensureFlow();
        const types=['process','decision','process']; const titles=['Novo processo','Decisão?','Texto'];
        const n={id:uid('n'),macro:null,type:types[i],title:titles[i],x:120+Math.random()*200,y:120+Math.random()*100,w:i===1?160:180,h:i===1?70:48};
        flow.nodes.push(n); selected={kind:'node',id:n.id}; saveLocal(); render(); updateProgress(); if(i<2) openModal();
      };
    });
    const bc=document.getElementById('btnConnect');
    if(bc){ bc.style.display=''; bc.onclick=()=>{ tool=tool==='connect'?'select':'connect'; connectFrom=null; bc.classList.toggle('active',tool==='connect'); }; }
    const bn=document.getElementById('btnNewFlow');
    if(bn){ bn.style.display=''; bn.onclick=async()=>{
      if(isGuest()) return;
      const title=prompt('Nome do novo fluxo','Novo fluxo'); if(!title) return;
      const data=(typeof emptyFlow==='function')?emptyFlow():{macros:[],nodes:[],edges:[],votes:{},comments:{},header:{},seal:null,sharedEmails:[]};
      data.header=Object.assign({},data.header||{},{projectName:title});
      const email=(user?.email||'').toLowerCase().trim();
      if(!email){ if(typeof toast==='function') toast('Faça login',true); return; }
      if(convexClient){
        try{
          const r=await convexClient.mutation('flows:create',{title,ownerEmail:email,data});
          flowKey=r.key; flowTitle=title; flow=data;
          localStorage.setItem(FLOW_KEY_STORE,flowKey);
          await loadFlowListSafe();
          render(); renderMacroBar(); updateProgress();
          if(typeof toast==='function') toast('Salvo na conta: '+title);
          return;
        }catch(e){ console.warn(e); }
      }
      flowKey='local-'+Date.now().toString(36); flowTitle=title; flow=data;
      localStorage.setItem(FLOW_KEY_STORE,flowKey);
      render(); renderMacroBar();
      if(typeof toast==='function') toast('Local (Convex indisponível)');
    }; }
  }

  function rebindProfile(){
    const btn=document.getElementById('btnOpenProfile');
    if(!btn) return;
    btn.style.display=isGuest()?'none':'';
    btn.onclick=function(ev){
      ev.preventDefault(); ev.stopPropagation();
      if(!user){ if(typeof toast==='function') toast('Faça login',true); return; }
      const modal=document.getElementById('profileModal');
      if(!modal){ alert('Modal perfil ausente'); return; }
      document.getElementById('profName').value=user.name||'';
      document.getElementById('profCompany').value=user.company||'';
      document.getElementById('profPhone').value=user.phone||'';
      modal.classList.add('open');
    };
  }

  async function openFlowManager(){
    if(isGuest()) return;
    document.getElementById('appMain').hidden=true;
    document.getElementById('flowManager').hidden=false;
    await renderFlowManager();
  }
  async function renderFlowManager(){
    const list=document.getElementById('flowManagerList'); if(!list) return;
    list.innerHTML='<p class="muted">Carregando…</p>';
    const email=(user?.email||'').toLowerCase().trim();
    let rows=[];
    if(convexClient&&email){ try{ rows=await convexClient.query('flows:list',{ownerEmail:email}); }catch(e){} }
    if(!rows?.length){ list.innerHTML='<p class="muted">Nenhum fluxo na nuvem. Use <b>+ Novo</b>.</p>'; return; }
    rows.sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0));
    list.innerHTML='';
    rows.forEach(r=>{
      const card=document.createElement('div'); card.className='flow-mgr-card';
      card.innerHTML='<div><h4>'+(r.title||r.key)+'</h4><div class="flow-mgr-meta">'+r.key+'</div></div>';
      const actions=document.createElement('div'); actions.style.cssText='display:flex;gap:6px';
      const open=document.createElement('button'); open.className='btn pri'; open.textContent='Abrir';
      open.onclick=async()=>{ flowKey=r.key; localStorage.setItem(FLOW_KEY_STORE,flowKey); flowTitle=r.title||r.key;
        document.getElementById('flowManager').hidden=true; onlyShow('appMain');
        await loadFlow(); ensureFlow(); render(); renderMacroBar(); updateProgress();
      };
      const del=document.createElement('button'); del.className='btn danger'; del.textContent='Excluir'; del.style.cssText='width:auto;margin:0';
      del.onclick=async()=>{ if(!confirm('Excluir?'))return;
        if(convexClient) try{ await convexClient.mutation('flows:remove',{key:r.key,ownerEmail:email}); }catch(e){}
        await renderFlowManager(); await loadFlowListSafe();
      };
      const dup=document.createElement('button'); dup.className='btn'; dup.textContent='Duplicar';
      dup.onclick=()=>{ window._dupSource=r; document.getElementById('dupTitle').value=(r.title||'')+' (cópia)'; document.getElementById('dupModal').classList.add('open'); };
      actions.append(open,dup,del); card.appendChild(actions); list.appendChild(card);
    });
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
    const raw=prompt('E-mails dos convidados (sem conta, só e-mail):',(flow.sharedEmails||[]).join(', '));
    if(raw==null) return;
    const emails=raw.split(/[,;\s]+/).map(e=>e.trim().toLowerCase()).filter(e=>e.includes('@'));
    if(!emails.length){ if(typeof toast==='function') toast('Informe e-mails',true); return; }
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
    prompt('Link convidado (só e-mail):', url);
    if(typeof toast==='function') toast('Convite na tabela shares');
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
      if(!sh.emails.includes(email)&&sh.createdBy!==email){ showErr('E-mail não autorizado neste convite'); return; }
      flowKey=sh.flowKey;
    }
    localStorage.setItem(FLOW_KEY_STORE, flowKey);
    user={ name:email.split('@')[0], email, isGuest:true };
    sessionStorage.setItem('fluxora_guest', JSON.stringify(user));
    window.HEMOPI_SHARE_MODE='guest';
    document.getElementById('guestModal').hidden=true;
    if(convexClient){
      try{
        const remote=await convexClient.query('flows:get',{key:flowKey});
        if(remote?.data){ flow=remote.data; flowTitle=remote.title||flowKey; }
      }catch(e){}
    }
    ensureFlow();
    onlyShow('appMain');
    const lab=document.getElementById('userLabel');
    if(lab) lab.textContent='Convidado · '+email;
    rebindToolbar(); applyGuestUI();
    try{ render(); renderMacroBar(); updateProgress(); }catch(e){}
    if(typeof toast==='function') toast('Modo convidado — só votação');
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

  window.openModal=function(){
    ensureFlow();
    document.getElementById('modalBg')?.classList.add('open');
    const isM=selected&&selected.kind==='macro';
    const cl=document.getElementById('colorLabel'); const sc=document.getElementById('sideColor');
    if(cl) cl.style.display=isM&&!isGuest()?'block':'none';
    if(sc) sc.style.display=isM&&!isGuest()?'block':'none';
    const del=document.getElementById('btnModalDelete'); if(del) del.style.display=isGuest()?'none':'block';
    const name=document.getElementById('sideName'); if(name) name.readOnly=isGuest();
    const title=document.getElementById('sideTitle'); const comment=document.getElementById('sideComment');
    if(!selected){ if(title) title.textContent='Avaliação'; return; }
    if(selected.kind==='node'){ const n=nodeById(selected.id); if(title)title.textContent=(n?.title||'').replace(/\n/g,' · '); if(name)name.value=n?.title||''; }
    else if(selected.kind==='macro'){ const m=macroById(selected.id); if(title)title.textContent=m?.title||selected.id; if(name)name.value=m?.title||''; }
    else if(selected.kind==='edge'){ const e=edgeById(selected.id); if(title)title.textContent=(e?.from||'')+' → '+(e?.to||''); if(name)name.value=e?.label||''; }
    if(comment) comment.value=flow.comments[selected.kind+':'+selected.id]||'';
    const v=flow.votes[selected.kind+':'+selected.id]||{ok:0,no:0,mine:null};
    document.querySelectorAll('.vbtn').forEach(b=>b.classList.remove('on-ok','on-no'));
    if(v.mine==='ok') document.querySelector('.vbtn[data-v="ok"]')?.classList.add('on-ok');
    if(v.mine==='no') document.querySelector('.vbtn[data-v="no"]')?.classList.add('on-no');
  };

  document.getElementById('guestForm')?.addEventListener('submit', async(ev)=>{
    ev.preventDefault();
    await enterAsGuest(window._shareToken, document.getElementById('guestEmail').value);
  });
  document.getElementById('btnShare')?.addEventListener('click', ()=>shareFlow());
  document.getElementById('btnOpenMgr')?.addEventListener('click', ()=>openFlowManager());
  document.getElementById('btnMgrClose')?.addEventListener('click', ()=>{ document.getElementById('flowManager').hidden=true; onlyShow('appMain'); });
  document.getElementById('btnModalSave')?.addEventListener('click', ()=>{
    ensureFlow(); if(!selected) return;
    const name=document.getElementById('sideName'); const comment=document.getElementById('sideComment');
    if(!isGuest()){
      if(selected.kind==='node'&&name){ const n=nodeById(selected.id); if(n)n.title=name.value; }
      if(selected.kind==='macro'&&name){ const m=macroById(selected.id); if(m)m.title=name.value; }
      if(selected.kind==='edge'&&name){ const e=edgeById(selected.id); if(e)e.label=name.value; }
    }
    if(comment) flow.comments[selected.kind+':'+selected.id]=comment.value;
    saveLocal(); render(); if(typeof toast==='function') toast('Salvo');
  });

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
      if(db.find(u=>u.email===email)){ showErr('E-mail já cadastrado'); return; }
      db.push({email,name,passwordHash,company,phone,createdAt:Date.now()});
      localStorage.setItem(USERS_KEY,JSON.stringify(db));
      if(convexClient) try{ await convexClient.mutation('auth:register',{email,name,passwordHash,company,phone}); }catch(e){}
      user={email,name,company,phone}; localStorage.setItem(USER_KEY,JSON.stringify(user));
      document.getElementById('loginModal').hidden=true; await window.enterApp();
      return;
    }
    let ok=null;
    if(convexClient) try{ ok=await convexClient.query('auth:login',{email,passwordHash}); }catch(e){}
    if(!ok){ let db=[]; try{ db=JSON.parse(localStorage.getItem(USERS_KEY)||'[]'); }catch(e){}
      const row=db.find(u=>u.email===email&&u.passwordHash===passwordHash);
      if(row) ok={email:row.email,name:row.name,company:row.company||'',phone:row.phone||''};
    }
    if(!ok){ showErr('E-mail ou senha incorretos'); return; }
    user={email:ok.email,name:ok.name,company:ok.company||'',phone:ok.phone||''};
    localStorage.setItem(USER_KEY,JSON.stringify(user));
    document.getElementById('loginModal').hidden=true; await window.enterApp();
  };

  async function boot(){
    addPasswordToggle(); rebindToolbar(); rebindProfile();
    if(await tryShareEntry()) return;
    try{ const u=JSON.parse(localStorage.getItem(USER_KEY)||'null'); if(!u||!u.email){ onlyShow('publicPage'); user=null; } }catch(e){ onlyShow('publicPage'); }
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', boot);
  else setTimeout(boot, 80);
  setTimeout(boot, 500);
  setTimeout(()=>{ rebindToolbar(); rebindProfile(); }, 1000);
})();
