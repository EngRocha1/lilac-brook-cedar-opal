/* loadFlow with requesterEmail — no cross-tenant leak; empty canvas if denied */
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

  function emailOf() {
    try {
      return ((window.user || user || {}).email || '').toLowerCase().trim();
    } catch (e) {
      return '';
    }
  }

  window.loadFlow = async function loadFlowFixed() {
    var key =
      window.flowKey ||
      (typeof flowKey !== 'undefined' ? flowKey : null) ||
      localStorage.getItem('hemopi_flow_key');
    if (!key) {
      var blank = emptyFlow();
      try {
        flow = blank;
      } catch (e) {
        window.flow = blank;
      }
      return blank;
    }
    try {
      flowKey = key;
    } catch (e) {}
    window.flowKey = key;

    var client = window.convexClient;
    var email = emailOf();
    var token = window.HEMOPI_SHARE_TOKEN || null;

    if (client) {
      try {
        var remote = await client.query('flows:get', {
          key: key,
          requesterEmail: email || undefined,
          shareToken: token || undefined,
        });
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
        /* Denied or missing — blank, do not fall back to another user's local cache of HEMOPI */
        console.warn('[loadFlow] access denied or missing for', key);
      } catch (err) {
        console.error('[loadFlow]', err);
      }
    }

    var blank2 = emptyFlow();
    try {
      flow = blank2;
    } catch (e5) {
      window.flow = blank2;
    }
    window.flow = blank2;
    if (typeof markFlowClean === 'function') markFlowClean();
    return blank2;
  };

  console.log('[Fluxora] load-flow-fix secured');
})();
