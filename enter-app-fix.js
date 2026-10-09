/**
 * enterApp isolation v4 — owner isolation + logout guard + no presence interval
 */
(function () {
  var USER_KEY = 'hemopi_user';
  var FLOW_KEY_STORE = 'hemopi_flow_key';
  var STORAGE_KEY = 'hemopi_editor_v1';

  function $(id) {
    return document.getElementById(id);
  }

  function cx() {
    return window.convexClient || null;
  }

  function onlyShow(id) {
    ['publicPage', 'appMain', 'adminPage', 'adminGate', 'flowManager', 'guestModal'].forEach(
      function (k) {
        var el = $(k);
        if (!el) return;
        el.hidden = k !== id;
      }
    );
  }

  function readUser() {
    try {
      var raw = localStorage.getItem(USER_KEY);
      if (!raw) return null;
      var u = JSON.parse(raw);
      return u && u.email ? u : null;
    } catch (e) {
      return null;
    }
  }

  window.enterApp = async function enterAppIsolated() {
    /* Anti auto-login after Sair */
    if (typeof window.isLoggedOut === 'function' && window.isLoggedOut()) {
      var _u = null;
      try {
        _u = JSON.parse(localStorage.getItem('hemopi_user') || 'null');
      } catch (e) {}
      if (!_u || !_u.email) {
        try {
          var pub = document.getElementById('publicPage');
          var app = document.getElementById('appMain');
          if (pub) pub.hidden = false;
          if (app) app.hidden = true;
        } catch (e2) {}
        console.warn('[Fluxora] enterApp blocked (logged out)');
        return;
      }
      if (typeof window.clearLoggedOutFlag === 'function') window.clearLoggedOutFlag();
    }

    var u = readUser();
    if (!u || !u.email) {
      onlyShow('publicPage');
      return;
    }
    window.user = u;
    try {
      user = u;
    } catch (e) {}

    var email = String(u.email).toLowerCase().trim();
    onlyShow('appMain');

    if (typeof window.refreshUserChrome === 'function') {
      try {
        await window.refreshUserChrome();
      } catch (e) {}
    }

    var key = '';
    try {
      key = localStorage.getItem(FLOW_KEY_STORE) || '';
    } catch (e) {}

    /* Isolation: never open another owner's flow */
    if (key && cx()) {
      try {
        var row = await cx().query('flows:get', {
          key: key,
          requesterEmail: email,
        });
        if (!row || (row.ownerEmail && row.ownerEmail.toLowerCase() !== email)) {
          key = '';
          try {
            localStorage.removeItem(FLOW_KEY_STORE);
            localStorage.removeItem(STORAGE_KEY);
          } catch (e3) {}
        }
      } catch (e4) {
        /* access denied → blank slate */
        key = '';
        try {
          localStorage.removeItem(FLOW_KEY_STORE);
          localStorage.removeItem(STORAGE_KEY);
        } catch (e5) {}
      }
    }

    if (!key && cx()) {
      try {
        var rows =
          (await cx().query('flows:list', { ownerEmail: email })) || [];
        if (rows.length) {
          rows.sort(function (a, b) {
            return (b.updatedAt || 0) - (a.updatedAt || 0);
          });
          key = rows[0].key;
        } else if (typeof window.ensureStarter === 'function') {
          key = await window.ensureStarter(email);
        } else {
          var created = await cx().mutation('flows:create', {
            title: 'Novo fluxo',
            ownerEmail: email,
            data: {
              macros: [],
              nodes: [],
              edges: [],
              votes: {},
              comments: {},
              header: { projectName: 'Novo fluxo' },
            },
          });
          key = created && created.key;
        }
      } catch (e6) {
        console.warn('bootstrap flow', e6);
      }
    }

    if (key) {
      window.flowKey = key;
      try {
        flowKey = key;
      } catch (e7) {}
      try {
        localStorage.setItem(FLOW_KEY_STORE, key);
      } catch (e8) {}
    }

    if (typeof window.loadFlow === 'function') {
      try {
        await window.loadFlow();
      } catch (e9) {
        console.warn('loadFlow', e9);
      }
    }

    try {
      if (typeof render === 'function') render();
      if (typeof renderMacroBar === 'function') renderMacroBar();
      if (typeof updateProgress === 'function') updateProgress();
      if (typeof renderProjectHeader === 'function') await renderProjectHeader();
      if (typeof renderSealBox === 'function') renderSealBox();
      if (typeof window.renderBannerMeta === 'function') window.renderBannerMeta();
    } catch (e) {
      console.warn(e);
    }

    /* ONE presence start — interval owned by presence-singleton */
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

  console.log('[Fluxora] enter-app-fix isolation v4');
})();
