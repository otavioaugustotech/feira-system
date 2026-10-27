/* Envio de e-mail pela API do Brevo (o Render free bloqueia SMTP).
   fetch é simulado: nenhum e-mail de verdade sai daqui. */
process.env.BREVO_API_KEY = 'chave-de-teste';
process.env.SMTP_FROM = 'Feira System <remetente@teste.com>';
process.env.FRONTEND_URL = 'https://app.teste.com/';

const { sendPasswordResetEmail } = require('../utils/emailService');

describe('E-mail via Gmail API', () => {
  const fetchOriginal = global.fetch;
  let emailService;
  let getAccessToken;

  beforeAll(() => {
    process.env.GOOGLE_CLIENT_ID = 'cliente.apps.googleusercontent.com';
    process.env.GMAIL_CLIENT_SECRET = 'segredo';
    process.env.GMAIL_REFRESH_TOKEN = 'refresh';
    process.env.EMAILJS_SERVICE_ID = 's'; process.env.EMAILJS_TEMPLATE_ID = 't';
    process.env.EMAILJS_PUBLIC_KEY = 'p'; process.env.EMAILJS_PRIVATE_KEY = 'k';
    jest.isolateModules(() => {
      jest.doMock('google-auth-library', () => ({
        OAuth2Client: jest.fn().mockImplementation(() => ({
          setCredentials: jest.fn(),
          getAccessToken: (...args) => getAccessToken(...args),
        })),
      }));
      emailService = require('../utils/emailService');
    });
  });
  afterAll(() => {
    ['GOOGLE_CLIENT_ID', 'GMAIL_CLIENT_SECRET', 'GMAIL_REFRESH_TOKEN', 'EMAILJS_SERVICE_ID', 'EMAILJS_TEMPLATE_ID', 'EMAILJS_PUBLIC_KEY', 'EMAILJS_PRIVATE_KEY']
      .forEach((k) => delete process.env[k]);
    jest.dontMock('google-auth-library');
  });
  afterEach(() => { global.fetch = fetchOriginal; });

  test('tem prioridade, usa o token renovado e monta o e-mail com acentos certos', async () => {
    getAccessToken = jest.fn().mockResolvedValue({ token: 'access-123' });
    global.fetch = jest.fn().mockResolvedValue({ ok: true, text: async () => '{}' });

    await emailService.sendPasswordResetEmail('cliente@teste.com', 'abc123');

    const [url, opcoes] = global.fetch.mock.calls[0];
    expect(url).toBe('https://gmail.googleapis.com/gmail/v1/users/me/messages/send');
    expect(opcoes.headers.Authorization).toBe('Bearer access-123');
    const mime = Buffer.from(JSON.parse(opcoes.body).raw, 'base64url').toString('utf8');
    expect(mime).toContain('To: cliente@teste.com');
    expect(mime).toContain('<remetente@teste.com>');
    const assunto = mime.match(/Subject: =\?UTF-8\?B\?([^?]+)\?=/)[1];
    expect(Buffer.from(assunto, 'base64').toString('utf8')).toBe('Recuperação de senha — Feira System');
    const corpo = Buffer.from(mime.split('\r\n\r\n')[1].replace(/\r\n/g, ''), 'base64').toString('utf8');
    expect(corpo).toContain('redefinir-senha?email=cliente%40teste.com&token=abc123');
  });

  test('aviso de novo contato vai para o e-mail do dono, com "Responder" para quem escreveu', async () => {
    process.env.LEADS_NOTIFY_EMAIL = 'dono@teste.com';
    getAccessToken = jest.fn().mockResolvedValue({ token: 'access-123' });
    global.fetch = jest.fn().mockResolvedValue({ ok: true, text: async () => '{}' });

    await emailService.sendLeadNotificationEmail({
      id: 7, nome: 'Maria <b>Feirante</b>', email: 'maria@feira.com', telefone: '11987654321',
      tipo: 'demonstracao', mensagem: 'Quero conhecer o sistema',
    });

    const mime = Buffer.from(JSON.parse(global.fetch.mock.calls[0][1].body).raw, 'base64url').toString('utf8');
    expect(mime).toContain('To: dono@teste.com');
    expect(mime).toContain('Reply-To: maria@feira.com');
    const corpo = Buffer.from(mime.split('\r\n\r\n')[1].replace(/\r\n/g, ''), 'base64').toString('utf8');
    expect(corpo).toContain('Pedido de demonstração');
    expect(corpo).toContain('Maria &lt;b&gt;Feirante&lt;/b&gt;'); /* HTML do formulário sai escapado */
    expect(corpo).toContain('11987654321');
    delete process.env.LEADS_NOTIFY_EMAIL;
  });

  test('refresh token inválido vira erro explicando o que fazer', async () => {
    getAccessToken = jest.fn().mockRejectedValue(new Error('invalid_grant'));
    await expect(emailService.sendPasswordResetEmail('cliente@teste.com', 'abc123')).rejects.toThrow(/invalid_grant.*GMAIL_REFRESH_TOKEN/);
  });

  test('Gmail API não ativada (403) vira erro com o motivo', async () => {
    getAccessToken = jest.fn().mockResolvedValue({ token: 'access-123' });
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 403, text: async () => 'Gmail API has not been used in project' });
    await expect(emailService.sendPasswordResetEmail('cliente@teste.com', 'abc123')).rejects.toThrow(/403.*Gmail API has not been used/);
  });
});

describe('E-mail via EmailJS', () => {
  const fetchOriginal = global.fetch;
  const chaves = { EMAILJS_SERVICE_ID: 'service_x', EMAILJS_TEMPLATE_ID: 'template_y', EMAILJS_PUBLIC_KEY: 'pub', EMAILJS_PRIVATE_KEY: 'priv' };
  let emailService;

  beforeAll(() => {
    Object.assign(process.env, chaves);
    process.env.MAILJET_API_KEY = 'mj';
    process.env.MAILJET_SECRET_KEY = 'mj';
    jest.isolateModules(() => { emailService = require('../utils/emailService'); });
  });
  afterAll(() => {
    Object.keys(chaves).forEach((k) => delete process.env[k]);
    delete process.env.MAILJET_API_KEY;
    delete process.env.MAILJET_SECRET_KEY;
  });
  afterEach(() => { global.fetch = fetchOriginal; });

  test('tem prioridade sobre o Mailjet e manda os parâmetros que o template usa', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, text: async () => 'OK' });

    await emailService.sendPasswordResetEmail('cliente@teste.com', 'abc123');

    const [url, opcoes] = global.fetch.mock.calls[0];
    expect(url).toBe('https://api.emailjs.com/api/v1.0/email/send');
    const corpo = JSON.parse(opcoes.body);
    expect(corpo).toMatchObject({ service_id: 'service_x', template_id: 'template_y', user_id: 'pub', accessToken: 'priv' });
    expect(corpo.template_params.to_email).toBe('cliente@teste.com');
    expect(corpo.template_params.subject).toMatch(/Recuperação de senha/);
    expect(corpo.template_params.html_content).toContain('redefinir-senha?email=cliente%40teste.com&token=abc123');
  });

  test('API bloqueada para servidores (403) vira exceção com o motivo', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 403, text: async () => 'API calls are disabled for non-browser applications' });
    await expect(emailService.sendPasswordResetEmail('cliente@teste.com', 'abc123')).rejects.toThrow(/403.*non-browser/);
  });
});

describe('E-mail via Mailjet', () => {
  const fetchOriginal = global.fetch;
  let emailService;

  beforeAll(() => {
    process.env.MAILJET_API_KEY = 'chave-publica';
    process.env.MAILJET_SECRET_KEY = 'chave-secreta';
    jest.isolateModules(() => { emailService = require('../utils/emailService'); });
  });
  afterAll(() => {
    delete process.env.MAILJET_API_KEY;
    delete process.env.MAILJET_SECRET_KEY;
  });
  afterEach(() => { global.fetch = fetchOriginal; });

  test('envia recuperação de senha pela API do Mailjet (tem prioridade sobre o Brevo)', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ Messages: [{ Status: 'success' }] }) });

    await emailService.sendPasswordResetEmail('cliente@teste.com', 'abc123');

    const [url, opcoes] = global.fetch.mock.calls[0];
    expect(url).toBe('https://api.mailjet.com/v3.1/send');
    expect(opcoes.headers.Authorization).toBe(`Basic ${Buffer.from('chave-publica:chave-secreta').toString('base64')}`);
    const msg = JSON.parse(opcoes.body).Messages[0];
    expect(msg.From).toEqual({ Email: 'remetente@teste.com', Name: 'Feira System' });
    expect(msg.To).toEqual([{ Email: 'cliente@teste.com' }]);
    expect(msg.HTMLPart).toContain('redefinir-senha?email=cliente%40teste.com&token=abc123');
  });

  test('remetente não validado vira exceção com o motivo (para aparecer no log)', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 401, json: async () => ({ ErrorMessage: 'sender not validated' }) });
    await expect(emailService.sendPasswordResetEmail('cliente@teste.com', 'abc123')).rejects.toThrow(/401.*sender not validated/);
  });
});

describe('E-mail via Brevo', () => {
  const fetchOriginal = global.fetch;
  afterEach(() => { global.fetch = fetchOriginal; });

  test('envia recuperação de senha pela API do Brevo com remetente e link corretos', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, text: async () => '' });

    await sendPasswordResetEmail('cliente@teste.com', 'abc123');

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, opcoes] = global.fetch.mock.calls[0];
    expect(url).toBe('https://api.brevo.com/v3/smtp/email');
    expect(opcoes.headers['api-key']).toBe('chave-de-teste');
    const corpo = JSON.parse(opcoes.body);
    expect(corpo.sender).toEqual({ name: 'Feira System', email: 'remetente@teste.com' });
    expect(corpo.to).toEqual([{ email: 'cliente@teste.com' }]);
    expect(corpo.htmlContent).toContain('https://app.teste.com/redefinir-senha?email=cliente%40teste.com&token=abc123');
  });

  test('erro do Brevo vira exceção com o motivo (para aparecer no log)', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 400, text: async () => 'sender not valid' });
    await expect(sendPasswordResetEmail('cliente@teste.com', 'abc123')).rejects.toThrow(/400.*sender not valid/);
  });
});
