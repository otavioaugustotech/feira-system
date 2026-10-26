import './ui.css';

/**
 * Selo de status. Sempre combina cor + ícone/texto — nunca depende
 * apenas da cor para comunicar a informação (WCAG 1.4.1).
 */
export default function Badge({ tipo = 'neutro', icone: Icone, children }) {
  return (
    <span className={`badge badge-${tipo}`}>
      {Icone && <Icone size={14} aria-hidden="true" />}
      {children}
    </span>
  );
}
