/**
 * Controller de produtos (CRUD).
 * A quantidade em estoque NÃO é editada diretamente: ela muda pelas movimentações.
 */
const db = require('../config/db');
const ProdutoModel = require('../models/ProdutoModel');
const FornecedorModel = require('../models/FornecedorModel');
const MovimentacaoModel = require('../models/MovimentacaoModel');
const AppError = require('../utils/AppError');
const v = require('../utils/validacao');

async function lerDados(body) {
  const dados = {
    nome: v.texto(body.nome, 'Nome', { obrigatorio: true, max: 150 }),
    descricao: v.texto(body.descricao, 'Descrição', { max: 500 }),
    unidadeMedida: v.opcao(body.unidadeMedida, 'Unidade de medida', v.UNIDADES, { obrigatorio: true }),
    estoqueMinimo: v.numero(body.estoqueMinimo, 'Estoque mínimo', { padrao: 0 }),
    preco: v.numero(body.preco, 'Preço', { padrao: 0 }),
    fornecedorId: v.id(body.fornecedorId, 'Fornecedor', { obrigatorio: false }),
  };
  if (dados.fornecedorId && !(await FornecedorModel.buscarPorId(dados.fornecedorId))) {
    throw new AppError(400, 'Fornecedor informado não existe.');
  }
  return dados;
}

// GET /api/produtos?busca=&status=ativos|inativos|todos&situacao=BAIXO|SEM_ESTOQUE&fornecedorId=
async function listar(req, res) {
  const filtros = {
    busca: v.texto(req.query.busca, 'Busca', { max: 100 }),
    status: ['ativos', 'inativos', 'todos'].includes(req.query.status) ? req.query.status : 'ativos',
    situacao: v.opcao(req.query.situacao, 'Situação', ['BAIXO', 'SEM_ESTOQUE']),
    fornecedorId: v.id(req.query.fornecedorId, 'Fornecedor', { obrigatorio: false }),
  };
  res.json(await ProdutoModel.listar(filtros));
}

// GET /api/produtos/:id
async function buscar(req, res) {
  const produto = await ProdutoModel.buscarPorId(v.id(req.params.id));
  if (!produto) throw new AppError(404, 'Produto não encontrado.');
  res.json(produto);
}

// POST /api/produtos  (aceita "quantidadeInicial", que gera uma ENTRADA no extrato)
async function criar(req, res) {
  const dados = await lerDados(req.body);
  const quantidadeInicial = v.numero(req.body.quantidadeInicial, 'Quantidade inicial', { padrao: 0 });

  const produto = await db.transacao(async (client) => {
    const id = await ProdutoModel.criar(client, dados);
    if (quantidadeInicial > 0) {
      await ProdutoModel.atualizarQuantidade(client, id, quantidadeInicial);
      await MovimentacaoModel.criar(client, {
        produtoId: id,
        tipo: 'ENTRADA',
        quantidade: quantidadeInicial,
        saldoResultante: quantidadeInicial,
        observacao: 'Estoque inicial',
        usuarioId: req.usuario.id,
      });
    }
    return ProdutoModel.buscarPorId(id, client);
  });
  res.status(201).json(produto);
}

// PUT /api/produtos/:id
async function atualizar(req, res) {
  const produto = await ProdutoModel.atualizar(v.id(req.params.id), await lerDados(req.body));
  if (!produto) throw new AppError(404, 'Produto não encontrado.');
  res.json(produto);
}

// DELETE /api/produtos/:id
// Produto com histórico é apenas desativado, para preservar o extrato.
async function excluir(req, res) {
  const id = v.id(req.params.id);
  if (!(await ProdutoModel.buscarPorId(id))) throw new AppError(404, 'Produto não encontrado.');
  if (await ProdutoModel.possuiMovimentacoes(id)) {
    await ProdutoModel.definirAtivo(id, false);
    return res.json({ mensagem: 'Produto possui movimentações e foi desativado.', desativado: true });
  }
  await ProdutoModel.excluir(id);
  return res.json({ mensagem: 'Produto excluído.', desativado: false });
}

// PATCH /api/produtos/:id/reativar
async function reativar(req, res) {
  const id = v.id(req.params.id);
  if (!(await ProdutoModel.definirAtivo(id, true))) throw new AppError(404, 'Produto não encontrado.');
  res.json(await ProdutoModel.buscarPorId(id));
}

module.exports = { listar, buscar, criar, atualizar, excluir, reativar };
