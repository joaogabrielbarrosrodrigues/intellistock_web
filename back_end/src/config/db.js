/**
 * Conexão com o PostgreSQL usando um pool de conexões (biblioteca "pg").
 */
const { Pool, types } = require('pg');

// Por padrão o "pg" devolve NUMERIC e BIGINT como texto. Convertemos para número.
types.setTypeParser(1700, (valor) => (valor === null ? null : parseFloat(valor))); // NUMERIC
types.setTypeParser(20, (valor) => (valor === null ? null : parseInt(valor, 10))); // BIGINT (COUNT)
// Colunas DATE ficam como texto "AAAA-MM-DD" para não sofrer conversão de fuso horário.
types.setTypeParser(1082, (valor) => valor);

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'intellistock_web',
  // Todas as datas ("hoje", início do dia etc.) seguem o horário de Brasília.
  options: '-c timezone=America/Sao_Paulo',
});

/** Executa uma consulta simples. */
function query(texto, parametros) {
  return pool.query(texto, parametros);
}

/**
 * Executa várias consultas dentro de uma transação.
 * Se qualquer passo falhar, tudo é desfeito (ROLLBACK).
 */
async function transacao(funcao) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const resultado = await funcao(client);
    await client.query('COMMIT');
    return resultado;
  } catch (erro) {
    await client.query('ROLLBACK');
    throw erro;
  } finally {
    client.release();
  }
}

module.exports = { pool, query, transacao };
