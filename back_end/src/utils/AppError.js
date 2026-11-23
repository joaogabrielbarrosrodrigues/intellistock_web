/**
 * Erro "esperado" da aplicação, com o código HTTP que deve ser devolvido.
 * Ex.: throw new AppError(404, 'Produto não encontrado.');
 */
class AppError extends Error {
  constructor(status, mensagem) {
    super(mensagem);
    this.status = status;
  }
}

module.exports = AppError;
