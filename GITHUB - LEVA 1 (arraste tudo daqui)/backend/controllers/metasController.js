/* controllers/metasController.js — ⭐ NOVO */
const metasService     = require('../services/metasService');
const { sucesso, erro } = require('../utils/resposta');

/* POST /api/metas — define (cria ou atualiza) a meta de um mês */
const definir = async (req, res) => {
  try {
    const { ano, mes, meta_receita, meta_lucro } = req.body;

    if (!ano || !mes) return erro(res, 'ano e mes são obrigatórios.', 400);
    if (meta_receita === undefined || meta_receita === null) {
      return erro(res, 'meta_receita é obrigatória.', 400);
    }

    const meta = await metasService.definir(req.usuario.id, { ano, mes, meta_receita, meta_lucro });
    return sucesso(res, meta, 'Meta salva com sucesso!', 201);

  } catch (err) {
    if (err.message === 'ANO_MES_INVALIDOS')   return erro(res, 'Informe um mês (1-12) e ano válidos.', 400);
    if (err.message === 'META_RECEITA_INVALIDA') return erro(res, 'meta_receita deve ser um número maior ou igual a zero.', 400);
    console.error('Erro ao definir meta:', err);
    return erro(res, 'Erro ao salvar meta.', 500);
  }
};

/* GET /api/metas — histórico de metas do usuário */
const listar = async (req, res) => {
  try {
    const metas = await metasService.listar(req.usuario.id);
    return sucesso(res, metas);
  } catch (err) {
    console.error('Erro ao buscar metas:', err);
    return erro(res, 'Erro ao buscar metas.', 500);
  }
};

/* DELETE /api/metas/:id */
const deletar = async (req, res) => {
  try {
    const resultado = await metasService.deletar(req.params.id, req.usuario.id);
    return sucesso(res, resultado, 'Meta removida com sucesso!');
  } catch (err) {
    if (err.message === 'META_NAO_ENCONTRADA') return erro(res, 'Meta não encontrada.', 404);
    console.error('Erro ao remover meta:', err);
    return erro(res, 'Erro ao remover meta.', 500);
  }
};

/* GET /api/metas/progresso?ano=2026&mes=7 — realizado vs. meta (⭐ endpoint principal) */
const progresso = async (req, res) => {
  try {
    const hoje = new Date();
    const ano = req.query.ano || hoje.getFullYear();
    const mes = req.query.mes || (hoje.getMonth() + 1);

    const dados = await metasService.progresso(req.usuario.id, ano, mes);
    return sucesso(res, dados);
  } catch (err) {
    console.error('Erro ao calcular progresso da meta:', err);
    return erro(res, 'Erro ao calcular progresso da meta.', 500);
  }
};

module.exports = { definir, listar, deletar, progresso };
