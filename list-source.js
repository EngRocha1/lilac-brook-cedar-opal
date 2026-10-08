/* list-source — HTML template + JS actions only (no competing DOM injectors) */
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

  function toast(msg, kind) {
    if (typeof showNotification === 'function') {
      showNotification(msg, kind === 'error' ? 'error' : kind === 'success' ? 'success' : 'info');
    } else if (typeof window.toast === 'function') {
      try {
        window.toast(msg, kind === 'error');
      } catch (e) {}
    }
  }

  function emptyData(title) {
    return {
      macros: [],
      nodes: [],
      edges: [],
      votes: {},
      comments: {},
      header: { projectName: title || '' },
    };
  }

  function applyFlowToRuntime(key, title, data) {
    window.flowKey = key;
    try {
      flowKey = key;
    } catch (e) {}
    localStorage.setItem('hemopi_flow_key', key);
    var t = title || key;
    try {
      flowTitle = t;
    } catch (e2) {
      window.flowTitle = t;
    }
    window.flowTitle = t;
    var f = data && typeof data === 'object' ? JSON.parse(JSON.stringify(data)) : emptyData(t);
    if (!f.macros) f.macros = [];
    if (!f.nodes) f.nodes = [];
    if (!f.edges) f.edges = [];
    if (!f.votes) f.votes = {};
    if (!f.comments) f.comments = {};
    try {
      flow = f;
    } catch (e3) {
      window.flow = f;
    }
    window.flow = f;
    try {
      localStorage.setItem('hemopi_editor_v1', JSON.stringify(f));
    } catch (e4) {}
    if (typeof markFlowClean === 'function') markFlowClean();
    var sel = $('flowSelect');
    if (sel) {
      var found = false;
      for (var i = 0; i < sel.options.length; i++) {
        if (sel.options[i].value === key) {
          sel.selectedIndex = i;
          sel.options[i].textContent = t;
          found = true;
          break;
        }
      }
      if (!found) {
        var o = document.createElement('option');
        o.value = key;
        o.textContent = t;
        sel.appendChild(o);
        sel.value = key;
      }
    }
  }

  async function refreshBoard() {
    try {
      if (typeof render === 'function') render();
      if (typeof renderMacroBar === 'function') renderMacroBar();
      if (typeof updateProgress === 'function') updateProgress();
      if (typeof renderProjectHeader === 'function') await renderProjectHeader();
      if (typeof renderSealBox === 'function') renderSealBox();
      if (typeof fitBoardToScreen === 'function') fitBoardToScreen(true);
    } catch (e) {
      console.error(e);
    }
  }

  async function openFlowRecord(r) {
    var key = r.key;
    var title = r.title || r.key;
    var data = r.data;
    var email = emailOf();
    if (cx() && email) {
      try {
        var remote = await cx().query('flows:get', {
          key: key,
          requesterEmail: email,
        });
        if (remote) {
          if (remote.title) title = remote.title;
          if (remote.data != null) data = remote.data;
        } else {
          toast('Sem permissão para este fluxo', 'error');
          return;
        }
      } catch (e) {
        console.warn(e);
      }
    }
    applyFlowToRuntime(key, title, data);
    if ($('flowManager')) $('flowManager').hidden = true;
    if ($('appMain')) $('appMain').hidden = false;
    if ($('publicPage')) $('publicPage').hidden = true;
    await refreshBoard();
    toast('Fluxo aberto: ' + title, 'success');
  }

  function buildCard(r) {
    var tpl = $('flowCardTpl');
    var card;
    if (tpl && tpl.content) {
      card = tpl.content.firstElementChild.cloneNode(true);
    } else {
      card = document.createElement('div');
      card.className = 'flow-mgr-card';
      card.innerHTML =
        '<div class="flow-card-left"><div class="flow-card-logo flow-card-logo--ph">◇</div><div><h4 class="flow-card-title"></h4><div class="flow-mgr-meta"></div></div></div>' +
        '<div class="flow-mgr-actions">' +
        '<button type="button" class="btn-edit-flow" data-action="edit">✎ Editar</button>' +
        '<button type="button" class="btn pri" data-action="open">Abrir</button>' +
        '<button type="button" class="btn-clone" data-action="clone">Clonar</button>' +
        '<button type="button" class="btn danger" data-action="delete">Excluir</button>' +
        '</div>';
    }
    card.setAttribute('data-flow-key', r.key);
    var titleEl = card.querySelector('.flow-card-title');
    var metaEl = card.querySelector('.flow-mgr-meta');
    var nodes = (r.data && r.data.nodes && r.data.nodes.length) || 0;
    var macros = (r.data && r.data.macros && r.data.macros.length) || 0;
    if (titleEl) titleEl.textContent = r.title || r.key;
    if (metaEl) metaEl.textContent = r.key + ' · ' + macros + ' macros · ' + nodes + ' nós';

    var email = emailOf();
    card.querySelectorAll('[data-action]').forEach(function (btn) {
      var action = btn.getAttribute('data-action');
      btn.onclick = async function (ev) {
        ev.preventDefault();
        ev.stopPropagation();
        if (action === 'edit') {
          if (typeof openFlowEditModal === 'function') {
            openFlowEditModal({ key: r.key, title: r.title || r.key, data: r.data });
          }
        } else if (action === 'open') {
          await openFlowRecord(r);
        } else if (action === 'clone') {
          btn.disabled = true;
          try {
            await cx().mutation('flows:create', {
              title: (r.title || r.key) + ' - Cópia',
              ownerEmail: email,
              data: JSON.parse(JSON.stringify(r.data || emptyData(r.title))),
            });
            toast('Fluxo clonado', 'success');
            window.__renderingFlows = false;
            await renderFlowManagerClean();
          } catch (e) {
            toast('Erro ao clonar: ' + (e.message || e), 'error');
            btn.disabled = false;
          }
        } else if (action === 'delete') {
          if (!confirm('Excluir "' + (r.title || r.key) + '"?')) return;
          btn.disabled = true;
          try {
            var res = await cx().mutation('flows:remove', {
              key: r.key,
              ownerEmail: email,
            });
            if (res && res.ok === false) throw new Error(res.error || 'Falha');
            toast('Fluxo excluído', 'success');
            window.__renderingFlows = false;
            await renderFlowManagerClean();
          } catch (e) {
            toast('Erro ao excluir: ' + (e.message || e), 'error');
            btn.disabled = false;
          }
        }
      };
    });
    return card;
  }

  async function renderFlowManagerClean() {
    if (window.__renderingFlows) {
      window.__renderFlowsQueued = true;
      return;
    }
    window.__renderingFlows = true;
    window.__renderFlowsQueued = false;
    var list = $('flowManagerList');
    if (!list) {
      window.__renderingFlows = false;
      return;
    }
    var email = emailOf();
    list.innerHTML = '<p class="muted">Consultando Convex…</p>';
    if (!cx() || !email) {
      list.innerHTML = '<p class="muted">Faça login para ver apenas os seus fluxos.</p>';
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
      list.innerHTML = '<p class="muted">Nenhum fluxo. Use + Novo para criar o seu.</p>';
      window.__renderingFlows = false;
      return;
    }
    rows.sort(function (a, b) {
      return (b.updatedAt || 0) - (a.updatedAt || 0);
    });
    list.innerHTML = '';
    rows.forEach(function (r) {
      list.appendChild(buildCard(r));
    });
    window.__renderingFlows = false;
    if (window.__renderFlowsQueued) {
      window.__renderFlowsQueued = false;
      await renderFlowManagerClean();
    }
  }

  window.renderFlowManager = renderFlowManagerClean;
  window.renderFlowManagerClean = renderFlowManagerClean;

  async function createFlow() {
    var title = prompt('Nome do novo fluxo', 'Novo fluxo');
    if (!title) return;
    title = title.trim();
    if (!title) return;
    var email = emailOf();
    if (!cx() || !email) {
      toast('Login necessário', 'error');
      return;
    }
    try {
      var created = await cx().mutation('flows:create', {
        title: title,
        ownerEmail: email,
        data: emptyData(title),
      });
      if (created && created.key) {
        applyFlowToRuntime(created.key, title, emptyData(title));
        await refreshBoard();
      }
      toast('Fluxo criado: ' + title, 'success');
      window.__renderingFlows = false;
      await renderFlowManagerClean();
    } catch (e) {
      toast('Erro ao criar: ' + (e.message || e), 'error');
    }
  }

  function wire() {
    var btnOpen = $('btnOpenMgr');
    if (btnOpen) {
      btnOpen.onclick = async function () {
        if ($('appMain')) $('appMain').hidden = true;
        if ($('flowManager')) $('flowManager').hidden = false;
        window.__renderingFlows = false;
        await renderFlowManagerClean();
      };
    }
    var btnClose = $('btnMgrClose');
    if (btnClose) {
      btnClose.onclick = function () {
        if ($('flowManager')) $('flowManager').hidden = true;
        if ($('appMain')) $('appMain').hidden = false;
      };
    }
    var btnNew = $('btnMgrNew');
    if (btnNew) btnNew.onclick = function (ev) {
      if (ev) ev.preventDefault();
      createFlow();
    };
    var btnNewFlow = $('btnNewFlow');
    if (btnNewFlow) btnNewFlow.onclick = function (ev) {
      if (ev) ev.preventDefault();
      createFlow();
    };
  }

  wire();
  setTimeout(wire, 300);
  setTimeout(wire, 1000);
  setTimeout(wire, 2500);
  console.log('[Fluxora] list-source template');
})();
