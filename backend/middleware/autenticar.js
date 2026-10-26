/* ═══════════════════════════════════════════════════════════
   middleware/autenticar.js — RECONSTRUÍDO (não fazia parte do pacote
   "faltante", mas é usado por TODAS as rotas). Valida o JWT gerado
   em authService.gerarToken() e popula req.usuario = { id, email, nome }.
   ═══════════════════════════════════════════════════════════ */

const jwt = require('jsonwebtoken');
const { erro } = require('../utils/resposta');

const autenticar = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return erro(res, 'Token não informado.', 401);
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = payload; // { id, email, nome, iat, exp }
    next();
  } catch (err) {
    return erro(res, 'Token inválido ou expirado.', 401);
  }
};

module.exports = autenticar;
