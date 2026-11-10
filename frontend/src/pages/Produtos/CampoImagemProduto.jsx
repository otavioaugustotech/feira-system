import { useId, useRef, useState } from 'react';
import { ImagePlus, Link2, Trash2, Upload } from 'lucide-react';
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

  /* ⭐ Imagem por link (URL): confere se o endereço é https e se a imagem
     realmente abre antes de usar. */
  const [link, setLink] = useState('');
  const [testandoLink, setTestandoLink] = useState(false);

  const usarLink = () => {
    const url = link.trim();
    if (!/^https:\/\/[^\s"'<>]+$/i.test(url)) {
      setErro('Cole um link de imagem que comece com https://');
      return;
    }
    setErro('');
    setTestandoLink(true);
    const img = new Image();
    img.referrerPolicy = 'no-referrer';
    img.onload = () => {
      setTestandoLink(false);
      setLink('');
      onAlterar(url);
    };
    img.onerror = () => {
      setTestandoLink(false);
      setErro('Não foi possível abrir a imagem desse link. Confira se é o endereço da própria imagem (termina em .jpg, .png, .webp...).');
    };
    img.src = url;
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
            <img src={valor} alt={nomeProduto ? `Imagem de ${nomeProduto}` : 'Imagem do produto'} referrerPolicy="no-referrer" />
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
            Opcional. JPG, PNG ou WEBP de até 10 MB. Você também pode arrastar a foto para o quadro ou colar um link.
          </p>
          <div className="campo-imagem-link">
            <label htmlFor={`${idDica}-link`} className="sr-only">Link (URL) da imagem</label>
            <input
              id={`${idDica}-link`}
              className="input"
              type="url"
              inputMode="url"
              placeholder="Ou cole o link da imagem (https://...)"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              onKeyDown={(e) => {
                /* Enter usa o link sem enviar o formulário do produto */
                if (e.key === 'Enter') { e.preventDefault(); usarLink(); }
              }}
            />
            <Button
              type="button"
              variante="secondary"
              tamanho="sm"
              icone={Link2}
              onClick={usarLink}
              carregando={testandoLink}
              disabled={!link.trim()}
            >
              Usar link
            </Button>
          </div>
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
      {imagem ? <img src={imagem} alt="" referrerPolicy="no-referrer" loading="lazy" /> : <span aria-hidden="true">{(nome || '?').trim().charAt(0).toUpperCase()}</span>}
    </span>
  );
}
