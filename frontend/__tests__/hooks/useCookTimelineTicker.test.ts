// frontend/__tests__/hooks/useCookTimelineTicker.test.ts
// Group 10X Phase 3 — cook timeline ticker hook unit tests.

import { renderHook, act } from '@testing-library/react-native';
import useCookTimelineTicker from '../../hooks/useCookTimelineTicker';

jest.useFakeTimers();

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'Light', Medium: 'Medium', Heavy: 'Heavy' },
  NotificationFeedbackType: { Success: 'Success', Warning: 'Warning', Error: 'Error' },
}));

describe('useCookTimelineTicker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  it('starts with activeMinute 0 and isRunning false', () => {
    const { result } = renderHook(() => useCookTimelineTicker());
    expect(result.current.activeMinute).toBe(0);
    expect(result.current.isRunning).toBe(false);
  });

  it('start() then advance 60s → activeMinute becomes 1', () => {
    const { result } = renderHook(() => useCookTimelineTicker());

    act(() => {
      result.current.start();
    });

    expect(result.current.isRunning).toBe(true);

    act(() => {
      jest.advanceTimersByTime(60000);
    });

    expect(result.current.activeMinute).toBe(1);
  });

  it('advance 120s → activeMinute becomes 2', () => {
    const { result } = renderHook(() => useCookTimelineTicker());

    act(() => {
      result.current.start();
    });

    act(() => {
      jest.advanceTimersByTime(120000);
    });

    expect(result.current.activeMinute).toBe(2);
  });

  it('slip(5) adds 5 to activeMinute', () => {
    const { result } = renderHook(() => useCookTimelineTicker());

    act(() => {
      result.current.start();
    });

    act(() => {
      jest.advanceTimersByTime(60000);
    });

    expect(result.current.activeMinute).toBe(1);

    act(() => {
      result.current.slip(5);
    });

    expect(result.current.activeMinute).toBe(6);
  });

  it('slip(5) is additive — multiple slips stack', () => {
    const { result } = renderHook(() => useCookTimelineTicker());

    act(() => {
      result.current.start();
    });

    act(() => {
      result.current.slip(5);
      result.current.slip(5);
    });

    expect(result.current.activeMinute).toBe(10);
  });

  it('pause() stops the ticker from advancing', () => {
    const { result } = renderHook(() => useCookTimelineTicker());

    act(() => {
      result.current.start();
    });

    act(() => {
      jest.advanceTimersByTime(60000);
    });

    expect(result.current.activeMinute).toBe(1);

    act(() => {
      result.current.pause();
    });

    expect(result.current.isRunning).toBe(false);

    act(() => {
      jest.advanceTimersByTime(120000);
    });

    expect(result.current.activeMinute).toBe(1);
  });

  it('start() after pause() resumes from where it left off', () => {
    const { result } = renderHook(() => useCookTimelineTicker());

    act(() => {
      result.current.start();
    });

    act(() => {
      jest.advanceTimersByTime(60000);
    });

    act(() => {
      result.current.pause();
    });

    act(() => {
      result.current.start();
    });

    act(() => {
      jest.advanceTimersByTime(60000);
    });

    expect(result.current.activeMinute).toBe(2);
  });
});
