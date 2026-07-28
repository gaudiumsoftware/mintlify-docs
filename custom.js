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

/* Tag "Novo" na navegação lateral, calculada a partir da data de publicação.
   Cada página informa a data no frontmatter (`tag: 'AAAA-MM-DD'`); aqui a data é
   comparada com hoje: dentro da janela abaixo, a tag vira "Novo"; depois disso, ela
   deixa de aparecer sozinha — não é preciso editar nada. O custom.css esconde as tags
   em formato de data até este script confirmar a janela, então uma data crua nunca
   chega a aparecer para o leitor. */
(function () {
  var JANELA_DIAS = 30;
  var FORMATO_DATA = /^\d{4}-\d{2}-\d{2}$/;

  function dentroDaJanela(data) {
    var publicacao = new Date(data + "T00:00:00").getTime();
    if (isNaN(publicacao)) return false;
    var dias = (Date.now() - publicacao) / 86400000;
    return dias >= 0 && dias <= JANELA_DIAS;
  }

  function aplicarTagsDeData() {
    var tags = document.querySelectorAll(
      "#sidebar-content .nav-tag-pill-text[data-nav-tag]"
    );

    Array.prototype.forEach.call(tags, function (tag) {
      if (tag.hasAttribute("data-tag-processada")) return;

      var data = tag.getAttribute("data-nav-tag");
      if (!FORMATO_DATA.test(data)) return;

      tag.setAttribute("data-tag-processada", "");

      if (dentroDaJanela(data)) {
        tag.textContent = "Novo";
        tag.setAttribute("title", "Documentado em " + data);
        tag.setAttribute("data-tag-nova", "");
      } else {
        // !important porque o custom.css força o display da tag e do wrapper
        var pill = tag.closest(".nav-tag-pill") || tag;
        pill.style.setProperty("display", "none", "important");
        if (pill.parentElement) {
          pill.parentElement.style.setProperty("display", "none", "important");
        }
      }
    });
  }

  function iniciar() {
    aplicarTagsDeData();
    // A navegação lateral é re-renderizada em cada troca de página (SPA)
    new MutationObserver(aplicarTagsDeData).observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  if (document.body) {
    iniciar();
  } else {
    document.addEventListener("DOMContentLoaded", iniciar);
  }
})();
