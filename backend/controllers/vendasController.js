/* controllers/vendasController.js — VERSÃO COMPLETA (substitui o original) */
const vendasService     = require('../services/vendasService');
const { sucesso, erro }  = require('../utils/resposta');

/* GET /api/vendas */
const listar = async (req, res) => {
  try {
    const vendas = await vendasService.listar(req.usuario.id, req.query);
    return sucesso(res, vendas);
  } catch (err) {
    console.error('Erro ao buscar vendas:', err);
    return erro(res, 'Erro ao buscar vendas.', 500);
  }
};

/* GET /api/vendas/:id */
const buscarPorId = async (req, res) => {
  try {
    const venda = await vendasService.buscarPorId(req.params.id, req.usuario.id);
    return sucesso(res, venda);
  } catch (err) {
    if (err.message === 'VENDA_NAO_ENCONTRADA') return erro(res, 'Venda não encontrada.', 404);
    console.error('Erro ao buscar venda:', err);
    return erro(res, 'Erro ao buscar venda.', 500);
  }
};

/* POST /api/vendas — ⭐ NOVO: registrar venda com múltiplos itens */
const criar = async (req, res) => {
  try {
    const { forma_pagamento, itens } = req.body;

    if (!forma_pagamento) {
      return erro(res, 'Forma de pagamento é obrigatória.', 400);
    }
    if (!Array.isArray(itens) || itens.length === 0) {
      return erro(res, 'A venda deve conter ao menos um item.', 400);
    }

    const venda = await vendasService.criar(req.usuario.id, { forma_pagamento, itens });
    return sucesso(res, venda, 'Venda registrada com sucesso!', 201);

  } catch (err) {
    if (err.message === 'PRODUTO_NAO_ENCONTRADO') {
      return erro(res, `Produto (id ${err.produto_id}) não encontrado ou inativo.`, 404);
    }
    if (err.message === 'ESTOQUE_INSUFICIENTE') {
      return erro(res, `Estoque insuficiente para "${err.produto_nome}". Disponível: ${err.disponivel}.`, 400);
    }
    if (err.message === 'ITEM_INVALIDO') {
      return erro(res, 'Cada item precisa de produto_id e quantidade maior que zero.', 400);
    }
    console.error('Erro ao registrar venda:', err);
    return erro(res, 'Erro ao registrar venda.', 500);
  }
};

/* PATCH /api/vendas/:id/cancelar — ⭐ NOVO: cancelamento com reversão de estoque */
const cancelar = async (req, res) => {
  try {
    const { motivo } = req.body;
    const venda = await vendasService.cancelar(req.params.id, req.usuario.id, motivo);
    return sucesso(res, venda, 'Venda cancelada e estoque revertido com sucesso!');
  } catch (err) {
    if (err.message === 'VENDA_NAO_ENCONTRADA') return erro(res, 'Venda não encontrada.', 404);
    if (err.message === 'VENDA_JA_CANCELADA')   return erro(res, 'Esta venda já está cancelada.', 400);
    console.error('Erro ao cancelar venda:', err);
    return erro(res, 'Erro ao cancelar venda.', 500);
  }
};

module.exports = { listar, buscarPorId, criar, cancelar };
