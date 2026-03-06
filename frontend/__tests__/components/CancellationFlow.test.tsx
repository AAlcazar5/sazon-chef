// frontend/__tests__/components/CancellationFlow.test.tsx

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';

jest.mock('../../components/mascot/SazonMascot', () => ({
  SazonMascot: () => null,
}));
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));
jest.mock('../../lib/api', () => ({
  stripeApi: {
    cancelSubscription: jest.fn(),
  },
}));

import { CancellationFlow } from '../../components/premium/CancellationFlow';
import { stripeApi } from '../../lib/api';

const mockStripeApi = stripeApi as jest.Mocked<typeof stripeApi>;

const defaultProps = {
  visible: true,
  onClose: jest.fn(),
  onCancelled: jest.fn(),
};

describe('CancellationFlow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStripeApi.cancelSubscription.mockResolvedValue({ data: { cancelled: true } } as any);
  });

  // ── Survey step ────────────────────────────────────────────────────────────

  it('renders survey step first with all 4 reason options', () => {
    render(<CancellationFlow {...defaultProps} />);
    expect(screen.getByText('Too expensive')).toBeTruthy();
    expect(screen.getByText('Not using it enough')).toBeTruthy();
    expect(screen.getByText('Missing a feature I need')).toBeTruthy();
    expect(screen.getByText('Other')).toBeTruthy();
  });

  it('selecting "Other" goes directly to confirm step', () => {
    render(<CancellationFlow {...defaultProps} />);
    fireEvent.press(screen.getByTestId('reason-other'));
    expect(screen.getByTestId('confirm-cancel-button')).toBeTruthy();
  });

  it('selecting "Too expensive" shows the pause-for-1-month offer', () => {
    render(<CancellationFlow {...defaultProps} />);
    fireEvent.press(screen.getByTestId('reason-too_expensive'));
    expect(screen.getByText('Pause for 1 month')).toBeTruthy();
  });

  it('selecting "Not using it enough" shows the stay-with-reminders offer', () => {
    render(<CancellationFlow {...defaultProps} />);
    fireEvent.press(screen.getByTestId('reason-not_using'));
    expect(screen.getByText('Give it one more week?')).toBeTruthy();
  });

  it('selecting "Missing a feature" shows free-text feedback input', () => {
    render(<CancellationFlow {...defaultProps} />);
    fireEvent.press(screen.getByTestId('reason-missing_feature'));
    expect(screen.getByTestId('feedback-input')).toBeTruthy();
  });

  it('"Keep my subscription" on survey step calls onClose', () => {
    const onClose = jest.fn();
    render(<CancellationFlow {...defaultProps} onClose={onClose} />);
    fireEvent.press(screen.getByText('Keep my subscription'));
    expect(onClose).toHaveBeenCalled();
  });

  // ── Offer step ─────────────────────────────────────────────────────────────

  it('accepting pause offer calls cancelSubscription with action=pause', async () => {
    mockStripeApi.cancelSubscription.mockResolvedValue({ data: { paused: true } } as any);
    render(<CancellationFlow {...defaultProps} />);
    fireEvent.press(screen.getByTestId('reason-too_expensive'));
    await act(async () => {
      fireEvent.press(screen.getByTestId('accept-offer-button'));
    });
    expect(mockStripeApi.cancelSubscription).toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'too_expensive', action: 'pause' }),
    );
  });

  it('"Continue to cancel" on offer step proceeds to confirm step', () => {
    render(<CancellationFlow {...defaultProps} />);
    fireEvent.press(screen.getByTestId('reason-not_using'));
    fireEvent.press(screen.getByTestId('skip-offer-button'));
    expect(screen.getByTestId('confirm-cancel-button')).toBeTruthy();
  });

  // ── Confirm step ───────────────────────────────────────────────────────────

  it('"Cancel Subscription" final confirm button calls API with action=cancel', async () => {
    render(<CancellationFlow {...defaultProps} />);
    fireEvent.press(screen.getByTestId('reason-other'));
    await act(async () => {
      fireEvent.press(screen.getByTestId('confirm-cancel-button'));
    });
    expect(mockStripeApi.cancelSubscription).toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'other', action: 'cancel' }),
    );
  });

  it('cancel is always reachable — "keep" button does not hide the cancel button', () => {
    render(<CancellationFlow {...defaultProps} />);
    fireEvent.press(screen.getByTestId('reason-other'));
    // Both buttons are present on confirm step
    expect(screen.getByTestId('confirm-cancel-button')).toBeTruthy();
    expect(screen.getByTestId('keep-subscription-button')).toBeTruthy();
  });

  it('calls onCancelled after successful cancellation', async () => {
    const onCancelled = jest.fn();
    render(<CancellationFlow {...defaultProps} onCancelled={onCancelled} />);
    fireEvent.press(screen.getByTestId('reason-other'));
    await act(async () => {
      fireEvent.press(screen.getByTestId('confirm-cancel-button'));
    });
    await waitFor(() => {
      expect(onCancelled).toHaveBeenCalled();
    });
  });

  it('shows error message when API call fails', async () => {
    mockStripeApi.cancelSubscription.mockRejectedValue({
      response: { data: { error: 'No active subscription found' } },
    });
    render(<CancellationFlow {...defaultProps} />);
    fireEvent.press(screen.getByTestId('reason-other'));
    await act(async () => {
      fireEvent.press(screen.getByTestId('confirm-cancel-button'));
    });
    await waitFor(() => {
      expect(screen.getByText('No active subscription found')).toBeTruthy();
    });
  });
});
