// frontend/contexts/SazonSheetContext.tsx
// ROADMAP 4.0 IA2.1 — global sheet visibility provider.
//
// Mounted at the app root. Any screen calls `useSazonSheet().open()` to
// trigger the modal. Optional `contextSeed` pre-fills the composer so
// long-press FAB can open with the current screen's signal.

import React, { createContext, useCallback, useContext, useState } from 'react';
import SazonSheet from '../components/sazon/SazonSheet';
import { sazonTelemetryApi, type SazonOpenSource } from '../lib/api';

interface SazonSheetController {
  open: (opts?: { contextSeed?: string; source?: SazonOpenSource }) => void;
  close: () => void;
  isOpen: boolean;
}

const SazonSheetContext = createContext<SazonSheetController | null>(null);

export function SazonSheetProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [contextSeed, setContextSeed] = useState<string | undefined>(undefined);

  const open = useCallback(
    (opts?: { contextSeed?: string; source?: SazonOpenSource }) => {
      setContextSeed(opts?.contextSeed);
      setIsOpen(true);
      // Fire-and-forget telemetry — never blocks UX.
      sazonTelemetryApi.recordOpen({
        source: opts?.source ?? 'other',
        contextSeed: opts?.contextSeed,
      });
    },
    [],
  );

  const close = useCallback(() => {
    setIsOpen(false);
    setContextSeed(undefined);
  }, []);

  return (
    <SazonSheetContext.Provider value={{ open, close, isOpen }}>
      {children}
      <SazonSheet visible={isOpen} onClose={close} contextSeed={contextSeed} />
    </SazonSheetContext.Provider>
  );
}

export function useSazonSheet(): SazonSheetController {
  const ctx = useContext(SazonSheetContext);
  if (!ctx) {
    // Defensive default — never crash if accidentally rendered outside the provider.
    // In production the provider should be mounted at app root.
    return {
      open: () => {},
      close: () => {},
      isOpen: false,
    };
  }
  return ctx;
}
