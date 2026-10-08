/* save-guard — dirty-check + debounce; stops flows:save spam */
(function () {
  var _timer = null;
  var _saving = false;
  var _queued = false;
  var _lastSent = '';
  var DEBOUNCE_MS = 1200;

  function cx() {
    return window.convexClient || null;
  }

  function currentKey() {
    try {
      if (typeof flowKey !== 'undefined' && flowKey) return String(flowKey);
    } catch (e) {}
    return window.flowKey ? String(window.flowKey) : '';
  }

  function currentTitle() {
    try {
      if (typeof flowTitle !== 'undefined' && flowTitle) return String(flowTitle);
    } catch (e) {}
    return window.flowTitle || '';
  }

  function snapshot() {
    try {
      if (typeof flow === 'undefined' || !flow) return '';
      return JSON.stringify({
        title: currentTitle(),
        key: currentKey(),
        data: flow,
      });
    } catch (e) {
      return '';
    }
  }

  async function flush() {
    if (_saving) {
      _queued = true;
      return;
    }
    var key = currentKey();
    var client = cx();
    if (!client || !key || key.indexOf('local') === 0) return;
    if (typeof flow === 'undefined' || !flow) return;

    var snap = snapshot();
    if (!snap || snap === _lastSent) return;

    _saving = true;
    try {
      var email = '';
      try {
        email = ((window.user || user || {}).email || '').toLowerCase();
      } catch (e) {}
      await client.mutation('flows:save', {
        key: key,
        title: currentTitle() || key,
        ownerEmail: email || undefined,
        data: flow,
      });
      _lastSent = snap;
    } catch (e) {
      console.warn('[save-guard]', e);
    } finally {
      _saving = false;
      if (_queued) {
        _queued = false;
        _timer = setTimeout(flush, 800);
      }
    }
  }

  window.saveLocal = function saveLocalGuarded() {
    try {
      if (typeof flow !== 'undefined' && flow) {
        localStorage.setItem('hemopi_editor_v1', JSON.stringify(flow));
      }
    } catch (e) {}

    var snap = snapshot();
    if (!snap || snap === _lastSent) return;

    clearTimeout(_timer);
    _timer = setTimeout(flush, DEBOUNCE_MS);
  };

  /** After intentional open/create, mark current state as clean */
  window.markFlowClean = function () {
    _lastSent = snapshot();
  };

  console.log('[Fluxora] save-guard active');
})();
