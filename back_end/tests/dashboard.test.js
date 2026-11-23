'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { Pool } = require('pg');
const { getDashboardMock } = require('../controllers/dashboard.controller');
const { app } = require('../server');

test('dashboard mock devolve apenas produtos abaixo do mínimo', () => {
  const result = getDashboardMock();
  assert.equal(result.totalProdutos, 5);
  assert.equal(result.produtosAbaixoMinimo.length, 2);
  assert.ok(result.produtosAbaixoMinimo.every((item) => item.quantidade < item.estoqueMinimo));
  assert.equal(result.produtosAbaixoMinimo[0].nome, 'Açaí Tradicional 2 L');
});

test('GET /api/dashboard atende o contrato em modo mock', async () => {
  const previousSource = process.env.DASHBOARD_DATA_SOURCE;
  process.env.DASHBOARD_DATA_SOURCE = 'mock';
  const server = app.listen(0);
  try {
    const address = server.address();
    const response = await fetch(`http://127.0.0.1:${address.port}/api/dashboard`);
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.equal(data.source, 'mock');
    assert.equal(data.totalProdutos, 5);
    assert.ok(Array.isArray(data.produtosAbaixoMinimo));
    assert.ok(data.geradoEm);
  } finally {
    if (previousSource === undefined) delete process.env.DASHBOARD_DATA_SOURCE;
    else process.env.DASHBOARD_DATA_SOURCE = previousSource;
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});

test('GET / retorna a página inicial HTML', async () => {
  const server = app.listen(0);
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/`);
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.match(html, /Visão geral do estoque/);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});

test('GET /api/dashboard rejeita fonte de dados inválida', async () => {
  const previousSource = process.env.DASHBOARD_DATA_SOURCE;
  process.env.DASHBOARD_DATA_SOURCE = 'desconhecida';
  const server = app.listen(0);
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/dashboard`);
    assert.equal(response.status, 500);
    assert.match((await response.json()).erro, /mock ou postgres/);
  } finally {
    if (previousSource === undefined) delete process.env.DASHBOARD_DATA_SOURCE;
    else process.env.DASHBOARD_DATA_SOURCE = previousSource;
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});

test('GET /api/dashboard não retorna mock quando a consulta PostgreSQL falha', async (t) => {
  const previousSource = process.env.DASHBOARD_DATA_SOURCE;
  process.env.DASHBOARD_DATA_SOURCE = 'postgres';
  t.mock.method(Pool.prototype, 'query', async () => { throw new Error('Falha simulada no banco'); });
  t.mock.method(console, 'error', () => {});
  const server = app.listen(0);
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/dashboard`);
    assert.equal(response.status, 500);
    const data = await response.json();
    assert.match(data.erro, /Não foi possível consultar o dashboard/);
    assert.equal(data.source, undefined);
  } finally {
    if (previousSource === undefined) delete process.env.DASHBOARD_DATA_SOURCE;
    else process.env.DASHBOARD_DATA_SOURCE = previousSource;
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});
