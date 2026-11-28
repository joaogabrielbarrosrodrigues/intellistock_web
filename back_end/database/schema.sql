-- =============================================================
-- InteliStock Web - Script de criação do banco de dados
-- Banco: PostgreSQL 13+
--
-- Antes de executar, crie o banco (ou use "npm run db:setup"):
--   CREATE DATABASE intellistock_web;
--
-- Cria as tabelas que faltam e complementa a versão inicial do Caio
-- (db/schema.sql), preservando os dados existentes.
-- =============================================================

-- Usuários que acessam o sistema
CREATE TABLE IF NOT EXISTS usuarios (
    id          SERIAL PRIMARY KEY,
    nome        VARCHAR(120) NOT NULL,
    email       VARCHAR(180) NOT NULL UNIQUE,
    senha_hash  VARCHAR(100) NOT NULL,
    criado_em   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Fornecedores dos produtos e credores das contas a pagar
CREATE TABLE IF NOT EXISTS fornecedores (
    id          SERIAL PRIMARY KEY,
    nome        VARCHAR(150) NOT NULL,
    cnpj        CHAR(14) UNIQUE,              -- somente dígitos, opcional
    telefone    VARCHAR(20),
    email       VARCHAR(180),
    criado_em   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Produtos controlados no estoque
CREATE TABLE IF NOT EXISTS produtos (
    id              SERIAL PRIMARY KEY,
    nome            VARCHAR(150)  NOT NULL,
    descricao       VARCHAR(500),
    unidade_medida  VARCHAR(3)    NOT NULL
                    CHECK (unidade_medida IN ('UN','KG','G','L','ML','M','CX','PCT','FD')),
    quantidade      NUMERIC(15,3) NOT NULL DEFAULT 0 CHECK (quantidade >= 0),  -- saldo atual
    estoque_minimo  NUMERIC(15,3) NOT NULL DEFAULT 0 CHECK (estoque_minimo >= 0),
    preco           NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (preco >= 0),
    fornecedor_id   INTEGER REFERENCES fornecedores(id) ON DELETE RESTRICT,
    ativo           BOOLEAN       NOT NULL DEFAULT TRUE,
    criado_em       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    atualizado_em   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_produtos_nome ON produtos (nome);
CREATE INDEX IF NOT EXISTS idx_produtos_fornecedor ON produtos (fornecedor_id);

-- Extrato do estoque: cada entrada ou saída de produto
CREATE TABLE IF NOT EXISTS movimentacoes (
    id                SERIAL PRIMARY KEY,
    produto_id        INTEGER       NOT NULL REFERENCES produtos(id) ON DELETE RESTRICT,
    tipo              VARCHAR(7)    NOT NULL CHECK (tipo IN ('ENTRADA','SAIDA')),
    quantidade        NUMERIC(15,3) NOT NULL CHECK (quantidade > 0),
    saldo_resultante  NUMERIC(15,3) NOT NULL CHECK (saldo_resultante >= 0),
    data              TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    observacao        VARCHAR(500),
    usuario_id        INTEGER REFERENCES usuarios(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_movimentacoes_produto_data ON movimentacoes (produto_id, data);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_tipo_data    ON movimentacoes (tipo, data);

-- Contas a pagar aos fornecedores
-- O status "VENCIDA" não é gravado: é calculado (PENDENTE com vencimento no passado).
CREATE TABLE IF NOT EXISTS contas_pagar (
    id               SERIAL PRIMARY KEY,
    fornecedor_id    INTEGER       NOT NULL REFERENCES fornecedores(id) ON DELETE RESTRICT,
    descricao        VARCHAR(255)  NOT NULL,
    valor            NUMERIC(15,2) NOT NULL CHECK (valor > 0),
    data_vencimento  DATE          NOT NULL,
    data_pagamento   DATE,
    status           VARCHAR(9)    NOT NULL DEFAULT 'PENDENTE'
                     CHECK (status IN ('PENDENTE','PAGA','CANCELADA')),
    observacao       VARCHAR(500),
    criado_em        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    atualizado_em    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contas_pagar_vencimento ON contas_pagar (data_vencimento);
CREATE INDEX IF NOT EXISTS idx_contas_pagar_status     ON contas_pagar (status);

-- A primeira versão armazenava quantidades inteiras e não vinculava
-- movimentações a usuários. Movimentações antigas continuam válidas com NULL.
ALTER TABLE movimentacoes
    ADD COLUMN IF NOT EXISTS usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'produtos' AND column_name = 'quantidade' AND data_type = 'integer'
    ) THEN
        ALTER TABLE produtos
            ALTER COLUMN quantidade TYPE NUMERIC(15,3),
            ALTER COLUMN estoque_minimo TYPE NUMERIC(15,3),
            ALTER COLUMN preco TYPE NUMERIC(15,2);
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'movimentacoes' AND column_name = 'quantidade' AND data_type = 'integer'
    ) THEN
        ALTER TABLE movimentacoes
            ALTER COLUMN quantidade TYPE NUMERIC(15,3),
            ALTER COLUMN saldo_resultante TYPE NUMERIC(15,3);
    END IF;
END
$$;
