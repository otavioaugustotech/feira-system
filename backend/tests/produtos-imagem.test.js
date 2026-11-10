const request = require('supertest');
const app = require('../app');
const db = require('../db');

/* ⭐ Imagem do produto: salvar no cadastro, trocar e remover na edição,
   manter quando a edição não manda imagem, e recusar formatos inválidos. */

/* PNG 1x1 válido em base64 */
const IMAGEM = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const OUTRA = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==';

describe('Produtos — imagem do produto', () => {
  let token;
  const auth = () => ({ Authorization: `Bearer ${token}` });

  beforeAll(async () => {
    const email = `teste_imagem_${Date.now()}@teste.com`;
    const registro = await request(app)
      .post('/api/auth/registro')
      .send({ nome: 'Teste Imagem', email, senha: '123456' });
    token = registro.body.dados.token;
  });

  afterAll(async () => {
    await db.pool.end();
  });

  test('cadastra produto com imagem e devolve a imagem na listagem', async () => {
    const criado = await request(app).post('/api/produtos').set(auth())
      .send({ nome: 'Morango com foto', preco_custo: 6, preco_venda: 12, quantidade: 10, imagem: IMAGEM });
    expect(criado.status).toBe(201);
    expect(criado.body.dados.imagem).toBe(IMAGEM);

    const lista = await request(app).get('/api/produtos').set(auth());
    const item = lista.body.dados.find((p) => p.id === criado.body.dados.id);
    expect(item.imagem).toBe(IMAGEM);
  });

  test('cadastra produto sem imagem (imagem fica vazia)', async () => {
    const res = await request(app).post('/api/produtos').set(auth())
      .send({ nome: 'Alface sem foto', preco_custo: 1, preco_venda: 3 });
    expect(res.status).toBe(201);
    expect(res.body.dados.imagem).toBeNull();
  });

  test('edição troca a imagem, mantém quando não envia e remove com null', async () => {
    const { body } = await request(app).post('/api/produtos').set(auth())
      .send({ nome: 'Banana', preco_custo: 3, preco_venda: 6, imagem: IMAGEM });
    const id = body.dados.id;

    const trocada = await request(app).put(`/api/produtos/${id}`).set(auth()).send({ imagem: OUTRA });
    expect(trocada.status).toBe(200);
    expect(trocada.body.dados.imagem).toBe(OUTRA);

    const semImagemNoCorpo = await request(app).put(`/api/produtos/${id}`).set(auth()).send({ preco_venda: 7 });
    expect(semImagemNoCorpo.body.dados.imagem).toBe(OUTRA);

    const removida = await request(app).put(`/api/produtos/${id}`).set(auth()).send({ imagem: null });
    expect(removida.status).toBe(200);
    expect(removida.body.dados.imagem).toBeNull();
  });

  test('aceita link https de imagem (cadastro e edição)', async () => {
    const link = 'https://images.exemplo.com/frutas/morango.jpg?w=400';
    const criado = await request(app).post('/api/produtos').set(auth())
      .send({ nome: 'Morango por link', preco_custo: 6, preco_venda: 12, imagem: link });
    expect(criado.status).toBe(201);
    expect(criado.body.dados.imagem).toBe(link);

    const outro = 'https://cdn.exemplo.com/morango-2.png';
    const editado = await request(app).put(`/api/produtos/${criado.body.dados.id}`).set(auth()).send({ imagem: outro });
    expect(editado.status).toBe(200);
    expect(editado.body.dados.imagem).toBe(outro);
  });

  test.each([
    ['texto que não é imagem', 'olá'],
    ['tipo de arquivo não aceito', 'data:image/gif;base64,R0lGODlhAQABAAAAACw='],
    ['link sem https', 'http://exemplo.com/foto.png'],
    ['link javascript', 'javascript:alert(1)'],
    ['link com espaço', 'https://exemplo.com/minha foto.png'],
  ])('rejeita imagem inválida: %s', async (_nome, valor) => {
    const res = await request(app).post('/api/produtos').set(auth())
      .send({ nome: 'Produto ruim', preco_custo: 1, preco_venda: 2, imagem: valor });
    expect(res.status).toBe(400);
  });
});
