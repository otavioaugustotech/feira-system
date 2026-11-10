import { useEffect, useState } from 'react';
import { FileDown, DollarSign, TrendingUp, ShoppingBag, Percent } from 'lucide-react';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Loading from '../../components/ui/Loading.jsx';
import Alert from '../../components/ui/Alert.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import ChartWithTable from '../../components/charts/ChartWithTable.jsx';
import LineChart from '../../components/charts/LineChart.jsx';
import BarChart from '../../components/charts/BarChart.jsx';
import FiltrosIndicadores from '../../components/filtros/FiltrosIndicadores.jsx';
import ComoCalculado from '../../components/filtros/ComoCalculado.jsx';
import { relatoriosService } from '../../services/relatoriosService.js';
import { produtosService } from '../../services/produtosService.js';
import { useAuth } from '../../hooks/useAuth.js';
import { useToast } from '../../hooks/useToast.js';
import { extrairMensagemErro } from '../../services/api.js';
import { formatarMoeda, formatarQuantidade, formatarPercentual } from '../../utils/formatters.js';
import { calcularPeriodo, paramsDoFiltro, dataBR } from '../../utils/periodo.js';
import { gerarPdfRelatorio } from '../../utils/pdfRelatorio.js';
import './relatorios.css';

const filtroInicial = () => ({ preset: 'mes', ...calcularPeriodo('mes'), produtoId: '', categoria: '' });

/* Texto do filtro de produto/categoria (para a tela e para o PDF) */
const descreverFiltro = (filtro, produtos) => {
  const partes = [];
  if (filtro.categoria) partes.push(`categoria "${filtro.categoria}"`);
  if (filtro.produtoId) {
    const p = produtos.find((x) => String(x.id) === String(filtro.produtoId));
    partes.push(`produto "${p?.nome || filtro.produtoId}"`);
  }
  return partes.join(' e ');
};

export default function Relatorios() {
  const { usuario } = useAuth();
  const { erro: notificarErro } = useToast();

  const [filtro, setFiltro] = useState(filtroInicial);
  const [produtos, setProdutos] = useState([]);

  const [carregando, setCarregando] = useState(true);
  const [erroCarregar, setErroCarregar] = useState('');
  const [resumo, setResumo] = useState(null);
  const [kpis, setKpis] = useState(null);
  const [graficos, setGraficos] = useState(null);
  const [gerandoPdf, setGerandoPdf] = useState(false);

  const carregar = async (f) => {
    setCarregando(true);
    setErroCarregar('');
    try {
      const params = paramsDoFiltro(f);
      const [r, k, g] = await Promise.all([
        relatoriosService.resumo(params),
        relatoriosService.kpis(params),
        relatoriosService.graficos(params),
      ]);
      setResumo(r);
      setKpis(k);
      setGraficos(g);
    } catch (err) {
      setErroCarregar(extrairMensagemErro(err));
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregar(filtro);
    produtosService.listar().then((p) => setProdutos(p || [])).catch(() => setProdutos([]));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const aplicarFiltro = (novo) => {
    setFiltro(novo);
    carregar(novo);
  };

  const textoFiltro = descreverFiltro(filtro, produtos);

  const exportarPdf = async () => {
    setGerandoPdf(true);
    try {
      await gerarPdfRelatorio({
        usuario,
        periodo: { inicio: filtro.inicio, fim: filtro.fim },
        resumo,
        kpis,
        filtroTexto: textoFiltro,
      });
    } catch (err) {
      notificarErro('Não foi possível gerar o PDF: ' + err.message);
    } finally {
      setGerandoPdf(false);
    }
  };

  return (
    <div>
      <div className="pagina-cabecalho">
        <div>
          <h2>Relatórios</h2>
          <p>Analise vendas, custos, lucro e desperdícios por período, produto ou categoria.</p>
        </div>
        <Button icone={FileDown} onClick={exportarPdf} carregando={gerandoPdf} disabled={carregando || !resumo}>
          Exportar PDF
        </Button>
      </div>

      <FiltrosIndicadores valor={filtro} produtos={produtos} onAplicar={aplicarFiltro} rotulo="Filtros do relatório" />

      <p className="filtros-resumo" aria-live="polite">
        Mostrando de <strong>{dataBR(filtro.inicio)}</strong> a <strong>{dataBR(filtro.fim)}</strong>
        {textoFiltro ? <> — somente {textoFiltro}</> : ' — todos os produtos'}.
      </p>

      {carregando ? (
        <Loading texto="Carregando relatório..." />
      ) : erroCarregar ? (
        <Alert tipo="erro">{erroCarregar}</Alert>
      ) : (
        <>
          <div className="rel-kpis">
            <Card className="rel-kpi rel-kpi-receita">
              <DollarSign size={20} aria-hidden="true" style={{ color: 'var(--verde-escuro)' }} />
              <p>Receita total</p>
              <p className="rel-kpi-valor">{formatarMoeda(resumo?.receita_total)}</p>
              <ComoCalculado
                formula="soma de (preço unitário × quantidade) dos itens das vendas concluídas no período."
                representa="o faturamento bruto do período."
                paraQue="acompanhar o movimento e comparar períodos."
              />
            </Card>
            <Card className="rel-kpi rel-kpi-lucro">
              <TrendingUp size={20} aria-hidden="true" style={{ color: 'var(--azul-escuro)' }} />
              <p>Lucro líquido</p>
              <p className="rel-kpi-valor">{formatarMoeda(resumo?.lucro_liquido)}</p>
              <ComoCalculado
                formula={`lucro bruto (${formatarMoeda(resumo?.lucro_bruto)}) − desperdícios (${formatarMoeda(resumo?.total_desperdicios)}). Lucro bruto = soma de (preço de venda − custo) × quantidade; desperdício = custo × quantidade perdida.`}
                representa="o que realmente sobrou, já descontadas as perdas."
                paraQue="saber se a banca (ou o produto) está dando resultado."
              />
            </Card>
            <Card className="rel-kpi rel-kpi-ticket">
              <ShoppingBag size={20} aria-hidden="true" style={{ color: 'var(--roxo-escuro)' }} />
              <p>Ticket médio</p>
              <p className="rel-kpi-valor">{formatarMoeda(kpis?.ticket_medio)}</p>
              <ComoCalculado
                formula={`receita total ÷ nº de vendas concluídas (${kpis?.total_vendas ?? 0} vendas).`}
                representa="quanto cada cliente gasta, em média, por compra."
                paraQue="avaliar combos e promoções para aumentar o valor de cada venda."
              />
            </Card>
            <Card className="rel-kpi rel-kpi-desperdicio">
              <Percent size={20} aria-hidden="true" style={{ color: 'var(--laranja-escuro)' }} />
              <p>Taxa de desperdício</p>
              <p className="rel-kpi-valor">{formatarPercentual(kpis?.taxa_desperdicio)}</p>
              <ComoCalculado
                formula="desperdícios ÷ (receita total + desperdícios) × 100."
                representa="a parte do valor movimentado que foi perdida; quanto menor, melhor."
                paraQue="identificar perdas e agir para reduzi-las (compra, armazenamento, transporte)."
              />
            </Card>
          </div>

          {filtro.inicio === filtro.fim ? (
            <Card style={{ marginBottom: '1.25rem' }}>
              <ChartWithTable
                titulo={`Vendas por hora em ${dataBR(filtro.fim)}`}
                resumoTextual="Gráfico de barras com a receita de cada hora do dia selecionado."
                linhas={(graficos?.porHora || []).map((h) => ({ rotulo: h.hora, valor: h.vendas, valorFormatado: formatarMoeda(h.vendas) }))}
                colunaValor="Receita"
              >
                {(graficos?.porHora || []).some((h) => Number(h.vendas) > 0) ? (
                  <BarChart labels={graficos.porHora.map((h) => h.hora)} dataset={graficos.porHora.map((h) => Number(h.vendas))} rotulo="Receita" />
                ) : <EmptyState titulo="Nenhuma venda registrada neste dia." />}
              </ChartWithTable>
            </Card>
          ) : (
            <Card style={{ marginBottom: '1.25rem' }}>
              <ChartWithTable
                titulo="Evolução de vendas no período"
                resumoTextual="Gráfico de linha com a receita diária do período selecionado."
                linhas={(graficos?.evolucao || []).map((d) => ({ rotulo: d.dia, valor: d.vendas, valorFormatado: formatarMoeda(d.vendas) }))}
                colunaValor="Receita"
              >
                {(graficos?.evolucao || []).length > 0 ? (
                  <LineChart labels={graficos.evolucao.map((d) => d.dia)} dataset={graficos.evolucao.map((d) => Number(d.vendas))} rotulo="Receita" />
                ) : <EmptyState titulo="Sem dados no período." />}
              </ChartWithTable>
            </Card>
          )}

          <Card style={{ marginBottom: '1.25rem' }}>
            <ChartWithTable
              titulo="Receita por categoria no período"
              resumoTextual="Gráfico de barras com a receita total por categoria de produto no período selecionado."
              linhas={(graficos?.categorias || []).map((c) => ({ rotulo: c.categoria, valor: c.receita, valorFormatado: formatarMoeda(c.receita) }))}
              colunaValor="Receita"
            >
              {(graficos?.categorias || []).length > 0 ? (
                <BarChart labels={graficos.categorias.map((c) => c.categoria)} dataset={graficos.categorias.map((c) => Number(c.receita))} rotulo="Receita" />
              ) : <EmptyState titulo="Sem dados de categoria no período." />}
            </ChartWithTable>
          </Card>

          <Card>
            <h3 className="card-titulo">Produtos mais vendidos no período</h3>
            {(resumo?.top_produtos || []).length === 0 ? (
              <EmptyState titulo="Nenhuma venda no período selecionado." />
            ) : (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {resumo.top_produtos.map((p) => (
                  <li key={p.nome} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--borda)' }}>
                    <span><strong>{p.nome}</strong> — {formatarQuantidade(p.total_vendido)} vendido(s)</span>
                    <span style={{ fontWeight: 700 }}>{formatarMoeda(p.receita)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <p style={{ color: 'var(--texto-secundario)', fontSize: '0.85rem', marginTop: '1rem' }}>
            Para um relatório de desperdícios em PDF ou Word gerado diretamente pelo servidor, use a exportação disponível na página Desperdícios.
          </p>
        </>
      )}
    </div>
  );
}
