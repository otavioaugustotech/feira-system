/* controllers/leadsController.js — ⭐ NOVO (formulário da Landing Page) */
const leadsService      = require('../services/leadsService');
const { sucesso, erro } = require('../utils/resposta');
const { logErro }       = require('../utils/logger');

/* /leads/abc ou /leads/-1 → 404 (sem isto o Postgres reclamaria e viraria 500) */
const idValido = (id) => /^[1-9][0-9]{0,8}$/.test(String(id));

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

/* GET /api/leads?status=novo&busca=maria&pagina=1 — só admin */
const listar = async (req, res) => {
  try {
    const { status, busca, pagina } = req.query;
    const dados = await leadsService.listar({
      status: typeof status === 'string' ? status : undefined,
      busca: typeof busca === 'string' ? busca.trim().slice(0, 100) : undefined,
      pagina,
    });
    return sucesso(res, dados);
  } catch (err) {
    logErro('leads.listar', err);
    return erro(res, 'Erro ao buscar contatos.', 500);
  }
};

/* PATCH /api/leads/:id — { status } — só admin */
const atualizarStatus = async (req, res) => {
  try {
    if (!idValido(req.params.id)) return erro(res, 'Contato não encontrado.', 404);
    const lead = await leadsService.atualizarStatus(Number(req.params.id), req.body.status);
    return sucesso(res, lead, 'Contato atualizado.');
  } catch (err) {
    if (err.message === 'LEAD_NAO_ENCONTRADO') return erro(res, 'Contato não encontrado.', 404);
    logErro('leads.atualizarStatus', err);
    return erro(res, 'Erro ao atualizar contato.', 500);
  }
};

/* DELETE /api/leads/:id — só admin */
const remover = async (req, res) => {
  try {
    if (!idValido(req.params.id)) return erro(res, 'Contato não encontrado.', 404);
    const resultado = await leadsService.remover(Number(req.params.id));
    return sucesso(res, resultado, 'Contato excluído.');
  } catch (err) {
    if (err.message === 'LEAD_NAO_ENCONTRADO') return erro(res, 'Contato não encontrado.', 404);
    logErro('leads.remover', err);
    return erro(res, 'Erro ao excluir contato.', 500);
  }
};

module.exports = { criar, listar, atualizarStatus, remover };
