# Plano de Implementação — Changelog por arquivo com data aplicada no merge

> Referência: [spec.md](spec.md). Este plano divide a spec em fatias verticais
> executáveis, ordenadas por dependência, com checkpoints de validação entre as fases.

## Resumo Quantitativo

| Artefato | Quantidade |
|----------|-----------|
| Entradas migradas | 69 (43 de Corridas e 26 de Entregas) |
| Scripts Node | 1 (`scripts/changelog/gerar-indice.mjs`, com os modos de índice e de datas) |
| Workflows do GitHub Actions | 1 (`changelog-data.yml`, com um job no push e um no pull request) |
| Skills reescritas | 1 (`.claude/skills/changelog`) |

## Princípio de Fatiamento

**Fatias verticais.** A FASE 1 já entrega o changelog por arquivo funcionando sem
automação: o dev renomeia e roda o script à mão. A FASE 2 acrescenta a data automática
sobre uma estrutura que já foi validada. Se a FASE 2 travar na proteção da `main`, a
FASE 1 continua útil sozinha.

**Critérios de aceitação globais** (não são repetidos em cada tarefa):
- `mint validate` e `mint broken-links` rodam sem erro novo.
- O script não tem dependência de npm e roda com `node` 22.
- Os textos visíveis ao integrador estão em PT-BR, e a página não mostra nenhum `xxxx`.

## Dependências Críticas

```
T1.0 spike de snippets (props + import .jsx)
  │
  └─→ T1.1 componentes.jsx + gerar-indice.mjs
        │
        ├─→ T1.2 migração Corridas ─┐
        └─→ T1.3 migração Entregas ─┴─→ CP1
                                         │
              T2.0 modo de datas no script
                │
                ├─→ T2.1 Action no push na main
                ├─→ T2.2 checagem em pull_request
                └─→ T2.4 skill /changelog
              T2.3 custom.css (independente)
                                         └─→ CP2
```

Regras de ordem:
1. T1.0 decide o formato da entrada. Se o spike falhar, T1.1 em diante segue a alternativa
   da spec, com `date="xxxxxxxx"` dentro do arquivo.
2. T1.2 e T1.3 são paralelas.
3. T2.3 não depende de nada e pode entrar em qualquer momento.

## Implantação

| Unidade | Se for a única que falta |
|---------|--------------------------|
| PR no `mintlify-docs` com a FASE 1 | O changelog continua no arquivo único |
| PR no `mintlify-docs` com a FASE 2 | A estrutura por arquivo funciona, e o dev data a entrada à mão |
| Secret do GitHub App, com o App na lista de bypass da `main` | A Action falha no commit, e a entrada `xxxxxxxx_` e a pill `xxxx-xx-xx` ficam escondidas. A falha aparece no Actions |

Ordem de deploy: nenhuma. A ativação acontece quando a Action roda verde no primeiro merge
com marcador.

## Fases e Checkpoints

```
FASE 1 ──→ CP1: changelog por arquivo idêntico ao atual
FASE 2 ──→ CP2: data aplicada sozinha no merge
```

### FASE 1 — Changelog por arquivo

**Objetivo**: as duas páginas de changelog são montadas a partir de uma pasta com um
arquivo por entrada, e mostram as mesmas entradas na mesma ordem de hoje.

- **S0 — Spike de snippets.** Uma entrada piloto, importada pela página, recebe a data por
  prop e usa os componentes de `componentes.jsx`.
- **S1 — Componentes e índice.** `componentes.jsx` e um script que gera os imports e a lista
  entre marcadores, em ordem decrescente de nome.
- **S2 — Migração de Corridas.** 43 entradas viram arquivos.
- **S3 — Migração de Entregas.** 26 entradas viram arquivos.

**Checkpoint CP1 (validação manual)**:
- [ ] `ls snippets/changelog/corridas | wc -l` = 43 e `ls snippets/changelog/entregas | wc -l` = 26.
- [ ] A sequência de `id` dos `<h2>` de cada página é igual à da `main` antes da migração.
- [ ] As duas páginas abrem em `localhost:3000` com o mesmo visual de antes, nos temas claro e escuro.
- [ ] `mint validate` e `mint broken-links` passam.
- [ ] Rodar o script duas vezes seguidas não gera diff.

### FASE 2 — Data automática no merge

**Objetivo**: a entrada criada como `xxxxxxxx_<slug>.mdx` e a página com
`tag: 'xxxx-xx-xx'` recebem a data do dia no merge na `main`, sem intervenção.

- **S0 — Modo de datas no script.** Renomeia os `xxxxxxxx_` e troca as tags `xxxx-xx-xx`
  pela data no fuso `America/Sao_Paulo`, com data injetável para teste.
- **S1 — Action no push.** Roda o modo de datas e o índice, e commita com o token do App só
  quando há diff.
- **S2 — Checagem em pull request.** Falha se o trecho gerado diverge do script.
- **S3 — CSS do marcador.** Esconde a pill das tags que começam com `xxxx`.
- **S4 — Skill `/changelog`.** Cria `xxxxxxxx_<slug>.mdx` na pasta da modalidade.

**Checkpoint CP2 (validação manual, num fork ou numa branch de teste com o workflow apontado para ela)**:
- [ ] O merge de uma PR com `xxxxxxxx_teste.mdx` deixa `<data>_teste.mdx` importado e nenhum `xxxxxxxx_`.
- [ ] O merge de uma PR com uma página com `tag: 'xxxx-xx-xx'` deixa `tag: '<data>'`.
- [ ] Um push sem marcador termina a Action sem commit.
- [ ] Duas PRs paralelas com entradas novas são mergeadas sem conflito.
- [ ] Uma PR que altera à mão o trecho gerado falha na checagem.
- [ ] Com `TZ` simulando 23h30 em Brasília, a data é a do dia em Brasília.
- [ ] `/changelog` cria o arquivo pendente e não edita `changelog.mdx`.
- [ ] `/changelog` numa branch sem mudança no OpenAPI não cria entrada.

## Riscos e Mitigações

| Risco | Probabilidade | Mitigação |
|-------|--------------|-----------|
| Snippets do Mintlify não aceitam props ou import de `.jsx` aninhado | Média | O spike T1.0 vem primeiro. A alternativa é `date="xxxxxxxx"` no arquivo, trocado pela Action |
| A Action não passa pela proteção da `main` | Média | Validar o CP2 num fork e só ativar depois de o App estar na lista de bypass |
| A migração perde ou reordena uma entrada | Baixa | Comparar a sequência de `id` dos `<h2>` antes e depois (CP1) |
| O commit da Action dispara a si mesma em loop | Baixa | O modo de datas é idempotente: o segundo run não encontra marcador e não commita |
| A pill `xxxx-xx-xx` aparece entre o merge e o commit da Action | Baixa | O CSS de T2.3 esconde a pill |

## Pode Pular (opcional / posterior)

- O aviso de falha da Action no Discord.
- A troca automática de `tag: 'Em breve'` por data.
- O sufixo de sequência para entradas do mesmo dia.
- A atualização da skill `documentar-no-mintlify` e da referência `documentacao-mintlify.md`
  no `sdd-artifacts`, que é uma tarefa separada.

## Dependências Externas

- Node 22 e a CLI `mint`.
- Um GitHub App com escrita em conteúdo no `mintlify-docs`, com o App ID e a chave privada
  guardados como secrets do repositório.
- Um fork ou uma branch de teste para o CP2.

## Validação entre Fases

```bash
node --test scripts/changelog/
node scripts/changelog/gerar-indice.mjs && git diff --exit-code pages/v2/changelog.mdx pages/v2/changelog-entregas.mdx
mint validate
mint broken-links
```
