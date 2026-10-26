import { forwardRef, useId, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import './ui.css';

/**
 * Campo de texto acessível: label associado, mensagens de erro com
 * aria-describedby, e suporte a "mostrar senha" quando type="password".
 */
const Input = forwardRef(function Input(
  { label, erro, dica, type = 'text', obrigatorio, id, className = '', ...props },
  ref
) {
  const idGerado = useId();
  const inputId = id || idGerado;
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const ehSenha = type === 'password';
  const tipoReal = ehSenha && mostrarSenha ? 'text' : type;

  const descreveIds = [dica ? `${inputId}-dica` : null, erro ? `${inputId}-erro` : null]
    .filter(Boolean)
    .join(' ') || undefined;

  return (
    <div className="campo">
      {label && (
        <label htmlFor={inputId}>
          {label}
          {obrigatorio && <span className="obrigatorio" aria-hidden="true"> *</span>}
        </label>
      )}
      <div className="input-wrapper">
        <input
          ref={ref}
          id={inputId}
          type={tipoReal}
          className={`input ${erro ? 'input-erro' : ''} ${className}`}
          aria-invalid={erro ? 'true' : undefined}
          aria-describedby={descreveIds}
          aria-required={obrigatorio || undefined}
          {...props}
        />
        {ehSenha && (
          <button
            type="button"
            className="input-icon-btn"
            onClick={() => setMostrarSenha((v) => !v)}
            aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
            aria-pressed={mostrarSenha}
          >
            {mostrarSenha ? <EyeOff size={20} aria-hidden="true" /> : <Eye size={20} aria-hidden="true" />}
          </button>
        )}
      </div>
      {dica && !erro && <span id={`${inputId}-dica`} className="dica">{dica}</span>}
      {erro && (
        <span id={`${inputId}-erro`} className="erro-msg" role="alert">
          {erro}
        </span>
      )}
    </div>
  );
});

export default Input;
