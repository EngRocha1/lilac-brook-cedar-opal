/* After login/register: never show third-party flows; blank starter for new users */
(function () {
  function cx() {
    return window.convexClient || null;
  }

  function emailOf() {
    try {
      return ((window.user || user || {}).email || '').toLowerCase().trim();
    } catch (e) {
      return '';
    }
  }

  function nameOf() {
    try {
      return (window.user || user || {}).name || '';
    } catch (e) {
      return '';
    }
  }

  function blankFlow(title) {
    return {
      macros: [],
      nodes: [],
      edges: [],
      votes: {},
      comments: {},
      header: { projectName: title || '' },
    };
  }

  function applyBlank() {
    var f = blankFlow();
    try {
      flow = f;
    } catch (e) {
      window.flow = f;
    }
    window.flow = f;
    try {
      flowKey = '';
    } catch (e2) {}
    window.flowKey = '';
    try {
      flowTitle = '';
    } catch (e3) {}
    window.flowTitle = '';
    localStorage.removeItem('hemopi_flow_key');
    try {
      localStorage.setItem('hemopi_editor_v1', JSON.stringify(f));
    } catch (e4) {}
    if (typeof markFlowClean === 'function') markFlowClean();
    try {
      if (typeof render === 'function') render();
      if (typeof renderMacroBar === 'function') renderMacroBar();
    } catch (e5) {}
  }

  window.bootstrapUserWorkspace = async function () {
    var email = emailOf();
    if (!email || !cx()) {
      applyBlank();
      return;
    }

    /* Clear any previous session flow that might belong to someone else */
    applyBlank();

    try {
      var starter = await cx().mutation('flows:ensureStarter', {
        ownerEmail: email,
        name: nameOf() || email.split('@')[0],
      });
      if (starter && starter.key) {
        window.flowKey = starter.key;
        try {
          flowKey = starter.key;
        } catch (e) {}
        localStorage.setItem('hemopi_flow_key', starter.key);
        var title = nameOf() || email.split('@')[0] || 'Meu fluxo';
        try {
          flowTitle = title;
        } catch (e2) {
          window.flowTitle = title;
        }
        var empty = blankFlow(title);
        try {
          flow = empty;
        } catch (e3) {
          window.flow = empty;
        }
        window.flow = empty;
        if (typeof markFlowClean === 'function') markFlowClean();

        /* Load from server to be sure */
        try {
          var remote = await cx().query('flows:get', {
            key: starter.key,
            requesterEmail: email,
          });
          if (remote && remote.data) {
            try {
              flow = remote.data;
            } catch (e4) {
              window.flow = remote.data;
            }
            window.flow = remote.data;
            if (remote.title) {
              try {
                flowTitle = remote.title;
              } catch (e5) {
                window.flowTitle = remote.title;
              }
            }
          }
        } catch (e6) {
          console.warn(e6);
        }

        if (typeof render === 'function') render();
        if (typeof renderMacroBar === 'function') renderMacroBar();
        if (typeof renderProjectHeader === 'function') renderProjectHeader();
      }
    } catch (err) {
      console.warn('[bootstrap]', err);
      /* ensureStarter may not be deployed yet — create via flows:create */
      try {
        var title2 = nameOf() || email.split('@')[0] || 'Meu fluxo';
        var created = await cx().mutation('flows:create', {
          title: title2,
          ownerEmail: email,
          data: blankFlow(title2),
        });
        if (created && created.key) {
          window.flowKey = created.key;
          try {
            flowKey = created.key;
          } catch (e) {}
          localStorage.setItem('hemopi_flow_key', created.key);
          try {
            flowTitle = title2;
          } catch (e2) {
            window.flowTitle = title2;
          }
          var b = blankFlow(title2);
          try {
            flow = b;
          } catch (e3) {
            window.flow = b;
          }
          if (typeof render === 'function') render();
        }
      } catch (e7) {
        console.error(e7);
      }
    }
  };

  /* Hook register/login submit if present */
  function hookAuth() {
    var form = document.getElementById('authForm');
    if (!form || form.dataset.bootHooked === '1') return;
    form.dataset.bootHooked = '1';
    form.addEventListener(
      'submit',
      function () {
        setTimeout(function () {
          if (emailOf()) {
            window.bootstrapUserWorkspace();
          }
        }, 800);
      },
      true
    );
  }
  hookAuth();
  setTimeout(hookAuth, 500);
  setTimeout(hookAuth, 2000);

  console.log('[Fluxora] session-boot');
})();
