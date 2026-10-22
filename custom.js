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
   discreto, sem rótulo: o integrador não percebe qual ambiente está selecionado e precisa
   descobrir que a URL é clicável para trocá-lo. Aqui cada <select> de URL base ganha, acima da linha da URL, um
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

  var HOSTS = {
    "api-vendas.taximachine.com.br": "vendas",
    "api.taximachine.com.br": "producao",
  };

  /* Só os dois hosts conhecidos têm ambiente; qualquer outro (sandbox, staging) devolve null
     para não ser apresentado como produção. */
  function ambienteDaUrl(url) {
    try {
      return HOSTS[new URL(url).hostname] || null;
    } catch (e) {
      return null;
    }
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
        var ambiente = botao.getAttribute("data-ambiente");
        var indice = indiceDoAmbiente(select, ambiente);
        botao.setAttribute("aria-pressed", ambiente === atual ? "true" : "false");
        if (indice !== -1) {
          botao.setAttribute("title", select.options[indice].textContent);
        }
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

    Array.prototype.forEach.call(select.options, function (opcao) {
      var ambiente = ambienteDaUrl(opcao.textContent);
      var botao = document.createElement("button");
      botao.type = "button";
      botao.className = "env-switch-option";
      botao.setAttribute("data-ambiente", ambiente);
      botao.innerHTML = '<span class="env-switch-dot"></span>';
      botao.appendChild(document.createTextNode(AMBIENTES[ambiente].rotulo));
      botao.addEventListener("click", function (evento) {
        evento.stopPropagation();
        var indice = indiceDoAmbiente(select, ambiente);
        if (indice === -1) return;
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
      /* Select já ligado: só resincroniza o alternador, caso o tema tenha reaproveitado o
         elemento e mudado o valor sem disparar `change` */
      var ligado = select.controleAmbiente;
      if (ligado && ligado.isConnected) {
        atualizar(ligado, select);
        return;
      }

      /* O cartão que envolve a linha "método + URL + Try it" */
      var cartao = select.closest('[class*="rounded-2xl"]');
      if (!cartao || select.options.length < 2) return;

      /* Com um servidor desconhecido na lista, o <select> do tema fica como está */
      var conhecidos = Array.prototype.every.call(select.options, function (opcao) {
        return ambienteDaUrl(opcao.textContent) !== null;
      });
      if (!conhecidos) return;

      var controle = criarControle(select);
      select.controleAmbiente = controle;
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
      setTimeout(function () {
        agendado = false;
        instalar();
      }, 0);
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
  /* A busca fica dentro da área de conteúdo, para não pegar tags de método da navegação
     lateral ou da busca */
  var SELETOR_AREA = "#content-area";
  var SELETOR_DESCRICAO = 'header > div[class*="prose"]';
  var SELETOR_CARTAO = ".method-pill";

  function cartaoDaUrl(area) {
    var metodo = area.querySelector(SELETOR_CARTAO);
    return metodo ? metodo.closest('[class*="rounded-2xl"]') : null;
  }

  function limpar(descricao) {
    if (descricao) descricao.removeAttribute("data-detalhes-movido");
    Array.prototype.forEach.call(
      document.querySelectorAll(".endpoint-detalhes"),
      function (bloco) {
        bloco.remove();
      }
    );
  }

  function moverDetalhes() {
    var area = document.querySelector(SELETOR_AREA);
    if (!area) return;

    var descricao = area.querySelector(SELETOR_DESCRICAO);
    var cartao = cartaoDaUrl(area);
    if (!descricao || !cartao || !cartao.parentElement) {
      limpar(descricao);
      return;
    }

    var existente = cartao.parentElement.querySelector(":scope > .endpoint-detalhes");
    var extras = Array.prototype.slice.call(descricao.children, 1);

    if (extras.length === 0) {
      limpar(descricao);
      return;
    }

    /* Assinatura do que foi copiado, guardada na propriedade do elemento (não no DOM) para
       saber se a descrição mudou sem reconstruir o bloco a cada mutação da página. */
    var fonte = extras
      .map(function (no) {
        return no.textContent;
      })
      .join("\u0000");

    descricao.setAttribute("data-detalhes-movido", "");
    if (existente && existente.fonteDetalhes === fonte) return;
    if (existente) existente.remove();

    var bloco = document.createElement("div");
    bloco.className = "endpoint-detalhes prose prose-gray dark:prose-invert";
    bloco.fonteDetalhes = fonte;
    extras.forEach(function (no) {
      var copia = no.cloneNode(true);
      /* O id do original continua no DOM (oculto); a cópia não pode repeti-lo */
      if (copia.hasAttribute("id")) copia.removeAttribute("id");
      Array.prototype.forEach.call(copia.querySelectorAll("[id]"), function (el) {
        el.removeAttribute("id");
      });
      bloco.appendChild(copia);
    });
    cartao.insertAdjacentElement("afterend", bloco);
  }

  /* O clone não leva os handlers do React: o botão de copiar de um bloco de código da cópia
     fica sem ação, então o clique é tratado aqui. */
  document.addEventListener("click", function (evento) {
    var botao = evento.target.closest(
      ".endpoint-detalhes .code-block-copy-button button"
    );
    if (!botao) return;

    var bloco = botao.closest(".code-block");
    var codigo = bloco && bloco.querySelector("pre");
    if (!codigo || !navigator.clipboard) return;

    navigator.clipboard.writeText(codigo.textContent).catch(function () {});
  });

  /* Mutações causadas pelo próprio script (a cópia inserida, o alternador de ambiente) não
     mudam a descrição e não precisam de nova passada */
  function ehNosso(no) {
    var elemento = no.nodeType === 1 ? no : no.parentElement;
    return !!elemento && !!elemento.closest(".endpoint-detalhes, .env-switch");
  }

  function mutacaoRelevante(registros) {
    return registros.some(function (registro) {
      if (ehNosso(registro.target)) return false;
      var nos = Array.prototype.slice
        .call(registro.addedNodes)
        .concat(Array.prototype.slice.call(registro.removedNodes));
      return nos.some(function (no) {
        return !ehNosso(no);
      });
    });
  }

  function iniciar() {
    moverDetalhes();

    var agendado = false;
    new MutationObserver(function (registros) {
      if (agendado || !mutacaoRelevante(registros)) return;
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
