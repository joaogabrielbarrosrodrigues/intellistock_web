const $ = id => document.getElementById(id);
const form = $('registro');
const numero = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 3 });
const UNIDADES_INTEIRAS = ['UN', 'CX', 'PCT', 'FD'];
let produtos = [];

function mensagem(texto, tipo = 'danger') {
  $('mensagem').textContent = texto;
  $('mensagem').className = `alert alert-${tipo}`;
}

function celula(linha, valor, classe) {
  const td = linha.insertCell();
  td.textContent = valor ?? '—';
  if (classe) td.className = classe;
  return td;
}

function vazio(texto) {
  $('lista').replaceChildren();
  celula($('lista').insertRow(), texto).colSpan = 6;
}

function produtoSelecionado() {
  return produtos.find(p => String(p.id) === $('produtoId').value);
}

// Mostra o saldo do produto escolhido e ajusta o campo de quantidade à unidade.
function atualizarSaldo() {
  const item = produtoSelecionado();
  $('unidade').textContent = item ? `(${item.unidadeMedida})` : '';
  $('quantidade').step = item && UNIDADES_INTEIRAS.includes(item.unidadeMedida) ? '1' : '0.001';
  $('saldo').classList.toggle('d-none', !item);
  if (item) {
    $('saldo').textContent = `Saldo atual: ${numero.format(item.quantidade)} ${item.unidadeMedida} · Estoque mínimo: ${numero.format(item.estoqueMinimo)} ${item.unidadeMedida}`;
  }
}

async function carregarProdutos() {
  produtos = await api('/api/produtos?status=ativos');
  const selecionado = $('produtoId').value;
  $('produtoId').replaceChildren(new Option('Selecione um produto', ''));
  $('filtroProduto').replaceChildren(new Option('Todos os produtos', ''));
  for (const item of produtos) {
    $('produtoId').add(new Option(item.nome, item.id));
    $('filtroProduto').add(new Option(item.nome, item.id));
  }
  $('produtoId').value = selecionado;
  atualizarSaldo();
}

async function listar() {
  vazio('Carregando…');
  try {
    const filtros = new URLSearchParams({ limite: 200 });
    if ($('filtroProduto').value) filtros.set('produtoId', $('filtroProduto').value);
    if ($('filtroTipo').value) filtros.set('tipo', $('filtroTipo').value);
    if ($('inicio').value) filtros.set('inicio', $('inicio').value);
    if ($('fim').value) filtros.set('fim', $('fim').value);
    const registros = await api(`/api/movimentacoes?${filtros}`);
    $('contador').textContent = `${registros.length} registros`;
    if (!registros.length) return vazio('Nenhuma movimentação encontrada.');
    $('lista').replaceChildren();
    for (const item of registros) {
      const linha = $('lista').insertRow();
      const entrada = item.tipo === 'ENTRADA';
      celula(linha, new Date(item.data).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }));
      celula(linha, item.produtoNome, 'product-name');
      const tipo = celula(linha, '');
      const pill = document.createElement('span');
      pill.className = 'status-pill';
      if (entrada) pill.style.cssText = 'background:#e6f7ef;color:#23824f';
      pill.textContent = entrada ? 'Entrada' : 'Saída';
      tipo.append(pill);
      celula(linha, `${entrada ? '+' : '−'}${numero.format(item.quantidade)} ${item.unidadeMedida}`, entrada ? 'quantity' : 'deficit');
      celula(linha, numero.format(item.saldoResultante), 'quantity');
      celula(linha, item.observacao);
    }
  } catch (error) {
    $('contador').textContent = '';
    vazio('Não foi possível carregar as movimentações.');
    mensagem(error.message);
  }
}

form.addEventListener('submit', async event => {
  event.preventDefault();
  const item = produtoSelecionado();
  const dados = Object.fromEntries(new FormData(form));
  const quantidade = Number(dados.quantidade);
  if (!item) return mensagem('Selecione o produto.');
  if (!(quantidade > 0)) return mensagem('Informe uma quantidade maior que zero.');
  if (UNIDADES_INTEIRAS.includes(item.unidadeMedida) && !Number.isInteger(quantidade)) {
    return mensagem(`Produtos medidos em ${item.unidadeMedida} só aceitam quantidades inteiras.`);
  }
  if (dados.tipo === 'SAIDA' && quantidade > item.quantidade) {
    return mensagem(`Estoque insuficiente. Disponível: ${numero.format(item.quantidade)} ${item.unidadeMedida}.`);
  }

  const submit = form.querySelector('[type="submit"]');
  submit.disabled = true;
  try {
    const mov = await api('/api/movimentacoes', { method: 'POST', body: JSON.stringify(dados) });
    mensagem(`${mov.tipo === 'ENTRADA' ? 'Entrada' : 'Saída'} registrada. Novo saldo: ${numero.format(mov.saldoResultante)} ${mov.unidadeMedida}.`, 'success');
    $('quantidade').value = '';
    $('observacao').value = '';
    await carregarProdutos();
    await listar();
  } catch (error) { mensagem(error.message); }
  finally { submit.disabled = false; }
});

$('produtoId').addEventListener('change', atualizarSaldo);
$('filtros').addEventListener('submit', event => { event.preventDefault(); listar(); });

carregarProdutos().catch(error => mensagem(error.message)).finally(listar);
