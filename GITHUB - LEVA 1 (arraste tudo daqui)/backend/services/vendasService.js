/* ═══════════════════════════════════════════════════════════
   services/vendasService.js — VERSÃO COMPLETA
   Este arquivo SUBSTITUI o original. Foi adicionado:
     - criar()    → registra venda com múltiplos itens, calcula
                    totais/lucro automaticamente e dá baixa no estoque
     - cancelar() → cancela uma venda e devolve os itens ao estoque
   As funções listar() e buscarPorId() originais foram mantidas.
   ═══════════════════════════════════════════════════════════ */

const db = require('../db');

/* ══ LISTAR vendas com filtros (ORIGINAL, sem alterações) ══ */
/* ⭐ CORREÇÃO (análise de escalabilidade): antes, listava TODAS as vendas
   do usuário de uma vez, sem limite. Com meses/anos de uso, isso ficaria
   cada vez mais lento (banco e navegador). Agora pagina por padrão 20
   vendas por página, aceitando ?pagina= e ?porPagina= na query string. */
const listar = async (usuarioId, filtros = {}) => {
  const { data_inicio, data_fim, forma_pagamento, status } = filtros;

  const pagina = Math.max(parseInt(filtros.pagina, 10) || 1, 1);
  const porPagina = Math.min(Math.max(parseInt(filtros.porPagina, 10) || 20, 1), 100);
  const offset = (pagina - 1) * porPagina;

  let condicoes = ' WHERE v.usuario_id = $1';
  const params = [usuarioId];

  if (data_inicio)     { params.push(data_inicio);            condicoes += ` AND v.created_at >= $${params.length}`; }
  if (data_fim)        { params.push(data_fim + ' 23:59:59'); condicoes += ` AND v.created_at <= $${params.length}`; }
  if (forma_pagamento) { params.push(forma_pagamento);        condicoes += ` AND v.forma_pagamento = $${params.length}`; }
  if (status)          { params.push(status);                 condicoes += ` AND v.status = $${params.length}`; }

  /* total de vendas que batem com os filtros, pra calcular quantas páginas existem */
  const totalRes = await db.query(`SELECT COUNT(*) AS total FROM vendas v${condicoes}`, params);
  const total = parseInt(totalRes.rows[0].total, 10);

  const paramsPagina = [...params, porPagina, offset];
  const query = `
    SELECT v.id, v.total, v.lucro_total, v.forma_pagamento, v.status, v.created_at,
          v.motivo_cancelamento, v.cancelada_em,
          COALESCE(SUM(iv.quantidade), 0) AS qtd_itens
    FROM vendas v
    LEFT JOIN itens_venda iv ON iv.venda_id = v.id
    ${condicoes}
    GROUP BY v.id
    ORDER BY v.created_at DESC
    LIMIT $${paramsPagina.length - 1} OFFSET $${paramsPagina.length}
  `;
  const resultado = await db.query(query, paramsPagina);

  return {
    vendas: resultado.rows,
    paginacao: {
      pagina,
      porPagina,
      total,
      totalPaginas: Math.max(Math.ceil(total / porPagina), 1),
    },
  };
};

/* ══ BUSCAR venda por ID com itens (ORIGINAL, sem alterações) ══ */
const buscarPorId = async (id, usuarioId) => {
  const vendaRes = await db.query(
    'SELECT * FROM vendas WHERE id = $1 AND usuario_id = $2',
    [id, usuarioId]
  );
  if (vendaRes.rows.length === 0) throw new Error('VENDA_NAO_ENCONTRADA');

  const itensRes = await db.query(
    `SELECT iv.*, p.nome AS produto_nome, p.categoria
     FROM itens_venda iv
     JOIN produtos p ON p.id = iv.produto_id
     WHERE iv.venda_id = $1`,
    [id]
  );
  return { ...vendaRes.rows[0], itens: itensRes.rows };
};

/* ══ CRIAR venda (⭐ NOVO — não existia) ══
   dados = {
     forma_pagamento: 'dinheiro' | 'pix' | 'cartao_credito' | 'cartao_debito',
     itens: [ { produto_id: 1, quantidade: 2 }, { produto_id: 5, quantidade: 1 } ]
   }
*/
const criar = async (usuarioId, dados) => {
  const { forma_pagamento, itens } = dados;

  if (!forma_pagamento) throw new Error('FORMA_PAGAMENTO_OBRIGATORIA');
  if (!Array.isArray(itens) || itens.length === 0) throw new Error('ITENS_OBRIGATORIOS');

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    let total = 0;
    let lucroTotal = 0;
    const itensProcessados = [];

    /* Processa cada item DENTRO da transação, travando a linha do produto
       com SELECT ... FOR UPDATE. Isso impede que duas vendas simultâneas
       vendam o mesmo estoque que já não existe mais (race condition). */
    for (const item of itens) {
      const { produto_id, quantidade } = item;

      if (!produto_id || !quantidade || quantidade <= 0) {
        throw new Error('ITEM_INVALIDO');
      }

      const produtoRes = await client.query(
        `SELECT id, nome, preco_custo, preco_venda, quantidade
         FROM produtos
         WHERE id = $1 AND usuario_id = $2 AND ativo = true
         FOR UPDATE`,
        [produto_id, usuarioId]
      );

      if (produtoRes.rows.length === 0) {
        const e = new Error('PRODUTO_NAO_ENCONTRADO');
        e.produto_id = produto_id;
        throw e;
      }

      const produto = produtoRes.rows[0];

      if (parseFloat(produto.quantidade) < parseFloat(quantidade)) {
        const e = new Error('ESTOQUE_INSUFICIENTE');
        e.produto_nome = produto.nome;
        e.disponivel = produto.quantidade;
        throw e;
      }

      const precoUnitario = parseFloat(produto.preco_venda);
      const custoUnitario = parseFloat(produto.preco_custo);
      const subtotal = +(precoUnitario * quantidade).toFixed(2);
      const lucroItem = +((precoUnitario - custoUnitario) * quantidade).toFixed(2);

      total += subtotal;
      lucroTotal += lucroItem;

      itensProcessados.push({
        produto_id, quantidade, precoUnitario, custoUnitario, subtotal, lucroItem
      });
    }

    /* Cria o registro da venda */
    const vendaRes = await client.query(
      `INSERT INTO vendas (usuario_id, total, lucro_total, forma_pagamento, status)
       VALUES ($1, $2, $3, $4, 'concluida')
       RETURNING *`,
      [usuarioId, total.toFixed(2), lucroTotal.toFixed(2), forma_pagamento]
    );
    const venda = vendaRes.rows[0];

    /* Insere os itens e dá baixa no estoque de cada um */
    for (const item of itensProcessados) {
      await client.query(
        `INSERT INTO itens_venda (venda_id, produto_id, quantidade, preco_unitario, custo_unitario, subtotal, lucro_item)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [venda.id, item.produto_id, item.quantidade, item.precoUnitario, item.custoUnitario, item.subtotal, item.lucroItem]
      );

      await client.query(
        `UPDATE produtos SET quantidade = quantidade - $1 WHERE id = $2`,
        [item.quantidade, item.produto_id]
      );
    }

    await client.query('COMMIT');

    return await buscarPorId(venda.id, usuarioId);

  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

/* ══ CANCELAR venda (⭐ NOVO — não existia) ══
   Reverte o estoque de todos os itens da venda e marca status = 'cancelada'.
   Não é permitido cancelar uma venda já cancelada.
*/
const cancelar = async (id, usuarioId, motivo) => {
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const vendaRes = await client.query(
      'SELECT * FROM vendas WHERE id = $1 AND usuario_id = $2 FOR UPDATE',
      [id, usuarioId]
    );

    if (vendaRes.rows.length === 0) throw new Error('VENDA_NAO_ENCONTRADA');
    const venda = vendaRes.rows[0];

    if (venda.status === 'cancelada') throw new Error('VENDA_JA_CANCELADA');

    const itensRes = await client.query(
      'SELECT produto_id, quantidade FROM itens_venda WHERE venda_id = $1',
      [id]
    );

    /* Devolve cada item ao estoque */
    for (const item of itensRes.rows) {
      await client.query(
        'UPDATE produtos SET quantidade = quantidade + $1 WHERE id = $2',
        [item.quantidade, item.produto_id]
      );
    }

    await client.query(
      `UPDATE vendas SET status = 'cancelada', motivo_cancelamento = $1, cancelada_em = NOW()
       WHERE id = $2`,
      [motivo || null, id]
    );

    await client.query('COMMIT');

    return await buscarPorId(id, usuarioId);

  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

module.exports = { listar, buscarPorId, criar, cancelar };
