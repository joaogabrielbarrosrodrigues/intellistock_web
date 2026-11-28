// Mantém a entrada usada pelo módulo de banco com o mesmo pool da API.
const { pool, query, transacao } = require('../src/config/db');

module.exports = { pool, query, transaction: transacao };