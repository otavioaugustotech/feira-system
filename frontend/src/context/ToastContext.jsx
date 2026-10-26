import { createContext, useCallback, useMemo, useRef, useState } from 'react';
import ToastContainer from '../components/ui/Toast.jsx';

export const ToastContext = createContext(null);

let contador = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const remover = useCallback((id) => {
    setToasts((atual) => atual.filter((t) => t.id !== id));
    clearTimeout(timers.current[id]);
    delete timers.current[id];
  }, []);

  const notificar = useCallback((mensagem, tipo = 'info', duracao = 5000) => {
    const id = ++contador;
    setToasts((atual) => [...atual, { id, mensagem, tipo }]);
    timers.current[id] = setTimeout(() => remover(id), duracao);
    return id;
  }, [remover]);

  const valor = useMemo(
    () => ({
      notificar,
      sucesso: (msg, d) => notificar(msg, 'sucesso', d),
      erro: (msg, d) => notificar(msg, 'erro', d),
      info: (msg, d) => notificar(msg, 'info', d),
      remover,
    }),
    [notificar, remover]
  );

  return (
    <ToastContext.Provider value={valor}>
      {children}
      <ToastContainer toasts={toasts} onRemover={remover} />
    </ToastContext.Provider>
  );
}
