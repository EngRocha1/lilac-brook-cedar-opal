/* Fluxora fix v2 */
(function(){
  function onlyShow(id){
    ['publicPage','appMain','adminPage','adminGate','flowManager'].forEach(k=>{
      const el=document.getElementById(k);
      if(el) el.hidden=(k!==id);
    });
  }
  const _showPublic=window.showPublic;
  window.showPublic=function(){ onlyShow('publicPage'); if(typeof _showPublic==='function')try{_showPublic();}catch(e){} onlyShow('publicPage'); };
  const _enterApp=window.enterApp;
  window.enterApp=async function(){
    onlyShow('appMain');
    if(typeof _enterApp==='function') await _enterApp();
    onlyShow('appMain');
    ensureFlow(); rebindToolbar();
    try{render();renderMacroBar();updateProgress();}catch(e){}
  };
  function ensureFlow(){
    if(!flow||typeof flow!=='object'){
      flow=(typeof emptyFlow==='function')?emptyFlow():{macros:[],nodes:[],edges:[],votes:{},comments:{},header:{},seal:null,sharedEmails:[]};
    }
    if(!flow.macros)flow.macros=[];
    if(!flow.nodes)flow.nodes=[];
    if(!flow.edges)flow.edges=[];
    if(!flow.votes)flow.votes={};
    if(!flow.comments)flow.comments={};
  }
  function addPasswordToggle(){
    const inp=document.getElementById('authPassword');
    if(!inp||inp.parentElement.querySelector('.pw-toggle'))return;
    const wrap=document.createElement('div');
    wrap.style.cssText='position:relative;display:flex;align-items:center';
    inp.parentNode.insertBefore(wrap,inp);
    wrap.appendChild(inp);
    inp.style.paddingRight='40px';inp.style.width='100%';
    const btn=document.createElement('button');
    btn.type='button';btn.className='pw-toggle';btn.innerHTML='👁';
    btn.style.cssText='position:absolute;right:8px;top:50%;transform:translateY(-50%);background:transparent;border:none;cursor:pointer;font-size:1rem;opacity:.75;padding:4px';
    btn.onclick=()=>{const show=inp.type==='password';inp.type=show?'text':'password';btn.innerHTML=show?'🙈':'👁';};
    wrap.appendChild(btn);
  }
  function endDrag(){
    if((typeof drag!=='undefined'&&drag)||window.drag){try{if(typeof saveLocal==='function')saveLocal();}catch(e){}}
    window.drag=null;try{drag=null;}catch(e){}
  }
  window.onUp=endDrag;
  window.addEventListener('mouseup',endDrag,true);
  window.addEventListener('pointerup',endDrag,true);
  window.addEventListener('pointercancel',endDrag,true);
  document.addEventListener('mouseup',endDrag,true);
  window.voteSelected=function(val){
    ensureFlow();
    if(!selected){if(typeof toast==='function')toast('Selecione um elemento (💬)',true);return;}
    const key=(selected.kind||'node')+':'+selected.id;
    if(!flow.votes[key])flow.votes[key]={ok:0,no:0,mine:null};
    const v=flow.votes[key];
    if(v.mine===val){if(val==='ok')v.ok=Math.max(0,v.ok-1);if(val==='no')v.no=Math.max(0,v.no-1);v.mine=null;}
    else{if(v.mine==='ok')v.ok=Math.max(0,v.ok-1);if(v.mine==='no')v.no=Math.max(0,v.no-1);if(val==='ok')v.ok++;if(val==='no')v.no++;v.mine=val;}
    try{saveLocal();}catch(e){}
    try{render();}catch(e){}
    try{renderMacroBar();}catch(e){}
    try{updateProgress();}catch(e){}
    document.querySelectorAll('.vbtn').forEach(b=>b.classList.remove('on-ok','on-no'));
    if(v.mine==='ok')document.querySelector('.vbtn[data-v="ok"]')?.classList.add('on-ok');
    if(v.mine==='no')document.querySelector('.vbtn[data-v="no"]')?.classList.add('on-no');
    if(typeof toast==='function')toast(val==='ok'?'👍 registrado':'👎 registrado');
  };
  function uid(p){return p+Math.random().toString(36).slice(2,8);}
  function rebindToolbar(){
    ensureFlow();
    const ap=document.getElementById('btnAddProcess');
    if(ap)ap.onclick=()=>{ensureFlow();const n={id:uid('n'),macro:null,type:'process',title:'Novo processo',x:120+Math.random()*200,y:120+Math.random()*100,w:180,h:48};flow.nodes.push(n);selected={kind:'node',id:n.id};saveLocal();render();updateProgress();openModal();};
    const ad=document.getElementById('btnAddDecision');
    if(ad)ad.onclick=()=>{ensureFlow();const n={id:uid('n'),macro:null,type:'decision',title:'Decisão?',x:120+Math.random()*200,y:120+Math.random()*100,w:160,h:70};flow.nodes.push(n);selected={kind:'node',id:n.id};saveLocal();render();updateProgress();openModal();};
    const at=document.getElementById('btnAddText');
    if(at)at.onclick=()=>{ensureFlow();flow.nodes.push({id:uid('t'),macro:null,type:'process',title:'Texto',x:120,y:80,w:140,h:36});saveLocal();render();};
    const am=document.getElementById('btnAddMacro');
    if(am)am.onclick=()=>{
      ensureFlow();
      const used=new Set(flow.macros.map(m=>m.id));
      let id='A';for(let i=0;i<26;i++){const c=String.fromCharCode(65+i);if(!used.has(c)){id=c;break;}}
      const y=flow.macros.length?Math.max(...flow.macros.map(m=>m.y+m.h))+40:40;
      flow.macros.push({id,title:'MACRO '+id+' · Novo',x:40,y,w:360,h:220,color:'#e8f4fc',border:'#1a5f8a'});
      selected={kind:'macro',id};saveLocal();render();renderMacroBar();openModal();
      if(typeof toast==='function')toast('Macro '+id+' criado');
    };
    const bc=document.getElementById('btnConnect');
    if(bc)bc.onclick=()=>{tool=tool==='connect'?'select':'connect';connectFrom=null;bc.classList.toggle('active',tool==='connect');if(typeof toast==='function')toast(tool==='connect'?'Modo ligar':'Modo seleção');};
    const bn=document.getElementById('btnNewFlow');
    if(bn)bn.onclick=async()=>{
      const title=prompt('Nome do novo fluxo','Novo fluxo');if(!title)return;
      const data=(typeof emptyFlow==='function')?emptyFlow():{macros:[],nodes:[],edges:[],votes:{},comments:{},header:{},seal:null,sharedEmails:[]};
      data.header=data.header||{};data.header.projectName=title;
      flow=data;flowTitle=title;flowKey='local-'+Date.now().toString(36);
      localStorage.setItem(FLOW_KEY_STORE,flowKey);
      if(convexClient){try{const r=await convexClient.mutation('flows:create',{title,ownerEmail:user?.email,data:flow});flowKey=r.key;localStorage.setItem(FLOW_KEY_STORE,flowKey);}catch(e){console.warn(e);}}
      try{await loadFlowList();}catch(e){}
      const sel=document.getElementById('flowSelect');
      if(sel){let o=[...sel.options].find(o=>o.value===flowKey);if(!o){o=document.createElement('option');o.value=flowKey;o.textContent=title;sel.appendChild(o);}sel.value=flowKey;}
      render();renderMacroBar();updateProgress();
      if(typeof toast==='function')toast('Fluxo criado: '+title);
    };
  }
  function wireModal(){
    const saveBtn=document.getElementById('btnModalSave');
    if(saveBtn)saveBtn.onclick=()=>{
      ensureFlow();if(!selected)return;
      const name=document.getElementById('sideName');
      const comment=document.getElementById('sideComment');
      const color=document.getElementById('sideColor');
      if(selected.kind==='node'){const n=nodeById(selected.id);if(n&&name)n.title=name.value;}
      if(selected.kind==='edge'){const e=edgeById(selected.id);if(e&&name)e.label=name.value;}
      if(selected.kind==='macro'){const m=macroById(selected.id);if(m){if(name)m.title=name.value;if(color)m.color=color.value;}}
      if(comment)flow.comments[selected.kind+':'+selected.id]=comment.value;
      saveLocal();render();renderMacroBar();updateProgress();
      if(typeof toast==='function')toast('Salvo com sucesso');
    };
    const delBtn=document.getElementById('btnModalDelete');
    if(delBtn)delBtn.onclick=()=>{
      if(!selected)return;
      if(!confirm('Excluir este elemento?\n\nEsta ação não pode ser desfeita.'))return;
      ensureFlow();
      if(selected.kind==='node'){flow.nodes=flow.nodes.filter(n=>n.id!==selected.id);flow.edges=flow.edges.filter(e=>e.from!==selected.id&&e.to!==selected.id);}
      else if(selected.kind==='edge')flow.edges=flow.edges.filter(e=>e.id!==selected.id);
      else if(selected.kind==='macro')flow.macros=flow.macros.filter(m=>m.id!==selected.id);
      selected=null;document.getElementById('modalBg')?.classList.remove('open');
      saveLocal();render();renderMacroBar();updateProgress();
      if(typeof toast==='function')toast('Excluído');
    };
  }
  window.openModal=function(){
    ensureFlow();
    const bg=document.getElementById('modalBg');if(bg)bg.classList.add('open');
    const isM=selected&&selected.kind==='macro';
    const cl=document.getElementById('colorLabel');const sc=document.getElementById('sideColor');
    if(cl)cl.style.display=isM?'block':'none';if(sc)sc.style.display=isM?'block':'none';
    const title=document.getElementById('sideTitle');const meta=document.getElementById('sideMeta');
    const name=document.getElementById('sideName');const comment=document.getElementById('sideComment');
    if(!selected){if(title)title.textContent='Avaliação';return;}
    if(selected.kind==='node'){const n=nodeById(selected.id);if(title)title.textContent=(n?.title||'').replace(/\n/g,' · ');if(meta)meta.textContent='Módulo '+(n?.macro||'—');if(name)name.value=n?.title||'';}
    else if(selected.kind==='edge'){const e=edgeById(selected.id);if(title)title.textContent=(e?.from||'')+' → '+(e?.to||'');if(meta)meta.textContent='Conexão';if(name)name.value=e?.label||'';}
    else if(selected.kind==='macro'){const m=macroById(selected.id);if(title)title.textContent=m?.title||('MACRO '+selected.id);if(meta)meta.textContent='Macro '+selected.id+' — edite título e cor';if(name)name.value=m?.title||'';if(sc&&m?.color)sc.value=m.color.startsWith('#')?m.color:'#e8f4fc';}
    if(comment)comment.value=flow.comments[selected.kind+':'+selected.id]||'';
    const v=flow.votes[selected.kind+':'+selected.id]||{ok:0,no:0,mine:null};
    document.querySelectorAll('.vbtn').forEach(b=>b.classList.remove('on-ok','on-no'));
    if(v.mine==='ok')document.querySelector('.vbtn[data-v="ok"]')?.classList.add('on-ok');
    if(v.mine==='no')document.querySelector('.vbtn[data-v="no"]')?.classList.add('on-no');
  };
  const _render=window.render;
  window.render=function(){
    ensureFlow();
    if(typeof _render==='function')_render();
    document.querySelectorAll('#canvas .macro-box').forEach(box=>{
      if(box._fxBound)return;box._fxBound=true;
      box.addEventListener('dblclick',ev=>{
        ev.stopPropagation();
        const x=parseFloat(box.getAttribute('x'));const y=parseFloat(box.getAttribute('y'));
        const m=(flow.macros||[]).find(mm=>Math.abs(mm.x-x)<2&&Math.abs(mm.y-y)<2);
        if(m){selected={kind:'macro',id:m.id};openModal();}
      });
    });
  };
  const dupBtn=document.getElementById('btnDupConfirm');
  if(dupBtn)dupBtn.onclick=async()=>{
    const title=(document.getElementById('dupTitle')?.value||'').trim()||'Cópia';
    const company=(document.getElementById('dupCompany')?.value||'').trim();
    const emails=(document.getElementById('dupEmails')?.value||'').split(/[,;\s]+/).map(e=>e.trim().toLowerCase()).filter(e=>e.includes('@'));
    ensureFlow();
    let data=JSON.parse(JSON.stringify(flow));
    data.header=Object.assign({},data.header||{},{projectName:title,stakeholders:company});
    data.sharedEmails=emails;data.seal=null;
    flow=data;flowTitle=title;flowKey='dup-'+Date.now().toString(36);
    localStorage.setItem(FLOW_KEY_STORE,flowKey);
    if(convexClient){try{const r=await convexClient.mutation('flows:create',{title,ownerEmail:user?.email,data:flow});flowKey=r.key;localStorage.setItem(FLOW_KEY_STORE,flowKey);}catch(e){}}
    document.getElementById('dupModal')?.classList.remove('open');
    onlyShow('appMain');
    try{await loadFlowList();}catch(e){}
    render();renderMacroBar();updateProgress();
    if(typeof toast==='function')toast('Fluxo duplicado: '+title);
  };
  async function hashPass(pw){const data=new TextEncoder().encode('fluxora:'+pw);const buf=await crypto.subtle.digest('SHA-256',data);return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');}
  const form=document.getElementById('authForm');
  if(form)form.onsubmit=async(ev)=>{
    ev.preventDefault();
    const email=(document.getElementById('authEmail').value||'').trim().toLowerCase();
    const password=document.getElementById('authPassword')?.value||'';
    const err=document.getElementById('authError');
    const showErr=(t)=>{if(err){err.textContent=t;err.hidden=false;}};
    if(!email.includes('@')){showErr('E-mail inválido');return;}
    if(password.length<6){showErr('Senha com no mínimo 6 caracteres');return;}
    const passwordHash=await hashPass(password);
    const mode=(typeof authMode!=='undefined')?authMode:(document.getElementById('tabRegister')?.classList.contains('active')?'register':'login');
    let name=(document.getElementById('authName')?.value||'').trim();
    const company=(document.getElementById('authCompany')?.value||'').trim();
    const phone=(document.getElementById('authPhone')?.value||'').trim();
    if(mode==='register'){
      if(!name)name=email.split('@')[0];
      let db=[];try{db=JSON.parse(localStorage.getItem(USERS_KEY)||'[]');}catch(e){}
      if(db.find(u=>u.email===email)){showErr('E-mail já cadastrado');return;}
      db.push({email,name,passwordHash,company,phone,createdAt:Date.now()});
      localStorage.setItem(USERS_KEY,JSON.stringify(db));
      if(convexClient){try{await convexClient.mutation('auth:register',{email,name,passwordHash,company,phone});}catch(e){}}
      user={email,name,company,phone};localStorage.setItem(USER_KEY,JSON.stringify(user));
      document.getElementById('loginModal').hidden=true;await window.enterApp();
      if(typeof toast==='function')toast('Conta criada');return;
    }
    let ok=null;
    if(convexClient){try{ok=await convexClient.query('auth:login',{email,passwordHash});}catch(e){}}
    if(!ok){let db=[];try{db=JSON.parse(localStorage.getItem(USERS_KEY)||'[]');}catch(e){}const row=db.find(u=>u.email===email&&u.passwordHash===passwordHash);if(row)ok={email:row.email,name:row.name,company:row.company||'',phone:row.phone||''};}
    if(!ok){let db=[];try{db=JSON.parse(localStorage.getItem(USERS_KEY)||'[]');}catch(e){}const row=db.find(u=>u.email===email&&!u.passwordHash);if(row){row.passwordHash=passwordHash;localStorage.setItem(USERS_KEY,JSON.stringify(db));ok={email:row.email,name:row.name,company:row.company||'',phone:row.phone||''};}}
    if(!ok){try{const prev=JSON.parse(localStorage.getItem(USER_KEY)||'null');if(prev&&prev.email===email){ok={email,name:prev.name||email.split('@')[0],company:prev.company||'',phone:prev.phone||''};let db=[];try{db=JSON.parse(localStorage.getItem(USERS_KEY)||'[]');}catch(e){}if(!db.find(u=>u.email===email)){db.push({email,name:ok.name,passwordHash,company:ok.company,phone:ok.phone,createdAt:Date.now()});localStorage.setItem(USERS_KEY,JSON.stringify(db));}}}catch(e){}}
    if(!ok){showErr('E-mail ou senha incorretos');return;}
    user={email:ok.email,name:ok.name,company:ok.company||'',phone:ok.phone||''};
    localStorage.setItem(USER_KEY,JSON.stringify(user));
    document.getElementById('loginModal').hidden=true;await window.enterApp();
    if(typeof toast==='function')toast('Bem-vindo, '+user.name);
  };
  async function uploadFile(file){
    if(!file)return null;
    if(!convexClient)return await new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res({url:r.result,storageId:null});r.onerror=rej;r.readAsDataURL(file);});
    const uploadUrl=await convexClient.mutation('files:generateUploadUrl',{});
    const result=await fetch(uploadUrl,{method:'POST',headers:{'Content-Type':file.type},body:file});
    const {storageId}=await result.json();
    const url=await convexClient.mutation('files:getUrl',{storageId});
    return {url,storageId};
  }
  document.getElementById('profPhotoFile')?.addEventListener('change',async e=>{const f=e.target.files?.[0];if(!f)return;const up=await uploadFile(f);if(up){user.photo=up.url;user.photoStorageId=up.storageId;const img=document.getElementById('profPhotoPrev');if(img){img.src=up.url;img.style.display='block';}if(typeof toast==='function')toast('Foto carregada');}});
  document.getElementById('profLogoFile')?.addEventListener('change',async e=>{const f=e.target.files?.[0];if(!f)return;const up=await uploadFile(f);if(up){user.logo=up.url;user.logoStorageId=up.storageId;const img=document.getElementById('profLogoPrev');if(img){img.src=up.url;img.style.display='block';}if(typeof toast==='function')toast('Logo carregada');}});
  document.getElementById('btnSaveProfile')?.addEventListener('click',async()=>{
    if(!user)return;
    user.name=document.getElementById('profName').value.trim()||user.name;
    user.company=document.getElementById('profCompany').value.trim();
    user.phone=document.getElementById('profPhone').value.trim();
    localStorage.setItem(USER_KEY,JSON.stringify(user));
    if(convexClient){try{await convexClient.mutation('auth:updateProfile',{email:user.email,name:user.name,company:user.company,phone:user.phone,photoStorageId:user.photoStorageId||undefined,logoStorageId:user.logoStorageId||undefined});}catch(e){}}
    if(flow){flow.ownerProfile={name:user.name,company:user.company,phone:user.phone,photo:user.photo,logo:user.logo};saveLocal();}
    const lab=document.getElementById('userLabel');if(lab)lab.textContent=user.name+' · '+user.email;
    document.getElementById('profileModal')?.classList.remove('open');
    if(typeof toast==='function')toast('Perfil salvo');
  });
  function boot(){
    addPasswordToggle();wireModal();rebindToolbar();
    try{const u=JSON.parse(localStorage.getItem(USER_KEY)||'null');if(!u||!u.email){onlyShow('publicPage');user=null;}}catch(e){onlyShow('publicPage');}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);
  else setTimeout(boot,100);
  setTimeout(boot,600);
  setTimeout(rebindToolbar,1000);
})();
