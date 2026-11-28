'use strict';

const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const { once } = require('node:events');
const test = require('node:test');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const app = require('../src/app');

const segredoTeste = randomBytes(32).toString('hex');

function configurarAmbiente(t, fonte) {
  const anterior = {
    DASHBOARD_DATA_SOURCE: process.env.DASHBOARD_DATA_SOURCE,
    JWT_SECRET: process.env.JWT_SECRET,
  };
  if (fonte === undefined) delete process.env.DASHBOARD_DATA_SOURCE;
  else process.env.DASHBOARD_DATA_SOURCE = fonte;
  process.env.JWT_SECRET = segredoTeste;

  t.after(() => {
    for (const [nome, valor] of Object.entries(anterior)) {
      if (valor === undefined) delete process.env[nome];
      else process.env[nome] = valor;
    }
  });
}

async function iniciarServidor(t) {
  const servidor = app.listen(0, '127.0.0.1');
  await once(servidor, 'listening');
  t.after(() => new Promise((resolve, reject) => {
    servidor.close((erro) => erro ? reject(erro) : resolve());
  }));
  return `http://127.0.0.1:${servidor.address().port}`;
}

function impedirConsultas(t) {
  return t.mock.method(Pool.prototype, 'query', async () => {
    throw new Error('Este teste não deve consultar o PostgreSQL');
  });
}

test('GET /api/dashboard responde em mock sem login ou PostgreSQL', async (t) => {
  configurarAmbiente(t, 'mock');
  const consulta = impedirConsultas(t);
  const base = await iniciarServidor(t);

  const resposta = await fetch(`${base}/api/dashboard`);

  assert.equal(resposta.status, 200);
  const dados = await resposta.json();
  assert.equal(dados.source, 'mock');
  assert.equal(dados.totalProdutos, 5);
  assert.equal(dados.produtosAbaixoMinimo.length, 2);
  assert.deepEqual(dados.produtosAbaixoMinimo[0], {
    id: 2,
    nome: 'Açaí Tradicional 2 L',
    quantidade: 5,
    estoqueMinimo: 12,
  });
  assert.ok(dados.produtosAbaixoMinimo.every((item) => item.quantidade < item.estoqueMinimo));
  assert.equal(new Date(dados.geradoEm).toISOString(), dados.geradoEm);
  assert.equal(consulta.mock.callCount(), 0);
});

test('DASHBOARD_DATA_SOURCE ausente usa o modo mock documentado', async (t) => {
  configurarAmbiente(t);
  const consulta = impedirConsultas(t);
  const base = await iniciarServidor(t);

  const resposta = await fetch(`${base}/api/dashboard`);

  assert.equal(resposta.status, 200);
  assert.equal((await resposta.json()).source, 'mock');
  assert.equal(consulta.mock.callCount(), 0);
});

test('GET /api/dashboard rejeita uma fonte de dados inválida sem consultar o banco', async (t) => {
  configurarAmbiente(t, 'desconhecida');
  const consulta = impedirConsultas(t);
  const base = await iniciarServidor(t);

  const resposta = await fetch(`${base}/api/dashboard`);

  assert.equal(resposta.status, 500);
  assert.deepEqual(await resposta.json(), {
    mensagem: 'DASHBOARD_DATA_SOURCE deve ser mock ou postgres.',
  });
  assert.equal(consulta.mock.callCount(), 0);
});

test('status em mock informa banco desativado e rotas de cadastro e movimentação respondem 503', async (t) => {
  configurarAmbiente(t, 'mock');
  const consulta = impedirConsultas(t);
  const base = await iniciarServidor(t);

  const [status, fornecedores, produtos, movimentacoes] = await Promise.all([
    fetch(`${base}/api/status`),
    fetch(`${base}/api/fornecedores`),
    fetch(`${base}/api/produtos`),
    fetch(`${base}/api/movimentacoes`),
  ]);

  assert.equal(status.status, 200);
  assert.deepEqual(await status.json(), { api: 'ok', banco: 'desativado' });
  for (const resposta of [fornecedores, produtos, movimentacoes]) {
    assert.equal(resposta.status, 503);
    assert.equal(typeof (await resposta.json()).mensagem, 'string');
  }
  assert.equal(consulta.mock.callCount(), 0);
});

test('modo PostgreSQL exige JWT válido para o dashboard e rotas dos módulos', async (t) => {
  configurarAmbiente(t, 'postgres');
  const consulta = impedirConsultas(t);
  const base = await iniciarServidor(t);

  const [dashboard, tokenInvalido, produtos] = await Promise.all([
    fetch(`${base}/api/dashboard`),
    fetch(`${base}/api/dashboard`, { headers: { Authorization: 'Bearer token-invalido' } }),
    fetch(`${base}/api/produtos`),
  ]);

  for (const resposta of [dashboard, tokenInvalido, produtos]) {
    assert.equal(resposta.status, 401);
    assert.equal(typeof (await resposta.json()).mensagem, 'string');
  }
  assert.equal(consulta.mock.callCount(), 0);
});

test('falha de conexão do dashboard PostgreSQL retorna HTTP 500 sem usar dados mock', async (t) => {
  configurarAmbiente(t, 'postgres');
  const erroInterno = Object.assign(new Error('Falha simulada no banco'), { code: 'ECONNREFUSED' });
  const consulta = t.mock.method(Pool.prototype, 'query', async () => { throw erroInterno; });
  t.mock.method(console, 'error', () => {});
  const base = await iniciarServidor(t);
  const token = jwt.sign({ sub: 1 }, segredoTeste, { expiresIn: '1m' });

  const resposta = await fetch(`${base}/api/dashboard`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  assert.equal(resposta.status, 500);
  assert.deepEqual(await resposta.json(), {
    mensagem: 'Não foi possível consultar o dashboard. Verifique a conexão e o esquema do banco.',
  });
  assert.ok(consulta.mock.callCount() > 0);
});

test('Express serve a página inicial, o CSS e os scripts do dashboard no mesmo endereço', async (t) => {
  const base = await iniciarServidor(t);
  const [pagina, css, api, dashboard] = await Promise.all([
    fetch(`${base}/`),
    fetch(`${base}/css/styles.css`),
    fetch(`${base}/js/api.js`),
    fetch(`${base}/js/dashboard.js`),
  ]);

  for (const resposta of [pagina, css, api, dashboard]) assert.equal(resposta.status, 200);
  assert.match(await pagina.text(), /Visão geral do estoque/);
  assert.match(css.headers.get('content-type'), /text\/css/);
  assert.match(api.headers.get('content-type'), /javascript/);
  assert.match(dashboard.headers.get('content-type'), /javascript/);
  await Promise.all([css.text(), api.text(), dashboard.text()]);
});
