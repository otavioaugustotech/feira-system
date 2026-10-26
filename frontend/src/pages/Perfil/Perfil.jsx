/* ═══════════════════════════════════════════════════════════
   pages/Perfil/Perfil.jsx — ⭐ VERSÃO COMPLETA com edição de perfil e foto
   Modo "ver": mostra os dados como antes, agora com a foto.
   Modo "editar": troca nome, nome da banca e foto (escolher / remover).
   A foto é cortada em quadrado e reduzida para 256x256 no navegador
   (utils/imagem.js) antes de ir para o servidor.
   ═══════════════════════════════════════════════════════════ */
import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  UserCircle, Mail, Store, KeyRound, LogOut, Calendar,
  Pencil, Camera, Trash2, Save, X,
} from 'lucide-react';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Alert from '../../components/ui/Alert.jsx';
import Avatar from '../../components/ui/Avatar.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import { useToast } from '../../hooks/useToast.js';
import { extrairMensagemErro } from '../../services/api.js';
import { formatarData } from '../../utils/formatters.js';
import { validarArquivoImagem, prepararFotoPerfil } from '../../utils/imagem.js';
import './perfil.css';

function LinhaInfo({ icone: Icone, rotulo, valor }) {
  return (
    <div className="perfil-linha">
      <Icone size={18} aria-hidden="true" className="perfil-linha-icone" />
      <div>
        <dt>{rotulo}</dt>
        <dd>{valor}</dd>
      </div>
    </div>
  );
}

export default function Perfil() {
  const { usuario, sair, atualizarPerfil } = useAuth();
  const { sucesso } = useToast();
  const inputArquivoRef = useRef(null);

  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState({ nome: '', nome_banca: '' });
  /* foto: undefined = não mexeu | null = remover | 'data:image/...' = nova */
  const [novaFoto, setNovaFoto] = useState(undefined);
  const [erros, setErros] = useState({});
  const [erroGeral, setErroGeral] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [processandoFoto, setProcessandoFoto] = useState(false);

  const fotoAtual = novaFoto === undefined ? usuario?.foto_url : novaFoto;

  const abrirEdicao = () => {
    setForm({ nome: usuario?.nome || '', nome_banca: usuario?.nome_banca || '' });
    setNovaFoto(undefined);
    setErros({});
    setErroGeral('');
    setEditando(true);
  };

  const cancelar = () => {
    setNovaFoto(undefined);
    setErros({});
    setErroGeral('');
    setEditando(false);
  };

  const escolherFoto = async (e) => {
    const arquivo = e.target.files?.[0];
    e.target.value = ''; /* permite escolher o mesmo arquivo de novo */
    if (!arquivo) return;

    const problema = validarArquivoImagem(arquivo);
    if (problema) {
      setErroGeral(problema);
      return;
    }

    setErroGeral('');
    setProcessandoFoto(true);
    try {
      setNovaFoto(await prepararFotoPerfil(arquivo));
    } catch (err) {
      setErroGeral(err.message);
    } finally {
      setProcessandoFoto(false);
    }
  };

  const salvar = async (e) => {
    e.preventDefault();
    setErroGeral('');

    const novosErros = {};
    if (!form.nome.trim()) novosErros.nome = 'Informe seu nome.';
    else if (form.nome.trim().length > 150) novosErros.nome = 'Nome muito longo (máximo 150 letras).';
    if (form.nome_banca.trim().length > 150) novosErros.nome_banca = 'Nome muito longo (máximo 150 letras).';
    setErros(novosErros);
    if (Object.keys(novosErros).length > 0) return;

    const dados = { nome: form.nome.trim(), nome_banca: form.nome_banca.trim() || null };
    if (novaFoto !== undefined) dados.foto = novaFoto;

    setSalvando(true);
    try {
      await atualizarPerfil(dados);
      sucesso('Perfil atualizado com sucesso!');
      setNovaFoto(undefined);
      setEditando(false);
    } catch (err) {
      setErroGeral(extrairMensagemErro(err));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div>
      <div className="pagina-cabecalho">
        <div>
          <h2>Perfil</h2>
          <p>Informações da sua conta no Feira System.</p>
        </div>
      </div>

      <Card>
        {!editando ? (
          /* ═════════════ MODO VER ═════════════ */
          <>
            <div className="perfil-topo">
              <Avatar nome={usuario?.nome} foto={usuario?.foto_url} tamanho={72} />
              <div className="perfil-topo-texto">
                <h3>{usuario?.nome}</h3>
                <p>{usuario?.nome_banca || 'Sem nome de banca definido'}</p>
              </div>
            </div>

            <dl className="perfil-lista">
              <LinhaInfo icone={UserCircle} rotulo="Nome completo" valor={usuario?.nome} />
              <LinhaInfo icone={Mail} rotulo="E-mail" valor={usuario?.email} />
              <LinhaInfo icone={Store} rotulo="Nome da banca" valor={usuario?.nome_banca || '—'} />
              {usuario?.created_at && (
                <LinhaInfo icone={Calendar} rotulo="Conta criada em" valor={formatarData(usuario.created_at)} />
              )}
            </dl>

            <div className="perfil-acoes">
              <Button icone={Pencil} onClick={abrirEdicao}>Editar perfil</Button>
              <Link to="/esqueci-senha" className="btn btn-secondary">
                <KeyRound size={18} aria-hidden="true" /> <span>Alterar senha</span>
              </Link>
              <Button variante="danger" icone={LogOut} onClick={sair}>Sair da conta</Button>
            </div>
          </>
        ) : (
          /* ═════════════ MODO EDITAR ═════════════ */
          <form onSubmit={salvar} noValidate>
            <h3 className="perfil-titulo-edicao">Editar perfil</h3>

            {erroGeral && <Alert tipo="erro">{erroGeral}</Alert>}

            <div className="perfil-foto-edicao">
              <Avatar nome={form.nome || usuario?.nome} foto={fotoAtual} tamanho={96} />
              <div className="perfil-foto-botoes">
                <input
                  ref={inputArquivoRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={escolherFoto}
                  className="perfil-input-arquivo"
                  id="perfil-foto"
                  aria-label="Escolher foto de perfil"
                />
                <Button
                  variante="secondary"
                  icone={Camera}
                  carregando={processandoFoto}
                  onClick={() => inputArquivoRef.current?.click()}
                >
                  {fotoAtual ? 'Trocar foto' : 'Escolher foto'}
                </Button>
                {fotoAtual && (
                  <Button variante="secondary" icone={Trash2} onClick={() => setNovaFoto(null)}>
                    Remover foto
                  </Button>
                )}
                <p className="perfil-foto-dica">JPG, PNG ou WEBP, até 10 MB. A foto é cortada em formato quadrado.</p>
              </div>
            </div>

            <Input
              label="Nome completo"
              obrigatorio
              autoComplete="name"
              value={form.nome}
              onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
              erro={erros.nome}
            />
            <Input
              label="Nome da banca"
              dica="Opcional — como sua banca é conhecida na feira"
              autoComplete="organization"
              value={form.nome_banca}
              onChange={(e) => setForm((f) => ({ ...f, nome_banca: e.target.value }))}
              erro={erros.nome_banca}
            />
            <Input
              label="E-mail"
              type="email"
              value={usuario?.email || ''}
              disabled
              dica="O e-mail não pode ser alterado."
            />

            <div className="perfil-acoes">
              <Button type="submit" icone={Save} carregando={salvando} disabled={processandoFoto}>
                Salvar alterações
              </Button>
              <Button variante="secondary" icone={X} onClick={cancelar} disabled={salvando}>
                Cancelar
              </Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}
