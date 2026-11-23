/**
 * Model de usuários: acesso à tabela "usuarios".
 */
const db = require('../config/db');

const CAMPOS = 'id, nome, email, criado_em AS "criadoEm"';

async function buscarPorEmail(email) {
  const { rows } = await db.query(`SELECT ${CAMPOS}, senha_hash AS "senhaHash" FROM usuarios WHERE email = $1`, [email]);
  return rows[0] || null;
}

async function buscarPorId(id) {
  const { rows } = await db.query(`SELECT ${CAMPOS} FROM usuarios WHERE id = $1`, [id]);
  return rows[0] || null;
}

async function criar({ nome, email, senhaHash }) {
  const { rows } = await db.query(
    `INSERT INTO usuarios (nome, email, senha_hash) VALUES ($1, $2, $3) RETURNING ${CAMPOS}`,
    [nome, email, senhaHash],
  );
  return rows[0];
}

module.exports = { buscarPorEmail, buscarPorId, criar };
