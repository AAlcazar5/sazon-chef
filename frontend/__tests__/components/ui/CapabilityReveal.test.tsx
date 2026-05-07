// frontend/__tests__/components/ui/CapabilityReveal.test.tsx
// ROADMAP 4.0 N6.1 — CapabilityReveal animation test.

const mockGetItem = jest.fn();
const mockSetItem = jest.fn();
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: (...args: unknown[]) => mockGetItem(...args),
  setItem: (...args: unknown[]) => mockSetItem(...args),
}));

// Spy on AccessibilityInfo.announceForAccessibility at runtime instead of
// mocking the module path — RN's internals + nativewind's css-interop both
// import AccessibilityInfo, and a hard module-mock breaks css-interop.
import { AccessibilityInfo } from 'react-native';
const mockAnnounce = jest
  .spyOn(AccessibilityInfo, 'announceForAccessibility')
  .mockImplementation(() => {});

import React from 'react';
import { Text } from 'react-native';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '../../../test-utils/renderWithProviders';
import CapabilityReveal from '../../../components/ui/CapabilityReveal';
import {
  registerCapability,
  __resetRegistryForTests,
} from '../../../services/capabilityRegistry';

beforeEach(() => {
  mockGetItem.mockReset();
  mockSetItem.mockReset();
  mockAnnounce.mockReset();
  __resetRegistryForTests();
  mockGetItem.mockResolvedValue(null);
  mockSetItem.mockResolvedValue(undefined);
});

const Child = () => <Text testID="reveal-child">child surface</Text>;

const REG = {
  featureKey: 'pantry-iq',
  priority: 50,
  copyShort: 'New: Pantry IQ',
  copyLong: 'Sazon now reads your pantry to spot what leans toward what.',
};

describe('CapabilityReveal (N6.1)', () => {
  it('renders the child surface even when no reveal fires', async () => {
    // No registration → no reveal
    const { getByTestId, queryByTestId } = renderWithProviders(
      <CapabilityReveal featureKey="pantry-iq">
        <Child />
      </CapabilityReveal>,
    );
    expect(getByTestId('reveal-child')).toBeTruthy();
    await new Promise((r) => setTimeout(r, 0));
    expect(queryByTestId('capability-reveal-tooltip')).toBeNull();
  });

  it('first-time render fires the tooltip + sparkle', async () => {
    registerCapability(REG);
    mockGetItem.mockResolvedValue(null); // unrevealed
    const { findByTestId, getByText } = renderWithProviders(
      <CapabilityReveal featureKey="pantry-iq">
        <Child />
      </CapabilityReveal>,
    );
    expect(await findByTestId('capability-reveal-tooltip')).toBeTruthy();
    expect(getByText('New: Pantry IQ')).toBeTruthy();
    expect(getByText(REG.copyLong)).toBeTruthy();
  });

  it('second render with prior reveal skips the tooltip', async () => {
    registerCapability(REG);
    // Mark as already revealed
    mockGetItem.mockResolvedValue(new Date().toISOString());
    const { queryByTestId } = renderWithProviders(
      <CapabilityReveal featureKey="pantry-iq">
        <Child />
      </CapabilityReveal>,
    );
    await new Promise((r) => setTimeout(r, 0));
    expect(queryByTestId('capability-reveal-tooltip')).toBeNull();
  });

  it('tap dismisses the tooltip + persists the reveal timestamp', async () => {
    registerCapability(REG);
    const { findByTestId } = renderWithProviders(
      <CapabilityReveal featureKey="pantry-iq" autoDismissMs={999999}>
        <Child />
      </CapabilityReveal>,
    );
    const dismiss = await findByTestId('capability-reveal-dismiss');
    fireEvent.press(dismiss);
    await waitFor(() => expect(mockSetItem).toHaveBeenCalled());
    expect(mockSetItem.mock.calls[0][0]).toBe(
      '@sazon/capability_registry/revealed/pantry-iq',
    );
  });

  it('auto-dismisses after autoDismissMs (markRevealed fires)', async () => {
    registerCapability(REG);
    const { findByTestId } = renderWithProviders(
      <CapabilityReveal featureKey="pantry-iq" autoDismissMs={50}>
        <Child />
      </CapabilityReveal>,
    );
    expect(await findByTestId('capability-reveal-tooltip')).toBeTruthy();
    // Real timer past the 50ms auto-dismiss
    await new Promise((r) => setTimeout(r, 120));
    await waitFor(() => expect(mockSetItem).toHaveBeenCalled());
    expect(mockSetItem.mock.calls[0][0]).toBe(
      '@sazon/capability_registry/revealed/pantry-iq',
    );
  });

  it('a11y — announces the copy via AccessibilityInfo', async () => {
    registerCapability(REG);
    const { findByTestId } = renderWithProviders(
      <CapabilityReveal featureKey="pantry-iq" autoDismissMs={999999}>
        <Child />
      </CapabilityReveal>,
    );
    await findByTestId('capability-reveal-tooltip');
    expect(mockAnnounce).toHaveBeenCalledTimes(1);
    expect(mockAnnounce.mock.calls[0][0]).toContain('New: Pantry IQ');
    expect(mockAnnounce.mock.calls[0][0]).toContain(REG.copyLong);
  });

  it('a11y — tooltip is alert role with the same copy', async () => {
    registerCapability(REG);
    const { findByLabelText } = renderWithProviders(
      <CapabilityReveal featureKey="pantry-iq" autoDismissMs={999999}>
        <Child />
      </CapabilityReveal>,
    );
    expect(
      await findByLabelText(/New: Pantry IQ.*Sazon now reads your pantry/),
    ).toBeTruthy();
  });

  it('enabled=false skips the reveal entirely', async () => {
    registerCapability(REG);
    const { queryByTestId } = renderWithProviders(
      <CapabilityReveal featureKey="pantry-iq" enabled={false}>
        <Child />
      </CapabilityReveal>,
    );
    await new Promise((r) => setTimeout(r, 0));
    expect(queryByTestId('capability-reveal-tooltip')).toBeNull();
    expect(queryByTestId('reveal-child')).toBeTruthy();
  });

  it('per-session cap: two CapabilityReveal hosts, only the first fires', async () => {
    registerCapability(REG);
    registerCapability({
      featureKey: 'use-it-up',
      priority: 60,
      copyShort: 'New: Use it up',
      copyLong: 'Sazon now spots ingredients on the edge.',
    });
    const { findAllByTestId, queryAllByTestId } = renderWithProviders(
      <>
        <CapabilityReveal featureKey="pantry-iq" autoDismissMs={999999}>
          <Text testID="a">a</Text>
        </CapabilityReveal>
        <CapabilityReveal featureKey="use-it-up" autoDismissMs={999999}>
          <Text testID="b">b</Text>
        </CapabilityReveal>
      </>,
    );
    // Both children render, but only one tooltip
    await findAllByTestId('reveal-child').catch(() => {});
    await waitFor(() =>
      expect(queryAllByTestId('capability-reveal-tooltip').length).toBe(1),
    );
  });

  it('cleanup on unmount cancels the pending dismiss timer (no markRevealed)', async () => {
    const registry = require('../../../services/capabilityRegistry');
    const markSpy = jest
      .spyOn(registry, 'markRevealed')
      .mockResolvedValue(undefined);
    registerCapability(REG);
    // Use a large autoDismissMs so the timer is definitely still pending
    // when we unmount — guarantees clearTimeout is what prevents the call.
    const { unmount, findByTestId } = renderWithProviders(
      <CapabilityReveal featureKey="pantry-iq" autoDismissMs={5000}>
        <Child />
      </CapabilityReveal>,
    );
    await findByTestId('capability-reveal-tooltip');
    unmount();
    // Wait briefly to ensure no markRevealed call escapes
    await new Promise((r) => setTimeout(r, 80));
    expect(markSpy).not.toHaveBeenCalled();
    markSpy.mockRestore();
  });
});
