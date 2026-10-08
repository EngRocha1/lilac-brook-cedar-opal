/**
 * Vote UX + comment + image/HTML preview.
 * Scope-only: modal save, fullscreen, overflow, node 👁 icon.
 */
(function () {
  function $(id) {
    return document.getElementById(id);
  }

  function cx() {
    return window.convexClient || null;
  }

  function voteKeyOf(kind, id) {
    if (kind && id) {
      if (typeof voteKey === 'function') return voteKey(kind, id);
      return kind + ':' + id;
    }
    if (typeof selected === 'undefined' || !selected) return null;
    if (typeof voteKey === 'function') return voteKey(selected.kind, selected.id);
    return selected.kind + ':' + selected.id;
  }

  function ensureStore() {
    try {
      if (typeof flow === 'undefined' || !flow) return;
      if (!flow.comments) flow.comments = {};
      if (!flow.previews) flow.previews = {};
    } catch (e) {}
  }

  function getPreview(kind, id) {
    ensureStore();
    var k = voteKeyOf(kind, id);
    if (!k || !flow || !flow.previews) return {};
    return flow.previews[k] || {};
  }

  function setPreview(partial, kind, id) {
    ensureStore();
    var k = voteKeyOf(kind, id);
    if (!k || !flow) return;
    if (!flow.previews) flow.previews = {};
    flow.previews[k] = Object.assign({}, flow.previews[k] || {}, partial);
  }

  function hasPreview(kind, id) {
    var p = getPreview(kind, id);
    return !!(p.html && p.html.trim()) || !!p.imageUrl || !!p.storageId;
  }

  function injectStyles() {
    var old = $('vote-preview-css');
    if (old) old.remove();
    var st = document.createElement('style');
    st.id = 'vote-preview-css';
    st.textContent = [
      '.vbtn{transition:background .15s,border-color .15s,box-shadow .15s}',
      '.vbtn.on-ok{background:#dcfce7!important;border-color:#86efac!important;box-shadow:0 0 0 2px rgba(34,197,94,.25)}',
      '.vbtn.on-no{background:#fee2e2!important;border-color:#fca5a5!important;box-shadow:0 0 0 2px rgba(239,68,68,.25)}',
      '#modalBg .modal.modal-grow{max-height:92vh;display:flex;flex-direction:column;overflow:hidden}',
      '#modalBg .modal-b{overflow-y:auto;max-height:calc(92vh - 52px);padding-bottom:12px;-webkit-overflow-scrolling:touch}',
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
      '#previewViewModal .pv-head strong{font-size:14px}',
      '#previewViewModal .pv-head .pv-btns{display:flex;gap:8px}',
      '#previewViewModal .pv-head button{border:1px solid #cbd5e1;background:#fff;border-radius:8px;padding:6px 10px;cursor:pointer;font-weight:600}',
      '#previewViewModal .pv-body{flex:1 1 auto;overflow:auto;padding:0;background:#fff;min-height:0;position:relative}',
      '#previewViewModal .pv-body img{max-width:100%;height:auto;display:block;margin:0 auto;padding:12px}',
      '#previewViewModal .pv-body iframe{position:absolute;inset:0;width:100%;height:100%;border:0;background:#fff}',
      '#previewViewModal .pv-empty{color:#94a3b8;text-align:center;padding:48px 16px}',
      '.preview-btn{cursor:pointer}',
    ].join('');
    document.head.appendChild(st);
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
      '<button type="button" id="pvFullscreen">⛶ Fullscreen</button>' +
      '<button type="button" id="pvClose">×</button>' +
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
      var fs = m.classList.contains('fullscreen');
      $('pvFullscreen').textContent = fs ? '⛶ Sair' : '⛶ Fullscreen';
      /* force iframe reflow */
      var iframe = m.querySelector('iframe');
      if (iframe) {
        iframe.style.height = '100%';
        iframe.style.width = '100%';
      }
    };
    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape' && m.classList.contains('open')) closePreviewView();
    });
  }

  function persistCommentAndPreview() {
    ensureStore();
    var k = voteKeyOf();
    if (!k || typeof flow === 'undefined' || !flow) return false;
    var c = $('sideComment');
    if (c) {
      if (!flow.comments) flow.comments = {};
      flow.comments[k] = c.value;
    }
    var htmlEl = $('sidePreviewHtml');
    if (htmlEl) {
      var html = htmlEl.value || '';
      var cur = flow.previews[k] || {};
      flow.previews[k] = Object.assign({}, cur, {
        html: html,
        mode: html.trim() ? 'html' : cur.mode || (cur.imageUrl || cur.storageId ? 'image' : ''),
      });
    }
    return true;
  }

  async function flushSave() {
    persistCommentAndPreview();
    /* title from multi-line */
    try {
      if (typeof selected !== 'undefined' && selected && flow) {
        var name = $('sideNameMulti') || $('sideName');
        if (name) {
          if (selected.kind === 'node' && typeof nodeById === 'function') {
            var n = nodeById(selected.id);
            if (n) n.title = name.value;
          }
          if (selected.kind === 'macro' && typeof macroById === 'function') {
            var m = macroById(selected.id);
            if (m) m.title = name.value;
          }
          if (selected.kind === 'edge' && typeof edgeById === 'function') {
            var e = edgeById(selected.id);
            if (e) e.label = name.value;
          }
        }
      }
    } catch (err) {
      console.warn(err);
    }
    try {
      localStorage.setItem('hemopi_editor_v1', JSON.stringify(flow));
    } catch (e) {}
    if (typeof saveLocal === 'function') {
      try {
        saveLocal();
      } catch (e2) {}
    }
    if (typeof saveToCloud === 'function') {
      try {
        await saveToCloud();
      } catch (e3) {
        console.warn('[preview] cloud save', e3);
      }
    } else if (cx() && typeof flowKey !== 'undefined' && flowKey) {
      try {
        var email = ((window.user || {}).email || '').toLowerCase().trim();
        await cx().mutation('flows:save', {
          key: String(flowKey),
          title: (typeof flowTitle !== 'undefined' ? flowTitle : '') || String(flowKey),
          ownerEmail: email,
          data: flow,
        });
      } catch (e4) {
        console.warn('[preview] flows:save', e4);
      }
    }
    if (typeof render === 'function') render();
    if (typeof renderMacroBar === 'function') renderMacroBar();
    injectPreviewIcons();
    return true;
  }

  async function onImageSelected(file) {
    if (!file) return;
    var hint = $('sidePreviewImageHint');
    if (hint) hint.textContent = 'Enviando…';
    try {
      var client = cx();
      if (client) {
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
        } catch (e) {
          console.warn(e);
        }
        setPreview({
          storageId: storageId,
          imageUrl: url || '',
          mode: 'image',
        });
        if (hint) hint.textContent = url ? 'Imagem no Convex ✓' : 'Imagem salva (id) ✓';
        await flushSave();
      } else {
        var reader = new FileReader();
        reader.onload = async function () {
          setPreview({ imageUrl: reader.result, mode: 'image' });
          if (hint) hint.textContent = 'Imagem local ✓';
          await flushSave();
        };
        reader.readAsDataURL(file);
      }
    } catch (e) {
      console.error(e);
      if (hint) hint.textContent = 'Erro: ' + (e.message || e);
      /* fallback data URL so user is not blocked */
      try {
        var r2 = new FileReader();
        r2.onload = async function () {
          setPreview({ imageUrl: r2.result, mode: 'image' });
          if (hint) hint.textContent = 'Salvo local (fallback) ✓';
          await flushSave();
        };
        r2.readAsDataURL(file);
      } catch (e2) {}
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
    var prev = getPreview(
      kind || (selected && selected.kind),
      id || (selected && selected.id)
    );
    var body = $('pvBody');
    var title = $('pvTitle');
    if (title) {
      title.textContent =
        'Preview · ' +
        (kind || (selected && selected.kind) || '') +
        ' ' +
        (id || (selected && selected.id) || '');
    }
    body.innerHTML = '';
    var modal = $('previewViewModal');
    modal.classList.remove('fullscreen');
    if ($('pvFullscreen')) $('pvFullscreen').textContent = '⛶ Fullscreen';

    function showHtml(html) {
      var iframe = document.createElement('iframe');
      iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin');
      iframe.setAttribute('title', 'preview');
      iframe.srcdoc =
        '<!DOCTYPE html><html><head><meta charset="utf-8"/>' +
        '<meta name="viewport" content="width=device-width,initial-scale=1"/>' +
        '<style>html,body{margin:0;padding:0;min-height:100%;}body{font-family:system-ui,sans-serif;}</style>' +
        '</head><body>' +
        html +
        '</body></html>';
      body.appendChild(iframe);
    }

    if (prev.html && prev.html.trim()) {
      showHtml(prev.html);
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
          setPreview({ imageUrl: url }, kind, id);
          body.innerHTML = '';
          var im = document.createElement('img');
          im.src = url;
          body.appendChild(im);
        })
        .catch(function () {
          body.innerHTML = '<p class="pv-empty">Falha ao carregar</p>';
        });
    } else {
      body.innerHTML =
        '<p class="pv-empty">Nenhum preview. Anexe imagem ou cole HTML e clique Salvar.</p>';
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

  function fillFields() {
    ensureStore();
    var k = voteKeyOf();
    var c = $('sideComment');
    if (c) {
      c.value = k && flow.comments && flow.comments[k] != null ? flow.comments[k] : '';
    }
    var prev = getPreview();
    var htmlEl = $('sidePreviewHtml');
    if (htmlEl) htmlEl.value = prev.html || '';
    var hint = $('sidePreviewImageHint');
    if (hint) {
      hint.textContent = prev.imageUrl || prev.storageId ? 'Imagem anexada ✓' : 'Nenhuma imagem';
    }
    syncVoteColors();
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
        var k = voteKeyOf();
        if (k && flow && flow.previews) delete flow.previews[k];
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
        function (ev) {
          /* capture persistence even if other handlers run */
          persistCommentAndPreview();
          setTimeout(function () {
            flushSave().then(function () {
              if (typeof showNotification === 'function') {
                showNotification('Comentário e preview salvos', 'success');
              } else if (typeof toast === 'function') toast('Salvo');
            });
          }, 0);
        },
        true
      );
    }
  }

  function svgEl(tag, attrs, kids) {
    var n = document.createElementNS('http://www.w3.org/2000/svg', tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        n.setAttribute(k, attrs[k]);
      });
    }
    if (kids) {
      kids.forEach(function (t) {
        n.appendChild(document.createTextNode(t));
      });
    }
    return n;
  }

  function injectPreviewIcons() {
    if (typeof flow === 'undefined' || !flow || !flow.nodes) return;
    var canvas = $('canvas');
    if (!canvas) return;
    /* remove previous */
    canvas.querySelectorAll('.preview-btn').forEach(function (el) {
      el.remove();
    });
    flow.nodes.forEach(function (n) {
      if (!hasPreview('node', n.id)) return;
      /* find node group by transform approximate or data */
      var groups = canvas.querySelectorAll('g.node');
      var g = null;
      for (var i = 0; i < groups.length; i++) {
        var t = groups[i].getAttribute('transform') || '';
        if (t.indexOf('translate(' + n.x + ',' + n.y + ')') === 0 || t.indexOf('translate(' + n.x + ', ' + n.y + ')') === 0) {
          g = groups[i];
          break;
        }
      }
      if (!g) {
        /* fallback: create floating icon in root */
        g = svgEl('g', {
          class: 'preview-btn-host',
          transform: 'translate(' + n.x + ',' + n.y + ')',
        });
        canvas.appendChild(g);
      }
      var w = n.w || 160;
      var pg = svgEl('g', {
        class: 'preview-btn',
        transform: 'translate(' + (w - 2) + ',18)',
        style: 'cursor:pointer',
      });
      pg.appendChild(
        svgEl('circle', {
          cx: '0',
          cy: '0',
          r: '10',
          fill: '#0f172a',
          stroke: '#38bdf8',
          'stroke-width': '1.5',
        })
      );
      pg.appendChild(
        svgEl(
          'text',
          {
            x: '0',
            y: '4',
            'text-anchor': 'middle',
            'font-size': '11',
            fill: '#fff',
          },
          ['👁']
        )
      );
      pg.addEventListener('mousedown', function (ev) {
        ev.stopPropagation();
        ev.preventDefault();
        try {
          selected = { kind: 'node', id: n.id };
        } catch (e) {
          window.selected = { kind: 'node', id: n.id };
        }
        openPreviewView('node', n.id);
      });
      g.appendChild(pg);
    });
  }

  function enhanceOpenModal() {
    var prev = window.openModal;
    window.openModal = function () {
      if (typeof prev === 'function') prev();
      fillFields();
      wireModalControls();
      syncVoteColors();
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
    };
  }

  function enhanceVote() {
    var prev = window.voteSelected;
    window.voteSelected = function (val) {
      if (typeof prev === 'function') prev(val);
      syncVoteColors();
      persistCommentAndPreview();
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
      } catch (e) {
        console.warn(e);
      }
      return r;
    };
  }

  injectStyles();
  ensurePreviewModal();
  enhanceOpenModal();
  enhanceRefreshSide();
  enhanceVote();
  enhanceRender();
  wireModalControls();

  setTimeout(function () {
    enhanceOpenModal();
    enhanceRefreshSide();
    enhanceVote();
    enhanceRender();
    wireModalControls();
    injectPreviewIcons();
  }, 800);

  window.openPreviewView = openPreviewView;
  console.log('[Fluxora] vote-preview-modal v2');
})();
