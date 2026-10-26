/* ═══════════════════════════════════════════════════════════
   services/metasService.js — ⭐ NOVO (não existia nada de metas)
   ═══════════════════════════════════════════════════════════ */

const db = require('../db');

/* ══ DEFINIR (criar ou atualizar) a meta de um mês — upsert ══
   dados = { ano, mes, meta_receita, meta_lucro? }
*/
const definir = async (usuarioId, dados) => {
  const { ano, mes, meta_receita, meta_lucro } = dados;

  if (!ano || !mes || mes < 1 || mes > 12) {
    throw new Error('ANO_MES_INVALIDOS');
  }
  if (meta_receita === undefined || meta_receita === null || parseFloat(meta_receita) < 0) {
    throw new Error('META_RECEITA_INVALIDA');
  }

  const existente = await db.query(
  'SELECT meta_lucro FROM metas WHERE usuario_id = $1 AND ano = $2 AND mes = $3',
  [usuarioId, ano, mes]
);
const metaLucroFinal = meta_lucro !== undefined
  ? (meta_lucro ?? null)
  : (existente.rows[0]?.meta_lucro ?? null);

const resultado = await db.query(
  `INSERT INTO metas (usuario_id, ano, mes, meta_receita, meta_lucro)
   VALUES ($1, $2, $3, $4, $5)
   ON CONFLICT (usuario_id, ano, mes)
   DO UPDATE SET meta_receita = $4, meta_lucro = $5, updated_at = NOW()
   RETURNING *`,
  [usuarioId, ano, mes, meta_receita, metaLucroFinal]
);

  return resultado.rows[0];
};

/* ══ LISTAR histórico de metas do usuário ══ */
const listar = async (usuarioId) => {
  const resultado = await db.query(
    `SELECT * FROM metas WHERE usuario_id = $1 ORDER BY ano DESC, mes DESC`,
    [usuarioId]
  );
  return resultado.rows;
};

/* ══ REMOVER meta ══ */
const deletar = async (id, usuarioId) => {
  const resultado = await db.query(
    'DELETE FROM metas WHERE id = $1 AND usuario_id = $2 RETURNING id',
    [id, usuarioId]
  );
  if (resultado.rows.length === 0) throw new Error('META_NAO_ENCONTRADA');
  return { mensagem: 'Meta removida com sucesso' };
};

/* ══ PROGRESSO — compara o realizado do mês com a meta definida ══
   Se nenhuma meta foi definida para o mês, retorna meta_definida: false
   junto com o realizado, para o frontend poder sugerir "definir meta".
*/
const progresso = async (usuarioId, ano, mes) => {
  ano = parseInt(ano);
  mes = parseInt(mes);

  const metaRes = await db.query(
    'SELECT * FROM metas WHERE usuario_id = $1 AND ano = $2 AND mes = $3',
    [usuarioId, ano, mes]
  );
  const meta = metaRes.rows[0] || null;

  const realizadoRes = await db.query(
    `SELECT
       COALESCE(SUM(total), 0)       AS receita,
       COALESCE(SUM(lucro_total), 0) AS lucro,
       COUNT(*)                      AS total_vendas
     FROM vendas
     WHERE usuario_id = $1 AND status = 'concluida'
       AND EXTRACT(YEAR  FROM created_at) = $2
       AND EXTRACT(MONTH FROM created_at) = $3`,
    [usuarioId, ano, mes]
  );

  const receitaRealizada = parseFloat(realizadoRes.rows[0].receita);
  const lucroRealizado   = parseFloat(realizadoRes.rows[0].lucro);
  const totalVendas      = parseInt(realizadoRes.rows[0].total_vendas);

  /* Cálculo de dias — necessário para projeção e "quanto preciso vender por dia" */
  const diasNoMes = new Date(ano, mes, 0).getDate(); /* dia 0 do próximo mês = último dia deste mês */
  const hoje = new Date();
  const ehMesAtual = hoje.getFullYear() === ano && (hoje.getMonth() + 1) === mes;

  let diasPassados;
  if (ehMesAtual) diasPassados = hoje.getDate();
  else if (new Date(ano, mes - 1, 1) < new Date(hoje.getFullYear(), hoje.getMonth(), 1)) diasPassados = diasNoMes; /* mês já encerrado */
  else diasPassados = 0; /* mês futuro */

  const diasRestantes = Math.max(diasNoMes - diasPassados, 0);
  const mediaDiariaAtual = diasPassados > 0 ? receitaRealizada / diasPassados : 0;
  const projecaoFimMes = +(mediaDiariaAtual * diasNoMes).toFixed(2);

  const base = {
    periodo: { ano, mes, dias_no_mes: diasNoMes, dias_passados: diasPassados, dias_restantes: diasRestantes },
    realizado: {
      receita: receitaRealizada.toFixed(2),
      lucro: lucroRealizado.toFixed(2),
      total_vendas: totalVendas,
    },
    projecao_fim_mes: projecaoFimMes.toFixed(2),
  };

  if (!meta) {
    return { ...base, meta_definida: false, meta: null };
  }

  const metaReceita = parseFloat(meta.meta_receita);
  const metaLucro   = meta.meta_lucro !== null ? parseFloat(meta.meta_lucro) : null;

  const percentualReceita = metaReceita > 0 ? +((receitaRealizada / metaReceita) * 100).toFixed(1) : 0;
  const percentualLucro   = metaLucro !== null && metaLucro > 0 ? +((lucroRealizado / metaLucro) * 100).toFixed(1) : null;

  const faltaReceita = Math.max(metaReceita - receitaRealizada, 0);
  const mediaDiariaNecessaria = diasRestantes > 0 ? +(faltaReceita / diasRestantes).toFixed(2) : (faltaReceita > 0 ? null : 0);
  /* mediaDiariaNecessaria = null significa "impossível bater a meta, o mês já acabou e faltou receita" */

  return {
    ...base,
    meta_definida: true,
    meta: {
      id: meta.id,
      meta_receita: metaReceita.toFixed(2),
      meta_lucro: metaLucro !== null ? metaLucro.toFixed(2) : null,
    },
    percentual_receita: percentualReceita,
    percentual_lucro: percentualLucro,
    falta_receita: faltaReceita.toFixed(2),
    media_diaria_necessaria: mediaDiariaNecessaria,
    meta_batida: receitaRealizada >= metaReceita,
  };
};

module.exports = { definir, listar, deletar, progresso };
