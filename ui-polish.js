/* ui-polish — seal revoke on flow.seal + helpers */
(function () {
  function injectMissingEditButtons() {}

  function openEditForFlow(r) {
    if (typeof openFlowEditModal === 'function') {
      openFlowEditModal({ key: r.key, title: r.title || r.key, data: r.data });
      return;
    }
    window.dispatchEvent(new CustomEvent('fluxora-edit-flow', { detail: r }));
  }
  window.openEditForFlow = openEditForFlow;

  function enhanceSealBox() {
    var box = document.getElementById('sealBox');
    if (!box) return;
    var ensure = function () {
      var seal = box.querySelector('.seal, .seal-badge, [data-seal]');
      if (!seal || seal.querySelector('.seal-revoke')) return;
      if (window.HEMOPI_SHARE_MODE === 'guest') return;
      var x = document.createElement('button');
      x.type = 'button';
      x.className = 'seal-revoke';
      x.title = 'Revogar selo';
      x.textContent = '\u00d7';
      x.style.cssText =
        'margin-left:8px;border:none;background:transparent;color:#c41e3a;font-size:18px;cursor:pointer;line-height:1';
      x.onclick = async function (ev) {
        ev.preventDefault();
        ev.stopPropagation();
        if (!confirm('Revogar o selo deste fluxo?')) return;
        try {
          if (typeof flow === 'undefined' || !flow) {
            if (typeof mostrarToast === 'function') mostrarToast('Fluxo não carregado', 'error');
            return;
          }
          // Propriedade real usada pelo editor-fix: flow.seal
          flow.seal = null;
          delete flow.seal;
          if (flow.header) {
            delete flow.header.seal;
            delete flow.header.sealStatus;
          }
          if (typeof saveLocal === 'function') saveLocal();
          // Re-render do selo / cabeçalho
          var sb = document.getElementById('sealBox');
          if (sb) sb.innerHTML = '';
          if (typeof renderProjectHeader === 'function') await renderProjectHeader();
          if (typeof mostrarToast === 'function') mostrarToast('Selo revogado com sucesso.', 'success');
          else if (typeof toast === 'function') toast('Selo revogado');
        } catch (e) {
          console.error(e);
          if (typeof mostrarToast === 'function') mostrarToast('Erro ao revogar: ' + (e.message || e), 'error');
        }
      };
      seal.appendChild(x);
    };
    ensure();
    new MutationObserver(ensure).observe(box, { childList: true, subtree: true });
  }

  enhanceSealBox();
  setTimeout(enhanceSealBox, 600);
  console.log('[Fluxora] ui-polish seal revoke fixed');
})();
