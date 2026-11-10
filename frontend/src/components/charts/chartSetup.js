import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

/* ⭐ Liquid Glass: textos em grafite, grade bem suave e tooltip escuro */
ChartJS.defaults.font.family = "'Segoe UI', system-ui, -apple-system, Roboto, Helvetica, Arial, sans-serif";
ChartJS.defaults.color = '#4b5361';
ChartJS.defaults.borderColor = 'rgba(31, 35, 41, 0.08)';
ChartJS.defaults.plugins.tooltip.backgroundColor = 'rgba(31, 35, 41, 0.88)';
ChartJS.defaults.plugins.tooltip.cornerRadius = 10;
ChartJS.defaults.plugins.tooltip.padding = 10;

/* Gradientes para linhas, áreas e barras. Precisam da área do gráfico, que só
   existe depois do primeiro desenho; até lá devolvem a primeira cor. */
export function gradienteHorizontal(contexto, cores) {
  const { ctx, chartArea } = contexto.chart;
  if (!chartArea) return cores[0];
  const g = ctx.createLinearGradient(chartArea.left, 0, chartArea.right, 0);
  cores.forEach((c, i) => g.addColorStop(i / (cores.length - 1), c));
  return g;
}

export function gradienteVertical(contexto, cores) {
  const { ctx, chartArea } = contexto.chart;
  if (!chartArea) return cores[0];
  const g = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
  cores.forEach((c, i) => g.addColorStop(i / (cores.length - 1), c));
  return g;
}

export default ChartJS;
