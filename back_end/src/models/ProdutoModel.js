/**
 * Model de produtos: acesso à tabela "produtos".
 */
const db = require('../config/db');

const SELECT = `
  SELECT p.id, p.nome, p.descricao, p.unidade_medida AS "unidadeMedida",
         p.quantidade, p.estoque_minimo AS "estoqueMinimo", p.preco,
         ROUND(p.quantidade * p.preco, 2) AS "valorEmEstoque",
         p.fornecedor_id AS "fornecedorId", f.nome AS "fornecedorNome",
         p.ativo, p.criado_em AS "criadoEm", p.atualizado_em AS "atualizadoEm",
         CASE WHEN p.quantidade = 0 THEN 'SEM_ESTOQUE'
              WHEN p.quantidade <= p.estoque_minimo THEN 'BAIXO'
              ELSE 'NORMAL' END AS situacao
  FROM produtos p
  LEFT JOIN fornecedores f ON f.id = p.fornecedor_id`;

/**
 * Lista produtos com filtros opcionais.
 * status: 'ativos' (padrão), 'inativos' ou 'todos'
 * situacao: 'BAIXO' (inclui sem estoque) ou 'SEM_ESTOQUE'
 */
async function listar({ busca, status = 'ativos', situacao, fornecedorId } = {}) {
  const condicoes = [];
  const parametros = [];
  if (status === 'ativos') condicoes.push('p.ativo');
  if (status === 'inativos') condicoes.push('NOT p.ativo');
  if (busca) {
    parametros.push(`%${busca}%`);
    condicoes.push(`(p.nome ILIKE $${parametros.length} OR p.descricao ILIKE $${parametros.length})`);
  }
  if (situacao === 'BAIXO') condicoes.push('p.quantidade <= p.estoque_minimo');
  if (situacao === 'SEM_ESTOQUE') condicoes.push('p.quantidade = 0');
  if (fornecedorId) {
    parametros.push(fornecedorId);
    condicoes.push(`p.fornecedor_id = $${parametros.length}`);
  }
  const where = condicoes.length ? `WHERE ${condicoes.join(' AND ')}` : '';
  const { rows } = await db.query(`${SELECT} ${where} ORDER BY p.nome`, parametros);
  return rows;
}

async function buscarPorId(id, client = db) {
  const { rows } = await client.query(`${SELECT} WHERE p.id = $1`, [id]);
  return rows[0] || null;
}

/** Busca e TRAVA a linha do produto até o fim da transação (evita saldo errado em acessos simultâneos). */
async function buscarParaAtualizar(client, id) {
  const { rows } = await client.query(
    `SELECT id, nome, unidade_medida AS "unidadeMedida", quantidade, ativo FROM produtos WHERE id = $1 FOR UPDATE`,
    [id],
  );
  return rows[0] || null;
}

async function criar(client, { nome, descricao, unidadeMedida, estoqueMinimo, preco, fornecedorId }) {
  const { rows } = await client.query(
    `INSERT INTO produtos (nome, descricao, unidade_medida, estoque_minimo, preco, fornecedor_id)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [nome, descricao, unidadeMedida, estoqueMinimo, preco, fornecedorId],
  );
  return rows[0].id;
}

async function atualizar(id, { nome, descricao, unidadeMedida, estoqueMinimo, preco, fornecedorId }) {
  const { rowCount } = await db.query(
    `UPDATE produtos
     SET nome = $1, descricao = $2, unidade_medida = $3, estoque_minimo = $4, preco = $5,
         fornecedor_id = $6, atualizado_em = NOW()
     WHERE id = $7`,
    [nome, descricao, unidadeMedida, estoqueMinimo, preco, fornecedorId, id],
  );
  return rowCount ? buscarPorId(id) : null;
}

async function atualizarQuantidade(client, id, quantidade) {
  await client.query('UPDATE produtos SET quantidade = $1, atualizado_em = NOW() WHERE id = $2', [quantidade, id]);
}

async function definirAtivo(id, ativo) {
  const { rowCount } = await db.query('UPDATE produtos SET ativo = $1, atualizado_em = NOW() WHERE id = $2', [ativo, id]);
  return rowCount > 0;
}

async function possuiMovimentacoes(id) {
  const { rows } = await db.query('SELECT EXISTS (SELECT 1 FROM movimentacoes WHERE produto_id = $1) AS existe', [id]);
  return rows[0].existe;
}

async function excluir(id) {
  const { rowCount } = await db.query('DELETE FROM produtos WHERE id = $1', [id]);
  return rowCount > 0;
}

module.exports = {
  listar, buscarPorId, buscarParaAtualizar, criar, atualizar,
  atualizarQuantidade, definirAtivo, possuiMovimentacoes, excluir,
};
