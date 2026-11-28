/**
 * Ponto de entrada: carrega o .env, testa o banco e inicia o servidor HTTP.
 */
const app = require('./app');
const db = require('./config/db');
const { fonteDashboard, fonteValida } = require('./config/dashboard');

const PORTA = Number(process.env.PORT) || 3000;

async function iniciar() {
  const fonte = fonteDashboard();
  if (!fonteValida(fonte)) {
    console.error('DASHBOARD_DATA_SOURCE deve ser mock ou postgres.');
    process.exit(1);
  }

  if (fonte === 'postgres') {
    if ((process.env.JWT_SECRET || '').length < 16) {
      console.error('Defina JWT_SECRET no arquivo .env (pelo menos 16 caracteres). Veja o .env.example.');
      process.exit(1);
    }

    try {
      await db.query('SELECT 1');
      console.log('Conectado ao PostgreSQL.');
    } catch (erro) {
      console.error('Não foi possível conectar ao PostgreSQL:', erro.code || erro.message);
      console.error('Confira as variáveis DB_* no arquivo .env e se o banco foi criado.');
      process.exit(1);
    }
  }

  app.listen(PORTA, () => {
    console.log(`IntelliStock Web rodando em http://localhost:${PORTA} (${fonte})`);
  });
}

iniciar();
