import api from './api.js';

/* Endpoints reais: backend/routes/desperdicios.js */
export const desperdiciosService = {
  listar: (params = {}) => api.get('/desperdicios', { params }).then((r) => r.data.dados),
  registrar: (dados) => api.post('/desperdicios', dados).then((r) => r.data.dados),
  remover: (id) => api.delete(`/desperdicios/${id}`).then((r) => r.data.dados),

  /* Exportação server-side real (pdfkit / docx) — não inventada */
  exportarPDF: (params = {}) =>
    api.get('/desperdicios/exportar/pdf', { params, responseType: 'blob' }).then((r) => r.data),
  exportarWord: (params = {}) =>
    api.get('/desperdicios/exportar/word', { params, responseType: 'blob' }).then((r) => r.data),
};
