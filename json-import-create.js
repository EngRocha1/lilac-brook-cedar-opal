/**
 * JSON upload (replace current board) + Create Flow modal
 * (blank | from JSON | clone existing)
 */
(function () {
  function $(id) {
    return document.getElementById(id);
  }
  function cx() {
    return window.convexClient;
  }
  function toast(msg, err) {
    if (typeof mostrarToast === 'function')
      mostrarToast(msg, err ? 'error' : 'success');
    else if (typeof window.showNotification === 'function')
      window.showNotification(msg, err ? 'error' : 'success');
    else if (typeof window.toast === 'function') window.toast(msg, err);
    else console.log(msg);
  }
  function flowKey() {
    return window.flowKey || localStorage.getItem('hemopi_flow_key') || '';
  }
  function newKey() {
    return 'flow-' + Math.random().toString(36).slice(2, 10) + '-' + Date.now().toString(36);
  }

  function ensureCss() {
    if (document.getElementById('json-import-css')) return;
    var st = document.createElement('style');
    st.id = 'json-import-css';
    st.textContent =
      '#createFlowModal.modal-bg,#importJsonModal.modal-bg{z-index:10025}' +
      '#createFlowModal .modal,#importJsonModal .modal{max-width:520px;width:min(520px,94vw)}' +
      '.cf-options{display:flex;flex-direction:column;gap:10px;margin:12px 0}' +
      '.cf-option{display:flex;align-items:flex-start;gap:12px;padding:14px 16px;border:2px solid #e2e8f0;border-radius:12px;cursor:pointer;background:#fff;transition:border-color .15s,box-shadow .15s}' +
      '.cf-option:hover{border-color:#94a3b8;box-shadow:0 2px 8px rgba(15,23,42,.06)}' +
      '.cf-option.active{border-color:#0f766e;background:#f0fdfa;box-shadow:0 0 0 1px #0f766e}' +
      '.cf-option input{margin-top:3px;accent-color:#0f766e}' +
      '.cf-option strong{display:block;font-size:14px;color:#0f172a}' +
      '.cf-option span{display:block;font-size:12px;color:#64748b;margin-top:2px}' +
      '.cf-fields{display:none;flex-direction:column;gap:10px;margin-top:4px}' +
      '.cf-fields.show{display:flex}' +
      '.cf-fields label{font-size:12px;font-weight:600;color:#475569}' +
      '.cf-fields input[type=text],.cf-fields input[type=file],.cf-fields select{width:100%;box-sizing:border-box;padding:10px 12px;border:1px solid #cbd5e1;border-radius:10px;font-size:14px}' +
      '.cf-actions{display:flex;flex-direction:column;gap:8px;margin-top:16px}' +
      '.cf-actions .btn-primary{width:100%;padding:12px;border:none;border-radius:10px;background:#0f766e;color:#fff;font-weight:700;cursor:pointer}' +
      '.cf-actions .btn-primary:hover{background:#0d9488}' +
      '.cf-actions .btn-primary:disabled{opacity:.6;cursor:wait}' +
      '.cf-actions .btn-ghost{width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:10px;background:#fff;cursor:pointer}' +
      /* upload btn next to download */
      '.status-strip .action-icons .btn-upload-json,' +
      '.action-icons .btn-upload-json{width:40px!important;height:40px!important;min-width:40px!important;padding:0!important;border-radius:10px!important;display:inline-flex!important;align-items:center;justify-content:center;border:1px solid #e2e8f0!important;background:#f8fafc!important;color:#0f172a!important;cursor:pointer}' +
      '.status-strip .action-icons .btn-upload-json:hover{background:#e2e8f0!important}';
    document.head.appendChild(st);
  }

  /** Normalize various JSON shapes into a flow data object */
  function normalizeFlowJson(raw) {
    if (!raw || typeof raw !== 'object') throw new Error('JSON inválido');
    // { data: { macros, nodes... } }
    if (raw.data && (raw.data.macros || raw.data.nodes)) {
      return {
        title: raw.title || raw.data.title || 'Fluxo importado',
        data: raw.data,
      };
    }
    // direct flow
    if (raw.macros || raw.nodes || raw.edges) {
      return {
        title: raw.title || 'Fluxo importado',
        data: raw,
      };
    }
    throw new Error(
      'JSON não parece um fluxo Fluxora (faltam macros/nodes/edges)'
    );
  }

  function readFileAsJson(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () {
        try {
          resolve(JSON.parse(String(reader.result || '')));
        } catch (e) {
          reject(new Error('Arquivo não é JSON válido'));
        }
      };
      reader.onerror = function () {
        reject(new Error('Falha ao ler arquivo'));
      };
      reader.readAsText(file);
    });
  }

  async function applyFlowToBoard(data, title, opts) {
    opts = opts || {};
    window.flow = data;
    if (!window.flow.votes) window.flow.votes = {};
    if (!window.flow.comments) window.flow.comments = {};
    if (!window.flow.previews) window.flow.previews = {};
    if (title) {
      window.flow.title = title;
      if (typeof window.flowTitle !== 'undefined') window.flowTitle = title;
    }
    if (typeof window.render === 'function') window.render();
    if (typeof window.renderBannerMeta === 'function') window.renderBannerMeta();
    if (typeof window.updateProgress === 'function') {
      try {
        window.updateProgress();
      } catch (e) {}
    }
    if (typeof window.fitBoardToScreen === 'function') {
      setTimeout(function () {
        window.fitBoardToScreen(true);
      }, 80);
    }

    if (opts.save !== false) {
      var key = flowKey();
      if (cx() && key) {
        window.__allowCloudSave = true;
        try {
          await cx().mutation('flows:save', {
            key: key,
            title: title || key,
            data: window.flow,
            ownerEmail:
              (window.user && window.user.email) ||
              localStorage.getItem('hemopi_user_email') ||
              undefined,
          });
          toast('Fluxo atualizado na nuvem');
        } catch (e) {
          toast(e.message || 'Salvo localmente; falha na nuvem', true);
        }
      }
      try {
        localStorage.setItem(
          'hemopi_flow_' + key,
          JSON.stringify(window.flow)
        );
      } catch (e) {}
    }
  }

  /* ---- Upload JSON into CURRENT project ---- */
  function ensureUploadBtn() {
    var actions =
      document.querySelector('.status-strip .action-icons') ||
      document.querySelector('.tool-group-actions');
    if (!actions || $('btnUploadJson')) return;

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'btnUploadJson';
    btn.className = 'btn btn-upload-json';
    btn.title = 'Importar JSON (substitui o fluxo atual)';
    btn.setAttribute('aria-label', 'Importar JSON');
    btn.innerHTML =
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>';

    var input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.style.display = 'none';
    input.id = 'jsonUploadInput';

    btn.onclick = function () {
      input.click();
    };
    input.onchange = async function () {
      var file = input.files && input.files[0];
      input.value = '';
      if (!file) return;
      var ok = confirm(
        'Ao importar este JSON você perderá o desenho atual do board.\n\nDeseja continuar e substituir o fluxo atual?'
      );
      if (!ok) return;
      try {
        var raw = await readFileAsJson(file);
        var norm = normalizeFlowJson(raw);
        await applyFlowToBoard(norm.data, norm.title || flowKey(), {
          save: true,
        });
        toast('JSON importado com sucesso');
      } catch (e) {
        toast(e.message || 'Falha ao importar', true);
      }
    };

    /* Insert before download (↓) or before save */
    var dl =
      actions.querySelector('button[onclick*="exportJSON"]') ||
      actions.querySelector('.btn.pri');
    if (dl) actions.insertBefore(btn, dl);
    else actions.appendChild(btn);
    actions.appendChild(input);
  }

  /* ---- Create Flow Modal ---- */
  function ensureCreateModal() {
    if ($('createFlowModal')) return;
    var bg = document.createElement('div');
    bg.className = 'modal-bg';
    bg.id = 'createFlowModal';
    bg.onclick = function (e) {
      if (e.target === bg) closeCreateModal();
    };
    bg.innerHTML =
      '<div class="modal">' +
      '<div class="modal-h"><strong>Criar novo fluxo</strong>' +
      '<button type="button" class="x" id="createFlowClose">×</button></div>' +
      '<div class="modal-b">' +
      '<label style="font-size:12px;font-weight:600;color:#475569">Nome do fluxo</label>' +
      '<input id="cfTitle" type="text" placeholder="Ex: Jornada do doador v2" style="width:100%;box-sizing:border-box;padding:10px 12px;border:1px solid #cbd5e1;border-radius:10px;margin:6px 0 12px;font-size:14px"/>' +
      '<div class="cf-options">' +
      '<label class="cf-option active" data-mode="blank">' +
      '<input type="radio" name="cfMode" value="blank" checked/>' +
      '<div><strong>Canvas em branco</strong><span>Comece do zero com macros e formas vazias.</span></div></label>' +
      '<label class="cf-option" data-mode="json">' +
      '<input type="radio" name="cfMode" value="json"/>' +
      '<div><strong>Criar com JSON</strong><span>Importe um JSON exportado (ou gerado por IA) como novo fluxo.</span></div></label>' +
      '<label class="cf-option" data-mode="clone">' +
      '<input type="radio" name="cfMode" value="clone"/>' +
      '<div><strong>Clonar fluxo existente</strong><span>Copia um fluxo da sua conta para editar à parte.</span></div></label>' +
      '</div>' +
      '<div class="cf-fields" id="cfJsonFields">' +
      '<label>Arquivo JSON</label>' +
      '<input type="file" id="cfJsonFile" accept="application/json,.json"/>' +
      '</div>' +
      '<div class="cf-fields" id="cfCloneFields">' +
      '<label>Fluxo de origem</label>' +
      '<select id="cfCloneSelect"><option value="">Carregando…</option></select>' +
      '</div>' +
      '<div class="cf-actions">' +
      '<button type="button" class="btn-primary" id="cfSubmit">Criar fluxo</button>' +
      '<button type="button" class="btn-ghost" id="cfCancel">Cancelar</button>' +
      '</div></div></div>';
    document.body.appendChild(bg);

    $('createFlowClose').onclick = closeCreateModal;
    $('cfCancel').onclick = closeCreateModal;
    $('cfSubmit').onclick = submitCreate;

    bg.querySelectorAll('.cf-option').forEach(function (lab) {
      lab.addEventListener('click', function () {
        bg.querySelectorAll('.cf-option').forEach(function (x) {
          x.classList.remove('active');
        });
        lab.classList.add('active');
        var radio = lab.querySelector('input');
        if (radio) radio.checked = true;
        syncModeFields();
      });
    });
  }

  function syncModeFields() {
    var mode =
      (document.querySelector('input[name="cfMode"]:checked') || {}).value ||
      'blank';
    var jf = $('cfJsonFields');
    var cf = $('cfCloneFields');
    if (jf) jf.classList.toggle('show', mode === 'json');
    if (cf) cf.classList.toggle('show', mode === 'clone');
    if (mode === 'clone') loadCloneOptions();
  }

  function closeCreateModal() {
    var m = $('createFlowModal');
    if (m) m.classList.remove('open');
  }

  async function loadCloneOptions() {
    var sel = $('cfCloneSelect');
    if (!sel || !cx()) return;
    sel.innerHTML = '<option value="">Carregando…</option>';
    try {
      var email =
        (window.user && window.user.email) ||
        localStorage.getItem('hemopi_user_email') ||
        '';
      var rows =
        (await cx().query('flows:listMine', { ownerEmail: email })) ||
        (await cx().query('flows:listByOwner', { ownerEmail: email })) ||
        [];
      if (!rows.length) {
        sel.innerHTML = '<option value="">Nenhum fluxo encontrado</option>';
        return;
      }
      sel.innerHTML = rows
        .map(function (r) {
          var t = (r.title || r.key || 'Fluxo').replace(/</g, '');
          return (
            '<option value="' +
            String(r.key).replace(/"/g, '') +
            '">' +
            t +
            '</option>'
          );
        })
        .join('');
    } catch (e) {
      sel.innerHTML = '<option value="">Erro ao listar</option>';
    }
  }

  async function submitCreate() {
    var title = (($('cfTitle') && $('cfTitle').value) || '').trim();
    if (!title) {
      toast('Informe um nome para o fluxo', true);
      return;
    }
    var mode =
      (document.querySelector('input[name="cfMode"]:checked') || {}).value ||
      'blank';
    var btn = $('cfSubmit');
    try {
      if (btn) {
        btn.disabled = true;
        btn.textContent = 'Criando…';
      }

      var data;
      if (mode === 'blank') {
        data =
          typeof window.emptyFlow === 'function'
            ? window.emptyFlow()
            : { macros: [], nodes: [], edges: [], votes: {}, comments: {} };
      } else if (mode === 'json') {
        var file = $('cfJsonFile') && $('cfJsonFile').files[0];
        if (!file) {
          toast('Selecione um arquivo JSON', true);
          return;
        }
        var raw = await readFileAsJson(file);
        var norm = normalizeFlowJson(raw);
        data = norm.data;
        if (!title) title = norm.title;
      } else if (mode === 'clone') {
        var srcKey = $('cfCloneSelect') && $('cfCloneSelect').value;
        if (!srcKey) {
          toast('Escolha um fluxo para clonar', true);
          return;
        }
        var remote = await cx().query('flows:get', { key: srcKey });
        var src =
          (remote && remote.data) ||
          (remote && remote.nodes ? remote : null);
        if (!src) throw new Error('Fluxo origem não encontrado');
        data = JSON.parse(JSON.stringify(src));
      } else {
        data = { macros: [], nodes: [], edges: [], votes: {}, comments: {} };
      }

      var key = newKey();
      var email =
        (window.user && window.user.email) ||
        localStorage.getItem('hemopi_user_email') ||
        '';

      if (cx()) {
        window.__allowCloudSave = true;
        await cx().mutation('flows:save', {
          key: key,
          title: title,
          data: data,
          ownerEmail: email || undefined,
        });
      }

      window.flowKey = key;
      localStorage.setItem('hemopi_flow_key', key);
      window.flow = data;
      window.flow.title = title;

      if (typeof window.render === 'function') window.render();
      if (typeof window.renderBannerMeta === 'function')
        window.renderBannerMeta();
      if (typeof window.fitBoardToScreen === 'function')
        setTimeout(function () {
          window.fitBoardToScreen(true);
        }, 80);

      closeCreateModal();
      toast('Fluxo "' + title + '" criado');

      /* refresh list if open */
      if (typeof window.renderFlowManagerClean === 'function') {
        try {
          await window.renderFlowManagerClean();
        } catch (e) {}
      }
    } catch (e) {
      toast(e.message || 'Falha ao criar fluxo', true);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Criar fluxo';
      }
    }
  }

  window.openCreateFlowModal = function () {
    ensureCss();
    ensureCreateModal();
    if ($('cfTitle')) $('cfTitle').value = '';
    var blank = document.querySelector('input[name="cfMode"][value="blank"]');
    if (blank) blank.checked = true;
    document.querySelectorAll('#createFlowModal .cf-option').forEach(function (x) {
      x.classList.toggle('active', x.getAttribute('data-mode') === 'blank');
    });
    syncModeFields();
    $('createFlowModal').classList.add('open');
  };

  function wireNewFlowButtons() {
    function bind(el) {
      if (!el || el.__cfModal) return;
      el.onclick = function (ev) {
        ev.preventDefault();
        ev.stopPropagation();
        window.openCreateFlowModal();
      };
      el.__cfModal = true;
    }
    bind($('btnNewFlow'));
    bind($('btnNewFlowBanner'));
    bind($('btnMgrNew'));
  }

  function boot() {
    ensureCss();
    ensureUploadBtn();
    wireNewFlowButtons();
    /* after ux-shell moves toolbar */
    setTimeout(ensureUploadBtn, 600);
    setTimeout(wireNewFlowButtons, 600);
    setTimeout(wireNewFlowButtons, 1500);

    var prev = window.renderBannerMeta;
    if (typeof prev === 'function' && !prev.__cfModal) {
      window.renderBannerMeta = function () {
        var r = prev.apply(this, arguments);
        setTimeout(wireNewFlowButtons, 0);
        return r;
      };
      window.renderBannerMeta.__cfModal = true;
    }
    console.log('[Fluxora] json-import-create ready');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else boot();
})();
