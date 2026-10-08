/* Edges interaction restore — hit area + click opens modal; drag keeps reconnect */
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
      '#canvas path.edge{pointer-events:none!important}';
    document.head.appendChild(st);
  }

  var down = null;

  function isEdgeTarget(t) {
    return (
      t &&
      t.classList &&
      (t.classList.contains('edge-hit') || t.classList.contains('edge'))
    );
  }

  function edgeIdFromHitTarget(t) {
    if (typeof flow === 'undefined' || !flow || !flow.edges) return null;
    var svg = $('canvas');
    if (!svg) return null;
    var hits = svg.querySelectorAll('path.edge-hit');
    for (var i = 0; i < hits.length; i++) {
      if (hits[i] === t && flow.edges[i]) return flow.edges[i].id;
    }
    /* edge path sibling */
    if (t.classList.contains('edge')) {
      var edges = svg.querySelectorAll('path.edge');
      for (var j = 0; j < edges.length; j++) {
        if (edges[j] === t && flow.edges[j]) return flow.edges[j].id;
      }
    }
    return null;
  }

  document.addEventListener(
    'mousedown',
    function (ev) {
      if (ev.button !== 0) return;
      if (window.HEMOPI_SHARE_MODE === 'guest') return;
      if (typeof flow === 'undefined' || !flow) return;
      var t = ev.target;
      if (!isEdgeTarget(t)) return;

      var edgeId = edgeIdFromHitTarget(t);
      try {
        if (!edgeId && selected && selected.kind === 'edge') edgeId = selected.id;
      } catch (e) {}

      down = {
        edgeId: edgeId,
        sx: ev.clientX,
        sy: ev.clientY,
        moved: false,
      };

      if (edgeId) {
        try {
          selected = { kind: 'edge', id: edgeId };
          window.selected = selected;
        } catch (err) {
          window.selected = { kind: 'edge', id: edgeId };
        }
      }
    },
    true
  );

  window.addEventListener(
    'mousemove',
    function (ev) {
      if (!down) return;
      if (Math.hypot(ev.clientX - down.sx, ev.clientY - down.sy) > 6) down.moved = true;
    },
    true
  );

  /* Must load BEFORE shapes-edges-busbar so this capture runs first */
  window.addEventListener(
    'mouseup',
    function (ev) {
      if (!down) return;
      var info = down;
      down = null;

      if (info.moved) return;

      try {
        window.__sebDrag = null;
        window.drag = null;
        if (typeof drag !== 'undefined') drag = null;
      } catch (e) {}

      var edgeId = info.edgeId;
      try {
        if (!edgeId && selected && selected.kind === 'edge') edgeId = selected.id;
      } catch (e2) {}
      if (!edgeId) return;

      try {
        selected = { kind: 'edge', id: edgeId };
        window.selected = selected;
      } catch (e3) {
        window.selected = { kind: 'edge', id: edgeId };
      }

      if (typeof openModal === 'function') {
        try {
          openModal();
        } catch (err) {
          console.error(err);
        }
      }
      var bg = $('modalBg');
      if (bg) bg.classList.add('open');
    },
    true
  );

  console.log('[Fluxora] edges-fix ready');
})();
