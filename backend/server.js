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

/* ⭐ Garante, ao iniciar, as colunas novas do banco:
   - categoria_motivo em desperdicios (migracao-categoria-desperdicio.sql)
   - imagem em produtos (migracao-imagem-produto.sql)
   Os scripts são idempotentes (IF NOT EXISTS): num banco já atualizado
   não mudam nada. Se um falhar, o servidor sobe mesmo assim e o erro
   fica no log. */
const MIGRACOES = ['migracao-categoria-desperdicio.sql', 'migracao-imagem-produto.sql'];

const aplicarMigracoes = async () => {
  for (const nome of MIGRACOES) {
    const arquivo = path.join(__dirname, '..', 'database', nome);
    if (!fs.existsSync(arquivo)) continue;
    try {
      await db.query(fs.readFileSync(arquivo, 'utf8'));
    } catch (err) {
      console.error(`Não foi possível aplicar a migração ${nome}:`, err.message);
    }
  }
};

aplicarMigracoes().finally(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
  });
});
