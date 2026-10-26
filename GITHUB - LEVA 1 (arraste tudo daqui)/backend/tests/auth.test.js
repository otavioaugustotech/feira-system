const request = require('supertest');
const app = require('../app');
const db = require('../db');

describe('Autenticação', () => {
  const email = `teste_auth_${Date.now()}@teste.com`;
  const senha = '123456';

  afterAll(async () => {
    await db.pool.end();
  });

  test('registra um novo usuário com sucesso', async () => {
    const res = await request(app)
      .post('/api/auth/registro')
      .send({ nome: 'Usuário Teste', email, senha });

    expect(res.status).toBe(201);
    expect(res.body.sucesso).toBe(true);
    expect(res.body.dados.token).toBeDefined();
    expect(res.body.dados.usuario.senha_hash).toBeUndefined();
  });

  test('login com e-mail e senha corretos retorna um token', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email, senha });

    expect(res.status).toBe(200);
    expect(res.body.dados.token).toBeDefined();
  });

  test('login com senha errada é rejeitado com 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email, senha: 'senha-errada' });

    expect(res.status).toBe(401);
  });

  test('login com e-mail que não existe é rejeitado com 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ninguem@nunca-existiu.com', senha: '123456' });

    expect(res.status).toBe(401);
  });

  test('não deixa cadastrar dois usuários com o mesmo e-mail', async () => {
    const res = await request(app)
      .post('/api/auth/registro')
      .send({ nome: 'Outro Usuário', email, senha: '123456' });

    expect(res.status).toBe(409);
  });
});
