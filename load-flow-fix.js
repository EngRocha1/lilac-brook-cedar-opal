/* loadFlow: accept empty Convex docs — never replace with HEMOPI default silently */
(function () {
  function emptyFlow(title) {
    return {
      macros: [],
      nodes: [],
      edges: [],
      votes: {},
      comments: {},
      header: title ? { projectName: title } : {},
    };
  }

  function ensureShape(f) {
    if (!f || typeof f !== 'object') f = emptyFlow();
    if (!f.macros) f.macros = [];
    if (!f.nodes) f.nodes = [];
    if (!f.edges) f.edges = [];
    if (!f.votes) f.votes = {};
    if (!f.comments) f.comments = {};
    return f;
  }

  window.loadFlow = async function loadFlowFixed() {
    var key =
      window.flowKey ||
      (typeof flowKey !== 'undefined' ? flowKey : null) ||
      localStorage.getItem('hemopi_flow_key') ||
      'hemopi-main';
    try {
      flowKey = key;
    } catch (e) {}
    window.flowKey = key;

    var cx = window.convexClient;
    if (cx) {
      try {
        var remote = await cx.query('flows:get', { key: key });
        if (remote && remote.data != null) {
          var f = ensureShape(remote.data);
          try {
            flow = f;
          } catch (e2) {
            window.flow = f;
          }
          try {
            flowTitle = remote.title || key;
          } catch (e3) {
            window.flowTitle = remote.title || key;
          }
          try {
            localStorage.setItem('hemopi_editor_v1', JSON.stringify(f));
          } catch (e4) {}
          return f;
        }
      } catch (err) {
        console.error('[loadFlow]', err);
      }
    }

    /* No remote row: empty canvas (do NOT inject DEFAULT_FLOW / HEMOPI) */
    var blank = emptyFlow();
    try {
      flow = blank;
    } catch (e5) {
      window.flow = blank;
    }
    return blank;
  };

  console.log('[Fluxora] load-flow-fix ready');
})();
