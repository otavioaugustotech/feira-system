/* ═══════════════════════════════════════════════════════════
   schemas/index.js — ⭐ NOVO — Schemas Zod para validação de entrada
   ═══════════════════════════════════════════════════════════ */
const { z } = require('zod');

const vendaSchema = z.object({
  forma_pagamento: z.enum(['dinheiro', 'pix', 'cartao_credito', 'cartao_debito'], {
    errorMap: () => ({ message: 'Forma de pagamento inválida' }),
  }),
  itens: z.array(
    z.object({
      produto_id: z.number().int().positive('produto_id deve ser um inteiro positivo'),
      quantidade: z.number().positive('quantidade deve ser maior que zero'),
    })
  ).min(1, 'A venda precisa ter ao menos 1 item'),
});

const cancelarVendaSchema = z.object({
  motivo: z.string().max(255).optional(),
});

const produtoSchema = z.object({
  nome: z.string().min(1, 'nome é obrigatório'),
  categoria: z.string().optional(),
  tipo_venda: z.enum(['unidade', 'kg', 'maco', 'caixa']).optional().default('unidade'),
  preco_custo: z.number().nonnegative(),
  preco_venda: z.number().nonnegative(),
  quantidade: z.number().nonnegative().optional().default(0),
  estoque_minimo: z.number().nonnegative().optional().default(5),
});

const desperdicioSchema = z.object({
  produto_id: z.number().int().positive(),
  quantidade: z.number().positive(),
  motivo: z.string().max(255).optional(),
});

const registroSchema = z.object({
  nome: z.string().min(1),
  email: z.string().email('e-mail inválido'),
  senha: z.string().min(6, 'senha deve ter ao menos 6 caracteres'),
  nome_banca: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  senha: z.string().min(1),
});

/* ⭐ Login com Google: "credential" é o token (JWT) que o botão do Google devolve */
const googleSchema = z.object({
  credential: z.string().min(20, 'credencial do Google inválida'),
});

/* ⭐ Editar perfil. A foto chega como imagem em base64 ("data:image/...")
   já reduzida no navegador (256x256), ou null para remover a foto. */
const TAMANHO_MAX_FOTO = 700 * 1024; /* ~700 KB de texto — sobra muito para 256x256 */
const perfilSchema = z.object({
  nome: z.string().trim().min(1, 'nome é obrigatório').max(150, 'nome muito longo').optional(),
  nome_banca: z.string().max(150, 'nome da banca muito longo').nullable().optional(),
  foto: z
    .string()
    .regex(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/, 'foto em formato inválido')
    .max(TAMANHO_MAX_FOTO, 'foto muito grande')
    .nullable()
    .optional(),
});

const esqueciSenhaSchema = z.object({
  email: z.string().email(),
});

const redefinirSenhaSchema = z.object({
  email: z.string().email(),
  token: z.string().min(10),
  nova_senha: z.string().min(6),
});

/* ⭐ Trocar senha estando logado. senha_atual é opcional só porque contas
   criadas pelo Google não têm senha — o service exige quando a conta tem. */
const alterarSenhaSchema = z.object({
  senha_atual: z.string().max(200).optional(),
  nova_senha: z.string().min(6, 'a nova senha deve ter ao menos 6 caracteres').max(200, 'senha muito longa'),
});

const metaSchema = z.object({
  ano: z.number().int().min(2020).max(2100),
  mes: z.number().int().min(1).max(12),
  meta_receita: z.number().nonnegative(),
  meta_lucro: z.number().nonnegative().optional(),
});

/* ⭐ Lead vindo do formulário "Fale conosco / Solicitar demonstração" da
   Landing Page. Rota PÚBLICA (sem login) — por isso tudo tem limite de
   tamanho e o telefone é normalizado para só dígitos. "site" é um campo
   escondido (honeypot): pessoa de verdade não vê nem preenche; robô sim. */
const leadSchema = z.object({
  nome: z.string().trim().min(2, 'informe seu nome').max(150, 'nome muito longo'),
  email: z.string().trim().toLowerCase().email('e-mail inválido').max(255, 'e-mail muito longo'),
  telefone: z
    .string()
    .trim()
    .transform((v) => v.replace(/\D/g, ''))
    .refine((v) => v === '' || /^\d{10,13}$/.test(v), 'telefone inválido (use DDD + número)')
    .optional(),
  nome_banca: z.string().trim().max(150, 'nome da banca muito longo').optional(),
  tipo: z.enum(['contato', 'demonstracao']).optional().default('contato'),
  mensagem: z.string().trim().max(2000, 'mensagem muito longa (máx. 2000 caracteres)').optional(),
  consentimento: z.literal(true, {
    errorMap: () => ({ message: 'é preciso autorizar o contato (LGPD)' }),
  }),
  origem: z.string().trim().max(100).optional(),
  site: z.string().max(200).optional(),
});

/* ⭐ Admin muda o andamento do contato na tela "Contatos" */
const leadStatusSchema = z.object({
  status: z.enum(['novo', 'em_contato', 'convertido', 'descartado'], {
    errorMap: () => ({ message: 'status inválido' }),
  }),
});

module.exports = {
  leadSchema,
  leadStatusSchema,
  vendaSchema,
  cancelarVendaSchema,
  produtoSchema,
  desperdicioSchema,
  registroSchema,
  loginSchema,
  googleSchema,
  perfilSchema,
  esqueciSenhaSchema,
  redefinirSenhaSchema,
  alterarSenhaSchema,
  metaSchema,
};
