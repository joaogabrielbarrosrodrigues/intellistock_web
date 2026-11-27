const { Router } = require('express');
const MovimentacaoController = require('../controllers/MovimentacaoController');

const router = Router();

router.get('/', MovimentacaoController.listar);
router.get('/:id', MovimentacaoController.buscar);
router.post('/', MovimentacaoController.registrar);

module.exports = router;
