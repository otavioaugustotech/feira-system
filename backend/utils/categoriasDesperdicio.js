/* ═══════════════════════════════════════════════════════════
   utils/categoriasDesperdicio.js — ⭐ NOVO (pedido da banca)
   O motivo do desperdício passou a ter DUAS partes:
     • categoria_motivo → valor padronizado desta lista (permite agrupar
       e comparar as perdas: quanto se perde por vencimento, por
       transporte etc.);
     • motivo           → descrição livre, opcional, para detalhar.
   A mesma lista é usada pela validação (schemas), pelo banco (CHECK)
   e pelas exportações em PDF/Word.
   ═══════════════════════════════════════════════════════════ */

const CATEGORIAS_DESPERDICIO = {
  vencimento: 'Vencimento/estrago',
  transporte: 'Dano no transporte',
  manuseio: 'Dano no manuseio',
  armazenamento: 'Armazenamento inadequado',
  outros: 'Outros',
};

const CHAVES_CATEGORIAS = Object.keys(CATEGORIAS_DESPERDICIO);

const rotuloCategoria = (chave) => CATEGORIAS_DESPERDICIO[chave] || CATEGORIAS_DESPERDICIO.outros;

module.exports = { CATEGORIAS_DESPERDICIO, CHAVES_CATEGORIAS, rotuloCategoria };
