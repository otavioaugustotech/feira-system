/* routes/desperdicios.js — VERSÃO COMPLETA (substitui o original) */
const { Router }   = require('express');
const desperdiciosController = require('../controllers/desperdiciosController');
const autenticar   = require('../middleware/autenticar');
const validar       = require('../middleware/validar');
const { desperdicioSchema } = require('../schemas');
const router       = Router();

/* Rotas estáticas ANTES de rotas com parâmetro, quando aplicável */
router.get('/exportar/pdf',  autenticar, desperdiciosController.exportarPDF);   /* ⭐ NOVO */
router.get('/exportar/word', autenticar, desperdiciosController.exportarWord);  /* ⭐ NOVO */

router.get('/',  autenticar, desperdiciosController.listar);
router.post('/', autenticar, validar(desperdicioSchema), desperdiciosController.registrar);
router.delete('/:id', autenticar, desperdiciosController.deletar); /* ⭐ NOVO */

module.exports = router;
