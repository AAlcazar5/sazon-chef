// frontend/__tests__/components/SearchBar.test.tsx
// Tests for the unified SearchBar component

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import SearchBar from '../../components/ui/SearchBar';

describe('SearchBar', () => {
  it('renders with placeholder text', () => {
    const { getByPlaceholderText } = render(
      <SearchBar value="" onChangeText={jest.fn()} placeholder="Search recipes..." />
    );
    expect(getByPlaceholderText('Search recipes...')).toBeTruthy();
  });

  it('calls onChangeText when typing', () => {
    const onChangeText = jest.fn();
    const { getByPlaceholderText } = render(
      <SearchBar value="" onChangeText={onChangeText} placeholder="Search..." />
    );
    fireEvent.changeText(getByPlaceholderText('Search...'), 'pasta');
    expect(onChangeText).toHaveBeenCalledWith('pasta');
  });

  it('shows clear button when value is non-empty', () => {
    const { getByLabelText } = render(
      <SearchBar value="test" onChangeText={jest.fn()} />
    );
    expect(getByLabelText('Clear search')).toBeTruthy();
  });

  it('hides clear button when value is empty', () => {
    const { queryByLabelText } = render(
      <SearchBar value="" onChangeText={jest.fn()} />
    );
    expect(queryByLabelText('Clear search')).toBeNull();
  });

  it('calls onClear and clears text when clear button is pressed', () => {
    const onChangeText = jest.fn();
    const onClear = jest.fn();
    const { getByLabelText } = render(
      <SearchBar value="test" onChangeText={onChangeText} onClear={onClear} />
    );
    fireEvent.press(getByLabelText('Clear search'));
    expect(onChangeText).toHaveBeenCalledWith('');
    expect(onClear).toHaveBeenCalled();
  });

  it('calls onFocus and onBlur handlers', () => {
    const onFocus = jest.fn();
    const onBlur = jest.fn();
    const { getByPlaceholderText } = render(
      <SearchBar value="" onChangeText={jest.fn()} onFocus={onFocus} onBlur={onBlur} placeholder="Search..." />
    );
    const input = getByPlaceholderText('Search...');
    fireEvent(input, 'focus');
    expect(onFocus).toHaveBeenCalled();
    fireEvent(input, 'blur');
    expect(onBlur).toHaveBeenCalled();
  });

  it('renders right accessory when provided', () => {
    const { getByTestId } = render(
      <SearchBar
        value=""
        onChangeText={jest.fn()}
        rightAccessory={<React.Fragment></ React.Fragment>}
        testID="search-bar"
      />
    );
    expect(getByTestId('search-bar')).toBeTruthy();
  });

  it('uses returnKeyType search', () => {
    const { getByPlaceholderText } = render(
      <SearchBar value="" onChangeText={jest.fn()} placeholder="Search..." />
    );
    const input = getByPlaceholderText('Search...');
    expect(input.props.returnKeyType).toBe('search');
  });

  it('renders consistently on both iOS and Android (height 40, borderRadius 12)', () => {
    const { getByTestId } = render(
      <SearchBar value="" onChangeText={jest.fn()} testID="search-bar" />
    );
    const container = getByTestId('search-bar');
    const flatStyle = Array.isArray(container.props.style)
      ? Object.assign({}, ...container.props.style)
      : container.props.style;
    expect(flatStyle.height).toBe(40);
    expect(flatStyle.borderRadius).toBe(12);
  });
});
