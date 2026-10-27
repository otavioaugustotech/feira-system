import { NavLink } from 'react-router-dom';
import { ShoppingBasket, LayoutDashboard, Package, ShoppingCart, Boxes, Trash2, FileBarChart, UserCircle, LogOut, Inbox } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth.js';
import './layout.css';

const ITENS = [
  { to: '/dashboard', rotulo: 'Dashboard', Icone: LayoutDashboard },
  { to: '/produtos', rotulo: 'Produtos', Icone: Package },
  { to: '/vendas', rotulo: 'Vendas', Icone: ShoppingCart },
  { to: '/estoque', rotulo: 'Estoque', Icone: Boxes },
  { to: '/desperdicios', rotulo: 'Desperdícios', Icone: Trash2 },
  { to: '/relatorios', rotulo: 'Relatórios', Icone: FileBarChart },
  { to: '/perfil', rotulo: 'Perfil', Icone: UserCircle },
];

/* ⭐ Só aparece para o administrador (ADMIN_EMAILS no backend) */
const ITENS_ADMIN = [
  { to: '/contatos', rotulo: 'Contatos', Icone: Inbox },
];

export default function Sidebar({ aberta, onFechar }) {
  const { sair, usuario } = useAuth();
  const itens = usuario?.admin ? [...ITENS, ...ITENS_ADMIN] : ITENS;

  return (
    <>
      <div className={`sidebar-overlay ${aberta ? 'visivel' : ''}`} onClick={onFechar} aria-hidden="true" />
      <nav className={`sidebar ${aberta ? 'aberta' : ''}`} aria-label="Navegação principal">
        <div className="sidebar-marca">
          <ShoppingBasket className="icone-marca" size={26} aria-hidden="true" />
          <span>Feira System</span>
        </div>

        <div className="sidebar-nav">
          {itens.map(({ to, rotulo, Icone }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `sidebar-link ${isActive ? 'ativo' : ''}`}
              onClick={onFechar}
            >
              {({ isActive }) => (
                <>
                  <Icone size={20} aria-hidden="true" />
                  <span>{rotulo}</span>
                  {isActive && <span className="sr-only"> (página atual)</span>}
                </>
              )}
            </NavLink>
          ))}
        </div>

        <div className="sidebar-rodape">
          <button className="sidebar-sair" onClick={sair}>
            <LogOut size={20} aria-hidden="true" />
            <span>Sair</span>
          </button>
        </div>
      </nav>
    </>
  );
}
