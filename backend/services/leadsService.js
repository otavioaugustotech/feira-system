/* ═══════════════════════════════════════════════════════════
   services/leadsService.js — ⭐ NOVO (integração com a Landing Page)
   Guarda os contatos/pedidos de demonstração enviados pelo formulário
   público da Landing Page e, se configurado, avisa a equipe por e-mail
   e/ou repassa o lead para um CRM externo via webhook.
   ═══════════════════════════════════════════════════════════ */

const db = require('../db');
const { sendLeadNotificationEmail } = require('../utils/emailService');
const { logErro } = require('../utils/logger');

/* Mesmo e-mail reenviando o formulário dentro desta janela não gera
   uma linha nova (evita duplicados por duplo clique / reenvio). */
const JANELA_DUPLICADO_MIN = 10;

/* ══ CRIAR lead ══
   dados = { nome, email, telefone?, nome_banca?, tipo, mensagem?, origem? }
   meta  = { ip, userAgent }
   Retorna { lead, duplicado } */
const criar = async (dados, meta = {}) => {
  const { nome, email, telefone, nome_banca, tipo, mensagem, origem } = dados;

  const recente = await db.query(
    `SELECT id, nome, email, tipo, created_at FROM leads
      WHERE email = $1 AND created_at > NOW() - ($2 || ' minutes')::interval
      ORDER BY created_at DESC LIMIT 1`,
    [email, String(JANELA_DUPLICADO_MIN)]
  );
  if (recente.rows[0]) return { lead: recente.rows[0], duplicado: true };

  const resultado = await db.query(
    `INSERT INTO leads (nome, email, telefone, nome_banca, tipo, mensagem, origem, consentimento_em, ip, user_agent)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8, $9)
     RETURNING id, nome, email, tipo, created_at`,
    [
      nome,
      email,
      telefone || null,
      nome_banca || null,
      tipo,
      mensagem || null,
      origem || null,
      meta.ip || null,
      (meta.userAgent || '').slice(0, 500) || null,
    ]
  );
  const lead = resultado.rows[0];

  /* Avisos externos não podem derrubar o cadastro do lead: rodam em
     segundo plano e qualquer falha só vai para o log. */
  const completo = { ...lead, telefone, nome_banca, mensagem, origem };
  sendLeadNotificationEmail(completo).catch((err) => logErro('leads.email', err));
  enviarWebhook(completo).catch((err) => logErro('leads.webhook', err));

  return { lead, duplicado: false };
};

/* Repassa o lead para um CRM/automação (RD Station, HubSpot, n8n, Zapier,
   Make...). Só roda se LEADS_WEBHOOK_URL estiver definido no .env. */
const enviarWebhook = async (lead) => {
  const url = process.env.LEADS_WEBHOOK_URL;
  if (!url) return;

  const headers = { 'Content-Type': 'application/json' };
  if (process.env.LEADS_WEBHOOK_TOKEN) headers.Authorization = `Bearer ${process.env.LEADS_WEBHOOK_TOKEN}`;

  const resposta = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ evento: 'lead.criado', lead }),
    signal: AbortSignal.timeout(5000),
  });
  if (!resposta.ok) throw new Error(`Webhook respondeu HTTP ${resposta.status}`);
};

/* ══ ADMIN: LISTAR leads (⭐ tela "Contatos") ══
   filtros = { status?, busca?, pagina, porPagina }
   Devolve a página pedida + o total + quantos há em cada status (para
   os contadores no topo da tela). */
const STATUS = ['novo', 'em_contato', 'convertido', 'descartado'];

const listar = async ({ status, busca, pagina = 1, porPagina = 20 } = {}) => {
  const condicoes = [];
  const valores = [];

  if (status && STATUS.includes(status)) {
    valores.push(status);
    condicoes.push(`status = $${valores.length}`);
  }
  if (busca) {
    valores.push(`%${busca}%`);
    const p = `$${valores.length}`;
    condicoes.push(`(nome ILIKE ${p} OR email ILIKE ${p} OR telefone ILIKE ${p} OR nome_banca ILIKE ${p})`);
  }
  const where = condicoes.length ? `WHERE ${condicoes.join(' AND ')}` : '';

  const total = await db.query(`SELECT COUNT(*)::int AS total FROM leads ${where}`, valores);

  const limite = Math.min(Math.max(Number(porPagina) || 20, 1), 100);
  const paginaAtual = Math.max(Number(pagina) || 1, 1);
  const itens = await db.query(
    `SELECT id, nome, email, telefone, nome_banca, tipo, mensagem, origem, status, created_at
       FROM leads ${where}
      ORDER BY created_at DESC, id DESC
      LIMIT ${limite} OFFSET ${(paginaAtual - 1) * limite}`,
    valores
  );

  const porStatus = await db.query('SELECT status, COUNT(*)::int AS qtd FROM leads GROUP BY status');
  const contagem = Object.fromEntries(STATUS.map((s) => [s, 0]));
  porStatus.rows.forEach((r) => { contagem[r.status] = r.qtd; });

  return {
    itens: itens.rows,
    total: total.rows[0].total,
    pagina: paginaAtual,
    total_paginas: Math.max(1, Math.ceil(total.rows[0].total / limite)),
    contagem,
  };
};

/* ══ ADMIN: mudar o status (novo → em_contato → convertido/descartado) ══ */
const atualizarStatus = async (id, status) => {
  const res = await db.query(
    `UPDATE leads SET status = $1 WHERE id = $2
     RETURNING id, nome, email, telefone, nome_banca, tipo, mensagem, origem, status, created_at`,
    [status, id]
  );
  if (res.rows.length === 0) throw new Error('LEAD_NAO_ENCONTRADO');
  return res.rows[0];
};

/* ══ ADMIN: excluir (ex.: pedido de exclusão pela LGPD, ou spam) ══ */
const remover = async (id) => {
  const res = await db.query('DELETE FROM leads WHERE id = $1 RETURNING id', [id]);
  if (res.rows.length === 0) throw new Error('LEAD_NAO_ENCONTRADO');
  return { id: res.rows[0].id };
};

module.exports = { criar, listar, atualizarStatus, remover, STATUS };
