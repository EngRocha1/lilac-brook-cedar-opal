/* Prevents TypeError on missing DOM nodes (btnMaster, etc.) · v20261007j */
(function () {
  const orig = Document.prototype.getElementById;
  Document.prototype.getElementById = function (id) {
    const el = orig.call(this, id);
    if (el) return el;
    return {
      style: {},
      classList: {
        add: function () {},
        remove: function () {},
        toggle: function () { return false; },
        contains: function () { return false; },
      },
      addEventListener: function () {},
      removeEventListener: function () {},
      setAttribute: function () {},
      getAttribute: function () { return null; },
      appendChild: function (c) { return c; },
      removeChild: function (c) { return c; },
      querySelector: function () { return null; },
      querySelectorAll: function () { return []; },
      focus: function () {},
      click: function () {},
      hidden: true,
      value: '',
      textContent: '',
      innerHTML: '',
      checked: false,
      disabled: false,
      parentNode: null,
      href: '',
      onclick: null,
    };
  };
})();
