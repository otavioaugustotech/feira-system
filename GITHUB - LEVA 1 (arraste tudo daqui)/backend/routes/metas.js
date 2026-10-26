/* routes/metas.js — ⭐ NOVO */
const { Router }    = require('express');
const metasController = require('../controllers/metasController');
const autenticar     = require('../middleware/autenticar');
const validar         = require('../middleware/validar');
const { metaSchema } = require('../schemas');
const router         = Router();

/* Rota estática antes de qualquer coisa com :id */
router.get('/progresso', autenticar, metasController.progresso);

router.get('/',       autenticar, metasController.listar);
router.post('/',      autenticar, validar(metaSchema), metasController.definir);
router.delete('/:id', autenticar, metasController.deletar);

module.exports = router;
