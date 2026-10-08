/**
 * Secured loadFlow — preserves previews/comments/votes from Convex.
 */
(function () {
  function emptyFlow() {
    return {
      macros: [],
      nodes: [],
      edges: [],
      votes: {},
      comments: {},
      previews: {},
      header: {},
    };
  }

  function ensure(f) {
    if (!f || typeof f !== 'object') f = emptyFlow();
    if (!f.macros) f.macros = [];
    if (!f.nodes) f.nodes = [];
    if (!f.edges) f.edges = [];
    if (!f.votes) f.votes = {};
    if (!f.comments) f.comments = {};
    if (!f.previews) f.previews = {};
    return f;
  }

  function emailOf() {
    try {
      return ((window.user || user || {}).email || '').toLowerCase().trim();
    } catch (e) {
      return '';
    }
  }

  function assignFlow(f) {
    f = ensure(f);
    try {
      flow = f;
    } catch (e) {}
    window.flow = f;
    return f;
  }

  window.loadFlow = async function loadFlowFixed() {
    var key =
      window.flowKey ||
      (typeof flowKey !== 'undefined' ? flowKey : null) ||
      localStorage.getItem('hemopi_flow_key');

    var email = emailOf();
    if (key === 'hemopi-main' && email && email !== 'tarcisio.rocha.engenheiro@gmail.com') {
      console.warn('[loadFlow] blocking hemopi-main for non-owner', email);
      key = null;
    }

    if (!key || String(key).indexOf('local-') === 0) {
      return assignFlow(emptyFlow());
    }

    try {
      flowKey = key;
    } catch (e) {}
    window.flowKey = key;

    var client = window.convexClient;
    var token = window.HEMOPI_SHARE_TOKEN || window._shareToken || null;

    if (client) {
      try {
        var remote = await client.query('flows:get', {
          key: key,
          requesterEmail: email || undefined,
          shareToken: token || undefined,
        });
        if (remote && remote.data != null) {
          var f = assignFlow(remote.data);
          var t = remote.title || key;
          try {
            flowTitle = t;
          } catch (e3) {}
          window.flowTitle = t;
          try {
            localStorage.setItem('hemopi_editor_v1', JSON.stringify(f));
          } catch (e4) {}
          if (typeof markFlowClean === 'function') markFlowClean();
          console.log(
            '[loadFlow] ok',
            key,
            'previews',
            Object.keys(f.previews || {}).length
          );
          return f;
        }
        console.warn('[loadFlow] access denied or missing for', key);
      } catch (err) {
        console.error('[loadFlow]', err);
      }
    }

    var blank2 = assignFlow(emptyFlow());
    if (typeof markFlowClean === 'function') markFlowClean();
    return blank2;
  };

  console.log('[Fluxora] load-flow-fix secured+previews');
})();
