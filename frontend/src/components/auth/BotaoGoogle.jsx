/* ═══════════════════════════════════════════════════════════
   components/auth/BotaoGoogle.jsx — ⭐ NOVO — Login/Cadastro com Google
   Usa o botão OFICIAL do Google (@react-oauth/google). Quando a pessoa
   escolhe a conta, o Google devolve um "credential" (token assinado),
   que mandamos para o backend em POST /api/auth/google. O backend
   confere com o Google, cria/acha o usuário e devolve o nosso token.
   Se o VITE_GOOGLE_CLIENT_ID não estiver no .env, o botão não aparece.
   ═══════════════════════════════════════════════════════════ */
import { useEffect, useRef, useState } from 'react';
import { GoogleLogin, useGoogleOAuth } from '@react-oauth/google';
import { useAuth } from '../../hooks/useAuth.js';
import { useAccessibility } from '../../hooks/useAccessibility.js';
import { extrairMensagemErro } from '../../services/api.js';

export const googleConfigurado = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID);

/* Tempo para o script do Google carregar e desenhar o botão antes de
   concluirmos que ele foi bloqueado (bloqueador de anúncios, rede, CSP). */
const ESPERA_BOTAO_MS = 8000;

/* Dica para quem está configurando: o erro mais comum é esquecer de
   autorizar o domínio no Google Cloud. O Google só avisa no console. */
const avisarConfiguracao = () => {
  console.warn(
    `[Login com Google] Botão não carregou. Confira:\n` +
    `  1) Google Cloud → Google Auth Platform → Clientes → "Origens JavaScript autorizadas" contém ${window.location.origin}\n` +
    `  2) VITE_GOOGLE_CLIENT_ID (frontend) é igual ao GOOGLE_CLIENT_ID (backend)\n` +
    `  3) Bloqueador de anúncios/extensão não está barrando accounts.google.com`
  );
};

/* modo: "entrar" (tela de login) ou "cadastrar" (tela de cadastro) */
export default function BotaoGoogle({ modo = 'entrar', aoEntrar, aoErro }) {
  const { entrarComGoogle } = useAuth();
  const { darkMode } = useAccessibility();
  const caixaRef = useRef(null);
  const [largura, setLargura] = useState(320);
  const [indisponivel, setIndisponivel] = useState(false);
  /* Hook condicional é seguro aqui: googleConfigurado é fixo no build, e sem
     Client ID o GoogleOAuthProvider (main.jsx) nem existe para ser consultado. */
  const google = googleConfigurado ? useGoogleOAuth() : null;

  /* ⭐ Se o botão não aparecer em alguns segundos, mostra um aviso em vez
     de deixar um buraco vazio na tela. */
  useEffect(() => {
    if (!googleConfigurado) return undefined;
    const timer = window.setTimeout(() => {
      const desenhou = caixaRef.current?.querySelector('iframe, div[role="button"]');
      if (!google?.scriptLoadedSuccessfully || !desenhou) {
        setIndisponivel(true);
        avisarConfiguracao();
      }
    }, ESPERA_BOTAO_MS);
    return () => window.clearTimeout(timer);
  }, [google?.scriptLoadedSuccessfully]);

  /* O botão do Google só aceita largura em pixels (máx. 400),
     então medimos o espaço disponível no cartão. */
  useEffect(() => {
    const medir = () => {
      const w = caixaRef.current?.offsetWidth || 320;
      setLargura(Math.max(200, Math.min(400, Math.floor(w))));
    };
    medir();
    window.addEventListener('resize', medir);
    return () => window.removeEventListener('resize', medir);
  }, []);

  if (!googleConfigurado) return null;

  const aoSucesso = async (resposta) => {
    try {
      const usuario = await entrarComGoogle(resposta.credential);
      aoEntrar?.(usuario);
    } catch (err) {
      aoErro?.(extrairMensagemErro(err));
    }
  };

  if (indisponivel) {
    return (
      <p className="auth-google-aviso" role="note">
        O login com Google não carregou nesta página (pode ser um bloqueador de anúncios ou a conexão).
        Use seu e-mail e senha abaixo, ou recarregue a página.
      </p>
    );
  }

  return (
    <div className="auth-google" ref={caixaRef}>
      <GoogleLogin
        key={`${darkMode}-${largura}`}
        onSuccess={aoSucesso}
        onError={() => {
          avisarConfiguracao();
          aoErro?.('Não foi possível entrar com o Google. Tente novamente ou use e-mail e senha.');
        }}
        text={modo === 'cadastrar' ? 'signup_with' : 'signin_with'}
        theme={darkMode ? 'filled_black' : 'outline'}
        shape="pill"
        size="large"
        width={String(largura)}
        locale="pt-BR"
      />
    </div>
  );
}

/* Separador "ou" entre o botão do Google e o formulário */
export function DivisorOu() {
  if (!googleConfigurado) return null;
  return (
    <div className="auth-divisor" role="separator">
      <span>ou</span>
    </div>
  );
}
