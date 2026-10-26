import { Inbox } from 'lucide-react';
import './ui.css';

export default function EmptyState({ icone: Icone = Inbox, titulo = 'Nenhum registro encontrado.', descricao, acao }) {
  return (
    <div className="empty-state">
      <Icone size={40} aria-hidden="true" />
      <p style={{ margin: 0, fontWeight: 700, color: 'var(--texto)' }}>{titulo}</p>
      {descricao && <p style={{ margin: 0 }}>{descricao}</p>}
      {acao}
    </div>
  );
}
