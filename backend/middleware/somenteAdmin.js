/* ═══════════════════════════════════════════════════════════
   middleware/somenteAdmin.js — ⭐ NOVO
   Usar DEPOIS de `autenticar`: só deixa passar quem está em ADMIN_EMAILS.
   Feirante comum recebe 403 (está logado, mas não tem permissão).
   ═══════════════════════════════════════════════════════════ */

const { erro } = require('../utils/resposta');
const { ehAdmin } = require('../utils/admin');

const somenteAdmin = (req, res, next) => {
  if (!ehAdmin(req.usuario?.email)) {
    return erro(res, 'Acesso restrito ao administrador do sistema.', 403);
  }
  next();
};

module.exports = somenteAdmin;
