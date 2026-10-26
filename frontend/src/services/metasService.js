import api from './api.js';

/* Endpoints reais: backend/routes/metas.js */
export const metasService = {
  listar: () => api.get('/metas').then((r) => r.data.dados),
  progresso: (ano, mes) => api.get('/metas/progresso', { params: { ano, mes } }).then((r) => r.data.dados),
  definir: (dados) => api.post('/metas', dados).then((r) => r.data.dados),
  remover: (id) => api.delete(`/metas/${id}`).then((r) => r.data.mensagem),
};
