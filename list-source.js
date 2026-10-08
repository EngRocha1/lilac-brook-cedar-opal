/* Flow Manager — list CRUD, clone, toast, full-height surface */
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

  /** Toast: success | error — uses global toast if present */
  function mostrarToast(msg, kind) {
    var isErr = kind === 'error' || kind === true;
    if (typeof window.toast === 'function') {
      try {
        window.toast(msg, isErr);
        return;
      } catch (e) {}
    }
    var el = $('toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'toast';
      el.className = 'toast';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.hidden = false;
    el.style.background = isErr ? '#991b1b' : '#0f172a';
    clearTimeout(window.__toastT);
    window.__toastT = setTimeout(function () {
      el.hidden = true;
    }, 3000);
  }
  window.mostrarToast = mostrarToast;

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
    if (!cx()) {
      list.innerHTML = '<p class="muted">Convex offline. Recarregue a página.</p>';
      window.__renderingFlows = false;
      return;
    }
    if (!email) {
      list.innerHTML = '<p class="muted">Faça login para ver seus fluxos.</p>';
      window.__renderingFlows = false;
      return;
    }
    var rows = [];
    try {
      rows = (await cx().query('flows:list', { ownerEmail: email })) || [];
    } catch (e) {
      list.innerHTML = '<p class="muted">Erro ao listar: ' + String(e.message || e) + '</p>';
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
          } else {
            mostrarToast('Modal de edição indisponível', 'error');
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
          try {
            if (typeof loadFlow === 'function') await loadFlow();
            if (typeof render === 'function') render();
            if (typeof renderMacroBar === 'function') renderMacroBar();
            if (typeof updateProgress === 'function') updateProgress();
            if (typeof renderProjectHeader === 'function') await renderProjectHeader();
            if (typeof fitBoardToScreen === 'function') fitBoardToScreen(true);
          } catch (e) {
            console.error(e);
            mostrarToast('Erro ao abrir: ' + (e.message || e), 'error');
          }
        };

        var cloneBtn = document.createElement('button');
        cloneBtn.type = 'button';
        cloneBtn.className = 'btn btn-clone';
        cloneBtn.textContent = 'Clonar';
        cloneBtn.onclick = async function (ev) {
          ev.preventDefault();
          ev.stopPropagation();
          if (!cx()) {
            mostrarToast('Convex offline', 'error');
            return;
          }
          var prev = cloneBtn.textContent;
          cloneBtn.disabled = true;
          cloneBtn.textContent = 'Clonando...';
          try {
            var clonedData = JSON.parse(JSON.stringify(r.data || {
              macros: [],
              nodes: [],
              edges: [],
              votes: {},
              comments: {},
            }));
            var newTitle = (r.title || r.key) + ' - Cópia';
            var created = await cx().mutation('flows:create', {
              title: newTitle,
              ownerEmail: email,
              data: clonedData,
            });
            mostrarToast('Fluxo clonado com sucesso!', 'success');
            window.__renderingFlows = false;
            await renderFlowManagerClean();
          } catch (e) {
            console.error(e);
            mostrarToast('Erro ao clonar: ' + (e.message || e), 'error');
            cloneBtn.disabled = false;
            cloneBtn.textContent = prev;
          }
        };

        var del = document.createElement('button');
        del.type = 'button';
        del.className = 'btn danger';
        del.textContent = 'Excluir';
        del.onclick = async function (ev) {
          ev.preventDefault();
          ev.stopPropagation();
          if (!confirm('Excluir "' + (r.title || r.key) + '"?')) return;
          if (!cx()) {
            mostrarToast('Convex offline', 'error');
            return;
          }
          var prev = del.textContent;
          del.disabled = true;
          del.textContent = 'Excluindo...';
          try {
            var res = await cx().mutation('flows:remove', {
              key: r.key,
              ownerEmail: email,
            });
            if (res && res.ok === false) {
              throw new Error(res.error === 'not_owner' ? 'Sem permissão' : 'Falha ao excluir');
            }
            mostrarToast('Fluxo excluído', 'success');
            window.__renderingFlows = false;
            await renderFlowManagerClean();
          } catch (e) {
            console.error(e);
            mostrarToast('Erro ao excluir: ' + (e.message || e), 'error');
            del.disabled = false;
            del.textContent = prev;
          }
        };

        actions.appendChild(edit);
        actions.appendChild(open);
        actions.appendChild(cloneBtn);
        actions.appendChild(del);
        card.appendChild(actions);
        list.appendChild(card);
      })(rows[i]);
    }
    window.__renderingFlows = false;
  }

  window.renderFlowManager = renderFlowManagerClean;
  window.renderFlowManagerClean = renderFlowManagerClean;

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
    var btnNew = $('btnMgrNew');
    if (btnNew) {
      btnNew.onclick = async function (ev) {
        if (ev) ev.preventDefault();
        var title = prompt('Nome do novo fluxo', 'Novo fluxo');
        if (!title) return;
        title = title.trim();
        if (!title) return;
        if (!cx()) {
          mostrarToast('Convex offline', 'error');
          return;
        }
        var email = emailOf();
        if (!email) {
          mostrarToast('Faça login', 'error');
          return;
        }
        btnNew.disabled = true;
        var prev = btnNew.textContent;
        btnNew.textContent = 'Criando...';
        try {
          await cx().mutation('flows:create', {
            title: title,
            ownerEmail: email,
            data: {
              macros: [],
              nodes: [],
              edges: [],
              votes: {},
              comments: {},
              header: { projectName: title },
            },
          });
          mostrarToast('Fluxo criado com sucesso!', 'success');
          window.__renderingFlows = false;
          await renderFlowManagerClean();
        } catch (e) {
          console.error(e);
          mostrarToast('Erro ao criar: ' + (e.message || e), 'error');
        } finally {
          btnNew.disabled = false;
          btnNew.textContent = prev || '+ Novo';
        }
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
  console.log('[Fluxora] list-source CRUD+clone ready');
})();
