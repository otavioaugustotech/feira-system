/* ═══════════════════════════════════════════════════════════
   utils/exportDesperdicios.js
   Gera relatórios de desperdício em PDF (pdfkit) e Word (docx).
   ⭐ Atualizado: o motivo agora tem CATEGORIA padronizada + DESCRIÇÃO
   livre, e o relatório traz o prejuízo agrupado por categoria.
   ═══════════════════════════════════════════════════════════ */

const PDFDocument = require('pdfkit');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, HeadingLevel, AlignmentType
} = require('docx');
const { rotuloCategoria } = require('./categoriasDesperdicio');

function formatarQuantidade(valor) {
  const numero = Number(valor ?? 0);
  return numero.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 3 });
}

const formatarValor = (valor) => parseFloat(valor || 0).toFixed(2);

/* ══ Gera um Buffer de PDF com a lista de desperdícios ══
   registros: [{ produto_nome, quantidade, categoria_motivo, motivo, valor_perda, data_registro }]
   totalPerda: soma de valor_perda no período
   totaisPorCategoria: [{ categoria, valor }] (opcional)
*/
const gerarPDFDesperdicios = (registros, totalPerda, periodo, totaisPorCategoria = []) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(18).text('Relatório de Desperdícios — Feira System', { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(10).fillColor('#555')
      .text(`Período: ${periodo.inicio} a ${periodo.fim}`, { align: 'center' });
    doc.moveDown(1.2);

    /* Colunas: x inicial e largura de cada uma */
    const col = {
      produto:   { x: 40,  w: 120, titulo: 'Produto' },
      qtd:       { x: 165, w: 40,  titulo: 'Qtd' },
      categoria: { x: 210, w: 110, titulo: 'Categoria' },
      descricao: { x: 325, w: 150, titulo: 'Descrição' },
      valor:     { x: 480, w: 75,  titulo: 'Perda (R$)' },
    };

    const linha = (valores, negrito = false) => {
      if (doc.y > 760) doc.addPage();
      const y = doc.y;
      doc.font(negrito ? 'Helvetica-Bold' : 'Helvetica').fontSize(negrito ? 10.5 : 10).fillColor('#000');
      let maiorY = y;
      Object.entries(col).forEach(([chave, c]) => {
        doc.text(String(valores[chave]), c.x, y, { width: c.w, align: chave === 'valor' ? 'right' : 'left' });
        maiorY = Math.max(maiorY, doc.y);
      });
      doc.x = 40;
      doc.y = maiorY + 4;
    };

    linha(Object.fromEntries(Object.entries(col).map(([k, c]) => [k, c.titulo])), true);
    doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor('#ccc').stroke();
    doc.moveDown(0.3);

    registros.forEach((r) => {
      linha({
        produto: r.produto_nome,
        qtd: formatarQuantidade(r.quantidade),
        categoria: rotuloCategoria(r.categoria_motivo),
        descricao: r.motivo || '-',
        valor: formatarValor(r.valor_perda),
      });
    });

    doc.moveDown(0.5);
    doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor('#ccc').stroke();
    doc.moveDown(0.5);
    doc.font('Helvetica-Bold').fontSize(12)
      .text(`Prejuízo total no período: R$ ${formatarValor(totalPerda)}`, 40, doc.y, { width: 515, align: 'right' });

    if (totaisPorCategoria.length > 0) {
      doc.moveDown(1.2);
      doc.font('Helvetica-Bold').fontSize(12).text('Prejuízo por categoria do motivo', 40, doc.y);
      doc.moveDown(0.4);
      doc.font('Helvetica').fontSize(10);
      totaisPorCategoria.forEach((t) => {
        const pct = totalPerda > 0 ? (t.valor / totalPerda) * 100 : 0;
        doc.text(`${rotuloCategoria(t.categoria)}: R$ ${formatarValor(t.valor)} (${pct.toFixed(1)}% do prejuízo)`, 40, doc.y);
      });
    }

    doc.end();
  });
};

/* ══ Gera um Buffer de Word (.docx) com a mesma informação ══ */
const gerarWordDesperdicios = async (registros, totalPerda, periodo, totaisPorCategoria = []) => {
  const celula = (texto, negrito = false) =>
    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(texto), bold: negrito })] })] });

  const linhasTabela = [
    new TableRow({
      tableHeader: true,
      children: ['Produto', 'Qtd', 'Categoria', 'Descrição', 'Perda (R$)'].map((t) => celula(t, true)),
    }),
    ...registros.map((r) =>
      new TableRow({
        children: [
          r.produto_nome,
          formatarQuantidade(r.quantidade),
          rotuloCategoria(r.categoria_motivo),
          r.motivo || '-',
          formatarValor(r.valor_perda),
        ].map((t) => celula(t)),
      })
    ),
  ];

  const blocoCategorias = totaisPorCategoria.length === 0 ? [] : [
    new Paragraph({ text: '' }),
    new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('Prejuízo por categoria do motivo')] }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({ tableHeader: true, children: ['Categoria', 'Perda (R$)', '% do prejuízo'].map((t) => celula(t, true)) }),
        ...totaisPorCategoria.map((t) => new TableRow({
          children: [
            rotuloCategoria(t.categoria),
            formatarValor(t.valor),
            `${(totalPerda > 0 ? (t.valor / totalPerda) * 100 : 0).toFixed(1)}%`,
          ].map((x) => celula(x)),
        })),
      ],
    }),
  ];

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            children: [new TextRun('Relatório de Desperdícios — Feira System')],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: `Período: ${periodo.inicio} a ${periodo.fim}`, italics: true })],
          }),
          new Paragraph({ text: '' }),
          new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: linhasTabela }),
          new Paragraph({ text: '' }),
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [new TextRun({ text: `Prejuízo total no período: R$ ${formatarValor(totalPerda)}`, bold: true })],
          }),
          ...blocoCategorias,
        ],
      },
    ],
  });

  return await Packer.toBuffer(doc);
};

module.exports = { gerarPDFDesperdicios, gerarWordDesperdicios };
