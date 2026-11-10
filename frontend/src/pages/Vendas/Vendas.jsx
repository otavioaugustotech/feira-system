import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, ShoppingCart, XCircle, CheckCircle2 } from 'lucide-react';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Select from '../../components/ui/Select.jsx';
import Input from '../../components/ui/Input.jsx';
import ConfirmModal from '../../components/ui/ConfirmModal.jsx';
import Table from '../../components/ui/Table.jsx';
import Pagination from '../../components/ui/Pagination.jsx';
import Loading from '../../components/ui/Loading.jsx';
import Alert from '../../components/ui/Alert.jsx';
import Badge from '../../components/ui/Badge.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import { produtosService } from '../../services/produtosService.js';
import { vendasService } from '../../services/vendasService.js';
import { useToast } from '../../hooks/useToast.js';
import { extrairMensagemErro } from '../../services/api.js';
import { formatarMoeda, formatarQuantidade, formatarDataHora, rotuloFormaPagamento, rotuloStatusVenda, rotuloTipoVenda } from '../../utils/formatters.js';
import '../shared/list-page.css';
import './vendas.css';

export default function Vendas() {
  const { sucesso, erro: notificarErro } = useToast();

  const [produtos, setProdutos] = useState([]);
  const [vendas, setVendas] = useState([]);
  const [paginacaoVendas, setPaginacaoVendas] = useState(null);
  const [pagina, setPagina] = useState(1);
  const [carregandoVendas, setCarregandoVendas] = useState(true);
  const [erroCarregar, setErroCarregar] = useState('');

  const [produtoSelecionado, setProdutoSelecionado] = useState('');
  const [quantidade, setQuantidade] = useState('1');
  const [carrinho, setCarrinho] = useState([]);
  const [formaPagamento, setFormaPagamento] = useState('dinheiro');
  const [registrando, setRegistrando] = useState(false);

  const [modalCancelarAberto, setModalCancelarAberto] = useState(false);
  const [vendaCancelar, setVendaCancelar] = useState(null);
  const [motivoCancelamento, setMotivoCancelamento] = useState('');
  const [cancelando, setCancelando] = useState(false);

  /* ⭐ CORREÇÃO (análise de escalabilidade): antes buscava TODAS as vendas
     de uma vez. Agora busca só a página atual (20 por página, controlado
     pelo backend em vendasService.js). */
  const carregarDados = async (paginaAlvo = pagina) => {
    setCarregandoVendas(true);
    setErroCarregar('');
    try {
      const [prods, vds] = await Promise.all([
        produtosService.listar(),
        vendasService.listar({ pagina: paginaAlvo }),
      ]);
      setProdutos((prods || []).filter((p) => Number(p.quantidade) > 0));
      setVendas(vds?.vendas || []);
      setPaginacaoVendas(vds?.paginacao || null);
    } catch (err) {
      setErroCarregar(extrairMensagemErro(err));
    } finally {
      setCarregandoVendas(false);
    }
  };

  useEffect(() => { carregarDados(pagina); }, [pagina]);

  const produtoAtual = useMemo(
    () => produtos.find((p) => String(p.id) === String(produtoSelecionado)),
    [produtos, produtoSelecionado]
  );

  const adicionarAoCarrinho = () => {
    if (!produtoAtual || !quantidade || Number(quantidade) <= 0) return;

    const jaNoCarrinho = carrinho.find((i) => i.produto_id === produtoAtual.id);
    const qtdDesejada = (jaNoCarrinho?.quantidade || 0) + Number(quantidade);

    if (qtdDesejada > Number(produtoAtual.quantidade)) {
      notificarErro(`Estoque insuficiente. Disponível: ${formatarQuantidade(produtoAtual.quantidade)}.`);
      return;
    }

    if (jaNoCarrinho) {
      setCarrinho((c) => c.map((i) => (i.produto_id === produtoAtual.id ? { ...i, quantidade: qtdDesejada } : i)));
    } else {
      setCarrinho((c) => [
        ...c,
        {
          produto_id: produtoAtual.id,
          nome: produtoAtual.nome,
          preco_venda: Number(produtoAtual.preco_venda),
          quantidade: Number(quantidade),
          tipo_venda: produtoAtual.tipo_venda,
        },
      ]);
    }
    setProdutoSelecionado('');
    setQuantidade('1');
  };

  const removerDoCarrinho = (produtoId) => setCarrinho((c) => c.filter((i) => i.produto_id !== produtoId));

  const total = carrinho.reduce((acc, i) => acc + i.preco_venda * i.quantidade, 0);

  const finalizarVenda = async () => {
    if (carrinho.length === 0) return;
    setRegistrando(true);
    try {
      await vendasService.criar({
        forma_pagamento: formaPagamento,
        itens: carrinho.map((i) => ({ produto_id: i.produto_id, quantidade: i.quantidade })),
      });
      sucesso('Venda registrada com sucesso!');
      setCarrinho([]);
      setFormaPagamento('dinheiro');
      setPagina(1);
      carregarDados(1);
    } catch (err) {
      notificarErro(extrairMensagemErro(err));
    } finally {
      setRegistrando(false);
    }
  };

  const abrirCancelar = (venda) => {
    setVendaCancelar(venda);
    setMotivoCancelamento('');
    setModalCancelarAberto(true);
  };

  const confirmarCancelamento = async () => {
    setCancelando(true);
    try {
      await vendasService.cancelar(vendaCancelar.id, motivoCancelamento || undefined);
      sucesso('Venda cancelada e estoque revertido.');
      setModalCancelarAberto(false);
      carregarDados(pagina);
    } catch (err) {
      notificarErro(extrairMensagemErro(err));
    } finally {
      setCancelando(false);
    }
  };

  const colunasVendas = [
    { chave: 'created_at', rotulo: 'Data', render: (v) => formatarDataHora(v.created_at) },
    { chave: 'qtd_itens', rotulo: 'Itens', render: (v) => formatarQuantidade(v.qtd_itens) },
    { chave: 'forma_pagamento', rotulo: 'Pagamento', render: (v) => rotuloFormaPagamento(v.forma_pagamento) },
    { chave: 'total', rotulo: 'Total', render: (v) => formatarMoeda(v.total), alinharDireita: true },
    {
      chave: 'status',
      rotulo: 'Status',
      render: (v) => (
        <Badge tipo={v.status === 'concluida' ? 'sucesso' : 'erro'} icone={v.status === 'concluida' ? CheckCircle2 : XCircle}>
          {rotuloStatusVenda(v.status)}
        </Badge>
      ),
    },
  ];

  return (
    <div>
      <div className="pagina-cabecalho">
        <div>
          <h2>Vendas</h2>
          <p>Registre novas vendas e acompanhe o histórico.</p>
        </div>
      </div>

      <Card titulo="Nova venda" style={{ marginBottom: '1.25rem' }}>
        {produtos.length === 0 && !carregandoVendas ? (
          <Alert tipo="aviso">Nenhum produto com estoque disponível. Cadastre produtos na página Produtos.</Alert>
        ) : (
          <>
            <div className="venda-form-grid">
              <Select label="Produto" value={produtoSelecionado} onChange={(e) => setProdutoSelecionado(e.target.value)}>
                <option value="">Selecione um produto...</option>
                {produtos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome} — {formatarMoeda(p.preco_venda)} ({formatarQuantidade(p.quantidade)} disp.)
                  </option>
                ))}
              </Select>
              {/* ⭐ Aceita unidades (1, 2, 3...) ou quilos com casas decimais (1,5 kg) */}
              <Input
                label="Quantidade / Quilo (kg)"
                type="number"
                min="0.001"
                step="any"
                inputMode="decimal"
                value={quantidade}
                onChange={(e) => setQuantidade(e.target.value)}
                dica={
                  produtoAtual?.tipo_venda === 'kg'
                    ? 'Em quilos. Ex.: 1,5 = um quilo e meio.'
                    : produtoAtual
                      ? `Vendido por ${rotuloTipoVenda(produtoAtual.tipo_venda).toLowerCase()}.`
                      : 'Unidades ou quilos (ex.: 1,5 kg).'
                }
              />
              <Button icone={Plus} onClick={adicionarAoCarrinho} disabled={!produtoSelecionado}>
                Adicionar
              </Button>
            </div>

            {carrinho.length > 0 ? (
              <>
                <ul className="carrinho-lista" aria-label="Itens da venda atual">
                  {carrinho.map((i) => (
                    <li className="carrinho-item" key={i.produto_id}>
                      <span>{i.nome} × {formatarQuantidade(i.quantidade)}{i.tipo_venda === 'kg' ? ' kg' : ''}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <strong>{formatarMoeda(i.preco_venda * i.quantidade)}</strong>
                        <Button
                          variante="ghost"
                          tamanho="sm"
                          icone={Trash2}
                          onClick={() => removerDoCarrinho(i.produto_id)}
                          aria-label={`Remover ${i.nome} da venda`}
                        >
                          <span className="sr-only">Remover</span>
                        </Button>
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="carrinho-totais">
                  <span>Total: <strong>{formatarMoeda(total)}</strong></span>
                </div>

                <div className="form-grid-2">
                  <Select label="Forma de pagamento" value={formaPagamento} onChange={(e) => setFormaPagamento(e.target.value)}>
                    <option value="dinheiro">Dinheiro</option>
                    <option value="pix">Pix</option>
                    <option value="cartao_credito">Cartão de crédito</option>
                    <option value="cartao_debito">Cartão de débito</option>
                  </Select>
                </div>

                <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                  <Button variante="secondary" onClick={() => setCarrinho([])} disabled={registrando}>Cancelar venda</Button>
                  <Button icone={ShoppingCart} onClick={finalizarVenda} carregando={registrando}>Finalizar venda</Button>
                </div>
              </>
            ) : (
              <p style={{ color: 'var(--texto-secundario)', marginTop: '1rem' }}>Adicione produtos para montar a venda.</p>
            )}
          </>
        )}
      </Card>

      <Card titulo="Histórico de vendas">
        {carregandoVendas ? (
          <Loading texto="Carregando vendas..." />
        ) : erroCarregar ? (
          <Alert tipo="erro">{erroCarregar}</Alert>
        ) : (
          <Table
            colunas={colunasVendas}
            dados={vendas}
            vazioTitulo="Nenhuma venda registrada ainda."
            acoes={(v) => v.status === 'concluida' ? (
              <Button variante="ghost-perigo" tamanho="sm" icone={XCircle} onClick={() => abrirCancelar(v)} aria-label={`Cancelar venda #${v.id}`}>
                Cancelar
              </Button>
            ) : <span style={{ color: 'var(--texto-secundario)', fontSize: '0.85rem' }}>—</span>}
          />
        )}
        {!carregandoVendas && !erroCarregar && (
          <Pagination
            paginaAtual={paginacaoVendas?.pagina || 1}
            totalPaginas={paginacaoVendas?.totalPaginas || 1}
            onMudarPagina={setPagina}
          />
        )}
      </Card>

      <ConfirmModal
        aberto={modalCancelarAberto}
        titulo="Cancelar venda"
        mensagem={`A venda #${vendaCancelar?.id} será cancelada e os itens devolvidos ao estoque. Deseja continuar?`}
        onFechar={() => setModalCancelarAberto(false)}
        onConfirmar={confirmarCancelamento}
        confirmando={cancelando}
        textoCancelar="Voltar"
        textoConfirmar="Confirmar cancelamento"
        icone={XCircle}
      >
        <Input
          label="Motivo do cancelamento"
          dica="Opcional"
          value={motivoCancelamento}
          onChange={(e) => setMotivoCancelamento(e.target.value)}
        />
      </ConfirmModal>
    </div>
  );
}
