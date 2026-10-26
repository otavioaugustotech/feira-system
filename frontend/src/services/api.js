import axios from 'axios';

/* ═══════════════════════════════════════════════════════════
   api.js — instância central do Axios.
   Endpoints, formatos de payload e respostas seguem EXATAMENTE
   o backend existente (ver backend/routes e backend/utils/resposta.js):
     Sucesso: { sucesso: true, mensagem, dados }
     Erro:    { erro: mensagem }
   Nenhum endpoint é inventado aqui — apenas consumidos.
   ═══════════════════════════════════════════════════════════ */

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const api = axios.create({ baseURL });

/* ⭐ Aquecimento: um GET leve ao abrir o app para a API (Render, plano
   gratuito) já ir acordando enquanto a pessoa digita e-mail e senha.
   Usa fetch direto (sem token, sem interceptors); falhas são ignoradas. */
export function aquecerApi() {
  fetch(`${baseURL.replace(/\/+$/, '')}/health`, { cache: 'no-store', credentials: 'omit' }).catch(() => {});
}

const TOKEN_KEY = 'feira-system:token';
const USUARIO_KEY = 'feira-system:usuario';

export const tokenStorage = {
  obter: () => window.localStorage.getItem(TOKEN_KEY),
  salvar: (token) => window.localStorage.setItem(TOKEN_KEY, token),
  limpar: () => window.localStorage.removeItem(TOKEN_KEY),
};

export const usuarioStorage = {
  obter: () => {
    const bruto = window.localStorage.getItem(USUARIO_KEY);
    try {
      return bruto ? JSON.parse(bruto) : null;
    } catch {
      return null;
    }
  },
  salvar: (usuario) => window.localStorage.setItem(USUARIO_KEY, JSON.stringify(usuario)),
  limpar: () => window.localStorage.removeItem(USUARIO_KEY),
};

api.interceptors.request.use((config) => {
  const token = tokenStorage.obter();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/* Extrai uma mensagem de erro legível independente do formato retornado */
export function extrairMensagemErro(err) {
  if (err?.response?.data?.erro) return err.response.data.erro;
  if (err?.message === 'Network Error') {
    return 'Não foi possível conectar ao servidor. Verifique sua internet ou tente novamente em instantes.';
  }
  return err?.message || 'Ocorreu um erro inesperado.';
}

let aoDeslogar = null;
export function registrarAoDeslogar(callback) {
  aoDeslogar = callback;
}

api.interceptors.response.use(
  (resposta) => resposta,
  (err) => {
    if (err?.response?.status === 401 && aoDeslogar) {
      aoDeslogar();
    }
    return Promise.reject(err);
  }
);

export default api;
