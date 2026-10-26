/* routes/vendas.js — VERSÃO COMPLETA (substitui o original) */
const { Router }       = require('express');
const vendasController = require('../controllers/vendasController');
const autenticar       = require('../middleware/autenticar');
const validar           = require('../middleware/validar');
const { vendaSchema, cancelarVendaSchema } = require('../schemas');
const router           = Router();

router.get('/',                autenticar, vendasController.listar);
router.get('/:id',             autenticar, vendasController.buscarPorId);
router.post('/',               autenticar, validar(vendaSchema),         vendasController.criar);      /* ⭐ NOVO */
router.patch('/:id/cancelar',  autenticar, validar(cancelarVendaSchema), vendasController.cancelar);   /* ⭐ NOVO */

module.exports = router;
