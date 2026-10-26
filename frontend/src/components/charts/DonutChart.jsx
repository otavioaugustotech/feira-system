import { Doughnut } from 'react-chartjs-2';
import { useReducedMotionEfetivo } from '../../hooks/useReducedMotion.js';
import './chartSetup.js';

const PALETA = ['#16a05c', '#3b82f6', '#8b5cf6', '#f97316', '#f59e0b', '#ef4444'];

export default function DonutChart({ labels, dataset, cores }) {
  const semAnimacao = useReducedMotionEfetivo();
  const dados = {
    labels,
    datasets: [
      {
        data: dataset,
        backgroundColor: cores || PALETA,
        borderWidth: 2,
        borderColor: '#fff',
      },
    ],
  };

  const opcoes = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom' } },
    animation: semAnimacao ? false : undefined,
  };

  return <Doughnut data={dados} options={opcoes} height={220} aria-hidden="true" />;
}
