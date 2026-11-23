/**
 * Configuração do Express: middlewares, rotas da API e arquivos do front-end.
 */
const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const rotas = require('./routes');
const tratamentoErros = require('./middlewares/tratamentoErros');

const app = express();

app.use(cors()); // permite abrir o front-end por outro endereço (ex.: Live Server)
app.use(express.json({ limit: '100kb' }));

// API REST
app.use('/api', rotas);
app.use('/api', (req, res) => res.status(404).json({ mensagem: 'Rota não encontrada.' }));

// Serve o front-end (pasta ../front_end) no mesmo endereço da API: http://localhost:3000
const pastaFrontEnd = path.resolve(__dirname, '..', '..', 'front_end');
if (fs.existsSync(pastaFrontEnd)) {
  app.use(express.static(pastaFrontEnd));
}

app.use(tratamentoErros);

module.exports = app;
