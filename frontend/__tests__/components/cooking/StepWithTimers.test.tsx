// Tier Y-2 — inline-tappable timer embedded in step text (Claude's
// "▶ 30:00" mid-sentence). Reuses the existing timerExtraction patterns
// + CookingModeTimers' haptic-on-done idiom. RED-first.

const mockHaptic = jest.fn();
jest.mock('expo-haptics', () => ({
  impactAsync: (...a: unknown[]) => mockHaptic(...a),
  notificationAsync: (...a: unknown[]) => mockHaptic(...a),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'Light', Medium: 'Medium', Heavy: 'Heavy' },
  NotificationFeedbackType: { Success: 'Success', Warning: 'Warning', Error: 'Error' },
}));
jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light', colors: { text: { primary: '#111' } } }),
}));

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import StepWithTimers from '../../../components/cooking/StepWithTimers';
import { extractTimerSpans } from '../../../utils/timerExtraction';

describe('extractTimerSpans (positional, reuses DURATION_PATTERNS)', () => {
  it('returns the matched span position for a duration', () => {
    const spans = extractTimerSpans('Roast at 400°F for 30 minutes. Flip.');
    expect(spans).toHaveLength(1);
    expect(spans[0].minutes).toBe(30);
    expect(spans[0].text).toMatch(/30\s*minutes/);
    expect('Roast at 400°F for 30 minutes. Flip.'.slice(
      spans[0].index,
      spans[0].index + spans[0].length,
    )).toBe(spans[0].text);
  });

  it('no duration → no spans (temps/sizes are not durations)', () => {
    expect(extractTimerSpans('Preheat to 400°F. Cut into 1-inch cubes.')).toEqual([]);
  });
});

describe('<StepWithTimers />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });
  afterEach(() => jest.useRealTimers());

  it('renders a single tappable timer chip; non-duration numbers stay plain', () => {
    const { getByLabelText, queryAllByRole, getByText } = render(
      <StepWithTimers text="Roast at 400°F for 30 minutes. Flip halfway." />,
    );
    expect(queryAllByRole('button')).toHaveLength(1); // only the 30-min chip
    expect(getByLabelText(/30 minute .*timer/i)).toBeTruthy();
    expect(getByText(/30:00/)).toBeTruthy(); // initial countdown
    // "400°F" stayed as plain prose
    expect(getByText(/Roast at 400°F for/)).toBeTruthy();
  });

  it('tap starts a live countdown; haptic fires when it completes', () => {
    const { getByLabelText, getByText } = render(
      <StepWithTimers text="Simmer for 1 minutes then serve." />,
    );
    fireEvent.press(getByLabelText(/1 minute .*timer/i));
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(getByText(/0:59/)).toBeTruthy(); // counted down
    act(() => {
      jest.advanceTimersByTime(60_000);
    });
    expect(mockHaptic).toHaveBeenCalled(); // haptic on done
  });

  it('a step with no duration renders plain text, no chip', () => {
    const { queryAllByRole, getByText } = render(
      <StepWithTimers text="Pat the chickpeas completely dry." />,
    );
    expect(queryAllByRole('button')).toHaveLength(0);
    expect(getByText('Pat the chickpeas completely dry.')).toBeTruthy();
  });
});
