import api from './api.js';

/* Endpoints reais: backend/routes/relatorios.js
   Observação: /relatorios/pdf retorna DADOS (JSON) para montagem do PDF
   no cliente (ver comentário em backend/services/relatoriosService.js) —
   por isso a geração do arquivo em si acontece no front (utils/pdfRelatorio.js),
   usando os dados reais vindos da API, nunca inventados. */
export const relatoriosService = {
  resumo: (params = {}) => api.get('/relatorios/resumo', { params }).then((r) => r.data.dados),
  hoje: () => api.get('/relatorios/hoje').then((r) => r.data.dados),
  graficos: (params = {}) => api.get('/relatorios/graficos', { params }).then((r) => r.data.dados),
  kpis: (params = {}) => api.get('/relatorios/kpis', { params }).then((r) => r.data.dados),
  dadosPdf: () => api.get('/relatorios/pdf').then((r) => r.data.dados),
};
