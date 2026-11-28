function fonteDashboard() {
  return (process.env.DASHBOARD_DATA_SOURCE ?? 'mock').trim().toLowerCase();
}

function fonteValida(fonte) {
  return fonte === 'mock' || fonte === 'postgres';
}

module.exports = { fonteDashboard, fonteValida };
