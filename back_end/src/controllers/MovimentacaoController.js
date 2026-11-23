/**
 * Controller de movimentações: registra entradas/saídas e lista o extrato.
 */
const db = require('../config/db');
const ProdutoModel = require('../models/ProdutoModel');
const MovimentacaoModel = require('../models/MovimentacaoModel');
const AppError = require('../utils/AppError');
const v = require('../utils/validacao');

const QUANTIDADE_MAXIMA = 999999999999.999;

function formatarQuantidade(n) {
  return Number(n).toLocaleString('pt-BR', { maximumFractionDigits: 3 });
}

// GET /api/movimentacoes?produtoId=&tipo=&inicio=&fim=&limite=
async function listar(req, res) {
  const filtros = {
    produtoId: v.id(req.query.produtoId, 'Produto', { obrigatorio: false }),
    tipo: v.opcao(req.query.tipo, 'Tipo', ['ENTRADA', 'SAIDA']),
    inicio: v.data(req.query.inicio, 'Data inicial'),
    fim: v.data(req.query.fim, 'Data final'),
    limite: v.inteiro(req.query.limite, 'Limite', { min: 1, max: 500, padrao: 100 }),
  };
  if (filtros.inicio && filtros.fim && filtros.inicio > filtros.fim) {
    throw new AppError(400, 'Data inicial deve ser anterior ou igual à data final.');
  }
  res.json(await MovimentacaoModel.listar(filtros));
}

// POST /api/movimentacoes  { produtoId, tipo, quantidade, observacao }
async function registrar(req, res) {
  const produtoId = v.id(req.body.produtoId, 'Produto');
  const tipo = v.opcao(req.body.tipo, 'Tipo', ['ENTRADA', 'SAIDA'], { obrigatorio: true });
  const quantidade = v.numero(req.body.quantidade, 'Quantidade', { obrigatorio: true, maiorQueZero: true });
  const observacao = v.texto(req.body.observacao, 'Observação', { max: 500 });

  const movimentacao = await db.transacao(async (client) => {
    // Trava o produto para que duas saídas simultâneas não deixem o saldo negativo.
    const produto = await ProdutoModel.buscarParaAtualizar(client, produtoId);
    if (!produto) throw new AppError(404, 'Produto não encontrado.');
    if (!produto.ativo) throw new AppError(400, 'Produto inativo não pode receber movimentações.');

    let novoSaldo;
    if (tipo === 'SAIDA') {
      if (quantidade > produto.quantidade) {
        throw new AppError(400, `Estoque insuficiente. Disponível: ${formatarQuantidade(produto.quantidade)} ${produto.unidadeMedida}.`);
      }
      novoSaldo = produto.quantidade - quantidade;
    } else {
      novoSaldo = produto.quantidade + quantidade;
      if (novoSaldo > QUANTIDADE_MAXIMA) throw new AppError(400, 'A entrada ultrapassa o limite de quantidade em estoque.');
    }
    novoSaldo = Math.round(novoSaldo * 1000) / 1000;

    await ProdutoModel.atualizarQuantidade(client, produtoId, novoSaldo);
    return MovimentacaoModel.criar(client, {
      produtoId, tipo, quantidade, saldoResultante: novoSaldo, observacao, usuarioId: req.usuario.id,
    });
  });

  res.status(201).json(movimentacao);
}

module.exports = { listar, registrar };
