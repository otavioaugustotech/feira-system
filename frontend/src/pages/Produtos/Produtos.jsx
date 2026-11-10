import { useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, AlertTriangle } from 'lucide-react';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Select from '../../components/ui/Select.jsx';
import Modal from '../../components/ui/Modal.jsx';
import ConfirmModal from '../../components/ui/ConfirmModal.jsx';
import Table from '../../components/ui/Table.jsx';
import Loading from '../../components/ui/Loading.jsx';
import Alert from '../../components/ui/Alert.jsx';
import Badge from '../../components/ui/Badge.jsx';
import { produtosService } from '../../services/produtosService.js';
import { useToast } from '../../hooks/useToast.js';
import { extrairMensagemErro } from '../../services/api.js';
import { formatarMoeda, formatarNumero, formatarQuantidade, rotuloTipoVenda } from '../../utils/formatters.js';
import CampoImagemProduto, { MiniaturaProduto } from './CampoImagemProduto.jsx';
import { opcoesCategorias } from '../../utils/categoriasProduto.js';
import '../shared/list-page.css';

const OUTRA_CATEGORIA = '__outra__';

const FORM_VAZIO = {
  nome: '', categoria: '', tipo_venda: 'unidade',
  preco_custo: '', preco_venda: '', quantidade: '', estoque_minimo: '5',
  imagem: null,
};

export default function Produtos() {
  const { sucesso, erro: notificarErro } = useToast();

  const [produtos, setProdutos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erroCarregar, setErroCarregar] = useState('');

  const [busca, setBusca] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');

  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(FORM_VAZIO);
  const [errosForm, setErrosForm] = useState({});
  const [salvando, setSalvando] = useState(false);

  const [modalExcluirAberto, setModalExcluirAberto] = useState(false);
  const [produtoExcluir, setProdutoExcluir] = useState(null);
  const [excluindo, setExcluindo] = useState(false);

  const carregarProdutos = async () => {
    setCarregando(true);
    setErroCarregar('');
    try {
      const dados = await produtosService.listar();
      setProdutos(dados || []);
    } catch (err) {
      setErroCarregar(extrairMensagemErro(err));
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => { carregarProdutos(); }, []);

  const categorias = useMemo(
    () => [...new Set(produtos.map((p) => p.categoria).filter(Boolean))].sort(),
    [produtos]
  );

  const produtosFiltrados = useMemo(() => {
    return produtos.filter((p) => {
      const combinaBusca = !busca || p.nome.toLowerCase().includes(busca.toLowerCase());
      const combinaCategoria = !filtroCategoria || p.categoria === filtroCategoria;
      return combinaBusca && combinaCategoria;
    });
  }, [produtos, busca, filtroCategoria]);

  /* ⭐ Categoria escolhida numa lista de categorias de feira (+ as que o
     feirante já usa). "Outra (digitar)" abre um campo para digitar. */
  const [categoriaDigitada, setCategoriaDigitada] = useState(false);
  const listaCategorias = useMemo(() => opcoesCategorias(categorias), [categorias]);

  const escolherCategoria = (e) => {
    const valor = e.target.value;
    if (valor === OUTRA_CATEGORIA) {
      setCategoriaDigitada(true);
      setForm((f) => ({ ...f, categoria: '' }));
    } else {
      setCategoriaDigitada(false);
      setForm((f) => ({ ...f, categoria: valor }));
    }
  };

  const abrirCriar = () => {
    setEditando(null);
    setForm(FORM_VAZIO);
    setCategoriaDigitada(false);
    setErrosForm({});
    setModalAberto(true);
  };

  const abrirEditar = (produto) => {
    setEditando(produto);
    setForm({
      nome: produto.nome || '',
      categoria: produto.categoria || '',
      tipo_venda: produto.tipo_venda || 'unidade',
      preco_custo: produto.preco_custo != null ? Number(produto.preco_custo) : '',
      preco_venda: produto.preco_venda != null ? Number(produto.preco_venda) : '',
      quantidade: produto.quantidade != null ? Number(produto.quantidade) : '',
      estoque_minimo: produto.estoque_minimo != null ? Number(produto.estoque_minimo) : '5',
      imagem: produto.imagem || null,
    });
    setCategoriaDigitada(false);
    setErrosForm({});
    setModalAberto(true);
  };

  const atualizarCampo = (campo) => (e) => setForm((f) => ({ ...f, [campo]: e.target.value }));

  const validarForm = () => {
    const novosErros = {};
    if (!form.nome.trim()) novosErros.nome = 'Informe o nome do produto.';
    if (form.preco_custo === '' || Number(form.preco_custo) < 0) novosErros.preco_custo = 'Informe um preço de custo válido.';
    if (form.preco_venda === '' || Number(form.preco_venda) < 0) novosErros.preco_venda = 'Informe um preço de venda válido.';
    if (form.preco_custo !== '' && form.preco_venda !== '' && Number(form.preco_venda) <= Number(form.preco_custo)) {
      novosErros.preco_venda = 'O preço de venda deve ser maior que o preço de custo.';
    }
    setErrosForm(novosErros);
    return Object.keys(novosErros).length === 0;
  };

  const salvar = async (e) => {
    e.preventDefault();
    if (!validarForm()) return;

    const payload = {
      nome: form.nome.trim(),
      categoria: form.categoria.trim() || undefined,
      tipo_venda: form.tipo_venda,
      preco_custo: Number(form.preco_custo),
      preco_venda: Number(form.preco_venda),
      quantidade: form.quantidade === '' ? 0 : Number(form.quantidade),
      estoque_minimo: form.estoque_minimo === '' ? 5 : Number(form.estoque_minimo),
    };
    /* imagem: no cadastro só vai se tiver; na edição só vai se mudou
       (null remove), para não reenviar a mesma foto a cada alteração */
    if (editando) {
      if (form.imagem !== (editando.imagem || null)) payload.imagem = form.imagem;
    } else if (form.imagem) {
      payload.imagem = form.imagem;
    }

    setSalvando(true);
    try {
      if (editando) {
        await produtosService.atualizar(editando.id, payload);
        sucesso('Produto atualizado com sucesso!');
      } else {
        await produtosService.criar(payload);
        sucesso('Produto criado com sucesso!');
      }
      setModalAberto(false);
      carregarProdutos();
    } catch (err) {
      notificarErro(extrairMensagemErro(err));
    } finally {
      setSalvando(false);
    }
  };

  const confirmarExclusao = (produto) => {
    setProdutoExcluir(produto);
    setModalExcluirAberto(true);
  };

  const excluir = async () => {
    setExcluindo(true);
    try {
      await produtosService.remover(produtoExcluir.id);
      sucesso('Produto removido com sucesso!');
      setModalExcluirAberto(false);
      carregarProdutos();
    } catch (err) {
      notificarErro(extrairMensagemErro(err));
    } finally {
      setExcluindo(false);
    }
  };

  const colunas = [
    {
      chave: 'nome',
      rotulo: 'Produto',
      render: (p) => (
        <span className="produto-nome-celula">
          <MiniaturaProduto imagem={p.imagem} nome={p.nome} />
          {p.nome}
        </span>
      ),
    },
    { chave: 'categoria', rotulo: 'Categoria', render: (p) => p.categoria || '—' },
    { chave: 'tipo_venda', rotulo: 'Tipo', render: (p) => rotuloTipoVenda(p.tipo_venda) },
    { chave: 'preco_custo', rotulo: 'Custo', render: (p) => formatarMoeda(p.preco_custo), alinharDireita: true },
    { chave: 'preco_venda', rotulo: 'Venda', render: (p) => formatarMoeda(p.preco_venda), alinharDireita: true },
    { chave: 'margem_lucro_pct', rotulo: 'Margem', render: (p) => `${formatarNumero(p.margem_lucro_pct, 1)}%`, alinharDireita: true },
    {
      chave: 'quantidade',
      rotulo: 'Estoque',
      render: (p) => (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          {formatarQuantidade(p.quantidade)}
          {p.estoque_baixo && <Badge tipo="alerta" icone={AlertTriangle}>Baixo</Badge>}
        </span>
      ),
    },
  ];

  return (
    <div>
      <div className="pagina-cabecalho">
        <div>
          <h2>Produtos</h2>
          <p>Cadastre e gerencie os produtos da sua banca.</p>
        </div>
        <Button icone={Plus} onClick={abrirCriar}>Novo produto</Button>
      </div>

      <div className="pagina-filtros">
        <div className="campo campo-busca">
          <label htmlFor="busca-produto">Buscar produto</label>
          <div className="input-wrapper">
            <input
              id="busca-produto"
              className="input"
              placeholder="Digite o nome do produto..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
        </div>
        <Select label="Categoria" value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)}>
          <option value="">Todas as categorias</option>
          {categorias.map((c) => <option key={c} value={c}>{c}</option>)}
        </Select>
      </div>

      <Card>
        {carregando ? (
          <Loading texto="Carregando produtos..." />
        ) : erroCarregar ? (
          <Alert tipo="erro">{erroCarregar}</Alert>
        ) : (
          <Table
            colunas={colunas}
            dados={produtosFiltrados}
            vazioTitulo={produtos.length === 0 ? 'Nenhum produto cadastrado ainda.' : 'Nenhum produto encontrado com esses filtros.'}
            acoes={(p) => (
              <div className="acoes-linha">
                <Button variante="ghost" tamanho="sm" icone={Pencil} onClick={() => abrirEditar(p)} aria-label={`Editar ${p.nome}`}>
                  Editar
                </Button>
                <Button variante="ghost-perigo" tamanho="sm" icone={Trash2} onClick={() => confirmarExclusao(p)} aria-label={`Remover ${p.nome}`}>
                  Remover
                </Button>
              </div>
            )}
          />
        )}
      </Card>

      {/* ═══ Modal criar/editar ═══ */}
      <Modal aberto={modalAberto} titulo={editando ? 'Editar produto' : 'Novo produto'} onFechar={() => setModalAberto(false)}>
        <form onSubmit={salvar} noValidate>
          <CampoImagemProduto
            valor={form.imagem}
            nomeProduto={form.nome}
            onAlterar={(imagem) => setForm((f) => ({ ...f, imagem }))}
          />
          <Input label="Nome do produto" obrigatorio value={form.nome} onChange={atualizarCampo('nome')} erro={errosForm.nome} />
          <div className="form-grid-2">
            <Select
              label="Categoria"
              value={categoriaDigitada ? OUTRA_CATEGORIA : form.categoria}
              onChange={escolherCategoria}
              dica="Opcional"
            >
              <option value="">Sem categoria</option>
              {listaCategorias.map((c) => <option key={c} value={c}>{c}</option>)}
              <option value={OUTRA_CATEGORIA}>Outra (digitar)…</option>
            </Select>
            <Select label="Tipo de venda" value={form.tipo_venda} onChange={atualizarCampo('tipo_venda')}>
              <option value="unidade">Unidade</option>
              <option value="kg">Quilo (kg)</option>
              <option value="maco">Maço</option>
              <option value="caixa">Caixa</option>
            </Select>
          </div>
          {categoriaDigitada && (
            <Input
              label="Nome da nova categoria"
              value={form.categoria}
              onChange={atualizarCampo('categoria')}
              placeholder="Ex.: Cogumelos"
              dica="Depois de salva, ela também aparece na lista para os próximos produtos."
              autoFocus
            />
          )}
          <div className="form-grid-2">
            <Input label="Preço de custo (R$)" type="number" min="0" step="0.01" obrigatorio value={form.preco_custo} onChange={atualizarCampo('preco_custo')} erro={errosForm.preco_custo} />
            <Input label="Preço de venda (R$)" type="number" min="0" step="0.01" obrigatorio value={form.preco_venda} onChange={atualizarCampo('preco_venda')} erro={errosForm.preco_venda} />
          </div>
          <div className="form-grid-2">
            <Input label="Quantidade em estoque" type="number" min="0" step="0.001" value={form.quantidade} onChange={atualizarCampo('quantidade')} />
            <Input label="Estoque mínimo" type="number" min="0" step="0.001" value={form.estoque_minimo} onChange={atualizarCampo('estoque_minimo')} dica="Alerta de estoque baixo" />
          </div>
          <div className="modal-acoes">
            <Button variante="secondary" type="button" onClick={() => setModalAberto(false)}>Cancelar</Button>
            <Button type="submit" carregando={salvando}>{editando ? 'Salvar alterações' : 'Criar produto'}</Button>
          </div>
        </form>
      </Modal>

      {/* ═══ Modal confirmar exclusão ═══ */}
      <ConfirmModal
        aberto={modalExcluirAberto}
        titulo="Remover produto"
        mensagem={<>Tem certeza que deseja remover <strong>{produtoExcluir?.nome}</strong>? O produto será desativado, mas o histórico de vendas será preservado.</>}
        onFechar={() => setModalExcluirAberto(false)}
        onConfirmar={excluir}
        confirmando={excluindo}
        textoConfirmar="Remover"
        icone={Trash2}
      />
    </div>
  );
}
