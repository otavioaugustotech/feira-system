/* ═══════════════════════════════════════════════════════════
   utils/categoriasProduto.js — ⭐ NOVO
   Categorias prontas para produtos de feira, para o feirante só
   escolher na lista em vez de digitar. Ainda dá para digitar uma
   categoria diferente com a opção "Outra (digitar)".
   ═══════════════════════════════════════════════════════════ */

export const CATEGORIAS_FEIRA = [
  'Frutas',
  'Verduras',
  'Legumes',
  'Temperos e ervas',
  'Raízes e tubérculos',
  'Ovos',
  'Laticínios',
  'Queijos',
  'Carnes',
  'Aves',
  'Peixes e frutos do mar',
  'Grãos e cereais',
  'Castanhas e frutas secas',
  'Pães e bolos',
  'Doces e compotas',
  'Salgados',
  'Mel e derivados',
  'Bebidas',
  'Sucos',
  'Orgânicos',
  'Plantas e flores',
  'Artesanato',
  'Outros',
];

/* Junta as categorias prontas com as que o feirante já usa (sem repetir),
   em ordem alfabética, com "Outros" sempre no fim. */
export function opcoesCategorias(categoriasEmUso = []) {
  const todas = new Map();
  [...CATEGORIAS_FEIRA, ...categoriasEmUso]
    .filter(Boolean)
    .map((c) => c.trim())
    .filter(Boolean)
    .forEach((c) => {
      const chave = c.toLocaleLowerCase('pt-BR');
      if (!todas.has(chave)) todas.set(chave, c);
    });
  const lista = [...todas.values()].filter((c) => c !== 'Outros').sort((a, b) => a.localeCompare(b, 'pt-BR'));
  return [...lista, 'Outros'];
}
