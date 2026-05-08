// Phase 4 (10Y-D): Coach paywall sheet — renders reason-specific copy and
// calls into the existing useSubscription checkout flow on CTA tap.

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

jest.mock('../../../hooks/useSubscription', () => {
  const mockStartCheckout = jest.fn();
  return {
    __mockStartCheckout: mockStartCheckout,
    useSubscription: () => ({
      startCheckout: mockStartCheckout,
      checkoutLoading: false,
      subscription: { tier: 'free', isPremium: false },
    }),
  };
});

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    theme: 'light',
    colors: { background: '#FAF7F4', text: { primary: '#000', secondary: '#444' } },
  }),
}));

jest.mock('../../../lib/coachAnalytics', () => {
  const mockEmit = jest.fn();
  return {
    __mockEmit: mockEmit,
    emit: (...args: unknown[]) => mockEmit(...args),
  };
});

import CoachPaywallSheet from '../../../components/coach/CoachPaywallSheet';
const startCheckoutMock = (jest.requireMock('../../../hooks/useSubscription') as { __mockStartCheckout: jest.Mock }).__mockStartCheckout;
const emitMock = (jest.requireMock('../../../lib/coachAnalytics') as { __mockEmit: jest.Mock }).__mockEmit;

describe('CoachPaywallSheet', () => {
  beforeEach(() => {
    startCheckoutMock.mockReset();
    emitMock.mockReset();
  });

  it('renders the cap-reason headline when reason="cap"', () => {
    const { getAllByText } = render(
      <CoachPaywallSheet visible reason="cap" onClose={() => {}} />,
    );
    expect(getAllByText(/no daily cap/i).length).toBeGreaterThan(0);
  });

  it('renders the photos-reason headline when reason="photos"', () => {
    const { getAllByText } = render(
      <CoachPaywallSheet visible reason="photos" onClose={() => {}} />,
    );
    expect(getAllByText(/Snap your fridge/i).length).toBeGreaterThan(0);
  });

  it('renders the memory-reason headline when reason="memory"', () => {
    const { getByText } = render(
      <CoachPaywallSheet visible reason="memory" onClose={() => {}} />,
    );
    expect(getByText(/remembers/i)).toBeTruthy();
  });

  it('renders the weekly_checkin reason headline', () => {
    const { getAllByText } = render(
      <CoachPaywallSheet visible reason="weekly_checkin" onClose={() => {}} />,
    );
    expect(getAllByText(/weekly/i).length).toBeGreaterThan(0);
  });

  it('renders generic unlock copy for reason="generic"', () => {
    const { getByText } = render(
      <CoachPaywallSheet visible reason="generic" onClose={() => {}} />,
    );
    expect(getByText(/Unlock the real Sazon/i)).toBeTruthy();
  });

  it('shows the three Pro benefit lines', () => {
    const { getByText } = render(
      <CoachPaywallSheet visible reason="generic" onClose={() => {}} />,
    );
    expect(getByText(/Opus.*extended thinking/i)).toBeTruthy();
    expect(getByText(/Unlimited messages/i)).toBeTruthy();
    expect(getByText(/memory.*photos.*weekly/i)).toBeTruthy();
  });

  it('calls startCheckout when the primary CTA is pressed', () => {
    const onClose = jest.fn();
    const { getByLabelText } = render(
      <CoachPaywallSheet visible reason="generic" onClose={onClose} />,
    );
    fireEvent.press(getByLabelText(/Upgrade to Pro/i));
    expect(startCheckoutMock).toHaveBeenCalledTimes(1);
  });

  it('closes when the secondary "Maybe later" button is pressed', () => {
    const onClose = jest.fn();
    const { getByLabelText } = render(
      <CoachPaywallSheet visible reason="generic" onClose={onClose} />,
    );
    fireEvent.press(getByLabelText(/Maybe later/i));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('emits coach_paywall_view analytics on open', () => {
    render(<CoachPaywallSheet visible reason="photos" onClose={() => {}} />);
    expect(emitMock).toHaveBeenCalledWith(
      'coach_paywall_view',
      expect.objectContaining({ reason: 'photos' }),
    );
  });

  it('emits coach_paywall_convert when CTA tapped', () => {
    const { getByLabelText } = render(
      <CoachPaywallSheet visible reason="cap" onClose={() => {}} />,
    );
    fireEvent.press(getByLabelText(/Upgrade to Pro/i));
    const events = emitMock.mock.calls.map(c => c[0]);
    expect(events).toContain('coach_paywall_convert');
  });
});
