/**
 * Middleware de tratamento de erros: transforma qualquer erro em uma
 * resposta JSON no formato { mensagem: "..." } com o código HTTP adequado.
 */
const AppError = require('../utils/AppError');

// Mensagens amigáveis para restrições UNIQUE do banco
const MENSAGENS_UNIQUE = {
  usuarios_email_key: 'E-mail já cadastrado.',
  fornecedores_cnpj_key: 'CNPJ já cadastrado para outro fornecedor.',
};

// eslint-disable-next-line no-unused-vars
function tratamentoErros(erro, req, res, next) {
  if (erro instanceof AppError) {
    return res.status(erro.status).json({ mensagem: erro.message });
  }

  // JSON mal formado no corpo da requisição
  if (erro.type === 'entity.parse.failed') {
    return res.status(400).json({ mensagem: 'O corpo da requisição não é um JSON válido.' });
  }

  // Erros do PostgreSQL (códigos SQLSTATE)
  switch (erro.code) {
    case '23505': // unique_violation
      return res.status(409).json({ mensagem: MENSAGENS_UNIQUE[erro.constraint] || 'Registro duplicado.' });
    case '23503': // foreign_key_violation
      return res.status(409).json({ mensagem: 'Operação não permitida: existem registros vinculados.' });
    case '23514': // check_violation
      return res.status(400).json({ mensagem: 'Valor fora do permitido.' });
    case '22P02': // invalid_text_representation
    case '22003': // numeric_value_out_of_range
      return res.status(400).json({ mensagem: 'Valor inválido informado.' });
    case 'ECONNREFUSED':
    case '28P01':
    case '3D000':
      console.error('Erro de conexão com o banco:', erro.message);
      return res.status(503).json({ mensagem: 'Banco de dados indisponível.' });
    default:
      console.error(erro);
      return res.status(500).json({ mensagem: 'Erro interno no servidor.' });
  }
}

module.exports = tratamentoErros;
