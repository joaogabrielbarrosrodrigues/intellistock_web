const modulo = document.querySelector('main').dataset.module;
const produto = modulo === 'produtos';
const singular = produto ? 'produto' : 'fornecedor';
const rota = `/api/${modulo}`;
const $ = id => document.getElementById(id);
const form = $('cadastro');
let editando = null;
let registros = [];
const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

function mensagem(texto, tipo = 'danger') {
  $('mensagem').textContent = texto;
  $('mensagem').className = `alert alert-${tipo}`;
}

function celula(linha, valor) {
  const td = linha.insertCell();
  td.textContent = valor ?? '—';
  return td;
}

function botao(cel, texto, classe, acao) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = `btn btn-sm ${classe} me-1 mb-1`;
  btn.textContent = texto;
  btn.addEventListener('click', acao);
  cel.append(btn);
}

function vazio(texto) {
  $('lista').replaceChildren();
  celula($('lista').insertRow(), texto).colSpan = produto ? 8 : 6;
}

async function listar() {
  vazio('Carregando…');
  try {
    const filtros = new URLSearchParams({ busca: $('busca').value.trim() });
    if (produto) filtros.set('status', $('status').value);
    registros = await api(`${rota}?${filtros}`);
    $('contador').textContent = `${registros.length} registros`;
    if (!registros.length) return vazio('Nenhum registro encontrado.');
    $('lista').replaceChildren();
    for (const item of registros) {
      const linha = $('lista').insertRow();
      const valores = produto ? [item.nome, item.fornecedorNome, item.unidadeMedida, item.quantidade, item.estoqueMinimo, moeda.format(Number(item.preco)), !item.ativo ? 'Inativo' : ({ BAIXO: 'Estoque baixo', SEM_ESTOQUE: 'Sem estoque', NORMAL: 'Normal' }[item.situacao] || item.situacao)] : [item.nome, item.cnpj, item.telefone, item.email, item.totalProdutos];
      valores.forEach(valor => celula(linha, valor));
      const acoes = linha.insertCell();
      botao(acoes, 'Editar', 'btn-outline-primary', () => abrir(item));
      if (produto && !item.ativo) botao(acoes, 'Reativar', 'btn-outline-success', () => alterar(item, true));
      else botao(acoes, 'Excluir', 'btn-outline-danger', () => alterar(item));
    }
  } catch (error) {
    $('contador').textContent = '';
    vazio('Não foi possível carregar os registros.');
    mensagem(error.message);
  }
}

async function abrir(item = null) {
  form.reset();
  editando = item?.id ?? null;
  try {
    if (produto) {
      const fornecedores = await api('/api/fornecedores');
      $('fornecedorId').replaceChildren(new Option('Sem fornecedor', ''));
      fornecedores.forEach(f => $('fornecedorId').add(new Option(f.nome, f.id)));
      $('quantidadeInicial').disabled = Boolean(item);
      $('quantidadeInicial').parentElement.classList.toggle('d-none', Boolean(item));
    }
    if (item) for (const campo of form.elements) if (campo.name && item[campo.name] != null) campo.value = item[campo.name];
    $('formTitle').textContent = `${item ? 'Editar' : 'Novo'} ${singular}`;
    $('editor').classList.remove('d-none');
    $('nome').focus();
  } catch (error) { mensagem(error.message); }
}

async function alterar(item, reativar = false) {
  if (!confirm(`${reativar ? 'Reativar' : 'Excluir'} ${item.nome}?`)) return;
  try {
    const resposta = await api(`${rota}/${item.id}${reativar ? '/reativar' : ''}`, { method: reativar ? 'PATCH' : 'DELETE' });
    mensagem(resposta?.mensagem || (reativar ? 'Produto reativado.' : 'Registro excluído.'), 'success');
    await listar();
  } catch (error) { mensagem(error.message); }
}

form.addEventListener('submit', async event => {
  event.preventDefault();
  const submit = form.querySelector('[type="submit"]');
  submit.disabled = true;
  try {
    const dados = Object.fromEntries(new FormData(form));
    await api(editando ? `${rota}/${editando}` : rota, { method: editando ? 'PUT' : 'POST', body: JSON.stringify(dados) });
    $('editor').classList.add('d-none');
    mensagem('Registro salvo com sucesso!', 'success');
    await listar();
  } catch (error) { mensagem(error.message); }
  finally { submit.disabled = false; }
});
$('novo').addEventListener('click', () => abrir());
$('cancelar').addEventListener('click', () => $('editor').classList.add('d-none'));
$('filtros').addEventListener('submit', event => { event.preventDefault(); listar(); });
if (produto) $('status').addEventListener('change', listar);
listar();
