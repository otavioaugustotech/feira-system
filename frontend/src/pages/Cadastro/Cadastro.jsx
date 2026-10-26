import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ShoppingBasket, UserPlus } from 'lucide-react';
import Input from '../../components/ui/Input.jsx';
import Button from '../../components/ui/Button.jsx';
import Alert from '../../components/ui/Alert.jsx';
import BotaoGoogle, { DivisorOu } from '../../components/auth/BotaoGoogle.jsx';
import AvisoServidorLento from '../../components/auth/AvisoServidorLento.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import { extrairMensagemErro } from '../../services/api.js';
import '../auth-shared/auth.css';

export default function Cadastro() {
  const { registrar, autenticado, carregando: autenticando } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ nome: '', email: '', nome_banca: '', senha: '', confirmarSenha: '' });
  const [erros, setErros] = useState({});
  const [erroGeral, setErroGeral] = useState('');
  const [carregando, setCarregando] = useState(false);

  const atualizar = (campo) => (e) => setForm((f) => ({ ...f, [campo]: e.target.value }));

  const validar = () => {
    const novosErros = {};
    if (!form.nome.trim()) novosErros.nome = 'Informe seu nome completo.';
    if (!form.email.trim()) novosErros.email = 'Informe seu e-mail.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) novosErros.email = 'Formato de e-mail inválido.';
    if (!form.senha) novosErros.senha = 'Crie uma senha.';
    else if (form.senha.length < 6) novosErros.senha = 'A senha deve ter ao menos 6 caracteres.';
    if (form.confirmarSenha !== form.senha) novosErros.confirmarSenha = 'As senhas não coincidem.';
    setErros(novosErros);
    return Object.keys(novosErros).length === 0;
  };

  const aoEnviar = async (e) => {
    e.preventDefault();
    setErroGeral('');
    if (!validar()) return;

    setCarregando(true);
    try {
      await registrar({
        nome: form.nome.trim(),
        email: form.email.trim(),
        senha: form.senha,
        nome_banca: form.nome_banca.trim() || undefined,
      });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setErroGeral(extrairMensagemErro(err));
    } finally {
      setCarregando(false);
    }
  };

  /* Veio da Landing Page ("Criar conta") mas já está logado: vai direto pro sistema */
  if (autenticado) return <Navigate to="/dashboard" replace />;

  return (
    <main className="auth-tela">
      <div className="auth-cartao">
        <div className="auth-marca">
          <ShoppingBasket size={28} aria-hidden="true" />
          <span>Feira System</span>
        </div>
        <h1 className="auth-titulo">Criar sua conta</h1>
        <p className="auth-subtitulo">Leva menos de um minuto para começar.</p>

        {erroGeral && <Alert tipo="erro">{erroGeral}</Alert>}
        <AvisoServidorLento ativo={autenticando} />

        <BotaoGoogle
          modo="cadastrar"
          aoEntrar={() => navigate('/dashboard', { replace: true })}
          aoErro={setErroGeral}
        />
        <DivisorOu />

        <form onSubmit={aoEnviar} noValidate>
          <Input label="Nome completo" obrigatorio autoComplete="name" value={form.nome} onChange={atualizar('nome')} erro={erros.nome} />
          <Input label="E-mail" type="email" obrigatorio autoComplete="email" value={form.email} onChange={atualizar('email')} erro={erros.email} />
          <Input label="Nome da banca" dica="Opcional — como sua banca é conhecida na feira" autoComplete="organization" value={form.nome_banca} onChange={atualizar('nome_banca')} />
          <Input label="Senha" type="password" obrigatorio autoComplete="new-password" dica="Mínimo de 6 caracteres" value={form.senha} onChange={atualizar('senha')} erro={erros.senha} />
          <Input label="Confirmar senha" type="password" obrigatorio autoComplete="new-password" value={form.confirmarSenha} onChange={atualizar('confirmarSenha')} erro={erros.confirmarSenha} />
          <Button type="submit" bloco carregando={carregando} icone={UserPlus}>
            Criar conta
          </Button>
        </form>

        <p className="auth-rodape">
          Já tem conta? <Link to="/login">Entrar</Link>
        </p>
      </div>
    </main>
  );
}
