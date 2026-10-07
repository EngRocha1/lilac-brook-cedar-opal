/* HEMOPI Flow — landing + login modal + admin + editor — RESTORED 9c55ef5 */
const STORAGE_KEY='hemopi_editor_v1',USER_KEY='hemopi_user',FLOW_KEY_STORE='hemopi_flow_key',USERS_KEY='hemopi_users_db',STYLE_KEY='hemopi_style',MASTER_KEY='hemopi_master_pass';
const CONVEX_URL='https://disciplined-jaguar-3.convex.cloud';
const CFG=window.HEMOPI_CONFIG||{};
let flow=null,selected=null,tool='select',drag=null,connectFrom=null,convexClient=null;
let flowKey=localStorage.getItem(FLOW_KEY_STORE)||'hemopi-main';
let flowTitle='HEMOPI principal';
let user=null,authMode='login',adminUnlocked=false;
try{user=JSON.parse(localStorage.getItem(USER_KEY)||'null');}catch(e){user=null;}
const svgNS='http://www.w3.org/2000/svg';
(function(){const y=document.getElementById('y');if(y)y.textContent=new Date().getFullYear();})();
function applyStyle(){let s={};try{s=JSON.parse(localStorage.getItem(STYLE_KEY)||'{}');}catch(e){}
if(s.neon)document.documentElement.style.setProperty('--neon',s.neon);
if(s.bg)document.documentElement.style.setProperty('--bg',s.bg);
const num=(s.wa||CFG.WHATSAPP_NUMBER||'').replace(/\D/g,'');
const msg=encodeURIComponent(CFG.WHATSAPP_MSG||'Olá!');
const wa=document.getElementById('waFloat');
if(wa)wa.href=num?'https://wa.me/'+num+'?text='+msg:'#';}
applyStyle();
(function(){const b=document.getElementById('navBurger');if(b)b.onclick=()=>{const n=document.getElementById('navLinks');if(n)n.classList.toggle('open');};})();
async function initConvex(){try{const mod=await import('https://esm.sh/convex@1.17.0/browser');if(!mod.ConvexHttpClient)return;convexClient=new mod.ConvexHttpClient(CONVEX_URL);window.convexClient=convexClient;}catch(e){console.warn('Convex',e);}}
function emptyFlow(){return{macros:[],nodes:[],edges:[],votes:{},comments:{}};}
function openLogin(){const m=document.getElementById('loginModal');if(m)m.hidden=false;setAuthTab('login');try{initGoogleBtn();}catch(e){}}
function closeLogin(){const m=document.getElementById('loginModal');if(m)m.hidden=true;}
(function(){const b=document.getElementById('btnOpenLogin');if(b)b.onclick=openLogin;})();
(function(){const b=document.getElementById('btnHeroStart');if(b)b.onclick=openLogin;})();
(function(){const b=document.getElementById('loginClose');if(b)b.onclick=closeLogin;})();
(function(){const m=document.getElementById('loginModal');if(m)m.addEventListener('click',e=>{if(e.target.id==='loginModal')closeLogin();});})();
function setAuthTab(mode){authMode=mode;const tl=document.getElementById('tabLogin'),tr=document.getElementById('tabRegister'),fn=document.getElementById('fieldName'),as=document.getElementById('authSubmit'),ae=document.getElementById('authError');if(tl)tl.classList.toggle('active',mode==='login');if(tr)tr.classList.toggle('active',mode==='register');if(fn)fn.style.display=mode==='register'?'flex':'none';if(as)as.textContent=mode==='register'?'Criar conta grátis':'Entrar com e-mail';if(ae)ae.hidden=true;}
(function(){const b=document.getElementById('tabLogin');if(b)b.onclick=()=>setAuthTab('login');})();
(function(){const b=document.getElementById('tabRegister');if(b)b.onclick=()=>setAuthTab('register');})();
function initGoogleBtn(){const cid=CFG.GOOGLE_CLIENT_ID||'';const hint=document.getElementById('googleHint');const wrap=document.getElementById('googleBtn');if(!wrap)return;wrap.innerHTML='';if(!cid){if(hint){hint.hidden=false;hint.textContent='Cole o Google Client ID em config.js';}return;}if(hint)hint.hidden=true;}
function showAuthErr(t){const e=document.getElementById('authError');if(e){e.textContent=t;e.hidden=false;}}
function flash(t){const el=document.getElementById('toast');if(!el)return;el.textContent=t;el.hidden=false;setTimeout(()=>{el.hidden=true;},2200);}window.toast=function(t,err){flash(t);};
(function(){const f=document.getElementById('authForm');if(!f)return;f.onsubmit=async(ev)=>{ev.preventDefault();const email=(document.getElementById('authEmail')?.value||'').trim().toLowerCase();let name=(document.getElementById('authName')?.value||'').trim();if(!email.includes('@')){showAuthErr('E-mail inválido');return;}if(authMode==='register'&&!name){showAuthErr('Informe o nome');return;}if(!name)name=email.split('@')[0];completeLogin(name,email);};})();
function completeLogin(name,email){user={name,email};localStorage.setItem(USER_KEY,JSON.stringify(user));closeLogin();if(typeof window.enterApp==='function')window.enterApp();else{const pub=document.getElementById('publicPage');const app=document.getElementById('appMain');if(pub)pub.hidden=true;if(app)app.hidden=false;}}
function showPublic(){['publicPage','appMain','adminPage','adminGate','flowManager'].forEach(id=>{const el=document.getElementById(id);if(!el)return;el.hidden=(id!=='publicPage');});}
(function(){const b=document.getElementById('btnLogout');if(b)b.onclick=()=>{user=null;localStorage.removeItem(USER_KEY);showPublic();flash('Saiu');};})();
function getMaster(){return localStorage.getItem(MASTER_KEY)||'2004103007';}
function getUsers(){try{return JSON.parse(localStorage.getItem(USERS_KEY)||'[]');}catch(e){return[];}}
function saveUsers(u){localStorage.setItem(USERS_KEY,JSON.stringify(u));}
(function(){const b=document.getElementById('footerAdmin');if(b)b.onclick=(e)=>{e.preventDefault();const pub=document.getElementById('publicPage');const gate=document.getElementById('adminGate');if(pub)pub.hidden=true;if(gate)gate.hidden=false;};})();
(function(){const b=document.getElementById('adminClose');if(b)b.onclick=()=>showPublic();})();
(function(){const b=document.getElementById('btnMaster');if(b)b.onclick=()=>{const p=document.getElementById('masterPass')?.value||'';const msg=document.getElementById('masterMsg');if(p===getMaster()){adminUnlocked=true;if(msg)msg.hidden=true;const ap=document.getElementById('adminPage');const gate=document.getElementById('adminGate');if(gate)gate.hidden=true;if(ap)ap.hidden=false;}else if(msg){msg.textContent='Senha master incorreta';msg.hidden=false;}};})();
(function(){const b=document.getElementById('btnAddUser');if(b)b.onclick=()=>{if(!adminUnlocked)return;const email=(document.getElementById('newUserEmail')?.value||'').trim().toLowerCase();const name=(document.getElementById('newUserName')?.value||'').trim();if(!email)return;const db=getUsers();db.push({email,name:name||email});saveUsers(db);flash('Usuário adicionado');};})();
(function(){const b=document.getElementById('btnSaveStyle');if(b)b.onclick=()=>{if(!adminUnlocked)return;const s={neon:document.getElementById('styleNeon')?.value,bg:document.getElementById('styleBg')?.value,wa:document.getElementById('styleWa')?.value};localStorage.setItem(STYLE_KEY,JSON.stringify(s));applyStyle();flash('Estilo salvo');};})();
(function(){const b=document.getElementById('btnSetMaster');if(b)b.onclick=()=>{if(!adminUnlocked)return;const n=document.getElementById('newMaster')?.value||'';if(n.length<6){flash('Senha curta');return;}localStorage.setItem(MASTER_KEY,n);flash('Master atualizada');};})();
function nodeById(id){return(flow&&flow.nodes||[]).find(n=>n.id===id);}
function macroById(id){return(flow&&flow.macros||[]).find(m=>m.id===id);}
function voteKey(k,id){return k+':'+id;}
function getVote(k,id){const v=(flow.votes||{})[voteKey(k,id)];return v||{ok:0,no:0,mine:''};}
function setMyVote(k,id,val){if(!flow.votes)flow.votes={};const key=voteKey(k,id);const cur=getVote(k,id);if(cur.mine===val)return;if(cur.mine==='ok')cur.ok=Math.max(0,cur.ok-1);if(cur.mine==='no')cur.no=Math.max(0,cur.no-1);cur.mine=val;if(val==='ok')cur.ok++;if(val==='no')cur.no++;flow.votes[key]=cur;saveLocal();if(typeof updateProgress==='function')updateProgress();if(typeof render==='function')render();}
function centerOf(n){return{x:n.x+n.w/2,y:n.y+n.h/2};}
function pathForEdge(e){const a=nodeById(e.from),b=nodeById(e.to);if(!a||!b)return'';const p0=centerOf(a),p1=centerOf(b),pts=e.points||[];let d='M '+p0.x+' '+p0.y;pts.forEach(p=>{d+=' L '+p.x+' '+p.y;});d+=' L '+p1.x+' '+p1.y;return d;}
function midOfEdge(e){const a=nodeById(e.from),b=nodeById(e.to);if(!a||!b)return{x:0,y:0};const pts=e.points||[];if(pts.length)return pts[Math.floor(pts.length/2)];const p0=centerOf(a),p1=centerOf(b);return{x:(p0.x+p1.x)/2,y:(p0.y+p1.y)/2};}
function el(tag,attrs={},kids=[]){const n=document.createElementNS(svgNS,tag);Object.entries(attrs).forEach(([k,v])=>{if(k==='class')n.setAttribute('class',v);else n.setAttribute(k,String(v));});kids.forEach(c=>n.appendChild(typeof c==='string'?document.createTextNode(c):c));return n;}
function renderMacroBar(){const bar=document.getElementById('macroBar');if(!bar||!flow)return;bar.innerHTML='<h3>Macros</h3>';(flow.macros||[]).forEach(m=>{const b=document.createElement('button');b.type='button';b.className='btn';b.textContent=(m.id||'')+' · '+(m.title||'');b.onclick=()=>{selected={kind:'macro',id:m.id};if(typeof openModal==='function')openModal();};bar.appendChild(b);});}
function render(){if(!flow)return;const svg=document.getElementById('canvas');if(!svg)return;svg.innerHTML='';const defs=el('defs');['#1a5f8a','#c9a227','#5b4b8a','#c41e3a','#1b7a4e','#5c6b7a'].forEach((c,i)=>{const m=el('marker',{id:'mk'+i,markerWidth:'8',markerHeight:'8',refX:'6',refY:'4',orient:'auto'});m.appendChild(el('path',{d:'M0,0 L8,4 L0,8 Z',fill:c}));defs.appendChild(m);});svg.appendChild(defs);(flow.macros||[]).forEach(m=>{const g=el('g');g.appendChild(el('rect',{'class':'macro-box',x:m.x,y:m.y,width:m.w,height:m.h,rx:'14',fill:m.color||'#e8f4fc',stroke:m.border||'#1a5f8a'}));g.appendChild(el('text',{x:m.x+12,y:m.y+22,'font-size':'13',fill:'#334155','font-weight':'700'},[m.title||m.id]));g.addEventListener('mousedown',ev=>{ev.stopPropagation();selected={kind:'macro',id:m.id};drag={type:'macro',id:m.id,ox:m.x,oy:m.y,sx:ev.clientX,sy:ev.clientY};});svg.appendChild(g);});(flow.edges||[]).forEach(e=>{const p=el('path',{'class':'edge',d:pathForEdge(e),fill:'none',stroke:'#64748b','stroke-width':'2'});p.addEventListener('mousedown',ev=>{ev.stopPropagation();selected={kind:'edge',id:e.id};});svg.appendChild(p);});(flow.nodes||[]).forEach(n=>{const g=el('g');const shape=n.type==='decision'
  ? el('polygon',{points:`${n.x+n.w/2},${n.y} ${n.x+n.w},${n.y+n.h/2} ${n.x+n.w/2},${n.y+n.h} ${n.x},${n.y+n.h/2}`,fill:'#fff',stroke:'#1a5f8a','stroke-width':'2'})
  : el('rect',{x:n.x,y:n.y,width:n.w,height:n.h,rx:'10',fill:'#fff',stroke:'#1a5f8a','stroke-width':'2'});g.appendChild(shape);const lines=String(n.title||'').split('\n');lines.forEach((ln,i)=>{g.appendChild(el('text',{x:n.x+n.w/2,y:n.y+n.h/2-{(lines.length-1)*6}+i*12,'text-anchor':'middle','font-size':'12',fill:'#0f172a'},[ln]));});g.addEventListener('mousedown',ev=>{ev.stopPropagation();selected={kind:'node',id:n.id};drag={type:'node',id:n.id,ox:n.x,oy:n.y,sx:ev.clientX,sy:ev.clientY};});svg.appendChild(g);});}
function onMove(ev){if(!drag||!flow)return;const dx=ev.clientX-drag.sx,dy=ev.clientY-drag.sy;if(drag.type==='node'){const n=nodeById(drag.id);if(n){n.x=drag.ox+dx;n.y=drag.oy+dy;render();}}else if(drag.type==='macro'){const m=macroById(drag.id);if(!m)return;const nx=drag.ox+dx,ny=drag.oy+dy;const pdx=nx-(drag._lastX!=null?drag._lastX:drag.ox);const pdy=ny-(drag._lastY!=null?drag._lastY:drag.oy);m.x=nx;m.y=ny;(flow.nodes||[]).forEach(n=>{if(n.macro===m.id){n.x+=pdx;n.y+=pdy;}});drag._lastX=nx;drag._lastY=ny;render();}}
function onUp(){if(drag){saveLocal();drag=null;}}
function openModal(){const bg=document.getElementById('modalBg');if(bg)bg.classList.add('open');}
function closeModal(){const bg=document.getElementById('modalBg');if(bg)bg.classList.remove('open');}
function voteSelected(val){if(selected)setMyVote(selected.kind,selected.id,val);}
function deleteSelected(){if(!selected||!flow)return;if(selected.kind==='node'){flow.nodes=flow.nodes.filter(n=>n.id!==selected.id);flow.edges=(flow.edges||[]).filter(e=>e.from!==selected.id&&e.to!==selected.id);}else if(selected.kind==='macro'){flow.macros=(flow.macros||[]).filter(m=>m.id!==selected.id);}else if(selected.kind==='edge'){flow.edges=(flow.edges||[]).filter(e=>e.id!==selected.id);}selected=null;saveLocal();render();closeModal();}
function uid(p){return p+Math.random().toString(36).slice(2,8);}
(function(){const b=document.getElementById('btnAddProcess');if(b)b.onclick=()=>{if(!flow)return;flow.nodes.push({id:uid('n'),macro:null,type:'process',title:'Novo processo',x:120+Math.random()*200,y:120+Math.random()*120,w:140,h:48});saveLocal();render();};})();
(function(){const b=document.getElementById('btnAddDecision');if(b)b.onclick=()=>{if(!flow)return;flow.nodes.push({id:uid('n'),macro:null,type:'decision',title:'Decisão?',x:120+Math.random()*200,y:120+Math.random()*120,w:120,h:72});saveLocal();render();};})();
(function(){const b=document.getElementById('btnAddText');if(b)b.onclick=()=>{if(!flow)return;flow.nodes.push({id:uid('t'),macro:null,type:'process',title:'Texto',x:120,y:80,w:140,h:36});saveLocal();render();};})();
(function(){const b=document.getElementById('btnAddMacro');if(b)b.onclick=()=>{if(!flow)return;const id=String.fromCharCode(65+(flow.macros||[]).length);flow.macros.push({id,title:'MACRO '+id,x:40,y:40,w:420,h:260,color:'#e8f4fc',border:'#1a5f8a'});saveLocal();render();renderMacroBar();};})();
(function(){const b=document.getElementById('btnConnect');if(b)b.onclick=()=>{tool=tool==='connect'?'select':'connect';connectFrom=null;b.classList.toggle('pri',tool==='connect');};})();
function saveLocal(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify({flowKey,flowTitle,flow}));}catch(e){}}
function exportJSON(){const blob=new Blob([JSON.stringify(flow,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=(flowTitle||'flow')+'.json';a.click();}
function printMode(){window.print();}
(function(){const b=document.getElementById('btnNewFlow');if(b)b.onclick=async()=>{const title=prompt('Nome do fluxo','Novo fluxo');if(!title)return;flowKey='flow-'+Math.random().toString(36).slice(2,10);flowTitle=title;flow=emptyFlow();localStorage.setItem(FLOW_KEY_STORE,flowKey);saveLocal();render();renderMacroBar();flash('Novo fluxo');};})();
window.addEventListener('mousemove',onMove);
window.addEventListener('mouseup',onUp);
window.saveLocal=saveLocal;window.exportJSON=exportJSON;window.printMode=printMode;window.voteSelected=voteSelected;window.closeModal=closeModal;window.deleteSelected=deleteSelected;window.render=render;window.renderMacroBar=renderMacroBar;window.nodeById=nodeById;window.macroById=macroById;window.openModal=openModal;window.onMove=onMove;window.onUp=onUp;
initConvex();
console.log('[Fluxora] editor RESTORED stable');
