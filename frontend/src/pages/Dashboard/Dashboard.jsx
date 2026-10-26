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
import { relatoriosService } from '../../services/relatoriosService.js';
import { metasService } from '../../services/metasService.js';
import { produtosService } from '../../services/produtosService.js';
import { useAuth } from '../../hooks/useAuth.js';
import { useToast } from '../../hooks/useToast.js';
import { extrairMensagemErro } from '../../services/api.js';
import { formatarMoeda, formatarQuantidade, formatarPercentual, paraNumeroBR, formatarValorBR, rotuloFormaPagamento } from '../../utils/formatters.js';
import './dashboard.css';

const hoje = new Date();

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

  const [modalMetaAberto, setModalMetaAberto] = useState(false);
  const [metaReceita, setMetaReceita] = useState('');
  const [metaLucro, setMetaLucro] = useState('');
  const [salvandoMeta, setSalvandoMeta] = useState(false);

  const [modalExcluirMetaAberto, setModalExcluirMetaAberto] = useState(false);
  const [excluindoMeta, setExcluindoMeta] = useState(false);

  const carregarTudo = async () => {
    setCarregando(true);
    setErroCarregar('');
    try {
      const [h, g, r, m, eb] = await Promise.all([
        relatoriosService.hoje(),
        relatoriosService.graficos({ dias: 7 }),
        relatoriosService.resumo(),
        metasService.progresso(hoje.getFullYear(), hoje.getMonth() + 1),
        produtosService.estoqueBaixo(),
      ]);
      setDadosHoje(h);
      setGraficos(g);
      setResumo(r);
      setMetaProgresso(m);
      setEstoqueBaixo(eb || []);
    } catch (err) {
      setErroCarregar(extrairMensagemErro(err));
    } finally {
      setCarregando(false);
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

  const variacao = Number(dadosHoje?.variacao_hoje ?? 0);
  const variacaoPositiva = variacao >= 0;

  return (
    <div className="dashboard-pagina">
      <div className="dash-saudacao">
        <h2>Olá, {usuario?.nome?.split(' ')[0] || 'feirante'}! 👋</h2>
        <p>Aqui está o resumo do seu negócio hoje, {hoje.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}.</p>
      </div>

      {/* ═══ KPIs de hoje ═══ */}
      <section className="dash-kpis" aria-label="Indicadores de hoje">
        <Card className="dash-kpi-card dash-kpi-receita">
          <span className="dash-kpi-icone" style={{ background: 'var(--verde-claro)', color: 'var(--verde-escuro)' }}>
            <DollarSign size={22} aria-hidden="true" />
          </span>
          <div className="dash-kpi-texto">
            <p>Receita de hoje</p>
            <p className="dash-kpi-valor">{formatarMoeda(dadosHoje?.receita)}</p>
            <span className="dash-kpi-variacao" style={{ color: variacaoPositiva ? 'var(--verde-escuro)' : 'var(--vermelho)' }}>
              {variacaoPositiva ? <ArrowUpRight size={15} aria-hidden="true" /> : <ArrowDownRight size={15} aria-hidden="true" />}
              {Math.abs(variacao)}% vs ontem
            </span>
          </div>
        </Card>

        <Card className="dash-kpi-card dash-kpi-lucro">
          <span className="dash-kpi-icone" style={{ background: 'var(--azul-claro)', color: 'var(--azul)' }}>
            <TrendingUp size={22} aria-hidden="true" />
          </span>
          <div className="dash-kpi-texto">
            <p>Lucro de hoje</p>
            <p className="dash-kpi-valor">{formatarMoeda(dadosHoje?.lucro)}</p>
            <span className="dash-kpi-variacao" style={{ color: 'var(--texto-secundario)' }}>{dadosHoje?.total_vendas || 0} vendas hoje</span>
          </div>
        </Card>

        <Card className="dash-kpi-card dash-kpi-ticket">
          <span className="dash-kpi-icone" style={{ background: 'var(--roxo-claro)', color: 'var(--roxo)' }}>
            <ShoppingCart size={22} aria-hidden="true" />
          </span>
          <div className="dash-kpi-texto">
            <p>Ticket médio</p>
            <p className="dash-kpi-valor">{formatarMoeda(dadosHoje?.ticket_medio)}</p>
          </div>
        </Card>

        <Card className="dash-kpi-card dash-kpi-desperdicio">
          <span className="dash-kpi-icone" style={{ background: 'var(--vermelho-claro)', color: 'var(--vermelho)' }}>
            <Trash2 size={22} aria-hidden="true" />
          </span>
          <div className="dash-kpi-texto">
            <p>Desperdício de hoje</p>
            <p className="dash-kpi-valor">{formatarMoeda(dadosHoje?.desperdicio)}</p>
          </div>
        </Card>
      </section>

      <div className="dash-grid-2">
        {/* ═══ Evolução de vendas ═══ */}
        <Card>
          <ChartWithTable
            titulo="Vendas dos últimos 7 dias"
            resumoTextual={`Gráfico de linha mostrando a receita diária dos últimos 7 dias, variando de ${formatarMoeda(Math.min(...(graficos?.evolucao?.map((d) => Number(d.vendas)) || [0])))} a ${formatarMoeda(Math.max(...(graficos?.evolucao?.map((d) => Number(d.vendas)) || [0])))}.`}
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
            titulo="Formas de pagamento (7 dias)"
            resumoTextual="Gráfico de rosca mostrando a distribuição de vendas por forma de pagamento nos últimos 7 dias."
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
        <h3 className="card-titulo">Produtos mais vendidos no mês</h3>
        {(resumo?.top_produtos || []).length === 0 ? (
          <EmptyState titulo="Nenhuma venda registrada neste mês ainda." />
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