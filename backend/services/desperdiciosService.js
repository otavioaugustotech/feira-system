/* ═══════════════════════════════════════════════════════════
   services/desperdiciosService.js — RECONSTRUÍDO (não fazia parte do
   pacote "faltante", mas é usado por controllers/desperdiciosController.js,
   que já vinha pronto no pacote esperando este arquivo existir).
   ═══════════════════════════════════════════════════════════ */

const db = require('../db');

/* ══ REGISTRAR desperdício — dá baixa no estoque do produto ══ */
const registrar = async (usuarioId, dados) => {
  const { produto_id, quantidade, motivo } = dados;

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const produtoRes = await client.query(
      'SELECT id, preco_custo, quantidade FROM produtos WHERE id = $1 AND usuario_id = $2 FOR UPDATE',
      [produto_id, usuarioId]
    );
    if (produtoRes.rows.length === 0) {
      await client.query('ROLLBACK');
      throw new Error('PRODUTO_NAO_ENCONTRADO');
    }

    const produto = produtoRes.rows[0];
    if (parseFloat(quantidade) > parseFloat(produto.quantidade)) {
      await client.query('ROLLBACK');
      throw new Error('ESTOQUE_INSUFICIENTE');
    }

    const valorPerda = parseFloat(produto.preco_custo) * parseFloat(quantidade);

    const resultado = await client.query(
      `INSERT INTO desperdicios (usuario_id, produto_id, quantidade, motivo, valor_perda)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [usuarioId, produto_id, quantidade, motivo || null, valorPerda]
    );

    await client.query(
      'UPDATE produtos SET quantidade = quantidade - $1 WHERE id = $2',
      [quantidade, produto_id]
    );

    await client.query('COMMIT');
    return resultado.rows[0];
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
};

/* ══ LISTAR desperdícios com filtro opcional de período ══ */
const listar = async (usuarioId, filtros = {}) => {
  const { data_inicio, data_fim } = filtros;

  let query = `
    SELECT d.id, d.produto_id, p.nome AS produto_nome, d.quantidade,
           d.motivo, d.valor_perda, d.data_registro
    FROM desperdicios d
    JOIN produtos p ON p.id = d.produto_id
    WHERE d.usuario_id = $1
  `;
  const params = [usuarioId];

  if (data_inicio) { params.push(data_inicio);            query += ` AND d.data_registro >= $${params.length}`; }
  if (data_fim)    { params.push(data_fim + ' 23:59:59'); query += ` AND d.data_registro <= $${params.length}`; }

  query += ' ORDER BY d.data_registro DESC';
  const resultado = await db.query(query, params);
  return resultado.rows;
};

/* ══ DELETAR desperdício — devolve a quantidade ao estoque do produto
   (o oposto exato de registrar: lá diminui o estoque, aqui devolve) ══ */
const deletar = async (id, usuarioId) => {
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const despRes = await client.query(
      'SELECT id, produto_id, quantidade FROM desperdicios WHERE id = $1 AND usuario_id = $2 FOR UPDATE',
      [id, usuarioId]
    );
    if (despRes.rows.length === 0) {
      await client.query('ROLLBACK');
      throw new Error('DESPERDICIO_NAO_ENCONTRADO');
    }
    const desperdicio = despRes.rows[0];

    await client.query(
      'UPDATE produtos SET quantidade = quantidade + $1 WHERE id = $2',
      [desperdicio.quantidade, desperdicio.produto_id]
    );
    await client.query('DELETE FROM desperdicios WHERE id = $1', [id]);

    await client.query('COMMIT');
    return { mensagem: 'Desperdício removido e estoque devolvido com sucesso' };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
};

module.exports = { registrar, listar, deletar };
