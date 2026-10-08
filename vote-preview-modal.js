/**
 * Vote UX + comment + image/HTML preview for validation modal.
 * Does not touch board drag/zoom/list isolation.
 */
(function () {
  var PREVIEW_KEY = 'previews'; // flow.previews[voteKey] = { html, imageUrl, storageId, mode }

  function $(id) {
    return document.getElementById(id);
  }

  function cx() {
    return window.convexClient || null;
  }

  function voteKeyOf() {
    if (typeof selected === 'undefined' || !selected) return null;
    if (typeof voteKey === 'function') return voteKey(selected.kind, selected.id);
    return selected.kind + ':' + selected.id;
  }

  function ensureComments() {
    try {
      if (typeof flow !== 'undefined' && flow && !flow.comments) flow.comments = {};
      if (typeof flow !== 'undefined' && flow && !flow.previews) flow.previews = {};
    } catch (e) {}
  }

  function injectStyles() {
    if ($('vote-preview-css')) return;
    var st = document.createElement('style');
    st.id = 'vote-preview-css';
    st.textContent =
      '.vbtn{transition:background .15s,border-color .15s,box-shadow .15s;}' +
      '.vbtn.on-ok{background:#dcfce7!important;border-color:#86efac!important;box-shadow:0 0 0 2px rgba(34,197,94,.25);}' +
      '.vbtn.on-no{background:#fee2e2!important;border-color:#fca5a5!important;box-shadow:0 0 0 2px rgba(239,68,68,.25);}' +
      '.vote-row{display:flex;gap:10px;margin:12px 0;}' +
      '#sideComment{width:100%;min-height:72px;border:1px solid #c9d3df;border-radius:8px;padding:10px;font:inherit;resize:vertical;}' +
      '.preview-box{margin-top:12px;padding:12px;border:1px solid #e2e8f0;border-radius:10px;background:#f8fafc;}' +
      '.preview-box label{display:block;font-size:12px;font-weight:600;color:#475569;margin:8px 0 4px;}' +
      '.preview-box textarea{width:100%;min-height:88px;font-family:ui-monospace,monospace;font-size:12px;border:1px solid #c9d3df;border-radius:8px;padding:8px;}' +
      '.preview-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px;}' +
      '.preview-actions .btn{border-radius:8px;padding:8px 12px;cursor:pointer;border:1px solid #cbd5e1;background:#fff;font-weight:600;}' +
      '.preview-actions .btn-view{background:#0f172a;color:#fff;border:none;}' +
      '#previewViewModal{position:fixed;inset:0;z-index:99999;background:rgba(15,23,42,.55);display:none;align-items:center;justify-content:center;padding:16px;}' +
      '#previewViewModal.open{display:flex;}' +
      '#previewViewModal .pv-panel{background:#fff;border-radius:12px;width:min(960px,100%);max-height:90vh;display:flex;flex-direction:column;box-shadow:0 20px 50px rgba(0,0,0,.25);overflow:hidden;}' +
      '#previewViewModal.fullscreen .pv-panel{width:100%;height:100%;max-height:100%;border-radius:0;}' +
      '#previewViewModal .pv-head{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid #e2e8f0;background:#f8fafc;}' +
      '#previewViewModal .pv-head strong{font-size:15px;}' +
      '#previewViewModal .pv-head .pv-btns{display:flex;gap:8px;}' +
      '#previewViewModal .pv-head button{border:1px solid #cbd5e1;background:#fff;border-radius:8px;padding:6px 10px;cursor:pointer;font-weight:600;}' +
      '#previewViewModal .pv-body{flex:1;overflow:auto;padding:16px;background:#fff;min-height:240px;}' +
      '#previewViewModal .pv-body img{max-width:100%;height:auto;border-radius:8px;display:block;margin:0 auto;}' +
      '#previewViewModal .pv-body iframe{width:100%;min-height:420px;border:1px solid #e2e8f0;border-radius:8px;background:#fff;}' +
      '#previewViewModal .pv-empty{color:#94a3b8;text-align:center;padding:48px 16px;}';
    document.head.appendChild(st);
  }

  function ensureCommentField() {
    if ($('sideComment')) return;
    var voteRow = document.querySelector('#modalBg .vote-row');
    if (!voteRow) return;
    var wrap = document.createElement('div');
    wrap.className = 'side-comment-wrap';
    wrap.innerHTML =
      '<label for="sideComment" style="display:block;font-size:12px;font-weight:600;color:#475569;margin:8px 0 4px">Comentário / crítica / melhoria</label>' +
      '<textarea id="sideComment" placeholder="Descreva o que faz sentido ou o que precisa melhorar…"></textarea>';
    voteRow.parentNode.insertBefore(wrap, voteRow.nextSibling);
  }

  function ensurePreviewFields() {
    if ($('sidePreviewBox')) return;
    var actions = document.querySelector('#modalBg .modal-actions');
    if (!actions) return;
    var box = document.createElement('div');
    box.id = 'sidePreviewBox';
    box.className = 'preview-box';
    box.innerHTML =
      '<strong style="font-size:13px;color:#0f172a">Preview do ponto (para o cliente)</strong>' +
      '<label>Imagem da tela (opcional)</label>' +
      '<input type="file" id="sidePreviewImage" accept="image/*" />' +
      '<div id="sidePreviewImageHint" class="muted" style="font-size:11px;margin-top:4px"></div>' +
      '<label>HTML / CSS / JS (simulador — opcional)</label>' +
      '<textarea id="sidePreviewHtml" placeholder="&lt;div style=&quot;padding:16px&quot;&gt;Tela de exemplo…&lt;/div&gt;"></textarea>' +
      '<div class="preview-actions">' +
      '<button type="button" class="btn btn-view" id="btnOpenPreviewView">👁 Ver preview</button>' +
      '<button type="button" class="btn" id="btnClearPreview">Limpar preview</button>' +
      '</div>';
    actions.parentNode.insertBefore(box, actions);
  }

  function ensurePreviewModal() {
    if ($('previewViewModal')) return;
    var m = document.createElement('div');
    m.id = 'previewViewModal';
    m.innerHTML =
      '<div class="pv-panel">' +
      '<div class="pv-head">' +
      '<strong id="pvTitle">Preview</strong>' +
      '<div class="pv-btns">' +
      '<button type="button" id="pvFullscreen" title="Tela cheia">⛶ Fullscreen</button>' +
      '<button type="button" id="pvClose" title="Fechar">×</button>' +
      '</div></div>' +
      '<div class="pv-body" id="pvBody"></div>' +
      '</div>';
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
    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape' && m.classList.contains('open')) closePreviewView();
    });
  }

  function getPreviewRecord() {
    ensureComments();
    var k = voteKeyOf();
    if (!k || !flow || !flow.previews) return {};
    return flow.previews[k] || {};
  }

  function setPreviewRecord(partial) {
    ensureComments();
    var k = voteKeyOf();
    if (!k) return;
    if (!flow.previews) flow.previews = {};
    flow.previews[k] = Object.assign({}, flow.previews[k] || {}, partial);
  }

  function syncVoteColors() {
    document.querySelectorAll('.vbtn').forEach(function (b) {
      b.classList.remove('on-ok', 'on-no');
    });
    if (typeof selected === 'undefined' || !selected || !flow) return;
    var v = null;
    try {
      if (typeof getVotes === 'function') v = getVotes(selected.kind, selected.id);
      else if (flow.votes) v = flow.votes[voteKeyOf()];
    } catch (e) {}
    if (!v) return;
    if (v.mine === 'ok') {
      var ok = document.querySelector('.vbtn[data-v="ok"]');
      if (ok) ok.classList.add('on-ok');
    }
    if (v.mine === 'no') {
      var no = document.querySelector('.vbtn[data-v="no"]');
      if (no) no.classList.add('on-no');
    }
  }

  function fillCommentAndPreview() {
    ensureCommentField();
    ensurePreviewFields();
    var k = voteKeyOf();
    var c = $('sideComment');
    if (c) {
      c.value =
        k && flow && flow.comments && flow.comments[k] != null ? flow.comments[k] : '';
      try {
        c.readOnly = typeof isGuest === 'function' ? isGuest() : false;
      } catch (e) {}
    }
    var prev = getPreviewRecord();
    var htmlEl = $('sidePreviewHtml');
    if (htmlEl) htmlEl.value = prev.html || '';
    var hint = $('sidePreviewImageHint');
    if (hint) {
      hint.textContent = prev.imageUrl
        ? 'Imagem anexada ✓'
        : prev.storageId
          ? 'Imagem no storage ✓'
          : 'Nenhuma imagem';
    }
    syncVoteColors();
  }

  function persistCommentAndPreview() {
    ensureComments();
    var k = voteKeyOf();
    if (!k) return;
    var c = $('sideComment');
    if (c) {
      if (!flow.comments) flow.comments = {};
      flow.comments[k] = c.value;
    }
    var htmlEl = $('sidePreviewHtml');
    if (htmlEl) {
      setPreviewRecord({ html: htmlEl.value || '', mode: htmlEl.value ? 'html' : getPreviewRecord().mode });
    }
  }

  async function onImageSelected(file) {
    if (!file) return;
    var hint = $('sidePreviewImageHint');
    if (hint) hint.textContent = 'Enviando…';
    try {
      if (cx()) {
        var uploadUrl = await cx().mutation('files:generateUploadUrl', {});
        var res = await fetch(uploadUrl, {
          method: 'POST',
          headers: { 'Content-Type': file.type },
          body: file,
        });
        var json = await res.json();
        var storageId = json.storageId;
        var url = await cx().mutation('files:getUrl', { storageId: storageId });
        setPreviewRecord({ storageId: storageId, imageUrl: url || '', mode: 'image' });
        if (hint) hint.textContent = 'Imagem anexada ✓';
      } else {
        /* offline: data URL (limited size) */
        var reader = new FileReader();
        reader.onload = function () {
          setPreviewRecord({ imageUrl: reader.result, mode: 'image' });
          if (hint) hint.textContent = 'Imagem local ✓';
        };
        reader.readAsDataURL(file);
      }
      if (typeof saveLocal === 'function') saveLocal();
    } catch (e) {
      console.error(e);
      if (hint) hint.textContent = 'Erro no upload: ' + (e.message || e);
    }
  }

  function openPreviewView() {
    ensurePreviewModal();
    persistCommentAndPreview();
    var prev = getPreviewRecord();
    var body = $('pvBody');
    var title = $('pvTitle');
    if (title) {
      title.textContent =
        (typeof selected !== 'undefined' && selected
          ? 'Preview · ' + selected.kind + ' ' + selected.id
          : 'Preview');
    }
    body.innerHTML = '';
    if (prev.html && prev.html.trim()) {
      var iframe = document.createElement('iframe');
      iframe.setAttribute('sandbox', 'allow-scripts');
      iframe.srcdoc =
        '<!DOCTYPE html><html><head><meta charset="utf-8"/><style>body{font-family:system-ui,sans-serif;margin:16px;}</style></head><body>' +
        prev.html +
        '</body></html>';
      body.appendChild(iframe);
    } else if (prev.imageUrl) {
      var img = document.createElement('img');
      img.src = prev.imageUrl;
      img.alt = 'Preview';
      body.appendChild(img);
    } else if (prev.storageId && cx()) {
      body.innerHTML = '<p class="pv-empty">Carregando imagem…</p>';
      cx()
        .mutation('files:getUrl', { storageId: prev.storageId })
        .then(function (url) {
          if (!url) {
            body.innerHTML = '<p class="pv-empty">Imagem indisponível</p>';
            return;
          }
          setPreviewRecord({ imageUrl: url });
          body.innerHTML = '';
          var im = document.createElement('img');
          im.src = url;
          body.appendChild(im);
        })
        .catch(function () {
          body.innerHTML = '<p class="pv-empty">Falha ao carregar imagem</p>';
        });
    } else {
      body.innerHTML =
        '<p class="pv-empty">Nenhum preview. Anexe uma imagem ou cole HTML no modal de edição.</p>';
    }
    var modal = $('previewViewModal');
    modal.classList.remove('fullscreen');
    modal.classList.add('open');
    if ($('pvFullscreen')) $('pvFullscreen').textContent = '⛶ Fullscreen';
  }

  function closePreviewView() {
    var modal = $('previewViewModal');
    if (modal) {
      modal.classList.remove('open', 'fullscreen');
      var body = $('pvBody');
      if (body) body.innerHTML = '';
    }
  }

  function wireSave() {
    var saveBtn = $('btnModalSave');
    if (!saveBtn || saveBtn.dataset.previewWired === '1') return;
    saveBtn.dataset.previewWired = '1';
    var prev = saveBtn.onclick;
    saveBtn.onclick = function (ev) {
      persistCommentAndPreview();
      if (typeof prev === 'function') prev.call(saveBtn, ev);
      else {
        /* fallback minimal save */
        try {
          if (selected && flow) {
            var name = $('sideNameMulti') || $('sideName');
            if (name && selected.kind === 'node' && typeof nodeById === 'function') {
              var n = nodeById(selected.id);
              if (n) n.title = name.value;
            }
            if (name && selected.kind === 'macro' && typeof macroById === 'function') {
              var m = macroById(selected.id);
              if (m) m.title = name.value;
            }
          }
          if (typeof saveLocal === 'function') saveLocal();
          if (typeof render === 'function') render();
          if (typeof renderMacroBar === 'function') renderMacroBar();
        } catch (e) {
          console.warn(e);
        }
      }
      if (typeof showNotification === 'function') showNotification('Salvo (comentário + preview)', 'success');
      else if (typeof toast === 'function') toast('Salvo');
    };
  }

  function wirePreviewControls() {
    ensurePreviewFields();
    var img = $('sidePreviewImage');
    if (img && img.dataset.wired !== '1') {
      img.dataset.wired = '1';
      img.addEventListener('change', function () {
        if (img.files && img.files[0]) onImageSelected(img.files[0]);
      });
    }
    var btn = $('btnOpenPreviewView');
    if (btn && btn.dataset.wired !== '1') {
      btn.dataset.wired = '1';
      btn.onclick = openPreviewView;
    }
    var clr = $('btnClearPreview');
    if (clr && clr.dataset.wired !== '1') {
      clr.dataset.wired = '1';
      clr.onclick = function () {
        var k = voteKeyOf();
        if (k && flow && flow.previews) delete flow.previews[k];
        if ($('sidePreviewHtml')) $('sidePreviewHtml').value = '';
        if ($('sidePreviewImage')) $('sidePreviewImage').value = '';
        if ($('sidePreviewImageHint')) $('sidePreviewImageHint').textContent = 'Nenhuma imagem';
        if (typeof saveLocal === 'function') saveLocal();
      };
    }
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
        } catch (e) {
          console.warn(e);
        }
      }
      fillCommentAndPreview();
      wirePreviewControls();
      wireSave();
    };
  }

  function enhanceVoteSelected() {
    var prev = window.voteSelected;
    window.voteSelected = function (val) {
      if (typeof prev === 'function') prev(val);
      syncVoteColors();
      /* keep comment while voting */
      persistCommentAndPreview();
      if (typeof saveLocal === 'function') saveLocal();
    };
  }

  function enhanceOpenModal() {
    var prev = window.openModal;
    window.openModal = function () {
      ensureCommentField();
      ensurePreviewFields();
      ensurePreviewModal();
      if (typeof prev === 'function') prev();
      fillCommentAndPreview();
      wirePreviewControls();
      wireSave();
      syncVoteColors();
    };
  }

  injectStyles();
  ensureCommentField();
  ensurePreviewFields();
  ensurePreviewModal();
  enhanceRefreshSide();
  enhanceVoteSelected();
  enhanceOpenModal();
  wireSave();
  wirePreviewControls();

  setTimeout(function () {
    enhanceRefreshSide();
    enhanceVoteSelected();
    enhanceOpenModal();
    wireSave();
  }, 600);

  console.log('[Fluxora] vote-preview-modal');
})();
