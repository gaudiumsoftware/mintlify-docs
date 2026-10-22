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

/* Seletor de ambiente nas páginas de endpoint. O tema só mostra a URL base como um <select>
   discreto, sem rótulo: o integrador não percebe que a URL padrão é a de vendas (a
   primeira da lista `servers` do OpenAPI) e precisa descobrir que a URL é clicável para
   chegar à produção. Aqui cada <select> de URL base ganha, acima da linha da URL, um
   alternador com os dois ambientes sempre visíveis e uma nota do que cada um significa. O
   <select> continua sendo a fonte da verdade (é ele que alimenta o cURL e o "Try it"); o
   alternador só o lê e o altera. A escolha fica salva no navegador, para não ter que repeti-la
   a cada página. */
(function () {
  var SELETOR_SELECT = 'select[aria-label="Select base URL"]';
  var CHAVE = "docs-ambiente-api";

  var AMBIENTES = {
    vendas: {
      rotulo: "Vendas",
      nota: "Ambiente de vendas, separado de produção.",
    },
    producao: {
      rotulo: "Produção",
      nota: "Ambiente real das centrais: ações permanentes.",
    },
  };

  function ambienteDaUrl(url) {
    return url.indexOf("api-vendas.") !== -1 ? "vendas" : "producao";
  }

  function lerPreferencia() {
    try {
      return window.localStorage.getItem(CHAVE);
    } catch (e) {
      return null;
    }
  }

  function gravarPreferencia(ambiente) {
    try {
      window.localStorage.setItem(CHAVE, ambiente);
    } catch (e) {}
  }

  function ambienteSelecionado(select) {
    var opcao = select.options[select.selectedIndex];
    return opcao ? ambienteDaUrl(opcao.textContent) : null;
  }

  /* O <select> é controlado pelo React: atribuir `.value` direto não notifica o tema.
     O setter nativo seguido de um `change` que borbulha é o que ele escuta. */
  function selecionar(select, indice) {
    var setter = Object.getOwnPropertyDescriptor(
      window.HTMLSelectElement.prototype,
      "value"
    ).set;
    setter.call(select, select.options[indice].value);
    select.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function indiceDoAmbiente(select, ambiente) {
    for (var i = 0; i < select.options.length; i++) {
      if (ambienteDaUrl(select.options[i].textContent) === ambiente) return i;
    }
    return -1;
  }

  /* Logo após o `change`, o React ainda devolve o valor antigo ao <select> até terminar a
     renderização; ler no quadro seguinte garante o estado final. */
  function atualizarAposRender(controle, select) {
    setTimeout(function () {
      atualizar(controle, select);
    }, 50);
  }

  function atualizar(controle, select) {
    var atual = ambienteSelecionado(select);
    if (!atual) return;
    controle.setAttribute("data-ambiente", atual);
    Array.prototype.forEach.call(
      controle.querySelectorAll("button[data-ambiente]"),
      function (botao) {
        botao.setAttribute(
          "aria-pressed",
          botao.getAttribute("data-ambiente") === atual ? "true" : "false"
        );
      }
    );
    controle.querySelector(".env-switch-note").textContent =
      AMBIENTES[atual].nota;
  }

  function criarControle(select) {
    var controle = document.createElement("div");
    controle.className = "env-switch";
    controle.setAttribute("role", "group");
    controle.setAttribute("aria-label", "Ambiente da API");

    var titulo = document.createElement("span");
    titulo.className = "env-switch-label";
    titulo.textContent = "Ambiente";
    controle.appendChild(titulo);

    Array.prototype.forEach.call(select.options, function (opcao, indice) {
      var ambiente = ambienteDaUrl(opcao.textContent);
      var botao = document.createElement("button");
      botao.type = "button";
      botao.className = "env-switch-option";
      botao.setAttribute("data-ambiente", ambiente);
      botao.setAttribute("title", opcao.textContent);
      botao.innerHTML = '<span class="env-switch-dot"></span>';
      botao.appendChild(document.createTextNode(AMBIENTES[ambiente].rotulo));
      botao.addEventListener("click", function (evento) {
        evento.stopPropagation();
        gravarPreferencia(ambiente);
        selecionar(select, indice);
        atualizarAposRender(controle, select);
      });
      controle.appendChild(botao);
    });

    var nota = document.createElement("span");
    nota.className = "env-switch-note";
    controle.appendChild(nota);

    /* Também vale a troca feita pelo <select> nativo, que continua visível: a preferência é
       gravada depois da renderização, quando o <select> já tem o valor final. */
    select.addEventListener("change", function () {
      setTimeout(function () {
        var atual = ambienteSelecionado(select);
        if (atual) gravarPreferencia(atual);
        atualizar(controle, select);
      }, 50);
    });

    return controle;
  }

  function instalar() {
    var selects = document.querySelectorAll(SELETOR_SELECT);

    Array.prototype.forEach.call(selects, function (select) {
      if (select.hasAttribute("data-ambiente-ligado")) return;

      /* O cartão que envolve a linha "método + URL + Try it" */
      var cartao = select.closest('[class*="rounded-2xl"]');
      if (!cartao || select.options.length < 2) return;

      select.setAttribute("data-ambiente-ligado", "");
      var controle = criarControle(select);
      cartao.insertBefore(controle, cartao.firstChild);

      var preferido = lerPreferencia();
      if (preferido && preferido !== ambienteSelecionado(select)) {
        var indice = indiceDoAmbiente(select, preferido);
        if (indice !== -1) selecionar(select, indice);
      }
      atualizar(controle, select);
      atualizarAposRender(controle, select);
    });
  }

  function iniciar() {
    instalar();

    var agendado = false;
    new MutationObserver(function () {
      if (agendado) return;
      agendado = true;
      requestAnimationFrame(function () {
        agendado = false;
        instalar();
      });
    }).observe(document.body, { childList: true, subtree: true });
  }

  if (document.body) {
    iniciar();
  } else {
    document.addEventListener("DOMContentLoaded", iniciar);
  }
})();

/* Descrição do endpoint: o tema renderiza a `description` inteira do OpenAPI no topo da
   página, acima da URL. Quando ela é longa (regras de filtro, campos da resposta, permissões),
   o integrador só chega à URL e aos parâmetros depois de rolar a explicação inteira. Aqui só o
   primeiro parágrafo fica no topo como descrição curta; o restante é copiado para logo abaixo
   do cartão da URL, antes dos parâmetros. A descrição do OpenAPI não muda (o MCP e o Copiar
   página continuam com o texto completo): é uma cópia, e o original fica oculto pelo CSS. Se o
   script não rodar, a página mostra a descrição inteira no topo, como o tema faz. */
(function () {
  var SELETOR_DESCRICAO = 'header > div[class*="prose"]';
  var SELETOR_CARTAO = '.method-pill';

  function cartaoDaUrl() {
    var metodo = document.querySelector(SELETOR_CARTAO);
    return metodo ? metodo.closest('[class*="rounded-2xl"]') : null;
  }

  function moverDetalhes() {
    var descricao = document.querySelector(SELETOR_DESCRICAO);
    var cartao = cartaoDaUrl();
    if (!descricao) return;
    if (!cartao || !cartao.parentElement) {
      descricao.removeAttribute("data-detalhes-movido");
      return;
    }

    var existente = cartao.parentElement.querySelector(":scope > .endpoint-detalhes");
    var extras = Array.prototype.slice.call(descricao.children, 1);

    if (extras.length === 0) {
      if (existente) existente.remove();
      descricao.removeAttribute("data-detalhes-movido");
      return;
    }

    var fonte = extras
      .map(function (no) {
        return no.outerHTML;
      })
      .join("");

    descricao.setAttribute("data-detalhes-movido", "");
    if (existente && existente.getAttribute("data-fonte") === fonte) return;
    if (existente) existente.remove();

    var bloco = document.createElement("div");
    bloco.className = "endpoint-detalhes prose prose-gray dark:prose-invert";
    bloco.setAttribute("data-fonte", fonte);
    extras.forEach(function (no) {
      bloco.appendChild(no.cloneNode(true));
    });
    cartao.insertAdjacentElement("afterend", bloco);
  }

  function iniciar() {
    moverDetalhes();

    var agendado = false;
    new MutationObserver(function () {
      if (agendado) return;
      agendado = true;
      setTimeout(function () {
        agendado = false;
        moverDetalhes();
      }, 0);
    }).observe(document.body, { childList: true, subtree: true });
  }

  if (document.body) {
    iniciar();
  } else {
    document.addEventListener("DOMContentLoaded", iniciar);
  }
})();
