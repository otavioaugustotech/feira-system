const request = require('supertest');
const app = require('../app');
const db = require('../db');

/* ADMIN_EMAILS=admin_teste@teste.com vem do .env.test */
describe('Tela "Contatos" (leads) — só administrador', () => {
  let tokenAdmin;
  let tokenFeirante;
  const sufixo = Date.now();

  const registrar = async (email) => {
    const res = await request(app).post('/api/auth/registro').send({ nome: 'Pessoa', email, senha: '123456' });
    if (res.status === 409) {
      const login = await request(app).post('/api/auth/login').send({ email, senha: '123456' });
      return login.body.dados;
    }
    return res.body.dados;
  };

  beforeAll(async () => {
    const admin = await registrar('admin_teste@teste.com');
    tokenAdmin = admin.token;
    expect(admin.usuario.admin).toBe(true);

    const feirante = await registrar(`feirante_${sufixo}@teste.com`);
    tokenFeirante = feirante.token;
    expect(feirante.usuario.admin).toBe(false);

    for (const nome of [`Ana Admin ${sufixo}`, `Bruno Admin ${sufixo}`]) {
      await request(app).post('/api/leads').send({
        nome, email: `${nome.split(' ')[0].toLowerCase()}_${sufixo}@teste.com`, consentimento: true, tipo: 'demonstracao',
      });
    }
  });

  afterAll(async () => {
    await db.pool.end();
  });

  test('sem login: 401', async () => {
    const res = await request(app).get('/api/leads');
    expect(res.status).toBe(401);
  });

  test('feirante comum: 403', async () => {
    const res = await request(app).get('/api/leads').set('Authorization', `Bearer ${tokenFeirante}`);
    expect(res.status).toBe(403);
  });

  test('perfil informa quem é admin', async () => {
    const admin = await request(app).get('/api/auth/perfil').set('Authorization', `Bearer ${tokenAdmin}`);
    expect(admin.body.dados.admin).toBe(true);
    const feirante = await request(app).get('/api/auth/perfil').set('Authorization', `Bearer ${tokenFeirante}`);
    expect(feirante.body.dados.admin).toBe(false);
  });

  test('admin lista contatos com total, páginas e contagem por status', async () => {
    const res = await request(app).get('/api/leads').set('Authorization', `Bearer ${tokenAdmin}`);
    expect(res.status).toBe(200);
    const { itens, total, total_paginas, contagem } = res.body.dados;
    expect(total).toBeGreaterThanOrEqual(2);
    expect(total_paginas).toBeGreaterThanOrEqual(1);
    expect(contagem.novo).toBeGreaterThanOrEqual(2);
    expect(itens[0]).toHaveProperty('email');
    expect(itens[0]).not.toHaveProperty('ip'); /* dado técnico não vai para a tela */
  });

  test('busca por nome encontra só o contato certo', async () => {
    const res = await request(app)
      .get('/api/leads')
      .query({ busca: `Ana Admin ${sufixo}` })
      .set('Authorization', `Bearer ${tokenAdmin}`);
    expect(res.body.dados.itens).toHaveLength(1);
    expect(res.body.dados.itens[0].nome).toBe(`Ana Admin ${sufixo}`);
  });

  test('muda o status e filtra por status', async () => {
    const lista = await request(app).get('/api/leads').query({ busca: `Bruno Admin ${sufixo}` }).set('Authorization', `Bearer ${tokenAdmin}`);
    const id = lista.body.dados.itens[0].id;

    const atualizado = await request(app)
      .patch(`/api/leads/${id}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ status: 'convertido' });
    expect(atualizado.status).toBe(200);
    expect(atualizado.body.dados.status).toBe('convertido');

    const filtrado = await request(app).get('/api/leads').query({ status: 'convertido' }).set('Authorization', `Bearer ${tokenAdmin}`);
    expect(filtrado.body.dados.itens.map((l) => l.id)).toContain(id);
  });

  test('status inválido: 400; id inválido ou inexistente: 404', async () => {
    const invalido = await request(app).patch('/api/leads/1').set('Authorization', `Bearer ${tokenAdmin}`).send({ status: 'qualquer' });
    expect(invalido.status).toBe(400);
    const idTexto = await request(app).patch('/api/leads/abc').set('Authorization', `Bearer ${tokenAdmin}`).send({ status: 'novo' });
    expect(idTexto.status).toBe(404);
    const inexistente = await request(app).delete('/api/leads/999999999').set('Authorization', `Bearer ${tokenAdmin}`);
    expect(inexistente.status).toBe(404);
  });

  test('feirante comum não consegue mudar nem excluir', async () => {
    const patch = await request(app).patch('/api/leads/1').set('Authorization', `Bearer ${tokenFeirante}`).send({ status: 'novo' });
    expect(patch.status).toBe(403);
    const del = await request(app).delete('/api/leads/1').set('Authorization', `Bearer ${tokenFeirante}`);
    expect(del.status).toBe(403);
  });

  test('admin exclui um contato', async () => {
    const lista = await request(app).get('/api/leads').query({ busca: `Ana Admin ${sufixo}` }).set('Authorization', `Bearer ${tokenAdmin}`);
    const id = lista.body.dados.itens[0].id;
    const res = await request(app).delete(`/api/leads/${id}`).set('Authorization', `Bearer ${tokenAdmin}`);
    expect(res.status).toBe(200);
    const depois = await request(app).get('/api/leads').query({ busca: `Ana Admin ${sufixo}` }).set('Authorization', `Bearer ${tokenAdmin}`);
    expect(depois.body.dados.itens).toHaveLength(0);
  });
});
