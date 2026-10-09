/**
 * Logout canônico — única fonte de verdade para "Sair".
 * Limpa autenticação, fluxo em cache e timers de presença.
 * Impede auto-login no F5 após sair.
 */
(function () {
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
    /* varredura defensiva: qualquer chave residual do app */
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

  function clearRuntimeUser() {
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
      window.flow = { macros: [], nodes: [], edges: [], votes: {}, comments: {}, previews: {} };
      flow = window.flow;
    } catch (e5) {}
    try {
      window.HEMOPI_SHARE_MODE = null;
    } catch (e6) {}
  }

  function stopPresence() {
    try {
      if (typeof window.stopPresenceSingleton === 'function') {
        window.stopPresenceSingleton();
      }
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

  window.logout = function logoutFluxora() {
    stopPresence();
    clearAuthStorage();
    clearRuntimeUser();
    showPublicShell();
    var lab = $('userLabel');
    if (lab) lab.innerHTML = '—';
    var bar = $('presenceBar');
    if (bar) bar.innerHTML = '<strong>Online:</strong> —';
    var bm = $('bannerMeta');
    if (bm) bm.innerHTML = '';
    if (typeof toast === 'function') toast('Sessão encerrada');
    else if (typeof flash === 'function') flash('Saiu');
    console.log('[Fluxora] logout complete — storage cleared');
  };

  function wireLogoutButton() {
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

  /* Garante binding após scripts CDN */
  wireLogoutButton();
  setTimeout(wireLogoutButton, 500);
  setTimeout(wireLogoutButton, 1500);

  console.log('[Fluxora] auth-logout ready');
})();
