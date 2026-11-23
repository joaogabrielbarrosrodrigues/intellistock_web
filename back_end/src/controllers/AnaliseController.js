/**
 * Controller de análises: consumo dos produtos e sugestões de reposição.
 */
const AnaliseModel = require('../models/AnaliseModel');
const ProdutoModel = require('../models/ProdutoModel');
const AppError = require('../utils/AppError');
const v = require('../utils/validacao');
const calc = require('../utils/calculoReposicao');

/** Calcula consumo e reposição de todos os produtos ativos. */
async function calcularSugestoes(parametros) {
  const janela = calc.janela(parametros.diasAnalise);
  const produtos = await AnaliseModel.totaisDeSaidaPorProduto(parametros.diasAnalise);
  return produtos.map((produto) => {
    const consumo = calc.calcularConsumo(produto.totalAntigo, produto.totalRecente, janela);
    const reposicao = calc.calcularReposicao(produto, consumo, parametros);
    return {
      produtoId: produto.id,
      produtoNome: produto.nome,
      unidadeMedida: produto.unidadeMedida,
      fornecedorNome: produto.fornecedorNome,
      estoqueAtual: produto.quantidade,
      estoqueMinimo: produto.estoqueMinimo,
      preco: produto.preco,
      consumoPeriodo: consumo.total,
      mediaDiaria: consumo.mediaDiaria,
      mediaRecente: consumo.mediaRecente,
      tendencia: consumo.tendencia,
      variacaoPercentual: consumo.variacaoPercentual,
      ...reposicao,
    };
  });
}

function lerParametros(query) {
  return {
    diasAnalise: v.inteiro(query.dias, 'Dias de análise', { min: 2, max: 365, padrao: calc.PADROES.diasAnalise }),
    diasCobertura: v.inteiro(query.diasCobertura, 'Dias de cobertura', { min: 1, max: 365, padrao: calc.PADROES.diasCobertura }),
    prazoEntrega: v.inteiro(query.prazoEntrega, 'Prazo de entrega', { min: 0, max: 180, padrao: calc.PADROES.prazoEntrega }),
    diasSeguranca: v.inteiro(query.diasSeguranca, 'Dias de segurança', { min: 0, max: 180, padrao: calc.PADROES.diasSeguranca }),
  };
}

// GET /api/analises/reposicao?dias=30&diasCobertura=30&prazoEntrega=7&diasSeguranca=7&todos=true
async function reposicao(req, res) {
  const parametros = lerParametros(req.query);
  const incluirTodos = req.query.todos === 'true';
  const sugestoes = (await calcularSugestoes(parametros))
    .filter((s) => incluirTodos || s.precisaRepor)
    .sort(calc.ordenarSugestoes);
  res.json({ parametros, sugestoes });
}

// GET /api/analises/consumo/:produtoId?agrupamento=DIARIO|SEMANAL|MENSAL&dias=
async function serieConsumo(req, res) {
  const produtoId = v.id(req.params.produtoId, 'Produto');
  const agrupamento = v.opcao(req.query.agrupamento, 'Agrupamento', Object.keys(AnaliseModel.AGRUPAMENTOS)) || 'DIARIO';
  const padrao = { DIARIO: 30, SEMANAL: 84, MENSAL: 180 }[agrupamento];
  const dias = v.inteiro(req.query.dias, 'Dias', { min: 1, max: 730, padrao });

  const produto = await ProdutoModel.buscarPorId(produtoId);
  if (!produto) throw new AppError(404, 'Produto não encontrado.');
  const pontos = await AnaliseModel.serieDeConsumo(produtoId, agrupamento, dias);
  res.json({
    produtoId,
    produtoNome: produto.nome,
    unidadeMedida: produto.unidadeMedida,
    agrupamento,
    dias,
    pontos,
  });
}

module.exports = { reposicao, serieConsumo, calcularSugestoes };
