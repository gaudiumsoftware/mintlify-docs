#!/usr/bin/env node
// Gera os imports e a lista de entradas das páginas de changelog a partir das pastas
// snippets/changelog/<modalidade>/, em ordem decrescente de nome.
//
// Uso:
//   node scripts/changelog/gerar-indice.mjs           páginas publicadas, sem as entradas xxxxxxxx_
//   node scripts/changelog/gerar-indice.mjs --previa  inclui as entradas xxxxxxxx_, só para o mint dev
//   node scripts/changelog/gerar-indice.mjs --datas   troca os marcadores pela data de hoje em São Paulo
//                                                      (ou CHANGELOG_DATA=AAAA-MM-DD) e regenera as páginas

import { existsSync, readdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

export const MODALIDADES = [
  { pasta: "snippets/changelog/corridas", pagina: "pages/v2/changelog.mdx" },
  { pasta: "snippets/changelog/entregas", pagina: "pages/v2/changelog-entregas.mdx" },
];

const DATADA = /^\d{8}_[a-z0-9_-]+\.mdx$/;
const PENDENTE = /^x{8}_[a-z0-9_-]+\.mdx$/;
const MARCADOR_DATA = 'date="xxxxxxxx"';
const MARCADOR_TAG = /^tag:[ \t]*(['"])xxxx-xx-xx\1[ \t]*$/m;
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

export function ordenarEntradas(arquivos, { previa = false } = {}) {
  return arquivos
    .filter((nome) => DATADA.test(nome) || (previa && PENDENTE.test(nome)))
    .sort()
    .reverse();
}

export function nomeDoImport(arquivo) {
  const [prefixo, ...resto] = arquivo.replace(/\.mdx$/, "").split("_");
  const slug = resto
    .join("-")
    .split("-")
    .map((parte) => parte.charAt(0).toUpperCase() + parte.slice(1))
    .join("");
  return `Entrada${prefixo === "xxxxxxxx" ? "Pendente" : prefixo}${slug}`;
}

function substituirTrecho(conteudo, marcador, linhas, separador) {
  const inicio = `{/* changelog:${marcador}:inicio */}`;
  const fim = `{/* changelog:${marcador}:fim */}`;
  const a = conteudo.indexOf(inicio);
  const b = conteudo.indexOf(fim);
  if (a === -1 || b === -1 || b < a) {
    throw new Error(`Marcadores ${inicio} e ${fim} não encontrados`);
  }
  const corpo = linhas.length ? `\n\n${linhas.join(separador)}\n\n` : "\n";
  return conteudo.slice(0, a) + inicio + corpo + conteudo.slice(b);
}

export function aplicarIndice(conteudo, caminhoImport, arquivos) {
  const imports = arquivos.map((arquivo) => `import ${nomeDoImport(arquivo)} from "${caminhoImport}/${arquivo}";`);
  const entradas = arquivos.map((arquivo) => `<${nomeDoImport(arquivo)} />`);
  const comImports = substituirTrecho(conteudo, "imports", imports, "\n");
  return substituirTrecho(comImports, "entradas", entradas, "\n\n");
}

export function gerarIndice({ raiz, previa = false }) {
  const alteradas = [];
  for (const { pasta, pagina } of MODALIDADES) {
    if (!existsSync(join(raiz, pasta))) continue;
    const arquivos = ordenarEntradas(readdirSync(join(raiz, pasta)), { previa });
    const caminhoPagina = join(raiz, pagina);
    const atual = readFileSync(caminhoPagina, "utf8");
    const novo = aplicarIndice(atual, `/${pasta}`, arquivos);
    if (novo !== atual) {
      writeFileSync(caminhoPagina, novo);
      alteradas.push(pagina);
    }
  }
  return alteradas;
}

export function dataDePublicacao(origem) {
  let iso = origem;
  if (origem instanceof Date) {
    iso = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(origem);
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(origem)) {
    throw new Error(`Data "${origem}" fora do formato AAAA-MM-DD`);
  }
  const [ano, mes, dia] = iso.split("-");
  return { compacta: `${ano}${mes}${dia}`, iso, exibida: `${Number(dia)} ${MESES[Number(mes) - 1]} ${ano}` };
}

export function aplicarDatas({ raiz, data }) {
  const renomeacoes = [];
  for (const { pasta } of MODALIDADES) {
    if (!existsSync(join(raiz, pasta))) continue;
    for (const nome of readdirSync(join(raiz, pasta)).filter((n) => PENDENTE.test(n))) {
      const destino = join(pasta, nome.replace(/^x{8}/, data.compacta));
      if (existsSync(join(raiz, destino))) throw new Error(`${destino} já existe`);
      renomeacoes.push({ origem: join(pasta, nome), destino });
    }
  }

  const alterados = [];
  for (const { origem, destino } of renomeacoes) {
    const conteudo = readFileSync(join(raiz, origem), "utf8");
    writeFileSync(join(raiz, origem), conteudo.replaceAll(MARCADOR_DATA, `date="${data.exibida}"`));
    renameSync(join(raiz, origem), join(raiz, destino));
    alterados.push(destino);
  }

  const paginas = readdirSync(join(raiz, "pages"), { recursive: true }).filter((n) => n.endsWith(".mdx"));
  for (const relativo of paginas.sort()) {
    const caminho = join(raiz, "pages", relativo);
    const conteudo = readFileSync(caminho, "utf8");
    if (!MARCADOR_TAG.test(conteudo)) continue;
    writeFileSync(caminho, conteudo.replace(MARCADOR_TAG, (_, aspas) => `tag: ${aspas}${data.iso}${aspas}`));
    alterados.push(join("pages", relativo));
  }
  return alterados;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const raiz = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
  if (process.argv.includes("--datas")) {
    const data = dataDePublicacao(process.env.CHANGELOG_DATA || new Date());
    const datados = aplicarDatas({ raiz, data });
    console.log(datados.length ? `Datados com ${data.iso}: ${datados.join(", ")}` : "Nenhum marcador encontrado");
  }
  const alteradas = gerarIndice({ raiz, previa: process.argv.includes("--previa") });
  console.log(alteradas.length ? `Atualizadas: ${alteradas.join(", ")}` : "Nenhuma página alterada");
}
