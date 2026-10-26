/* ═══════════════════════════════════════════════════════════
   app.js — ⭐ NOVO (extraído de server.js)
   Monta o app Express (rotas, middlewares, CORS) mas NÃO chama
   app.listen(). Isso existe pra permitir testar a API com Supertest
   sem precisar abrir uma porta de rede de verdade — os testes fazem
   requisições direto contra este objeto `app` em memória.
   quem sobe o servidor de verdade é o server.js.
   ═══════════════════════════════════════════════════════════ */

require('dotenv').config();
const express = require('express');
const cors    = require('cors');

const app = express();

/* ⭐ Atrás de Nginx / Render / Railway / Cloudflare o IP real do visitante
   chega no cabeçalho X-Forwarded-For. Sem isto o rate limit enxerga todo
   mundo com o IP do proxy. TRUST_PROXY = nº de proxies na frente (ex.: 1). */
if (process.env.TRUST_PROXY) app.set('trust proxy', Number(process.env.TRUST_PROXY) || process.env.TRUST_PROXY);

/* Lista "a,b,c" do .env → origens no formato exato que o navegador manda
   no cabeçalho Origin: minúsculas, sem barra/caminho no final
   ("https://Site.com/login/" → "https://site.com"). */
const normalizarOrigem = (url) => {
  try {
    return new URL(url.trim()).origin.toLowerCase();
  } catch {
    return url.trim().replace(/\/+$/, '').toLowerCase();
  }
};
/* ⭐ Erro de CORS mais comum: configurar só "site.com" e o visitante entrar
   por "www.site.com" (ou o contrário). Cada domínio libera também o par. */
const comVariacaoWww = (origem) => {
  const m = origem.match(/^(https?:\/\/)(www\.)?([^/:]+)(:\d+)?$/);
  if (!m || /^(localhost|[\d.]+)$/.test(m[3])) return [origem];
  const [, proto, www, host, porta = ''] = m;
  return [origem, www ? `${proto}${host}${porta}` : `${proto}www.${host}${porta}`];
};
const listaDoEnv = (valor) =>
  (valor || '').split(',').filter((o) => o.trim()).map(normalizarOrigem).flatMap(comVariacaoWww);

/* ⭐ CORREÇÃO: origin: '*' aceitava requisições de qualquer site.
   Agora usa a FRONTEND_URL (sistema) e a LANDING_URL (landing page) do .env;
   fora de produção, também libera localhost em portas comuns de
   live-server para não travar o desenvolvimento. */
const origensDev = process.env.NODE_ENV === 'production' ? [] : [
  'http://localhost:8080',
  'http://127.0.0.1:8080',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'http://localhost:5501',
  'http://127.0.0.1:5501',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];
const origensPermitidas = new Set([
  ...listaDoEnv(process.env.FRONTEND_URL),
  ...listaDoEnv(process.env.LANDING_URL),
  ...origensDev,
]);

if (process.env.NODE_ENV !== 'test') {
  console.log('🌐 CORS liberado para:', [...origensPermitidas].join(', ') || '(nenhuma origem; defina FRONTEND_URL e LANDING_URL)');
}

const origensJaAvisadas = new Set();
app.use(cors({
  origin: (origin, callback) => {
    /* requisições sem origin (ex: curl, Postman, apps mobile) são liberadas */
    if (!origin || origensPermitidas.has(origin.toLowerCase())) return callback(null, true);
    /* Avisa uma vez por origem, já dizendo o que fazer (sem inundar o log) */
    if (!origensJaAvisadas.has(origin)) {
      origensJaAvisadas.add(origin);
      console.warn(`⚠️  CORS bloqueou ${origin}. Se for o seu site, adicione-o em LANDING_URL (ou FRONTEND_URL) nas variáveis de ambiente.`);
    }
    return callback(null, false);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 600, /* navegador guarda o "preflight" por 10 min: uma ida e volta a menos por requisição */
}));
/* ⭐ limite de 1 MB: a foto de perfil vai no corpo da requisição (o padrão é só 100 KB) */
app.use(express.json({ limit: '1mb' }));

/* Importa todas as rotas */
const rotasAuth         = require('./routes/auth');
const rotasProdutos     = require('./routes/produtos');
const rotasVendas       = require('./routes/vendas');
const rotasDesperdicios = require('./routes/desperdicios');
const rotasRelatorios   = require('./routes/relatorios');
const rotasMetas        = require('./routes/metas');
const rotasLeads        = require('./routes/leads');

/* Registra as rotas */
app.use('/api/auth',         rotasAuth);
app.use('/api/produtos',     rotasProdutos);
app.use('/api/vendas',       rotasVendas);
app.use('/api/desperdicios', rotasDesperdicios);
app.use('/api/relatorios',   rotasRelatorios);
app.use('/api/metas',        rotasMetas);
app.use('/api/leads',        rotasLeads); /* ⭐ formulário público da Landing Page */

/* ⭐ Health check: usado pelo Render (healthCheckPath), pelo keep-alive e
   pelo "aquecimento" que a landing/sistema disparam ao abrir. Responde sem
   tocar no banco (rápido); ?db=1 também confere a conexão com o PostgreSQL. */
app.get('/api/health', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  if (req.query.db !== '1') return res.json({ status: 'ok' });
  try {
    await require('./db').query('SELECT 1');
    return res.json({ status: 'ok', banco: 'ok' });
  } catch (err) {
    console.error('❌ Health check: banco indisponível:', err.message);
    return res.status(503).json({ status: 'erro', banco: 'indisponivel' });
  }
});

/* Rota de teste */
app.get('/', (req, res) => {
  res.json({ mensagem: '✅ Feira System API rodando!', versao: '2.0', status: 'online' });
});

/* Middleware de erro global */
app.use((err, req, res, next) => {
  /* JSON malformado ou corpo grande demais é erro de quem enviou, não do servidor */
  if (err.type === 'entity.parse.failed') return res.status(400).json({ erro: 'JSON inválido no corpo da requisição.' });
  if (err.type === 'entity.too.large')   return res.status(413).json({ erro: 'Conteúdo enviado é grande demais.' });
  console.error('❌ Erro:', err.message);
  res.status(500).json({ erro: 'Erro interno do servidor' });
});

module.exports = app;
