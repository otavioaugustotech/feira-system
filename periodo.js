/* ═══════════════════════════════════════════════════════════
   utils/periodo.js — ⭐ NOVO
   Funções de período compartilhadas pelo Dashboard e pelos Relatórios.
   ═══════════════════════════════════════════════════════════ */

/* Data local (fuso do navegador) em AAAA-MM-DD. toISOString() usava UTC e,
   depois das 21h, já pulava para o dia seguinte. */
export const paraISO = (data) => {
  const d = new Date(data.getTime() - data.getTimezoneOffset() * 60000);
  return d.toISOString().split('T')[0];
};

/* Soma dias a uma data AAAA-MM-DD */
export const somarDiasISO = (iso, dias) => {
  const [a, m, d] = iso.split('-').map(Number);
  return paraISO(new Date(a, m - 1, d + dias));
};

/* Períodos prontos: hoje, últimos 7 dias, últimos 30 dias, este mês */
export const calcularPeriodo = (preset) => {
  const hoje = new Date();
  const fim = paraISO(hoje);
  if (preset === 'dia') return { inicio: fim, fim };
  if (preset === 'semana') return { inicio: somarDiasISO(fim, -6), fim };
  if (preset === 'trinta') return { inicio: somarDiasISO(fim, -29), fim };
  if (preset === 'mes') return { inicio: paraISO(new Date(hoje.getFullYear(), hoje.getMonth(), 1)), fim };
  return null;
};

/* "02/10/2026" a partir de "2026-10-02" */
export const dataBR = (iso) => (iso ? iso.split('-').reverse().join('/') : '');

/* Texto curto para usar nos títulos dos cartões */
export const rotuloPeriodo = ({ preset, inicio, fim }) => {
  if (inicio === fim && inicio === paraISO(new Date())) return 'de hoje';
  if (preset === 'semana') return 'dos últimos 7 dias';
  if (preset === 'trinta') return 'dos últimos 30 dias';
  if (preset === 'mes') return 'deste mês';
  if (inicio === fim) return `de ${dataBR(inicio)}`;
  return `de ${dataBR(inicio)} a ${dataBR(fim)}`;
};

/* Texto da comparação usada na variação percentual */
export const rotuloComparacao = ({ preset, inicio, fim }) => {
  if (inicio === fim && inicio === paraISO(new Date())) return 'vs ontem';
  if (inicio === fim) return 'vs dia anterior';
  if (preset === 'mes') return 'vs mesmo nº de dias antes';
  return 'vs período anterior';
};

/* Parâmetros de API a partir do filtro da tela (só envia o que estiver preenchido) */
export const paramsDoFiltro = (filtro) => ({
  data_inicio: filtro.inicio || undefined,
  data_fim: filtro.fim || undefined,
  produto_id: filtro.produtoId || undefined,
  categoria: filtro.categoria || undefined,
});
