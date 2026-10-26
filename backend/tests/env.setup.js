/* Roda dentro de cada worker de teste, antes dos arquivos de teste serem
   carregados — garante que app.js/db.js leiam as variáveis de .env.test
   (banco de teste) em vez do .env normal (banco de desenvolvimento). */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.test'), override: true });
