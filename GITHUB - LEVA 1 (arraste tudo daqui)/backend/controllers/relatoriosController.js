/* ═══════════════════════════════════════════════════════════
   controllers/relatoriosController.js — RECONSTRUÍDO (base original
   ausente do pacote "faltante"; só o patch de kpis foi fornecido).
   Ver aviso em services/relatoriosService.js.
   ═══════════════════════════════════════════════════════════ */

const relatoriosService = require('../services/relatoriosService');
const { sucesso, erro }  = require('../utils/resposta');

const resumo = async (req, res) => {
  try {
    const { data_inicio, data_fim } = req.query;
    const dados = await relatoriosService.resumo(req.usuario.id, data_inicio, data_fim);
    return sucesso(res, dados);
  } catch (err) {
    console.error('Erro no resumo de relatórios:', err);
    return erro(res, 'Erro ao gerar resumo.', 500);
  }
};

const hoje = async (req, res) => {
  try {
    const dados = await relatoriosService.hoje(req.usuario.id);
    return sucesso(res, dados);
  } catch (err) {
    console.error('Erro nos dados de hoje:', err);
    return erro(res, 'Erro ao buscar dados de hoje.', 500);
  }
};

const graficos = async (req, res) => {
  try {
    const { dias, data_inicio, data_fim } = req.query;
    const dados = await relatoriosService.graficos(req.usuario.id, dias, data_inicio, data_fim);
    return sucesso(res, dados);
  } catch (err) {
    console.error('Erro nos gráficos:', err);
    return erro(res, 'Erro ao buscar dados dos gráficos.', 500);
  }
};

const pdf = async (req, res) => {
  try {
    const dados = await relatoriosService.pdf(req.usuario.id);
    return sucesso(res, dados);
  } catch (err) {
    console.error('Erro ao montar dados do PDF:', err);
    return erro(res, 'Erro ao gerar dados do relatório.', 500);
  }
};

/* ⭐ do patch relatoriosController_kpis_patch.js */
const kpis = async (req, res) => {
  try {
    const { data_inicio, data_fim } = req.query;
    const dados = await relatoriosService.kpis(req.usuario.id, data_inicio, data_fim);
    return sucesso(res, dados);
  } catch (err) {
    console.error('Erro nos KPIs:', err);
    return erro(res, 'Erro ao calcular KPIs.', 500);
  }
};

module.exports = { resumo, hoje, graficos, pdf, kpis };