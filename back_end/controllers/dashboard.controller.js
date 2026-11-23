'use strict';

const { getDashboardFromPostgres } = require('../models/dashboard.model');
const { summarizeProducts } = require('../services/dashboard.service');

// Dados apenas para demonstração sem banco. Não persistem alterações.
const mockProducts = Object.freeze([
  { id: 1, nome: 'Sorvete de Chocolate', quantidade: 7, estoqueMinimo: 8 },
  { id: 2, nome: 'Açaí Tradicional 2 L', quantidade: 5, estoqueMinimo: 12 },
  { id: 3, nome: 'Picolé de Morango', quantidade: 22, estoqueMinimo: 10 },
  { id: 4, nome: 'Sorvete de Baunilha', quantidade: 14, estoqueMinimo: 8 },
  { id: 5, nome: 'Casquinha', quantidade: 40, estoqueMinimo: 20 }
]);

function getDashboardMock() {
  return summarizeProducts(mockProducts);
}

async function getDashboard(_req, res) {
  const source = (process.env.DASHBOARD_DATA_SOURCE || 'mock').toLowerCase();
  if (!['mock', 'postgres'].includes(source)) {
    return res.status(500).json({ erro: 'DASHBOARD_DATA_SOURCE deve ser mock ou postgres.' });
  }

  try {
    const data = source === 'postgres' ? await getDashboardFromPostgres() : getDashboardMock();
    return res.json({ ...data, source, geradoEm: new Date().toISOString() });
  } catch (error) {
    console.error('[dashboard] Falha ao consultar os dados:', error);
    return res.status(500).json({
      erro: 'Não foi possível consultar o dashboard. Verifique a conexão e o esquema do banco.'
    });
  }
}

module.exports = { getDashboard, getDashboardMock };
