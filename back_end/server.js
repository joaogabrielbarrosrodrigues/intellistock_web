'use strict';
require('dotenv').config();
const path = require('path');
const express = require('express');
const dashboardRouter = require('./routes/dashboard.routes');

const app = express();
const frontEndPath = path.resolve(__dirname, '..', 'front_end');

app.disable('x-powered-by');
app.use(express.json({ limit: '100kb' }));
app.use('/api/dashboard', dashboardRouter);

// Pontos de integração posteriores (a equipe adicionará os próprios módulos):
// app.use('/api/fornecedores', require('./routes/fornecedores.routes'));
// app.use('/api/produtos', require('./routes/produtos.routes'));
// app.use('/api/movimentacoes', require('./routes/movimentacoes.routes'));

app.use(express.static(frontEndPath));
app.get('/', (req, res) => res.sendFile(path.join(frontEndPath, 'index.html')));
app.use('/api', (req, res) => res.status(404).json({ erro: 'Endpoint da API não encontrado.' }));

if (require.main === module) {
  const port = Number(process.env.PORT || 3000);
  app.listen(port, () => {
    console.log(`IntelliStock Web disponível em http://localhost:${port}`);
    console.log(`Dashboard em modo: ${process.env.DASHBOARD_DATA_SOURCE || 'mock'}`);
  });
}
module.exports = { app };
