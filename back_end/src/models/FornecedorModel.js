/**
 * Model de fornecedores: acesso à tabela "fornecedores".
 */
const db = require('../config/db');

const SELECT = `
  SELECT f.id, f.nome, f.cnpj, f.telefone, f.email, f.criado_em AS "criadoEm",
         (SELECT COUNT(*) FROM produtos p WHERE p.fornecedor_id = f.id AND p.ativo) AS "totalProdutos",
         (SELECT COUNT(*) FROM contas_pagar c WHERE c.fornecedor_id = f.id AND c.status = 'PENDENTE') AS "contasPendentes"
  FROM fornecedores f`;

async function listar({ busca } = {}) {
  const parametros = [];
  let where = '';
  if (busca) {
    parametros.push(`%${busca}%`);
    where = `WHERE f.nome ILIKE $1 OR f.cnpj LIKE $1 OR f.email ILIKE $1`;
  }
  const { rows } = await db.query(`${SELECT} ${where} ORDER BY f.nome`, parametros);
  return rows;
}

async function buscarPorId(id) {
  const { rows } = await db.query(`${SELECT} WHERE f.id = $1`, [id]);
  return rows[0] || null;
}

async function criar({ nome, cnpj, telefone, email }) {
  const { rows } = await db.query(
    `INSERT INTO fornecedores (nome, cnpj, telefone, email) VALUES ($1, $2, $3, $4) RETURNING id`,
    [nome, cnpj, telefone, email],
  );
  return buscarPorId(rows[0].id);
}

async function atualizar(id, { nome, cnpj, telefone, email }) {
  const { rowCount } = await db.query(
    `UPDATE fornecedores SET nome = $1, cnpj = $2, telefone = $3, email = $4 WHERE id = $5`,
    [nome, cnpj, telefone, email, id],
  );
  return rowCount ? buscarPorId(id) : null;
}

/** Quantos produtos (inclusive inativos) e contas estão ligados ao fornecedor. */
async function contarVinculos(id) {
  const { rows } = await db.query(
    `SELECT (SELECT COUNT(*) FROM produtos WHERE fornecedor_id = $1)
          + (SELECT COUNT(*) FROM contas_pagar WHERE fornecedor_id = $1) AS total`,
    [id],
  );
  return rows[0].total;
}

async function excluir(id) {
  const { rowCount } = await db.query('DELETE FROM fornecedores WHERE id = $1', [id]);
  return rowCount > 0;
}

module.exports = { listar, buscarPorId, criar, atualizar, contarVinculos, excluir };
