/**
 * SINGLE presence loop for the whole app.
 * Clears every prior interval (CDN + patches) before starting one timer.
 */
(function () {
  var INTERVAL_MS = 20000;

  function cx() {
    return window.convexClient || null;
  }

  function currentUser() {
    if (window.user && window.user.email) return window.user;
    try {
      var raw = localStorage.getItem('hemopi_user');
      if (raw) {
        var u = JSON.parse(raw);
        if (u && u.email) {
          window.user = u;
          return u;
        }
      }
    } catch (e) {}
    return null;
  }

  function currentFlowKey() {
    if (window.flowKey) return String(window.flowKey);
    try {
      if (typeof flowKey !== 'undefined' && flowKey) return String(flowKey);
    } catch (e) {}
    return localStorage.getItem('hemopi_flow_key') || '';
  }

  function killAllPresenceTimers() {
    var keys = [
      '_presenceTimer',
      '_presenceTimerFixed',
      'heartbeatInterval',
      '_hbTimer',
    ];
    keys.forEach(function (k) {
      try {
        if (window[k]) {
          clearInterval(window[k]);
          window[k] = null;
        }
      } catch (e) {}
    });
  }

  async function tickOnce() {
    if (window.__presenceBusy) return;
    window.__presenceBusy = true;
    try {
      var bar = document.getElementById('presenceBar');
      var u = currentUser();
      var key = currentFlowKey();
      if (!cx() || !u || !u.email || !key || String(key).indexOf('local') === 0) {
        if (bar) bar.innerHTML = '<strong>Online:</strong> —';
        return;
      }
      try {
        await cx().mutation('shares:heartbeat', {
          flowKey: key,
          email: String(u.email).toLowerCase(),
          name: u.name || u.email,
        });
      } catch (e) {
        /* OCC soft-fail: next tick retries */
        console.warn('[presence] heartbeat', e && e.message ? e.message : e);
      }
      try {
        var list =
          (await cx().query('shares:listPresence', { flowKey: key })) || [];
        if (bar) {
          bar.innerHTML = list.length
            ? '<strong>Online:</strong> ' +
              list
                .map(function (p) {
                  return p.name || p.email;
                })
                .join(', ')
            : '<strong>Online:</strong> ' + (u.name || u.email);
        }
      } catch (e2) {
        if (bar)
          bar.innerHTML =
            '<strong>Online:</strong> ' + (u.name || u.email || '—');
      }
    } finally {
      window.__presenceBusy = false;
    }
  }

  /** Public API — overrides every previous presenceTick */
  window.presenceTick = function presenceTickSingleton() {
    return tickOnce();
  };

  window.startPresenceSingleton = function startPresenceSingleton() {
    killAllPresenceTimers();
    tickOnce();
    window.heartbeatInterval = setInterval(tickOnce, INTERVAL_MS);
    window._presenceTimer = window.heartbeatInterval;
    window._presenceTimerFixed = window.heartbeatInterval;
  };

  window.stopPresenceSingleton = function stopPresenceSingleton() {
    killAllPresenceTimers();
  };

  /* After enterApp, ensure single timer */
  function hookEnter() {
    var prev = window.enterApp;
    if (typeof prev !== 'function' || prev._presenceHooked) return;
    var wrapped = async function () {
      var r = await prev.apply(this, arguments);
      try {
        window.startPresenceSingleton();
      } catch (e) {}
      return r;
    };
    wrapped._presenceHooked = true;
    window.enterApp = wrapped;
  }

  killAllPresenceTimers();
  hookEnter();
  setTimeout(hookEnter, 600);
  setTimeout(hookEnter, 1800);
  setTimeout(function () {
    if (document.getElementById('appMain') && !document.getElementById('appMain').hidden) {
      window.startPresenceSingleton();
    }
  }, 2000);

  console.log('[Fluxora] presence-singleton armed');
})();
