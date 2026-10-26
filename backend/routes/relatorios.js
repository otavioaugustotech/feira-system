/* routes/relatorios.js — RECONSTRUÍDO (base original ausente do pacote)
   já com a rota GET /kpis registrada, conforme pedido no README do patch. */
const { Router } = require('express');
const relatoriosController = require('../controllers/relatoriosController');
const autenticar = require('../middleware/autenticar');
const router = Router();

router.get('/resumo',   autenticar, relatoriosController.resumo);
router.get('/hoje',     autenticar, relatoriosController.hoje);
router.get('/graficos', autenticar, relatoriosController.graficos);
router.get('/pdf',      autenticar, relatoriosController.pdf);
router.get('/kpis',     autenticar, relatoriosController.kpis); /* ⭐ do patch */

module.exports = router;
