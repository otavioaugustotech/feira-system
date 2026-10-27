/* ═══════════════════════════════════════════════════════════
   pages/Contatos/Contatos.jsx — ⭐ NOVO — só para o administrador
   Lista quem preencheu o "Fale conosco" da Landing Page (tabela leads):
   contadores por status, busca, filtro, troca de status e exclusão.
   ═══════════════════════════════════════════════════════════ */
import { useEffect, useState } from 'react';
import { Search, Trash2, Mail, MessageCircle } from 'lucide-react';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Select from '../../components/ui/Select.jsx';
import Table from '../../components/ui/Table.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Pagination from '../../components/ui/Pagination.jsx';
import ConfirmModal from '../../components/ui/ConfirmModal.jsx';
import Loading from '../../components/ui/Loading.jsx';
import Alert from '../../components/ui/Alert.jsx';
import { leadsService } from '../../services/leadsService.js';
import { useToast } from '../../hooks/useToast.js';
import { extrairMensagemErro } from '../../services/api.js';
import { formatarDataHora } from '../../utils/formatters.js';
import '../shared/list-page.css';
import './contatos.css';

const STATUS = [
  { valor: 'novo', rotulo: 'Novo', badge: 'info' },
  { valor: 'em_contato', rotulo: 'Em contato', badge: 'alerta' },
  { valor: 'convertido', rotulo: 'Virou cliente', badge: 'sucesso' },
  { valor: 'descartado', rotulo: 'Descartado', badge: 'neutro' },
];

/* Telefone guardado só com dígitos → link do WhatsApp (assume Brasil se vier com DDD) */
const linkWhatsApp = (telefone) => {
  const digitos = String(telefone || '').replace(/\D/g, '');
  if (!digitos) return null;
  return `https://wa.me/${digitos.length <= 11 ? `55${digitos}` : digitos}`;
};

const formatarTelefone = (telefone) => {
  const d = String(telefone || '').replace(/\D/g, '');
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return d;
};

export default function Contatos() {
  const { sucesso, erro: notificarErro } = useToast();

  const [dados, setDados] = useState({ itens: [], total: 0, total_paginas: 1, contagem: {} });
  const [carregando, setCarregando] = useState(true);
  const [erroCarregar, setErroCarregar] = useState('');

  const [status, setStatus] = useState('');
  const [busca, setBusca] = useState('');
  const [buscaAplicada, setBuscaAplicada] = useState('');
  const [pagina, setPagina] = useState(1);

  const [atualizandoId, setAtualizandoId] = useState(null);
  const [contatoExcluir, setContatoExcluir] = useState(null);
  const [excluindo, setExcluindo] = useState(false);

  const carregar = async () => {
    setCarregando(true);
    setErroCarregar('');
    try {
      const resposta = await leadsService.listar({
        status: status || undefined,
        busca: buscaAplicada || undefined,
        pagina,
      });
      setDados(resposta);
    } catch (err) {
      setErroCarregar(extrairMensagemErro(err));
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => { carregar(); }, [status, buscaAplicada, pagina]);

  const aplicarBusca = (e) => {
    e.preventDefault();
    setPagina(1);
    setBuscaAplicada(busca.trim());
  };

  const filtrarStatus = (valor) => {
    setPagina(1);
    setStatus((atual) => (atual === valor ? '' : valor));
  };

  const mudarStatus = async (contato, novoStatus) => {
    setAtualizandoId(contato.id);
    try {
      await leadsService.atualizarStatus(contato.id, novoStatus);
      sucesso(`${contato.nome}: ${STATUS.find((s) => s.valor === novoStatus)?.rotulo}.`);
      carregar();
    } catch (err) {
      notificarErro(extrairMensagemErro(err));
    } finally {
      setAtualizandoId(null);
    }
  };

  const confirmarExcluir = async () => {
    setExcluindo(true);
    try {
      await leadsService.remover(contatoExcluir.id);
      sucesso('Contato excluído.');
      setContatoExcluir(null);
      carregar();
    } catch (err) {
      notificarErro(extrairMensagemErro(err));
    } finally {
      setExcluindo(false);
    }
  };

  const colunas = [
    { chave: 'created_at', rotulo: 'Recebido em', render: (c) => formatarDataHora(c.created_at) },
    {
      chave: 'nome',
      rotulo: 'Nome',
      render: (c) => (
        <div className="contato-nome">
          <strong>{c.nome}</strong>
          {c.nome_banca && <span>{c.nome_banca}</span>}
        </div>
      ),
    },
    {
      chave: 'email',
      rotulo: 'Contato',
      render: (c) => (
        <div className="contato-meios">
          <a href={`mailto:${c.email}`}><Mail size={15} aria-hidden="true" /> {c.email}</a>
          {c.telefone && (
            <a href={linkWhatsApp(c.telefone)} target="_blank" rel="noopener noreferrer">
              <MessageCircle size={15} aria-hidden="true" /> {formatarTelefone(c.telefone)}
              <span className="sr-only"> (abre o WhatsApp)</span>
            </a>
          )}
        </div>
      ),
    },
    {
      chave: 'tipo',
      rotulo: 'Assunto',
      render: (c) => (c.tipo === 'demonstracao'
        ? <Badge tipo="info">Demonstração</Badge>
        : <Badge tipo="neutro">Dúvida</Badge>),
    },
    {
      chave: 'mensagem',
      rotulo: 'Mensagem',
      render: (c) => (c.mensagem ? <p className="contato-mensagem">{c.mensagem}</p> : '—'),
    },
    {
      chave: 'status',
      rotulo: 'Situação',
      render: (c) => (
        <select
          className="select contato-status"
          value={c.status}
          disabled={atualizandoId === c.id}
          onChange={(e) => mudarStatus(c, e.target.value)}
          aria-label={`Situação do contato ${c.nome}`}
        >
          {STATUS.map((s) => <option key={s.valor} value={s.valor}>{s.rotulo}</option>)}
        </select>
      ),
    },
  ];

  return (
    <div>
      <div className="pagina-cabecalho">
        <div>
          <h2>Contatos</h2>
          <p>Pessoas que preencheram o "Fale conosco" da Landing Page.</p>
        </div>
      </div>

      <div className="contatos-resumo" role="group" aria-label="Filtrar por situação">
        {STATUS.map((s) => (
          <button
            key={s.valor}
            type="button"
            className={`contatos-resumo-item ${status === s.valor ? 'ativo' : ''}`}
            aria-pressed={status === s.valor}
            onClick={() => filtrarStatus(s.valor)}
          >
            <span className="contatos-resumo-numero">{dados.contagem?.[s.valor] ?? 0}</span>
            <Badge tipo={s.badge}>{s.rotulo}</Badge>
          </button>
        ))}
      </div>

      <Card>
        <form className="pagina-filtros" onSubmit={aplicarBusca} role="search">
          <div className="campo-busca">
            <Input
              label="Buscar"
              placeholder="Nome, e-mail, telefone ou banca"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
          <Select label="Situação" value={status} onChange={(e) => { setPagina(1); setStatus(e.target.value); }}>
            <option value="">Todas</option>
            {STATUS.map((s) => <option key={s.valor} value={s.valor}>{s.rotulo}</option>)}
          </Select>
          <Button type="submit" variante="secondary" icone={Search}>Buscar</Button>
        </form>

        {carregando ? (
          <Loading texto="Carregando contatos..." />
        ) : erroCarregar ? (
          <Alert tipo="erro">{erroCarregar}</Alert>
        ) : (
          <>
            <p className="contatos-total" aria-live="polite">
              {dados.total === 1 ? '1 contato encontrado' : `${dados.total} contatos encontrados`}
            </p>
            <Table
              colunas={colunas}
              dados={dados.itens}
              legenda="Contatos recebidos pela Landing Page"
              vazioTitulo={status || buscaAplicada ? 'Nenhum contato com esse filtro.' : 'Nenhum contato recebido ainda.'}
              acoes={(c) => (
                <div className="acoes-linha">
                  <Button variante="ghost" tamanho="sm" icone={Trash2} onClick={() => setContatoExcluir(c)} aria-label={`Excluir contato ${c.nome}`}>
                    Excluir
                  </Button>
                </div>
              )}
            />
            <Pagination paginaAtual={pagina} totalPaginas={dados.total_paginas} onMudarPagina={setPagina} />
          </>
        )}
      </Card>

      <ConfirmModal
        aberto={Boolean(contatoExcluir)}
        titulo="Excluir contato"
        mensagem={<>Excluir o contato de <strong>{contatoExcluir?.nome}</strong>? Isso não pode ser desfeito.</>}
        onFechar={() => setContatoExcluir(null)}
        onConfirmar={confirmarExcluir}
        confirmando={excluindo}
        textoConfirmar="Excluir"
        icone={Trash2}
      />
    </div>
  );
}

