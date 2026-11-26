CREATE TABLE IF NOT EXISTS fornecedores (
    id         SERIAL PRIMARY KEY,
    nome       VARCHAR(150) NOT NULL,
    cnpj       CHAR(14) UNIQUE,
    telefone   VARCHAR(20),
    email      VARCHAR(180),
    criado_em  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS produtos (
    id              SERIAL PRIMARY KEY,
    nome            VARCHAR(150) NOT NULL,
    descricao       VARCHAR(500),
    unidade_medida  VARCHAR(3) NOT NULL DEFAULT 'UN'
                    CHECK (unidade_medida IN ('UN','KG','G','L','ML','M','CX','PCT','FD')),
    quantidade      INTEGER NOT NULL DEFAULT 0 CHECK (quantidade >= 0),
    estoque_minimo  INTEGER NOT NULL DEFAULT 0 CHECK (estoque_minimo >= 0),
    preco           NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (preco >= 0),
    fornecedor_id   INTEGER REFERENCES fornecedores(id) ON DELETE RESTRICT,
    ativo           BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS movimentacoes (
    id                SERIAL PRIMARY KEY,
    produto_id        INTEGER NOT NULL REFERENCES produtos(id) ON DELETE RESTRICT,
    tipo              VARCHAR(7) NOT NULL CHECK (tipo IN ('ENTRADA','SAIDA')),
    quantidade        INTEGER NOT NULL CHECK (quantidade > 0),
    saldo_resultante  INTEGER NOT NULL CHECK (saldo_resultante >= 0),
    data              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    observacao        VARCHAR(500)
);

CREATE INDEX IF NOT EXISTS idx_produtos_nome ON produtos (nome);
CREATE INDEX IF NOT EXISTS idx_produtos_fornecedor ON produtos (fornecedor_id);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_produto_data ON movimentacoes (produto_id, data DESC);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_tipo_data ON movimentacoes (tipo, data DESC);
