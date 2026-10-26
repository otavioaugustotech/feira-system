const request = require('supertest');
const app = require('../app');
const db = require('../db');

describe('Leads da Landing Page', () => {
  const email = `lead_${Date.now()}@teste.com`;
  const leadValido = {
    nome: 'Maria Feirante',
    email,
    telefone: '(11) 98765-4321',
    tipo: 'demonstracao',
    mensagem: 'Quero conhecer o sistema.',
    consentimento: true,
  };

  afterAll(async () => {
    await db.pool.end();
  });

  test('salva um lead válido sem precisar de login', async () => {
    const res = await request(app).post('/api/leads').send(leadValido);

    expect(res.status).toBe(201);
    expect(res.body.sucesso).toBe(true);

    const { rows } = await db.query('SELECT * FROM leads WHERE email = $1', [email]);
    expect(rows).toHaveLength(1);
    expect(rows[0].telefone).toBe('11987654321'); /* normalizado para dígitos */
    expect(rows[0].status).toBe('novo');
    expect(rows[0].consentimento_em).not.toBeNull();
  });

  test('reenvio do mesmo e-mail logo em seguida não duplica o lead', async () => {
    const res = await request(app).post('/api/leads').send(leadValido);

    expect(res.status).toBe(200);
    const { rows } = await db.query('SELECT id FROM leads WHERE email = $1', [email]);
    expect(rows).toHaveLength(1);
  });

  test('rejeita lead sem consentimento (LGPD)', async () => {
    const res = await request(app)
      .post('/api/leads')
      .send({ ...leadValido, email: `sem_consent_${Date.now()}@teste.com`, consentimento: false });

    expect(res.status).toBe(400);
    expect(res.body.erro).toMatch(/consentimento/);
  });

  test('rejeita e-mail e telefone inválidos', async () => {
    const res = await request(app)
      .post('/api/leads')
      .send({ ...leadValido, email: 'nao-e-email', telefone: '123' });

    expect(res.status).toBe(400);
    expect(res.body.erro).toMatch(/email/);
    expect(res.body.erro).toMatch(/telefone/);
  });

  test('honeypot preenchido responde sucesso mas não grava nada', async () => {
    const emailRobo = `robo_${Date.now()}@teste.com`;
    const res = await request(app)
      .post('/api/leads')
      .send({ ...leadValido, email: emailRobo, site: 'http://spam.example' });

    expect(res.status).toBe(201);
    const { rows } = await db.query('SELECT id FROM leads WHERE email = $1', [emailRobo]);
    expect(rows).toHaveLength(0);
  });

  test('JSON malformado devolve 400, não 500', async () => {
    const res = await request(app)
      .post('/api/leads')
      .set('Content-Type', 'application/json')
      .send('{"nome": ');

    expect(res.status).toBe(400);
  });
});
