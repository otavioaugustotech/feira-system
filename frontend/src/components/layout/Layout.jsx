import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import Header from './Header.jsx';
import AccessibilityButton from '../accessibility/AccessibilityButton.jsx';
import AccessibilityPanel from '../accessibility/AccessibilityPanel.jsx';
import './layout.css';

const TITULOS = {
  '/dashboard': 'Dashboard',
  '/produtos': 'Produtos',
  '/vendas': 'Vendas',
  '/estoque': 'Estoque',
  '/desperdicios': 'Desperdícios',
  '/relatorios': 'Relatórios',
  '/perfil': 'Perfil',
};

const CHAVE_RECOLHIDO = 'feira-system:menu-recolhido';

export default function Layout() {
  const [menuAberto, setMenuAberto] = useState(false);
  const [painelAberto, setPainelAberto] = useState(false);
  /* ⭐ Menu lateral recolhido (só ícones) no computador; a escolha fica salva */
  const [recolhido, setRecolhido] = useState(() => localStorage.getItem(CHAVE_RECOLHIDO) === 'true');
  const { pathname } = useLocation();

  useEffect(() => {
    localStorage.setItem(CHAVE_RECOLHIDO, String(recolhido));
  }, [recolhido]);

  const titulo = TITULOS[pathname] || 'Feira System';

  return (
    <div className={`app-layout ${recolhido ? 'menu-recolhido' : ''}`}>
      <a href="#conteudo-principal" className="skip-link">Pular para o conteúdo principal</a>

      <Sidebar
        aberta={menuAberto}
        onFechar={() => setMenuAberto(false)}
        recolhido={recolhido}
        onAlternarRecolhido={() => setRecolhido((v) => !v)}
      />

      <div className="app-conteudo">
        <Header
          titulo={titulo}
          onAbrirMenu={() => setMenuAberto(true)}
          onAbrirAcessibilidade={() => setPainelAberto(true)}
        />
        <main id="conteudo-principal" className="app-main" tabIndex={-1}>
          <Outlet />
        </main>
      </div>

      <AccessibilityButton onClick={() => setPainelAberto((v) => !v)} aberto={painelAberto} />
      <AccessibilityPanel aberto={painelAberto} onFechar={() => setPainelAberto(false)} />
    </div>
  );
}
