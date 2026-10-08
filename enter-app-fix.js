/**
 * Isolation: new accounts never inherit another user's flow.
 * Presence timer is NOT started here — presence-singleton owns it.
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
      previews: {},
      header: { projectName: title || '' },
    };
  }

  function setFlow(f) {
    if (!f) f = blank();
    if (!f.previews) f.previews = {};
    if (!f.comments) f.comments = {};
    if (!f.votes) f.votes = {};
    try {
      flow = f;
    } catch (e) {}
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

  function syncUser() {
    try {
      var raw = localStorage.getItem(USER_KEY);
      if (raw) {
        var u = JSON.parse(raw);
        if (u && u.email) {
          window.user = u;
          try {
            user = u;
          } catch (e) {}
          return u;
        }
      }
    } catch (e2) {}
    if (window.user && window.user.email) return window.user;
    return null;
  }

  function emailOf() {
    var u = syncUser();
    return ((u && u.email) || '').toLowerCase().trim();
  }

  function nameOf() {
    var u = syncUser();
    return (u && u.name) || emailOf().split('@')[0] || 'Meu fluxo';
  }

  function isGuest() {
    var u = syncUser();
    return !!(u && u.isGuest) || window.HEMOPI_SHARE_MODE === 'guest';
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

    var rows = [];
    try {
      rows = (await cx().query('flows:list', { ownerEmail: email })) || [];
    } catch (e) {
      console.warn('[enter-app] list', e);
    }

    if (rows.length) {
      var pick = rows[0];
      for (var i = 0; i < rows.length; i++) {
        if ((rows[i].title || '').toLowerCase().indexOf('principal') >= 0) {
          pick = rows[i];
          break;
        }
      }
      setKey(pick.key);
      setTitle(pick.title || pick.key);
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
        localStorage.setItem(STORAGE_KEY, JSON.stringify(window.flow));
      } catch (e3) {}
      return;
    }

    var title = nameOf();
    var data = blank(title);
    var key = null;
    try {
      var starter = await cx().mutation('flows:ensureStarter', {
        ownerEmail: email,
        name: title,
      });
      if (starter && starter.key) key = starter.key;
    } catch (e4) {}
    if (!key) {
      try {
        var created = await cx().mutation('flows:create', {
          title: title,
          ownerEmail: email,
          data: data,
        });
        if (created && created.key) key = created.key;
      } catch (e5) {
        console.error(e5);
      }
    }
    if (!key) key = 'local-' + Date.now().toString(36);
    setKey(key);
    setTitle(title);
    setFlow(data);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e6) {}
  }

  window.enterApp = async function enterAppIsolated() {
    syncUser();
    var email = emailOf();

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
    }

    try {
      if (typeof window.refreshUserChrome === 'function')
        await window.refreshUserChrome();
    } catch (e) {}

    try {
      if (typeof loadFlowListSafe === 'function') await loadFlowListSafe();
      else if (typeof loadFlowList === 'function') await loadFlowList();
    } catch (e) {}

    try {
      if (typeof render === 'function') render();
      if (typeof renderMacroBar === 'function') renderMacroBar();
      if (typeof updateProgress === 'function') updateProgress();
      if (typeof renderProjectHeader === 'function') await renderProjectHeader();
      if (typeof renderSealBox === 'function') renderSealBox();
    } catch (e) {
      console.warn(e);
    }

    /* ONE presence tick — interval owned by presence-singleton */
    try {
      if (typeof window.startPresenceSingleton === 'function') {
        window.startPresenceSingleton();
      } else if (typeof window.presenceTick === 'function') {
        window.presenceTick();
      }
    } catch (e) {}

    if (typeof markFlowClean === 'function') markFlowClean();
    console.log('[Fluxora] enterApp isolated →', window.flowKey, email);
  };

  console.log('[Fluxora] enter-app-fix isolation v3 (no interval)');
})();
