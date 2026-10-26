const request = require('supertest');
const app = require('../app');
const db = require('../db');

describe('Vendas — baixa e reversão de estoque', () => {
  let token;
  let produtoId;

  beforeAll(async () => {
    const email = `teste_vendas_${Date.now()}@teste.com`;
    const registro = await request(app)
      .post('/api/auth/registro')
      .send({ nome: 'Feirante Teste', email, senha: '123456' });
    token = registro.body.dados.token;

    const produto = await request(app)
      .post('/api/produtos')
      .set('Authorization', `Bearer ${token}`)
      .send({ nome: 'Tomate', tipo_venda: 'kg', preco_custo: 2, preco_venda: 5, quantidade: 20 });
    produtoId = produto.body.dados.id;
  });

  afterAll(async () => {
    await db.pool.end();
  });

  test('criar venda calcula o total certo e diminui o estoque do produto', async () => {
    const venda = await request(app)
      .post('/api/vendas')
      .set('Authorization', `Bearer ${token}`)
      .send({ forma_pagamento: 'pix', itens: [{ produto_id: produtoId, quantidade: 5 }] });

    expect(venda.status).toBe(201);
    expect(Number(venda.body.dados.total)).toBe(25); // 5kg x R$5,00

    const produto = await request(app)
      .get(`/api/produtos/${produtoId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(Number(produto.body.dados.quantidade)).toBe(15); // 20 - 5
  });

  test('cancelar a venda devolve exatamente a quantidade vendida ao estoque', async () => {
    const vendas = await request(app)
      .get('/api/vendas')
      .set('Authorization', `Bearer ${token}`);
    const vendaId = vendas.body.dados.vendas[0].id;

    const cancelamento = await request(app)
      .patch(`/api/vendas/${vendaId}/cancelar`)
      .set('Authorization', `Bearer ${token}`)
      .send({ motivo: 'Teste automatizado' });
    expect(cancelamento.status).toBe(200);

    const produto = await request(app)
      .get(`/api/produtos/${produtoId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(Number(produto.body.dados.quantidade)).toBe(20); // voltou ao valor original
  });

  test('não deixa vender mais do que existe em estoque', async () => {
    const venda = await request(app)
      .post('/api/vendas')
      .set('Authorization', `Bearer ${token}`)
      .send({ forma_pagamento: 'pix', itens: [{ produto_id: produtoId, quantidade: 9999 }] });

    expect(venda.status).toBe(400);
  });

  test('um usuário não consegue ver nem cancelar venda de outro usuário', async () => {
    const outroEmail = `teste_vendas_outro_${Date.now()}@teste.com`;
    const outroRegistro = await request(app)
      .post('/api/auth/registro')
      .send({ nome: 'Outro Feirante', email: outroEmail, senha: '123456' });
    const outroToken = outroRegistro.body.dados.token;

    const vendas = await request(app)
      .get('/api/vendas')
      .set('Authorization', `Bearer ${token}`);
    const vendaId = vendas.body.dados.vendas[0].id;

    const tentativa = await request(app)
      .patch(`/api/vendas/${vendaId}/cancelar`)
      .set('Authorization', `Bearer ${outroToken}`)
      .send({ motivo: 'Tentativa indevida' });

    expect(tentativa.status).toBe(404);
  });
});
