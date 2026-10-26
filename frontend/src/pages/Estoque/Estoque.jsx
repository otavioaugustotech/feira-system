import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import Card from '../../components/ui/Card.jsx';
import Table from '../../components/ui/Table.jsx';
import Loading from '../../components/ui/Loading.jsx';
import Alert from '../../components/ui/Alert.jsx';
import Badge from '../../components/ui/Badge.jsx';
import { produtosService } from '../../services/produtosService.js';
import { extrairMensagemErro } from '../../services/api.js';
import { formatarQuantidade, rotuloTipoVenda } from '../../utils/formatters.js';
import '../shared/list-page.css';

export default function Estoque() {
  const [produtos, setProdutos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erroCarregar, setErroCarregar] = useState('');
  const [busca, setBusca] = useState('');
  const [somenteBaixo, setSomenteBaixo] = useState(false);

  useEffect(() => {
    let ativo = true;
    setCarregando(true);
    produtosService
      .listar()
      .then((dados) => ativo && setProdutos(dados || []))
      .catch((err) => ativo && setErroCarregar(extrairMensagemErro(err)))
      .finally(() => ativo && setCarregando(false));
    return () => { ativo = false; };
  }, []);

  const produtosFiltrados = useMemo(() => {
    return produtos.filter((p) => {
      const combinaBusca = !busca || p.nome.toLowerCase().includes(busca.toLowerCase());
      const combinaBaixo = !somenteBaixo || p.estoque_baixo;
      return combinaBusca && combinaBaixo;
    });
  }, [produtos, busca, somenteBaixo]);

  const totalBaixo = produtos.filter((p) => p.estoque_baixo).length;

  const colunas = [
    { chave: 'nome', rotulo: 'Produto' },
    { chave: 'categoria', rotulo: 'Categoria', render: (p) => p.categoria || '—' },
    { chave: 'tipo_venda', rotulo: 'Tipo', render: (p) => rotuloTipoVenda(p.tipo_venda) },
    { chave: 'quantidade', rotulo: 'Em estoque', render: (p) => formatarQuantidade(p.quantidade), alinharDireita: true },
    { chave: 'estoque_minimo', rotulo: 'Mínimo', render: (p) => formatarQuantidade(p.estoque_minimo), alinharDireita: true },
    {
      chave: 'situacao',
      rotulo: 'Situação',
      render: (p) => p.estoque_baixo
        ? <Badge tipo="alerta" icone={AlertTriangle}>Estoque baixo</Badge>
        : <Badge tipo="sucesso" icone={CheckCircle2}>Estoque normal</Badge>,
    },
  ];

  return (
    <div>
      <div className="pagina-cabecalho">
        <div>
          <h2>Estoque</h2>
          <p>Acompanhe os níveis de estoque de todos os produtos.</p>
        </div>
      </div>

      {totalBaixo > 0 && (
        <Alert tipo="aviso" titulo={`${totalBaixo} produto${totalBaixo > 1 ? 's' : ''} com estoque baixo`}>
          Considere repor o estoque desses produtos em breve para não perder vendas.
        </Alert>
      )}

      <div className="pagina-filtros">
        <div className="campo campo-busca">
          <label htmlFor="busca-estoque">Buscar produto</label>
          <input
            id="busca-estoque"
            className="input"
            placeholder="Digite o nome do produto..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minHeight: 46, fontWeight: 600, fontSize: '0.9rem' }}>
          <input type="checkbox" checked={somenteBaixo} onChange={(e) => setSomenteBaixo(e.target.checked)} style={{ width: 20, height: 20 }} />
          Mostrar apenas estoque baixo
        </label>
      </div>

      <Card>
        {carregando ? (
          <Loading texto="Carregando estoque..." />
        ) : erroCarregar ? (
          <Alert tipo="erro">{erroCarregar}</Alert>
        ) : (
          <Table
            colunas={colunas}
            dados={produtosFiltrados}
            vazioTitulo={produtos.length === 0 ? 'Nenhum produto cadastrado ainda.' : 'Nenhum produto encontrado com esses filtros.'}
          />
        )}
      </Card>

      <p style={{ color: 'var(--texto-secundario)', fontSize: '0.85rem', marginTop: '1rem' }}>
        O estoque é atualizado automaticamente a cada venda registrada ou desperdício informado.
      </p>
    </div>
  );
}
