/* Manual cloud save only — localStorage always; Convex only via saveLocal(true) or 💾 */
(function () {
  var _dirty = false;
  var _remindTimer = null;

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

  function emailOf() {
    try {
      return ((window.user || user || {}).email || '').toLowerCase().trim();
    } catch (e) {
      return '';
    }
  }

  function persistLocal() {
    try {
      if (typeof flow !== 'undefined' && flow) {
        localStorage.setItem('hemopi_editor_v1', JSON.stringify(flow));
      }
    } catch (e) {}
  }

  function scheduleRemind() {
    clearTimeout(_remindTimer);
    if (!_dirty) return;
    _remindTimer = setTimeout(function () {
      if (!_dirty) return;
      if (typeof showNotification === 'function') {
        showNotification('Lembrete: salve o projeto (💾) para não perder alterações', 'info');
      } else if (typeof toast === 'function') {
        toast('Lembrete: salve o projeto (💾)', false);
      }
      scheduleRemind();
    }, 3 * 60 * 1000);
  }

  /**
   * saveLocal() → local only + dirty flag
   * saveLocal(true) or window.saveToCloud() → Convex mutation
   */
  window.saveLocal = function (forceCloud) {
    persistLocal();
    _dirty = true;
    scheduleRemind();

    if (forceCloud === true) {
      return window.saveToCloud();
    }
  };

  window.saveToCloud = async function () {
    var key = currentKey();
    var client = cx();
    var email = emailOf();
    if (!client || !key || key.indexOf('local') === 0) {
      if (typeof showNotification === 'function') showNotification('Não é possível salvar na nuvem agora', 'error');
      return false;
    }
    if (!email) {
      if (typeof showNotification === 'function') showNotification('Faça login para salvar', 'error');
      return false;
    }
    if (typeof flow === 'undefined' || !flow) return false;
    try {
      await client.mutation('flows:save', {
        key: key,
        title: currentTitle() || key,
        ownerEmail: email,
        data: flow,
      });
      _dirty = false;
      clearTimeout(_remindTimer);
      if (typeof showNotification === 'function') showNotification('Salvo na nuvem', 'success');
      else if (typeof toast === 'function') toast('Salvo na nuvem');
      return true;
    } catch (e) {
      console.warn('[save]', e);
      if (typeof showNotification === 'function') {
        showNotification('Erro ao salvar: ' + (e.message || e), 'error');
      }
      return false;
    }
  };

  window.markFlowClean = function () {
    _dirty = false;
    clearTimeout(_remindTimer);
    persistLocal();
  };

  window.isFlowDirty = function () {
    return _dirty;
  };

  /* Wire 💾 buttons that called saveLocal() expecting cloud */
  document.addEventListener(
    'click',
    function (ev) {
      var t = ev.target;
      if (!t) return;
      var btn = t.closest ? t.closest('[title="Salvar"], #btnCloudSave') : null;
      if (!btn) return;
      /* toolbar save uses onclick="saveLocal();toast..." — intercept after */
    },
    true
  );

  console.log('[Fluxora] save-guard manual cloud');
})();
