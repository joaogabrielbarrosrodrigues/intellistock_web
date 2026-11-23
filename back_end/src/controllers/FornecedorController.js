/**
 * Controller de fornecedores (CRUD).
 */
const FornecedorModel = require('../models/FornecedorModel');
const AppError = require('../utils/AppError');
const v = require('../utils/validacao');

function lerDados(body) {
  return {
    nome: v.texto(body.nome, 'Nome', { obrigatorio: true, max: 150 }),
    cnpj: v.cnpj(body.cnpj),
    telefone: v.texto(body.telefone, 'Telefone', { max: 20 }),
    email: v.email(body.email),
  };
}

// GET /api/fornecedores?busca=
async function listar(req, res) {
  const busca = v.texto(req.query.busca, 'Busca', { max: 100 });
  res.json(await FornecedorModel.listar({ busca }));
}

// GET /api/fornecedores/:id
async function buscar(req, res) {
  const fornecedor = await FornecedorModel.buscarPorId(v.id(req.params.id));
  if (!fornecedor) throw new AppError(404, 'Fornecedor não encontrado.');
  res.json(fornecedor);
}

// POST /api/fornecedores
async function criar(req, res) {
  const fornecedor = await FornecedorModel.criar(lerDados(req.body));
  res.status(201).json(fornecedor);
}

// PUT /api/fornecedores/:id
async function atualizar(req, res) {
  const fornecedor = await FornecedorModel.atualizar(v.id(req.params.id), lerDados(req.body));
  if (!fornecedor) throw new AppError(404, 'Fornecedor não encontrado.');
  res.json(fornecedor);
}

// DELETE /api/fornecedores/:id
async function excluir(req, res) {
  const id = v.id(req.params.id);
  if (!(await FornecedorModel.buscarPorId(id))) throw new AppError(404, 'Fornecedor não encontrado.');
  if ((await FornecedorModel.contarVinculos(id)) > 0) {
    throw new AppError(409, 'Fornecedor possui produtos ou contas vinculados e não pode ser excluído.');
  }
  await FornecedorModel.excluir(id);
  res.status(204).end();
}

module.exports = { listar, buscar, criar, atualizar, excluir };
