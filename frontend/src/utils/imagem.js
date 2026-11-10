/* ═══════════════════════════════════════════════════════════
   utils/imagem.js — ⭐ NOVO
   Prepara a foto de perfil ANTES de enviar ao servidor:
   corta no meio em formato quadrado e reduz para 256x256.
   Uma foto de celular de 5 MB vira ~20-40 KB — o banco não incha
   e a página carrega rápido.
   ═══════════════════════════════════════════════════════════ */

const TAMANHO_FINAL = 256;
const TIPOS_ACEITOS = ['image/jpeg', 'image/png', 'image/webp'];
const TAMANHO_MAX_ARQUIVO = 10 * 1024 * 1024; /* 10 MB */

export function validarArquivoImagem(arquivo) {
  if (!arquivo) return 'Nenhum arquivo selecionado.';
  if (!TIPOS_ACEITOS.includes(arquivo.type)) return 'Escolha uma imagem JPG, PNG ou WEBP.';
  if (arquivo.size > TAMANHO_MAX_ARQUIVO) return 'A imagem é muito grande (máximo 10 MB).';
  return null;
}

export function prepararFotoPerfil(arquivo) {
  return recortarQuadrado(arquivo, TAMANHO_FINAL);
}

/* ⭐ Imagem do produto: mesmo recorte quadrado, um pouco maior (320x320),
   para aparecer nítida no cadastro e na lista de produtos (~20-40 KB). */
export function prepararImagemProduto(arquivo) {
  return recortarQuadrado(arquivo, 320);
}

function recortarQuadrado(arquivo, TAMANHO_FINAL) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(arquivo);
    const img = new Image();

    img.onload = () => {
      /* recorte quadrado central */
      const lado = Math.min(img.width, img.height);
      const sx = (img.width - lado) / 2;
      const sy = (img.height - lado) / 2;

      const canvas = document.createElement('canvas');
      canvas.width = TAMANHO_FINAL;
      canvas.height = TAMANHO_FINAL;
      const ctx = canvas.getContext('2d');
      /* fundo branco para PNG transparente não ficar preto no JPEG */
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, TAMANHO_FINAL, TAMANHO_FINAL);
      ctx.drawImage(img, sx, sy, lado, lado, 0, 0, TAMANHO_FINAL, TAMANHO_FINAL);

      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Não foi possível ler essa imagem. Tente outra.'));
    };

    img.src = url;
  });
}
