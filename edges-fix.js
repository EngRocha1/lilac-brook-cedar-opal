/* Edges interaction restore — hit area + click opens modal + drag reconnect */
(function () {
  function $(id) {
    return document.getElementById(id);
  }

  if (!document.getElementById('edges-hit-css')) {
    var st = document.createElement('style');
    st.id = 'edges-hit-css';
    st.textContent =
      '#canvas path.edge-hit{' +
      'fill:none!important;' +
      'stroke:rgba(26,95,138,0.001)!important;' +
      'stroke-width:22!important;' +
      'pointer-events:stroke!important;' +
      'cursor:pointer;' +
      '}' +
      '#canvas path.edge{' +
      'pointer-events:none!important;' +
      '}' +
      '#canvas .port-dot.port-hot{' +
      'fill:#22c55e!important;' +
      'stroke:#14532d!important;' +
      'r:7;' +
      '}';
    document.head.appendChild(st);
  }

  var down = null;

  function edgeIdFromTarget(t) {
    if (!t) return null;
    var g = t.closest ? t.closest('g') : null;
    if (!g) return null;
    /* editor renders edge group; id may be on data attribute or we resolve via pick */
    var paths = g.querySelectorAll('path.edge-hit, path.edge');
    if (!paths.length) return null;
    /* Walk flow.edges matching path d is fragile — use selected set by editor/seb */
    return null;
  }

  function clientToSvg(clientX, clientY) {
    var svg = $('canvas');
    if (!svg) return { x: 0, y: 0 };
    var pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    var ctm = svg.getScreenCTM();
    if (!ctm) return { x: clientX, y: clientY };
    var p = pt.matrixTransform(ctm.inverse());
    return { x: p.x, y: p.y };
  }

  function distPointSeg(px, py, x1, y1, x2, y2) {
    var dx = x2 - x1,
      dy = y2 - y1;
    var len2 = dx * dx + dy * dy;
    if (len2 < 1e-6) return Math.hypot(px - x1, py - y1);
    var t = ((px - x1) * dx + (py - y1) * dy) / len2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
  }

  function nodeById(id) {
    if (typeof nodeById === 'function' && window.nodeById !== nodeById) {
      /* avoid recursion */
    }
    if (typeof flow === 'undefined' || !flow) return null;
    return (flow.nodes || []).find(function (n) {
      return n.id === id;
    });
  }

  function edgeEndpoints(e) {
    var a = (flow.nodes || []).find(function (n) {
      return n.id === e.from;
    });
    var b = (flow.nodes || []).find(function (n) {
      return n.id === e.to;
    });
    if (!a || !b) return null;
    var p0, p1;
    if (typeof pathForEdge === 'function' && typeof window.attachPoint === 'function') {
      /* optional */
    }
    p0 = { x: a.x + a.w / 2, y: a.y + a.h / 2 };
    p1 = { x: b.x + b.w / 2, y: b.y + b.h / 2 };
    if (typeof window.pathForEdge === 'function') {
      /* centers ok for proximity ranking */
    }
    return { p0: p0, p1: p1, a: a, b: b };
  }

  function pickEdgeNear(px, py) {
    if (typeof flow === 'undefined' || !flow) return null;
    var best = null;
    var bestD = 16;
    (flow.edges || []).forEach(function (e) {
      var ep = edgeEndpoints(e);
      if (!ep) return;
      var d = distPointSeg(px, py, ep.p0.x, ep.p0.y, ep.p1.x, ep.p1.y);
      var d0 = Math.hypot(ep.p0.x - px, ep.p0.y - py);
      var d1 = Math.hypot(ep.p1.x - px, ep.p1.y - py);
      var dEnd = Math.min(d0, d1);
      if (d < bestD || dEnd < 28) {
        if (d < bestD || (best && dEnd < best.dEnd)) {
          bestD = Math.min(bestD, d);
          best = {
            e: e,
            which: d0 <= d1 ? 'from' : 'to',
            dPath: d,
            dEnd: dEnd,
            p0: ep.p0,
            p1: ep.p1,
          };
        }
      }
    });
    return best;
  }

  function isEdgeTarget(t) {
    return (
      t &&
      t.classList &&
      (t.classList.contains('edge-hit') || t.classList.contains('edge'))
    );
  }

  document.addEventListener(
    'mousedown',
    function (ev) {
      if (ev.button !== 0) return;
      if (window.HEMOPI_SHARE_MODE === 'guest') return;
      if (typeof flow === 'undefined' || !flow) return;
      var t = ev.target;
      var p = clientToSvg(ev.clientX, ev.clientY);
      var pick = null;
      if (isEdgeTarget(t)) {
        pick = pickEdgeNear(p.x, p.y);
      } else if (t && (t.id === 'canvas' || (t.closest && t.closest('#canvas')))) {
        /* proximity even if thin stroke misses */
        pick = pickEdgeNear(p.x, p.y);
        if (pick && pick.dPath > 14 && pick.dEnd > 32) pick = null;
      }
      if (!pick) return;

      try {
        selected = { kind: 'edge', id: pick.e.id };
      } catch (err) {
        window.selected = { kind: 'edge', id: pick.e.id };
      }

      down = {
        edgeId: pick.e.id,
        which: pick.which,
        sx: ev.clientX,
        sy: ev.clientY,
        moved: false,
        p0: pick.p0,
        p1: pick.p1,
      };

      /* Let shapes-edges-busbar also start reconnect; we only track click vs drag */
    },
    true
  );

  window.addEventListener(
    'mousemove',
    function (ev) {
      if (!down) return;
      if (Math.hypot(ev.clientX - down.sx, ev.clientY - down.sy) > 6) {
        down.moved = true;
      }
    },
    true
  );

  window.addEventListener(
    'mouseup',
    function (ev) {
      if (!down) return;
      var info = down;
      down = null;
      if (info.moved) return; /* reconnect handled by shapes-edges-busbar */
      try {
        selected = { kind: 'edge', id: info.edgeId };
        window.selected = selected;
      } catch (err) {
        window.selected = { kind: 'edge', id: info.edgeId };
      }
      if (typeof openModal === 'function') {
        try {
          openModal();
        } catch (e) {
          console.error(e);
        }
      }
      var bg = $('modalBg');
      if (bg && !bg.classList.contains('open')) bg.classList.add('open');
    },
    true
  );

  console.log('[Fluxora] edges-fix ready (hit + modal on click)');
})();
