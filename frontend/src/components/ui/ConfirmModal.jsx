import Modal from './Modal.jsx';
import Button from './Button.jsx';

/**
 * Modal de confirmação reaproveitável — extraído de 3 modais quase idênticos
 * que existiam espalhados (cancelar venda, remover produto, excluir meta).
 *
 * `mensagem` aceita texto simples ou JSX (ex.: <strong>{nome}</strong> no meio
 * da frase). `children`, se passado, entra entre a mensagem e os botões —
 * usado por telas que precisam de um campo extra (ex.: "motivo do
 * cancelamento" na venda).
 */
export default function ConfirmModal({
  aberto,
  titulo,
  mensagem,
  children,
  onFechar,
  onConfirmar,
  confirmando = false,
  textoCancelar = 'Cancelar',
  textoConfirmar = 'Confirmar',
  icone,
  varianteConfirmar = 'danger',
}) {
  return (
    <Modal aberto={aberto} titulo={titulo} onFechar={onFechar}>
      {mensagem && <p>{mensagem}</p>}
      {children}
      <div className="modal-acoes">
        <Button variante="secondary" onClick={onFechar}>{textoCancelar}</Button>
        <Button variante={varianteConfirmar} onClick={onConfirmar} carregando={confirmando} icone={icone}>
          {textoConfirmar}
        </Button>
      </div>
    </Modal>
  );
}
