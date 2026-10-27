/* routes/leads.js — ⭐ NOVO (formulário "Fale conosco" da Landing Page) */
const { Router }       = require('express');
const leadsController  = require('../controllers/leadsController');
const autenticar       = require('../middleware/autenticar');
const somenteAdmin     = require('../middleware/somenteAdmin');
const validar          = require('../middleware/validar');
const { limitarLeads } = require('../middleware/limitarTentativas');
const { leadSchema, leadStatusSchema } = require('../schemas');
const router           = Router();

/* Público: a Landing Page envia o formulário */
router.post('/', limitarLeads, validar(leadSchema), leadsController.criar);

/* ⭐ Só o administrador (ADMIN_EMAILS): tela "Contatos" do sistema */
router.get('/',       autenticar, somenteAdmin, leadsController.listar);
router.patch('/:id',  autenticar, somenteAdmin, validar(leadStatusSchema), leadsController.atualizarStatus);
router.delete('/:id', autenticar, somenteAdmin, leadsController.remover);

module.exports = router;
