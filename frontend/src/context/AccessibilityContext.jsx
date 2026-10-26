import { createContext, useCallback, useEffect, useMemo, useState } from 'react';

export const AccessibilityContext = createContext(null);

/* Chaves de persistência — conforme especificado no prompt do projeto */
const CHAVES = {
  fontSize: 'accessibility-font-size',
  darkMode: 'accessibility-dark-mode',
  lineSpacing: 'accessibility-line-spacing',
  letterSpacing: 'accessibility-letter-spacing',
  wordSpacing: 'accessibility-word-spacing',
  reducedMotion: 'accessibility-reduced-motion',
  focusHighlight: 'accessibility-focus-highlight',
  readingMode: 'accessibility-reading-mode',
  panelPosition: 'accessibility-panel-position',
};

/* Passos permitidos — evitam que o aumento de fonte quebre o layout */
const PASSOS_FONTE = [0.875, 1, 1.125, 1.25, 1.4];
const PASSOS_LINHA = [1, 1.25, 1.5, 1.75, 2];
const PASSOS_LETRA = [0, 0.5, 1, 1.5, 2];
const PASSOS_PALAVRA = [0, 1, 2, 3, 4];

const lerNumero = (chave, padrao, lista) => {
  const salvo = window.localStorage.getItem(chave);
  if (salvo === null) return padrao;
  const valor = parseFloat(salvo);
  if (Number.isNaN(valor)) return padrao;
  return lista.includes(valor) ? valor : padrao;
};

const lerBooleano = (chave, padrao) => {
  const salvo = window.localStorage.getItem(chave);
  if (salvo === null) return padrao;
  return salvo === 'true';
};

const estadoInicial = () => ({
  fontSize: lerNumero(CHAVES.fontSize, 1, PASSOS_FONTE),
  darkMode: lerBooleano(CHAVES.darkMode, window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false),
  lineSpacing: lerNumero(CHAVES.lineSpacing, 1, PASSOS_LINHA),
  letterSpacing: lerNumero(CHAVES.letterSpacing, 0, PASSOS_LETRA),
  wordSpacing: lerNumero(CHAVES.wordSpacing, 0, PASSOS_PALAVRA),
  reducedMotion: lerBooleano(CHAVES.reducedMotion, false),
  focusHighlight: lerBooleano(CHAVES.focusHighlight, false),
  readingMode: lerBooleano(CHAVES.readingMode, false),
  panelPosition: window.localStorage.getItem(CHAVES.panelPosition) || 'bottom-left',
});

export function AccessibilityProvider({ children }) {
  const [estado, setEstado] = useState(estadoInicial);

  /* Aplica as variáveis/atributos no <html> sempre que o estado muda */
  useEffect(() => {
    const raiz = document.documentElement;
    raiz.style.setProperty('--escala-fonte', estado.fontSize);
    raiz.style.setProperty('--escala-linha', estado.lineSpacing);
    raiz.style.setProperty('--escala-letra', estado.letterSpacing);
    raiz.style.setProperty('--escala-palavra', estado.wordSpacing);
    raiz.setAttribute('data-tema', estado.darkMode ? 'escuro' : 'claro');
    raiz.setAttribute('data-reduzir-movimento', String(estado.reducedMotion));
    raiz.setAttribute('data-destaque-foco', String(estado.focusHighlight));
    raiz.setAttribute('data-modo-leitura', String(estado.readingMode));

    window.localStorage.setItem(CHAVES.fontSize, String(estado.fontSize));
    window.localStorage.setItem(CHAVES.darkMode, String(estado.darkMode));
    window.localStorage.setItem(CHAVES.lineSpacing, String(estado.lineSpacing));
    window.localStorage.setItem(CHAVES.letterSpacing, String(estado.letterSpacing));
    window.localStorage.setItem(CHAVES.wordSpacing, String(estado.wordSpacing));
    window.localStorage.setItem(CHAVES.reducedMotion, String(estado.reducedMotion));
    window.localStorage.setItem(CHAVES.focusHighlight, String(estado.focusHighlight));
    window.localStorage.setItem(CHAVES.readingMode, String(estado.readingMode));
    window.localStorage.setItem(CHAVES.panelPosition, estado.panelPosition);
  }, [estado]);

  const passoDentro = (lista, atual, direcao) => {
    const idx = lista.indexOf(atual);
    const proximo = idx === -1 ? lista.indexOf(1) : idx + direcao;
    return lista[Math.min(Math.max(proximo, 0), lista.length - 1)];
  };

  const definirFonte = useCallback((direcao) => {
    setEstado((s) => ({ ...s, fontSize: passoDentro(PASSOS_FONTE, s.fontSize, direcao) }));
  }, []);

  const definirFonteExata = useCallback((valor) => {
    setEstado((s) => ({ ...s, fontSize: valor }));
  }, []);

  const definirLinha = useCallback((valor) => setEstado((s) => ({ ...s, lineSpacing: valor })), []);
  const definirLetra = useCallback((valor) => setEstado((s) => ({ ...s, letterSpacing: valor })), []);
  const definirPalavra = useCallback((valor) => setEstado((s) => ({ ...s, wordSpacing: valor })), []);

  const alternarDarkMode = useCallback(() => setEstado((s) => ({ ...s, darkMode: !s.darkMode })), []);
  const alternarReducedMotion = useCallback(() => setEstado((s) => ({ ...s, reducedMotion: !s.reducedMotion })), []);
  const alternarFocusHighlight = useCallback(() => setEstado((s) => ({ ...s, focusHighlight: !s.focusHighlight })), []);
  const alternarReadingMode = useCallback(() => setEstado((s) => ({ ...s, readingMode: !s.readingMode })), []);
  const definirPosicaoPainel = useCallback((pos) => setEstado((s) => ({ ...s, panelPosition: pos })), []);

  const redefinir = useCallback(() => {
    Object.values(CHAVES).forEach((chave) => window.localStorage.removeItem(chave));
    setEstado({
      fontSize: 1,
      darkMode: false,
      lineSpacing: 1,
      letterSpacing: 0,
      wordSpacing: 0,
      reducedMotion: false,
      focusHighlight: false,
      readingMode: false,
      panelPosition: 'bottom-left',
    });
  }, []);

  const valor = useMemo(
    () => ({
      ...estado,
      passos: { fonte: PASSOS_FONTE, linha: PASSOS_LINHA, letra: PASSOS_LETRA, palavra: PASSOS_PALAVRA },
      definirFonte,
      definirFonteExata,
      definirLinha,
      definirLetra,
      definirPalavra,
      alternarDarkMode,
      alternarReducedMotion,
      alternarFocusHighlight,
      alternarReadingMode,
      definirPosicaoPainel,
      redefinir,
    }),
    [estado, definirFonte, definirFonteExata, definirLinha, definirLetra, definirPalavra, alternarDarkMode, alternarReducedMotion, alternarFocusHighlight, alternarReadingMode, definirPosicaoPainel, redefinir]
  );

  return <AccessibilityContext.Provider value={valor}>{children}</AccessibilityContext.Provider>;
}
