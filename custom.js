(function () {
  function getTabFolder(pathname) {
    if (pathname === "/pages/v2/changelog-entregas") return "entregas";
    if (pathname === "/pages/v2/changelog") return "referencia";
    if (pathname.indexOf("/entregas/") !== -1) return "entregas";
    if (pathname.indexOf("/referencia/") !== -1) return "referencia";
    return null;
  }

  document.addEventListener(
    "click",
    function (event) {
      var item = event.target.closest(
        '[data-component-part="version-select-item"]'
      );
      if (!item) return;

      var match = item.textContent.match(/v(\d+)/);
      if (!match) return;

      var currentPath =
        document.documentElement.getAttribute("data-current-path") ||
        window.location.pathname;
      var tabFolder = getTabFolder(currentPath);
      if (!tabFolder) return;

      var destination = "/pages/v" + match[1] + "/" + tabFolder + "/introducao";

      event.preventDefault();
      event.stopPropagation();
      if (event.stopImmediatePropagation) event.stopImmediatePropagation();

      window.location.href = destination;
    },
    true
  );
})();
