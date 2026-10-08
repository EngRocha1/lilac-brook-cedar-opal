/* Macro delete: confirm + remove macro and all child nodes/edges/votes/comments */
(function () {
  function wire() {
    var delBtn = document.getElementById('btnModalDelete');
    if (!delBtn || delBtn.dataset.cascadeWired === '1') return;
    delBtn.dataset.cascadeWired = '1';

    delBtn.onclick = function () {
      if (typeof selected === 'undefined' || !selected) return;
      if (typeof flow === 'undefined' || !flow) return;

      if (selected.kind === 'macro') {
        var mid = selected.id;
        var childNodes = (flow.nodes || []).filter(function (n) {
          return n.macro === mid || String(n.macro) === String(mid);
        });
        var childIds = {};
        childNodes.forEach(function (n) {
          childIds[n.id] = true;
        });
        var childEdges = (flow.edges || []).filter(function (e) {
          return childIds[e.from] || childIds[e.to];
        });

        var msg =
          'Excluir o macro "' +
          mid +
          '" e TODOS os elementos internos?\n\n' +
          '• ' +
          childNodes.length +
          ' bloco(s)\n' +
          '• ' +
          childEdges.length +
          ' conexão(ões)\n\nEsta ação não pode ser desfeita.';
        if (!confirm(msg)) return;

        flow.macros = (flow.macros || []).filter(function (m) {
          return m.id !== mid;
        });
        flow.nodes = (flow.nodes || []).filter(function (n) {
          return n.macro !== mid && String(n.macro) !== String(mid);
        });
        flow.edges = (flow.edges || []).filter(function (e) {
          return !childIds[e.from] && !childIds[e.to];
        });

        if (flow.votes) {
          Object.keys(flow.votes).forEach(function (k) {
            if (k === 'macro:' + mid || k.indexOf(':' + mid) !== -1) {
              /* keep only exact macro key and node/edge keys of children */
            }
            if (k === 'macro:' + mid) delete flow.votes[k];
            childNodes.forEach(function (n) {
              if (k === 'node:' + n.id) delete flow.votes[k];
            });
            childEdges.forEach(function (e) {
              if (k === 'edge:' + e.id) delete flow.votes[k];
            });
          });
        }
        if (flow.comments) {
          delete flow.comments['macro:' + mid];
          childNodes.forEach(function (n) {
            delete flow.comments['node:' + n.id];
          });
          childEdges.forEach(function (e) {
            delete flow.comments['edge:' + e.id];
          });
        }

        try {
          selected = null;
        } catch (e) {
          window.selected = null;
        }
        var bg = document.getElementById('modalBg');
        if (bg) bg.classList.remove('open');
        if (typeof saveLocal === 'function') saveLocal();
        if (typeof render === 'function') render();
        if (typeof renderMacroBar === 'function') renderMacroBar();
        if (typeof updateProgress === 'function') updateProgress();
        if (typeof showNotification === 'function') {
          showNotification('Macro e filhos excluídos', 'success');
        } else if (typeof toast === 'function') {
          toast('Macro e filhos excluídos');
        }
        return;
      }

      /* node / edge — standard */
      if (!confirm('Excluir este elemento?\n\nEsta ação não pode ser desfeita.')) return;
      if (selected.kind === 'node') {
        var nid = selected.id;
        flow.nodes = (flow.nodes || []).filter(function (n) {
          return n.id !== nid;
        });
        flow.edges = (flow.edges || []).filter(function (e) {
          return e.from !== nid && e.to !== nid;
        });
      } else if (selected.kind === 'edge') {
        flow.edges = (flow.edges || []).filter(function (e) {
          return e.id !== selected.id;
        });
      }
      try {
        selected = null;
      } catch (e2) {
        window.selected = null;
      }
      var bg2 = document.getElementById('modalBg');
      if (bg2) bg2.classList.remove('open');
      if (typeof saveLocal === 'function') saveLocal();
      if (typeof render === 'function') render();
      if (typeof renderMacroBar === 'function') renderMacroBar();
      if (typeof updateProgress === 'function') updateProgress();
      if (typeof showNotification === 'function') showNotification('Elemento excluído', 'success');
      else if (typeof toast === 'function') toast('Elemento excluído');
    };
  }

  wire();
  setTimeout(wire, 400);
  setTimeout(wire, 1200);
  console.log('[Fluxora] macro-delete-cascade');
})();
