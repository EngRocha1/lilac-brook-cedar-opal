/**
 * HARD rate-limit on Convex HTTP client.
 * Stops request storms regardless of how many timers/patches call presence/save.
 * Load IMMEDIATELY after convex-api.js.
 */
(function () {
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
        extra = ':' + (args && args.flowKey ? args.flowKey : '');
      }
      if (path === 'sessions:heartbeat') {
        extra = ':' + (args && args.email ? args.email : '');
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
      if (min) {
        var k = keyOf(path, args);
        var now = Date.now();
        if (inFlight[k]) return inFlight[k];
        if (lastAt[k] && now - lastAt[k] < min) {
          return lastResult[k];
        }
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
      }
      return rawQuery(path, args);
    };

    client.mutation = async function (path, args) {
      /* Block cloud save unless explicit flag (set by saveToCloud) */
      if (path === 'flows:save' && !window.__allowCloudSave) {
        console.debug('[rate-limit] blocked flows:save (use 💾)');
        return null;
      }
      var min = MIN_MS[path];
      if (min) {
        var k = keyOf(path, args);
        var now = Date.now();
        if (inFlight[k]) return inFlight[k];
        if (lastAt[k] && now - lastAt[k] < min) {
          return lastResult[k];
        }
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
      }
      return rawMutation(path, args);
    };

    client.__rateLimited = true;
    return client;
  }

  function arm() {
    if (window.convexClient) {
      window.convexClient = wrapClient(window.convexClient);
    }
  }

  arm();
  /* convex-api may assign client slightly later */
  var n = 0;
  var t = setInterval(function () {
    arm();
    if (++n > 20) clearInterval(t);
  }, 100);

  /* saveToCloud must set flag */
  var prevSave;
  function hookSave() {
    if (typeof window.saveToCloud !== 'function') return;
    if (window.saveToCloud.__rateHooked) return;
    prevSave = window.saveToCloud;
    window.saveToCloud = async function () {
      window.__allowCloudSave = true;
      try {
        return await prevSave.apply(this, arguments);
      } finally {
        setTimeout(function () {
          window.__allowCloudSave = false;
        }, 500);
      }
    };
    window.saveToCloud.__rateHooked = true;
  }
  hookSave();
  setTimeout(hookSave, 500);
  setTimeout(hookSave, 2000);

  console.log('[Fluxora] convex-rate-limit armed');
})();
