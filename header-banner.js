/**
 * Project meta in the red hero banner (read-only) + pencil / share icons.
 * Removes dependency on the large editable header form & flow <select>.
 */
(function () {
  function $(id) {
    return document.getElementById(id);
  }

  function getFlow() {
    try {
      if (typeof flow !== 'undefined' && flow) return flow;
    } catch (e) {}
    return window.flow || null;
  }

  function getTitle() {
    try {
      if (typeof flowTitle !== 'undefined' && flowTitle) return flowTitle;
    } catch (e) {}
    return window.flowTitle || '';
  }

  function esc(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function headerOf() {
    var f = getFlow();
    var h = (f && f.header) || {};
    return {
      projectName: h.projectName || getTitle() || '—',
      manager: h.manager || '—',
      director: h.director || '—',
      po: h.po || '—',
      pm: h.pm || '—',
      stakeholders: h.stakeholders || '—',
      logoUrl: h.logoUrl || null,
    };
  }

  window.renderBannerMeta = function renderBannerMeta() {
    var host = $('bannerMeta');
    if (!host) return;
    var h = headerOf();
    var title = getTitle() || h.projectName || 'Fluxo';
    host.innerHTML =
      '<div class="banner-meta-main">' +
      '<span class="banner-flow-title" title="Fluxo atual">' +
      esc(title) +
      '</span>' +
      '<span class="banner-meta-actions">' +
      '<button type="button" class="banner-icon-btn" id="btnBannerEditHeader" title="Editar cabeçalho" aria-label="Editar cabeçalho">' +
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>' +
      '</button>' +
      '<button type="button" class="banner-icon-btn" id="btnBannerShare" title="Compartilhar" aria-label="Compartilhar">' +
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z"/></svg>' +
      '</button>' +
      '</span></div>' +
      '<div class="banner-meta-grid">' +
      metaChip('Projeto', h.projectName) +
      metaChip('Gerente', h.manager) +
      metaChip('Diretor', h.director) +
      metaChip('PO', h.po) +
      metaChip('PM', h.pm) +
      metaChip('Stakeholders', h.stakeholders) +
      '</div>';

    var ed = $('btnBannerEditHeader');
    if (ed) {
      ed.onclick = function (ev) {
        ev.preventDefault();
        if (typeof window.openHeaderEditor === 'function') window.openHeaderEditor();
        else if ($('btnEditHeader')) $('btnEditHeader').click();
        else if ($('flowEditModal')) $('flowEditModal').classList.add('open');
      };
    }
    var sh = $('btnBannerShare');
    if (sh) {
      sh.onclick = function (ev) {
        ev.preventDefault();
        if ($('btnShare')) $('btnShare').click();
        else if (typeof window.openShareModal === 'function') window.openShareModal();
      };
    }
  };

  function metaChip(label, value) {
    var v = value && value !== '—' ? value : '—';
    return (
      '<span class="banner-chip"><i>' +
      esc(label) +
      '</i><b>' +
      esc(v) +
      '</b></span>'
    );
  }

  /* Hook renderProjectHeader: still update model, but paint banner + hide old form */
  function hookHeader() {
    var prev = window.renderProjectHeader;
    window.renderProjectHeader = async function () {
      if (typeof prev === 'function') {
        try {
          await prev.apply(this, arguments);
        } catch (e) {}
      }
      /* Hide legacy form if still injected */
      var box = $('projectHeader');
      if (box) {
        box.hidden = true;
        box.innerHTML = '';
      }
      var panel = document.querySelector('.share-panel');
      if (panel) panel.hidden = true;
      window.renderBannerMeta();
    };
  }

  /* Hide flow <select> row */
  function hideFlowSelect() {
    var sel = $('flowSelect');
    if (sel) {
      var wrap = sel.closest('.tool-group') || sel.parentElement;
      if (wrap) wrap.style.display = 'none';
      sel.style.display = 'none';
    }
  }

  hookHeader();
  hideFlowSelect();
  setTimeout(function () {
    hookHeader();
    hideFlowSelect();
    window.renderBannerMeta();
  }, 800);

  var prevEnter = window.enterApp;
  if (typeof prevEnter === 'function') {
    window.enterApp = async function () {
      var r = await prevEnter.apply(this, arguments);
      hideFlowSelect();
      window.renderBannerMeta();
      return r;
    };
  }

  console.log('[Fluxora] header-banner read-only meta');
})();
