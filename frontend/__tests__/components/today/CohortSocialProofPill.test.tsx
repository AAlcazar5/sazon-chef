// frontend/__tests__/components/today/CohortSocialProofPill.test.tsx

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'Light', Medium: 'Medium', Heavy: 'Heavy' },
  NotificationFeedbackType: { Success: 'Success', Warning: 'Warning', Error: 'Error' },
}));

const mockGet = jest.fn();
jest.mock('../../../lib/api', () => ({
  cohortSocialProofApi: { get: (...args: unknown[]) => mockGet(...args) },
}));

import React from 'react';
import { render, waitFor, act } from '@testing-library/react-native';
import CohortSocialProofPill from '../../../components/today/CohortSocialProofPill';

const flush = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('<CohortSocialProofPill />', () => {
  it('renders nothing while pending', () => {
    mockGet.mockReturnValue(new Promise(() => {}));
    const { queryByTestId } = render(<CohortSocialProofPill />);
    expect(queryByTestId('cohort-social-proof-pill')).toBeNull();
  });

  it('renders the proof copy when the API returns one', async () => {
    mockGet.mockResolvedValue({
      data: {
        proof: { cuisine: 'persian', uniqueUsers: 12, copy: 'Persian is trending in your taste cluster.' },
      },
    });
    const { getByText, getByTestId } = render(<CohortSocialProofPill />);
    await flush();
    await waitFor(() => {
      expect(getByTestId('cohort-social-proof-pill')).toBeTruthy();
      expect(getByText('Persian is trending in your taste cluster.')).toBeTruthy();
    });
  });

  it('hides silently when proof is null', async () => {
    mockGet.mockResolvedValue({ data: { proof: null } });
    const { queryByTestId } = render(<CohortSocialProofPill />);
    await flush();
    expect(queryByTestId('cohort-social-proof-pill')).toBeNull();
  });

  it('hides silently when the API errors', async () => {
    mockGet.mockRejectedValue(new Error('network'));
    const { queryByTestId } = render(<CohortSocialProofPill />);
    await flush();
    expect(queryByTestId('cohort-social-proof-pill')).toBeNull();
  });
});
