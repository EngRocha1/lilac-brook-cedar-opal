/* editor part 1 — restored stable */
const STORAGE_KEY='hemopi_editor_v1',USER_KEY='hemopi_user',FLOW_KEY_STORE='hemopi_flow_key',USERS_KEY='hemopi_users_db',STYLE_KEY='hemopi_style',MASTER_KEY='hemopi_master_pass';
const CONVEX_URL='https://disciplined-jaguar-3.convex.cloud';
const CFG=window.HEMOPI_CONFIG||{};
let flow=null,selected=null,tool='select',drag=null,connectFrom=null,convexClient=null;
let flowKey=localStorage.getItem(FLOW_KEY_STORE)||'hemopi-main';
let flowTitle='HEMOPI principal';
let user=null,authMode='login',adminUnlocked=false;
try{user=JSON.parse(localStorage.getItem(USER_KEY)||'null');}catch(e){user=null;}
const svgNS='http://www.w3.org/2000/svg';
(function(){var y=document.getElementById('y');if(y)y.textContent=new Date().getFullYear();})();
function applyStyle(){let s={};try{s=JSON.parse(localStorage.getItem(STYLE_KEY)||'{}');}catch(e){}
if(s.neon)document.documentElement.style.setProperty('--neon',s.neon);
if(s.bg)document.documentElement.style.setProperty('--bg',s.bg);
const num=(s.wa||CFG.WHATSAPP_NUMBER||'').replace(/\D/g,'');
const msg=encodeURIComponent(CFG.WHATSAPP_MSG||'Olá!');
const wa=document.getElementById('waFloat');
if(wa)wa.href=num?'https://wa.me/'+num+'?text='+msg:'#';}
applyStyle();
(function(){var __b=document.getElementById('navBurger');if(__b)__b.onclick=()=>document.getElementById('navLinks').classList.toggle('open');})();
async function initConvex(){try{const mod=await import('https://esm.sh/convex@1.17.0/browser');if(!mod.ConvexHttpClient)return;convexClient=new mod.ConvexHttpClient(CONVEX_URL);window.convexClient=convexClient;}catch(e){console.warn('Convex',e);}}
function emptyFlow(){return{macros:[],nodes:[],edges:[],votes:{},comments:{}};}
function openLogin(){const m=document.getElementById('loginModal');if(m)m.hidden=false;setAuthTab('login');try{initGoogleBtn();}catch(e){}}
function closeLogin(){const m=document.getElementById('loginModal');if(m)m.hidden=true;}
(function(){var __b=document.getElementById('btnOpenLogin');if(__b)__b.onclick=openLogin;})();
(function(){var __b=document.getElementById('btnHeroStart');if(__b)__b.onclick=openLogin;})();
(function(){var __b=document.getElementById('loginClose');if(__b)__b.onclick=closeLogin;})();
(function(){const m=document.getElementById('loginModal');if(m)m.addEventListener('click',e=>{if(e.target.id==='loginModal')closeLogin();});})();
function setAuthTab(mode){authMode=mode;const tl=document.getElementById('tabLogin'),tr=document.getElementById('tabRegister'),fn=document.getElementById('fieldName'),as=document.getElementById('authSubmit'),ae=document.getElementById('authError');if(tl)tl.classList.toggle('active',mode==='login');if(tr)tr.classList.toggle('active',mode==='register');if(fn)fn.style.display=mode==='register'?'flex':'none';if(as)as.textContent=mode==='register'?'Criar conta grátis':'Entrar com e-mail';if(ae)ae.hidden=true;}
(function(){var __b=document.getElementById('tabLogin');if(__b)__b.onclick=()=>setAuthTab('login');})();
(function(){var __b=document.getElementById('tabRegister');if(__b)__b.onclick=()=>setAuthTab('register');})();
function initGoogleBtn(){const cid=CFG.GOOGLE_CLIENT_ID||'';const hint=document.getElementById('googleHint');const wrap=document.getElementById('googleBtn');if(!wrap)return;wrap.innerHTML='';if(!cid){if(hint){hint.hidden=false;hint.textContent='Cole o Google Client ID em config.js';}return;}if(hint)hint.hidden=true;}
function showAuthErr(t){const e=document.getElementById('authError');if(e){e.textContent=t;e.hidden=false;}}
function flash(t){const el=document.getElementById('toast');if(!el)return;el.textContent=t;el.hidden=false;setTimeout(()=>{el.hidden=true;},2200);}window.toast=function(t){flash(t);};
(function(){const f=document.getElementById('authForm');if(!f)return;f.onsubmit=async(ev)=>{ev.preventDefault();const email=(document.getElementById('authEmail')?.value||'').trim().toLowerCase();let name=(document.getElementById('authName')?.value||'').trim();if(!email.includes('@')){showAuthErr('E-mail inválido');return;}if(authMode==='register'&&!name){showAuthErr('Informe o nome');return;}if(!name)name=email.split('@')[0];completeLogin(name,email);};})();
function completeLogin(name,email){user={name,email};localStorage.setItem(USER_KEY,JSON.stringify(user));closeLogin();if(typeof window.enterApp==='function')window.enterApp();else{const pub=document.getElementById('publicPage');const app=document.getElementById('appMain');if(pub)pub.hidden=true;if(app)app.hidden=false;}}
function showPublic(){['publicPage','appMain','adminPage','adminGate','flowManager'].forEach(id=>{const el=document.getElementById(id);if(!el)return;el.hidden=(id!=='publicPage');});}
(function(){var __b=document.getElementById('btnLogout');if(__b)__b.onclick=()=>{user=null;localStorage.removeItem(USER_KEY);showPublic();flash('Saiu');};})();
function getMaster(){return localStorage.getItem(MASTER_KEY)||'2004103007';}
function getUsers(){try{return JSON.parse(localStorage.getItem(USERS_KEY)||'[]');}catch(e){return[];}}
function saveUsers(u){localStorage.setItem(USERS_KEY,JSON.stringify(u));}
(function(){var __b=document.getElementById('footerAdmin');if(__b)__b.onclick=(e)=>{e.preventDefault();const pub=document.getElementById('publicPage');const gate=document.getElementById('adminGate');if(pub)pub.hidden=true;if(gate)gate.hidden=false;};})();
(function(){var __b=document.getElementById('adminClose');if(__b)__b.onclick=()=>showPublic();})();
(function(){var __b=document.getElementById('btnMaster');if(__b)__b.onclick=()=>{const p=document.getElementById('masterPass')?.value||'';const msg=document.getElementById('masterMsg');if(p===getMaster()){adminUnlocked=true;if(msg)msg.hidden=true;const ap=document.getElementById('adminPage');const gate=document.getElementById('adminGate');if(gate)gate.hidden=true;if(ap)ap.hidden=false;}else if(msg){msg.textContent='Senha master incorreta';msg.hidden=false;}};})();
console.log('[Fluxora] editor-part1 restored');
