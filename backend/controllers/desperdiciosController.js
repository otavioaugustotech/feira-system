/* ═══════════════════════════════════════════════════════════
   controllers/desperdiciosController.js — VERSÃO COMPLETA (substitui o original)
   Adicionado: exportarPDF() e exportarWord()
   ═══════════════════════════════════════════════════════════ */

const desperdiciosService = require('../services/desperdiciosService');
const { dataLocalISO } = require('../utils/datas'); /* ⭐ datas no fuso do Brasil */
const { sucesso, erro }   = require('../utils/resposta');
const { gerarPDFDesperdicios, gerarWordDesperdicios } = require('../utils/exportDesperdicios');

/* POST /api/desperdicios (mantido) */
const registrar = async (req, res) => {
  try {
    const { produto_id, quantidade } = req.body;
    if (!produto_id || !quantidade || quantidade <= 0) {
      return erro(res, 'produto_id e quantidade válida são obrigatórios.', 400);
    }
    const desperdicio = await desperdiciosService.registrar(req.usuario.id, req.body);
    return sucesso(res, desperdicio, 'Desperdício registrado.', 201);
 } catch (err) {
  if (err.message === 'PRODUTO_NAO_ENCONTRADO') return erro(res, 'Produto não encontrado.', 404);
  if (err.message === 'ESTOQUE_INSUFICIENTE')   return erro(res, 'Quantidade maior que o estoque.', 400);
  console.error('Erro ao registrar desperdício:', err); /* ⭐ correção da auditoria */
  return erro(res, 'Erro ao registrar desperdício.', 500);
}
};

/* GET /api/desperdicios (mantido) */
const listar = async (req, res) => {
  try {
    const dados = await desperdiciosService.listar(req.usuario.id, req.query);
    return sucesso(res, dados);
 } catch (err) {
  console.error('Erro ao buscar desperdícios:', err); /* ⭐ correção da auditoria */
  return erro(res, 'Erro ao buscar desperdícios.', 500);
}
};

/* Função auxiliar compartilhada pelos dois exports */
const _buscarDadosExport = async (usuarioId, query) => {
  const { data_inicio, data_fim, categoria_motivo, produto_id } = query;
  const inicio = data_inicio || dataLocalISO(30);
  const fim    = data_fim    || dataLocalISO();

  const registros = await desperdiciosService.listar(usuarioId, {
    data_inicio: inicio, data_fim: fim, categoria_motivo, produto_id,
  });
  const totalPerda = registros.reduce((acc, r) => acc + parseFloat(r.valor_perda), 0);

  /* ⭐ prejuízo agrupado pela categoria do motivo (maior perda primeiro) */
  const porCategoria = {};
  registros.forEach((r) => {
    const chave = r.categoria_motivo || 'outros';
    porCategoria[chave] = (porCategoria[chave] || 0) + parseFloat(r.valor_perda);
  });
  const totaisPorCategoria = Object.entries(porCategoria)
    .map(([categoria, valor]) => ({ categoria, valor }))
    .sort((a, b) => b.valor - a.valor);

  return { registros, totalPerda, totaisPorCategoria, periodo: { inicio, fim } };
};

/* GET /api/desperdicios/exportar/pdf — ⭐ NOVO */
const exportarPDF = async (req, res) => {
  try {
    const { registros, totalPerda, totaisPorCategoria, periodo } = await _buscarDadosExport(req.usuario.id, req.query);
    const buffer = await gerarPDFDesperdicios(registros, totalPerda, periodo, totaisPorCategoria);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="desperdicios_${periodo.inicio}_a_${periodo.fim}.pdf"`);
    return res.send(buffer);
  } catch (err) {
    console.error('Erro ao exportar PDF de desperdícios:', err);
    return erro(res, 'Erro ao gerar PDF de desperdícios.', 500);
  }
};

/* GET /api/desperdicios/exportar/word — ⭐ NOVO */
const exportarWord = async (req, res) => {
  try {
    const { registros, totalPerda, totaisPorCategoria, periodo } = await _buscarDadosExport(req.usuario.id, req.query);
    const buffer = await gerarWordDesperdicios(registros, totalPerda, periodo, totaisPorCategoria);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="desperdicios_${periodo.inicio}_a_${periodo.fim}.docx"`);
    return res.send(buffer);
  } catch (err) {
    console.error('Erro ao exportar Word de desperdícios:', err);
    return erro(res, 'Erro ao gerar documento Word de desperdícios.', 500);
  }
};

/* DELETE /api/desperdicios/:id — ⭐ NOVO */
const deletar = async (req, res) => {
  try {
    const resultado = await desperdiciosService.deletar(req.params.id, req.usuario.id);
    return sucesso(res, resultado, 'Desperdício removido e estoque devolvido!');
  } catch (err) {
    if (err.message === 'DESPERDICIO_NAO_ENCONTRADO') return erro(res, 'Registro de desperdício não encontrado.', 404);
    console.error('Erro ao remover desperdício:', err);
    return erro(res, 'Erro ao remover desperdício.', 500);
  }
};

module.exports = { registrar, listar, deletar, exportarPDF, exportarWord };
