import { Line } from 'react-chartjs-2';
import { useReducedMotionEfetivo } from '../../hooks/useReducedMotion.js';
import { gradienteHorizontal, gradienteVertical } from './chartSetup.js';

/* Sem cor informada, a linha usa o gradiente Liquid Glass (verde → azul → roxo). */
export default function LineChart({ labels, dataset, corLinha, rotulo = 'Valor' }) {
  const semAnimacao = useReducedMotionEfetivo();
  const dados = {
    labels,
    datasets: [
      {
        label: rotulo,
        data: dataset,
        borderColor: corLinha || ((ctx) => gradienteHorizontal(ctx, ['#10b981', '#3b82f6', '#8b5cf6'])),
        backgroundColor: corLinha
          ? `${corLinha}33`
          : (ctx) => gradienteVertical(ctx, ['rgba(59, 130, 246, 0.28)', 'rgba(139, 92, 246, 0.02)']),
        pointBackgroundColor: '#ffffff',
        pointBorderColor: corLinha || '#3b82f6',
        pointBorderWidth: 2,
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointRadius: 3,
        pointHoverRadius: 6,
      },
    ],
  };

  const opcoes = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { y: { beginAtZero: true } },
    animation: semAnimacao ? false : undefined,
  };

  return <Line data={dados} options={opcoes} height={220} aria-hidden="true" />;
}
