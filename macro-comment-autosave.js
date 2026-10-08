/* Macro vote cascade + edge modal helpers — NO periodic save loop */
(function () {
  function voteKey(k, id) {
    return typeof window.voteKey === 'function' ? window.voteKey(k, id) : k + ':' + id;
  }

  function applyVoteOnKey(key, val) {
    if (typeof flow === 'undefined' || !flow) return;
    if (!flow.votes) flow.votes = {};
    if (!flow.votes[key]) flow.votes[key] = { ok: 0, no: 0, mine: null };
    var v = flow.votes[key];
    if (v.mine === 'ok') v.ok = Math.max(0, (v.ok || 0) - 1);
    if (v.mine === 'no') v.no = Math.max(0, (v.no || 0) - 1);
    if (val === 'ok') {
      v.ok = (v.ok || 0) + 1;
      v.mine = 'ok';
    } else if (val === 'no') {
      v.no = (v.no || 0) + 1;
      v.mine = 'no';
    } else {
      v.mine = null;
    }
  }

  function cascadeMacroVote(macroId, val) {
    if (typeof flow === 'undefined' || !flow) return;
    if (!flow.votes) flow.votes = {};
    (flow.nodes || []).forEach(function (n) {
      if (n.macro !== macroId && String(n.macro) !== String(macroId)) return;
      applyVoteOnKey(voteKey('node', n.id), val);
    });
    (flow.edges || []).forEach(function (e) {
      var a =
        typeof nodeById === 'function'
          ? nodeById(e.from)
          : (flow.nodes || []).find(function (n) {
              return n.id === e.from;
            });
      var b =
        typeof nodeById === 'function'
          ? nodeById(e.to)
          : (flow.nodes || []).find(function (n) {
              return n.id === e.to;
            });
      if (!a || !b) return;
      var aIn = a.macro === macroId || String(a.macro) === String(macroId);
      var bIn = b.macro === macroId || String(b.macro) === String(macroId);
      if (aIn || bIn) applyVoteOnKey(voteKey('edge', e.id), val);
    });
  }

  var prevSet = window.setMyVote;
  window.setMyVote = function (k, id, val) {
    var key = voteKey(k, id);
    var cur = (flow && flow.votes && flow.votes[key]) || { mine: null };
    var finalVal = val;
    if (cur.mine === val) finalVal = null;
    if (typeof prevSet === 'function' && k !== 'macro') {
      prevSet(k, id, val);
    } else {
      applyVoteOnKey(key, finalVal);
    }
    if (k === 'macro') {
      applyVoteOnKey(key, finalVal);
      cascadeMacroVote(id, finalVal);
    }
    if (typeof saveLocal === 'function') saveLocal();
    if (typeof render === 'function') render();
    if (typeof renderMacroBar === 'function') renderMacroBar();
    if (typeof updateProgress === 'function') updateProgress();
  };

  /* Save only on intentional edit — NOT on every pointerup, NOT every 12s */
  window.addEventListener('beforeunload', function () {
    try {
      if (typeof flow !== 'undefined' && flow) {
        localStorage.setItem(
          'fluxora_flow_backup',
          JSON.stringify({
            flowKey: typeof flowKey !== 'undefined' ? flowKey : null,
            flowTitle: typeof flowTitle !== 'undefined' ? flowTitle : null,
            flow: flow,
          })
        );
      }
    } catch (e) {}
  });

  console.log('[Fluxora] macro-comment-autosave (no interval)');
})();
