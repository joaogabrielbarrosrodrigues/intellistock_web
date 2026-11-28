/* Dashboard IntelliStock Web — responsabilidade: João Gabriel.
 * Contrato: GET /api/dashboard (documentado no README.md).
 * Nenhum dado do usuário é interpolado como HTML: usamos textContent.
 */
(() => {
  'use strict';

  const elements = {
    total: document.getElementById('totalProducts'),
    below: document.getElementById('belowMinimum'),
    percentage: document.getElementById('stockPercentage'),
    source: document.getElementById('dataSource'),
    mockNotice: document.getElementById('mockNotice'),
    updated: document.getElementById('lastUpdated'),
    error: document.getElementById('errorBox'),
    counter: document.getElementById('itemsCounter'),
    body: document.getElementById('criticalProductsBody'),
    search: document.getElementById('searchProducts'),
    refresh: document.getElementById('refreshButton')
  };

  let records = [];
  let loadState = 'loading';
  const integer = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });
  const quantity = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 3 });

  function isValidDashboard(data) {
    return data &&
      Number.isSafeInteger(data.totalProdutos) && data.totalProdutos >= 0 &&
      Array.isArray(data.produtosAbaixoMinimo) &&
      data.produtosAbaixoMinimo.length <= data.totalProdutos &&
      (data.source === 'mock' || data.source === 'postgres') &&
      typeof data.geradoEm === 'string' && !Number.isNaN(Date.parse(data.geradoEm)) &&
      data.produtosAbaixoMinimo.every((item) => item &&
        item.id != null &&
        typeof item.nome === 'string' && item.nome.trim() !== '' &&
        Number.isFinite(item.quantidade) && item.quantidade >= 0 &&
        Number.isFinite(item.estoqueMinimo) && item.estoqueMinimo >= 0 &&
        item.quantidade < item.estoqueMinimo);
  }

  function makeCell(text, className) {
    const cell = document.createElement('td');
    cell.textContent = String(text);
    if (className) cell.className = className;
    return cell;
  }

  function renderEmpty(message) {
    const tr = document.createElement('tr');
    const td = makeCell(message, 'empty-cell');
    td.colSpan = 5;
    tr.appendChild(td);
    elements.body.replaceChildren(tr);
  }

  function renderRows() {
    if (loadState !== 'ready') {
      elements.counter.textContent = '0 itens';
      renderEmpty(loadState === 'loading' ? 'Carregando produtos…' : 'Não foi possível carregar a tabela.');
      return;
    }

    const query = elements.search.value.trim().toLocaleLowerCase('pt-BR');
    const visible = records.filter((item) => item.nome.toLocaleLowerCase('pt-BR').includes(query));
    elements.counter.textContent = `${integer.format(visible.length)} ${visible.length === 1 ? 'item' : 'itens'}`;

    if (visible.length === 0) {
      renderEmpty(records.length ? 'Nenhum produto corresponde à sua busca.' : 'Nenhum produto abaixo do estoque mínimo.');
      return;
    }

    const fragment = document.createDocumentFragment();
    for (const item of visible) {
      const tr = document.createElement('tr');
      const deficit = item.estoqueMinimo - item.quantidade;
      tr.appendChild(makeCell(item.nome, 'product-name'));
      tr.appendChild(makeCell(quantity.format(item.quantidade), 'quantity'));
      tr.appendChild(makeCell(quantity.format(item.estoqueMinimo)));
      tr.appendChild(makeCell(quantity.format(deficit), 'deficit'));
      const status = document.createElement('td');
      const pill = document.createElement('span');
      pill.className = 'status-pill';
      pill.textContent = 'Abaixo do mínimo';
      status.appendChild(pill);
      tr.appendChild(status);
      fragment.appendChild(tr);
    }
    elements.body.replaceChildren(fragment);
  }

  async function loadDashboard() {
    elements.refresh.disabled = true;
    elements.error.classList.add('d-none');
    loadState = 'loading';
    records = [];
    elements.total.textContent = '—';
    elements.below.textContent = '—';
    elements.percentage.textContent = '—';
    elements.source.textContent = 'Verificando dados…';
    elements.source.classList.remove('demo');
    elements.mockNotice.hidden = true;
    elements.updated.textContent = 'Atualizando…';
    renderRows();
    try {
      const data = await api('/api/dashboard', { cache: 'no-store' });
      if (!isValidDashboard(data)) {
        throw new Error('Resposta fora do contrato da API');
      }

      records = data.produtosAbaixoMinimo;
      loadState = 'ready';
      elements.total.textContent = integer.format(data.totalProdutos);
      elements.below.textContent = integer.format(records.length);
      const healthy = data.totalProdutos === 0 ? null : Math.max(0, (data.totalProdutos - records.length) / data.totalProdutos * 100);
      elements.percentage.textContent = healthy === null ? '—' : `${integer.format(Math.round(healthy))}%`;
      const mock = data.source === 'mock';
      elements.source.textContent = mock ? 'Modo demonstração · dados simulados' : 'Conectado ao PostgreSQL';
      elements.source.classList.toggle('demo', mock);
      elements.mockNotice.hidden = !mock;
      elements.updated.textContent = `Atualizado em ${new Date(data.geradoEm).toLocaleString('pt-BR')}`;
      renderRows();
    } catch (error) {
      loadState = 'error';
      records = [];
      elements.total.textContent = '—';
      elements.below.textContent = '—';
      elements.percentage.textContent = '—';
      elements.source.textContent = 'Dados indisponíveis';
      elements.source.classList.remove('demo');
      elements.updated.textContent = 'Não foi possível atualizar';
      renderRows();
      elements.error.textContent = `Não foi possível consultar o dashboard (${error.message}). Verifique se o servidor Express está em execução e se o banco foi configurado.`;
      elements.error.classList.remove('d-none');
    } finally {
      elements.refresh.disabled = false;
    }
  }

  elements.search.addEventListener('input', renderRows);
  elements.refresh.addEventListener('click', loadDashboard);
  loadDashboard();
})();
