import { forwardRef, useId } from 'react';
import './ui.css';

const Select = forwardRef(function Select(
  { label, erro, dica, obrigatorio, id, className = '', children, ...props },
  ref
) {
  const idGerado = useId();
  const selectId = id || idGerado;
  const descreveIds = [dica ? `${selectId}-dica` : null, erro ? `${selectId}-erro` : null]
    .filter(Boolean)
    .join(' ') || undefined;

  return (
    <div className="campo">
      {label && (
        <label htmlFor={selectId}>
          {label}
          {obrigatorio && <span className="obrigatorio" aria-hidden="true"> *</span>}
        </label>
      )}
      <select
        ref={ref}
        id={selectId}
        className={`select ${erro ? 'input-erro' : ''} ${className}`}
        aria-invalid={erro ? 'true' : undefined}
        aria-describedby={descreveIds}
        aria-required={obrigatorio || undefined}
        {...props}
      >
        {children}
      </select>
      {dica && !erro && <span id={`${selectId}-dica`} className="dica">{dica}</span>}
      {erro && (
        <span id={`${selectId}-erro`} className="erro-msg" role="alert">
          {erro}
        </span>
      )}
    </div>
  );
});

export default Select;
