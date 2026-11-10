import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import './ui.css';

/**
 * Modal acessível: foco preso dentro do diálogo, fecha com Escape,
 * devolve o foco ao elemento que abriu o modal, role="dialog" + aria-modal.
 */
export default function Modal({ aberto, titulo, onFechar, children, tamanho }) {
  const modalRef = useRef(null);
  const elementoAnterior = useRef(null);

  const onFecharRef = useRef(onFechar);
  useEffect(() => {
    onFecharRef.current = onFechar;
  }, [onFechar]);

  useEffect(() => {
    if (!aberto) return undefined;

    elementoAnterior.current = document.activeElement;
    const primeiroFoco = modalRef.current?.querySelector(
      'input, select, textarea, button, [href], [tabindex]:not([tabindex="-1"])'
    );
    primeiroFoco?.focus();

    const aoTeclar = (e) => {
      if (e.key === 'Escape') {
        onFecharRef.current();
        return;
      }
      if (e.key !== 'Tab' || !modalRef.current) return;

      const focaveis = modalRef.current.querySelectorAll(
        'input, select, textarea, button:not(:disabled), [href], [tabindex]:not([tabindex="-1"])'
      );
      if (focaveis.length === 0) return;
      const primeiro = focaveis[0];
      const ultimo = focaveis[focaveis.length - 1];

      if (e.shiftKey && document.activeElement === primeiro) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault();
        primeiro.focus();
      }
    };

    document.addEventListener('keydown', aoTeclar);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', aoTeclar);
      document.body.style.overflow = '';
      elementoAnterior.current?.focus?.();
    };
  }, [aberto]);

  if (!aberto) return null;

  /* ⭐ Renderiza no <body> (portal): os cartões de vidro usam backdrop-filter,
     que "prende" elementos position:fixed dentro deles. Pelo portal, a janela
     sempre cobre a tela inteira, mesmo quando é aberta de dentro de um cartão. */
  return createPortal(
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onFechar()}>
      <div
        className="modal"
        style={tamanho === 'lg' ? { maxWidth: 760 } : undefined}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-titulo"
        ref={modalRef}
      >
        <div className="modal-header">
          <h2 id="modal-titulo">{titulo}</h2>
          <button className="modal-fechar" onClick={onFechar} aria-label="Fechar">
            <X size={22} aria-hidden="true" />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
}