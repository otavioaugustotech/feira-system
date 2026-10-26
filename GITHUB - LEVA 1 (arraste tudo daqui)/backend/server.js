/* ═══════════════════════════════════════════════════════════
   server.js — agora só liga o servidor. O app em si (rotas,
   middlewares) vive em app.js, pra poder ser testado sem precisar
   abrir uma porta de rede de verdade (ver tests/).
   ═══════════════════════════════════════════════════════════ */

const app = require('./app');

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});
