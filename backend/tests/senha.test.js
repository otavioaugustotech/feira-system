const request = require('supertest');
const app = require('../app');
const db = require('../db');

describe('Alterar senha estando logado (PUT /api/auth/senha)', () => {
  const email = `teste_senha_${Date.now()}@teste.com`;
  let token;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/auth/registro')
      .send({ nome: 'Troca Senha', email, senha: 'senha-antiga' });
    token = res.body.dados.token;
  });

  afterAll(async () => {
    await db.pool.end();
  });

  test('exige login', async () => {
    const res = await request(app).put('/api/auth/senha').send({ senha_atual: 'x', nova_senha: '123456' });
    expect(res.status).toBe(401);
  });

  test('perfil informa que a conta tem senha', async () => {
    const res = await request(app).get('/api/auth/perfil').set('Authorization', `Bearer ${token}`);
    expect(res.body.dados.tem_senha).toBe(true);
  });

  test('recusa senha atual errada', async () => {
    const res = await request(app)
      .put('/api/auth/senha')
      .set('Authorization', `Bearer ${token}`)
      .send({ senha_atual: 'errada', nova_senha: 'senha-nova' });
    expect(res.status).toBe(400);
    expect(res.body.erro).toMatch(/senha atual/i);
  });

  test('recusa nova senha curta', async () => {
    const res = await request(app)
      .put('/api/auth/senha')
      .set('Authorization', `Bearer ${token}`)
      .send({ senha_atual: 'senha-antiga', nova_senha: '123' });
    expect(res.status).toBe(400);
  });

  test('troca a senha e o login passa a usar a nova', async () => {
    const res = await request(app)
      .put('/api/auth/senha')
      .set('Authorization', `Bearer ${token}`)
      .send({ senha_atual: 'senha-antiga', nova_senha: 'senha-nova' });
    expect(res.status).toBe(200);

    const antiga = await request(app).post('/api/auth/login').send({ email, senha: 'senha-antiga' });
    expect(antiga.status).toBe(401);
    const nova = await request(app).post('/api/auth/login').send({ email, senha: 'senha-nova' });
    expect(nova.status).toBe(200);
  });

  test('conta criada pelo Google (sem senha) pode criar a primeira senha', async () => {
    const emailGoogle = `google_${Date.now()}@teste.com`;
    const { rows } = await db.query(
      "INSERT INTO usuarios (nome, email, google_id) VALUES ('Conta Google', $1, $2) RETURNING id",
      [emailGoogle, `gid-${Date.now()}`]
    );
    const jwt = require('jsonwebtoken');
    const tokenGoogle = jwt.sign({ id: rows[0].id, email: emailGoogle, nome: 'Conta Google' }, process.env.JWT_SECRET);

    const perfil = await request(app).get('/api/auth/perfil').set('Authorization', `Bearer ${tokenGoogle}`);
    expect(perfil.body.dados.tem_senha).toBe(false);

    const res = await request(app)
      .put('/api/auth/senha')
      .set('Authorization', `Bearer ${tokenGoogle}`)
      .send({ nova_senha: 'primeira-senha' });
    expect(res.status).toBe(200);

    const login = await request(app).post('/api/auth/login').send({ email: emailGoogle, senha: 'primeira-senha' });
    expect(login.status).toBe(200);
  });
});
