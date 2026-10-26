import { ChevronLeft, ChevronRight } from 'lucide-react';
import './ui.css';

export default function Pagination({ paginaAtual, totalPaginas, onMudarPagina }) {
  if (totalPaginas <= 1) return null;

  const paginas = Array.from({ length: totalPaginas }, (_, i) => i + 1);

  return (
    <nav className="paginacao" aria-label="Paginação">
      <button
        onClick={() => onMudarPagina(paginaAtual - 1)}
        disabled={paginaAtual === 1}
        aria-label="Página anterior"
      >
        <ChevronLeft size={18} aria-hidden="true" />
      </button>
      {paginas.map((p) => (
        <button
          key={p}
          onClick={() => onMudarPagina(p)}
          aria-current={p === paginaAtual ? 'page' : undefined}
          aria-label={`Página ${p}`}
        >
          {p}
        </button>
      ))}
      <button
        onClick={() => onMudarPagina(paginaAtual + 1)}
        disabled={paginaAtual === totalPaginas}
        aria-label="Próxima página"
      >
        <ChevronRight size={18} aria-hidden="true" />
      </button>
    </nav>
  );
}
