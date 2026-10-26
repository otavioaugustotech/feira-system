import { useRef, useState, useEffect } from 'react';
import { Accessibility } from 'lucide-react';
import { useAccessibility } from '../../hooks/useAccessibility.js';
import './accessibility.css';

const CANTOS = {
  'top-right': { top: 96, right: 24 },
  'bottom-right': { bottom: 24, right: 24 },
  'top-left': { top: 96, left: 24 },
  'bottom-left': { bottom: 24, left: 24 },
};

/**
 * Botão flutuante de acessibilidade — pode ser arrastado pela tela
 * (mouse, toque e teclado) e sempre permanece visível em todas as páginas.
 */
export default function AccessibilityButton({ onClick, aberto }) {
  const { panelPosition } = useAccessibility();
  const botaoRef = useRef(null);
  const [arrastando, setArrastando] = useState(false);
  const [posicaoLivre, setPosicaoLivre] = useState(null); // { x, y } em px, sobrepõe o canto padrão
  const origem = useRef({ x: 0, y: 0, top: 0, left: 0 });
  const moveu = useRef(false);

  const aoIniciarArrasto = (clienteX, clienteY) => {
    const rect = botaoRef.current.getBoundingClientRect();
    origem.current = { x: clienteX, y: clienteY, top: rect.top, left: rect.left };
    moveu.current = false;
    setArrastando(true);
  };

  const aoMoverArrasto = (clienteX, clienteY) => {
    const dx = clienteX - origem.current.x;
    const dy = clienteY - origem.current.y;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) moveu.current = true;

    const largura = window.innerWidth;
    const altura = window.innerHeight;
    const novoLeft = Math.min(Math.max(origem.current.left + dx, 8), largura - 66);
    const novoTop = Math.min(Math.max(origem.current.top + dy, 8), altura - 66);
    setPosicaoLivre({ left: novoLeft, top: novoTop });
  };

  useEffect(() => {
    if (!arrastando) return undefined;

    const aoMoverMouse = (e) => aoMoverArrasto(e.clientX, e.clientY);
    const aoSoltarMouse = () => setArrastando(false);
    const aoMoverToque = (e) => {
      const t = e.touches[0];
      if (t) aoMoverArrasto(t.clientX, t.clientY);
    };
    const aoSoltarToque = () => setArrastando(false);

    window.addEventListener('mousemove', aoMoverMouse);
    window.addEventListener('mouseup', aoSoltarMouse);
    window.addEventListener('touchmove', aoMoverToque, { passive: true });
    window.addEventListener('touchend', aoSoltarToque);

    return () => {
      window.removeEventListener('mousemove', aoMoverMouse);
      window.removeEventListener('mouseup', aoSoltarMouse);
      window.removeEventListener('touchmove', aoMoverToque);
      window.removeEventListener('touchend', aoSoltarToque);
    };
  }, [arrastando]);

  const aoClicar = () => {
    if (moveu.current) {
      moveu.current = false;
      return; // era um arrasto, não um clique
    }
    onClick();
  };

  const aoTeclar = (e) => {
    const passo = 24;
    const base = posicaoLivre || (() => {
      const rect = botaoRef.current.getBoundingClientRect();
      return { left: rect.left, top: rect.top };
    })();

    const teclasMovimento = { ArrowUp: [0, -passo], ArrowDown: [0, passo], ArrowLeft: [-passo, 0], ArrowRight: [passo, 0] };
    if (teclasMovimento[e.key]) {
      e.preventDefault();
      const [dx, dy] = teclasMovimento[e.key];
      setPosicaoLivre({
        left: Math.min(Math.max(base.left + dx, 8), window.innerWidth - 66),
        top: Math.min(Math.max(base.top + dy, 8), window.innerHeight - 66),
      });
    }
  };

  const estilo = posicaoLivre
    ? { top: posicaoLivre.top, left: posicaoLivre.left, right: 'auto', bottom: 'auto' }
    : CANTOS[panelPosition] || CANTOS['bottom-left'];

  return (
    <button
      ref={botaoRef}
      type="button"
      className="a11y-fab"
      style={estilo}
      onMouseDown={(e) => aoIniciarArrasto(e.clientX, e.clientY)}
      onTouchStart={(e) => aoIniciarArrasto(e.touches[0].clientX, e.touches[0].clientY)}
      onClick={aoClicar}
      onKeyDown={aoTeclar}
      aria-label="Abrir Central de Acessibilidade. Use as setas do teclado para mover este botão."
      aria-expanded={aberto}
      aria-haspopup="dialog"
    >
      <Accessibility size={28} aria-hidden="true" />
    </button>
  );
}
