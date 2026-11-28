/**
 * Conexão com o PostgreSQL usando um pool de conexões (biblioteca "pg").
 */
const path = require('node:path');
const { Pool, types } = require('pg');

require('dotenv').config({ path: path.resolve(__dirname, '..', '..', '.env') });

// Por padrão o "pg" devolve NUMERIC e BIGINT como texto. Convertemos para número.
types.setTypeParser(1700, (valor) => (valor === null ? null : parseFloat(valor))); // NUMERIC
types.setTypeParser(20, (valor) => (valor === null ? null : parseInt(valor, 10))); // BIGINT (COUNT)
// Colunas DATE ficam como texto "AAAA-MM-DD" para não sofrer conversão de fuso horário.
types.setTypeParser(1082, (valor) => valor);

const config = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'intellistock_web',
  ssl: process.env.DB_SSL === 'true',
  connectionTimeoutMillis: 5000,
  // Todas as datas ("hoje", início do dia etc.) seguem o horário de Brasília.
  options: '-c timezone=America/Sao_Paulo',
};

const pool = new Pool(config);
pool.on('error', (erro) => console.error('Erro em conexão ociosa do PostgreSQL:', erro.code || erro.message));

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
  let erroRollback;
  try {
    await client.query('BEGIN');
    const resultado = await funcao(client);
    await client.query('COMMIT');
    return resultado;
  } catch (erro) {
    try {
      await client.query('ROLLBACK');
    } catch (falha) {
      erroRollback = falha;
    }
    throw erro;
  } finally {
    // Se o rollback falhar, o pool descarta este cliente.
    client.release(erroRollback);
  }
}

module.exports = { config, pool, query, transacao };
