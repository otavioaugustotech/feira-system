import { Doughnut } from 'react-chartjs-2';
import { useReducedMotionEfetivo } from '../../hooks/useReducedMotion.js';
import './chartSetup.js';

/* Paleta Liquid Glass: verde, azul, roxo, laranja (destaque) e dois tons de apoio */
const PALETA = ['#10b981', '#3b82f6', '#8b5cf6', '#f97316', '#14b8a6', '#ec4899'];

export default function DonutChart({ labels, dataset, cores }) {
  const semAnimacao = useReducedMotionEfetivo();
  const dados = {
    labels,
    datasets: [
      {
        data: dataset,
        backgroundColor: cores || PALETA,
        borderWidth: 3,
        borderColor: 'rgba(255, 255, 255, 0.9)',
        borderRadius: 6,
        hoverOffset: 6,
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
