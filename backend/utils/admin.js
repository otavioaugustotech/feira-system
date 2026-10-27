/* ═══════════════════════════════════════════════════════════
   utils/admin.js — ⭐ NOVO — quem é administrador do Feira System
   Administrador = dono do sistema (vê os contatos da Landing Page).
   Não é um feirante comum. A lista vem do .env, separada por vírgula:
     ADMIN_EMAILS=dono@gmail.com,socio@gmail.com
   Sem banco/migração: basta mudar a variável e reiniciar a API.
   ═══════════════════════════════════════════════════════════ */

const emailsAdmin = () =>
  (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

const ehAdmin = (email) => Boolean(email) && emailsAdmin().includes(String(email).trim().toLowerCase());

/* Acrescenta { admin: true/false } ao usuário devolvido para o frontend
   (o menu "Contatos" só aparece para admin). */
const comPapel = (usuario) => (usuario ? { ...usuario, admin: ehAdmin(usuario.email) } : usuario);

module.exports = { ehAdmin, comPapel };
