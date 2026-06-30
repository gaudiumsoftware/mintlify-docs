---
name: changelog
description: "Gera uma entrada de changelog em pages/v2/changelog.mdx (Corridas) e/ou pages/v2/changelog-entregas.mdx (Entregas) a partir das mudanças de uma PR ou branch. Analisa o diff do openapi.json, extrai endpoints afetados, determina a modalidade (Corridas, Entregas ou ambas), categoriza as mudanças e insere a entrada diretamente no(s) arquivo(s) correto(s) respeitando a ordem cronológica."
---

# /changelog

Gera automaticamente uma entrada no changelog da documentação Mintlify com base nas mudanças de uma PR ou branch.

## Arquivos de changelog

| Arquivo                                  | Modalidade |
|------------------------------------------|------------|
| `pages/v2/changelog.mdx`                 | Corridas   |
| `pages/v2/changelog-entregas.mdx`        | Entregas   |

Cada arquivo define seus próprios componentes (`Entry`, `ChangeSection`, `ParamBadge`, `EndpointBadge`) no topo via `export const`. As entradas `<Entry>` são inseridas diretamente no arquivo, dentro do `<div>` principal, em ordem cronológica decrescente.

## Uso

```
/changelog              # usa o diff da branch atual em relação a main
/changelog 18           # usa a PR #18 do repositório
/changelog main..HEAD   # usa um intervalo de commits explícito
```

## Processo (executar na ordem)

### 1 — Identificar o diff

- **Sem argumento:** `git diff main...HEAD -- pages/v2/openapi.json`
- **Número de PR:** `gh pr diff <número> -- pages/v2/openapi.json`
- **Intervalo de commits:** `git diff <intervalo> -- pages/v2/openapi.json`

Se o diff de `openapi.json` estiver vazio, avisar o usuário e encerrar:
> "Nenhuma mudança em openapi.json encontrada. Nada para incluir no changelog."

### 2 — Extrair endpoints afetados

No diff do `openapi.json`, identificar:
- **Path** de cada bloco modificado (ex: `/clientes`, `/condutores`)
- **Método HTTP** do bloco (ex: `GET`, `POST`)
- **Natureza da mudança** por campo:
  - Linha adicionada (`+`) em `parameters` → parâmetro **novo**
  - Linha modificada (`-`/`+`) em `description` existente → **alteração de descrição**
  - Linha removida (`-`) em `parameters` → parâmetro **removido**
  - Bloco de endpoint inteiro adicionado → endpoint **novo**

### 3 — Mapear endpoints para páginas de referência

Ler `docs.json` e localizar em `navigation.versions[].tabs[tab="Referência"].groups[].pages[]`
a rota que corresponde ao endpoint. Padrão de nomenclatura do projeto:

| Endpoint                          | Rota no docs.json                                          |
|-----------------------------------|------------------------------------------------------------|
| `GET /clientes`                   | `pages/v2/referencia/clientes/endpoint/get`                |
| `GET /clientes/{id}`              | `pages/v2/referencia/clientes/endpoint/get-by-id`          |
| `GET /condutores`                 | `pages/v2/referencia/condutores/endpoint/get`              |
| `GET /condutores/{id}`            | `pages/v2/referencia/condutores/endpoint/get-by-id`        |
| `POST /corridas/consultar`        | `pages/v2/referencia/corridas/endpoint/post-consultar`     |

Se não encontrar correspondência, usar `href` vazio e deixar um comentário `{/* TODO: href */}`.

### 4 — Determinar a modalidade

> ⚠️ **OBRIGATÓRIO — nunca pular esta etapa.**

Analisar os paths dos endpoints afetados e inferir a modalidade:

| Padrão no path              | Modalidade inferida |
|-----------------------------|---------------------|
| `/corridas`                 | Corridas            |
| `/entregas`                 | Entregas            |
| `/clientes`, `/condutores`  | **Ambas** — endpoints compartilhados entre as duas modalidades |
| Outro                       | Inconclusivo → perguntar ao usuário |

**Se a modalidade for inconclusiva**, perguntar:

> "Este endpoint pertence a Corridas, Entregas ou ambas as modalidades?"

**Se a modalidade for inferida com segurança**, informar ao usuário e confirmar antes de prosseguir:

> "Identifiquei que esta mudança afeta [Corridas / Entregas / Corridas e Entregas]. Confirma?"

A resposta determina em qual(is) arquivo(s) a entrada será inserida:
- **Corridas** → `pages/v2/changelog.mdx`
- **Entregas** → `pages/v2/changelog-entregas.mdx`
- **Ambas** → os dois arquivos

### 5 — Perguntar a data da atualização

> ⚠️ **OBRIGATÓRIO — nunca pular esta etapa.**

Perguntar ao usuário:

> "Qual é a data de inclusão desta atualização no changelog? (ex: 27 jun 2025)"

**Não assumir a data atual.** Não inferir a data do commit ou da PR. Aguardar a resposta do usuário antes de continuar.

A data informada será usada no campo `date` do componente `Entry`.

### 6 — Categorizar as mudanças por tipo

Agrupar os deltas em categorias para o `ChangeSection`:

| Tipo       | Critério                                                    |
|------------|-------------------------------------------------------------|
| `added`    | Parâmetros novos, endpoints novos, campos novos no response |
| `changed`  | Descrições alteradas, comportamento de parâmetro modificado |
| `fixed`    | Correção de comportamento documentado incorretamente        |
| `removed`  | Parâmetros ou endpoints removidos                           |

### 7 — Determinar label e id da entrada

- **Data:** a informada pelo usuário na etapa 5, no formato `DD mmm YYYY` em português (ex: `27 jun 2025`)
- **Label e cor:**

| Conteúdo da entrada                  | Label       | Cor          |
|--------------------------------------|-------------|--------------|
| Apenas `added`                       | `Novo`      | `#3b82f6`    |
| Apenas `changed` ou mix add+changed  | `Melhoria`  | `#16A34A`    |
| `fixed`                              | `Correção`  | `#f59e0b`    |
| `removed`                            | `Remoção`   | `#ef4444`    |

- **`id` da entrada:** slug kebab-case curto derivado do título, único no arquivo. Usado como âncora para links diretos à entrada (ex: `filtros-busca-clientes-condutores`, `link-acompanhamento-corrida`, `excluir-entrega`). Regras:
  - Minúsculas, apenas letras, números e hífens
  - Máximo ~5 palavras
  - Sem datas no slug — o slug identifica o conteúdo, não quando aconteceu
  - Informar o link gerado ao usuário ao final: `https://docs.machine.global/v2/changelog#<id>`

### 8 — Escrever a entrada MDX

Usar os componentes já definidos no topo de cada arquivo de changelog.
**Não redefinir os componentes** — eles já existem em ambos os arquivos.

Estrutura de uma entrada:

```mdx
<Entry date="DD mmm YYYY" label="Label" labelColor="#cor">
  <h2 id="slug-da-entrada" style={{ fontSize: "22px", fontWeight: "700", marginBottom: "6px", marginTop: 0 }}>
    Título descritivo da mudança
  </h2>
  <p style={{ fontSize: "15px", opacity: 0.7, marginBottom: "20px", lineHeight: "1.6" }}>
    Uma ou duas frases explicando o contexto e motivação da mudança.
  </p>

  <EndpointBadge method="MÉTODO" path="/api/v2/integracao/path" href="/pages/v2/referencia/..." />

  <ChangeSection type="added">
    <p style={{ marginBottom: "10px" }}>Novos parâmetros de query disponíveis:</p>
    <ul style={{ margin: 0, paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "8px" }}>
      <li><ParamBadge name="param" /> — Descrição do parâmetro e seu comportamento.</li>
    </ul>
  </ChangeSection>

  <ChangeSection type="changed">
    <ul style={{ margin: 0, paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "6px" }}>
      <li>O parâmetro <ParamBadge name="param" /> agora faz X ao invés de Y.</li>
    </ul>
  </ChangeSection>
</Entry>
```

Regras de escrita:
- Título em português, orientado ao desenvolvedor consumidor da API (não ao implementador)
- Bullet de parâmetro: `<ParamBadge name="X" /> — o que aceita, o que ignora, comportamento especial`
- Não repetir informações entre `added` e `changed` — cada fato aparece uma só vez
- Se houver nota de prioridade de filtros ou comportamento transversal, adicionar ao final da entry:

```mdx
  <div style={{
    marginTop: "20px",
    padding: "14px 18px",
    borderRadius: "10px",
    background: "rgba(59, 130, 246, 0.08)",
    border: "1px solid rgba(59, 130, 246, 0.2)",
    fontSize: "13px",
    lineHeight: "1.6",
  }}>
    <strong>Nota:</strong> texto da nota.
  </div>
```

### 9 — Inserir respeitando a ordenação cronológica

> ⚠️ **OBRIGATÓRIO — nunca inserir sem verificar a ordem.**

A ordem do changelog é **sempre decrescente: da entrada mais recente para a mais antiga** (topo = mais novo).

Repetir os passos abaixo para **cada arquivo** determinado na etapa 4:

1. Ler todas as `<Entry date="...">` existentes no arquivo alvo e extrair suas datas.
2. Converter cada data para um valor comparável (ano × 10000 + mês × 100 + dia). Meses em português:

   | Abrev | Nº | Abrev | Nº | Abrev | Nº |
   |-------|----|-------|----|-------|----|
   | jan   | 01 | mai   | 05 | set   | 09 |
   | fev   | 02 | jun   | 06 | out   | 10 |
   | mar   | 03 | jul   | 07 | nov   | 11 |
   | abr   | 04 | ago   | 08 | dez   | 12 |

3. Encontrar a posição correta: inserir a nova `<Entry>` **imediatamente antes** da primeira entry existente cuja data seja **anterior** à data da nova entrada.
4. Se a nova entrada for a **mais recente** de todas, inserir logo após o bloco de cabeçalho:

   ```mdx
   <div style={{ maxWidth: "860px", margin: "0 auto", padding: "40px 20px 80px" }}>

     <div style={{ marginBottom: "56px" }}>
       ...
     </div>

     {/* ← nova entry aqui */}
     <Entry date="nova data" ...>
   ```

5. Se a nova entrada for a **mais antiga** de todas, inserir após a última `<Entry>` existente e antes do fechamento do `</div>` principal.
6. Se a data for **igual** a uma entry existente, inserir logo **antes** da entry de mesma data (mesmo dia, mais recente por ordem de inserção fica primeiro).

**Nunca** inserir baseado apenas em posição de texto — sempre comparar datas numericamente.

### 10 — Confirmar com o usuário antes de salvar

Exibir a entrada gerada em markdown, indicando em qual(is) arquivo(s) será inserida, e perguntar:
> "Entrada gerada para [Corridas / Entregas / Corridas e Entregas]. Deseja aplicar ao changelog? (s/n)"

Só editar o(s) arquivo(s) após confirmação.

## Componentes disponíveis nos arquivos

Ambos os arquivos de changelog definem os mesmos componentes no topo via `export const`. Nunca redefinir.

| Componente       | Props                                | Descrição                                      |
|------------------|--------------------------------------|------------------------------------------------|
| `Entry`          | `date`, `label`, `labelColor`        | Container de uma entrada com timeline lateral  |
| `ChangeSection`  | `type` (added/changed/fixed/removed) | Bloco colorido por categoria de mudança        |
| `ParamBadge`     | `name`                               | Badge verde para nome de parâmetro             |
| `EndpointBadge`  | `method`, `path`, `href`             | Badge clicável com método HTTP e caminho       |

O `EndpointBadge` suporta os métodos: `GET` (azul), `POST` (verde), `DELETE` (vermelho), `PUT` (amarelo), `PATCH` (roxo).

## Regras de qualidade

- **Nunca redefinir componentes** que já existem nos arquivos
- **Sempre incluir `href`** no `EndpointBadge` — buscar em `docs.json` antes de deixar vazio
- **Ordem cronológica decrescente sempre** — comparar datas numericamente antes de inserir; nunca prependar cegamente no topo nem appendar no final sem verificar
- **Sem `href` em `<a>` nulo** — se `href` não foi encontrado, usar `<div>` em vez de `<a>`
- **Data sempre em português** — `jan`, `fev`, `mar`, `abr`, `mai`, `jun`, `jul`, `ago`, `set`, `out`, `nov`, `dez`
- **Modalidade sempre confirmada** — nunca assumir qual arquivo editar sem analisar os paths ou perguntar ao usuário
- **Não commitar** — a skill entrega apenas a edição no(s) arquivo(s); o commit é responsabilidade do autor

## Exemplo de invocação completa

```
/changelog 18
```

1. Executa `gh pr diff 18 -- pages/v2/openapi.json`
2. Encontra mudanças em `/clientes` (GET) e `/condutores` (GET)
3. Mapeia para `pages/v2/referencia/clientes/endpoint/get` e `pages/v2/referencia/condutores/endpoint/get`
4. Identifica paths `/clientes` e `/condutores` → endpoints compartilhados → modalidade **Ambas** → confirma com usuário
5. Pergunta a data ao usuário → resposta: `25 jun 2026`
6. Classifica: 4 parâmetros `added` em clientes, 2 em condutores; vários `changed` em descrições
7. Label: `Melhoria` (mix de added + changed)
8. Lê as datas existentes em `changelog.mdx` e `changelog-entregas.mdx` separadamente
9. Exibe a entrada gerada e informa: "será inserida em Corridas e Entregas"
10. Após confirmação, edita os dois arquivos na posição cronológica correta
