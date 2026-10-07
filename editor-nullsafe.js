/* Null-safe guards for elements that may be absent in DOM */
(function () {
  function safeOn(id, fn) {
    var el = document.getElementById(id);
    if (el) el.onclick = fn;
  }
  // Re-bind fragile admin hooks if present
  try {
    safeOn('btnMaster', function () {
      var p = (document.getElementById('masterPass') || {}).value || '';
      var msg = document.getElementById('masterMsg');
      var master = localStorage.getItem('hemopi_master_pass') || '2004103007';
      if (p === master) {
        if (msg) msg.hidden = true;
        var ap = document.getElementById('adminPage');
        var gate = document.getElementById('adminGate');
        if (gate) gate.hidden = true;
        if (ap) ap.hidden = false;
      } else if (msg) {
        msg.textContent = 'Senha master incorreta';
        msg.hidden = false;
      }
    });
  } catch (e) {}
  console.log('[Fluxora] editor-nullsafe ready');
})();
