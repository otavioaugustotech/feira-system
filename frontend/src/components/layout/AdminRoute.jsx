import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';

/* ⭐ Telas só do administrador (ex.: Contatos). Feirante comum que digitar
   o endereço volta para o Dashboard — e a API também recusa (403). */
export default function AdminRoute({ children }) {
  const { usuario } = useAuth();
  if (!usuario?.admin) return <Navigate to="/dashboard" replace />;
  return children;
}
