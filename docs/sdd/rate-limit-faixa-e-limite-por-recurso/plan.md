# Plano — Alinhar a documentação de rate limit ao gateway

> Referência: [spec.md](spec.md).

## Princípio de Fatiamento

Uma fatia por página de introdução. Cada fatia deixa a página inteira coerente
(texto, tabela de grupos, tabela de recursos, headers) e verificável contra o yml do
gateway. "Página pronta" = seção "Rate limit" sem "fator", limites iguais ao yml e
restante do arquivo intocado.

## Fases

### FASE 1 — v1 (Corridas e Entregas)

- T1.1 `pages/v1/referencia/introducao.mdx`
- T1.2 `pages/v1/entregas/introducao.mdx`

Checkpoint CP1: as duas páginas v1 passam no script de verificação.

### FASE 2 — v2 (Corridas e Entregas)

- T2.1 `pages/v2/referencia/introducao.mdx`
- T2.2 `pages/v2/entregas/introducao.mdx`

Checkpoint CP2: as quatro páginas passam no script de verificação e o diff só toca
as seções "Rate limit".

## Dependências Críticas

```
yml da main do mchapigw ──► T1.1 ──► T1.2
                        └─► T2.1 ──► T2.2
```

As fatias são independentes entre si; a ordem é só para reaproveitar o texto comum.

## Riscos e Mitigações

| Risco | Probabilidade | Mitigação |
|---|---|---|
| Copiar limite de `log` no lugar de `block` | Média | Script de verificação compara cada linha da tabela ao `count` de `action: block`. |
| Listar path de recurso não documentado na página | Média | Conferir cada path da tabela de recursos contra a OpenAPI da página. |
| Citar digest ou negociação de faixa | Baixa | `grep -i "digest\|negoci\|e-mail"` nas 4 páginas ao fim. |

## Pode Pular

- Nada. As quatro páginas precisam mudar.
