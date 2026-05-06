// ROADMAP 4.0 HX2.2 — FirstCuisineBadge tests.

import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '../../../test-utils/renderWithProviders';
import FirstCuisineBadge from '../../../components/home/FirstCuisineBadge';

jest.mock('../../../components/ui/HapticTouchableOpacity', () => {
  const { TouchableOpacity } = require('react-native');
  return function MockHTO(props: any) {
    return <TouchableOpacity {...props} />;
  };
});

jest.mock('../../../lib/homeSurfaceEvents', () => ({
  logHomeSurfaceEvent: jest.fn(),
}));

const mockGet = jest.fn();
jest.mock('../../../lib/api', () => ({
  firstCookStatsApi: {
    get: (cuisine: string) => mockGet(cuisine),
  },
}));

beforeEach(() => {
  mockGet.mockReset();
});

describe('FirstCuisineBadge (HX2.2)', () => {
  it('renders nothing when cuisine is empty', async () => {
    const { queryByTestId } = renderWithProviders(<FirstCuisineBadge cuisine={null} />);
    expect(queryByTestId('first-cuisine-badge')).toBeNull();
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('renders nothing when isFirstCook is false', async () => {
    mockGet.mockResolvedValue({ data: { isFirstCook: false } });
    const { queryByTestId } = renderWithProviders(<FirstCuisineBadge cuisine="Italian" />);
    await waitFor(() => expect(mockGet).toHaveBeenCalledWith('Italian'));
    expect(queryByTestId('first-cuisine-badge')).toBeNull();
  });

  it('renders the badge when isFirstCook is true', async () => {
    mockGet.mockResolvedValue({ data: { isFirstCook: true } });
    const { findByTestId } = renderWithProviders(<FirstCuisineBadge cuisine="Persian" />);
    expect(await findByTestId('first-cuisine-badge')).toBeTruthy();
  });

  it('uses lifestyle copy ("first time?") — never trainer voice', async () => {
    mockGet.mockResolvedValue({ data: { isFirstCook: true } });
    const { findByText, queryByText } = renderWithProviders(
      <FirstCuisineBadge cuisine="Persian" />,
    );
    expect(await findByText('first time?')).toBeTruthy();
    expect(queryByText(/you've never cooked/i)).toBeNull();
    expect(queryByText(/you have never/i)).toBeNull();
  });

  it('fires onTap with the cuisine when tapped', async () => {
    mockGet.mockResolvedValue({ data: { isFirstCook: true } });
    const onTap = jest.fn();
    const { findByTestId } = renderWithProviders(
      <FirstCuisineBadge cuisine="Persian" onTap={onTap} />,
    );
    fireEvent.press(await findByTestId('first-cuisine-badge'));
    expect(onTap).toHaveBeenCalledWith('Persian');
  });

  it('hides cleanly when the API rejects', async () => {
    mockGet.mockRejectedValue(new Error('boom'));
    const { queryByTestId } = renderWithProviders(<FirstCuisineBadge cuisine="Italian" />);
    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    expect(queryByTestId('first-cuisine-badge')).toBeNull();
  });
});
