// frontend/hooks/useForceUpgrade.ts
// ROADMAP 4.0 U3 — Force-upgrade gate runtime.
//
// Calls `GET /api/app/min-version` on app-open, compares against the current
// build version (expo-constants), and exposes `{ mustUpgrade, floor, loading }`.
// API failures degrade to `mustUpgrade=false` so a backend outage cannot brick
// the app — see `lib/forceUpgrade.ts` for the pure decision helpers.

import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { apiClient } from '../lib/api';
import {
  evaluateUpgrade,
  type MinVersionFloor,
  type Platform as ForcePlatform,
} from '../lib/forceUpgrade';

interface ForceUpgradeState {
  mustUpgrade: boolean;
  floor: string | null;
  loading: boolean;
}

interface MinVersionEnvelope {
  success: boolean;
  data?: MinVersionFloor;
}

function currentBuildVersion(): string {
  return (
    (Constants.expoConfig?.version as string | undefined) ??
    ((Constants as unknown as { manifest?: { version?: string } }).manifest?.version) ??
    '0.0.0'
  );
}

function currentPlatform(): ForcePlatform {
  return Platform.OS === 'android' ? 'android' : 'ios';
}

export function useForceUpgrade(): ForceUpgradeState {
  const [state, setState] = useState<ForceUpgradeState>({
    mustUpgrade: false,
    floor: null,
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiClient.get<MinVersionEnvelope>('/api/app/min-version');
        const floor = res.data?.data ?? null;
        if (cancelled) return;
        const decision = evaluateUpgrade({
          build: currentBuildVersion(),
          platform: currentPlatform(),
          floor,
        });
        setState({
          mustUpgrade: decision.mustUpgrade,
          floor: decision.floor,
          loading: false,
        });
      } catch {
        if (cancelled) return;
        // Network/API failure must NOT lock users out — degrade silently.
        setState({ mustUpgrade: false, floor: null, loading: false });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
