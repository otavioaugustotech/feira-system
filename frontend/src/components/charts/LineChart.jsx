import { Line } from 'react-chartjs-2';
import { useReducedMotionEfetivo } from '../../hooks/useReducedMotion.js';
import './chartSetup.js';

export default function LineChart({ labels, dataset, corLinha = '#16a05c', rotulo = 'Valor' }) {
  const semAnimacao = useReducedMotionEfetivo();
  const dados = {
    labels,
    datasets: [
      {
        label: rotulo,
        data: dataset,
        borderColor: corLinha,
        backgroundColor: `${corLinha}33`,
        fill: true,
        tension: 0.35,
        pointRadius: 3,
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
