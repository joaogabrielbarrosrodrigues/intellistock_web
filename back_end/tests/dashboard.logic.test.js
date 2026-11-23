'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { summarizeProducts } = require('../services/dashboard.service');

test('sem produtos, retorna dashboard vazio', () => {
  assert.deepEqual(summarizeProducts([]), { totalProdutos: 0, produtosAbaixoMinimo: [] });
});

test('produto no estoque mínimo não deve entrar no alerta', () => {
  const result = summarizeProducts([
    { id: 1, nome: 'Igual', quantidade: 8, estoqueMinimo: 8 },
    { id: 2, nome: 'Abaixo', quantidade: 7, estoqueMinimo: 8 },
    { id: 3, nome: 'Acima', quantidade: 9, estoqueMinimo: 8 }
  ]);
  assert.equal(result.totalProdutos, 3);
  assert.deepEqual(result.produtosAbaixoMinimo.map((p) => p.id), [2]);
});

test('ordena alertas pelo maior déficit e preserva apenas os campos públicos', () => {
  const result = summarizeProducts([
    { id: 1, nome: 'B', quantidade: 4, estoqueMinimo: 5, segredo: 'não incluir' },
    { id: 2, nome: 'A', quantidade: 1, estoqueMinimo: 8 },
    { id: 3, nome: 'C', quantidade: 2, estoqueMinimo: 6 }
  ]);
  assert.deepEqual(result.produtosAbaixoMinimo.map((p) => p.id), [2, 3, 1]);
  assert.equal(result.produtosAbaixoMinimo[2].segredo, undefined);
});
