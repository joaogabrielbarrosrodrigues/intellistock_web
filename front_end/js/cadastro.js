document.getElementById('cadastro').addEventListener('submit', async event => {
  event.preventDefault();
  const erro = document.getElementById('erro');
  const senha = document.getElementById('senhaCadastro').value;
  erro.classList.add('d-none');

  if (senha !== document.getElementById('confirmarSenha').value) {
    erro.textContent = 'As senhas não coincidem.';
    erro.classList.remove('d-none');
    return;
  }

  const button = event.currentTarget.querySelector('button');
  button.disabled = true;
  try {
    const data = await api('/api/auth/cadastro', {
      method: 'POST',
      body: JSON.stringify({
        nome: document.getElementById('nomeCadastro').value,
        email: document.getElementById('emailCadastro').value,
        senha
      })
    });
    sessionStorage.setItem('intellistockToken', data.token);
    location.href = '/';
  } catch (error) {
    erro.textContent = error.message;
    erro.classList.remove('d-none');
  } finally {
    button.disabled = false;
  }
});
