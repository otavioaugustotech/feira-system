/* ═══════════════════════════════════════════════════════════
   services/authService.js — VERSÃO COMPLETA (substitui o original)
   Adicionado: solicitarRecuperacao() e redefinirSenha().
   O utils/emailService.js já existia no projeto mas NUNCA era chamado
   por nenhum controller/service — estava "morto". Agora está conectado.
   ═══════════════════════════════════════════════════════════ */

const db       = require('../db');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const crypto   = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const { sendPasswordResetEmail } = require('../utils/emailService');

/* ══ REGISTRAR novo usuário (mantido) ══ */
const registrar = async (nome, email, senha, nomeBanca) => {
  const emailExiste = await db.query('SELECT id FROM usuarios WHERE email = $1', [email]);
  if (emailExiste.rows.length > 0) throw new Error('EMAIL_DUPLICADO');

  const senhaHash = await bcrypt.hash(senha, 12);

  const resultado = await db.query(
    `INSERT INTO usuarios (nome, email, senha_hash, nome_banca)
     VALUES ($1, $2, $3, $4)
     RETURNING id, nome, email, nome_banca, foto_url, created_at`,
    [nome, email, senhaHash, nomeBanca]
  );

  const novoUsuario = resultado.rows[0];
  const token = gerarToken(novoUsuario);
  return { usuario: novoUsuario, token };
};

/* ══ LOGIN (mantido) ══ */
const login = async (email, senha) => {
  const resultado = await db.query(
    'SELECT id, nome, email, senha_hash, nome_banca, foto_url, created_at FROM usuarios WHERE email = $1',
    [email]
  );

  if (resultado.rows.length === 0) throw new Error('CREDENCIAIS_INVALIDAS');
  const usuario = resultado.rows[0];

  /* ⭐ Login com Google: conta criada pelo Google não tem senha.
     Sem esta checagem o bcrypt.compare(senha, null) explodiria com erro 500. */
  if (!usuario.senha_hash) throw new Error('CONTA_GOOGLE');

  const senhaCorreta = await bcrypt.compare(senha, usuario.senha_hash);
  if (!senhaCorreta) throw new Error('CREDENCIAIS_INVALIDAS');

  const token = gerarToken(usuario);
  delete usuario.senha_hash;
  return { usuario, token };
};

/* ══ LOGIN / CADASTRO COM GOOGLE (⭐ NOVO) ══
   O frontend manda o "credential" (um token assinado pelo Google).
   Aqui conferimos com o Google se ele é verdadeiro e se foi emitido
   para o NOSSO Client ID. Depois:
     1) já entrou com Google antes  → acha pelo google_id
     2) já tem conta com o e-mail   → vincula o Google a essa conta
     3) não existe                  → cria a conta (sem senha)
   No fim devolve o mesmo { usuario, token } do login normal. */
let clienteGoogle = null;
const obterClienteGoogle = () => {
  if (!process.env.GOOGLE_CLIENT_ID) throw new Error('GOOGLE_NAO_CONFIGURADO');
  if (!clienteGoogle) clienteGoogle = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  return clienteGoogle;
};

const loginGoogle = async (credential) => {
  const cliente = obterClienteGoogle();

  let dados;
  try {
    const ticket = await cliente.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    dados = ticket.getPayload();
  } catch (err) {
    console.error('Token do Google recusado:', err.message);
    /* ⭐ Causa nº 1 em produção: o Client ID do frontend é diferente do backend */
    if (/audience|recipient/i.test(err.message)) {
      console.error('   → GOOGLE_CLIENT_ID (backend) precisa ser IGUAL ao VITE_GOOGLE_CLIENT_ID usado no build do frontend.');
    }
    throw new Error('GOOGLE_TOKEN_INVALIDO');
  }

  if (!dados || !dados.email || !dados.email_verified) throw new Error('GOOGLE_EMAIL_NAO_VERIFICADO');

  const googleId = dados.sub;
  const email    = dados.email.toLowerCase();
  const nome     = (dados.name || email.split('@')[0]).slice(0, 150);
  const campos   = 'id, nome, email, nome_banca, foto_url, created_at';

  /* 1) já entrou com Google antes */
  let resultado = await db.query(`SELECT ${campos} FROM usuarios WHERE google_id = $1`, [googleId]);

  /* 2) já tem conta com esse e-mail (cadastro normal) → vincula */
  if (resultado.rows.length === 0) {
    resultado = await db.query(
      `UPDATE usuarios SET google_id = $1
       WHERE LOWER(email) = $2 AND google_id IS NULL
       RETURNING ${campos}`,
      [googleId, email]
    );
  }

  /* 3) conta nova */
  let novo = false;
  if (resultado.rows.length === 0) {
    resultado = await db.query(
      `INSERT INTO usuarios (nome, email, google_id)
       VALUES ($1, $2, $3)
       RETURNING ${campos}`,
      [nome, email, googleId]
    );
    novo = true;
  }

  let usuario = resultado.rows[0];

  /* ⭐ Foto de perfil: se a pessoa ainda não tem foto, usa a da conta Google */
  if (!usuario.foto_url && dados.picture) {
    const comFoto = await db.query(
      `UPDATE usuarios SET foto_url = $1 WHERE id = $2 RETURNING ${campos}`,
      [dados.picture, usuario.id]
    );
    usuario = comFoto.rows[0];
  }

  return { usuario, token: gerarToken(usuario), novo };
};

const gerarToken = (usuario) => {
  return jwt.sign(
    { id: usuario.id, email: usuario.email, nome: usuario.nome },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

/* ══ SOLICITAR RECUPERAÇÃO DE SENHA (⭐ NOVO) ══
   Por segurança, SEMPRE retorna sucesso mesmo se o e-mail não existir
   (evita que alguém descubra quais e-mails estão cadastrados). */
const solicitarRecuperacao = async (email) => {
  const usuarioRes = await db.query('SELECT id, nome FROM usuarios WHERE email = $1', [email]);

  if (usuarioRes.rows.length === 0) {
    return; /* silenciosamente não faz nada — resposta genérica no controller */
  }

  const usuario = usuarioRes.rows[0];

  /* Gera um token aleatório e seguro. Armazenamos apenas o HASH dele no
     banco (igual senha) — assim, mesmo que o banco vaze, o token bruto
     que está no e-mail do usuário não pode ser reconstruído. */
  const tokenBruto = crypto.randomBytes(32).toString('hex');
  const tokenHash  = crypto.createHash('sha256').update(tokenBruto).digest('hex');
  const expiresAt  = new Date(Date.now() + 60 * 60 * 1000); /* 1 hora */

  await db.query(
    `INSERT INTO password_reset_tokens (usuario_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [usuario.id, tokenHash, expiresAt]
  );

  /* IMPORTANTE: NÃO usar await aqui.
     Descoberto em teste real: se as credenciais SMTP forem inválidas ou o
     servidor de e-mail demorar para responder, a requisição HTTP inteira
     fica pendurada esperando — e o cliente (frontend) trava numa tela de
     loading por vários segundos ou até dá timeout.
     O envio de e-mail é "fire-and-forget": disparamos e seguimos em frente;
     qualquer falha é só registrada no log do servidor, nunca repassada
     ao usuário (a resposta da API já foi decidida ser sempre genérica). */
  sendPasswordResetEmail(email, tokenBruto).catch((err) => {
    console.error('Falha ao enviar e-mail de recuperação (não bloqueia a resposta da API):', err.message);
  });
};

/* ══ REDEFINIR SENHA (⭐ NOVO) ══ */
const redefinirSenha = async (email, tokenBruto, novaSenha) => {
  const usuarioRes = await db.query('SELECT id FROM usuarios WHERE email = $1', [email]);
  if (usuarioRes.rows.length === 0) throw new Error('TOKEN_INVALIDO');
  const usuarioId = usuarioRes.rows[0].id;

  const tokenHash = crypto.createHash('sha256').update(tokenBruto).digest('hex');

  const tokenRes = await db.query(
    `SELECT id FROM password_reset_tokens
     WHERE usuario_id = $1 AND token_hash = $2
       AND used_at IS NULL AND expires_at > NOW()
     ORDER BY created_at DESC LIMIT 1`,
    [usuarioId, tokenHash]
  );

  if (tokenRes.rows.length === 0) throw new Error('TOKEN_INVALIDO');

  const senhaHash = await bcrypt.hash(novaSenha, 12);

  const client = await db.connect();
  try {
    await client.query('BEGIN');
    await client.query('UPDATE usuarios SET senha_hash = $1 WHERE id = $2', [senhaHash, usuarioId]);
    await client.query('UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1', [tokenRes.rows[0].id]);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

/* ══ PERFIL (⭐ NOVO) ══ */
const CAMPOS_PERFIL = 'id, nome, email, nome_banca, foto_url, created_at';

const obterPerfil = async (usuarioId) => {
  const res = await db.query(`SELECT ${CAMPOS_PERFIL} FROM usuarios WHERE id = $1`, [usuarioId]);
  if (res.rows.length === 0) throw new Error('USUARIO_NAO_ENCONTRADO');
  return res.rows[0];
};

/* Atualiza nome, nome da banca e/ou foto.
   foto: undefined = não mexe | null = remove | string = nova foto */
const atualizarPerfil = async (usuarioId, { nome, nome_banca, foto }) => {
  const campos = [];
  const valores = [];

  if (nome !== undefined)       { valores.push(nome.trim());                 campos.push(`nome = $${valores.length}`); }
  if (nome_banca !== undefined) { valores.push(nome_banca?.trim() || null);  campos.push(`nome_banca = $${valores.length}`); }
  if (foto !== undefined)       { valores.push(foto);                        campos.push(`foto_url = $${valores.length}`); }

  if (campos.length === 0) return { usuario: await obterPerfil(usuarioId) };

  valores.push(usuarioId);
  const res = await db.query(
    `UPDATE usuarios SET ${campos.join(', ')} WHERE id = $${valores.length} RETURNING ${CAMPOS_PERFIL}`,
    valores
  );
  if (res.rows.length === 0) throw new Error('USUARIO_NAO_ENCONTRADO');

  const usuario = res.rows[0];
  /* O token guarda o nome — geramos um novo para ele ficar atualizado */
  return { usuario, token: gerarToken(usuario) };
};

module.exports = {
  registrar, login, loginGoogle, solicitarRecuperacao, redefinirSenha,
  obterPerfil, atualizarPerfil,
};
