/* routes/auth.js — VERSÃO COMPLETA */
const { Router } = require('express');
const authController = require('../controllers/authController');
const autenticar = require('../middleware/autenticar');
const validar = require('../middleware/validar');
const { limitarLogin } = require('../middleware/limitarTentativas'); /* ⭐ correção da auditoria */
const { registroSchema, loginSchema, googleSchema, perfilSchema, esqueciSenhaSchema, redefinirSenhaSchema } = require('../schemas');
const router = Router();

router.post('/registro', limitarLogin, validar(registroSchema), authController.registro);
router.post('/login',    limitarLogin, validar(loginSchema),    authController.login);
router.post('/google',   limitarLogin, validar(googleSchema),   authController.loginGoogle); /* ⭐ login com Google */

router.post('/esqueci-senha',   limitarLogin, validar(esqueciSenhaSchema),   authController.esqueciSenha);
router.post('/redefinir-senha', limitarLogin, validar(redefinirSenhaSchema), authController.redefinirSenha);

/* ⭐ Perfil (precisa estar logado) */
router.get('/perfil', autenticar, authController.obterPerfil);
router.put('/perfil', autenticar, validar(perfilSchema), authController.atualizarPerfil);

module.exports = router;
