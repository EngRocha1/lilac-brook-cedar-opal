/* Bind new shapes to a macro (checkbox picker) + keep children moving with macro */
(function(){
  function $(id){ return document.getElementById(id); }
  function isGuest(){ return window.HEMOPI_SHARE_MODE==='guest'; }
  function uid(p){ return p+Math.random().toString(36).slice(2,8); }

  if(!document.getElementById('module-bind-css')){
    const st=document.createElement('style');
    st.id='module-bind-css';
    st.textContent=`
      #macroPickModal.modal-bg{z-index:12000}
      #macroPickModal .modal{max-width:380px}
      .mp-list{display:flex;flex-direction:column;gap:8px;margin:12px 0}
      .mp-item{display:flex;align-items:center;gap:10px;padding:10px 12px;border:1px solid #e2e8f0;border-radius:10px;cursor:pointer;background:#f8fafc}
      .mp-item:hover,.mp-item.selected{border-color:#1a5f8a;background:#e8f4fc}
      .mp-item input{width:18px;height:18px;accent-color:#1a5f8a}
      .mp-swatch{width:14px;height:14px;border-radius:4px;border:1px solid #94a3b8;flex-shrink:0}
      .mp-actions{display:flex;gap:8px;margin-top:8px}
      .mp-actions .btn{flex:1}
    `;
    document.head.appendChild(st);
  }

  function ensureModal(){
    if($('macroPickModal')) return;
    const wrap=document.createElement('div');
    wrap.className='modal-bg';
    wrap.id='macroPickModal';
    wrap.innerHTML=
      '<div class="modal modal-grow">'+
        '<div class="modal-h"><strong>Vincular ao módulo</strong>'+
        '<button type="button" class="x" id="mpClose">×</button></div>'+
        '<div class="modal-b">'+
          '<p class="muted" style="font-size:13px;margin:0 0 8px">Escolha o macro (retângulo) em que a forma ficará. Ao arrastar o módulo, as formas internas acompanham.</p>'+
          '<div class="mp-list" id="mpList"></div>'+
          '<div class="mp-actions">'+
            '<button type="button" class="btn" id="mpCancel">Cancelar</button>'+
            '<button type="button" class="btn pri" id="mpConfirm">Criar no módulo</button>'+
          '</div>'+
        '</div>'+
      '</div>';
    document.body.appendChild(wrap);
    wrap.addEventListener('click',function(e){ if(e.target===wrap) closePick(); });
    $('mpClose').onclick=closePick;
    $('mpCancel').onclick=closePick;
  }

  let pendingCreate=null; // { type, title, w, h }
  let pickedMacroId=null;

  function closePick(){
    const m=$('macroPickModal');
    if(m) m.classList.remove('open');
    pendingCreate=null;
    pickedMacroId=null;
  }

  function openPick(spec){
    ensureModal();
    if(!flow||!flow.macros||!flow.macros.length){
      if(typeof toast==='function') toast('Crie um + Macro antes de adicionar formas', true);
      return;
    }
    pendingCreate=spec;
    pickedMacroId = flow.macros[flow.macros.length-1].id; // default last (e.g. G)
    const list=$('mpList');
    list.innerHTML='';
    flow.macros.forEach(m=>{
      const row=document.createElement('label');
      row.className='mp-item'+(m.id===pickedMacroId?' selected':'');
      row.innerHTML=
        '<input type="radio" name="mpMacro" value="'+m.id+'" '+(m.id===pickedMacroId?'checked':'')+'/>'+
        '<span class="mp-swatch" style="background:'+(m.color||'#e8f4fc')+';border-color:'+(m.border||'#94a3b8')+'"></span>'+
        '<span><b>'+m.id+'</b> — '+(m.title||('MACRO '+m.id))+'</span>';
      row.querySelector('input').addEventListener('change',function(){
        pickedMacroId=m.id;
        list.querySelectorAll('.mp-item').forEach(el=>el.classList.remove('selected'));
        row.classList.add('selected');
      });
      row.addEventListener('click',function(){
        const inp=row.querySelector('input');
        inp.checked=true;
        pickedMacroId=m.id;
        list.querySelectorAll('.mp-item').forEach(el=>el.classList.remove('selected'));
        row.classList.add('selected');
      });
      list.appendChild(row);
    });
    $('mpConfirm').onclick=function(){
      if(!pendingCreate||!pickedMacroId) return;
      createInMacro(pendingCreate, pickedMacroId);
      closePick();
    };
    $('macroPickModal').classList.add('open');
  }

  function createInMacro(spec, macroId){
    const m = (flow.macros||[]).find(x=>x.id===macroId);
    if(!m){ if(typeof toast==='function') toast('Módulo não encontrado',true); return; }
    if(!flow.nodes) flow.nodes=[];
    // place inside macro box with slight random offset
    const ox = m.x + 24 + Math.random()*Math.max(20, m.w*0.35);
    const oy = m.y + 40 + Math.random()*Math.max(20, m.h*0.35);
    const n={
      id: uid(spec.type==='decision'?'d':'n'),
      macro: macroId,
      type: spec.type||'process',
      title: spec.title||'Novo',
      x: ox,
      y: oy,
      w: spec.w||180,
      h: spec.h||48
    };
    flow.nodes.push(n);
    selected={kind:'node',id:n.id};
    if(typeof saveLocal==='function') saveLocal();
    if(typeof render==='function') render();
    if(typeof updateProgress==='function') updateProgress();
    try{ if(typeof openModal==='function') openModal(); }catch(e){}
    if(typeof toast==='function') toast('Forma em MACRO '+macroId);
  }

  function rebindAddButtons(){
    const bind=(id,spec)=>{
      const el=$(id);
      if(!el) return;
      el.onclick=function(ev){
        ev.preventDefault();
        if(isGuest()){ if(typeof toast==='function') toast('Convidado não edita',true); return; }
        if(!flow){ if(typeof toast==='function') toast('Nenhum fluxo',true); return; }
        openPick(spec);
      };
    };
    bind('btnAddProcess',{ type:'process', title:'Novo processo', w:180, h:48 });
    bind('btnAddDecision',{ type:'decision', title:'Decisão?', w:160, h:70 });
    bind('btnAddText',{ type:'process', title:'Texto', w:140, h:36 });
    // Macro button stays creating empty macro (no parent)
    const bm=$('btnAddMacro');
    if(bm){
      bm.onclick=function(ev){
        ev.preventDefault();
        if(isGuest()||!flow) return;
        if(!flow.macros) flow.macros=[];
        const used=new Set(flow.macros.map(m=>m.id));
        let id='A';
        for(let i=0;i<26;i++){ const c=String.fromCharCode(65+i); if(!used.has(c)){ id=c; break; } }
        const last=flow.macros[flow.macros.length-1];
        flow.macros.push({
          id,
          title:'MACRO '+id,
          x: (last?last.x+40:40),
          y: (last?last.y+40:40),
          w:320, h:220,
          color:'#f0f3f7', border:'#5c6b7a'
        });
        if(typeof saveLocal==='function') saveLocal();
        if(typeof render==='function') render();
        if(typeof renderMacroBar==='function') renderMacroBar();
        if(typeof toast==='function') toast('MACRO '+id+' criado — use ▭/◇ e marque este módulo');
      };
    }
  }

  /** Ensure macro drag moves linked children (n.macro === id) */
  function patchMacroDrag(){
    const prev = window.onMove;
    window.onMove = function(ev){
      if(!drag || !flow){
        if(typeof prev==='function') return prev(ev);
        return;
      }
      const dx=ev.clientX-drag.sx, dy=ev.clientY-drag.sy;
      if(drag.type==='node'){
        const n=nodeById(drag.id);
        if(n){ n.x=drag.ox+dx; n.y=drag.oy+dy; render(); }
        return;
      }
      if(drag.type==='macro'){
        const m=macroById(drag.id);
        if(!m) return;
        const nx=drag.ox+dx, ny=drag.oy+dy;
        const pdx=nx-(drag._lastX!=null?drag._lastX:drag.ox);
        const pdy=ny-(drag._lastY!=null?drag._lastY:drag.oy);
        m.x=nx; m.y=ny;
        (flow.nodes||[]).forEach(n=>{
          if(n.macro===m.id || n.macro===String(m.id)){
            n.x+=pdx; n.y+=pdy;
          }
        });
        drag._lastX=nx; drag._lastY=ny;
        render();
        return;
      }
      if(drag.type==='resize'){
        const m=macroById(drag.id);
        if(m){
          m.w=Math.max(140, drag.ox+dx);
          m.h=Math.max(100, drag.oy+dy);
          render();
        }
        return;
      }
      if(typeof prev==='function') prev(ev);
    };
  }

  /** In side panel: allow changing module of selected node */
  function enhanceSideMacroSelect(){
    const prevRefresh = window.refreshSide;
    window.refreshSide = function(){
      if(typeof prevRefresh==='function') prevRefresh();
      // inject module select for nodes
      const meta=$('sideMeta');
      if(!meta || !selected || selected.kind!=='node' || !flow) return;
      let sel=$('sideMacroSelect');
      if(!sel){
        const label=document.createElement('label');
        label.id='sideMacroLabel';
        label.textContent='Módulo vinculado';
        label.style.display='block';
        label.style.marginTop='8px';
        sel=document.createElement('select');
        sel.id='sideMacroSelect';
        sel.style.width='100%';
        sel.style.marginTop='4px';
        const parent=meta.parentElement;
        if(parent){
          parent.insertBefore(label, meta.nextSibling);
          parent.insertBefore(sel, label.nextSibling);
        }
        sel.onchange=function(){
          const n=nodeById(selected.id);
          if(!n) return;
          n.macro = sel.value || null;
          // snap into macro if assigned
          const m=(flow.macros||[]).find(x=>x.id===n.macro);
          if(m){
            if(n.x<m.x||n.x>m.x+m.w||n.y<m.y||n.y>m.y+m.h){
              n.x=m.x+24; n.y=m.y+40;
            }
          }
          if(typeof saveLocal==='function') saveLocal();
          if(typeof render==='function') render();
          if(typeof toast==='function') toast(n.macro?'Vinculado a '+n.macro:'Sem módulo');
        };
      }
      const n=nodeById(selected.id);
      sel.innerHTML='<option value="">— nenhum —</option>';
      (flow.macros||[]).forEach(m=>{
        const o=document.createElement('option');
        o.value=m.id;
        o.textContent=m.id+' — '+(m.title||'');
        if(n && n.macro===m.id) o.selected=true;
        sel.appendChild(o);
      });
      if(isGuest()) sel.disabled=true;
    };
  }

  function boot(){
    rebindAddButtons();
    patchMacroDrag();
    enhanceSideMacroSelect();
  }
  boot();
  setTimeout(boot, 400);
  setTimeout(boot, 1200);
  setTimeout(boot, 2500);

  console.log('[Fluxora] module-bind ready');
})();
