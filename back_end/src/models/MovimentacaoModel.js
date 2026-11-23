/**
 * Model de movimentações (extrato do estoque): acesso à tabela "movimentacoes".
 */
const db = require('../config/db');

const SELECT = `
  SELECT m.id, m.produto_id AS "produtoId", p.nome AS "produtoNome", p.unidade_medida AS "unidadeMedida",
         m.tipo, m.quantidade, m.saldo_resultante AS "saldoResultante", m.data, m.observacao,
         u.nome AS "usuarioNome"
  FROM movimentacoes m
  JOIN produtos p ON p.id = m.produto_id
  LEFT JOIN usuarios u ON u.id = m.usuario_id`;

async function listar({ produtoId, tipo, inicio, fim, limite = 100 } = {}) {
  const condicoes = [];
  const parametros = [];
  const adicionar = (sql, valor) => {
    parametros.push(valor);
    condicoes.push(sql.replace('?', `$${parametros.length}`));
  };
  if (produtoId) adicionar('m.produto_id = ?', produtoId);
  if (tipo) adicionar('m.tipo = ?', tipo);
  if (inicio) adicionar('m.data >= ?::date', inicio);
  if (fim) adicionar("m.data < (?::date + 1)", fim);
  const where = condicoes.length ? `WHERE ${condicoes.join(' AND ')}` : '';
  parametros.push(limite);
  const { rows } = await db.query(
    `${SELECT} ${where} ORDER BY m.data DESC, m.id DESC LIMIT $${parametros.length}`,
    parametros,
  );
  return rows;
}

async function buscarPorId(id, client = db) {
  const { rows } = await client.query(`${SELECT} WHERE m.id = $1`, [id]);
  return rows[0] || null;
}

async function criar(client, { produtoId, tipo, quantidade, saldoResultante, observacao, usuarioId }) {
  const { rows } = await client.query(
    `INSERT INTO movimentacoes (produto_id, tipo, quantidade, saldo_resultante, observacao, usuario_id)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [produtoId, tipo, quantidade, saldoResultante, observacao, usuarioId],
  );
  return buscarPorId(rows[0].id, client);
}

module.exports = { listar, buscarPorId, criar };
