/**
 * Controller de contas a pagar: CRUD + pagar, cancelar e reabrir.
 */
const ContaPagarModel = require('../models/ContaPagarModel');
const FornecedorModel = require('../models/FornecedorModel');
const AppError = require('../utils/AppError');
const v = require('../utils/validacao');

async function lerDados(body) {
  const dados = {
    fornecedorId: v.id(body.fornecedorId, 'Fornecedor'),
    descricao: v.texto(body.descricao, 'Descrição', { obrigatorio: true, max: 255 }),
    valor: v.numero(body.valor, 'Valor', { obrigatorio: true, maiorQueZero: true, max: 9999999999999 }),
    dataVencimento: v.data(body.dataVencimento, 'Data de vencimento', { obrigatorio: true }),
    observacao: v.texto(body.observacao, 'Observação', { max: 500 }),
  };
  if (!(await FornecedorModel.buscarPorId(dados.fornecedorId))) {
    throw new AppError(400, 'Fornecedor informado não existe.');
  }
  return dados;
}

async function buscarOuFalhar(id) {
  const conta = await ContaPagarModel.buscarPorId(id);
  if (!conta) throw new AppError(404, 'Conta não encontrada.');
  return conta;
}

function exigirEmAberto(conta, mensagem) {
  if (conta.statusGravado !== 'PENDENTE') throw new AppError(400, mensagem);
}

// GET /api/contas?status=PENDENTE|VENCIDA|PAGA|CANCELADA&fornecedorId=&busca=&inicio=&fim=
async function listar(req, res) {
  const filtros = {
    status: v.opcao(req.query.status, 'Status', ['PENDENTE', 'VENCIDA', 'PAGA', 'CANCELADA']),
    fornecedorId: v.id(req.query.fornecedorId, 'Fornecedor', { obrigatorio: false }),
    busca: v.texto(req.query.busca, 'Busca', { max: 100 }),
    inicio: v.data(req.query.inicio, 'Data inicial'),
    fim: v.data(req.query.fim, 'Data final'),
  };
  if (filtros.inicio && filtros.fim && filtros.inicio > filtros.fim) {
    throw new AppError(400, 'Data inicial deve ser anterior ou igual à data final.');
  }
  res.json(await ContaPagarModel.listar(filtros));
}

// GET /api/contas/:id
async function buscar(req, res) {
  res.json(await buscarOuFalhar(v.id(req.params.id)));
}

// POST /api/contas
async function criar(req, res) {
  res.status(201).json(await ContaPagarModel.criar(await lerDados(req.body)));
}

// PUT /api/contas/:id
async function atualizar(req, res) {
  const id = v.id(req.params.id);
  exigirEmAberto(await buscarOuFalhar(id), 'Somente contas em aberto podem ser editadas.');
  res.json(await ContaPagarModel.atualizar(id, await lerDados(req.body)));
}

// PATCH /api/contas/:id/pagar  { dataPagamento? }
async function pagar(req, res) {
  const id = v.id(req.params.id);
  exigirEmAberto(await buscarOuFalhar(id), 'Somente contas em aberto podem ser pagas.');
  const dataPagamento = v.data(req.body?.dataPagamento, 'Data de pagamento') || new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
  res.json(await ContaPagarModel.alterarStatus(id, 'PAGA', dataPagamento));
}

// PATCH /api/contas/:id/cancelar
async function cancelar(req, res) {
  const id = v.id(req.params.id);
  exigirEmAberto(await buscarOuFalhar(id), 'Somente contas em aberto podem ser canceladas.');
  res.json(await ContaPagarModel.alterarStatus(id, 'CANCELADA'));
}

// PATCH /api/contas/:id/reabrir
async function reabrir(req, res) {
  const id = v.id(req.params.id);
  const conta = await buscarOuFalhar(id);
  if (conta.statusGravado === 'PENDENTE') throw new AppError(400, 'A conta já está em aberto.');
  res.json(await ContaPagarModel.alterarStatus(id, 'PENDENTE'));
}

// DELETE /api/contas/:id
async function excluir(req, res) {
  if (!(await ContaPagarModel.excluir(v.id(req.params.id)))) throw new AppError(404, 'Conta não encontrada.');
  res.status(204).end();
}

module.exports = { listar, buscar, criar, atualizar, pagar, cancelar, reabrir, excluir };
