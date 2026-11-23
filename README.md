# IntelliStock Web — trabalho em equipe

Projeto acadêmico de **Desenvolvimento de Aplicação Web**, baseado nas funcionalidades do IntelliStock original, mas implementado em **HTML, CSS, JavaScript, Bootstrap, Node.js, Express e PostgreSQL**. A versão mobile em React Native/Spring Boot é apenas referência, não parte desta entrega web.

**Situação deste pacote:** a parte de **João Gabriel (dashboard e API)** está implementada e pode ser demonstrada com dados simulados. Ainda falta conectar o banco definitivo e integrar as funcionalidades dos demais colegas. Nenhum código alheio foi substituído, nenhuma branch foi criada e este pacote ainda não está publicado no GitHub.

## 1. Escopo e integrantes

| Integrante | Entrega prevista |
| --- | --- |
| **Caio** | Script SQL de fornecedores, produtos e movimentações; relacionamentos; configuração do PostgreSQL com `pg`; `.env.example`. |
| **Guilherme Paiva** | Rotas, controllers e models para listar/cadastrar/editar fornecedores e produtos; validação na API. |
| **Bea (Beatriz)** | Navegação e telas Bootstrap de fornecedores/produtos; formulários e listas usando `fetch`. |
| **Rafa (Rafaely)** | API e tela de entradas/saídas/histórico; atualização de saldo na mesma transação do registro; impedir saída acima do saldo. |
| **João Gabriel** | Tela inicial e `GET /api/dashboard`; integração final, documentação, testes e `projeto_final.zip`. |

**Entrega mínima integrada:** fornecedores, produtos, entradas, saídas, histórico e alerta de produtos abaixo do estoque mínimo. Login, contas a pagar e previsão de reposição são opcionais para depois.

## 2. Estrutura

```text
front_end/
  index.html                  # dashboard (João)
  css/styles.css             # layout responsivo (João)
  js/dashboard.js            # consulta à API e renderização (João)
  img/intellistock-logo.png  # logo original da equipe
  img/intellistock-symbol.png # recorte do símbolo para o cabeçalho e o ícone da aba
back_end/
  server.js                  # Express + hospedagem do front
  routes/dashboard.routes.js
  controllers/dashboard.controller.js
  services/dashboard.service.js
  models/dashboard.model.js  # SQL provisório até o Caio definir o esquema
  db/connection.js           # pool pg
  tests/                     # testes da API e da lógica
  .env.example
  package.json
  package-lock.json             # versões instaladas pelo npm
.gitignore
AGENTS.md                    # regras para o Codex
PROMPT_PARA_CODEX.md         # prompt pronto para o VS Code
README.md
```

**Não estão incluídos:** `back_end/db/schema.sql` (Caio), rotas/telas de cadastros (Guilherme/Bea), rotas/tela de movimentações (Rafa). Essas partes deverão ser incorporadas depois, sem sobrescrever o dashboard.

## 3. Como iniciar no VS Code

Pré-requisitos: **Node.js 20+**, npm e navegador. O PostgreSQL só é necessário no modo real. O Bootstrap é carregado via CDN (precisa de internet para seus estilos).

Abra a pasta raiz no VS Code e execute no terminal:

```bash
cd back_end
npm install
```

Crie o arquivo `.env` a partir de `.env.example`:

```powershell
# Windows / PowerShell
Copy-Item .env.example .env
```

```bash
# macOS / Linux
cp .env.example .env
```

No `.env`, deixe `DASHBOARD_DATA_SOURCE=mock`. Depois:

```bash
npm test
npm start
```

Acesse **http://localhost:3000**. O Express entrega o frontend e a API no **mesmo endereço**, sem necessidade de servidor HTML ou CORS separados. Para reinício automático durante o desenvolvimento, use `npm run dev`.

> O modo `mock` mostra dados fictícios. Não permite cadastrar produtos ou movimentações e não persiste nenhuma alteração. Não confundir demonstração com integração concluída.

### Validação realizada em 23/11/2026

Com Node.js 24 e npm 11, as dependências declaradas foram instaladas e `npm test` passou com **11 testes**. Os testes cobrem o contrato HTTP, a agregação, os indicadores e estados da tela (busca, lista vazia e erro), além de confirmar que falha no modo `postgres` retorna HTTP 500 sem usar os dados simulados.

Com `DASHBOARD_DATA_SOURCE=mock` e `npm start`, `GET /`, `GET /api/dashboard`, `GET /css/styles.css` e `GET /js/dashboard.js` responderam HTTP 200. A API apresentou 5 produtos e 2 alertas. Para conferir visualmente no seu navegador, abra `http://localhost:3000`, busque por **Açaí**, teste um nome inexistente e clique em **Atualizar dados**. A integração com PostgreSQL real e o roteiro completo da seção 6 ainda não puderam ser testados sem as entregas da equipe.

## 4. Funcionalidade de João — dashboard

A página mostra **total de produtos**, **quantidade abaixo do mínimo**, **percentual de produtos no mínimo ou acima**, tabela de alertas, diferença a repor, busca pelo nome e botão de atualização. Em caso de falha da API, mostra erro e não apresenta números antigos como atuais.

**Endpoint:** `GET /api/dashboard`, por exemplo:

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

`produtosAbaixoMinimo` inclui **somente** `quantidade < estoqueMinimo`, ordenado pelo maior déficit. `source` é `mock` ou `postgres`; `geradoEm` é um timestamp ISO de geração da resposta. A API retorna erro HTTP 500 se a consulta ao PostgreSQL falhar: **não existe fallback silencioso para mock**.

### Ativar PostgreSQL depois da entrega do Caio

1. Receba o script SQL definitivo e crie o banco indicado pelo Caio.
2. Confirme os nomes reais da tabela e colunas de produtos com a equipe.
3. Ajuste, se necessário, **somente** `back_end/models/dashboard.model.js`. A consulta existente assume provisoriamente `produtos(id, nome, quantidade, estoque_minimo)`, o que ainda não foi validado com o banco da equipe.
4. Configure no `back_end/.env`:

```ini
DASHBOARD_DATA_SOURCE=postgres
DB_HOST=localhost
DB_PORT=5432
DB_NAME=intellistock_web
DB_USER=postgres
DB_PASSWORD=SUA_SENHA_LOCAL
DB_SSL=false
```

5. Reinicie `npm start` e consulte `http://localhost:3000/api/dashboard`.

O dashboard **não modifica dados**; o registro de entradas e saídas e a atualização do saldo são responsabilidades da Rafa.

## 5. Como integrar os outros módulos

Combinem previamente os campos, os exemplos JSON e as rotas com os responsáveis. Estas são as **rotas esperadas**, não rotas já existentes neste pacote:

| Rotas | Responsável |
| --- | --- |
| `GET/POST /api/fornecedores`, `PUT /api/fornecedores/:id` | Guilherme |
| `GET/POST /api/produtos`, `PUT /api/produtos/:id` | Guilherme |
| `GET/POST /api/movimentacoes` | Rafa |
| `GET /api/dashboard` | João — já existe |

Quando os arquivos de rotas forem adicionados pelos colegas, importe-os em `back_end/server.js` nos comentários marcados para integração. Bea poderá substituir o texto **Em breve** pelos links reais das páginas criadas. Evitem duplicar uma conexão com PostgreSQL se a equipe já tiver escolhido uma implementação comum.

## 6. Teste da apresentação — após integrar a equipe

1. Pela interface, cadastre **um fornecedor** e **um produto** com saldo inicial **0** e estoque mínimo **8**.
2. Registre **entrada de 10** e **saída de 3**. Recarregue a página: saldo esperado **7**, duas movimentações no histórico e produto abaixo do mínimo no dashboard.
3. Tente **saída de 8**. A API deve recusar, o saldo permanecer **7** e o histórico continuar com duas movimentações.

**Esse teste completo ainda depende dos módulos de Guilherme, Bea, Rafa e do SQL do Caio.** Apenas o dashboard pode ser demonstrado de modo independente agora.

## 7. Entrega ao AVA

Quando todas as partes funcionarem, execute `npm test` e repita o teste acima **a partir de um ZIP descompactado**. Organize o arquivo conforme o plano da equipe:

```text
projeto_final.zip
└── projeto_final/
    ├── front_end/            # HTML, CSS, JavaScript e Bootstrap
    └── back_end/
        ├── routes/
        ├── controllers/
        ├── models/
        ├── db/               # conexão e script SQL definitivo
        ├── package.json
        ├── package-lock.json
        ├── .env.example
        └── README.md         # instruções de instalação
```

Ao final, gere `package-lock.json` com `npm install`. **Não inclua** `node_modules`, `.env` com senhas reais ou arquivos pessoais. Para facilitar a avaliação, mantenha uma cópia da documentação de instalação em `back_end/README.md` se a equipe precisar seguir exatamente a estrutura descrita para o AVA.

## 8. Codex no VS Code

O arquivo `PROMPT_PARA_CODEX.md` contém o prompt para orientar o Codex a verificar/testar a parte do João e integrar os módulos conforme forem adicionados. `AGENTS.md` preserva as regras do projeto. **Não é necessário criar branches individuais.**

**Nota sobre validação:** a lógica de agregação pode ser testada isoladamente sem dependências com `node --test tests/dashboard.logic.test.js` dentro de `back_end`. Os testes HTTP completos exigem `npm install`. O uso real do PostgreSQL só pode ser considerado validado depois de executar o SQL definitivo e testar com banco.
