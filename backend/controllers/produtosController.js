/* ═══════════════════════════════════════════════════════════
   controllers/produtosController.js — VERSÃO COMPLETA (substitui o original)
   ═══════════════════════════════════════════════════════════ */

const produtosService   = require('../services/produtosService');
const { sucesso, erro } = require('../utils/resposta');

/* GET /api/produtos */
const listar = async (req, res) => {
  try {
    const produtos = await produtosService.listar(req.usuario.id, req.query);
    return sucesso(res, produtos);
  } catch (err) {
    console.error('Erro ao buscar produtos:', err); /* ⭐ correção da auditoria */
    return erro(res, 'Erro ao buscar produtos.', 500);
  }
};

/* GET /api/produtos/estoque-baixo — ⭐ NOVO (precisa vir ANTES de /:id na rota) */
const listarEstoqueBaixo = async (req, res) => {
  try {
    const produtos = await produtosService.estoqueBaixo(req.usuario.id);
    return sucesso(res, produtos);
  } catch (err) {
    console.error('Erro ao buscar produtos com estoque baixo:', err); /* ⭐ correção da auditoria */
    return erro(res, 'Erro ao buscar produtos com estoque baixo.', 500);
  }
};

/* GET /api/produtos/:id */
const buscarPorId = async (req, res) => {
  try {
    const produto = await produtosService.buscarPorId(req.params.id, req.usuario.id);
    return sucesso(res, produto);
  } catch (err) {
    if (err.message === 'PRODUTO_NAO_ENCONTRADO') return erro(res, 'Produto não encontrado.', 404);
    console.error('Erro ao buscar produto:', err); /* ⭐ correção da auditoria */
    return erro(res, 'Erro ao buscar produto.', 500);
  }
};

/* POST /api/produtos */
const criar = async (req, res) => {
  try {
    const { nome, preco_custo, preco_venda } = req.body;
    if (!nome || !preco_custo || !preco_venda) {
      return erro(res, 'Nome, preço de custo e preço de venda são obrigatórios.', 400);
    }
    const produto = await produtosService.criar(req.usuario.id, req.body);
    return sucesso(res, produto, 'Produto criado com sucesso!', 201);
  } catch (err) {
    if (err.message === 'PRECO_VENDA_MENOR_QUE_CUSTO') {
      return erro(res, 'O preço de venda deve ser maior que o preço de custo.', 400);
    }
    console.error('Erro ao criar produto:', err); /* ⭐ correção da auditoria */
    return erro(res, 'Erro ao criar produto.', 500);
  }
};

/* PUT /api/produtos/:id */
const atualizar = async (req, res) => {
  try {
    const produto = await produtosService.atualizar(req.params.id, req.usuario.id, req.body);
    return sucesso(res, produto, 'Produto atualizado com sucesso!');
  } catch (err) {
    if (err.message === 'PRODUTO_NAO_ENCONTRADO') return erro(res, 'Produto não encontrado.', 404);
    if (err.message === 'PRECO_VENDA_MENOR_QUE_CUSTO') return erro(res, 'Preço de venda deve ser maior que custo.', 400);
    console.error('Erro ao atualizar produto:', err); /* ⭐ correção da auditoria */
    return erro(res, 'Erro ao atualizar produto.', 500);
  }
};

/* DELETE /api/produtos/:id */
const deletar = async (req, res) => {
  try {
    const resultado = await produtosService.deletar(req.params.id, req.usuario.id);
    return sucesso(res, resultado, 'Produto removido com sucesso!');
  } catch (err) {
    if (err.message === 'PRODUTO_NAO_ENCONTRADO') return erro(res, 'Produto não encontrado.', 404);
    console.error('Erro ao remover produto:', err); /* ⭐ correção da auditoria */
    return erro(res, 'Erro ao remover produto.', 500);
  }
};

module.exports = { listar, buscarPorId, criar, atualizar, deletar, listarEstoqueBaixo };
