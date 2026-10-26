import { useContext } from 'react';
import { AccessibilityContext } from '../context/AccessibilityContext.jsx';

export function useAccessibility() {
  const contexto = useContext(AccessibilityContext);
  if (!contexto) throw new Error('useAccessibility deve ser usado dentro de <AccessibilityProvider>');
  return contexto;
}
