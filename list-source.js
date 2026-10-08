/**
 * ÚNICA fonte de verdade da listagem de fluxos.
 * Substitui renderFlowManager do CDN e bloqueia handlers concorrentes.
 */
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
      showNotification(
        msg,
        kind === 'error' ? 'error' : kind === 'success' ? 'success' : 'info'
      );
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
      previews: {},
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
    var f =
      data && typeof data === 'object'
        ? JSON.parse(JSON.stringify(data))
        : emptyData(t);
    if (!f.macros) f.macros = [];
    if (!f.nodes) f.nodes = [];
    if (!f.edges) f.edges = [];
    if (!f.votes) f.votes = {};
    if (!f.comments) f.comments = {};
    if (!f.previews) f.previews = {};
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

  async function resolveLogo(r) {
    try {
      var h = (r.data && r.data.header) || {};
      if (h.logoUrl) return h.logoUrl;
      if (h.logoStorageId && cx()) {
        return await cx().mutation('files:getUrl', { storageId: h.logoStorageId });
      }
      var u = window.user || {};
      if (u.logo) return u.logo;
      if (u.logoStorageId && cx()) {
        return await cx().mutation('files:getUrl', { storageId: u.logoStorageId });
      }
    } catch (e) {}
    return null;
  }

  async function presenceLabel(flowKey) {
    try {
      if (!cx() || !flowKey) return 'Online: —';
      var rows =
        (await cx().query('shares:listPresence', { flowKey: flowKey })) || [];
      var now = Date.now();
      var active = rows.filter(function (p) {
        return p.lastSeen && now - p.lastSeen < 45000;
      });
      if (!active.length) return 'Online: ninguém';
      return (
        'Online: ' +
        active
          .map(function (p) {
            return p.name || p.email || '?';
          })
          .join(', ')
      );
    } catch (e) {
      return 'Online: —';
    }
  }

  async function openFlowRecord(r) {
    var key = r.key;
    var title = r.title || r.key;
    var data = r.data;
    var email = emailOf();
    try {
      if (cx() && email) {
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
      }
    } catch (e) {
      console.warn(e);
    }
    applyFlowToRuntime(key, title, data);
    if ($('flowManager')) $('flowManager').hidden = true;
    if ($('appMain')) $('appMain').hidden = false;
    if ($('publicPage')) $('publicPage').hidden = true;
    await refreshBoard();
    toast('Fluxo aberto: ' + title, 'success');
  }

  function buildCard(r, logo, onlineText) {
    var card = document.createElement('div');
    card.className = 'flow-mgr-card';
    card.setAttribute('data-flow-key', r.key);

    var left = document.createElement('div');
    left.className = 'flow-card-left';
    if (logo) {
      var img = document.createElement('img');
      img.className = 'flow-card-logo';
      img.src = logo;
      img.alt = '';
      left.appendChild(img);
    } else {
      var ph = document.createElement('div');
      ph.className = 'flow-card-logo flow-card-logo--ph';
      ph.textContent = '◇';
      left.appendChild(ph);
    }
    var info = document.createElement('div');
    var h4 = document.createElement('h4');
    h4.className = 'flow-card-title';
    h4.textContent = r.title || r.key;
    var meta = document.createElement('div');
    meta.className = 'flow-mgr-meta';
    var nodes = (r.data && r.data.nodes && r.data.nodes.length) || 0;
    var macros = (r.data && r.data.macros && r.data.macros.length) || 0;
    meta.textContent =
      r.key + ' · ' + macros + ' macros · ' + nodes + ' nós';
    var on = document.createElement('div');
    on.className = 'flow-mgr-online';
    on.style.cssText = 'font-size:11px;color:#64748b;margin-top:2px';
    on.textContent = onlineText || 'Online: —';
    info.appendChild(h4);
    info.appendChild(meta);
    info.appendChild(on);
    left.appendChild(info);
    card.appendChild(left);

    var actions = document.createElement('div');
    actions.className = 'flow-mgr-actions';

    function mkBtn(label, className, handler) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = className;
      b.textContent = label;
      b.addEventListener('click', function (ev) {
        ev.preventDefault();
        ev.stopPropagation();
        handler(b);
      });
      actions.appendChild(b);
      return b;
    }

    mkBtn('✎ Editar', 'btn-edit-flow', function () {
      if (typeof openFlowEditModal === 'function') {
        openFlowEditModal({
          key: r.key,
          title: r.title || r.key,
          data: r.data,
        });
      }
    });

    mkBtn('Abrir', 'btn pri', function () {
      openFlowRecord(r);
    });

    mkBtn('Clonar', 'btn-clone', async function (btn) {
      var email = emailOf();
      if (!cx() || !email) {
        toast('Login necessário', 'error');
        return;
      }
      btn.disabled = true;
      btn.textContent = 'Clonando…';
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
        btn.textContent = 'Clonar';
      }
    });

    mkBtn('Excluir', 'btn danger', async function (btn) {
      if (!confirm('Excluir "' + (r.title || r.key) + '"?')) return;
      var email = emailOf();
      btn.disabled = true;
      btn.textContent = 'Excluindo…';
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
        btn.textContent = 'Excluir';
      }
    });

    card.appendChild(actions);
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
      list.innerHTML =
        '<p class="muted">Faça login para ver apenas os seus fluxos.</p>';
      window.__renderingFlows = false;
      return;
    }
    var rows = [];
    try {
      rows = (await cx().query('flows:list', { ownerEmail: email })) || [];
    } catch (e) {
      list.innerHTML =
        '<p class="muted">Erro: ' + String(e.message || e) + '</p>';
      window.__renderingFlows = false;
      return;
    }
    if (!rows.length) {
      list.innerHTML =
        '<p class="muted">Nenhum fluxo. Use + Novo para criar o seu.</p>';
      window.__renderingFlows = false;
      return;
    }
    rows.sort(function (a, b) {
      return (b.updatedAt || 0) - (a.updatedAt || 0);
    });
    /* dedupe by key */
    var seen = {};
    rows = rows.filter(function (r) {
      if (seen[r.key]) return false;
      seen[r.key] = true;
      return true;
    });
    list.innerHTML = '';
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      var logo = await resolveLogo(r);
      var online = await presenceLabel(r.key);
      list.appendChild(buildCard(r, logo, online));
    }
    window.__renderingFlows = false;
    if (window.__renderFlowsQueued) {
      window.__renderFlowsQueued = false;
      await renderFlowManagerClean();
    }
  }

  /* Lock global name so CDN cannot replace */
  try {
    Object.defineProperty(window, 'renderFlowManager', {
      configurable: true,
      enumerable: true,
      get: function () {
        return renderFlowManagerClean;
      },
      set: function () {
        /* ignore CDN overwrites */
      },
    });
  } catch (e) {
    window.renderFlowManager = renderFlowManagerClean;
  }
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

  function openManager(ev) {
    if (ev) {
      ev.preventDefault();
      ev.stopPropagation();
      if (ev.stopImmediatePropagation) ev.stopImmediatePropagation();
    }
    if ($('appMain')) $('appMain').hidden = true;
    if ($('flowManager')) $('flowManager').hidden = false;
    if ($('publicPage')) $('publicPage').hidden = true;
    window.__renderingFlows = false;
    renderFlowManagerClean();
  }

  function wire() {
    var btnOpen = $('btnOpenMgr');
    if (btnOpen) {
      /* capture = true → roda antes do CDN e cancela o segundo handler */
      btnOpen.onclick = null;
      btnOpen.addEventListener('click', openManager, true);
    }
    var btnClose = $('btnMgrClose');
    if (btnClose) {
      btnClose.onclick = function () {
        if ($('flowManager')) $('flowManager').hidden = true;
        if ($('appMain')) $('appMain').hidden = false;
      };
    }
    var btnNew = $('btnMgrNew');
    if (btnNew) {
      btnNew.onclick = function (ev) {
        if (ev) ev.preventDefault();
        createFlow();
      };
    }
    var btnNewFlow = $('btnNewFlow');
    if (btnNewFlow) {
      btnNewFlow.onclick = function (ev) {
        if (ev) ev.preventDefault();
        createFlow();
      };
    }
  }

  wire();
  setTimeout(wire, 400);
  setTimeout(wire, 1200);
  setTimeout(wire, 3000);

  console.log('[Fluxora] list-source single source');
})();
