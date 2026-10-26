/* ═══════════════════════════════════════════════════════════
   utils/datas.js — ⭐ NOVO — datas no fuso do Brasil
   Antes o sistema usava new Date().toISOString(), que devolve a data
   em UTC (horário de Londres). Resultado: depois das 21h no Brasil o
   sistema já achava que era "amanhã" — o Dashboard mostrava
   "Receita de hoje R$ 0,00", "-100% vs ontem" e o gráfico com o dia
   seguinte. Agora todas as datas "de hoje" usam o fuso do .env
   (APP_TIMEZONE) ou, se não tiver, America/Sao_Paulo.
   ═══════════════════════════════════════════════════════════ */

const FUSO = process.env.APP_TIMEZONE || 'America/Sao_Paulo';

/* Data no formato AAAA-MM-DD, no fuso do Brasil.
   diasAtras = 0 → hoje; 1 → ontem; 29 → 30 dias atrás (contando hoje) */
const dataLocalISO = (diasAtras = 0) => {
  const data = new Date(Date.now() - diasAtras * 24 * 60 * 60 * 1000);
  /* 'en-CA' formata exatamente como AAAA-MM-DD */
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: FUSO, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(data);
};

module.exports = { FUSO, dataLocalISO };
