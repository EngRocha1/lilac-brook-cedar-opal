/* Flow edit modal — header + shares (active green / revoked gray) */
(function(){
  function $(id){ return document.getElementById(id); }
  function cx(){ return window.convexClient; }
  function isGuest(){ return window.HEMOPI_SHARE_MODE==='guest'; }

  let editCtx = { key: null, title: '', data: null };

  if(!document.getElementById('fluxora-fe-css')){
    const st=document.createElement('style');
    st.id='fluxora-fe-css';
    st.textContent=`
      .modal-section-title{margin:12px 0 8px;font-size:14px;color:#334155}
      .fe-shares-list{display:flex;flex-direction:column;gap:8px;margin:8px 0 12px}
      .fe-share-row{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:10px;border:1px solid #e2e8f0;background:#f8fafc}
      .fe-share-row.is-active{border-color:#86efac;background:#f0fdf4}
      .fe-share-row.is-off{border-color:#e2e8f0;background:#f1f5f9;opacity:.75}
      .fe-share-meta{flex:1;min-width:0}
      .fe-share-email{font-weight:600;font-size:13px;word-break:break-all}
      .fe-share-date{font-size:11px;color:#64748b}
      .fe-toggle{position:relative;width:44px;height:24px;border-radius:999px;border:none;cursor:pointer;flex-shrink:0}
      .fe-toggle.on{background:#22c55e}
      .fe-toggle.off{background:#94a3b8}
      .fe-toggle::after{content:'';position:absolute;top:3px;width:18px;height:18px;border-radius:50%;background:#fff;transition:left .15s}
      .fe-toggle.on::after{left:22px}
      .fe-toggle.off::after{left:4px}
      .fe-link-btn{font-size:11px;padding:4px 8px}
    `;
    document.head.appendChild(st);
  }

  function fmtDate(ts){
    if(!ts) return '—';
    try{ return new Date(ts).toLocaleString('pt-BR'); }catch(e){ return '—'; }
  }

  async function loadSharesIntoList(flowKey){
    const box = $('feSharesList');
    if(!box) return;
    box.innerHTML = '<p class="muted">Carregando…</p>';
    if(!cx() || !flowKey || String(flowKey).startsWith('local')){
      box.innerHTML = '<p class="muted">Salve o fluxo na nuvem para gerenciar compartilhamentos.</p>';
      return;
    }
    let rows = [];
    try{ rows = await cx().query('shares:listByFlow', { flowKey }) || []; }
    catch(e){ box.innerHTML = '<p class="muted">Erro ao listar: '+(e.message||e)+'</p>'; return; }
    if(!rows.length){
      box.innerHTML = '<p class="muted">Nenhum compartilhamento ainda.</p>';
      return;
    }
    rows.sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0));
    box.innerHTML = '';
    rows.forEach(s=>{
      const active = s.active !== false;
      const emails = (s.emails||[]).join(', ');
      const row = document.createElement('div');
      row.className = 'fe-share-row '+(active?'is-active':'is-off');
      row.innerHTML =
        '<div class="fe-share-meta">'+
          '<div class="fe-share-email">'+emails+'</div>'+
          '<div class="fe-share-date">Criado/atualizado: '+fmtDate(s.updatedAt)+' · token '+(s.token||'').slice(0,16)+'…</div>'+
        '</div>';
      const tog = document.createElement('button');
      tog.type = 'button';
      tog.className = 'fe-toggle '+(active?'on':'off');
      tog.title = active ? 'Ativo — clique para revogar' : 'Revogado — clique para reativar';
      tog.onclick = async ()=>{
        const next = !active;
        try{
          await cx().mutation('shares:setActive', { token: s.token, active: next });
          if(typeof toast==='function') toast(next?'Compartilhamento ativado':'Compartilhamento revogado');
          await loadSharesIntoList(flowKey);
        }catch(e){
          if(typeof toast==='function') toast('Erro ao alterar', true);
        }
      };
      const copy = document.createElement('button');
      copy.type='button'; copy.className='btn fe-link-btn'; copy.textContent='Link';
      copy.onclick = async ()=>{
        const url = location.origin+location.pathname.replace(/\/index\.html$/,'/')+'?share='+encodeURIComponent(s.token);
        try{ await navigator.clipboard.writeText(url); }catch(e){}
        prompt('Link do convite:', url);
      };
      row.appendChild(copy);
      row.appendChild(tog);
      box.appendChild(row);
    });
  }

  window.openFlowEditModal = async function(opts){
    if(isGuest()){
      if(typeof toast==='function') toast('Convidado não edita cabeçalho/compartilhamentos', true);
      return;
    }
    opts = opts || {};
    const key = opts.key || (typeof flowKey!=='undefined'?flowKey:null);
    let title = opts.title || (typeof flowTitle!=='undefined'?flowTitle:'');
    let data = opts.data || (typeof flow!=='undefined'?flow:null);

    // load from cloud if only key given
    if(cx() && key && !opts.data){
      try{
        const remote = await cx().query('flows:get', { key });
        if(remote){
          title = remote.title || title;
          data = remote.data || data;
        }
      }catch(e){}
    }
    if(!data) data = { header: {} };
    if(!data.header) data.header = {};

    editCtx = { key, title, data };

    if($('flowEditTitle')) $('flowEditTitle').textContent = 'Editar: '+(title||key||'fluxo');
    if($('feTitle')) $('feTitle').value = title || '';
    const h = data.header || {};
    if($('feProject')) $('feProject').value = h.projectName || '';
    if($('feManager')) $('feManager').value = h.manager || '';
    if($('feDirector')) $('feDirector').value = h.director || '';
    if($('fePo')) $('fePo').value = h.po || '';
    if($('fePm')) $('fePm').value = h.pm || '';
    if($('feStakeholders')) $('feStakeholders').value = h.stakeholders || '';
    if($('feNewShareEmail')) $('feNewShareEmail').value = '';

    await loadSharesIntoList(key);
    $('flowEditModal')?.classList.add('open');
  };

  async function saveHeaderFromModal(){
    if(!editCtx.key){ if(typeof toast==='function') toast('Fluxo inválido',true); return; }
    const title = ($('feTitle')?.value || '').trim() || editCtx.title;
    const header = {
      ...(editCtx.data?.header || {}),
      projectName: ($('feProject')?.value || '').trim(),
      manager: ($('feManager')?.value || '').trim(),
      director: ($('feDirector')?.value || '').trim(),
      po: ($('fePo')?.value || '').trim(),
      pm: ($('fePm')?.value || '').trim(),
      stakeholders: ($('feStakeholders')?.value || '').trim()
    };
    // update local current flow if same key
    if(typeof flowKey!=='undefined' && flowKey === editCtx.key && typeof flow!=='undefined' && flow){
      flow.header = header;
      flowTitle = title;
      if(typeof saveLocal==='function') saveLocal();
      try{ if(typeof renderProjectHeader==='function') await renderProjectHeader(); }catch(e){}
    }
    if(cx() && !String(editCtx.key).startsWith('local')){
      try{
        let data = editCtx.data || {};
        data = { ...data, header };
        // merge if current
        if(typeof flowKey!=='undefined' && flowKey === editCtx.key && flow) data = flow;
        await cx().mutation('flows:save', {
          key: editCtx.key,
          title,
          ownerEmail: (user?.email||'').toLowerCase() || undefined,
          data
        });
        if(typeof toast==='function') toast('Cabeçalho salvo');
        editCtx.title = title;
        editCtx.data = data;
        try{ if(typeof loadFlowList==='function') await loadFlowList(); }catch(e){}
      }catch(e){
        if(typeof toast==='function') toast('Erro ao salvar: '+(e.message||e), true);
      }
    } else if(typeof toast==='function') toast('Salvo localmente');
  }

  async function addShareFromModal(){
    const email = ($('feNewShareEmail')?.value || '').trim().toLowerCase();
    if(!email.includes('@')){
      if(typeof toast==='function') toast('E-mail inválido', true);
      return;
    }
    if(!editCtx.key || String(editCtx.key).startsWith('local')){
      if(typeof toast==='function') toast('Salve o fluxo na nuvem antes', true);
      return;
    }
    if(!cx()){ if(typeof toast==='function') toast('Convex offline', true); return; }
    try{
      const r = await cx().mutation('shares:create', {
        flowKey: editCtx.key,
        emails: [email],
        canEdit: false,
        createdBy: (user?.email||'').toLowerCase()
      });
      if($('feNewShareEmail')) $('feNewShareEmail').value = '';
      const url = location.origin+location.pathname.replace(/\/index\.html$/,'/')+'?share='+encodeURIComponent(r.token);
      try{ await navigator.clipboard.writeText(url); }catch(e){}
      if(typeof toast==='function') toast('Convite criado para '+email);
      prompt('Link do convidado:', url);
      await loadSharesIntoList(editCtx.key);
    }catch(e){
      if(typeof toast==='function') toast('Erro: '+(e.message||e), true);
    }
  }

  function wireFlowEdit(){
    if($('flowEditClose')) $('flowEditClose').onclick = ()=> $('flowEditModal')?.classList.remove('open');
    if($('btnFeSaveHeader')) $('btnFeSaveHeader').onclick = ()=> saveHeaderFromModal();
    if($('btnFeAddShare')) $('btnFeAddShare').onclick = ()=> addShareFromModal();
    if($('btnEditHeader')){
      $('btnEditHeader').onclick = ()=>{
        if(isGuest()){ if(typeof toast==='function') toast('Convidado não edita cabeçalho', true); return; }
        openFlowEditModal({ key: flowKey, title: flowTitle, data: flow });
      };
    }
  }

  // Patch flow manager cards to include Editar
  const _renderFlowManager = window.renderFlowManager;
  // Hook after list render via MutationObserver-free rebind in enterApp
  window.attachFlowEditButtons = function(listEl, rows){
    // called from outside if needed
  };

  // Override: enhance cards when Meus fluxos opens — patch btnOpenMgr path
  function enhanceManagerCards(){
    // Intercept by re-wrapping render if we can find flowManagerList buttons
    // Better: monkey-patch after renderFlowManager in editor-fix by replacing open mgr
    const list = $('flowManagerList');
    if(!list) return;
    // If cards lack Editar, we rely on openFlowEditModal from patched render
  }

  // Public API used by editor-fix rebind
  window.__flowEditWire = wireFlowEdit;
  window.__openFlowEditForKey = async function(key, title, data){
    await openFlowEditModal({ key, title, data });
  };

  // Patch renderFlowManager if already defined
  function patchManager(){
    const orig = window.renderFlowManager;
    // We redefine a wrapper used by editor-fix — editor-fix owns renderFlowManager
    // So editor-fix must call openFlowEdit — we'll patch btnOpenMgr to also set flag
  }

  wireFlowEdit();
  setTimeout(wireFlowEdit, 500);
  setTimeout(wireFlowEdit, 1500);

  // Listen for custom event from editor-fix cards
  window.addEventListener('fluxora-edit-flow', async (ev)=>{
    const d = ev.detail || {};
    await openFlowEditModal(d);
  });
})();
