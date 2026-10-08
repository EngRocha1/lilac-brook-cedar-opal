/* Manual cloud save — always persist window.flow (canonical) */
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

  function getCanonicalFlow() {
    var f = null;
    try {
      if (typeof flow !== 'undefined' && flow) f = flow;
    } catch (e) {}
    if (window.flow) {
      /* merge previews if closed-over flow lost them */
      if (f && window.flow !== f) {
        if (window.flow.previews && (!f.previews || !Object.keys(f.previews).length)) {
          f.previews = window.flow.previews;
        }
        if (window.flow.comments && f) f.comments = f.comments || window.flow.comments;
        if (window.flow.votes && f) f.votes = f.votes || window.flow.votes;
        window.flow = f;
      } else if (!f) {
        f = window.flow;
      }
    }
    if (f) {
      if (!f.previews) f.previews = {};
      if (!f.comments) f.comments = {};
      if (!f.votes) f.votes = {};
      window.flow = f;
      try {
        flow = f;
      } catch (e2) {}
    }
    return f;
  }

  function persistLocal() {
    try {
      var f = getCanonicalFlow();
      if (f) localStorage.setItem('hemopi_editor_v1', JSON.stringify(f));
    } catch (e) {}
  }

  function scheduleRemind() {
    clearTimeout(_remindTimer);
    if (!_dirty) return;
    _remindTimer = setTimeout(function () {
      if (!_dirty) return;
      if (typeof showNotification === 'function') {
        showNotification(
          'Lembrete: salve o projeto (💾) para não perder alterações',
          'info'
        );
      }
      scheduleRemind();
    }, 3 * 60 * 1000);
  }

  window.saveLocal = function (forceCloud) {
    persistLocal();
    _dirty = true;
    scheduleRemind();
    if (forceCloud === true) return window.saveToCloud();
  };

  window.saveToCloud = async function () {
    var key = currentKey();
    var client = cx();
    var email = emailOf();
    var f = getCanonicalFlow();
    if (!client || !key || key.indexOf('local') === 0) {
      if (typeof showNotification === 'function')
        showNotification('Não é possível salvar na nuvem agora', 'error');
      return false;
    }
    if (!email) {
      if (typeof showNotification === 'function')
        showNotification('Faça login para salvar', 'error');
      return false;
    }
    if (!f) return false;
    try {
      await client.mutation('flows:save', {
        key: key,
        title: currentTitle() || key,
        ownerEmail: email,
        data: f,
      });
      _dirty = false;
      clearTimeout(_remindTimer);
      persistLocal();
      if (typeof showNotification === 'function')
        showNotification('Salvo na nuvem', 'success');
      return true;
    } catch (e) {
      console.warn('[save]', e);
      if (typeof showNotification === 'function')
        showNotification('Erro ao salvar: ' + (e.message || e), 'error');
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

  console.log('[Fluxora] save-guard canonical flow');
})();
