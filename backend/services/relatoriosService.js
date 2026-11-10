/* ═══════════════════════════════════════════════════════════
   services/relatoriosService.js
   Indicadores usados pelo Dashboard e pela tela de Relatórios.

   ⭐ ATUALIZAÇÃO (pedido da banca — "um dashboard é uma ferramenta de
   auxílio à tomada de decisão"): todas as consultas aceitam agora
   FILTROS opcionais, além do período:
     • produto_id → só o produto escolhido;
     • categoria  → só os produtos daquela categoria (grupo de produtos).
   Com filtro, os valores passam a ser calculados ITEM a ITEM
   (itens_venda), pois uma venda pode misturar vários produtos:
     receita = Σ subtotal dos itens   |   lucro = Σ lucro_item dos itens
     nº de vendas = vendas distintas que contêm o produto/categoria
   Sem filtro o resultado é o mesmo de antes (o total da venda é a
   soma dos subtotais dos seus itens).

   MEMÓRIA DE CÁLCULO (também descrita no Caderno do TCC):
     receita_total     = Σ subtotal (preço unitário × quantidade) das vendas concluídas
     lucro_bruto       = Σ (preço unitário − custo unitário) × quantidade
     total_desperdicios= Σ valor_perda (preço de custo × quantidade perdida)
     lucro_liquido     = lucro_bruto − total_desperdicios
     ticket_medio      = receita_total ÷ nº de vendas concluídas
     taxa_desperdicio  = total_desperdicios ÷ (receita_total + total_desperdicios) × 100
     variacao          = (receita do período − receita do período anterior de
                          mesmo tamanho) ÷ receita do período anterior × 100
   ═══════════════════════════════════════════════════════════ */

const db = require('../db');

const { dataLocalISO } = require('../utils/datas');
/* ⭐ fuso do Brasil (antes era UTC e virava "amanhã" depois das 21h) */
const hojeISO = () => dataLocalISO();

const REGEX_DATA = /^\d{4}-\d{2}-\d{2}$/;

/* Soma (ou subtrai) dias de uma data AAAA-MM-DD, sem depender de fuso */
const somarDias = (iso, dias) => {
  const [a, m, d] = iso.split('-').map(Number);
  const data = new Date(Date.UTC(a, m - 1, d + dias));
  return data.toISOString().slice(0, 10);
};

/* Nº de dias de um período, contando o primeiro e o último */
const diasNoPeriodo = (inicio, fim) => {
  const [a1, m1, d1] = inicio.split('-').map(Number);
  const [a2, m2, d2] = fim.split('-').map(Number);
  return Math.round((Date.UTC(a2, m2 - 1, d2) - Date.UTC(a1, m1 - 1, d1)) / 86400000) + 1;
};

/* Normaliza os filtros vindos da query string (valores inválidos são ignorados) */
const normalizarFiltros = (filtros = {}) => {
  const idProduto = Number(filtros.produto_id);
  const categoria = typeof filtros.categoria === 'string' ? filtros.categoria.trim().slice(0, 100) : '';
  return {
    produto_id: Number.isInteger(idProduto) && idProduto > 0 ? idProduto : null,
    categoria: categoria || null,
  };
};

/* Monta o trecho SQL do filtro de produto/categoria sobre o alias "p" (produtos),
   acrescentando os valores em params. */
const sqlFiltroProduto = (filtros, params) => {
  const f = normalizarFiltros(filtros);
  let sql = '';
  if (f.produto_id) {
    params.push(f.produto_id);
    sql += ` AND p.id = $${params.length}`;
  }
  if (f.categoria) {
    params.push(f.categoria);
    sql += ` AND COALESCE(NULLIF(TRIM(p.categoria), ''), 'Sem categoria') = $${params.length}`;
  }
  return sql;
};

/* ── blocos reutilizáveis ── */

/* Vendas (item a item) de um período, com filtro opcional */
const totaisVendas = async (usuarioId, inicio, fim, filtros) => {
  const params = [usuarioId, inicio, fim];
  const filtro = sqlFiltroProduto(filtros, params);
  const r = await db.query(
    `SELECT
       COUNT(DISTINCT v.id) FILTER (WHERE v.status = 'concluida') AS total_vendas,
       COUNT(DISTINCT v.id) FILTER (WHERE v.status = 'cancelada') AS vendas_canceladas,
       COALESCE(SUM(iv.subtotal)   FILTER (WHERE v.status = 'concluida'), 0) AS receita_total,
       COALESCE(SUM(iv.lucro_item) FILTER (WHERE v.status = 'concluida'), 0) AS lucro_bruto
     FROM vendas v
     JOIN itens_venda iv ON iv.venda_id = v.id
     JOIN produtos p     ON p.id = iv.produto_id
     WHERE v.usuario_id = $1 AND v.created_at::date BETWEEN $2 AND $3${filtro}`,
    params
  );
  const row = r.rows[0];
  return {
    total_vendas: parseInt(row.total_vendas),
    vendas_canceladas: parseInt(row.vendas_canceladas),
    receita: parseFloat(row.receita_total),
    lucro: parseFloat(row.lucro_bruto),
  };
};

/* Desperdícios de um período, com filtro opcional */
const totalDesperdicios = async (usuarioId, inicio, fim, filtros) => {
  const params = [usuarioId, inicio, fim];
  const filtro = sqlFiltroProduto(filtros, params);
  const r = await db.query(
    `SELECT COALESCE(SUM(d.valor_perda), 0) AS total
     FROM desperdicios d
     JOIN produtos p ON p.id = d.produto_id
     WHERE d.usuario_id = $1 AND d.data_registro::date BETWEEN $2 AND $3${filtro}`,
    params
  );
  return parseFloat(r.rows[0].total);
};

/* Produtos mais vendidos de um período, com filtro opcional */
const topProdutos = async (usuarioId, inicio, fim, filtros, ordem = 'receita', limite = 5) => {
  const params = [usuarioId, inicio, fim];
  const filtro = sqlFiltroProduto(filtros, params);
  const ordenacao = ordem === 'quantidade' ? 'total_quantidade DESC' : 'receita DESC';
  const r = await db.query(
    `SELECT p.nome, SUM(iv.quantidade) AS total_quantidade, SUM(iv.subtotal) AS receita
     FROM itens_venda iv
     JOIN vendas v   ON v.id = iv.venda_id
     JOIN produtos p ON p.id = iv.produto_id
     WHERE v.usuario_id = $1 AND v.status = 'concluida'
       AND v.created_at::date BETWEEN $2 AND $3${filtro}
     GROUP BY p.id, p.nome
     ORDER BY ${ordenacao}
     LIMIT ${parseInt(limite)}`,
    params
  );
  return r.rows;
};

/* ══ RESUMO — usado pelas telas de Relatórios e Dashboard (aceita período,
   default = mês corrente, e filtros de produto/categoria) ══ */
const resumo = async (usuarioId, data_inicio, data_fim, filtros = {}) => {
  const inicio = data_inicio || `${hojeISO().slice(0, 8)}01`;
  const fim    = data_fim || hojeISO();

  const vendas     = await totaisVendas(usuarioId, inicio, fim, filtros);
  const totalPerda = await totalDesperdicios(usuarioId, inicio, fim, filtros);
  const top        = await topProdutos(usuarioId, inicio, fim, filtros);

  return {
    periodo: { inicio, fim },
    filtros: normalizarFiltros(filtros),
    receita_total:      vendas.receita.toFixed(2),
    lucro_bruto:        vendas.lucro.toFixed(2),
    total_desperdicios: totalPerda.toFixed(2),
    lucro_liquido:      (vendas.lucro - totalPerda).toFixed(2),
    total_vendas:       vendas.total_vendas,
    vendas_canceladas:  vendas.vendas_canceladas,
    top_produtos: top.map((r) => ({
      nome: r.nome,
      total_vendido: r.total_quantidade,
      receita: r.receita,
    })),
  };
};

/* ══ HOJE / PERÍODO — cartões do topo do Dashboard.
   Sem parâmetros: dia de hoje comparado com ontem (comportamento original).
   ⭐ Com data_inicio/data_fim: o período escolhido comparado com o período
   anterior de mesmo tamanho (ex.: 01–07/10 comparado com 24–30/09).
   Aceita também filtros de produto/categoria. ══ */
const hoje = async (usuarioId, data_inicio, data_fim, filtros = {}) => {
  const fim    = REGEX_DATA.test(data_fim || '') ? data_fim : hojeISO();
  let inicio   = REGEX_DATA.test(data_inicio || '') ? data_inicio : fim;
  if (inicio > fim) inicio = fim;

  const dias          = diasNoPeriodo(inicio, fim);
  const fimAnterior   = somarDias(inicio, -1);
  const inicioAnterior = somarDias(inicio, -dias);

  const atual    = await totaisVendas(usuarioId, inicio, fim, filtros);
  const anterior = await totaisVendas(usuarioId, inicioAnterior, fimAnterior, filtros);
  const perda    = await totalDesperdicios(usuarioId, inicio, fim, filtros);

  const variacao = anterior.receita > 0
    ? Math.round(((atual.receita - anterior.receita) / anterior.receita) * 100)
    : (atual.receita > 0 ? 100 : 0);

  return {
    periodo: { inicio, fim, dias },
    periodo_anterior: { inicio: inicioAnterior, fim: fimAnterior },
    filtros: normalizarFiltros(filtros),
    receita: atual.receita.toFixed(2),
    receita_anterior: anterior.receita.toFixed(2),
    lucro: atual.lucro.toFixed(2),
    desperdicio: perda.toFixed(2),
    total_vendas: atual.total_vendas,
    ticket_medio: (atual.total_vendas > 0 ? atual.receita / atual.total_vendas : 0).toFixed(2),
    variacao_hoje: variacao, /* nome mantido por compatibilidade */
    variacao,
  };
};

/* ══ GRÁFICOS — usado no Dashboard e na tela de Relatórios.
   ⭐ Aceita data_inicio/data_fim (senão os últimos N dias até hoje) e
   filtros de produto/categoria. Agora "Vendas por hora", "Formas de
   pagamento" e "Receita por categoria" também respeitam o período. ══ */
const graficos = async (usuarioId, dias = 7, data_inicio, data_fim, filtros = {}) => {
  const diasInt = parseInt(dias) || 7;
  const fim     = REGEX_DATA.test(data_fim || '') ? data_fim : hojeISO();
  const inicio  = REGEX_DATA.test(data_inicio || '') ? data_inicio : somarDias(fim, -(diasInt - 1));

  /* Vendas por hora — do dia final do período (para período de 1 dia, o próprio dia) */
  const pHora = [usuarioId, fim];
  const fHora = sqlFiltroProduto(filtros, pHora);
  const porHoraRes = await db.query(
    `SELECT EXTRACT(HOUR FROM v.created_at)::int AS hora, COALESCE(SUM(iv.subtotal), 0) AS vendas
     FROM vendas v
     JOIN itens_venda iv ON iv.venda_id = v.id
     JOIN produtos p     ON p.id = iv.produto_id
     WHERE v.usuario_id = $1 AND v.status = 'concluida' AND v.created_at::date = $2${fHora}
     GROUP BY hora ORDER BY hora`,
    pHora
  );

  /* Evolução diária no período (dias sem venda aparecem com zero) */
  const pEvo = [usuarioId, inicio, fim];
  const fEvo = sqlFiltroProduto(filtros, pEvo);
  const evolucaoRes = await db.query(
    `WITH mov AS (
       SELECT v.created_at::date AS dia, SUM(iv.subtotal) AS vendas, SUM(iv.lucro_item) AS lucro
       FROM vendas v
       JOIN itens_venda iv ON iv.venda_id = v.id
       JOIN produtos p     ON p.id = iv.produto_id
       WHERE v.usuario_id = $1 AND v.status = 'concluida'
         AND v.created_at::date BETWEEN $2 AND $3${fEvo}
       GROUP BY 1
     )
     SELECT TO_CHAR(d.dia, 'DD/MM') AS dia,
            COALESCE(m.vendas, 0) AS vendas,
            COALESCE(m.lucro, 0)  AS lucro
     FROM generate_series($2::date, $3::date, '1 day') AS d(dia)
     LEFT JOIN mov m ON m.dia = d.dia::date
     ORDER BY d.dia`,
    pEvo
  );

  /* Desempenho mensal (últimos 4 meses) — sem filtro, como antes */
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

  /* Formas de pagamento no período (nº de vendas distintas) */
  const pPag = [usuarioId, inicio, fim];
  const fPag = sqlFiltroProduto(filtros, pPag);
  const pagtoRes = await db.query(
    `SELECT v.forma_pagamento AS forma, COUNT(DISTINCT v.id) AS quantidade
     FROM vendas v
     JOIN itens_venda iv ON iv.venda_id = v.id
     JOIN produtos p     ON p.id = iv.produto_id
     WHERE v.usuario_id = $1 AND v.status = 'concluida'
       AND v.created_at::date BETWEEN $2 AND $3${fPag}
     GROUP BY v.forma_pagamento`,
    pPag
  );

  /* Receita por categoria de produto no período */
  const pCat = [usuarioId, inicio, fim];
  const fCat = sqlFiltroProduto(filtros, pCat);
  const categoriaRes = await db.query(
    `SELECT COALESCE(NULLIF(TRIM(p.categoria), ''), 'Sem categoria') AS categoria, SUM(iv.subtotal) AS receita
     FROM itens_venda iv
     JOIN vendas v   ON v.id = iv.venda_id
     JOIN produtos p ON p.id = iv.produto_id
     WHERE v.usuario_id = $1 AND v.status = 'concluida'
       AND v.created_at::date BETWEEN $2 AND $3${fCat}
     GROUP BY 1 ORDER BY receita DESC LIMIT 6`,
    pCat
  );

  return {
    periodo: { inicio, fim },
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

/* ══ KPIs consolidados ══
   - ticket_medio:         receita_total / total_vendas
   - produto_mais_vendido: produto com maior quantidade vendida no período
   - total_vendido:        soma da receita de vendas concluídas
   - taxa_desperdicio:     % da receita perdida em relação à receita bruta gerada
                           (valor_perda / (receita_total + valor_perda)) * 100
   ⭐ aceita filtros de produto/categoria */
const kpis = async (usuarioId, data_inicio, data_fim, filtros = {}) => {
  const inicio = data_inicio || dataLocalISO(30);
  const fim    = data_fim    || dataLocalISO();

  const vendas     = await totaisVendas(usuarioId, inicio, fim, filtros);
  const totalPerda = await totalDesperdicios(usuarioId, inicio, fim, filtros);
  const maisVendido = await topProdutos(usuarioId, inicio, fim, filtros, 'quantidade', 1);

  const ticketMedio     = vendas.total_vendas > 0 ? vendas.receita / vendas.total_vendas : 0;
  const baseTaxa        = vendas.receita + totalPerda;
  const taxaDesperdicio = baseTaxa > 0 ? (totalPerda / baseTaxa) * 100 : 0;

  return {
    periodo: { inicio, fim },
    filtros: normalizarFiltros(filtros),
    ticket_medio:      ticketMedio.toFixed(2),
    total_vendido:     vendas.receita.toFixed(2),
    total_vendas:      vendas.total_vendas,
    taxa_desperdicio:  taxaDesperdicio.toFixed(2), // em %
    produto_mais_vendido: maisVendido[0] || null,
  };
};

module.exports = { resumo, hoje, graficos, pdf, kpis, somarDias, diasNoPeriodo };
