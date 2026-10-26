/* ═══════════════════════════════════════════════════════════
   database/migracao-google.sql — Login com Google
   Rode UMA VEZ no banco que você já usa (não apaga nenhum dado):
     psql -U postgres -d feira_system -f migracao-google.sql
   Pode rodar de novo sem problema (usa IF NOT EXISTS).
   ═══════════════════════════════════════════════════════════ */

BEGIN;

/* Guarda o identificador da conta Google do usuário */
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) UNIQUE;

/* Quem entra pelo Google não tem senha, então a senha deixa de ser obrigatória */
ALTER TABLE usuarios ALTER COLUMN senha_hash DROP NOT NULL;

COMMIT;
