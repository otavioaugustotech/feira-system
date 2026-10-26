import './ui.css';

export default function Card({ titulo, children, className = '', as: Componente = 'div', ...props }) {
  return (
    <Componente className={`card ${className}`} {...props}>
      {titulo && <h3 className="card-titulo">{titulo}</h3>}
      {children}
    </Componente>
  );
}
