/* Envio de e-mail pela API do Brevo (o Render free bloqueia SMTP).
   fetch é simulado: nenhum e-mail de verdade sai daqui. */
process.env.BREVO_API_KEY = 'chave-de-teste';
process.env.SMTP_FROM = 'Feira System <remetente@teste.com>';
process.env.FRONTEND_URL = 'https://app.teste.com/';

const { sendPasswordResetEmail } = require('../utils/emailService');

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
