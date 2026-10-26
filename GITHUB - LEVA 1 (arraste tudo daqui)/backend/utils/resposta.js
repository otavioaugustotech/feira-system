/* ═══════════════════════════════════════════════════════════
   utils/resposta.js — RECONSTRUÍDO (não fazia parte do pacote "faltante")
   Formato inferido lendo frontend/Javascript.js: apiGet/apiPost/...
   leem `data.dados` no sucesso e `data.erro` no erro.

   Sucesso: { sucesso: true, mensagem, dados }
   Erro:    { erro: mensagem }
   ═══════════════════════════════════════════════════════════ */

const sucesso = (res, dados = null, mensagem = 'OK', status = 200) => {
  return res.status(status).json({ sucesso: true, mensagem, dados });
};

const erro = (res, mensagem = 'Erro inesperado.', status = 400) => {
  return res.status(status).json({ erro: mensagem });
};

module.exports = { sucesso, erro };


