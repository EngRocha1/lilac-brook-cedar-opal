/* Board zoom: fit · controls · marquee · FS · v-restore-zoom */
(function () {
  function $(id) { return document.getElementById(id); }
  var VP = { scale: 1, panX: 0, panY: 0, fittedOnce: false, anim: null };
  window.__BOARD_VP = VP;

  if (!document.getElementById('board-vp-css')) {
    var st = document.createElement('style');
    st.id = 'board-vp-css';
    st.textContent =
      '.canvas-wrap{position:relative!important;overflow:hidden!important;background:#f1f5f9;}' +
      '.canvas-wrap #canvas{transform-origin:0 0;display:block;}' +
      '.canvas-wrap.vp-animating #canvas{transition:transform .28s ease-out;}' +
      '.vp-controls{position:absolute;top:10px;right:10px;z-index:40;display:flex;gap:6px;}' +
      '.vp-controls button{border:1px solid #cbd5e1;background:#fff;border-radius:10px;padding:8px 10px;font-weight:700;cursor:pointer;min-width:40px;}' +
      '.vp-controls button.active{background:#0f172a;color:#fff;}' +
      '.vp-marquee{position:absolute;pointer-events:none;z-index:35;border:1.5px dashed #64748b;background:rgba(100,116,139,.18);}' +
      'body.board-max .hero,body.board-max .presence-bar,body.board-max .project-header,body.board-max .share-panel,body.board-max #sealBox,body.board-max .toolbar .prog-wrap{display:none!important}' +
      'body.board-max .app{position:fixed;inset:0;z-index:9000;background:#fff}' +
      'body.board-max .workspace{flex:1;height:calc(100vh - 48px)}' +
      'body.board-max .canvas-wrap{height:100%}' +
      'body.board-max .modal-bg{z-index:10000!important}';
    document.head.appendChild(st);
  }

  function wrapEl() { return document.querySelector('.canvas-wrap'); }
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
    var scale = Math.min((ww - pad * 2) / bb.w, (wh - pad * 2) / bb.h, 1.25);
    if (scale < 0.15) scale = 0.15;
    VP.scale = scale;
    VP.panX = (ww - bb.w * scale) / 2 - bb.x * scale;
    VP.panY = (wh - bb.h * scale) / 2 - bb.y * scale;
    applyTransform(!!animate);
    VP.fittedOnce = true;
  }
  window.fitBoardToScreen = fitBoardToScreen;

  function fitRect(rx, ry, rw, rh, animate) {
    var wrap = wrapEl(); if (!wrap || rw < 8 || rh < 8) return;
    var pad = 24, ww = wrap.clientWidth || 800, wh = wrap.clientHeight || 600;
    var scale = Math.min((ww - pad * 2) / rw, (wh - pad * 2) / rh, 2.5);
    if (scale < 0.2) scale = 0.2;
    VP.scale = scale;
    VP.panX = (ww - rw * scale) / 2 - rx * scale;
    VP.panY = (wh - rh * scale) / 2 - ry * scale;
    applyTransform(!!animate);
  }

  function ensureControls() {
    var wrap = wrapEl(); if (!wrap) return;
    var box = wrap.querySelector('.vp-controls');
    if (!box) {
      box = document.createElement('div');
      box.className = 'vp-controls';
      box.innerHTML = '<button type="button" id="btnVpFit" title="Zoom total">⬚</button><button type="button" id="btnVpFs" title="Tela cheia">⛶</button>';
      wrap.appendChild(box);
    }
    var fit = $('btnVpFit'), fs = $('btnVpFs');
    if (fit) fit.onclick = function (ev) { ev.preventDefault(); fitBoardToScreen(true); };
    if (fs) fs.onclick = function (ev) {
      ev.preventDefault();
      var on = !document.body.classList.contains('board-max');
      document.body.classList.toggle('board-max', on);
      fs.classList.toggle('active', on);
      setTimeout(function () { fitBoardToScreen(true); }, 80);
    };
  }

  var marquee = null;
  function clearMarquee() {
    if (marquee && marquee.el && marquee.el.parentNode) marquee.el.parentNode.removeChild(marquee.el);
    marquee = null;
  }

  function wireMarquee() {
    var wrap = wrapEl();
    if (!wrap || wrap.dataset.vpMarquee === '1') return;
    wrap.dataset.vpMarquee = '1';
    wrap.addEventListener('mousedown', function (ev) {
      if (ev.button !== 0) return;
      if (typeof drag !== 'undefined' && drag) return;
      if (window.__sebDrag) return;
      var t = ev.target;
      if (t.closest && t.closest('.vp-controls')) return;
      var tag = (t.tagName || '').toLowerCase();
      if (t.id !== 'canvas' && tag !== 'svg') {
        if (!t.classList || !t.classList.contains('canvas-wrap')) return;
      }
      if (tag === 'text' || tag === 'path' || tag === 'circle') {
        if (t.id !== 'canvas') return;
      }
      var r = wrap.getBoundingClientRect();
      var x0 = ev.clientX - r.left, y0 = ev.clientY - r.top;
      clearMarquee();
      var el = document.createElement('div');
      el.className = 'vp-marquee';
      el.style.cssText = 'left:' + x0 + 'px;top:' + y0 + 'px;width:0;height:0';
      wrap.appendChild(el);
      marquee = { el: el, x0: x0, y0: y0 };
      ev.preventDefault();
    });
    window.addEventListener('mousemove', function (ev) {
      if (!marquee) return;
      var wrap = wrapEl(); if (!wrap) return;
      var r = wrap.getBoundingClientRect();
      var x1 = ev.clientX - r.left, y1 = ev.clientY - r.top;
      marquee.el.style.left = Math.min(marquee.x0, x1) + 'px';
      marquee.el.style.top = Math.min(marquee.y0, y1) + 'px';
      marquee.el.style.width = Math.abs(x1 - marquee.x0) + 'px';
      marquee.el.style.height = Math.abs(y1 - marquee.y0) + 'px';
    });
    window.addEventListener('mouseup', function () {
      if (!marquee) return;
      var el = marquee.el;
      var w = parseFloat(el.style.width) || 0, h = parseFloat(el.style.height) || 0;
      var left = parseFloat(el.style.left) || 0, top = parseFloat(el.style.top) || 0;
      clearMarquee();
      if (w < 20 || h < 20) return;
      fitRect((left - VP.panX) / VP.scale, (top - VP.panY) / VP.scale, w / VP.scale, h / VP.scale, true);
    });
  }

  var prevMove = window.onMove;
  window.onMove = function (ev) {
    if (typeof drag !== 'undefined' && drag && (drag.type === 'node' || drag.type === 'macro') && VP.scale !== 1 && typeof flow !== 'undefined' && flow) {
      var s = VP.scale || 1;
      var dx = (ev.clientX - drag.sx) / s, dy = (ev.clientY - drag.sy) / s;
      if (drag.type === 'node') {
        var n = typeof nodeById === 'function' ? nodeById(drag.id) : null;
        if (n) { n.x = drag.ox + dx; n.y = drag.oy + dy; if (typeof render === 'function') render(); }
        return;
      }
      if (drag.type === 'macro') {
        var m = typeof macroById === 'function' ? macroById(drag.id) : null;
        if (m) {
          var nx = drag.ox + dx, ny = drag.oy + dy;
          var pdx = nx - (drag._lastX != null ? drag._lastX : drag.ox);
          var pdy = ny - (drag._lastY != null ? drag._lastY : drag.oy);
          m.x = nx; m.y = ny;
          (flow.nodes || []).forEach(function (n) { if (n.macro === m.id) { n.x += pdx; n.y += pdy; } });
          drag._lastX = nx; drag._lastY = ny;
          if (typeof render === 'function') render();
        }
        return;
      }
    }
    if (typeof prevMove === 'function') return prevMove(ev);
  };

  var prevRender = window.render;
  window.render = function () {
    if (typeof prevRender === 'function') prevRender.apply(this, arguments);
    applyTransform(false);
    ensureControls();
    if (!VP.fittedOnce) requestAnimationFrame(function () { fitBoardToScreen(false); });
  };

  function boot() {
    ensureControls();
    wireMarquee();
    if (typeof flow !== 'undefined' && flow && ((flow.nodes || []).length || (flow.macros || []).length)) fitBoardToScreen(false);
  }
  boot();
  setTimeout(boot, 400);
  setTimeout(boot, 1200);
  window.addEventListener('resize', function () { if (VP.fittedOnce) fitBoardToScreen(false); });
  console.log('[Fluxora] board-viewport zoom restored');
})();
