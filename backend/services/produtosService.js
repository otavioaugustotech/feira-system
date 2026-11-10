/* ═══════════════════════════════════════════════════════════
   services/produtosService.js — VERSÃO COMPLETA (substitui o original)
   Adicionado: estoque_minimo configurável por produto + estoqueBaixo()
   ═══════════════════════════════════════════════════════════ */

const db = require('../db');

/* ══ LISTAR produtos com filtros opcionais (mantido, + estoque_minimo) ══ */
const listar = async (usuarioId, filtros = {}) => {
  const { categoria, nome, ativo } = filtros;

  let query = `
    SELECT id, nome, categoria, tipo_venda,
           preco_custo, preco_venda, quantidade, estoque_minimo, imagem, ativo, created_at,
           ROUND(((preco_venda - preco_custo) / NULLIF(preco_custo,0)) * 100, 2) AS margem_lucro_pct,
           (quantidade <= estoque_minimo) AS estoque_baixo
    FROM produtos
    WHERE usuario_id = $1
  `;
  const params = [usuarioId];

  if (categoria) { params.push(categoria);        query += ` AND categoria = $${params.length}`; }
  if (nome)      { params.push(`%${nome}%`);      query += ` AND nome ILIKE $${params.length}`; }

  /* ⭐ CORREÇÃO: por padrão só mostra produtos ativos (um produto "excluído"
     é só marcado como ativo=false, nunca apagado de verdade do banco — para
     não perder o histórico de vendas). Antes, sem esse filtro por padrão,
     um produto excluído voltava a aparecer depois de recarregar a página.
     Para listar também os inativos, chame a rota com ?ativo=todos. */
  if (ativo === undefined || ativo === 'true' || ativo === true) {
    params.push(true);
    query += ` AND ativo = $${params.length}`;
  } else if (ativo === 'false' || ativo === false) {
    params.push(false);
    query += ` AND ativo = $${params.length}`;
  }
  /* ativo === 'todos' → não filtra, mostra ativos e inativos */

  query += ' ORDER BY nome ASC';
  const resultado = await db.query(query, params);
  return resultado.rows;
};

/* ══ BUSCAR produto por ID (mantido) ══ */
const buscarPorId = async (id, usuarioId) => {
  const resultado = await db.query(
    'SELECT * FROM produtos WHERE id = $1 AND usuario_id = $2',
    [id, usuarioId]
  );
  if (resultado.rows.length === 0) throw new Error('PRODUTO_NAO_ENCONTRADO');
  return resultado.rows[0];
};

/* ══ CRIAR novo produto (+ estoque_minimo) ══ */
const criar = async (usuarioId, dados) => {
  const { nome, categoria, tipo_venda, preco_custo, preco_venda, quantidade, estoque_minimo, imagem } = dados;

  if (parseFloat(preco_venda) <= parseFloat(preco_custo)) {
    throw new Error('PRECO_VENDA_MENOR_QUE_CUSTO');
  }

  const resultado = await db.query(
    `INSERT INTO produtos (usuario_id, nome, categoria, tipo_venda, preco_custo, preco_venda, quantidade, estoque_minimo, imagem, ativo)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)
     RETURNING *`,
    [usuarioId, nome, categoria, tipo_venda, preco_custo, preco_venda, quantidade || 0, estoque_minimo ?? 5, imagem || null]
  );
  return resultado.rows[0];
};

/* ══ ATUALIZAR produto (+ estoque_minimo) ══
   ⭐ CORREÇÃO: antes este UPDATE sobrescrevia TODAS as colunas com o
   que viesse em `dados`, mesmo campos não enviados (undefined) — um
   PUT parcial (ex: só trocando o preço) apagaria os demais campos.
   Agora usa COALESCE(novo_valor, valor_atual) buscando o registro
   atual primeiro, então campos omitidos mantêm o valor que já tinham. */
const atualizar = async (id, usuarioId, dados) => {
  const atual = await buscarPorId(id, usuarioId);

  const nome           = dados.nome ?? atual.nome;
  const categoria      = dados.categoria ?? atual.categoria;
  const tipo_venda     = dados.tipo_venda ?? atual.tipo_venda;
  const preco_custo    = dados.preco_custo ?? atual.preco_custo;
  const preco_venda    = dados.preco_venda ?? atual.preco_venda;
  const quantidade     = dados.quantidade ?? atual.quantidade;
  const estoque_minimo = dados.estoque_minimo ?? atual.estoque_minimo;
  const ativo          = dados.ativo ?? atual.ativo;
  /* imagem: null REMOVE a imagem; campo ausente mantém a atual */
  const imagem         = dados.imagem !== undefined ? dados.imagem : atual.imagem;

  if (parseFloat(preco_venda) <= parseFloat(preco_custo)) {
    throw new Error('PRECO_VENDA_MENOR_QUE_CUSTO');
  }

  const resultado = await db.query(
    `UPDATE produtos SET nome=$1, categoria=$2, tipo_venda=$3,
     preco_custo=$4, preco_venda=$5, quantidade=$6, estoque_minimo=$7, ativo=$8, imagem=$9
     WHERE id=$10 AND usuario_id=$11 RETURNING *`,
    [nome, categoria, tipo_venda, preco_custo, preco_venda, quantidade, estoque_minimo, ativo, imagem, id, usuarioId]
  );
  return resultado.rows[0];
};

/* ══ DELETAR (desativar) produto (mantido) ══ */
const deletar = async (id, usuarioId) => {
  await buscarPorId(id, usuarioId);
  await db.query(
    'UPDATE produtos SET ativo = false WHERE id = $1 AND usuario_id = $2',
    [id, usuarioId]
  );
  return { mensagem: 'Produto desativado com sucesso' };
};

/* ══ ESTOQUE BAIXO (⭐ NOVO) — usa o limite individual de cada produto,
   em vez do "<= 5" fixo que estava hardcoded em relatoriosService ══ */
const estoqueBaixo = async (usuarioId) => {
  const resultado = await db.query(
    `SELECT id, nome, categoria, tipo_venda, quantidade, estoque_minimo
     FROM produtos
     WHERE usuario_id = $1 AND ativo = true AND quantidade <= estoque_minimo
     ORDER BY quantidade ASC`,
    [usuarioId]
  );
  return resultado.rows;
};

module.exports = { listar, buscarPorId, criar, atualizar, deletar, estoqueBaixo };
