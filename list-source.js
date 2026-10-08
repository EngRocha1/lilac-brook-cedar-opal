/* list-source — CRUD listagem estável (create/open/delete) */
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

  function mostrarToast(msg, kind) {
    if (typeof showNotification === 'function') {
      showNotification(msg, kind === 'error' ? 'error' : kind === 'success' ? 'success' : 'info');
      return;
    }
    if (typeof window.mostrarToast === 'function' && window.mostrarToast !== mostrarToast) {
      window.mostrarToast(msg, kind);
      return;
    }
    if (typeof toast === 'function') toast(msg, kind === 'error');
  }

  async function cardLogoUrl(r) {
    try {
      var d = r && r.data;
      var h = d && d.header;
      if (h && h.logoUrl) return h.logoUrl;
      var u = window.user;
      if (u && u.logo) return u.logo;
    } catch (e) {}
    return null;
  }

  async function renderFlowManagerClean() {
    if (window.__renderingFlows) {
      if (window.__renderFlowsQueued) return;
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
      list.innerHTML =
        '<p class="muted">Erro ao listar: ' + String(e.message || e) + '</p>';
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
        edit.textContent = '✎ Editar';
        edit.onclick = function (ev) {
          ev.preventDefault();
          ev.stopPropagation();
          if (typeof openFlowEditModal === 'function') {
            openFlowEditModal({
              key: r.key,
              title: r.title || r.key,
              data: r.data,
            });
          } else if (typeof openEditForFlow === 'function') {
            openEditForFlow(r);
          }
        };

        var open = document.createElement('button');
        open.type = 'button';
        open.className = 'btn pri';
        open.textContent = 'Abrir';
        open.onclick = async function () {
          var key = r.key;
          var title = r.title || r.key;
          var data = r.data;
          if (!data || typeof data !== 'object') {
            data = { macros: [], nodes: [], edges: [], votes: {}, comments: {} };
          }
          window.flowKey = key;
          try {
            flowKey = key;
          } catch (e) {}
          localStorage.setItem('hemopi_flow_key', key);
          try {
            flowTitle = title;
          } catch (e) {
            window.flowTitle = title;
          }
          try {
            var f = JSON.parse(JSON.stringify(data));
            if (!f.macros) f.macros = [];
            if (!f.nodes) f.nodes = [];
            if (!f.edges) f.edges = [];
            if (!f.votes) f.votes = {};
            if (!f.comments) f.comments = {};
            try {
              flow = f;
            } catch (e2) {
              window.flow = f;
            }
            try {
              localStorage.setItem('hemopi_editor_v1', JSON.stringify(f));
            } catch (e3) {}
          } catch (e4) {
            console.error(e4);
          }
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
          mostrarToast('Fluxo aberto: ' + title, 'success');
        };

        var cloneBtn = document.createElement('button');
        cloneBtn.type = 'button';
        cloneBtn.className = 'btn-clone';
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
            var clonedData = JSON.parse(JSON.stringify(r.data || {}));
            var newTitle = (r.title || r.key) + ' - Cópia';
            await cx().mutation('flows:create', {
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
              throw new Error(
                res.error === 'not_owner' ? 'Sem permissão' : 'Falha ao excluir'
              );
            }
            var cur =
              window.flowKey ||
              (typeof flowKey !== 'undefined' ? flowKey : null) ||
              localStorage.getItem('hemopi_flow_key');
            if (cur === r.key) {
              window.flowKey = '';
              try {
                flowKey = '';
              } catch (eC) {}
              localStorage.removeItem('hemopi_flow_key');
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
    if (window.__renderFlowsQueued) {
      window.__renderFlowsQueued = false;
      await renderFlowManagerClean();
    }
  }

  window.renderFlowManager = renderFlowManagerClean;
  window.renderFlowManagerClean = renderFlowManagerClean;

  function wireMgr() {
    var btnClose = $('btnMgrClose');
    if (btnClose && !btnClose.dataset.lsWired) {
      btnClose.dataset.lsWired = '1';
      btnClose.onclick = function () {
        if ($('flowManager')) $('flowManager').hidden = true;
        if ($('appMain')) $('appMain').hidden = false;
      };
    }
    var btnNew = $('btnMgrNew');
    if (btnNew && !btnNew.dataset.lsWired) {
      btnNew.dataset.lsWired = '1';
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
          var created = await cx().mutation('flows:create', {
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
          var newKey = created && created.key;
          if (newKey) {
            window.flowKey = newKey;
            try {
              flowKey = newKey;
            } catch (eK) {}
            localStorage.setItem('hemopi_flow_key', newKey);
            try {
              flowTitle = title;
            } catch (eT) {
              window.flowTitle = title;
            }
            var blank = {
              macros: [],
              nodes: [],
              edges: [],
              votes: {},
              comments: {},
              header: { projectName: title },
            };
            try {
              flow = blank;
            } catch (eF) {
              window.flow = blank;
            }
            try {
              localStorage.setItem('hemopi_editor_v1', JSON.stringify(blank));
            } catch (eL) {}
          }
          mostrarToast('Fluxo criado: ' + title, 'success');
          window.__renderingFlows = false;
          await renderFlowManagerClean();
        } catch (e) {
          console.error(e);
          mostrarToast('Erro ao criar: ' + (e.message || e), 'error');
        }
        btnNew.disabled = false;
        btnNew.textContent = prev;
      };
    }
    var btnOpenMgr = $('btnOpenMgr');
    if (btnOpenMgr && !btnOpenMgr.dataset.lsWired) {
      btnOpenMgr.dataset.lsWired = '1';
      btnOpenMgr.onclick = async function () {
        if ($('appMain')) $('appMain').hidden = true;
        if ($('flowManager')) $('flowManager').hidden = false;
        window.__renderingFlows = false;
        await renderFlowManagerClean();
      };
    }
  }

  wireMgr();
  setTimeout(wireMgr, 500);
  setTimeout(wireMgr, 1500);
  console.log('[Fluxora] list-source CRUD fix');
})();
