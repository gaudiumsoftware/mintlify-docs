import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { ordenarEntradas, nomeDoImport, aplicarIndice, gerarIndice, dataDePublicacao, aplicarDatas } from "./gerar-indice.mjs";

const PAGINA = `---
title: "Corridas"
---

{/* changelog:imports:inicio */}
{/* changelog:imports:fim */}

<div>
  <div>Cabeçalho</div>

{/* changelog:entradas:inicio */}
{/* changelog:entradas:fim */}

</div>
`;

test("ordena da entrada mais recente para a mais antiga", () => {
  const arquivos = ["20260922_a.mdx", "20261020_b.mdx", "20261001_c.mdx"];
  assert.deepEqual(ordenarEntradas(arquivos), ["20261020_b.mdx", "20261001_c.mdx", "20260922_a.mdx"]);
});

test("no mesmo dia, desempata pelo slug em ordem decrescente", () => {
  const arquivos = ["20261020_alfa.mdx", "20261020_beta.mdx"];
  assert.deepEqual(ordenarEntradas(arquivos), ["20261020_beta.mdx", "20261020_alfa.mdx"]);
});

test("ignora a entrada pendente e o que não é entrada", () => {
  const arquivos = ["20261020_b.mdx", "xxxxxxxx_nova.mdx", "leia-me.md", "rascunho.mdx"];
  assert.deepEqual(ordenarEntradas(arquivos), ["20261020_b.mdx"]);
});

test("na prévia, a entrada pendente vem antes das datadas", () => {
  const arquivos = ["20261020_b.mdx", "xxxxxxxx_nova.mdx"];
  assert.deepEqual(ordenarEntradas(arquivos, { previa: true }), ["xxxxxxxx_nova.mdx", "20261020_b.mdx"]);
});

test("gera nome de import válido a partir do arquivo", () => {
  assert.equal(nomeDoImport("20261020_criar-dinamica-area.mdx"), "Entrada20261020CriarDinamicaArea");
  assert.equal(nomeDoImport("xxxxxxxx_endpoint_consulta_cliente.mdx"), "EntradaPendenteEndpointConsultaCliente");
});

test("escreve imports e lista entre os marcadores, preservando o cabeçalho", () => {
  const resultado = aplicarIndice(PAGINA, "/snippets/changelog/corridas", ["20261020_b.mdx", "20261001_c.mdx"]);
  assert.match(resultado, /import Entrada20261020B from "\/snippets\/changelog\/corridas\/20261020_b\.mdx";\nimport Entrada20261001C from/);
  assert.match(resultado, /<Entrada20261020B \/>\n\n<Entrada20261001C \/>/);
  assert.match(resultado, /<div>Cabeçalho<\/div>/);
});

test("aplicar duas vezes não muda o resultado", () => {
  const uma = aplicarIndice(PAGINA, "/snippets/changelog/corridas", ["20261020_b.mdx"]);
  assert.equal(aplicarIndice(uma, "/snippets/changelog/corridas", ["20261020_b.mdx"]), uma);
});

test("falha quando a página não tem os marcadores", () => {
  assert.throws(() => aplicarIndice("sem marcadores", "/snippets/changelog/corridas", []), /changelog:imports:inicio/);
});

test("gera as páginas a partir das pastas e informa o que mudou", () => {
  const raiz = mkdtempSync(join(tmpdir(), "changelog-"));
  mkdirSync(join(raiz, "snippets/changelog/corridas"), { recursive: true });
  mkdirSync(join(raiz, "snippets/changelog/entregas"), { recursive: true });
  mkdirSync(join(raiz, "pages/v2"), { recursive: true });
  writeFileSync(join(raiz, "snippets/changelog/corridas/20261020_b.mdx"), "");
  writeFileSync(join(raiz, "snippets/changelog/corridas/xxxxxxxx_nova.mdx"), "");
  writeFileSync(join(raiz, "pages/v2/changelog.mdx"), PAGINA);
  writeFileSync(join(raiz, "pages/v2/changelog-entregas.mdx"), PAGINA);

  assert.deepEqual(gerarIndice({ raiz }), ["pages/v2/changelog.mdx"]);
  const pagina = readFileSync(join(raiz, "pages/v2/changelog.mdx"), "utf8");
  assert.match(pagina, /<Entrada20261020B \/>/);
  assert.doesNotMatch(pagina, /Pendente/);
  assert.deepEqual(gerarIndice({ raiz }), []);

  gerarIndice({ raiz, previa: true });
  assert.match(readFileSync(join(raiz, "pages/v2/changelog.mdx"), "utf8"), /<EntradaPendenteNova \/>/);
});

test("pula a modalidade que ainda não tem pasta", () => {
  const raiz = mkdtempSync(join(tmpdir(), "changelog-"));
  mkdirSync(join(raiz, "snippets/changelog/corridas"), { recursive: true });
  mkdirSync(join(raiz, "pages/v2"), { recursive: true });
  writeFileSync(join(raiz, "snippets/changelog/corridas/20261020_b.mdx"), "");
  writeFileSync(join(raiz, "pages/v2/changelog.mdx"), PAGINA);
  writeFileSync(join(raiz, "pages/v2/changelog-entregas.mdx"), "página sem marcadores");

  assert.deepEqual(gerarIndice({ raiz }), ["pages/v2/changelog.mdx"]);
});

function montarRepo() {
  const raiz = mkdtempSync(join(tmpdir(), "changelog-"));
  mkdirSync(join(raiz, "snippets/changelog/corridas"), { recursive: true });
  mkdirSync(join(raiz, "snippets/changelog/entregas"), { recursive: true });
  mkdirSync(join(raiz, "pages/v2/referencia/endpoint"), { recursive: true });
  writeFileSync(join(raiz, "pages/v2/changelog.mdx"), PAGINA);
  writeFileSync(join(raiz, "pages/v2/changelog-entregas.mdx"), PAGINA);
  return raiz;
}

test("calcula a data no fuso de São Paulo", () => {
  assert.deepEqual(dataDePublicacao(new Date("2026-10-17T02:30:00Z")), {
    compacta: "20261016",
    iso: "2026-10-16",
    exibida: "16 out 2026",
  });
  assert.equal(dataDePublicacao(new Date("2026-03-05T15:00:00Z")).exibida, "5 mar 2026");
});

test("aceita a data injetada no formato AAAA-MM-DD", () => {
  assert.equal(dataDePublicacao("2026-10-16").compacta, "20261016");
  assert.throws(() => dataDePublicacao("16/10/2026"), /AAAA-MM-DD/);
});

test("renomeia a entrada pendente e troca a data dentro dela", () => {
  const raiz = montarRepo();
  const pendente = join(raiz, "snippets/changelog/corridas/xxxxxxxx_consulta-cliente.mdx");
  writeFileSync(pendente, '<Entry date="xxxxxxxx" label="Novo">\n</Entry>\n');

  const alterados = aplicarDatas({ raiz, data: dataDePublicacao("2026-10-16") });

  assert.deepEqual(alterados, ["snippets/changelog/corridas/20261016_consulta-cliente.mdx"]);
  assert.equal(existsSync(pendente), false);
  assert.equal(
    readFileSync(join(raiz, "snippets/changelog/corridas/20261016_consulta-cliente.mdx"), "utf8"),
    '<Entry date="16 out 2026" label="Novo">\n</Entry>\n',
  );
});

test("troca a tag marcador das páginas pela data", () => {
  const raiz = montarRepo();
  const pagina = join(raiz, "pages/v2/referencia/endpoint/get-cliente.mdx");
  writeFileSync(pagina, "---\ntitle: 'Consultar cliente'\ntag: 'xxxx-xx-xx'\n---\n");
  writeFileSync(join(raiz, "pages/v2/referencia/endpoint/get-outro.mdx"), "---\ntag: 'Em breve'\n---\n");

  assert.deepEqual(aplicarDatas({ raiz, data: dataDePublicacao("2026-10-16") }), ["pages/v2/referencia/endpoint/get-cliente.mdx"]);
  assert.equal(readFileSync(pagina, "utf8"), "---\ntitle: 'Consultar cliente'\ntag: '2026-10-16'\n---\n");
});

test("sem marcador, não altera nada", () => {
  const raiz = montarRepo();
  writeFileSync(join(raiz, "snippets/changelog/corridas/20261015_b.mdx"), '<Entry date="15 out 2026">\n</Entry>\n');
  assert.deepEqual(aplicarDatas({ raiz, data: dataDePublicacao("2026-10-16") }), []);
});

test("falha quando o nome datado já existe", () => {
  const raiz = montarRepo();
  writeFileSync(join(raiz, "snippets/changelog/corridas/xxxxxxxx_b.mdx"), "");
  writeFileSync(join(raiz, "snippets/changelog/corridas/20261016_b.mdx"), "");
  assert.throws(() => aplicarDatas({ raiz, data: dataDePublicacao("2026-10-16") }), /20261016_b\.mdx já existe/);
  assert.equal(existsSync(join(raiz, "snippets/changelog/corridas/xxxxxxxx_b.mdx")), true);
});

test("falha quando dois arquivos geram o mesmo nome de import", () => {
  assert.throws(
    () => aplicarIndice(PAGINA, "/snippets/changelog/corridas", ["20260101_a-b.mdx", "20260101_a_b.mdx"]),
    /20260101_a-b\.mdx e 20260101_a_b\.mdx geram o mesmo import Entrada20260101AB/,
  );
});

test("recusa data que não existe", () => {
  assert.throws(() => dataDePublicacao("2026-13-40"), /AAAA-MM-DD/);
  assert.throws(() => dataDePublicacao("2026-02-30"), /AAAA-MM-DD/);
  assert.equal(dataDePublicacao("2028-02-29").exibida, "29 fev 2028");
});

test("aceita o marcador de data com aspas simples", () => {
  const raiz = montarRepo();
  writeFileSync(join(raiz, "snippets/changelog/corridas/xxxxxxxx_b.mdx"), "<Entry date='xxxxxxxx'>\n</Entry>\n");
  aplicarDatas({ raiz, data: dataDePublicacao("2026-10-16") });
  assert.equal(readFileSync(join(raiz, "snippets/changelog/corridas/20261016_b.mdx"), "utf8"), "<Entry date='16 out 2026'>\n</Entry>\n");
});

test("não renomeia nada quando sobra marcador numa entrada", () => {
  const raiz = montarRepo();
  writeFileSync(join(raiz, "snippets/changelog/corridas/xxxxxxxx_a.mdx"), '<Entry date="xxxxxxxx">\n</Entry>\n');
  writeFileSync(join(raiz, "snippets/changelog/corridas/xxxxxxxx_b.mdx"), '<Entry date = "xxxxxxxx">\n</Entry>\n');
  assert.throws(() => aplicarDatas({ raiz, data: dataDePublicacao("2026-10-16") }), /xxxxxxxx_b\.mdx ainda tem o marcador xxxxxxxx/);
  assert.equal(existsSync(join(raiz, "snippets/changelog/corridas/xxxxxxxx_a.mdx")), true);
  assert.equal(readFileSync(join(raiz, "snippets/changelog/corridas/xxxxxxxx_a.mdx"), "utf8"), '<Entry date="xxxxxxxx">\n</Entry>\n');
});
