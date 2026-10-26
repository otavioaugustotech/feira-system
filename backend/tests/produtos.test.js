const request = require('supertest');
const app = require('../app');
const db = require('../db');

/* Este arquivo existe especificamente por causa de um bug real que já
   aconteceu neste projeto: o frontend oferecia "Maço" e "Caixa" como
   tipo de venda, o Zod aceitava, mas o CHECK do banco só permitia
   'pacote' — cadastrar um produto desses dava erro 500. Corrigido em
   database/schema.sql. Este teste garante que isso nunca volte a
   quebrar silenciosamente numa mudança futura. */
describe('Produtos — tipo_venda (teste de regressão)', () => {
  let token;

  beforeAll(async () => {
    const email = `teste_produtos_${Date.now()}@teste.com`;
    const registro = await request(app)
      .post('/api/auth/registro')
      .send({ nome: 'Teste Produtos', email, senha: '123456' });
    token = registro.body.dados.token;
  });

  afterAll(async () => {
    await db.pool.end();
  });

  test.each(['unidade', 'kg', 'maco', 'caixa'])(
    'aceita criar produto com tipo_venda = "%s"',
    async (tipo) => {
      const res = await request(app)
        .post('/api/produtos')
        .set('Authorization', `Bearer ${token}`)
        .send({ nome: `Produto ${tipo}`, tipo_venda: tipo, preco_custo: 1, preco_venda: 2, quantidade: 10 });

      expect(res.status).toBe(201);
      expect(res.body.dados.tipo_venda).toBe(tipo);
    }
  );

  test('rejeita preço de venda menor ou igual ao preço de custo', async () => {
    const res = await request(app)
      .post('/api/produtos')
      .set('Authorization', `Bearer ${token}`)
      .send({ nome: 'Produto inválido', preco_custo: 10, preco_venda: 5 });

    expect(res.status).toBe(400);
  });
});
