/* routes/produtos.js — VERSÃO COMPLETA (substitui o original) */
const { Router }    = require('express');
const produtosController = require('../controllers/produtosController');
const autenticar    = require('../middleware/autenticar');
const validar        = require('../middleware/validar');
const { produtoSchema } = require('../schemas');
const router        = Router();

/* ⚠️ A rota estática precisa vir ANTES de '/:id', senão o Express
   interpreta "estoque-baixo" como um :id */
router.get('/estoque-baixo', autenticar, produtosController.listarEstoqueBaixo); /* ⭐ NOVO */

router.get('/',       autenticar, produtosController.listar);
router.get('/:id',    autenticar, produtosController.buscarPorId);
router.post('/',      autenticar, validar(produtoSchema),          produtosController.criar);
router.put('/:id',    autenticar, validar(produtoSchema.partial()), produtosController.atualizar);
router.delete('/:id', autenticar, produtosController.deletar);

module.exports = router;
