/**
 * Vote + comment + image/HTML preview — v6
 * - Instant vote colors
 * - Preview HTML/image persist via flows:save (withCloudSave)
 * - saveToCloud wrapped ONCE only (no recursion with rate-limit)
 */
(function () {
  function $(id) {
    return document.getElementById(id);
  }

  function cx() {
    return window.convexClient || null;
  }

  function notify(msg, kind) {
    if (typeof showNotification === 'function') showNotification(msg, kind || 'info');
    else if (typeof window.toast === 'function') {
      try {
        window.toast(msg, kind === 'error');
      } catch (e) {}
    }
  }

  function getFlow() {
    var f = null;
    try {
      if (typeof flow !== 'undefined' && flow) f = flow;
    } catch (e) {}
    if (!f && window.flow) f = window.flow;
    if (f && window.flow && f !== window.flow) {
      if (window.flow.previews) f.previews = f.previews || window.flow.previews;
      if (window.flow.comments) f.comments = f.comments || window.flow.comments;
      if (window.flow.votes) f.votes = f.votes || window.flow.votes;
      window.flow = f;
    }
    if (f) {
      if (!f.previews) f.previews = {};
      if (!f.comments) f.comments = {};
      if (!f.votes) f.votes = {};
      window.flow = f;
      try {
        flow = f;
      } catch (e2) {}
    }
    return f;
  }

  function currentSelected() {
    try {
      if (typeof selected !== 'undefined' && selected) return selected;
    } catch (e) {}
    return window.selected || null;
  }

  function voteKeyOf() {
    var sel = currentSelected();
    if (!sel) return null;
    var k = sel.kind || 'node';
    var id = sel.id;
    if (typeof window.voteKey === 'function') return window.voteKey(k, id);
    return k + ':' + id;
  }

  function currentKey() {
    try {
      if (typeof flowKey !== 'undefined' && flowKey) return String(flowKey);
    } catch (e) {}
    return window.flowKey ? String(window.flowKey) : '';
  }

  function currentTitle() {
    try {
      if (typeof flowTitle !== 'undefined' && flowTitle) return String(flowTitle);
    } catch (e) {}
    return window.flowTitle || '';
  }

  function emailOf() {
    try {
      return ((window.user || {}).email || '').toLowerCase().trim();
    } catch (e) {
      return '';
    }
  }

  function persistCommentAndPreview() {
    var f = getFlow();
    var k = voteKeyOf();
    if (!f || !k) return false;
    if (!f.comments) f.comments = {};
    if (!f.previews) f.previews = {};
    var c = $('sideComment');
    if (c) f.comments[k] = c.value;
    var htmlEl = $('sidePreviewHtml');
    if (htmlEl) {
      var html = htmlEl.value || '';
      var cur = f.previews[k] || {};
      f.previews[k] = Object.assign({}, cur, {
        html: html,
        mode: html.trim()
          ? 'html'
          : cur.mode || (cur.imageUrl || cur.storageId ? 'image' : ''),
        updatedAt: Date.now(),
      });
    }
    window.flow = f;
    try {
      flow = f;
    } catch (e) {}
    try {
      localStorage.setItem('hemopi_editor_v1', JSON.stringify(f));
    } catch (e2) {}
    return true;
  }

  function paintVoteButtons() {
    var f = getFlow();
    var k = voteKeyOf();
    document.querySelectorAll('.vbtn').forEach(function (b) {
      b.classList.remove('on-ok', 'on-no', 'voted-up', 'voted-down');
    });
    if (!f || !k || !f.votes || !f.votes[k]) return;
    var mine = f.votes[k].mine;
    var ok = document.querySelector('.vbtn[data-v="ok"]');
    var no = document.querySelector('.vbtn[data-v="no"]');
    if (mine === 'ok' && ok) {
      ok.classList.add('on-ok', 'voted-up');
    }
    if (mine === 'no' && no) {
      no.classList.add('on-no', 'voted-down');
    }
  }

  async function cloudMutationSave(f) {
    var client = cx();
    var key = currentKey();
    var email = emailOf();
    if (!client || !key || key.indexOf('local') === 0 || !email || !f) {
      return { ok: false, error: 'Sem contexto para salvar' };
    }
    var run = async function () {
      await client.mutation('flows:save', {
        key: key,
        title: currentTitle() || key,
        ownerEmail: email,
        data: f,
      });
      return { ok: true };
    };
    try {
      if (typeof window.withCloudSave === 'function') {
        return await window.withCloudSave(run);
      }
      window.__allowCloudSave = true;
      try {
        return await run();
      } finally {
        setTimeout(function () {
          window.__allowCloudSave = false;
        }, 800);
      }
    } catch (e) {
      return { ok: false, error: (e && e.message) || String(e) };
    }
  }

  async function savePreviewToConvex(previewKey) {
    var f = getFlow();
    if (!f) return { ok: false, error: 'Sem fluxo em memória' };
    if (!f.previews) f.previews = {};
    try {
      localStorage.setItem('hemopi_editor_v1', JSON.stringify(f));
    } catch (e) {}

    var saved = await cloudMutationSave(f);
    if (!saved.ok) return saved;

    /* verify remote */
    try {
      var client = cx();
      var row = await client.query('flows:get', {
        key: currentKey(),
        requesterEmail: emailOf(),
      });
      var remote =
        row &&
        row.data &&
        row.data.previews &&
        previewKey
          ? row.data.previews[previewKey]
          : null;
      var local = previewKey ? f.previews[previewKey] : null;
      var verified = false;
      if (local && remote) {
        if (local.html && remote.html === local.html) verified = true;
        if (local.storageId && remote.storageId === local.storageId)
          verified = true;
        if (local.imageUrl && remote.imageUrl === local.imageUrl)
          verified = true;
        if (!local.html && !local.storageId) verified = true;
      } else if (!local || (!local.html && !local.storageId)) {
        verified = true;
      }
      return { ok: true, verified: verified, error: verified ? '' : 'HTML/imagem ainda não confirmados no GET' };
    } catch (e2) {
      return { ok: true, verified: false, error: 'Salvo, verificação falhou' };
    }
  }

  async function flushSave(opts) {
    opts = opts || {};
    persistCommentAndPreview();
    var f = getFlow();
    var k = voteKeyOf();
    var sel = currentSelected();
    try {
      if (sel && f) {
        var name = $('sideNameMulti') || $('sideName');
        if (name) {
          if (sel.kind === 'node' && typeof nodeById === 'function') {
            var n = nodeById(sel.id);
            if (n) n.title = name.value;
          }
          if (sel.kind === 'macro' && typeof macroById === 'function') {
            var m = macroById(sel.id);
            if (m) m.title = name.value;
          }
          if (sel.kind === 'edge' && typeof edgeById === 'function') {
            var ed = edgeById(sel.id);
            if (ed) ed.label = name.value;
          }
        }
      }
    } catch (err) {}

    var result = await savePreviewToConvex(k);
    if (result.ok && result.verified) {
      if (typeof markFlowClean === 'function') markFlowClean();
      if (!opts.silent) notify('Preview salvo na nuvem ✓', 'success');
    } else if (result.ok) {
      if (!opts.silent)
        notify('Salvo com aviso: ' + (result.error || ''), 'info');
    } else {
      if (!opts.silent)
        notify('Erro ao salvar: ' + (result.error || ''), 'error');
    }
    if (typeof render === 'function') render();
    if (typeof renderMacroBar === 'function') renderMacroBar();
    return result;
  }

  async function onImageSelected(file) {
    if (!file) return;
    var hint = $('sidePreviewImageHint');
    if (hint) hint.textContent = 'Enviando…';
    var client = cx();
    if (!client) {
      notify('Convex offline', 'error');
      return;
    }
    try {
      var uploadUrl = await client.mutation('files:generateUploadUrl', {});
      var res = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
        body: file,
      });
      var json = await res.json();
      var storageId = json.storageId;
      var url = await client.mutation('files:getUrl', { storageId: storageId });
      var f = getFlow();
      var k = voteKeyOf();
      if (f && k) {
        if (!f.previews) f.previews = {};
        f.previews[k] = Object.assign({}, f.previews[k] || {}, {
          storageId: String(storageId),
          imageUrl: url,
          mode: 'image',
          updatedAt: Date.now(),
        });
        window.flow = f;
        try {
          flow = f;
        } catch (e) {}
      }
      if (hint) hint.textContent = 'Imagem anexada ✓';
      notify('Imagem pronta — clique Salvar', 'success');
    } catch (e) {
      if (hint) hint.textContent = 'Falha no upload';
      notify('Erro upload: ' + (e.message || e), 'error');
    }
  }

  function enhanceVote() {
    var prev = window.voteSelected;
    window.voteSelected = function (val) {
      var sel = currentSelected();
      if (typeof prev === 'function') prev(val);
      else if (typeof setMyVote === 'function' && sel)
        setMyVote(sel.kind, sel.id, val);
      paintVoteButtons();
      requestAnimationFrame(paintVoteButtons);
      setTimeout(paintVoteButtons, 16);
      persistCommentAndPreview();
    };
  }

  function enhanceOpenModal() {
    var prev = window.openModal;
    window.openModal = function () {
      if (typeof prev === 'function') prev.apply(this, arguments);
      setTimeout(function () {
        paintVoteButtons();
        var f = getFlow();
        var k = voteKeyOf();
        if (f && k) {
          var c = $('sideComment');
          if (c) c.value = (f.comments && f.comments[k]) || '';
          var htmlEl = $('sidePreviewHtml');
          var p = f.previews && f.previews[k];
          if (htmlEl) htmlEl.value = (p && p.html) || '';
          var hint = $('sidePreviewImageHint');
          if (hint) {
            hint.textContent =
              p && (p.imageUrl || p.storageId) ? 'Imagem anexada ✓' : '';
          }
        }
        wireModalControls();
      }, 0);
    };
  }

  function enhanceRefreshSide() {
    var prev = window.refreshSide;
    if (typeof prev !== 'function') return;
    window.refreshSide = function () {
      try {
        prev.apply(this, arguments);
      } catch (e) {}
      paintVoteButtons();
    };
  }

  /** Wrap saveToCloud ONCE — persist preview fields then call inner */
  function enhanceSaveToCloud() {
    if (typeof window.saveToCloud !== 'function') return;
    if (window.saveToCloud.__previewHooked) return;
    var inner = window.saveToCloud;
    window.saveToCloud = async function () {
      persistCommentAndPreview();
      getFlow();
      return await inner.apply(this, arguments);
    };
    window.saveToCloud.__previewHooked = true;
    /* preserve rate-limit flag if it was already outer */
    if (inner.__rateHooked) window.saveToCloud.__rateHooked = true;
  }

  function wireModalControls() {
    var saveBtn = $('btnModalSave');
    if (saveBtn && !saveBtn.__previewWired) {
      saveBtn.addEventListener(
        'click',
        function (ev) {
          ev.preventDefault();
          ev.stopPropagation();
          flushSave({ silent: false });
        },
        true
      );
      saveBtn.__previewWired = true;
    }
    var img = $('sidePreviewImage');
    if (img && !img.__previewWired) {
      img.addEventListener('change', function () {
        if (img.files && img.files[0]) onImageSelected(img.files[0]);
      });
      img.__previewWired = true;
    }
    var clearBtn = $('btnClearPreview');
    if (clearBtn && !clearBtn.__previewWired) {
      clearBtn.onclick = function () {
        var f = getFlow();
        var k = voteKeyOf();
        if (f && k && f.previews) delete f.previews[k];
        var htmlEl = $('sidePreviewHtml');
        if (htmlEl) htmlEl.value = '';
        var hint = $('sidePreviewImageHint');
        if (hint) hint.textContent = '';
        var file = $('sidePreviewImage');
        if (file) file.value = '';
        notify('Preview limpo (Salvar para gravar)', 'info');
      };
      clearBtn.__previewWired = true;
    }
    var viewBtn = $('btnOpenPreviewView');
    if (viewBtn && !viewBtn.__previewWired) {
      viewBtn.onclick = function () {
        openPreviewView();
      };
      viewBtn.__previewWired = true;
    }
  }

  function openPreviewView() {
    var f = getFlow();
    var k = voteKeyOf();
    var p = f && k && f.previews ? f.previews[k] : null;
    var htmlEl = $('sidePreviewHtml');
    var html = (htmlEl && htmlEl.value) || (p && p.html) || '';
    var imgUrl = p && (p.imageUrl || '');
    var overlay = document.getElementById('previewViewOverlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'previewViewOverlay';
      overlay.style.cssText =
        'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;padding:16px';
      overlay.innerHTML =
        '<div style="background:#fff;border-radius:12px;width:min(960px,100%);height:min(90vh,800px);display:flex;flex-direction:column;overflow:hidden">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;border-bottom:1px solid #e2e8f0">' +
        '<strong>Preview</strong>' +
        '<span><button type="button" id="pvFull" class="btn">Tela cheia</button> ' +
        '<button type="button" id="pvClose" class="btn">×</button></span></div>' +
        '<div id="pvBody" style="flex:1;overflow:auto;background:#f8fafc"></div></div>';
      document.body.appendChild(overlay);
      overlay.querySelector('#pvClose').onclick = function () {
        overlay.remove();
      };
      overlay.querySelector('#pvFull').onclick = function () {
        var body = document.getElementById('pvBody');
        if (body && body.requestFullscreen) body.requestFullscreen();
      };
    }
    var body = document.getElementById('pvBody');
    if (!body) return;
    if (html && html.trim()) {
      body.innerHTML =
        '<iframe sandbox="allow-scripts allow-same-origin" style="width:100%;height:100%;border:0"></iframe>';
      var iframe = body.querySelector('iframe');
      iframe.srcdoc = html;
    } else if (imgUrl) {
      body.innerHTML =
        '<img src="' +
        imgUrl +
        '" style="max-width:100%;max-height:100%;display:block;margin:auto" />';
    } else {
      body.innerHTML =
        '<p style="padding:24px;color:#64748b">Nenhum preview neste bloco.</p>';
    }
  }

  function injectStyles() {
    if (document.getElementById('votePreviewStyles')) return;
    var s = document.createElement('style');
    s.id = 'votePreviewStyles';
    s.textContent =
      '.vbtn.on-ok,.vbtn.voted-up{background:#dcfce7!important;border-color:#86efac!important}' +
      '.vbtn.on-no,.vbtn.voted-down{background:#fee2e2!important;border-color:#fca5a5!important}';
    document.head.appendChild(s);
  }

  injectStyles();
  enhanceOpenModal();
  enhanceRefreshSide();
  enhanceVote();
  enhanceSaveToCloud();
  wireModalControls();

  setTimeout(function () {
    enhanceSaveToCloud();
    wireModalControls();
  }, 600);

  window.openPreviewView = openPreviewView;
  window.flushPreviewSave = flushSave;
  console.log('[Fluxora] vote-preview-modal v6 (no recursion)');
})();
