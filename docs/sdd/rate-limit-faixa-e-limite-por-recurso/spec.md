# Spec: Alinhar a documentação de rate limit ao gateway (faixa e limites por recurso)

> Para quem mantém a documentação da API de integração: o que mudar nas seções
> "Rate limit" das introduções v1 e v2 para refletir o que o mchapigw aplica hoje.

## Objetivo

**O que estamos construindo.** Atualizar a seção "Rate limit" das 4 páginas de
introdução da API de integração (Corridas e Entregas, v1 e v2) para refletir três
mudanças já em produção no gateway.

**Por que.**
- O multiplicador dos limites deixou de ser um fator calculado a partir do tamanho
  da operação e passou a ser a **faixa** declarada para cada central. A docs ainda
  descreve o fator calculado.
- Os limites base de vários grupos foram elevados. A docs mostra os valores antigos.
- Entraram limites **por recurso** (por condutor, por empresa, por passageiro, por
  gerador de cupom) em créditos, notificações e cupons. A docs só conhece o limite
  por solicitação da v1.

**Quem usa.** Integradores externos das APIs de Corridas e Entregas (v1 e v2).

**Sucesso se.** As 4 páginas mostram os limites base atuais como `limite base * faixa`,
explicam a faixa sem revelar como ela é atribuída, e listam os limites por recurso
que valem para os endpoints documentados em cada página.

## Stack de Referência

Só documentação: arquivos `.mdx` (Mintlify) em
`pages/v1/{referencia,entregas}/introducao.mdx` e
`pages/v2/{referencia,entregas}/introducao.mdx`.

Fonte da verdade: `etc/mchapigw.d/ratelimit-rules.yml` na branch `main` do repositório
`gaudiumsoftware/mchapigw`. Só entram na docs as regras agrupadas por `api-key`
(`api:int:*key*`) e as regras por ativo (`api:int:asset:*`) cujos paths estão
documentados na página. Regras por `int-key`, `app-key` e sessão ficam fora.

## Escopo

**Dentro:**

- Trocar "fator" por "faixa" no texto explicativo, na coluna Limite e na descrição do
  header `X-RateLimit-Limit`. Faixa é um multiplicador inteiro, a partir de 1, definido
  por central; sem faixa definida, vale 1.
- Atualizar os limites base que mudaram no gateway:
  - v1: Crítico 500 → 1900; Condutores e créditos 80 → 1300; Notificações (in-app e
    push) 100 → 200.
  - v2: Condutores 80 → 750; Notificações (in-app e push) 100 → 230; In-app messaging
    (individual) 200 → 900; Push (individual) 200 → 1100.
- Substituir a subseção "Limite por solicitação" (v1) por "Limites por recurso", e
  criar essa subseção na v2, com uma tabela por página listando apenas os endpoints
  documentados nela:
  - v1 Corridas: solicitação (3/min), créditos de condutor escrita (5/min), saldo e
    documentos de condutor (12/min), notificações a passageiro (4/min), criação de
    cupom (20/min).
  - v1 Entregas: o mesmo, sem notificações (endpoints não documentados na página) e
    com os endpoints de crédito de empresa somados aos de condutor.
  - v2 Corridas: créditos de condutor escrita (5/min), saldo e documentos de condutor
    (12/min), notificações a passageiro nos 4 endpoints de passageiro (4/min),
    criação de cupom (20/min).
  - v2 Entregas: créditos de condutor e empresa escrita (5/min), saldo e documentos
    de condutor e empresa (12/min).
- Explicar que os limites por recurso são fixos (não multiplicam pela faixa), contam
  por `api-key` e valem junto do limite do grupo; exceder qualquer um retorna `429`;
  os headers refletem o mais restritivo.

**Fora:**

- Qualquer menção ao digest ou resumo por e-mail de rate limit.
- Qualquer menção a como a faixa é atribuída, alterada ou negociada.
- Regras por `int-key`, `app-key`, sessão de app ou site.
- Notificações de condutor (`/notificacoes/condutor/*`): não têm regra por ativo.
- Endpoints v1 de notificação na página de Entregas: constam na OpenAPI mas não têm
  página, então seguem fora da tabela, como já estavam.
- Qualquer outra seção das introduções.

## Critérios de Sucesso

1. Nenhuma das 4 seções "Rate limit" contém a palavra "fator".
2. Toda linha da tabela de grupos tem o limite igual ao `count` de `action: block` da
   regra `api-key` correspondente no yml da `main` do mchapigw.
3. Toda linha da tabela de recursos tem o limite igual ao `count` de `action: block`
   da regra `by_asset` correspondente, e só lista paths documentados na página.
4. Nenhuma das 4 páginas menciona digest, e-mail de rate limit, negociação ou
   alteração de faixa.
5. O restante de cada página (fora da seção "Rate limit") não muda.

## Decisões Resolvidas

1. **Nome do multiplicador** → "faixa", que é o termo do gateway. O texto só diz o
   que ela é (multiplicador inteiro por central, padrão 1).
2. **Onde ficam os limites por recurso** → subseção própria com tabela, no lugar da
   antiga "Limite por solicitação". O texto de identificação da solicitação na v1 é
   mantido.
3. **Notificações em lote** → o conjunto de passageiros do body é um recurso único;
   lotes acima de 100 passageiros contam só no limite do grupo. Documentado em uma
   frase.
4. **Referência cruzada na linha Crítico da v1** → removida; a subseção de recursos
   lista os paths.

## Perguntas em Aberto

- Nenhuma.

## Histórico de decisões

- 2026-09-22 — Spec criada a partir do diff do `ratelimit-rules.yml` entre a última
  sincronização da docs (2026-09-15) e a `main` do mchapigw.
