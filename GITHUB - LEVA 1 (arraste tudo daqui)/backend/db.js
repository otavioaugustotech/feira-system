/* ═══════════════════════════════════════════════════════════
   db.js — RECONSTRUÍDO (não fazia parte do pacote "faltante")
   Pool de conexão PostgreSQL usando `pg`, no padrão que todos os
   services do projeto esperam: db.query(...) e db.connect() (para
   transações com client.query/BEGIN/COMMIT/ROLLBACK/release()).
   ═══════════════════════════════════════════════════════════ */

const { Pool } = require('pg');

const pool = new Pool({
  host:     process.env.DB_HOST || 'localhost',
  port:     process.env.DB_PORT || 5432,
  user:     process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'feira_system',
  /* ⭐ Fuso do Brasil também no banco: NOW(), CURRENT_DATE e created_at::date
     passam a concordar com as datas calculadas no Node (utils/datas.js). */
  options: `-c timezone=${process.env.APP_TIMEZONE || 'America/Sao_Paulo'}`,
  /* ⭐ Banco fora da rede do servidor (Neon, Supabase, URL externa do Render)
     exige conexão criptografada: DB_SSL=true. Pela rede interna do Render
     (render.yaml) não precisa. */
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
});

pool.on('error', (err) => {
  console.error('Erro inesperado no pool do PostgreSQL:', err);
});

module.exports = {
  query:   (text, params) => pool.query(text, params),
  connect: () => pool.connect(),
  pool,
};
