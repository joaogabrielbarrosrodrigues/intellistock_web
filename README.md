# IntelliStock Web — trabalho em equipe

Projeto acadêmico de Desenvolvimento de Aplicação Web baseado no IntelliStock original. A aplicação web usa HTML, CSS, JavaScript, Bootstrap, Node.js, Express e PostgreSQL.

A entrega acadêmica reúne o dashboard, os cadastros de fornecedores e produtos e o registro de entradas e saídas com histórico. O modo `mock` demonstra o dashboard com dados simulados. O modo `postgres` conecta essas telas à API e ao banco.

## 1. Escopo e integrantes

| Integrante | Responsabilidade |
| --- | --- |
| **Caio** | Script SQL de fornecedores, produtos e movimentações, relacionamentos e configuração do PostgreSQL. |
| **Guilherme Paiva** | Rotas, controllers, models e validação da API de fornecedores e produtos. |
| **Bea (Beatriz)** | Navegação, formulários e listas de fornecedores e produtos em Bootstrap. |
| **Rafa (Rafaely)** | API e tela de movimentações, histórico e atualização de saldo na transação do registro. |
| **João Gabriel** | Dashboard, `GET /api/dashboard`, integração, documentação, testes e organização da entrega ao AVA. |

No modo PostgreSQL, o login existente dá acesso aos módulos. Contas a pagar e previsão de reposição ficam fora do roteiro de apresentação.

## 2. Estrutura

```text
front_end/
  index.html                     # dashboard
  fornecedores.html              # cadastro e lista
  produtos.html                   # cadastro e lista
  movimentacoes.html              # entradas, saídas e histórico
  login.html
  css/                            # estilos compartilhados
  img/                            # identidade visual da equipe
  js/
    api.js                        # chamadas à API e sessão existente
    dashboard.js
    cadastros.js
    movimentacoes.js
    login.js
back_end/
  src/
    server.js                     # inicialização HTTP
    app.js                        # rotas REST e arquivos estáticos
    config/                       # seleção de modo e pool PostgreSQL
    routes/                       # rotas sob /api
    controllers/                  # validação e coordenação das operações
    models/                       # consultas SQL
    services/dashboard.service.js # dados simulados do dashboard
    middlewares/
    utils/
  database/
    schema.sql                    # esquema usado pela aplicação
    seed.sql                      # dados de demonstração
  db/                             # esquema inicial de Caio e entrada de compatibilidade
  scripts/setup-db.js             # criação e atualização do banco
  tests/                          # testes HTTP e do dashboard no front-end
  .env.example
  package.json
  package-lock.json
  README.md
```

O Express entrega o front-end e a API no mesmo endereço. As telas chamam `/api/…` com `fetch` por meio de `front_end/js/api.js`. No modo PostgreSQL, os controllers usam os models para consultar o banco com o pool de `back_end/src/config/db.js`. O registro de movimentações atualiza o saldo e grava o histórico na mesma transação. O dashboard apenas consulta.

## 3. Demonstração sem banco

Use Node.js 20+, npm e um navegador. O Bootstrap é carregado via CDN.

```bash
cd back_end
npm ci
npm test
npm start
```

Acesse **http://localhost:3000**. O modo padrão é `mock` quando `DASHBOARD_DATA_SOURCE` estiver ausente. Se já houver um `back_end/.env` configurado para outro modo, ajuste `DASHBOARD_DATA_SOURCE=mock` antes de iniciar. A demonstração funciona sem PostgreSQL, conta ou segredo JWT.

O painel mostra **5 produtos** e **2 alertas**. Busque por **Açaí**, depois por um nome inexistente e clique em **Atualizar dados**. Nesse modo, `GET /api/status` informa `{ "api": "ok", "banco": "desativado" }`. A API dos módulos com persistência e a de login respondem HTTP 503.

## 4. Executar com PostgreSQL

Mantenha o PostgreSQL em execução. Dentro de `back_end`, crie o `.env` a partir de `.env.example` se ele ainda estiver ausente.

```powershell
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
```

```bash
test -f .env || cp .env.example .env
```

Preencha `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER` e `DB_PASSWORD` conforme a instalação. Para uma conexão local sem TLS, use `DB_SSL=false`. Defina `DASHBOARD_DATA_SOURCE=postgres` e troque `JWT_SECRET` por um segredo próprio de pelo menos 16 caracteres. Reserve `.env` para configuração local.

### Banco web separado

O banco local `intellistock` pertence ao aplicativo mobile. A aplicação web usa `intellistock_web`, criado com `back_end/database/schema.sql`. O arquivo `back_end/.env` local já aponta para o banco web. Em outra máquina, configure:

```ini
DASHBOARD_DATA_SOURCE=postgres
DB_HOST=localhost
DB_PORT=5432
DB_NAME=intellistock_web
DB_USER=postgres
DB_PASSWORD=SENHA_LOCAL
DB_SSL=false
JWT_SECRET=SUBSTITUA_POR_UM_SEGREDO_PROPRIO_LONGO
```

Instale as tabelas sem produtos de exemplo e inicie o servidor:

```bash
npm run db:setup -- --sem-dados
npm start
```

O setup cria o banco indicado em `DB_NAME` quando necessário e aplica `back_end/database/schema.sql`. Ele complementa instalações anteriores do esquema web e preserva os registros existentes. `npm run db:setup` sem `--sem-dados` adiciona a amostra somente na primeira instalação vazia.

Acesse **http://localhost:3000/login.html**. O botão **Cadastrar-se**, abaixo de **Entrar**, abre a página de cadastro, que usa a API existente. O botão **Sair** no menu pede confirmação antes de encerrar a sessão local. A consulta `GET /api/status` retorna `{ "api": "ok", "banco": "ok" }` quando a conexão está ativa.

## 5. Contrato do dashboard e rotas integradas

`GET /api/dashboard` retorna o total de produtos ativos, os alertas, a origem dos dados e o horário da consulta. A tela também calcula o percentual de produtos no mínimo ou acima e mostra saldo, mínimo e déficit com até três casas decimais.

```json
{
  "totalProdutos": 3,
  "produtosAbaixoMinimo": [
    { "id": 2, "nome": "Açaí 2 L", "quantidade": 5, "estoqueMinimo": 8 }
  ],
  "source": "mock",
  "geradoEm": "2026-11-23T15:00:00.000Z"
}
```

`produtosAbaixoMinimo` inclui somente produtos ativos com `quantidade < estoqueMinimo`, ordenados do maior déficit para o menor. `source` é `mock` ou `postgres` e `geradoEm` é um timestamp ISO. No modo PostgreSQL, a rota exige um JWT válido. Se a consulta falhar, retorna HTTP 500 sem fallback para dados simulados. A tela limpa os indicadores e mostra o erro.

| Tela | Rotas principais |
| --- | --- |
| Dashboard | `GET /api/dashboard` |
| Fornecedores | `GET /api/fornecedores`, `POST /api/fornecedores`, `PUT /api/fornecedores/:id` |
| Produtos | `GET /api/produtos`, `POST /api/produtos`, `PUT /api/produtos/:id` |
| Movimentações | `GET /api/movimentacoes`, `GET /api/movimentacoes/:id`, `POST /api/movimentacoes` |

O [guia do back-end](back_end/README.md#rotas-da-api) lista as demais rotas.

## 6. Roteiro da apresentação

1. Inicie no modo PostgreSQL e entre no sistema. Em **Fornecedores**, cadastre um fornecedor.
2. Em **Produtos**, cadastre um produto ligado a esse fornecedor com saldo inicial **0**, estoque mínimo **8** e unidade **UN**.
3. Em **Movimentações**, selecione o produto e registre uma **entrada de 10** e uma **saída de 3**. Confira as duas linhas no histórico e o saldo final **7**.
4. Abra o **Dashboard**. O produto deve aparecer abaixo do mínimo com saldo **7**, mínimo **8** e déficit **1**.
5. Volte a **Movimentações** e tente cadastrar uma **saída de 8**. A operação deve ser recusada. Confira que o saldo continua **7** e o histórico mantém as duas movimentações.

### Validação em 28/11/2026

- **Testes automatizados.** `npm test` passou com **14 testes** em Node.js 24 e npm 11. A suíte cobre o contrato HTTP, os modos de dados, cadastro e confirmação de saída na interface, a autenticação, a falha de consulta e os estados e a formatação decimal do dashboard.
- **Modo mock.** A página, seus arquivos estáticos e a API responderam em uma mesma origem. O dashboard retornou 5 produtos e 2 alertas, e o status informou banco desativado.
- **PostgreSQL 17.10 em instância isolada.** O setup instalou a amostra, o login funcionou e foi possível criar e editar fornecedores e produtos. A API registrou a entrada de 10 e a saída de 3. O dashboard exibiu saldo 7, mínimo 8 e déficit 1. A tentativa de saída de 8 retornou HTTP 400 e manteve o saldo e as duas movimentações.
- **Migração.** Aplicar o setup sobre o SQL inicial de Caio preservou IDs, saldos e histórico. Uma segunda execução do setup também preservou os dados.
- **Front-end.** O JavaScript do dashboard e o cliente HTTP foram exercitados com a API real em DOM simulado, incluindo busca e atualização. A verificação visual no navegador ficou pendente.
- **Banco web local separado.** `intellistock_web` foi criado sem produtos simulados. Login, status, dashboard, fornecedores, produtos, movimentações e página inicial responderam na aplicação real. O roteiro de entrada 10, saída 3, alerta 7/8 e recusa de saída 8 passou em `intellistock_web_validation`, uma base criada apenas para validação.

## 7. Entrega ao AVA

Inclua as duas pastas da aplicação e os guias de instalação. Execute `npm ci` e `npm test` em `back_end` e repita o roteiro a partir de uma cópia descompactada.

```text
projeto_final.zip
└── projeto_final/
    ├── front_end/
    ├── back_end/
    │   ├── src/
    │   ├── database/
    │   ├── db/
    │   ├── scripts/
    │   ├── tests/
    │   ├── package.json
    │   ├── package-lock.json
    │   ├── .env.example
    │   └── README.md
    └── README.md
```

Exclua `node_modules`, `.env` e arquivos pessoais do ZIP. As orientações de trabalho estão em [AGENTS.md](AGENTS.md), e o contexto inicial da parte de João está em [PROMPT_PARA_CODEX.md](PROMPT_PARA_CODEX.md).
