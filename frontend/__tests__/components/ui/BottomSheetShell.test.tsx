// R15: BottomSheetShell — shared bottom-sheet chrome.

jest.mock('nativewind', () => ({
  useColorScheme: () => ({ colorScheme: 'light' }),
}));

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light' }),
}));

import React from 'react';
import { Text, View } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import BottomSheetShell from '../../../components/ui/BottomSheetShell';

describe('R15: BottomSheetShell', () => {
  it('renders the title in the header', () => {
    render(
      <BottomSheetShell title="Create Collection" onClose={jest.fn()}>
        <Text>body</Text>
      </BottomSheetShell>,
    );
    expect(screen.getByText('Create Collection')).toBeTruthy();
  });

  it('renders the close button + handle', () => {
    render(
      <BottomSheetShell title="t" onClose={jest.fn()}>
        <Text>body</Text>
      </BottomSheetShell>,
    );
    expect(screen.getByTestId('bottom-sheet-close')).toBeTruthy();
  });

  it('fires onClose when the close button is tapped (after slide-out spring)', async () => {
    const onClose = jest.fn();
    render(
      <BottomSheetShell title="t" onClose={onClose}>
        <Text>body</Text>
      </BottomSheetShell>,
    );
    fireEvent.press(screen.getByTestId('bottom-sheet-close'));
    // Slide-out spring runs async; wait for its end-of-anim callback.
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1), {
      timeout: 1500,
    });
  });

  it('renders children inside the body slot', () => {
    render(
      <BottomSheetShell title="t" onClose={jest.fn()}>
        <Text testID="body-content">my unique body</Text>
      </BottomSheetShell>,
    );
    expect(screen.getByTestId('body-content')).toBeTruthy();
    expect(screen.getByText('my unique body')).toBeTruthy();
  });

  it('honors closeDisabled (close button disabled but still rendered)', () => {
    const onClose = jest.fn();
    render(
      <BottomSheetShell title="t" onClose={onClose} closeDisabled>
        <Text>body</Text>
      </BottomSheetShell>,
    );
    const closeBtn = screen.getByTestId('bottom-sheet-close');
    expect(closeBtn).toBeTruthy();
    // When disabled, pressing must not invoke onClose.
    fireEvent.press(closeBtn);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('renders an optional headerAction node', () => {
    render(
      <BottomSheetShell
        title="t"
        onClose={jest.fn()}
        headerAction={<Text testID="header-action">Save</Text>}
      >
        <Text>body</Text>
      </BottomSheetShell>,
    );
    expect(screen.getByTestId('header-action')).toBeTruthy();
    expect(screen.getByText('Save')).toBeTruthy();
  });

  it('honors useScrollView=false (children render without the built-in ScrollView)', () => {
    // When useScrollView=false the consumer owns the body container —
    // the shell still renders the chrome but skips the inner ScrollView.
    render(
      <BottomSheetShell title="t" onClose={jest.fn()} useScrollView={false}>
        <View testID="custom-body">
          <Text>custom</Text>
        </View>
      </BottomSheetShell>,
    );
    expect(screen.getByTestId('custom-body')).toBeTruthy();
  });

  it('uses a unique testID prefix when provided', () => {
    render(
      <BottomSheetShell title="t" onClose={jest.fn()} testID="my-sheet">
        <Text>body</Text>
      </BottomSheetShell>,
    );
    expect(screen.getByTestId('my-sheet')).toBeTruthy();
    expect(screen.getByTestId('my-sheet-close')).toBeTruthy();
    expect(screen.getByTestId('my-sheet-container')).toBeTruthy();
  });
});
