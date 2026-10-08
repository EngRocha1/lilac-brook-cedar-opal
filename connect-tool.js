/* Connect button ⟷ — guided two-click mode with green feedback */
(function () {
  function $(id) {
    return document.getElementById(id);
  }

  function msg(text, kind) {
    kind = kind || 'success';
    if (typeof showNotification === 'function') showNotification(text, kind);
    else if (typeof toast === 'function') toast(text, kind === 'error');
    else if (typeof flash === 'function') flash(text);
  }

  function setTool(next) {
    try {
      tool = next;
    } catch (e) {}
    window.tool = next;
  }

  function setConnectFrom(id) {
    try {
      connectFrom = id;
    } catch (e) {}
    window.connectFrom = id;
  }

  function getTool() {
    try {
      if (typeof tool !== 'undefined') return tool;
    } catch (e) {}
    return window.tool || 'select';
  }

  function getConnectFrom() {
    try {
      if (typeof connectFrom !== 'undefined') return connectFrom;
    } catch (e) {}
    return window.connectFrom || null;
  }

  function syncBtn() {
    var btn = $('btnConnect');
    if (!btn) return;
    var on = getTool() === 'connect';
    btn.classList.toggle('active', on);
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
  }

  function cancelConnect(silent) {
    setTool('select');
    setConnectFrom(null);
    syncBtn();
    if (!silent) msg('Modo conexão cancelado', 'info');
  }

  function wireBtn() {
    var btn = $('btnConnect');
    if (!btn || btn.dataset.ctWired === '1') return;
    btn.dataset.ctWired = '1';
    btn.onclick = function (ev) {
      if (ev) {
        ev.preventDefault();
        ev.stopPropagation();
      }
      if (getTool() === 'connect') {
        cancelConnect(false);
        return;
      }
      setTool('connect');
      setConnectFrom(null);
      syncBtn();
      msg('Selecione o primeiro ponto (origem)', 'success');
    };
  }

  /** Capture node clicks in connect mode (works even if editor handlers differ) */
  document.addEventListener(
    'mousedown',
    function (ev) {
      if (getTool() !== 'connect') return;
      if (window.HEMOPI_SHARE_MODE === 'guest') return;
      var t = ev.target;
      if (!t || !t.closest) return;
      var g = t.closest('g[data-node], g.node, [data-node-id]');
      var nodeId = null;
      if (g) {
        nodeId =
          g.getAttribute('data-node') ||
          g.getAttribute('data-node-id') ||
          (g.dataset && (g.dataset.node || g.dataset.nodeId));
      }
      /* Fallback: editor groups may not set data-node — resolve via title hit on shape */
      if (!nodeId && t.classList && (t.classList.contains('shape') || t.tagName === 'rect' || t.tagName === 'polygon')) {
        /* walk flow.nodes by geometry */
        if (typeof flow !== 'undefined' && flow && flow.nodes) {
          var svg = $('canvas');
          if (svg) {
            var pt = svg.createSVGPoint();
            pt.x = ev.clientX;
            pt.y = ev.clientY;
            var ctm = svg.getScreenCTM();
            if (ctm) {
              var p = pt.matrixTransform(ctm.inverse());
              for (var i = 0; i < flow.nodes.length; i++) {
                var n = flow.nodes[i];
                if (
                  p.x >= n.x &&
                  p.x <= n.x + n.w &&
                  p.y >= n.y &&
                  p.y <= n.y + n.h
                ) {
                  nodeId = n.id;
                  break;
                }
              }
            }
          }
        }
      }
      if (!nodeId) return;

      ev.stopPropagation();
      ev.preventDefault();

      var from = getConnectFrom();
      if (!from) {
        setConnectFrom(nodeId);
        msg('Primeiro ponto OK — selecione o segundo ponto (destino)', 'success');
        return;
      }
      if (from === nodeId) {
        msg('Escolha um destino diferente da origem', 'error');
        return;
      }
      if (typeof flow === 'undefined' || !flow) {
        msg('Nenhum fluxo carregado', 'error');
        cancelConnect(true);
        return;
      }
      flow.edges = flow.edges || [];
      flow.edges.push({
        id: 'e' + Date.now(),
        from: from,
        to: nodeId,
        label: '',
        points: [],
      });
      setConnectFrom(null);
      setTool('select');
      syncBtn();
      if (typeof saveLocal === 'function') saveLocal();
      if (typeof render === 'function') render();
      if (typeof updateProgress === 'function') updateProgress();
      msg('Conexão criada', 'success');
    },
    true
  );

  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape' && getTool() === 'connect') {
      cancelConnect(false);
    }
  });

  function boot() {
    wireBtn();
    syncBtn();
  }
  boot();
  setTimeout(boot, 400);
  setTimeout(boot, 1200);
  console.log('[Fluxora] connect-tool ready');
})();
