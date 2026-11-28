// Amostra fixa usada somente quando o servidor inicia em modo mock.
const produtosDemo = [
  { id: 1, nome: 'Sorvete de Chocolate', quantidade: 7, estoqueMinimo: 8 },
  { id: 2, nome: 'Açaí Tradicional 2 L', quantidade: 5, estoqueMinimo: 12 },
  { id: 3, nome: 'Picolé de Morango', quantidade: 22, estoqueMinimo: 10 },
  { id: 4, nome: 'Sorvete de Baunilha', quantidade: 14, estoqueMinimo: 8 },
  { id: 5, nome: 'Casquinha', quantidade: 40, estoqueMinimo: 20 },
];

function resumoMock() {
  const produtosAbaixoMinimo = produtosDemo
    .filter(({ quantidade, estoqueMinimo }) => quantidade < estoqueMinimo)
    .sort((a, b) =>
      (b.estoqueMinimo - b.quantidade) - (a.estoqueMinimo - a.quantidade)
      || a.nome.localeCompare(b.nome, 'pt-BR'),
    );

  return { totalProdutos: produtosDemo.length, produtosAbaixoMinimo };
}

module.exports = { resumoMock };
