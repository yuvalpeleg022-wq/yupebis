import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { QualitySettings } from '../types';
import { detectTier, qualityFor } from '../utils/quality';
import { useReducedMotion } from './useReducedMotion';

const QualityContext = createContext<QualitySettings | null>(null);

export function QualityProvider({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();
  const tier = useMemo(detectTier, []);
  const value = useMemo(() => qualityFor(tier, reduced), [tier, reduced]);
  return <QualityContext.Provider value={value}>{children}</QualityContext.Provider>;
}

export function useQuality(): QualitySettings {
  const ctx = useContext(QualityContext);
  if (!ctx) throw new Error('useQuality must be used inside <QualityProvider>');
  return ctx;
}
