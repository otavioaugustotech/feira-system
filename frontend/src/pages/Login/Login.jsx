import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ShoppingBasket, LogIn } from 'lucide-react';
import Input from '../../components/ui/Input.jsx';
import Button from '../../components/ui/Button.jsx';
import Alert from '../../components/ui/Alert.jsx';
import BotaoGoogle, { DivisorOu } from '../../components/auth/BotaoGoogle.jsx';
import AvisoServidorLento from '../../components/auth/AvisoServidorLento.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import { extrairMensagemErro } from '../../services/api.js';
import '../auth-shared/auth.css';

export default function Login() {
  const { entrar, autenticado, carregando: autenticando } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erros, setErros] = useState({});
  const [erroGeral, setErroGeral] = useState('');
  const [carregando, setCarregando] = useState(false);

  const validar = () => {
    const novosErros = {};
    if (!email.trim()) novosErros.email = 'Informe seu e-mail.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) novosErros.email = 'Formato de e-mail inválido.';
    if (!senha) novosErros.senha = 'Informe sua senha.';
    setErros(novosErros);
    return Object.keys(novosErros).length === 0;
  };

  const irParaDestino = () => {
    const destino = location.state?.de && location.state.de !== '/login' ? location.state.de : '/dashboard';
    navigate(destino, { replace: true });
  };

  const aoEnviar = async (e) => {
    e.preventDefault();
    setErroGeral('');
    if (!validar()) return;

    setCarregando(true);
    try {
      await entrar(email.trim(), senha);
      irParaDestino();
    } catch (err) {
      setErroGeral(extrairMensagemErro(err));
    } finally {
      setCarregando(false);
    }
  };

  /* Veio da Landing Page ("Entrar") mas já está logado: vai direto pro sistema */
  if (autenticado) {
    const destino = location.state?.de && location.state.de !== '/login' ? location.state.de : '/dashboard';
    return <Navigate to={destino} replace />;
  }

  return (
    <main className="auth-tela">
      <div className="auth-cartao">
        <div className="auth-marca">
          <ShoppingBasket size={28} aria-hidden="true" />
          <span>Feira System</span>
        </div>
        <h1 className="auth-titulo">Entrar na sua conta</h1>
        <p className="auth-subtitulo">Gerencie sua banca de forma simples e rápida.</p>

        {erroGeral && <Alert tipo="erro">{erroGeral}</Alert>}
        <AvisoServidorLento ativo={autenticando} />

        <BotaoGoogle
          modo="entrar"
          aoEntrar={irParaDestino}
          aoErro={setErroGeral}
        />
        <DivisorOu />

        <form onSubmit={aoEnviar} noValidate>
          <Input
            label="E-mail"
            type="email"
            autoComplete="email"
            obrigatorio
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            erro={erros.email}
          />
          <Input
            label="Senha"
            type="password"
            autoComplete="current-password"
            obrigatorio
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            erro={erros.senha}
          />
          <div className="auth-esqueci">
            <Link to="/esqueci-senha">Esqueci minha senha</Link>
          </div>
          <Button type="submit" bloco carregando={carregando} icone={LogIn}>
            Entrar
          </Button>
        </form>

        <p className="auth-rodape">
          Ainda não tem conta? <Link to="/cadastro">Criar conta</Link>
        </p>
      </div>
    </main>
  );
}
