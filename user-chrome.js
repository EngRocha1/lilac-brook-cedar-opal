/**
 * User chip + presence — single source using window.user / window.flowKey.
 * Replaces fragile closed-over `user` from CDN editor-fix.
 */
(function () {
  function $(id) {
    return document.getElementById(id);
  }

  function cx() {
    return window.convexClient || null;
  }

  function currentUser() {
    try {
      if (window.user && window.user.email) return window.user;
    } catch (e) {}
    try {
      if (typeof user !== 'undefined' && user && user.email) {
        window.user = user;
        return user;
      }
    } catch (e2) {}
    try {
      var raw = localStorage.getItem('hemopi_user');
      if (raw) {
        var u = JSON.parse(raw);
        if (u && u.email) {
          window.user = u;
          return u;
        }
      }
    } catch (e3) {}
    return null;
  }

  function currentFlowKey() {
    try {
      if (window.flowKey) return String(window.flowKey);
    } catch (e) {}
    try {
      if (typeof flowKey !== 'undefined' && flowKey) return String(flowKey);
    } catch (e2) {}
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

  /** Paint #userLabel from window.user */
  window.refreshUserChrome = async function refreshUserChromeFixed() {
    var lab = $('userLabel');
    if (!lab) return;
    var u = currentUser();
    if (!u || !u.email) {
      lab.textContent = '—';
      return;
    }
    var photoUrl = u.photo || null;
    if (!photoUrl && u.photoStorageId) {
      photoUrl = await resolveUrl(u.photoStorageId);
      if (photoUrl) u.photo = photoUrl;
    }
    var name = u.name || u.email || '—';
    var email = u.email || '';
    var badge = isGuestUser(u) ? 'Convidado' : name;
    var avatar = photoUrl
      ? '<img class="user-avatar" src="' +
        photoUrl +
        '" alt="" />'
      : '<span class="user-avatar user-avatar--ph">' +
        (name.charAt(0) || '?').toUpperCase() +
        '</span>';
    lab.innerHTML =
      avatar +
      '<span class="user-chip-text">' +
      badge +
      ' · ' +
      email +
      '</span>';
    lab.title = email;
  };

  /** Online bar via shares:heartbeat + listPresence */
  window.presenceTick = async function presenceTickFixed() {
    var bar = $('presenceBar');
    var u = currentUser();
    var key = currentFlowKey();
    if (!bar) return;
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
      bar.innerHTML = list.length
        ? '<strong>Online:</strong> ' +
          list
            .map(function (p) {
              return p.name || p.email;
            })
            .join(', ')
        : '<strong>Online:</strong> —';
    } catch (e) {
      console.warn('[presence]', e);
      bar.innerHTML = '<strong>Online:</strong> —';
    }
  };

  function startPresenceLoop() {
    if (window._presenceTimerFixed) return;
    window._presenceTimerFixed = setInterval(function () {
      window.presenceTick();
    }, 20000);
  }

  function afterEnter() {
    window.refreshUserChrome();
    window.presenceTick();
    startPresenceLoop();
  }

  /* Hook enterApp without breaking isolation */
  function hookEnter() {
    var prev = window.enterApp;
    if (typeof prev !== 'function') return;
    if (prev._chromeHooked) return;
    var wrapped = async function () {
      var r = await prev.apply(this, arguments);
      try {
        /* mirror closed-over user if present */
        try {
          if (typeof user !== 'undefined' && user && user.email) {
            window.user = user;
            try {
              localStorage.setItem('hemopi_user', JSON.stringify(user));
            } catch (e) {}
          }
        } catch (e2) {}
        afterEnter();
      } catch (e3) {
        console.warn(e3);
      }
      return r;
    };
    wrapped._chromeHooked = true;
    window.enterApp = wrapped;
  }

  hookEnter();
  setTimeout(hookEnter, 500);
  setTimeout(hookEnter, 1500);
  setTimeout(afterEnter, 800);

  console.log('[Fluxora] user-chrome fixed');
})();
