import './ui.css';
import EmptyState from './EmptyState.jsx';

/**
 * Tabela acessível e responsiva.
 * colunas: [{ chave, rotulo, render?(linha), alinharDireita? }]
 * Em telas pequenas (<=720px), a mesma informação é reorganizada em
 * cards (ver .tabela-cards no CSS) em vez de forçar rolagem apertada.
 */
export default function Table({ colunas, dados, legenda, chaveLinha = 'id', acoes, vazioTitulo }) {
  if (!dados || dados.length === 0) {
    return <EmptyState titulo={vazioTitulo || 'Nenhum registro encontrado.'} />;
  }

  return (
    <>
      <div className="tabela-wrapper">
        <table className="tabela">
          {legenda && <caption>{legenda}</caption>}
          <thead>
            <tr>
              {colunas.map((c) => (
                <th key={c.chave} scope="col" style={c.alinharDireita ? { textAlign: 'right' } : undefined}>
                  {c.rotulo}
                </th>
              ))}
              {acoes && <th scope="col" className="col-acoes">Ações</th>}
            </tr>
          </thead>
          <tbody>
            {dados.map((linha) => (
              <tr key={linha[chaveLinha]}>
                {colunas.map((c) => (
                  <td key={c.chave} style={c.alinharDireita ? { textAlign: 'right' } : undefined}>
                    {c.render ? c.render(linha) : linha[c.chave]}
                  </td>
                ))}
                {acoes && <td className="col-acoes">{acoes(linha)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="tabela-cards">
        {dados.map((linha) => (
          <div className="tabela-card" key={linha[chaveLinha]}>
            {colunas.map((c) => (
              <div className="tabela-card-linha" key={c.chave}>
                <span className="rotulo">{c.rotulo}</span>
                <span>{c.render ? c.render(linha) : linha[c.chave]}</span>
              </div>
            ))}
            {acoes && <div className="tabela-card-acoes">{acoes(linha)}</div>}
          </div>
        ))}
      </div>
    </>
  );
}
