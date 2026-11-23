/**
 * Model de contas a pagar: acesso à tabela "contas_pagar".
 * O status VENCIDA é calculado na consulta (PENDENTE com vencimento antes de hoje).
 */
const db = require('../config/db');

const STATUS_EFETIVO = `CASE WHEN c.status = 'PENDENTE' AND c.data_vencimento < CURRENT_DATE
                             THEN 'VENCIDA' ELSE c.status END`;

const SELECT = `
  SELECT c.id, c.fornecedor_id AS "fornecedorId", f.nome AS "fornecedorNome",
         c.descricao, c.valor, c.data_vencimento AS "dataVencimento",
         c.data_pagamento AS "dataPagamento", c.status AS "statusGravado",
         ${STATUS_EFETIVO} AS status,
         (c.data_vencimento - CURRENT_DATE) AS "diasParaVencer",
         c.observacao, c.criado_em AS "criadoEm"
  FROM contas_pagar c
  JOIN fornecedores f ON f.id = c.fornecedor_id`;

async function listar({ status, fornecedorId, busca, inicio, fim } = {}) {
  const condicoes = [];
  const parametros = [];
  const adicionar = (sql, valor) => {
    parametros.push(valor);
    condicoes.push(sql.replaceAll('?', `$${parametros.length}`));
  };
  if (status) adicionar(`${STATUS_EFETIVO} = ?`, status);
  if (fornecedorId) adicionar('c.fornecedor_id = ?', fornecedorId);
  if (busca) adicionar('(c.descricao ILIKE ? OR f.nome ILIKE ?)', `%${busca}%`);
  if (inicio) adicionar('c.data_vencimento >= ?', inicio);
  if (fim) adicionar('c.data_vencimento <= ?', fim);
  const where = condicoes.length ? `WHERE ${condicoes.join(' AND ')}` : '';
  const { rows } = await db.query(`${SELECT} ${where} ORDER BY c.data_vencimento, c.descricao`, parametros);
  return rows;
}

async function buscarPorId(id) {
  const { rows } = await db.query(`${SELECT} WHERE c.id = $1`, [id]);
  return rows[0] || null;
}

async function criar({ fornecedorId, descricao, valor, dataVencimento, observacao }) {
  const { rows } = await db.query(
    `INSERT INTO contas_pagar (fornecedor_id, descricao, valor, data_vencimento, observacao)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [fornecedorId, descricao, valor, dataVencimento, observacao],
  );
  return buscarPorId(rows[0].id);
}

async function atualizar(id, { fornecedorId, descricao, valor, dataVencimento, observacao }) {
  await db.query(
    `UPDATE contas_pagar
     SET fornecedor_id = $1, descricao = $2, valor = $3, data_vencimento = $4, observacao = $5, atualizado_em = NOW()
     WHERE id = $6`,
    [fornecedorId, descricao, valor, dataVencimento, observacao, id],
  );
  return buscarPorId(id);
}

async function alterarStatus(id, status, dataPagamento = null) {
  await db.query(
    `UPDATE contas_pagar SET status = $1, data_pagamento = $2, atualizado_em = NOW() WHERE id = $3`,
    [status, dataPagamento, id],
  );
  return buscarPorId(id);
}

async function excluir(id) {
  const { rowCount } = await db.query('DELETE FROM contas_pagar WHERE id = $1', [id]);
  return rowCount > 0;
}

module.exports = { listar, buscarPorId, criar, atualizar, alterarStatus, excluir };
