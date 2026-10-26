import './ui.css';

export default function Loading({ texto = 'Carregando...' }) {
  return (
    <div className="loading-wrapper" role="status" aria-live="polite">
      <div className="spinner" aria-hidden="true" />
      <span>{texto}</span>
    </div>
  );
}
