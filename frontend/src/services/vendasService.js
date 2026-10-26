import api from './api.js';

/* Endpoints reais: backend/routes/vendas.js */
export const vendasService = {
  listar: (params = {}) => api.get('/vendas', { params }).then((r) => r.data.dados),
  buscarPorId: (id) => api.get(`/vendas/${id}`).then((r) => r.data.dados),
  criar: (dados) => api.post('/vendas', dados).then((r) => r.data.dados),
  cancelar: (id, motivo) => api.patch(`/vendas/${id}/cancelar`, { motivo }).then((r) => r.data.dados),
};
