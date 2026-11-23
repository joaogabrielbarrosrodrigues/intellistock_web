/**
 * Agrupa todas as rotas da API sob o prefixo /api.
 * As rotas depois de "autenticar" exigem login (token JWT).
 */
const { Router } = require('express');
const db = require('../config/db');
const autenticar = require('../middlewares/autenticacao');
const DashboardController = require('../controllers/DashboardController');

const router = Router();

// Verifica se a API e o banco estão respondendo
router.get('/status', async (req, res) => {
  await db.query('SELECT 1');
  res.json({ api: 'ok', banco: 'ok' });
});

// Rotas públicas
router.use('/auth', require('./authRoutes'));

// Rotas protegidas
router.use(autenticar);
router.get('/dashboard', DashboardController.resumo);
router.use('/fornecedores', require('./fornecedorRoutes'));
router.use('/produtos', require('./produtoRoutes'));
router.use('/movimentacoes', require('./movimentacaoRoutes'));
router.use('/contas', require('./contaPagarRoutes'));
router.use('/analises', require('./analiseRoutes'));

module.exports = router;
