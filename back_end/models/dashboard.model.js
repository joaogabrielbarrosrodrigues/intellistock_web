'use strict';
const { getPool } = require('../db/connection');

// CONTRATO SQL PROVISÓRIO: produtos(id, nome, quantidade, estoque_minimo).
// O Caio confirmará os nomes definitivos antes de ligar o PostgreSQL.
// A consulta é somente leitura. O saldo é mantido pelas transações da Rafa.
const SQL_DASHBOARD = `
  SELECT
    (SELECT COUNT(*)::integer FROM produtos) AS total_produtos,
    COALESCE(
      JSON_AGG(
        JSON_BUILD_OBJECT(
          'id', p.id,
          'nome', p.nome,
          'quantidade', p.quantidade,
          'estoqueMinimo', p.estoque_minimo
        )
        ORDER BY (p.estoque_minimo - p.quantidade) DESC, p.nome ASC
      ) FILTER (WHERE p.id IS NOT NULL),
      '[]'::json
    ) AS produtos_abaixo_minimo
  FROM (
    SELECT id, nome, quantidade, estoque_minimo
    FROM produtos
    WHERE quantidade < estoque_minimo
  ) p
`;

async function getDashboardFromPostgres() {
  const { rows } = await getPool().query(SQL_DASHBOARD);
  const row = rows[0];
  return {
    totalProdutos: Number(row.total_produtos),
    produtosAbaixoMinimo: row.produtos_abaixo_minimo
  };
}
module.exports = { getDashboardFromPostgres, SQL_DASHBOARD };
