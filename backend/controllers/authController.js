/* controllers/authController.js — VERSÃO COMPLETA */

const authService = require('../services/authService');
const { sucesso, erro } = require('../utils/resposta');

/* POST /api/auth/registro (mantido) */
const registro = async (req, res) => {
  try {
    const { nome, email, senha, nome_banca } = req.body;

    if (!nome || !email || !senha) {
      return erro(res, 'Nome, email e senha são obrigatórios.', 400);
    }
    const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!emailValido) return erro(res, 'Formato de e-mail inválido.', 400);
    if (senha.length < 6) return erro(res, 'A senha deve ter pelo menos 6 caracteres.', 400);

    const resultado = await authService.registrar(nome, email, senha, nome_banca);
    return sucesso(res, resultado, 'Conta criada com sucesso!', 201);

  } catch (err) {
    if (err.message === 'EMAIL_DUPLICADO') return erro(res, 'Este e-mail já está cadastrado.', 409);
    console.error(err);
    return erro(res, 'Erro ao criar conta.', 500);
  }
};

/* POST /api/auth/login (mantido) */
const login = async (req, res) => {
  try {
    const { email, senha } = req.body;
    if (!email || !senha) return erro(res, 'E-mail e senha são obrigatórios.', 400);

    const resultado = await authService.login(email, senha);
    return sucesso(res, resultado, 'Login realizado com sucesso.');

  } catch (err) {
    if (err.message === 'CREDENCIAIS_INVALIDAS') return erro(res, 'E-mail ou senha incorretos.', 401);
    if (err.message === 'CONTA_GOOGLE') {
      return erro(res, 'Esta conta foi criada com o Google. Use o botão "Entrar com o Google" ou crie uma senha em "Esqueci minha senha".', 401);
    }
    console.error(err);
    return erro(res, 'Erro ao fazer login.', 500);
  }
};

/* POST /api/auth/google — ⭐ NOVO (login e cadastro com Google) */
const loginGoogle = async (req, res) => {
  try {
    const { credential } = req.body;
    const resultado = await authService.loginGoogle(credential);
    const mensagem = resultado.novo ? 'Conta criada com o Google!' : 'Login realizado com sucesso.';
    return sucesso(res, { usuario: resultado.usuario, token: resultado.token }, mensagem, resultado.novo ? 201 : 200);

  } catch (err) {
    if (err.message === 'GOOGLE_TOKEN_INVALIDO') return erro(res, 'Não foi possível confirmar sua conta Google. Tente novamente.', 401);
    if (err.message === 'GOOGLE_EMAIL_NAO_VERIFICADO') return erro(res, 'O e-mail dessa conta Google não está verificado.', 401);
    if (err.message === 'GOOGLE_NAO_CONFIGURADO') {
      console.error('GOOGLE_CLIENT_ID não definido no backend/.env');
      return erro(res, 'Login com Google não está configurado no servidor.', 500);
    }
    console.error('Erro no login com Google:', err);
    return erro(res, 'Erro ao entrar com o Google.', 500);
  }
};

/* POST /api/auth/esqueci-senha — */
const esqueciSenha = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return erro(res, 'E-mail é obrigatório.', 400);

    await authService.solicitarRecuperacao(email);

    /* Resposta SEMPRE genérica — não revela se o e-mail existe ou não */
    return sucesso(res, null, 'Se este e-mail estiver cadastrado, você receberá um link de recuperação em instantes.');

  } catch (err) {
    console.error('Erro ao solicitar recuperação de senha:', err);
    /* Mesmo em erro de envio de e-mail, não expomos detalhes ao cliente */
    return sucesso(res, null, 'Se este e-mail estiver cadastrado, você receberá um link de recuperação em instantes.');
  }
};

/* POST /api/auth/redefinir-senha — ⭐ NOVO */
const redefinirSenha = async (req, res) => {
  try {
    const { email, token, nova_senha } = req.body;

    if (!email || !token || !nova_senha) {
      return erro(res, 'E-mail, token e nova senha são obrigatórios.', 400);
    }
    if (nova_senha.length < 6) {
      return erro(res, 'A nova senha deve ter pelo menos 6 caracteres.', 400);
    }

    await authService.redefinirSenha(email, token, nova_senha);
    return sucesso(res, null, 'Senha redefinida com sucesso! Faça login com sua nova senha.');

  } catch (err) {
    if (err.message === 'TOKEN_INVALIDO') {
      return erro(res, 'Link de recuperação inválido ou expirado. Solicite um novo.', 400);
    }
    console.error('Erro ao redefinir senha:', err);
    return erro(res, 'Erro ao redefinir senha.', 500);
  }
};

/* PUT /api/auth/senha — ⭐ NOVO (trocar a senha estando logado, sem e-mail) */
const alterarSenha = async (req, res) => {
  try {
    const { senha_atual, nova_senha } = req.body;
    await authService.alterarSenha(req.usuario.id, senha_atual, nova_senha);
    return sucesso(res, null, 'Senha alterada com sucesso!');
  } catch (err) {
    if (err.message === 'SENHA_ATUAL_INCORRETA') return erro(res, 'A senha atual está incorreta.', 400);
    if (err.message === 'USUARIO_NAO_ENCONTRADO') return erro(res, 'Usuário não encontrado.', 404);
    console.error('Erro ao alterar senha:', err);
    return erro(res, 'Erro ao alterar senha.', 500);
  }
};

/* GET /api/auth/perfil — ⭐ NOVO */
const obterPerfil = async (req, res) => {
  try {
    const usuario = await authService.obterPerfil(req.usuario.id);
    return sucesso(res, usuario);
  } catch (err) {
    if (err.message === 'USUARIO_NAO_ENCONTRADO') return erro(res, 'Usuário não encontrado.', 404);
    console.error('Erro ao buscar perfil:', err);
    return erro(res, 'Erro ao buscar perfil.', 500);
  }
};

/* PUT /api/auth/perfil — ⭐ NOVO (editar nome, banca e foto) */
const atualizarPerfil = async (req, res) => {
  try {
    const resultado = await authService.atualizarPerfil(req.usuario.id, req.body);
    return sucesso(res, resultado, 'Perfil atualizado com sucesso!');
  } catch (err) {
    if (err.message === 'USUARIO_NAO_ENCONTRADO') return erro(res, 'Usuário não encontrado.', 404);
    console.error('Erro ao atualizar perfil:', err);
    return erro(res, 'Erro ao atualizar perfil.', 500);
  }
};

module.exports = { registro, login, loginGoogle, esqueciSenha, redefinirSenha, alterarSenha, obterPerfil, atualizarPerfil };
