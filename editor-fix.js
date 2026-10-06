/* Fluxora critical fixes */
(function(){
  const CFG=window.HEMOPI_CONFIG||{};
  function onlyShow(id){
    ['publicPage','appMain','adminPage','adminGate','flowManager'].forEach(k=>{
      const el=document.getElementById(k);
      if(el) el.hidden=(k!==id);
    });
  }
  const _showPublic=window.showPublic;
  window.showPublic=function(){
    onlyShow('publicPage');
    if(typeof _showPublic==='function') try{_showPublic();}catch(e){}
    onlyShow('publicPage');
  };
  const _enterApp=window.enterApp;
  window.enterApp=async function(){
    onlyShow('appMain');
    if(typeof _enterApp==='function') await _enterApp();
    onlyShow('appMain');
    try{render();}catch(e){}
  };
  function endDrag(){
    if((typeof drag!=='undefined'&&drag)||window.drag){
      try{if(typeof saveLocal==='function')saveLocal();}catch(e){}
    }
    window.drag=null;
    try{drag=null;}catch(e){}
  }
  window.onUp=function(){endDrag();};
  window.addEventListener('mouseup',endDrag,true);
  window.addEventListener('pointerup',endDrag,true);
  window.addEventListener('pointercancel',endDrag,true);
  window.addEventListener('blur',endDrag);
  document.addEventListener('mouseup',endDrag,true);
  const prevMove=window.onMove;
  window.onMove=function(ev){
    const d=(typeof drag!=='undefined'&&drag)?drag:window.drag;
    if(!d||!flow)return;
    if(ev.buttons!==undefined&&(ev.buttons&1)===0){endDrag();return;}
    if(typeof prevMove==='function'){try{prevMove(ev);return;}catch(e){}}
    const dx=ev.clientX-d.sx,dy=ev.clientY-d.sy;
    if(d.type==='node'){const n=nodeById(d.id);if(n){n.x=d.ox+dx;n.y=d.oy+dy;render();}}
    else if(d.type==='macro'){
      const m=macroById(d.id);if(!m)return;
      const nx=d.ox+dx,ny=d.oy+dy;
      const pdx=nx-(d._lastX!=null?d._lastX:d.ox);
      const pdy=ny-(d._lastY!=null?d._lastY:d.oy);
      m.x=nx;m.y=ny;
      flow.nodes.forEach(n=>{if(n.macro===m.id){n.x+=pdx;n.y+=pdy;}});
      d._lastX=nx;d._lastY=ny;window.drag=d;try{drag=d;}catch(e){};render();
    }else if(d.type==='resize'){
      const m=macroById(d.id);if(!m)return;
      m.w=Math.max(140,d.ox+dx);m.h=Math.max(100,d.oy+dy);render();
    }
  };
  window.addEventListener('mousemove',function(ev){window.onMove(ev);},true);
  window.addEventListener('pointermove',function(ev){window.onMove(ev);},true);
  async function hashPass(pw){
    const data=new TextEncoder().encode('fluxora:'+pw);
    const buf=await crypto.subtle.digest('SHA-256',data);
    return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
  }
  const form=document.getElementById('authForm');
  if(form){
    form.onsubmit=async(ev)=>{
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
        if(convexClient){try{await convexClient.mutation('auth:register',{email,name,passwordHash,company,phone});}catch(e){console.warn(e);}}
        user={email,name,company,phone};
        localStorage.setItem(USER_KEY,JSON.stringify(user));
        document.getElementById('loginModal').hidden=true;
        await window.enterApp();
        if(typeof toast==='function')toast('Conta criada');
        return;
      }
      let ok=null;
      if(convexClient){try{ok=await convexClient.query('auth:login',{email,passwordHash});}catch(e){}}
      if(!ok){
        let db=[];try{db=JSON.parse(localStorage.getItem(USERS_KEY)||'[]');}catch(e){}
        const row=db.find(u=>u.email===email&&u.passwordHash===passwordHash);
        if(row)ok={email:row.email,name:row.name,company:row.company||'',phone:row.phone||''};
      }
      if(!ok){
        let db=[];try{db=JSON.parse(localStorage.getItem(USERS_KEY)||'[]');}catch(e){}
        const row=db.find(u=>u.email===email&&!u.passwordHash);
        if(row){row.passwordHash=passwordHash;localStorage.setItem(USERS_KEY,JSON.stringify(db));ok={email:row.email,name:row.name,company:row.company||'',phone:row.phone||''};}
      }
      if(!ok){
        try{
          const prev=JSON.parse(localStorage.getItem(USER_KEY)||'null');
          if(prev&&prev.email===email){
            ok={email,name:prev.name||email.split('@')[0],company:prev.company||'',phone:prev.phone||''};
            let db=[];try{db=JSON.parse(localStorage.getItem(USERS_KEY)||'[]');}catch(e){}
            if(!db.find(u=>u.email===email)){db.push({email,name:ok.name,passwordHash,company:ok.company,phone:ok.phone,createdAt:Date.now()});localStorage.setItem(USERS_KEY,JSON.stringify(db));}
          }
        }catch(e){}
      }
      if(!ok){showErr('E-mail ou senha incorretos');return;}
      user={email:ok.email,name:ok.name,company:ok.company||'',phone:ok.phone||'',photoStorageId:ok.photoStorageId,logoStorageId:ok.logoStorageId};
      localStorage.setItem(USER_KEY,JSON.stringify(user));
      document.getElementById('loginModal').hidden=true;
      await window.enterApp();
      if(typeof toast==='function')toast('Bem-vindo, '+user.name);
    };
  }
  async function uploadFile(file){
    if(!file)return null;
    if(!convexClient){
      return await new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res({url:r.result,storageId:null});r.onerror=rej;r.readAsDataURL(file);});
    }
    const uploadUrl=await convexClient.mutation('files:generateUploadUrl',{});
    const result=await fetch(uploadUrl,{method:'POST',headers:{'Content-Type':file.type},body:file});
    const {storageId}=await result.json();
    const url=await convexClient.mutation('files:getUrl',{storageId});
    return {url,storageId};
  }
  document.getElementById('profPhotoFile')?.addEventListener('change',async(e)=>{
    const f=e.target.files?.[0];if(!f)return;
    const up=await uploadFile(f);
    if(up){user.photo=up.url;user.photoStorageId=up.storageId;const img=document.getElementById('profPhotoPrev');if(img){img.src=up.url;img.style.display='block';}if(typeof toast==='function')toast('Foto carregada');}
  });
  document.getElementById('profLogoFile')?.addEventListener('change',async(e)=>{
    const f=e.target.files?.[0];if(!f)return;
    const up=await uploadFile(f);
    if(up){user.logo=up.url;user.logoStorageId=up.storageId;const img=document.getElementById('profLogoPrev');if(img){img.src=up.url;img.style.display='block';}if(typeof toast==='function')toast('Logo carregada');}
  });
  const saveProf=document.getElementById('btnSaveProfile');
  if(saveProf){
    saveProf.onclick=async()=>{
      if(!user)return;
      user.name=document.getElementById('profName').value.trim()||user.name;
      user.company=document.getElementById('profCompany').value.trim();
      user.phone=document.getElementById('profPhone').value.trim();
      localStorage.setItem(USER_KEY,JSON.stringify(user));
      if(convexClient){try{await convexClient.mutation('auth:updateProfile',{email:user.email,name:user.name,company:user.company,phone:user.phone,photoStorageId:user.photoStorageId||undefined,logoStorageId:user.logoStorageId||undefined});}catch(e){}}
      if(flow){if(!flow.ownerProfile)flow.ownerProfile={};flow.ownerProfile={name:user.name,company:user.company,phone:user.phone,photo:user.photo,logo:user.logo};if(typeof saveLocal==='function')saveLocal();}
      const lab=document.getElementById('userLabel');if(lab)lab.textContent=user.name+' · '+user.email;
      document.getElementById('profileModal').classList.remove('open');
      if(typeof toast==='function')toast('Perfil salvo');
      try{renderProjectHeader();}catch(e){}
    };
  }
  function bootFix(){
    try{
      const u=JSON.parse(localStorage.getItem(USER_KEY)||'null');
      if(!u||!u.email){onlyShow('publicPage');user=null;}
    }catch(e){onlyShow('publicPage');}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bootFix);
  else setTimeout(bootFix,50);
  setTimeout(bootFix,400);
  setTimeout(bootFix,1200);
})();
