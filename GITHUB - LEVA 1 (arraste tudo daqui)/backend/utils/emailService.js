/* ═══════════════════════════════════════════════════════════
   utils/emailService.js — RECONSTRUÍDO (não fazia parte do pacote
   "faltante", mas authService.js importa `sendPasswordResetEmail` daqui).

   Em desenvolvimento, se não houver credenciais SMTP no .env, o e-mail
   NÃO é enviado de verdade — apenas o link de recuperação é impresso
   no console, para facilitar o teste manual do fluxo.
   ═══════════════════════════════════════════════════════════ */

const nodemailer = require('nodemailer');

const smtpConfigurado = process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS;

const transporter = smtpConfigurado
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
  : null;

const sendPasswordResetEmail = async (email, tokenBruto) => {
 const linkFrontend = process.env.FRONTEND_URL || 'http://localhost:5173';
const link = `${linkFrontend}/redefinir-senha?email=${encodeURIComponent(email)}&token=${tokenBruto}`;

  if (!smtpConfigurado) {
    console.log('\n📧 [DEV] SMTP não configurado — e-mail não enviado de verdade.');
    console.log(`📧 [DEV] Token de recuperação para ${email}: ${tokenBruto}`);
    console.log(`📧 [DEV] Link de redefinição: ${link}\n`);
    return;
  }

  await transporter.sendMail({
    from: process.env.SMTP_FROM || '"Feira System" <no-reply@feirasystem.com>',
    to: email,
    subject: 'Recuperação de senha — Feira System',
    html: `
      <p>Você solicitou a redefinição da sua senha no Feira System.</p>
      <p>Cole o código abaixo na tela de redefinição de senha (válido por 1 hora):</p>
      <p style="font-size:18px;font-weight:bold;letter-spacing:1px">${tokenBruto}</p>
      <p>Ou clique no link: <a href="${link}">${link}</a></p>
      <p>Se você não solicitou isso, ignore este e-mail.</p>
    `,
  });
};

/* Os dados do lead vêm de um formulário público: escapa tudo antes de
   colocar no HTML do e-mail (senão alguém injeta links/HTML na mensagem). */
const escaparHtml = (texto) =>
  String(texto ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ⭐ Avisa a equipe quando chega um lead da Landing Page.
   Só envia se LEADS_NOTIFY_EMAIL e o SMTP estiverem configurados. */
const sendLeadNotificationEmail = async (lead) => {
  const destino = process.env.LEADS_NOTIFY_EMAIL;
  if (!destino) return;

  if (!smtpConfigurado) {
    console.log(`\n📧 [DEV] SMTP não configurado — novo lead #${lead.id} (${lead.email}) não foi notificado por e-mail.\n`);
    return;
  }

  const tipo = lead.tipo === 'demonstracao' ? 'Pedido de demonstração' : 'Contato';
  const linhas = [
    ['Nome', lead.nome],
    ['E-mail', lead.email],
    ['Telefone', lead.telefone],
    ['Banca', lead.nome_banca],
    ['Origem', lead.origem],
    ['Mensagem', lead.mensagem],
  ].filter(([, valor]) => valor);

  await transporter.sendMail({
    from: process.env.SMTP_FROM || '"Feira System" <no-reply@feirasystem.com>',
    to: destino,
    replyTo: lead.email,
    subject: `${tipo} pela Landing Page — ${String(lead.nome).slice(0, 80)}`,
    html: `
      <p><strong>${tipo}</strong> recebido pela Landing Page (lead #${lead.id}).</p>
      <table cellpadding="6">
        ${linhas.map(([rotulo, valor]) => `<tr><td><strong>${rotulo}</strong></td><td style="white-space:pre-wrap">${escaparHtml(valor)}</td></tr>`).join('')}
      </table>
    `,
  });
};

module.exports = { sendPasswordResetEmail, sendLeadNotificationEmail };
