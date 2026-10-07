/* Flow list — single Editar · logo · official WA · responsive · v20261007i */
(function(){
  function $(id){ return document.getElementById(id); }
  function cx(){ return window.convexClient; }

  if(!document.getElementById('flow-list-ui-css')){
    const st=document.createElement('style');
    st.id='flow-list-ui-css';
    st.textContent=`
      #flowManager.flow-manager{
        padding:12px 14px 28px;max-width:960px;margin:0 auto;
        min-height:100vh;box-sizing:border-box;
      }
      #flowManager .admin-top{
        display:flex;align-items:center;justify-content:space-between;
        gap:10px;flex-wrap:wrap;margin-bottom:14px;
      }
      #flowManagerList.flow-mgr-list,#flowManagerList{
        display:flex;flex-direction:column;gap:12px;max-width:100%;margin:0 auto;
      }
      .flow-mgr-card{
        display:grid;grid-template-columns:1fr auto;gap:12px 16px;align-items:center;
        background:#fff;border:1px solid #d0d8e2;border-radius:14px;
        padding:14px 16px;box-sizing:border-box;width:100%;
      }
      .flow-card-left{display:flex;align-items:center;gap:12px;min-width:0}
      .flow-card-logo{
        width:48px;height:48px;min-width:48px;border-radius:10px;object-fit:contain;
        background:#f8fafc;border:1px solid #e2e8f0;
      }
      .flow-card-logo--ph{
        display:flex;align-items:center;justify-content:center;
        color:#94a3b8;font-size:18px;font-weight:700;
      }
      .flow-card-left h4{margin:0 0 4px;font-size:1rem;line-height:1.25;word-break:break-word}
      .flow-mgr-meta{font-size:.72rem;color:#5c6b7a;word-break:break-all}
      .flow-mgr-actions{display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:flex-end}
      .flow-mgr-actions .btn,.flow-mgr-actions .btn-edit-flow{
        border-radius:10px;padding:8px 14px;font-size:.8rem;font-weight:700;
        cursor:pointer;border:1px solid #d0d8e2;background:#fff;white-space:nowrap;
      }
      .flow-mgr-actions .btn-edit-flow{background:#0f172a;color:#fff;border-color:#0f172a}
      .flow-mgr-actions .btn.pri{background:#c41e3a;color:#fff;border-color:#c41e3a}
      .flow-mgr-actions .btn.danger-outline{background:#fff;color:#b91c1c;border-color:#fecaca}
      @media (max-width:640px){
        .flow-mgr-card{grid-template-columns:1fr;padding:12px}
        .flow-mgr-actions{width:100%;justify-content:stretch}
        .flow-mgr-actions .btn,.flow-mgr-actions .btn-edit-flow{
          flex:1 1 calc(50% - 8px);text-align:center;min-width:0;
        }
        .flow-mgr-actions .btn.pri{flex:1 1 100%;order:1}
        .flow-mgr-actions .btn-edit-flow{order:0}
        .flow-mgr-actions .btn.danger-outline{order:2}
      }
      a.wa-float{
        position:fixed;right:16px;bottom:16px;z-index:50;
        width:58px;height:58px;border-radius:50%;background:#25D366;
        display:flex;align-items:center;justify-content:center;
        box-shadow:0 6px 20px rgba(37,211,102,.45);text-decoration:none;overflow:hidden;
      }
      a.wa-float svg{width:32px;height:32px;display:block}
      a.wa-float span{display:none}
    `;
    document.head.appendChild(st);
  }

  function applyOfficialWhatsAppIcon(){
    const a = $('waFloat');
    if(!a) return;
    a.innerHTML =
      '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">'+
        '<path fill="#ffffff" d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>'+
      '</svg>';
    a.setAttribute('aria-label','WhatsApp');
    a.title = 'WhatsApp';
  }

  async function resolveLogo(r){
    if(typeof cardLogoUrl === 'function'){
      try{ const u = await cardLogoUrl(r); if(u) return u; }catch(e){}
    }
    const h = (r && r.data && r.data.header) || {};
    if(h.logoUrl) return h.logoUrl;
    if(h.logoStorageId && cx()){
      try{
        const url = await cx().mutation('files:getUrl', { storageId: String(h.logoStorageId) });
        if(url) return url;
      }catch(e){}
    }
    if(typeof user!=='undefined' && user){
      if(user.logo) return user.logo;
      if(user.logoStorageId && cx()){
        try{
          const url = await cx().mutation('files:getUrl', { storageId: String(user.logoStorageId) });
          if(url) return url;
        }catch(e){}
      }
    }
    return null;
  }

  function openEditModalFor(r){
    if(typeof openFlowEditModal === 'function'){
      openFlowEditModal({ key: r.key, title: r.title||r.key, data: r.data||null });
      return;
    }
    if(typeof openEditForFlow === 'function') openEditForFlow(r);
  }

  function escapeHtml(s){
    return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  async function renderFlowManagerClean(){
    const list = $('flowManagerList');
    if(!list) return;
    const email = (typeof user!=='undefined' && user?.email || '').toLowerCase().trim();
    list.innerHTML = '<p class="muted">Consultando Convex…</p>';
    if(!cx() || !email){
      list.innerHTML = '<p class="muted">Faça login / Convex offline.</p>';
      return;
    }
    let rows = [];
    try{ rows = await cx().query('flows:list', { ownerEmail: email }) || []; }
    catch(e){ list.innerHTML = '<p class="muted">Erro: '+String(e.message||e)+'</p>'; return; }
    if(!rows.length){
      list.innerHTML = '<p class="muted">Nenhum fluxo. Use + Novo.</p>';
      return;
    }
    rows.sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0));
    list.innerHTML = '';

    for(const r of rows){
      const card = document.createElement('div');
      card.className = 'flow-mgr-card';
      card.setAttribute('data-flow-key', r.key);

      const nodes = r.data?.nodes?.length || 0;
      const macros = r.data?.macros?.length || 0;
      const logo = await resolveLogo(r);
      const logoHtml = logo
        ? '<img class="flow-card-logo" src="'+logo+'" alt="Logo" loading="lazy"/>'
        : '<div class="flow-card-logo flow-card-logo--ph" aria-hidden="true">◇</div>';

      const left = document.createElement('div');
      left.className = 'flow-card-left';
      left.innerHTML =
        logoHtml +
        '<div class="flow-card-text">'+
          '<h4>'+escapeHtml(r.title||r.key)+'</h4>'+
          '<div class="flow-mgr-meta">'+escapeHtml(r.key)+' · '+macros+' macros · '+nodes+' nós</div>'+
        '</div>';

      const actions = document.createElement('div');
      actions.className = 'flow-mgr-actions';

      // ÚNICO botão Editar — marca data-fe-edit para não ser reinjetado
      const edit = document.createElement('button');
      edit.type = 'button';
      edit.className = 'btn-edit-flow';
      edit.setAttribute('data-fe-edit', '1');
      edit.textContent = '✎ Editar';
      edit.onclick = function(ev){
        ev.preventDefault();
        ev.stopPropagation();
        openEditModalFor(r);
      };

      const open = document.createElement('button');
      open.type = 'button';
      open.className = 'btn pri';
      open.textContent = 'Abrir';
      open.onclick = async function(){
        try{ flowKey = r.key; }catch(e){}
        window.flowKey = r.key;
        try{ localStorage.setItem(typeof FLOW_KEY_STORE!=='undefined'?FLOW_KEY_STORE:'fluxora_flow_key', r.key); }catch(e){}
        try{ flowTitle = r.title||r.key; }catch(e){}
        if($('flowManager')) $('flowManager').hidden = true;
        if($('appMain')) $('appMain').hidden = false;
        if(typeof onlyShow==='function') onlyShow('appMain');
        if(typeof loadFlow==='function') await loadFlow();
        try{
          if(typeof render==='function') render();
          if(typeof renderMacroBar==='function') renderMacroBar();
          if(typeof updateProgress==='function') updateProgress();
          if(typeof renderProjectHeader==='function') await renderProjectHeader();
          if(typeof window.fitBoardToScreen==='function') window.fitBoardToScreen(true);
        }catch(e){}
      };

      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'btn danger-outline';
      del.textContent = 'Excluir';
      del.onclick = async function(){
        if(!confirm('Excluir este fluxo?')) return;
        try{
          if(typeof deleteFlow==='function') await deleteFlow(r.key);
          else if(cx()) await cx().mutation('flows:remove', { key: r.key });
          await renderFlowManagerClean();
          if(typeof toast==='function') toast('Fluxo excluído');
        }catch(e){
          if(typeof toast==='function') toast('Erro ao excluir: '+(e.message||e), true);
        }
      };

      actions.appendChild(edit);
      actions.appendChild(open);
      actions.appendChild(del);
      card.appendChild(left);
      card.appendChild(actions);
      list.appendChild(card);
    }
  }

  window.renderFlowManager = renderFlowManagerClean;

  function boot(){
    applyOfficialWhatsAppIcon();
    window.renderFlowManager = renderFlowManagerClean;
  }
  boot();
  setTimeout(boot, 400);
  setTimeout(boot, 1200);

  console.log('[Fluxora] flow-list-ui v20261007i clean');
})();
