/**
 * Logout canônico + trava anti auto-login no F5.
 */
(function () {
  var LOGOUT_FLAG = 'fluxora_logged_out';
  var KEYS = [
    'hemopi_user',
    'hemopi_flow_key',
    'hemopi_editor_v1',
    'hemopi_last_owner',
    'fluxora_user',
    'fluxora_flow_key',
  ];

  function $(id) {
    return document.getElementById(id);
  }

  function clearAuthStorage() {
    KEYS.forEach(function (k) {
      try {
        localStorage.removeItem(k);
      } catch (e) {}
    });
    try {
      sessionStorage.removeItem('fluxora_admin');
    } catch (e2) {}
    try {
      var doomed = [];
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (
          k &&
          (k.indexOf('hemopi_') === 0 ||
            k.indexOf('fluxora_') === 0 ||
            k.indexOf('lilac') === 0)
        ) {
          doomed.push(k);
        }
      }
      doomed.forEach(function (k) {
        localStorage.removeItem(k);
      });
    } catch (e3) {}
  }

  function clearRuntime() {
    try {
      window.user = null;
    } catch (e) {}
    try {
      user = null;
    } catch (e2) {}
    try {
      window.flowKey = '';
      flowKey = '';
    } catch (e3) {}
    try {
      window.flowTitle = '';
      flowTitle = '';
    } catch (e4) {}
    try {
      window.HEMOPI_SHARE_MODE = null;
    } catch (e5) {}
  }

  function stopPresence() {
    try {
      if (typeof window.stopPresenceSingleton === 'function')
        window.stopPresenceSingleton();
    } catch (e) {}
    ['_presenceTimer', '_presenceTimerFixed', 'heartbeatInterval', '_hbTimer', '__sessionHbTimer'].forEach(
      function (k) {
        try {
          if (window[k]) {
            clearInterval(window[k]);
            window[k] = null;
          }
        } catch (e2) {}
      }
    );
  }

  function showPublicShell() {
    try {
      if (typeof showPublic === 'function') {
        showPublic();
        return;
      }
    } catch (e) {}
    ['appMain', 'adminPage', 'adminGate', 'flowManager', 'guestModal', 'loginModal'].forEach(
      function (id) {
        var el = $(id);
        if (el) el.hidden = true;
      }
    );
    var pub = $('publicPage');
    if (pub) pub.hidden = false;
  }

  window.isLoggedOut = function () {
    try {
      return sessionStorage.getItem(LOGOUT_FLAG) === '1';
    } catch (e) {
      return false;
    }
  };

  window.clearLoggedOutFlag = function () {
    try {
      sessionStorage.removeItem(LOGOUT_FLAG);
    } catch (e) {}
  };

  window.logout = function logoutFluxora() {
    stopPresence();
    clearAuthStorage();
    clearRuntime();
    try {
      sessionStorage.setItem(LOGOUT_FLAG, '1');
    } catch (e) {}
    showPublicShell();
    var lab = $('userLabel');
    if (lab) lab.innerHTML = '—';
    var bar = $('presenceBar');
    if (bar) bar.innerHTML = '<strong>Online:</strong> —';
    var bm = $('bannerMeta');
    if (bm) bm.innerHTML = '';
    if (typeof showNotification === 'function')
      showNotification('Sessão encerrada', 'info');
    else if (typeof toast === 'function') toast('Sessão encerrada');
    console.log('[Fluxora] logout complete + anti-relogin flag');
  };

  /** Block auto enterApp after logout until explicit login */
  function guardEnterApp() {
    var prev = window.enterApp;
    if (typeof prev !== 'function' || prev.__logoutGuard) return;
    window.enterApp = async function () {
      if (window.isLoggedOut && window.isLoggedOut()) {
        /* only allow if user just logged in (flag cleared) */
        var u = null;
        try {
          u = JSON.parse(localStorage.getItem('hemopi_user') || 'null');
        } catch (e) {}
        if (!u || !u.email) {
          showPublicShell();
          console.warn('[Fluxora] enterApp blocked — logged out');
          return;
        }
      }
      return prev.apply(this, arguments);
    };
    window.enterApp.__logoutGuard = true;
  }

  function wireBtn() {
    var btn = $('btnLogout');
    if (!btn) return;
    btn.onclick = function (ev) {
      if (ev) {
        ev.preventDefault();
        ev.stopPropagation();
      }
      window.logout();
    };
  }

  /* On explicit login success paths, clear the flag */
  function hookLoginClear() {
    var form = $('authForm');
    if (form && !form.__logoutHook) {
      form.addEventListener(
        'submit',
        function () {
          window.clearLoggedOutFlag && window.clearLoggedOutFlag();
        },
        true
      );
      form.__logoutHook = true;
    }
  }

  guardEnterApp();
  wireBtn();
  hookLoginClear();
  setTimeout(function () {
    guardEnterApp();
    wireBtn();
    hookLoginClear();
  }, 400);
  setTimeout(function () {
    guardEnterApp();
    wireBtn();
  }, 1500);

  console.log('[Fluxora] auth-logout v2 ready');
})();
