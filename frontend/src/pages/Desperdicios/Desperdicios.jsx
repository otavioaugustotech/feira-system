import { useEffect, useState } from 'react';
import { Plus, FileDown, FileText, Trash2 } from 'lucide-react';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Select from '../../components/ui/Select.jsx';
import Input from '../../components/ui/Input.jsx';
import Table from '../../components/ui/Table.jsx';
import ConfirmModal from '../../components/ui/ConfirmModal.jsx';
import Loading from '../../components/ui/Loading.jsx';
import Alert from '../../components/ui/Alert.jsx';
import { produtosService } from '../../services/produtosService.js';
import { desperdiciosService } from '../../services/desperdiciosService.js';
import { useToast } from '../../hooks/useToast.js';
import { extrairMensagemErro } from '../../services/api.js';
import { baixarBlob } from '../../utils/download.js';
import { formatarMoeda, formatarDataHora, formatarQuantidade } from '../../utils/formatters.js';
import '../shared/list-page.css';

export default function Desperdicios() {
  const { sucesso, erro: notificarErro } = useToast();

  const [produtos, setProdutos] = useState([]);
  const [registros, setRegistros] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erroCarregar, setErroCarregar] = useState('');

  const [produtoId, setProdutoId] = useState('');
  const [quantidade, setQuantidade] = useState('');
  const [motivo, setMotivo] = useState('');
  const [registrando, setRegistrando] = useState(false);
  const [errosForm, setErrosForm] = useState({});

  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [exportando, setExportando] = useState('');

  const [modalExcluirAberto, setModalExcluirAberto] = useState(false);
  const [registroExcluir, setRegistroExcluir] = useState(null);
  const [excluindo, setExcluindo] = useState(false);

  const carregarDados = async (params = {}) => {
    setCarregando(true);
    setErroCarregar('');
    try {
      const [prods, desp] = await Promise.all([
        produtosService.listar(),
        desperdiciosService.listar(params),
      ]);
      setProdutos(prods || []);
      setRegistros(desp || []);
    } catch (err) {
      setErroCarregar(extrairMensagemErro(err));
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => { carregarDados(); }, []);

  const registrar = async (e) => {
    e.preventDefault();
    const novosErros = {};
    if (!produtoId) novosErros.produto = 'Selecione um produto.';
    if (!quantidade || Number(quantidade) <= 0) novosErros.quantidade = 'Informe uma quantidade válida.';
    setErrosForm(novosErros);
    if (Object.keys(novosErros).length > 0) return;

    setRegistrando(true);
    try {
      await desperdiciosService.registrar({
        produto_id: Number(produtoId),
        quantidade: Number(quantidade),
        motivo: motivo.trim() || undefined,
      });
      sucesso('Desperdício registrado.');
      setProdutoId('');
      setQuantidade('');
      setMotivo('');
      carregarDados();
    } catch (err) {
      notificarErro(extrairMensagemErro(err));
    } finally {
      setRegistrando(false);
    }
  };

  const filtrarPeriodo = () => {
    carregarDados({
      data_inicio: dataInicio || undefined,
      data_fim: dataFim || undefined,
    });
  };

  const abrirExcluir = (registro) => {
    setRegistroExcluir(registro);
    setModalExcluirAberto(true);
  };

  const confirmarExcluir = async () => {
    setExcluindo(true);
    try {
      await desperdiciosService.remover(registroExcluir.id);
      sucesso('Desperdício removido e estoque devolvido.');
      setModalExcluirAberto(false);
      carregarDados({ data_inicio: dataInicio || undefined, data_fim: dataFim || undefined });
    } catch (err) {
      notificarErro(extrairMensagemErro(err));
    } finally {
      setExcluindo(false);
    }
  };

  const exportar = async (formato) => {
    setExportando(formato);
    try {
      const params = { data_inicio: dataInicio || undefined, data_fim: dataFim || undefined };
      const blob = formato === 'pdf'
        ? await desperdiciosService.exportarPDF(params)
        : await desperdiciosService.exportarWord(params);
      const extensao = formato === 'pdf' ? 'pdf' : 'docx';
      baixarBlob(blob, `desperdicios.${extensao}`);
      sucesso(`Relatório em ${formato.toUpperCase()} gerado com sucesso!`);
    } catch (err) {
      notificarErro(extrairMensagemErro(err));
    } finally {
      setExportando('');
    }
  };

  const totalPerda = registros.reduce((acc, r) => acc + parseFloat(r.valor_perda || 0), 0);

  const colunas = [
    { chave: 'data_registro', rotulo: 'Data', render: (r) => formatarDataHora(r.data_registro) },
    { chave: 'produto_nome', rotulo: 'Produto' },
    { chave: 'quantidade', rotulo: 'Quantidade', render: (r) => formatarQuantidade(r.quantidade), alinharDireita: true },
    { chave: 'motivo', rotulo: 'Motivo', render: (r) => r.motivo || '—' },
    { chave: 'valor_perda', rotulo: 'Prejuízo', render: (r) => formatarMoeda(r.valor_perda), alinharDireita: true },
  ];

  return (
    <div>
      <div className="pagina-cabecalho">
        <div>
          <h2>Desperdícios</h2>
          <p>Registre perdas e acompanhe o prejuízo ao longo do tempo.</p>
        </div>
      </div>

      <Card titulo="Registrar desperdício" style={{ marginBottom: '1.25rem' }}>
        <form onSubmit={registrar} noValidate>
          <div className="form-grid-2">
            <Select label="Produto" obrigatorio value={produtoId} onChange={(e) => setProdutoId(e.target.value)} erro={errosForm.produto}>
              <option value="">Selecione um produto...</option>
              {produtos.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </Select>
            <Input
              label="Quantidade perdida"
              type="number"
              min="0.001"
              step="0.001"
              obrigatorio
              value={quantidade}
              onChange={(e) => setQuantidade(e.target.value)}
              erro={errosForm.quantidade}
            />
          </div>
          <Input label="Motivo" dica="Opcional — ex: vencimento, dano no transporte" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
          <Button type="submit" icone={Plus} carregando={registrando}>Registrar desperdício</Button>
        </form>
      </Card>

      <Card titulo="Histórico e relatórios">
        <div className="pagina-filtros">
          <Input label="De" type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
          <Input label="Até" type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
          <Button variante="secondary" onClick={filtrarPeriodo}>Filtrar</Button>
          <div style={{ flex: 1 }} />
          <Button variante="secondary" icone={FileDown} onClick={() => exportar('pdf')} carregando={exportando === 'pdf'}>
            Exportar PDF
          </Button>
          <Button variante="secondary" icone={FileText} onClick={() => exportar('word')} carregando={exportando === 'word'}>
            Exportar Word
          </Button>
        </div>

        {registros.length > 0 && (
          <Alert tipo="erro">
            Prejuízo total no período: <strong>{formatarMoeda(totalPerda)}</strong>
          </Alert>
        )}

        {carregando ? (
          <Loading texto="Carregando registros..." />
        ) : erroCarregar ? (
          <Alert tipo="erro">{erroCarregar}</Alert>
        ) : (
          <Table
            colunas={colunas}
            dados={registros}
            vazioTitulo="Nenhum desperdício registrado no período."
            acoes={(r) => (
              <Button variante="ghost-perigo" tamanho="sm" icone={Trash2} onClick={() => abrirExcluir(r)} aria-label={`Remover registro de desperdício de ${r.produto_nome}`}>
                Remover
              </Button>
            )}
          />
        )}
      </Card>

      <ConfirmModal
        aberto={modalExcluirAberto}
        titulo="Remover desperdício"
        mensagem={<>Tem certeza que deseja remover este registro de <strong>{registroExcluir?.produto_nome}</strong>? A quantidade será devolvida ao estoque.</>}
        onFechar={() => setModalExcluirAberto(false)}
        onConfirmar={confirmarExcluir}
        confirmando={excluindo}
        textoConfirmar="Remover"
        icone={Trash2}
      />
    </div>
  );
}
