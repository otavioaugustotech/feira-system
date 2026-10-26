import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, Bell, Accessibility } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth.js';
import Avatar from '../ui/Avatar.jsx';
import { produtosService } from '../../services/produtosService.js';
import './layout.css';

export default function Header({ titulo, onAbrirMenu, onAbrirAcessibilidade }) {
  const { usuario } = useAuth();
  const [alertas, setAlertas] = useState(0);
  const location = useLocation();

 useEffect(() => {
  let ativo = true;

  const buscarAlertas = () => {
    produtosService
      .estoqueBaixo()
      .then((dados) => {
        if (ativo) setAlertas(dados?.length || 0);
      })
      .catch(() => {});
  };

  buscarAlertas();
  const intervalo = setInterval(buscarAlertas, 60000);

  return () => {
    ativo = false;
    clearInterval(intervalo);
  };
}, [location.pathname]);

  return (
    <header className="app-header">
      <div className="header-esquerda">
        <button className="header-menu-btn" onClick={onAbrirMenu} aria-label="Abrir menu de navegação">
          <Menu size={22} aria-hidden="true" />
        </button>
        <h1 className="header-titulo">{titulo}</h1>
      </div>

      <div className="header-direita">
        <button
          className="header-icon-btn"
          onClick={onAbrirAcessibilidade}
          aria-label="Abrir Central de Acessibilidade"
        >
          <Accessibility size={22} aria-hidden="true" />
        </button>

        <Link
          to="/estoque"
          className="header-icon-btn"
          aria-label={alertas > 0 ? `Notificações: ${alertas} produtos com estoque baixo` : 'Notificações: nenhum alerta'}
        >
          <Bell size={22} aria-hidden="true" />
          {alertas > 0 && (
            <span
              aria-hidden="true"
              style={{
                position: 'absolute',
                top: 4,
                right: 4,
                background: 'var(--vermelho)',
                color: '#fff',
                fontSize: 10,
                fontWeight: 800,
                borderRadius: 999,
                minWidth: 16,
                height: 16,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 3px',
              }}
            >
              {alertas > 9 ? '9+' : alertas}
            </span>
          )}
        </Link>

        <Link to="/perfil" className="header-usuario">
          <Avatar className="header-avatar" nome={usuario?.nome} foto={usuario?.foto_url} tamanho={38} />
          <span className="header-usuario-info">
            <span className="header-usuario-nome">{usuario?.nome || 'Minha conta'}</span>
            <span className="header-usuario-banca">{usuario?.nome_banca || 'Ver perfil'}</span>
          </span>
        </Link>
      </div>
    </header>
  );
}
