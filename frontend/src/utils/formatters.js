export const formatarMoeda = (valor) => {
  const numero = Number(valor ?? 0);
  return numero.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

export const formatarNumero = (valor, casas = 0) => {
  const numero = Number(valor ?? 0);
  return numero.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });
};

export const paraNumeroBR = (texto) => {
  if (texto === '' || texto === null || texto === undefined) return '';
  const limpo = String(texto).trim().replace(/\./g, '').replace(',', '.');
  const numero = Number(limpo);
  return Number.isNaN(numero) ? '' : numero;
};

export const formatarValorBR = (valor) => {
  if (valor === null || valor === undefined || valor === '') return '';
  const numero = Number(valor);
  if (Number.isNaN(numero)) return '';
  return numero.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const formatarQuantidade = (valor) => {
  const numero = Number(valor ?? 0);
  return numero.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 3 });
};

export const formatarData = (valor) => {
  if (!valor) return '—';
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return String(valor);
  return data.toLocaleDateString('pt-BR');
};

export const formatarDataHora = (valor) => {
  if (!valor) return '—';
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return String(valor);
  return data.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
};

export const formatarPercentual = (valor) => `${Number(valor ?? 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;

export const rotuloTipoVenda = (tipo) => ({
  unidade: 'Unidade',
  kg: 'Quilo (kg)',
  maco: 'Maço',
  caixa: 'Caixa',
  pacote: 'Pacote',
}[tipo] || tipo);

export const rotuloFormaPagamento = (forma) => ({
  dinheiro: 'Dinheiro',
  pix: 'Pix',
  cartao_credito: 'Cartão de crédito',
  cartao_debito: 'Cartão de débito',
}[forma] || forma);

export const rotuloStatusVenda = (status) => ({
  concluida: 'Concluída',
  cancelada: 'Cancelada',
}[status] || status);
