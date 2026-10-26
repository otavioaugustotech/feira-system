const request = require('supertest');
const app = require('../app');
const db = require('../db');

describe('Desperdícios — exclusão com devolução de estoque', () => {
  let token;
  let produtoId;

  beforeAll(async () => {
    const email = `teste_desperdicios_${Date.now()}@teste.com`;
    const registro = await request(app)
      .post('/api/auth/registro')
      .send({ nome: 'Teste Desperdícios', email, senha: '123456' });
    token = registro.body.dados.token;

    const produto = await request(app)
      .post('/api/produtos')
      .set('Authorization', `Bearer ${token}`)
      .send({ nome: 'Alface', tipo_venda: 'unidade', preco_custo: 1, preco_venda: 2, quantidade: 50 });
    produtoId = produto.body.dados.id;
  });

  afterAll(async () => {
    await db.pool.end();
  });

  test('registrar desperdício diminui o estoque do produto', async () => {
    const desp = await request(app)
      .post('/api/desperdicios')
      .set('Authorization', `Bearer ${token}`)
      .send({ produto_id: produtoId, quantidade: 10, motivo: 'teste' });

    expect(desp.status).toBe(201);

    const produto = await request(app)
      .get(`/api/produtos/${produtoId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(Number(produto.body.dados.quantidade)).toBe(40); // 50 - 10
  });

  test('excluir o registro devolve a quantidade exata ao estoque', async () => {
    const registros = await request(app)
      .get('/api/desperdicios')
      .set('Authorization', `Bearer ${token}`);
    const registroId = registros.body.dados[0].id;

    const exclusao = await request(app)
      .delete(`/api/desperdicios/${registroId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(exclusao.status).toBe(200);

    const produto = await request(app)
      .get(`/api/produtos/${produtoId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(Number(produto.body.dados.quantidade)).toBe(50); // voltou ao valor original

    const registrosDepois = await request(app)
      .get('/api/desperdicios')
      .set('Authorization', `Bearer ${token}`);
    expect(registrosDepois.body.dados.length).toBe(0);
  });

  test('excluir registro inexistente retorna 404', async () => {
    const res = await request(app)
      .delete('/api/desperdicios/999999')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  test('um usuário não consegue excluir desperdício de outro usuário', async () => {
    const desp = await request(app)
      .post('/api/desperdicios')
      .set('Authorization', `Bearer ${token}`)
      .send({ produto_id: produtoId, quantidade: 2 });
    const registroId = desp.body.dados.id;

    const outroEmail = `teste_desperdicios_outro_${Date.now()}@teste.com`;
    const outroRegistro = await request(app)
      .post('/api/auth/registro')
      .send({ nome: 'Outro Feirante', email: outroEmail, senha: '123456' });
    const outroToken = outroRegistro.body.dados.token;

    const tentativa = await request(app)
      .delete(`/api/desperdicios/${registroId}`)
      .set('Authorization', `Bearer ${outroToken}`);
    expect(tentativa.status).toBe(404);
  });
});
