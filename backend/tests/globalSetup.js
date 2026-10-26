/* ═══════════════════════════════════════════════════════════
   tests/globalSetup.js
   Roda UMA VEZ, antes de todos os testes: apaga e recria o banco
   de teste (feira_system_test) do zero, aplicando o schema.sql —
   assim cada execução de `npm test` começa de um estado limpo e
   previsível, sem depender de dados que sobraram de execuções
   anteriores. NUNCA toca no banco de desenvolvimento/produção.
   ═══════════════════════════════════════════════════════════ */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.test') });

const { Client } = require('pg');
const fs = require('fs');

module.exports = async () => {
  const config = {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  };
  const nomeBancoTeste = process.env.DB_NAME;

  if (!nomeBancoTeste || !nomeBancoTeste.endsWith('_test')) {
    throw new Error(
      `Recusando rodar testes: DB_NAME ("${nomeBancoTeste}") não termina em "_test". ` +
      'Isso é uma proteção pra nunca apagar um banco de desenvolvimento/produção por engano.'
    );
  }

  const clientePadrao = new Client({ ...config, database: 'postgres' });
  await clientePadrao.connect();
  await clientePadrao.query(`DROP DATABASE IF EXISTS ${nomeBancoTeste} WITH (FORCE)`);
  await clientePadrao.query(`CREATE DATABASE ${nomeBancoTeste}`);
  await clientePadrao.end();

  const clienteTeste = new Client({ ...config, database: nomeBancoTeste });
  await clienteTeste.connect();
  const schema = fs.readFileSync(path.join(__dirname, '..', '..', 'database', 'schema.sql'), 'utf8');
  await clienteTeste.query(schema);
  await clienteTeste.end();
};
