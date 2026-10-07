/* Canonical flow list + user chip — single source, no DOM polling */
(function () {
  function $(id) {
    return document.getElementById(id);
  }
  function cx() {
    return window.convexClient || null;
  }
  function emailOf() {
    var u = window.user || (typeof user !== 'undefined' ? user : null);
    return ((u && u.email) || '').toLowerCase().trim();
  }

  async function cardLogoUrl(r) {
    var h = (r && r.data && r.data.header) || {};
    if (h.logoUrl) return h.logoUrl;
    var u = window.user || (typeof user !== 'undefined' ? user : null);
    if (u && u.logo) return u.logo;
    return null;
  }

  async function renderFlowManagerClean() {
    if (window.__renderingFlows) return;
    window.__renderingFlows = true;
    var list = $('flowManagerList');
    if (!list) {
      window.__renderingFlows = false;
      return;
    }
    var email = emailOf();
    list.innerHTML = '<p class="muted">Consultando Convex…</p>';
    if (!cx() || !email) {
      list.innerHTML = '<p class="muted">Faça login / Convex offline.</p>';
      window.__renderingFlows = false;
      return;
    }
    var rows = [];
    try {
      rows = (await cx().query('flows:list', { ownerEmail: email })) || [];
    } catch (e) {
      list.innerHTML = '<p class="muted">Erro: ' + String(e.message || e) + '</p>';
      window.__renderingFlows = false;
      return;
    }
    if (!rows.length) {
      list.innerHTML = '<p class="muted">Nenhum fluxo. Use + Novo.</p>';
      window.__renderingFlows = false;
      return;
    }
    rows.sort(function (a, b) {
      return (b.updatedAt || 0) - (a.updatedAt || 0);
    });
    list.innerHTML = '';
    for (var i = 0; i < rows.length; i++) {
      (function (r) {
        var card = document.createElement('div');
        card.className = 'flow-mgr-card';
        card.setAttribute('data-flow-key', r.key);
        var nodes = (r.data && r.data.nodes && r.data.nodes.length) || 0;
        var macros = (r.data && r.data.macros && r.data.macros.length) || 0;
        var left = document.createElement('div');
        left.className = 'flow-card-left';
        left.innerHTML =
          '<div class="flow-card-logo flow-card-logo--ph">◇</div><div><h4>' +
          (r.title || r.key) +
          '</h4><div class="flow-mgr-meta">' +
          r.key +
          ' · ' +
          macros +
          ' macros · ' +
          nodes +
          ' nós</div></div>';
        card.appendChild(left);
        cardLogoUrl(r).then(function (logo) {
          if (!logo) return;
          var ph = left.querySelector('.flow-card-logo');
          if (!ph) return;
          var im = document.createElement('img');
          im.className = 'flow-card-logo';
          im.src = logo;
          im.alt = '';
          ph.replaceWith(im);
        });

        var actions = document.createElement('div');
        actions.className = 'flow-mgr-actions';

        var edit = document.createElement('button');
        edit.type = 'button';
        edit.className = 'btn-edit-flow';
        edit.setAttribute('data-fe-edit', '1');
        edit.textContent = '✎ Editar';
        edit.onclick = function (ev) {
          ev.preventDefault();
          ev.stopPropagation();
          if (typeof openFlowEditModal === 'function') {
            openFlowEditModal({ key: r.key, title: r.title || r.key, data: r.data });
          } else if (typeof openEditForFlow === 'function') {
            openEditForFlow(r);
          }
        };

        var open = document.createElement('button');
        open.type = 'button';
        open.className = 'btn pri';
        open.textContent = 'Abrir';
        open.onclick = async function () {
          window.flowKey = r.key;
          try {
            flowKey = r.key;
          } catch (e) {}
          localStorage.setItem('hemopi_flow_key', r.key);
          try {
            flowTitle = r.title || r.key;
          } catch (e) {}
          if ($('flowManager')) $('flowManager').hidden = true;
          if ($('appMain')) $('appMain').hidden = false;
          if (typeof loadFlow === 'function') await loadFlow();
          try {
            if (typeof render === 'function') render();
            if (typeof renderMacroBar === 'function') renderMacroBar();
            if (typeof updateProgress === 'function') updateProgress();
            if (typeof renderProjectHeader === 'function') await renderProjectHeader();
            if (typeof fitBoardToScreen === 'function') fitBoardToScreen(true);
          } catch (e) {}
        };

        var del = document.createElement('button');
        del.type = 'button';
        del.className = 'btn danger';
        del.textContent = 'Excluir';
        del.onclick = async function (ev) {
          ev.preventDefault();
          ev.stopPropagation();
          if (!confirm('Excluir "' + (r.title || r.key) + '"?')) return;
          var prev = del.textContent;
          del.disabled = true;
          del.textContent = 'Excluindo...';
          try {
            await cx().mutation('flows:remove', { key: r.key, ownerEmail: email });
            if (typeof toast === 'function') toast('Fluxo excluído');
            window.__renderingFlows = false;
            await renderFlowManagerClean();
          } catch (e) {
            console.error(e);
            del.disabled = false;
            del.textContent = prev;
            alert('Erro ao excluir: ' + (e.message || e));
          }
        };

        actions.appendChild(edit);
        actions.appendChild(open);
        actions.appendChild(del);
        card.appendChild(actions);
        list.appendChild(card);
      })(rows[i]);
    }
    window.__renderingFlows = false;
  }

  window.renderFlowManager = renderFlowManagerClean;

  async function refreshUserChromeStack() {
    var lab = $('userLabel');
    var u = window.user || (typeof user !== 'undefined' ? user : null);
    if (!lab || !u) return;
    var photoUrl = u.photo || null;
    var name = u.name || u.email || '—';
    var email = u.email || '';
    var badge = window.HEMOPI_SHARE_MODE === 'guest' ? 'Convidado' : name;
    lab.className = 'user-chip user-chip--stack';
    lab.innerHTML =
      (photoUrl
        ? '<img class="user-avatar" src="' + photoUrl + '" alt="" />'
        : '<span class="user-avatar user-avatar--ph">' +
          (name.charAt(0) || '?').toUpperCase() +
          '</span>') +
      '<span class="user-chip-text"><strong class="user-chip-name">' +
      badge +
      '</strong>' +
      (email ? '<span class="user-chip-email">' + email + '</span>' : '') +
      '</span>';
  }
  window.refreshUserChrome = refreshUserChromeStack;

  function wireMgrButtons() {
    var openMgr = $('btnOpenMgr');
    if (openMgr) {
      openMgr.onclick = async function (ev) {
        if (ev) ev.preventDefault();
        if ($('appMain')) $('appMain').hidden = true;
        if ($('publicPage')) $('publicPage').hidden = true;
        if ($('flowManager')) $('flowManager').hidden = false;
        await renderFlowManagerClean();
      };
    }
    var closeMgr = $('btnMgrClose');
    if (closeMgr) {
      closeMgr.onclick = function () {
        if ($('flowManager')) $('flowManager').hidden = true;
        if ($('appMain')) $('appMain').hidden = false;
      };
    }
  }

  function boot() {
    wireMgrButtons();
    refreshUserChromeStack();
  }
  boot();
  setTimeout(boot, 600);
  setTimeout(boot, 1200);
  setTimeout(boot, 2500);
  console.log('[Fluxora] list-source canonical ready');
})();
