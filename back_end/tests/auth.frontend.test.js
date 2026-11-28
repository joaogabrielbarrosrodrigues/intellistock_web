const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const loginScript = fs.readFileSync(path.resolve(__dirname, '../../front_end/js/login.js'), 'utf8');
const cadastroScript = fs.readFileSync(path.resolve(__dirname, '../../front_end/js/cadastro.js'), 'utf8');
const apiScript = fs.readFileSync(path.resolve(__dirname, '../../front_end/js/api.js'), 'utf8');

function criarPagina(api, script = loginScript) {
  const elementos = new Map();
  const valoresSessao = new Map();
  const location = { href: '/login.html' };

  function elemento() {
    return {
      value: '',
      hidden: false,
      open: false,
      disabled: false,
      textContent: '',
      events: {},
      attributes: {},
      classList: {
        add() {},
        remove() {}
      },
      addEventListener(name, callback) { this.events[name] = callback; },
      setAttribute(name, value) { this.attributes[name] = value; },
      showModal() { this.open = true; },
      close() { this.open = false; },
      focus() {},
      querySelector() { return this.button ||= elemento(); }
    };
  }

  const document = {
    body: { append(child) { this.dialog = child; } },
    createElement: () => elemento(),
    getElementById(id) {
      if (!elementos.has(id)) elementos.set(id, elemento());
      return elementos.get(id);
    },
    addEventListener(name, callback) { this.events[name] = callback; },
    events: {}
  };
  const sessionStorage = {
    getItem(key) { return valoresSessao.get(key) ?? null; },
    setItem(key, value) { valoresSessao.set(key, value); },
    removeItem(key) { valoresSessao.delete(key); }
  };
  const contexto = vm.createContext({ document, sessionStorage, location, api });
  vm.runInContext(script, contexto);
  return { document, elementos, sessionStorage, location, contexto };
}

test('login oferece cadastro em outra página', () => {
  const html = fs.readFileSync(path.resolve(__dirname, '../../front_end/login.html'), 'utf8');
  const cadastro = fs.readFileSync(path.resolve(__dirname, '../../front_end/cadastro.html'), 'utf8');
  assert.match(html, /<a class="auth-secondary-action" href="\/cadastro.html">Cadastrar-se<\/a>/);
  assert.match(cadastro, /<form id="cadastro"/);
  assert.match(cadastro, /href="\/login.html">Voltar para entrar<\/a>/);
});

test('página de cadastro valida confirmação, envia à API e abre dashboard', async () => {
  const chamadas = [];
  const pagina = criarPagina(async (url, opcoes) => {
    chamadas.push({ url, dados: JSON.parse(opcoes.body) });
    return { token: 'token-novo' };
  }, cadastroScript);
  const obter = id => pagina.document.getElementById(id);

  obter('nomeCadastro').value = 'Nova pessoa';
  obter('emailCadastro').value = 'nova@exemplo.com';
  obter('senhaCadastro').value = 'senha-forte';
  obter('confirmarSenha').value = 'diferente';
  const form = obter('cadastro');
  const evento = { preventDefault() {}, currentTarget: form };
  await form.events.submit(evento);
  assert.equal(chamadas.length, 0);
  assert.match(obter('erro').textContent, /não coincidem/);

  obter('confirmarSenha').value = 'senha-forte';
  await form.events.submit(evento);
  assert.deepEqual(chamadas, [{
    url: '/api/auth/cadastro',
    dados: { nome: 'Nova pessoa', email: 'nova@exemplo.com', senha: 'senha-forte' }
  }]);
  assert.equal(pagina.sessionStorage.getItem('intellistockToken'), 'token-novo');
  assert.equal(pagina.location.href, '/');
  assert.equal(form.button.disabled, false);
});

test('Sair pede confirmação e Cancelar mantém a sessão', () => {
  const pagina = criarPagina(async () => ({}));
  vm.runInContext(apiScript, pagina.contexto);
  pagina.sessionStorage.setItem('intellistockToken', 'token-anterior');
  pagina.document.events.click({
    target: { closest: seletor => seletor === '[data-logout]' }
  });
  const dialog = pagina.document.body.dialog;
  assert.equal(dialog.open, true);
  assert.match(dialog.innerHTML, /Você realmente deseja sair/);
  assert.equal(pagina.sessionStorage.getItem('intellistockToken'), 'token-anterior');
  dialog.events.click({
    target: { closest: seletor => seletor === '[data-cancel-logout]' }
  });
  assert.equal(dialog.open, false);
  assert.equal(pagina.sessionStorage.getItem('intellistockToken'), 'token-anterior');
  pagina.document.events.click({
    target: { closest: seletor => seletor === '[data-logout]' }
  });
  dialog.events.click({
    target: { closest: seletor => seletor === '[data-confirm-logout]' }
  });
  assert.equal(pagina.sessionStorage.getItem('intellistockToken'), null);
  assert.equal(pagina.location.href, '/login.html');
});
