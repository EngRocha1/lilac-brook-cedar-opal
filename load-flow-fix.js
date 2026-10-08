/* loadFlow secured: requesterEmail + no foreign localStorage fallback */
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

    /* Refuse default third-party key when user is not owner */
    var email = emailOf();
    if (key === 'hemopi-main' && email && email !== 'tarcisio.rocha.engenheiro@gmail.com') {
      /* Will be replaced by enterApp isolation; still blank for safety */
      console.warn('[loadFlow] blocking hemopi-main for non-owner', email);
      key = null;
    }

    if (!key || String(key).indexOf('local-') === 0) {
      var blank = emptyFlow();
      try {
        flow = blank;
      } catch (e) {
        window.flow = blank;
      }
      window.flow = blank;
      return blank;
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
        console.warn('[loadFlow] access denied or missing for', key);
      } catch (err) {
        console.error('[loadFlow]', err);
      }
    }

    /* No access → blank canvas (never localStorage of another project) */
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
