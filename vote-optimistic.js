/**
 * Single vote path: optimistic UI first, then state, then debounced cloud save.
 * Loads last so it wins over CDN / macro-comment-autosave / vote-preview wrappers.
 */
(function () {
  function $(id) {
    return document.getElementById(id);
  }

  function getFlow() {
    var f = null;
    try {
      if (typeof flow !== 'undefined' && flow) f = flow;
    } catch (e) {}
    if (window.flow) f = f || window.flow;
    if (f) {
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

  function voteKeyOf(kind, id) {
    if (typeof voteKey === 'function') return voteKey(kind, id);
    return kind + ':' + id;
  }

  function paintButtons(mine) {
    var okBtn = document.querySelector('#modalBg .vbtn[data-v="ok"]');
    var noBtn = document.querySelector('#modalBg .vbtn[data-v="no"]');
    if (okBtn) {
      okBtn.classList.remove('on-ok', 'on-no', 'voted-up', 'voted-down');
      okBtn.style.removeProperty('background');
      okBtn.style.removeProperty('border-color');
      okBtn.style.removeProperty('box-shadow');
    }
    if (noBtn) {
      noBtn.classList.remove('on-ok', 'on-no', 'voted-up', 'voted-down');
      noBtn.style.removeProperty('background');
      noBtn.style.removeProperty('border-color');
      noBtn.style.removeProperty('box-shadow');
    }
    if (mine === 'ok' && okBtn) {
      okBtn.classList.add('on-ok', 'voted-up');
      okBtn.style.setProperty('background', '#dcfce7', 'important');
      okBtn.style.setProperty('border-color', '#86efac', 'important');
      okBtn.style.setProperty('box-shadow', '0 0 0 2px rgba(34,197,94,.35)', 'important');
    }
    if (mine === 'no' && noBtn) {
      noBtn.classList.add('on-no', 'voted-down');
      noBtn.style.setProperty('background', '#fee2e2', 'important');
      noBtn.style.setProperty('border-color', '#fca5a5', 'important');
      noBtn.style.setProperty('box-shadow', '0 0 0 2px rgba(239,68,68,.35)', 'important');
    }
  }

  var _voteSaveTimer = null;

  function scheduleVoteSave() {
    clearTimeout(_voteSaveTimer);
    _voteSaveTimer = setTimeout(async function () {
      try {
        if (typeof window.saveToCloud === 'function') {
          await window.saveToCloud();
        }
      } catch (e) {
        console.warn('[vote-save]', e);
      }
    }, 600);
  }

  /**
   * Canonical vote handler — optimistic UI, then model, then progress, then save.
   */
  window.handleVoteClick = function handleVoteClick(voteType) {
    var sel = currentSelected();
    if (!sel || !sel.kind || !sel.id) return;

    var val = voteType === 'up' || voteType === 'ok' ? 'ok' : 'no';

    /* 1) Optimistic UI — never blocked by null DOM elsewhere */
    paintButtons(val);

    /* 2) Model */
    var f = getFlow();
    if (!f) return;
    var k = voteKeyOf(sel.kind, sel.id);
    var prev = f.votes[k] || { ok: 0, no: 0, mine: null };
    var next = {
      ok: prev.ok || 0,
      no: prev.no || 0,
      mine: val,
    };
    if (prev.mine === 'ok') next.ok = Math.max(0, next.ok - 1);
    if (prev.mine === 'no') next.no = Math.max(0, next.no - 1);
    if (val === 'ok') next.ok += 1;
    if (val === 'no') next.no += 1;
    f.votes[k] = next;
    window.flow = f;
    try {
      flow = f;
    } catch (e) {}

    try {
      localStorage.setItem('hemopi_editor_v1', JSON.stringify(f));
    } catch (e2) {}

    /* 3) Safe progress (null-safe override) */
    try {
      if (typeof window.updateProgress === 'function') window.updateProgress();
    } catch (e3) {}

    /* 4) Debounced cloud save — modal stays open */
    scheduleVoteSave();

    if (typeof showNotification === 'function') {
      /* soft, non-blocking */
    }
  };

  /** Override all legacy voteSelected paths */
  window.voteSelected = function voteSelectedOptimistic(val) {
    window.handleVoteClick(val === 'ok' || val === 'up' ? 'ok' : 'no');
  };

  /* Direct listeners on modal buttons (capture) — wins over broken inline chain */
  function wireButtons() {
    var okBtn = document.querySelector('#modalBg .vbtn[data-v="ok"]');
    var noBtn = document.querySelector('#modalBg .vbtn[data-v="no"]');
    if (okBtn && okBtn.dataset.optVote !== '1') {
      okBtn.dataset.optVote = '1';
      okBtn.addEventListener(
        'click',
        function (ev) {
          ev.preventDefault();
          ev.stopPropagation();
          window.handleVoteClick('ok');
        },
        true
      );
    }
    if (noBtn && noBtn.dataset.optVote !== '1') {
      noBtn.dataset.optVote = '1';
      noBtn.addEventListener(
        'click',
        function (ev) {
          ev.preventDefault();
          ev.stopPropagation();
          window.handleVoteClick('no');
        },
        true
      );
    }
  }

  /* Repaint when modal opens */
  var prevOpen = window.openModal;
  window.openModal = function () {
    if (typeof prevOpen === 'function') prevOpen.apply(this, arguments);
    wireButtons();
    var sel = currentSelected();
    var f = getFlow();
    if (sel && f) {
      var k = voteKeyOf(sel.kind, sel.id);
      var v = (f.votes && f.votes[k]) || {};
      paintButtons(v.mine || null);
    }
  };

  wireButtons();
  setTimeout(wireButtons, 500);

  if (!document.getElementById('vote-optimistic-css')) {
    var st = document.createElement('style');
    st.id = 'vote-optimistic-css';
    st.textContent =
      '#modalBg .vbtn.on-ok,#modalBg .vbtn.voted-up{background:#dcfce7!important;border-color:#86efac!important;box-shadow:0 0 0 2px rgba(34,197,94,.35)!important}' +
      '#modalBg .vbtn.on-no,#modalBg .vbtn.voted-down{background:#fee2e2!important;border-color:#fca5a5!important;box-shadow:0 0 0 2px rgba(239,68,68,.35)!important}';
    document.head.appendChild(st);
  }

  console.log('[Fluxora] vote-optimistic ready');
})();
