/* Flow edit modal — header + shares (guest/collaborator) + list Editar */
(function(){
  function $(id){ return document.getElementById(id); }
  function cx(){ return window.convexClient; }
  function isGuest(){ return window.HEMOPI_SHARE_MODE==='guest'; }
  function ensureShareRoleUI(){
    if(document.getElementById('feShareRoleBox')) return;
    const inp = document.getElementById('feNewShareEmail');
    if(!inp || !inp.parentNode) return;
    const box = document.createElement('div');
    box.id = 'feShareRoleBox';
    box.style.cssText = 'display:flex;flex-wrap:wrap;gap:10px;margin:8px 0;align-items:center';
    box.innerHTML =
      '<span style="font-size:12px;font-weight:700;width:100%">Modo de acesso</span>'+
      '<label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;padding:6px 10px;border-radius:8px;border:1px solid #e2e8f0;background:#f8fafc">'+
        '<input type="radio" name="feShareRole" value="guest" checked /> 👁 Convidado <span style="color:#64748b;font-size:11px">(só votar)</span></label>'+
      '<label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;padding:6px 10px;border-radius:8px;border:1px solid #bbf7d0;background:#f0fdf4">'+
        '<input type="radio" name="feShareRole" value="collaborator" /> ✎ Colaborador <span style="color:#166534;font-size:11px">(edição total)</span></label>';
    inp.parentNode.insertBefore(box, inp);
    if(!document.getElementById('fe-role-css')){
      const st=document.createElement('style'); st.id='fe-role-css';
      st.textContent='.fe-role-guest{color:#64748b;font-weight:600}.fe-role-colab{color:#166534;font-weight:700}';
      document.head.appendChild(st);
    }
  }

  if(!document.getElementById('fe-modal-css')){
    const st=document.createElement('style');
    st.id='fe-modal-css';
    st.textContent=`
      .fe-shares-list{display:flex;flex-direction:column;gap:8px;margin:8px 0 12px}
      .fe-share-row{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:10px;border:1px solid #e2e8f0;background:#fff;flex-wrap:wrap}
      .fe-share-row.is-active{border-color:#86efac;background:#f0fdf4}
      .fe-share-row.is-off{border-color:#e2e8f0;background:#f1f5f9;opacity:.75}
      .fe-share-meta{flex:1;min-width:0}
      .fe-share-email{font-weight:600;font-size:13px;word-break:break-all}
      .fe-share-date{font-size:11px;color:#64748b}
      .fe-link-btn{font-size:11px}
    `;
    document.head.appendChild(st);
  }

  let editCtx = { key:null, title:'', data:null };

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
    catch(e){ box.innerHTML = '<p class="muted">Erro: '+(e.message||e)+'</p>'; return; }
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
      const role = s.canEdit ? 'Colaborador (edição)' : 'Convidado (só votar)';
      const roleCls = s.canEdit ? 'fe-role-colab' : 'fe-role-guest';
      row.innerHTML =
        '<div class="fe-share-meta">'+
          '<div class="fe-share-email">'+emails+'</div>'+
          '<div class="fe-share-date"><span class="'+roleCls+'">'+role+'</span> · '+fmtDate(s.updatedAt)+'</div>'+
        '</div>';
      const tog = document.createElement('button');
      tog.type='button';
      tog.className = 'btn '+(active?'pri':'');
      tog.textContent = active ? 'Ativo' : 'Revogado';
      tog.style.minWidth = '88px';
      tog.onclick = async ()=>{
        try{
          await cx().mutation('shares:setActive', { token: s.token, active: !active });
          await loadSharesIntoList(flowKey);
        }catch(e){ if(typeof toast==='function') toast('Erro ao alterar', true); }
      };
      const copy = document.createElement('button');
      copy.type='button'; copy.className='btn fe-link-btn'; copy.textContent='Link';
      copy.onclick = async ()=>{
        const url = location.origin+location.pathname.replace(/\/index\.html$/,'/')+'?share='+encodeURIComponent(s.token);
        try{ await navigator.clipboard.writeText(url); }catch(e){}
        prompt('Link do convite:', url);
      };
      const roleBtn = document.createElement('button');
      roleBtn.type='button';
      roleBtn.className='btn';
      roleBtn.style.fontSize='11px';
      roleBtn.textContent = s.canEdit ? '→ Convidado' : '→ Colaborador';
      roleBtn.title = s.canEdit ? 'Rebaixar para só votação' : 'Promover para edição total';
      roleBtn.onclick = async ()=>{
        try{
          await cx().mutation('shares:setCanEdit', { token: s.token, canEdit: !s.canEdit });
          if(typeof toast==='function') toast(s.canEdit ? 'Agora é Convidado' : 'Agora é Colaborador');
          await loadSharesIntoList(flowKey);
        }catch(e){ if(typeof toast==='function') toast('Erro ao alterar papel', true); }
      };
      row.appendChild(copy);
      row.appendChild(roleBtn);
      row.appendChild(tog);
      box.appendChild(row);
    });
  }

  window.openFlowEditModal = async function(opts){
    if(isGuest()){ if(typeof toast==='function') toast('Convidado não edita cabeçalho', true); return; }
    editCtx = {
      key: opts?.key || (typeof flowKey!=='undefined'?flowKey:null),
      title: opts?.title || (typeof flowTitle!=='undefined'?flowTitle:'') || '',
      data: opts?.data || (typeof flow!=='undefined'?flow:null)
    };
    const key = editCtx.key;
    const h = (editCtx.data && editCtx.data.header) || {};
    if($('feTitle')) $('feTitle').value = editCtx.title || '';
    if($('feProject')) $('feProject').value = h.projectName || '';
    if($('feManager')) $('feManager').value = h.manager || '';
    if($('feDirector')) $('feDirector').value = h.director || '';
    if($('fePo')) $('fePo').value = h.po || '';
    if($('fePm')) $('fePm').value = h.pm || '';
    if($('feStakeholders')) $('feStakeholders').value = h.stakeholders || '';
    if($('feNewShareEmail')) $('feNewShareEmail').value = '';
    ensureShareRoleUI();

    await loadSharesIntoList(key);
    $('flowEditModal')?.classList.add('open');
  };

  async function saveHeaderFromModal(){
    if(!editCtx.key) return;
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
    if(typeof flowKey!=='undefined' && flowKey === editCtx.key && typeof flow!=='undefined' && flow){
      flow.header = header;
      flowTitle = title;
      if(typeof saveLocal==='function') saveLocal();
      try{ if(typeof renderProjectHeader==='function') await renderProjectHeader(); }catch(e){}
    }
    if(cx() && !String(editCtx.key).startsWith('local')){
      try{
        let data = editCtx.data || {};
        if(typeof flowKey!=='undefined' && flowKey === editCtx.key && flow) data = flow;
        else data = { ...data, header };
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
        if(typeof toast==='function') toast('Erro: '+(e.message||e), true);
      }
    }
  }

  async function addShareFromModal(){
    const email = ($('feNewShareEmail')?.value || '').trim().toLowerCase();
    if(!email.includes('@')){ if(typeof toast==='function') toast('E-mail inválido', true); return; }
    if(!editCtx.key || String(editCtx.key).startsWith('local')){
      if(typeof toast==='function') toast('Salve na nuvem antes', true); return;
    }
    if(!cx()) return;
    try{
      const roleEl = document.querySelector('input[name="feShareRole"]:checked');
      const canEdit = roleEl ? roleEl.value === 'collaborator' : false;
      const r = await cx().mutation('shares:create', {
        flowKey: editCtx.key,
        emails: [email],
        canEdit: !!canEdit,
        createdBy: (user?.email||'').toLowerCase()
      });
      if($('feNewShareEmail')) $('feNewShareEmail').value = '';
      const url = location.origin+location.pathname.replace(/\/index\.html$/,'/')+'?share='+encodeURIComponent(r.token);
      try{ await navigator.clipboard.writeText(url); }catch(e){}
      if(typeof toast==='function'){
        toast(canEdit
          ? 'Colaborador criado — link copiado'
          : 'Convidado criado — link copiado');
      }
      prompt('Link do convite ('+(canEdit?'Colaborador':'Convidado')+'):', url);
      await loadSharesIntoList(editCtx.key);
    }catch(e){
      if(typeof toast==='function') toast('Erro: '+(e.message||e), true);
    }
  }

  function wire(){
    if($('flowEditClose')) $('flowEditClose').onclick = ()=> $('flowEditModal')?.classList.remove('open');
    if($('btnFeSaveHeader')) $('btnFeSaveHeader').onclick = ()=> saveHeaderFromModal();
    if($('btnFeAddShare')) $('btnFeAddShare').onclick = ()=> addShareFromModal();
    if($('btnEditHeader')){
      $('btnEditHeader').onclick = function(){
        if(isGuest()){ if(typeof toast==='function') toast('Convidado não edita cabeçalho', true); return; }
        openFlowEditModal({ key: typeof flowKey!=='undefined'?flowKey:null, title: typeof flowTitle!=='undefined'?flowTitle:'', data: typeof flow!=='undefined'?flow:null });
      };
    }
  }

  function patchRenderFlowManager(){
    if(typeof window.renderFlowManager !== 'function') return false;
    if(window.renderFlowManager.__fePatched) return true;
    const orig = window.renderFlowManager;
    window.renderFlowManager = async function(){
      await orig.apply(this, arguments);
      const list = $('flowManagerList');
      if(!list) return;
      list.querySelectorAll('[data-flow-key]').forEach(card=>{
        if(card.querySelector('.btn-fe-edit')) return;
        const key = card.getAttribute('data-flow-key');
        const btn = document.createElement('button');
        btn.type='button'; btn.className='btn btn-fe-edit'; btn.textContent='✎ Editar';
        btn.onclick = async (ev)=>{
          ev.stopPropagation();
          let data=null, title='';
          try{
            if(cx() && key && !String(key).startsWith('local')){
              const row = await cx().query('flows:get', { key });
              data = row?.data; title = row?.title || '';
            }
          }catch(e){}
          openFlowEditModal({ key, title, data });
        };
        card.appendChild(btn);
      });
    };
    window.renderFlowManager.__fePatched = true;
    return true;
  }

  wire();
  setTimeout(wire, 500);
  setTimeout(patchRenderFlowManager, 600);
  setTimeout(patchRenderFlowManager, 1500);
  console.log('[Fluxora] flow-edit-modal share roles ready');
})();
