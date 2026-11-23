/**
 * Controller de autenticação: cadastro, login e dados do usuário logado.
 */
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const UsuarioModel = require('../models/UsuarioModel');
const AppError = require('../utils/AppError');
const v = require('../utils/validacao');

function gerarToken(usuario) {
  return jwt.sign(
    { sub: usuario.id, nome: usuario.nome, email: usuario.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' },
  );
}

function validarSenha(senha) {
  if (typeof senha !== 'string' || senha.length < 6) {
    throw new AppError(400, 'A senha deve ter pelo menos 6 caracteres.');
  }
  if (Buffer.byteLength(senha, 'utf8') > 72) {
    throw new AppError(400, 'Senha muito longa. Use no máximo 72 caracteres.');
  }
}

// POST /api/auth/cadastro
async function cadastrar(req, res) {
  const nome = v.texto(req.body.nome, 'Nome', { obrigatorio: true, max: 120 });
  const email = v.email(req.body.email, 'E-mail', { obrigatorio: true });
  validarSenha(req.body.senha);

  if (await UsuarioModel.buscarPorEmail(email)) {
    throw new AppError(409, 'E-mail já cadastrado.');
  }
  const senhaHash = await bcrypt.hash(req.body.senha, 10);
  const usuario = await UsuarioModel.criar({ nome, email, senhaHash });
  res.status(201).json({ token: gerarToken(usuario), usuario });
}

// POST /api/auth/login
async function login(req, res) {
  const email = v.email(req.body.email, 'E-mail', { obrigatorio: true });
  const senha = typeof req.body.senha === 'string' ? req.body.senha : '';

  const usuario = await UsuarioModel.buscarPorEmail(email);
  const senhaConfere = usuario && senha && (await bcrypt.compare(senha, usuario.senhaHash));
  if (!senhaConfere) {
    throw new AppError(401, 'E-mail ou senha inválidos.');
  }
  delete usuario.senhaHash;
  res.json({ token: gerarToken(usuario), usuario });
}

// GET /api/auth/me
async function eu(req, res) {
  const usuario = await UsuarioModel.buscarPorId(req.usuario.id);
  if (!usuario) throw new AppError(401, 'Usuário não encontrado. Faça login novamente.');
  res.json(usuario);
}

module.exports = { cadastrar, login, eu };
