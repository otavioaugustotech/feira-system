import { useEffect, useMemo, useState } from 'react';
import { Filter, X } from 'lucide-react';
import Button from '../ui/Button.jsx';
import Input from '../ui/Input.jsx';
import Select from '../ui/Select.jsx';
import { calcularPeriodo } from '../../utils/periodo.js';
import './filtros.css';

const PRESETS = [
  { chave: 'dia', rotulo: 'Hoje' },
  { chave: 'semana', rotulo: 'Últimos 7 dias' },
  { chave: 'trinta', rotulo: 'Últimos 30 dias' },
  { chave: 'mes', rotulo: 'Este mês' },
];

/**
 * ⭐ NOVO — barra de filtros dos indicadores (Dashboard e Relatórios).
 * Permite analisar dados históricos (período livre De/Até) e filtrar por
 * produto ou por grupo de produtos (categoria), como pedido pela banca.
 *
 * valor: { preset, inicio, fim, produtoId, categoria }
 * produtos: lista de produtos do usuário (para montar os selects)
 * onAplicar(novoValor): chamado quando o usuário aplica um filtro
 */
export default function FiltrosIndicadores({ valor, produtos = [], onAplicar, rotulo = 'Filtros dos indicadores' }) {
  const [inicio, setInicio] = useState(valor.inicio);
  const [fim, setFim] = useState(valor.fim);
  const [produtoId, setProdutoId] = useState(valor.produtoId || '');
  const [categoria, setCategoria] = useState(valor.categoria || '');
  const [erroData, setErroData] = useState('');

  /* mantém os campos em sincronia quando o filtro muda por um botão de período */
  useEffect(() => {
    setInicio(valor.inicio);
    setFim(valor.fim);
    setProdutoId(valor.produtoId || '');
    setCategoria(valor.categoria || '');
  }, [valor]);

  const categorias = useMemo(() => {
    const nomes = produtos.map((p) => (p.categoria && p.categoria.trim()) || 'Sem categoria');
    return [...new Set(nomes)].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [produtos]);

  /* com uma categoria escolhida, a lista de produtos mostra só os dela */
  const produtosVisiveis = useMemo(
    () => (categoria
      ? produtos.filter((p) => ((p.categoria && p.categoria.trim()) || 'Sem categoria') === categoria)
      : produtos),
    [produtos, categoria]
  );

  const aplicarPreset = (preset) => {
    const periodo = calcularPeriodo(preset);
    setErroData('');
    onAplicar({ ...valor, preset, inicio: periodo.inicio, fim: periodo.fim, produtoId, categoria });
  };

  const aplicar = (e) => {
    e?.preventDefault();
    if (!inicio || !fim) { setErroData('Informe as duas datas.'); return; }
    if (inicio > fim) { setErroData('A data inicial não pode ser maior que a final.'); return; }
    setErroData('');
    /* se as datas não mudaram, mantém o botão de período selecionado */
    const mesmoPeriodo = inicio === valor.inicio && fim === valor.fim;
    onAplicar({ preset: mesmoPeriodo ? valor.preset : 'personalizado', inicio, fim, produtoId, categoria });
  };

  const limpar = () => {
    setProdutoId('');
    setCategoria('');
    onAplicar({ ...valor, produtoId: '', categoria: '' });
  };

  const trocarCategoria = (nova) => {
    setCategoria(nova);
    /* se o produto escolhido não pertence à nova categoria, desmarca */
    const prod = produtos.find((p) => String(p.id) === String(produtoId));
    if (prod && nova && ((prod.categoria && prod.categoria.trim()) || 'Sem categoria') !== nova) setProdutoId('');
  };

  const temFiltroProduto = Boolean(valor.produtoId || valor.categoria);

  return (
    <section className="filtros-indicadores" aria-label={rotulo}>
      <div className="filtros-presets" role="group" aria-label="Período">
        {PRESETS.map((p) => (
          <Button
            key={p.chave}
            tamanho="sm"
            variante={valor.preset === p.chave ? 'primary' : 'secondary'}
            aria-pressed={valor.preset === p.chave}
            onClick={() => aplicarPreset(p.chave)}
          >
            {p.rotulo}
          </Button>
        ))}
      </div>

      <form className="filtros-campos" onSubmit={aplicar}>
        <Input label="De" type="date" value={inicio} max={fim || undefined} onChange={(e) => setInicio(e.target.value)} erro={erroData} />
        <Input label="Até" type="date" value={fim} min={inicio || undefined} onChange={(e) => setFim(e.target.value)} />
        <Select label="Categoria" value={categoria} onChange={(e) => trocarCategoria(e.target.value)}>
          <option value="">Todas as categorias</option>
          {categorias.map((c) => <option key={c} value={c}>{c}</option>)}
        </Select>
        <Select label="Produto" value={produtoId} onChange={(e) => setProdutoId(e.target.value)}>
          <option value="">Todos os produtos</option>
          {produtosVisiveis.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
        </Select>
        <div className="filtros-acoes">
          <Button type="submit" variante="secondary" icone={Filter}>Aplicar filtros</Button>
          {temFiltroProduto && (
            <Button type="button" variante="ghost" icone={X} onClick={limpar}>Limpar produto/categoria</Button>
          )}
        </div>
      </form>
    </section>
  );
}
