import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ShoppingBasket, KeyRound } from 'lucide-react';
import Input from '../../components/ui/Input.jsx';
import Button from '../../components/ui/Button.jsx';
import Alert from '../../components/ui/Alert.jsx';
import { authService } from '../../services/authService.js';
import { extrairMensagemErro } from '../../services/api.js';
import '../auth-shared/auth.css';

export default function RedefinirSenha() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const emailUrl = searchParams.get('email') || '';
  const tokenUrl = searchParams.get('token') || '';

  const [email, setEmail] = useState(emailUrl);
  const [token, setToken] = useState(tokenUrl);
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [erros, setErros] = useState({});
  const [erroGeral, setErroGeral] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [carregando, setCarregando] = useState(false);

  const validar = () => {
    const novosErros = {};
    if (!email.trim()) novosErros.email = 'Informe o e-mail da conta.';
    if (!token.trim()) novosErros.token = 'Informe o código recebido por e-mail.';
    if (!novaSenha || novaSenha.length < 6) novosErros.novaSenha = 'A nova senha deve ter ao menos 6 caracteres.';
    if (confirmar !== novaSenha) novosErros.confirmar = 'As senhas não coincidem.';
    setErros(novosErros);
    return Object.keys(novosErros).length === 0;
  };

  const aoEnviar = async (e) => {
    e.preventDefault();
    setErroGeral('');
    if (!validar()) return;

    setCarregando(true);
    try {
      const msg = await authService.redefinirSenha(email.trim(), token.trim(), novaSenha);
      setMensagem(msg || 'Senha redefinida com sucesso!');
      setTimeout(() => navigate('/login', { replace: true }), 2000);
    } catch (err) {
      setErroGeral(extrairMensagemErro(err));
    } finally {
      setCarregando(false);
    }
  };

  return (
    <main className="auth-tela">
      <div className="auth-cartao">
        <div className="auth-marca">
          <ShoppingBasket size={28} aria-hidden="true" />
          <span>Feira System</span>
        </div>
        <h1 className="auth-titulo">Redefinir senha</h1>
        <p className="auth-subtitulo">Cole o código recebido por e-mail e defina uma nova senha.</p>

        {erroGeral && <Alert tipo="erro">{erroGeral}</Alert>}
        {mensagem && <Alert tipo="sucesso">{mensagem}</Alert>}

        {!mensagem && (
          <form onSubmit={aoEnviar} noValidate>
            <Input label="E-mail" type="email" obrigatorio value={email} onChange={(e) => setEmail(e.target.value)} erro={erros.email} />
            <Input label="Código de recuperação" obrigatorio value={token} onChange={(e) => setToken(e.target.value)} erro={erros.token} dica="Enviado para seu e-mail" />
            <Input label="Nova senha" type="password" obrigatorio value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} erro={erros.novaSenha} />
            <Input label="Confirmar nova senha" type="password" obrigatorio value={confirmar} onChange={(e) => setConfirmar(e.target.value)} erro={erros.confirmar} />
            <Button type="submit" bloco carregando={carregando} icone={KeyRound}>
              Redefinir senha
            </Button>
          </form>
        )}

        <p className="auth-rodape">
          <Link to="/login">Voltar para o login</Link>
        </p>
      </div>
    </main>
  );
}
