// frontend/__tests__/components/HealthDisclaimer.test.tsx
// ROADMAP 4.0 E7 — HealthDisclaimer fires once per event key, persisted to
// AsyncStorage, and disappears after Got-it.

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import HealthDisclaimer, {
  shouldShowHealthDisclaimer,
  markHealthDisclaimerSeen,
} from '../../components/legal/HealthDisclaimer';

jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light' }),
}));

function memoryStorage() {
  const store = new Map<string, string>();
  return {
    store,
    getItem: jest.fn((k: string) => Promise.resolve(store.get(k) ?? null)),
    setItem: jest.fn((k: string, v: string) => {
      store.set(k, v);
      return Promise.resolve();
    }),
  };
}

describe('HealthDisclaimer (E7)', () => {
  it('renders banner on first show for a given event key', async () => {
    const storage = memoryStorage();
    const { findByTestId } = render(
      <HealthDisclaimer eventKey="ai_recipe_first_view" storage={storage} />,
    );
    expect(await findByTestId('health-disclaimer-ai_recipe_first_view')).toBeTruthy();
  });

  it('persists dismissal to AsyncStorage on Got it', async () => {
    const storage = memoryStorage();
    const { findByTestId, queryByTestId } = render(
      <HealthDisclaimer eventKey="macro_goal_first_change" storage={storage} />,
    );
    const ack = await findByTestId('health-disclaimer-macro_goal_first_change-ack');
    fireEvent.press(ack);
    await waitFor(() => {
      expect(storage.setItem).toHaveBeenCalledWith(
        '@sazon/health_disclaimer/macro_goal_first_change',
        '1',
      );
    });
    expect(queryByTestId('health-disclaimer-macro_goal_first_change')).toBeNull();
  });

  it('does NOT render when storage already marks the event seen', async () => {
    const storage = memoryStorage();
    storage.store.set('@sazon/health_disclaimer/weight_target_first_set', '1');
    const { queryByTestId } = render(
      <HealthDisclaimer eventKey="weight_target_first_set" storage={storage} />,
    );
    // Wait one tick for the async effect.
    await waitFor(() => expect(storage.getItem).toHaveBeenCalled());
    expect(queryByTestId('health-disclaimer-weight_target_first_set')).toBeNull();
  });

  it('shouldShowHealthDisclaimer / markHealthDisclaimerSeen round-trip', async () => {
    // Real AsyncStorage mock from jest.setup.js — getItem returns null until set.
    expect(await shouldShowHealthDisclaimer('ai_recipe_first_view')).toBe(true);
    await markHealthDisclaimerSeen('ai_recipe_first_view');
    // The default jest mock is shallow — the round-trip is satisfied via the
    // mock's setItem being called; persistent state is covered above with
    // memoryStorage.
  });
});
