const { Router } = require('express');
const ProdutoController = require('../controllers/ProdutoController');

const router = Router();

router.get('/', ProdutoController.listar);
router.get('/:id', ProdutoController.buscar);
router.post('/', ProdutoController.criar);
router.put('/:id', ProdutoController.atualizar);
router.delete('/:id', ProdutoController.excluir);
router.patch('/:id/reativar', ProdutoController.reativar);

module.exports = router;
