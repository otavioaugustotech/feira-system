import { CheckCircle2, AlertTriangle, Info, XCircle } from 'lucide-react';
import './ui.css';

const ICONES = { sucesso: CheckCircle2, erro: XCircle, info: Info, aviso: AlertTriangle };

export default function Alert({ tipo = 'info', titulo, children }) {
  const Icone = ICONES[tipo] || Info;
  return (
    <div className={`alerta alerta-${tipo}`} role={tipo === 'erro' ? 'alert' : 'status'}>
      <Icone size={20} aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }} />
      <div>
        {titulo && <strong>{titulo}</strong>}
        <span>{children}</span>
      </div>
    </div>
  );
}
