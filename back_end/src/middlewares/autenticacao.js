/**
 * Middleware que protege as rotas: exige o cabeçalho
 *   Authorization: Bearer <token>
 * e coloca os dados do usuário logado em req.usuario.
 */
const jwt = require('jsonwebtoken');
const AppError = require('../utils/AppError');

function autenticar(req, res, next) {
  const [tipo, token] = (req.headers.authorization || '').split(' ');
  if (tipo !== 'Bearer' || !token) {
    return next(new AppError(401, 'Faça login para continuar.'));
  }
  try {
    const dados = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = { id: dados.sub, nome: dados.nome, email: dados.email };
    return next();
  } catch {
    return next(new AppError(401, 'Sessão expirada ou inválida. Faça login novamente.'));
  }
}

module.exports = autenticar;
