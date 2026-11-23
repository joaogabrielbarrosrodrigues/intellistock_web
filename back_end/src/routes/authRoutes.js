const { Router } = require('express');
const AuthController = require('../controllers/AuthController');
const autenticar = require('../middlewares/autenticacao');

const router = Router();

router.post('/cadastro', AuthController.cadastrar);
router.post('/login', AuthController.login);
router.get('/me', autenticar, AuthController.eu);

module.exports = router;
