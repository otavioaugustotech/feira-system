/* ═══════════════════════════════════════════════════════════
   utils/emailService.js — RECONSTRUÍDO (não fazia parte do pacote
   "faltante", mas authService.js importa `sendPasswordResetEmail` daqui).

   ⭐ Jeitos de enviar, escolhidos pelo .env (nesta ordem):
   0) GMAIL_CLIENT_SECRET + GMAIL_REFRESH_TOKEN (+ GMAIL_CLIENT_ID, que por
      padrão é o mesmo GOOGLE_CLIENT_ID do login) → Gmail API oficial do
      Google, pelo projeto do Google Cloud. Envia pelo SEU Gmail, via HTTPS
      (funciona no Render free). O remetente (SMTP_FROM) deve ser essa conta.
   1) EMAILJS_SERVICE_ID + EMAILJS_TEMPLATE_ID + EMAILJS_PUBLIC_KEY +
      EMAILJS_PRIVATE_KEY → API HTTPS do EmailJS (emailjs.com, grátis até
      200/mês). Envia pelo SEU Gmail conectado lá — sem domínio e sem SMS.
   2) MAILJET_API_KEY + MAILJET_SECRET_KEY → API HTTPS do Mailjet
      (mailjet.com, grátis até 200/dia, conta validada por e-mail).
   3) BREVO_API_KEY → API HTTPS do Brevo (brevo.com, grátis até 300/dia;
      exige confirmar o celular por SMS).
      Use 1, 2 ou 3 no Render: o plano gratuito do Render BLOQUEIA as portas
      de e-mail (SMTP 25/465/587) desde set/2025 — o Gmail não sai de lá.
   4) SMTP_HOST/USER/PASS → SMTP comum (ex.: Gmail com senha de app),
      bom para rodar no seu computador ou num servidor pago.
   Sem nenhum deles (desenvolvimento), o e-mail NÃO é enviado — o
   link de recuperação é só impresso no console, para testes manuais.
   ═══════════════════════════════════════════════════════════ */

const nodemailer = require('nodemailer');
const { OAuth2Client } = require('google-auth-library');

const REMETENTE_PADRAO = '"Feira System" <no-reply@feirasystem.com>';

const gmailClientId = process.env.GMAIL_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
const gmailConfigurado = Boolean(gmailClientId && process.env.GMAIL_CLIENT_SECRET && process.env.GMAIL_REFRESH_TOKEN);
/* O cliente guarda o access token e o renova sozinho (vale ~1h) a partir do refresh token */
const clienteGmail = gmailConfigurado ? new OAuth2Client(gmailClientId, process.env.GMAIL_CLIENT_SECRET) : null;
if (clienteGmail) clienteGmail.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN });

/* Cabeçalho com acento ("Recuperação") precisa ir codificado (RFC 2047) */
const cabecalhoUtf8 = (texto) => `=?UTF-8?B?${Buffer.from(String(texto), 'utf8').toString('base64')}?=`;

/* Monta o e-mail no formato MIME que a Gmail API espera (base64url) */
const montarMime = ({ de, para, assunto, html, responderPara }) => {
  const { name, email } = separarRemetente(de);
  const linhas = [
    `From: ${cabecalhoUtf8(name)} <${email}>`,
    `To: ${para}`,
    ...(responderPara ? [`Reply-To: ${responderPara}`] : []),
    `Subject: ${cabecalhoUtf8(assunto)}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    Buffer.from(html, 'utf8').toString('base64').replace(/.{76}/g, '$&\r\n'),
  ];
  return Buffer.from(linhas.join('\r\n'), 'utf8').toString('base64url');
};

const emailjsConfigurado = Boolean(
  process.env.EMAILJS_SERVICE_ID && process.env.EMAILJS_TEMPLATE_ID &&
  process.env.EMAILJS_PUBLIC_KEY && process.env.EMAILJS_PRIVATE_KEY
);
const mailjetConfigurado = Boolean(process.env.MAILJET_API_KEY && process.env.MAILJET_SECRET_KEY);
const brevoConfigurado = Boolean(process.env.BREVO_API_KEY);
const smtpConfigurado = process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS;

const transporter = smtpConfigurado
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
  : null;

/* '"Feira System" <contato@x.com>' → { name: 'Feira System', email: 'contato@x.com' } */
const separarRemetente = (texto) => {
  const m = String(texto).match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/);
  return m ? { name: m[1].trim() || 'Feira System', email: m[2].trim() } : { name: 'Feira System', email: String(texto).trim() };
};

/* "otavio@gmail.com" → "o***@gmail.com": dá para conferir no log sem expor o endereço inteiro */
const mascararEmail = (email) => String(email).replace(/^(.).*(@.*)$/, '$1***$2');

/* Envia um e-mail pelo meio configurado. Retorna false quando não há
   nenhum configurado (quem chama decide o que registrar no log). */
const enviarEmail = async (dados) => {
  const meio = await enviarPorMeioConfigurado(dados);
  /* ⭐ Registra também o SUCESSO: sem isto, "nada no log" podia ser tanto
     "enviou" quanto "nem tentou", e não dava para diagnosticar. */
  if (meio) console.log(`📧 E-mail "${dados.assunto}" aceito pelo ${meio} para ${mascararEmail(dados.para)}`);
  return Boolean(meio);
};

/* Devolve o nome do serviço usado ('Gmail API' | 'EmailJS' | 'Mailjet' | 'Brevo' | 'SMTP') ou null se nenhum está configurado */
const enviarPorMeioConfigurado = async ({ para, assunto, html, responderPara }) => {
  const remetente = process.env.SMTP_FROM || REMETENTE_PADRAO;

  if (gmailConfigurado) {
    let token;
    try {
      ({ token } = await clienteGmail.getAccessToken());
    } catch (err) {
      /* invalid_grant = refresh token revogado/expirado (ex.: app voltou para
         "Em teste" no Google, ou a senha da conta Google mudou): gere outro. */
      throw new Error(`Gmail API: não foi possível renovar o acesso (${err.message}). Gere um novo GMAIL_REFRESH_TOKEN.`);
    }
    const resposta = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw: montarMime({ de: remetente, para, assunto, html, responderPara }) }),
      signal: AbortSignal.timeout(15000),
    });
    if (!resposta.ok) {
      const detalhe = await resposta.text().catch(() => '');
      /* 403 "Gmail API has not been used in project..." → ativar a Gmail API
         no Google Cloud (APIs e serviços → Biblioteca → Gmail API → Ativar) */
      throw new Error(`Gmail API respondeu HTTP ${resposta.status}: ${detalhe.slice(0, 300)}`);
    }
    return 'Gmail API';
  }

  if (emailjsConfigurado) {
    /* O template no painel do EmailJS precisa usar estas variáveis:
       To Email = {{to_email}} · Subject = {{subject}} · Reply To = {{reply_to}}
       Content  = {{{html_content}}}  (3 chaves: o HTML não é escapado) */
    const resposta = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_id: process.env.EMAILJS_SERVICE_ID,
        template_id: process.env.EMAILJS_TEMPLATE_ID,
        user_id: process.env.EMAILJS_PUBLIC_KEY,
        accessToken: process.env.EMAILJS_PRIVATE_KEY,
        template_params: {
          to_email: para,
          subject: assunto,
          html_content: html,
          reply_to: responderPara || separarRemetente(remetente).email,
        },
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!resposta.ok) {
      const detalhe = await resposta.text().catch(() => '');
      /* Erro mais comum (403): "API calls are disabled for non-browser
         applications" → ligar em Account → Security no painel do EmailJS */
      throw new Error(`EmailJS respondeu HTTP ${resposta.status}: ${detalhe.slice(0, 300)}`);
    }
    return 'EmailJS';
  }

  if (mailjetConfigurado) {
    const { name, email } = separarRemetente(remetente);
    const credenciais = Buffer.from(`${process.env.MAILJET_API_KEY}:${process.env.MAILJET_SECRET_KEY}`).toString('base64');
    const resposta = await fetch('https://api.mailjet.com/v3.1/send', {
      method: 'POST',
      headers: { Authorization: `Basic ${credenciais}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        Messages: [{
          From: { Email: email, Name: name },
          To: [{ Email: para }],
          Subject: assunto,
          HTMLPart: html,
          ...(responderPara ? { ReplyTo: { Email: responderPara } } : {}),
        }],
      }),
      signal: AbortSignal.timeout(10000),
    });
    const corpo = await resposta.json().catch(() => ({}));
    if (!resposta.ok || corpo.Messages?.[0]?.Status !== 'success') {
      /* Erros mais comuns: chaves trocadas (401) ou remetente (SMTP_FROM)
         ainda não validado no Mailjet (Senders & Domains) */
      throw new Error(`Mailjet respondeu HTTP ${resposta.status}: ${JSON.stringify(corpo).slice(0, 300)}`);
    }
    return 'Mailjet';
  }

  if (brevoConfigurado) {
    const resposta = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': process.env.BREVO_API_KEY, 'Content-Type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        sender: separarRemetente(remetente),
        to: [{ email: para }],
        subject: assunto,
        htmlContent: html,
        ...(responderPara ? { replyTo: { email: responderPara } } : {}),
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!resposta.ok) {
      const detalhe = await resposta.text().catch(() => '');
      /* Erro mais comum: remetente (SMTP_FROM) não verificado no painel do Brevo */
      throw new Error(`Brevo respondeu HTTP ${resposta.status}: ${detalhe.slice(0, 300)}`);
    }
    return 'Brevo';
  }

  if (smtpConfigurado) {
    await transporter.sendMail({ from: remetente, to: para, replyTo: responderPara, subject: assunto, html });
    return 'SMTP';
  }

  return null;
};

const sendPasswordResetEmail = async (email, tokenBruto) => {
  const linkFrontend = (process.env.FRONTEND_URL || 'http://localhost:5173').split(',')[0].trim().replace(/\/+$/, '');
  const link = `${linkFrontend}/redefinir-senha?email=${encodeURIComponent(email)}&token=${tokenBruto}`;

  const enviado = await enviarEmail({
    para: email,
    assunto: 'Recuperação de senha — Feira System',
    html: `
      <p>Você solicitou a redefinição da sua senha no Feira System.</p>
      <p><a href="${link}" style="display:inline-block;padding:10px 18px;background:#16a05c;color:#fff;border-radius:8px;text-decoration:none;font-weight:bold">Criar nova senha</a></p>
      <p>Ou cole o código abaixo na tela de redefinição de senha (válido por 1 hora):</p>
      <p style="font-size:16px;font-weight:bold;letter-spacing:1px;word-break:break-all">${tokenBruto}</p>
      <p>Se você não solicitou isso, ignore este e-mail: sua senha continua a mesma.</p>
    `,
  });

  if (!enviado) {
    /* ⭐ Em produção o token NUNCA vai para o log: quem lê os logs do servidor
       poderia redefinir a senha de qualquer cliente. */
    if (process.env.NODE_ENV === 'production') {
      console.error(`❌ E-mail de recuperação para ${email} NÃO enviado: configure GMAIL_CLIENT_SECRET e GMAIL_REFRESH_TOKEN (ou EmailJS / Mailjet / Brevo / SMTP).`);
      return;
    }
    console.log('\n📧 [DEV] Nenhum envio de e-mail configurado (Gmail API, EmailJS, Mailjet, Brevo ou SMTP) — e-mail não enviado de verdade.');
    console.log(`📧 [DEV] Token de recuperação para ${email}: ${tokenBruto}`);
    console.log(`📧 [DEV] Link de redefinição: ${link}\n`);
  }
};

/* Os dados do lead vêm de um formulário público: escapa tudo antes de
   colocar no HTML do e-mail (senão alguém injeta links/HTML na mensagem). */
const escaparHtml = (texto) =>
  String(texto ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ⭐ Avisa a equipe quando chega um lead da Landing Page.
   Só envia se LEADS_NOTIFY_EMAIL e um meio de envio estiverem configurados. */
const sendLeadNotificationEmail = async (lead) => {
  const destino = process.env.LEADS_NOTIFY_EMAIL;
  if (!destino) return;

  const tipo = lead.tipo === 'demonstracao' ? 'Pedido de demonstração' : 'Contato';
  const linhas = [
    ['Nome', lead.nome],
    ['E-mail', lead.email],
    ['Telefone', lead.telefone],
    ['Banca', lead.nome_banca],
    ['Origem', lead.origem],
    ['Mensagem', lead.mensagem],
  ].filter(([, valor]) => valor);

  const enviado = await enviarEmail({
    para: destino,
    responderPara: lead.email,
    assunto: `${tipo} pela Landing Page — ${String(lead.nome).slice(0, 80)}`,
    html: `
      <p><strong>${tipo}</strong> recebido pela Landing Page (lead #${lead.id}).</p>
      <table cellpadding="6">
        ${linhas.map(([rotulo, valor]) => `<tr><td><strong>${rotulo}</strong></td><td style="white-space:pre-wrap">${escaparHtml(valor)}</td></tr>`).join('')}
      </table>
    `,
  });

  if (!enviado) {
    console.log(`\n📧 [DEV] Envio de e-mail não configurado — novo lead #${lead.id} (${lead.email}) não foi notificado.\n`);
  }
};

module.exports = { sendPasswordResetEmail, sendLeadNotificationEmail };
