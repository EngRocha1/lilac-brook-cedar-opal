/**
 * Bridge: CDN editor-fix keeps `user` inside IIFE.
 * Mirror to window.user + localStorage on every auth success path.
 */
(function () {
  var USER_KEY = 'hemopi_user';

  function readStored() {
    try {
      var raw = localStorage.getItem(USER_KEY);
      if (!raw) return null;
      var u = JSON.parse(raw);
      return u && u.email ? u : null;
    } catch (e) {
      return null;
    }
  }

  function writeUser(u) {
    if (!u || !u.email) return;
    window.user = u;
    try {
      localStorage.setItem(USER_KEY, JSON.stringify(u));
    } catch (e) {}
    /* best-effort: also assign bare global if engine allows */
    try {
      user = u;
    } catch (e2) {}
  }

  window.syncAuthUser = function syncAuthUser() {
    var u = window.user && window.user.email ? window.user : readStored();
    if (u) writeUser(u);
    return u;
  };

  /* Observe localStorage writes from same tab via patched setItem */
  try {
    var _set = localStorage.setItem.bind(localStorage);
    localStorage.setItem = function (k, v) {
      _set(k, v);
      if (k === USER_KEY) {
        try {
          var u = JSON.parse(v);
          if (u && u.email) {
            window.user = u;
            if (typeof window.refreshUserChrome === 'function') {
              setTimeout(function () {
                window.refreshUserChrome();
              }, 0);
            }
            if (typeof window.presenceTick === 'function') {
              setTimeout(function () {
                window.presenceTick();
              }, 50);
            }
          }
        } catch (e) {}
      }
    };
  } catch (e) {}

  /* After enterApp (any layer) always re-sync chrome */
  function hookEnter() {
    var prev = window.enterApp;
    if (typeof prev !== 'function' || prev._authBridge) return;
    var wrapped = async function () {
      window.syncAuthUser();
      var r = await prev.apply(this, arguments);
      window.syncAuthUser();
      if (typeof window.refreshUserChrome === 'function') {
        try {
          await window.refreshUserChrome();
        } catch (e) {}
      }
      if (typeof window.presenceTick === 'function') {
        try {
          await window.presenceTick();
        } catch (e2) {}
      }
      return r;
    };
    wrapped._authBridge = true;
    window.enterApp = wrapped;
  }

  hookEnter();
  setTimeout(hookEnter, 400);
  setTimeout(hookEnter, 1200);
  setTimeout(function () {
    window.syncAuthUser();
  }, 300);

  console.log('[Fluxora] auth-bridge window.user');
})();
