-- =============================================================
-- InteliStock Web - Dados de exemplo (opcional)
-- Execute DEPOIS do schema.sql, com as tabelas vazias.
--
-- Usuário de demonstração:
--   e-mail: demo@intellistock.com
--   senha:  demo123
--
-- As datas são relativas ao dia em que o script é executado, para que
-- o dashboard e as análises de consumo sempre tenham dados recentes.
-- =============================================================

SET timezone = 'America/Sao_Paulo';

INSERT INTO usuarios (nome, email, senha_hash) VALUES
('Usuário Demonstração', 'demo@intellistock.com',
 '$2b$10$e/cLIj6MRAAYeg/1bq4nLe7VfyK4Hb0qVH.Ccj07g895stpWBkst2');

INSERT INTO fornecedores (nome, cnpj, telefone, email) VALUES
('Distribuidora Bom Preço Alimentos', '11222333000181', '(11) 3456-7890', 'vendas@bompreco.com.br'),
('Laticínios e Cafés Serra Verde',    '45678912000155', '(35) 3221-4455', 'pedidos@serraverde.com.br'),
('Limpa Mais Produtos de Limpeza',    '98765432000198', '(11) 2345-6789', 'contato@limpamais.com.br'),
('Água Pura Bebidas e Descartáveis',  '32165498000139', '(19) 3890-1122', 'comercial@aguapura.com.br');

INSERT INTO produtos (nome, descricao, unidade_medida, estoque_minimo, preco, fornecedor_id) VALUES
('Arroz tipo 1 5kg',              'Pacote de arroz branco tipo 1',       'PCT', 40, 27.90, 1),
('Feijão carioca 1kg',            'Pacote de feijão carioca',            'PCT', 30,  8.49, 1),
('Óleo de soja 900ml',            'Garrafa PET',                         'UN',  24,  7.99, 1),
('Café torrado e moído 500g',     'Café tradicional a vácuo',            'PCT', 20, 18.90, 2),
('Açúcar refinado (granel)',      'Vendido a quilo',                     'KG',  50,  4.20, 1),
('Leite integral',                'Leite UHT integral',                  'L',   60,  4.99, 2),
('Detergente neutro 500ml',       'Frasco de detergente líquido',        'UN',  30,  2.79, 3),
('Papel toalha (fardo 12 rolos)', 'Fardo com 12 rolos',                  'FD',   5, 45.00, 3),
('Sabão em pó 1kg',               'Caixa de sabão em pó',                'CX',  15, 15.90, 3),
('Água mineral 500ml (fardo 12)', 'Fardo com 12 garrafas sem gás',       'FD',  20, 14.00, 4),
('Guardanapo de papel',           'Pacote com 50 unidades',              'PCT', 10,  3.50, 4);

-- Parâmetros usados para gerar o histórico de movimentações
-- (estoque inicial, consumo médio diário e aumento recente do consumo)
CREATE TEMP TABLE seed_parametros (produto_id INT, inicial NUMERIC, consumo NUMERIC, tendencia NUMERIC);
INSERT INTO seed_parametros VALUES
(1, 400, 5.0,  0.30),
(2, 230, 4.0,  0.00),
(3, 260, 3.0,  0.00),
(4, 200, 2.5,  0.40),
(5, 500, 6.5, -0.20),
(6, 620, 9.0,  0.20),
(7, 200, 1.5,  0.00),
(8,  60, 0.4,  0.00), -- 58 saídas de pelo menos 1 fardo deixam saldo final 2
(9, 125, 1.8,  0.10),
(10, 320, 3.5, 0.00);
-- O produto 11 (Guardanapo) fica sem movimentações e sem estoque.

-- Estoque inicial, 60 dias atrás
INSERT INTO movimentacoes (produto_id, tipo, quantidade, saldo_resultante, data, observacao, usuario_id)
SELECT produto_id, 'ENTRADA', inicial, 0, (CURRENT_DATE - 60) + TIME '08:00', 'Estoque inicial', 1
FROM seed_parametros;

-- Uma reposição do feijão, 25 dias atrás
INSERT INTO movimentacoes (produto_id, tipo, quantidade, saldo_resultante, data, observacao, usuario_id)
VALUES (2, 'ENTRADA', 100, 0, (CURRENT_DATE - 25) + TIME '09:30', 'Reposição - NF 4521', 1);

-- Saídas diárias nos últimos 58 dias (com variação e tendência)
INSERT INTO movimentacoes (produto_id, tipo, quantidade, saldo_resultante, data, observacao, usuario_id)
SELECT sp.produto_id,
       'SAIDA',
       CASE WHEN p.unidade_medida IN ('KG','G','L','ML','M') THEN ROUND(calc.q, 1)
            ELSE GREATEST(ROUND(calc.q), 1) END,
       0,
       (CURRENT_DATE - g.dias) + TIME '17:30',
       'Consumo do dia',
       1
FROM seed_parametros sp
JOIN produtos p ON p.id = sp.produto_id
CROSS JOIN generate_series(1, 58) AS g(dias)
CROSS JOIN LATERAL (
    SELECT sp.consumo
           * (1 + CASE WHEN g.dias <= 20 THEN sp.tendencia ELSE 0 END)
           * (0.6 + ((g.dias * 7 + sp.produto_id * 3) % 9) / 10.0) AS q
) calc;

-- Calcula o saldo resultante de cada lançamento, em ordem cronológica
UPDATE movimentacoes m
SET saldo_resultante = s.saldo
FROM (
    SELECT id,
           SUM(CASE WHEN tipo = 'ENTRADA' THEN quantidade ELSE -quantidade END)
               OVER (PARTITION BY produto_id ORDER BY data, id) AS saldo
    FROM movimentacoes
) s
WHERE s.id = m.id;

-- O saldo atual do produto é o saldo do último lançamento
UPDATE produtos p
SET quantidade = COALESCE((
    SELECT saldo_resultante FROM movimentacoes m
    WHERE m.produto_id = p.id
    ORDER BY data DESC, id DESC
    LIMIT 1), 0);

DROP TABLE seed_parametros;

-- Contas a pagar em situações variadas
INSERT INTO contas_pagar (fornecedor_id, descricao, valor, data_vencimento, data_pagamento, status, observacao) VALUES
(1, 'NF 4410 - Arroz e feijão',          3250.00, CURRENT_DATE - 40, CURRENT_DATE - 41, 'PAGA',      'Pago via PIX'),
(2, 'NF 1187 - Café e leite',            2890.50, CURRENT_DATE - 20, CURRENT_DATE - 20, 'PAGA',      NULL),
(3, 'NF 778 - Produtos de limpeza',       980.00, CURRENT_DATE - 5,  NULL,              'PENDENTE',  'Negociar desconto'),
(4, 'NF 3302 - Água mineral',             640.00, CURRENT_DATE - 2,  NULL,              'PENDENTE',  NULL),
(1, 'NF 4521 - Reposição de feijão',      849.00, CURRENT_DATE + 2,  NULL,              'PENDENTE',  NULL),
(2, 'NF 1203 - Leite integral',          1496.00, CURRENT_DATE + 5,  NULL,              'PENDENTE',  'Boleto enviado por e-mail'),
(3, 'NF 790 - Sabão em pó',               795.00, CURRENT_DATE + 12, NULL,              'PENDENTE',  NULL),
(1, 'NF 4600 - Óleo e açúcar',           1720.00, CURRENT_DATE + 25, NULL,              'PENDENTE',  NULL),
(4, 'Pedido cancelado - copos',           210.00, CURRENT_DATE - 10, NULL,              'CANCELADA', 'Pedido devolvido');
