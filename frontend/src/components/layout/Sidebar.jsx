import { NavLink } from 'react-router-dom';
import { ShoppingBasket, LayoutDashboard, Package, ShoppingCart, Boxes, Trash2, FileBarChart, UserCircle, LogOut, Menu } from 'lucide-react';
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

/* Mesma largura usada no CSS para trocar o menu fixo pelo menu deslizante */
const ehTelaPequena = () => window.matchMedia('(max-width: 960px)').matches;

export default function Sidebar({ aberta, onFechar, recolhido, onAlternarRecolhido }) {
  const { sair } = useAuth();

  /* ⭐ Botão de 3 linhas: no computador recolhe/expande o menu (fica só com os
     ícones); no celular, onde o menu desliza por cima da tela, ele fecha o menu. */
  const aoClicarMenu = () => {
    if (ehTelaPequena()) onFechar();
    else onAlternarRecolhido();
  };

  return (
    <>
      <div className={`sidebar-overlay ${aberta ? 'visivel' : ''}`} onClick={onFechar} aria-hidden="true" />
      <nav className={`sidebar ${aberta ? 'aberta' : ''}`} aria-label="Navegação principal">
        <div className="sidebar-marca">
          <button
            type="button"
            className="sidebar-toggle"
            onClick={aoClicarMenu}
            aria-label={aberta ? 'Fechar menu' : recolhido ? 'Expandir menu' : 'Recolher menu'}
            aria-expanded={aberta || !recolhido}
            title={recolhido ? 'Expandir menu' : 'Recolher menu'}
          >
            <Menu size={22} aria-hidden="true" />
          </button>
          <span className="sidebar-marca-nome">
            <ShoppingBasket className="icone-marca" size={26} aria-hidden="true" />
            <span>Feira System</span>
          </span>
        </div>

        <div className="sidebar-nav">
          {ITENS.map(({ to, rotulo, Icone }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `sidebar-link ${isActive ? 'ativo' : ''}`}
              onClick={onFechar}
              title={recolhido ? rotulo : undefined}
            >
              {({ isActive }) => (
                <>
                  <Icone size={20} aria-hidden="true" />
                  <span className="sidebar-rotulo">{rotulo}</span>
                  {isActive && <span className="sr-only"> (página atual)</span>}
                </>
              )}
            </NavLink>
          ))}
        </div>

        <div className="sidebar-rodape">
          <button className="sidebar-sair" onClick={sair} title={recolhido ? 'Sair' : undefined}>
            <LogOut size={20} aria-hidden="true" />
            <span className="sidebar-rotulo">Sair</span>
          </button>
        </div>
      </nav>
    </>
  );
}
