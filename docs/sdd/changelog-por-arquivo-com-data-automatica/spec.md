# Spec: Changelog da v2 em um arquivo por entrada, com data aplicada no merge

> Para quem mantém o `mintlify-docs` e a automação que documenta a API V2:
> como o changelog passa a ser organizado e como as datas de publicação são gravadas
> sem que ninguém precise conhecê-las ao escrever.

## Objetivo

**O que estamos construindo.** O changelog da v2 (Corridas e Entregas) deixa de ser um
arquivo único e vira uma pasta com um arquivo por entrada. Quem escreve não coloca data:
usa um marcador. No merge na `main`, uma GitHub Action troca o marcador pela data do dia,
tanto na entrada (nome `xxxxxxxx_<slug>.mdx` → `20261016_<slug>.mdx` e `date="xxxxxxxx"` →
`date="16 out 2026"`) quanto na tag
`Novo` das páginas novas (`tag: 'xxxx-xx-xx'` → `tag: '2026-10-16'`).

**Por que.**
- O `mintlify-docs` passa a ser mergeado só depois do deploy de todos os outros serviços.
  O dia do merge é, portanto, o dia em que a entrega está em produção, mas ninguém sabe
  esse dia quando escreve a doc.
- `pages/v2/changelog.mdx` tem 1.775 linhas e 43 entradas, e 11 pessoas já o editaram.
  PRs paralelas entram em conflito, e cada entrada precisa ser encaixada à mão na ordem
  cronológica.
- A automação de documentação abre a PR de doc quando a entrega fica pronta, antes do
  deploy. Ela precisa de um jeito de escrever a entrada sem saber a data.

**O changelog não anda sozinho.** A entrada do changelog é a última peça da documentação de
uma entrega. A mesma PR precisa trazer a documentação do endpoint: o OpenAPI com
parâmetros, corpo e exemplos de sucesso e de cada erro, a página `.mdx` e a entrada no
`docs.json` quando o endpoint é novo. Quem gera essa parte é a skill `documentar-no-mintlify`,
pelo dev ou pela automação de documentação. Esta spec muda só a forma do changelog e da data, e não
reduz o que a PR de doc precisa conter.

**Quem usa.** Os devs e a automação de documentação, que escrevem as entradas. Os integradores, que
leem a página.

**Sucesso se.** Uma PR com `xxxxxxxx_<slug>.mdx` e uma página com `tag: 'xxxx-xx-xx'` é
mergeada. Minutos depois a `main` tem `AAAAMMDD_<slug>.mdx` e `tag: 'AAAA-MM-DD'` com a data
do dia, a entrada aparece no topo do changelog e a página exibe a pill `Novo`. Ninguém
digitou a data.

## Stack de Referência

| Camada | Tecnologias |
|--------|-------------|
| Docs | Mintlify (MDX, `docs.json`, snippets com props e componentes `.jsx` em `snippets/`), `custom.js` e `custom.css` da tag `Novo` |
| Automação no repo | GitHub Actions (o repositório ainda não tem `.github/`), script Node sem dependências |
| Agente | Skill `documentar-no-mintlify` e referência `changelog-mintlify.md` do plugin `gaudium-sdd-artifacts` |

## Escopo

**Dentro:**
- Os componentes `Entry`, `ChangeSection`, `ParamBadge` e `EndpointBadge`, hoje idênticos
  nos dois changelogs, saem do topo dos arquivos e vão para `snippets/changelog/componentes.jsx`.
- Uma pasta por modalidade, `snippets/changelog/corridas/` e `snippets/changelog/entregas/`,
  com um arquivo `AAAAMMDD_<slug>.mdx` por entrada. Cada arquivo importa os componentes e
  traz a data exibida em `date="DD mmm AAAA"`, igual à do nome.
- Um script que gera os imports e a lista de entradas de `pages/v2/changelog.mdx` e de
  `pages/v2/changelog-entregas.mdx`, em ordem decrescente de nome. O cabeçalho da página
  continua editável, fora do trecho gerado. Uma opção do script inclui as entradas
  pendentes, para a prévia local.
- A migração de todas as entradas atuais (48 de Corridas e 30 de Entregas em 2026-10-23), com o nome derivado
  da data e do `id` do `<h2>`.
- Uma GitHub Action no `push` na `main` que:
  - renomeia cada `xxxxxxxx_` para a data do dia e troca o `date="xxxxxxxx"` do arquivo
    pela mesma data, no formato `DD mmm AAAA`;
  - troca cada `tag: 'xxxx-xx-xx'` do frontmatter em `pages/` pela data do dia;
  - regenera as páginas;
  - faz o commit.
- Uma checagem em `pull_request` que falha se o trecho gerado das páginas estiver diferente
  do que o script produziria.
- `custom.css` esconde a pill de qualquer tag que comece com `xxxx`, assim como já esconde
  as que começam com `20`.
- A skill local `.claude/skills/changelog` sai do repositório. As regras da entrada passam
  para `references/changelog-mintlify.md` do `sdd-artifacts`, com a regra atual: sem mudança
  em `openapi-corridas.json` ou `openapi-entregas.json`, não há entrada.
- No repositório `sdd-artifacts`, a skill `documentar-no-mintlify` e a referência
  `references/documentacao-mintlify.md` passam a seguir o padrão novo. A página nova nasce com
  `tag: 'xxxx-xx-xx'`, a entrada é criada sem perguntar a data, e o changelog é descrito como
  um arquivo por entrada. A automação de documentação usa essa skill.

**Fora:**
- A troca de `tag: 'Em breve'` por data. Ela continua manual, para páginas publicadas antes
  da entrega de propósito.
- O changelog da v1, que não existe.
- O aviso de falha da Action fora do GitHub. Na v1, a falha fica no GitHub, que notifica quem
  fez o merge.
- A automação de documentação, que tem planejamento próprio.

## Project Structure

```
snippets/changelog/
  componentes.jsx                          # Entry, ChangeSection, ParamBadge, EndpointBadge
  corridas/20261022_codigos-de-erro.mdx    # entrada publicada
  corridas/xxxxxxxx_consulta-cliente.mdx   # entrada pendente, só até o merge na main
  entregas/...
pages/v2/changelog.mdx                     # cabeçalho manual e trecho gerado entre marcadores
pages/v2/changelog-entregas.mdx            # idem
scripts/changelog/gerar-indice.mjs         # gera o trecho e é usado pela Action e pelo dev
.github/workflows/changelog-data.yml       # push na main (datas) e pull_request (checagem)
custom.css                                 # esconde a pill de tag 'xxxx-xx-xx'
```

## Implantação

| Unidade | Se for a única que falta |
|---------|--------------------------|
| PR no `mintlify-docs` (snippets, migração, script, Action, CSS, skill) | Nada muda, e o changelog continua no arquivo único |
| Secret do GitHub App no repositório | A Action falha no commit, e a entrada `xxxxxxxx_` fica fora da página. A tag `xxxx-xx-xx` fica escondida, e a falha aparece no Actions |
| Automação de documentação no padrão novo | Ela ainda não existe em produção, então nada quebra |
| PR no `sdd-artifacts` (skill `documentar-no-mintlify` e referência) | Quem documenta com a skill recebe a pergunta da data e a orientação do arquivo único. A checagem de PR do `mintlify-docs` barra a edição do índice, e a revisão corrige o resto |

Ordem de deploy: nenhuma. O secret precisa existir antes do primeiro merge de uma entrada no
padrão novo para que ela apareça.

## Boundaries

### Sempre fazer
- Entregar a entrada do changelog na mesma PR da documentação do endpoint: OpenAPI com
  exemplos de sucesso e de erro, página e `docs.json` quando o endpoint é novo.
- Criar a entrada nova como `xxxxxxxx_<slug>.mdx`, com o slug em kebab-case igual ao `id` do `<h2>`.
- Criar a página nova de funcionalidade que entra junto com o merge com `tag: 'xxxx-xx-xx'`.
- Calcular a data no fuso `America/Sao_Paulo`.
- Deixar a Action idempotente: um push sem marcador termina sem commit.
- Rodar `mint validate` e `mint broken-links` depois da migração.

### Perguntar primeiro
- Dar à Action permissão para passar pela proteção da `main`, pela lista de bypass ou por um token novo.
- Mudar o formato do nome (`AAAAMMDD_<slug>`), porque a ordenação depende dele.
- Mergear o `mintlify-docs` antes do fim do deploy dos outros serviços: a data sairia errada.

### Nunca fazer
- Abrir uma PR de doc só com a entrada do changelog, sem a documentação do endpoint que ela anuncia.
- Escrever a data à mão no nome de uma entrada nova ou na tag de uma página nova.
- Editar à mão o trecho gerado de `changelog.mdx` ou de `changelog-entregas.mdx`.
- Fazer a Action alterar um arquivo já datado ou sobrescrever um nome que já existe: nesse
  caso ela falha.
- Fazer push forçado ou reescrever o histórico da `main`.

## Critérios de Sucesso

1. `snippets/changelog/corridas/` tem 48 arquivos e `snippets/changelog/entregas/` tem 30,
   todos `AAAAMMDD_<slug>.mdx`.
2. Cada página renderiza o mesmo conjunto de `id` dos `<h2>` de antes da migração, com as
   datas em ordem decrescente. A ordem entre entradas do mesmo dia pode mudar.
3. Depois do merge de uma PR com `xxxxxxxx_teste.mdx`, a `main` não tem nenhum `xxxxxxxx_`
   e tem `<data do dia>_teste.mdx`, importado no trecho gerado.
4. Depois do merge de uma PR com uma página com `tag: 'xxxx-xx-xx'`, a página tem
   `tag: '<data do dia>'` e exibe a pill `Novo`.
5. Um push na `main` sem marcador termina a Action sem commit.
6. Duas PRs abertas ao mesmo tempo, cada uma com uma entrada nova, são mergeadas em
   sequência sem conflito.
7. Uma PR que altera à mão o trecho gerado falha na checagem de `pull_request`.
8. Um merge às 23h30 no horário de Brasília recebe a data daquele dia, e não a do dia seguinte.
9. O passo 8 da `documentar-no-mintlify` cria `xxxxxxxx_<slug>.mdx` na pasta da modalidade, e não edita `changelog.mdx`.
10. Numa branch sem mudança nos arquivos OpenAPI, o passo 8 não cria entrada.
11. No `sdd-artifacts`, `grep -n "Com que \*\*data\*\*" skills/documentar-no-mintlify/SKILL.md`
    não retorna nada, e a referência `documentacao-mintlify.md` descreve
    `snippets/changelog/<modalidade>/` e o marcador `tag: 'xxxx-xx-xx'`.

## Decisões Resolvidas

1. **A data é a do merge na `main`** → o `mintlify-docs` só é mergeado depois do deploy de
   todos os outros serviços, então o merge marca a entrada em produção. A automação de
   documentação não precisa de sinal de fim do deploy.
2. **O marcador da entrada fica no nome e no `date` do arquivo** → o Mintlify não injeta props
   num snippet que tem `import`, e sem `import` o snippet não enxerga o `Entry` (spike da
   T1.0). A Action troca os dois na mesma passada, e a checagem de PR cobre a divergência.
3. **A página nova nasce com `tag: 'xxxx-xx-xx'`, e não com `'Em breve'`** → ela só é
   publicada depois do deploy, então já entra como `Novo`, com a data do merge.
4. **O índice é gerado, não escrito à mão** → o Mintlify não importa uma pasta inteira, e
   um índice manual traria o conflito de volta.
5. **A entrada pendente fica fora da página publicada** → o integrador nunca vê o marcador.
   A tag `xxxx-xx-xx` fica escondida pelo CSS no intervalo entre o merge e o commit da Action.
6. **Commit direto na `main` com o token de um GitHub App** → o commit feito com
   `GITHUB_TOKEN` não dispara outro workflow, e uma PR extra exigiria outra revisão só para
   trocar a data.
7. **Todas as entradas migram de uma vez** → duas estruturas convivendo exigiriam duas regras
   de ordenação.
8. **A entrada do changelog depende do OpenAPI** → a entrada parte do diff do OpenAPI,
   então não existe entrada sem a documentação do endpoint por trás.
9. **No mesmo dia, sem sufixo de sequência** → a ordem desempata pelo slug. A ordem dentro
   do dia não importa para o integrador.

## Perguntas em Aberto

1. **A `main` do `mintlify-docs` tem proteção, e qual GitHub App pode passar por ela?**
   Decidir com quem administra a organização no GitHub antes do `/construir` da Action. A
   Action precisa da chave do App como secret, guardada num Environment restrito à `main`.
   Risco: sem bypass, a Action não grava e as entradas ficam invisíveis.

## Histórico de decisões

- **2026-10-16, T1.0** — Spike no `mint dev`: snippet com `import` de `componentes.jsx`
  renderiza o `Entry`, mas não recebe props (`{data}` dá `ReferenceError`, `props.data` vem
  vazio). Snippet sem `import` recebe `{data}`, mas não enxerga o `Entry` importado pela
  página. Vale a alternativa: data literal no arquivo, com o marcador `date="xxxxxxxx"`.
- **2026-10-16, T1.2** — A migração de Corridas reordena 17 entradas dentro do mesmo dia,
  porque o desempate é pelo slug. Decidido com o usuário que a ordem anterior dentro do dia
  não precisa ser preservada. O critério 2 passa a exigir o mesmo conjunto de entradas com
  as datas em ordem decrescente.
- **2026-10-16, T2.5** — A atualização da `documentar-no-mintlify` e da referência
  `documentacao-mintlify.md` no `sdd-artifacts` sai de "Fora" e entra no escopo como T2.5,
  por decisão do usuário. A automação de documentação depende dessa skill.
- **2026-10-23, PRs** — A entrega foi dividida em duas PRs a partir da `main` atual. A
  primeira traz o changelog por arquivo (componentes, gerador com o modo `--datas`, migração,
  CSS e remoção da skill local `/changelog`), e a segunda só a GitHub Action. Até a segunda entrar, a data é
  aplicada à mão com `node scripts/changelog/gerar-indice.mjs --datas`. A migração foi refeita
  sobre a `main` de 2026-10-23, que tinha 48 entradas em Corridas e 30 em Entregas, e os
  componentes vieram dela, já com os `className` do CSS responsivo.
- **2026-10-23, skill de changelog** — Por decisão do usuário, a skill local `changelog` sai do
  `mintlify-docs`, e as regras dela passam para `references/changelog-mintlify.md` do
  `sdd-artifacts`, lida no passo 8 da `documentar-no-mintlify`. Com isso fica uma fonte só,
  sem a skill local vencendo a do plugin pela regra de precedência.
