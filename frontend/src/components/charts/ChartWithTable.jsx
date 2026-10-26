import { useId, useState } from 'react';
import { Table2, BarChart3 } from 'lucide-react';
import './charts.css';

/**
 * Envolve qualquer gráfico com:
 *  - aria-label / descrição textual do que o gráfico mostra;
 *  - um botão para alternar para uma tabela de dados equivalente,
 *    exigido pelo prompt para usuários que não conseguem visualizar
 *    o gráfico (leitores de tela, baixa visão, etc).
 *
 * linhas: [{ rotulo, valor, valorFormatado? }]
 */
export default function ChartWithTable({ titulo, resumoTextual, linhas, colunaValor = 'Valor', children }) {
  const [mostrarTabela, setMostrarTabela] = useState(false);
  const id = useId();

  return (
    <div className="chart-with-table">
      <div className="chart-with-table-header">
        <h4 id={`${id}-titulo`}>{titulo}</h4>
        <button
          type="button"
          className="chart-toggle-btn"
          onClick={() => setMostrarTabela((v) => !v)}
          aria-pressed={mostrarTabela}
        >
          {mostrarTabela ? <BarChart3 size={16} aria-hidden="true" /> : <Table2 size={16} aria-hidden="true" />}
          {mostrarTabela ? 'Ver gráfico' : 'Ver como tabela'}
        </button>
      </div>

      {resumoTextual && (
        <p className="chart-resumo-textual sr-only-quando-grafico">{resumoTextual}</p>
      )}

      {mostrarTabela ? (
        <table className="tabela chart-tabela-alt" aria-labelledby={`${id}-titulo`}>
          <thead>
            <tr>
              <th scope="col">Item</th>
              <th scope="col">{colunaValor}</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((l) => (
              <tr key={l.rotulo}>
                <td>{l.rotulo}</td>
                <td>{l.valorFormatado ?? l.valor}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div role="img" aria-label={resumoTextual || titulo} className="chart-canvas-area">
          {children}
        </div>
      )}
    </div>
  );
}
