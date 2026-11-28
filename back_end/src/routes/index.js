/**
 * Agrupa todas as rotas da API sob o prefixo /api.
 * Os módulos com persistência ficam disponíveis no modo PostgreSQL.
 */
const { Router } = require('express');
const db = require('../config/db');
const { fonteDashboard, fonteValida } = require('../config/dashboard');
const autenticar = require('../middlewares/autenticacao');
const DashboardController = require('../controllers/DashboardController');
const AppError = require('../utils/AppError');

const router = Router();

router.use((req, res, next) => {
  res.locals.fonteDashboard = fonteDashboard();
  if (!fonteValida(res.locals.fonteDashboard)) {
    return next(new AppError(500, 'DASHBOARD_DATA_SOURCE deve ser mock ou postgres.'));
  }
  return next();
});

// Verifica se a API e o banco estão respondendo
router.get('/status', async (req, res) => {
  if (res.locals.fonteDashboard === 'mock') {
    return res.json({ api: 'ok', banco: 'desativado' });
  }
  await db.query('SELECT 1');
  res.json({ api: 'ok', banco: 'ok' });
});

router.get('/dashboard', (req, res, next) => {
  if (res.locals.fonteDashboard === 'mock') {
    return DashboardController.resumoMock(req, res);
  }
  return autenticar(req, res, next);
}, DashboardController.resumo);

function somentePostgres(req, res, next) {
  if (res.locals.fonteDashboard === 'mock') {
    return next(new AppError(503, 'Este módulo está disponível no modo PostgreSQL.'));
  }
  return next();
}

router.use('/auth', somentePostgres, require('./authRoutes'));
router.use('/fornecedores', somentePostgres, autenticar, require('./fornecedorRoutes'));
router.use('/produtos', somentePostgres, autenticar, require('./produtoRoutes'));
router.use('/movimentacoes', somentePostgres, autenticar, require('./movimentacaoRoutes'));
router.use('/contas', somentePostgres, autenticar, require('./contaPagarRoutes'));
router.use('/analises', somentePostgres, autenticar, require('./analiseRoutes'));

module.exports = router;
