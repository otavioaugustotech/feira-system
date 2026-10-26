/* routes/leads.js — ⭐ NOVO (formulário "Fale conosco" da Landing Page) */
const { Router }       = require('express');
const leadsController  = require('../controllers/leadsController');
const validar          = require('../middleware/validar');
const { limitarLeads } = require('../middleware/limitarTentativas');
const { leadSchema }   = require('../schemas');
const router           = Router();

router.post('/', limitarLeads, validar(leadSchema), leadsController.criar);

module.exports = router;
