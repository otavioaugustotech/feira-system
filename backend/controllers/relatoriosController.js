/* ═══════════════════════════════════════════════════════════
   controllers/relatoriosController.js
   ⭐ Atualizado: todas as rotas de indicadores aceitam, na query string,
   data_inicio, data_fim (AAAA-MM-DD), produto_id e categoria.
   ═══════════════════════════════════════════════════════════ */

const relatoriosService = require('../services/relatoriosService');
const { sucesso, erro }  = require('../utils/resposta');

const REGEX_DATA = /^\d{4}-\d{2}-\d{2}$/;

/* Lê e valida período + filtros da query string.
   Devolve { erroMsg } quando algo está inválido. */
const lerParametros = (query) => {
  const { data_inicio, data_fim, produto_id, categoria } = query;
  for (const [nome, valor] of [['data_inicio', data_inicio], ['data_fim', data_fim]]) {
    if (valor !== undefined && valor !== '' && (!REGEX_DATA.test(valor) || Number.isNaN(Date.parse(valor)))) {
      return { erroMsg: `${nome} inválida: use o formato AAAA-MM-DD.` };
    }
  }
  if (data_inicio && data_fim && data_inicio > data_fim) {
    return { erroMsg: 'A data inicial não pode ser maior que a data final.' };
  }
  if (produto_id !== undefined && produto_id !== '' && !/^\d+$/.test(String(produto_id))) {
    return { erroMsg: 'produto_id inválido.' };
  }
  return {
    inicio: data_inicio || undefined,
    fim: data_fim || undefined,
    filtros: { produto_id, categoria },
  };
};

const resumo = async (req, res) => {
  const p = lerParametros(req.query);
  if (p.erroMsg) return erro(res, p.erroMsg, 400);
  try {
    const dados = await relatoriosService.resumo(req.usuario.id, p.inicio, p.fim, p.filtros);
    return sucesso(res, dados);
  } catch (err) {
    console.error('Erro no resumo de relatórios:', err);
    return erro(res, 'Erro ao gerar resumo.', 500);
  }
};

const hoje = async (req, res) => {
  const p = lerParametros(req.query);
  if (p.erroMsg) return erro(res, p.erroMsg, 400);
  try {
    const dados = await relatoriosService.hoje(req.usuario.id, p.inicio, p.fim, p.filtros);
    return sucesso(res, dados);
  } catch (err) {
    console.error('Erro nos dados de hoje:', err);
    return erro(res, 'Erro ao buscar dados de hoje.', 500);
  }
};

const graficos = async (req, res) => {
  const p = lerParametros(req.query);
  if (p.erroMsg) return erro(res, p.erroMsg, 400);
  try {
    const dados = await relatoriosService.graficos(req.usuario.id, req.query.dias, p.inicio, p.fim, p.filtros);
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

const kpis = async (req, res) => {
  const p = lerParametros(req.query);
  if (p.erroMsg) return erro(res, p.erroMsg, 400);
  try {
    const dados = await relatoriosService.kpis(req.usuario.id, p.inicio, p.fim, p.filtros);
    return sucesso(res, dados);
  } catch (err) {
    console.error('Erro nos KPIs:', err);
    return erro(res, 'Erro ao calcular KPIs.', 500);
  }
};

module.exports = { resumo, hoje, graficos, pdf, kpis };
