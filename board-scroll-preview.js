/**
 * Board XY scrollbars + preview icon per node (keyed by node id).
 * Sets both window.selected and global selected so voteKeyOf is correct.
 */
(function () {
  function $(id) {
    return document.getElementById(id);
  }

  function ensureScrollCss() {
    if (document.getElementById('board-scroll-css')) return;
    var st = document.createElement('style');
    st.id = 'board-scroll-css';
    st.textContent =
      '.canvas-wrap{overflow:auto!important;scrollbar-gutter:stable both-edges;}' +
      '.canvas-wrap::-webkit-scrollbar{width:12px;height:12px}' +
      '.canvas-wrap::-webkit-scrollbar-thumb{background:#94a3b8;border-radius:8px;border:2px solid #e2e8f0}' +
      '.canvas-wrap::-webkit-scrollbar-track{background:#e2e8f0}' +
      '.canvas-wrap::-webkit-scrollbar-corner{background:#e2e8f0}' +
      '.canvas-wrap #canvas{min-width:2000px;min-height:1400px}' +
      'g.preview-btn{cursor:pointer}' +
      'g.preview-btn:hover circle{fill:#e0f2fe;stroke:#0284c7}' +
      'g.comment-btn{cursor:pointer}';
    document.head.appendChild(st);
  }

  function sizeCanvasToContent() {
    var svg = $('canvas');
    var f = window.flow;
    if (!svg || !f) return;
    var maxX = 1600,
      maxY = 1100;
    function hit(x, y, w, h) {
      maxX = Math.max(maxX, (x || 0) + (w || 0) + 160);
      maxY = Math.max(maxY, (y || 0) + (h || 0) + 160);
    }
    (f.macros || []).forEach(function (m) {
      hit(m.x, m.y, m.w, m.h);
    });
    (f.nodes || []).forEach(function (n) {
      hit(n.x, n.y, n.w, n.h);
    });
    svg.setAttribute('width', String(Math.ceil(maxX)));
    svg.setAttribute('height', String(Math.ceil(maxY)));
    svg.style.minWidth = Math.ceil(maxX) + 'px';
    svg.style.minHeight = Math.ceil(maxY) + 'px';
  }

  function elNS(name, attrs, text) {
    var e = document.createElementNS('http://www.w3.org/2000/svg', name);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        e.setAttribute(k, attrs[k]);
      });
    }
    if (text != null) e.textContent = text;
    return e;
  }

  function previewRecord(nodeId) {
    var f = window.flow;
    if (!f || !f.previews) return null;
    return f.previews['node:' + nodeId] || f.previews[nodeId] || null;
  }

  function hasPreview(nodeId) {
    var p = previewRecord(nodeId);
    if (!p) return false;
    return !!(
      (p.html && String(p.html).trim()) ||
      p.imageUrl ||
      p.storageId ||
      p.mode
    );
  }

  function selectNode(nodeId) {
    var sel = { kind: 'node', id: nodeId };
    window.selected = sel;
    try {
      selected = sel;
    } catch (e) {}
    return sel;
  }

  function openPreviewForNode(nodeId) {
    selectNode(nodeId);
    var f = window.flow;
    var k = 'node:' + nodeId;
    var p =
      f && f.previews
        ? f.previews[k] || f.previews[nodeId] || null
        : null;

    var html = (p && p.html) || '';
    var imgUrl = (p && (p.imageUrl || '')) || '';

    var overlay = document.getElementById('previewViewOverlay');
    if (overlay) overlay.remove();

    overlay = document.createElement('div');
    overlay.id = 'previewViewOverlay';
    overlay.style.cssText =
      'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;padding:16px';
    overlay.innerHTML =
      '<div style="background:#fff;border-radius:12px;width:min(960px,100%);height:min(90vh,800px);display:flex;flex-direction:column;overflow:hidden">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;border-bottom:1px solid #e2e8f0">' +
      '<strong>Preview</strong>' +
      '<span><button type="button" id="pvFull" class="btn">Tela cheia</button> ' +
      '<button type="button" id="pvClose" class="btn">×</button></span></div>' +
      '<div id="pvBody" style="flex:1;overflow:auto;background:#f8fafc"></div></div>';
    document.body.appendChild(overlay);
    overlay.querySelector('#pvClose').onclick = function () {
      overlay.remove();
    };
    overlay.querySelector('#pvFull').onclick = function () {
      var body = document.getElementById('pvBody');
      if (body && body.requestFullscreen) body.requestFullscreen();
    };
    overlay.addEventListener('click', function (ev) {
      if (ev.target === overlay) overlay.remove();
    });

    var body = document.getElementById('pvBody');
    if (!body) return;

    if (html && String(html).trim()) {
      body.innerHTML =
        '<iframe sandbox="allow-scripts allow-same-origin" style="width:100%;height:100%;border:0"></iframe>';
      var iframe = body.querySelector('iframe');
      iframe.srcdoc = html;
    } else if (imgUrl) {
      body.innerHTML =
        '<img src="' +
        imgUrl +
        '" alt="preview" style="max-width:100%;max-height:100%;display:block;margin:auto" />';
    } else {
      body.innerHTML =
        '<p style="padding:24px;color:#64748b">Nenhum preview neste bloco.</p>';
    }
  }

  function addPreviewIcons() {
    var svg = $('canvas');
    var f = window.flow;
    if (!svg || !f) return;

    svg.querySelectorAll('g.preview-btn').forEach(function (e) {
      e.remove();
    });

    var nodes = f.nodes || [];
    var groups = svg.querySelectorAll('g.node');

    function findGroupForNode(n) {
      var tx = 'translate(' + n.x + ',' + n.y + ')';
      for (var i = 0; i < groups.length; i++) {
        var t = groups[i].getAttribute('transform') || '';
        if (t.replace(/\s/g, '') === tx.replace(/\s/g, '')) return groups[i];
      }
      return null;
    }

    nodes.forEach(function (n, i) {
      if (!n || !n.id) return;
      var g = findGroupForNode(n) || groups[i];
      if (!g) return;

      var active = hasPreview(n.id);
      var pg = elNS('g', {
        class: 'preview-btn',
        'data-node-id': String(n.id),
        transform: 'translate(' + (n.w - 28) + ',-2)',
      });
      pg.appendChild(
        elNS('circle', {
          cx: '0',
          cy: '0',
          r: '10',
          fill: active ? '#e0f2fe' : '#fff',
          stroke: active ? '#0284c7' : '#64748b',
          'stroke-width': '1.5',
        })
      );
      pg.appendChild(
        elNS(
          'text',
          {
            x: '0',
            y: '4',
            'text-anchor': 'middle',
            'font-size': '11',
          },
          '👁'
        )
      );

      (function (nodeId) {
        pg.addEventListener('mousedown', function (ev) {
          ev.stopPropagation();
          ev.preventDefault();
          openPreviewForNode(nodeId);
        });
        pg.addEventListener('click', function (ev) {
          ev.stopPropagation();
          ev.preventDefault();
        });
      })(n.id);

      g.appendChild(pg);
    });
  }

  function afterRender() {
    ensureScrollCss();
    sizeCanvasToContent();
    addPreviewIcons();
  }

  function hookRender() {
    if (typeof window.render !== 'function') return false;
    if (window.render.__previewScrollHooked) return true;
    var inner = window.render;
    window.render = function () {
      var r = inner.apply(this, arguments);
      try {
        afterRender();
      } catch (e) {
        console.warn('[Fluxora] board-scroll-preview', e);
      }
      return r;
    };
    window.render.__previewScrollHooked = true;
    return true;
  }

  function hookLoadFlow() {
    if (typeof window.loadFlow !== 'function') return;
    if (window.loadFlow.__previewEyeHooked) return;
    var inner = window.loadFlow;
    window.loadFlow = async function () {
      var r = await inner.apply(this, arguments);
      try {
        if (typeof window.render === 'function') window.render();
        else afterRender();
      } catch (e) {
        console.warn('[Fluxora] preview after loadFlow', e);
      }
      return r;
    };
    window.loadFlow.__previewEyeHooked = true;
  }

  window.openPreviewForNode = openPreviewForNode;
  window.refreshPreviewIcons = addPreviewIcons;

  function boot() {
    ensureScrollCss();
    if (!hookRender()) {
      setTimeout(boot, 200);
      return;
    }
    hookLoadFlow();
    afterRender();
    console.log('[Fluxora] board-scroll-preview v3 (per-node eye)');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
  setTimeout(boot, 600);
  setTimeout(hookLoadFlow, 900);
})();
