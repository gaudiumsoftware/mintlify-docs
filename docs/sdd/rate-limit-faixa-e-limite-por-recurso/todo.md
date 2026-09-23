# Lista de Tarefas — Alinhar a documentação de rate limit ao gateway

> Cada tarefa tem **acceptance** (o que precisa ser verdade quando
> terminar) e **verify** (como confirmar). Arquivos listados em cada
> tarefa são os que serão criados/alterados. Marcar `- [x]` ao
> concluir.
>
> Referência: [plan.md](plan.md) para fases e checkpoints;
> [spec.md](spec.md) para o quadro geral.

## Convenções

- `T<fase>.<slice>` na numeração (ex: T1.2 = Fase 1, Slice 2).
- "Página pronta" = atende os critérios do plan.md § Princípio de Fatiamento.
- Verificação: `python3 docs/sdd/rate-limit-faixa-e-limite-por-recurso/verifica-rate-limit.py <página>` compara as tabelas da
  seção "Rate limit" com o `ratelimit-rules.yml` da `main` do mchapigw
  (`gh api repos/gaudiumsoftware/mchapigw/contents/etc/mchapigw.d/ratelimit-rules.yml`).

---

## FASE 1 — v1

### T1.1 — Introdução v1 Corridas
- [x] `pages/v1/referencia/introducao.mdx`: trocar fator por faixa, atualizar Crítico
  (1900), Condutores e créditos (1300) e Notificações (200), substituir "Limite por
  solicitação" por "Limites por recurso" (solicitação, créditos de condutor, saldo e
  documentos de condutor, notificações a passageiro, cupom), ajustar headers.
- **Acceptance**: seção sem "fator"; limites iguais ao yml; tabela de recursos só com
  paths documentados na página.
- **Verify**: `python3 docs/sdd/rate-limit-faixa-e-limite-por-recurso/verifica-rate-limit.py pages/v1/referencia/introducao.mdx`
  responde `OK`.
- **Files**: 1.

### T1.2 — Introdução v1 Entregas
- [x] `pages/v1/entregas/introducao.mdx`: mesmas mudanças da T1.1, sem notificações e
  com os endpoints de crédito de empresa na tabela de recursos.
- **Acceptance**: idem T1.1.
- **Verify**: `python3 docs/sdd/rate-limit-faixa-e-limite-por-recurso/verifica-rate-limit.py pages/v1/entregas/introducao.mdx`
  responde `OK`.
- **Files**: 1.

### 🏁 CHECKPOINT CP1 — v1 alinhada
- [x] As duas páginas v1 respondem `OK` no script.
- [x] `git diff --stat` só lista as duas páginas v1 e os artefatos SDD.

---

## FASE 2 — v2

### T2.1 — Introdução v2 Corridas
- [x] `pages/v2/referencia/introducao.mdx`: trocar fator por faixa, atualizar
  Condutores (750), Notificações (230), In-app messaging individual (900) e Push
  individual (1100), criar "Limites por recurso" (créditos de condutor, saldo e
  documentos, notificações a passageiro, cupom), ajustar headers.
- **Acceptance**: idem T1.1.
- **Verify**: `python3 docs/sdd/rate-limit-faixa-e-limite-por-recurso/verifica-rate-limit.py pages/v2/referencia/introducao.mdx`
  responde `OK`.
- **Files**: 1.

### T2.2 — Introdução v2 Entregas
- [x] `pages/v2/entregas/introducao.mdx`: trocar fator por faixa, atualizar Condutores
  (750), criar "Limites por recurso" (créditos de condutor e empresa, saldo e
  documentos de condutor e empresa), ajustar headers.
- **Acceptance**: idem T1.1.
- **Verify**: `python3 docs/sdd/rate-limit-faixa-e-limite-por-recurso/verifica-rate-limit.py pages/v2/entregas/introducao.mdx`
  responde `OK`.
- **Files**: 1.

### 🏁 CHECKPOINT CP2 — as quatro páginas alinhadas
- [x] As quatro páginas respondem `OK` no script.
- [x] `grep -il "digest\|negoci" pages/*/*/introducao.mdx` não retorna nada.
- [x] `git diff` fora das seções "Rate limit" está vazio.
