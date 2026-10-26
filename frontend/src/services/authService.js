import api from './api.js';

/* Endpoints reais: backend/routes/auth.js */
export const authService = {
  login: (email, senha) => api.post('/auth/login', { email, senha }).then((r) => r.data.dados),
  /* ⭐ Login/cadastro com Google — manda o credential do botão do Google */
  loginGoogle: (credential) => api.post('/auth/google', { credential }).then((r) => r.data.dados),
  /* ⭐ Perfil */
  obterPerfil: () => api.get('/auth/perfil').then((r) => r.data.dados),
  atualizarPerfil: (dados) => api.put('/auth/perfil', dados).then((r) => r.data.dados),
  registrar: (dados) => api.post('/auth/registro', dados).then((r) => r.data.dados),
  esqueciSenha: (email) => api.post('/auth/esqueci-senha', { email }).then((r) => r.data.mensagem),
  redefinirSenha: (email, token, nova_senha) =>
    api.post('/auth/redefinir-senha', { email, token, nova_senha }).then((r) => r.data.mensagem),
  /* ⭐ Trocar a senha estando logado (sem e-mail) */
  alterarSenha: (senha_atual, nova_senha) =>
    api.put('/auth/senha', { senha_atual, nova_senha }).then((r) => r.data.mensagem),
};
