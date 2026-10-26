/* Rode: node testar-conexao.js
   Testa a conexão com o Postgres usando o mesmo db.js (e as mesmas
   variáveis de ambiente) que o server.js usa de verdade — em vez de
   duplicar a configuração de conexão aqui, reaproveita db.js, pra
   nunca ficar dessincronizado se a configuração mudar lá. */

require('dotenv').config();

console.log('Tentando conectar com:');
console.log('  DB_HOST:', process.env.DB_HOST);
console.log('  DB_PORT:', process.env.DB_PORT);
console.log('  DB_USER:', process.env.DB_USER);
console.log('  DB_NAME:', process.env.DB_NAME);
console.log('  DB_PASSWORD:', process.env.DB_PASSWORD ? '(definida)' : '(VAZIA/undefined)');
console.log('  JWT_SECRET:', process.env.JWT_SECRET ? '(definida)' : '(VAZIA/undefined) ⚠️');
console.log('');

const db = require('./db');

db.query('SELECT email FROM usuarios')
  .then((res) => {
    console.log('✅ Conectou com sucesso! Usuários cadastrados:');
    console.log(res.rows);
    process.exit(0);
  })
  .catch((err) => {
    console.log('❌ ERRO AO CONECTAR/CONSULTAR:');
    console.log(err.message);
    console.log('');
    console.log('Código do erro (err.code):', err.code);
    process.exit(1);
  });
