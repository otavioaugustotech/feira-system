import { Link } from 'react-router-dom';
import { CompassIcon } from 'lucide-react';

export default function NaoEncontrada() {
  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', padding: '2rem', textAlign: 'center' }}>
      <CompassIcon size={48} aria-hidden="true" style={{ color: 'var(--verde-escuro)' }} />
      <h1>Página não encontrada</h1>
      <p>O endereço acessado não existe no Feira System.</p>
      <Link to="/dashboard" className="btn btn-primary">Voltar ao Dashboard</Link>
    </main>
  );
}
