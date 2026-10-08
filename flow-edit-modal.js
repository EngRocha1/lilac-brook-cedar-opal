/* Flow edit modal — header + shares · save closes modal + toast */
(function(){
  function $(id){ return document.getElementById(id); }
  function cx(){ return window.convexClient; }
  function isGuest(){ return window.HEMOPI_SHARE_MODE==='guest'; }
  let editCtx = { key:null, title:'', data:null };

  function ensureShareRoleUI(){
    if(document.getElementById('feShareRoleBox')) return;
    const inp = document.getElementById('feNewShareEmail');
    if(!inp || !inp.parentNode) return;
    const box = document.createElement('div');
    box.id = 'feShareRoleBox';
    box.style.cssText = 'display:flex;flex-wrap:wrap;gap:10px;margin:8px 0;align-items:center';
    box.innerHTML =
      '<span style="font-size:12px;font-weight:700;width:100%">Modo de acesso</span>'+
      '<label style="display:flex;align-items:center;gap:6px;font-size:13px"><input type="radio" name="feShareRole" value="guest" checked/> Convidado (só vota)</label>'+
      '<label style="display:flex;align-items:center;gap:6px;font-size:13px"><input type="radio" name="feShareRole" value="collaborator"/> Colaborador (edita)</label>';
    inp.parentNode.insertBefore(box, inp);
  }

  async function loadSharesList(flowKey){
    const box = $('feSharesList');
    if(!box) return;
    box.innerHTML = '<p class="muted">Carregando…</p>';
    if(!cx() || !flowKey){ box.innerHTML = '<p class="muted">—</p>'; return; }
    try{
      const rows = await cx().query('shares:listByFlow', { flowKey }) || [];
      if(!rows.length){ box.innerHTML = '<p class="muted">Nenhum compartilhamento.</p>'; return; }
      box.innerHTML = '';
      rows.forEach(sh=>{
        const div = document.createElement('div');
        div.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;align-items:center;padding:8px;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:6px';
        const emails = (sh.emails||[]).join(', ');
        const role = sh.canEdit ? 'Colaborador' : 'Convidado';
        div.innerHTML = '<span style="flex:1;font-size:12px">'+emails+' · <b>'+role+'</b></span>';
        const link = document.createElement('button');
        link.type='button'; link.className='btn'; link.textContent='Link';
        link.onclick=()=>{
          const url = location.origin+location.pathname+'?share='+(sh.token||sh._id||'');
          navigator.clipboard?.writeText(url);
          if(typeof mostrarToast==='function') mostrarToast('Link copiado','success');
          else if(typeof toast==='function') toast('Link copiado');
        };
        div.appendChild(link);
        box.appendChild(div);
      });
    }catch(e){
      box.innerHTML = '<p class="muted">Erro shares</p>';
    }
  }

  window.openFlowEditModal = async function(opts){
    if(isGuest()){ if(typeof toast==='function') toast('Convidado não edita cabeçalho', true); return; }
    editCtx = {
      key: opts?.key || (typeof flowKey!=='undefined'?flowKey:null),
      title: opts?.title || (typeof flowTitle!=='undefined'?flowTitle:'') || '',
      data: opts?.data || (typeof flow!=='undefined'?flow:null)
    };
    const h = (editCtx.data && editCtx.data.header) || {};
    if($('feTitle')) $('feTitle').value = editCtx.title || '';
    if($('feProject')) $('feProject').value = h.projectName || '';
    if($('feManager')) $('feManager').value = h.manager || '';
    if($('feDirector')) $('feDirector').value = h.director || '';
    if($('fePo')) $('fePo').value = h.po || '';
    if($('fePm')) $('fePm').value = h.pm || '';
    if($('feStakeholders')) $('feStakeholders').value = h.stakeholders || '';
    ensureShareRoleUI();
    await loadSharesList(editCtx.key);
    const modal = $('flowEditModal');
    if(modal) modal.classList.add('open');
  };

  async function saveHeaderFromModal(){
    if(!editCtx.key) return;
    const btn = $('btnFeSaveHeader');
    const prevLabel = btn ? btn.textContent : 'Salvar';
    if(btn){ btn.disabled = true; btn.textContent = 'Salvando...'; }
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
    try{
      if(typeof flowKey!=='undefined' && flowKey === editCtx.key && typeof flow!=='undefined' && flow){
        flow.header = header;
        flowTitle = title;
        if(typeof saveLocal==='function') saveLocal();
        try{ if(typeof renderProjectHeader==='function') await renderProjectHeader(); }catch(e){}
      }
      if(!cx()) throw new Error('Convex client offline');
      if(String(editCtx.key).startsWith('local')) throw new Error('Salve o fluxo na nuvem antes');
      let data = editCtx.data || {};
      if(typeof flowKey!=='undefined' && flowKey === editCtx.key && typeof flow!=='undefined' && flow) data = flow;
      else data = { ...data, header };
      const ownerEmail = (typeof user!=='undefined' && user?.email || '').toLowerCase().trim() || undefined;
      await cx().mutation('flows:save', {
        key: editCtx.key,
        title,
        ownerEmail,
        data
      });
      editCtx.title = title;
      editCtx.data = data;
      if(typeof mostrarToast==='function') mostrarToast('Fluxo salvo com sucesso!', 'success');
      else if(typeof toast==='function') toast('Fluxo salvo com sucesso!');
      const modal = $('flowEditModal');
      if(modal) modal.classList.remove('open');
      try{
        if(typeof renderFlowManagerClean==='function') await renderFlowManagerClean();
        else if(typeof renderFlowManager==='function') await renderFlowManager();
      }catch(e){}
    }catch(e){
      console.error(e);
      if(typeof mostrarToast==='function') mostrarToast('Erro ao salvar: '+(e.message||e), 'error');
      else if(typeof toast==='function') toast('Erro ao salvar: '+(e.message||e), true);
    }finally{
      if(btn){ btn.disabled = false; btn.textContent = prevLabel || '💾 Salvar cabeçalho'; }
    }
  }

  async function addShareFromModal(){
    const email = ($('feNewShareEmail')?.value || '').trim().toLowerCase();
    if(!email.includes('@')){
      if(typeof mostrarToast==='function') mostrarToast('E-mail inválido','error');
      else if(typeof toast==='function') toast('E-mail inválido', true);
      return;
    }
    if(!editCtx.key || String(editCtx.key).startsWith('local')){
      if(typeof mostrarToast==='function') mostrarToast('Salve na nuvem antes','error');
      else if(typeof toast==='function') toast('Salve na nuvem antes', true);
      return;
    }
    if(!cx()){
      if(typeof mostrarToast==='function') mostrarToast('Convex offline','error');
      return;
    }
    try{
      const roleEl = document.querySelector('input[name="feShareRole"]:checked');
      const canEdit = roleEl ? roleEl.value === 'collaborator' : false;
      await cx().mutation('shares:create', {
        flowKey: editCtx.key,
        emails: [email],
        canEdit: !!canEdit,
        createdBy: (typeof user!=='undefined' && user?.email || '').toLowerCase()
      });
      if($('feNewShareEmail')) $('feNewShareEmail').value = '';
      if(typeof mostrarToast==='function') mostrarToast('Compartilhado!','success');
      else if(typeof toast==='function') toast('Compartilhado');
      await loadSharesList(editCtx.key);
    }catch(e){
      if(typeof mostrarToast==='function') mostrarToast('Erro: '+(e.message||e),'error');
      else if(typeof toast==='function') toast('Erro: '+(e.message||e), true);
    }
  }

  function wire(){
    if($('flowEditClose')) $('flowEditClose').onclick = ()=> $('flowEditModal')?.classList.remove('open');
    if($('btnFeSaveHeader')) $('btnFeSaveHeader').onclick = ()=> saveHeaderFromModal();
    if($('btnFeAddShare')) $('btnFeAddShare').onclick = ()=> addShareFromModal();
    if($('btnEditHeader')){
      $('btnEditHeader').onclick = function(){
        if(isGuest()){ if(typeof toast==='function') toast('Convidado não edita cabeçalho', true); return; }
        openFlowEditModal({
          key: typeof flowKey!=='undefined'?flowKey:null,
          title: typeof flowTitle!=='undefined'?flowTitle:'',
          data: typeof flow!=='undefined'?flow:null
        });
      };
    }
  }

  wire();
  setTimeout(wire, 500);
  console.log('[Fluxora] flow-edit-modal ready (save closes + toast)');
})();
