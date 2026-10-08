/**
 * Null-safe updateProgress — CDN editor.js crashes on missing #statDone.
 * Must load AFTER editor.js and override window.updateProgress.
 */
(function () {
  function $(id) {
    return document.getElementById(id);
  }

  function setText(id, value) {
    var el = $(id);
    if (el) el.textContent = String(value);
  }

  function setWidth(id, pct) {
    var el = $(id);
    if (el) el.style.width = pct + '%';
  }

  function getFlow() {
    try {
      if (typeof flow !== 'undefined' && flow) return flow;
    } catch (e) {}
    return window.flow || null;
  }

  function vk(kind, id) {
    if (typeof voteKey === 'function') return voteKey(kind, id);
    return kind + ':' + id;
  }

  window.updateProgress = function updateProgressSafe() {
    try {
      var f = getFlow();
      if (!f) return;
      var ids = [];
      (f.nodes || []).forEach(function (n) {
        ids.push(vk('node', n.id));
      });
      (f.edges || []).forEach(function (e) {
        ids.push(vk('edge', e.id));
      });
      var done = 0,
        ok = 0,
        no = 0;
      ids.forEach(function (k) {
        var v = (f.votes && f.votes[k]) || null;
        if (v && v.mine) {
          done++;
          if (v.mine === 'ok') ok++;
          if (v.mine === 'no') no++;
        }
      });
      var pct = ids.length ? Math.round((100 * done) / ids.length) : 0;
      setText('progText', pct + '%');
      setWidth('progBar', pct);
      setText('statEls', ids.length);
      setText('statDone', done); /* may not exist — setText no-ops */
      setText('statOk', ok);
      setText('statNo', no);
    } catch (e) {
      console.warn('[updateProgressSafe]', e);
    }
  };

  console.log('[Fluxora] updateProgress null-safe');
})();
