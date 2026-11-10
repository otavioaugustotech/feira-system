import { useId, useRef, useState } from 'react';
import { ImagePlus, Trash2, Upload } from 'lucide-react';
import Button from '../../components/ui/Button.jsx';
import { validarArquivoImagem, prepararImagemProduto } from '../../utils/imagem.js';
import './produtos.css';

/**
 * ⭐ Campo "Imagem do produto" do cadastro/edição.
 * - Clicar em "Escolher imagem" (ou arrastar uma imagem para o quadro)
 *   abre a foto, que é recortada em quadrado e reduzida para 320x320
 *   no próprio navegador antes de ir para o servidor.
 * - "Remover imagem" volta o produto para sem imagem.
 * valor: imagem em base64 (data:image/...) ou null
 */
export default function CampoImagemProduto({ valor, onAlterar, nomeProduto }) {
  const inputRef = useRef(null);
  const idDica = useId();
  const [erro, setErro] = useState('');
  const [processando, setProcessando] = useState(false);
  const [arrastando, setArrastando] = useState(false);

  const usarArquivo = async (arquivo) => {
    const problema = validarArquivoImagem(arquivo);
    if (problema) {
      setErro(problema);
      return;
    }
    setErro('');
    setProcessando(true);
    try {
      onAlterar(await prepararImagemProduto(arquivo));
    } catch (e) {
      setErro(e.message);
    } finally {
      setProcessando(false);
    }
  };

  const aoEscolher = (e) => {
    const arquivo = e.target.files?.[0];
    e.target.value = ''; /* permite escolher o mesmo arquivo de novo */
    if (arquivo) usarArquivo(arquivo);
  };

  const aoSoltar = (e) => {
    e.preventDefault();
    setArrastando(false);
    const arquivo = e.dataTransfer.files?.[0];
    if (arquivo) usarArquivo(arquivo);
  };

  return (
    <div className="campo campo-imagem-produto">
      <span className="campo-imagem-rotulo">Imagem do produto</span>
      <div className="campo-imagem-corpo">
        <button
          type="button"
          className={`campo-imagem-quadro ${arrastando ? 'arrastando' : ''} ${valor ? 'com-imagem' : ''}`}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setArrastando(true); }}
          onDragLeave={() => setArrastando(false)}
          onDrop={aoSoltar}
          aria-label={valor ? 'Trocar imagem do produto' : 'Escolher imagem do produto'}
          aria-describedby={idDica}
        >
          {valor ? (
            <img src={valor} alt={nomeProduto ? `Imagem de ${nomeProduto}` : 'Imagem do produto'} />
          ) : (
            <span className="campo-imagem-vazio">
              <ImagePlus size={28} aria-hidden="true" />
              <span>{processando ? 'Preparando...' : 'Adicionar'}</span>
            </span>
          )}
        </button>

        <div className="campo-imagem-acoes">
          <Button
            type="button"
            variante="secondary"
            tamanho="sm"
            icone={Upload}
            onClick={() => inputRef.current?.click()}
            carregando={processando}
          >
            {valor ? 'Trocar imagem' : 'Escolher imagem'}
          </Button>
          {valor && (
            <Button type="button" variante="ghost-perigo" tamanho="sm" icone={Trash2} onClick={() => onAlterar(null)}>
              Remover imagem
            </Button>
          )}
          <p id={idDica} className="dica">
            Opcional. JPG, PNG ou WEBP de até 10 MB. Você também pode arrastar a foto para o quadro.
          </p>
          {erro && <p className="erro-msg" role="alert">{erro}</p>}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="campo-imagem-input"
        onChange={aoEscolher}
        tabIndex={-1}
        aria-hidden="true"
      />
    </div>
  );
}

/** Miniatura usada na lista de produtos (imagem ou ícone de "sem imagem"). */
export function MiniaturaProduto({ imagem, nome, tamanho = 44 }) {
  return (
    <span className="produto-miniatura" style={{ width: tamanho, height: tamanho }}>
      {imagem ? <img src={imagem} alt="" /> : <span aria-hidden="true">{(nome || '?').trim().charAt(0).toUpperCase()}</span>}
    </span>
  );
}
