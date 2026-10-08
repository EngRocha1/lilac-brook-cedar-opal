/* Macro identifier field in evaluation modal — rename with reference rewrite */
(function () {
  function $(id) {
    return document.getElementById(id);
  }

  function renameMacroId(oldId, newId) {
    if (typeof flow === 'undefined' || !flow) return { ok: false, error: 'Sem fluxo' };
    newId = String(newId || '')
      .trim()
      .toUpperCase();
    if (!newId) return { ok: false, error: 'Identificador vazio' };
    if (newId === oldId) return { ok: true };
    if (!/^[A-Z][A-Z0-9]{0,3}$/.test(newId)) {
      return { ok: false, error: 'Use letra (A–Z) ou curto (ex: A2)' };
    }
    if ((flow.macros || []).some(function (m) {
      return m.id === newId;
    })) {
      return { ok: false, error: 'Identificador j\u00e1 em uso' };
    }
    var m = (flow.macros || []).find(function (x) {
      return x.id === oldId;
    });
    if (!m) return { ok: false, error: 'Macro n\u00e3o encontrada' };
    m.id = newId;
    (flow.nodes || []).forEach(function (n) {
      if (n.macro === oldId) n.macro = newId;
    });
    function remapKey(obj, prefix) {
      if (!obj) return;
      var kOld = prefix + oldId;
      var kNew = prefix + newId;
      if (Object.prototype.hasOwnProperty.call(obj, kOld)) {
        obj[kNew] = obj[kOld];
        delete obj[kOld];
      }
    }
    remapKey(flow.votes, 'macro:');
    remapKey(flow.comments, 'macro:');
    if (typeof selected !== 'undefined' && selected && selected.kind === 'macro' && selected.id === oldId) {
      selected.id = newId;
    }
    return { ok: true };
  }

  function syncField() {
    var wrap = $('sideMacroIdWrap');
    var input = $('sideMacroId');
    if (!wrap || !input) return;
    var isM =
      typeof selected !== 'undefined' && selected && selected.kind === 'macro';
    wrap.hidden = !isM;
    if (isM) {
      input.value = selected.id || '';
      input.readOnly = window.HEMOPI_SHARE_MODE === 'guest';
    }
  }

  var _open = window.openModal;
  window.openModal = function () {
    if (typeof _open === 'function') _open.apply(this, arguments);
    else {
      var bg = $('modalBg');
      if (bg) bg.classList.add('open');
    }
    try {
      syncField();
    } catch (e) {}
  };

  function wireSave() {
    var btn = $('btnModalSave');
    if (!btn || btn.dataset.macroIdWired === '1') return;
    btn.dataset.macroIdWired = '1';
    var prev = btn.onclick;
    btn.onclick = function (ev) {
      if (typeof selected !== 'undefined' && selected && selected.kind === 'macro') {
        var input = $('sideMacroId');
        if (input && !input.readOnly) {
          var res = renameMacroId(selected.id, input.value);
          if (!res.ok) {
            if (typeof showNotification === 'function') showNotification(res.error, 'error');
            else if (typeof toast === 'function') toast(res.error, true);
            return;
          }
        }
      }
      if (typeof prev === 'function') prev.call(btn, ev);
      else if (typeof window.__modalSaveFallback === 'function') window.__modalSaveFallback();
      try {
        if (typeof renderMacroBar === 'function') renderMacroBar();
      } catch (e) {}
    };
  }

  wireSave();
  setTimeout(wireSave, 500);
  setTimeout(wireSave, 1500);
  console.log('[Fluxora] macro-id-field ready');
})();
