import api from './api.js';

/* ⭐ Endpoints reais: backend/routes/leads.js (GET/PATCH/DELETE só para admin) */
export const leadsService = {
  listar: (params = {}) => api.get('/leads', { params }).then((r) => r.data.dados),
  atualizarStatus: (id, status) => api.patch(`/leads/${id}`, { status }).then((r) => r.data.dados),
  remover: (id) => api.delete(`/leads/${id}`).then((r) => r.data.dados),
};
