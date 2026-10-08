/* loadFlow: always accept Convex document (even empty) — never inject HEMOPI default */
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

  function ensure(f) {
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

    var client = window.convexClient;
    if (client) {
      try {
        var remote = await client.query('flows:get', { key: key });
        if (remote && remote.data != null) {
          var f = ensure(remote.data);
          try {
            flow = f;
          } catch (e2) {
            window.flow = f;
          }
          window.flow = f;
          var t = remote.title || key;
          try {
            flowTitle = t;
          } catch (e3) {
            window.flowTitle = t;
          }
          window.flowTitle = t;
          try {
            localStorage.setItem('hemopi_editor_v1', JSON.stringify(f));
          } catch (e4) {}
          if (typeof markFlowClean === 'function') markFlowClean();
          return f;
        }
      } catch (err) {
        console.error('[loadFlow]', err);
      }
    }

    var blank = emptyFlow();
    try {
      flow = blank;
    } catch (e5) {
      window.flow = blank;
    }
    window.flow = blank;
    if (typeof markFlowClean === 'function') markFlowClean();
    return blank;
  };

  console.log('[Fluxora] load-flow-fix v2');
})();
