/**
 * Share modal — list, role, revoke, copy link (same UX level as edit modal).
 */
(function () {
  function $(id) {
    return document.getElementById(id);
  }
  function cx() {
    return window.convexClient;
  }
  function toast(msg, err) {
    if (typeof mostrarToast === 'function')
      mostrarToast(msg, err ? 'error' : 'success');
    else if (typeof window.showNotification === 'function')
      window.showNotification(msg, err ? 'error' : 'success');
    else if (typeof window.toast === 'function') window.toast(msg, err);
  }
  function isGuest() {
    return window.HEMOPI_SHARE_MODE === 'guest';
  }
  function flowKey() {
    return (
      window.flowKey ||
      localStorage.getItem('hemopi_flow_key') ||
      ''
    );
  }

  function ensureCss() {
    if (document.getElementById('share-modal-css')) return;
    var st = document.createElement('style');
    st.id = 'share-modal-css';
    st.textContent =
      '#shareModal.modal-bg{z-index:10020}' +
      '#shareModal .modal{max-width:520px;width:min(520px,94vw)}' +
      '.share-list{display:flex;flex-direction:column;gap:8px;margin:12px 0;max-height:240px;overflow:auto}' +
      '.share-row{display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding:10px 12px;border:1px solid #e2e8f0;border-radius:10px;background:#f8fafc}' +
      '.share-row .share-email{flex:1 1 140px;font-size:13px;font-weight:600;color:#0f172a;word-break:break-all}' +
      '.share-row .share-role{font-size:11px;padding:2px 8px;border-radius:999px;background:#e2e8f0;color:#334155}' +
      '.share-row .share-role.collab{background:#dbeafe;color:#1d4ed8}' +
      '.share-row .share-role.revoked{background:#fee2e2;color:#b91c1c}' +
      '.share-actions{display:flex;flex-wrap:wrap;gap:6px}' +
      '.share-actions .btn{font-size:12px;padding:6px 10px;border-radius:8px}' +
      '.share-add{display:flex;flex-direction:column;gap:10px;margin-top:8px;padding-top:12px;border-top:1px solid #e2e8f0}' +
      '.share-add .share-email-row{display:flex;flex-direction:column;gap:6px}' +
      '.share-add input[type=email]{width:100%;box-sizing:border-box;padding:10px 12px;border:1px solid #cbd5e1;border-radius:10px;font-size:14px}' +
      '.share-role-row{display:flex;flex-wrap:wrap;gap:12px;align-items:center}' +
      '.share-role-row label{display:inline-flex;align-items:center;gap:6px;font-size:13px;cursor:pointer}' +
      '.share-add .btn-share-submit{width:100%;padding:12px;border-radius:10px;font-weight:700;background:#0f766e;color:#fff;border:none;cursor:pointer}' +
      '.share-add .btn-share-submit:hover{background:#0d9488}' +
      '.share-add .btn-share-submit:disabled{opacity:.6;cursor:wait}' +
      /* edit modal share zone */
      '#flowEditModal .fe-share-zone{margin-top:18px;padding-top:14px;border-top:1px solid #e2e8f0}' +
      '#flowEditModal .fe-share-add{display:flex;flex-direction:column;gap:10px;margin-top:10px}' +
      '#flowEditModal #feNewShareEmail{width:100%!important;flex:none!important;box-sizing:border-box;padding:10px 12px;border-radius:10px;border:1px solid #cbd5e1}' +
      '#flowEditModal #btnFeAddShare{width:100%;padding:11px;border-radius:10px;font-weight:700}' +
      '#flowEditModal #feShareRoleBox{display:flex;flex-wrap:wrap;gap:10px;margin:0!important}' +
      '#flowEditModal .modal{max-width:560px}' +
      '#flowEditModal .modal-b label{display:block;margin-top:10px;font-size:12px;font-weight:600;color:#475569}' +
      '#flowEditModal .modal-b input[type=text],#flowEditModal .modal-b input[type=email]{width:100%;box-sizing:border-box;padding:10px 12px;border:1px solid #cbd5e1;border-radius:10px;margin-top:4px}' +
      '#flowEditModal #btnFeSaveHeader{width:100%;margin-top:14px;padding:12px;border-radius:10px}';
    document.head.appendChild(st);
  }

  function ensureModal() {
    if ($('shareModal')) return;
    var bg = document.createElement('div');
    bg.className = 'modal-bg';
    bg.id = 'shareModal';
    bg.onclick = function (e) {
      if (e.target === bg) closeShareModal();
    };
    bg.innerHTML =
      '<div class="modal">' +
      '<div class="modal-h"><strong>Compartilhar fluxo</strong>' +
      '<button type="button" class="x" id="shareModalClose">×</button></div>' +
      '<div class="modal-b">' +
      '<p class="muted" id="shareModalFlowTitle" style="margin:0 0 8px;font-size:13px"></p>' +
      '<h4 style="margin:8px 0 4px;font-size:14px">Quem tem acesso</h4>' +
      '<div class="share-list" id="shareModalList"></div>' +
      '<div class="share-add">' +
      '<strong style="font-size:13px">Novo compartilhamento</strong>' +
      '<div class="share-email-row">' +
      '<label for="shareModalEmail">E-mail</label>' +
      '<input id="shareModalEmail" type="email" placeholder="nome@empresa.com" autocomplete="email"/>' +
      '</div>' +
      '<div class="share-role-row">' +
      '<span style="font-size:12px;font-weight:700;width:100%">Modo de acesso</span>' +
      '<label><input type="radio" name="shareModalRole" value="guest" checked/> Convidado (só vota)</label>' +
      '<label><input type="radio" name="shareModalRole" value="collaborator"/> Colaborador (edita)</label>' +
      '</div>' +
      '<button type="button" class="btn-share-submit" id="shareModalSubmit">+ Compartilhar</button>' +
      '</div></div></div>';
    document.body.appendChild(bg);
    $('shareModalClose').onclick = closeShareModal;
    $('shareModalSubmit').onclick = submitShare;
  }

  function closeShareModal() {
    var m = $('shareModal');
    if (m) m.classList.remove('open');
  }

  async function loadList() {
    var box = $('shareModalList');
    if (!box) return;
    var key = flowKey();
    box.innerHTML = '<p class="muted">Carregando…</p>';
    if (!cx() || !key) {
      box.innerHTML = '<p class="muted">Fluxo não identificado.</p>';
      return;
    }
    try {
      var rows = (await cx().query('shares:listByFlow', { flowKey: key })) || [];
      if (!rows.length) {
        box.innerHTML =
          '<p class="muted">Nenhum compartilhamento ainda.</p>';
        return;
      }
      box.innerHTML = '';
      rows.forEach(function (sh) {
        var emails = (sh.emails || []).join(', ') || sh.email || '—';
        var revoked = sh.revoked || sh.active === false;
        var role = revoked
          ? 'Revogado'
          : sh.canEdit
            ? 'Colaborador'
            : 'Convidado';
        var row = document.createElement('div');
        row.className = 'share-row';
        var roleCls = revoked
          ? 'share-role revoked'
          : sh.canEdit
            ? 'share-role collab'
            : 'share-role';
        row.innerHTML =
          '<span class="share-email"></span><span class="' +
          roleCls +
          '">' +
          role +
          '</span>';
        row.querySelector('.share-email').textContent = emails;

        var actions = document.createElement('div');
        actions.className = 'share-actions';

        var linkBtn = document.createElement('button');
        linkBtn.type = 'button';
        linkBtn.className = 'btn';
        linkBtn.textContent = 'Copiar link';
        linkBtn.onclick = function () {
          var url =
            location.origin +
            location.pathname +
            '?share=' +
            (sh.token || sh._id || '');
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(url).then(
              function () {
                toast('Link copiado');
              },
              function () {
                prompt('Copie o link:', url);
              }
            );
          } else prompt('Copie o link:', url);
        };
        actions.appendChild(linkBtn);

        if (!revoked) {
          var rev = document.createElement('button');
          rev.type = 'button';
          rev.className = 'btn danger';
          rev.textContent = 'Revogar';
          rev.onclick = async function () {
            if (!confirm('Revogar acesso de ' + emails + '?')) return;
            try {
              rev.disabled = true;
              if (typeof cx().mutation === 'function') {
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
              }
              toast('Acesso revogado');
              await loadList();
              if (typeof window.refreshEditModalShares === 'function') {
                window.refreshEditModalShares();
              }
            } catch (err) {
              toast(err.message || 'Falha ao revogar', true);
              rev.disabled = false;
            }
          };
          actions.appendChild(rev);
        }
        row.appendChild(actions);
        box.appendChild(row);
      });
    } catch (e) {
      box.innerHTML =
        '<p class="muted">Erro ao listar: ' +
        (e.message || e) +
        '</p>';
    }
  }

  async function submitShare() {
    if (isGuest()) {
      toast('Convidado não pode compartilhar', true);
      return;
    }
    var email = ($('shareModalEmail') && $('shareModalEmail').value || '')
      .trim()
      .toLowerCase();
    if (!email || email.indexOf('@') < 1) {
      toast('Informe um e-mail válido', true);
      return;
    }
    var key = flowKey();
    if (!cx() || !key) {
      toast('Fluxo não identificado', true);
      return;
    }
    var roleEl = document.querySelector('input[name="shareModalRole"]:checked');
    var canEdit = roleEl && roleEl.value === 'collaborator';
    var btn = $('shareModalSubmit');
    try {
      if (btn) {
        btn.disabled = true;
        btn.textContent = 'Compartilhando…';
      }
      await cx().mutation('shares:create', {
        flowKey: key,
        emails: [email],
        canEdit: !!canEdit,
      });
      if ($('shareModalEmail')) $('shareModalEmail').value = '';
      toast('Compartilhado com ' + email);
      await loadList();
      if (typeof window.refreshEditModalShares === 'function') {
        window.refreshEditModalShares();
      }
    } catch (e) {
      toast(e.message || 'Erro ao compartilhar', true);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = '+ Compartilhar';
      }
    }
  }

  window.openShareModal = async function () {
    if (isGuest()) {
      toast('Convidado não pode gerenciar compartilhamentos', true);
      return;
    }
    ensureCss();
    ensureModal();
    var title =
      (window.flow && window.flow.title) ||
      flowKey() ||
      'Fluxo atual';
    var t = $('shareModalFlowTitle');
    if (t) t.textContent = title;
    $('shareModal').classList.add('open');
    await loadList();
  };

  window.closeShareModal = closeShareModal;

  function wireBannerAndLegacy() {
    var sh = $('btnBannerShare');
    if (sh && !sh.__shareModal) {
      sh.onclick = function (ev) {
        ev.preventDefault();
        window.openShareModal();
      };
      sh.__shareModal = true;
    }
    var legacy = $('btnShare');
    if (legacy && !legacy.__shareModal) {
      legacy.onclick = function (ev) {
        ev.preventDefault();
        window.openShareModal();
      };
      legacy.__shareModal = true;
    }
  }

  function boot() {
    ensureCss();
    wireBannerAndLegacy();
    /* re-wire after banner re-render */
    var prev = window.renderBannerMeta;
    if (typeof prev === 'function' && !prev.__shareModal) {
      window.renderBannerMeta = function () {
        var r = prev.apply(this, arguments);
        setTimeout(wireBannerAndLegacy, 0);
        return r;
      };
      window.renderBannerMeta.__shareModal = true;
    }
    console.log('[Fluxora] share-modal ready');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else boot();
  setTimeout(boot, 500);
})();
