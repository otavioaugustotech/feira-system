/* ═══════════════════════════════════════════════════════════
   services/relatoriosService.js — RECONSTRUÍDO (base original ausente
   do pacote "faltante"; só o patch de kpis foi fornecido). As funções
   resumo/hoje/graficos/pdf foram reconstruídas a partir do que
   frontend/Javascript.js consome (apiGet('/relatorios/...')).

   ⚠️ Isso é uma reconstrução best-effort para permitir TESTAR o projeto
   fim a fim. Se você já tem o relatoriosService.js original do projeto,
   use o original e apenas cole a função kpis() (ao final deste arquivo)
   nele — é exatamente o que o README pedia.
   ═══════════════════════════════════════════════════════════ */

const db = require('../db');

const { dataLocalISO } = require('../utils/datas');
/* ⭐ fuso do Brasil (antes era UTC e virava "amanhã" depois das 21h) */
const hojeISO = () => dataLocalISO();

/* ══ RESUMO — usado pelas telas de Relatórios e Dashboard (aceita período,
   default = mês corrente) ══ */
const resumo = async (usuarioId, data_inicio, data_fim) => {
  const inicio = data_inicio || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01`;
  const fim    = data_fim || hojeISO();

  const vendasRes = await db.query(
    `SELECT
       COUNT(*) FILTER (WHERE status = 'concluida') AS total_vendas,
       COUNT(*) FILTER (WHERE status = 'cancelada') AS vendas_canceladas,
       COALESCE(SUM(total)       FILTER (WHERE status = 'concluida'), 0) AS receita_total,
       COALESCE(SUM(lucro_total) FILTER (WHERE status = 'concluida'), 0) AS lucro_bruto
     FROM vendas
     WHERE usuario_id = $1 AND created_at::date BETWEEN $2 AND $3`,
    [usuarioId, inicio, fim]
  );

  const despRes = await db.query(
    `SELECT COALESCE(SUM(valor_perda), 0) AS total_desperdicios
     FROM desperdicios
     WHERE usuario_id = $1 AND data_registro::date BETWEEN $2 AND $3`,
    [usuarioId, inicio, fim]
  );

  const topRes = await db.query(
    `SELECT p.nome, SUM(iv.quantidade) AS total_vendido, SUM(iv.subtotal) AS receita
     FROM itens_venda iv
     JOIN vendas v ON v.id = iv.venda_id
     JOIN produtos p ON p.id = iv.produto_id
     WHERE v.usuario_id = $1 AND v.status = 'concluida'
       AND v.created_at::date BETWEEN $2 AND $3
     GROUP BY p.id, p.nome
     ORDER BY receita DESC
     LIMIT 5`,
    [usuarioId, inicio, fim]
  );

  const receitaTotal = parseFloat(vendasRes.rows[0].receita_total);
  const lucroBruto   = parseFloat(vendasRes.rows[0].lucro_bruto);
  const totalPerda   = parseFloat(despRes.rows[0].total_desperdicios);

  return {
    periodo: { inicio, fim },
    receita_total:      receitaTotal.toFixed(2),
    lucro_bruto:         lucroBruto.toFixed(2),
    total_desperdicios:  totalPerda.toFixed(2),
    lucro_liquido:      (lucroBruto - totalPerda).toFixed(2),
    total_vendas:        parseInt(vendasRes.rows[0].total_vendas),
    vendas_canceladas:   parseInt(vendasRes.rows[0].vendas_canceladas),
    top_produtos: topRes.rows.map((r) => ({
      nome: r.nome,
      total_vendido: r.total_vendido,
      receita: r.receita,
    })),
  };
};

/* ══ HOJE — cards do topo do Dashboard, comparando com ontem ══ */
const hoje = async (usuarioId) => {
  const hojeStr  = hojeISO();
  const ontemStr = dataLocalISO(1);

  const dia = async (data) => {
    const r = await db.query(
      `SELECT COUNT(*) AS total_vendas,
              COALESCE(SUM(total), 0) AS receita,
              COALESCE(SUM(lucro_total), 0) AS lucro
       FROM vendas
       WHERE usuario_id = $1 AND status = 'concluida' AND created_at::date = $2`,
      [usuarioId, data]
    );
    return {
      total_vendas: parseInt(r.rows[0].total_vendas),
      receita: parseFloat(r.rows[0].receita),
      lucro: parseFloat(r.rows[0].lucro),
    };
  };

  const dadosHoje  = await dia(hojeStr);
  const dadosOntem = await dia(ontemStr);

  const despRes = await db.query(
    `SELECT COALESCE(SUM(valor_perda), 0) AS total
     FROM desperdicios WHERE usuario_id = $1 AND data_registro::date = $2`,
    [usuarioId, hojeStr]
  );

  const variacao = dadosOntem.receita > 0
    ? Math.round(((dadosHoje.receita - dadosOntem.receita) / dadosOntem.receita) * 100)
    : (dadosHoje.receita > 0 ? 100 : 0);

  return {
    receita: dadosHoje.receita.toFixed(2),
    lucro: dadosHoje.lucro.toFixed(2),
    desperdicio: parseFloat(despRes.rows[0].total).toFixed(2),
    total_vendas: dadosHoje.total_vendas,
    ticket_medio: (dadosHoje.total_vendas > 0 ? dadosHoje.receita / dadosHoje.total_vendas : 0).toFixed(2),
    variacao_hoje: variacao,
  };
};

/* ══ GRÁFICOS — usado no Dashboard e na tela de Gráficos.
   ⭐ Aceita opcionalmente data_inicio/data_fim (usado pelo seletor de mês
   em Relatórios); sem eles, usa os últimos `dias` a partir de hoje (usado
   pelo Dashboard/Gráficos, que sempre mostram o período recente). ══ */
const graficos = async (usuarioId, dias = 7, data_inicio, data_fim) => {
  const diasInt = parseInt(dias) || 7;

  /* Vendas por hora (hoje) */
  const porHoraRes = await db.query(
    `SELECT EXTRACT(HOUR FROM created_at)::int AS hora, COALESCE(SUM(total), 0) AS vendas
     FROM vendas
     WHERE usuario_id = $1 AND status = 'concluida' AND created_at::date = CURRENT_DATE
     GROUP BY hora ORDER BY hora`,
    [usuarioId]
  );

  /* Evolução diária — usa data_inicio/data_fim se fornecidos (relatório de
     um mês específico), senão os últimos N dias a partir de hoje (padrão
     do Dashboard/Gráficos) */
  const fimEvolucao = data_fim || dataLocalISO();
  const evolucaoRes = await db.query(
    `SELECT TO_CHAR(d.dia, 'DD/MM') AS dia,
            COALESCE(SUM(v.total), 0) AS vendas,
            COALESCE(SUM(v.lucro_total), 0) AS lucro
     FROM generate_series($2::date, $3::date, '1 day') AS d(dia)
     LEFT JOIN vendas v ON v.usuario_id = $1 AND v.status = 'concluida' AND v.created_at::date = d.dia
     GROUP BY d.dia ORDER BY d.dia`,
    [usuarioId, data_inicio || dataLocalISO(diasInt - 1), fimEvolucao]
  );

  /* Desempenho mensal (últimos 4 meses) */
  const mensalRes = await db.query(
    `SELECT TO_CHAR(m.mes, 'Mon') AS mes,
            COALESCE(SUM(v.total), 0) AS vendas,
            COALESCE(SUM(v.lucro_total), 0) AS lucro
     FROM generate_series(date_trunc('month', CURRENT_DATE) - interval '3 months', date_trunc('month', CURRENT_DATE), '1 month') AS m(mes)
     LEFT JOIN vendas v ON v.usuario_id = $1 AND v.status = 'concluida'
       AND date_trunc('month', v.created_at) = m.mes
     GROUP BY m.mes ORDER BY m.mes`,
    [usuarioId]
  );

  /* Distribuição por forma de pagamento (período dos "dias") */
  const pagtoRes = await db.query(
    `SELECT forma_pagamento AS forma, COUNT(*) AS quantidade
     FROM vendas
     WHERE usuario_id = $1 AND status = 'concluida'
       AND created_at >= CURRENT_DATE - ($2::int - 1)
     GROUP BY forma_pagamento`,
    [usuarioId, diasInt]
  );

  /* Receita por categoria de produto */
  const categoriaRes = await db.query(
    `SELECT COALESCE(p.categoria, 'Sem categoria') AS categoria, SUM(iv.subtotal) AS receita
     FROM itens_venda iv
     JOIN vendas v ON v.id = iv.venda_id
     JOIN produtos p ON p.id = iv.produto_id
     WHERE v.usuario_id = $1 AND v.status = 'concluida'
     GROUP BY categoria ORDER BY receita DESC LIMIT 6`,
    [usuarioId]
  );

  return {
    porHora: porHoraRes.rows.map((r) => ({ hora: `${r.hora}h`, vendas: r.vendas })),
    evolucao: evolucaoRes.rows,
    mensal: mensalRes.rows,
    pagamentos: pagtoRes.rows,
    categorias: categoriaRes.rows,
  };
};

/* ══ PDF — dados consolidados para a geração de PDF no cliente (jsPDF) ══ */
const pdf = async (usuarioId) => {
  const usuarioRes = await db.query('SELECT nome, nome_banca FROM usuarios WHERE id = $1', [usuarioId]);
  const dadosResumo = await resumo(usuarioId);
  const dadosGraficos = await graficos(usuarioId, 28);

  return {
    gerado_em: new Date().toLocaleString('pt-BR'),
    usuario: usuarioRes.rows[0] || {},
    resumo: dadosResumo,
    evolucao: dadosGraficos.evolucao,
  };
};

/* ══ KPIs consolidados (⭐ do patch relatoriosService_kpis_patch.js) ══
   - ticket_medio:        receita_total / total_vendas
   - produto_mais_vendido: produto com maior quantidade vendida no período
   - total_vendido:       soma da receita de vendas concluídas
   - taxa_desperdicio:    % da receita perdida em relação à receita bruta gerada
                          (valor_perda / (receita_total + valor_perda)) * 100
*/
const kpis = async (usuarioId, data_inicio, data_fim) => {
  const inicio = data_inicio || dataLocalISO(30);
  const fim    = data_fim    || dataLocalISO();

  const vendasRes = await db.query(
    `SELECT
       COUNT(*) FILTER (WHERE status = 'concluida') AS total_vendas,
       COALESCE(SUM(total) FILTER (WHERE status = 'concluida'), 0) AS receita_total
     FROM vendas
     WHERE usuario_id = $1 AND created_at::date BETWEEN $2 AND $3`,
    [usuarioId, inicio, fim]
  );

  const despRes = await db.query(
    `SELECT COALESCE(SUM(valor_perda), 0) AS total_desperdicios
     FROM desperdicios
     WHERE usuario_id = $1 AND data_registro::date BETWEEN $2 AND $3`,
    [usuarioId, inicio, fim]
  );

  const maisVendidoRes = await db.query(
    `SELECT p.nome, SUM(iv.quantidade) AS total_quantidade, SUM(iv.subtotal) AS receita
     FROM itens_venda iv
     JOIN vendas v ON v.id = iv.venda_id
     JOIN produtos p ON p.id = iv.produto_id
     WHERE v.usuario_id = $1 AND v.status = 'concluida'
       AND v.created_at::date BETWEEN $2 AND $3
     GROUP BY p.id, p.nome
     ORDER BY total_quantidade DESC
     LIMIT 1`,
    [usuarioId, inicio, fim]
  );

  const totalVendas   = parseInt(vendasRes.rows[0].total_vendas);
  const receitaTotal  = parseFloat(vendasRes.rows[0].receita_total);
  const totalPerda    = parseFloat(despRes.rows[0].total_desperdicios);

  const ticketMedio    = totalVendas > 0 ? receitaTotal / totalVendas : 0;
  const baseTaxa       = receitaTotal + totalPerda;
  const taxaDesperdicio = baseTaxa > 0 ? (totalPerda / baseTaxa) * 100 : 0;

  return {
    periodo: { inicio, fim },
    ticket_medio:      ticketMedio.toFixed(2),
    total_vendido:     receitaTotal.toFixed(2),
    total_vendas:      totalVendas,
    taxa_desperdicio:  taxaDesperdicio.toFixed(2), // em %
    produto_mais_vendido: maisVendidoRes.rows[0] || null,
  };
};

module.exports = { resumo, hoje, graficos, pdf, kpis };