/** Restored admin-panel with singleton sessions:heartbeat (60s). Full UI retained. */
(function () {
  var ADMIN_EMAIL = 'tarcisio.rocha.engenheiro@gmail.com';
  function $(id) { return document.getElementById(id); }
  function cx() { return window.convexClient || null; }

  function onlyShow(id) {
    ['publicPage', 'appMain', 'adminPage', 'adminGate', 'flowManager', 'guestModal'].forEach(function (k) {
      var el = $(k);
      if (!el) return;
      el.hidden = k !== id;
    });
  }

  async function ensureAdminShell() {
    var gate = $('adminGate');
    var page = $('adminPage');
    if (!gate || !page) return;
    if (!gate.dataset.built) {
      gate.dataset.built = '1';
      gate.innerHTML =
        '<div class="admin-login-card">' +
        '<h2>Admin Fluxora</h2>' +
        '<p class="muted">Acesso restrito ao master</p>' +
        '<label>E-mail</label><input id="admEmail" type="email" />' +
        '<label>Senha</label><input id="admPass" type="password" />' +
        '<button type="button" class="btn-neon block" id="admLoginBtn">Entrar</button>' +
        '<p id="admErr" class="auth-error" hidden></p>' +
        '<button type="button" class="btn-ghost" id="admBack">Voltar</button></div>';
    }
    if (!page.dataset.built) {
      page.dataset.built = '1';
      page.innerHTML =
        '<header class="admin-top"><strong>Painel Admin</strong>' +
        '<button type="button" class="btn-ghost" id="admLogout">Sair admin</button></header>' +
        '<div class="admin-tabs" id="admTabs"></div>' +
        '<div class="admin-body" id="admBody"><p class="muted">Carregando…</p></div>';
    }
  }

  async function doAdminLogin() {
    var email = (($('admEmail') && $('admEmail').value) || '').toLowerCase().trim();
    var pass = ($('admPass') && $('admPass').value) || '';
    var err = $('admErr');
    if (err) { err.hidden = true; err.textContent = ''; }
    if (!email || !pass) {
      if (err) { err.hidden = false; err.textContent = 'Preencha e-mail e senha'; }
      return;
    }
    if (email !== ADMIN_EMAIL) {
      if (err) { err.hidden = false; err.textContent = 'Não autorizado'; }
      return;
    }
    try {
      if (cx()) {
        var ok = await cx().query('admin:verifyMaster', { email: email, password: pass });
        if (!ok || !ok.ok) {
          /* fallback legacy hash path via auth:login */
          var hash = pass;
          try {
            if (window.crypto && crypto.subtle) {
              var buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pass));
              hash = Array.from(new Uint8Array(buf)).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
            }
          } catch (e) {}
          var login = await cx().query('auth:login', { email: email, passwordHash: hash });
          if (!login) {
            if (err) { err.hidden = false; err.textContent = 'Credenciais inválidas'; }
            return;
          }
        }
      }
      sessionStorage.setItem('fluxora_admin', email);
      onlyShow('adminPage');
      await renderDashboard();
    } catch (e) {
      if (err) { err.hidden = false; err.textContent = String(e.message || e); }
    }
  }

  async function renderDashboard() {
    var body = $('admBody');
    if (!body || !cx()) return;
    body.innerHTML = '<p class="muted">Carregando dashboard…</p>';
    try {
      var dash = await cx().query('admin:dashboard', {});
      var users = (dash && dash.users) || [];
      var flows = (dash && dash.flows) || [];
      var html = '<div class="admin-kpis">';
      html += kpi('Usuários', users.length);
      html += kpi('Fluxos', flows.length);
      html += kpi('Online', (dash && dash.online) || 0);
      html += '</div>';
      html += '<h3>Usuários recentes</h3><div class="admin-table">';
      users.slice(0, 20).forEach(function (u) {
        html += '<div class="admin-row">' + (u.email || '') + ' · ' + (u.name || '') + '</div>';
      });
      html += '</div>';
      body.innerHTML = html;
    } catch (e) {
      body.innerHTML = '<p class="auth-error">' + (e.message || e) + '</p>';
    }
  }

  function kpi(label, val) {
    return '<div class="admin-kpi"><span>' + label + '</span><strong>' + val + '</strong></div>';
  }

  function wire() {
    ensureAdminShell();
    var footer = $('footerAdmin');
    if (footer) {
      footer.onclick = function (ev) {
        ev.preventDefault();
        onlyShow('adminGate');
        ensureAdminShell();
      };
    }
    document.addEventListener('click', function (ev) {
      if (ev.target && ev.target.id === 'admLoginBtn') doAdminLogin();
      if (ev.target && ev.target.id === 'admBack') onlyShow('publicPage');
      if (ev.target && ev.target.id === 'admLogout') {
        sessionStorage.removeItem('fluxora_admin');
        onlyShow('publicPage');
      }
    });
  }

  /* Session heartbeat: ONE timer only */
  function hookEnter() {
    var prev = window.enterApp;
    if (typeof prev !== 'function' || prev._adminHooked) return;
    window.enterApp = async function () {
      var r = await prev.apply(this, arguments);
      try {
        var u = window.user;
        if (u && u.email && cx()) {
          await cx().mutation('auth:recordLogin', {
            email: u.email,
            userAgent: navigator.userAgent,
          });
          if (!window.__sessionHbTimer) {
            window.__sessionHbTimer = setInterval(function () {
              try {
                if (window.user && window.user.email)
                  cx().mutation('sessions:heartbeat', {
                    email: window.user.email,
                    name: window.user.name || '',
                    userAgent: navigator.userAgent,
                  });
              } catch (e) {}
            }, 60000);
          }
        }
      } catch (e) {
        console.warn('recordLogin', e);
      }
      return r;
    };
    window.enterApp._adminHooked = true;
  }

  wire();
  hookEnter();
  setTimeout(hookEnter, 800);
  console.log('[Fluxora] admin-panel restored + session singleton');
})();
