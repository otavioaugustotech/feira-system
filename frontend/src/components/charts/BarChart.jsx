import { Bar } from 'react-chartjs-2';
import { useReducedMotionEfetivo } from '../../hooks/useReducedMotion.js';
import './chartSetup.js';

export default function BarChart({ labels, dataset, cor = '#3b82f6', rotulo = 'Valor' }) {
  const semAnimacao = useReducedMotionEfetivo();
  const dados = {
    labels,
    datasets: [
      {
        label: rotulo,
        data: dataset,
        backgroundColor: cor,
        borderRadius: 6,
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
