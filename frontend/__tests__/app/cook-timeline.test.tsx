// frontend/__tests__/app/cook-timeline.test.tsx
// Group 10X Phase 3 — Cook Timeline screen tests.

jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light', isDark: false, colors: {} }),
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'Light', Medium: 'Medium', Heavy: 'Heavy' },
  NotificationFeedbackType: { Success: 'Success', Warning: 'Warning', Error: 'Error' },
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../components/ui/ScreenGradient', () => {
  const { View } = require('react-native');
  const React = require('react');
  return {
    __esModule: true,
    default: ({ children, testID, style }: any) => (
      <View testID={testID} style={style}>{children}</View>
    ),
  };
});

jest.mock('../../components/ui/BrandButton', () => {
  const { TouchableOpacity, Text } = require('react-native');
  const React = require('react');
  return {
    __esModule: true,
    default: ({ label, onPress, testID }: any) => (
      <TouchableOpacity testID={testID} onPress={onPress}>
        <Text>{label}</Text>
      </TouchableOpacity>
    ),
  };
});

jest.mock('../../components/cook-timeline/GanttTimeline', () => {
  const { View, Text } = require('react-native');
  const React = require('react');
  return {
    __esModule: true,
    default: ({ timeline, activeMinute, testID }: any) => (
      <View testID={testID ?? 'gantt-timeline'}>
        {timeline.events
          .filter((e: any, i: number, arr: any[]) => arr.findIndex((x: any) => x.componentId === e.componentId) === i)
          .map((e: any) => (
            <View key={e.componentId} testID={`gantt-row-${e.componentId}`}>
              <Text>{e.name}</Text>
            </View>
          ))}
        <Text testID="gantt-active-minute">{activeMinute}</Text>
      </View>
    ),
  };
});

const mockTickerSlip = jest.fn();
const mockTickerStart = jest.fn();
const mockTickerPause = jest.fn();

jest.mock('../../hooks/useCookTimelineTicker', () => {
  const { useState } = require('react');
  return {
    __esModule: true,
    default: () => {
      const [activeMinute, setActiveMinute] = useState(0);
      const [isRunning, setIsRunning] = useState(false);
      return {
        activeMinute,
        isRunning,
        start: (...args: unknown[]) => { mockTickerStart(...args); setIsRunning(true); },
        pause: (...args: unknown[]) => { mockTickerPause(...args); setIsRunning(false); },
        slip: (mins: number) => { mockTickerSlip(mins); setActiveMinute((m: number) => m + mins); },
      };
    },
  };
});

const mockBack = jest.fn();
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack, replace: mockReplace, push: jest.fn() }),
  useLocalSearchParams: jest.fn(() => ({ plateId: 'p1' })),
}));

jest.mock('../../lib/api', () => ({
  composedPlateApi: {
    timeline: jest.fn(),
    save: jest.fn(),
  },
}));

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import CookTimelineScreen from '../../app/cook-timeline';
import { composedPlateApi } from '../../lib/api';
import { useLocalSearchParams } from 'expo-router';

const MOCK_TIMELINE = {
  totalMinutes: 30,
  events: [
    { componentId: 'comp-1', name: 'Farro', action: 'start' as const, atMinuteFromStart: 0, equipmentUsed: ['stovetop_burner'] },
    { componentId: 'comp-2', name: 'Salmon', action: 'start' as const, atMinuteFromStart: 10, equipmentUsed: ['pan_sear'] },
    { componentId: 'comp-1', name: 'Farro', action: 'plate' as const, atMinuteFromStart: 25, equipmentUsed: ['stovetop_burner'] },
    { componentId: 'comp-2', name: 'Salmon', action: 'plate' as const, atMinuteFromStart: 30, equipmentUsed: ['pan_sear'] },
  ],
  equipmentConflicts: [],
};

const mockTimeline = composedPlateApi.timeline as jest.Mock;

describe('CookTimelineScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useLocalSearchParams as jest.Mock).mockReturnValue({ plateId: 'p1' });
    mockTimeline.mockResolvedValue({ data: { timeline: MOCK_TIMELINE } });
  });

  it('fetches timeline on mount with the plateId from query params', async () => {
    render(<CookTimelineScreen />);
    await waitFor(() => expect(mockTimeline).toHaveBeenCalledWith('p1'));
  });

  it('renders one row per unique component after fetching', async () => {
    const { getByTestId } = render(<CookTimelineScreen />);
    await waitFor(() => expect(getByTestId('gantt-row-comp-1')).toBeTruthy());
    expect(getByTestId('gantt-row-comp-2')).toBeTruthy();
  });

  it('shows graceful empty state on 404 instead of crashing', async () => {
    mockTimeline.mockRejectedValue({ code: 'HTTP_404', message: 'Plate not found' });

    const { getByTestId } = render(<CookTimelineScreen />);
    await waitFor(() => expect(getByTestId('cook-timeline-empty')).toBeTruthy());
  });

  it('empty state message uses Sazon copy (not raw error text)', async () => {
    mockTimeline.mockRejectedValue({ code: 'HTTP_404', message: 'Plate not found' });

    const { getByText } = render(<CookTimelineScreen />);
    await waitFor(() =>
      expect(getByText("Couldn't load this plate's timeline yet — try again.")).toBeTruthy(),
    );
  });

  it('Slip 5 min button calls ticker.slip(5)', async () => {
    mockTickerSlip.mockClear();
    const { getByTestId } = render(<CookTimelineScreen />);
    await waitFor(() => expect(getByTestId('cook-timeline-screen')).toBeTruthy());

    await act(async () => {
      fireEvent.press(getByTestId('slip-btn'));
    });

    expect(mockTickerSlip).toHaveBeenCalledWith(5);
  });

  it('Done button calls router.back() after confirmation', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(
      (_title: string, _msg?: string, buttons?: any[]) => {
        const doneBtn = buttons?.find((b: any) => b.text === 'Done!');
        doneBtn?.onPress?.();
      },
    );

    const { getByTestId } = render(<CookTimelineScreen />);
    await waitFor(() => expect(getByTestId('done-btn')).toBeTruthy());

    await act(async () => {
      fireEvent.press(getByTestId('done-btn'));
    });

    expect(alertSpy).toHaveBeenCalled();
    expect(mockBack).toHaveBeenCalled();
    alertSpy.mockRestore();
  });
});
