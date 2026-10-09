/**
 * Presence — single timer for the entire app (source of truth).
 * CDN editor-fix must NOT start its own interval (see local editor-fix.js).
 */
(function () {
  if (window.__FLUXORA_PRESENCE_MODULE__) return;
  window.__FLUXORA_PRESENCE_MODULE__ = true;

  var INTERVAL_MS = 30000;
  var timerId = null;
  var busy = false;

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

  function clearLegacyTimers() {
    ['_presenceTimer', '_presenceTimerFixed', 'heartbeatInterval', '_hbTimer'].forEach(
      function (k) {
        try {
          if (window[k]) {
            clearInterval(window[k]);
            window[k] = null;
          }
        } catch (e) {}
      }
    );
    if (timerId) {
      clearInterval(timerId);
      timerId = null;
    }
  }

  async function tickOnce() {
    if (busy) return;
    busy = true;
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
        console.warn('[presence] hb', e && e.message ? e.message : e);
      }
      try {
        var list =
          (await cx().query('shares:listPresence', { flowKey: key })) || [];
        if (bar) {
          var names = list.length
            ? list
                .map(function (p) {
                  return p.name || p.email;
                })
                .join(', ')
            : u.name || u.email;
          bar.innerHTML = '<strong>Online:</strong> ' + names;
        }
      } catch (e2) {
        if (bar)
          bar.innerHTML =
            '<strong>Online:</strong> ' + (u.name || u.email || '—');
      }
    } finally {
      busy = false;
    }
  }

  window.presenceTick = function () {
    return tickOnce();
  };

  window.startPresenceSingleton = function () {
    clearLegacyTimers();
    tickOnce();
    timerId = setInterval(tickOnce, INTERVAL_MS);
    /* mirror ids so any legacy clear still works */
    window._presenceTimer = timerId;
    window.heartbeatInterval = timerId;
  };

  window.stopPresenceSingleton = function () {
    clearLegacyTimers();
  };

  /* Start once when app shell is visible — not on every hook layer */
  var started = false;
  function bootOnce() {
    if (started) return;
    var app = document.getElementById('appMain');
    if (app && !app.hidden) {
      started = true;
      window.startPresenceSingleton();
    }
  }

  var prevEnter = window.enterApp;
  if (typeof prevEnter === 'function') {
    window.enterApp = async function () {
      var r = await prevEnter.apply(this, arguments);
      started = false;
      bootOnce();
      return r;
    };
  }

  setTimeout(bootOnce, 2500);
  console.log('[Fluxora] presence module v2 (30s, single timer)');
})();
