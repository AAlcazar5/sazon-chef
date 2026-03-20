// frontend/__tests__/components/CookbookHeader.test.tsx
// CookbookHeader — emoji + title + import icon + animated filters button

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import CookbookHeader from '../../components/cookbook/CookbookHeader';

jest.mock('expo-blur', () => {
  const { View } = require('react-native');
  return {
    BlurView: function MockBlurView(props: any) {
      return <View testID="blur-view" {...props} />;
    },
  };
});

jest.mock('expo-linear-gradient', () => {
  const { View } = require('react-native');
  return {
    LinearGradient: function MockLinearGradient(props: any) {
      return <View testID="linear-gradient" {...props} />;
    },
  };
});

const defaultProps = {
  onFilterPress: jest.fn(),
};

describe('CookbookHeader', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders "My Cookbook" title', () => {
    const { getByText } = render(<CookbookHeader {...defaultProps} />);
    expect(getByText('My Cookbook')).toBeTruthy();
  });

  it('renders the cookbook emoji', () => {
    const { getByText } = render(<CookbookHeader {...defaultProps} />);
    expect(getByText('📚')).toBeTruthy();
  });

  it('renders filters button', () => {
    const { getByText } = render(<CookbookHeader {...defaultProps} />);
    expect(getByText('Filters')).toBeTruthy();
  });

  it('calls onFilterPress when filters button is tapped', () => {
    const { getByText } = render(<CookbookHeader {...defaultProps} />);
    fireEvent.press(getByText('Filters'));
    expect(defaultProps.onFilterPress).toHaveBeenCalledTimes(1);
  });

  it('shows active filter count badge when activeFilterCount > 0', () => {
    const { getByText } = render(
      <CookbookHeader {...defaultProps} activeFilterCount={4} />
    );
    expect(getByText('4')).toBeTruthy();
  });

  it('shows badge with 0 when activeFilterCount is 0', () => {
    const { getByText } = render(
      <CookbookHeader {...defaultProps} activeFilterCount={0} />
    );
    expect(getByText('0')).toBeTruthy();
  });

  it('has correct accessibility label with active filters', () => {
    const { getByLabelText } = render(
      <CookbookHeader {...defaultProps} activeFilterCount={3} />
    );
    expect(getByLabelText('Filters, 3 active')).toBeTruthy();
  });

  it('has correct accessibility label without active filters', () => {
    const { getByLabelText } = render(
      <CookbookHeader {...defaultProps} activeFilterCount={0} />
    );
    expect(getByLabelText('Filters, 0 active')).toBeTruthy();
  });

  it('does not render import button when onImportPress is not provided', () => {
    const { queryByText } = render(<CookbookHeader {...defaultProps} />);
    expect(queryByText('Import')).toBeNull();
  });

  it('renders import button with label when onImportPress is provided', () => {
    const { getByText, getByLabelText } = render(
      <CookbookHeader {...defaultProps} onImportPress={jest.fn()} />
    );
    expect(getByText('Import')).toBeTruthy();
    expect(getByLabelText('Import recipe from URL')).toBeTruthy();
  });

  it('renders without crashing', () => {
    const { toJSON } = render(<CookbookHeader {...defaultProps} />);
    expect(toJSON()).toBeTruthy();
  });
});
