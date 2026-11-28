document.getElementById('login').addEventListener('submit', async event => {
  event.preventDefault();
  const button = event.currentTarget.querySelector('button');
  const erro = document.getElementById('erro');
  button.disabled = true;
  erro.classList.add('d-none');

  try {
    const data = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: document.getElementById('email').value,
        senha: document.getElementById('senha').value
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
