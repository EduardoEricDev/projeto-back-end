// Erro operacional usado nos services para retornar status HTTP específico
class AppError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'AppError';
  }
}

function notFoundHandler(req, res) {
  return res.status(404).json({ error: 'Rota não encontrada' });
}

function errorHandler(err, req, res, _next) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.message });
  }

  // Erro de JSON malformado no corpo da requisição
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ error: 'JSON inválido no corpo da requisição' });
  }

  // Erros de validação ou unicidade do Sequelize
  if (
    err.name === 'SequelizeValidationError' ||
    err.name === 'SequelizeUniqueConstraintError' ||
    err.name === 'SequelizeForeignKeyConstraintError'
  ) {
    return res.status(400).json({
      error: err.errors?.[0]?.message || 'Dados inválidos na requisição',
    });
  }

  console.error(err);
  return res.status(500).json({ error: 'Erro interno do servidor' });
}

module.exports = {
  AppError,
  notFoundHandler,
  errorHandler,
};
