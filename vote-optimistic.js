/**
 * Optimistic vote UI + debounced cloud save (no recursion).
 */
(function () {
  var _voteSaveTimer = null;

  function paint(voteType) {
    var btnLike = document.querySelector('.vbtn[data-v="ok"]');
    var btnDislike = document.querySelector('.vbtn[data-v="no"]');
    if (btnLike) {
      btnLike.classList.toggle('voted-up', voteType === 'ok' || voteType === 'up');
      btnLike.classList.toggle('on-ok', voteType === 'ok' || voteType === 'up');
    }
    if (btnDislike) {
      btnDislike.classList.toggle(
        'voted-down',
        voteType === 'no' || voteType === 'down'
      );
      btnDislike.classList.toggle(
        'on-no',
        voteType === 'no' || voteType === 'down'
      );
    }
  }

  function scheduleVoteSave() {
    clearTimeout(_voteSaveTimer);
    _voteSaveTimer = setTimeout(async function () {
      try {
        if (typeof window.flushPreviewSave === 'function') {
          await window.flushPreviewSave({ silent: true });
        } else if (typeof window.saveToCloud === 'function') {
          window.__allowCloudSave = true;
          await window.saveToCloud();
        }
      } catch (e) {
        console.warn('[vote-save]', e);
      }
    }, 500);
  }

  var prev = window.voteSelected;
  window.voteSelected = function (val) {
    var normalized =
      val === 'up' || val === 'ok' ? 'ok' : val === 'down' || val === 'no' ? 'no' : val;
    paint(normalized);
    requestAnimationFrame(function () {
      paint(normalized);
    });
    if (typeof prev === 'function') prev(val);
    scheduleVoteSave();
  };

  console.log('[Fluxora] vote-optimistic v2 ready');
})();
