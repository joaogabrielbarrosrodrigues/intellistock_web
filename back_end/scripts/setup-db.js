/**
 * Script de configuração do banco de dados.
 *
 * 1. Cria o banco informado em DB_NAME (se ainda não existir);
 * 2. Executa database/schema.sql (cria as tabelas);
 * 3. Insere dados de exemplo em uma instalação nova, exceto com "--sem-dados".
 *
 * Uso: npm run db:setup            (tabelas + dados de exemplo)
 *      npm run db:setup -- --sem-dados
 */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const { config, pool, transacao } = require('../src/config/db');

const nomeBanco = config.database;
const semDados = process.argv.includes('--sem-dados');

async function criarBancoSeNecessario() {
  const client = new Client({ ...config, database: 'postgres' });
  await client.connect();
  try {
    // A trava é liberada ao encerrar a conexão, inclusive se a criação falhar.
    await client.query('SELECT pg_advisory_lock(hashtext($1))', [`intellistock:criar:${nomeBanco}`]);
    const { rowCount } = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [nomeBanco]);
    if (rowCount > 0) return;

    // Nome de banco não aceita parâmetro ($1), por isso é escapado manualmente.
    await client.query(`CREATE DATABASE "${nomeBanco.replace(/"/g, '""')}"`);
    console.log(`Banco "${nomeBanco}" criado.`);
  } finally {
    await client.end();
  }
}

async function executarScript(client, arquivo) {
  const sql = fs.readFileSync(path.join(__dirname, '..', 'database', arquivo), 'utf8');
  await client.query(sql);
}

async function main() {
  try {
    await criarBancoSeNecessario();
    const adicionouAmostra = await transacao(async (client) => {
      await client.query("SELECT pg_advisory_xact_lock(hashtext('intellistock:schema'))");
      const { rows } = await client.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_schema = current_schema()
            AND table_name IN ('usuarios', 'fornecedores', 'produtos', 'movimentacoes', 'contas_pagar')
        ) AS "jaInstalado"`);
      await executarScript(client, 'schema.sql');

      if (semDados || rows[0].jaInstalado) return false;
      await executarScript(client, 'seed.sql');
      return true;
    });

    if (adicionouAmostra) {
      console.log('Login de demonstração: demo@intellistock.com / demo123');
    } else if (!semDados) {
      console.log('Dados de exemplo ignorados. O esquema do IntelliStock já existia.');
    }
    console.log('Banco de dados pronto!');
  } finally {
    await pool.end();
  }
}

main().catch((erro) => {
  console.error('Falha ao configurar o banco:', erro.message);
  console.error('Confira as variáveis DB_* no arquivo .env e se o PostgreSQL está em execução.');
  process.exit(1);
});
