/**
 * SOURCE FIX (not a feature patch war):
 * 1) CDN/local editor-fix started presence setInterval (mutation+query storm)
 * 2) saveLocal() auto-flushed flows:save on every vote/drag (mutation storm)
 * This file must load immediately after editor-fix.js and disable both behaviors.
 */
(function () {
  /* Kill presence timer if already armed */
  try {
    if (window._presenceTimer) {
      clearInterval(window._presenceTimer);
      window._presenceTimer = null;
    }
    if (window._presenceTimerFixed) {
      clearInterval(window._presenceTimerFixed);
      window._presenceTimerFixed = null;
    }
  } catch (e) {}

  /* Prevent re-arm: any assignment to _presenceTimer is cleared */
  try {
    var _pt = null;
    Object.defineProperty(window, '_presenceTimer', {
      configurable: true,
      get: function () {
        return _pt;
      },
      set: function (v) {
        if (v) {
          try {
            clearInterval(v);
          } catch (e) {}
          _pt = null;
        } else {
          _pt = null;
        }
      },
    });
  } catch (e2) {}

  /* saveLocal = localStorage only (no cloud debounce chain) */
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

  /* Neutralize internal flushSave if still referenced */
  try {
    /* no-op queue flags if present */
    window.__fluxoraBlockAutoCloud = true;
  } catch (e4) {}

  console.log('[Fluxora] noloop: presence interval blocked + saveLocal disk-only');
})();
