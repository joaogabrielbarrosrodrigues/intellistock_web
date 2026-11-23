/**
 * Model do dashboard: consultas agregadas (totais e indicadores).
 */
const db = require('../config/db');

async function resumoEstoque() {
  const { rows } = await db.query(`
    SELECT COUNT(*) FILTER (WHERE ativo)                                               AS "produtosAtivos",
           COUNT(*) FILTER (WHERE ativo AND quantidade = 0)                            AS "semEstoque",
           COUNT(*) FILTER (WHERE ativo AND quantidade > 0 AND quantidade <= estoque_minimo) AS "estoqueBaixo",
           COUNT(*) FILTER (WHERE ativo AND quantidade > estoque_minimo)               AS "estoqueNormal",
           COALESCE(ROUND(SUM(quantidade * preco) FILTER (WHERE ativo), 2), 0)         AS "valorEmEstoque",
           (SELECT COUNT(*) FROM fornecedores)                                         AS fornecedores
    FROM produtos`);
  return rows[0];
}

async function resumoFinanceiro(diasProximas) {
  const { rows } = await db.query(
    `SELECT COUNT(*) FILTER (WHERE data_vencimento >= CURRENT_DATE)                     AS "pendentes",
            COUNT(*) FILTER (WHERE data_vencimento <  CURRENT_DATE)                     AS "vencidas",
            COALESCE(SUM(valor) FILTER (WHERE data_vencimento >= CURRENT_DATE), 0)      AS "valorPendente",
            COALESCE(SUM(valor) FILTER (WHERE data_vencimento <  CURRENT_DATE), 0)      AS "valorVencido",
            COUNT(*) FILTER (WHERE data_vencimento BETWEEN CURRENT_DATE AND CURRENT_DATE + $1::int) AS "proximas",
            COALESCE(SUM(valor) FILTER (WHERE data_vencimento BETWEEN CURRENT_DATE AND CURRENT_DATE + $1::int), 0) AS "valorProximas"
     FROM contas_pagar
     WHERE status = 'PENDENTE'`,
    [diasProximas],
  );
  return rows[0];
}

/** Contas pendentes já vencidas ou que vencem nos próximos dias. */
async function contasEmDestaque(diasProximas) {
  const { rows } = await db.query(
    `SELECT c.id, c.descricao, c.valor, c.data_vencimento AS "dataVencimento", f.nome AS "fornecedorNome",
            (c.data_vencimento - CURRENT_DATE) AS "diasParaVencer",
            CASE WHEN c.data_vencimento < CURRENT_DATE THEN 'VENCIDA' ELSE 'PENDENTE' END AS status
     FROM contas_pagar c JOIN fornecedores f ON f.id = c.fornecedor_id
     WHERE c.status = 'PENDENTE' AND c.data_vencimento <= CURRENT_DATE + $1::int
     ORDER BY c.data_vencimento
     LIMIT 8`,
    [diasProximas],
  );
  return rows;
}

async function movimentacoesRecentes(limite) {
  const { rows } = await db.query(
    `SELECT m.id, m.tipo, m.quantidade, m.data, p.nome AS "produtoNome", p.unidade_medida AS "unidadeMedida"
     FROM movimentacoes m JOIN produtos p ON p.id = m.produto_id
     ORDER BY m.data DESC, m.id DESC
     LIMIT $1`,
    [limite],
  );
  return rows;
}

/** Valor (quantidade x preço atual) das entradas e saídas em cada um dos últimos meses. */
async function movimentacaoMensal(meses) {
  const { rows } = await db.query(
    `WITH meses AS (
       SELECT generate_series(date_trunc('month', CURRENT_DATE) - ($1::int - 1) * INTERVAL '1 month',
                              date_trunc('month', CURRENT_DATE), INTERVAL '1 month')::date AS mes
     )
     SELECT to_char(me.mes, 'YYYY-MM') AS mes,
            COALESCE(ROUND(SUM(m.quantidade * p.preco) FILTER (WHERE m.tipo = 'ENTRADA'), 2), 0) AS entradas,
            COALESCE(ROUND(SUM(m.quantidade * p.preco) FILTER (WHERE m.tipo = 'SAIDA'), 2), 0)   AS saidas
     FROM meses me
     LEFT JOIN movimentacoes m ON date_trunc('month', m.data::date)::date = me.mes
     LEFT JOIN produtos p ON p.id = m.produto_id
     GROUP BY me.mes
     ORDER BY me.mes`,
    [meses],
  );
  return rows;
}

/**
 * Produtos ativos com saldo ABAIXO do mínimo (quantidade < estoque_minimo),
 * ordenados pelo maior déficit (contrato do dashboard do João Gabriel).
 */
async function produtosAbaixoMinimo() {
  const { rows } = await db.query(`
    SELECT id, nome, unidade_medida AS "unidadeMedida", quantidade, estoque_minimo AS "estoqueMinimo"
    FROM produtos
    WHERE ativo AND quantidade < estoque_minimo
    ORDER BY (estoque_minimo - quantidade) DESC, nome ASC`);
  return rows;
}

module.exports = {
  resumoEstoque, resumoFinanceiro, contasEmDestaque, movimentacoesRecentes, movimentacaoMensal, produtosAbaixoMinimo,
};
