/* ═══════════════════════════════════════════════════════════
   middleware/validar.js — ⭐ NOVO
   Middleware genérico de validação com Zod.
   Instalar: npm install zod
   ═══════════════════════════════════════════════════════════ */

const { erro } = require('../utils/resposta');

/* Uso nas rotas:
   const { z } = require('zod');
   const validar = require('../middleware/validar');

   const vendaSchema = z.object({
     forma_pagamento: z.enum(['dinheiro', 'pix', 'cartao_credito', 'cartao_debito']),
     itens: z.array(z.object({
       produto_id: z.number().int().positive(),
       quantidade: z.number().positive(),
     })).min(1, 'A venda precisa de ao menos 1 item'),
   });

   router.post('/', autenticar, validar(vendaSchema), vendasController.criar);
*/
const validar = (schema) => (req, res, next) => {
  const resultado = schema.safeParse(req.body);

  if (!resultado.success) {
    const mensagens = resultado.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
    return erro(res, mensagens.join(' | '), 400);
  }

  req.body = resultado.data; /* body validado e com defaults aplicados */
  next();
};

module.exports = validar;
