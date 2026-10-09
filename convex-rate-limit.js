/**
 * Rate-limit presence/session calls. Block accidental flows:save.
 * Explicit saves set window.__allowCloudSave = true first.
 */
(function () {
  if (window.__FLUXORA_RATE_LIMIT__) return;
  window.__FLUXORA_RATE_LIMIT__ = true;

  var MIN_MS = {
    'shares:heartbeat': 30000,
    'shares:listPresence': 30000,
    'sessions:heartbeat': 60000,
    'auth:recordLogin': 60000,
  };
  var lastAt = Object.create(null);
  var lastResult = Object.create(null);
  var inFlight = Object.create(null);

  function keyOf(path, args) {
    var extra = '';
    try {
      if (path === 'shares:heartbeat' || path === 'shares:listPresence') {
        extra = ':' + ((args && args.flowKey) || '');
      }
      if (path === 'sessions:heartbeat') {
        extra = ':' + ((args && args.email) || '');
      }
    } catch (e) {}
    return path + extra;
  }

  function wrapClient(client) {
    if (!client || client.__rateLimited) return client;

    var rawQuery = client.query.bind(client);
    var rawMutation = client.mutation.bind(client);

    client.query = async function (path, args) {
      var min = MIN_MS[path];
      if (!min) return rawQuery(path, args);
      var k = keyOf(path, args);
      var now = Date.now();
      if (inFlight[k]) return inFlight[k];
      if (lastAt[k] && now - lastAt[k] < min) return lastResult[k];
      lastAt[k] = now;
      inFlight[k] = rawQuery(path, args)
        .then(function (r) {
          lastResult[k] = r;
          return r;
        })
        .finally(function () {
          delete inFlight[k];
        });
      return inFlight[k];
    };

    client.mutation = async function (path, args) {
      if (path === 'flows:save' && !window.__allowCloudSave) {
        console.debug('[rate-limit] blocked flows:save (use Salvar)');
        return null;
      }
      var min = MIN_MS[path];
      if (!min) return rawMutation(path, args);
      var k = keyOf(path, args);
      var now = Date.now();
      if (inFlight[k]) return inFlight[k];
      if (lastAt[k] && now - lastAt[k] < min) return lastResult[k];
      lastAt[k] = now;
      inFlight[k] = rawMutation(path, args)
        .then(function (r) {
          lastResult[k] = r;
          return r;
        })
        .finally(function () {
          delete inFlight[k];
        });
      return inFlight[k];
    };

    client.__rateLimited = true;
    return client;
  }

  function armClient() {
    if (window.convexClient) {
      window.convexClient = wrapClient(window.convexClient);
    }
  }

  armClient();
  var n = 0;
  var t = setInterval(function () {
    armClient();
    if (++n > 20) clearInterval(t);
  }, 100);

  /**
   * Wrap saveToCloud ONCE (outermost) to set __allowCloudSave.
   * Never re-wrap — avoids recursion with vote-preview-modal.
   */
  function hookSaveOnce() {
    if (typeof window.saveToCloud !== 'function') return false;
    if (window.saveToCloud.__rateHooked) return true;
    var inner = window.saveToCloud;
    window.saveToCloud = async function () {
      window.__allowCloudSave = true;
      try {
        return await inner.apply(this, arguments);
      } finally {
        setTimeout(function () {
          window.__allowCloudSave = false;
        }, 800);
      }
    };
    window.saveToCloud.__rateHooked = true;
    return true;
  }

  /* save-guard loads later — retry until hooked once */
  var tries = 0;
  var ht = setInterval(function () {
    if (hookSaveOnce() || ++tries > 40) clearInterval(ht);
  }, 150);

  /** Public helper for modules that call mutation directly */
  window.withCloudSave = async function (fn) {
    window.__allowCloudSave = true;
    try {
      return await fn();
    } finally {
      setTimeout(function () {
        window.__allowCloudSave = false;
      }, 800);
    }
  };

  console.log('[Fluxora] convex-rate-limit v2 (no recursion)');
})();
