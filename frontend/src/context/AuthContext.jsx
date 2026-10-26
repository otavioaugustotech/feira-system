import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { authService } from '../services/authService.js';
import { tokenStorage, usuarioStorage, registrarAoDeslogar } from '../services/api.js';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(() => usuarioStorage.obter());
  const [carregando, setCarregando] = useState(false);
  const [pronto, setPronto] = useState(true);

  const sair = useCallback(() => {
    tokenStorage.limpar();
    usuarioStorage.limpar();
    setUsuario(null);
  }, []);

  /* ⭐ Ao abrir o app já logado, busca os dados atualizados do perfil
     (ex.: a foto, que não existia quando o login foi feito). */
  useEffect(() => {
    if (!tokenStorage.obter()) return;
    authService
      .obterPerfil()
      .then((dados) => {
        usuarioStorage.salvar(dados);
        setUsuario(dados);
      })
      .catch(() => {}); /* se o token expirou, o interceptor do api.js já desloga */
  }, []);

  useEffect(() => {
    /* Se o token expirar (401 vindo de qualquer requisição), desloga automaticamente */
    registrarAoDeslogar(sair);
  }, [sair]);

  const entrar = useCallback(async (email, senha) => {
    setCarregando(true);
    try {
      const resultado = await authService.login(email, senha);
      tokenStorage.salvar(resultado.token);
      usuarioStorage.salvar(resultado.usuario);
      setUsuario(resultado.usuario);
      return resultado.usuario;
    } finally {
      setCarregando(false);
    }
  }, []);

  /* ⭐ Login/cadastro com Google — salva token e usuário igual ao login normal */
  const entrarComGoogle = useCallback(async (credential) => {
    setCarregando(true);
    try {
      const resultado = await authService.loginGoogle(credential);
      tokenStorage.salvar(resultado.token);
      usuarioStorage.salvar(resultado.usuario);
      setUsuario(resultado.usuario);
      return resultado.usuario;
    } finally {
      setCarregando(false);
    }
  }, []);

  /* ⭐ Editar perfil (nome, banca, foto) — salva o usuário e o token novos */
  const atualizarPerfil = useCallback(async (dados) => {
    const resultado = await authService.atualizarPerfil(dados);
    if (resultado.token) tokenStorage.salvar(resultado.token);
    usuarioStorage.salvar(resultado.usuario);
    setUsuario(resultado.usuario);
    return resultado.usuario;
  }, []);

  const registrar = useCallback(async (dados) => {
    setCarregando(true);
    try {
      const resultado = await authService.registrar(dados);
      tokenStorage.salvar(resultado.token);
      usuarioStorage.salvar(resultado.usuario);
      setUsuario(resultado.usuario);
      return resultado.usuario;
    } finally {
      setCarregando(false);
    }
  }, []);

  const valor = useMemo(
    () => ({
      usuario,
      autenticado: Boolean(usuario && tokenStorage.obter()),
      carregando,
      pronto,
      entrar,
      entrarComGoogle,
      atualizarPerfil,
      registrar,
      sair,
      atualizarUsuario: (dados) => {
        const atualizado = { ...usuario, ...dados };
        usuarioStorage.salvar(atualizado);
        setUsuario(atualizado);
      },
    }),
    [usuario, carregando, pronto, entrar, entrarComGoogle, atualizarPerfil, registrar, sair]
  );

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}
