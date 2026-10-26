/* ═══════════════════════════════════════════════════════════
   middleware/limitarTentativas.js — ⭐ NOVO (correção da auditoria)
   A auditoria constatou que /api/auth/login e /api/auth/registro
   não tinham nenhum limite de tentativas — 5 logins errados seguidos
   eram todos processados normalmente, sem nenhum tipo de bloqueio
   (brute force sem freio). Este middleware usa express-rate-limit
   para limitar tentativas por IP numa janela de tempo.
   ═══════════════════════════════════════════════════════════ */

const rateLimit = require('express-rate-limit');

const janelaMs = Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000; /* 15 min */
const maxTentativas = Number(process.env.AUTH_RATE_LIMIT_MAX) || 10;

const limitarLogin = rateLimit({
  windowMs: janelaMs,
  max: maxTentativas,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      erro: 'Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.',
    });
  },
});

/* ⭐ Formulário de contato da Landing Page: rota pública, então o limite é
   bem mais apertado que o do login (padrão: 5 envios por IP a cada 15 min). */
const limitarLeads = rateLimit({
  windowMs: Number(process.env.LEADS_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: Number(process.env.LEADS_RATE_LIMIT_MAX) || 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      erro: 'Você já enviou várias mensagens. Aguarde alguns minutos e tente novamente.',
    });
  },
});

module.exports = { limitarLogin, limitarLeads };
