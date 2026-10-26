import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBasket, Send, ArrowLeft } from 'lucide-react';
import Input from '../../components/ui/Input.jsx';
import Button from '../../components/ui/Button.jsx';
import Alert from '../../components/ui/Alert.jsx';
import { authService } from '../../services/authService.js';
import { extrairMensagemErro } from '../../services/api.js';
import '../auth-shared/auth.css';

export default function EsqueciSenha() {
  const [email, setEmail] = useState('');
  const [erro, setErro] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [carregando, setCarregando] = useState(false);

  const aoEnviar = async (e) => {
    e.preventDefault();
    setErro('');
    setMensagem('');
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErro('Informe um e-mail válido.');
      return;
    }

    setCarregando(true);
    try {
      const msg = await authService.esqueciSenha(email.trim());
      setMensagem(msg || 'Se este e-mail estiver cadastrado, você receberá um link de recuperação em instantes.');
    } catch (err) {
      setErro(extrairMensagemErro(err));
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
        <h1 className="auth-titulo">Recuperar senha</h1>
        <p className="auth-subtitulo">Informe o e-mail da sua conta para receber o link de recuperação.</p>

        {erro && <Alert tipo="erro">{erro}</Alert>}
        {mensagem && <Alert tipo="sucesso">{mensagem}</Alert>}

        {!mensagem && (
          <form onSubmit={aoEnviar} noValidate>
            <Input
              label="E-mail"
              type="email"
              autoComplete="email"
              obrigatorio
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Button type="submit" bloco carregando={carregando} icone={Send}>
              Enviar link de recuperação
            </Button>
          </form>
        )}

        <p className="auth-rodape">
          <Link to="/login"><ArrowLeft size={14} aria-hidden="true" style={{ verticalAlign: -2 }} /> Voltar para o login</Link>
        </p>
      </div>
    </main>
  );
}
