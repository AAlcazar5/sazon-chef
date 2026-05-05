// frontend/__tests__/components/celebrations/PremiumCelebration.peak.test.tsx
// ROADMAP 4.0 PRC2 (peak event slice) — verify subscribe-success peak fires
// `peak_subscribe_success` analytics event the moment the celebration is shown.

const mockTrack = jest.fn().mockResolvedValue(undefined);
jest.mock('../../../utils/analytics', () => ({
  analytics: {
    track: (...args: unknown[]) => mockTrack(...args),
    initialize: jest.fn(),
    trackScreenView: jest.fn(),
    trackFeatureUsage: jest.fn(),
  },
}));

jest.mock('../../../components/celebrations/CelebrationOverlay', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: ({ children, visible }: { children: React.ReactNode; visible: boolean }) => (
      <View testID="celebration-overlay" accessibilityState={{ expanded: visible }}>
        {visible ? children : null}
      </View>
    ),
  };
});

import React from 'react';
import { render } from '@testing-library/react-native';
import PremiumCelebration from '../../../components/celebrations/PremiumCelebration';

beforeEach(() => {
  jest.clearAllMocks();
  mockTrack.mockReset().mockResolvedValue(undefined);
});

describe('<PremiumCelebration /> — peak_subscribe_success event', () => {
  it('does NOT fire `peak_subscribe_success` while invisible', () => {
    render(<PremiumCelebration visible={false} onDismiss={jest.fn()} />);
    expect(mockTrack).not.toHaveBeenCalledWith(
      'peak_subscribe_success',
      expect.anything(),
    );
  });

  it('fires `peak_subscribe_success` exactly once when visibility flips to true', () => {
    const { rerender } = render(
      <PremiumCelebration visible={false} onDismiss={jest.fn()} />,
    );
    expect(mockTrack).not.toHaveBeenCalledWith('peak_subscribe_success', expect.anything());

    rerender(<PremiumCelebration visible={true} onDismiss={jest.fn()} />);

    const peakCalls = mockTrack.mock.calls.filter((c) => c[0] === 'peak_subscribe_success');
    expect(peakCalls.length).toBe(1);
    expect(peakCalls[0][1]).toEqual(expect.objectContaining({ source: 'paywall' }));
  });

  it('does not re-fire on subsequent re-renders while still visible', () => {
    const { rerender } = render(
      <PremiumCelebration visible={true} onDismiss={jest.fn()} />,
    );
    rerender(<PremiumCelebration visible={true} onDismiss={jest.fn()} />);
    rerender(<PremiumCelebration visible={true} onDismiss={jest.fn()} />);

    const peakCalls = mockTrack.mock.calls.filter((c) => c[0] === 'peak_subscribe_success');
    expect(peakCalls.length).toBe(1);
  });
});
