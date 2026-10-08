/**
 * Admin panel — single source of truth for adminGate + adminPage.
 * Master: tarcisio.rocha.engenheiro@gmail.com
 * Auth: Convex auth:login hash OR legacy admin key 2004103007
 */
(function () {
  var MASTER = 'tarcisio.rocha.engenheiro@gmail.com';
  var LEGACY_KEY = '2004103007';
  var state = {
    unlocked: false,
    email: '',
    adminKey: '',
    data: null,
  };

  function $(id) {
    return document.getElementById(id);
  }

  function cx() {
    return window.convexClient || null;
  }

  function notify(msg, kind) {
    if (typeof showNotification === 'function') showNotification(msg, kind || 'info');
    else if (typeof toast === 'function') try { toast(msg, kind === 'error'); } catch (e) {}
  }

  async function hashPass(pw) {
    var data = new TextEncoder().encode('fluxora:' + pw);
    var buf = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(buf))
      .map(function (b) {
        return b.toString(16).padStart(2, '0');
      })
      .join('');
  }

  function onlyShowAdminGate() {
    ['publicPage', 'appMain', 'adminPage', 'flowManager', 'loginModal', 'guestModal'].forEach(
      function (id) {
        var el = $(id);
        if (el) el.hidden = true;
      }
    );
    if ($('adminGate')) $('adminGate').hidden = false;
  }

  function onlyShowAdminPage() {
    ['publicPage', 'appMain', 'adminGate', 'flowManager', 'loginModal', 'guestModal'].forEach(
      function (id) {
        var el = $(id);
        if (el) el.hidden = true;
      }
    );
    if ($('adminPage')) $('adminPage').hidden = false;
  }

  function fmt(ts) {
    if (!ts) return '—';
    try {
      return new Date(ts).toLocaleString('pt-BR');
    } catch (e) {
      return String(ts);
    }
  }

  function injectAdminCSS() {
    if ($('admin-panel-css')) return;
    var st = document.createElement('style');
    st.id = 'admin-panel-css';
    st.textContent = [
      '#adminGate.admin-gate{min-height:100vh;display:flex;align-items:center;justify-content:center;background:radial-gradient(1200px 600px at 20% 0%,#1a1040 0%,#0a0e1a 55%,#05070f 100%);padding:24px}',
      '#adminGate .login-modal{width:min(400px,100%);background:rgba(15,23,42,.92);border:1px solid rgba(255,45,149,.35);border-radius:16px;padding:28px 24px;box-shadow:0 20px 60px rgba(0,0,0,.45),0 0 40px rgba(255,45,149,.12);backdrop-filter:blur(12px)}',
      '#adminGate .login-modal h2{margin:0 0 4px;color:#fff;font-size:1.35rem;letter-spacing:.02em}',
      '#adminGate .admin-sub{color:#94a3b8;font-size:13px;margin:0 0 20px}',
      '#adminGate .field{display:flex;flex-direction:column;gap:6px;margin-bottom:14px}',
      '#adminGate .field span{color:#cbd5e1;font-size:12px;font-weight:600}',
      '#adminGate .field input{padding:12px 14px;border-radius:10px;border:1px solid #334155;background:#0f172a;color:#f8fafc;font-size:14px}',
      '#adminGate .field input:focus{outline:none;border-color:#ff2d95;box-shadow:0 0 0 3px rgba(255,45,149,.2)}',
      '#adminGate .btn-neon.block{width:100%;padding:12px;border:none;border-radius:10px;background:linear-gradient(135deg,#ff2d95,#a21caf);color:#fff;font-weight:700;cursor:pointer;font-size:15px}',
      '#adminGate .btn-neon.block:hover{filter:brightness(1.08)}',
      '#adminGate .btn-neon.block:disabled{opacity:.6;cursor:wait}',
      '#adminGate .auth-error{color:#fca5a5;font-size:13px;margin-top:10px}',
      '#adminGate .admin-back{display:block;margin-top:14px;text-align:center;color:#94a3b8;font-size:13px;background:none;border:none;cursor:pointer;text-decoration:underline}',
      '#adminPage.admin-page{min-height:100vh;background:#0b1220;color:#e2e8f0}',
      '#adminPage .admin-top{display:flex;align-items:center;justify-content:space-between;padding:14px 20px;background:#0f172a;border-bottom:1px solid #1e293b;position:sticky;top:0;z-index:20}',
      '#adminPage .admin-top strong{color:#fff;font-size:1rem}',
      '#adminPage .admin-top .btn-ghost{background:transparent;border:1px solid #334155;color:#e2e8f0;border-radius:8px;padding:8px 12px;cursor:pointer}',
      '#adminPage .admin-kpi{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:12px;padding:16px 20px}',
      '#adminPage .kpi{background:#111827;border:1px solid #1e293b;border-radius:12px;padding:14px;box-shadow:0 1px 0 rgba(255,255,255,.03)}',
      '#adminPage .kpi b{display:block;font-size:1.5rem;color:#fff;margin-top:4px}',
      '#adminPage .kpi span{font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:.04em}',
      '#adminPage .admin-grid{display:grid;grid-template-columns:1fr;gap:16px;padding:0 20px 32px}',
      '@media(min-width:960px){#adminPage .admin-grid{grid-template-columns:1fr 1fr}}',
      '#adminPage .admin-card{background:#111827;border:1px solid #1e293b;border-radius:12px;padding:16px;overflow:auto}',
      '#adminPage .admin-card h3{margin:0 0 12px;font-size:14px;color:#f1f5f9}',
      '#adminPage table.adm{width:100%;border-collapse:collapse;font-size:12px}',
      '#adminPage table.adm th,#adminPage table.adm td{text-align:left;padding:8px 6px;border-bottom:1px solid #1e293b;vertical-align:top}',
      '#adminPage table.adm th{color:#94a3b8;font-weight:600}',
      '#adminPage .bar-chart{display:flex;align-items:flex-end;gap:4px;height:100px;padding-top:8px}',
      '#adminPage .bar-chart i{flex:1;background:linear-gradient(180deg,#ff2d95,#6366f1);border-radius:4px 4px 0 0;min-height:2px;opacity:.9}',
      '#adminPage .tier{display:flex;gap:10px;flex-wrap:wrap}',
      '#adminPage .tier span{background:#0f172a;border:1px solid #334155;border-radius:999px;padding:6px 12px;font-size:12px}',
      '#adminPage .tabs{display:flex;gap:6px;flex-wrap:wrap;padding:0 20px 8px}',
      '#adminPage .tabs button{background:#0f172a;border:1px solid #334155;color:#cbd5e1;border-radius:8px;padding:8px 12px;cursor:pointer;font-size:12px;font-weight:600}',
      '#adminPage .tabs button.on{background:#ff2d95;border-color:#ff2d95;color:#fff}',
      '#adminPage .panel{display:none}',
      '#adminPage .panel.on{display:block}',
      '#adminPage .banner-form{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px}',
      '#adminPage .banner-form input,#adminPage .banner-form select{padding:8px;border-radius:8px;border:1px solid #334155;background:#0f172a;color:#fff}',
    ].join('');
    document.head.appendChild(st);
  }

  function ensureGateDOM() {
    var gate = $('adminGate');
    if (!gate) return;
    gate.className = 'admin-gate';
    gate.innerHTML =
      '<div class="login-modal">' +
      '<h2>◇ Admin Fluxora</h2>' +
      '<p class="admin-sub">Acesso master · auditoria e métricas Convex</p>' +
      '<label class="field"><span>E-mail master</span>' +
      '<input id="adminEmail" type="email" autocomplete="username" placeholder="seu@email.com"/></label>' +
      '<label class="field"><span>Senha</span>' +
      '<input id="adminPass" type="password" autocomplete="current-password" placeholder="••••••••"/></label>' +
      '<button type="button" class="btn-neon block" id="btnAdminLogin">Entrar no painel</button>' +
      '<p class="auth-error" id="adminGateMsg" hidden></p>' +
      '<button type="button" class="admin-back" id="adminGateBack">← Voltar ao site</button>' +
      '</div>';
  }

  function ensurePageDOM() {
    var page = $('adminPage');
    if (!page) return;
    page.className = 'admin-page';
    page.innerHTML =
      '<header class="admin-top">' +
      '<strong>◇ Painel Admin · <span id="adminWho">—</span></strong>' +
      '<div style="display:flex;gap:8px">' +
      '<button type="button" class="btn-ghost" id="adminRefresh">Atualizar</button>' +
      '<button type="button" class="btn-ghost" id="adminClose">Sair</button>' +
      '</div></header>' +
      '<div class="admin-kpi" id="adminKpis"></div>' +
      '<div class="tabs" id="adminTabs">' +
      '<button type="button" data-tab="overview" class="on">Visão geral</button>' +
      '<button type="button" data-tab="users">Usuários</button>' +
      '<button type="button" data-tab="flows">Fluxos</button>' +
      '<button type="button" data-tab="shares">Shares</button>' +
      '<button type="button" data-tab="sessions">Sessões</button>' +
      '<button type="button" data-tab="audit">Auditoria</button>' +
      '<button type="button" data-tab="banners">Banners</button>' +
      '</div>' +
      '<div class="admin-grid">' +
      '<section class="admin-card panel on" data-panel="overview">' +
      '<h3>Atualizações (14 dias)</h3><div class="bar-chart" id="adminHist"></div>' +
      '<h3 style="margin-top:16px">Uso por intensidade</h3><div class="tier" id="adminTiers"></div>' +
      '<h3 style="margin-top:16px">Online agora</h3><div id="adminOnline"></div>' +
      '<h3 style="margin-top:16px">Top atores (30d)</h3><div id="adminTop"></div>' +
      '</section>' +
      '<section class="admin-card panel" data-panel="users"><h3>profiles</h3><div id="adminUsers"></div></section>' +
      '<section class="admin-card panel" data-panel="flows"><h3>flows</h3><div id="adminFlows"></div></section>' +
      '<section class="admin-card panel" data-panel="shares"><h3>shares</h3><div id="adminShares"></div></section>' +
      '<section class="admin-card panel" data-panel="sessions"><h3>sessions + presence</h3><div id="adminSessions"></div></section>' +
      '<section class="admin-card panel" data-panel="audit"><h3>auditLogs</h3><div id="adminAudit"></div></section>' +
      '<section class="admin-card panel" data-panel="banners"><h3>systemBanners</h3>' +
      '<div class="banner-form">' +
      '<input id="bannerMsg" type="text" placeholder="Mensagem do banner" style="flex:1;min-width:180px"/>' +
      '<select id="bannerLevel"><option value="info">info</option><option value="warn">warn</option><option value="critical">critical</option></select>' +
      '<button type="button" class="btn-ghost" id="bannerCreate">Publicar</button>' +
      '</div><div id="adminBanners"></div></section>' +
      '</div>';
  }

  function showGateErr(msg) {
    var el = $('adminGateMsg');
    if (!el) return;
    el.textContent = msg || '';
    el.hidden = !msg;
  }

  async function doLogin() {
    var email = (($('adminEmail') && $('adminEmail').value) || '').trim().toLowerCase();
    var pass = ($('adminPass') && $('adminPass').value) || '';
    var btn = $('btnAdminLogin');
    showGateErr('');
    if (email !== MASTER) {
      showGateErr('Apenas o e-mail master pode acessar o admin.');
      return;
    }
    if (!pass || pass.length < 4) {
      showGateErr('Informe a senha.');
      return;
    }
    if (!cx()) {
      showGateErr('Convex offline — verifique a conexão.');
      return;
    }
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Validando…';
    }
    try {
      var passwordHash = await hashPass(pass);
      var verified = await cx().query('admin:verifyMaster', {
        email: email,
        passwordHash: passwordHash,
        adminKey: pass,
      });
      if (!verified || !verified.ok) {
        showGateErr('Credenciais inválidas. Use a senha da conta ou a chave master.');
        return;
      }
      state.unlocked = true;
      state.email = email;
      state.adminKey = pass;
      try {
        await cx().mutation('admin:ensureMasterProfile', {
          email: email,
          adminKey: pass,
          name: verified.name || 'Master',
        });
      } catch (e) {
        console.warn('ensureMaster', e);
      }
      try {
        await cx().mutation('auth:recordLogin', {
          email: email,
          userAgent: navigator.userAgent,
        });
      } catch (e2) {}
      try {
        await cx().mutation('audit:log', {
          actorEmail: email,
          action: 'admin.login',
          entity: 'admin',
          detail: 'via=' + (verified.via || ''),
        });
      } catch (e3) {}
      notify('Admin autenticado', 'success');
      onlyShowAdminPage();
      if ($('adminWho')) $('adminWho').textContent = email;
      await loadDashboard();
    } catch (e) {
      console.error(e);
      showGateErr('Erro: ' + (e.message || e));
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Entrar no painel';
      }
    }
  }

  function tableHTML(headers, rows) {
    var h =
      '<table class="adm"><thead><tr>' +
      headers.map(function (x) {
        return '<th>' + x + '</th>';
      }).join('') +
      '</tr></thead><tbody>';
    rows.forEach(function (r) {
      h +=
        '<tr>' +
        r
          .map(function (c) {
            return '<td>' + (c == null ? '—' : String(c)) + '</td>';
          })
          .join('') +
        '</tr>';
    });
    return h + '</tbody></table>';
  }

  function renderDashboard(d) {
    state.data = d;
    var c = d.counts || {};
    var kpis = [
      ['Usuários', c.users],
      ['Fluxos', c.flows],
      ['Shares ativos', c.sharesActive],
      ['Online (sessão)', c.sessionsOnline],
      ['Online (board)', c.presenceOnline],
      ['Auditoria 7d', c.audit7d],
      ['Auditoria 30d', c.audit30d],
      ['Banners', c.bannersActive],
    ];
    var kpiEl = $('adminKpis');
    if (kpiEl) {
      kpiEl.innerHTML = kpis
        .map(function (k) {
          return (
            '<div class="kpi"><span>' +
            k[0] +
            '</span><b>' +
            (k[1] == null ? 0 : k[1]) +
            '</b></div>'
          );
        })
        .join('');
    }

    var hist = d.hist14d || [];
    var max = Math.max.apply(
      null,
      hist.map(function (x) {
        return x.count;
      }).concat([1])
    );
    var histEl = $('adminHist');
    if (histEl) {
      histEl.innerHTML = hist
        .map(function (x) {
          var h = Math.max(2, Math.round((x.count / max) * 96));
          return '<i title="' + x.day + ': ' + x.count + '" style="height:' + h + 'px"></i>';
        })
        .join('');
    }

    var t = d.usageTiers || {};
    var tierEl = $('adminTiers');
    if (tierEl) {
      tierEl.innerHTML =
        '<span>🔥 Pesados (≥20 logins): <b>' +
        (t.heavy || 0) +
        '</b></span>' +
        '<span>⚖️ Médios: <b>' +
        (t.medium || 0) +
        '</b></span>' +
        '<span>🌱 Leves: <b>' +
        (t.light || 0) +
        '</b></span>';
    }

    var on = d.online || [];
    var onEl = $('adminOnline');
    if (onEl) {
      onEl.innerHTML = on.length
        ? tableHTML(
            ['E-mail', 'Nome', 'Visto'],
            on.map(function (s) {
              return [s.email, s.name, fmt(s.lastSeen)];
            })
          )
        : '<p style="color:#94a3b8;font-size:13px">Ninguém online no momento.</p>';
    }

    var top = d.topActors || [];
    var topEl = $('adminTop');
    if (topEl) {
      topEl.innerHTML = tableHTML(
        ['E-mail', 'Ações 30d'],
        top.map(function (a) {
          return [a.email, a.count];
        })
      );
    }

    var tables = d.tables || {};
    var usersEl = $('adminUsers');
    if (usersEl) {
      usersEl.innerHTML = tableHTML(
        ['E-mail', 'Nome', 'Role', 'Logins', 'Último login', 'Empresa'],
        (tables.profiles || []).map(function (p) {
          return [
            p.email,
            p.name,
            p.role,
            p.loginCount,
            fmt(p.lastLoginAt),
            p.company,
          ];
        })
      );
    }
    var flowsEl = $('adminFlows');
    if (flowsEl) {
      flowsEl.innerHTML = tableHTML(
        ['Título', 'Key', 'Owner', 'Macros', 'Nós', 'Atualizado'],
        (tables.flows || []).map(function (f) {
          return [f.title, f.key, f.ownerEmail, f.macros, f.nodes, fmt(f.updatedAt)];
        })
      );
    }
    var shEl = $('adminShares');
    if (shEl) {
      shEl.innerHTML = tableHTML(
        ['Flow', 'E-mails', 'Edit', 'Ativo', 'Por'],
        (tables.shares || []).map(function (s) {
          return [
            s.flowKey,
            (s.emails || []).join(', '),
            s.canEdit ? 'sim' : 'não',
            s.active ? 'sim' : 'não',
            s.createdBy,
          ];
        })
      );
    }
    var sesEl = $('adminSessions');
    if (sesEl) {
      sesEl.innerHTML =
        '<h4 style="margin:0 0 8px;color:#94a3b8">Sessions</h4>' +
        tableHTML(
          ['E-mail', 'Ativo', 'Início', 'Last seen'],
          (tables.sessions || []).map(function (s) {
            return [s.email, s.active ? 'sim' : 'não', fmt(s.startedAt), fmt(s.lastSeen)];
          })
        ) +
        '<h4 style="margin:16px 0 8px;color:#94a3b8">Presence (boards)</h4>' +
        tableHTML(
          ['Flow', 'E-mail', 'Nome', 'Last seen'],
          (tables.presence || []).map(function (p) {
            return [p.flowKey, p.email, p.name, fmt(p.lastSeen)];
          })
        );
    }
    var audEl = $('adminAudit');
    if (audEl) {
      audEl.innerHTML = tableHTML(
        ['Quando', 'Ator', 'Ação', 'Entidade', 'Id', 'Detalhe'],
        (d.recentAudit || []).map(function (a) {
          return [fmt(a.at), a.actorEmail, a.action, a.entity, a.entityId, a.detail];
        })
      );
    }
    var banEl = $('adminBanners');
    if (banEl) {
      banEl.innerHTML = tableHTML(
        ['Msg', 'Nível', 'Ativo', 'Por', 'Criado'],
        (tables.banners || []).map(function (b) {
          return [b.message, b.level, b.active ? 'sim' : 'não', b.createdBy, fmt(b.createdAt)];
        })
      );
    }
  }

  async function loadDashboard() {
    if (!state.unlocked || !cx()) return;
    try {
      var d = await cx().query('admin:dashboard', {
        email: state.email,
        adminKey: state.adminKey,
      });
      renderDashboard(d);
    } catch (e) {
      console.error(e);
      notify('Erro ao carregar dashboard: ' + (e.message || e), 'error');
      var kpi = $('adminKpis');
      if (kpi)
        kpi.innerHTML =
          '<div class="kpi"><span>Erro</span><b style="font-size:13px">Faça convex deploy das funções admin/audit/sessions</b></div>';
    }
  }

  function wireTabs() {
    var tabs = $('adminTabs');
    if (!tabs || tabs.dataset.wired === '1') return;
    tabs.dataset.wired = '1';
    tabs.addEventListener('click', function (ev) {
      var btn = ev.target.closest('button[data-tab]');
      if (!btn) return;
      tabs.querySelectorAll('button').forEach(function (b) {
        b.classList.toggle('on', b === btn);
      });
      var tab = btn.getAttribute('data-tab');
      document.querySelectorAll('#adminPage .panel').forEach(function (p) {
        p.classList.toggle('on', p.getAttribute('data-panel') === tab);
      });
    });
  }

  function wire() {
    injectAdminCSS();
    ensureGateDOM();
    ensurePageDOM();
    wireTabs();

    var footer = $('footerAdmin');
    if (footer) {
      footer.onclick = function (e) {
        e.preventDefault();
        state.unlocked = false;
        onlyShowAdminGate();
        if ($('adminEmail')) $('adminEmail').value = MASTER;
        if ($('adminPass')) $('adminPass').value = '';
        showGateErr('');
      };
    }

    var loginBtn = $('btnAdminLogin');
    if (loginBtn) loginBtn.onclick = function () {
      doLogin();
    };
    var pass = $('adminPass');
    if (pass) {
      pass.onkeydown = function (ev) {
        if (ev.key === 'Enter') doLogin();
      };
    }
    var back = $('adminGateBack');
    if (back) {
      back.onclick = function () {
        if ($('adminGate')) $('adminGate').hidden = true;
        if ($('publicPage')) $('publicPage').hidden = false;
      };
    }
    var close = $('adminClose');
    if (close) {
      close.onclick = function () {
        state.unlocked = false;
        state.adminKey = '';
        if ($('adminPage')) $('adminPage').hidden = true;
        if ($('publicPage')) $('publicPage').hidden = false;
      };
    }
    var ref = $('adminRefresh');
    if (ref) ref.onclick = function () {
      loadDashboard();
    };

    var banBtn = $('bannerCreate');
    if (banBtn) {
      banBtn.onclick = async function () {
        if (!state.unlocked) return;
        var msg = ($('bannerMsg') && $('bannerMsg').value) || '';
        var level = ($('bannerLevel') && $('bannerLevel').value) || 'info';
        if (!msg.trim()) {
          notify('Digite a mensagem', 'error');
          return;
        }
        try {
          await cx().mutation('admin:setBanner', {
            email: state.email,
            adminKey: state.adminKey,
            message: msg.trim(),
            level: level,
            active: true,
          });
          notify('Banner publicado', 'success');
          if ($('bannerMsg')) $('bannerMsg').value = '';
          await loadDashboard();
        } catch (e) {
          notify('Erro: ' + (e.message || e), 'error');
        }
      };
    }
  }

  // Hook login success → recordLogin + session (non-admin)
  function hookUserLogin() {
    if (window.__adminLoginHooked) return;
    window.__adminLoginHooked = true;
    var prev = window.enterApp;
    if (typeof prev !== 'function') return;
    window.enterApp = async function () {
      var r = prev.apply(this, arguments);
      try {
        var u = window.user || (typeof user !== 'undefined' ? user : null);
        if (u && u.email && cx()) {
          await cx().mutation('auth:recordLogin', {
            email: u.email,
            userAgent: navigator.userAgent,
          });
          setInterval(function () {
            try {
              if (window.user && window.user.email)
                cx().mutation('sessions:heartbeat', {
                  email: window.user.email,
                  name: window.user.name || '',
                  userAgent: navigator.userAgent,
                });
            } catch (e) {}
          }, 45000);
        }
      } catch (e) {
        console.warn('recordLogin', e);
      }
      return r;
    };
  }

  wire();
  setTimeout(wire, 600);
  setTimeout(hookUserLogin, 900);
  console.log('[Fluxora] admin-panel v1');
})();
