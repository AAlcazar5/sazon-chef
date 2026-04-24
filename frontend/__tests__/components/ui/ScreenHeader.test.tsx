import React from 'react';
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';
import { ScreenHeader } from '../../../components/ui/ScreenHeader';

describe('ScreenHeader', () => {
  it('renders title at 30px bold', () => {
    const { getByText } = render(<ScreenHeader title="Cookbook" />);
    const title = getByText('Cookbook');
    expect(title).toBeTruthy();
  });

  it('renders subtitle when provided', () => {
    const { getByText } = render(
      <ScreenHeader title="Cookbook" subtitle="3 recipes saved" />
    );
    expect(getByText('3 recipes saved')).toBeTruthy();
  });

  it('does not render subtitle when omitted', () => {
    const { queryByTestId } = render(<ScreenHeader title="Cookbook" testID="header" />);
    expect(queryByTestId('header-subtitle')).toBeNull();
  });

  it('renders right element when provided', () => {
    const { getByText } = render(
      <ScreenHeader title="Cookbook" rightElement={<Text>Toggle</Text>} />
    );
    expect(getByText('Toggle')).toBeTruthy();
  });
});
