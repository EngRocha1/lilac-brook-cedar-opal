/* Unified top-center notifications — single API */
(function () {
  var hideT = null;

  function ensureEl() {
    var el = document.getElementById('toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'toast';
      document.body.appendChild(el);
    }
    el.className = 'toast toast-top';
    return el;
  }

  function showNotification(message, type) {
    type = type || 'info';
    if (type === true) type = 'error';
    if (type === false) type = 'success';
    var el = ensureEl();
    el.textContent = message || '';
    el.hidden = false;
    el.setAttribute('data-type', type);
    el.classList.remove('toast-success', 'toast-error', 'toast-info');
    if (type === 'success') el.classList.add('toast-success');
    else if (type === 'error') el.classList.add('toast-error');
    else el.classList.add('toast-info');
    clearTimeout(hideT);
    hideT = setTimeout(function () {
      el.hidden = true;
    }, 3000);
  }

  window.showNotification = showNotification;
  window.mostrarToast = function (msg, kind) {
    var t = kind === 'error' || kind === true ? 'error' : kind === 'success' ? 'success' : 'info';
    showNotification(msg, t);
  };
  // Compat: toast(msg, isErrorBoolean)
  window.toast = function (msg, isError) {
    showNotification(msg, isError ? 'error' : 'success');
  };

  console.log('[Fluxora] notify unified');
})();
