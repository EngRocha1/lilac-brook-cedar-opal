/**
 * UX shell wiring only — moves nodes in DOM for layout, no business logic.
 */
(function () {
  function $(id) {
    return document.getElementById(id);
  }

  function buildStatusStrip() {
    if ($('statusStrip')) return;

    var presence = $('presenceBar');
    var toolbar = document.querySelector('.toolbar-global');
    if (!presence || !toolbar) return;

    var strip = document.createElement('div');
    strip.id = 'statusStrip';
    strip.className = 'status-strip';

    /* Online */
    presence.parentNode.insertBefore(strip, presence);
    strip.appendChild(presence);

    /* Likes / progress */
    var prog = toolbar.querySelector('.prog-inline');
    if (prog) {
      var progWrap = document.createElement('span');
      progWrap.className = 'prog-inline';
      progWrap.innerHTML = prog.innerHTML;
      /* keep live ids by moving nodes */
      while (prog.firstChild) progWrap.appendChild(prog.firstChild);
      strip.appendChild(progWrap);
    }

    /* Action icons */
    var actions = document.createElement('div');
    actions.className = 'action-icons';
    var printBtn = toolbar.querySelector('button[onclick*="printMode"]');
    var dlBtn = toolbar.querySelector('button[onclick*="exportJSON"]');
    var saveBtn = $('btnCloudSave');
    [printBtn, dlBtn, saveBtn].forEach(function (b) {
      if (b) actions.appendChild(b);
    });
    strip.appendChild(actions);
  }

  function injectNewFlowInBanner() {
    var actions = document.querySelector('.banner-meta-actions');
    if (!actions) {
      /* banner not painted yet */
      return;
    }
    if ($('btnNewFlowBanner')) return;

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'btnNewFlowBanner';
    btn.className = 'banner-icon-btn';
    btn.title = 'Novo fluxo';
    btn.setAttribute('aria-label', 'Novo fluxo');
    btn.innerHTML =
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>';
    btn.onclick = function (ev) {
      ev.preventDefault();
      var legacy = $('btnNewFlow');
      if (legacy) legacy.click();
      else if (typeof window.createFlow === 'function') window.createFlow();
    };
    actions.insertBefore(btn, actions.firstChild);
  }

  function run() {
    buildStatusStrip();
    injectNewFlowInBanner();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
  setTimeout(run, 400);
  setTimeout(run, 1200);

  /* After banner re-render */
  var prev = window.renderBannerMeta;
  if (typeof prev === 'function' && !prev.__uxShell) {
    window.renderBannerMeta = function () {
      var r = prev.apply(this, arguments);
      setTimeout(injectNewFlowInBanner, 0);
      return r;
    };
    window.renderBannerMeta.__uxShell = true;
  }

  console.log('[Fluxora] ux-shell layout ready');
})();
