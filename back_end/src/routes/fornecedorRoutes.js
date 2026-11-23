const { Router } = require('express');
const FornecedorController = require('../controllers/FornecedorController');

const router = Router();

router.get('/', FornecedorController.listar);
router.get('/:id', FornecedorController.buscar);
router.post('/', FornecedorController.criar);
router.put('/:id', FornecedorController.atualizar);
router.delete('/:id', FornecedorController.excluir);

module.exports = router;
