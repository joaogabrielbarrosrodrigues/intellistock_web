/**
 * Controller do dashboard: reúne os indicadores da tela inicial em uma única resposta.
 * Mantém o contrato do dashboard do João Gabriel (totalProdutos, produtosAbaixoMinimo,
 * source, geradoEm) e acrescenta os indicadores financeiros e de movimentação.
 */
const DashboardModel = require('../models/DashboardModel');
const dashboardService = require('../services/dashboard.service');
const { calcularSugestoes } = require('./AnaliseController');
const AppError = require('../utils/AppError');
const { PADROES } = require('../utils/calculoReposicao');

const DIAS_PROXIMAS_CONTAS = 7;

function enviarResumo(res, dados, source) {
  res.set('Cache-Control', 'no-store');
  return res.json({ ...dados, source, geradoEm: new Date().toISOString() });
}

function resumoMock(req, res) {
  return enviarResumo(res, dashboardService.resumoMock(), 'mock');
}

async function resumo(req, res) {
  try {
    const [{ produtosAbaixoMinimo, ...estoque }, financeiro, contas, movimentacoes, mensal, sugestoes] =
      await Promise.all([
        DashboardModel.resumoEstoque(),
        DashboardModel.resumoFinanceiro(DIAS_PROXIMAS_CONTAS),
        DashboardModel.contasEmDestaque(DIAS_PROXIMAS_CONTAS),
        DashboardModel.movimentacoesRecentes(8),
        DashboardModel.movimentacaoMensal(6),
        calcularSugestoes(PADROES),
      ]);

    return enviarResumo(res, {
      totalProdutos: estoque.produtosAtivos,
      produtosAbaixoMinimo,
      estoque,
      financeiro,
      sugestoesReposicao: sugestoes.filter((s) => s.precisaRepor).length,
      contasEmDestaque: contas,
      movimentacoesRecentes: movimentacoes,
      movimentacaoMensal: mensal,
    }, 'postgres');
  } catch (erro) {
    console.error('Falha ao consultar o dashboard:', erro.code || erro.message);
    throw new AppError(500, 'Não foi possível consultar o dashboard. Verifique a conexão e o esquema do banco.');
  }
}

module.exports = { resumo, resumoMock };
