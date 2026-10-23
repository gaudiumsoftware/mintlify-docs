# Lista de Tarefas — Changelog por arquivo com data aplicada no merge

> Cada tarefa tem **Acceptance**, o que precisa ser verdade quando ela terminar, e
> **Verify**, como confirmar. Os arquivos listados em cada tarefa são os que serão criados
> ou alterados. Marque `- [x]` ao concluir.
>
> Referências: [plan.md](plan.md) para as fases e os checkpoints, e [spec.md](spec.md) para
> o quadro geral.

## Convenções

- `T<fase>.<slice>` na numeração.
- Os critérios globais de [plan.md](plan.md) § Princípio de Fatiamento valem para todas as
  tarefas.

---

## FASE 1 — Changelog por arquivo

### T1.0 — Spike de snippets com props e componentes importados
- [x] Criar `snippets/changelog/componentes.jsx` só com `Entry`, copiado do topo de `pages/v2/changelog.mdx`.
- [x] Criar uma entrada piloto em `snippets/changelog/corridas/` que importa `Entry` e usa a data recebida por prop.
- [x] Importar a entrada piloto numa página de rascunho, passando a data.
- **Acceptance**: a página de rascunho mostra a entrada com a data passada por prop e o
  visual do `Entry` atual, ou o spike registra que um dos dois não funciona e que vale a
  alternativa `date="xxxxxxxx"`.
- **Verify**: abrir a página de rascunho em `localhost:3000` e confirmar que a data e a
  timeline aparecem. Depois, remover a página de rascunho.
- **Files**: 3, sendo 1 deles temporário.
- **Notas**: a prop não funciona. Num snippet com `import`, `{data}` dá `ReferenceError` e
  `props.data` vem vazio. Sem `import`, `{data}` funciona, mas o `Entry` não existe no snippet.
  Vale a alternativa da spec: o arquivo importa os componentes e traz `date="DD mmm AAAA"`
  literal, que renderiza a data, a tag e a timeline. Ficam `componentes.jsx` (só `Entry`) e a
  entrada piloto `20261020_criar-dinamica-area.mdx` (só título e descrição), que a T1.2 refaz
  por completo.

### T1.1 — Componentes compartilhados e gerador do índice
- [x] Completar `componentes.jsx` com `ChangeSection`, `ParamBadge` e `EndpointBadge`.
- [x] Criar `scripts/changelog/gerar-indice.mjs`, que lê as pastas por modalidade e escreve os imports e a lista entre marcadores na página da modalidade, em ordem decrescente de nome.
- [x] Ignorar os arquivos `xxxxxxxx_`, exceto com a opção de prévia local.
- [x] Criar os testes em `scripts/changelog/gerar-indice.test.mjs`: ordem, nome do mesmo dia, pendente ignorado, pendente incluído na prévia e idempotência.
- **Acceptance**: o script gera o trecho de uma pasta de fixture na ordem certa. Rodar o
  script duas vezes não gera diff, e um arquivo pendente só aparece com a opção de prévia.
- **Verify**: `node --test 'scripts/changelog/*.test.mjs'` passa sem falha.
- **Files**: 3.
- **Notas**: os marcadores na página são `{/* changelog:imports:inicio */}`/`fim` (no topo, para os imports) e `{/* changelog:entradas:inicio */}`/`fim` (dentro do `<div>`, para a lista). Sem os marcadores o script falha, então ele só roda nas páginas depois da T1.2. O nome do import é `Entrada<AAAAMMDD><SlugEmPascalCase>`, e a pendente vira `EntradaPendente<Slug>`.

### T1.2 — Migração das entradas de Corridas
- [x] Salvar a sequência de `id` dos `<h2>` de `pages/v2/changelog.mdx` antes da migração.
- [x] Mover cada `<Entry>` para `snippets/changelog/corridas/AAAAMMDD_<id-do-h2>.mdx`, com a data convertida a partir do `date="DD mmm AAAA"`.
- [x] Trocar o topo da página pelos imports de `componentes.jsx`, manter o cabeçalho e gerar o trecho com o script.
- **Acceptance**: a pasta tem 43 arquivos, e a página tem o mesmo conjunto de `id` dos `<h2>`
  de antes, com as datas em ordem decrescente.
- **Verify**: `ls snippets/changelog/corridas | wc -l` retorna 43. A comparação dos conjuntos
  de `id` antes e depois, ordenados, não mostra diferença. `mint validate` passa.
- **Files**: 44 arquivos gerados mecanicamente (43 entradas e a página). A tarefa é uma só
  operação, não 44 edições.
- **Notas**: a ordem dentro do mesmo dia segue o slug em ordem decrescente, e a ordem
  anterior não precisa ser preservada (decidido com o usuário). A migração mudou 17 posições
  dentro do mesmo dia, sem mudar o conteúdo nem a ordem entre dias. O script passou a pular a
  modalidade sem pasta, porque Entregas só é migrada na T1.3. `mint broken-links` mostra
  links para `spec.md` e `plan.md` nos arquivos de `docs/sdd/` e `/writing-content/embed`, que
  já existiam e não vêm do changelog.

### T1.3 — Migração das entradas de Entregas
- [x] Repetir T1.2 em `pages/v2/changelog-entregas.mdx` e `snippets/changelog/entregas/`.
- **Acceptance**: a pasta tem 26 arquivos, e a página tem o mesmo conjunto de `id` dos `<h2>`
  de antes, com as datas em ordem decrescente.
- **Verify**: `ls snippets/changelog/entregas | wc -l` retorna 26. A comparação dos conjuntos
  de `id`, ordenados, não mostra diferença. `mint validate` passa.
- **Files**: 27 arquivos gerados mecanicamente.
- **Notas**: 11 posições mudaram dentro do mesmo dia. O conteúdo das 26 entradas e os 44 badges são os mesmos de antes.

### 🏁 CHECKPOINT CP1 — Changelog por arquivo idêntico ao atual
Rodar antes de começar a FASE 2:
- [x] As pastas têm 43 e 26 arquivos.
- [x] O conjunto de `id` dos `<h2>` das duas páginas é igual ao da `main`, com as datas em ordem decrescente.
- [x] As duas páginas abrem em `localhost:3000` com o visual de antes, nos temas claro e escuro.
- [x] `mint validate` e `mint broken-links` passam.
- [x] `node scripts/changelog/gerar-indice.mjs && git diff --exit-code pages/v2/` não gera diff.

Nota do CP1: o `mint broken-links` mostra 8 links, nenhum no changelog. São os links relativos `spec.md` e `plan.md` das pastas `docs/sdd/` e o `/writing-content/embed` de `essentials/images.mdx`, que já existiam. As páginas foram vistas no `mint dev` do worktree, na porta 3333.

---

## FASE 2 — Data automática no merge

### T2.0 — Modo de datas no script
- [x] Acrescentar ao script um modo que renomeia cada `snippets/changelog/*/xxxxxxxx_<slug>.mdx` para `AAAAMMDD_<slug>.mdx` e troca o `date="xxxxxxxx"` do arquivo por `date="DD mmm AAAA"`.
- [x] No mesmo modo, trocar `tag: 'xxxx-xx-xx'` por `tag: 'AAAA-MM-DD'` nos `.mdx` de `pages/`.
- [x] Calcular a data em `America/Sao_Paulo`, com a data injetável por variável de ambiente para teste.
- [x] Fazer o modo falhar com código diferente de zero se o nome de destino já existir.
- [x] Acrescentar os testes: renomeação, tag, nada a fazer, colisão e 23h30 em Brasília (02h30 UTC do dia seguinte).
- **Acceptance**: com a data injetada, o modo renomeia, troca a tag, não faz nada quando não
  há marcador e falha na colisão. Às 02h30 UTC, ele usa a data do dia anterior.
- **Verify**: `node --test 'scripts/changelog/*.test.mjs'` passa sem falha.
- **Files**: 2.
- **Notas**: o modo roda com `node scripts/changelog/gerar-indice.mjs --datas` e regenera as páginas na mesma execução. A data injetada vem de `CHANGELOG_DATA=AAAA-MM-DD`, a exibida segue o padrão `16 out 2026`, sem zero à esquerda, e a tag aceita aspas simples ou duplas. A colisão é checada antes de qualquer renomeação e sai com código 1. Também foi testado no repositório real, com reversão.

### T2.1 — Action no push na `main` ⚠ verify no fork pendente
- [x] Criar `.github/workflows/changelog-data.yml` com um job em `push` na `main` que roda o modo de datas e o índice.
- [x] Fazer o commit e o push só quando houver diff, com o token gerado do GitHub App pelos secrets.
- [x] Usar a mensagem de commit em PT-BR: `docs(changelog): aplica a data de publicação AAAA-MM-DD`.
- **Acceptance**: num fork, o merge de uma PR com `xxxxxxxx_teste.mdx` gera um commit da
  Action com o arquivo datado e importado. Um push sem marcador termina verde sem commit.
- **Verify**: no fork, `gh run list --workflow changelog-data.yml` mostra os dois runs verdes,
  e `git log -1 --format=%s origin/main` mostra o commit da Action só no primeiro.
- **Files**: 1.
- **Notas**: depende da pergunta em aberto 2 da spec para a ativação no repositório real.
  Os secrets esperados são `CHANGELOG_APP_ID` e `CHANGELOG_APP_PRIVATE_KEY`, e o commit sai em
  nome de `<app-slug>[bot]`. A data é calculada uma vez, em `America/Sao_Paulo`, e vai para o
  script por `CHANGELOG_DATA` e para a mensagem do commit. Antes do push, o workflow faz
  `git pull --rebase`, para o caso de a `main` ter andado. O `actionlint` passa. Os passos de
  shell foram simulados num clone com remoto local: sem marcador não há commit, com marcador
  sai um commit datado, e o run seguinte não faz nada. Falta rodar no fork para fechar o Verify.

### T2.2 — Checagem do índice em pull request ⚠ verify no fork pendente
- [x] Acrescentar ao workflow um job em `pull_request` que roda o índice sem prévia e falha se `pages/v2/changelog*.mdx` mudar.
- **Acceptance**: uma PR que só cria `xxxxxxxx_<slug>.mdx` passa. Uma PR que edita à mão o
  trecho gerado falha.
- **Verify**: abrir as duas PRs no fork e conferir o resultado do job com `gh pr checks`.
- **Files**: 1.
- **Notas**: o job `checar-indice` roda só em `pull_request`, e o `aplicar-datas` roda só em
  `push`. O `concurrency` saiu do nível do workflow e foi para o job de push, para um PR não
  cancelar o outro na fila. Simulado num clone, com o PR commitado: passam a PR só com a
  entrada pendente e a PR que mexe só no cabeçalho. Falham a edição à mão do trecho gerado,
  o índice da prévia commitado e a entrada datada sem regenerar. O `actionlint` passa.

### T2.3 — Esconder a pill do marcador
- [x] Acrescentar ao `custom.css` a regra que esconde as tags que começam com `xxxx`, ao lado da regra das tags que começam com `20`.
- **Acceptance**: uma página com `tag: 'xxxx-xx-xx'` não mostra pill na navegação.
- **Verify**: aplicar a tag numa página em `localhost:3000` e confirmar que a navegação não
  mostra a pill. Depois, reverter a página.
- **Files**: 1.
- **Notas**: o `custom.js` ignora `xxxx-xx-xx`, que não passa em `FORMATO_DATA`, então a regra de CSS esconde a pill sempre. A verificação foi feita no `mint dev`, na porta 3333, com `get-extrato.mdx` temporariamente com o marcador: a pill fica escondida, nenhum `xxxx` aparece na página e as pills `Novo` e `Em breve` continuam visíveis.

### T2.4 — Skill `/changelog` no padrão novo
- [x] Reescrever `.claude/skills/changelog/SKILL.md`: criar `snippets/changelog/<modalidade>/xxxxxxxx_<slug>.mdx` com `date="xxxxxxxx"`, sem perguntar a data e sem editar a página.
- [x] Documentar na skill a opção de prévia local do script.
- [x] Manter a regra de que, sem mudança em `openapi-corridas.json` ou `openapi-entregas.json`, a skill não cria entrada, e lembrar na skill que a PR precisa trazer a documentação do endpoint com os exemplos de sucesso e de erro.
- **Acceptance**: `/changelog` numa branch com mudança em `openapi-corridas.json` cria um único
  arquivo `xxxxxxxx_<slug>.mdx` em `snippets/changelog/corridas/` e não altera `pages/v2/changelog.mdx`.
- **Verify**: rodar `/changelog` numa branch de teste. Em seguida,
  `git status --short` mostra só o arquivo novo, e `git diff --exit-code pages/v2/changelog.mdx` passa. Numa branch sem mudança no OpenAPI, `/changelog` encerra sem criar arquivo.
- **Files**: 1.
- **Notas**: a skill foi reescrita nas partes de arquivos, data (etapa 5, marcador), escrita
  (etapa 8, import dos componentes) e criação do arquivo (etapa 9, sem editar a página, com a
  prévia por `--previa`). Também ganharam o padrão novo a tabela de modalidade, as regras de
  qualidade e o exemplo. Ficaram como estavam a detecção do diff, o mapeamento para `docs.json`,
  as categorias e os rótulos. O Verify rodou num clone, seguindo a skill. Sem mudança no OpenAPI,
  o diff fica vazio e a skill encerra. Com um parâmetro novo em `/financeiro/extrato`, que é
  compartilhado, saíram dois `xxxxxxxx_filtro-tipo-movimento-extrato.mdx` e as páginas não
  mudaram. A prévia mostrou as duas entradas, e o `--datas` aplicou `16 out 2026`.

### T2.5 — `documentar-no-mintlify` e referência no `sdd-artifacts`
- [x] Em `skills/documentar-no-mintlify/SKILL.md`, bloco C: trocar a pergunta da data do changelog pela regra do marcador. A entrada nasce `xxxxxxxx_<slug>.mdx` com `date="xxxxxxxx"`, e a data é aplicada no merge na `main`.
- [x] No mesmo arquivo, passo de tag: a página nova que entra junto com o merge nasce com `tag: 'xxxx-xx-xx'`, e `'Em breve'` fica para a página publicada antes da entrega de propósito.
- [x] No mesmo arquivo, passo 8: invocar a skill local `changelog` sem responder data. Ajustar a red flag "data assumida em vez de perguntada" e a racionalização que cita a data.
- [x] Em `references/documentacao-mintlify.md`: tabela de arquivos (changelog em `snippets/changelog/<modalidade>/` e páginas geradas), § Changelog (componentes em `snippets/changelog/componentes.jsx`, um arquivo por entrada, índice gerado por `scripts/changelog/gerar-indice.mjs`, prévia com `--previa`) e ciclo de vida da tag (marcador `xxxx-xx-xx` trocado pela Action).
- [x] Manter a exigência de documentar o endpoint completo (OpenAPI com exemplos de sucesso e de erro, página, `docs.json`) junto com a entrada.
- **Acceptance**: no `sdd-artifacts`, a skill não pergunta mais a data do changelog, e a
  referência descreve o changelog por arquivo e os dois marcadores. Nenhum outro arquivo do
  plugin cita o formato antigo.
- **Verify**: no `sdd-artifacts`,
  `grep -rn "Com que \*\*data\*\*\|no topo os componentes" skills/documentar-no-mintlify references/documentacao-mintlify.md`
  não retorna nada, e `grep -n "xxxx-xx-xx" references/documentacao-mintlify.md skills/documentar-no-mintlify/SKILL.md`
  retorna ao menos uma linha em cada arquivo. A verificação do próprio repo, `bash skills/estilo-de-saida/references/detector-de-saida.sh`, passa.
- **Files**: 2, em outro repositório (`sdd-artifacts`), numa branch e PR próprias.
- **Notas**: depende da T2.4, porque a skill local é quem cria a entrada. O PR no
  `sdd-artifacts` segue o fluxo daquele repositório. O trabalho está na branch
  `docs/documentar-no-mintlify-changelog-por-arquivo`.
  Além dos dois arquivos, entrou uma entrada em `CHANGELOG.md` > `[Unreleased]`, que a skill
  `fluxo-git-e-versionamento` exige naquele repositório. Os dois PRs podem ser mergeados em
  qualquer ordem: a skill e a referência mandam seguir a skill local `changelog` quando o
  clone ainda não tem `snippets/changelog/`. O detector rodou com `--incluir-md`, porque sem
  essa opção ele pula `.md`, e saiu limpo.

### 🏁 CHECKPOINT CP2 — Data aplicada sozinha no merge
Rodar num fork ou numa branch de teste com o workflow apontado para ela:
- [ ] O merge de uma PR com `xxxxxxxx_teste.mdx` deixa `<data>_teste.mdx` importado e nenhum `xxxxxxxx_`.
- [ ] O merge de uma PR com uma página com `tag: 'xxxx-xx-xx'` deixa `tag: '<data>'`.
- [ ] Um push sem marcador termina a Action sem commit.
- [ ] Duas PRs paralelas com entradas novas são mergeadas em sequência sem conflito.
- [ ] Uma PR que altera à mão o trecho gerado falha na checagem.
- [x] O teste das 23h30 em Brasília passa em `node --test`.
- [x] `/changelog` cria o arquivo pendente e não edita `changelog.mdx`.
- [x] `/changelog` numa branch sem mudança no OpenAPI não cria entrada.
- [x] No `sdd-artifacts`, a `documentar-no-mintlify` não pergunta a data e a referência descreve o changelog por arquivo (T2.5).

Nota do CP2 (2026-10-16): os quatro itens marcados foram verificados localmente. Os cinco
primeiros dependem da Action rodando no GitHub e ficam abertos até o teste no fork, com os
secrets `CHANGELOG_APP_ID` e `CHANGELOG_APP_PRIVATE_KEY`. Todos já foram simulados num clone
com remoto local: o commit datado no merge (T2.1), o push sem marcador sem commit (T2.1), a
checagem de PR em 5 cenários (T2.2) e as duas PRs paralelas mergeadas em sequência, sem
conflito, com `20261016_alfa` e `20261017_beta` importadas. A troca da tag na página foi
testada no repositório real na T2.0.

---

Nota de 2026-10-23: a migração (T1.2 e T1.3) foi refeita sobre a `main` atual para abrir as
PRs. Ficaram 48 entradas em Corridas e 30 em Entregas, com o mesmo conjunto de `id`, as datas
em ordem decrescente e o conteúdo idêntico ao da `main`.

Nota de 2026-10-23, skill de changelog: a T2.4 foi substituída. A skill local
`.claude/skills/changelog` saiu do repositório, e as regras dela foram para
`references/changelog-mintlify.md` do `sdd-artifacts`, lidas no passo 8 da
`documentar-no-mintlify`. A decisão foi do usuário.

## Resumo — O que ainda está em aberto

- **O spike de snippets** — resolvido em T1.0: vale a alternativa `date="xxxxxxxx"` no arquivo.
- **O plan.md ainda lista a atualização do `sdd-artifacts` em "Pode Pular"** — ela entrou no
  escopo como T2.5, por decisão do usuário. O `plan.md` não foi editado, porque é resultado do `/planejar`.
- **A proteção da `main` e o GitHub App da Action** (pergunta em aberto 2 da spec) —
  decidir antes de ativar T2.1 no repositório real. Os secrets precisam existir antes do
  primeiro merge com marcador.
