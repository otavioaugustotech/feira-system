/* Envio de e-mail pela API do Brevo (o Render free bloqueia SMTP).
   fetch é simulado: nenhum e-mail de verdade sai daqui. */
process.env.BREVO_API_KEY = 'chave-de-teste';
process.env.SMTP_FROM = 'Feira System <remetente@teste.com>';
process.env.FRONTEND_URL = 'https://app.teste.com/';

const { sendPasswordResetEmail } = require('../utils/emailService');

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
