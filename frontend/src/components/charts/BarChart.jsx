import { Bar } from 'react-chartjs-2';
import { useReducedMotionEfetivo } from '../../hooks/useReducedMotion.js';
import { gradienteVertical } from './chartSetup.js';

/* Sem cor informada, as barras usam um gradiente azul → roxo (Liquid Glass). */
export default function BarChart({ labels, dataset, cor, rotulo = 'Valor' }) {
  const semAnimacao = useReducedMotionEfetivo();
  const dados = {
    labels,
    datasets: [
      {
        label: rotulo,
        data: dataset,
        backgroundColor: cor || ((ctx) => gradienteVertical(ctx, ['#3b82f6', '#8b5cf6'])),
        borderRadius: 10,
        borderSkipped: false,
        maxBarThickness: 40,
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

  return <Bar data={dados} options={opcoes} height={220} aria-hidden="true" />;
}
