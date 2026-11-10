/* ⭐ NOVO — categorias padronizadas do motivo do desperdício.
   Mesma lista do back-end (backend/utils/categoriasDesperdicio.js). */
export const CATEGORIAS_DESPERDICIO = [
  { valor: 'vencimento', rotulo: 'Vencimento/estrago' },
  { valor: 'transporte', rotulo: 'Dano no transporte' },
  { valor: 'manuseio', rotulo: 'Dano no manuseio' },
  { valor: 'armazenamento', rotulo: 'Armazenamento inadequado' },
  { valor: 'outros', rotulo: 'Outros' },
];

export const rotuloCategoriaDesperdicio = (valor) =>
  (CATEGORIAS_DESPERDICIO.find((c) => c.valor === valor) || CATEGORIAS_DESPERDICIO[4]).rotulo;
