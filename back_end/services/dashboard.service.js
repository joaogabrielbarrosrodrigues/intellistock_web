'use strict';

/** Resume os dados de produtos para o contrato público do dashboard. */
function summarizeProducts(products) {
  if (!Array.isArray(products)) throw new TypeError('products deve ser um array');

  const belowMinimum = products
    .filter((product) => Number(product.quantidade) < Number(product.estoqueMinimo))
    .map(({ id, nome, quantidade, estoqueMinimo }) => ({
      id,
      nome,
      quantidade: Number(quantidade),
      estoqueMinimo: Number(estoqueMinimo)
    }))
    .sort((a, b) =>
      (b.estoqueMinimo - b.quantidade) - (a.estoqueMinimo - a.quantidade) ||
      String(a.nome).localeCompare(String(b.nome), 'pt-BR')
    );

  return { totalProdutos: products.length, produtosAbaixoMinimo: belowMinimum };
}

module.exports = { summarizeProducts };
