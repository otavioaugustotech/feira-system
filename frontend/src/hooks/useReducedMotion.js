import { useAccessibility } from './useAccessibility.js';

/* ⭐ NOVO — Chart.js anima o desenho dos gráficos por dentro do <canvas>,
   usando o próprio motor de animação em JavaScript dele. Nada do CSS de
   "Reduzir animações" (styles/accessibility.css) alcança isso, porque não é
   CSS — é desenho em canvas. Esse hook combina o toggle da Central de
   Acessibilidade com a preferência de "reduzir movimento" do sistema
   operacional, pra usar em options.animation dos componentes de gráfico. */
export function useReducedMotionEfetivo() {
  const { reducedMotion } = useAccessibility();
  const prefereSistema = typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  return reducedMotion || !!prefereSistema;
}
