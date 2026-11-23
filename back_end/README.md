# IntelliStock Web: back-end

API REST em **Node.js + Express**, com banco **PostgreSQL**, organizada no padrão
**MRC (Model, Route, Controller)**.

## Pré-requisitos

- [Node.js](https://nodejs.org) 18 ou superior (já vem com o npm)
- [PostgreSQL](https://www.postgresql.org/download/) 13 ou superior, em execução

## Como executar

Abra um terminal **dentro da pasta `back_end`** e siga os passos.

### 1. Instalar as dependências

```bash
npm install
```

### 2. Configurar a conexão com o banco

Copie o arquivo `.env.example` para `.env`:

```bash
# Windows (PowerShell)
Copy-Item .env.example .env
# Linux / macOS
cp .env.example .env
```

Abra o `.env` e preencha pelo menos `DB_PASSWORD` com a senha do usuário `postgres`
(definida na instalação do PostgreSQL). Troque também o `JWT_SECRET` por um texto longo qualquer.

### 3. Criar o banco de dados

```bash
npm run db:setup
```

Esse comando cria o banco `intellistock_web` (se ainda não existir), as tabelas
(`database/schema.sql`) e insere dados de exemplo (`database/seed.sql`).

> Atenção: o comando **apaga e recria** as tabelas. Use `npm run db:setup -- --sem-dados`
> para criar as tabelas vazias.

**Alternativa manual (pgAdmin ou psql):** crie um banco chamado `intellistock_web` e
execute os scripts `database/schema.sql` e depois `database/seed.sql`.

### 4. Iniciar o servidor

```bash
npm start
```

Acesse **http://localhost:3000**. O próprio Express serve o front-end que está na pasta
`../front_end`, então a aplicação inteira roda com esse único comando.

**Login de demonstração:** `demo@intellistock.com` / `demo123`

Durante o desenvolvimento, `npm run dev` reinicia o servidor automaticamente a cada alteração.

## Estrutura de pastas

```
back_end/
├── database/
│   ├── schema.sql          # criação das tabelas
│   └── seed.sql            # dados de exemplo
├── scripts/
│   └── setup-db.js         # cria o banco e executa os scripts SQL
├── src/
│   ├── config/db.js        # conexão com o PostgreSQL (pool do "pg")
│   ├── models/             # M: consultas SQL de cada tabela
│   ├── controllers/        # C: regras de negócio e validação
│   ├── routes/             # R: mapeamento URL -> controller
│   ├── middlewares/        # autenticação JWT e tratamento de erros
│   ├── utils/              # validação, erros e cálculo de reposição
│   ├── app.js              # configuração do Express
│   └── server.js           # inicia o servidor
├── .env.example
└── package.json
```

Fluxo de uma requisição: **Route → (middleware de autenticação) → Controller → Model → PostgreSQL**.

## Banco de dados

| Tabela          | Conteúdo                                                        |
|-----------------|-----------------------------------------------------------------|
| `usuarios`      | contas de acesso (senha guardada com hash bcrypt)               |
| `fornecedores`  | fornecedores de produtos e credores das contas                  |
| `produtos`      | itens do estoque, com saldo atual, estoque mínimo e preço       |
| `movimentacoes` | extrato do estoque: cada entrada/saída e o saldo resultante     |
| `contas_pagar`  | contas com vencimento e status (pendente, paga, cancelada)      |

Relacionamentos: `produtos.fornecedor_id → fornecedores`, `movimentacoes.produto_id → produtos`,
`movimentacoes.usuario_id → usuarios`, `contas_pagar.fornecedor_id → fornecedores`.

## Rotas da API

Todas as rotas, exceto `/api/status` e `/api/auth/cadastro|login`, exigem o cabeçalho
`Authorization: Bearer <token>` (o token vem no login).

| Método | Rota                                  | Descrição                                   |
|--------|---------------------------------------|---------------------------------------------|
| GET    | `/api/status`                         | verifica API e banco                        |
| POST   | `/api/auth/cadastro`                  | cria usuário `{ nome, email, senha }`       |
| POST   | `/api/auth/login`                     | login `{ email, senha }` → `{ token }`      |
| GET    | `/api/auth/me`                        | dados do usuário logado                     |
| GET    | `/api/dashboard`                      | indicadores da tela inicial                 |
| GET    | `/api/fornecedores?busca=`            | lista fornecedores                          |
| GET    | `/api/fornecedores/:id`               | busca um fornecedor                         |
| POST   | `/api/fornecedores`                   | cadastra                                    |
| PUT    | `/api/fornecedores/:id`               | atualiza                                    |
| DELETE | `/api/fornecedores/:id`               | exclui (se não tiver vínculos)              |
| GET    | `/api/produtos?busca=&status=&situacao=` | lista produtos                           |
| GET    | `/api/produtos/:id`                   | busca um produto                            |
| POST   | `/api/produtos`                       | cadastra (aceita `quantidadeInicial`)       |
| PUT    | `/api/produtos/:id`                   | atualiza                                    |
| DELETE | `/api/produtos/:id`                   | exclui ou desativa (se tiver histórico)     |
| PATCH  | `/api/produtos/:id/reativar`          | reativa produto desativado                  |
| GET    | `/api/movimentacoes?produtoId=&tipo=&inicio=&fim=` | extrato                        |
| POST   | `/api/movimentacoes`                  | registra entrada/saída e atualiza o saldo   |
| GET    | `/api/contas?status=&fornecedorId=&busca=` | lista contas                           |
| POST   | `/api/contas`                         | cadastra conta                              |
| PUT    | `/api/contas/:id`                     | edita conta pendente                        |
| PATCH  | `/api/contas/:id/pagar`               | marca como paga `{ dataPagamento? }`        |
| PATCH  | `/api/contas/:id/cancelar`            | cancela                                     |
| PATCH  | `/api/contas/:id/reabrir`             | volta para pendente                         |
| DELETE | `/api/contas/:id`                     | exclui                                      |
| GET    | `/api/analises/reposicao?dias=&diasCobertura=&prazoEntrega=&diasSeguranca=&todos=` | sugestões de compra |
| GET    | `/api/analises/consumo/:produtoId?agrupamento=DIARIO\|SEMANAL\|MENSAL` | série de consumo |

Erros são devolvidos como `{ "mensagem": "..." }` com o código HTTP adequado
(400 dados inválidos, 401 sem login, 404 não encontrado, 409 conflito).

## Problemas comuns

- **"password authentication failed"**: a senha em `DB_PASSWORD` no `.env` está errada.
- **"ECONNREFUSED 5432"**: o PostgreSQL não está em execução.
- **"EADDRINUSE 3000"**: a porta 3000 está ocupada. Altere `PORT` no `.env` e, se abrir o
  front-end por outro servidor, ajuste `PORTA_BACKEND` em `front_end/js/config.js`.
