/* Fluxora fix v6 — guest lock, vote modal, presence */
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

  /* ===== CRITICAL: refreshSide without sideOk/sideNo ===== */
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
    // sideOk/sideNo were removed from HTML — do not touch them
    if(v.mine==='ok') document.querySelector('.vbtn[data-v="ok"]')?.classList.add('on-ok');
    if(v.mine==='no') document.querySelector('.vbtn[data-v="no"]')?.classList.add('on-no');
    if(comment) comment.value = (flow.comments && flow.comments[(selected.kind)+':'+selected.id]) || '';
    if(selected.kind==='node'){
      const n = nodeById(selected.id);
      if(title) title.textContent = (n?.title||'').replace(/\n/g,' · ');
      if(meta) meta.textContent = 'Módulo '+(n?.macro||'—');
      if(name){ name.value = n?.title||''; name.readOnly = isGuest(); }
    } else if(selected.kind==='edge'){
      const e = edgeById(selected.id);
      if(title) title.textContent = (e?.from||'')+' → '+(e?.to||'');
      if(meta) meta.textContent = 'Conexão';
      if(name){ name.value = e?.label||''; name.readOnly = isGuest(); }
    } else if(selected.kind==='macro'){
      const m = macroById(selected.id);
      if(title) title.textContent = m?.title || selected.id;
      if(meta) meta.textContent = 'Macro '+selected.id+(isGuest()?' · só votação':'');
      if(name){ name.value = m?.title||''; name.readOnly = isGuest(); }
      const sc=$('sideColor');
      if(sc && m?.color) sc.value = m.color.startsWith('#')?m.color:'#e8f4fc';
      if(sc) sc.disabled = isGuest();
    }
    const del=$('btnModalDelete');
    if(del) del.style.display = isGuest() ? 'none' : '';
    const cl=$('colorLabel'); const sc2=$('sideColor');
    const isM = selected.kind==='macro';
    if(cl) cl.style.display = (isM && !isGuest()) ? 'block' : 'none';
    if(sc2) sc2.style.display = (isM && !isGuest()) ? 'block' : 'none';
  };

  window.openModal = function(){
    try{ window.refreshSide(); }catch(e){ console.warn(e); }
    $('modalBg')?.classList.add('open');
  };
  window.closeModal = function(){
    $('modalBg')?.classList.remove('open');
  };

  window.voteSelected = function(val){
    if(!selected || !flow) return;
    if(typeof setMyVote==='function'){
      setMyVote(selected.kind, selected.id, val);
    } else {
      const key = selected.kind+':'+selected.id;
      if(!flow.votes[key]) flow.votes[key]={ok:0,no:0,mine:null};
      const v=flow.votes[key];
      if(v.mine===val){ if(val==='ok')v.ok=Math.max(0,v.ok-1); if(val==='no')v.no=Math.max(0,v.no-1); v.mine=null; }
      else { if(v.mine==='ok')v.ok=Math.max(0,v.ok-1); if(v.mine==='no')v.no=Math.max(0,v.no-1); if(val==='ok')v.ok++; if(val==='no')v.no++; v.mine=val; }
      try{ saveLocal(); render(); renderMacroBar(); updateProgress(); }catch(e){}
    }
    try{ window.refreshSide(); }catch(e){}
    if(typeof toast==='function') toast(val==='ok'?'👍 registrado':'👎 registrado');
  };

  /* ===== Guest: lock header permanently ===== */
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
    // stop any change handlers from writing
    box.style.opacity = '0.92';
  }
  function applyGuestUI(){
    if(!isGuest()) return;
    ['btnNewFlow','btnAddProcess','btnAddDecision','btnAddText','btnAddMacro','btnConnect',
     'btnOpenMgr','btnOpenProfile','btnShare','btnSeal','btnRestoreHemopi'].forEach(id=>{
      const el=$(id); if(el) el.style.display='none';
    });
    const fs=$('flowSelect'); if(fs){ fs.disabled=true; }
    lockHeaderForGuest();
    const tag=document.querySelector('.tagline');
    if(tag) tag.textContent='Modo convidado · vote e comente (💬) · cabeçalho bloqueado';
    // prevent saveLocal from writing header changes — wrap saveLocal
  }

  // Prevent guest from persisting structural edits; allow votes/comments only
  const _saveLocal = window.saveLocal;
  window.saveLocal = function(){
    if(isGuest()){
      // only persist votes + comments on cloud if possible
      if(convexClient && flowKey && !String(flowKey).startsWith('local')){
        const email=(user?.email||'').toLowerCase();
        convexClient.mutation('flows:save',{
          key:flowKey,
          title:flowTitle,
          data:flow
        }).catch(()=>{});
      }
      try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(flow)); }catch(e){}
      return;
    }
    if(typeof _saveLocal==='function') return _saveLocal();
  };

  /* ===== Presence ===== */
  async function presenceTick(){
    if(!convexClient || !flowKey || !user?.email) return;
    const email=user.email.toLowerCase();
    const name=user.name||email.split('@')[0];
    try{
      await convexClient.mutation('shares:heartbeat',{flowKey, email, name});
    }catch(e){}
    try{
      const list = await convexClient.query('shares:listPresence',{flowKey});
      const bar=$('presenceBar');
      if(bar){
        if(!list?.length){
          bar.innerHTML='<strong>Online:</strong> —';
        } else {
          bar.innerHTML='<strong>Online:</strong> '+list.map(p=>
            '<span class="presence-chip" style="display:inline-flex;align-items:center;gap:4px;margin:0 6px;padding:2px 8px;border-radius:999px;background:#e8f4fc;font-size:12px">'+
            '<span style="width:7px;height:7px;border-radius:50%;background:#22c55e"></span>'+
            (p.name||p.email)+(p.email===email?' (você)':'')+
            '</span>'
          ).join('');
        }
      }
    }catch(e){}
  }
  window.presenceTick = presenceTick;

  /* ===== Header render: guest locked ===== */
  const _rph = window.renderProjectHeader;
  window.renderProjectHeader = function(){
    if(typeof _rph==='function'){
      try{ _rph(); }catch(e){}
    } else {
      // minimal header if missing
      const box=$('projectHeader');
      if(box && flow){
        ensureHeader();
        const h=flow.header||{};
        const fields=[
          ['projectName','Projeto'],['manager','Gerente'],['director','Diretor'],
          ['po','PO'],['pm','PM'],['stakeholders','Stakeholders']
        ];
        box.innerHTML=fields.map(([k,lab])=>
          '<label style="display:flex;flex-direction:column;font-size:11px;gap:2px">'+lab+
          '<input data-hk="'+k+'" value="'+(h[k]||'').replace(/"/g,'"')+'"/></label>'
        ).join('');
        box.querySelectorAll('input[data-hk]').forEach(inp=>{
          inp.addEventListener('change',()=>{
            if(isGuest()) return;
            if(!flow.header) flow.header={};
            flow.header[inp.getAttribute('data-hk')]=inp.value;
            saveLocal();
          });
        });
      }
    }
    if(isGuest()) lockHeaderForGuest();
  };
  function ensureHeader(){
    if(!flow) return;
    if(!flow.header) flow.header={projectName:'',manager:'',director:'',po:'',pm:'',stakeholders:''};
  }

  /* ===== loadFlow / restore ===== */
  window.loadFlow = async function(){
    if(convexClient){
      try{
        const remote=await convexClient.query('flows:get',{key:flowKey});
        if(remote?.data && flowHasContent(remote.data)){
          flow=remote.data; flowTitle=remote.title||flowKey;
          if(!flow.votes)flow.votes={}; if(!flow.comments)flow.comments={};
          return;
        }
        if(remote && !flowHasContent(remote.data||{})){
          flow=cloneDefaultFlow();
          flowTitle=remote.title||'HEMOPI — Jornada do doador';
          if(!isGuest()){
            try{ await convexClient.mutation('flows:save',{key:flowKey,title:flowTitle,ownerEmail:(user?.email||'').toLowerCase()||undefined,data:flow}); }catch(e){}
          }
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
  window.restoreHemopiFlow = async function(){
    if(isGuest()) return;
    flow=cloneDefaultFlow();
    flowTitle=flow.title||'HEMOPI — Jornada do doador';
    if(!flowKey||String(flowKey).startsWith('local')) flowKey='hemopi-main';
    localStorage.setItem(STORAGE_KEY,JSON.stringify(flow));
    localStorage.setItem(FLOW_KEY_STORE,flowKey);
    if(convexClient){
      try{ await convexClient.mutation('flows:save',{key:flowKey,title:flowTitle,ownerEmail:(user?.email||'').toLowerCase()||undefined,data:flow}); }catch(e){}
    }
    try{ render(); renderMacroBar(); updateProgress(); renderProjectHeader(); }catch(e){}
    if(typeof toast==='function') toast('HEMOPI restaurado');
  };

  /* ===== Guest entry ===== */
  async function enterAsGuest(token, email){
    email=email.toLowerCase().trim();
    const err=$('guestError');
    const showErr=(t)=>{ if(err){ err.textContent=t; err.hidden=false; } };
    if(!email.includes('@')){ showErr('E-mail inválido'); return; }
    let sh=null;
    if(convexClient){ try{ sh=await convexClient.query('shares:getByToken',{token}); }catch(e){} }
    if(sh){
      if(!sh.emails.includes(email) && sh.createdBy!==email){
        showErr('E-mail não autorizado neste convite');
        return;
      }
      flowKey=sh.flowKey;
    } else if(token.startsWith('local-')||token.startsWith('sh-')){
      // fallback broken links like local-local-xxx → try strip
      let k=token.replace(/^local-/,'').replace(/^local-/,'');
      flowKey=k;
    } else {
      showErr('Convite inválido ou expirado');
      return;
    }
    localStorage.setItem(FLOW_KEY_STORE, flowKey);
    user={ name:email.split('@')[0], email, isGuest:true };
    window.HEMOPI_SHARE_MODE='guest';
    if($('guestModal')) $('guestModal').hidden=true;
    if(convexClient){
      try{
        const remote=await convexClient.query('flows:get',{key:flowKey});
        if(remote?.data && flowHasContent(remote.data)){
          flow=remote.data; flowTitle=remote.title||flowKey;
        } else {
          flow=cloneDefaultFlow(); flowTitle=remote?.title||flowKey;
        }
      }catch(e){ flow=cloneDefaultFlow(); }
    } else {
      flow=cloneDefaultFlow();
    }
    onlyShow('appMain');
    const lab=$('userLabel');
    if(lab) lab.textContent='Convidado · '+email;
    applyGuestUI();
    try{ render(); renderMacroBar(); updateProgress(); renderProjectHeader(); }catch(e){}
    lockHeaderForGuest();
    presenceTick();
    if(typeof toast==='function') toast('Modo convidado — só votação');
  }

  async function tryShareEntry(){
    const token=new URLSearchParams(location.search).get('share');
    if(!token) return false;
    if($('publicPage')) $('publicPage').hidden=true;
    if($('appMain')) $('appMain').hidden=true;
    if($('loginModal')) $('loginModal').hidden=true;
    const gm=$('guestModal');
    if(gm) gm.hidden=false;
    window._shareToken=token;
    return true;
  }
  $('guestForm')?.addEventListener('submit', async(ev)=>{
    ev.preventDefault();
    await enterAsGuest(window._shareToken, $('guestEmail')?.value||'');
  });

  /* ===== Share creates real token ===== */
  window.shareFlow = async function(){
    if(isGuest()||!user) return;
    if(!convexClient){ if(typeof toast==='function') toast('Convex offline',true); return; }
    // promote local keys
    if(String(flowKey).startsWith('local')){
      try{
        const r=await convexClient.mutation('flows:create',{
          title:flowTitle||'Fluxo', ownerEmail:user.email.toLowerCase(), data:flow
        });
        flowKey=r.key; localStorage.setItem(FLOW_KEY_STORE,flowKey);
      }catch(e){ if(typeof toast==='function') toast('Salve o fluxo na nuvem antes',true); return; }
    }
    const raw=prompt('E-mails dos convidados (sem conta, só e-mail):',(flow.sharedEmails||[]).join(', '));
    if(raw==null) return;
    const emails=raw.split(/[,;\s]+/).map(e=>e.trim().toLowerCase()).filter(e=>e.includes('@'));
    if(!emails.length){ if(typeof toast==='function') toast('Informe e-mails',true); return; }
    flow.sharedEmails=emails;
    try{ saveLocal(); }catch(e){}
    let token=null;
    try{
      const r=await convexClient.mutation('shares:create',{
        flowKey, emails, canEdit:false, createdBy:user.email.toLowerCase()
      });
      token=r.token;
    }catch(e){ console.warn(e); }
    if(!token){ if(typeof toast==='function') toast('Falha ao criar convite',true); return; }
    const url=location.origin+location.pathname.replace(/\/index\.html$/,'/')+'?share='+encodeURIComponent(token);
    try{ await navigator.clipboard.writeText(url); }catch(e){}
    prompt('Link do convidado (copie):', url);
    if(typeof toast==='function') toast('Convite criado');
  };
  $('btnShare')?.addEventListener('click', ()=>shareFlow());

  /* ===== enterApp ===== */
  const _enterApp=window.enterApp;
  window.enterApp=async function(){
    onlyShow('appMain');
    if(typeof _enterApp==='function') await _enterApp();
    onlyShow('appMain');
    try{ await loadFlow(); }catch(e){}
    if(!flowHasContent(flow) && !isGuest()) try{ await restoreHemopiFlow(); }catch(e){}
    try{ render(); renderMacroBar(); updateProgress(); renderProjectHeader(); }catch(e){}
    applyGuestUI();
    presenceTick();
    if(!window._presenceTimer){
      window._presenceTimer=setInterval(()=>{ try{ presenceTick(); }catch(e){} }, 12000);
    }
  };

  // Modal save: guest only comment
  const saveBtn=$('btnModalSave');
  if(saveBtn) saveBtn.onclick=function(){
    if(!selected||!flow) return;
    const name=$('sideName'); const comment=$('sideComment');
    if(!isGuest()){
      if(selected.kind==='node'&&name){ const n=nodeById(selected.id); if(n) n.title=name.value; }
      if(selected.kind==='edge'&&name){ const e=edgeById(selected.id); if(e) e.label=name.value; }
      if(selected.kind==='macro'&&name){ const m=macroById(selected.id); if(m) m.title=name.value; }
    }
    if(comment){
      if(!flow.comments) flow.comments={};
      flow.comments[selected.kind+':'+selected.id]=comment.value;
    }
    saveLocal();
    try{ render(); renderMacroBar(); }catch(e){}
    if(typeof toast==='function') toast('Salvo');
  };

  window.initGoogleBtn=function(){};

  async function boot(){
    if(await tryShareEntry()) return;
    try{
      const u=JSON.parse(localStorage.getItem(USER_KEY)||'null');
      if(u&&u.email){ user=u; await window.enterApp(); }
      else onlyShow('publicPage');
    }catch(e){ onlyShow('publicPage'); }
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', boot);
  else setTimeout(boot, 100);
  setTimeout(()=>{ try{ if(isGuest()) lockHeaderForGuest(); }catch(e){} }, 800);
})();
