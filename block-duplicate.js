/* Duplicate selected macro — attaches Dup to #shapeTools in board-toolbar */
(function () {
  function uid(p) {
    return p + Math.random().toString(36).slice(2, 9);
  }
  function cloneMacro(m) {
    if (typeof flow === 'undefined' || !flow || !m) return null;
    var nm = JSON.parse(JSON.stringify(m));
    var oldId = m.id;
    nm.id = uid('M');
    nm.x = (m.x || 0) + 40;
    nm.y = (m.y || 0) + 40;
    nm.title = (m.title || m.id) + ' (c\u00f3pia)';
    flow.macros = flow.macros || [];
    flow.macros.push(nm);
    var idMap = {};
    idMap[oldId] = nm.id;
    (flow.nodes || [])
      .filter(function (n) {
        return n.macro === oldId;
      })
      .forEach(function (n) {
        var nn = JSON.parse(JSON.stringify(n));
        nn.id = uid('n');
        nn.macro = nm.id;
        nn.x = (n.x || 0) + 40;
        nn.y = (n.y || 0) + 40;
        flow.nodes.push(nn);
        idMap[n.id] = nn.id;
      });
    (flow.edges || []).slice().forEach(function (e) {
      if (idMap[e.from] && idMap[e.to]) {
        var ne = JSON.parse(JSON.stringify(e));
        ne.id = uid('e');
        ne.from = idMap[e.from];
        ne.to = idMap[e.to];
        flow.edges.push(ne);
      }
    });
    if (typeof saveLocal === 'function') saveLocal();
    if (typeof render === 'function') render();
    if (typeof renderMacroBar === 'function') renderMacroBar();
    if (typeof toast === 'function') toast('Macro duplicado');
    return nm;
  }

  function ensureBtn() {
    var tools =
      document.getElementById('shapeTools') ||
      document.querySelector('.board-toolbar-shapes');
    if (!tools) return;
    if (document.getElementById('btnDupMacro')) return;
    var b = document.createElement('button');
    b.type = 'button';
    b.id = 'btnDupMacro';
    b.className = 'btn';
    b.title = 'Duplicar macro selecionado';
    b.textContent = '\u2a4a Dup';
    b.onclick = function () {
      if (typeof selected === 'undefined' || !selected || selected.kind !== 'macro') {
        if (typeof toast === 'function') toast('Selecione um macro primeiro');
        return;
      }
      var m =
        typeof macroById === 'function'
          ? macroById(selected.id)
          : (flow.macros || []).find(function (x) {
              return x.id === selected.id;
            });
      if (!m) {
        if (typeof toast === 'function') toast('Macro n\u00e3o encontrado');
        return;
      }
      cloneMacro(m);
    };
    tools.appendChild(b);
  }

  window.duplicateSelectedMacro = function () {
    if (typeof selected === 'undefined' || !selected || selected.kind !== 'macro') return;
    var m =
      typeof macroById === 'function'
        ? macroById(selected.id)
        : (flow.macros || []).find(function (x) {
            return x.id === selected.id;
          });
    if (m) cloneMacro(m);
  };

  ensureBtn();
  setTimeout(ensureBtn, 400);
  setTimeout(ensureBtn, 1200);
  console.log('[Fluxora] block-duplicate on board-toolbar');
})();
