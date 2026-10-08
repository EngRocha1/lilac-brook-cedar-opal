/**
 * CRITICAL: New accounts must NEVER inherit hemopi-main / DEFAULT_FLOW from another user.
 * Overrides window.enterApp after editor-fix.js.
 */
(function () {
  var STORAGE_KEY = 'hemopi_editor_v1';
  var FLOW_KEY_STORE = 'hemopi_flow_key';
  var USER_KEY = 'hemopi_user';
  var LAST_OWNER_KEY = 'hemopi_last_owner';

  function cx() {
    return window.convexClient || null;
  }

  function blank(title) {
    return {
      macros: [],
      nodes: [],
      edges: [],
      votes: {},
      comments: {},
      header: { projectName: title || '' },
    };
  }

  function setFlow(f) {
    try {
      flow = f;
    } catch (e) {
      window.flow = f;
    }
    window.flow = f;
  }

  function setKey(k) {
    try {
      flowKey = k;
    } catch (e) {}
    window.flowKey = k;
    if (k) localStorage.setItem(FLOW_KEY_STORE, k);
    else localStorage.removeItem(FLOW_KEY_STORE);
  }

  function setTitle(t) {
    try {
      flowTitle = t;
    } catch (e) {}
    window.flowTitle = t;
  }

  function emailOf() {
    try {
      var u = window.user || (typeof user !== 'undefined' ? user : null);
      return ((u && u.email) || '').toLowerCase().trim();
    } catch (e) {
      return '';
    }
  }

  function nameOf() {
    try {
      var u = window.user || (typeof user !== 'undefined' ? user : null);
      return (u && u.name) || emailOf().split('@')[0] || 'Meu fluxo';
    } catch (e) {
      return 'Meu fluxo';
    }
  }

  function isGuest() {
    try {
      var u = window.user || user;
      return !!(u && u.isGuest);
    } catch (e) {
      return false;
    }
  }

  function clearForeignCache(email) {
    var last = (localStorage.getItem(LAST_OWNER_KEY) || '').toLowerCase();
    if (last && email && last !== email) {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(FLOW_KEY_STORE);
      setKey('');
      setTitle('');
      setFlow(blank());
    }
    if (email) localStorage.setItem(LAST_OWNER_KEY, email);
  }

  async function ensureOwnedWorkspace(email) {
    if (!cx() || !email) {
      setKey('');
      setTitle('');
      setFlow(blank());
      return;
    }

    /* List only this user's flows */
    var rows = [];
    try {
      rows = (await cx().query('flows:list', { ownerEmail: email })) || [];
    } catch (e) {
      console.warn('[enter-app] list', e);
    }

    if (rows.length) {
      rows.sort(function (a, b) {
        return (b.updatedAt || 0) - (a.updatedAt || 0);
      });
      var pick = rows[0];
      setKey(pick.key);
      setTitle(pick.title || pick.key);
      /* Prefer remote get with requesterEmail */
      try {
        var remote = await cx().query('flows:get', {
          key: pick.key,
          requesterEmail: email,
        });
        if (remote && remote.data != null) {
          setFlow(remote.data);
          if (remote.title) setTitle(remote.title);
        } else if (pick.data) {
          setFlow(pick.data);
        } else {
          setFlow(blank(pick.title));
        }
      } catch (e2) {
        setFlow(pick.data || blank(pick.title));
      }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(window.flow || flow));
      } catch (e3) {}
      return;
    }

    /* No flows — create blank starter owned by this user */
    var title = nameOf();
    var data = blank(title);
    var key = null;
    try {
      var starter = await cx().mutation('flows:ensureStarter', {
        ownerEmail: email,
        name: title,
      });
      if (starter && starter.key) key = starter.key;
    } catch (e4) {
      console.warn('[enter-app] ensureStarter', e4);
    }
    if (!key) {
      try {
        var created = await cx().mutation('flows:create', {
          title: title,
          ownerEmail: email,
          data: data,
        });
        if (created && created.key) key = created.key;
      } catch (e5) {
        console.error('[enter-app] create', e5);
      }
    }
    if (!key) {
      key = 'local-' + Date.now().toString(36);
    }
    setKey(key);
    setTitle(title);
    setFlow(data);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e6) {}
  }

  var _prevEnter = window.enterApp;

  window.enterApp = async function enterAppIsolated() {
    var email = emailOf();

    /* Show app shell first */
    try {
      if (typeof onlyShow === 'function') onlyShow('appMain');
      else {
        var pub = document.getElementById('publicPage');
        var app = document.getElementById('appMain');
        if (pub) pub.hidden = true;
        if (app) app.hidden = false;
        var lm = document.getElementById('loginModal');
        if (lm) lm.hidden = true;
      }
    } catch (e) {}

    clearForeignCache(email);

    if (!isGuest()) {
      await ensureOwnedWorkspace(email);
    } else if (typeof _prevEnter === 'function') {
      /* guest path still uses previous for share token flow */
      try {
        await _prevEnter();
        return;
      } catch (e) {}
    }

    /* Chrome */
    try {
      if (typeof refreshUserChrome === 'function') await refreshUserChrome();
    } catch (e) {}
    try {
      if (typeof loadFlowListSafe === 'function') await loadFlowListSafe();
      else if (typeof loadFlowList === 'function') await loadFlowList();
    } catch (e) {}

    /* Render owned/blank flow — NEVER cloneDefaultFlow / hemopi-main */
    try {
      if (typeof render === 'function') render();
      if (typeof renderMacroBar === 'function') renderMacroBar();
      if (typeof updateProgress === 'function') updateProgress();
      if (typeof renderProjectHeader === 'function') await renderProjectHeader();
      if (typeof renderSealBox === 'function') renderSealBox();
    } catch (e) {
      console.warn(e);
    }

    try {
      if (typeof presenceTick === 'function') presenceTick();
      if (!window._presenceTimer) {
        window._presenceTimer = setInterval(function () {
          try {
            if (typeof presenceTick === 'function') presenceTick();
          } catch (e) {}
        }, 15000);
      }
    } catch (e) {}

    if (typeof markFlowClean === 'function') markFlowClean();
    console.log('[Fluxora] enterApp isolated →', window.flowKey, email);
  };

  /** Patch register/login already calling enterApp — no extra hook needed */
  console.log('[Fluxora] enter-app-fix isolation');
})();
