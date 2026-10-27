/* Erros encontrados na análise do projeto — estes testes garantem que não voltem */
const request = require('supertest');
const app = require('../app');
const db = require('../db');

describe('Regressões', () => {
  const sufixo = Date.now();

  afterAll(async () => {
    await db.pool.end();
  });

  describe('e-mail não diferencia maiúsculas', () => {
    const emailMisto = `Maria.${sufixo}@Teste.COM`;

    test('cadastra guardando o e-mail em minúsculas', async () => {
      const res = await request(app).post('/api/auth/registro').send({ nome: 'Maria', email: emailMisto, senha: '123456' });
      expect(res.status).toBe(201);
      expect(res.body.dados.usuario.email).toBe(emailMisto.toLowerCase());
    });

    test('entra digitando em minúsculas ou maiúsculas', async () => {
      const minusculo = await request(app).post('/api/auth/login').send({ email: emailMisto.toLowerCase(), senha: '123456' });
      expect(minusculo.status).toBe(200);
      const maiusculo = await request(app).post('/api/auth/login').send({ email: emailMisto.toUpperCase(), senha: '123456' });
      expect(maiusculo.status).toBe(200);
    });

    test('não deixa criar outra conta com o mesmo e-mail em outra caixa', async () => {
      const res = await request(app).post('/api/auth/registro').send({ nome: 'Outra', email: emailMisto.toUpperCase(), senha: '123456' });
      expect(res.status).toBe(409);
    });

    test('conta antiga gravada com maiúsculas (antes da correção) também entra', async () => {
      const antigo = `Antigo.${sufixo}@Teste.com`;
      const bcrypt = require('bcryptjs');
      await db.query('INSERT INTO usuarios (nome, email, senha_hash) VALUES ($1, $2, $3)', ['Antigo', antigo, await bcrypt.hash('123456', 4)]);
      const res = await request(app).post('/api/auth/login').send({ email: antigo.toLowerCase(), senha: '123456' });
      expect(res.status).toBe(200);
    });
  });

  describe('venda com o mesmo produto em duas linhas', () => {
    let token;
    let produtoId;

    beforeAll(async () => {
      const reg = await request(app).post('/api/auth/registro').send({ nome: 'Feirante', email: `venda_dup_${sufixo}@teste.com`, senha: '123456' });
      token = reg.body.dados.token;
      const prod = await request(app).post('/api/produtos').set('Authorization', `Bearer ${token}`)
        .send({ nome: 'Tomate', preco_custo: 2, preco_venda: 5, quantidade: 3, tipo_venda: 'kg' });
      produtoId = prod.body.dados.id;
    });

    test('soma as linhas e recusa com mensagem clara quando passa do estoque', async () => {
      const res = await request(app).post('/api/vendas').set('Authorization', `Bearer ${token}`)
        .send({ forma_pagamento: 'pix', itens: [{ produto_id: produtoId, quantidade: 2 }, { produto_id: produtoId, quantidade: 2 }] });
      expect(res.status).toBe(400);
      expect(res.body.erro).toMatch(/estoque/i);
      const { rows } = await db.query('SELECT quantidade FROM produtos WHERE id = $1', [produtoId]);
      expect(Number(rows[0].quantidade)).toBe(3);
    });

    test('soma as linhas e vende quando cabe no estoque', async () => {
      const res = await request(app).post('/api/vendas').set('Authorization', `Bearer ${token}`)
        .send({ forma_pagamento: 'dinheiro', itens: [{ produto_id: produtoId, quantidade: 1 }, { produto_id: produtoId, quantidade: 1.5 }] });
      expect(res.status).toBe(201);
      const { rows } = await db.query('SELECT quantidade FROM produtos WHERE id = $1', [produtoId]);
      expect(Number(rows[0].quantidade)).toBe(0.5);
    });
  });
});
