/**
 * Ponto de entrada: carrega o .env, testa o banco e inicia o servidor HTTP.
 */
require('dotenv').config();

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 16) {
  console.error('Defina JWT_SECRET no arquivo .env (pelo menos 16 caracteres). Veja o .env.example.');
  process.exit(1);
}

const app = require('./app');
const db = require('./config/db');

const PORTA = Number(process.env.PORT) || 3000;

async function iniciar() {
  try {
    await db.query('SELECT 1');
    console.log('Conectado ao PostgreSQL.');
  } catch (erro) {
    console.error('Não foi possível conectar ao PostgreSQL:', erro.message);
    console.error('Confira o arquivo .env e execute "npm run db:setup" para criar o banco.');
    process.exit(1);
  }

  app.listen(PORTA, () => {
    console.log(`IntelliStock Web rodando em http://localhost:${PORTA}`);
  });
}

iniciar();
