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

/* Os métodos HTTP (GET, POST, PATCH...) são identificadores da API, não texto corrido:
   traduzi-los muda o significado e ainda estoura a largura fixa da tag na navegação, que
   passa a cobrir o nome da página. O tema não marca essas tags, então aqui elas recebem
   `translate="no"` — respeitado tanto pelo tradutor embutido do Chrome quanto pelo Google
   Tradutor. O método original fica guardado em `data-metodo` para o caso de a tradução
   chegar antes desta marcação: aí o valor é devolvido e, já marcado, não traduz de novo. */
(function () {
  // .method-nav-pill: tag da navegação lateral. .method-pill: tag ao lado da URL do endpoint.
  var SELETOR = ".method-nav-pill, .method-pill";
  var METODOS = /^(GET|POST|PUT|PATCH|DELETE|DEL|HEAD|OPTIONS)$/;

  /* O texto fica no elemento mais interno — no tema é um <span> com as cores do método, e a
     tradução ainda pode embrulhá-lo em <font>. Escrever na raiz apagaria essa estrutura. */
  function elementoDoTexto(pill) {
    var no = pill;
    while (no.firstElementChild) no = no.firstElementChild;
    return no;
  }

  function protegerMetodos() {
    var pills = document.querySelectorAll(SELETOR);

    Array.prototype.forEach.call(pills, function (pill) {
      if (pill.getAttribute("translate") !== "no") {
        pill.setAttribute("translate", "no");
        pill.classList.add("notranslate");
      }

      var texto = pill.textContent.trim();
      var original = pill.getAttribute("data-metodo");

      if (original === null) {
        // Só serve de referência se o que está na tela ainda for um método de verdade.
        if (METODOS.test(texto)) pill.setAttribute("data-metodo", texto);
        return;
      }

      if (texto !== original) elementoDoTexto(pill).textContent = original;
    });
  }

  function iniciar() {
    protegerMetodos();

    /* A navegação é re-renderizada a cada troca de página (SPA) e a tradução dispara muitas
       mutações de uma vez; o quadro agrupa tudo em uma passada só. */
    var agendado = false;
    new MutationObserver(function () {
      if (agendado) return;
      agendado = true;
      requestAnimationFrame(function () {
        agendado = false;
        protegerMetodos();
      });
    }).observe(document.body, { childList: true, subtree: true });
  }

  if (document.body) {
    iniciar();
  } else {
    document.addEventListener("DOMContentLoaded", iniciar);
  }
})();
