import { CheckCircle2, XCircle, Info, X } from 'lucide-react';
import './ui.css';

const ICONES = { sucesso: CheckCircle2, erro: XCircle, info: Info };

export default function ToastContainer({ toasts, onRemover }) {
  return (
    <div className="toast-container" aria-live="polite" aria-atomic="false">
      {toasts.map((t) => {
        const Icone = ICONES[t.tipo] || Info;
        return (
          <div key={t.id} className={`toast toast-${t.tipo}`} role={t.tipo === 'erro' ? 'alert' : 'status'}>
            <Icone size={20} aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }} />
            <span>{t.mensagem}</span>
            <button onClick={() => onRemover(t.id)} aria-label="Fechar notificação">
              <X size={16} aria-hidden="true" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
