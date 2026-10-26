/* Health check e CORS da integração com a Landing Page.
   As origens são definidas ANTES de carregar o app, que lê o .env na carga. */
process.env.LANDING_URL = 'https://FeiraSystem.com.br/';

const request = require('supertest');
const app = require('../app');
const db = require('../db');

const preflight = (origem) =>
  request(app)
    .options('/api/leads')
    .set('Origin', origem)
    .set('Access-Control-Request-Method', 'POST');

describe('Infraestrutura (health e CORS)', () => {
  afterAll(async () => {
    await db.pool.end();
  });

  test('GET /api/health responde rápido sem tocar no banco', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.headers['cache-control']).toBe('no-store');
  });

  test('GET /api/health?db=1 confere a conexão com o banco', async () => {
    const res = await request(app).get('/api/health?db=1');
    expect(res.status).toBe(200);
    expect(res.body.banco).toBe('ok');
  });

  test('libera a landing mesmo com maiúsculas e barra no final no .env', async () => {
    const res = await preflight('https://feirasystem.com.br');
    expect(res.headers['access-control-allow-origin']).toBe('https://feirasystem.com.br');
  });

  test('libera automaticamente a variação com www', async () => {
    const res = await preflight('https://www.feirasystem.com.br');
    expect(res.headers['access-control-allow-origin']).toBe('https://www.feirasystem.com.br');
  });

  test('bloqueia origem desconhecida', async () => {
    const res = await preflight('https://site-malicioso.com');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });
});
