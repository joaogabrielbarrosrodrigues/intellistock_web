'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const script = fs.readFileSync(path.resolve(__dirname, '../../front_end/js/dashboard.js'), 'utf8');

function createPage(fetchImpl) {
  class Element {
    constructor(fragment = false) {
      this.fragment = fragment;
      this.children = [];
      this.textContent = '';
      this.value = '';
      this.disabled = false;
      this.events = {};
      const classes = new Set();
      this.classList = {
        add: (name) => classes.add(name),
        remove: (name) => classes.delete(name),
        toggle: (name, force) => force ? classes.add(name) : classes.delete(name),
        contains: (name) => classes.has(name)
      };
    }

    appendChild(child) { this.children.push(child); }
    replaceChildren(...children) {
      this.children = children.flatMap((child) => child.fragment ? child.children : [child]);
    }
    addEventListener(name, callback) { this.events[name] = callback; }
    dispatch(name) { return this.events[name](); }
  }

  const ids = [
    'totalProducts', 'belowMinimum', 'stockPercentage', 'dataSource',
    'lastUpdated', 'errorBox', 'itemsCounter', 'criticalProductsBody',
    'searchProducts', 'refreshButton'
  ];
  const elements = Object.fromEntries(ids.map((id) => [id, new Element()]));
  const document = {
    getElementById: (id) => elements[id],
    createElement: () => new Element(),
    createDocumentFragment: () => new Element(true)
  };
  vm.runInNewContext(script, { document, fetch: fetchImpl, Intl, Date });
  return elements;
}

const mockData = {
  totalProdutos: 5,
  produtosAbaixoMinimo: [
    { id: 2, nome: 'Açaí', quantidade: 5, estoqueMinimo: 12 },
    { id: 1, nome: 'Sorvete', quantidade: 7, estoqueMinimo: 8 }
  ],
  source: 'mock',
  geradoEm: '2026-11-23T15:00:00.000Z'
};

const settle = () => new Promise((resolve) => setImmediate(resolve));

test('frontend mostra indicadores, filtra por nome e informa busca sem resultados', async () => {
  const page = createPage(async () => ({ ok: true, json: async () => mockData }));
  await settle();
  assert.equal(page.totalProducts.textContent, '5');
  assert.equal(page.belowMinimum.textContent, '2');
  assert.equal(page.stockPercentage.textContent, '60%');
  assert.equal(page.criticalProductsBody.children.length, 2);

  page.searchProducts.value = 'sorvete';
  page.searchProducts.dispatch('input');
  assert.equal(page.itemsCounter.textContent, '1 item');
  assert.equal(page.criticalProductsBody.children[0].children[0].textContent, 'Sorvete');

  page.searchProducts.value = 'inexistente';
  page.searchProducts.dispatch('input');
  assert.equal(page.criticalProductsBody.children[0].children[0].textContent, 'Nenhum produto corresponde à sua busca.');
});

test('frontend mostra estado vazio quando não há produtos', async () => {
  const page = createPage(async () => ({
    ok: true,
    json: async () => ({ ...mockData, totalProdutos: 0, produtosAbaixoMinimo: [] })
  }));
  await settle();
  assert.equal(page.totalProducts.textContent, '0');
  assert.equal(page.stockPercentage.textContent, '—');
  assert.equal(page.criticalProductsBody.children[0].children[0].textContent, 'Nenhum produto abaixo do estoque mínimo.');
});

test('frontend preserva o erro após uma busca e rejeita resposta fora do contrato', async () => {
  for (const fetchImpl of [
    async () => ({ ok: false, status: 500 }),
    async () => ({ ok: true, json: async () => ({ ...mockData, geradoEm: undefined }) })
  ]) {
    const page = createPage(fetchImpl);
    await settle();
    assert.equal(page.totalProducts.textContent, '—');
    assert.equal(page.dataSource.textContent, 'Dados indisponíveis');
    assert.equal(page.errorBox.classList.contains('d-none'), false);
    page.searchProducts.value = 'sorvete';
    page.searchProducts.dispatch('input');
    assert.equal(page.criticalProductsBody.children[0].children[0].textContent, 'Não foi possível carregar a tabela.');
  }
});
