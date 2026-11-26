require('dotenv').config();
const { Pool, types } = require('pg');

types.setTypeParser(1700, (valor) => (valor === null ? null : parseFloat(valor)));
types.setTypeParser(20, (valor) => (valor === null ? null : parseInt(valor, 10)));

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'intellistock_web',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
  options: '-c timezone=America/Sao_Paulo'
});

pool.on('error', (erro) => console.error('Erro inesperado no pool do PostgreSQL:', erro.message));

const query = (texto, parametros) => pool.query(texto, parametros);

async function transaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const resultado = await callback(client);
    await client.query('COMMIT');
    return resultado;
  } catch (erro) {
    await client.query('ROLLBACK');
    throw erro;
  } finally {
    client.release();
  }
}

module.exports = { pool, query, transaction };
