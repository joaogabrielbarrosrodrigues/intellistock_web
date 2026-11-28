# IntelliStock Web — back-end

A API REST usa Node.js, Express e PostgreSQL. A estrutura segue o padrão Model, Route, Controller. O Express também serve os arquivos de `../front_end`, e as telas chamam a API pelo mesmo endereço.

## Pré-requisitos

- Node.js 20+ e npm.
- PostgreSQL 13+ em execução para o modo `postgres`.
- Um navegador para abrir as telas. O Bootstrap é carregado via CDN.

Abra um terminal dentro de `back_end` e instale as dependências registradas no lockfile.

```bash
npm ci
npm test
```

## Modo demonstrativo

```bash
npm start
```

Abra **http://localhost:3000**. Com `DASHBOARD_DATA_SOURCE=mock`, ou sem essa variável definida, o dashboard usa a amostra local e funciona sem conexão com o banco e sem autenticação. `GET /api/status` informa `banco: "desativado"`. As rotas de autenticação, cadastros, movimentações, contas e análises respondem HTTP 503.

## Modo PostgreSQL

Crie o arquivo local `.env` se ele ainda estiver ausente.

```powershell
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
```

```bash
test -f .env || cp .env.example .env
```

Defina `DASHBOARD_DATA_SOURCE=postgres`. Ajuste `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER` e `DB_PASSWORD` para a instalação. Use `DB_SSL=false` para conexão local sem TLS e substitua `JWT_SECRET` por um segredo próprio de pelo menos 16 caracteres. Mantenha o arquivo `.env` local.

Configure `DB_NAME=intellistock_web` no `.env`. Esse banco web é separado do banco `intellistock` usado pelo aplicativo mobile. Para instalar as tabelas sem dados de exemplo e iniciar a aplicação:

```bash
npm run db:setup -- --sem-dados
npm start
```

O setup cria o banco configurado se ele ainda estiver ausente e executa `database/schema.sql`. Use um usuário com acesso ao banco de manutenção `postgres` e permissão para criar o banco quando necessário e aplicar o esquema na base escolhida.

A execução complementa instalações anteriores, inclusive as criadas com `db/schema.sql` do Caio, e preserva os registros existentes. Se quiser instalar uma amostra em outro banco vazio, use `npm run db:setup` sem `--sem-dados` na primeira instalação.

Entre pela tela **http://localhost:3000/login.html** com a conta cadastrada no banco web. O botão **Cadastrar-se** abre `/cadastro.html`, que chama `POST /api/auth/cadastro` com nome, e-mail e senha de pelo menos seis caracteres. O botão **Sair** pede confirmação antes de remover a sessão do navegador.

A consulta `GET /api/status` retorna `{ "api": "ok", "banco": "ok" }` quando a API consegue acessar o banco. Para reiniciar automaticamente durante o desenvolvimento, use `npm run dev`.

## Estrutura

```text
back_end/
  database/
    schema.sql                 # esquema canônico e atualização da versão inicial
    seed.sql                   # amostra da primeira instalação
  db/
    schema.sql                 # primeira versão do esquema, preservada para referência
    connection.js              # entrada de compatibilidade para o mesmo pool
  scripts/
    setup-db.js                # aplica o esquema e, quando cabível, a amostra
  src/
    config/
      db.js                    # configuração e pool compartilhado do pg
      dashboard.js             # seleção do modo do dashboard
    controllers/
    models/
    routes/
    services/dashboard.service.js
    middlewares/
    utils/
    app.js                     # Express e hospedagem do front-end
    server.js                  # inicialização HTTP
  tests/
  .env.example
  package.json
  package-lock.json
```

No modo PostgreSQL, a requisição segue da rota para o controller. O middleware autentica as rotas protegidas. Os models usam o pool compartilhado para acessar o PostgreSQL. A movimentação grava seu registro e atualiza o estoque na mesma transação.

## Banco de dados

| Tabela | Conteúdo |
| --- | --- |
| `usuarios` | Contas de acesso com senha protegida por hash bcrypt. |
| `fornecedores` | Fornecedores de produtos e credores das contas. |
| `produtos` | Saldo, estoque mínimo, unidade, preço e situação do cadastro. |
| `movimentacoes` | Entradas e saídas com o saldo resultante de cada operação. |
| `contas_pagar` | Contas dos fornecedores com vencimento e situação. |

`produtos.fornecedor_id` e `contas_pagar.fornecedor_id` referenciam fornecedores. As movimentações referenciam o produto e, quando registrado, o usuário responsável. O esquema web usa IDs inteiros nas respostas da API.

## Rotas da API

No modo PostgreSQL, envie `Authorization: Bearer <token>` nas rotas protegidas. O token vem do login. `GET /api/status`, `POST /api/auth/cadastro` e `POST /api/auth/login` são públicas nesse modo. No modo `mock`, o status e o dashboard são públicos.

| Método | Rota | Descrição |
| --- | --- | --- |
| GET | `/api/status` | Verifica a API e informa a situação do banco. |
| POST | `/api/auth/cadastro` | Cria usuário e retorna `token` e `usuario`. |
| POST | `/api/auth/login` | Autentica com `email` e `senha`. |
| GET | `/api/auth/me` | Consulta o usuário da sessão. |
| GET | `/api/dashboard` | Retorna indicadores e produtos abaixo do mínimo. |
| GET | `/api/fornecedores?busca=` | Lista fornecedores. |
| GET | `/api/fornecedores/:id` | Busca um fornecedor. |
| POST | `/api/fornecedores` | Cadastra um fornecedor. |
| PUT | `/api/fornecedores/:id` | Atualiza um fornecedor. |
| DELETE | `/api/fornecedores/:id` | Exclui um fornecedor sem vínculos. |
| GET | `/api/produtos?busca=&status=&situacao=&fornecedorId=` | Lista produtos. |
| GET | `/api/produtos/:id` | Busca um produto. |
| POST | `/api/produtos` | Cadastra um produto. Aceita `quantidadeInicial`. |
| PUT | `/api/produtos/:id` | Atualiza um produto. |
| DELETE | `/api/produtos/:id` | Exclui um produto ou o desativa se houver histórico. |
| PATCH | `/api/produtos/:id/reativar` | Reativa um produto. |
| GET | `/api/movimentacoes?produtoId=&tipo=&inicio=&fim=&limite=` | Consulta o histórico. |
| GET | `/api/movimentacoes/:id` | Busca uma movimentação. |
| POST | `/api/movimentacoes` | Registra entrada ou saída e atualiza o saldo. |
| GET | `/api/contas?status=&fornecedorId=&busca=` | Lista contas. |
| POST | `/api/contas` | Cadastra uma conta. |
| PUT | `/api/contas/:id` | Edita uma conta pendente. |
| PATCH | `/api/contas/:id/pagar` | Marca como paga. Aceita `dataPagamento`. |
| PATCH | `/api/contas/:id/cancelar` | Cancela uma conta. |
| PATCH | `/api/contas/:id/reabrir` | Volta uma conta ao estado pendente. |
| DELETE | `/api/contas/:id` | Exclui uma conta. |
| GET | `/api/analises/reposicao?dias=&diasCobertura=&prazoEntrega=&diasSeguranca=&todos=` | Consulta sugestões de compra. |
| GET | `/api/analises/consumo/:produtoId?agrupamento=DIARIO\|SEMANAL\|MENSAL` | Consulta a série de consumo. |

O contrato do dashboard mantém `totalProdutos`, `produtosAbaixoMinimo`, `source` e `geradoEm`. Conta produtos ativos e inclui alertas somente quando `quantidade < estoqueMinimo`, ordenados pelo maior déficit. Cada alerta traz `id`, `nome`, `quantidade` e `estoqueMinimo`. O modo PostgreSQL preserva os indicadores adicionais já oferecidos pela API. A tela mostra saldo, mínimo e déficit com até três casas decimais.

Os erros retornam JSON com `mensagem`. Uma falha de consulta em `GET /api/dashboard` no modo PostgreSQL retorna HTTP 500 sem usar a amostra.

## Validação e solução de problemas

Em 28/11/2026, `npm test` passou com 14 testes em Node.js 24 e npm 11. Uma instância isolada de PostgreSQL 17.10 validou a instalação, a migração do esquema inicial e o fluxo da API do cadastro do fornecedor à recusa da saída acima do saldo. O [roteiro de apresentação](../README.md#6-roteiro-da-apresentação) lista os passos pela interface e os resultados da validação.

- Com `password authentication failed`, confira a senha e o usuário no `.env`.
- Com `ECONNREFUSED`, confira se o PostgreSQL está ativo no host e na porta configurados.
- Com `EADDRINUSE`, ajuste `PORT` no `.env` e acesse a nova porta pelo navegador.
- Com HTTP 503 ao abrir os cadastros ou as movimentações, confira se `DASHBOARD_DATA_SOURCE=postgres` e reinicie o Express.
