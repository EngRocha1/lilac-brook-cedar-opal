/* Board zoom: fit · controls fixed on workspace · marquee · FS */
(function () {
  function $(id) { return document.getElementById(id); }
  var VP = { scale: 1, panX: 0, panY: 0, fittedOnce: false, anim: null };
  window.__BOARD_VP = VP;

  if (!document.getElementById('board-vp-css')) {
    var st = document.createElement('style');
    st.id = 'board-vp-css';
    st.textContent =
      '.workspace{position:relative!important;min-height:0;}' +
      '.canvas-wrap{position:relative!important;overflow:auto!important;background:#f1f5f9;flex:1 1 auto;min-height:0;min-width:0;}' +
      '.canvas-wrap #canvas{transform-origin:0 0;display:block;}' +
      '.canvas-wrap.vp-animating #canvas{transition:transform .28s ease-out;}' +
      /* Zoom controls FIXED over board — do not scroll with content */
      '.workspace > .vp-controls{position:absolute!important;top:10px;right:10px;z-index:50;display:flex;gap:6px;pointer-events:auto;}' +
      '.vp-controls button{border:1px solid #cbd5e1;background:#fff;border-radius:10px;padding:8px 10px;font-weight:700;cursor:pointer;min-width:40px;box-shadow:0 1px 3px rgba(15,23,42,.08);}' +
      '.vp-controls button.active{background:#0f172a;color:#fff;}' +
      '.vp-marquee{position:absolute;pointer-events:none;z-index:35;border:1.5px dashed #64748b;background:rgba(100,116,139,.18);}' +
      'body.board-max .hero,body.board-max .presence-bar,body.board-max .project-header,body.board-max .share-panel,body.board-max #sealBox,body.board-max .toolbar .prog-wrap,body.board-max .status-strip,body.board-max .board-toolbar{display:none!important}' +
      'body.board-max .app{position:fixed;inset:0;z-index:9000;background:#fff}' +
      'body.board-max .workspace{flex:1;height:calc(100vh - 48px)}' +
      'body.board-max .canvas-wrap{height:100%}' +
      'body.board-max .modal-bg{z-index:10000!important}';
    document.head.appendChild(st);
  }

  function wrapEl() { return document.querySelector('.canvas-wrap'); }
  function stageEl() {
    return document.querySelector('.workspace') || wrapEl();
  }
  function svgEl() { return $('canvas'); }

  function applyTransform(animate) {
    var svg = svgEl(), wrap = wrapEl();
    if (!svg || !wrap) return;
    if (animate) wrap.classList.add('vp-animating'); else wrap.classList.remove('vp-animating');
    svg.style.transform = 'translate(' + VP.panX + 'px,' + VP.panY + 'px) scale(' + VP.scale + ')';
    if (animate) {
      clearTimeout(VP.anim);
      VP.anim = setTimeout(function () { wrap.classList.remove('vp-animating'); }, 300);
    }
  }

  function contentBounds() {
    if (typeof flow === 'undefined' || !flow) return { x: 0, y: 0, w: 800, h: 600 };
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    function hit(x, y, w, h) {
      minX = Math.min(minX, x); minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + w); maxY = Math.max(maxY, y + h);
    }
    (flow.macros || []).forEach(function (m) { hit(m.x, m.y, m.w, m.h); });
    (flow.nodes || []).forEach(function (n) { hit(n.x, n.y, n.w, n.h); });
    if (!isFinite(minX)) return { x: 0, y: 0, w: 800, h: 600 };
    return { x: minX, y: minY, w: Math.max(80, maxX - minX), h: Math.max(80, maxY - minY) };
  }

  function fitBoardToScreen(animate) {
    var wrap = wrapEl(); if (!wrap) return;
    var bb = contentBounds(), pad = 48;
    var ww = wrap.clientWidth || 800, wh = wrap.clientHeight || 600;
    var scale = Math.min(
      (ww - pad * 2) / Math.max(bb.w, 1),
      (wh - pad * 2) / Math.max(bb.h, 1),
      1.5
    );
    scale = Math.max(0.15, scale);
    VP.scale = scale;
    VP.panX = (ww - bb.w * scale) / 2 - bb.x * scale;
    VP.panY = (wh - bb.h * scale) / 2 - bb.y * scale;
    applyTransform(!!animate);
  }

  function fitRect(rx, ry, rw, rh, animate) {
    var wrap = wrapEl(); if (!wrap) return;
    var pad = 32;
    var ww = wrap.clientWidth || 800, wh = wrap.clientHeight || 600;
    var scale = Math.min(
      (ww - pad * 2) / Math.max(rw, 1),
      (wh - pad * 2) / Math.max(rh, 1),
      2
    );
    scale = Math.max(0.15, scale);
    VP.scale = scale;
    VP.panX = (ww - rw * scale) / 2 - rx * scale;
    VP.panY = (wh - rh * scale) / 2 - ry * scale;
    applyTransform(!!animate);
  }

  function zoomBy(factor) {
    var wrap = wrapEl(); if (!wrap) return;
    var rect = wrap.getBoundingClientRect();
    var cx = rect.width / 2, cy = rect.height / 2;
    var prev = VP.scale;
    VP.scale = Math.min(3, Math.max(0.12, VP.scale * factor));
    var r = VP.scale / prev;
    VP.panX = cx - (cx - VP.panX) * r;
    VP.panY = cy - (cy - VP.panY) * r;
    applyTransform(false);
  }

  function ensureControls() {
    var stage = stageEl();
    var wrap = wrapEl();
    if (!stage || !wrap) return;

    var box = document.querySelector('.vp-controls');
    if (!box) {
      box = document.createElement('div');
      box.className = 'vp-controls';
      box.innerHTML =
        '<button type="button" data-vp="fit" title="Ajustar à tela">⊡</button>' +
        '<button type="button" data-vp="in" title="Zoom +">+</button>' +
        '<button type="button" data-vp="out" title="Zoom −">−</button>' +
        '<button type="button" data-vp="fs" title="Tela cheia">⛶</button>';
      box.addEventListener('click', function (ev) {
        var btn = ev.target.closest('button[data-vp]');
        if (!btn) return;
        var a = btn.getAttribute('data-vp');
        if (a === 'fit') fitBoardToScreen(true);
        else if (a === 'in') zoomBy(1.2);
        else if (a === 'out') zoomBy(1 / 1.2);
        else if (a === 'fs') {
          document.body.classList.toggle('board-max');
          setTimeout(function () { fitBoardToScreen(true); }, 50);
        }
      });
    }
    /* Always host controls on workspace so they do NOT scroll with board */
    if (box.parentNode !== stage) {
      stage.appendChild(box);
    }
  }

  function bindMarquee() {
    var wrap = wrapEl();
    if (!wrap || wrap.__vpMarquee) return;
    wrap.__vpMarquee = true;
    var start = null, rectEl = null;
    wrap.addEventListener('mousedown', function (ev) {
      if (ev.button !== 0) return;
      var t = ev.target;
      if (t.closest && t.closest('.vp-controls')) return;
      if (t.closest && (t.closest('g.node') || t.closest('g.comment-btn') || t.closest('g.preview-btn') || t.closest('.macro-box'))) return;
      if (t.tagName === 'svg' || t.classList && t.classList.contains('canvas-wrap') || t.id === 'canvas') {
        start = { x: ev.clientX, y: ev.clientY };
        rectEl = document.createElement('div');
        rectEl.className = 'vp-marquee';
        wrap.appendChild(rectEl);
        ev.preventDefault();
      }
    });
    window.addEventListener('mousemove', function (ev) {
      if (!start || !rectEl) return;
      var wrapR = wrap.getBoundingClientRect();
      var x1 = Math.min(start.x, ev.clientX) - wrapR.left;
      var y1 = Math.min(start.y, ev.clientY) - wrapR.top;
      var x2 = Math.max(start.x, ev.clientX) - wrapR.left;
      var y2 = Math.max(start.y, ev.clientY) - wrapR.top;
      rectEl.style.left = x1 + 'px';
      rectEl.style.top = y1 + 'px';
      rectEl.style.width = (x2 - x1) + 'px';
      rectEl.style.height = (y2 - y1) + 'px';
    });
    window.addEventListener('mouseup', function (ev) {
      if (!start || !rectEl) return;
      var wrapR = wrap.getBoundingClientRect();
      var left = parseFloat(rectEl.style.left) || 0;
      var top = parseFloat(rectEl.style.top) || 0;
      var w = parseFloat(rectEl.style.width) || 0;
      var h = parseFloat(rectEl.style.height) || 0;
      rectEl.remove();
      rectEl = null;
      var s = start;
      start = null;
      if (w < 12 || h < 12) return;
      fitRect(
        (left - VP.panX) / VP.scale,
        (top - VP.panY) / VP.scale,
        w / VP.scale,
        h / VP.scale,
        true
      );
    });
  }

  function boot() {
    ensureControls();
    bindMarquee();
    if (!VP.fittedOnce) {
      VP.fittedOnce = true;
      setTimeout(function () { fitBoardToScreen(false); }, 100);
    }
    window.fitBoardToScreen = fitBoardToScreen;
    window.boardZoomBy = zoomBy;
    console.log('[Fluxora] board-viewport zoom restored');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else boot();
  setTimeout(boot, 400);
  setTimeout(ensureControls, 800);
})();
