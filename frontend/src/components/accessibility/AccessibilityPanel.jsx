import { useEffect, useRef } from 'react';
import {
  X, Accessibility, Sun, Moon, PauseCircle, Focus, BookOpen, RotateCcw, Check,
  AlignJustify, CaseSensitive, AlignHorizontalSpaceBetween,
} from 'lucide-react';
import { useAccessibility } from '../../hooks/useAccessibility.js';
import { useToast } from '../../hooks/useToast.js';
import './accessibility.css';

function Interruptor({ marcado, onAlternar, rotulo, id }) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={marcado}
      className="a11y-switch"
      onClick={onAlternar}
      aria-label={rotulo}
    >
      <span className="a11y-switch-bolinha" aria-hidden="true" />
    </button>
  );
}

export default function AccessibilityPanel({ aberto, onFechar }) {
  const {
    fontSize, lineSpacing, letterSpacing, wordSpacing,
    darkMode, reducedMotion, focusHighlight, readingMode, panelPosition,
    passos, definirFonte, definirFonteExata, definirLinha, definirLetra, definirPalavra,
    alternarDarkMode, alternarReducedMotion, alternarFocusHighlight, alternarReadingMode,
    definirPosicaoPainel, redefinir,
  } = useAccessibility();
  const { sucesso } = useToast();
  const painelRef = useRef(null);
  const elementoAnterior = useRef(null);

    const onFecharRef = useRef(onFechar);
  useEffect(() => {
    onFecharRef.current = onFechar;
  }, [onFechar]);

  useEffect(() => {
    if (!aberto) return undefined;

    elementoAnterior.current = document.activeElement;
    const primeiroFoco = painelRef.current?.querySelector('button, [href], input, select, [tabindex]:not([tabindex="-1"])');
    primeiroFoco?.focus();

    const aoTeclar = (e) => {
      if (e.key === 'Escape') {
        onFecharRef.current();
        return;
      }
      if (e.key !== 'Tab' || !painelRef.current) return;

      const focaveis = painelRef.current.querySelectorAll('button:not(:disabled), [href], input, select, [tabindex]:not([tabindex="-1"])');
      if (focaveis.length === 0) return;
      const primeiro = focaveis[0];
      const ultimo = focaveis[focaveis.length - 1];

      if (e.shiftKey && document.activeElement === primeiro) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault();
        primeiro.focus();
      }
    };

    document.addEventListener('keydown', aoTeclar);
    return () => {
      document.removeEventListener('keydown', aoTeclar);
      elementoAnterior.current?.focus?.();
    };
  }, [aberto]);

  if (!aberto) return null;

  const rotuloFonte = (valor) => {
    if (valor <= passos.fonte[0]) return 'Menor';
    if (valor >= passos.fonte[passos.fonte.length - 1]) return 'Maior';
    if (valor === 1) return 'Normal';
    return `${Math.round(valor * 100)}%`;
  };

  return (
    <>
      <div className="a11y-overlay" onMouseDown={onFechar} aria-hidden="true" />
      <div
        className={`a11y-painel ${panelPosition?.endsWith('left') ? 'posicao-esquerda' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="a11y-titulo"
        ref={painelRef}
      >
        <div className="a11y-painel-header">
          <h2 id="a11y-titulo">
            <Accessibility size={22} aria-hidden="true" /> Central de Acessibilidade
          </h2>
          <button className="modal-fechar" onClick={onFechar} aria-label="Fechar Central de Acessibilidade">
            <X size={22} aria-hidden="true" />
          </button>
        </div>
        <p className="a11y-painel-descricao">Personalize sua experiência de leitura e navegação.</p>

        {/* ═══ Tamanho da fonte ═══ */}
        <section className="a11y-secao" aria-labelledby="a11y-fonte-titulo">
          <h3 id="a11y-fonte-titulo">Tamanho da fonte</h3>
          <div className="a11y-grupo-botoes">
            <button
              type="button"
              className="a11y-opcao-btn"
              onClick={() => definirFonte(-1)}
              disabled={fontSize <= passos.fonte[0]}
              aria-label="Diminuir tamanho da fonte"
            >
              A−
            </button>
            <button
              type="button"
              className="a11y-opcao-btn"
              aria-pressed={fontSize === 1}
              onClick={() => definirFonteExata(1)}
              aria-label="Tamanho de fonte normal"
            >
              A
              <span className="rotulo-pequeno">{rotuloFonte(fontSize)}</span>
            </button>
            <button
              type="button"
              className="a11y-opcao-btn"
              onClick={() => definirFonte(1)}
              disabled={fontSize >= passos.fonte[passos.fonte.length - 1]}
              aria-label="Aumentar tamanho da fonte"
            >
              A+
            </button>
          </div>
        </section>

        {/* ═══ Espaçamento entre linhas ═══ */}
        <section className="a11y-secao" aria-labelledby="a11y-linha-titulo">
          <h3 id="a11y-linha-titulo"><AlignJustify size={15} aria-hidden="true" style={{ verticalAlign: -2 }} /> Espaçamento entre linhas</h3>
          <div className="a11y-grupo-botoes">
            {[{ v: 1, r: '1.0' }, { v: 1.5, r: '1.5' }, { v: 2, r: '2.0' }].map((op) => (
              <button
                key={op.v}
                type="button"
                className="a11y-opcao-btn"
                aria-pressed={lineSpacing === op.v}
                onClick={() => definirLinha(op.v)}
              >
                {op.r}
              </button>
            ))}
          </div>
        </section>

        {/* ═══ Espaçamento entre letras ═══ */}
        <section className="a11y-secao" aria-labelledby="a11y-letra-titulo">
          <h3 id="a11y-letra-titulo"><CaseSensitive size={15} aria-hidden="true" style={{ verticalAlign: -2 }} /> Espaçamento entre letras</h3>
          <div className="a11y-grupo-botoes">
            {[{ v: 0, r: 'Aa', s: 'Normal' }, { v: 1, r: 'Aa', s: 'Amplo' }, { v: 2, r: 'Aa', s: 'Muito amplo' }].map((op) => (
              <button
                key={op.v}
                type="button"
                className="a11y-opcao-btn"
                aria-pressed={letterSpacing === op.v}
                onClick={() => definirLetra(op.v)}
              >
                {op.r}
                <span className="rotulo-pequeno">{op.s}</span>
              </button>
            ))}
          </div>
        </section>

        {/* ═══ Espaçamento entre palavras ═══ */}
        <section className="a11y-secao" aria-labelledby="a11y-palavra-titulo">
          <h3 id="a11y-palavra-titulo"><AlignHorizontalSpaceBetween size={15} aria-hidden="true" style={{ verticalAlign: -2 }} /> Espaçamento entre palavras</h3>
          <div className="a11y-grupo-botoes">
            {[{ v: 0, r: 'Normal' }, { v: 2, r: 'Amplo' }, { v: 4, r: 'Muito amplo' }].map((op) => (
              <button
                key={op.v}
                type="button"
                className="a11y-opcao-btn"
                aria-pressed={wordSpacing === op.v}
                onClick={() => definirPalavra(op.v)}
                style={{ fontSize: '0.72rem' }}
              >
                {op.r}
              </button>
            ))}
          </div>
        </section>

        {/* ═══ Modo escuro ═══ */}
        <section className="a11y-secao">
          <div className="a11y-toggle-linha">
            <label className="a11y-toggle-texto" htmlFor="switch-dark">
              <strong>{darkMode ? <><Moon size={14} aria-hidden="true" style={{ verticalAlign: -2 }} /> Modo escuro</> : <><Sun size={14} aria-hidden="true" style={{ verticalAlign: -2 }} /> Modo claro</>}</strong>
              <span>Alterna o contraste de toda a interface</span>
            </label>
            <Interruptor id="switch-dark" marcado={darkMode} onAlternar={alternarDarkMode} rotulo="Alternar modo escuro" />
          </div>
        </section>

        {/* ═══ Movimento reduzido ═══ */}
        <section className="a11y-secao">
          <div className="a11y-toggle-linha">
            <label className="a11y-toggle-texto" htmlFor="switch-motion">
              <strong><PauseCircle size={14} aria-hidden="true" style={{ verticalAlign: -2 }} /> Reduzir animações</strong>
              <span>Reduz o movimento e as animações do site</span>
            </label>
            <Interruptor id="switch-motion" marcado={reducedMotion} onAlternar={alternarReducedMotion} rotulo="Alternar redução de animações" />
          </div>
        </section>

        {/* ═══ Foco visível reforçado ═══ */}
        <section className="a11y-secao">
          <div className="a11y-toggle-linha">
            <label className="a11y-toggle-texto" htmlFor="switch-focus">
              <strong><Focus size={14} aria-hidden="true" style={{ verticalAlign: -2 }} /> Destaque do foco</strong>
              <span>Destaca elementos focados via teclado</span>
            </label>
            <Interruptor id="switch-focus" marcado={focusHighlight} onAlternar={alternarFocusHighlight} rotulo="Alternar destaque de foco" />
          </div>
        </section>

        {/* ═══ Modo de leitura ═══ */}
        <section className="a11y-secao">
          <div className="a11y-toggle-linha">
            <label className="a11y-toggle-texto" htmlFor="switch-leitura">
              <strong><BookOpen size={14} aria-hidden="true" style={{ verticalAlign: -2 }} /> Modo de leitura</strong>
              <span>Mais espaçamento e menos distrações visuais</span>
            </label>
            <Interruptor id="switch-leitura" marcado={readingMode} onAlternar={alternarReadingMode} rotulo="Alternar modo de leitura" />
          </div>
        </section>

        {/* ═══ Posição do botão flutuante ═══ */}
        <section className="a11y-secao" aria-labelledby="a11y-posicao-titulo">
          <h3 id="a11y-posicao-titulo">Posição da Central</h3>
          <p className="dica" style={{ marginBottom: '0.5rem' }}>Escolha onde o botão de acessibilidade ficará na tela</p>
          <div className="a11y-grupo-botoes colunas-4">
            {[
              { v: 'bottom-left', r: 'Inf. esq.' },
              { v: 'bottom-right', r: 'Inf. dir.' },
              { v: 'top-left', r: 'Sup. esq.' },
              { v: 'top-right', r: 'Sup. dir.' },
            ].map((op) => (
              <button
                key={op.v}
                type="button"
                className="a11y-opcao-btn"
                aria-pressed={panelPosition === op.v}
                onClick={() => definirPosicaoPainel(op.v)}
                style={{ fontSize: '0.68rem' }}
              >
                {op.r}
              </button>
            ))}
          </div>
        </section>

        <div className="a11y-painel-rodape">
          <button
            type="button"
            className="btn btn-secondary btn-block"
            onClick={redefinir}
          >
            <RotateCcw size={16} aria-hidden="true" /> Redefinir
          </button>
          <button
            type="button"
            className="btn btn-primary btn-block"
            onClick={() => { sucesso('Preferências de acessibilidade salvas.'); onFechar(); }}
          >
            <Check size={16} aria-hidden="true" /> Salvar preferências
          </button>
        </div>
        <p className="a11y-painel-nota">Suas preferências são salvas automaticamente neste navegador.</p>
      </div>
    </>
  );
}
