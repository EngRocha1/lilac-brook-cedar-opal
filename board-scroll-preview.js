/**
 * Board XY scrollbars + preview icon on shapes.
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

  function hasPreview(nodeId) {
    var f = window.flow;
    if (!f || !f.previews) return false;
    var p = f.previews['node:' + nodeId] || f.previews[nodeId];
    if (!p) return false;
    return !!(p.html || p.imageUrl || p.storageId || p.mode);
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
    groups.forEach(function (g, i) {
      var n = nodes[i];
      if (!n) return;

      var active = hasPreview(n.id);
      var pg = elNS('g', {
        class: 'preview-btn',
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
      pg.addEventListener('mousedown', function (ev) {
        ev.stopPropagation();
        ev.preventDefault();
        window.selected = { kind: 'node', id: n.id };
        if (typeof window.openPreviewView === 'function') {
          window.openPreviewView();
        } else if (typeof window.openModal === 'function') {
          window.openModal();
        }
      });
      pg.addEventListener('click', function (ev) {
        ev.stopPropagation();
      });
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

  function boot() {
    ensureScrollCss();
    if (!hookRender()) {
      setTimeout(boot, 200);
      return;
    }
    afterRender();
    console.log('[Fluxora] board-scroll-preview ready');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
  setTimeout(boot, 600);
})();
