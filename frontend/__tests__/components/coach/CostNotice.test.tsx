// Phase 8 (10Y-E): CostNotice — amber banner shown when Pro user is over
// today's token budget. Only renders when message is non-null.

import React from 'react';
import { render } from '@testing-library/react-native';

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light' }),
}));

import CostNotice from '../../../components/coach/CostNotice';

describe('CostNotice', () => {
  it('renders the message text when provided', () => {
    const { getByText } = render(
      <CostNotice message="I'm taking a quick breath — back at full power tomorrow." />,
    );
    expect(getByText(/full power tomorrow/i)).toBeTruthy();
  });

  it('exposes accessibility label', () => {
    const { getByLabelText } = render(
      <CostNotice message="I'm taking a quick breath — back at full power tomorrow." />,
    );
    expect(getByLabelText(/reduced power/i)).toBeTruthy();
  });

  it('returns null when message is null', () => {
    const { toJSON } = render(<CostNotice message={null} />);
    expect(toJSON()).toBeNull();
  });
});
