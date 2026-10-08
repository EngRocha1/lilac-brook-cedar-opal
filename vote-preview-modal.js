/**
 * Vote + comment + image/HTML preview.
 * Canonical flow = window.flow (synced both ways).
 * Instant vote colors; save verifies previews on Convex.
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

  /** Always mutate the same object used by saveToCloud */
  function getFlow() {
    var f = null;
    try {
      if (typeof flow !== 'undefined' && flow) f = flow;
    } catch (e) {}
    if (window.flow) {
      if (!f) f = window.flow;
      else if (f !== window.flow) {
        /* prefer the one that already has previews */
        var wp = window.flow.previews && Object.keys(window.flow.previews).length;
        var fp = f.previews && Object.keys(f.previews).length;
        if (wp && !fp) f = window.flow;
        else {
          if (window.flow.previews) f.previews = f.previews || window.flow.previews;
          if (window.flow.comments) f.comments = f.comments || window.flow.comments;
          if (window.flow.votes) f.votes = Object.assign({}, window.flow.votes, f.votes || {});
        }
      }
    }
    if (!f) return null;
    if (!f.previews) f.previews = {};
    if (!f.comments) f.comments = {};
    if (!f.votes) f.votes = {};
    window.flow = f;
    try {
      flow = f;
    } catch (e2) {}
    return f;
  }

  function currentSelected() {
    try {
      if (typeof selected !== 'undefined' && selected) return selected;
    } catch (e) {}
    return window.selected || null;
  }

  function voteKeyOf(kind, id) {
    if (kind && id) {
      if (typeof voteKey === 'function') return voteKey(kind, id);
      return kind + ':' + id;
    }
    var sel = currentSelected();
    if (!sel) return null;
    if (typeof voteKey === 'function') return voteKey(sel.kind, sel.id);
    return sel.kind + ':' + sel.id;
  }

  function ensureStore() {
    return getFlow();
  }

  function getPreview(kind, id) {
    var f = getFlow();
    var k = voteKeyOf(kind, id);
    if (!f || !k) return {};
    return f.previews[k] || {};
  }

  function setPreview(partial, kind, id) {
    var f = getFlow();
    var k = voteKeyOf(kind, id);
    if (!f || !k) return null;
    f.previews[k] = Object.assign({}, f.previews[k] || {}, partial);
    window.flow = f;
    try {
      flow = f;
    } catch (e) {}
    return f.previews[k];
  }

  function hasPreview(kind, id) {
    var p = getPreview(kind, id);
    return !!(p.html && String(p.html).trim()) || !!p.imageUrl || !!p.storageId;
  }

  function injectStyles() {
    var old = $('vote-preview-css');
    if (old) old.remove();
    var st = document.createElement('style');
    st.id = 'vote-preview-css';
    st.textContent = [
      '.vbtn{transition:background .12s,border-color .12s,box-shadow .12s;cursor:pointer}',
      '.vbtn.on-ok{background:#dcfce7!important;border-color:#86efac!important;box-shadow:0 0 0 2px rgba(34,197,94,.35)!important}',
      '.vbtn.on-no{background:#fee2e2!important;border-color:#fca5a5!important;box-shadow:0 0 0 2px rgba(239,68,68,.35)!important}',
      '#modalBg .modal.modal-grow{max-height:92vh;display:flex;flex-direction:column;overflow:hidden}',
      '#modalBg .modal-b{overflow-y:auto;max-height:calc(92vh - 52px);padding-bottom:12px}',
      '#sideComment{width:100%;box-sizing:border-box;min-height:72px;max-height:160px;border:1px solid #c9d3df;border-radius:8px;padding:10px;font:inherit;resize:vertical}',
      '#sidePreviewHtml{width:100%;box-sizing:border-box;min-height:100px;max-height:180px;overflow:auto;font-family:ui-monospace,monospace;font-size:12px;border:1px solid #c9d3df;border-radius:8px;padding:8px;resize:vertical}',
      '.preview-box{margin-top:12px;padding:12px;border:1px solid #e2e8f0;border-radius:10px;background:#f8fafc}',
      '.preview-box label{display:block;font-size:12px;font-weight:600;color:#475569;margin:8px 0 4px}',
      '.preview-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}',
      '.preview-actions .btn{border-radius:8px;padding:8px 12px;cursor:pointer;border:1px solid #cbd5e1;background:#fff;font-weight:600}',
      '.preview-actions .btn-view{background:#0f172a;color:#fff;border:none}',
      '#previewViewModal{position:fixed;inset:0;z-index:100000;background:rgba(15,23,42,.6);display:none;align-items:center;justify-content:center;padding:12px;box-sizing:border-box}',
      '#previewViewModal.open{display:flex}',
      '#previewViewModal .pv-panel{background:#fff;border-radius:12px;width:min(960px,100%);height:min(90vh,900px);display:flex;flex-direction:column;box-shadow:0 20px 50px rgba(0,0,0,.3);overflow:hidden}',
      '#previewViewModal.fullscreen{padding:0}',
      '#previewViewModal.fullscreen .pv-panel{width:100vw;height:100vh;max-width:none;max-height:none;border-radius:0}',
      '#previewViewModal .pv-head{display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-bottom:1px solid #e2e8f0;background:#f8fafc;flex-shrink:0}',
      '#previewViewModal .pv-head .pv-btns{display:flex;gap:8px}',
      '#previewViewModal .pv-head button{border:1px solid #cbd5e1;background:#fff;border-radius:8px;padding:6px 10px;cursor:pointer;font-weight:600}',
      '#previewViewModal .pv-body{flex:1 1 auto;overflow:auto;padding:0;background:#fff;min-height:0;position:relative}',
      '#previewViewModal .pv-body img{max-width:100%;height:auto;display:block;margin:0 auto;padding:12px}',
      '#previewViewModal .pv-body iframe{position:absolute;inset:0;width:100%;height:100%;border:0;background:#fff}',
      '#previewViewModal .pv-empty{color:#94a3b8;text-align:center;padding:48px 16px}',
      'g.preview-btn{cursor:pointer}',
    ].join('');
    document.head.appendChild(st);
  }

  function clearVoteBtnStyles(btn) {
    if (!btn) return;
    btn.classList.remove('on-ok', 'on-no');
    btn.style.removeProperty('background');
    btn.style.removeProperty('border-color');
    btn.style.removeProperty('box-shadow');
  }

  function paintVoteButtons() {
    var okBtn = document.querySelector('#modalBg .vbtn[data-v="ok"]');
    var noBtn = document.querySelector('#modalBg .vbtn[data-v="no"]');
    clearVoteBtnStyles(okBtn);
    clearVoteBtnStyles(noBtn);
    var f = getFlow();
    var sel = currentSelected();
    if (!sel || !f) return;
    var k = voteKeyOf(sel.kind, sel.id);
    var v = (f.votes && f.votes[k]) || { mine: null };
    if (typeof getVotes === 'function') {
      try {
        v = getVotes(sel.kind, sel.id) || v;
      } catch (e) {}
    }
    if (v.mine === 'ok' && okBtn) {
      okBtn.classList.add('on-ok');
      okBtn.style.setProperty('background', '#dcfce7', 'important');
      okBtn.style.setProperty('border-color', '#86efac', 'important');
      okBtn.style.setProperty('box-shadow', '0 0 0 2px rgba(34,197,94,.35)', 'important');
    }
    if (v.mine === 'no' && noBtn) {
      noBtn.classList.add('on-no');
      noBtn.style.setProperty('background', '#fee2e2', 'important');
      noBtn.style.setProperty('border-color', '#fca5a5', 'important');
      noBtn.style.setProperty('box-shadow', '0 0 0 2px rgba(239,68,68,.35)', 'important');
    }
  }

  function ensurePreviewModal() {
    if ($('previewViewModal')) return;
    var m = document.createElement('div');
    m.id = 'previewViewModal';
    m.innerHTML =
      '<div class="pv-panel"><div class="pv-head"><strong id="pvTitle">Preview</strong>' +
      '<div class="pv-btns"><button type="button" id="pvFullscreen">⛶ Fullscreen</button>' +
      '<button type="button" id="pvClose">×</button></div></div>' +
      '<div class="pv-body" id="pvBody"></div></div>';
    document.body.appendChild(m);
    $('pvClose').onclick = closePreviewView;
    m.addEventListener('click', function (ev) {
      if (ev.target === m) closePreviewView();
    });
    $('pvFullscreen').onclick = function () {
      m.classList.toggle('fullscreen');
      $('pvFullscreen').textContent = m.classList.contains('fullscreen')
        ? '⛶ Sair'
        : '⛶ Fullscreen';
    };
  }

  function persistCommentAndPreview() {
    var f = getFlow();
    var k = voteKeyOf();
    if (!f || !k) return false;
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
    return window.flowTitle || currentKey();
  }

  function emailOf() {
    try {
      return ((window.user || user || {}).email || '').toLowerCase().trim();
    } catch (e) {
      return '';
    }
  }

  async function savePreviewToConvex(previewKey) {
    var f = getFlow();
    var client = cx();
    var key = currentKey();
    var email = emailOf();
    if (!f) return { ok: false, error: 'Sem fluxo em memória' };
    if (!client) return { ok: false, error: 'Convex offline' };
    if (!key || key.indexOf('local') === 0)
      return { ok: false, error: 'Abra um fluxo da nuvem' };
    if (!email) return { ok: false, error: 'Faça login' };
    if (!f.previews) f.previews = {};

    try {
      localStorage.setItem('hemopi_editor_v1', JSON.stringify(f));
    } catch (e) {}

    try {
      await client.mutation('flows:save', {
        key: key,
        title: currentTitle() || key,
        ownerEmail: email,
        data: f,
      });
    } catch (e) {
      console.error('[preview-save]', e);
      return { ok: false, error: String(e.message || e) };
    }

    try {
      var remote = await client.query('flows:get', {
        key: key,
        requesterEmail: email,
      });
      if (!remote || !remote.data)
        return { ok: true, verified: false, error: 'GET vazio' };
      var rp = (remote.data.previews || {})[previewKey];
      if (previewKey && f.previews[previewKey] && !rp) {
        return {
          ok: true,
          verified: false,
          error: 'previews.' + previewKey + ' ausente no GET',
        };
      }
      /* keep local in sync with server */
      if (remote.data.previews) {
        f.previews = remote.data.previews;
        window.flow = f;
      }
      return { ok: true, verified: true, remotePreview: rp };
    } catch (e2) {
      return { ok: true, verified: false, error: String(e2.message || e2) };
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
    injectPreviewIcons();
    return result;
  }

  async function onImageSelected(file) {
    if (!file) return;
    var hint = $('sidePreviewImageHint');
    if (hint) hint.textContent = 'Enviando imagem…';
    notify('Enviando imagem…', 'info');
    try {
      var client = cx();
      if (!client) throw new Error('Convex offline');
      var uploadUrl = await client.mutation('files:generateUploadUrl', {});
      var res = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
        body: file,
      });
      if (!res.ok) throw new Error('Upload HTTP ' + res.status);
      var json = await res.json();
      var storageId = json.storageId;
      if (!storageId) throw new Error('Sem storageId');
      var url = null;
      try {
        url = await client.mutation('files:getUrl', { storageId: storageId });
      } catch (e) {}
      setPreview({
        storageId: storageId,
        imageUrl: url || '',
        mode: 'image',
        updatedAt: Date.now(),
      });
      if (hint)
        hint.textContent = url
          ? 'Imagem no Convex ✓'
          : 'storageId ok';
      var result = await flushSave({ silent: true });
      if (result.ok) notify('Imagem + fluxo salvos ✓', 'success');
      else notify('Imagem ok, fluxo: ' + (result.error || '?'), 'error');
    } catch (e) {
      console.error(e);
      if (hint) hint.textContent = 'Erro: ' + (e.message || e);
      notify('Erro upload: ' + (e.message || e), 'error');
    }
  }

  function openPreviewView(kind, id) {
    ensurePreviewModal();
    if (kind && id) {
      try {
        selected = { kind: kind, id: id };
      } catch (e) {
        window.selected = { kind: kind, id: id };
      }
    }
    persistCommentAndPreview();
    var sel = currentSelected();
    var prev = getPreview(kind || (sel && sel.kind), id || (sel && sel.id));
    var body = $('pvBody');
    var title = $('pvTitle');
    if (title)
      title.textContent =
        'Preview · ' + (kind || (sel && sel.kind) || '') + ' ' + (id || (sel && sel.id) || '');
    body.innerHTML = '';
    var modal = $('previewViewModal');
    modal.classList.remove('fullscreen');
    if (prev.html && String(prev.html).trim()) {
      var iframe = document.createElement('iframe');
      iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin');
      iframe.srcdoc =
        '<!DOCTYPE html><html><head><meta charset="utf-8"/>' +
        '<meta name="viewport" content="width=device-width,initial-scale=1"/>' +
        '<style>html,body{margin:0;padding:12px;font-family:system-ui,sans-serif}</style></head><body>' +
        prev.html +
        '</body></html>';
      body.appendChild(iframe);
    } else if (prev.imageUrl) {
      var img = document.createElement('img');
      img.src = prev.imageUrl;
      body.appendChild(img);
    } else if (prev.storageId && cx()) {
      body.innerHTML = '<p class="pv-empty">Carregando…</p>';
      cx()
        .mutation('files:getUrl', { storageId: prev.storageId })
        .then(function (url) {
          body.innerHTML = '';
          if (!url) {
            body.innerHTML = '<p class="pv-empty">Indisponível</p>';
            return;
          }
          var im = document.createElement('img');
          im.src = url;
          body.appendChild(im);
        });
    } else {
      body.innerHTML = '<p class="pv-empty">Nenhum preview salvo.</p>';
    }
    modal.classList.add('open');
  }

  function closePreviewView() {
    var modal = $('previewViewModal');
    if (!modal) return;
    modal.classList.remove('open', 'fullscreen');
    var body = $('pvBody');
    if (body) body.innerHTML = '';
  }

  function fillFields() {
    getFlow();
    var k = voteKeyOf();
    var f = getFlow();
    var c = $('sideComment');
    if (c) c.value = k && f && f.comments && f.comments[k] != null ? f.comments[k] : '';
    var prev = getPreview();
    var htmlEl = $('sidePreviewHtml');
    if (htmlEl) htmlEl.value = prev.html || '';
    var hint = $('sidePreviewImageHint');
    if (hint) {
      hint.textContent =
        prev.storageId || prev.imageUrl
          ? 'Imagem anexada ✓'
          : 'Nenhuma imagem';
    }
    paintVoteButtons();
  }

  function wireModalControls() {
    var img = $('sidePreviewImage');
    if (img && img.dataset.vpWired !== '1') {
      img.dataset.vpWired = '1';
      img.addEventListener('change', function () {
        if (img.files && img.files[0]) onImageSelected(img.files[0]);
      });
    }
    var btn = $('btnOpenPreviewView');
    if (btn && btn.dataset.vpWired !== '1') {
      btn.dataset.vpWired = '1';
      btn.addEventListener('click', function (ev) {
        ev.preventDefault();
        persistCommentAndPreview();
        openPreviewView();
      });
    }
    var clr = $('btnClearPreview');
    if (clr && clr.dataset.vpWired !== '1') {
      clr.dataset.vpWired = '1';
      clr.addEventListener('click', async function (ev) {
        ev.preventDefault();
        var f = getFlow();
        var k = voteKeyOf();
        if (f && k && f.previews) delete f.previews[k];
        if ($('sidePreviewHtml')) $('sidePreviewHtml').value = '';
        if ($('sidePreviewImage')) $('sidePreviewImage').value = '';
        if ($('sidePreviewImageHint')) $('sidePreviewImageHint').textContent = 'Nenhuma imagem';
        await flushSave();
      });
    }
    var saveBtn = $('btnModalSave');
    if (saveBtn && saveBtn.dataset.vpSave !== '1') {
      saveBtn.dataset.vpSave = '1';
      saveBtn.addEventListener(
        'click',
        function () {
          persistCommentAndPreview();
          setTimeout(function () {
            flushSave({ silent: false });
          }, 40);
        },
        true
      );
    }
  }

  function svgEl(tag, attrs) {
    var n = document.createElementNS('http://www.w3.org/2000/svg', tag);
    if (attrs)
      Object.keys(attrs).forEach(function (k) {
        n.setAttribute(k, attrs[k]);
      });
    return n;
  }

  function buildPhotoIcon() {
    var g = svgEl('g', { class: 'preview-btn' });
    g.appendChild(
      svgEl('circle', {
        class: 'pv-bg',
        cx: '0',
        cy: '0',
        r: '11',
        fill: '#fff',
        stroke: '#1e3a5f',
        'stroke-width': '1.2',
      })
    );
    g.appendChild(
      svgEl('rect', {
        x: '-5',
        y: '-6',
        width: '11',
        height: '9',
        rx: '1.2',
        fill: 'none',
        stroke: '#1e3a5f',
        'stroke-width': '1.3',
      })
    );
    g.appendChild(
      svgEl('rect', {
        x: '-7',
        y: '-4',
        width: '11',
        height: '9',
        rx: '1.2',
        fill: '#fff',
        stroke: '#1e3a5f',
        'stroke-width': '1.3',
      })
    );
    g.appendChild(
      svgEl('path', {
        d: 'M-5.5 3 L-2.5 -0.5 L-0.5 1.5 L2 -1.5 L5 3 Z',
        fill: 'none',
        stroke: '#1e3a5f',
        'stroke-width': '1.1',
        'stroke-linejoin': 'round',
      })
    );
    g.appendChild(
      svgEl('circle', {
        cx: '2.5',
        cy: '-1.2',
        r: '1.2',
        fill: 'none',
        stroke: '#1e3a5f',
        'stroke-width': '1.1',
      })
    );
    return g;
  }

  function injectPreviewIcons() {
    var f = getFlow();
    if (!f || !f.nodes) return;
    var canvas = $('canvas');
    if (!canvas) return;
    canvas.querySelectorAll('.preview-btn, .preview-btn-host').forEach(function (el) {
      el.remove();
    });
    f.nodes.forEach(function (n) {
      if (!hasPreview('node', n.id)) return;
      var host = svgEl('g', {
        class: 'preview-btn-host',
        transform: 'translate(' + n.x + ',' + n.y + ')',
      });
      var icon = buildPhotoIcon();
      icon.setAttribute('transform', 'translate(14,' + ((n.h || 40) / 2) + ')');
      icon.style.cursor = 'pointer';
      icon.addEventListener('mousedown', function (ev) {
        ev.stopPropagation();
        ev.preventDefault();
        try {
          selected = { kind: 'node', id: n.id };
        } catch (e) {
          window.selected = { kind: 'node', id: n.id };
        }
        openPreviewView('node', n.id);
      });
      host.appendChild(icon);
      canvas.appendChild(host);
    });
  }

  function enhanceVote() {
    var prev = window.voteSelected;
    window.voteSelected = function (val) {
      var sel = currentSelected();
      if (typeof prev === 'function') prev(val);
      else if (typeof setMyVote === 'function' && sel)
        setMyVote(sel.kind, sel.id, val);
      /* force immediate paint from flow.votes */
      paintVoteButtons();
      requestAnimationFrame(paintVoteButtons);
      setTimeout(paintVoteButtons, 16);
      setTimeout(paintVoteButtons, 80);
      persistCommentAndPreview();
    };
  }

  function enhanceOpenModal() {
    var prev = window.openModal;
    window.openModal = function () {
      if (typeof prev === 'function') prev();
      fillFields();
      wireModalControls();
      paintVoteButtons();
    };
  }

  function enhanceRefreshSide() {
    var prev =
      typeof window.refreshSide === 'function'
        ? window.refreshSide
        : typeof refreshSide === 'function'
          ? refreshSide
          : null;
    window.refreshSide = function () {
      if (prev) {
        try {
          prev();
        } catch (e) {}
      }
      fillFields();
      wireModalControls();
      paintVoteButtons();
    };
  }

  function enhanceRender() {
    if (window.__previewRenderHooked) return;
    window.__previewRenderHooked = true;
    var prev = window.render;
    if (typeof prev !== 'function') return;
    window.render = function () {
      var r = prev.apply(this, arguments);
      try {
        injectPreviewIcons();
      } catch (e) {}
      return r;
    };
  }

  /* When toolbar 💾 saves, ensure previews already on flow */
  function enhanceSaveToCloud() {
    var prev = window.saveToCloud;
    if (typeof prev !== 'function') return;
    window.saveToCloud = async function () {
      persistCommentAndPreview();
      getFlow();
      return await prev.apply(this, arguments);
    };
  }

  injectStyles();
  ensurePreviewModal();
  enhanceOpenModal();
  enhanceRefreshSide();
  enhanceVote();
  enhanceRender();
  enhanceSaveToCloud();
  wireModalControls();

  setTimeout(function () {
    enhanceOpenModal();
    enhanceRefreshSide();
    enhanceVote();
    enhanceRender();
    enhanceSaveToCloud();
    wireModalControls();
    injectPreviewIcons();
  }, 900);

  window.openPreviewView = openPreviewView;
  window.flushPreviewSave = flushSave;
  console.log('[Fluxora] vote-preview-modal v5 canonical+vote');
})();
