/* Runs BEFORE editor.js — stub missing admin DOM nodes to avoid null onclick */
(function () {
  ['btnMaster', 'masterPass', 'masterMsg', 'btnAddUser', 'btnSaveStyle', 'btnSetMaster', 'newUserEmail', 'styleNeon', 'newMaster'].forEach(function (id) {
    if (!document.getElementById(id)) {
      var d = document.createElement(
        id.indexOf('Pass') >= 0 || id.indexOf('Email') >= 0 || id.indexOf('Neon') >= 0 || id.indexOf('Master') >= 0 && id !== 'btnMaster'
          ? 'input'
          : 'button'
      );
      d.id = id;
      d.hidden = true;
      d.setAttribute('aria-hidden', 'true');
      document.documentElement.appendChild(d);
    }
  });
})();
