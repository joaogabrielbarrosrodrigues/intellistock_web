const { Router } = require('express');
const AnaliseController = require('../controllers/AnaliseController');

const router = Router();

router.get('/reposicao', AnaliseController.reposicao);
router.get('/consumo/:produtoId', AnaliseController.serieConsumo);

module.exports = router;
