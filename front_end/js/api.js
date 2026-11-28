async function api(url, options = {}) {
  const token = sessionStorage.getItem('intellistockToken');
  const response = await fetch(url, {
    ...options,
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers }
  });
  const data = response.status === 204 ? null : await response.json();
  if (!response.ok) {
    if (response.status === 401 && !url.startsWith('/api/auth/')) {
      sessionStorage.removeItem('intellistockToken');
      location.href = '/login.html';
    }
    throw new Error(data?.mensagem || `Erro ${response.status}`);
  }
  return data;
}

let confirmacaoSaida;

document.addEventListener('click', event => {
  if (!event.target.closest('[data-logout]')) return;

  if (!confirmacaoSaida) {
    confirmacaoSaida = document.createElement('dialog');
    confirmacaoSaida.className = 'logout-dialog';
    confirmacaoSaida.setAttribute('aria-labelledby', 'logoutTitle');
    confirmacaoSaida.innerHTML = `
      <h2 id="logoutTitle">Sair da conta</h2>
      <p>Você realmente deseja sair?</p>
      <div class="logout-actions">
        <button type="button" class="btn btn-outline-secondary" data-cancel-logout>Cancelar</button>
        <button type="button" class="btn btn-primary" data-confirm-logout>Sair</button>
      </div>`;
    confirmacaoSaida.addEventListener('click', dialogEvent => {
      if (dialogEvent.target.closest('[data-cancel-logout]')) {
        confirmacaoSaida.close();
      }
      if (dialogEvent.target.closest('[data-confirm-logout]')) {
        sessionStorage.removeItem('intellistockToken');
        location.href = '/login.html';
      }
    });
    document.body.append(confirmacaoSaida);
  }

  if (!confirmacaoSaida.open) confirmacaoSaida.showModal();
});
