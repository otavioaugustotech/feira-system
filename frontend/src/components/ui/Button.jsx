import { Loader2 } from 'lucide-react';
import './ui.css';

/**
 * Botão acessível e reutilizável.
 * variante: primary | secondary | danger | ghost
 */
export default function Button({
  children,
  variante = 'primary',
  tamanho,
  bloco,
  icone: Icone,
  carregando = false,
  type = 'button',
  className = '',
  ...props
}) {
  const classes = [
    'btn',
    `btn-${variante}`,
    tamanho === 'sm' ? 'btn-sm' : '',
    bloco ? 'btn-block' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <button type={type} className={classes} disabled={carregando || props.disabled} {...props}>
      {carregando ? <Loader2 size={18} className="girando" aria-hidden="true" /> : Icone ? <Icone size={18} aria-hidden="true" /> : null}
      <span>{children}</span>
    </button>
  );
}
