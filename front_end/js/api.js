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
