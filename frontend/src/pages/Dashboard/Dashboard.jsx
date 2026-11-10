import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  DollarSign, TrendingUp, ShoppingCart, Trash2, ArrowUpRight, ArrowDownRight,
  AlertTriangle, Target, Award, Plus,
} from 'lucide-react';
import Card from '../../components/ui/Card.jsx';
import Loading from '../../components/ui/Loading.jsx';
import Alert from '../../components/ui/Alert.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import Modal from '../../components/ui/Modal.jsx';
import ConfirmModal from '../../components/ui/ConfirmModal.jsx';
import Input from '../../components/ui/Input.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import ChartWithTable from '../../components/charts/ChartWithTable.jsx';
import LineChart from '../../components/charts/LineChart.jsx';
import DonutChart from '../../components/charts/DonutChart.jsx';
import FiltrosIndicadores from '../../components/filtros/FiltrosIndicadores.jsx';
import ComoCalculado from '../../components/filtros/ComoCalculado.jsx';
import { relatoriosService } from '../../services/relatoriosService.js';
import { metasService } from '../../services/metasService.js';
import { produtosService } from '../../services/produtosService.js';
import { useAuth } from '../../hooks/useAuth.js';
import { useToast } from '../../hooks/useToast.js';
import { extrairMensagemErro } from '../../services/api.js';
import { formatarMoeda, formatarQuantidade, formatarPercentual, paraNumeroBR, formatarValorBR, rotuloFormaPagamento } from '../../utils/formatters.js';
import { calcularPeriodo, paramsDoFiltro, rotuloPeriodo, rotuloComparacao, somarDiasISO, dataBR } from '../../utils/periodo.js';
import './dashboard.css';

const hoje = new Date();

/* ⭐ Filtro padrão: o dia de hoje, com todos os produtos (mesmo resumo de antes) */
const filtroInicial = () => ({ preset: 'dia', ...calcularPeriodo('dia'), produtoId: '', categoria: '' });

/* Para o gráfico de evolução: um período de 1 dia vira "os 7 dias até esse dia" */
const periodoDoGrafico = (f) => (f.inicio === f.fim
  ? { inicio: somarDiasISO(f.fim, -6), fim: f.fim }
  : { inicio: f.inicio, fim: f.fim });

export default function Dashboard() {
  const { usuario } = useAuth();
  const { erro: notificarErro, sucesso } = useToast();

  const [carregando, setCarregando] = useState(true);
  const [erroCarregar, setErroCarregar] = useState('');
  const [dadosHoje, setDadosHoje] = useState(null);
  const [graficos, setGraficos] = useState(null);
  const [resumo, setResumo] = useState(null);
  const [metaProgresso, setMetaProgresso] = useState(null);
  const [estoqueBaixo, setEstoqueBaixo] = useState([]);

  /* ⭐ filtros de período / produto / categoria (pedido da banca) */
  const [filtro, setFiltro] = useState(filtroInicial);
  const [produtos, setProdutos] = useState([]);
  const [atualizando, setAtualizando] = useState(false);

  const [modalMetaAberto, setModalMetaAberto] = useState(false);
  const [metaReceita, setMetaReceita] = useState('');
  const [metaLucro, setMetaLucro] = useState('');
  const [salvandoMeta, setSalvandoMeta] = useState(false);

  const [modalExcluirMetaAberto, setModalExcluirMetaAberto] = useState(false);
  const [excluindoMeta, setExcluindoMeta] = useState(false);

  /* Indicadores que dependem do filtro (cartões, gráficos, mais vendidos) */
  const buscarIndicadores = async (f) => {
    const params = paramsDoFiltro(f);
    const periodoGrafico = periodoDoGrafico(f);
    const [h, g, r] = await Promise.all([
      relatoriosService.hoje(params),
      relatoriosService.graficos({ ...params, data_inicio: periodoGrafico.inicio, data_fim: periodoGrafico.fim }),
      relatoriosService.resumo(params),
    ]);
    setDadosHoje(h);
    setGraficos(g);
    setResumo(r);
  };

  const carregarTudo = async () => {
    setCarregando(true);
    setErroCarregar('');
    try {
      const [, m, eb, prods] = await Promise.all([
        buscarIndicadores(filtro),
        metasService.progresso(hoje.getFullYear(), hoje.getMonth() + 1),
        produtosService.estoqueBaixo(),
        produtosService.listar(),
      ]);
      setMetaProgresso(m);
      setEstoqueBaixo(eb || []);
      setProdutos(prods || []);
    } catch (err) {
      setErroCarregar(extrairMensagemErro(err));
    } finally {
      setCarregando(false);
    }
  };

  const aplicarFiltro = async (novo) => {
    setFiltro(novo);
    setAtualizando(true);
    try {
      await buscarIndicadores(novo);
    } catch (err) {
      notificarErro(extrairMensagemErro(err));
    } finally {
      setAtualizando(false);
    }
  };

  useEffect(() => {
    carregarTudo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const abrirModalMeta = () => {
    setMetaReceita(formatarValorBR(metaProgresso?.meta?.meta_receita));
    setMetaLucro(formatarValorBR(metaProgresso?.meta?.meta_lucro));
    setModalMetaAberto(true);
  };

  const salvarMeta = async (e) => {
    e.preventDefault();
    const receita = paraNumeroBR(metaReceita);
    const lucro = metaLucro !== '' ? paraNumeroBR(metaLucro) : undefined;
    if (receita === '' || receita < 0) return;
    setSalvandoMeta(true);
    try {
      await metasService.definir({
        ano: hoje.getFullYear(),
        mes: hoje.getMonth() + 1,
        meta_receita: receita,
        meta_lucro: lucro,
      });
      sucesso('Meta salva com sucesso!');
      setModalMetaAberto(false);
      const m = await metasService.progresso(hoje.getFullYear(), hoje.getMonth() + 1);
      setMetaProgresso(m);
    } catch (err) {
      notificarErro(extrairMensagemErro(err));
    } finally {
      setSalvandoMeta(false);
    }
  };

  const confirmarExcluirMeta = async () => {
    if (!metaProgresso?.meta?.id) return;
    setExcluindoMeta(true);
    try {
      await metasService.remover(metaProgresso.meta.id);
      sucesso('Meta removida com sucesso.');
      setModalExcluirMetaAberto(false);
      const m = await metasService.progresso(hoje.getFullYear(), hoje.getMonth() + 1);
      setMetaProgresso(m);
    } catch (err) {
      notificarErro(extrairMensagemErro(err));
    } finally {
      setExcluindoMeta(false);
    }
  };

  if (carregando) return <Loading texto="Carregando seu dashboard..." />;
  if (erroCarregar) return <Alert tipo="erro" titulo="Não foi possível carregar o dashboard">{erroCarregar}</Alert>;

  const variacao = Number(dadosHoje?.variacao ?? dadosHoje?.variacao_hoje ?? 0);
  const variacaoPositiva = variacao >= 0;
  const periodoTexto = rotuloPeriodo(filtro);
  const periodoGrafico = periodoDoGrafico(filtro);
  const tituloGrafico = filtro.inicio === filtro.fim
    ? `Vendas dos 7 dias até ${dataBR(filtro.fim)}`
    : `Vendas por dia (${dataBR(periodoGrafico.inicio)} a ${dataBR(periodoGrafico.fim)})`;
  const filtroProdutoTexto = [
    filtro.categoria && `categoria "${filtro.categoria}"`,
    filtro.produtoId && `produto "${produtos.find((p) => String(p.id) === String(filtro.produtoId))?.nome || ''}"`,
  ].filter(Boolean).join(' e ');

  return (
    <div className="dashboard-pagina">
      <div className="dash-saudacao">
        <h2>Olá, {usuario?.nome?.split(' ')[0] || 'feirante'}! 👋</h2>
        <p>Aqui está o resumo do seu negócio hoje, {hoje.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}.</p>
      </div>

      {/* ═══ ⭐ Filtros: período (dados históricos), categoria e produto ═══ */}
      <FiltrosIndicadores valor={filtro} produtos={produtos} onAplicar={aplicarFiltro} rotulo="Filtros do dashboard" />
      <p className="filtros-resumo" aria-live="polite">
        {atualizando ? 'Atualizando indicadores...' : (
          <>Indicadores {periodoTexto}{filtroProdutoTexto ? <> — somente {filtroProdutoTexto}</> : ' — todos os produtos'}. A meta do mês e o estoque baixo não dependem do filtro.</>
        )}
      </p>

      {/* ═══ KPIs do período ═══ */}
      <section className="dash-kpis" aria-label={`Indicadores ${periodoTexto}`} aria-busy={atualizando}>
        <Card className="dash-kpi-card dash-kpi-receita">
          <span className="dash-kpi-icone" style={{ background: 'var(--verde-claro)', color: 'var(--verde-escuro)' }}>
            <DollarSign size={22} aria-hidden="true" />
          </span>
          <div className="dash-kpi-texto">
            <p>Receita {periodoTexto}</p>
            <p className="dash-kpi-valor">{formatarMoeda(dadosHoje?.receita)}</p>
            <span className="dash-kpi-variacao" style={{ color: variacaoPositiva ? 'var(--verde-escuro)' : 'var(--vermelho)' }}>
              {variacaoPositiva ? <ArrowUpRight size={15} aria-hidden="true" /> : <ArrowDownRight size={15} aria-hidden="true" />}
              {Math.abs(variacao)}% {rotuloComparacao(filtro)}
            </span>
            <ComoCalculado
              formula={`soma de (preço unitário × quantidade) dos itens das vendas concluídas. Variação = (receita atual − receita anterior) ÷ receita anterior × 100; período anterior: ${dataBR(dadosHoje?.periodo_anterior?.inicio)} a ${dataBR(dadosHoje?.periodo_anterior?.fim)} (${formatarMoeda(dadosHoje?.receita_anterior)}).`}
              representa="quanto dinheiro entrou com as vendas."
              paraQue="perceber se o movimento está subindo ou caindo."
            />
          </div>
        </Card>

        <Card className="dash-kpi-card dash-kpi-lucro">
          <span className="dash-kpi-icone" style={{ background: 'var(--azul-claro)', color: 'var(--azul-escuro)' }}>
            <TrendingUp size={22} aria-hidden="true" />
          </span>
          <div className="dash-kpi-texto">
            <p>Lucro {periodoTexto}</p>
            <p className="dash-kpi-valor">{formatarMoeda(dadosHoje?.lucro)}</p>
            <span className="dash-kpi-variacao" style={{ color: 'var(--texto-secundario)' }}>{dadosHoje?.total_vendas || 0} venda{Number(dadosHoje?.total_vendas) === 1 ? '' : 's'}</span>
            <ComoCalculado
              formula="soma de (preço de venda − preço de custo) × quantidade de cada item vendido, com os preços gravados no momento da venda."
              representa="o ganho sobre a mercadoria, sem contar as perdas."
              paraQue="saber se a venda está realmente dando retorno, não só faturamento."
            />
          </div>
        </Card>

        <Card className="dash-kpi-card dash-kpi-ticket">
          <span className="dash-kpi-icone" style={{ background: 'var(--roxo-claro)', color: 'var(--roxo-escuro)' }}>
            <ShoppingCart size={22} aria-hidden="true" />
          </span>
          <div className="dash-kpi-texto">
            <p>Ticket médio</p>
            <p className="dash-kpi-valor">{formatarMoeda(dadosHoje?.ticket_medio)}</p>
            <ComoCalculado
              formula={`receita ÷ número de vendas concluídas (${dadosHoje?.total_vendas || 0}).`}
              representa="quanto cada cliente gasta, em média, por compra."
              paraQue="avaliar combos e promoções para aumentar o valor de cada venda."
            />
          </div>
        </Card>

        <Card className="dash-kpi-card dash-kpi-desperdicio">
          <span className="dash-kpi-icone" style={{ background: 'var(--laranja-claro)', color: 'var(--laranja-escuro)' }}>
            <Trash2 size={22} aria-hidden="true" />
          </span>
          <div className="dash-kpi-texto">
            <p>Desperdício {periodoTexto}</p>
            <p className="dash-kpi-valor">{formatarMoeda(dadosHoje?.desperdicio)}</p>
            <ComoCalculado
              formula="soma de (preço de custo × quantidade perdida) dos desperdícios registrados."
              representa="o prejuízo com produtos que estragaram, amassaram ou venceram."
              paraQue="mostrar onde o dinheiro está sendo perdido e agir para reduzir."
            />
          </div>
        </Card>
      </section>

      <div className="dash-grid-2">
        {/* ═══ Evolução de vendas ═══ */}
        <Card>
          <ChartWithTable
            titulo={tituloGrafico}
            resumoTextual={`Gráfico de linha mostrando a receita diária do período, variando de ${formatarMoeda(Math.min(...(graficos?.evolucao?.map((d) => Number(d.vendas)) || [0])))} a ${formatarMoeda(Math.max(...(graficos?.evolucao?.map((d) => Number(d.vendas)) || [0])))}.`}
            linhas={(graficos?.evolucao || []).map((d) => ({ rotulo: d.dia, valor: d.vendas, valorFormatado: formatarMoeda(d.vendas) }))}
            colunaValor="Receita"
          >
            <LineChart
              labels={(graficos?.evolucao || []).map((d) => d.dia)}
              dataset={(graficos?.evolucao || []).map((d) => Number(d.vendas))}
              rotulo="Receita"
            />
          </ChartWithTable>
        </Card>

        {/* ═══ Meta do mês ═══ */}
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <h3 className="card-titulo" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Target size={18} aria-hidden="true" /> Meta do mês
            </h3>
            <div style={{ display: 'flex', gap: '0.3rem' }}>
              <Button variante="ghost" tamanho="sm" onClick={abrirModalMeta} icone={Plus}>
                {metaProgresso?.meta_definida ? 'Editar' : 'Definir'}
              </Button>
              {metaProgresso?.meta_definida && (
                <Button
                  variante="ghost"
                  tamanho="sm"
                  icone={Trash2}
                  onClick={() => setModalExcluirMetaAberto(true)}
                  aria-label="Excluir meta do mês"
                >
                  Excluir
                </Button>
              )}
            </div>
          </div>

          {metaProgresso?.meta_definida ? (
            <div className="dash-meta-progresso">
              <p style={{ margin: '0 0 0.35rem', fontWeight: 700, fontSize: '1.1rem' }}>
                {formatarPercentual(metaProgresso.percentual_receita)}
              </p>
              <div
                className="dash-meta-barra-fundo"
                role="progressbar"
                aria-valuenow={Math.min(Number(metaProgresso.percentual_receita), 100)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Progresso da meta de receita do mês"
              >
                <div
                  className="dash-meta-barra-preenchida"
                  style={{ width: `${Math.min(Number(metaProgresso.percentual_receita), 100)}%` }}
                />
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--texto-secundario)', margin: '0.6rem 0 0' }}>
                {formatarMoeda(metaProgresso.realizado.receita)} de {formatarMoeda(metaProgresso.meta.meta_receita)}
              </p>
              {!metaProgresso.meta_batida && (
                <p style={{ fontSize: '0.85rem', margin: '0.35rem 0 0' }}>
                 Faltam {formatarMoeda(metaProgresso.falta_receita)}
                 {metaProgresso.media_diaria_necessaria !== null && metaProgresso.periodo.dias_restantes > 0 && (
  <> — vendendo cerca de {formatarMoeda(metaProgresso.media_diaria_necessaria)}/dia nos {metaProgresso.periodo.dias_restantes} dias restantes do mês, você bate a meta</>
                 )}
                </p>
              )}
              {metaProgresso.meta_batida && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', marginTop: '0.35rem' }}>
                  <Badge tipo="sucesso" icone={Award}>Meta batida! 🎉</Badge>
                  <Button variante="secondary" tamanho="sm" onClick={abrirModalMeta}>Definir nova meta</Button>
                </div>
              )}
            </div>
          ) : (
            <EmptyState
              titulo="Nenhuma meta definida"
              descricao="Defina uma meta de receita para acompanhar seu progresso."
              acao={<Button tamanho="sm" onClick={abrirModalMeta} icone={Plus}>Definir meta</Button>}
            />
          )}
        </Card>
      </div>

      <div className="dash-grid-2">
        {/* ═══ Produtos com estoque baixo ═══ */}
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h3 className="card-titulo" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <AlertTriangle size={18} aria-hidden="true" /> Produtos com estoque baixo
            </h3>
            {estoqueBaixo.length > 0 && (
              <Link to="/estoque" style={{ fontSize: '0.85rem', fontWeight: 700 }}>Ver todos</Link>
            )}
          </div>
          {estoqueBaixo.length === 0 ? (
            <EmptyState titulo="Nenhum produto com estoque baixo. ✓" />
          ) : (
            <ul className="dash-lista-alerta">
              {estoqueBaixo.slice(0, 5).map((p) => (
                <li key={p.id}>
                  <span>
                    <strong>{p.nome}</strong> — {formatarQuantidade(p.quantidade)} restante{Number(p.quantidade) === 1 ? '' : 's'}
                  </span>
                  <Badge tipo="alerta" icone={AlertTriangle}>Atenção</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* ═══ Formas de pagamento ═══ */}
        <Card>
          <ChartWithTable
            titulo={`Formas de pagamento (${dataBR(periodoGrafico.inicio)} a ${dataBR(periodoGrafico.fim)})`}
            resumoTextual="Gráfico de rosca mostrando o número de vendas por forma de pagamento no período do gráfico."
            linhas={(graficos?.pagamentos || []).map((p) => ({ rotulo: rotuloFormaPagamento(p.forma), valor: p.quantidade }))}
            colunaValor="Quantidade"
          >
            {(graficos?.pagamentos || []).length > 0 ? (
              <DonutChart
                labels={(graficos?.pagamentos || []).map((p) => rotuloFormaPagamento(p.forma))}
                dataset={(graficos?.pagamentos || []).map((p) => Number(p.quantidade))}
              />
            ) : (
              <EmptyState titulo="Sem vendas no período." />
            )}
          </ChartWithTable>
        </Card>
      </div>

      {/* ═══ Produtos mais vendidos ═══ */}
      <Card>
        <h3 className="card-titulo">Produtos mais vendidos {periodoTexto}</h3>
        {(resumo?.top_produtos || []).length === 0 ? (
          <EmptyState titulo="Nenhuma venda no período selecionado." />
        ) : (
          <ul className="dash-lista-alerta">
            {resumo.top_produtos.map((p) => (
              <li key={p.nome}>
                <span><strong>{p.nome}</strong> — {formatarQuantidade(p.total_vendido)} vendido(s)</span>
                <span style={{ fontWeight: 700 }}>{formatarMoeda(p.receita)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Modal aberto={modalMetaAberto} titulo="Definir meta do mês" onFechar={() => setModalMetaAberto(false)}>
        <form onSubmit={salvarMeta}>
          <Input
            label="Meta de receita (R$)"
            type="text"
            inputMode="decimal"
            placeholder="Ex.: 1.500,00"
            obrigatorio
            value={metaReceita}
            onChange={(e) => setMetaReceita(e.target.value)}
          />
          <Input
            label="Meta de lucro (R$)"
            type="text"
            inputMode="decimal"
            placeholder="Ex.: 500,00"
            dica="Opcional"
            value={metaLucro}
            onChange={(e) => setMetaLucro(e.target.value)}
          />
          <div className="modal-acoes">
            <Button variante="secondary" type="button" onClick={() => setModalMetaAberto(false)}>Cancelar</Button>
            <Button type="submit" carregando={salvandoMeta}>Salvar meta</Button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        aberto={modalExcluirMetaAberto}
        titulo="Excluir meta do mês"
        mensagem="Tem certeza que deseja excluir a meta deste mês? Essa ação não pode ser desfeita."
        onFechar={() => setModalExcluirMetaAberto(false)}
        onConfirmar={confirmarExcluirMeta}
        confirmando={excluindoMeta}
        textoCancelar="Voltar"
        textoConfirmar="Excluir meta"
        icone={Trash2}
      />
    </div>
  );
}