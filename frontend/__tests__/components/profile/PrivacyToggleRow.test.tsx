import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import PrivacyToggleRow from '../../../components/profile/PrivacyToggleRow';

describe('PrivacyToggleRow', () => {
  const baseProps = {
    title: 'Analytics',
    description: 'Share usage data',
    value: false,
    isUpdating: false,
    isDark: false,
    onValueChange: jest.fn(),
  };

  beforeEach(() => {
    baseProps.onValueChange = jest.fn();
  });

  it('renders title and description', () => {
    const { getByText } = render(<PrivacyToggleRow {...baseProps} />);
    expect(getByText('Analytics')).toBeTruthy();
    expect(getByText('Share usage data')).toBeTruthy();
  });

  it('renders Switch when not updating', () => {
    const { getByLabelText } = render(<PrivacyToggleRow {...baseProps} />);
    expect(getByLabelText('Analytics')).toBeTruthy();
  });

  it('calls onValueChange when Switch is toggled', () => {
    const onValueChange = jest.fn();
    const { getByLabelText } = render(
      <PrivacyToggleRow {...baseProps} onValueChange={onValueChange} />
    );
    fireEvent(getByLabelText('Analytics'), 'valueChange', true);
    expect(onValueChange).toHaveBeenCalledWith(true);
  });

  it('renders spinner instead of Switch when isUpdating', () => {
    const { queryByLabelText } = render(
      <PrivacyToggleRow {...baseProps} isUpdating />
    );
    expect(queryByLabelText('Analytics')).toBeFalsy();
  });
});
