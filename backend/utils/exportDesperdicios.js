/* ═══════════════════════════════════════════════════════════
   utils/exportDesperdicios.js — ⭐ NOVO
   Gera relatórios de desperdício em PDF (pdfkit) e Word (docx).
   Instalar dependências:  npm install pdfkit docx
   ═══════════════════════════════════════════════════════════ */

const PDFDocument = require('pdfkit');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, HeadingLevel, AlignmentType
} = require('docx');

function formatarQuantidade(valor) {
  const numero = Number(valor ?? 0);
  return numero.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 3 });
}

/* ══ Gera um Buffer de PDF com a lista de desperdícios ══
   registros: [{ produto_nome, quantidade, motivo, valor_perda, data_registro }]
   totalPerda: soma de valor_perda no período
*/
const gerarPDFDesperdicios = (registros, totalPerda, periodo) => {
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

    /* Cabeçalho da tabela */
    doc.fillColor('#000').fontSize(11);
    const colX = { produto: 40, qtd: 220, motivo: 280, valor: 460 };
    doc.font('Helvetica-Bold');
    doc.text('Produto',   colX.produto, doc.y, { continued: false });
    doc.text('Qtd',       colX.qtd, doc.y - 12);
    doc.text('Motivo',    colX.motivo, doc.y - 12);
    doc.text('Perda (R$)',colX.valor, doc.y - 12);
    doc.moveDown(0.5);
    doc.font('Helvetica');
    doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor('#ccc').stroke();
    doc.moveDown(0.3);

    registros.forEach((r) => {
      const y = doc.y;
      doc.fontSize(10);
      doc.text(r.produto_nome, colX.produto, y, { width: 170 });
      doc.text(formatarQuantidade(r.quantidade), colX.qtd, y);
      doc.text(r.motivo || '-', colX.motivo, y, { width: 170 });
      doc.text(parseFloat(r.valor_perda).toFixed(2), colX.valor, y);
      doc.moveDown(0.6);
    });

    doc.moveDown(1);
    doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor('#ccc').stroke();
    doc.moveDown(0.5);
    doc.font('Helvetica-Bold').fontSize(12)
      .text(`Prejuízo total no período: R$ ${parseFloat(totalPerda).toFixed(2)}`, { align: 'right' });

    doc.end();
  });
};

/* ══ Gera um Buffer de Word (.docx) com a mesma informação ══ */
const gerarWordDesperdicios = async (registros, totalPerda, periodo) => {
  const linhasTabela = [
    new TableRow({
      children: ['Produto', 'Qtd', 'Motivo', 'Perda (R$)'].map((texto) =>
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: texto, bold: true })] })],
        })
      ),
    }),
    ...registros.map((r) =>
      new TableRow({
        children: [
          r.produto_nome,
            formatarQuantidade(r.quantidade),
          r.motivo || '-',
          parseFloat(r.valor_perda).toFixed(2),
        ].map((texto) => new TableCell({ children: [new Paragraph(String(texto))] })),
      })
    ),
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
            children: [new TextRun({ text: `Prejuízo total no período: R$ ${parseFloat(totalPerda).toFixed(2)}`, bold: true })],
          }),
        ],
      },
    ],
  });

  return await Packer.toBuffer(doc);
};

module.exports = { gerarPDFDesperdicios, gerarWordDesperdicios };
