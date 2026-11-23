/**
 * Model de análises: consultas de consumo (saídas) usadas no cálculo de reposição.
 */
const db = require('../config/db');

/**
 * Para cada produto ativo, soma as saídas na metade antiga e na metade recente
 * dos últimos "dias" (incluindo hoje).
 */
async function totaisDeSaidaPorProduto(dias) {
  const { rows } = await db.query(
    `WITH j AS (
       SELECT (CURRENT_DATE - ($1::int - 1))                    AS inicio,
              (CURRENT_DATE - ($1::int - 1) + ($1::int / 2))    AS meio,
              (CURRENT_DATE + 1)                                AS fim
     )
     SELECT p.id, p.nome, p.unidade_medida AS "unidadeMedida", p.quantidade,
            p.estoque_minimo AS "estoqueMinimo", p.preco, f.nome AS "fornecedorNome",
            COALESCE(SUM(m.quantidade) FILTER (WHERE m.data <  j.meio), 0) AS "totalAntigo",
            COALESCE(SUM(m.quantidade) FILTER (WHERE m.data >= j.meio), 0) AS "totalRecente"
     FROM produtos p
     CROSS JOIN j
     LEFT JOIN fornecedores f ON f.id = p.fornecedor_id
     LEFT JOIN movimentacoes m ON m.produto_id = p.id AND m.tipo = 'SAIDA'
                              AND m.data >= j.inicio AND m.data < j.fim
     WHERE p.ativo
     GROUP BY p.id, f.nome
     ORDER BY p.nome`,
    [dias],
  );
  return rows;
}

const AGRUPAMENTOS = {
  DIARIO: { campo: 'day', intervalo: '1 day' },
  SEMANAL: { campo: 'week', intervalo: '1 week' },
  MENSAL: { campo: 'month', intervalo: '1 month' },
};

/** Série de consumo (saídas) de um produto agrupada por dia, semana ou mês. */
async function serieDeConsumo(produtoId, agrupamento, dias) {
  const { campo, intervalo } = AGRUPAMENTOS[agrupamento];
  const { rows } = await db.query(
    `WITH periodos AS (
       SELECT generate_series(
                date_trunc($2, (CURRENT_DATE - ($3::int - 1))::timestamp),
                date_trunc($2, CURRENT_DATE::timestamp),
                $4::interval)::date AS inicio
     )
     SELECT to_char(pe.inicio, 'YYYY-MM-DD') AS periodo,
            COALESCE(SUM(m.quantidade), 0) AS quantidade
     FROM periodos pe
     LEFT JOIN movimentacoes m
            ON m.produto_id = $1 AND m.tipo = 'SAIDA'
           AND m.data >= (CURRENT_DATE - ($3::int - 1))
           AND date_trunc($2, m.data::date::timestamp)::date = pe.inicio
     GROUP BY pe.inicio
     ORDER BY pe.inicio`,
    [produtoId, campo, dias, intervalo],
  );
  return rows;
}

module.exports = { totaisDeSaidaPorProduto, serieDeConsumo, AGRUPAMENTOS };
