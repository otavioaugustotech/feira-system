import { useEffect, useState } from 'react';
import { FileDown, DollarSign, TrendingUp, ShoppingBag, Percent } from 'lucide-react';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Loading from '../../components/ui/Loading.jsx';
import Alert from '../../components/ui/Alert.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import ChartWithTable from '../../components/charts/ChartWithTable.jsx';
import LineChart from '../../components/charts/LineChart.jsx';
import BarChart from '../../components/charts/BarChart.jsx';
import { relatoriosService } from '../../services/relatoriosService.js';
import { useAuth } from '../../hooks/useAuth.js';
import { useToast } from '../../hooks/useToast.js';
import { extrairMensagemErro } from '../../services/api.js';
import { formatarMoeda, formatarQuantidade, formatarPercentual } from '../../utils/formatters.js';
import { gerarPdfRelatorio } from '../../utils/pdfRelatorio.js';
import './relatorios.css';

/* ⭐ Data local (fuso do navegador). toISOString() usava UTC e, depois das 21h,
   já pulava para o dia seguinte. */
const paraISO = (data) => {
  const d = new Date(data.getTime() - data.getTimezoneOffset() * 60000);
  return d.toISOString().split('T')[0];
};

const calcularPeriodo = (preset) => {
  const hoje = new Date();
  if (preset === 'dia') return { inicio: paraISO(hoje), fim: paraISO(hoje) };
  if (preset === 'semana') {
    const inicio = new Date(hoje);
    inicio.setDate(hoje.getDate() - 6);
    return { inicio: paraISO(inicio), fim: paraISO(hoje) };
  }
  if (preset === 'mes') {
    const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    return { inicio: paraISO(inicio), fim: paraISO(hoje) };
  }
  return null;
};

export default function Relatorios() {
  const { usuario } = useAuth();
  const { erro: notificarErro } = useToast();

  const [preset, setPreset] = useState('mes');
  const [dataInicio, setDataInicio] = useState(calcularPeriodo('mes').inicio);
  const [dataFim, setDataFim] = useState(calcularPeriodo('mes').fim);

  const [carregando, setCarregando] = useState(true);
  const [erroCarregar, setErroCarregar] = useState('');
  const [resumo, setResumo] = useState(null);
  const [kpis, setKpis] = useState(null);
  const [graficos, setGraficos] = useState(null);
  const [gerandoPdf, setGerandoPdf] = useState(false);

  const carregar = async (inicio, fim) => {
    setCarregando(true);
    setErroCarregar('');
    try {
      const params = { data_inicio: inicio, data_fim: fim };
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

  useEffect(() => { carregar(dataInicio, dataFim); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const aplicarPreset = (p) => {
    setPreset(p);
    const periodo = calcularPeriodo(p);
    if (periodo) {
      setDataInicio(periodo.inicio);
      setDataFim(periodo.fim);
      carregar(periodo.inicio, periodo.fim);
    }
  };

  const aplicarPersonalizado = () => {
    setPreset('personalizado');
    carregar(dataInicio, dataFim);
  };

  const exportarPdf = async () => {
    setGerandoPdf(true);
    try {
      await gerarPdfRelatorio({ usuario, periodo: { inicio: dataInicio, fim: dataFim }, resumo, kpis });
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
          <p>Analise vendas, custos, lucro e desperdícios por período.</p>
        </div>
        <Button icone={FileDown} onClick={exportarPdf} carregando={gerandoPdf} disabled={carregando || !resumo}>
          Exportar PDF
        </Button>
      </div>

      <div className="rel-periodo-botoes" role="group" aria-label="Período do relatório">
        <Button variante={preset === 'dia' ? 'primary' : 'secondary'} tamanho="sm" onClick={() => aplicarPreset('dia')}>Hoje</Button>
        <Button variante={preset === 'semana' ? 'primary' : 'secondary'} tamanho="sm" onClick={() => aplicarPreset('semana')}>Últimos 7 dias</Button>
        <Button variante={preset === 'mes' ? 'primary' : 'secondary'} tamanho="sm" onClick={() => aplicarPreset('mes')}>Este mês</Button>
      </div>

      <div className="pagina-filtros">
        <Input label="De" type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
        <Input label="Até" type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
        <Button variante="secondary" onClick={aplicarPersonalizado}>Aplicar período</Button>
      </div>

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
            </Card>
            <Card className="rel-kpi rel-kpi-lucro">
              <TrendingUp size={20} aria-hidden="true" style={{ color: 'var(--azul)' }} />
              <p>Lucro líquido</p>
              <p className="rel-kpi-valor">{formatarMoeda(resumo?.lucro_liquido)}</p>
            </Card>
            <Card className="rel-kpi rel-kpi-ticket">
              <ShoppingBag size={20} aria-hidden="true" style={{ color: 'var(--roxo)' }} />
              <p>Ticket médio</p>
              <p className="rel-kpi-valor">{formatarMoeda(kpis?.ticket_medio)}</p>
            </Card>
            <Card className="rel-kpi rel-kpi-desperdicio">
              <Percent size={20} aria-hidden="true" style={{ color: 'var(--vermelho)' }} />
              <p>Taxa de desperdício</p>
              <p className="rel-kpi-valor">{formatarPercentual(kpis?.taxa_desperdicio)}</p>
            </Card>
          </div>

          {dataInicio === dataFim ? (
  <Card style={{ marginBottom: '1.25rem' }}>
    <ChartWithTable
      titulo="Vendas por hora hoje"
      resumoTextual="Gráfico de barras com a receita de cada hora do dia selecionado."
      linhas={(graficos?.porHora || []).map((h) => ({ rotulo: h.hora, valor: h.vendas, valorFormatado: formatarMoeda(h.vendas) }))}
      colunaValor="Receita"
    >
      {(graficos?.porHora || []).some((h) => Number(h.vendas) > 0) ? (
        <BarChart labels={graficos.porHora.map((h) => h.hora)} dataset={graficos.porHora.map((h) => Number(h.vendas))} rotulo="Receita" />
      ) : <EmptyState titulo="Nenhuma venda registrada hoje ainda." />}
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
              titulo="Receita por categoria"
              resumoTextual="Gráfico de barras com a receita total por categoria de produto."
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
