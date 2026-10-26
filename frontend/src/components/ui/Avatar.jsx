/* ═══════════════════════════════════════════════════════════
   components/ui/Avatar.jsx — ⭐ NOVO
   Mostra a foto do usuário; se não tiver foto (ou ela não carregar),
   mostra as iniciais do nome, como era antes.
   ═══════════════════════════════════════════════════════════ */
import { useEffect, useState } from 'react';
import './ui.css';

export const iniciaisDe = (nome = '') =>
  nome
    .trim()
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('') || 'FS';

export default function Avatar({ nome, foto, tamanho = 38, className = '' }) {
  const [falhou, setFalhou] = useState(false);

  /* se a foto mudar, tenta carregar de novo */
  useEffect(() => setFalhou(false), [foto]);

  const mostrarFoto = foto && !falhou;

  return (
    <span
      className={`avatar ${className}`}
      aria-hidden="true"
      style={{ width: tamanho, height: tamanho, fontSize: Math.round(tamanho * 0.36) }}
    >
      {mostrarFoto ? (
        <img
          src={foto}
          alt=""
          /* necessário para fotos do Google carregarem em localhost */
          referrerPolicy="no-referrer"
          onError={() => setFalhou(true)}
        />
      ) : (
        iniciaisDe(nome)
      )}
    </span>
  );
}
