import { formatarMoeda, formatarQuantidade } from './formatters.js';

/**
 * Gera um PDF do relatório no cliente, a partir de dados REAIS já
 * retornados pela API (/relatorios/resumo e /relatorios/kpis).
 * O próprio backend indica que a montagem do arquivo acontece no
 * cliente (ver comentário em backend/services/relatoriosService.js:
 * "dados consolidados para geração de PDF no cliente jsPDF") —
 * portanto nenhum endpoint é inventado aqui.
 *
 * ⭐ CORREÇÃO (análise de performance): jsPDF + jspdf-autotable eram
 * importados de forma ESTÁTICA no topo do arquivo — isso colocava essas
 * duas bibliotecas (pesadas) dentro do pacote principal do site, baixado
 * por TODA pessoa em TODA visita, mesmo quem nunca clica em "Exportar
 * PDF". Isso inflava o bundle principal em ~900 KB. Agora os dois só são
 * baixados na hora em que a função é chamada de verdade (import()
 * dinâmico), e o Vite os separa automaticamente num arquivo à parte.
 */
export async function gerarPdfRelatorio({ usuario, periodo, resumo, kpis, filtroTexto }) {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);

  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.setTextColor(13, 122, 68);
  doc.text('Feira System — Relatório', 14, 18);

  doc.setFontSize(10);
  doc.setTextColor(80);
  doc.text(`Banca: ${usuario?.nome_banca || usuario?.nome || '—'}`, 14, 26);
  doc.text(`Período: ${periodo?.inicio || '—'} a ${periodo?.fim || '—'}`, 14, 32);
  doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 38);
  /* ⭐ filtro de produto/categoria aplicado (quando houver) */
  if (filtroTexto) doc.text(`Filtro: ${filtroTexto}`, 14, 44);

  autoTable(doc, {
    startY: filtroTexto ? 52 : 46,
    head: [['Indicador', 'Valor']],
    body: [
      ['Receita total', formatarMoeda(resumo?.receita_total)],
      ['Lucro bruto', formatarMoeda(resumo?.lucro_bruto)],
      ['Total de desperdícios', formatarMoeda(resumo?.total_desperdicios)],
      ['Lucro líquido', formatarMoeda(resumo?.lucro_liquido)],
      ['Total de vendas', String(resumo?.total_vendas ?? 0)],
      ['Vendas canceladas', String(resumo?.vendas_canceladas ?? 0)],
      ['Ticket médio', formatarMoeda(kpis?.ticket_medio)],
      ['Taxa de desperdício', `${kpis?.taxa_desperdicio ?? 0}%`],
    ],
    theme: 'striped',
    headStyles: { fillColor: [13, 122, 68] },
  });

  if (resumo?.top_produtos?.length) {
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 10,
      head: [['Produto mais vendido', 'Quantidade', 'Receita']],
      body: resumo.top_produtos.map((p) => [p.nome, formatarQuantidade(p.total_vendido), formatarMoeda(p.receita)]),
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246] },
    });
  }

  doc.save(`relatorio_${periodo?.inicio || 'feira'}_a_${periodo?.fim || 'system'}.pdf`);
}
