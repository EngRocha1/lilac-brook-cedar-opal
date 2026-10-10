/**
 * Admin Fluxora — login aligned to convex/admin.ts + full dashboard.
 * verifyMaster expects: { email, passwordHash?, adminKey? }
 * dashboard expects: { email, adminKey }
 */
(function () {
  var ADMIN_EMAIL = 'tarcisio.rocha.engenheiro@gmail.com';
  var SS_EMAIL = 'fluxora_admin';
  var SS_KEY = 'fluxora_admin_key';

  function $(id) {
    return document.getElementById(id);
  }
  function cx() {
    return window.convexClient || null;
  }

  function onlyShow(id) {
    ['publicPage', 'appMain', 'adminPage', 'adminGate', 'flowManager', 'guestModal'].forEach(
      function (k) {
        var el = $(k);
        if (!el) return;
        el.hidden = k !== id;
      }
    );
  }

  async function sha256Hex(text) {
    if (window.crypto && crypto.subtle) {
      var buf = await crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(text)
      );
      return Array.from(new Uint8Array(buf))
        .map(function (b) {
          return b.toString(16).padStart(2, '0');
        })
        .join('');
    }
    /* fallback: use plain as key path only */
    return text;
  }

  function ensureCss() {
    if (document.getElementById('admin-panel-css')) return;
    var st = document.createElement('style');
    st.id = 'admin-panel-css';
    st.textContent =
      '#adminGate{min-height:100vh;display:flex;align-items:center;justify-content:center;background:linear-gradient(160deg,#0a0e1a 0%,#111827 50%,#1a0533 100%);padding:24px}' +
      '.admin-login-card{width:min(420px,100%);background:rgba(15,23,42,.92);border:1px solid rgba(236,72,153,.35);border-radius:16px;padding:28px 24px;box-shadow:0 0 40px rgba(236,72,153,.15)}' +
      '.admin-login-card h2{margin:0 0 4px;color:#fdf2f8;font-size:1.4rem}' +
      '.admin-login-card .muted{color:#94a3b8;margin:0 0 18px;font-size:13px}' +
      '.admin-login-card label{display:block;font-size:12px;font-weight:600;color:#e2e8f0;margin:12px 0 6px}' +
      '.admin-login-card input{width:100%;box-sizing:border-box;padding:12px 14px;border-radius:10px;border:1px solid #334155;background:#0f172a;color:#f8fafc;font-size:14px}' +
      '.admin-login-card input:focus{outline:none;border-color:#ec4899;box-shadow:0 0 0 3px rgba(236,72,153,.2)}' +
      '.admin-login-card .btn-neon.block{width:100%;margin-top:18px;padding:12px;border:none;border-radius:999px;background:linear-gradient(90deg,#ec4899,#f43f5e);color:#fff;font-weight:700;cursor:pointer;font-size:15px}' +
      '.admin-login-card .btn-neon.block:hover{filter:brightness(1.08)}' +
      '.admin-login-card .btn-neon.block:disabled{opacity:.6;cursor:wait}' +
      '.admin-login-card .btn-ghost{margin-top:12px;background:transparent;border:1px solid #334155;color:#cbd5e1;border-radius:999px;padding:8px 16px;cursor:pointer}' +
      '.admin-login-card .auth-error{color:#fb7185;font-size:12px;margin:12px 0 0;line-height:1.4;word-break:break-word}' +
      '#adminPage{min-height:100vh;background:#0f172a;color:#e2e8f0;padding:0 0 40px}' +
      '#adminPage .admin-top{display:flex;align-items:center;justify-content:space-between;padding:16px 20px;background:#111827;border-bottom:1px solid #1e293b;position:sticky;top:0;z-index:10}' +
      '#adminPage .admin-top strong{font-size:16px;color:#fdf2f8}' +
      '#adminPage .admin-tabs{display:flex;flex-wrap:wrap;gap:8px;padding:12px 20px;border-bottom:1px solid #1e293b}' +
      '#adminPage .admin-tab{padding:8px 14px;border-radius:999px;border:1px solid #334155;background:#1e293b;color:#cbd5e1;cursor:pointer;font-size:13px}' +
      '#adminPage .admin-tab.active{background:#ec4899;border-color:#ec4899;color:#fff;font-weight:700}' +
      '#adminPage .admin-body{padding:20px;max-width:1200px;margin:0 auto}' +
      '.admin-kpis{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:12px;margin-bottom:24px}' +
      '.admin-kpi{background:#1e293b;border:1px solid #334155;border-radius:12px;padding:14px 16px}' +
      '.admin-kpi span{display:block;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#94a3b8;margin-bottom:6px}' +
      '.admin-kpi strong{font-size:22px;color:#f8fafc}' +
      '.admin-section{margin-bottom:28px}' +
      '.admin-section h3{margin:0 0 12px;font-size:15px;color:#fce7f3}' +
      '.admin-table{border:1px solid #334155;border-radius:12px;overflow:hidden}' +
      '.admin-row{display:grid;grid-template-columns:1.4fr 1fr .8fr .6fr;gap:8px;padding:10px 14px;border-bottom:1px solid #1e293b;font-size:12px;align-items:center}' +
      '.admin-row:last-child{border-bottom:none}' +
      '.admin-row.head{background:#1e293b;font-weight:700;color:#94a3b8;text-transform:uppercase;font-size:10px;letter-spacing:.04em}' +
      '.admin-row:nth-child(even):not(.head){background:rgba(30,41,59,.4)}' +
      '.admin-bars{display:flex;align-items:flex-end;gap:4px;height:80px;padding:8px 0}' +
      '.admin-bar{flex:1;background:linear-gradient(180deg,#ec4899,#7c3aed);border-radius:4px 4px 0 0;min-width:4px;opacity:.85}' +
      '.admin-online{display:flex;flex-wrap:wrap;gap:8px}' +
      '.admin-chip{padding:6px 12px;border-radius:999px;background:#1e293b;border:1px solid #334155;font-size:12px}' +
      '@media(max-width:640px){.admin-row{grid-template-columns:1fr 1fr}}';
    document.head.appendChild(st);
  }

  async function ensureAdminShell() {
    ensureCss();
    var gate = $('adminGate');
    var page = $('adminPage');
    if (!gate || !page) return;

    if (!gate.dataset.built) {
      gate.dataset.built = '1';
      gate.innerHTML =
        '<div class="admin-login-card">' +
        '<h2>Admin Fluxora</h2>' +
        '<p class="muted">Acesso restrito ao master</p>' +
        '<label for="admEmail">E-mail</label>' +
        '<input id="admEmail" type="email" autocomplete="username" value="' +
        ADMIN_EMAIL +
        '" />' +
        '<label for="admPass">Senha</label>' +
        '<input id="admPass" type="password" autocomplete="current-password" />' +
        '<button type="button" class="btn-neon block" id="admLoginBtn">Entrar</button>' +
        '<p id="admErr" class="auth-error" hidden></p>' +
        '<button type="button" class="btn-ghost" id="admBack">Voltar</button>' +
        '</div>';
    }

    if (!page.dataset.built) {
      page.dataset.built = '1';
      page.innerHTML =
        '<header class="admin-top">' +
        '<strong>◇ Painel Admin · Fluxora</strong>' +
        '<button type="button" class="btn-ghost" id="admLogout" style="border:1px solid #334155;color:#e2e8f0;background:transparent;border-radius:999px;padding:8px 14px;cursor:pointer">Sair admin</button>' +
        '</header>' +
        '<div class="admin-tabs" id="admTabs"></div>' +
        '<div class="admin-body" id="admBody"><p class="muted">Carregando…</p></div>';
    }
  }

  function showErr(msg) {
    var err = $('admErr');
    if (!err) return;
    err.hidden = !msg;
    err.textContent = msg || '';
  }

  async function doAdminLogin() {
    var email = (($('admEmail') && $('admEmail').value) || '')
      .toLowerCase()
      .trim();
    var pass = ($('admPass') && $('admPass').value) || '';
    var btn = $('admLoginBtn');
    showErr('');

    if (!email || !pass) {
      showErr('Preencha e-mail e senha.');
      return;
    }
    if (email !== ADMIN_EMAIL) {
      showErr('Este e-mail não tem permissão de master.');
      return;
    }
    if (!cx()) {
      showErr('Convex offline. Recarregue a página e tente de novo.');
      return;
    }

    try {
      if (btn) {
        btn.disabled = true;
        btn.textContent = 'Validando…';
      }

      var hash = await sha256Hex(pass);

      /*
       * Contract (convex/admin.ts verifyMaster):
       *   email, passwordHash?, adminKey?
       * Path A: profile passwordHash match
       * Path B: adminKey === legacy plain MASTER_PLAIN
       */
      var ok = await cx().query('admin:verifyMaster', {
        email: email,
        passwordHash: hash,
        adminKey: pass,
      });

      if (!ok || !ok.ok) {
        /* secondary: auth:login with hash only */
        var login = await cx().query('auth:login', {
          email: email,
          passwordHash: hash,
        });
        if (!login) {
          showErr(
            'Credenciais inválidas. Verifique a senha master ou o hash no perfil.'
          );
          return;
        }
      }

      sessionStorage.setItem(SS_EMAIL, email);
      sessionStorage.setItem(SS_KEY, pass);

      try {
        await cx().mutation('admin:ensureMasterProfile', {
          email: email,
          adminKey: pass,
          name: 'Master Admin',
        });
      } catch (e) {
        console.warn('[admin] ensureMasterProfile', e);
      }

      onlyShow('adminPage');
      await renderDashboard();
    } catch (e) {
      var msg = String((e && e.message) || e);
      if (msg.indexOf('password') >= 0 && msg.indexOf('validator') >= 0) {
        showErr(
          'Erro de contrato API (campo password). Atualize a página (Ctrl+Shift+R).'
        );
      } else {
        showErr(msg);
      }
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Entrar';
      }
    }
  }

  function adminCreds() {
    return {
      email: sessionStorage.getItem(SS_EMAIL) || ADMIN_EMAIL,
      adminKey: sessionStorage.getItem(SS_KEY) || '',
    };
  }

  async function fetchDashboard() {
    var c = adminCreds();
    if (!cx() || !c.adminKey) throw new Error('Sessão admin expirada');
    return cx().query('admin:dashboard', {
      email: c.email,
      adminKey: c.adminKey,
    });
  }

  function fmtTime(ts) {
    if (!ts) return '—';
    try {
      return new Date(ts).toLocaleString('pt-BR');
    } catch (e) {
      return String(ts);
    }
  }

  var _dashCache = null;
  var _tab = 'overview';

  async function renderDashboard() {
    var body = $('admBody');
    var tabs = $('admTabs');
    if (!body) return;
    body.innerHTML = '<p class="muted">Carregando dashboard…</p>';

    try {
      _dashCache = await fetchDashboard();
    } catch (e) {
      body.innerHTML =
        '<p class="auth-error" style="color:#fb7185">' +
        ((e && e.message) || e) +
        '</p><p class="muted">Faça login novamente.</p>';
      return;
    }

    if (tabs) {
      var items = [
        ['overview', 'Visão geral'],
        ['users', 'Usuários'],
        ['flows', 'Fluxos'],
        ['shares', 'Compartilhamentos'],
        ['sessions', 'Sessões'],
        ['audit', 'Auditoria'],
      ];
      tabs.innerHTML = items
        .map(function (it) {
          return (
            '<button type="button" class="admin-tab' +
            (_tab === it[0] ? ' active' : '') +
            '" data-tab="' +
            it[0] +
            '">' +
            it[1] +
            '</button>'
          );
        })
        .join('');
      tabs.onclick = function (ev) {
        var t = ev.target && ev.target.getAttribute('data-tab');
        if (!t) return;
        _tab = t;
        renderDashboard();
      };
    }

    body.innerHTML = renderTab(_tab, _dashCache);
  }

  function kpi(label, val) {
    return (
      '<div class="admin-kpi"><span>' +
      label +
      '</span><strong>' +
      val +
      '</strong></div>'
    );
  }

  function renderTab(tab, dash) {
    var c = (dash && dash.counts) || {};
    var tables = (dash && dash.tables) || {};

    if (tab === 'overview') {
      var html = '<div class="admin-kpis">';
      html += kpi('Usuários', c.users || 0);
      html += kpi('Fluxos', c.flows || 0);
      html += kpi('Shares ativos', c.sharesActive || 0);
      html += kpi('Sessões online', c.sessionsOnline || 0);
      html += kpi('Presence online', c.presenceOnline || 0);
      html += kpi('Auditoria 7d', c.audit7d || 0);
      html += kpi('Auditoria 30d', c.audit30d || 0);
      html += kpi('Banners ativos', c.bannersActive || 0);
      html += '</div>';

      var tiers = (dash && dash.usageTiers) || {};
      html +=
        '<div class="admin-section"><h3>Uso por faixa (loginCount)</h3><div class="admin-kpis">';
      html += kpi('Heavy ≥20', tiers.heavy || 0);
      html += kpi('Medium 5–19', tiers.medium || 0);
      html += kpi('Light <5', tiers.light || 0);
      html += '</div></div>';

      var hist = (dash && dash.hist14d) || [];
      if (hist.length) {
        var max = Math.max.apply(
          null,
          hist.map(function (h) {
            return h.count || 0;
          }).concat([1])
        );
        html +=
          '<div class="admin-section"><h3>Atividade · 14 dias</h3><div class="admin-bars">';
        hist.forEach(function (h) {
          var pct = Math.max(4, Math.round(((h.count || 0) / max) * 100));
          html +=
            '<div class="admin-bar" style="height:' +
            pct +
            '%" title="' +
            h.day +
            ': ' +
            h.count +
            '"></div>';
        });
        html += '</div></div>';
      }

      var online = (dash && dash.online) || [];
      html += '<div class="admin-section"><h3>Online agora</h3><div class="admin-online">';
      if (!online.length) html += '<span class="muted">Ninguém online</span>';
      online.forEach(function (o) {
        html +=
          '<span class="admin-chip">' +
          (o.name || o.email || '—') +
          '</span>';
      });
      html += '</div></div>';

      var top = (dash && dash.topActors) || [];
      if (top.length) {
        html +=
          '<div class="admin-section"><h3>Top atores (30d)</h3><div class="admin-table">';
        html +=
          '<div class="admin-row head"><span>E-mail</span><span>Ações</span><span></span><span></span></div>';
        top.forEach(function (a) {
          html +=
            '<div class="admin-row"><span>' +
            (a.email || '') +
            '</span><span>' +
            (a.count || 0) +
            '</span><span></span><span></span></div>';
        });
        html += '</div></div>';
      }
      return html;
    }

    if (tab === 'users') {
      var users = tables.profiles || [];
      var h =
        '<div class="admin-section"><h3>Perfis (' +
        users.length +
        ')</h3><div class="admin-table">';
      h +=
        '<div class="admin-row head"><span>E-mail</span><span>Nome</span><span>Role</span><span>Logins</span></div>';
      users.slice(0, 80).forEach(function (u) {
        h +=
          '<div class="admin-row"><span>' +
          (u.email || '') +
          '</span><span>' +
          (u.name || '—') +
          '</span><span>' +
          (u.role || 'user') +
          '</span><span>' +
          (u.loginCount || 0) +
          '</span></div>';
      });
      h += '</div></div>';
      return h;
    }

    if (tab === 'flows') {
      var flows = tables.flows || [];
      var hf =
        '<div class="admin-section"><h3>Fluxos (' +
        flows.length +
        ')</h3><div class="admin-table">';
      hf +=
        '<div class="admin-row head"><span>Título</span><span>Owner</span><span>Nós</span><span>Atualizado</span></div>';
      flows.slice(0, 80).forEach(function (f) {
        hf +=
          '<div class="admin-row"><span>' +
          (f.title || f.key || '') +
          '</span><span>' +
          (f.ownerEmail || '') +
          '</span><span>' +
          (f.nodes || 0) +
          '</span><span>' +
          fmtTime(f.updatedAt) +
          '</span></div>';
      });
      hf += '</div></div>';
      return hf;
    }

    if (tab === 'shares') {
      var shares = tables.shares || [];
      var hs =
        '<div class="admin-section"><h3>Shares (' +
        shares.length +
        ')</h3><div class="admin-table">';
      hs +=
        '<div class="admin-row head"><span>Fluxo</span><span>E-mails</span><span>Modo</span><span>Ativo</span></div>';
      shares.slice(0, 80).forEach(function (s) {
        hs +=
          '<div class="admin-row"><span>' +
          (s.flowKey || '') +
          '</span><span>' +
          ((s.emails || []).join(', ') || '—') +
          '</span><span>' +
          (s.canEdit ? 'Colaborador' : 'Convidado') +
          '</span><span>' +
          (s.active !== false ? 'sim' : 'não') +
          '</span></div>';
      });
      hs += '</div></div>';
      return hs;
    }

    if (tab === 'sessions') {
      var sessions = tables.sessions || [];
      var hse =
        '<div class="admin-section"><h3>Sessões recentes</h3><div class="admin-table">';
      hse +=
        '<div class="admin-row head"><span>E-mail</span><span>Nome</span><span>Ativo</span><span>Last seen</span></div>';
      sessions.slice(0, 80).forEach(function (s) {
        hse +=
          '<div class="admin-row"><span>' +
          (s.email || '') +
          '</span><span>' +
          (s.name || '—') +
          '</span><span>' +
          (s.active ? 'sim' : 'não') +
          '</span><span>' +
          fmtTime(s.lastSeen) +
          '</span></div>';
      });
      hse += '</div></div>';
      return hse;
    }

    if (tab === 'audit') {
      var audit = (dash && dash.recentAudit) || [];
      var ha =
        '<div class="admin-section"><h3>Auditoria recente</h3><div class="admin-table">';
      ha +=
        '<div class="admin-row head"><span>Quando</span><span>Ator</span><span>Ação</span><span>Entidade</span></div>';
      audit.forEach(function (a) {
        ha +=
          '<div class="admin-row"><span>' +
          fmtTime(a.at) +
          '</span><span>' +
          (a.actorEmail || '') +
          '</span><span>' +
          (a.action || '') +
          '</span><span>' +
          (a.entity || '') +
          '</span></div>';
      });
      ha += '</div></div>';
      return ha;
    }

    return '<p class="muted">Aba desconhecida</p>';
  }

  function openAdminGate() {
    ensureAdminShell();
    var email = sessionStorage.getItem(SS_EMAIL);
    var key = sessionStorage.getItem(SS_KEY);
    if (email && key) {
      onlyShow('adminPage');
      renderDashboard();
    } else {
      onlyShow('adminGate');
    }
  }

  function wire() {
    ensureAdminShell();

    var footer = $('footerAdmin');
    if (footer && !footer.__adminWired) {
      footer.onclick = function (ev) {
        ev.preventDefault();
        openAdminGate();
      };
      footer.__adminWired = true;
    }

    document.addEventListener('click', function (ev) {
      var t = ev.target;
      if (!t || !t.id) return;
      if (t.id === 'admLoginBtn') {
        ev.preventDefault();
        doAdminLogin();
      }
      if (t.id === 'admBack') {
        ev.preventDefault();
        onlyShow('publicPage');
      }
      if (t.id === 'admLogout') {
        ev.preventDefault();
        sessionStorage.removeItem(SS_EMAIL);
        sessionStorage.removeItem(SS_KEY);
        onlyShow('publicPage');
      }
    });

    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter') {
        var gate = $('adminGate');
        if (gate && !gate.hidden && document.activeElement) {
          var id = document.activeElement.id;
          if (id === 'admEmail' || id === 'admPass') {
            ev.preventDefault();
            doAdminLogin();
          }
        }
      }
    });
  }

  /* Session heartbeat singleton (app users) — keep from prior version */
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
  console.log('[Fluxora] admin-panel v3 — verifyMaster contract + dashboard');
})();
