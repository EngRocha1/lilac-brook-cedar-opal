/* list-dedupe — one Editar per card · v-restore-zoom */
(function () {
  function $(id) { return document.getElementById(id); }
  window.injectMissingEditButtons = function () {};

  function dedupeCard(card) {
    if (!card) return;
    var edits = [];
    card.querySelectorAll('button').forEach(function (btn) {
      var t = (btn.textContent || '').replace(/\s+/g, ' ').trim();
      if (/editar/i.test(t) || btn.classList.contains('btn-edit-flow') || btn.getAttribute('data-fe-edit')) {
        edits.push(btn);
      }
    });
    if (edits.length <= 1) return;
    var actions = card.querySelector('.flow-mgr-actions');
    var keep = edits[0];
    if (actions) {
      for (var i = 0; i < edits.length; i++) {
        if (actions.contains(edits[i])) { keep = edits[i]; break; }
      }
    }
    edits.forEach(function (btn) { if (btn !== keep) btn.remove(); });
    keep.classList.add('btn-edit-flow');
    keep.setAttribute('data-fe-edit', '1');
    if (!/✎/.test(keep.textContent || '')) keep.textContent = '✎ Editar';
  }

  function dedupeAll() {
    var list = $('flowManagerList');
    if (!list) return;
    list.querySelectorAll('.flow-mgr-card').forEach(dedupeCard);
  }

  function watch() {
    var list = $('flowManagerList');
    if (!list || list.dataset.dedupeWatch === '1') return;
    list.dataset.dedupeWatch = '1';
    new MutationObserver(function () {
      clearTimeout(window.__dedupeT);
      window.__dedupeT = setTimeout(dedupeAll, 30);
    }).observe(list, { childList: true, subtree: true });
    dedupeAll();
  }

  try {
    Object.defineProperty(window, 'injectMissingEditButtons', {
      configurable: true, enumerable: true,
      get: function () { return function () {}; },
      set: function () {}
    });
  } catch (e) { window.injectMissingEditButtons = function () {}; }

  function boot() { watch(); dedupeAll(); }
  boot();
  setTimeout(boot, 300);
  setTimeout(boot, 1000);
  console.log('[Fluxora] list-dedupe ready');
})();
