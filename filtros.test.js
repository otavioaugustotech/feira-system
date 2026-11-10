/* ═══════════════════════════════════════════════════════════
   tests/filtros.test.js — ⭐ NOVO
   Cobre as melhorias pedidas pela banca:
     • categoria padronizada do motivo do desperdício (+ descrição);
     • filtros de produto e de categoria nos indicadores;
     • período escolhido (e período anterior) nos cartões do Dashboard.
   ═══════════════════════════════════════════════════════════ */
const request = require('supertest');
const app = require('../app');
const db = require('../db');
const { somarDias, diasNoPeriodo } = require('../services/relatoriosService');
const { dataLocalISO } = require('../utils/datas');

describe('Categorias de desperdício e filtros de relatórios', () => {
  let token;
  let alface;   // categoria Verduras
  let morango;  // categoria Frutas
  const auth = () => ({ Authorization: `Bearer ${token}` });
  const hoje = dataLocalISO();

  beforeAll(async () => {
    const email = `teste_filtros_${Date.now()}@teste.com`;
    const registro = await request(app)
      .post('/api/auth/registro')
      .send({ nome: 'Teste Filtros', email, senha: '123456' });
    token = registro.body.dados.token;

    const a = await request(app).post('/api/produtos').set(auth())
      .send({ nome: 'Alface', categoria: 'Verduras', tipo_venda: 'unidade', preco_custo: 1, preco_venda: 3, quantidade: 100 });
    const m = await request(app).post('/api/produtos').set(auth())
      .send({ nome: 'Morango', categoria: 'Frutas', tipo_venda: 'caixa', preco_custo: 4, preco_venda: 10, quantidade: 100 });
    alface = a.body.dados.id;
    morango = m.body.dados.id;

    /* Venda 1: 2 alfaces (receita 6, lucro 4) + 1 morango (receita 10, lucro 6) */
    await request(app).post('/api/vendas').set(auth())
      .send({ forma_pagamento: 'pix', itens: [{ produto_id: alface, quantidade: 2 }, { produto_id: morango, quantidade: 1 }] });
    /* Venda 2: 3 morangos (receita 30, lucro 18) */
    await request(app).post('/api/vendas').set(auth())
      .send({ forma_pagamento: 'dinheiro', itens: [{ produto_id: morango, quantidade: 3 }] });

    /* Perdas: 5 alfaces por vencimento (R$ 5) e 1 morango no transporte (R$ 4) */
    await request(app).post('/api/desperdicios').set(auth())
      .send({ produto_id: alface, quantidade: 5, categoria_motivo: 'vencimento', motivo: 'Folhas murchas' });
    await request(app).post('/api/desperdicios').set(auth())
      .send({ produto_id: morango, quantidade: 1, categoria_motivo: 'transporte' });
  });

  afterAll(async () => {
    await db.pool.end();
  });

  test('desperdício guarda categoria e descrição; sem categoria usa "outros"', async () => {
    const semCategoria = await request(app).post('/api/desperdicios').set(auth())
      .send({ produto_id: alface, quantidade: 1, motivo: 'caiu no chão' });
    expect(semCategoria.status).toBe(201);
    expect(semCategoria.body.dados.categoria_motivo).toBe('outros');
    expect(semCategoria.body.dados.motivo).toBe('caiu no chão');

    /* remove para não interferir nos totais dos próximos testes */
    await request(app).delete(`/api/desperdicios/${semCategoria.body.dados.id}`).set(auth());
  });

  test('categoria de motivo inválida é recusada', async () => {
    const r = await request(app).post('/api/desperdicios').set(auth())
      .send({ produto_id: alface, quantidade: 1, categoria_motivo: 'qualquer' });
    expect(r.status).toBe(400);
  });

  test('lista de desperdícios filtra pela categoria do motivo', async () => {
    const r = await request(app).get('/api/desperdicios').set(auth()).query({ categoria_motivo: 'vencimento' });
    expect(r.status).toBe(200);
    expect(r.body.dados).toHaveLength(1);
    expect(r.body.dados[0].produto_nome).toBe('Alface');
    expect(r.body.dados[0].motivo).toBe('Folhas murchas');
  });

  test('resumo sem filtro soma todos os produtos', async () => {
    const r = await request(app).get('/api/relatorios/resumo').set(auth()).query({ data_inicio: hoje, data_fim: hoje });
    expect(r.status).toBe(200);
    expect(Number(r.body.dados.receita_total)).toBe(46);     // 6 + 10 + 30
    expect(Number(r.body.dados.lucro_bruto)).toBe(28);       // 4 + 6 + 18
    expect(Number(r.body.dados.total_desperdicios)).toBe(9); // 5 + 4
    expect(Number(r.body.dados.lucro_liquido)).toBe(19);
    expect(r.body.dados.total_vendas).toBe(2);
  });

  test('resumo filtrado por produto considera só os itens daquele produto', async () => {
    const r = await request(app).get('/api/relatorios/resumo').set(auth())
      .query({ data_inicio: hoje, data_fim: hoje, produto_id: alface });
    expect(Number(r.body.dados.receita_total)).toBe(6);
    expect(Number(r.body.dados.lucro_bruto)).toBe(4);
    expect(Number(r.body.dados.total_desperdicios)).toBe(5);
    expect(r.body.dados.total_vendas).toBe(1); // só a venda 1 tem alface
  });

  test('kpis filtrados por categoria (grupo de produtos)', async () => {
    const r = await request(app).get('/api/relatorios/kpis').set(auth())
      .query({ data_inicio: hoje, data_fim: hoje, categoria: 'Frutas' });
    expect(r.status).toBe(200);
    expect(Number(r.body.dados.total_vendido)).toBe(40);    // 10 + 30
    expect(r.body.dados.total_vendas).toBe(2);
    expect(Number(r.body.dados.ticket_medio)).toBe(20);     // 40 ÷ 2
    expect(Number(r.body.dados.taxa_desperdicio)).toBeCloseTo((4 / 44) * 100, 2);
  });

  test('cartões do Dashboard aceitam período e filtro', async () => {
    const r = await request(app).get('/api/relatorios/hoje').set(auth())
      .query({ data_inicio: somarDias(hoje, -6), data_fim: hoje, categoria: 'Verduras' });
    expect(r.status).toBe(200);
    expect(r.body.dados.periodo.dias).toBe(7);
    expect(Number(r.body.dados.receita)).toBe(6);
    expect(Number(r.body.dados.desperdicio)).toBe(5);
    expect(r.body.dados.periodo_anterior.fim).toBe(somarDias(hoje, -7));
  });

  test('gráficos respeitam o filtro de produto', async () => {
    const r = await request(app).get('/api/relatorios/graficos').set(auth())
      .query({ data_inicio: hoje, data_fim: hoje, produto_id: morango });
    expect(r.status).toBe(200);
    expect(r.body.dados.evolucao).toHaveLength(1);
    expect(Number(r.body.dados.evolucao[0].vendas)).toBe(40);
    expect(r.body.dados.categorias).toEqual([expect.objectContaining({ categoria: 'Frutas' })]);
    const totalPagamentos = r.body.dados.pagamentos.reduce((s, p) => s + Number(p.quantidade), 0);
    expect(totalPagamentos).toBe(2);
  });

  test('data inválida no filtro devolve 400', async () => {
    const r = await request(app).get('/api/relatorios/resumo').set(auth()).query({ data_inicio: '10/10/2026' });
    expect(r.status).toBe(400);
  });

  test('exportação em PDF e Word funciona com as categorias', async () => {
    const pdf = await request(app).get('/api/desperdicios/exportar/pdf').set(auth());
    expect(pdf.status).toBe(200);
    expect(pdf.headers['content-type']).toContain('application/pdf');
    const word = await request(app).get('/api/desperdicios/exportar/word').set(auth());
    expect(word.status).toBe(200);
  });

  test('funções de data do período', () => {
    expect(somarDias('2026-03-01', -1)).toBe('2026-02-28');
    expect(diasNoPeriodo('2026-10-01', '2026-10-07')).toBe(7);
  });
});
