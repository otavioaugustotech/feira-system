import { Info } from 'lucide-react';
import './filtros.css';

/**
 * ⭐ NOVO — "Como é calculado?": mostra, ao clicar, a memória de cálculo
 * de um indicador, o que ele representa e para que serve.
 * Usa <details>/<summary>, que já é acessível por teclado e leitor de tela.
 */
export default function ComoCalculado({ formula, representa, paraQue }) {
  return (
    <details className="como-calculado">
      <summary><Info size={13} aria-hidden="true" /> Como é calculado?</summary>
      <p><strong>Cálculo:</strong> {formula}</p>
      {representa && <p><strong>O que representa:</strong> {representa}</p>}
      {paraQue && <p><strong>Para que serve:</strong> {paraQue}</p>}
    </details>
  );
}
