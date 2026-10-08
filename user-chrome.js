/**
 * User chip + presence — always window.user / hemopi_user.
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

  function currentFlowKey() {
    if (window.flowKey) return String(window.flowKey);
    try {
      if (typeof flowKey !== 'undefined' && flowKey) return String(flowKey);
    } catch (e) {}
    return localStorage.getItem('hemopi_flow_key') || '';
  }

  function isGuestUser(u) {
    return !!(u && (u.isGuest || window.HEMOPI_SHARE_MODE === 'guest'));
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
    var badge = isGuestUser(u) ? 'Convidado' : name;
    var avatar = photoUrl
      ? '<img class="user-avatar" src="' + photoUrl + '" alt="" />'
      : '<span class="user-avatar user-avatar--ph">' +
        (name.charAt(0) || '?').toUpperCase() +
        '</span>';
    lab.innerHTML =
      avatar +
      '<span class="user-chip-text" style="display:inline-block;line-height:1.25;max-width:220px;overflow:hidden;text-overflow:ellipsis;vertical-align:middle">' +
      '<strong style="display:block;font-size:13px">' +
      badge +
      '</strong>' +
      '<span style="display:block;font-size:11px;opacity:.85;word-break:break-all">' +
      email +
      '</span></span>';
    lab.title = name + ' · ' + email;
  };

  window.presenceTick = async function presenceTickFixed() {
    var bar = $('presenceBar');
    if (!bar) return;
    var u = currentUser();
    var key = currentFlowKey();
    if (!cx() || !u || !u.email || !key || String(key).indexOf('local') === 0) {
      bar.innerHTML = '<strong>Online:</strong> —';
      return;
    }
    try {
      await cx().mutation('shares:heartbeat', {
        flowKey: key,
        email: String(u.email).toLowerCase(),
        name: u.name || u.email,
      });
      var list =
        (await cx().query('shares:listPresence', { flowKey: key })) || [];
      if (!list.length) {
        bar.innerHTML =
          '<strong>Online:</strong> ' + (u.name || u.email);
      } else {
        bar.innerHTML =
          '<strong>Online:</strong> ' +
          list
            .map(function (p) {
              return p.name || p.email;
            })
            .join(', ');
      }
    } catch (e) {
      console.warn('[presence]', e);
      bar.innerHTML =
        '<strong>Online:</strong> ' + (u.name || u.email || '—');
    }
  };

  function startLoop() {
    if (window._presenceTimerFixed) return;
    window._presenceTimerFixed = setInterval(function () {
      if (typeof window.presenceTick === 'function') window.presenceTick();
    }, 20000);
  }

  async function bootChrome() {
    if (typeof window.syncAuthUser === 'function') window.syncAuthUser();
    await window.refreshUserChrome();
    await window.presenceTick();
    startLoop();
  }

  function hookEnter() {
    var prev = window.enterApp;
    if (typeof prev !== 'function' || prev._chromeHooked) return;
    var wrapped = async function () {
      if (typeof window.syncAuthUser === 'function') window.syncAuthUser();
      var r = await prev.apply(this, arguments);
      await bootChrome();
      return r;
    };
    wrapped._chromeHooked = true;
    window.enterApp = wrapped;
  }

  /* CSS for chip */
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
  setTimeout(hookEnter, 1600);
  setTimeout(bootChrome, 600);

  console.log('[Fluxora] user-chrome v2');
})();
