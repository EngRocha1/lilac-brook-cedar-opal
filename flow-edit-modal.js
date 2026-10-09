/* Flow edit modal — header + shares (stacked layout) · save closes + toast */
(function () {
  function $(id) {
    return document.getElementById(id);
  }
  function cx() {
    return window.convexClient;
  }
  function isGuest() {
    return window.HEMOPI_SHARE_MODE === 'guest';
  }
  var editCtx = { key: null, title: '', data: null };

  function ensureShareLayout() {
    var inp = $('feNewShareEmail');
    var btn = $('btnFeAddShare');
    if (!inp || !btn) return;

    /* Convert side-by-side row into stacked column */
    var row = inp.parentNode;
    if (row && !row.classList.contains('fe-share-add')) {
      row.className = 'fe-share-add';
      row.style.cssText =
        'display:flex;flex-direction:column;gap:10px;margin-top:10px';
      inp.style.cssText =
        'width:100%;box-sizing:border-box;padding:10px 12px;border:1px solid #cbd5e1;border-radius:10px';
      inp.placeholder = 'nome@empresa.com';
      btn.style.cssText =
        'width:100%;padding:11px;border-radius:10px;font-weight:700';
      btn.className = 'btn pri';
      btn.textContent = '+ Compartilhar';
    }

    if ($('feShareRoleBox')) return;
    var box = document.createElement('div');
    box.id = 'feShareRoleBox';
    box.style.cssText =
      'display:flex;flex-wrap:wrap;gap:10px;align-items:center';
    box.innerHTML =
      '<span style="font-size:12px;font-weight:700;width:100%">Modo de acesso</span>' +
      '<label style="display:flex;align-items:center;gap:6px;font-size:13px"><input type="radio" name="feShareRole" value="guest" checked/> Convidado (só vota)</label>' +
      '<label style="display:flex;align-items:center;gap:6px;font-size:13px"><input type="radio" name="feShareRole" value="collaborator"/> Colaborador (edita)</label>';
    if (row) row.insertBefore(box, inp);
  }

  async function loadSharesList(flowKey) {
    var box = $('feSharesList');
    if (!box) return;
    box.innerHTML = '<p class="muted">Carregando…</p>';
    if (!cx() || !flowKey) {
      box.innerHTML = '<p class="muted">—</p>';
      return;
    }
    try {
      var rows = (await cx().query('shares:listByFlow', { flowKey: flowKey })) || [];
      if (!rows.length) {
        box.innerHTML = '<p class="muted">Nenhum compartilhamento.</p>';
        return;
      }
      box.innerHTML = '';
      rows.forEach(function (sh) {
        var div = document.createElement('div');
        div.style.cssText =
          'display:flex;flex-wrap:wrap;gap:6px;align-items:center;padding:10px;border:1px solid #e2e8f0;border-radius:10px;margin-bottom:6px;background:#f8fafc';
        var emails = (sh.emails || []).join(', ');
        var revoked = sh.revoked || sh.active === false;
        var role = revoked
          ? 'Revogado'
          : sh.canEdit
            ? 'Colaborador'
            : 'Convidado';
        div.innerHTML =
          '<span style="flex:1;font-size:12px;word-break:break-all">' +
          emails +
          ' · <b>' +
          role +
          '</b></span>';

        var link = document.createElement('button');
        link.type = 'button';
        link.className = 'btn';
        link.textContent = 'Link';
        link.onclick = function () {
          var url =
            location.origin +
            location.pathname +
            '?share=' +
            (sh.token || sh._id || '');
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(url);
          }
          if (typeof mostrarToast === 'function')
            mostrarToast('Link copiado', 'success');
          else if (typeof toast === 'function') toast('Link copiado');
        };
        div.appendChild(link);

        if (!revoked) {
          var rev = document.createElement('button');
          rev.type = 'button';
          rev.className = 'btn danger';
          rev.textContent = 'Revogar';
          rev.onclick = async function () {
            if (!confirm('Revogar acesso de ' + emails + '?')) return;
            try {
              try {
                await cx().mutation('shares:revoke', {
                  shareId: sh._id,
                  token: sh.token,
                });
              } catch (e1) {
                await cx().mutation('shares:setActive', {
                  shareId: sh._id,
                  active: false,
                });
              }
              await loadSharesList(flowKey);
            } catch (err) {
              alert(err.message || err);
            }
          };
          div.appendChild(rev);
        }
        box.appendChild(div);
      });
    } catch (e) {
      box.innerHTML = '<p class="muted">Erro shares</p>';
    }
  }

  window.refreshEditModalShares = function () {
    if (editCtx.key) loadSharesList(editCtx.key);
  };

  window.openFlowEditModal = async function (opts) {
    if (isGuest()) {
      if (typeof toast === 'function') toast('Convidado não edita cabeçalho', true);
      return;
    }
    opts = opts || {};
    editCtx.key =
      opts.key ||
      window.flowKey ||
      localStorage.getItem('hemopi_flow_key');
    editCtx.title = opts.title || (window.flow && window.flow.title) || '';
    editCtx.data = opts.data || window.flow || {};

    var h =
      (editCtx.data && editCtx.data.header) ||
      (window.flow && window.flow.header) ||
      {};
    if ($('feTitle')) $('feTitle').value = editCtx.title || h.projectName || '';
    if ($('feProject')) $('feProject').value = h.projectName || '';
    if ($('feManager')) $('feManager').value = h.manager || '';
    if ($('feDirector')) $('feDirector').value = h.director || '';
    if ($('fePo')) $('fePo').value = h.po || '';
    if ($('fePm')) $('fePm').value = h.pm || '';
    if ($('feStakeholders')) $('feStakeholders').value = h.stakeholders || '';

    ensureShareLayout();
    await loadSharesList(editCtx.key);
    var modal = $('flowEditModal');
    if (modal) modal.classList.add('open');
  };

  window.openHeaderEditor = function () {
    window.openFlowEditModal({});
  };

  async function saveHeaderFromModal() {
    if (!editCtx.key || !cx()) return;
    try {
      var data = editCtx.data || window.flow || {};
      if (typeof data === 'object') data = JSON.parse(JSON.stringify(data));
      data.header = data.header || {};
      data.header.projectName = ($('feProject') && $('feProject').value) || '';
      data.header.manager = ($('feManager') && $('feManager').value) || '';
      data.header.director = ($('feDirector') && $('feDirector').value) || '';
      data.header.po = ($('fePo') && $('fePo').value) || '';
      data.header.pm = ($('fePm') && $('fePm').value) || '';
      data.header.stakeholders =
        ($('feStakeholders') && $('feStakeholders').value) || '';
      var title =
        ($('feTitle') && $('feTitle').value) ||
        data.header.projectName ||
        editCtx.title;

      window.__allowCloudSave = true;
      await cx().mutation('flows:save', {
        key: editCtx.key,
        title: title,
        data: data,
      });
      if (window.flow) {
        window.flow.header = data.header;
        window.flow.title = title;
      }
      if (typeof window.renderBannerMeta === 'function')
        window.renderBannerMeta();
      if (typeof mostrarToast === 'function')
        mostrarToast('Cabeçalho salvo', 'success');
      else if (typeof toast === 'function') toast('Cabeçalho salvo');
      var modal = $('flowEditModal');
      if (modal) modal.classList.remove('open');
    } catch (e) {
      alert(e.message || e);
    }
  }

  async function addShareFromModal() {
    var email = (($('feNewShareEmail') && $('feNewShareEmail').value) || '')
      .trim()
      .toLowerCase();
    if (!email || email.indexOf('@') < 1) {
      alert('Informe um e-mail válido');
      return;
    }
    if (!editCtx.key || !cx()) return;
    try {
      var roleEl = document.querySelector('input[name="feShareRole"]:checked');
      var canEdit = roleEl && roleEl.value === 'collaborator';
      await cx().mutation('shares:create', {
        flowKey: editCtx.key,
        emails: [email],
        canEdit: !!canEdit,
      });
      if ($('feNewShareEmail')) $('feNewShareEmail').value = '';
      if (typeof mostrarToast === 'function')
        mostrarToast('Compartilhado', 'success');
      await loadSharesList(editCtx.key);
    } catch (e) {
      alert(e.message || e);
    }
  }

  function boot() {
    if ($('flowEditClose'))
      $('flowEditClose').onclick = function () {
        $('flowEditModal') && $('flowEditModal').classList.remove('open');
      };
    if ($('btnFeSaveHeader'))
      $('btnFeSaveHeader').onclick = function () {
        saveHeaderFromModal();
      };
    if ($('btnFeAddShare'))
      $('btnFeAddShare').onclick = function () {
        addShareFromModal();
      };
    if ($('btnEditHeader')) {
      $('btnEditHeader').onclick = function () {
        if (isGuest()) {
          if (typeof toast === 'function')
            toast('Convidado não edita cabeçalho', true);
          return;
        }
        openFlowEditModal({});
      };
    }
    ensureShareLayout();
    console.log('[Fluxora] flow-edit-modal ready (save closes + toast)');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else boot();
})();
