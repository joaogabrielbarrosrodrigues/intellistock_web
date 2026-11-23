const { Router } = require('express');
const ContaPagarController = require('../controllers/ContaPagarController');

const router = Router();

router.get('/', ContaPagarController.listar);
router.get('/:id', ContaPagarController.buscar);
router.post('/', ContaPagarController.criar);
router.put('/:id', ContaPagarController.atualizar);
router.delete('/:id', ContaPagarController.excluir);
router.patch('/:id/pagar', ContaPagarController.pagar);
router.patch('/:id/cancelar', ContaPagarController.cancelar);
router.patch('/:id/reabrir', ContaPagarController.reabrir);

module.exports = router;
