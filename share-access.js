/* share-access — collaborator mode · restored */
(function () {
  function $(id) {
    return document.getElementById(id);
  }
  function applyCollaboratorUI() {
    ['btnNewFlow', 'btnOpenMgr', 'btnShare'].forEach(function (id) {
      var el = $(id);
      if (el) el.style.display = 'none';
    });
    ['btnAddProcess', 'btnAddDecision', 'btnAddText', 'btnAddBusbar', 'btnAddMacro', 'btnConnect', 'btnSeal'].forEach(function (id) {
      var el = $(id);
      if (el) el.style.display = '';
    });
    var box = $('projectHeader');
    if (box) {
      box.classList.remove('locked');
      box.querySelectorAll('input,textarea,select').forEach(function (inp) {
        inp.readOnly = false;
        inp.disabled = false;
      });
    }
    if (typeof toast === 'function') toast('Colaborador — edição total do fluxo');
  }
  async function enterShare(token, email) {
    var cx = window.convexClient;
    if (!cx) throw new Error('Convex offline');
    var sh = await cx.query('shares:getByToken', { token: token });
    if (!sh || (!sh.emails.includes(email) && sh.createdBy !== email)) {
      throw new Error('E-mail não autorizado');
    }
    var canEdit = !!sh.canEdit;
    try {
      flowKey = sh.flowKey;
    } catch (e) {}
    window.flowKey = sh.flowKey;
    var u = { name: email.split('@')[0], email: email, isGuest: !canEdit, isCollaborator: canEdit };
    try {
      user = u;
    } catch (e) {}
    window.user = u;
    window.HEMOPI_SHARE_MODE = canEdit ? 'collaborator' : 'guest';
    var gm = $('guestModal');
    if (gm) gm.hidden = true;
    ['publicPage', 'adminPage', 'adminGate', 'flowManager'].forEach(function (id) {
      var el = $(id);
      if (el) el.hidden = true;
    });
    if ($('appMain')) $('appMain').hidden = false;
    if (typeof loadFlow === 'function') await loadFlow();
    if (typeof refreshUserChrome === 'function') await refreshUserChrome();
    if (canEdit) applyCollaboratorUI();
    else if (typeof applyGuestUI === 'function') applyGuestUI();
    if ($('btnSeal')) $('btnSeal').style.display = '';
    try {
      if (typeof render === 'function') render();
      if (typeof renderMacroBar === 'function') renderMacroBar();
      if (typeof updateProgress === 'function') updateProgress();
      if (typeof renderProjectHeader === 'function') await renderProjectHeader();
    } catch (e) {}
    if (typeof presenceTick === 'function') presenceTick();
  }
  function wireGuestForm() {
    var form = $('guestForm');
    if (!form || form.dataset.collabWired === '1') return;
    form.dataset.collabWired = '1';
    form.addEventListener(
      'submit',
      async function (ev) {
        var token = window._shareToken || new URLSearchParams(location.search).get('share');
        if (!token) return;
        ev.preventDefault();
        ev.stopImmediatePropagation();
        var email = (($('guestEmail') || {}).value || '').trim().toLowerCase();
        if (!email.includes('@')) return;
        try {
          await enterShare(token, email);
        } catch (e) {
          var err = $('guestError');
          if (err) {
            err.textContent = e.message || String(e);
            err.hidden = false;
          }
        }
      },
      true
    );
  }
  function boot() {
    wireGuestForm();
    var token = new URLSearchParams(location.search).get('share');
    if (token) window._shareToken = token;
  }
  boot();
  setTimeout(boot, 400);
  console.log('[Fluxora] share-access ready');
})();
