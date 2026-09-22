#!/usr/bin/env python3
"""Compara a seção "Rate limit" de uma introdução com o ratelimit-rules.yml da main do mchapigw.

Uso: python3 verifica-rate-limit.py pages/v2/referencia/introducao.mdx [...]

Para cada linha da tabela de grupos, o limite documentado deve ser igual ao count de
action: block da regra api-key que casa cada path. Para cada linha da tabela de
recursos, o limite deve ser igual ao count de block da regra by_asset que lista o path.
Também falha se a seção citar fator, digest ou negociação de faixa.
"""
import re
import subprocess
import sys

import yaml

YML = "repos/gaudiumsoftware/mchapigw/contents/etc/mchapigw.d/ratelimit-rules.yml"


def carrega_regras():
    raw = subprocess.check_output(
        ["gh", "api", "-H", "Accept: application/vnd.github.raw", YML]
    )
    regras = yaml.safe_load(raw)["rules"]
    por_header = [r for r in regras if r.get("group", {}).get("by_header") == "api-key"]
    por_header.sort(key=lambda r: r["priority"])
    por_ativo = [r for r in regras if "by_asset" in r.get("group", {})]
    return por_header, por_ativo


def block(regra):
    return next(l["count"] for l in regra["sw_limits"] if l["action"] == "block")


def casa(padrao, path):
    if padrao.endswith("*"):
        return path.startswith(padrao[:-1])
    return padrao == path


def regra_do_path(por_header, path):
    for r in por_header:
        if any(casa(p, path) for p in r["paths"]):
            return r
    return None


def secao_rate_limit(texto):
    ini = texto.index("## Rate limit")
    fim = texto.index("\n## ", ini + 1)
    return texto[ini:fim]


def linhas_tabela(secao, titulo_col1):
    tabela = []
    dentro = False
    for linha in secao.splitlines():
        if linha.startswith(f"| {titulo_col1} "):
            dentro = True
            continue
        if dentro and linha.startswith("| ---"):
            continue
        if dentro and linha.startswith("|"):
            tabela.append(linha)
        elif dentro:
            break
    return tabela


def verifica(pagina):
    texto = open(pagina, encoding="utf-8").read()
    secao = secao_rate_limit(texto)
    erros = []

    for termo in ("fator", "digest", "negoci", "e-mail"):
        if termo in secao.lower():
            erros.append(f"seção cita '{termo}'")

    por_header, por_ativo = carrega_regras()

    for linha in linhas_tabela(secao, "Grupo"):
        celulas = [c.strip() for c in linha.strip("|").split("|")]
        grupo, paths, limite = celulas[0], celulas[1], celulas[2]
        m = re.match(r"(\d+) \* faixa", limite)
        if not m:
            erros.append(f"[{grupo}] limite fora do formato 'N * faixa': {limite}")
            continue
        documentado = int(m.group(1))
        for path in re.findall(r"`([^`]+)`", paths):
            # Path com * na docs equivale ao path com * da regra; o matcher usa o próprio texto.
            regra = regra_do_path(por_header, path.rstrip("*")) if path.endswith("*") else regra_do_path(por_header, path)
            if regra is None:
                erros.append(f"[{grupo}] nenhuma regra api-key casa {path}")
            elif block(regra) != documentado:
                erros.append(f"[{grupo}] {path}: docs {documentado}, gateway {block(regra)} ({regra['id']})")

    for linha in linhas_tabela(secao, "Recurso"):
        celulas = [c.strip() for c in linha.strip("|").split("|")]
        recurso, paths, limite = celulas[0], celulas[1], celulas[-1]
        m = re.match(r"(\d+) por minuto", limite)
        if not m:
            erros.append(f"[{recurso}] limite fora do formato 'N por minuto': {limite}")
            continue
        documentado = int(m.group(1))
        for path in re.findall(r"`(/[^`]+)`", paths):
            regras = [r for r in por_ativo if path in r["paths"]]
            if not regras:
                erros.append(f"[{recurso}] nenhuma regra by_asset lista {path}")
            elif block(regras[0]) != documentado:
                erros.append(f"[{recurso}] {path}: docs {documentado}, gateway {block(regras[0])} ({regras[0]['id']})")

    return erros


if __name__ == "__main__":
    falhou = False
    for pagina in sys.argv[1:]:
        erros = verifica(pagina)
        if erros:
            falhou = True
            print(f"FALHA {pagina}")
            for e in erros:
                print("  -", e)
        else:
            print(f"OK {pagina}")
    sys.exit(1 if falhou else 0)
