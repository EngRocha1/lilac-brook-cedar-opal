/**
 * User chip only — presence is owned by presence-singleton.js
 */
(function () {
  var USER_KEY = 'hemopi_user';

  function $(id) {
    return document.getElementById(id);
  }

  function cx() {
    return window.convexClient || null;
  }

  function currentUser() {
    if (typeof window.syncAuthUser === 'function') {
      var s = window.syncAuthUser();
      if (s && s.email) return s;
    }
    if (window.user && window.user.email) return window.user;
    try {
      var raw = localStorage.getItem(USER_KEY);
      if (raw) {
        var u = JSON.parse(raw);
        if (u && u.email) {
          window.user = u;
          return u;
        }
      }
    } catch (e) {}
    return null;
  }

  async function resolveUrl(storageId) {
    if (!storageId || !cx()) return null;
    try {
      return await cx().mutation('files:getUrl', { storageId: String(storageId) });
    } catch (e) {
      return null;
    }
  }

  window.refreshUserChrome = async function refreshUserChromeFixed() {
    var lab = $('userLabel');
    if (!lab) return;
    var u = currentUser();
    if (!u || !u.email) {
      lab.innerHTML = '<span class="user-chip-text">—</span>';
      return;
    }
    var photoUrl = u.photo || null;
    if (!photoUrl && u.photoStorageId) {
      photoUrl = await resolveUrl(u.photoStorageId);
      if (photoUrl) {
        u.photo = photoUrl;
        window.user = u;
      }
    }
    var name = u.name || u.email.split('@')[0] || '—';
    var email = u.email;
    var badge = u.isGuest || window.HEMOPI_SHARE_MODE === 'guest' ? 'Convidado' : name;
    var avatar = photoUrl
      ? '<img class="user-avatar" src="' + photoUrl + '" alt="" />'
      : '<span class="user-avatar user-avatar--ph">' +
        (name.charAt(0) || '?').toUpperCase() +
        '</span>';
    lab.innerHTML =
      avatar +
      '<span class="user-chip-text" style="display:inline-block;line-height:1.25;max-width:220px;vertical-align:middle">' +
      '<strong style="display:block;font-size:13px">' +
      badge +
      '</strong>' +
      '<span style="display:block;font-size:11px;opacity:.85;word-break:break-all">' +
      email +
      '</span></span>';
    lab.title = name + ' · ' + email;
  };

  /* Do NOT start intervals here — presence-singleton owns that */

  function hookEnter() {
    var prev = window.enterApp;
    if (typeof prev !== 'function' || prev._chromeHooked) return;
    var wrapped = async function () {
      if (typeof window.syncAuthUser === 'function') window.syncAuthUser();
      var r = await prev.apply(this, arguments);
      try {
        await window.refreshUserChrome();
      } catch (e) {}
      return r;
    };
    wrapped._chromeHooked = true;
    window.enterApp = wrapped;
  }

  if (!document.getElementById('user-chrome-css')) {
    var st = document.createElement('style');
    st.id = 'user-chrome-css';
    st.textContent =
      '.user-chip{display:inline-flex;align-items:center;gap:8px;max-width:280px}' +
      '.user-avatar{width:32px;height:32px;border-radius:50%;object-fit:cover;flex-shrink:0}' +
      '.user-avatar--ph{display:inline-flex;align-items:center;justify-content:center;background:#1e3a5f;color:#fff;font-weight:700;font-size:14px}' +
      '#presenceBar{font-size:13px;color:#334155;padding:6px 12px}';
    document.head.appendChild(st);
  }

  hookEnter();
  setTimeout(hookEnter, 500);
  setTimeout(function () {
    window.refreshUserChrome();
  }, 700);

  console.log('[Fluxora] user-chrome v3 (no interval)');
})();
