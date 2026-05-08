// ROADMAP 4.0 IA2.1 — SazonSheet context tests.

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { Text, TouchableOpacity } from 'react-native';

jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
  useLocalSearchParams: () => ({}),
}));

jest.mock('../../lib/api', () => ({
  coachApi: {
    listConversations: jest.fn().mockResolvedValue([]),
  },
  sazonTelemetryApi: {
    recordOpen: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light' }),
}));

// Mock CoachScreen so this test can focus on the provider's controller
// behavior. CoachScreen is exercised separately.
jest.mock('../../app/(tabs)/coach', () => {
  const { Text } = require('react-native');
  return function MockCoachScreen() {
    return <Text testID="mock-coach-screen">coach</Text>;
  };
});

import {
  SazonSheetProvider,
  useSazonSheet,
} from '../../contexts/SazonSheetContext';

function Harness() {
  const { open, close, isOpen } = useSazonSheet();
  return (
    <>
      <Text testID="state">{isOpen ? 'open' : 'closed'}</Text>
      <TouchableOpacity testID="open-btn" onPress={() => open()}>
        <Text>Open</Text>
      </TouchableOpacity>
      <TouchableOpacity
        testID="open-with-seed-btn"
        onPress={() => open({ contextSeed: 'tonight?' })}
      >
        <Text>Open w/ seed</Text>
      </TouchableOpacity>
      <TouchableOpacity testID="close-btn" onPress={close}>
        <Text>Close</Text>
      </TouchableOpacity>
    </>
  );
}

describe('SazonSheetProvider', () => {
  it('starts closed', () => {
    const { getByTestId } = render(
      <SazonSheetProvider>
        <Harness />
      </SazonSheetProvider>,
    );
    expect(getByTestId('state').children[0]).toBe('closed');
  });

  it('open() flips state to open', () => {
    const { getByTestId } = render(
      <SazonSheetProvider>
        <Harness />
      </SazonSheetProvider>,
    );
    act(() => {
      fireEvent.press(getByTestId('open-btn'));
    });
    expect(getByTestId('state').children[0]).toBe('open');
  });

  it('close() flips state back to closed', () => {
    const { getByTestId } = render(
      <SazonSheetProvider>
        <Harness />
      </SazonSheetProvider>,
    );
    act(() => {
      fireEvent.press(getByTestId('open-btn'));
    });
    act(() => {
      fireEvent.press(getByTestId('close-btn'));
    });
    expect(getByTestId('state').children[0]).toBe('closed');
  });

  it('open({ contextSeed }) renders the sheet (seed lives inside SazonSheet)', () => {
    const { getByTestId, queryByTestId } = render(
      <SazonSheetProvider>
        <Harness />
      </SazonSheetProvider>,
    );
    act(() => {
      fireEvent.press(getByTestId('open-with-seed-btn'));
    });
    expect(queryByTestId('sazon-sheet')).toBeTruthy();
  });

  it('useSazonSheet outside provider returns no-op controller (defensive default)', () => {
    const { getByTestId } = render(<Harness />);
    expect(getByTestId('state').children[0]).toBe('closed');
    // open() is a no-op; should not throw
    fireEvent.press(getByTestId('open-btn'));
    expect(getByTestId('state').children[0]).toBe('closed');
  });
});
