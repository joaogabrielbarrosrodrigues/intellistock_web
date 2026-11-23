/**
 * Script de configuração do banco de dados.
 *
 * 1. Cria o banco informado em DB_NAME (se ainda não existir);
 * 2. Executa database/schema.sql (cria as tabelas);
 * 3. Executa database/seed.sql (dados de exemplo), exceto com "--sem-dados".
 *
 * Uso: npm run db:setup            (tabelas + dados de exemplo)
 *      npm run db:setup -- --sem-dados
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const config = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
};
const nomeBanco = process.env.DB_NAME || 'intellistock_web';
const semDados = process.argv.includes('--sem-dados');

async function criarBancoSeNecessario() {
  const client = new Client({ ...config, database: 'postgres' });
  await client.connect();
  try {
    const { rowCount } = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [nomeBanco]);
    if (rowCount === 0) {
      // Nome de banco não aceita parâmetro ($1), por isso é escapado manualmente.
      await client.query(`CREATE DATABASE "${nomeBanco.replace(/"/g, '""')}"`);
      console.log(`Banco "${nomeBanco}" criado.`);
    } else {
      console.log(`Banco "${nomeBanco}" já existe.`);
    }
  } finally {
    await client.end();
  }
}

async function executarScript(client, arquivo) {
  const sql = fs.readFileSync(path.join(__dirname, '..', 'database', arquivo), 'utf8');
  await client.query(sql);
  console.log(`Script ${arquivo} executado.`);
}

async function main() {
  await criarBancoSeNecessario();
  const client = new Client({ ...config, database: nomeBanco });
  await client.connect();
  try {
    await executarScript(client, 'schema.sql');
    if (!semDados) {
      await executarScript(client, 'seed.sql');
      console.log('Login de demonstração: demo@intellistock.com / demo123');
    }
    console.log('Banco de dados pronto!');
  } finally {
    await client.end();
  }
}

main().catch((erro) => {
  console.error('Falha ao configurar o banco:', erro.message);
  console.error('Confira as variáveis DB_* no arquivo .env e se o PostgreSQL está em execução.');
  process.exit(1);
});
