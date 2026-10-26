/* ═══════════════════════════════════════════════════════════
   utils/logger.js — ⭐ NOVO
   Logger central simples: em vez de cada controller escrever
   console.error com um texto diferente, usa sempre o mesmo formato
   "❌ [contexto] mensagem" — fica mais fácil de buscar nos logs
   depois (ex.: grep "produtos.criar" nos logs de produção).
   ═══════════════════════════════════════════════════════════ */

const logErro = (contexto, err) => {
  console.error(`❌ [${contexto}]`, err.message, err.stack);
};

module.exports = { logErro };
