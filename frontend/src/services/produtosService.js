import api from './api.js';

/* Endpoints reais: backend/routes/produtos.js */
export const produtosService = {
  listar: (params = {}) => api.get('/produtos', { params }).then((r) => r.data.dados),
  buscarPorId: (id) => api.get(`/produtos/${id}`).then((r) => r.data.dados),
  criar: (dados) => api.post('/produtos', dados).then((r) => r.data.dados),
  atualizar: (id, dados) => api.put(`/produtos/${id}`, dados).then((r) => r.data.dados),
  remover: (id) => api.delete(`/produtos/${id}`).then((r) => r.data.mensagem),
  estoqueBaixo: () => api.get('/produtos/estoque-baixo').then((r) => r.data.dados),
};
