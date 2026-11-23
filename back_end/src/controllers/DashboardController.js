/**
 * Controller do dashboard: reúne os indicadores da tela inicial em uma única resposta.
 * Mantém o contrato do dashboard do João Gabriel (totalProdutos, produtosAbaixoMinimo,
 * source, geradoEm) e acrescenta os indicadores financeiros e de movimentação.
 */
const DashboardModel = require('../models/DashboardModel');
const { calcularSugestoes } = require('./AnaliseController');
const { PADROES } = require('../utils/calculoReposicao');

const DIAS_PROXIMAS_CONTAS = 7;

// GET /api/dashboard
async function resumo(req, res) {
  const [estoque, financeiro, contas, movimentacoes, mensal, sugestoes, abaixoMinimo] = await Promise.all([
    DashboardModel.resumoEstoque(),
    DashboardModel.resumoFinanceiro(DIAS_PROXIMAS_CONTAS),
    DashboardModel.contasEmDestaque(DIAS_PROXIMAS_CONTAS),
    DashboardModel.movimentacoesRecentes(8),
    DashboardModel.movimentacaoMensal(6),
    calcularSugestoes(PADROES),
    DashboardModel.produtosAbaixoMinimo(),
  ]);

  res.json({
    // Contrato original do dashboard (João Gabriel)
    totalProdutos: estoque.produtosAtivos,
    produtosAbaixoMinimo: abaixoMinimo,
    source: 'postgres',
    geradoEm: new Date().toISOString(),
    // Indicadores adicionais
    estoque,
    financeiro,
    sugestoesReposicao: sugestoes.filter((s) => s.precisaRepor).length,
    contasEmDestaque: contas,
    movimentacoesRecentes: movimentacoes,
    movimentacaoMensal: mensal,
  });
}

module.exports = { resumo };
