/* controllers/leadsController.js — ⭐ NOVO (formulário da Landing Page) */
const leadsService      = require('../services/leadsService');
const { sucesso, erro } = require('../utils/resposta');
const { logErro }       = require('../utils/logger');

const MENSAGEM_OK = 'Recebemos sua mensagem! Em breve entraremos em contato.';

/* POST /api/leads — rota pública (não exige login) */
const criar = async (req, res) => {
  try {
    /* Honeypot preenchido = robô. Respondemos "sucesso" para não dar
       pista ao robô, mas nada é gravado. */
    if (req.body.site) return sucesso(res, null, MENSAGEM_OK, 201);

    const { site, ...dados } = req.body;
    const { lead, duplicado } = await leadsService.criar(dados, {
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    return sucesso(res, { id: lead.id }, MENSAGEM_OK, duplicado ? 200 : 201);
  } catch (err) {
    logErro('leads.criar', err);
    return erro(res, 'Não foi possível enviar sua mensagem agora. Tente novamente em instantes.', 500);
  }
};

module.exports = { criar };
