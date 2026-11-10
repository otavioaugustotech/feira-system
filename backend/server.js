/* ═══════════════════════════════════════════════════════════
   server.js — agora só liga o servidor. O app em si (rotas,
   middlewares) vive em app.js, pra poder ser testado sem precisar
   abrir uma porta de rede de verdade (ver tests/).
   ═══════════════════════════════════════════════════════════ */

const fs = require('fs');
const path = require('path');
const app = require('./app');
const db = require('./db');

const PORT = process.env.PORT || 3000;

/* ⭐ Garante, ao iniciar, a coluna categoria_motivo em desperdicios
   (database/migracao-categoria-desperdicio.sql). O script é idempotente
   (IF NOT EXISTS): num banco já atualizado não muda nada. Se falhar,
   o servidor sobe mesmo assim e o erro fica no log. */
const aplicarMigracoes = async () => {
  const arquivo = path.join(__dirname, '..', 'database', 'migracao-categoria-desperdicio.sql');
  if (!fs.existsSync(arquivo)) return;
  try {
    await db.query(fs.readFileSync(arquivo, 'utf8'));
  } catch (err) {
    console.error('Não foi possível aplicar a migração de categoria de desperdício:', err.message);
  }
};

aplicarMigracoes().finally(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
  });
});
