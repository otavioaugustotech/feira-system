/* ═══════════════════════════════════════════════════════════
   components/auth/AvisoServidorLento.jsx — ⭐ NOVO
   No plano gratuito do Render a API "dorme" sem uso e o primeiro login
   pode levar ~30-50 s. Em vez de um botão girando sem explicação, depois
   de alguns segundos mostramos que o servidor está iniciando.
   ═══════════════════════════════════════════════════════════ */
import { useEffect, useState } from 'react';
import Alert from '../ui/Alert.jsx';

const ESPERA_MS = 5000;

export default function AvisoServidorLento({ ativo }) {
  const [lento, setLento] = useState(false);

  useEffect(() => {
    if (!ativo) {
      setLento(false);
      return undefined;
    }
    const timer = window.setTimeout(() => setLento(true), ESPERA_MS);
    return () => window.clearTimeout(timer);
  }, [ativo]);

  if (!lento) return null;
  return (
    <Alert tipo="info">
      O servidor está iniciando. Na primeira vez isso pode levar até um minuto, aguarde sem fechar a página.
    </Alert>
  );
}
