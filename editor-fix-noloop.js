/**
 * Disarm CDN presence interval + keep saveLocal disk-only until save-guard runs.
 */
(function () {
  function killTimers() {
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
  }

  killTimers();

  /* Intercept setInterval: if callback stringifies to presenceTick, skip */
  var rawSetInterval = window.setInterval.bind(window);
  window.setInterval = function (fn, ms) {
    try {
      var src = String(fn);
      if (
        src.indexOf('presenceTick') !== -1 &&
        ms &&
        ms < 60000
      ) {
        console.warn('[noloop] blocked presence setInterval', ms);
        return 0;
      }
    } catch (e) {}
    return rawSetInterval(fn, ms);
  };

  window.saveLocal = function saveLocalDiskOnly() {
    try {
      var f = null;
      try {
        if (typeof flow !== 'undefined') f = flow;
      } catch (e) {}
      f = f || window.flow;
      if (f) localStorage.setItem('hemopi_editor_v1', JSON.stringify(f));
    } catch (e3) {}
  };

  /* Re-kill after CDN enterApp may re-arm */
  setTimeout(killTimers, 500);
  setTimeout(killTimers, 2000);
  setTimeout(killTimers, 5000);

  console.log('[Fluxora] noloop v2: setInterval gate + disk saveLocal');
})();
